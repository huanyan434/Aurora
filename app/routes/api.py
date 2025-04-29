from flask import Blueprint, jsonify, request, current_app
from flask_login import login_required, current_user
from app.routes.func import get_model_free_usage_info
from app.routes.func import model_name as model_name_func
api_bp = Blueprint('api', __name__)

@api_bp.route('/model/free_usage', methods=['GET'])
@login_required
def get_free_usage():
    """获取模型的免费使用次数信息"""
    model_name = model_name_func(request.args.get('model'))
    user_id = request.args.get('user_id')
    
    if not model_name:
        return jsonify({
            'success': False,
            'message': '缺少模型名称参数'
        }), 400
    
    # 验证用户ID
    valid_user_id = None
    
    # 如果用户已登录，使用当前用户ID
    if current_user.is_authenticated:
        valid_user_id = current_user.id
        
        # 如果提供了user_id参数，但与当前登录用户不一致，拒绝请求
        if user_id and str(valid_user_id) != str(user_id):
            return jsonify({
                'success': False,
                'message': '无权获取其他用户的使用次数信息'
            }), 403
    elif user_id:
        # 如果未登录但提供了user_id，拒绝请求
        return jsonify({
            'success': False,
            'message': '必须登录才能获取使用次数信息'
        }), 401
    
    # 获取免费使用次数信息
    from app.utils.token_tracker import get_model_free_usage_limit
    
    if valid_user_id:
        # 有效用户，返回实际使用次数
        usage_info = get_model_free_usage_info(model_name, valid_user_id)
    else:
        # 无效用户，直接返回0/总次数
        free_limit = get_model_free_usage_limit(model_name)
        usage_info = {
            'current': 0,
            'limit': free_limit,
            'remaining': 0  # 对于未登录用户或无效用户ID，返回0剩余次数
        }
    
    # 返回结果
    return jsonify({
        'success': True,
        'model': model_name,
        'current': usage_info['current'],
        'limit': usage_info['limit'],
        'remaining': usage_info['remaining']
    }) 