
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from models import db, FingerprintingDetection
import os
from urllib.parse import urlparse

app = Flask(__name__, static_folder='./popup')
CORS(app)

# Configure database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///fingerprinting.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

with app.app_context():
    db.create_all()

@app.route('/')
def index():
    return send_from_directory('popup', 'popup.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

@app.route('/api/detections', methods=['GET'])
def get_detections():
    detections = FingerprintingDetection.query.order_by(FingerprintingDetection.timestamp.desc()).all()
    return jsonify([detection.to_dict() for detection in detections])

@app.route('/api/detections', methods=['POST'])
def add_detection():
    data = request.json
    url = data.get('url')
    domain = urlparse(url).netloc
    
    detection = FingerprintingDetection(
        url=url,
        domain=domain,
        method=data.get('method'),
        script_url=data.get('details', {}).get('scriptUrl'),
        detection_method=data.get('details', {}).get('detectionMethod')
    )
    
    db.session.add(detection)
    db.session.commit()
    
    return jsonify(detection.to_dict())

@app.route('/api/detections', methods=['DELETE'])
def clear_detections():
    FingerprintingDetection.query.delete()
    db.session.commit()
    return jsonify({'status': 'success'})

@app.route('/api/stats', methods=['GET'])
def get_stats():
    total_detections = FingerprintingDetection.query.count()
    unique_domains = db.session.query(FingerprintingDetection.domain).distinct().count()
    
    recent_detections = FingerprintingDetection.query.order_by(
        FingerprintingDetection.timestamp.desc()
    ).limit(5).all()
    
    return jsonify({
        'total_detections': total_detections,
        'unique_domains': unique_domains,
        'recent_detections': [detection.to_dict() for detection in recent_detections]
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)  # Changed port to avoid conflicts
