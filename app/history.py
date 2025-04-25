from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from datetime import datetime
from .models import db, Conversation, Message
import uuid

history_bp = Blueprint('history', __name__)

# ====================== 核心功能 ======================

def load_history(conversation_id, user_id=None):
    """
    无装饰器版本历史记录加载
    返回: [{"role": "user/assistant", "content": str}, ...]
    """
    try:
        # 确保 conversation_id 是 UUID 对象
        if isinstance(conversation_id, str):
            conversation_id = uuid.UUID(conversation_id)
            
        if user_id:
            conv = Conversation.query.filter_by(
                id=conversation_id,
                user_id=user_id
            ).first()
            if not conv:
                return []
        
        messages = Message.query.filter_by(
            conversation_id=conversation_id
        ).order_by(
            Message.created_at.asc()
        ).all()
        
        return [{"role": msg.role, "content": msg.content} for msg in messages]
    except Exception as e:
        print(f"加载历史失败: {str(e)}")
        return []

def save_history(conversation_id, history, user_id=None):
    """
    无装饰器版本历史记录保存
    返回: 成功True/失败False
    """
    try:
        # 确保 conversation_id 是 UUID 对象
        if isinstance(conversation_id, str):
            conversation_id = uuid.UUID(conversation_id)
            
        if user_id:
            conv = Conversation.query.filter_by(
                id=conversation_id,
                user_id=user_id
            ).first()
            if not conv:
                return False
        
        Message.query.filter_by(conversation_id=conversation_id).delete()
        
        for msg in history:
            db.session.add(Message(
                id=uuid.uuid4(),  # 直接使用 uuid.uuid4() 生成 UUID 对象
                conversation_id=conversation_id,
                role=msg["role"],
                content=msg["content"],
                created_at=datetime.utcnow()
            ))
        
        db.session.commit()
        return True
    except Exception as e:
        db.session.rollback()
        print(f"保存历史失败: {str(e)}")
        return False

# ====================== 路由接口 ======================

@history_bp.route('/conversations', methods=['GET'])
@login_required
def list_conversations():
    """获取用户所有对话列表"""
    convs = Conversation.query.filter_by(
        user_id=current_user.id
    ).order_by(
        Conversation.updated_at.desc()
    ).all()
    
    return jsonify([{
        "id": conv.id,
        "title": conv.title or f"对话 {conv.created_at.strftime('%m-%d %H:%M')}",
        "updated_at": conv.updated_at.isoformat(),
        "preview": Message.query.filter_by(
            conversation_id=conv.id
        ).order_by(
            Message.created_at.desc()
        ).first().content[:50] + "..." if conv.messages.count() > 0 else "[空对话]"
    } for conv in convs])

@history_bp.route('/conversations', methods=['POST'])
@login_required
def create_conversation():
    try:
        # 生成新的 UUID 对象
        conversation_id = uuid.uuid4()
        
        # 创建新对话，标题固定为"新对话"
        conversation = Conversation(
            id=conversation_id,  # 使用 UUID 对象
            user_id=current_user.id,
            title='新对话'  # 固定标题为"新对话"，不添加时间
        )
        
        db.session.add(conversation)
        db.session.commit()
        
        return jsonify({
            'id': str(conversation.id),  # 转换为字符串返回给前端
            'title': conversation.title,
            'created_at': conversation.created_at.isoformat(),
            'updated_at': conversation.updated_at.isoformat()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@history_bp.route('/conversations/<conversation_id>/history', methods=['GET'])
@login_required
def get_history(conversation_id):
    """获取对话完整历史"""
    try:
        # 确保 conversation_id 是 UUID 对象
        if isinstance(conversation_id, str):
            conversation_id = uuid.UUID(conversation_id)
            
        conv = Conversation.query.filter_by(
            id=conversation_id,
            user_id=current_user.id
        ).first_or_404()
        
        messages = Message.query.filter_by(
            conversation_id=conversation_id
        ).order_by(
            Message.created_at.asc()
        ).all()
        
        return jsonify({
            "history": [{
                "role": msg.role,
                "content": msg.content,
                "created_at": msg.created_at.isoformat()
            } for msg in messages]
        })
    except ValueError as e:
        return jsonify({"error": "无效的会话ID格式"}), 400
    except Exception as e:
        print(f"获取历史记录失败: {str(e)}")
        return jsonify({"error": "获取历史记录失败"}), 500

@history_bp.route('/conversations/<conversation_id>/history', methods=['PUT'])
@login_required
def replace_history(conversation_id):
    """完全替换对话历史"""
    data = request.get_json()
    if not data or not isinstance(data.get("history"), list):
        return jsonify({"error": "Invalid history data"}), 400
    
    conv = Conversation.query.filter_by(
        id=conversation_id,
        user_id=current_user.id
    ).first_or_404()
    
    try:
        # 原子操作
        Message.query.filter_by(conversation_id=conversation_id).delete()
        
        for msg in data["history"]:
            if "role" not in msg or "content" not in msg:
                continue
                
            db.session.add(Message(
                id=str(uuid.uuid4()),
                conversation_id=conversation_id,
                role=msg["role"],
                content=msg["content"],
                created_at=datetime.utcnow()
            ))
        
        conv.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@history_bp.route('/conversations/<conversation_id>/messages', methods=['POST'])
@login_required
def add_message(conversation_id):
    try:
        # 转换 conversation_id 为 UUID 对象
        conversation_id = uuid.UUID(conversation_id)
        
        data = request.get_json()
        
        # 1. 数据验证
        if not data or 'content' not in data:
            return jsonify({"error": "缺少必要参数: content"}), 400
            
        if 'is_user' not in data:
            return jsonify({"error": "缺少必要参数: is_user"}), 400
            
        # 2. 检查对话是否存在
        conv = Conversation.query.filter_by(
            id=conversation_id,
            user_id=current_user.id
        ).first()
        
        if not conv:
            return jsonify({"error": "对话不存在或无权访问"}), 404
            
        # 3. 创建消息
        msg = Message(
            id=uuid.uuid4(),  # 直接使用 uuid.uuid4() 生成 UUID 对象
            conversation_id=conversation_id,
            role='user' if data['is_user'] else 'assistant',  # 添加角色字段
            content=data['content'],
            created_at=datetime.utcnow()
        )
        
        # 4. 保存到数据库
        db.session.add(msg)
        conv.updated_at = datetime.utcnow()  # 更新对话时间
        db.session.commit()
        
        return jsonify({
            "id": str(msg.id),  # 转换为字符串
            "content": msg.content,
            "role": msg.role,
            "created_at": msg.created_at.isoformat()
        })
        
    except ValueError as e:
        return jsonify({"error": "无效的会话ID格式"}), 400
    except Exception as e:
        db.session.rollback()  # 重要！回滚事务
        print(f"消息保存失败: {str(e)}")
        return jsonify({
            "error": "消息保存失败",
            "details": str(e)
        }), 500

@history_bp.route('/conversations/<conversation_id>', methods=['DELETE'])
@login_required
def delete_conversation(conversation_id):
    try:
        # 确保 conversation_id 是 UUID 对象
        if isinstance(conversation_id, str):
            conversation_id = uuid.UUID(conversation_id)
            
        # 查找对话
        conversation = Conversation.query.filter_by(
            id=conversation_id,
            user_id=current_user.id
        ).first_or_404()
        
        # 删除相关的所有消息
        Message.query.filter_by(conversation_id=conversation_id).delete()
        
        # 删除对话
        db.session.delete(conversation)
        db.session.commit()
        
        return jsonify({'success': True})
        
    except ValueError:
        return jsonify({'error': '无效的对话ID'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@history_bp.route('/conversations/<conversation_id>/update_title', methods=['POST'])
@login_required
def update_conversation_title(conversation_id):
    """更新对话标题"""
    try:
        # 确保 conversation_id 是 UUID 对象
        if isinstance(conversation_id, str):
            conversation_id = uuid.UUID(conversation_id)
            
        # 获取用户请求的新标题
        data = request.get_json()
        if not data or 'title' not in data:
            return jsonify({'error': '标题不能为空'}), 400
            
        new_title = data['title']
        if len(new_title) > 100:
            return jsonify({'error': '标题过长'}), 400
            
        # 查找对话
        conversation = Conversation.query.filter_by(
            id=conversation_id,
            user_id=current_user.id
        ).first_or_404()
        
        # 更新标题
        conversation.title = new_title
        conversation.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({'success': True})
        
    except ValueError:
        return jsonify({'error': '无效的对话ID'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500