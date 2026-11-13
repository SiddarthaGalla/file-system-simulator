from flask import Blueprint, request, jsonify
from database import db
from models.storage import StorageDevice
from engine.workload_generator import WorkloadGenerator
from api.auth import jwt_required

workload_bp = Blueprint('workload', __name__)

@workload_bp.route('/profiles', methods=['GET'])
@jwt_required
def get_profiles():
    return jsonify({
        'profiles': [
            {'key': k, **v} for k, v in WorkloadGenerator.WORKLOAD_PROFILES.items()
        ]
    }), 200

@workload_bp.route('/run', methods=['POST'])
@jwt_required
def run_workload():
    user = request.current_user
    data = request.get_json(silent=True) or {}
    device_id = data.get('storage_id')
    profile_key = data.get('profile', 'web_server')
    ops_count = data.get('operations')

    device = None
    if device_id:
        device = db.session.get(StorageDevice, device_id)
    if not device:
        device = StorageDevice.query.filter_by(user_id=user.id, is_active=True).first()

    if not device:
        return jsonify({'error': 'Storage device not found'}), 404

    try:
        result = WorkloadGenerator.run_workload(
            user_id=user.id,
            device_id=device.id,
            profile_key=profile_key,
            operations_count=int(ops_count) if ops_count else None
        )
        return jsonify({
            'message': f"Workload '{result['profile']['name']}' completed successfully!",
            'result': result
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f"Failed to execute workload: {str(e)}"}), 500
