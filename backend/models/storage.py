import datetime
from database import db

class StorageDevice(db.Model):
    __tablename__ = 'storage_devices'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    total_capacity_kb = db.Column(db.Integer, nullable=False, default=102400) # Default 100 MB
    block_size_kb = db.Column(db.Integer, nullable=False, default=1024)       # Default 1 MB
    total_blocks = db.Column(db.Integer, nullable=False, default=100)
    is_active = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    blocks = db.relationship('StorageBlock', backref='device', cascade='all, delete-orphan', lazy='dynamic', order_by='StorageBlock.block_index')
    files = db.relationship('VirtualFile', backref='device', cascade='all, delete-orphan', lazy=True)
    folders = db.relationship('Folder', backref='device', cascade='all, delete-orphan', lazy=True)
    scans = db.relationship('FragmentationScan', backref='device', cascade='all, delete-orphan', lazy=True)
    ga_runs = db.relationship('GAOptimizationRun', backref='device', cascade='all, delete-orphan', lazy=True)
    defrag_ops = db.relationship('DefragOperation', backref='device', cascade='all, delete-orphan', lazy=True)
    perf_metrics = db.relationship('PerformanceMetric', backref='device', cascade='all, delete-orphan', lazy=True)

    def to_dict(self, include_blocks_summary=True):
        allocated_count = 0
        if include_blocks_summary:
            allocated_count = self.blocks.filter_by(status='allocated').count() + self.blocks.filter_by(status='index_node').count()
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'total_capacity_kb': self.total_capacity_kb,
            'block_size_kb': self.block_size_kb,
            'total_blocks': self.total_blocks,
            'used_blocks': allocated_count,
            'free_blocks': max(0, self.total_blocks - allocated_count),
            'used_kb': allocated_count * self.block_size_kb,
            'free_kb': (self.total_blocks - allocated_count) * self.block_size_kb,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class StorageBlock(db.Model):
    __tablename__ = 'storage_blocks'

    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('storage_devices.id'), nullable=False, index=True)
    block_index = db.Column(db.Integer, nullable=False, index=True)
    status = db.Column(db.String(20), default='free') # 'free', 'allocated', 'index_node', 'reserved'
    file_id = db.Column(db.Integer, db.ForeignKey('virtual_files.id', ondelete='SET NULL'), nullable=True, index=True)
    logical_block_index = db.Column(db.Integer, nullable=True)
    next_block_index = db.Column(db.Integer, nullable=True) # for linked allocation
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'device_id': self.device_id,
            'block_index': self.block_index,
            'status': self.status,
            'file_id': self.file_id,
            'file_name': self.file.name if self.file else None,
            'file_color': self.file.color_code if self.file else None,
            'logical_block_index': self.logical_block_index,
            'next_block_index': self.next_block_index,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

