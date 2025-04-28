from flask import Blueprint, jsonify, current_app, request
from flask_login import login_required, current_user
from ..models import User
from ..extensions import db
from dotenv import load_dotenv, find_dotenv
import os
import time
from hashlib import md5
import random, string, json
from datetime import datetime, timedelta

vip_bp = Blueprint('vip', __name__)

@vip_bp.route('/get_vip_level/<int:user_id>', methods=['GET'])
@login_required
def get_vip_level(user_id):
    """获取用户的会员级别信息"""
    try:
        # 检查是否是请求自己的会员信息
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
        
        # 获取会员状态
        member_status = user.get_member_status()
        
        # 会员级别对应的中文名称
        level_display = {
            'free': '普通用户',
            'vip': 'VIP会员',
            'svip': 'SVIP会员'
        }
        
        # 构建响应数据
        response_data = {
            'success': True,
            'is_member': user.is_member,
            'level': user.member_level,
            'level_display': level_display.get(user.member_level, user.member_level),
            'days_left': member_status['days_left'],
            'expired': member_status['expired'],
            'privileges': get_privileges_by_level(user.member_level)
        }
        
        # 如果是会员，添加会员开始和结束时间
        if user.is_member:
            response_data['member_since'] = user.member_since.isoformat() if user.member_since else None
            response_data['member_until'] = user.member_until.isoformat() if user.member_until else None
        
        return jsonify(response_data)
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'获取会员信息失败: {str(e)}'
        }), 500

def get_privileges_by_level(level):
    """根据会员级别返回对应的权益"""
    privileges = {
        'free': [
            {
                'name': '基础对话',
                'description': '支持基础AI对话功能',
                'icon': 'bi-chat-dots'
            }
        ],
        'vip': [
            {
                'name': '基础对话',
                'description': '支持基础AI对话功能',
                'icon': 'bi-chat-dots'
            },
            {
                'name': '高级模型',
                'description': '使用更强大的AI模型',
                'icon': 'bi-robot'
            },
            {
                'name': '更多对话额度',
                'description': '每天可使用更多对话次数',
                'icon': 'bi-plus-circle'
            },
            {
                'name': '优先响应',
                'description': '在高峰期获得优先响应',
                'icon': 'bi-lightning'
            }
        ],
        'svip': [
            {
                'name': '基础对话',
                'description': '支持基础AI对话功能',
                'icon': 'bi-chat-dots'
            },
            {
                'name': '最强模型',
                'description': '使用最先进的AI模型',
                'icon': 'bi-stars'
            },
            {
                'name': '无限对话',
                'description': '无限制的对话次数',
                'icon': 'bi-infinity'
            },
            {
                'name': '最高优先级',
                'description': '获得系统最高响应优先级',
                'icon': 'bi-lightning-fill'
            },
            {
                'name': '个性化定制',
                'description': '个性化的AI助手定制',
                'icon': 'bi-gear-wide-connected'
            },
            {
                'name': '专属客服',
                'description': '专属客服支持',
                'icon': 'bi-headset'
            }
        ]
    }
    
    return privileges.get(level, privileges['free'])

def generate_vip_tokens(count=100):
    """生成指定数量的随机兑换码列表"""
    seen = set()
    tokens = []
    durations = [30, 90, 365]
    types = ['vip', 'svip']
    while len(tokens) < count:
        code = '-'.join(
            ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
            for _ in range(5)
        )
        if code in seen:
            continue
        seen.add(code)
        ttype = random.choice(types)
        days = random.choice(durations)
        tokens.append({'code': code, 'type': ttype, 'days': days})
    return tokens

@vip_bp.before_app_request
def init_vip_tokens():
    """应用启动时初始化兑换码文件"""
    file_path = os.path.join(current_app.instance_path, 'vip_token.json')
    if not os.path.exists(file_path):
        tokens = generate_vip_tokens(100)
        with open(file_path, 'w') as f:
            json.dump(tokens, f)

@vip_bp.route('/get_vip_token', methods=['POST'])
@login_required
def get_vip_token():
    """用户兑换兑换码接口"""
    data = request.get_json() or {}
    code = data.get('code')
    if not code:
        return jsonify({'success': False, 'message': '兑换码不能为空'}), 400
    file_path = os.path.join(current_app.instance_path, 'vip_token.json')
    if not os.path.exists(file_path):
        return jsonify({'success': False, 'message': '无可用兑换码'}), 400
    with open(file_path, 'r') as f:
        tokens = json.load(f)
    target = None
    for t in tokens:
        if t['code'] == code:
            target = t
            break
    if not target:
        return jsonify({'success': False, 'message': '兑换码无效或已使用'}), 400
    # 移除已使用的兑换码
    tokens = [t for t in tokens if t['code'] != code]
    with open(file_path, 'w') as f:
        json.dump(tokens, f)
    # 激活会员
    user = current_user
    user.is_member = True
    user.member_level = target['type']
    user.member_since = datetime.utcnow()
    user.member_until = datetime.utcnow() + timedelta(days=target['days'])
    db.session.commit()
    return jsonify({'success': True, 'type': target['type'], 'days': target['days']}), 200

@vip_bp.route('/check_vip_token', methods=['POST'])
@login_required
def check_vip_token():
    """检查兑换码可用性"""
    data = request.get_json() or {}
    code = data.get('code')
    if not code:
        return jsonify({'success': False, 'message': '兑换码不能为空'}), 400
    
    file_path = os.path.join(current_app.instance_path, 'vip_token.json')
    if not os.path.exists(file_path):
        return jsonify({'success': False, 'message': '无可用兑换码'}), 400
    
    with open(file_path, 'r') as f:
        tokens = json.load(f)
    
    target = None
    for t in tokens:
        if t['code'] == code:
            target = t
            break
    
    if not target:
        return jsonify({'success': False, 'message': '兑换码无效或已使用'}), 400
    
    return jsonify({
        'success': True, 
        'type': target['type'], 
        'days': target['days'],
        'message': f'有效的{target["type"].upper()}兑换码，可激活{target["days"]}天'
    }), 200

@vip_bp.route('/activate_vip_token', methods=['POST'])
@login_required
def activate_vip_token():
    """激活会员兑换码，支持SVIP降级为VIP的特殊处理"""
    data = request.get_json() or {}
    code = data.get('code')
    days_override = data.get('days_override')  # 用于SVIP降级VIP时的天数覆盖
    
    if not code:
        return jsonify({'success': False, 'message': '兑换码不能为空'}), 400
    
    file_path = os.path.join(current_app.instance_path, 'vip_token.json')
    if not os.path.exists(file_path):
        return jsonify({'success': False, 'message': '无可用兑换码'}), 400
    
    with open(file_path, 'r') as f:
        tokens = json.load(f)
    
    target = None
    for t in tokens:
        if t['code'] == code:
            target = t
            break
    
    if not target:
        return jsonify({'success': False, 'message': '兑换码无效或已使用'}), 400
    
    # 移除已使用的兑换码
    tokens = [t for t in tokens if t['code'] != code]
    with open(file_path, 'w') as f:
        json.dump(tokens, f)
    
    # 激活会员
    user = current_user
    days = days_override if days_override else target['days']
    
    # 如果用户已是会员，则延长会员时间
    if user.is_member and user.member_until > datetime.utcnow():
        user.member_until = user.member_until + timedelta(days=days)
    else:
        user.is_member = True
        user.member_level = target['type']
        user.member_since = datetime.utcnow()
        user.member_until = datetime.utcnow() + timedelta(days=days)
    
    db.session.commit()
    
    # 获取更新后的会员状态
    member_status = user.get_member_status()
    
    return jsonify({
        'success': True, 
        'type': user.member_level,
        'days': days,
        'days_left': member_status['days_left'],
        'member_until': user.member_until.isoformat() if user.member_until else None,
        'message': f'成功激活{user.member_level.upper()}会员，有效期至{user.member_until.strftime("%Y-%m-%d")}'
    }), 200 