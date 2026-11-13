from flask import Blueprint, request, jsonify, Response, send_file
from database import db
from models.storage import StorageDevice
from models.file import VirtualFile
from models.fragmentation import FragmentationScan
from models.optimization import GAOptimizationRun
from models.defragmentation import DefragOperation
from models.history import ActivityLog
from engine.report_generator import ReportGenerator
from api.auth import jwt_required

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('', methods=['GET'])
@jwt_required
def get_reports_and_history():
    user = request.current_user
    device_id = request.args.get('storage_id', type=int)
    action_type = request.args.get('type')
    search = request.args.get('search', '').strip().lower()

    query = ActivityLog.query.filter_by(user_id=user.id)
    if device_id:
        query = query.filter_by(device_id=device_id)
    if action_type:
        query = query.filter_by(action_type=action_type)

    logs = query.order_by(ActivityLog.id.desc()).limit(100).all()

    if search:
        logs = [l for l in logs if search in l.description.lower()]

    scans = FragmentationScan.query.order_by(FragmentationScan.id.desc()).limit(15).all()
    ga_runs = GAOptimizationRun.query.order_by(GAOptimizationRun.id.desc()).limit(10).all()
    defrags = DefragOperation.query.order_by(DefragOperation.id.desc()).limit(10).all()

    return jsonify({
        'logs': [l.to_dict() for l in logs],
        'scans': [s.to_dict() for s in scans],
        'ga_runs': [g.to_dict(include_metrics=False) for g in ga_runs],
        'defrags': [d.to_dict() for d in defrags]
    }), 200

@reports_bp.route('/export/pdf', methods=['GET'])
@jwt_required
def export_pdf():
    user = request.current_user
    device_id = request.args.get('storage_id', type=int)

    device = None
    if device_id:
        device = StorageDevice.query.filter_by(id=device_id, user_id=user.id).first()
    if not device:
        device = StorageDevice.query.filter_by(user_id=user.id, is_active=True).first()

    if not device:
        return jsonify({'error': 'No storage device found'}), 404

    files = VirtualFile.query.filter_by(storage_device_id=device.id).all()
    scan = FragmentationScan.query.filter_by(device_id=device.id).order_by(FragmentationScan.id.desc()).first()
    ga_run = GAOptimizationRun.query.filter_by(device_id=device.id).order_by(GAOptimizationRun.id.desc()).first()

    pdf_buffer = ReportGenerator.generate_pdf(device, files=files, scan=scan, ga_run=ga_run)

    return send_file(
        pdf_buffer,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f"storage_report_{device.name.replace(' ', '_')}_{device.id}.pdf"
    )

@reports_bp.route('/export/csv', methods=['GET'])
@jwt_required
def export_csv():
    user = request.current_user
    device_id = request.args.get('storage_id', type=int)
    csv_type = request.args.get('type', 'files') # 'files' or 'blocks'

    device = None
    if device_id:
        device = StorageDevice.query.filter_by(id=device_id, user_id=user.id).first()
    if not device:
        device = StorageDevice.query.filter_by(user_id=user.id, is_active=True).first()

    if not device:
        return jsonify({'error': 'No storage device found'}), 404

    if csv_type == 'blocks':
        blocks = device.blocks.all()
        csv_content = ReportGenerator.generate_csv_blocks(blocks)
        filename = f"blocks_allocation_{device.id}.csv"
    else:
        files = VirtualFile.query.filter_by(storage_device_id=device.id).all()
        csv_content = ReportGenerator.generate_csv_files(files)
        filename = f"files_metadata_{device.id}.csv"

    return Response(
        csv_content,
        mimetype="text/csv",
        headers={"Content-disposition": f"attachment; filename={filename}"}
    )

