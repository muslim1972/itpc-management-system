import os

new_app_path = r"d:\Int-Karbala-new\src\app.py"
target_app_path = r"d:\Int-Karbala\src\app.py"

header = """\"\"\"
ITPC Management System — Flask Backend (Full Merge)
================================================================
Compatible with Render (PostgreSQL) and Local (SQLite)
\"\"\"

from flask import Flask, request, jsonify, Response, send_from_directory
import sqlite3
import os
from datetime import datetime, timedelta
from flask_cors import CORS
from database import get_db, init_db

# Try importing psycopg2 for production integrity error catching
try:
    import psycopg2
    POSTGRES_INTEGRITY_ERROR = psycopg2.IntegrityError
except ImportError:
    POSTGRES_INTEGRITY_ERROR = sqlite3.IntegrityError

INTEGRITY_ERRORS = (sqlite3.IntegrityError, POSTGRES_INTEGRITY_ERROR)

app = Flask(__name__, static_folder='../dist', static_url_path='/')
CORS(app)
app.config['SECRET_KEY'] = 'itpc-secret-change-in-production'

# ── Production Frontend Serving ──────────────────────────────────────────────
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

# ── CORS headers (Extended for New App) ──────────────────────────────────────
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-User-Id'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    return response

@app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
@app.route('/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    return jsonify({}), 200

"""

footer = """
@app.errorhandler(404)
def not_found(e):
    if not request.path.startswith('/api'):
        return send_from_directory(app.static_folder, 'index.html')
    return jsonify(error="Not found"), 404

@app.route('/api/health', methods=['GET'])
def health(): return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
    # init_db() is usually called inside app.py helpers or here
    # In our case, DbWrapper handles it or we call it manually
    init_db()
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
"""

with open(new_app_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find where to start the main logic (skip header, app init, cors in New app.py)
# Based on my view_file, line 42 starts "Helpers"
start_line = 0
for i, line in enumerate(lines):
    if "def row_to_dict" in line:
        start_line = i
        break

# Find where the main block starts to replace it with footer
end_line = len(lines)
for i in range(len(lines) -1, 0, -1):
    if "if __name__ == '__main__':" in lines[i]:
        end_line = i
        break

main_logic = "".join(lines[start_line:end_line])

full_content = header + main_logic + footer

with open(target_app_path, 'w', encoding='utf-8') as f:
    f.write(full_content)

print(f"✅ Merged {new_app_path} into {target_app_path}")
