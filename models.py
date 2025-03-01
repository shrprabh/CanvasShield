from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

class FingerprintingDetection(db.Model):
    __tablename__ = 'fingerprinting_detections'
    
    id = db.Column(db.Integer, primary_key=True)
    url = db.Column(db.String(2048), nullable=False)
    domain = db.Column(db.String(255), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    method = db.Column(db.String(50), nullable=False)
    script_url = db.Column(db.String(2048))
    detection_method = db.Column(db.String(50))
    
    def to_dict(self):
        return {
            'id': self.id,
            'url': self.url,
            'domain': self.domain,
            'timestamp': self.timestamp.isoformat(),
            'method': self.method,
            'script_url': self.script_url,
            'detection_method': self.detection_method
        }
