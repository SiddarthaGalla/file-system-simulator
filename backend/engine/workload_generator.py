import random
import uuid
import os
from database import db
from models.storage import StorageDevice, StorageBlock
from models.file import VirtualFile
from models.history import ActivityLog
from engine.allocation_manager import AllocationManager
from engine.virtual_disk import VirtualDiskManager
from engine.fragmentation_analyzer import FragmentationAnalyzer

PALETTE = [
    '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', 
    '#06B6D4', '#84CC16', '#6366F1', '#D97706', '#14B8A6'
]

class WorkloadGenerator:
    """
    Simulates real-world enterprise cloud workloads to demonstrate
    dynamic storage fragmentation buildup and aging.
    """

    WORKLOAD_PROFILES = {
        'web_server': {
            'name': 'Web Server Burst & Purge',
            'description': 'Simulates rapid HTTP access log rotation and temporary session cache purging.',
            'operations': 12,
            'file_types': ['log', 'tmp', 'cache'],
            'min_blocks': 2,
            'max_blocks': 7,
            'delete_ratio': 0.4
        },
        'database_crud': {
            'name': 'Transactional Database Churn',
            'description': 'Simulates WAL write-ahead logs, table checkpoint dumps, and query result caches.',
            'operations': 16,
            'file_types': ['bin', 'sql', 'wal', 'idx'],
            'min_blocks': 3,
            'max_blocks': 10,
            'delete_ratio': 0.35
        },
        'high_churn': {
            'name': 'High-Velocity Cloud Storage',
            'description': 'Aggressive multi-tenant storage lifecycle with random uploads, deletions, and varied sizes.',
            'operations': 20,
            'file_types': ['pdf', 'png', 'csv', 'json', 'bin'],
            'min_blocks': 2,
            'max_blocks': 12,
            'delete_ratio': 0.45
        }
    }

    @classmethod
    def run_workload(cls, user_id, device_id, profile_key='web_server', operations_count=None):
        device = db.session.get(StorageDevice, device_id)
        if not device:
            raise ValueError(f"Storage device #{device_id} not found")

        profile = cls.WORKLOAD_PROFILES.get(profile_key, cls.WORKLOAD_PROFILES['web_server'])
        ops_total = operations_count or profile['operations']

        initial_analysis = FragmentationAnalyzer.analyze(device)
        steps = []
        uploaded_count = 0
        deleted_count = 0

        existing_files = VirtualFile.query.filter_by(storage_device_id=device.id).all()
        created_file_ids = [f.id for f in existing_files]

        for step_i in range(1, ops_total + 1):
            free_blocks = device.blocks.filter_by(status='free').count()

            # Decide whether to delete or upload
            should_delete = (
                len(created_file_ids) >= 4 and 
                (free_blocks < 8 or random.random() < profile['delete_ratio'])
            )

            if should_delete and created_file_ids:
                # Pick a random file to delete to create a non-contiguous hole
                target_fid = random.choice(created_file_ids)
                vf = db.session.get(VirtualFile, target_fid)
                if vf:
                    file_name = vf.name
                    blocks_freed = vf.allocated_blocks_count
                    VirtualDiskManager.clear_file_blocks(vf.id)
                    db.session.delete(vf)
                    db.session.flush()
                    created_file_ids.remove(target_fid)
                    deleted_count += 1

                    steps.append({
                        'step': step_i,
                        'action': 'DELETE',
                        'detail': f"Deleted '{file_name}' to free {blocks_freed} blocks (created hole)",
                        'file_name': file_name,
                        'blocks': blocks_freed
                    })
            else:
                # Upload a new simulated file
                blocks_needed = random.randint(profile['min_blocks'], profile['max_blocks'])
                if free_blocks < blocks_needed:
                    steps.append({
                        'step': step_i,
                        'action': 'SKIPPED',
                        'detail': f"Capacity low ({free_blocks} free vs {blocks_needed} needed).",
                        'file_name': None,
                        'blocks': 0
                    })
                    continue

                ftype = random.choice(profile['file_types'])
                fname = f"workload_{uuid.uuid4().hex[:6]}_{ftype}_data.{ftype}"
                alloc_method = random.choice(['first_fit', 'linked', 'best_fit'])

                alloc_res = AllocationManager.allocate_file(device.id, blocks_needed, method=alloc_method)
                if not alloc_res['success']:
                    steps.append({
                        'step': step_i,
                        'action': 'ALLOC_FAILED',
                        'detail': f"Allocation failed for '{fname}': {alloc_res.get('error')}",
                        'file_name': fname,
                        'blocks': blocks_needed
                    })
                    continue

                color = PALETTE[(len(created_file_ids) + step_i) % len(PALETTE)]
                vf = VirtualFile(
                    user_id=user_id,
                    storage_device_id=device.id,
                    name=fname,
                    file_type=ftype,
                    file_size_bytes=blocks_needed * device.block_size_kb * 1024 - random.randint(1000, 50000),
                    allocated_blocks_count=blocks_needed,
                    stored_filename=f"sim_{fname}",
                    allocation_method=alloc_res['method'],
                    is_fragmented=alloc_res['extents'] > 1,
                    extents_count=alloc_res['extents'],
                    color_code=color
                )
                db.session.add(vf)
                db.session.flush()

                VirtualDiskManager.assign_blocks(
                    device.id, 
                    vf.id, 
                    alloc_res['block_indices'], 
                    method=alloc_res['method']
                )

                created_file_ids.append(vf.id)
                uploaded_count += 1

                steps.append({
                    'step': step_i,
                    'action': 'UPLOAD',
                    'detail': f"Allocated '{fname}' ({blocks_needed} blocks, {alloc_res['extents']} extent(s))",
                    'file_name': fname,
                    'blocks': blocks_needed,
                    'extents': alloc_res['extents']
                })

        db.session.commit()

        final_analysis = FragmentationAnalyzer.analyze(device)

        log = ActivityLog(
            user_id=user_id,
            device_id=device.id,
            action_type='WORKLOAD_RUN',
            description=f"Executed workload '{profile['name']}': {uploaded_count} uploads, {deleted_count} deletes. Frag: {initial_analysis['fragmentation_ratio']}% -> {final_analysis['fragmentation_ratio']}%"
        )
        db.session.add(log)
        db.session.commit()

        return {
            'profile': profile,
            'steps_executed': len(steps),
            'uploaded_count': uploaded_count,
            'deleted_count': deleted_count,
            'initial_fragmentation': initial_analysis['fragmentation_ratio'],
            'final_fragmentation': final_analysis['fragmentation_ratio'],
            'initial_extents': initial_analysis['total_extents'],
            'final_extents': final_analysis['total_extents'],
            'steps': steps,
            'analysis': final_analysis,
            'device': device.to_dict()
        }
