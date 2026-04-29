import sys
import os
import traceback

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
    # Flask will handle paths correctly if we don't mess with them too much
    handler = app
except Exception as e:
    error_msg = f"Error during boot: {str(e)}\n{traceback.format_exc()}"
    print(error_msg)
    
    # Simple fallback Flask app to show the error in the browser
    from flask import Flask
    from flask_cors import CORS
    handler = Flask(__name__)
    CORS(handler, resources={r"/*": {"origins": "*"}})
    @handler.route('/', defaults={'path': ''})
    @handler.route('/<path:path>')
    def catch_all(path):
        return f"<pre>ITPC Backend Error. Please check server logs.</pre>", 500

# Vercel needs 'app' or 'handler'
app = handler
