import os
import json
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from backend.simulation.agent import CitizenAgent
from backend.simulation.city import city_env
from backend.data.dataset_generator import generate_citizens_dataset
from backend.ai.csp_solver import run_job_allocation_csp
from backend.database.db import db_manager

MARKET_CONFIG_PATH = "backend/data/market_config.json"
CITIZENS_CSV_PATH = "backend/data/citizens.csv"

class SimulationEngine:
    """
    EcoSim AI Simulation Engine.
    Coordinates agents, macro-shocks, labor market CSP matches,
    and macroeconomic indicator computation.
    """
    def __init__(self, agent_count: int = 120):
        self.tick: int = 0
        self.run_id: str = f"run_{os.urandom(4).hex()}"
        self.is_running: bool = False
        
        # Macroeconomic state
        self.macro_state = {
            "food_shock_pct": 0.0, # e.g. 0.30 for +30% food price shock
            "tax_rate": 0.10,
            "inflation_rate": 0.05,
            "poverty_line_bdt": 8500.0,
            "active_event_description": "Normal Economic Baseline"
        }

        self.agents: List[CitizenAgent] = []
        self.job_market_templates: List[Dict[str, Any]] = []
        self.metrics_history: List[Dict[str, Any]] = []
        self.recent_events: List[Dict[str, Any]] = []

        self._load_market_config()
        self._load_or_generate_agents(agent_count)
        self.calculate_metrics() # Initial metrics

    def _load_market_config(self):
        if os.path.exists(MARKET_CONFIG_PATH):
            with open(MARKET_CONFIG_PATH, "r") as f:
                data = json.load(f)
            self.job_market_templates = data.get("job_market_templates", [])
            self.macro_state["poverty_line_bdt"] = data.get("poverty_line_monthly_bdt", 8500.0)

    def _load_or_generate_agents(self, count: int):
        if not os.path.exists(CITIZENS_CSV_PATH):
            generate_citizens_dataset(count, CITIZENS_CSV_PATH)
        
        df = pd.read_csv(CITIZENS_CSV_PATH)
        self.agents = [CitizenAgent(row.to_dict()) for _, row in df.iterrows()]
        
        # Save initial population to DB
        db_manager.save_citizens([a.to_dict() for a in self.agents])

    def step(self) -> Dict[str, Any]:
        """
        Advances the simulation by one tick (representing a business cycle unit).
        """
        self.tick += 1

        # 1. Agent decision loop & spatial movement
        for agent in self.agents:
            agent.evaluate_and_decide(self.tick, self.macro_state)
            agent.step_movement()

        # 2. Compute macroeconomic indicators
        metrics = self.calculate_metrics()

        # 3. Persist periodically to database
        if self.tick % 5 == 0 or self.macro_state["food_shock_pct"] > 0:
            db_manager.record_tick_metrics(metrics)
            if self.tick % 20 == 0:
                db_manager.save_citizens([a.to_dict() for a in self.agents])

        return {
            "tick": self.tick,
            "macro_state": self.macro_state,
            "metrics": metrics
        }

    def calculate_metrics(self) -> Dict[str, Any]:
        """
        Computes community-wide economic indicators:
        - Gini Coefficient (Inequality)
        - Poverty Headcount Ratio
        - Average & Median Savings in BDT
        - Distressed population percentage
        """
        if not self.agents:
            return {}

        incomes = np.array([a.monthly_income for a in self.agents])
        savings = np.array([a.savings for a in self.agents])
        debts = np.array([a.debt for a in self.agents])
        wealth = np.maximum(savings + incomes, 1.0)

        # Exact Gini calculation on total economic capacity (wealth)
        gini = self._compute_gini(wealth)

        # Poverty and distress
        distressed_agents = [a for a in self.agents if a.is_distressed]
        distressed_count = len(distressed_agents)
        poverty_count = sum(1 for a in self.agents if a.monthly_income < self.macro_state["poverty_line_bdt"])
        
        # Quintile breakdown (Low, Lower-Mid, Mid, Upper-Mid, High)
        sorted_indices = np.argsort(incomes)
        n = len(self.agents)
        q_size = max(n // 5, 1)
        quintiles = []
        for q in range(5):
            idx_start = q * q_size
            idx_end = (q + 1) * q_size if q < 4 else n
            q_agents = [self.agents[sorted_indices[i]] for i in range(idx_start, idx_end)]
            quintiles.append({
                "quintile": f"Q{q+1}",
                "label": ["Lowest 20%", "Second 20%", "Middle 20%", "Fourth 20%", "Top 20%"][q],
                "avg_income": round(float(np.mean([a.monthly_income for a in q_agents])), 2),
                "avg_savings": round(float(np.mean([a.savings for a in q_agents])), 2),
                "avg_risk": round(float(np.mean([a.risk_score for a in q_agents])), 3)
            })

        metrics = {
            "tick": self.tick,
            "run_id": self.run_id,
            "food_shock_pct": self.macro_state["food_shock_pct"],
            "tax_rate": self.macro_state["tax_rate"],
            "inflation_rate": self.macro_state["inflation_rate"],
            "gini_coefficient": round(float(gini), 4),
            "poverty_rate": round(float(poverty_count / n), 4),
            "distress_rate": round(float(distressed_count / n), 4),
            "distressed_count": distressed_count,
            "total_agents": n,
            "avg_savings": round(float(np.mean(savings)), 2),
            "median_savings": round(float(np.median(savings)), 2),
            "avg_income": round(float(np.mean(incomes)), 2),
            "total_debt": round(float(np.sum(debts)), 2),
            "quintiles": quintiles
        }

        self.metrics_history.append(metrics)
        if len(self.metrics_history) > 100:
            self.metrics_history.pop(0)

        return metrics

    def _compute_gini(self, array: np.ndarray) -> float:
        """Computes Gini coefficient using relative mean absolute difference"""
        array = np.sort(array)
        index = np.arange(1, array.shape[0] + 1)
        n = array.shape[0]
        return ((np.sum((2 * index - n  - 1) * array)) / (n * np.sum(array)))

    def inject_event(self, event_type: str, magnitude: float = 0.0, description: str = "") -> Dict[str, Any]:
        """
        User-driven event injection (Slide 6 & Slide 11):
        - food_price_shock (+30% food prices)
        - tax_change (e.g. 0.05 to 0.25)
        - cash_stimulus (direct transfers to vulnerable agents)
        - reset_baseline
        """
        if event_type == "food_price_shock":
            mag = magnitude if magnitude != 0 else 0.30 # Default 30% shock
            self.macro_state["food_shock_pct"] = mag
            desc = description or f"Food Price Shock: Essential food prices increased by {mag*100:.0f}%"
            self.macro_state["active_event_description"] = desc
        elif event_type == "tax_change":
            mag = magnitude if magnitude != 0 else 0.15
            self.macro_state["tax_rate"] = mag
            desc = description or f"Fiscal Policy Shift: Tax rate adjusted to {mag*100:.1f}%"
            self.macro_state["active_event_description"] = desc
        elif event_type == "cash_stimulus":
            stimulus_amount = magnitude if magnitude != 0 else 5000.0
            # Direct stimulus to vulnerable/distressed citizens
            eligible_count = 0
            for a in self.agents:
                if a.is_distressed or a.monthly_income < 25000.0:
                    a.savings += stimulus_amount
                    a.record_memory(self.tick, "Received Government Stimulus", f"Direct aid of {stimulus_amount:,.0f} BDT")
                    eligible_count += 1
            desc = f"Government Cash Stimulus: Disbursed {stimulus_amount:,.0f} BDT to {eligible_count} vulnerable citizens"
            self.macro_state["active_event_description"] = desc
        elif event_type == "reset_baseline":
            self.macro_state["food_shock_pct"] = 0.0
            self.macro_state["tax_rate"] = 0.10
            self.macro_state["inflation_rate"] = 0.05
            desc = "Economy reset to stable baseline conditions."
            self.macro_state["active_event_description"] = desc
        else:
            desc = f"Custom Event: {event_type}"

        event_record = {
            "id": len(self.recent_events) + 1,
            "event_type": event_type,
            "magnitude": magnitude,
            "description": desc,
            "tick": self.tick
        }
        self.recent_events.append(event_record)

        # Immediately step and re-evaluate so the user sees real-time impact
        self.step()
        return event_record

    def run_labor_csp(self) -> Dict[str, Any]:
        """
        Executes Constraint Satisfaction Problem (CSP) solver on the labor market.
        Matches unemployed or underemployed citizens with job vacancies.
        """
        # Candidates: agents currently unemployed or earning below 20,000 BDT
        candidates = [a.to_dict() for a in self.agents if a.occupation == "Unemployed / Seeking" or a.monthly_income < 20000]
        
        # Vacancies from config
        vacancies = []
        for t in self.job_market_templates:
            # Create individual vacancy instances up to capacity
            for i in range(min(t.get("capacity", 5), 4)):
                vacancies.append({
                    "job_id": f"{t['job_id']}_{i+1}",
                    "title": t["title"],
                    "sector": t["sector"],
                    "required_education": t["required_education"],
                    "required_skills": t["required_skills"],
                    "offered_salary_bdt": t["offered_salary_bdt"],
                    "workplace_hub": t["workplace_hub"]
                })

        result = run_job_allocation_csp(vacancies, candidates)

        # Apply matched allocations to agents
        agent_map = {a.id: a for a in self.agents}
        for match in result.get("allocations", []):
            if match.get("matched") and match["agent_id"] in agent_map:
                agent = agent_map[match["agent_id"]]
                old_occ = agent.occupation
                agent.occupation = match["job_title"]
                agent.monthly_income = match["salary_bdt"]
                agent.record_memory(
                    self.tick, 
                    "Job Matched via CSP", 
                    f"Assigned to {match['job_title']} ({match['salary_bdt']:,} BDT/mo) from {old_occ}"
                )

        return result

    def get_state(self) -> Dict[str, Any]:
        return {
            "tick": self.tick,
            "run_id": self.run_id,
            "macro_state": self.macro_state,
            "city": city_env.to_dict(),
            "metrics": self.metrics_history[-1] if self.metrics_history else {},
            "metrics_history": self.metrics_history[-30:],
            "recent_events": self.recent_events[-10:],
            "agents_summary": [a.to_dict() for a in self.agents[:60]] # Lightweight list for render
        }

engine = SimulationEngine()
