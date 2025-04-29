from flask import Blueprint, jsonify, request, current_app as app
from app.models.user import User, UserLog
from app.models.database import db
from app.utils.auth import admin_required

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/reset_user_balance', methods=['POST'])
@admin_required
def reset_user_balance():
    """重置用户余额"""
    data = request.get_json()
    user_id = data.get('user_id')
    amount = data.get('amount')
    
    if not user_id or amount is None:
        return jsonify({'success': False, 'message': '参数不完整'})
    
    try:
        amount = float(amount)
        if amount < 0:
            return jsonify({'success': False, 'message': '余额不能为负数'})
            
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'message': '用户不存在'})
            
        user.balance = amount
        db.session.commit()
        
        # 记录余额变更日志
        log = UserLog(
            user_id=user_id,
            action='reset_balance',
            details=f'管理员重置余额为 ¥{amount:.2f}'
        )
        db.session.add(log)
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': '余额重置成功',
            'new_balance': amount
        })
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"重置余额失败: {str(e)}")
        return jsonify({'success': False, 'message': f'操作失败: {str(e)}'}) 