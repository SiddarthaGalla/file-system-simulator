import unittest
from engine.disk_scheduler import DiskScheduler
from app import create_app
from database import db
from models.user import User
from models.storage import StorageDevice
from engine.virtual_disk import VirtualDiskManager
from engine.workload_generator import WorkloadGenerator

class TestSchedulerAndWorkload(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        self.user = User(username='test_scheduler_user', email='sched@test.com')
        self.user.set_password('password123')
        db.session.add(self.user)
        db.session.commit()

        self.device = StorageDevice(
            user_id=self.user.id,
            name='Scheduling Test Disk',
            total_capacity_kb=51200,
            block_size_kb=1024,
            total_blocks=50,
            is_active=True
        )
        db.session.add(self.device)
        db.session.commit()
        VirtualDiskManager.initialize_blocks(self.device)

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_disk_scheduler_algorithms(self):
        requests = [23, 40, 10, 35, 5]
        initial_head = 20

        fcfs_res = DiskScheduler.fcfs(requests, initial_head)
        self.assertEqual(fcfs_res['algorithm'], 'FCFS')
        self.assertGreater(fcfs_res['total_head_movement'], 0)

        sstf_res = DiskScheduler.sstf(requests, initial_head)
        self.assertEqual(sstf_res['algorithm'], 'SSTF')
        # SSTF should minimize head movement compared to random order
        self.assertLessEqual(sstf_res['total_head_movement'], fcfs_res['total_head_movement'])

        scan_res = DiskScheduler.scan(requests, total_blocks=50, initial_head=initial_head)
        self.assertEqual(scan_res['algorithm'], 'SCAN')

        look_res = DiskScheduler.look(requests, initial_head=initial_head)
        self.assertEqual(look_res['algorithm'], 'LOOK')

        all_res = DiskScheduler.evaluate_all(requests, total_blocks=50, initial_head=initial_head)
        self.assertIn('winner', all_res)
        self.assertEqual(len(all_res['algorithms']), 5)

    def test_workload_generator_execution(self):
        result = WorkloadGenerator.run_workload(
            user_id=self.user.id,
            device_id=self.device.id,
            profile_key='web_server',
            operations_count=6
        )
        self.assertEqual(result['profile']['name'], 'Web Server Burst & Purge')
        self.assertGreater(result['steps_executed'], 0)
        self.assertIn('analysis', result)

if __name__ == '__main__':
    unittest.main()
