from .extensions import db, login_manager
from datetime import datetime
from flask_login import UserMixin  # 添加这行
from sqlalchemy.dialects.postgresql import UUID
import uuid

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    conversations = db.relationship('Conversation', backref='user', lazy=True)

class Conversation(db.Model):
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  # 使用UUID
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    title = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)  # 确保是DateTime类型
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    messages = db.relationship('Message', backref='conversation', lazy='dynamic')

    def to_dict(self):
        return {
            'id': str(self.id),  # 如果使用UUID，确保转换为字符串
            'user_id': self.user_id,
            'title': self.title,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Message(db.Model):
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  # 修改为UUID类型
    content = db.Column(db.Text)
    is_user = db.Column(db.Boolean)
    role = db.Column(db.String(20))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    conversation_id = db.Column(UUID(as_uuid=True), db.ForeignKey('conversation.id'))  # 修改为UUID类型
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))