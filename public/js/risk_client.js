/**
 * Client-Side Logistic Regression Risk Predictor
 * Computes P(Distress) = 1 / (1 + exp(-(beta_0 + sum(beta_i * (x_i - mu_i) / sigma_i))))
 */
class ClientRiskModel {
    constructor() {
        // Defaults loaded from Scikit-Learn training
        this.weights = {
            essential_to_income_ratio: 2.9102,
            savings_to_expense_ratio: -7.2709,
            debt_to_income_ratio: 2.0620,
            food_shock_pct: 0.5539,
            inflation_rate: 0.1421,
            job_stability: -0.5189,
            dependents: 0.5543
        };
        this.intercept = -0.8415;
        this.scaler_mean = [0.65, 2.2, 0.45, 0.25, 0.11, 0.64, 1.8];
        this.scaler_scale = [0.22, 1.8, 0.60, 0.14, 0.04, 0.20, 1.4];
        this.feature_names = [
            "essential_to_income_ratio",
            "savings_to_expense_ratio",
            "debt_to_income_ratio",
            "food_shock_pct",
            "inflation_rate",
            "job_stability",
            "dependents"
        ];
        this.fetchWeights();
    }

    async fetchWeights() {
        try {
            const res = await fetch("/api/risk-weights");
            if (res.ok) {
                const data = await res.json();
                if (data.weights) this.weights = data.weights;
                if (data.intercept !== undefined) this.intercept = data.intercept;
                if (data.scaler_mean) this.scaler_mean = data.scaler_mean;
                if (data.scaler_scale) this.scaler_scale = data.scaler_scale;
            }
        } catch (e) {
            // Use pre-loaded calibrated defaults
        }
    }

    predict(agent, macro) {
        const income = Math.max(parseFloat(agent.income || agent.monthly_income || 25000), 100);
        const essential = parseFloat(agent.essential_expenses || 15000);
        const savings = parseFloat(agent.savings || 5000);
        const debt = parseFloat(agent.debt || 0);
        const dependents = parseFloat(agent.dependents || 1);
        const jobStability = parseFloat(agent.job_stability || 0.75);

        const foodShock = parseFloat(macro.food_shock_pct || 0.0);
        const inflation = parseFloat(macro.inflation_rate || 0.05);

        const shockedEssential = essential * (1.0 + foodShock * 0.65);
        const essentialRatio = shockedEssential / income;
        const savingsRatio = savings / Math.max(shockedEssential, 100);
        const debtRatio = debt / income;

        const raw = [
            essentialRatio,
            savingsRatio,
            debtRatio,
            foodShock,
            inflation,
            jobStability,
            dependents
        ];

        let z = this.intercept;
        const drivers = [];

        for (let i = 0; i < this.feature_names.length; i++) {
            const feat = this.feature_names[i];
            const mean = this.scaler_mean[i] || 0;
            const scale = (this.scaler_scale[i] && this.scaler_scale[i] !== 0) ? this.scaler_scale[i] : 1;
            const scaled = (raw[i] - mean) / scale;
            const w = this.weights[feat] || 0;
            const contrib = w * scaled;
            z += contrib;

            if (contrib > 0.15) {
                drivers.push({ feat, contrib, val: raw[i] });
            }
        }

        const prob = 1.0 / (1.0 + Math.exp(-z));
        const clampedProb = Math.min(Math.max(prob, 0.01), 0.99);

        return {
            risk_score: parseFloat(clampedProb.toFixed(3)),
            is_distressed: clampedProb >= 0.50,
            top_drivers: drivers.sort((a, b) => b.contrib - a.contrib).slice(0, 3)
        };
    }
}

const clientRiskModel = new ClientRiskModel();
