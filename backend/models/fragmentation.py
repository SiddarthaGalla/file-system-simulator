import datetime
from database import db

class FragmentationScan(db.Model):
    __tablename__ = 'fragmentation_scans'

    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('storage_devices.id'), nullable=False, index=True)
    total_blocks = db.Column(db.Integer, nullable=False)
    used_blocks = db.Column(db.Integer, nullable=False)
    free_blocks = db.Column(db.Integer, nullable=False)
    total_files = db.Column(db.Integer, nullable=False)
    fragmented_files_count = db.Column(db.Integer, nullable=False)
    fragmentation_ratio = db.Column(db.Float, nullable=False) # e.g. 35.5%
    external_fragmentation_pct = db.Column(db.Float, nullable=False)
    internal_fragmentation_kb = db.Column(db.Float, nullable=False)
    total_extents = db.Column(db.Integer, nullable=False)
    largest_free_extent = db.Column(db.Integer, nullable=False)
    wasted_storage_kb = db.Column(db.Float, default=0.0)
    scanned_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'device_id': self.device_id,
            'total_blocks': self.total_blocks,
            'used_blocks': self.used_blocks,
            'free_blocks': self.free_blocks,
            'total_files': self.total_files,
            'fragmented_files_count': self.fragmented_files_count,
            'fragmentation_ratio': round(self.fragmentation_ratio, 2),
            'external_fragmentation_pct': round(self.external_fragmentation_pct, 2),
            'internal_fragmentation_kb': round(self.internal_fragmentation_kb, 2),
            'total_extents': self.total_extents,
            'largest_free_extent': self.largest_free_extent,
            'wasted_storage_kb': round(self.wasted_storage_kb, 2),
            'scanned_at': self.scanned_at.isoformat() if self.scanned_at else None
        }

