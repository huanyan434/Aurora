from flask import Blueprint, jsonify
from flask_login import login_required, current_user
from ..models import User
from ..extensions import db
from dotenv import load_dotenv, find_dotenv
import os
import time
from hashlib import md5

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