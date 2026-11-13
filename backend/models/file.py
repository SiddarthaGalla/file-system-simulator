import datetime
from database import db

class Folder(db.Model):
    __tablename__ = 'folders'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    storage_device_id = db.Column(db.Integer, db.ForeignKey('storage_devices.id'), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('folders.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    files = db.relationship('VirtualFile', backref='folder', lazy=True)
    subfolders = db.relationship('Folder', backref=db.backref('parent', remote_side=[id]), lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'storage_device_id': self.storage_device_id,
            'name': self.name,
            'parent_id': self.parent_id,
            'files_count': len(self.files),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class VirtualFile(db.Model):
    __tablename__ = 'virtual_files'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    storage_device_id = db.Column(db.Integer, db.ForeignKey('storage_devices.id'), nullable=False, index=True)
    folder_id = db.Column(db.Integer, db.ForeignKey('folders.id'), nullable=True)
    name = db.Column(db.String(255), nullable=False)
    file_type = db.Column(db.String(50), nullable=False, default='txt')
    file_size_bytes = db.Column(db.Integer, nullable=False, default=0)
    allocated_blocks_count = db.Column(db.Integer, nullable=False, default=0)
    stored_filename = db.Column(db.String(255), nullable=True)
    allocation_method = db.Column(db.String(50), default='first_fit') # 'contiguous', 'linked', 'indexed', 'first_fit', 'best_fit', 'ga_optimized'
    is_fragmented = db.Column(db.Boolean, default=False)
    extents_count = db.Column(db.Integer, default=1)
    index_block_id = db.Column(db.Integer, nullable=True) # for indexed allocation
    color_code = db.Column(db.String(30), default='#3B82F6')
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    blocks = db.relationship('StorageBlock', backref='file', foreign_keys='StorageBlock.file_id', lazy=True)

    def to_dict(self, include_blocks=True):
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'storage_device_id': self.storage_device_id,
            'folder_id': self.folder_id,
            'folder_name': self.folder.name if self.folder else 'Root',
            'name': self.name,
            'file_type': self.file_type,
            'file_size_bytes': self.file_size_bytes,
            'allocated_blocks_count': self.allocated_blocks_count,
            'allocation_method': self.allocation_method,
            'is_fragmented': self.is_fragmented,
            'extents_count': self.extents_count,
            'index_block_id': self.index_block_id,
            'color_code': self.color_code,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        if include_blocks:
            allocated_blocks = sorted(self.blocks, key=lambda b: (b.logical_block_index if b.logical_block_index is not None else 9999))
            data['block_indices'] = [b.block_index for b in allocated_blocks]
        return data

