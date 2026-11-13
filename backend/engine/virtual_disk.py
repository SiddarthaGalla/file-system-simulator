from database import db
from models.storage import StorageDevice, StorageBlock
from models.file import VirtualFile

class VirtualDiskManager:
    """
    Manages low-level virtual disk blocks, ensuring no block overlap,
    handling allocation updates and block clearing.
    """

    @staticmethod
    def initialize_blocks(device):
        """
        Populate storage_blocks for a new or reset device.
        """
        # Remove any existing blocks
        StorageBlock.query.filter_by(device_id=device.id).delete()
        
        blocks_to_insert = []
        for i in range(device.total_blocks):
            blocks_to_insert.append(StorageBlock(
                device_id=device.id,
                block_index=i,
                status='free',
                file_id=None,
                logical_block_index=None,
                next_block_index=None
            ))
        db.session.bulk_save_objects(blocks_to_insert)
        db.session.commit()

    @staticmethod
    def get_disk_array(device_id):
        """
        Returns list of (block_index, file_id, status)
        """
        blocks = StorageBlock.query.filter_by(device_id=device_id).order_by(StorageBlock.block_index).all()
        return blocks

    @staticmethod
    def clear_file_blocks(file_id):
        """
        Releases all blocks allocated to a specific file.
        """
        blocks = StorageBlock.query.filter_by(file_id=file_id).all()
        for b in blocks:
            b.status = 'free'
            b.file_id = None
            b.logical_block_index = None
            b.next_block_index = None
        db.session.commit()
        return len(blocks)

    @staticmethod
    def assign_blocks(device_id, file_id, block_indices, method='first_fit', index_block=None):
        """
        Atomically assigns specific block indices to a file.
        Updates logical_block_index and next_block_index as appropriate.
        """
        blocks_map = {b.block_index: b for b in StorageBlock.query.filter_by(device_id=device_id).all()}

        # Mark index block if indexed
        if index_block is not None and index_block in blocks_map:
            ib = blocks_map[index_block]
            ib.status = 'index_node'
            ib.file_id = file_id
            ib.logical_block_index = -1
            ib.next_block_index = None

        total = len(block_indices)
        for logical_idx, b_idx in enumerate(block_indices):
            if b_idx not in blocks_map:
                continue
            b = blocks_map[b_idx]
            b.status = 'allocated'
            b.file_id = file_id
            b.logical_block_index = logical_idx
            if method == 'linked':
                next_idx = block_indices[logical_idx + 1] if logical_idx + 1 < total else None
                b.next_block_index = next_idx
            else:
                b.next_block_index = None

        db.session.commit()

    @staticmethod
    def find_free_runs(device_id):
        """
        Returns list of tuples: (start_block_index, run_length)
        """
        blocks = StorageBlock.query.filter_by(device_id=device_id).order_by(StorageBlock.block_index).all()
        free_runs = []
        current_start = None
        current_len = 0

        for b in blocks:
            if b.status == 'free':
                if current_start is None:
                    current_start = b.block_index
                current_len += 1
            else:
                if current_start is not None:
                    free_runs.append((current_start, current_len))
                    current_start = None
                    current_len = 0

        if current_start is not None:
            free_runs.append((current_start, current_len))

        return free_runs

