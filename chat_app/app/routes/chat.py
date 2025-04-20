from flask import Blueprint, render_template, jsonify, request, stream_with_context, Response, session, abort, url_for
from flask_login import login_required, current_user
from app.models import Conversation, Message
from app import db
from app.utils.ai_parser import parse_ai_response
from datetime import datetime
from uuid import UUID
#from app.history import save_history, load_history
import os
import base64
from werkzeug.utils import secure_filename

import json
import time
import uuid

chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/', methods=['GET'])
@login_required
def chat_index():
    return render_template('chat/index.html')

@chat_bp.route('/chat/<conversation_id>', methods=['GET'])
@login_required
def chat_page(conversation_id):
    try:
        # 尝试将 conversation_id 转换为 UUID 以验证其有效性
        UUID(conversation_id)
        return render_template('chat/index.html')
    except ValueError:
        # 如果 conversation_id 不是有效的 UUID，返回 404
        abort(404)

@chat_bp.route('/stream-chat', methods=['POST'])
def stream_chat():
    data = request.get_json()
    user_input = data.get('message')
    model = data.get('model')
    conversation_id = data.get('conversation_id', str(uuid.uuid4()))
    message_id = f"ai-{conversation_id}-{int(time.time())}"
    
    # 获取图片base64数据
    image_base64 = data.get('image')
    image_type = data.get('image_type')
    image_name = data.get('image_name')
    
    # 调用generate生成回复，分离文本和图片
    from .func import generate
    gen = generate(message_id, user_input, conversation_id, model, image_base64)
    return Response(gen, mimetype='text/event-stream')

@chat_bp.route('/api/conversation', methods=['POST'])
@login_required
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

@chat_bp.route('/save-sidebar-state', methods=['POST'])
@login_required
def save_sidebar_state():
    data = request.get_json()
    session['sidebar_collapsed'] = data.get('collapsed', False)
    return jsonify({'success': True})