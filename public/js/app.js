/**
 * EcoSim AI - Main Client Application Coordinator (Clash of Clans Edition)
 */
class EcoSimApp {
    constructor() {
        this.isRunning = true;
        this.tickSpeed = 1;
        this.currentTick = 0;
        this.macroState = {
            food_shock_pct: 0.0,
            tax_rate: 0.10,
            inflation_rate: 0.05
        };
        this.agents = [];
        this.history = [];
        this.selectedAgentId = "agent_rohan_001";

        this.canvas = new CityCanvas("cityCanvas");
        this.charts = new EcoCharts();

        this.initControls();
        this.initTabs();
        this.initSearch();
        this.initDatabaseStatus();
        this.startSimulationLoop();
        this.fetchInitialState();
    }

    async fetchInitialState() {
        try {
            const res = await fetch("/api/state");
            if (res.ok) {
                const data = await res.json();
                this.updateFromState(data);
            }
        } catch (e) {
            console.warn("API state fetch offline or loading, using local simulation.");
        }
    }

    async initDatabaseStatus() {
        try {
            const res = await fetch("/api/db-status");
            if (res.ok) {
                const data = await res.json();
                const pill = document.getElementById("dbStatusPill");
                const text = document.getElementById("dbStatusText");
                if (data.mysql_connected) {
                    pill.className = "db-pill";
                    text.innerText = "Aiven MySQL Cloud (Connected)";
                } else {
                    pill.className = "db-pill warning";
                    text.innerText = `Storage: ${data.active_storage.toUpperCase()} (Aiven Configured)`;
                }
            }
        } catch (e) {
            // Ignore
        }
    }

    initControls() {
        // Sound Mute Toggle
        const soundBtn = document.getElementById("btnToggleSound");
        if (soundBtn) {
            soundBtn.addEventListener("click", () => {
                const isMuted = soundFX.toggleMute();
                soundBtn.innerHTML = isMuted 
                    ? '<i class="fas fa-volume-xmark"></i> Sound: Off' 
                    : '<i class="fas fa-volume-high"></i> Sound: On';
                if (!isMuted) soundFX.playClick();
            });
        }

        // Play / Pause
        const playBtn = document.getElementById("btnPlayPause");
        if (playBtn) {
            playBtn.addEventListener("click", () => {
                this.isRunning = !this.isRunning;
                soundFX.playClick();
                playBtn.innerHTML = this.isRunning 
                    ? '<i class="fas fa-pause"></i> Pause' 
                    : '<i class="fas fa-play"></i> Run';
            });
        }

        // Single Step
        const stepBtn = document.getElementById("btnStep");
        if (stepBtn) {
            stepBtn.addEventListener("click", () => {
                soundFX.playClick();
                this.step();
            });
        }

        // Speed Toggles
        document.querySelectorAll(".speed-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                soundFX.playClick();
                document.querySelectorAll(".speed-btn").forEach(b => b.classList.remove("active"));
                e.target.classList.add("active");
                this.tickSpeed = parseFloat(e.target.dataset.speed || 1);
            });
        });

        // Quick Event Shock Triggers (Slide 11)
        const foodShockBtn = document.getElementById("triggerFoodShock");
        if (foodShockBtn) {
            foodShockBtn.addEventListener("click", () => {
                soundFX.playWarHorn();
                this.injectShock("food_price_shock", 0.30, "Food Price Shock (+30%)");
                document.getElementById("sliderFoodShock").value = 30;
                document.getElementById("valFoodShock").innerText = "+30%";
                this.canvas.addFloatingText("⚡ +30% FOOD SHOCK!", 16, 2, "#ef4444");
            });
        }

        const taxHikeBtn = document.getElementById("triggerTaxHike");
        if (taxHikeBtn) {
            taxHikeBtn.addEventListener("click", () => {
                soundFX.playWarHorn();
                this.injectShock("tax_change", 0.20, "Tax Hike (20%)");
                document.getElementById("sliderTaxRate").value = 20;
                document.getElementById("valTaxRate").innerText = "20%";
                this.canvas.addFloatingText("📜 TAX HIKE 20%!", 9, 9, "#f59e0b");
            });
        }

        const stimulusBtn = document.getElementById("triggerStimulus");
        if (stimulusBtn) {
            stimulusBtn.addEventListener("click", () => {
                soundFX.playCoins();
                this.injectShock("cash_stimulus", 5000, "Direct Cash Stimulus (5,000 BDT)");
                this.canvas.addFloatingText("💰 +5,000 BDT STIMULUS!", 2, 9, "#10b981");
            });
        }

        const resetBtn = document.getElementById("triggerResetEconomy");
        if (resetBtn) {
            resetBtn.addEventListener("click", () => {
                soundFX.playSuccess();
                this.injectShock("reset_baseline", 0, "Economy Reset to Baseline");
                document.getElementById("sliderFoodShock").value = 0;
                document.getElementById("valFoodShock").innerText = "0%";
                document.getElementById("sliderTaxRate").value = 10;
                document.getElementById("valTaxRate").innerText = "10%";
                this.canvas.addFloatingText("🛡️ EQUILIBRIUM RESTORED", 9, 9, "#06b6d4");
            });
        }

        const cspBtn = document.getElementById("btnRunCSP");
        if (cspBtn) {
            cspBtn.addEventListener("click", () => {
                soundFX.playSuccess();
                this.canvas.addFloatingText("✨ CSP LABOR MATCH!", 9, 2, "#06b6d4");
                clientCSP.runSolver();
            });
        }

        // Sliders
        const sliderFood = document.getElementById("sliderFoodShock");
        if (sliderFood) {
            sliderFood.addEventListener("input", (e) => {
                const val = parseFloat(e.target.value);
                document.getElementById("valFoodShock").innerText = `+${val}%`;
                this.injectShock("food_price_shock", val / 100);
            });
        }

        const sliderTax = document.getElementById("sliderTaxRate");
        if (sliderTax) {
            sliderTax.addEventListener("input", (e) => {
                const val = parseFloat(e.target.value);
                document.getElementById("valTaxRate").innerText = `${val}%`;
                this.injectShock("tax_change", val / 100);
            });
        }

        // CSV Downloads
        const dlCitizensBtn = document.getElementById("btnDownloadCitizens");
        if (dlCitizensBtn) {
            dlCitizensBtn.addEventListener("click", () => {
                soundFX.playClick();
                window.location.href = "/api/dataset/download/citizens";
            });
        }
        const dlTrainBtn = document.getElementById("btnDownloadTraining");
        if (dlTrainBtn) {
            dlTrainBtn.addEventListener("click", () => {
                soundFX.playClick();
                window.location.href = "/api/dataset/download/training";
            });
        }
    }

    initTabs() {
        document.querySelectorAll(".tab-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                soundFX.playClick();
                const tabId = btn.dataset.tab;
                document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
                document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
                btn.classList.add("active");
                const targetPane = document.getElementById(tabId);
                if (targetPane) targetPane.classList.add("active");
            });
        });
    }

    initSearch() {
        const searchInput = document.getElementById("searchAgentsInput");
        const distressedCheck = document.getElementById("filterDistressedOnly");

        const filterHandler = () => {
            const query = (searchInput ? searchInput.value : "").toLowerCase();
            const distressedOnly = distressedCheck ? distressedCheck.checked : false;

            const filtered = this.agents.filter(a => {
                const matchSearch = a.name.toLowerCase().includes(query) || a.occupation.toLowerCase().includes(query);
                const matchDistress = !distressedOnly || a.is_distressed;
                return matchSearch && matchDistress;
            });
            this.renderAgentsTable(filtered);
        };

        if (searchInput) searchInput.addEventListener("input", filterHandler);
        if (distressedCheck) distressedCheck.addEventListener("change", filterHandler);
    }

    async injectShock(eventType, magnitude = 0, desc = "") {
        try {
            const res = await fetch("/api/event", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ event_type: eventType, magnitude, description: desc })
            });
            if (res.ok) {
                this.fetchInitialState();
            }
        } catch (e) {
            // Local client fallback
            if (eventType === "food_price_shock") this.macroState.food_shock_pct = magnitude;
            if (eventType === "tax_change") this.macroState.tax_rate = magnitude;
            this.updateClientAgents();
        }
    }

    startSimulationLoop() {
        setInterval(() => {
            if (this.isRunning) {
                this.step();
            }
        }, EcoConfig.TICK_INTERVAL_MS / this.tickSpeed);
    }

    async step() {
        try {
            const res = await fetch("/api/step", { method: "POST" });
            if (res.ok) {
                const data = await res.json();
                this.currentTick = data.tick;
                if (data.macro_state) this.macroState = data.macro_state;
                if (data.metrics) {
                    this.history.push(data.metrics);
                    this.updateMetricsUI(data.metrics);
                }
                if (this.currentTick % 2 === 0) {
                    this.fetchAgents();
                }
            } else {
                this.stepClientSide();
            }
        } catch (e) {
            this.stepClientSide();
        }
    }

    stepClientSide() {
        this.currentTick++;
        this.updateClientAgents();
    }

    updateClientAgents() {
        for (const agent of this.agents) {
            const risk = clientRiskModel.predict(agent, this.macroState);
            agent.risk_score = risk.risk_score;
            agent.is_distressed = risk.is_distressed;

            if (this.currentTick % 3 === 0) {
                // Pick random isometric building destination
                const keys = Object.keys(this.canvas.buildings);
                const destBuilding = this.canvas.buildings[keys[Math.floor(Math.random() * keys.length)]];
                agent.targetIsoX = destBuilding.door[0];
                agent.targetIsoY = destBuilding.door[1];
            }
        }
        this.canvas.updateAgents(this.agents);
        this.renderAgentsTable(this.agents);
    }

    async fetchAgents() {
        try {
            const res = await fetch("/api/agents?limit=120");
            if (res.ok) {
                const data = await res.json();
                this.agents = data.agents;
                this.canvas.updateAgents(this.agents);
                this.renderAgentsTable(this.agents);
            }
        } catch (e) {
            // Ignore
        }
    }

    updateFromState(state) {
        this.currentTick = state.tick || 0;
        this.macroState = state.macro_state || this.macroState;
        this.history = state.metrics_history || [];
        if (state.metrics) this.updateMetricsUI(state.metrics);
        this.fetchAgents();
    }

    updateMetricsUI(metrics) {
        // Update Clash of Clans Top Resource Bar
        const totalLiquidity = Math.round((metrics.avg_savings || 50000) * (metrics.total_agents || 120));
        const foodPrice = Math.round(4500 * (1.0 + (this.macroState.food_shock_pct || 0)));
        const solventCount = (metrics.total_agents || 120) - (metrics.distressed_count || 0);

        const hudTreasury = document.getElementById("hudTreasury");
        if (hudTreasury) hudTreasury.innerText = `${(totalLiquidity / 1000000).toFixed(2)}M BDT`;

        const hudFood = document.getElementById("hudFoodBasket");
        if (hudFood) hudFood.innerText = `${foodPrice.toLocaleString()} BDT`;

        const hudGini = document.getElementById("hudGini");
        if (hudGini) hudGini.innerText = (metrics.gini_coefficient || 0.35).toFixed(3);

        const hudPop = document.getElementById("hudPop");
        if (hudPop) hudPop.innerText = `${solventCount} / ${metrics.total_agents || 120}`;

        // Panel stats
        document.getElementById("statTick").innerText = `Day ${this.currentTick}`;
        document.getElementById("statGini").innerText = (metrics.gini_coefficient || 0.35).toFixed(4);
        document.getElementById("statPoverty").innerText = `${((metrics.poverty_rate || 0.1) * 100).toFixed(1)}%`;
        document.getElementById("statSavings").innerText = `${Math.round(metrics.avg_savings || 0).toLocaleString()} BDT`;
        document.getElementById("statDistressed").innerText = `${metrics.distressed_count || 0} Citizens`;

        // Update shock banner
        const banner = document.getElementById("shockBanner");
        if (banner) {
            if (this.macroState.food_shock_pct > 0) {
                banner.className = "shock-banner active-danger";
                banner.innerHTML = `<i class="fas fa-wheat-awn"></i> Food Shock: +${(this.macroState.food_shock_pct * 100).toFixed(0)}% Price Spike!`;
            } else if (this.macroState.tax_rate > 0.12) {
                banner.className = "shock-banner";
                banner.innerHTML = `<i class="fas fa-file-invoice-dollar"></i> High Tax: ${(this.macroState.tax_rate * 100).toFixed(0)}% Rate`;
            } else {
                banner.className = "shock-banner";
                banner.innerHTML = `<i class="fas fa-shield-halved"></i> Village Equilibrium`;
            }
        }

        // Update Charts
        this.charts.update(metrics, this.history);
    }

    renderAgentsTable(agentsList) {
        const tbody = document.getElementById("agentsTableBody");
        if (!tbody) return;

        let html = "";
        for (const a of agentsList.slice(0, 50)) {
            let badgeClass = "solvent";
            let statusText = "Solvent";
            if (a.is_distressed || a.risk_score >= 0.55) {
                badgeClass = "distressed";
                statusText = "Distressed";
            } else if (a.risk_score >= 0.35) {
                badgeClass = "strained";
                statusText = "Strained";
            }

            const income = a.income || a.monthly_income || 0;
            const savings = a.savings || 0;

            html += `
                <tr>
                    <td><strong>${a.name}</strong></td>
                    <td>${a.occupation}</td>
                    <td><span style="font-size: 0.72rem; color: #94a3b8;">${a.education}</span></td>
                    <td style="font-family: var(--font-mono);">${income.toLocaleString()} BDT</td>
                    <td style="font-family: var(--font-mono); color: #34d399;">${savings.toLocaleString()} BDT</td>
                    <td>
                        <div style="font-size: 0.72rem; color: var(--accent-cyan); font-weight: 600;">
                            ${a.goal || 'Emergency Fund'}
                        </div>
                    </td>
                    <td>
                        <span style="font-family: var(--font-mono); font-weight: 700; color: ${a.risk_score > 0.5 ? '#f87171' : '#38bdf8'};">
                            ${(a.risk_score * 100).toFixed(0)}%
                        </span>
                    </td>
                    <td>
                        <span class="status-badge ${badgeClass}">${statusText}</span>
                    </td>
                    <td>
                        <button class="btn" style="padding: 4px 10px; font-size: 0.72rem;" onclick="window.ecoApp.openAgentModal('${a.id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </td>
                </tr>
            `;
        }
        tbody.innerHTML = html;
    }

    async openAgentModal(agentId) {
        soundFX.playClick();
        try {
            const res = await fetch(`/api/agents/${agentId}`);
            let agent = null;
            if (res.ok) {
                agent = await res.json();
            } else {
                agent = this.agents.find(a => a.id === agentId);
            }
            if (!agent) return;

            this.selectedAgentId = agentId;
            this.canvas.selectedAgentId = agentId;

            const modal = document.getElementById("agentModal");
            const container = document.getElementById("agentModalDetails");
            if (!modal || !container) return;

            const income = agent.income || agent.monthly_income || 0;
            const essential = agent.essential_expenses || 0;
            const discretionary = agent.discretionary_expenses || 0;
            const savings = agent.savings || 0;
            const debt = agent.debt || 0;
            const goalTarget = agent.goal_target_bdt || 65000;
            const goalProg = agent.goal_progress_bdt || Math.min(savings * 0.4, goalTarget);
            const goalPct = Math.min(100, Math.round((goalProg / goalTarget) * 100));

            let html = `
                <div class="agent-profile-header" style="display: flex; gap: 16px; align-items: center; margin-bottom: 20px;">
                    <div style="width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #f59e0b, #d97706); border: 2px solid #fbbf24; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; box-shadow: 0 0 16px rgba(245, 158, 11, 0.4);">
                        👤
                    </div>
                    <div>
                        <h2 style="font-size: 1.35rem; font-weight: 800; color: #fff;">${agent.name}</h2>
                        <div style="font-size: 0.82rem; color: var(--text-muted); display: flex; gap: 12px; margin-top: 4px;">
                            <span><i class="fas fa-briefcase"></i> ${agent.occupation}</span>
                            <span><i class="fas fa-graduation-cap"></i> ${agent.education}</span>
                            <span><i class="fas fa-venus-mars"></i> ${agent.gender}, Age ${agent.age}</span>
                        </div>
                    </div>
                </div>

                <!-- Goal Progress Bar (Slide 10) -->
                <div style="background: rgba(0,0,0,0.3); border: 1.5px solid var(--border-gold); border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
                        <span><i class="fas fa-trophy" style="color: var(--coc-gold);"></i> Personal Asset Goal: <strong>${agent.goal}</strong></span>
                        <span style="font-family: var(--font-mono); font-weight: 800; color: var(--accent-emerald);">${goalProg.toLocaleString()} / ${goalTarget.toLocaleString()} BDT (${goalPct}%)</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${goalPct}%;"></div>
                    </div>
                </div>

                <!-- Financial Balance Sheet -->
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px;">
                    <div class="stat-box">
                        <div class="label">Monthly Income</div>
                        <div class="value" style="font-size: 1.05rem; color: var(--accent-cyan);">${income.toLocaleString()} BDT</div>
                        <div class="subtext">Primary Salary</div>
                    </div>
                    <div class="stat-box">
                        <div class="label">Essential Cost</div>
                        <div class="value" style="font-size: 1.05rem; color: var(--accent-amber);">${essential.toLocaleString()} BDT</div>
                        <div class="subtext">Food, Rent, Utilities</div>
                    </div>
                    <div class="stat-box">
                        <div class="label">Savings Reserve</div>
                        <div class="value" style="font-size: 1.05rem; color: var(--accent-emerald);">${savings.toLocaleString()} BDT</div>
                        <div class="subtext">${(savings / Math.max(essential, 1)).toFixed(1)} Months Buffer</div>
                    </div>
                    <div class="stat-box">
                        <div class="label">Outstanding Debt</div>
                        <div class="value" style="font-size: 1.05rem; color: var(--accent-rose);">${debt.toLocaleString()} BDT</div>
                        <div class="subtext">Microfinance / Loans</div>
                    </div>
                </div>

                <!-- Logistic Regression Risk Prediction (Slide 7) -->
                <div style="background: rgba(0,0,0,0.3); border: 1.5px solid var(--border-gold); border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px;">
                    <h4 style="font-size: 0.88rem; margin-bottom: 8px; color: var(--coc-gold);">
                        <i class="fas fa-shield-virus"></i> Logistic Regression Financial Solvency Model
                    </h4>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-size: 0.8rem; color: var(--text-secondary);">Predicted Probability of Distress P(Distress):</span>
                        <span style="font-family: var(--font-mono); font-size: 1.15rem; font-weight: 800; color: ${agent.risk_score > 0.5 ? 'var(--status-distressed)' : 'var(--status-solvent)'};">
                            ${(agent.risk_score * 100).toFixed(1)}% (${agent.is_distressed ? 'DISTRESSED' : 'SOLVENT'})
                        </span>
                    </div>
                    <div style="font-size: 0.76rem; color: var(--text-muted);">
                        <strong>Active Risk Drivers:</strong>
                        <ul style="margin-left: 18px; margin-top: 4px;">
                            ${(agent.top_drivers && agent.top_drivers.length > 0) 
                                ? agent.top_drivers.map(d => `<li>${typeof d === 'string' ? d : d.feat}</li>`).join('')
                                : '<li>Healthy economic balance sheet</li>'
                            }
                        </ul>
                    </div>
                </div>

                <!-- Episodic Memory Log (Slide 10) -->
                <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px;">
                    <h4 style="font-size: 0.88rem; margin-bottom: 8px; color: var(--text-secondary);">
                        <i class="fas fa-scroll"></i> Citizen Memory & Decision Log
                    </h4>
                    <div style="max-height: 140px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; font-size: 0.74rem;">
                        ${(agent.full_memory || agent.memory_log || []).map(m => `
                            <div style="padding: 5px 10px; background: rgba(255,255,255,0.02); border-left: 2px solid var(--coc-gold); border-radius: 4px;">
                                <strong style="color: var(--coc-gold);">Day ${m.tick}:</strong> ${m.action} — <span style="color: var(--text-muted);">${m.reason}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            container.innerHTML = html;
            modal.classList.add("open");
        } catch (e) {
            console.error("Agent modal open error:", e);
        }
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove("open");
}

window.addEventListener("DOMContentLoaded", () => {
    window.ecoApp = new EcoSimApp();
});
