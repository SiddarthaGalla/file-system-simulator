import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from database import db
from models.storage import StorageDevice, StorageBlock
from models.file import VirtualFile, Folder
from models.fragmentation import FragmentationScan
from models.history import ActivityLog, PerformanceMetric
from engine.virtual_disk import VirtualDiskManager
from engine.fragmentation_analyzer import FragmentationAnalyzer
from api.auth import jwt_required

demo_bp = Blueprint('demo', __name__)

PALETTE = [
    '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', 
    '#06B6D4', '#84CC16', '#6366F1', '#D97706', '#14B8A6'
]

@demo_bp.route('/seed', methods=['POST'])
@jwt_required
def seed_demo_data():
    """
    Creates a pre-configured realistic cloud storage environment with
    controlled file fragmentation for capstone project demonstration.
    """
    user = request.current_user

    # Find or create demo device
    device = StorageDevice.query.filter_by(user_id=user.id, name='Capstone Demo Virtual Disk').first()
    if not device:
        # Deactivate existing devices
        StorageDevice.query.filter_by(user_id=user.id).update({'is_active': False})
        device = StorageDevice(
            user_id=user.id,
            name='Capstone Demo Virtual Disk',
            total_capacity_kb=102400, # 100 MB
            block_size_kb=1024,       # 1 MB blocks
            total_blocks=100,
            is_active=True
        )
        db.session.add(device)
        db.session.commit()
    else:
        # Reset device
        device.is_active = True
        VirtualFile.query.filter_by(storage_device_id=device.id).delete()
        Folder.query.filter_by(storage_device_id=device.id).delete()
        FragmentationScan.query.filter_by(device_id=device.id).delete()

    VirtualDiskManager.initialize_blocks(device)

    # 1. Create folders
    f_docs = Folder(user_id=user.id, storage_device_id=device.id, name='Documents')
    f_code = Folder(user_id=user.id, storage_device_id=device.id, name='Source Code')
    f_media = Folder(user_id=user.id, storage_device_id=device.id, name='Media & Datasets')
    db.session.add_all([f_docs, f_code, f_media])
    db.session.commit()

    # Pre-defined file allocations to craft natural realistic fragmentation
    # Block layout: 100 blocks total
    # File A: 0..7 (8 blocks)
    # File B (to delete): 8..13 (6 blocks) -> will become free hole
    # File C: 14..23 (10 blocks)
    # File D (to delete): 24..28 (5 blocks) -> will become free hole
    # File E: 29..36 (8 blocks)
    # File F (to delete): 37..43 (7 blocks) -> will become free hole
    # File G: 44..55 (12 blocks)
    # File H: 56..61 (6 blocks)
    # Then File I (fragmented file across holes): allocated in holes [8, 9, 10, 11, 24, 25, 26, 37, 38, 39, 62, 63] (12 blocks, 4 extents!)
    # File J (fragmented file across holes): [12, 13, 27, 28, 40, 41, 42, 64, 65] (9 blocks, 4 extents!)

    files_def = [
        {
            'name': 'Kernel_Architecture_Design.pdf',
            'type': 'pdf',
            'size': 8 * 1024 * 1024 - 150000,
            'folder': f_docs.id,
            'method': 'contiguous',
            'blocks': list(range(0, 8)),
            'color': PALETTE[0]
        },
        {
            'name': 'Neural_Index_Matrix.bin',
            'type': 'bin',
            'size': 10 * 1024 * 1024 - 400000,
            'folder': f_code.id,
            'method': 'contiguous',
            'blocks': list(range(14, 24)),
            'color': PALETTE[1]
        },
        {
            'name': 'Genetic_Algorithm_Core.py',
            'type': 'py',
            'size': 8 * 1024 * 1024 - 280000,
            'folder': f_code.id,
            'method': 'contiguous',
            'blocks': list(range(29, 37)),
            'color': PALETTE[2]
        },
        {
            'name': 'Storage_Cluster_Benchmark.csv',
            'type': 'csv',
            'size': 12 * 1024 * 1024 - 320000,
            'folder': f_media.id,
            'method': 'contiguous',
            'blocks': list(range(44, 56)),
            'color': PALETTE[3]
        },
        {
            'name': 'Disk_Visualization_UI.png',
            'type': 'png',
            'size': 6 * 1024 * 1024 - 210000,
            'folder': f_media.id,
            'method': 'contiguous',
            'blocks': list(range(56, 62)),
            'color': PALETTE[4]
        },
        # Fragmented files spanning the non-contiguous slots:
        {
            'name': 'Distributed_Cloud_Telemetry.log',
            'type': 'log',
            'size': 12 * 1024 * 1024 - 350000,
            'folder': f_docs.id,
            'method': 'linked',
            'blocks': [8, 9, 10, 11, 24, 25, 26, 37, 38, 39, 62, 63],
            'color': PALETTE[5]
        },
        {
            'name': 'Simulated_Workload_Trace.json',
            'type': 'json',
            'size': 9 * 1024 * 1024 - 180000,
            'folder': f_code.id,
            'method': 'linked',
            'blocks': [12, 13, 27, 28, 40, 41, 42, 64, 65],
            'color': PALETTE[6]
        },
        {
            'name': 'Capstone_Research_Abstract.docx',
            'type': 'docx',
            'size': 5 * 1024 * 1024 - 90000,
            'folder': f_docs.id,
            'method': 'first_fit',
            'blocks': list(range(66, 71)),
            'color': PALETTE[7]
        }
    ]

    all_blocks = {b.block_index: b for b in StorageBlock.query.filter_by(device_id=device.id).all()}
    os.makedirs(current_app.config['UPLOAD_FOLDER'], exist_ok=True)

    created_files = []
    for f_info in files_def:
        indices = f_info['blocks']
        count = len(indices)
        
        # Calculate extents
        extents = 1
        for i in range(1, len(indices)):
            if indices[i] != indices[i-1] + 1:
                extents += 1

        is_frag = extents > 1

        # Dummy stored file
        stored_name = f"demo_{uuid.uuid4().hex[:8]}_{f_info['name']}"
        stored_path = os.path.join(current_app.config['UPLOAD_FOLDER'], stored_name)
        with open(stored_path, 'w', encoding='utf-8') as f:
            f.write(f"Capstone Demonstration File: {f_info['name']}\nSize: {f_info['size']} bytes\nBlocks: {count}\n")

        vf = VirtualFile(
            user_id=user.id,
            storage_device_id=device.id,
            folder_id=f_info['folder'],
            name=f_info['name'],
            file_type=f_info['type'],
            file_size_bytes=f_info['size'],
            allocated_blocks_count=count,
            stored_filename=stored_name,
            allocation_method=f_info['method'],
            is_fragmented=is_frag,
            extents_count=extents,
            color_code=f_info['color']
        )
        db.session.add(vf)
        db.session.flush()

        for logical_idx, b_idx in enumerate(indices):
            b = all_blocks[b_idx]
            b.file_id = vf.id
            b.status = 'allocated'
            b.logical_block_index = logical_idx
            if f_info['method'] == 'linked' and logical_idx + 1 < count:
                b.next_block_index = indices[logical_idx + 1]
            else:
                b.next_block_index = None

        created_files.append(vf)

    # Initial scan
    analysis = FragmentationAnalyzer.analyze(device, files=created_files)
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
        action_type='DEMO_SEEDED',
        description=f"Initialized Capstone Demo Environment ({len(created_files)} files, {analysis['fragmented_files_count']} fragmented, {analysis['fragmentation_ratio']}% fragmentation)"
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'message': 'Demo environment seeded successfully with realistic fragmentation scenario',
        'device': device.to_dict(),
        'analysis': analysis
    }), 201

