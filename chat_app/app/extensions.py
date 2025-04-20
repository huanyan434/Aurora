from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask import redirect, url_for

db = SQLAlchemy()
login_manager = LoginManager()

# 配置登录视图和消息
login_manager.login_view = 'auth.login'  # 登录路由端点
login_manager.login_message = u"请先登录以访问该页面"
login_manager.login_message_category = "warning"