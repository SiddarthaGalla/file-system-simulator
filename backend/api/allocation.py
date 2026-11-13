import time
from flask import Blueprint, request, jsonify
from database import db
from models.storage import StorageDevice, StorageBlock
from models.file import VirtualFile
from models.history import PerformanceMetric
from engine.allocation_manager import AllocationManager
from engine.fragmentation_analyzer import FragmentationAnalyzer
from api.auth import jwt_required

allocation_bp = Blueprint('allocation', __name__)

@allocation_bp.route('/<int:storage_id>', methods=['GET'])
@jwt_required
def get_allocation_info(storage_id):
    user = request.current_user
    device = StorageDevice.query.filter_by(id=storage_id, user_id=user.id).first()
    if not device:
        return jsonify({'error': 'Storage device not found'}), 404

    files = VirtualFile.query.filter_by(storage_device_id=device.id).all()
    analysis = FragmentationAnalyzer.analyze(device, files=files)

    return jsonify({
        'device_id': device.id,
        'analysis': analysis
    }), 200

@allocation_bp.route('/allocate', methods=['POST'])
@jwt_required
def test_allocation():
    """
    Simulates allocation for a hypothetical file of size N blocks without modifying DB.
    """
    user = request.current_user
    data = request.get_json() or {}
    device_id = data.get('storage_id')
    blocks_needed = int(data.get('blocks_needed', 5))
    method = data.get('method', 'first_fit')

    device = StorageDevice.query.filter_by(id=device_id, user_id=user.id).first()
    if not device:
        return jsonify({'error': 'Storage device not found'}), 404

    res = AllocationManager.allocate_file(device.id, blocks_needed, method=method)
    return jsonify({'result': res}), 200

@allocation_bp.route('/compare', methods=['POST'])
@jwt_required
def compare_algorithms():
    """
    Runs benchmark simulations of Contiguous, Linked, Indexed, First Fit, and Best Fit
    across consistent file workload scenarios on the current device state.
    """
    user = request.current_user
    data = request.get_json() or {}
    device_id = data.get('storage_id')
    file_sizes = data.get('file_sizes', [4, 8, 12, 16, 6]) # blocks needed for test files

    device = StorageDevice.query.filter_by(id=device_id, user_id=user.id).first()
    if not device:
        return jsonify({'error': 'Storage device not found'}), 404

    methods = ['contiguous', 'linked', 'indexed', 'first_fit', 'best_fit']
    results = {}

    for m in methods:
        start_time = time.perf_counter()
        allocations = []
        total_extents = 0
        successful = 0
        total_access_time = 0.0

        for sz in file_sizes:
            res = AllocationManager.allocate_file(device.id, sz, method=m)
            allocations.append(res)
            if res['success']:
                successful += 1
                total_extents += res.get('extents', 1)
                total_access_time += res.get('simulated_access_time_ms', 0.0)

        total_exec_time = (time.perf_counter() - start_time) * 1000.0

        frag_ratio = 0.0
        if total_extents > 0 and successful > 0:
            frag_ratio = ((total_extents - successful) / float(total_extents)) * 100.0

        results[m] = {
            'method': m,
            'success_rate_pct': round((successful / float(len(file_sizes))) * 100.0, 1),
            'successful_allocations': successful,
            'total_files_tested': len(file_sizes),
            'execution_time_ms': round(total_exec_time, 3),
            'avg_access_time_ms': round(total_access_time / max(1, successful), 2),
            'total_extents': total_extents,
            'fragmentation_ratio': round(frag_ratio, 2),
            'allocations': allocations
        }

    return jsonify({'comparison': results}), 200

