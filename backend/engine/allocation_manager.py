import time
import math
from engine.virtual_disk import VirtualDiskManager
from models.storage import StorageBlock, StorageDevice
from database import db

class AllocationManager:
    """
    Implements standard Operating Systems file allocation algorithms:
    - Contiguous Allocation (First Fit / Best Fit)
    - Linked Allocation
    - Indexed Allocation
    - First Fit & Best Fit placement strategies
    Calculates execution time, simulated access time, and extents.
    """

    SEEK_PER_BLOCK_MS = 0.12  # simulated head seek time per block distance
    READ_PER_BLOCK_MS = 0.05  # simulated data transfer time per block

    @classmethod
    def simulate_access_time(cls, block_indices, allocation_method):
        """
        Simulates file reading access time (seek time + latency + read time).
        Contiguous blocks: 1 initial seek + continuous reads.
        Linked blocks: sequential traversal through pointers, hopping across blocks.
        Indexed blocks: 1 index lookup + direct seeks to each block.
        """
        if not block_indices:
            return 0.0

        n = len(block_indices)
        total_time = 0.0

        if allocation_method == 'contiguous':
            # Single seek to starting block + continuous sequential read
            initial_seek = 5.0 # baseline seek in ms
            read_time = n * cls.READ_PER_BLOCK_MS
            total_time = initial_seek + read_time

        elif allocation_method == 'linked':
            # Must traverse block by block following pointers
            prev = block_indices[0]
            total_seek = 5.0
            for curr in block_indices[1:]:
                hop_dist = abs(curr - prev)
                total_seek += hop_dist * cls.SEEK_PER_BLOCK_MS
                prev = curr
            total_time = total_seek + (n * cls.READ_PER_BLOCK_MS)

        elif allocation_method == 'indexed':
            # Read index block, then direct accesses
            index_seek = 5.0 + cls.READ_PER_BLOCK_MS
            data_seeks = 0.0
            prev = block_indices[0]
            for curr in block_indices:
                hop_dist = abs(curr - prev)
                data_seeks += hop_dist * (cls.SEEK_PER_BLOCK_MS * 0.5) + cls.READ_PER_BLOCK_MS
                prev = curr
            total_time = index_seek + data_seeks

        else: # first_fit / best_fit (general multi-extent)
            prev = block_indices[0]
            total_seek = 5.0
            for curr in block_indices[1:]:
                hop_dist = abs(curr - prev)
                if hop_dist > 1:
                    total_seek += hop_dist * cls.SEEK_PER_BLOCK_MS
                prev = curr
            total_time = total_seek + (n * cls.READ_PER_BLOCK_MS)

        return round(total_time, 2)

    @staticmethod
    def count_extents(block_indices):
        """
        Counts contiguous runs in sorted block indices.
        """
        if not block_indices:
            return 0
        sorted_indices = sorted(block_indices)
        extents = 1
        for i in range(1, len(sorted_indices)):
            if sorted_indices[i] != sorted_indices[i - 1] + 1:
                extents += 1
        return extents

    @classmethod
    def allocate_contiguous(cls, device_id, blocks_needed, strategy='first_fit'):
        """
        Contiguous Allocation:
        Finds a continuous segment of free blocks >= blocks_needed.
        Strategy: 'first_fit' takes the first segment that fits.
                  'best_fit' takes the smallest segment that fits (closest to blocks_needed).
        Fails if no contiguous span of size >= blocks_needed exists.
        """
        start_time = time.perf_counter()
        free_runs = VirtualDiskManager.find_free_runs(device_id)

        # Filter valid runs
        valid_runs = [run for run in free_runs if run[1] >= blocks_needed]

        if not valid_runs:
            exec_time = (time.perf_counter() - start_time) * 1000.0
            return {
                'success': False,
                'method': 'contiguous',
                'strategy': strategy,
                'error': f'Contiguous allocation failed: No continuous free segment of {blocks_needed} blocks available.',
                'execution_time_ms': round(exec_time, 4),
                'block_indices': [],
                'extents': 0,
                'index_block': None
            }

        if strategy == 'best_fit':
            # Choose run with minimum length >= blocks_needed
            chosen_run = min(valid_runs, key=lambda r: r[1])
        else: # first_fit
            chosen_run = valid_runs[0]

        start_block = chosen_run[0]
        allocated_indices = list(range(start_block, start_block + blocks_needed))
        exec_time = (time.perf_counter() - start_time) * 1000.0

        return {
            'success': True,
            'method': 'contiguous',
            'strategy': strategy,
            'execution_time_ms': round(exec_time, 4),
            'block_indices': allocated_indices,
            'extents': 1,
            'index_block': None,
            'simulated_access_time_ms': cls.simulate_access_time(allocated_indices, 'contiguous')
        }

    @classmethod
    def allocate_linked(cls, device_id, blocks_needed, strategy='first_fit'):
        """
        Linked Allocation:
        Can allocate any available free blocks. Each block links to the next.
        Fails only if total free blocks < blocks_needed.
        """
        start_time = time.perf_counter()
        free_blocks = StorageBlock.query.filter_by(device_id=device_id, status='free').order_by(StorageBlock.block_index).all()

        if len(free_blocks) < blocks_needed:
            exec_time = (time.perf_counter() - start_time) * 1000.0
            return {
                'success': False,
                'method': 'linked',
                'strategy': strategy,
                'error': f'Storage capacity exceeded: Need {blocks_needed} blocks, only {len(free_blocks)} available.',
                'execution_time_ms': round(exec_time, 4),
                'block_indices': [],
                'extents': 0,
                'index_block': None
            }

        if strategy == 'best_fit':
            # In linked allocation with best fit, gather from smallest free runs to fill gaps
            free_runs = VirtualDiskManager.find_free_runs(device_id)
            free_runs_sorted = sorted(free_runs, key=lambda r: r[1])
            selected = []
            for start, length in free_runs_sorted:
                for b in range(start, start + length):
                    selected.append(b)
                    if len(selected) == blocks_needed:
                        break
                if len(selected) == blocks_needed:
                    break
            allocated_indices = selected
        elif strategy == 'scattered':
            # Intentionally scatter blocks across available free indices with gaps to demonstrate fragmentation
            available = [b.block_index for b in free_blocks]
            stride = max(2, len(available) // max(1, blocks_needed * 2)) if len(available) >= blocks_needed * 2 else 2
            selected = []
            ptr = 0
            while len(selected) < blocks_needed and ptr < len(available):
                selected.append(available[ptr])
                ptr += stride
            # Fill remainder if stride reached end
            for b_idx in available:
                if len(selected) == blocks_needed:
                    break
                if b_idx not in selected:
                    selected.append(b_idx)
            allocated_indices = sorted(selected)
        else:
            allocated_indices = [b.block_index for b in free_blocks[:blocks_needed]]

        exec_time = (time.perf_counter() - start_time) * 1000.0
        extents = cls.count_extents(allocated_indices)

        return {
            'success': True,
            'method': 'linked',
            'strategy': strategy,
            'execution_time_ms': round(exec_time, 4),
            'block_indices': allocated_indices,
            'extents': extents,
            'index_block': None,
            'simulated_access_time_ms': cls.simulate_access_time(allocated_indices, 'linked')
        }

    @classmethod
    def allocate_indexed(cls, device_id, blocks_needed, strategy='first_fit'):
        """
        Indexed Allocation:
        Allocates 1 index block + blocks_needed data blocks.
        The index block stores block pointers.
        Fails if total free blocks < blocks_needed + 1.
        """
        start_time = time.perf_counter()
        total_needed = blocks_needed + 1 # 1 index block + N data blocks
        free_blocks = StorageBlock.query.filter_by(device_id=device_id, status='free').order_by(StorageBlock.block_index).all()

        if len(free_blocks) < total_needed:
            exec_time = (time.perf_counter() - start_time) * 1000.0
            return {
                'success': False,
                'method': 'indexed',
                'strategy': strategy,
                'error': f'Insufficient blocks: Need {total_needed} blocks (including 1 index block), only {len(free_blocks)} available.',
                'execution_time_ms': round(exec_time, 4),
                'block_indices': [],
                'extents': 0,
                'index_block': None
            }

        index_block = free_blocks[0].block_index
        data_free = free_blocks[1:]
        allocated_indices = [b.block_index for b in data_free[:blocks_needed]]

        exec_time = (time.perf_counter() - start_time) * 1000.0
        extents = cls.count_extents(allocated_indices)

        return {
            'success': True,
            'method': 'indexed',
            'strategy': strategy,
            'execution_time_ms': round(exec_time, 4),
            'block_indices': allocated_indices,
            'extents': extents,
            'index_block': index_block,
            'simulated_access_time_ms': cls.simulate_access_time(allocated_indices, 'indexed')
        }

    @classmethod
    def allocate_file(cls, device_id, blocks_needed, method='first_fit'):
        """
        Unified dispatcher for allocation methods:
        - 'contiguous' (defaults to first fit contiguous)
        - 'contiguous_best_fit'
        - 'linked'
        - 'indexed'
        - 'first_fit' (attempts contiguous first_fit, falls back to linked if fragmented)
        - 'best_fit' (attempts contiguous best_fit, falls back to linked if fragmented)
        """
        if method == 'contiguous':
            return cls.allocate_contiguous(device_id, blocks_needed, strategy='first_fit')
        elif method == 'contiguous_best_fit':
            return cls.allocate_contiguous(device_id, blocks_needed, strategy='best_fit')
        elif method == 'linked':
            return cls.allocate_linked(device_id, blocks_needed, strategy='first_fit')
        elif method == 'indexed':
            return cls.allocate_indexed(device_id, blocks_needed, strategy='first_fit')
        elif method == 'first_fit':
            # Try contiguous first fit first for optimal low-extent allocation
            res = cls.allocate_contiguous(device_id, blocks_needed, strategy='first_fit')
            if res['success']:
                res['method'] = 'first_fit'
                return res
            # Fallback to scattered linked allocation
            res = cls.allocate_linked(device_id, blocks_needed, strategy='first_fit')
            res['method'] = 'first_fit'
            return res
        elif method == 'best_fit':
            # Try contiguous best fit first
            res = cls.allocate_contiguous(device_id, blocks_needed, strategy='best_fit')
            if res['success']:
                res['method'] = 'best_fit'
                return res
            res = cls.allocate_linked(device_id, blocks_needed, strategy='best_fit')
            res['method'] = 'best_fit'
            return res
        elif method in ('scattered', 'scattered_linked'):
            res = cls.allocate_linked(device_id, blocks_needed, strategy='scattered')
            res['method'] = 'scattered'
            return res
        else:
            return cls.allocate_linked(device_id, blocks_needed)

