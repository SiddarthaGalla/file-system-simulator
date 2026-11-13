import unittest
from app import create_app
from database import db
from models.user import User
from models.storage import StorageDevice, StorageBlock
from models.file import VirtualFile
from engine.virtual_disk import VirtualDiskManager
from engine.allocation_manager import AllocationManager

class TestAllocationAlgorithms(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        # Create user & 20-block storage device
        self.user = User(username='testuser', email='test@test.com')
        self.user.set_password('password123')
        db.session.add(self.user)
        db.session.commit()

        self.device = StorageDevice(
            user_id=self.user.id,
            name='Test Device',
            total_capacity_kb=20480, # 20 MB
            block_size_kb=1024,      # 1 MB
            total_blocks=20,
            is_active=True
        )
        db.session.add(self.device)
        db.session.commit()
        VirtualDiskManager.initialize_blocks(self.device)

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_contiguous_allocation(self):
        # 1. Allocate 5 contiguous blocks
        res = AllocationManager.allocate_contiguous(self.device.id, 5)
        self.assertTrue(res['success'])
        self.assertEqual(len(res['block_indices']), 5)
        self.assertEqual(res['extents'], 1)
        self.assertEqual(res['block_indices'], [0, 1, 2, 3, 4])

    def test_contiguous_allocation_failure_on_fragmented_space(self):
        # Occupy blocks 0, 2, 4, leaving only 1-block gaps
        blocks = StorageBlock.query.filter_by(device_id=self.device.id).all()
        for idx in [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]:
            blocks[idx].status = 'allocated'
        db.session.commit()

        # Attempt contiguous allocation of 3 blocks -> should fail because no gap >= 3
        res = AllocationManager.allocate_contiguous(self.device.id, 3)
        self.assertFalse(res['success'])
        self.assertIn('No continuous free segment', res['error'])

    def test_linked_allocation_utilizes_scattered_blocks(self):
        # Even with fragmented free blocks, linked allocation succeeds
        blocks = StorageBlock.query.filter_by(device_id=self.device.id).all()
        for idx in [0, 2, 4]:
            blocks[idx].status = 'allocated'
        db.session.commit()

        res = AllocationManager.allocate_linked(self.device.id, 4)
        self.assertTrue(res['success'])
        self.assertEqual(len(res['block_indices']), 4)
        # Should take free blocks like [1, 3, 5, 7]
        self.assertTrue(res['extents'] > 1)

    def test_indexed_allocation(self):
        # Needs 1 index block + N data blocks
        res = AllocationManager.allocate_indexed(self.device.id, 3)
        self.assertTrue(res['success'])
        self.assertIsNotNone(res['index_block'])
        self.assertEqual(len(res['block_indices']), 3)

if __name__ == '__main__':
    unittest.main()

