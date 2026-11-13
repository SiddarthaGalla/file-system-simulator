import os

class Config:
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    SECRET_KEY = os.environ.get('SECRET_KEY', 'super-secret-key-cloud-storage-ga-2026')
    _db_path = os.path.join(BASE_DIR, 'storage_simulator.db').replace(os.sep, '/')
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', 
        f"sqlite:///{_db_path}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100 MB max request size
    JWT_EXPIRY_HOURS = 24

