import random
from typing import Dict, Any, List, Tuple, Optional
from backend.ai.astar import pathfinder
from backend.ai.risk_model import risk_model

class CitizenAgent:
    """
    Autonomous AI Citizen Agent.
    Models an individual citizen in the simulated urban economy with private state,
    budget dynamics, personal goals, and adaptive decision-making.
    """
    def __init__(self, data: Dict[str, Any]):
        self.id: str = data["id"]
        self.name: str = data["name"]
        self.age: int = int(data.get("age", 28))
        self.gender: str = data.get("gender", "Male")
        self.occupation: str = data["occupation"]
        self.education: str = data.get("education", "Secondary")
        self.skills: str = data.get("skills", "")
        self.monthly_income: float = float(data.get("monthly_income", data.get("income", 25000)))
        self.essential_expenses: float = float(data.get("essential_expenses", 14000))
        self.discretionary_expenses: float = float(data.get("discretionary_expenses", 6000))
        self.savings: float = float(data.get("savings", 10000))
        self.debt: float = float(data.get("debt", 0))
        self.dependents: int = int(data.get("dependents", 1))

        # Personal Goal (Slide 10: e.g. "Buy a laptop")
        self.goal: str = data.get("goal", "Build 6-month emergency fund")
        self.goal_target_bdt: float = float(data.get("goal_target_bdt", 65000))
        self.goal_progress_bdt: float = float(data.get("goal_progress_bdt", min(self.savings * 0.4, self.goal_target_bdt)))

        # AI State & Risk Model output
        self.risk_score: float = float(data.get("risk_score", 0.15))
        self.is_distressed: bool = bool(data.get("is_distressed", False))
        self.top_risk_drivers: List[str] = []

        # Navigation & Spatial state
        self.home_hub: str = data.get("home_hub", "housing")
        self.workplace_hub: str = data.get("workplace_hub", "workplace")
        self.current_hub: str = "housing"
        self.x, self.y = pathfinder.get_hub_door(self.home_hub)
        self.current_path: List[Tuple[int, int]] = []
        self.path_index: int = 0
        self.target_hub: Optional[str] = None

        # Episodic Memory log
        self.memory_log: List[Dict[str, Any]] = [
            {"tick": 0, "action": "Initialized in city", "reason": "Citizen profile active"}
        ]

    def set_destination(self, target_hub: str):
        self.target_hub = target_hub
        target_coord = pathfinder.get_hub_door(target_hub)
        self.current_path = pathfinder.find_path((int(self.x), int(self.y)), target_coord)
        self.path_index = 0

    def step_movement(self):
        """Steps along the current A* route towards the target destination"""
        if self.current_path and self.path_index < len(self.current_path):
            next_coord = self.current_path[self.path_index]
            self.x, self.y = next_coord
            self.path_index += 1
            if self.path_index >= len(self.current_path):
                self.current_hub = self.target_hub or self.current_hub
                self.current_path = []

    def evaluate_and_decide(self, tick: int, macro_state: Dict[str, Any]):
        """
        AI Decision Cycle (Continuous Feedback Loop):
        1. Query Logistic Regression risk model given personal finances & current macro shocks.
        2. Adjust spending, savings allocation, and job search behavior.
        3. Determine next physical movement hub (Home -> Work/School -> Market/Bank).
        """
        food_shock = float(macro_state.get("food_shock_pct", 0.0))
        tax_rate = float(macro_state.get("tax_rate", 0.10))

        # 1. Update AI Risk Assessment via Logistic Regression
        risk_result = risk_model.predict_risk(self.to_dict(), macro_state)
        self.risk_score = risk_result["risk_score"]
        self.is_distressed = risk_result["is_distressed"]
        self.top_risk_drivers = risk_result.get("drivers", [])

        # 2. Economic Cash Flow Tick
        tax_deduction = self.monthly_income * tax_rate
        net_income = self.monthly_income - tax_deduction

        # Essential expenses inflated by food/commodity shock
        effective_essential = self.essential_expenses * (1.0 + food_shock * 0.70)

        # Adaptive spending response
        if self.is_distressed:
            # Under financial stress: drastically cut discretionary spending (Slide 11)
            effective_discretionary = self.discretionary_expenses * 0.20
            action_note = f"Financial stress alert (Risk {self.risk_score:.0%}). Slashed discretionary spending to 20%."
        elif self.risk_score > 0.35:
            # Moderate caution
            effective_discretionary = self.discretionary_expenses * 0.60
            action_note = f"Exercising caution due to inflation. Reduced discretionary spending."
        else:
            effective_discretionary = self.discretionary_expenses
            action_note = "Finances healthy. Standard lifestyle maintained."

        net_savings_delta = net_income - (effective_essential + effective_discretionary)

        if net_savings_delta >= 0:
            # Positive flow: add to savings and contribute to goal
            goal_contribution = net_savings_delta * 0.35
            self.savings += net_savings_delta - goal_contribution
            self.goal_progress_bdt = min(self.goal_target_bdt, self.goal_progress_bdt + goal_contribution)
            if self.goal_progress_bdt >= self.goal_target_bdt and not hasattr(self, "_goal_completed"):
                self._goal_completed = True
                self.record_memory(tick, f"Goal Achieved: {self.goal}!", f"Accumulated {self.goal_target_bdt:,.0f} BDT")
        else:
            # Deficit: must withdraw from savings
            deficit = abs(net_savings_delta)
            if self.savings >= deficit:
                self.savings -= deficit
                self.record_memory(tick, "Withdrew from savings", f"Covered deficit of {deficit:,.0f} BDT due to cost spike")
            else:
                remaining_deficit = deficit - self.savings
                self.savings = 0.0
                self.debt += remaining_deficit
                self.record_memory(tick, "Incurred emergency debt", f"Exhausted savings; borrowed {remaining_deficit:,.0f} BDT")

        # Record high-impact economic reactions
        if food_shock > 0.15 and random.random() < 0.2:
            self.record_memory(tick, "Food Price Shock Reaction", action_note)

        # 3. Choose Destination Hub for routine simulation rhythm
        time_of_day = tick % 3 # 0: Morning, 1: Afternoon, 2: Evening
        if time_of_day == 0:
            dest = self.workplace_hub if self.occupation != "Unemployed / Seeking" else "city_center"
        elif time_of_day == 1:
            dest = "market" if random.random() < 0.6 else "bank"
        else:
            dest = self.home_hub

        if dest != self.current_hub:
            self.set_destination(dest)

    def record_memory(self, tick: int, action: str, reason: str):
        self.memory_log.append({"tick": tick, "action": action, "reason": reason})
        if len(self.memory_log) > 15:
            self.memory_log.pop(0)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "age": self.age,
            "gender": self.gender,
            "occupation": self.occupation,
            "education": self.education,
            "skills": self.skills,
            "income": self.monthly_income,
            "monthly_income": self.monthly_income,
            "essential_expenses": self.essential_expenses,
            "discretionary_expenses": self.discretionary_expenses,
            "savings": self.savings,
            "debt": self.debt,
            "dependents": self.dependents,
            "goal": self.goal,
            "goal_target_bdt": self.goal_target_bdt,
            "goal_progress_bdt": self.goal_progress_bdt,
            "risk_score": self.risk_score,
            "is_distressed": int(self.is_distressed),
            "top_drivers": self.top_risk_drivers,
            "home_hub": self.home_hub,
            "workplace_hub": self.workplace_hub,
            "current_hub": self.current_hub,
            "x": self.x,
            "y": self.y,
            "memory_log": self.memory_log[-8:]
        }
