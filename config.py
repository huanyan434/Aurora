import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///chat.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    DEBUG = False  # 关闭调试模式
    TESTING = False
    SESSION_COOKIE_SECURE = True  # 如果使用 HTTPS
    SESSION_COOKIE_HTTPONLY = True
    PERMANENT_SESSION_LIFETIME = 3600  # session 过期时间（秒）