from flask import Blueprint, render_template, redirect, url_for, flash, request, session
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import login_user, logout_user, login_required
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
    with db.session.begin():
        if request.method == 'POST':
            email = request.form.get('email')
            username = request.form.get('username')
            password = request.form.get('password')
            
            user = User.query.filter_by(email=email).first()
            
            
            if user:
                flash('邮箱地址已存在')
                return redirect(url_for('auth.signup'))
            
            new_user = User(
                email=email,
                username=username,
                password_hash=hash_password(password)
            )
            
            db.session.add(new_user)
            db.session.commit()
            
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