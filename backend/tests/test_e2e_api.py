import unittest
import json
import io
from app import create_app
from database import db

class TestE2EApi(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_full_user_workflow(self):
        # 1. Health check
        res = self.client.get('/api/health')
        self.assertEqual(res.status_code, 200)

        # 2. Register
        reg_payload = {
            'username': 'researcher1',
            'email': 'researcher@example.com',
            'password': 'password123',
            'full_name': 'Dr. Ada Lovelace'
        }
        res = self.client.post('/api/auth/register', json=reg_payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        token = data['token']
        self.assertIsNotNone(token)
        headers = {'Authorization': f"Bearer {token}"}

        # 3. Get / Create active device
        res = self.client.get('/api/storage/active', headers=headers)
        self.assertEqual(res.status_code, 200)
        device = res.get_json()['device']
        device_id = device['id']
        self.assertEqual(device['total_blocks'], 100)

        # 4. Seed Demo Scenario
        res = self.client.post('/api/demo/seed', headers=headers)
        self.assertEqual(res.status_code, 201)
        seed_data = res.get_json()
        self.assertIn('analysis', seed_data)
        self.assertGreater(seed_data['analysis']['fragmentation_ratio'], 0)
        device_id = seed_data['device']['id']

        # 5. List Files
        res = self.client.get(f'/api/files?storage_id={device_id}', headers=headers)
        self.assertEqual(res.status_code, 200)
        files = res.get_json()['files']
        self.assertGreater(len(files), 0)

        # 6. Test File Upload (multipart)
        file_content = b"Simulated cloud payload content" * 1000
        data = {
            'storage_id': str(device_id),
            'allocation_method': 'linked',
            'files': (io.BytesIO(file_content), 'test_upload.pdf')
        }
        res = self.client.post('/api/files/upload', data=data, content_type='multipart/form-data', headers=headers)
        self.assertEqual(res.status_code, 201)

        # 7. Scan Fragmentation
        res = self.client.post('/api/fragmentation/scan', json={'storage_id': device_id}, headers=headers)
        self.assertEqual(res.status_code, 200)
        scan = res.get_json()['scan']
        self.assertGreaterEqual(scan['total_extents'], 1)

        # 8. Run Genetic Algorithm
        ga_payload = {
            'storage_id': device_id,
            'population_size': 20,
            'generations': 15,
            'mutation_rate': 0.15,
            'crossover_rate': 0.85,
            'elitism_count': 2,
            'weights': {'w1': 0.6, 'w2': 0.3, 'w3': 0.1}
        }
        res = self.client.post('/api/optimization/run', json=ga_payload, headers=headers)
        self.assertEqual(res.status_code, 200)
        ga_run = res.get_json()['run']
        self.assertGreater(ga_run['id'], 0)
        self.assertLessEqual(ga_run['optimized_fragmentation'], ga_run['initial_fragmentation'])

        # 9. Apply GA Optimization
        res = self.client.post(f"/api/optimization/{ga_run['id']}/apply", headers=headers)
        self.assertEqual(res.status_code, 200)

        # 10. Run Dynamic Defragmentation
        defrag_payload = {
            'storage_id': device_id,
            'mode': 'manual',
            'threshold': 15.0
        }
        res = self.client.post('/api/defragmentation/run', json=defrag_payload, headers=headers)
        self.assertEqual(res.status_code, 200)

        # 11. Dashboard Analytics
        res = self.client.get(f'/api/analytics/dashboard?storage_id={device_id}', headers=headers)
        self.assertEqual(res.status_code, 200)
        dash = res.get_json()
        self.assertTrue(dash['has_device'])
        self.assertIn('storage_usage', dash['charts'])

        # 12. Comparison Analytics
        res = self.client.get(f'/api/analytics/comparison?storage_id={device_id}', headers=headers)
        self.assertEqual(res.status_code, 200)
        comp = res.get_json()
        self.assertIn('matrix', comp)

        # 13. PDF Report Export
        res = self.client.get(f'/api/reports/export/pdf?storage_id={device_id}', headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.mimetype, 'application/pdf')
        self.assertGreater(len(res.data), 1000)

        # 14. CSV Report Export
        res = self.client.get(f'/api/reports/export/csv?type=files&storage_id={device_id}', headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertIn('Name,Type,Size_Bytes', res.data.decode('utf-8'))

        # 15. Clear Demo Data / Start Fresh
        res = self.client.post('/api/demo/clear', json={'storage_id': device_id}, headers=headers)
        self.assertEqual(res.status_code, 200)
        clear_res = res.get_json()
        self.assertEqual(clear_res['device']['used_blocks'], 0)
        self.assertEqual(clear_res['device']['free_blocks'], 100)
        self.assertEqual(clear_res['analysis']['total_files'], 0)

if __name__ == '__main__':
    unittest.main()
