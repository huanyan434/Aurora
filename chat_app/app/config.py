import os
from datetime import timedelta

class Config:
    # 基础配置
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev'
    
    # 数据库配置
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + os.path.join(os.path.abspath(os.path.dirname(__file__)), '../instance/chat.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Flask-Login配置
    REMEMBER_COOKIE_DURATION = timedelta(days=30)
    REMEMBER_COOKIE_SECURE = False  # 在生产环境中设置为True
    REMEMBER_COOKIE_HTTPONLY = True
    
    # 应用程序配置
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 最大上传文件大小（16MB）
    
    # 会话配置
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    SESSION_COOKIE_SECURE = False  # 在生产环境中设置为True
    SESSION_COOKIE_HTTPONLY = True
    
    # 调试配置
    DEBUG = True  # 在生产环境中设置为False 