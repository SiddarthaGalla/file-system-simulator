import os
import math
import uuid
from flask import Blueprint, request, jsonify, send_file, current_app
from werkzeug.utils import secure_filename
from database import db
from models.storage import StorageDevice, StorageBlock
from models.file import VirtualFile, Folder
from models.history import ActivityLog, PerformanceMetric
from engine.allocation_manager import AllocationManager
from engine.virtual_disk import VirtualDiskManager
from api.auth import jwt_required

files_bp = Blueprint('files', __name__)

PALETTE = [
    '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', 
    '#06B6D4', '#84CC16', '#6366F1', '#D97706', '#14B8A6',
    '#F43F5E', '#A855F7', '#22C55E', '#EAB308', '#64748B'
]

def get_next_color(device_id):
    count = VirtualFile.query.filter_by(storage_device_id=device_id).count()
    return PALETTE[count % len(PALETTE)]

@files_bp.route('', methods=['GET'])
@jwt_required
def list_files():
    user = request.current_user
    device_id = request.args.get('storage_id', type=int)
    folder_id = request.args.get('folder_id', type=int)
    search = request.args.get('search', '').strip().lower()
    file_type = request.args.get('type', '').strip().lower()
    sort_by = request.args.get('sort_by', 'created_at') # 'name', 'size', 'created_at'
    order = request.args.get('order', 'desc')

    query = VirtualFile.query.filter_by(user_id=user.id)
    if device_id:
        query = query.filter_by(storage_device_id=device_id)
    if folder_id is not None:
        if folder_id == 0:
            query = query.filter(VirtualFile.folder_id.is_(None))
        else:
            query = query.filter_by(folder_id=folder_id)

    files = query.all()

    if search:
        files = [f for f in files if search in f.name.lower()]
    if file_type:
        files = [f for f in files if f.file_type.lower() == file_type]

    # Sorting
    if sort_by == 'name':
        files.sort(key=lambda x: x.name.lower(), reverse=(order == 'desc'))
    elif sort_by == 'size':
        files.sort(key=lambda x: x.file_size_bytes, reverse=(order == 'desc'))
    else: # created_at
        files.sort(key=lambda x: x.created_at or 0, reverse=(order == 'desc'))

    return jsonify({'files': [f.to_dict() for f in files]}), 200

@files_bp.route('/upload', methods=['POST'])
@jwt_required
def upload_files():
    """
    Handles single or multiple file uploads.
    Validates capacity, allocates virtual blocks, and saves physical file.
    """
    user = request.current_user
    device_id = request.form.get('storage_id', type=int)
    folder_id = request.form.get('folder_id', type=int)
    allocation_method = request.form.get('allocation_method', 'first_fit')

    if not device_id:
        # Get active device
        active_dev = StorageDevice.query.filter_by(user_id=user.id, is_active=True).first()
        if not active_dev:
            active_dev = StorageDevice.query.filter_by(user_id=user.id).first()
        if not active_dev:
            return jsonify({'error': 'No storage device found. Please create one first.'}), 400
        device_id = active_dev.id

    device = StorageDevice.query.filter_by(id=device_id, user_id=user.id).first()
    if not device:
        return jsonify({'error': 'Storage device not found'}), 404

    uploaded_files = request.files.getlist('files')
    if not uploaded_files or (len(uploaded_files) == 1 and uploaded_files[0].filename == ''):
        # Allow simulated text/metadata upload if no files attached
        simulated_name = request.form.get('name', 'simulated_file.txt')
        simulated_size = int(request.form.get('size_bytes', 1024 * 1024 * 2)) # 2 MB default
        return handle_simulated_upload(user, device, folder_id, simulated_name, simulated_size, allocation_method)

    os.makedirs(current_app.config['UPLOAD_FOLDER'], exist_ok=True)
    results = []

    for file_obj in uploaded_files:
        if file_obj.filename == '':
            continue

        raw_filename = secure_filename(file_obj.filename) or 'file'
        extension = raw_filename.rsplit('.', 1)[1].lower() if '.' in raw_filename else 'bin'

        # Read or seek to get size
        file_obj.seek(0, os.SEEK_END)
        size_bytes = file_obj.tell()
        file_obj.seek(0)

        # Minimum size 1 byte for allocation
        actual_size = max(1, size_bytes)
        block_size_bytes = device.block_size_kb * 1024
        blocks_needed = math.ceil(actual_size / float(block_size_bytes))

        # Check total free blocks
        free_blocks_count = device.blocks.filter_by(status='free').count()
        if free_blocks_count < blocks_needed:
            results.append({
                'name': raw_filename,
                'success': False,
                'error': f'Device out of space: Needs {blocks_needed} blocks, only {free_blocks_count} free.'
            })
            continue

        # Run allocation
        alloc_res = AllocationManager.allocate_file(device.id, blocks_needed, method=allocation_method)
        if not alloc_res['success']:
            results.append({
                'name': raw_filename,
                'success': False,
                'error': alloc_res.get('error', 'Allocation algorithm failed')
            })
            continue

        # Save physical file to disk
        stored_name = f"{uuid.uuid4().hex}_{raw_filename}"
        stored_path = os.path.join(current_app.config['UPLOAD_FOLDER'], stored_name)
        file_obj.save(stored_path)

        # Create VirtualFile record
        is_frag = alloc_res['extents'] > 1
        vf = VirtualFile(
            user_id=user.id,
            storage_device_id=device.id,
            folder_id=folder_id if folder_id and folder_id > 0 else None,
            name=raw_filename,
            file_type=extension,
            file_size_bytes=actual_size,
            allocated_blocks_count=blocks_needed,
            stored_filename=stored_name,
            allocation_method=alloc_res['method'],
            is_fragmented=is_frag,
            extents_count=alloc_res['extents'],
            index_block_id=alloc_res.get('index_block'),
            color_code=get_next_color(device.id)
        )
        db.session.add(vf)
        db.session.commit()

        # Update block records in DB
        VirtualDiskManager.assign_blocks(
            device.id, 
            vf.id, 
            alloc_res['block_indices'], 
            method=alloc_res['method'], 
            index_block=alloc_res.get('index_block')
        )

        # Record PerformanceMetric
        pm = PerformanceMetric(
            device_id=device.id,
            method=allocation_method,
            allocation_time_ms=alloc_res['execution_time_ms'],
            simulated_access_time_ms=alloc_res.get('simulated_access_time_ms', 0.0),
            fragmentation_ratio=100.0 if is_frag else 0.0,
            extents_count=alloc_res['extents'],
            storage_utilization=(device.blocks.filter_by(status='allocated').count() / float(device.total_blocks)) * 100.0,
            blocks_moved=0
        )
        db.session.add(pm)

        # Activity log
        log = ActivityLog(
            user_id=user.id,
            device_id=device.id,
            action_type='FILE_UPLOAD',
            description=f"Uploaded '{raw_filename}' ({actual_size / 1024.0:.1f} KB) using {allocation_method} allocation ({alloc_res['extents']} extents)"
        )
        db.session.add(log)
        db.session.commit()

        results.append({
            'name': raw_filename,
            'success': True,
            'file': vf.to_dict(),
            'allocation': alloc_res
        })

    return jsonify({'results': results}), 201

def handle_simulated_upload(user, device, folder_id, name, size_bytes, allocation_method):
    block_size_bytes = device.block_size_kb * 1024
    blocks_needed = max(1, math.ceil(size_bytes / float(block_size_bytes)))

    free_blocks_count = device.blocks.filter_by(status='free').count()
    if free_blocks_count < blocks_needed:
        return jsonify({'error': f'Device out of space. Need {blocks_needed} blocks, free {free_blocks_count}.'}), 400

    alloc_res = AllocationManager.allocate_file(device.id, blocks_needed, method=allocation_method)
    if not alloc_res['success']:
        return jsonify({'error': alloc_res.get('error', 'Allocation failed')}), 400

    # Create dummy stored file payload
    os.makedirs(current_app.config['UPLOAD_FOLDER'], exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}_{name}"
    stored_path = os.path.join(current_app.config['UPLOAD_FOLDER'], stored_name)
    with open(stored_path, 'wb') as f:
        # Write header + padded bytes
        f.write(f"Simulated cloud block data for {name} ({size_bytes} bytes)\n".encode('utf-8'))
        f.write(b'\0' * min(1024, size_bytes))

    extension = name.rsplit('.', 1)[1].lower() if '.' in name else 'bin'
    is_frag = alloc_res['extents'] > 1

    vf = VirtualFile(
        user_id=user.id,
        storage_device_id=device.id,
        folder_id=folder_id if folder_id and folder_id > 0 else None,
        name=name,
        file_type=extension,
        file_size_bytes=size_bytes,
        allocated_blocks_count=blocks_needed,
        stored_filename=stored_name,
        allocation_method=alloc_res['method'],
        is_fragmented=is_frag,
        extents_count=alloc_res['extents'],
        index_block_id=alloc_res.get('index_block'),
        color_code=get_next_color(device.id)
    )
    db.session.add(vf)
    db.session.commit()

    VirtualDiskManager.assign_blocks(
        device.id, 
        vf.id, 
        alloc_res['block_indices'], 
        method=alloc_res['method'], 
        index_block=alloc_res.get('index_block')
    )

    log = ActivityLog(
        user_id=user.id,
        device_id=device.id,
        action_type='FILE_UPLOAD',
        description=f"Created file '{name}' with {blocks_needed} blocks ({alloc_res['extents']} extents)"
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'results': [{
            'name': name,
            'success': True,
            'file': vf.to_dict(),
            'allocation': alloc_res
        }]
    }), 201

@files_bp.route('/<int:file_id>', methods=['GET'])
@jwt_required
def get_file(file_id):
    user = request.current_user
    vf = VirtualFile.query.filter_by(id=file_id, user_id=user.id).first()
    if not vf:
        return jsonify({'error': 'File not found'}), 404
    return jsonify({'file': vf.to_dict()}), 200

@files_bp.route('/<int:file_id>/download', methods=['GET'])
@jwt_required
def download_file(file_id):
    user = request.current_user
    vf = VirtualFile.query.filter_by(id=file_id, user_id=user.id).first()
    if not vf:
        return jsonify({'error': 'File not found'}), 404

    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], vf.stored_filename or '')
    if not os.path.exists(file_path):
        # If payload was deleted or simulated, recreate on-demand so download always works
        os.makedirs(current_app.config['UPLOAD_FOLDER'], exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(f"Virtual File System Simulator\nFile: {vf.name}\nSize: {vf.file_size_bytes} bytes\nAllocated Blocks: {vf.allocated_blocks_count}\nExtents: {vf.extents_count}\n")

    return send_file(file_path, as_attachment=True, download_name=vf.name)

@files_bp.route('/<int:file_id>', methods=['DELETE'])
@jwt_required
def delete_file(file_id):
    user = request.current_user
    vf = VirtualFile.query.filter_by(id=file_id, user_id=user.id).first()
    if not vf:
        return jsonify({'error': 'File not found'}), 404

    device_id = vf.storage_device_id
    file_name = vf.name
    blocks_released = vf.allocated_blocks_count

    # Free the virtual disk blocks
    VirtualDiskManager.clear_file_blocks(vf.id)

    # Remove physical payload
    if vf.stored_filename:
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], vf.stored_filename)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass

    db.session.delete(vf)

    log = ActivityLog(
        user_id=user.id,
        device_id=device_id,
        action_type='FILE_DELETE',
        description=f"Deleted file '{file_name}' and released {blocks_released} blocks"
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({'message': f"File '{file_name}' deleted, {blocks_released} blocks freed"}), 200

@files_bp.route('/<int:file_id>', methods=['PATCH'])
@jwt_required
def update_file(file_id):
    user = request.current_user
    vf = VirtualFile.query.filter_by(id=file_id, user_id=user.id).first()
    if not vf:
        return jsonify({'error': 'File not found'}), 404

    data = request.get_json() or {}
    if 'name' in data and data['name'].strip():
        vf.name = data['name'].strip()
    if 'folder_id' in data:
        f_id = data['folder_id']
        vf.folder_id = f_id if f_id and f_id > 0 else None

    db.session.commit()
    return jsonify({'message': 'File updated', 'file': vf.to_dict()}), 200

@files_bp.route('/folders', methods=['GET', 'POST'])
@jwt_required
def handle_folders():
    user = request.current_user
    if request.method == 'GET':
        device_id = request.args.get('storage_id', type=int)
        query = Folder.query.filter_by(user_id=user.id)
        if device_id:
            query = query.filter_by(storage_device_id=device_id)
        folders = query.all()
        return jsonify({'folders': [f.to_dict() for f in folders]}), 200

    data = request.get_json() or {}
    name = data.get('name', '').strip()
    device_id = data.get('storage_id')
    parent_id = data.get('parent_id')

    if not name or not device_id:
        return jsonify({'error': 'Name and storage_id are required'}), 400

    folder = Folder(
        user_id=user.id,
        storage_device_id=device_id,
        name=name,
        parent_id=parent_id if parent_id and parent_id > 0 else None
    )
    db.session.add(folder)
    db.session.commit()
    return jsonify({'message': 'Folder created', 'folder': folder.to_dict()}), 201

