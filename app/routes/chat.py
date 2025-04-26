from flask import Blueprint, render_template, jsonify, request, stream_with_context, Response, session, abort, url_for
from flask_login import login_required, current_user
from app.models import Conversation, Message, User
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
from app.routes.func import generate, get_active_responses

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
@login_required
def stream_chat():
    data = request.get_json()
    user_input = data.get('message')
    model = data.get('model')
    conversation_id = data.get('conversation_id', str(uuid.uuid4()))
    message_id = f"ai-{conversation_id}-{int(time.time())}"
    
    # 获取用户ID（优先使用请求中传递的，否则使用当前登录用户）
    user_id = data.get('user_id', current_user.id)
    
    # 将用户消息持久化到数据库
    try:
        # 获取或创建对话
        conversation = Conversation.query.filter_by(id=conversation_id).first()
        if not conversation:
            conversation = Conversation(
                id=conversation_id,
                title="新对话",
                user_id=user_id or 'anonymous',
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.session.add(conversation)
        conversation.updated_at = datetime.utcnow()
        # 保存用户消息
        user_message = Message(
            conversation_id=conversation_id,
            role="user",
            content=user_input,
            created_at=datetime.utcnow()
        )
        db.session.add(user_message)
        db.session.commit()
    except Exception as e:
        print(f"StreamChat保存用户消息出错: {str(e)}")
    
    # 获取图片base64数据
    image_base64 = data.get('image')
    image_type = data.get('image_type')
    image_name = data.get('image_name')
    
    # 记录请求日志
    print(f"处理请求: 用户ID={user_id}, 模型={model}, 会话ID={conversation_id}")
    
    # 调用generate生成回复，分离文本和图片
    gen = generate(message_id, user_input, conversation_id, model, image_base64, user_id)
    return Response(gen, mimetype='text/event-stream')

@chat_bp.route('/name_conversation/<conversation_id>', methods=['GET'])
@login_required
def name_conv(conversation_id):
    from app.routes.func import name_conversation
    return name_conversation(conversation_id)

@chat_bp.route('/api/chat/<conversation_id>/generate', methods=['POST'])
def api_generate(conversation_id):
    """聊天API，使用流式响应返回模型回复"""
    data = request.json
    prompt = data.get('prompt', '')
    model = data.get('model', 'DeepSeek-V3')
    image_base64 = data.get('image', None)
    
    # 确保对话ID存在
    if not conversation_id:
        return jsonify({"error": "缺少对话ID"}), 400
    
    # 生成唯一的消息ID，用于标识此次请求
    message_id = data.get('message_id', str(uuid.uuid4()))
    
    # 获取用户ID（已登录用户或匿名）
    user_id = None
    if current_user.is_authenticated:
        user_id = current_user.id
    elif 'user_id' in session:
        user_id = session['user_id']
    
    # 启动AI生成并返回流
    return Response(
        generate(message_id, prompt, conversation_id, model, image_base64, user_id),
        mimetype='application/json'
    )

@chat_bp.route('/api/chat/active_responses', methods=['GET'])
def api_active_responses():
    """获取当前活跃的响应状态"""
    responses = get_active_responses()
    return jsonify(responses)

@chat_bp.route('/api/chat/conversations', methods=['GET'])
def get_conversations():
    """获取当前用户的所有对话"""
    try:
        # 获取用户ID（已登录用户或匿名）
        user_id = None
        if current_user.is_authenticated:
            user_id = current_user.id
        elif 'user_id' in session:
            user_id = session['user_id']
        else:
            return jsonify({"conversations": []}), 200
        
        # 查询当前用户的所有对话，按更新时间倒序排列
        conversations = Conversation.query.filter_by(user_id=user_id).order_by(Conversation.updated_at.desc()).all()
        
        # 格式化结果
        conversation_list = []
        for conv in conversations:
            # 获取最后一条消息
            last_message = Message.query.filter_by(conversation_id=conv.id).order_by(Message.created_at.desc()).first()
            
            # 构建对话信息
            conversation_info = {
                "id": conv.id,
                "title": conv.title,
                "created_at": conv.created_at.isoformat() if conv.created_at else None,
                "updated_at": conv.updated_at.isoformat() if conv.updated_at else None,
                "last_message": last_message.content[:50] + "..." if last_message and len(last_message.content) > 50 else (last_message.content if last_message else "")
            }
            conversation_list.append(conversation_info)
        
        return jsonify({"conversations": conversation_list}), 200
    
    except Exception as e:
        print(f"获取对话列表时出错: {str(e)}")
        return jsonify({"error": str(e)}), 500

@chat_bp.route('/api/chat/messages/<conversation_id>', methods=['GET'])
def get_messages(conversation_id):
    """获取指定对话的所有消息"""
    try:
        # 获取用户ID（已登录用户或匿名）
        user_id = None
        if current_user.is_authenticated:
            user_id = current_user.id
        elif 'user_id' in session:
            user_id = session['user_id']
        
        # 检查对话是否存在
        conversation = Conversation.query.filter_by(id=conversation_id).first()
        if not conversation:
            return jsonify({"error": "对话不存在"}), 404
        
        # 检查当前用户是否有权限访问此对话
        if conversation.user_id != 'anonymous' and conversation.user_id != user_id:
            return jsonify({"error": "无权访问此对话"}), 403
        
        # 查询所有消息，按创建时间排序
        messages = Message.query.filter_by(conversation_id=conversation_id).order_by(Message.created_at).all()
        
        # 格式化结果
        message_list = []
        for msg in messages:
            message_info = {
                "id": msg.id,
                "role": msg.role,
                "content": msg.content,
                "created_at": msg.created_at.isoformat() if msg.created_at else None
            }
            message_list.append(message_info)
        
        return jsonify({
            "conversation_id": conversation_id,
            "messages": message_list,
            "title": conversation.title
        }), 200
    
    except Exception as e:
        print(f"获取消息时出错: {str(e)}")
        return jsonify({"error": str(e)}), 500

@chat_bp.route('/api/chat/conversation/new', methods=['POST'])
def create_conversation():
    """创建新对话"""
    try:
        # 获取用户ID（已登录用户或匿名）
        user_id = None
        if current_user.is_authenticated:
            user_id = current_user.id
        elif 'user_id' in session:
            user_id = session['user_id']
        else:
            # 使用匿名ID
            user_id = 'anonymous'
        
        # 生成唯一的对话ID
        conversation_id = str(uuid.uuid4())
        
        # 创建新对话
        conversation = Conversation(
            id=conversation_id,
            title="新对话",
            user_id=user_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.session.add(conversation)
        db.session.commit()
        
        return jsonify({
            "conversation_id": conversation_id,
            "title": conversation.title,
            "created_at": conversation.created_at.isoformat(),
            "updated_at": conversation.updated_at.isoformat()
        }), 201
    
    except Exception as e:
        print(f"创建对话时出错: {str(e)}")
        return jsonify({"error": str(e)}), 500

@chat_bp.route('/api/chat/conversation/<conversation_id>/rename', methods=['PUT'])
def rename_conversation(conversation_id):
    """重命名对话"""
    try:
        data = request.json
        new_title = data.get('title', '新对话')
        
        # 获取用户ID
        user_id = None
        if current_user.is_authenticated:
            user_id = current_user.id
        elif 'user_id' in session:
            user_id = session['user_id']
        
        # 检查对话是否存在
        conversation = Conversation.query.filter_by(id=conversation_id).first()
        if not conversation:
            return jsonify({"error": "对话不存在"}), 404
        
        # 检查用户权限
        if conversation.user_id != 'anonymous' and conversation.user_id != user_id:
            return jsonify({"error": "无权修改此对话"}), 403
        
        # 更新标题
        conversation.title = new_title
        db.session.commit()
        
        return jsonify({
            "conversation_id": conversation_id,
            "title": new_title
        }), 200
    
    except Exception as e:
        print(f"重命名对话时出错: {str(e)}")
        return jsonify({"error": str(e)}), 500

@chat_bp.route('/api/chat/conversation/<conversation_id>/delete', methods=['DELETE'])
def delete_conversation(conversation_id):
    """删除对话"""
    try:
        # 获取用户ID
        user_id = None
        if current_user.is_authenticated:
            user_id = current_user.id
        elif 'user_id' in session:
            user_id = session['user_id']
        
        # 检查对话是否存在
        conversation = Conversation.query.filter_by(id=conversation_id).first()
        if not conversation:
            return jsonify({"error": "对话不存在"}), 404
        
        # 检查用户权限
        if conversation.user_id != 'anonymous' and conversation.user_id != user_id:
            return jsonify({"error": "无权删除此对话"}), 403
        
        # 删除所有相关消息
        Message.query.filter_by(conversation_id=conversation_id).delete()
        
        # 删除对话
        db.session.delete(conversation)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "对话已删除"
        }), 200
    
    except Exception as e:
        print(f"删除对话时出错: {str(e)}")
        return jsonify({"error": str(e)}), 500

@chat_bp.route('/api/user/current')
def get_current_user():
    """获取当前用户信息"""
    if current_user.is_authenticated:
        return jsonify({
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "is_authenticated": True
        })
    elif 'user_id' in session:
        # 从数据库中查找用户
        user = User.query.get(session['user_id'])
        if user:
            return jsonify({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_authenticated": False
            })
    
    # 默认返回匿名用户
    return jsonify({
        "id": "anonymous",
        "username": "匿名用户",
        "email": "",
        "is_authenticated": False
    })

@chat_bp.route('/save-sidebar-state', methods=['POST'])
def save_sidebar_state():
    """保存用户侧边栏状态"""
    try:
        data = request.json
        is_open = data.get('isOpen')
        
        # 使用会话存储所有用户的侧边栏状态
        session['sidebar_state'] = is_open
        return jsonify({"success": True, "message": "侧边栏状态已保存"}), 200
    
    except Exception as e:
        print(f"保存侧边栏状态时出错: {str(e)}")
        return jsonify({"error": str(e)}), 500

@chat_bp.route('/get-sidebar-state', methods=['GET'])
def get_sidebar_state():
    """获取用户侧边栏状态"""
    try:
        # 从会话获取状态，默认为打开
        sidebar_state = session.get('sidebar_state', True)
        return jsonify({"isOpen": sidebar_state}), 200
    
    except Exception as e:
        print(f"获取侧边栏状态时出错: {str(e)}")
        return jsonify({"error": str(e), "isOpen": True}), 500
