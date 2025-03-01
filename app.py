from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
from datetime import datetime
import os

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# In-memory storage instead of SQL database
detections = []

# Helper to get next ID
def get_next_id():
    return len(detections) + 1

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/api/detections', methods=['GET', 'POST', 'DELETE'])
def handle_detections():
    global detections
    
    if request.method == 'GET':
        # Filter by domain if provided
        domain = request.args.get('domain')
        if domain:
            filtered = [d for d in detections if domain in d.get('domain', '')]
            return jsonify(filtered)
        return jsonify(detections)
    
    elif request.method == 'POST':
        data = request.json
        detection = {
            'id': get_next_id(),
            'url': data.get('url', ''),
            'domain': data.get('url', '').split('/')[2] if '//' in data.get('url', '') else '',
            'timestamp': data.get('timestamp', datetime.now().timestamp() * 1000),
            'method': data.get('method', 'unknown'),
            'details': data.get('details', {})
        }
        detections.append(detection)
        return jsonify({'success': True, 'id': detection['id']})
    
    elif request.method == 'DELETE':
        detections = []
        return jsonify({'success': True, 'message': 'All detections cleared'})

@app.route('/api/stats', methods=['GET'])
def get_stats():
    domains = set()
    for detection in detections:
        if 'domain' in detection and detection['domain']:
            domains.add(detection['domain'])
    
    # Sort detections by timestamp (newest first) and get most recent 5
    sorted_detections = sorted(detections, key=lambda x: x.get('timestamp', 0), reverse=True)
    recent = sorted_detections[:5] if sorted_detections else []
    
    return jsonify({
        'total_detections': len(detections),
        'unique_domains': len(domains),
        'domains': list(domains),
        'recent_detections': recent  # Add this line
    })

@app.route('/api/test/add-detection', methods=['GET'])
def add_test_detection():
    """Add a test detection entry"""
    domain = request.args.get('domain', 'test.example.com')
    method = request.args.get('method', 'testMethod')
    
    detection = {
        'id': get_next_id(),
        'url': f"https://{domain}/test",
        'domain': domain,
        'method': method,
        'timestamp': datetime.now().timestamp() * 1000,
        'details': {
            'scriptUrl': "https://test-script.js",
            'detectionMethod': "manual-test"
        }
    }
    
    detections.append(detection)
    
    return jsonify({'status': 'success', 'message': f'Added test detection for {domain}'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)  # Use port 5001 to avoid AirPlay conflict