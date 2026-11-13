from flask import Blueprint, request, jsonify
from database import db
from models.storage import StorageDevice, StorageBlock
from models.file import VirtualFile
from engine.disk_scheduler import DiskScheduler
from api.auth import jwt_required

scheduling_bp = Blueprint('scheduling', __name__)

@scheduling_bp.route('/simulate', methods=['POST'])
@jwt_required
def simulate_scheduling():
    user = request.current_user
    data = request.get_json(silent=True) or {}
    device_id = data.get('storage_id')
    file_id = data.get('file_id')
    custom_requests = data.get('requests')
    initial_head = int(data.get('initial_head', 0))

    device = None
    if device_id:
        device = db.session.get(StorageDevice, device_id)
    if not device:
        device = StorageDevice.query.filter_by(user_id=user.id, is_active=True).first()
    if not device:
        device = StorageDevice.query.filter_by(user_id=user.id).first()

    if not device:
        return jsonify({'error': 'No storage device found'}), 404

    requests_to_service = []

    if file_id:
        vf = db.session.get(VirtualFile, file_id)
        if vf:
            blocks = StorageBlock.query.filter_by(file_id=vf.id).order_by(StorageBlock.logical_block_index).all()
            requests_to_service = [b.block_index for b in blocks]
    elif custom_requests and isinstance(custom_requests, list):
        requests_to_service = [int(r) for r in custom_requests if 0 <= int(r) < device.total_blocks]
    else:
        # Default: sample requests from current allocated blocks on disk
        blocks = StorageBlock.query.filter_by(device_id=device.id).filter(StorageBlock.file_id.isnot(None)).all()
        if blocks:
            requests_to_service = [b.block_index for b in blocks[:15]]

    if not requests_to_service:
        requests_to_service = [12, 45, 8, 72, 33, 91, 24, 60] # fallback educational sequence

    evaluation = DiskScheduler.evaluate_all(
        requests=requests_to_service,
        total_blocks=device.total_blocks,
        initial_head=initial_head
    )

    return jsonify({
        'device_id': device.id,
        'evaluation': evaluation
    }), 200

@scheduling_bp.route('/compare', methods=['GET'])
@jwt_required
def compare_scheduling():
    """
    Compares disk head travel distance for files in their current state
    vs. a contiguous defragmented state.
    """
    user = request.current_user
    device_id = request.args.get('storage_id', type=int)

    device = None
    if device_id:
        device = db.session.get(StorageDevice, device_id)
    if not device:
        device = StorageDevice.query.filter_by(user_id=user.id, is_active=True).first()

    if not device:
        return jsonify({'error': 'No storage device found'}), 404

    files = VirtualFile.query.filter_by(storage_device_id=device.id).all()
    comparisons = []

    for f in files:
        if f.allocated_blocks_count <= 0:
            continue

        blocks = StorageBlock.query.filter_by(file_id=f.id).order_by(StorageBlock.logical_block_index).all()
        actual_indices = [b.block_index for b in blocks]
        if not actual_indices:
            continue

        # Current fragmented schedule
        current_eval = DiskScheduler.evaluate_all(actual_indices, total_blocks=device.total_blocks, initial_head=0)

        # Ideal contiguous schedule (consecutive blocks starting from first block)
        start_b = actual_indices[0]
        ideal_indices = list(range(start_b, start_b + len(actual_indices)))
        ideal_eval = DiskScheduler.evaluate_all(ideal_indices, total_blocks=device.total_blocks, initial_head=0)

        curr_sstf = next(a for a in current_eval['algorithms'] if a['algorithm'] == 'SSTF')
        ideal_sstf = next(a for a in ideal_eval['algorithms'] if a['algorithm'] == 'SSTF')

        comparisons.append({
            'file_id': f.id,
            'file_name': f.name,
            'extents_count': f.extents_count,
            'is_fragmented': f.is_fragmented,
            'blocks_count': len(actual_indices),
            'current_head_movement': curr_sstf['total_head_movement'],
            'optimized_head_movement': ideal_sstf['total_head_movement'],
            'movement_savings_pct': round(
                max(0.0, (curr_sstf['total_head_movement'] - ideal_sstf['total_head_movement']) / max(1, curr_sstf['total_head_movement'])) * 100.0,
                1
            ),
            'current_seek_time_ms': curr_sstf['seek_time_ms'],
            'optimized_seek_time_ms': ideal_sstf['seek_time_ms']
        })

    return jsonify({
        'device_id': device.id,
        'comparisons': comparisons
    }), 200
