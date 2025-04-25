from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from app.models import Conversation
from app import db

conversation_bp = Blueprint('conversation', __name__)

@conversation_bp.route('/delete/<int:conversation_id>', methods=['DELETE'])
@login_required
def delete_conversation(conversation_id):
    conversation = Conversation.query.get_or_404(conversation_id)
    if conversation.user_id != current_user.id:
        return jsonify({'error': '无权访问'}), 403
    
    db.session.delete(conversation)
    db.session.commit()
    return jsonify({'success': True})

@conversation_bp.route('/rename/<int:conversation_id>', methods=['PUT'])
@login_required
def rename_conversation(conversation_id):
    conversation = Conversation.query.get_or_404(conversation_id)
    if conversation.user_id != current_user.id:
        return jsonify({'error': '无权访问'}), 403
    
    new_title = request.json.get('title')
    if not new_title or len(new_title) > 100:
        return jsonify({'error': '无效标题'}), 400
    
    conversation.title = new_title
    db.session.commit()
    return jsonify({'success': True})