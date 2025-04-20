from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import current_user
from functools import wraps
from flask import redirect, url_for, flash

def hash_password(password):
    return generate_password_hash(password)

def verify_password(hashed_password, password):
    return check_password_hash(hashed_password, password)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            flash('请先登录')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function