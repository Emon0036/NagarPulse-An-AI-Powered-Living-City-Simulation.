"""
EcoSim AI - Main Entry Point
Run: python app.py
Optional: python app.py --port 8001
"""
import sys
import uvicorn
from backend.app import app

def get_port():
    port = 8000
    if "--port" in sys.argv:
        try:
            idx = sys.argv.index("--port")
            port = int(sys.argv[idx + 1])
        except Exception:
            pass
    return port

if __name__ == "__main__":
    port = get_port()
    print("=" * 65)
    print("  EcoSim AI - Intelligent Economic Society Simulator")
    print("  Dept. of Computer Science & Engineering - AI Lab")
    print(f"  Server running on http://127.0.0.1:{port}")
    print("=" * 65)
    uvicorn.run(app, host="0.0.0.0", port=port)
