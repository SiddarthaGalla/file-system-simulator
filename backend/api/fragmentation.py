from flask import Blueprint, request, jsonify
from database import db
from models.storage import StorageDevice
from models.file import VirtualFile
from models.fragmentation import FragmentationScan
from models.history import ActivityLog
from engine.fragmentation_analyzer import FragmentationAnalyzer
from api.auth import jwt_required

fragmentation_bp = Blueprint('fragmentation', __name__)

@fragmentation_bp.route('/scan', methods=['POST'])
@jwt_required
def scan_fragmentation():
    user = request.current_user
    data = request.get_json() or {}
    device_id = data.get('storage_id')

    if not device_id:
        active = StorageDevice.query.filter_by(user_id=user.id, is_active=True).first()
        if active:
            device_id = active.id

    device = StorageDevice.query.filter_by(id=device_id, user_id=user.id).first()
    if not device:
        return jsonify({'error': 'Storage device not found'}), 404

    files = VirtualFile.query.filter_by(storage_device_id=device.id).all()
    analysis = FragmentationAnalyzer.analyze(device, files=files)

    # Update files fragmentation flags in DB
    file_map = {item['file_id']: item for item in analysis['file_details']}
    for f in files:
        if f.id in file_map:
            f.is_fragmented = file_map[f.id]['is_fragmented']
            f.extents_count = file_map[f.id]['extents_count']

    # Record scan in DB
    scan = FragmentationScan(
        device_id=device.id,
        total_blocks=analysis['total_blocks'],
        used_blocks=analysis['used_blocks'],
        free_blocks=analysis['free_blocks'],
        total_files=analysis['total_files'],
        fragmented_files_count=analysis['fragmented_files_count'],
        fragmentation_ratio=analysis['fragmentation_ratio'],
        external_fragmentation_pct=analysis['external_fragmentation_pct'],
        internal_fragmentation_kb=analysis['internal_fragmentation_kb'],
        total_extents=analysis['total_extents'],
        largest_free_extent=analysis['largest_free_extent'],
        wasted_storage_kb=analysis['wasted_storage_kb']
    )
    db.session.add(scan)

    log = ActivityLog(
        user_id=user.id,
        device_id=device.id,
        action_type='SCAN',
        description=f"Completed storage fragmentation scan: {analysis['fragmentation_ratio']}% fragmentation, {analysis['fragmented_files_count']} fragmented files"
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'message': 'Fragmentation scan completed',
        'scan': scan.to_dict(),
        'analysis': analysis
    }), 200

@fragmentation_bp.route('/<int:storage_id>', methods=['GET'])
@jwt_required
def get_fragmentation(storage_id):
    user = request.current_user
    device = StorageDevice.query.filter_by(id=storage_id, user_id=user.id).first()
    if not device:
        return jsonify({'error': 'Storage device not found'}), 404

    files = VirtualFile.query.filter_by(storage_device_id=device.id).all()
    analysis = FragmentationAnalyzer.analyze(device, files=files)

    scans = FragmentationScan.query.filter_by(device_id=device.id).order_by(FragmentationScan.id.desc()).limit(10).all()

    return jsonify({
        'analysis': analysis,
        'recent_scans': [s.to_dict() for s in scans]
    }), 200

