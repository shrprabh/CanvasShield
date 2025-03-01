import os
from flask import Flask, request, jsonify
from models import db, FingerprintingDetection
from urllib.parse import urlparse
from datetime import datetime

app = Flask(__name__)

# Database configuration
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

# Initialize the database
db.init_app(app)

# Create tables
with app.app_context():
    db.create_all()

@app.route('/api/detections', methods=['POST'])
def store_detection():
    data = request.json
    domain = urlparse(data['url']).netloc

    detection = FingerprintingDetection(
        url=data['url'],
        domain=domain,
        method=data['method'],
        script_url=data.get('scriptUrl'),
        detection_method=data.get('detectionMethod')
    )

    db.session.add(detection)
    db.session.commit()

    return jsonify({'status': 'success', 'id': detection.id})

@app.route('/api/detections', methods=['GET'])
def get_detections():
    detections = FingerprintingDetection.query.order_by(
        FingerprintingDetection.timestamp.desc()
    ).limit(1000).all()

    return jsonify({
        'detections': [detection.to_dict() for detection in detections]
    })

@app.route('/api/detections', methods=['DELETE'])
def clear_detections():
    FingerprintingDetection.query.delete()
    db.session.commit()
    return jsonify({'status': 'success'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)