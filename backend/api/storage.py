from flask import Blueprint, request, jsonify
from database import db
from models.storage import StorageDevice, StorageBlock
from models.file import VirtualFile
from models.history import ActivityLog
from engine.virtual_disk import VirtualDiskManager
from api.auth import jwt_required

storage_bp = Blueprint('storage', __name__)

@storage_bp.route('', methods=['GET'])
@jwt_required
def list_storage_devices():
    user = request.current_user
    devices = StorageDevice.query.filter_by(user_id=user.id).order_by(StorageDevice.id.desc()).all()
    return jsonify({'devices': [d.to_dict() for d in devices]}), 200

@storage_bp.route('/active', methods=['GET'])
@jwt_required
def get_active_device():
    user = request.current_user
    device = StorageDevice.query.filter_by(user_id=user.id, is_active=True).first()
    if not device:
        # If no active device, pick the first one or create a default one
        device = StorageDevice.query.filter_by(user_id=user.id).first()
        if device:
            device.is_active = True
            db.session.commit()
    
    if not device:
        # Create a default simulated virtual disk (100 MB, 1 MB blocks = 100 blocks)
        device = StorageDevice(
            user_id=user.id,
            name='Primary Virtual Disk',
            total_capacity_kb=102400,
            block_size_kb=1024,
            total_blocks=100,
            is_active=True
        )
        db.session.add(device)
        db.session.commit()
        VirtualDiskManager.initialize_blocks(device)

    return jsonify({'device': device.to_dict()}), 200

@storage_bp.route('', methods=['POST'])
@jwt_required
def create_storage_device():
    user = request.current_user
    data = request.get_json() or {}
    name = data.get('name', '').strip() or 'Virtual Disk'
    capacity_kb = int(data.get('total_capacity_kb', 102400)) # e.g. 100 MB
    block_size_kb = int(data.get('block_size_kb', 1024))     # e.g. 1 MB

    if capacity_kb <= 0 or block_size_kb <= 0:
        return jsonify({'error': 'Capacity and block size must be greater than zero'}), 400

    total_blocks = capacity_kb // block_size_kb
    if total_blocks < 5:
        return jsonify({'error': 'Capacity must be at least 5 times the block size'}), 400

    # If this is the user's first device, make it active
    existing_count = StorageDevice.query.filter_by(user_id=user.id).count()
    is_active = existing_count == 0

    device = StorageDevice(
        user_id=user.id,
        name=name,
        total_capacity_kb=capacity_kb,
        block_size_kb=block_size_kb,
        total_blocks=total_blocks,
        is_active=is_active
    )
    db.session.add(device)
    db.session.commit()

    # Initialize physical blocks
    VirtualDiskManager.initialize_blocks(device)

    # Activity log
    log = ActivityLog(
        user_id=user.id,
        device_id=device.id,
        action_type='STORAGE_CREATED',
        description=f"Created storage device '{name}' with {total_blocks} blocks ({capacity_kb / 1024.0:.1f} MB)"
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({'message': 'Storage device created', 'device': device.to_dict()}), 201

@storage_bp.route('/<int:device_id>', methods=['GET'])
@jwt_required
def get_storage_device(device_id):
    user = request.current_user
    device = StorageDevice.query.filter_by(id=device_id, user_id=user.id).first()
    if not device:
        return jsonify({'error': 'Device not found'}), 404
    return jsonify({'device': device.to_dict()}), 200

@storage_bp.route('/<int:device_id>/activate', methods=['POST'])
@jwt_required
def activate_storage_device(device_id):
    user = request.current_user
    device = StorageDevice.query.filter_by(id=device_id, user_id=user.id).first()
    if not device:
        return jsonify({'error': 'Device not found'}), 404

    # Deactivate other devices
    StorageDevice.query.filter_by(user_id=user.id).update({'is_active': False})
    device.is_active = True
    db.session.commit()

    return jsonify({'message': f"Device '{device.name}' is now active", 'device': device.to_dict()}), 200

@storage_bp.route('/<int:device_id>/reset', methods=['POST'])
@jwt_required
def reset_storage_device(device_id):
    """
    Clears all allocations and virtual files on the device, returning all blocks to free status.
    """
    user = request.current_user
    device = StorageDevice.query.filter_by(id=device_id, user_id=user.id).first()
    if not device:
        return jsonify({'error': 'Device not found'}), 404

    # Delete files on this device
    VirtualFile.query.filter_by(storage_device_id=device.id).delete()
    # Re-initialize blocks
    VirtualDiskManager.initialize_blocks(device)

    log = ActivityLog(
        user_id=user.id,
        device_id=device.id,
        action_type='STORAGE_RESET',
        description=f"Reset storage device '{device.name}' to clean state"
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({'message': 'Storage device reset successfully', 'device': device.to_dict()}), 200

@storage_bp.route('/<int:device_id>', methods=['DELETE'])
@jwt_required
def delete_storage_device(device_id):
    user = request.current_user
    device = StorageDevice.query.filter_by(id=device_id, user_id=user.id).first()
    if not device:
        return jsonify({'error': 'Device not found'}), 404

    was_active = device.is_active
    db.session.delete(device)
    db.session.commit()

    # If deleted device was active, activate another if available
    if was_active:
        remaining = StorageDevice.query.filter_by(user_id=user.id).first()
        if remaining:
            remaining.is_active = True
            db.session.commit()

    return jsonify({'message': 'Storage device deleted successfully'}), 200

@storage_bp.route('/<int:device_id>/blocks', methods=['GET'])
@jwt_required
def get_device_blocks(device_id):
    user = request.current_user
    device = StorageDevice.query.filter_by(id=device_id, user_id=user.id).first()
    if not device:
        return jsonify({'error': 'Device not found'}), 404

    blocks = device.blocks.all()
    return jsonify({
        'device_id': device.id,
        'total_blocks': device.total_blocks,
        'blocks': [b.to_dict() for b in blocks]
    }), 200

