import os
import io
import csv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from backend.simulation.engine import engine
from backend.simulation.city import city_env
from backend.ai.risk_model import risk_model
from backend.database.db import db_manager
from backend.config import config

app = FastAPI(
    title="EcoSim AI API",
    description="Intelligent Economic Society Simulator Backend API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request schemas
class ShockEventRequest(BaseModel):
    event_type: str
    magnitude: Optional[float] = 0.0
    description: Optional[str] = ""

class TaxChangeRequest(BaseModel):
    tax_rate: float

@app.get("/api/state")
def get_simulation_state():
    """Returns the current macro state, city layout, metrics, and agent summary"""
    return engine.get_state()

@app.api_route("/api/step", methods=["GET", "POST"])
def step_simulation():
    """Advances simulation cycle by one tick"""
    result = engine.step()
    return result

@app.post("/api/event")
def inject_shock_event(req: ShockEventRequest):
    """Injects an economic shock (e.g. food_price_shock 0.30, cash_stimulus, tax_change)"""
    event = engine.inject_event(req.event_type, req.magnitude or 0.0, req.description or "")
    return {
        "status": "success",
        "event": event,
        "new_metrics": engine.metrics_history[-1] if engine.metrics_history else {}
    }

@app.api_route("/api/csp-match", methods=["GET", "POST"])
def trigger_csp_allocation():
    """Executes CSP job matching algorithm"""
    result = engine.run_labor_csp()
    return {
        "status": "success",
        "result": result
    }

@app.get("/api/agents")
def list_agents(
    search: Optional[str] = Query(None, description="Search by name or occupation"),
    distressed_only: Optional[bool] = Query(False, description="Filter distressed citizens only"),
    limit: int = Query(120, ge=1, le=500)
):
    """Lists citizens with search and status filters"""
    agents = [a.to_dict() for a in engine.agents]
    if distressed_only:
        agents = [a for a in agents if a["is_distressed"] == 1]
    if search:
        s = search.lower()
        agents = [a for a in agents if s in a["name"].lower() or s in a["occupation"].lower()]
    return {
        "count": len(agents),
        "agents": agents[:limit]
    }

@app.get("/api/agents/{agent_id}")
def get_agent_detail(agent_id: str):
    """Returns deep-dive inspector details for a specific citizen agent"""
    for a in engine.agents:
        if a.id == agent_id:
            data = a.to_dict()
            # Add full memory log and spatial details
            data["full_memory"] = a.memory_log
            data["current_hub_info"] = city_env.hubs.get(a.current_hub, {})
            return data
    raise HTTPException(status_code=404, detail="Agent not found")

@app.get("/api/db-status")
def get_database_status():
    """Returns connectivity status for Aiven MySQL and local SQLite storage"""
    return db_manager.get_status()

@app.get("/api/risk-weights")
def get_risk_weights():
    """Returns trained Logistic Regression coefficients and evaluation metrics"""
    return {
        "metrics": risk_model.metrics,
        "weights": risk_model.feature_weights,
        "intercept": risk_model.intercept,
        "feature_names": [
            "essential_to_income_ratio",
            "savings_to_expense_ratio",
            "debt_to_income_ratio",
            "food_shock_pct",
            "inflation_rate",
            "job_stability",
            "dependents"
        ]
    }

@app.get("/api/history")
def get_history(limit: int = 50):
    """Returns time-series macroeconomic indicator history"""
    return db_manager.get_history(limit)

@app.get("/api/dataset/download/{dataset_name}")
def download_dataset(dataset_name: str):
    """Allows researchers/students to export the simulated demographic or training dataset"""
    if dataset_name == "citizens":
        file_path = "backend/data/citizens.csv"
        filename = "ecosim_citizens_dataset.csv"
    elif dataset_name == "training":
        file_path = "backend/data/financial_risk_training.csv"
        filename = "ecosim_risk_training_dataset.csv"
    else:
        raise HTTPException(status_code=400, detail="Invalid dataset name")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dataset file not generated")

    return FileResponse(file_path, media_type="text/csv", filename=filename)

# Mount frontend static files
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
