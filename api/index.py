import sys
import os

# Add root directory to sys.path so backend modules import properly in Vercel serverless
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import app
