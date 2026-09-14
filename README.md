# EcoSim AI: Intelligent Economic Society Simulator

**Course:** Artificial Intelligence Lab, Dept. of Computer Science & Engineering  
**Authors:** Sadika Binti Noor (01123300453) & Emon Rahman (0112330069)  
**Live Repository:** [https://github.com/Emon0036/EcosimAi](https://github.com/Emon0036/EcosimAi)

---

## 🌟 Overview

**EcoSim AI** is an AI-driven simulation platform modeling a virtual economic society. Rather than relying on static economic assumptions or simple games, EcoSim AI is a research tool for studying cause-and-effect relationships between policy shocks (such as food inflation, tax hikes, and welfare subsidies) and community-wide macroeconomic outcomes using autonomous AI agents.

Every citizen in the society maintains private financial conditions, living expenses, personal savings goals, and adaptive decision-making logic.

```
       [ User Injects Economic Shock ] (e.g. +30% Food Inflation, +10% Tax)
                     │
                     ▼
           [ Environment Updates ]
                     │
                     ▼
        [ Agents Analyze Situation ] ◄── Logistic Regression Risk Model P(Distress)
                     │
                     ▼
         [ Agents Make Decisions ]  ◄── Cuts Discretionary Spend / Withdrew Savings / CSP Job Match
                     │
                     ▼
      [ Macroeconomic Outcomes Generated ] ◄── Gini Coefficient, Poverty Headcount, 2D City A* Motion
```

---

## 🧠 AI Core Techniques

| AI Technique | Role in EcoSim AI | Implementation File |
| :--- | :--- | :--- |
| **A\* Search** | Guides autonomous citizen navigation across the 2D virtual city grid between homes, workplaces, bazaar, banks, and schools avoiding obstacles. | [`backend/ai/astar.py`](file:///d:/Ai%20offline/Project/backend/ai/astar.py) & [`public/js/astar_client.js`](file:///d:/Ai%20offline/Project/public/js/astar_client.js) |
| **Constraint Satisfaction (CSP)** | Solves labor market allocation matching unemployed citizens to job vacancies with MRV (Minimum Remaining Values), degree heuristic, and forward checking. | [`backend/ai/csp_solver.py`](file:///d:/Ai%20offline/Project/backend/ai/csp_solver.py) & [`public/js/csp_client.js`](file:///d:/Ai%20offline/Project/public/js/csp_client.js) |
| **Logistic Regression (ML)** | Evaluates financial vulnerability and default risk for each citizen: $P(\text{distress}) = \frac{1}{1 + e^{-(W^TX + b)}}$ ($95.2\%$ accuracy, $0.985$ ROC-AUC). | [`backend/ai/risk_model.py`](file:///d:/Ai%20offline/Project/backend/ai/risk_model.py) & [`public/js/risk_client.js`](file:///d:/Ai%20offline/Project/public/js/risk_client.js) |
| **Econometric Analytics** | Live calculation of Gini Inequality index via Lorenz curve numerical integration, poverty headcount, and quintile breakdowns. | [`backend/simulation/engine.py`](file:///d:/Ai%20offline/Project/backend/simulation/engine.py) |

---

## 📊 Datasets

The project provides realistic, urban-calibrated datasets (calibrated in Bangladeshi Taka **BDT**):

1. **`citizens.csv` (120 Virtual Citizens)**:
   - Includes seed profile **Rohan Rahman** (Programmer, 30,000 BDT/mo, 5,000 BDT savings, Goal: "Buy a laptop", as specified in Slide 10).
   - Contains fields: `id`, `name`, `age`, `gender`, `occupation`, `education`, `skills`, `monthly_income`, `essential_expenses`, `discretionary_expenses`, `savings`, `debt`, `dependents`, `goal`, `risk_score`, `is_distressed`.
2. **`financial_risk_training.csv` (5,000 Historical Records)**:
   - Multi-variate dataset simulating diverse shock conditions used to train the Scikit-Learn Logistic Regression model.
   - Ground truth distress classifications based on debt ratios, buffer months, and inflation pass-through.

---

## 🗄️ Database Architecture

EcoSim AI supports dual-tier persistence:
- **Primary:** **Aiven Cloud MySQL** with SSL (`mysql-32b82b88-emonk42065-ek.f.aivencloud.com:19204`, DB: `defaultdb`).
- **Resilient Fallback:** **Local SQLite** database (`ecosim_local.db`), ensuring zero downtime if internet access is interrupted.
- Credentials and hostnames are managed via `.env` or system environment variables.

---

## 🚀 Quick Start (Running Locally)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Emon0036/EcosimAi.git
cd EcosimAi
pip install -r requirements.txt
```

### 2. Configure Environment (Optional)
Create or edit `.env`:
```env
MYSQL_HOST=mysql-32b82b88-emonk42065-ek.f.aivencloud.com
MYSQL_PORT=19204
MYSQL_USER=avnadmin
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=defaultdb
```

### 3. Run the Application
```bash
python app.py
```
Open your browser at: **`http://127.0.0.1:8000`**

---

## ☁️ Deploying to Vercel

The project includes built-in Vercel configuration (`vercel.json` and `api/index.py`).

1. Ensure the code is pushed to your GitHub repository: `https://github.com/Emon0036/EcosimAi`
2. Go to [Vercel Dashboard](https://vercel.com/new) -> **Import Git Repository**.
3. Select `EcosimAi`.
4. (Optional) Add Environment Variables:
   - `MYSQL_HOST`
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`
   - `MYSQL_PORT`
   - `MYSQL_DATABASE`
5. Click **Deploy**!

---

## 🏛️ Project Directory Structure

```text
EcosimAi/
├── app.py                      # Main entrypoint runner
├── vercel.json                 # Vercel serverless deployment config
├── requirements.txt            # Python dependencies
├── .env.example                # Example environment variables
├── api/
│   └── index.py                # Vercel serverless API bridge
├── backend/
│   ├── app.py                  # FastAPI REST endpoints & static server
│   ├── config.py               # Database and simulation configuration
│   ├── ai/
│   │   ├── astar.py            # A* Search pathfinding on 2D grid
│   │   ├── csp_solver.py       # CSP Solver for job & resource allocation
│   │   └── risk_model.py       # Logistic Regression ML model (Scikit-Learn)
│   ├── data/
│   │   ├── dataset_generator.py # Synthesizes calibrated demographics & ML data
│   │   ├── citizens.csv        # Seed population dataset
│   │   ├── financial_risk_training.csv # ML training data (5,000 samples)
│   │   └── market_config.json  # Commodity price baskets & job templates
│   ├── database/
│   │   └── db.py               # Aiven MySQL + SQLite manager
│   └── simulation/
│       ├── agent.py            # Autonomous citizen agent logic & memory
│       ├── city.py             # 2D City grid representation & 6 hubs
│       └── engine.py           # Simulation cycle & macro metrics
└── public/
    ├── index.html              # Modern dark-mode interface
    ├── css/
    │   └── styles.css          # Glassmorphism design system
    └── js/
        ├── config.js           # Client parameters & city hubs
        ├── astar_client.js     # Client-side 60 FPS A* pathfinding
        ├── risk_client.js      # Client-side Logistic Regression evaluator
        ├── csp_client.js       # CSP labor allocator visualizer
        ├── city_canvas.js      # 2D Canvas rendering engine
        ├── charts.js           # Live Gini & Quintile charts
        └── app.js              # Application coordinator
```

---

## 🎓 Academic Contribution

This simulator demonstrates how fundamental computer science and artificial intelligence techniques—**heuristic graph search (A\*)**, **constraint networks (CSP)**, and **supervised machine learning (Logistic Regression)**—can be combined with agent-based microeconomics to replace guesswork with quantitative, verifiable simulation models.