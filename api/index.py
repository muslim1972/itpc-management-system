import sys
import os

# Add 'src' to the path so we can import from it easily in Vercel
current_dir = os.path.dirname(__file__)
parent_dir = os.path.abspath(os.path.join(current_dir, '..'))
src_dir = os.path.join(parent_dir, 'src')

if src_dir not in sys.path:
    sys.path.append(src_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

try:
    from src.app import app
    # Vercel needs the variable to be named 'app' or 'handler'
    app = app
except Exception as e:
    import traceback
    error_msg = f"Error during boot: {str(e)}\n{traceback.format_exc()}"
    print(error_msg)
    
    # Simple fallback Flask app to show the error in the browser
    from flask import Flask
    app = Flask(__name__)
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def catch_all(path):
        return f"<pre>ITPC Backend Error:\n{error_msg}</pre>", 500
