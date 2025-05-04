from flask import Flask, render_template
from .extensions import db, login_manager
import logging

def create_app(config_module='config'):
    app = Flask(__name__)
    
    # 配置加载
    try:
        config = __import__(config_module, fromlist=['Config'])
        app.config.from_object(config.Config)
    except ImportError:
        from .config import DevelopmentConfig
        app.config.from_object(DevelopmentConfig)
    
    # 初始化扩展
    initialize_extensions(app)
    
    # 注册蓝图
    register_blueprints(app)
    
    # 注册无需认证的静态文件
    #register_public_static_files(app)

    register_error_handlers(app)
    
    with app.app_context():
        # 创建数据库表
        db.create_all()
    
    return app

def initialize_extensions(app):
    db.init_app(app)
    login_manager.init_app(app)
    
    # 这里不再需要重复定义load_user，因为models.py中已经定义了

def register_blueprints(app):
    """延迟注册蓝图"""
    from .routes import chat_bp, auth_bp  # 从routes/__init__.py导入
    from .history import history_bp
    from .dashboard import dashboard_bp  # 从dashboard模块导入
    from .routes.vip import vip_bp  # 导入新创建的vip蓝图
    from .routes.money import money_bp  # 导入新创建的money蓝图
    from .routes.api import api_bp  # 导入新创建的api蓝图
    
    app.register_blueprint(chat_bp)
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(history_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(vip_bp, url_prefix='/vip')  # 注册vip蓝图，url前缀为/vip
    app.register_blueprint(money_bp, url_prefix='/money')  # 注册money蓝图，url前缀为/money
    app.register_blueprint(api_bp, url_prefix='/api')  # 注册api蓝图，url前缀为/api

def register_public_static_files(app):
    """
    注册可以无需登录即可访问的静态文件路由
    用于提供必须在未登录状态下可用的文件，如service worker
    """
    from flask import send_from_directory
    import os
    
    #@app.route('/sw.js')
    #def serve_sw_js():
    #    """提供service worker文件，无需登录认证"""
    #    return send_from_directory(app.root_path, 'sw.js', mimetype='application/javascript')

def register_error_handlers(app):
    from flask import jsonify, render_template, request, redirect, url_for
    
    @app.errorhandler(401)
    def unauthorized_error(error):
        # 如果是AJAX请求返回JSON
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({
                'status': 'error',
                'message': '请先登录'
            }), 401
        # 普通请求重定向到登录页
        return redirect(url_for('auth.login', next=request.path))

    @app.errorhandler(404)
    def page_not_found(e):
        return render_template('404.html'), 404

    @app.errorhandler(500)
    def internal_server_error(e):
        return render_template('500.html'), 500