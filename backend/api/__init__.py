from api.auth import auth_bp
from api.storage import storage_bp
from api.files import files_bp
from api.allocation import allocation_bp
from api.fragmentation import fragmentation_bp
from api.optimization import optimization_bp
from api.defragmentation import defragmentation_bp
from api.analytics import analytics_bp
from api.reports import reports_bp
from api.demo import demo_bp
from api.scheduling import scheduling_bp

def register_blueprints(app):
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(storage_bp, url_prefix='/api/storage')
    app.register_blueprint(files_bp, url_prefix='/api/files')
    app.register_blueprint(allocation_bp, url_prefix='/api/allocation')
    app.register_blueprint(fragmentation_bp, url_prefix='/api/fragmentation')
    app.register_blueprint(optimization_bp, url_prefix='/api/optimization')
    app.register_blueprint(defragmentation_bp, url_prefix='/api/defragmentation')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
    app.register_blueprint(demo_bp, url_prefix='/api/demo')
    app.register_blueprint(scheduling_bp, url_prefix='/api/scheduling')

