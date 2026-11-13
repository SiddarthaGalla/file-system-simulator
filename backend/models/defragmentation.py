import datetime
import json
from database import db

class DefragOperation(db.Model):
    __tablename__ = 'defrag_operations'

    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('storage_devices.id'), nullable=False, index=True)
    mode = db.Column(db.String(20), default='manual') # 'manual', 'automatic'
    files_processed = db.Column(db.Integer, default=0)
    blocks_moved = db.Column(db.Integer, default=0)
    execution_time_ms = db.Column(db.Float, default=0.0)
    initial_fragmentation = db.Column(db.Float, default=0.0)
    final_fragmentation = db.Column(db.Float, default=0.0)
    initial_extents = db.Column(db.Integer, default=0)
    final_extents = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default='completed')
    details_json = db.Column(db.Text, default='{}')
    executed_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    @property
    def details(self):
        try:
            return json.loads(self.details_json or '{}')
        except:
            return {}

    def to_dict(self):
        return {
            'id': self.id,
            'device_id': self.device_id,
            'mode': self.mode,
            'files_processed': self.files_processed,
            'blocks_moved': self.blocks_moved,
            'execution_time_ms': round(self.execution_time_ms, 2),
            'initial_fragmentation': round(self.initial_fragmentation, 2),
            'final_fragmentation': round(self.final_fragmentation, 2),
            'fragmentation_reduction': round(max(0.0, self.initial_fragmentation - self.final_fragmentation), 2),
            'initial_extents': self.initial_extents,
            'final_extents': self.final_extents,
            'status': self.status,
            'details': self.details,
            'executed_at': self.executed_at.isoformat() if self.executed_at else None
        }

