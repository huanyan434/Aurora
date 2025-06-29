import random
from flask import Blueprint, render_template, redirect, url_for, request, session, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from app.models import User, Conversation, Message
from app.utils.auth import hash_password, verify_password
from app import db
from app.utils.email_verify import email_verify_send, verify_email
import json
import datetime

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    # 支持 next 参数，用于登录后重定向
    next_url = request.args.get('next')
    if request.method == 'POST':
        email = request.json.get('email')
        password = request.json.get('password')
        remember = True if request.json.get('remember') else False
        
        user = User.query.filter_by(email=email).first()
        
        if not user or not verify_password(user.password_hash, password):
            return jsonify({
                'success': False,
                'message': '邮箱或密码错误'
            }), 400
        
        login_user(user, remember=remember)
        session['user_id'] = str(user.id)  # 将UUID转换为字符串
        session.permanent = True  # 设置会话为持久性，使用PERMANENT_SESSION_LIFETIME的值
        return jsonify({
            'success': True
        })
    
    # GET 请求渲染登录页面，并传入 next 参数
    return render_template('auth/login.html')

@auth_bp.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.json.get('username')
        password = request.json.get('password')
        email = request.json.get('email')
        verify_code = request.json.get('verify_code')
    else:
        return render_template('auth/signup.html')

    # 验证必填字段
    if not username:
        return jsonify({'success': False,
                        'message': '用户名不能为空'
                        }), 400
    if not password:
        return jsonify({'success': False,
                        'message': '密码不能为空'
                        }), 400
    if not email:
        return jsonify({'success': False,
                        'message': '邮箱不能为空'
                        }), 400

    # 验证邮箱
    if not verify_code:
        if not verify_email(email, verify_code):
            return jsonify({'success': False,
                        'message': '验证码无效'
                        }), 400
        return jsonify({'success': False,
                        'message': '验证码不能为空'
                        }), 400

    # 检查用户名长度
    if len(username) < 3:
        return jsonify({
            'success': False,
            'message': '用户名长度不得少于3个字符'
        }), 400

    # 检查用户名是否已存在
    if User.query.filter_by(username=username).first():
        return jsonify({
            'success': False,
            'message': '该用户名已被使用'
        }), 400
    
    # 创建新用户，使用UUID作为ID
    new_user = User(
        username=username,
        email=email
    )
    new_user.set_password(password)
        
    db.session.add(new_user)
    db.session.commit()
        
    return jsonify({'success': True,
                    'message': '注册成功'
                    })

@auth_bp.route('/logout')
@login_required
def logout():
    # 清除所有会话数据
    session.clear()
    # 登出用户
    logout_user()
    # 重定向到登录页面
    return redirect(url_for('auth.login'))

@auth_bp.route('/api/user/current')
@login_required
def get_current_user():
    """获取当前登录用户信息"""
    try:
        return jsonify({
            'id': str(current_user.id),  # 将UUID转换为字符串
            'username': current_user.username,
            'email': current_user.email,
            'is_member': current_user.is_member,
            'member_level': current_user.member_level,
            'points': current_user.points
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/api/user/update_username', methods=['POST'])
@login_required
def update_username():
    """更新用户名"""
    try:
        data = request.json
        new_username = data.get('username')
        
        if not new_username:
            return jsonify({'success': False, 'message': '用户名不能为空'}), 400
            
        # 检查用户名长度
        if len(new_username) < 2 or len(new_username) > 20:
            return jsonify({
                'success': False, 
                'message': '用户名长度应在2-20个字符之间'
            }), 400
            
        # 检查用户名是否已存在
        existing_user = User.query.filter(
            User.username == new_username, 
            User.id != current_user.id
        ).first()
        
        if existing_user:
            return jsonify({
                'success': False, 
                'message': '该用户名已被使用'
            }), 400
            
        # 更新用户名
        current_user.username = new_username
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': '用户名更新成功',
            'username': new_username
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'更新失败: {str(e)}'}), 500

@auth_bp.route('/api/user/update_password', methods=['POST'])
@login_required
def update_password():
    """更新用户密码"""
    try:
        data = request.json
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')
        
        if not current_password or not new_password or not confirm_password:
            return jsonify({
                'success': False, 
                'message': '所有密码字段都不能为空'
            }), 400
            
        # 检查当前密码是否正确
        if not verify_password(current_user.password_hash, current_password):
            return jsonify({
                'success': False, 
                'message': '当前密码不正确'
            }), 400
            
        # 检查新密码是否与确认密码匹配
        if new_password != confirm_password:
            return jsonify({
                'success': False, 
                'message': '新密码与确认密码不匹配'
            }), 400
            
        # 检查新密码长度
        if len(new_password) < 6:
            return jsonify({
                'success': False, 
                'message': '新密码长度不能少于6个字符'
            }), 400
            
        # 更新密码
        current_user.password_hash = hash_password(new_password)
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': '密码更新成功'
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'更新失败: {str(e)}'}), 500

@auth_bp.route('/deactivate_account', methods=['POST'])
@login_required
def deactivate_account():
    """注销用户账号"""
    try:
        user = current_user
        user_id = user.id
        
        # 获取与该用户关联的所有会话
        conversations = Conversation.query.filter_by(user_id=user_id).all()
        
        # 删除每个会话中的所有消息
        for conversation in conversations:
            Message.query.filter_by(conversation_id=conversation.id).delete()
        
        # 删除所有会话
        Conversation.query.filter_by(user_id=user_id).delete()
        
        # 最后删除用户记录
        db.session.delete(user)
        db.session.commit()
        
        # 清除会话并登出用户
        session.clear()
        logout_user()
        
        return jsonify({
            'success': True,
            'message': '账号已成功注销'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'注销账号失败: {str(e)}'
        }), 500
    
@auth_bp.route('/send_verify_code', methods=['POST'])
@login_required
def send_verify_code():
    """发送验证码"""
    # 获取用户邮箱
    user_email = request.json.get('email')
    if not user_email:
        return jsonify({'success': False, 'message': '请输入邮箱地址'}), 400
    try:
        # 发送验证码到用户邮箱
        email_verify_send(user_email)
        return jsonify({'success': True, 'message': '验证码已发送到您的邮箱'})

    except Exception as e:
        print(f'发送邮件出错: {str(e)}')
        return jsonify({'success': False, 'message': '发送邮件出错，请稍后再试'}), 500
    
@auth_bp.route('/sign', methods=['GET'])
@login_required
def sign():
    """签到"""
    try:
        with open('sign.log', 'x') as f:
            f.close()
    except Exception as e:
        print('文件已存在')
        
    try:
        with open('sign.log', 'r+') as f:
            content = f.read()
            # 先读取文件
            if content != "":
                try:
                    log = json.loads(content)['sign']
                except Exception as e:
                    print(f"读取签到记录出错: {str(e)}")
                    log = []
            else:
                print('文件为空')
                log = []
            if type(log) == list and len(log) > 0:
                for i in log:
                    # 查询是否已经签到 并且 是否是今天
                    if i["username"] == current_user.username and i['date'] == datetime.datetime.now().strftime('%Y-%m-%d'):
                        print("用户已经签到")
                        return jsonify({'success': False, 'message': '今天已经签到过了', 'points': 0})
            else:
                log = []
            # 签到
            user_id = current_user.id
            user = User.query.get(user_id)


            amount = float(100 + random.randint(-10, 10))    # 随机积分 100+-10
            user.add_points(amount)
            db.session.commit()
            print(f"{current_user.username} 签到成功，获得积分 {amount}")

            log_append = {"username": current_user.username, "date": datetime.datetime.now().strftime('%Y-%m-%d')}
            log.append(log_append)

            will_written = []
            for i in log:
                # 此处 i 为字典
                will_written.append(json.dumps(i))
                
            f.seek(0)
            f.write('{"sign":[' + ','.join(will_written) + ']}')            
        return jsonify({'success': True, 'message': '签到成功', 'points': amount})
        
    except Exception as e:
        print(f"签到出错: {e}")
        return jsonify({'success': False, 'message': '签到出错，请稍后再试', 'points': 0}), 500
    
@auth_bp.route('/sign_log', methods=['GET'])
@login_required
def sign_log():
    """获取用户签到状态"""
    try:
        with open('sign.log', 'r') as f:
            content = f.read()
            if content != "":
                # 先读取文件
                try:
                    log = json.loads(content)['sign']
                except Exception as e:
                    print(f"读取签到记录出错: {str(e)}")
                    log = []
            else:
                print("文件为空")
                log = []
            if type(log) == list and len(log) > 0:
                for i in log:
                    if i["username"] == current_user.username and i['date'] == datetime.datetime.now().strftime('%Y-%m-%d'):
                        return jsonify({'success': True, 'message': '今天已经签到过了'})
            else:
                return jsonify({'success': False, 'message': '今天未签到'})
            return jsonify({'success': False, 'message': '今天未签到'})
    except Exception as e:
        return jsonify({'success': False, 'message': '今天未签到'}), 400
