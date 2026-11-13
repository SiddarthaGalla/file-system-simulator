import datetime
import json
from database import db

class GAOptimizationRun(db.Model):
    __tablename__ = 'ga_optimization_runs'

    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('storage_devices.id'), nullable=False, index=True)
    population_size = db.Column(db.Integer, default=50)
    generations = db.Column(db.Integer, default=40)
    mutation_rate = db.Column(db.Float, default=0.08)
    crossover_rate = db.Column(db.Float, default=0.85)
    elitism_count = db.Column(db.Integer, default=2)
    weights_json = db.Column(db.Text, default='{"w1": 0.5, "w2": 0.3, "w3": 0.2}')
    initial_fragmentation = db.Column(db.Float, nullable=False)
    optimized_fragmentation = db.Column(db.Float, nullable=False)
    initial_extents = db.Column(db.Integer, nullable=False)
    optimized_extents = db.Column(db.Integer, nullable=False)
    blocks_moved = db.Column(db.Integer, default=0)
    execution_time_ms = db.Column(db.Float, default=0.0)
    fitness_score = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(20), default='completed') # 'completed', 'applied', 'discarded'
    solution_mapping_json = db.Column(db.Text, nullable=False) # JSON: { file_id: [block_indices] }
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    generation_metrics = db.relationship('GAGenerationMetric', backref='run', cascade='all, delete-orphan', lazy=True, order_by='GAGenerationMetric.generation')

    @property
    def weights(self):
        try:
            return json.loads(self.weights_json or '{}')
        except:
            return {"w1": 0.5, "w2": 0.3, "w3": 0.2}

    @property
    def solution_mapping(self):
        try:
            return json.loads(self.solution_mapping_json or '{}')
        except:
            return {}

    def to_dict(self, include_metrics=True):
        data = {
            'id': self.id,
            'device_id': self.device_id,
            'population_size': self.population_size,
            'generations': self.generations,
            'mutation_rate': self.mutation_rate,
            'crossover_rate': self.crossover_rate,
            'elitism_count': self.elitism_count,
            'weights': self.weights,
            'initial_fragmentation': round(self.initial_fragmentation, 2),
            'optimized_fragmentation': round(self.optimized_fragmentation, 2),
            'fragmentation_reduction': round(max(0.0, self.initial_fragmentation - self.optimized_fragmentation), 2),
            'initial_extents': self.initial_extents,
            'optimized_extents': self.optimized_extents,
            'blocks_moved': self.blocks_moved,
            'execution_time_ms': round(self.execution_time_ms, 2),
            'fitness_score': round(self.fitness_score, 4),
            'status': self.status,
            'solution_mapping': self.solution_mapping,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_metrics:
            data['generation_metrics'] = [m.to_dict() for m in self.generation_metrics]
        return data

class GAGenerationMetric(db.Model):
    __tablename__ = 'ga_generation_metrics'

    id = db.Column(db.Integer, primary_key=True)
    run_id = db.Column(db.Integer, db.ForeignKey('ga_optimization_runs.id'), nullable=False, index=True)
    generation = db.Column(db.Integer, nullable=False)
    best_fitness = db.Column(db.Float, nullable=False)
    avg_fitness = db.Column(db.Float, nullable=False)
    best_fragmentation = db.Column(db.Float, nullable=False)
    extents_count = db.Column(db.Integer, nullable=False)

    def to_dict(self):
        return {
            'generation': self.generation,
            'best_fitness': round(self.best_fitness, 4),
            'avg_fitness': round(self.avg_fitness, 4),
            'best_fragmentation': round(self.best_fragmentation, 2),
            'extents_count': self.extents_count
        }

