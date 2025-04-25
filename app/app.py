from flask import Flask, request, jsonify, session, render_template, Response, url_for
from .models import db, User, Conversation, Message
from datetime import datetime
import uuid
import time
import json
import os
from flask_cors import CORS
from werkzeug.utils import secure_filename
import base64

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
    
    # 注册蓝图
    register_routes(app)
    register_cli(app)
    
    return app

def register_routes(app):
    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/api/register', methods=['POST'])
    def register():
        data = request.get_json()
        if not all(key in data for key in ['username', 'password']):
            return jsonify({'error': '需要用户名和密码'}), 400

        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': '用户名已存在'}), 409

        try:
            user = User(username=data['username'])
            user.set_password(data['password'])
            db.session.add(user)
            db.session.commit()
            
            # 明确设置会话
            session.clear()
            session['user_id'] = user.id
            session.permanent = True
            
            return jsonify({
                'user': user.to_dict()
            }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': '注册失败'}), 500
    
    @app.route('/api/login', methods=['POST'])
    def login():
        data = request.get_json()
        if not all(key in data for key in ['username', 'password']):
            return jsonify({'error': '需要用户名和密码'}), 400

        user = User.query.filter_by(username=data['username']).first()
        if not user or not user.check_password(data['password']):
            return jsonify({'error': '用户名或密码错误'}), 401

        try:
            session['user_id'] = user.id
            user.last_login = datetime.utcnow()
            db.session.commit()
            return jsonify({
                'user': user.to_dict()
            })
        except Exception as e:
            return jsonify({'error': '登录失败'}), 500

    @app.route('/api/user', methods=['GET'])
    def get_current_user():
        if 'user_id' not in session:
            return jsonify({'error': '未登录'}), 401
        
        # 使用新的Session.get()方法
        user = db.session.get(User, session['user_id'])
        if not user:
            session.pop('user_id', None)
            return jsonify({'error': '用户不存在'}), 404
        
        return jsonify({'user': user.to_dict()})

    @app.route('/api/logout', methods=['POST'])
    def logout():
        session.pop('user_id', None)
        return jsonify({'message': '登出成功'})

    @app.route('/api/conversations', methods=['GET'])
    def get_conversations():
        if 'user_id' not in session:
            return jsonify({'error': '未登录'}), 401

        conversations = db.session.get(
            user_id=session['user_id']
        ).order_by(Conversation.updated_at.desc()).all()
        
        return jsonify([conv.to_dict() for conv in conversations])

    @app.route('/api/conversation', methods=['POST'])
    def create_conversation():
        if 'user_id' not in session:
            return jsonify({'error': '未登录'}), 401

        try:
            conv = Conversation(
                user_id=session['user_id'],
                title=f"新对话 {datetime.now().strftime('%m-%d %H:%M')}"
            )
            db.session.add(conv)
            db.session.commit()
            return jsonify(conv.to_dict()), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': '创建对话失败'}), 500

    @app.route('/api/conversation/<int:conversation_id>/messages', methods=['GET'])
    def get_messages(conversation_id):
        conv = validate_conversation(conversation_id)
        if isinstance(conv, Response):
            return conv
            
        return jsonify([msg.to_dict() for msg in conv.messages.order_by(Message.created_at.asc())])

    @app.route('/api/chat/<int:conversation_id>', methods=['POST'])
    def chat(conversation_id):
        conv = validate_conversation(conversation_id)
        if isinstance(conv, Response):
            return conv

        data = request.get_json()
        if 'message' not in data:
            return jsonify({'error': '无效请求'}), 400

        try:
            user_msg = Message(
                conversation_id=conversation_id,
                role='user',
                content=data['message'],
                is_think=False
            )
            db.session.add(user_msg)
            db.session.commit()
            return Response(generate_stream_response(conversation_id), mimetype='text/event-stream')
        except Exception as e:
            return jsonify({'error': '处理消息失败'}), 500

    def validate_conversation(conversation_id):
        if 'user_id' not in session:
            return jsonify({'error': '未登录'}), 401

        conv = db.session.get(
            id=conversation_id,
            user_id=session['user_id']
        ).first()
        return conv if conv else jsonify({'error': '对话不存在或无权访问'}), 404

    def generate_stream_response(conversation_id, model=None):
        msg_id = str(uuid.uuid4())
        try:
            for data in simulate_ai_thinking(conversation_id, msg_id, model):
                yield f"data: {json.dumps(data)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e), 'message_id': msg_id})}\n\n"

    def simulate_ai_thinking(conversation_id, msg_id, model=None):
        think_msg = Message(
            conversation_id=conversation_id,
            role='assistant',
            content='',
            is_think=True,
            message_id=msg_id
        )
        db.session.add(think_msg)
        
        steps = ["分析问题...", "检索知识...", "生成回答..."]
        for step in steps:
            think_msg.content += step + "\n"
            db.session.commit()
            yield {'message_id': msg_id, 'think': think_msg.content}
            time.sleep(0.3)
        
        answer_msg = Message(
            conversation_id=conversation_id,
            role='assistant',
            content="这是生成的回答内容...",
            is_think=False,
            message_id=msg_id
        )
        db.session.add(answer_msg)
        db.session.commit()
        yield {'message_id': msg_id, 'text': answer_msg.content}

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