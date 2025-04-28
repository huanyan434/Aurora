from flask import Blueprint, jsonify, current_app, request
from flask_login import login_required, current_user
from ..models import User
from ..extensions import db
import os
import random, string, json
from datetime import datetime

money_bp = Blueprint('money', __name__)

@money_bp.route('/get_balance/<int:user_id>', methods=['GET'])
@login_required
def get_balance(user_id):
    """获取用户的余额信息"""
    try:
        # 检查是否是请求自己的余额信息
        if user_id != current_user.id:
            return jsonify({
                'success': False,
                'message': '权限不足'
            }), 403
        
        # 获取用户
        user = User.query.get(user_id)
        if not user:
            return jsonify({
                'success': False,
                'message': '用户不存在'
            }), 404
        
        # 构建响应数据
        response_data = {
            'success': True,
            'balance': user.balance,
            'formatted_balance': f"¥{user.balance:.2f}"
        }
        
        return jsonify(response_data)
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'获取余额信息失败: {str(e)}'
        }), 500

def generate_money_tokens(count=100):
    """生成指定数量的随机充值码列表"""
    seen = set()
    tokens = []
    amounts = [5.0, 10.0]  # 充值金额为5元或10元
    
    while len(tokens) < count:
        code = '-'.join(
            ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
            for _ in range(4)
        )
        if code in seen:
            continue
        seen.add(code)
        amount = random.choice(amounts)
        tokens.append({'code': code, 'amount': amount})
    
    return tokens

@money_bp.before_app_request
def init_money_tokens():
    """应用启动时初始化充值码文件"""
    file_path = os.path.join(current_app.instance_path, 'money_token.json')
    if not os.path.exists(file_path):
        tokens = generate_money_tokens(100)
        with open(file_path, 'w') as f:
            json.dump(tokens, f)

@money_bp.route('/check_money_token', methods=['POST'])
@login_required
def check_money_token():
    """检查充值码可用性"""
    data = request.get_json() or {}
    code = data.get('code')
    if not code:
        return jsonify({'success': False, 'message': '充值码不能为空'}), 400
    
    file_path = os.path.join(current_app.instance_path, 'money_token.json')
    if not os.path.exists(file_path):
        return jsonify({'success': False, 'message': '无可用充值码'}), 400
    
    with open(file_path, 'r') as f:
        tokens = json.load(f)
    
    target = None
    for t in tokens:
        if t['code'] == code:
            target = t
            break
    
    if not target:
        return jsonify({'success': False, 'message': '充值码无效或已使用'}), 400
    
    return jsonify({
        'success': True, 
        'amount': target['amount'], 
        'message': f'有效的充值码，可充值¥{target["amount"]:.2f}'
    }), 200

@money_bp.route('/redeem_money_token', methods=['POST'])
@login_required
def redeem_money_token():
    """兑换余额充值码"""
    data = request.get_json() or {}
    code = data.get('code')
    
    if not code:
        return jsonify({'success': False, 'message': '充值码不能为空'}), 400
    
    file_path = os.path.join(current_app.instance_path, 'money_token.json')
    if not os.path.exists(file_path):
        return jsonify({'success': False, 'message': '无可用充值码'}), 400
    
    with open(file_path, 'r') as f:
        tokens = json.load(f)
    
    target = None
    for t in tokens:
        if t['code'] == code:
            target = t
            break
    
    if not target:
        return jsonify({'success': False, 'message': '充值码无效或已使用'}), 400
    
    # 移除已使用的充值码
    tokens = [t for t in tokens if t['code'] != code]
    with open(file_path, 'w') as f:
        json.dump(tokens, f)
    
    # 为用户充值余额
    user = current_user
    amount = target['amount']
    user.add_balance(amount)
    db.session.commit()
    
    return jsonify({
        'success': True, 
        'amount': amount,
        'new_balance': user.balance,
        'formatted_balance': f"¥{user.balance:.2f}",
        'message': f'成功充值¥{amount:.2f}，当前余额：¥{user.balance:.2f}'
    }), 200 