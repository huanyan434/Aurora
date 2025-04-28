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
    # 会员相关字段
    is_member = db.Column(db.Boolean, default=False)
    member_level = db.Column(db.String(20), default='free')  # free, basic, premium, vip
    member_since = db.Column(db.DateTime, nullable=True)
    member_until = db.Column(db.DateTime, nullable=True)
    # 用户余额字段
    balance = db.Column(db.Float, default=0.0)
    conversations = db.relationship('Conversation', backref='user', lazy=True)

    def is_active_member(self):
        """检查用户会员是否有效"""
        if not self.is_member:
            return False
        if not self.member_until:
            return False
        return datetime.utcnow() < self.member_until

    def get_member_status(self):
        """获取会员状态信息"""
        if not self.is_member:
            return {
                'is_member': False,
                'level': 'free',
                'days_left': 0,
                'expired': False
            }
        
        days_left = 0
        expired = True
        
        if self.member_until:
            now = datetime.utcnow()
            if now < self.member_until:
                # 计算剩余天数
                days_left = (self.member_until - now).days
                expired = False
        
        return {
            'is_member': True,
            'level': self.member_level,
            'days_left': days_left,
            'expired': expired,
            'since': self.member_since.isoformat() if self.member_since else None,
            'until': self.member_until.isoformat() if self.member_until else None
        }
        
    def add_balance(self, amount):
        """增加或减少用户余额"""
        self.balance += amount
        # 确保余额不会变成负数
        if self.balance < 0:
            self.balance = 0
        return True

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