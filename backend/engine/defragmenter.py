import time
from database import db
from models.storage import StorageDevice, StorageBlock
from models.file import VirtualFile
from models.defragmentation import DefragOperation
from engine.fragmentation_analyzer import FragmentationAnalyzer

class DefragmentationEngine:
    """
    Performs dynamic storage defragmentation (manual or automated threshold-based).
    Reorganizes file blocks into contiguous extents while strictly preserving
    file integrity and logical block sequence.
    """

    @classmethod
    def run_defragmentation(cls, device_id, target_file_ids=None, mode='manual'):
        """
        device_id: int
        target_file_ids: list of int or None (if None, all fragmented files)
        mode: 'manual' or 'automatic'
        """
        start_time = time.perf_counter()
        device = db.session.get(StorageDevice, device_id)
        if not device:
            raise ValueError(f"Storage device {device_id} not found.")

        # 1. Analyze initial state
        initial_analysis = FragmentationAnalyzer.analyze(device)
        init_frag = initial_analysis['fragmentation_ratio']
        init_extents = initial_analysis['total_extents']

        # Determine which files to defragment
        all_files = VirtualFile.query.filter_by(storage_device_id=device_id).all()
        if target_file_ids:
            files_to_process = [f for f in all_files if f.id in target_file_ids and f.allocated_blocks_count > 0]
        else:
            files_to_process = [f for f in all_files if f.allocated_blocks_count > 0]

        # Sort files to place cleanly (e.g. by id or size)
        files_to_process.sort(key=lambda f: f.id)

        # Retrieve current block status
        all_blocks = StorageBlock.query.filter_by(device_id=device_id).order_by(StorageBlock.block_index).all()
        orig_map = {b.block_index: b.file_id for b in all_blocks}

        # Step log list for detailed execution progress
        step_logs = []
        blocks_moved_count = 0

        try:
            # We will compact files contiguously starting from block 0
            # Files not in files_to_process keep their blocks or can be preserved
            target_ids_set = set(f.id for f in files_to_process)
            
            # Identify untouched blocks for files not being processed
            untouched_blocks = {}
            for b in all_blocks:
                if b.file_id is not None and b.file_id not in target_ids_set:
                    untouched_blocks[b.block_index] = (b.file_id, b.logical_block_index, b.status)

            # Available slots for files to process
            available_indices = [
                b.block_index for b in all_blocks 
                if b.block_index not in untouched_blocks
            ]
            available_indices.sort()

            # Place files consecutively into available indices
            slot_pointer = 0
            file_allocations = {}

            for f in files_to_process:
                needed = f.allocated_blocks_count
                if slot_pointer + needed > len(available_indices):
                    raise RuntimeError(f"Not enough contiguous blocks to defragment file {f.name}")

                allocated_slots = available_indices[slot_pointer : slot_pointer + needed]
                file_allocations[f.id] = allocated_slots
                slot_pointer += needed

            # Now update the database StorageBlocks
            blocks_by_idx = {b.block_index: b for b in all_blocks}

            # First, clear slots for target files
            for b in all_blocks:
                if b.file_id in target_ids_set:
                    b.file_id = None
                    b.status = 'free'
                    b.logical_block_index = None
                    b.next_block_index = None

            # Re-assign blocks
            for f in files_to_process:
                new_slots = file_allocations[f.id]
                for logical_idx, b_idx in enumerate(new_slots):
                    b = blocks_by_idx[b_idx]
                    b.file_id = f.id
                    b.status = 'allocated'
                    b.logical_block_index = logical_idx
                    if f.allocation_method == 'linked':
                        next_idx = new_slots[logical_idx + 1] if logical_idx + 1 < len(new_slots) else None
                        b.next_block_index = next_idx
                    else:
                        b.next_block_index = None

                # Check how many blocks changed position for this file
                old_positions = [idx for idx, fid in orig_map.items() if fid == f.id]
                diff_count = len(set(new_slots) - set(old_positions))
                blocks_moved_count += diff_count

                step_logs.append({
                    'file_id': f.id,
                    'file_name': f.name,
                    'old_positions': old_positions,
                    'new_positions': new_slots,
                    'blocks_moved': diff_count,
                    'status': 'reallocated_contiguous'
                })

                # Update file model
                f.extents_count = 1
                f.is_fragmented = False

            db.session.commit()

        except Exception as e:
            db.session.rollback()
            raise e

        # Analyze final state
        final_analysis = FragmentationAnalyzer.analyze(device)
        final_frag = final_analysis['fragmentation_ratio']
        final_extents = final_analysis['total_extents']
        exec_time_ms = (time.perf_counter() - start_time) * 1000.0

        # Create DefragOperation record
        defrag_op = DefragOperation(
            device_id=device_id,
            mode=mode,
            files_processed=len(files_to_process),
            blocks_moved=blocks_moved_count,
            execution_time_ms=round(exec_time_ms, 2),
            initial_fragmentation=round(init_frag, 2),
            final_fragmentation=round(final_frag, 2),
            initial_extents=init_extents,
            final_extents=final_extents,
            status='completed',
            details_json=__import__('json').dumps({
                'steps': step_logs,
                'external_frag_pct_before': initial_analysis['external_fragmentation_pct'],
                'external_frag_pct_after': final_analysis['external_fragmentation_pct']
            })
        )
        db.session.add(defrag_op)
        db.session.commit()

        return defrag_op.to_dict()
