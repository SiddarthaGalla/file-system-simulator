import unittest
from app import create_app
from database import db
from models.user import User
from models.storage import StorageDevice, StorageBlock
from models.file import VirtualFile
from engine.virtual_disk import VirtualDiskManager
from engine.fragmentation_analyzer import FragmentationAnalyzer

class TestFragmentationAnalysis(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        self.user = User(username='testuser', email='test@test.com')
        self.user.set_password('password123')
        db.session.add(self.user)
        db.session.commit()

        self.device = StorageDevice(
            user_id=self.user.id,
            name='Test Device',
            total_capacity_kb=10240, # 10 MB
            block_size_kb=1024,      # 1 MB
            total_blocks=10,
            is_active=True
        )
        db.session.add(self.device)
        db.session.commit()
        VirtualDiskManager.initialize_blocks(self.device)

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_clean_storage_metrics(self):
        analysis = FragmentationAnalyzer.analyze(self.device)
        self.assertEqual(analysis['total_blocks'], 10)
        self.assertEqual(analysis['used_blocks'], 0)
        self.assertEqual(analysis['free_blocks'], 10)
        self.assertEqual(analysis['largest_free_extent'], 10)
        self.assertEqual(analysis['fragmentation_ratio'], 0.0)

    def test_fragmented_storage_metrics(self):
        # Create a fragmented file across blocks 0, 2, 4
        f1 = VirtualFile(
            user_id=self.user.id,
            storage_device_id=self.device.id,
            name='frag_file.bin',
            file_type='bin',
            file_size_bytes=3 * 1024 * 1024,
            allocated_blocks_count=3,
            allocation_method='linked'
        )
        db.session.add(f1)
        db.session.commit()

        VirtualDiskManager.assign_blocks(self.device.id, f1.id, [0, 2, 4], method='linked')

        analysis = FragmentationAnalyzer.analyze(self.device, files=[f1])
        self.assertEqual(analysis['used_blocks'], 3)
        self.assertEqual(analysis['free_blocks'], 7)
        self.assertEqual(analysis['fragmented_files_count'], 1)
        # 3 separate extents for 1 file -> Fragmentation Ratio = (3 - 1) / 3 * 100 = 66.67%
        self.assertAlmostEqual(analysis['fragmentation_ratio'], 66.67, places=1)
        # Free blocks are at 1, 3, and [5..9] (length 5). Largest contiguous is 5.
        self.assertEqual(analysis['largest_free_extent'], 5)

if __name__ == '__main__':
    unittest.main()

