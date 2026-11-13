import math

class FragmentationAnalyzer:
    """
    Analyzes virtual storage block allocation and computes OS-level
    fragmentation metrics.
    """

    @staticmethod
    def analyze(device, files=None, blocks=None):
        """
        device: StorageDevice model instance
        files: list of VirtualFile instances (optional, fetches if None)
        blocks: list of StorageBlock instances sorted by block_index (optional)
        """
        total_blocks = device.total_blocks
        block_size_kb = device.block_size_kb

        if blocks is None:
            blocks = device.blocks.all()
        
        # Sort blocks by index
        sorted_blocks = sorted(blocks, key=lambda b: b.block_index)
        
        if files is None:
            files = device.files

        # Map block index -> file_id (or None if free)
        disk_map = [b.file_id for b in sorted_blocks]
        # Pad if needed
        while len(disk_map) < total_blocks:
            disk_map.append(None)

        # 1. Block usage
        occupied_blocks = sum(1 for fid in disk_map if fid is not None)
        free_blocks = total_blocks - occupied_blocks

        # 2. Free space extent analysis (detecting external fragmentation)
        free_extents = []
        current_free_len = 0
        for fid in disk_map:
            if fid is None:
                current_free_len += 1
            else:
                if current_free_len > 0:
                    free_extents.append(current_free_len)
                    current_free_len = 0
        if current_free_len > 0:
            free_extents.append(current_free_len)

        largest_free_extent = max(free_extents) if free_extents else 0

        # External fragmentation ratio:
        # If free blocks exist, % of free space not in the largest contiguous block
        if free_blocks > 0:
            external_frag_pct = (1.0 - (largest_free_extent / free_blocks)) * 100.0
        else:
            external_frag_pct = 0.0

        # 3. File extent analysis (detecting file fragmentation)
        # An extent is a contiguous run of blocks allocated to the same file.
        file_extents_map = {} # file_id -> list of (start_idx, length)
        current_file_id = None
        current_start = 0
        current_len = 0

        for idx, fid in enumerate(disk_map):
            if fid == current_file_id:
                if fid is not None:
                    current_len += 1
            else:
                if current_file_id is not None:
                    if current_file_id not in file_extents_map:
                        file_extents_map[current_file_id] = []
                    file_extents_map[current_file_id].append((current_start, current_len))
                current_file_id = fid
                current_start = idx
                current_len = 1 if fid is not None else 0

        if current_file_id is not None:
            if current_file_id not in file_extents_map:
                file_extents_map[current_file_id] = []
            file_extents_map[current_file_id].append((current_start, current_len))

        # Metrics per file
        fragmented_files_count = 0
        total_file_extents = 0
        total_internal_frag_bytes = 0
        files_with_allocations = 0

        file_analysis_list = []
        for f in files:
            extents = file_extents_map.get(f.id, [])
            num_extents = len(extents)
            total_file_extents += num_extents
            is_frag = num_extents > 1

            if num_extents > 0:
                files_with_allocations += 1
                if is_frag:
                    fragmented_files_count += 1

            # Internal fragmentation:
            # Allocated capacity in bytes minus actual file_size_bytes
            allocated_bytes = f.allocated_blocks_count * block_size_kb * 1024
            internal_frag_bytes = max(0, allocated_bytes - f.file_size_bytes)
            total_internal_frag_bytes += internal_frag_bytes

            file_analysis_list.append({
                'file_id': f.id,
                'name': f.name,
                'file_size_bytes': f.file_size_bytes,
                'allocated_blocks': f.allocated_blocks_count,
                'extents_count': num_extents,
                'is_fragmented': is_frag,
                'internal_frag_kb': round(internal_frag_bytes / 1024.0, 2),
                'extents': [{'start': start, 'length': length} for (start, length) in extents]
            })

        # File Fragmentation Ratio:
        # (Total Extents - Files with Allocations) / Total Extents * 100
        if total_file_extents > 0 and files_with_allocations > 0:
            frag_ratio = ((total_file_extents - files_with_allocations) / float(total_file_extents)) * 100.0
        else:
            frag_ratio = 0.0

        internal_frag_kb = total_internal_frag_bytes / 1024.0
        # Wasted storage = internal fragmentation + scattered unusable blocks
        wasted_storage_kb = internal_frag_kb

        storage_utilization = (occupied_blocks / float(total_blocks) * 100.0) if total_blocks > 0 else 0.0

        return {
            'device_id': device.id,
            'total_blocks': total_blocks,
            'used_blocks': occupied_blocks,
            'free_blocks': free_blocks,
            'storage_utilization': round(storage_utilization, 2),
            'total_files': len(files),
            'files_with_allocations': files_with_allocations,
            'fragmented_files_count': fragmented_files_count,
            'optimized_files_count': files_with_allocations - fragmented_files_count,
            'fragmentation_ratio': round(frag_ratio, 2),
            'external_fragmentation_pct': round(external_frag_pct, 2),
            'internal_fragmentation_kb': round(internal_frag_kb, 2),
            'wasted_storage_kb': round(wasted_storage_kb, 2),
            'total_extents': total_file_extents,
            'free_extents_count': len(free_extents),
            'largest_free_extent': largest_free_extent,
            'file_details': file_analysis_list
        }

