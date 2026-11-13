import datetime
import json
from database import db

class ActivityLog(db.Model):
    __tablename__ = 'activity_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    device_id = db.Column(db.Integer, db.ForeignKey('storage_devices.id'), nullable=True, index=True)
    action_type = db.Column(db.String(50), nullable=False) # 'UPLOAD', 'DELETE', 'SCAN', 'GA_OPTIMIZE', 'DEFRAG', 'ALLOCATE'
    description = db.Column(db.String(255), nullable=False)
    details_json = db.Column(db.Text, default='{}')
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, index=True)

    @property
    def details(self):
        try:
            return json.loads(self.details_json or '{}')
        except:
            return {}

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'device_id': self.device_id,
            'action_type': self.action_type,
            'description': self.description,
            'details': self.details,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class PerformanceMetric(db.Model):
    __tablename__ = 'performance_metrics'

    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('storage_devices.id'), nullable=False, index=True)
    method = db.Column(db.String(50), nullable=False) # Contiguous, Linked, Indexed, First Fit, Best Fit, Genetic Algorithm
    allocation_time_ms = db.Column(db.Float, default=0.0)
    simulated_access_time_ms = db.Column(db.Float, default=0.0)
    fragmentation_ratio = db.Column(db.Float, default=0.0)
    extents_count = db.Column(db.Integer, default=0)
    storage_utilization = db.Column(db.Float, default=0.0)
    blocks_moved = db.Column(db.Integer, default=0)
    recorded_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'device_id': self.device_id,
            'method': self.method,
            'allocation_time_ms': round(self.allocation_time_ms, 2),
            'simulated_access_time_ms': round(self.simulated_access_time_ms, 2),
            'fragmentation_ratio': round(self.fragmentation_ratio, 2),
            'extents_count': self.extents_count,
            'storage_utilization': round(self.storage_utilization, 2),
            'blocks_moved': self.blocks_moved,
            'recorded_at': self.recorded_at.isoformat() if self.recorded_at else None
        }

