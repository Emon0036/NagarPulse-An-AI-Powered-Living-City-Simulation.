"""
EcoSim AI - Main Entry Point
Run: python app.py
"""
import uvicorn
from backend.app import app

if __name__ == "__main__":
    print("=" * 65)
    print("  EcoSim AI - Intelligent Economic Society Simulator")
    print("  Dept. of Computer Science & Engineering - AI Lab")
    print("  Server running on http://127.0.0.1:8000")
    print("=" * 65)
    uvicorn.run(app, host="0.0.0.0", port=8000)
