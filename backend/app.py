import os
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from database import db
from api import register_blueprints

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable CORS for all frontend interactions
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # Initialize extensions
    db.init_app(app)

    # Register API blueprints
    register_blueprints(app)

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'service': 'Intelligent File Storage & Allocation Management Simulator',
            'version': '1.0.0'
        }), 200

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Resource not found'}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({'error': 'Internal server error'}), 500

    with app.app_context():
        # Ensure upload folder exists
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        # Create database tables
        db.create_all()

    return app

if __name__ == '__main__':
    application = create_app()
    # Runs on port 5000
    application.run(host='127.0.0.1', port=5000, debug=True)

