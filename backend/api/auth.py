import datetime
from functools import wraps
import jwt
from flask import Blueprint, request, jsonify, current_app
from database import db
from models.user import User
from models.history import ActivityLog

auth_bp = Blueprint('auth', __name__)

def generate_token(user_id):
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        'user_id': user_id,
        'exp': now + datetime.timedelta(hours=current_app.config.get('JWT_EXPIRY_HOURS', 24)),
        'iat': now
    }
    return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')

def jwt_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization token'}), 401

        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            user = db.session.get(User, payload['user_id'])
            if not user:
                return jsonify({'error': 'User not found'}), 401
            request.current_user = user
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401

        return f(*args, **kwargs)
    return decorated

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    full_name = data.get('full_name', '').strip()

    if not username or not email or not password:
        return jsonify({'error': 'Username, email, and password are required'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters long'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username is already taken'}), 409

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email is already registered'}), 409

    user = User(username=username, email=email, full_name=full_name)
    user.set_password(password)
    user.settings = {
        'default_block_size': 1024,
        'default_allocation_method': 'first_fit',
        'auto_defrag_threshold': 15.0,
        'theme': 'light'
    }
    db.session.add(user)
    db.session.commit()

    token = generate_token(user.id)
    return jsonify({
        'message': 'User registered successfully',
        'token': token,
        'user': user.to_dict()
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username_or_email = data.get('username', '').strip()
    password = data.get('password', '')

    if not username_or_email or not password:
        return jsonify({'error': 'Username/email and password are required'}), 400

    user = User.query.filter(
        (User.username == username_or_email) | (User.email == username_or_email)
    ).first()

    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid credentials'}), 401

    token = generate_token(user.id)
    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/profile', methods=['GET', 'PUT'])
@jwt_required
def profile():
    user = request.current_user
    if request.method == 'GET':
        return jsonify({'user': user.to_dict()}), 200

    data = request.get_json() or {}
    if 'full_name' in data:
        user.full_name = data['full_name']
    if 'settings' in data:
        user.settings = data['settings']
    if 'password' in data and data['password']:
        if len(data['password']) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        user.set_password(data['password'])

    db.session.commit()
    return jsonify({'message': 'Profile updated', 'user': user.to_dict()}), 200
