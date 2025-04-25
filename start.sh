source venv/bin/activate
export FLASK_APP=wsgi.py
export FLASK_ENV=development
export SECRET_KEY='your-secret-key-here'
flask run