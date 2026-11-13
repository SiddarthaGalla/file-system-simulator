import os
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from database import db
import models
from api import register_blueprints

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable CORS for all frontend interactions
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # Initialize extensions
    db.init_app(app)

    # Register API blueprints
    register_blueprints(app)

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'service': 'Intelligent File Storage & Allocation Management Simulator',
            'version': '1.0.0'
        }), 200

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Resource not found'}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({'error': 'Internal server error'}), 500

    with app.app_context():
        # Ensure upload folder exists
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        # Create database tables
        db.create_all()

        # Seed default demo user if not exists
        from models.user import User
        if not User.query.filter_by(username='demo_admin').first():
            demo_user = User(
                username='demo_admin',
                email='admin@simulator.os',
                full_name='OS Capstone Lead'
            )
            demo_user.set_password('password123')
            demo_user.settings = {
                'default_block_size': 1024,
                'default_allocation_method': 'first_fit',
                'auto_defrag_threshold': 15.0,
                'theme': 'light'
            }
            db.session.add(demo_user)
            db.session.commit()

    return app

if __name__ == '__main__':
    application = create_app()
    # Runs on port 5000
    application.run(host='127.0.0.1', port=5000, debug=True)

