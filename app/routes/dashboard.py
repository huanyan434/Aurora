from flask import Blueprint, jsonify, request, current_app as app
from app.models import User, UserLog
from app.models import db
from app.utils.auth import admin_required

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/reset_user_points', methods=['POST'])
@admin_required
def reset_user_points():
    """重置用户积分"""
    data = request.get_json()
    user_id = data.get('user_id')
    amount = data.get('amount')
    
    if not user_id or amount is None:
        return jsonify({'success': False, 'message': '参数不完整'})
    
    try:
        amount = float(amount)
        if amount < 0:
            return jsonify({'success': False, 'message': '积分不能为负数'})
            
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'message': '用户不存在'})
            
        user.points = amount
        db.session.commit()
        
        # 记录积分变更日志
        log = UserLog(
            user_id=user_id,
            action='reset_points',
            details=f'管理员重置积分为 ¥{amount:.2f}'
        )
        db.session.add(log)
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': '积分重置成功',
            'new_points': amount
        })
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"重置积分失败: {str(e)}")
        return jsonify({'success': False, 'message': f'操作失败: {str(e)}'}) 