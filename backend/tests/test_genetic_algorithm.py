import unittest
from app import create_app
from database import db
from models.user import User
from models.storage import StorageDevice
from models.file import VirtualFile
from engine.virtual_disk import VirtualDiskManager
from engine.genetic_algorithm import GeneticAlgorithmOptimizer

class TestGeneticAlgorithm(unittest.TestCase):
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
            total_capacity_kb=20480,
            block_size_kb=1024,
            total_blocks=20,
            is_active=True
        )
        db.session.add(self.device)
        db.session.commit()
        VirtualDiskManager.initialize_blocks(self.device)

        # Create two files that are heavily fragmented
        # File 1: 4 blocks at [0, 4, 8, 12]
        # File 2: 3 blocks at [2, 6, 10]
        self.f1 = VirtualFile(
            user_id=self.user.id,
            storage_device_id=self.device.id,
            name='file1.bin',
            file_type='bin',
            file_size_bytes=4 * 1024 * 1024,
            allocated_blocks_count=4,
            allocation_method='linked'
        )
        self.f2 = VirtualFile(
            user_id=self.user.id,
            storage_device_id=self.device.id,
            name='file2.bin',
            file_type='bin',
            file_size_bytes=3 * 1024 * 1024,
            allocated_blocks_count=3,
            allocation_method='linked'
        )
        db.session.add_all([self.f1, self.f2])
        db.session.commit()

        VirtualDiskManager.assign_blocks(self.device.id, self.f1.id, [0, 4, 8, 12], method='linked')
        VirtualDiskManager.assign_blocks(self.device.id, self.f2.id, [2, 6, 10], method='linked')

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_ga_optimizer_reduces_extents_and_preserves_invariants(self):
        files = [self.f1, self.f2]
        blocks = self.device.blocks.all()

        config = {
            'population_size': 30,
            'generations': 25,
            'mutation_rate': 0.15,
            'crossover_rate': 0.85,
            'elitism_count': 2,
            'weights': {'w1': 0.6, 'w2': 0.3, 'w3': 0.1},
            'random_seed': 42
        }

        ga = GeneticAlgorithmOptimizer(self.device, files, blocks, config=config)
        result = ga.run()

        self.assertTrue(result['success'])
        self.assertGreater(result['execution_time_ms'], 0)
        self.assertEqual(len(result['generation_metrics']), 25)

        # Invariant checks on the best solution:
        best_mapping = result['solution_mapping']
        # File 1 must have exactly 4 blocks
        self.assertEqual(len(best_mapping[self.f1.id]), 4)
        # File 2 must have exactly 3 blocks
        self.assertEqual(len(best_mapping[self.f2.id]), 3)

        # No overlapping blocks
        set_f1 = set(best_mapping[self.f1.id])
        set_f2 = set(best_mapping[self.f2.id])
        self.assertEqual(len(set_f1.intersection(set_f2)), 0)

        # All indices must be in bounds [0, 19]
        all_assigned = list(set_f1) + list(set_f2)
        for idx in all_assigned:
            self.assertTrue(0 <= idx < self.device.total_blocks)

        # Extents should be improved or minimized
        self.assertLessEqual(result['optimized_extents'], result['initial_extents'])
        self.assertLessEqual(result['optimized_fragmentation'], result['initial_fragmentation'])

if __name__ == '__main__':
    unittest.main()

