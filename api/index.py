from src.app import app

# This is required for Vercel to find the Flask app
# It should be named 'app' or exports a handler
handler = app
