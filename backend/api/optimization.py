import json
from flask import Blueprint, request, jsonify
from database import db
from models.storage import StorageDevice, StorageBlock
from models.file import VirtualFile
from models.optimization import GAOptimizationRun, GAGenerationMetric
from models.history import ActivityLog, PerformanceMetric
from engine.genetic_algorithm import GeneticAlgorithmOptimizer
from engine.fragmentation_analyzer import FragmentationAnalyzer
from api.auth import jwt_required

optimization_bp = Blueprint('optimization', __name__)

@optimization_bp.route('/run', methods=['POST'])
@jwt_required
def run_optimization():
    """
    Executes real Genetic Algorithm on active storage device.
    Computes generations, evaluates fitness, and returns best solution.
    """
    user = request.current_user
    data = request.get_json() or {}
    device_id = data.get('storage_id')

    if not device_id:
        active = StorageDevice.query.filter_by(user_id=user.id, is_active=True).first()
        if active:
            device_id = active.id

    device = StorageDevice.query.filter_by(id=device_id, user_id=user.id).first()
    if not device:
        return jsonify({'error': 'Storage device not found'}), 404

    files = VirtualFile.query.filter_by(storage_device_id=device.id).all()
    blocks = device.blocks.all()

    if not files or all(f.allocated_blocks_count == 0 for f in files):
        return jsonify({'error': 'No allocated files found on device to optimize'}), 400

    config = {
        'population_size': data.get('population_size', 40),
        'generations': data.get('generations', 30),
        'mutation_rate': data.get('mutation_rate', 0.15),
        'crossover_rate': data.get('crossover_rate', 0.85),
        'elitism_count': data.get('elitism_count', 2),
        'weights': data.get('weights', {'w1': 0.55, 'w2': 0.30, 'w3': 0.15}),
        'random_seed': data.get('random_seed')
    }

    ga = GeneticAlgorithmOptimizer(device, files, blocks, config=config)
    result = ga.run()

    # Save GAOptimizationRun record
    run = GAOptimizationRun(
        device_id=device.id,
        population_size=config['population_size'],
        generations=config['generations'],
        mutation_rate=config['mutation_rate'],
        crossover_rate=config['crossover_rate'],
        elitism_count=config['elitism_count'],
        weights_json=json.dumps(config['weights']),
        initial_fragmentation=result['initial_fragmentation'],
        optimized_fragmentation=result['optimized_fragmentation'],
        initial_extents=result['initial_extents'],
        optimized_extents=result['optimized_extents'],
        blocks_moved=result['blocks_moved'],
        execution_time_ms=result['execution_time_ms'],
        fitness_score=result['best_fitness'],
        status='completed',
        solution_mapping_json=json.dumps(result['solution_mapping'])
    )
    db.session.add(run)
    db.session.flush()

    # Save generation progression metrics
    metric_objects = []
    for m in result['generation_metrics']:
        metric_objects.append(GAGenerationMetric(
            run_id=run.id,
            generation=m['generation'],
            best_fitness=m['best_fitness'],
            avg_fitness=m['avg_fitness'],
            best_fragmentation=m['best_fragmentation'],
            extents_count=m['extents_count']
        ))
    db.session.bulk_save_objects(metric_objects)

    log = ActivityLog(
        user_id=user.id,
        device_id=device.id,
        action_type='GA_OPTIMIZE',
        description=f"Executed Genetic Algorithm (fitness: {result['best_fitness']}, frag: {result['initial_fragmentation']}% -> {result['optimized_fragmentation']}%, extents: {result['initial_extents']} -> {result['optimized_extents']})"
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'message': 'Genetic Algorithm optimization completed',
        'run': run.to_dict(include_metrics=True)
    }), 200

@optimization_bp.route('/<int:run_id>', methods=['GET'])
@jwt_required
def get_optimization_run(run_id):
    user = request.current_user
    run = db.session.get(GAOptimizationRun, run_id)
    if not run:
        return jsonify({'error': 'Optimization run not found'}), 404

    # Verify ownership
    device = StorageDevice.query.filter_by(id=run.device_id, user_id=user.id).first()
    if not device:
        return jsonify({'error': 'Unauthorized'}), 403

    return jsonify({'run': run.to_dict(include_metrics=True)}), 200

@optimization_bp.route('/<int:run_id>/apply', methods=['POST'])
@jwt_required
def apply_optimization(run_id):
    """
    Applies the GA solution mapping to the active virtual disk.
    Transaction safe with rollback.
    """
    user = request.current_user
    run = db.session.get(GAOptimizationRun, run_id)
    if not run:
        return jsonify({'error': 'Optimization run not found'}), 404

    device = StorageDevice.query.filter_by(id=run.device_id, user_id=user.id).first()
    if not device:
        return jsonify({'error': 'Device not found'}), 404

    solution_mapping = run.solution_mapping
    if not solution_mapping:
        return jsonify({'error': 'No solution mapping found for this run'}), 400

    all_blocks = {b.block_index: b for b in StorageBlock.query.filter_by(device_id=device.id).all()}

    try:
        # First, clear all current allocations
        for b in all_blocks.values():
            b.file_id = None
            b.status = 'free'
            b.logical_block_index = None
            b.next_block_index = None

        # Reassign based on solution_mapping { str(file_id): [indices] }
        for fid_str, indices in solution_mapping.items():
            fid = int(fid_str)
            vf = db.session.get(VirtualFile, fid)
            if not vf:
                continue

            indices_sorted = sorted(indices)
            total = len(indices_sorted)

            for logical_idx, b_idx in enumerate(indices_sorted):
                if b_idx in all_blocks:
                    block = all_blocks[b_idx]
                    block.file_id = fid
                    block.status = 'allocated'
                    block.logical_block_index = logical_idx
                    if vf.allocation_method == 'linked' and logical_idx + 1 < total:
                        block.next_block_index = indices_sorted[logical_idx + 1]
                    else:
                        block.next_block_index = None

            # Count extents
            extents = 1
            for i in range(1, len(indices_sorted)):
                if indices_sorted[i] != indices_sorted[i-1] + 1:
                    extents += 1

            vf.extents_count = extents
            vf.is_fragmented = extents > 1
            vf.allocation_method = 'ga_optimized'

        run.status = 'applied'

        log = ActivityLog(
            user_id=user.id,
            device_id=device.id,
            action_type='GA_APPLIED',
            description=f"Applied GA optimization solution #{run.id} to storage device '{device.name}'"
        )
        db.session.add(log)
        db.session.commit()

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to apply optimization: {str(e)}'}), 500

    # Return refreshed device and analysis
    analysis = FragmentationAnalyzer.analyze(device)
    return jsonify({
        'message': 'Genetic Algorithm allocation applied successfully to virtual disk',
        'device': device.to_dict(),
        'analysis': analysis
    }), 200
