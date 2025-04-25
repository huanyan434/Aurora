call .\venv\Scripts\activate
set FLASK_APP=wsgi.py
set FLASK_ENV=development
set SECRET_KEY='your-secret-key-here'
set FLASK_DEBUG=1
flask run