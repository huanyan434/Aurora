from flask import render_template, jsonify, request, redirect, url_for, session, flash
from flask_login import login_required, current_user
from ..models import User, Message, Conversation
from ..extensions import db
from . import dashboard_bp
from datetime import datetime, timedelta
from ..utils.token_tracker import get_token_usage_stats
import json
import os
from werkzeug.security import check_password_hash, generate_password_hash
from functools import wraps

# 获取dashboard.json的路径
dashboard_config_path = os.path.join(os.path.dirname(__file__), 'dashboard.json')

# 尝试加载仪表盘配置
def load_dashboard_config():
    try:
        if os.path.exists(dashboard_config_path):
            with open(dashboard_config_path, 'r') as f:
                return json.load(f)
        else:
            # 如果文件不存在，创建默认配置
            default_config = {
                "password_hash": generate_password_hash("admin123")
            }
            with open(dashboard_config_path, 'w') as f:
                json.dump(default_config, f, indent=4)
            return default_config
    except Exception as e:
        print(f"读取仪表盘配置时出错: {e}")
        return {"password_hash": generate_password_hash("admin123")}

# 检查仪表盘登录状态的装饰器
def dashboard_login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'dashboard_logged_in' not in session or not session['dashboard_logged_in']:
            return redirect(url_for('dashboard.dashboard_login'))
        return f(*args, **kwargs)
    return decorated_function

@dashboard_bp.route('/login', methods=['GET', 'POST'])
def dashboard_login():
    error = None
    
    if request.method == 'POST':
        password = request.form.get('password')
        
        # 加载仪表盘配置
        config = load_dashboard_config()
        
        # 验证密码
        if check_password_hash(config['password_hash'], password):
            session['dashboard_logged_in'] = True
            return redirect(url_for('dashboard.index'))
        else:
            error = "密码错误，请重试"
    
    return render_template('dashboard/login.html', error=error)

@dashboard_bp.route('/logout')
def dashboard_logout():
    session.pop('dashboard_logged_in', None)
    return redirect(url_for('dashboard.dashboard_login'))

@dashboard_bp.route('/')
@dashboard_login_required
def index():
    return render_template('dashboard/index.html')

@dashboard_bp.route('/users_page')
@dashboard_login_required
def users_page():
    """渲染用户管理页面"""
    return render_template('dashboard/users.html')

@dashboard_bp.route('/usage')
@dashboard_login_required
def token_usage_page():
    """渲染Token使用量页面"""
    return render_template('dashboard/token_usage.html')

@dashboard_bp.route('/usage_data')
@dashboard_login_required
def get_token_usage_data():
    """获取Token使用量数据"""
    # 尝试读取token_usage.json文件
    token_stats = get_token_usage_stats()
    
    # 获取每天的使用量数据
    daily_stats = token_stats.get('daily_stats', {})
    
    # 获取每个模型的使用量数据
    model_stats = token_stats.get('model_stats', {})
    
    # 获取每个用户的使用量数据
    user_stats = token_stats.get('user_stats', {})
    
    # 获取用户名映射
    user_names = {}
    users = User.query.all()
    for user in users:
        user_names[str(user.id)] = user.username
    
    # 添加用户名信息
    user_data = []
    for user_id, tokens in user_stats.items():
        username = user_names.get(user_id, f"用户 {user_id}")
        user_data.append({
            'id': user_id,
            'username': username,
            'tokens': tokens
        })
    
    # 按使用量降序排序
    user_data.sort(key=lambda x: x['tokens'], reverse=True)
    
    # 转换日期格式
    daily_data = []
    for date, tokens in daily_stats.items():
        daily_data.append({
            'date': date,
            'tokens': tokens
        })
    
    # 按日期排序
    daily_data.sort(key=lambda x: x['date'])
    
    # 转换模型数据
    model_data = []
    for model, tokens in model_stats.items():
        model_data.append({
            'model': model,
            'tokens': tokens
        })
    
    # 按使用量降序排序
    model_data.sort(key=lambda x: x['tokens'], reverse=True)
    
    return jsonify({
        'daily_data': daily_data,
        'model_data': model_data,
        'user_data': user_data,
        'total_tokens': token_stats.get('total_tokens', 0),
        'prompt_tokens': token_stats.get('prompt_tokens', 0),
        'completion_tokens': token_stats.get('completion_tokens', 0),
        'recent_24h_tokens': token_stats.get('recent_24h_tokens', 0)
    })

@dashboard_bp.route('/stats')
@dashboard_login_required
def get_stats():
    # 获取总消息数
    total_messages = Message.query.count()
    
    # 获取总用户数
    total_users = User.query.count()
    
    # 获取在线用户数（通过最近活跃的会话判断）
    online_users = count_active_users()
    
    # 获取真实token使用统计
    token_stats = get_token_usage_stats()
    total_tokens = token_stats.get('total_tokens', 0)
    
    # 增加更详细的token统计
    prompt_tokens = token_stats.get('prompt_tokens', 0)
    completion_tokens = token_stats.get('completion_tokens', 0)
    recent_24h_tokens = token_stats.get('recent_24h_tokens', 0)
    
    return jsonify({
        'total_messages': total_messages,
        'total_users': total_users,
        'online_users': online_users,
        'total_tokens': total_tokens,
        'prompt_tokens': prompt_tokens,
        'completion_tokens': completion_tokens,
        'recent_24h_tokens': recent_24h_tokens
    })

@dashboard_bp.route('/users')
@dashboard_login_required
def get_users():
    """获取所有用户列表及其在线状态"""
    try:
        # 获取所有用户
        users = User.query.all()
        
        # 确定哪些用户在线（最近10分钟有活动）
        recent_time = datetime.utcnow() - timedelta(minutes=10)
        
        # 获取最近活跃的会话
        recent_conversations = Conversation.query.filter(
            Conversation.updated_at > recent_time
        ).all()
        
        # 获取有最近活跃会话的用户ID
        active_user_ids = set(conv.user_id for conv in recent_conversations)
        
        # 当前用户一定在线
        if current_user.is_authenticated:
            active_user_ids.add(current_user.id)
        
        # 准备用户列表数据
        user_list = []
        for user in users:
            # 获取该用户的token使用量
            token_stats = get_token_usage_stats()
            user_token_usage = token_stats.get('user_stats', {}).get(str(user.id), 0)
            
            # 获取该用户的会话数
            conversations_count = Conversation.query.filter_by(user_id=user.id).count()
            
            # 获取会员信息
            member_status = user.get_member_status()
            
            user_list.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_online': user.id in active_user_ids,
                'token_usage': user_token_usage,
                'conversations_count': conversations_count,
                'is_member': user.is_member,
                'member_level': user.member_level,
                'member_days_left': member_status['days_left'],
                'member_expired': member_status['expired'],
                'member_since': user.member_since.isoformat() if user.member_since else None,
                'member_until': user.member_until.isoformat() if user.member_until else None,
                'balance': user.balance  # 添加余额信息
            })
        
        return jsonify({
            'users': user_list,
            'total_users': len(users),
            'online_users': len(active_user_ids)
        })
        
    except Exception as e:
        print(f"获取用户列表时出错: {e}")
        return jsonify({
            'error': f"获取用户列表失败: {str(e)}",
            'users': []
        }), 500

def count_active_users():
    """使用最近的消息活动来判断用户是否在线"""
    try:
        # 通过最近的消息活动判断
        recent_time = datetime.utcnow() - timedelta(minutes=10)  # 10分钟内活跃
        # 查询最近活跃的用户数量
        active_users = db.session.query(Message.conversation_id).\
            filter(Message.created_at > recent_time).\
            distinct().count()
        
        # 确保至少返回1（当前管理员用户肯定在线）
        return max(1, active_users)
    except Exception as e:
        print(f"计算在线用户时出错: {e}")
        # 出错时返回1（至少当前用户在线）
        return 1

@dashboard_bp.route('/update_user_membership', methods=['POST'])
@dashboard_login_required
def update_user_membership():
    """更新用户会员状态"""
    try:
        data = request.json
        user_id = data.get('user_id')
        is_member = data.get('is_member', False)
        member_level = data.get('member_level', 'free')
        duration_days = data.get('duration_days', 30)  # 默认30天
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'message': '用户不存在'}), 404
        
        user.is_member = is_member
        
        # 如果设置为会员
        if is_member:
            user.member_level = member_level
            now = datetime.utcnow()
            
            # 如果用户已经是会员并且还未过期，则在现有到期时间基础上延长
            if user.is_member and user.member_until and user.member_until > now:
                user.member_until = user.member_until + timedelta(days=duration_days)
            else:
                # 否则从当前时间开始计算
                user.member_since = now
                user.member_until = now + timedelta(days=duration_days)
        else:
            # 如果取消会员资格，清空会员信息
            user.member_level = 'free'
            user.member_until = None
        
        db.session.commit()
        
        # 返回更新后的会员信息
        return jsonify({
            'success': True,
            'message': '会员状态更新成功',
            'user': {
                'id': user.id,
                'username': user.username,
                'is_member': user.is_member,
                'member_level': user.member_level,
                'member_since': user.member_since.isoformat() if user.member_since else None,
                'member_until': user.member_until.isoformat() if user.member_until else None,
                'member_status': user.get_member_status()
            }
        })
    except Exception as e:
        print(f"更新用户会员状态时出错: {e}")
        return jsonify({'success': False, 'message': f'更新失败: {str(e)}'}), 500

@dashboard_bp.route('/add_user_balance', methods=['POST'])
@dashboard_login_required
def add_user_balance():
    """管理员给用户充值余额"""
    try:
        data = request.json
        user_id = data.get('user_id')
        amount = float(data.get('amount', 0))
        
        # 验证输入
        if not user_id or amount <= 0:
            return jsonify({
                'success': False,
                'message': '无效的用户ID或充值金额'
            }), 400
        
        # 获取用户
        user = User.query.get(user_id)
        if not user:
            return jsonify({
                'success': False,
                'message': '用户不存在'
            }), 404
        
        # 充值余额
        user.add_balance(amount)
        db.session.commit()
        
        # 返回充值结果
        return jsonify({
            'success': True,
            'message': f'成功为用户 {user.username} 充值 ¥{amount:.2f}',
            'balance': user.balance,
            'formatted_balance': f'¥{user.balance:.2f}'
        })
    except ValueError as e:
        return jsonify({
            'success': False,
            'message': f'无效的充值金额: {str(e)}'
        }), 400
    except Exception as e:
        print(f"给用户充值余额时出错: {e}")
        return jsonify({
            'success': False,
            'message': f'充值失败: {str(e)}'
        }), 500 