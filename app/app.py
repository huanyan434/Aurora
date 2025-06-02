from flask import Flask
from .models import db
import os
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app, 
    supports_credentials=True,
    origins=['http://localhost:*'], 
    expose_headers=['Set-Cookie', 'Content-Type']
)
    
    # 安全配置
    app.config.update(
        SECRET_KEY=os.urandom(24).hex(),
        SQLALCHEMY_DATABASE_URI='sqlite:///' + os.path.join(app.instance_path, 'chat.db'),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE='Lax',
        SESSION_COOKIE_SECURE=True  # 生产环境应设为True
    )
    
    @app.after_request
    def add_security_headers(response):
        response.headers['Cross-Origin-Embedder-Policy'] = 'require-corp'
        response.headers['Cross-Origin-Opener-Policy'] = 'same-origin'
        return response

    os.makedirs(app.instance_path, exist_ok=True)
    db.init_app(app)
    
    register_cli(app)
    
    return app

def register_cli(app):
    @app.cli.command('init-db')
    def init_db():
        """初始化数据库"""
        with app.app_context():
            db.drop_all()
            db.create_all()
            print("数据库已重置")

app = create_app()

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)