from flask import Blueprint, render_template, redirect, url_for, flash, request, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import login_user, logout_user, login_required, current_user
from app.models import User
from app.utils.auth import hash_password, verify_password
from app import db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        remember = True if request.form.get('remember') else False
        
        user = User.query.filter_by(email=email).first()
        
        if not user or not verify_password(user.password_hash, password):
            flash('请检查登录信息并重试')
            return redirect(url_for('auth.login'))
        
        login_user(user, remember=remember)
        session['user_id'] = user.id  # 确保这里是 'user_id'
        return redirect(url_for('chat.chat_index'))
    
    return render_template('auth/login.html')

@auth_bp.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        email = request.form.get('email', '')

        # 验证必填字段
        if not username or not password:
            flash('用户名和密码为必填项', 'danger')
            return render_template('auth/signup.html')

        # 检查用户名长度
        if len(username) < 3:
            flash('用户名长度至少为3个字符', 'danger')
            return render_template('auth/signup.html')

        # 检查用户名是否已存在
        if User.query.filter_by(username=username).first():
            flash('用户名已存在，请选择其他用户名', 'danger')
            return render_template('auth/signup.html')

        # 创建新用户
        new_user = User(
            username=username,
            email=email
        )
        new_user.set_password(password)
        
        # 设置默认余额为10元
        new_user.balance = 10.0
        
        db.session.add(new_user)
        db.session.commit()

        flash('注册成功，现在可以登录了', 'success')
        return redirect(url_for('auth.login'))
    
    return render_template('auth/signup.html')

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
            'id': current_user.id,
            'username': current_user.username,
            'email': current_user.email
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