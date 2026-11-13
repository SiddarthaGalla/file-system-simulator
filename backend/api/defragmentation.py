from flask import Blueprint, request, jsonify
from database import db
from models.storage import StorageDevice
from models.file import VirtualFile
from models.defragmentation import DefragOperation
from models.history import ActivityLog
from engine.defragmenter import DefragmentationEngine
from engine.fragmentation_analyzer import FragmentationAnalyzer
from api.auth import jwt_required

defragmentation_bp = Blueprint('defragmentation', __name__)

@defragmentation_bp.route('/run', methods=['POST'])
@jwt_required
def run_defragmentation():
    user = request.current_user
    data = request.get_json() or {}
    device_id = data.get('storage_id')
    mode = data.get('mode', 'manual') # 'manual' or 'automatic'
    target_file_ids = data.get('file_ids')
    threshold = float(data.get('threshold', 15.0))

    if not device_id:
        active = StorageDevice.query.filter_by(user_id=user.id, is_active=True).first()
        if active:
            device_id = active.id

    device = StorageDevice.query.filter_by(id=device_id, user_id=user.id).first()
    if not device:
        return jsonify({'error': 'Storage device not found'}), 404

    # If automatic mode, first scan and verify threshold
    if mode == 'automatic':
        analysis = FragmentationAnalyzer.analyze(device)
        current_frag = analysis['fragmentation_ratio']
        if current_frag < threshold:
            return jsonify({
                'triggered': False,
                'message': f"Fragmentation ({current_frag}%) is below auto-defragmentation threshold ({threshold}%). No action required.",
                'current_fragmentation': current_frag,
                'threshold': threshold
            }), 200

    try:
        defrag_result = DefragmentationEngine.run_defragmentation(
            device_id=device.id,
            target_file_ids=target_file_ids,
            mode=mode
        )

        log = ActivityLog(
            user_id=user.id,
            device_id=device.id,
            action_type='DEFRAG',
            description=f"Completed {mode} defragmentation: moved {defrag_result['blocks_moved']} blocks, fragmentation reduced from {defrag_result['initial_fragmentation']}% to {defrag_result['final_fragmentation']}%"
        )
        db.session.add(log)
        db.session.commit()

        return jsonify({
            'triggered': True,
            'message': 'Defragmentation completed successfully',
            'operation': defrag_result
        }), 200

    except Exception as e:
        return jsonify({'error': f"Defragmentation failed: {str(e)}"}), 500

@defragmentation_bp.route('/history', methods=['GET'])
@jwt_required
def get_history():
    user = request.current_user
    device_id = request.args.get('storage_id', type=int)

    query = DefragOperation.query.join(StorageDevice).filter(StorageDevice.user_id == user.id)
    if device_id:
        query = query.filter(DefragOperation.device_id == device_id)

    ops = query.order_by(DefragOperation.id.desc()).limit(25).all()
    return jsonify({'operations': [op.to_dict() for op in ops]}), 200

