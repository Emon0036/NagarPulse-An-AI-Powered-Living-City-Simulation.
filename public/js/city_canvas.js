/**
 * 2D City Simulation Canvas Renderer
 * Renders functional hubs, road networks, A* path routes, and animated citizen agents.
 */
class CityCanvas {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext("2d");
        this.width = EcoConfig.GRID_WIDTH;
        this.height = EcoConfig.GRID_HEIGHT;
        this.agents = [];
        this.selectedAgentId = "agent_rohan_001"; // Default to Rohan as featured in Slide 10
        this.hoveredAgent = null;
        this.pulseTime = 0;

        this.initResize();
        this.initEvents();
        this.startRenderLoop();
    }

    initResize() {
        const resize = () => {
            const rect = this.canvas.parentElement.getBoundingClientRect();
            this.canvas.width = rect.width * window.devicePixelRatio;
            this.canvas.height = rect.height * window.devicePixelRatio;
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            this.displayWidth = rect.width;
            this.displayHeight = rect.height;
            this.cellW = this.displayWidth / this.width;
            this.cellH = this.displayHeight / this.height;
        };
        window.addEventListener("resize", resize);
        resize();
    }

    initEvents() {
        this.canvas.addEventListener("mousemove", (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            this.hoveredAgent = null;
            for (const agent of this.agents) {
                const ax = (agent.x + 0.5) * this.cellW;
                const ay = (agent.y + 0.5) * this.cellH;
                const dist = Math.hypot(mouseX - ax, mouseY - ay);
                if (dist < 14) {
                    this.hoveredAgent = agent;
                    this.canvas.style.cursor = "pointer";
                    return;
                }
            }
            this.canvas.style.cursor = "default";
        });

        this.canvas.addEventListener("click", (e) => {
            if (this.hoveredAgent) {
                this.selectedAgentId = this.hoveredAgent.id;
                if (window.ecoApp && window.ecoApp.openAgentModal) {
                    window.ecoApp.openAgentModal(this.hoveredAgent.id);
                }
            }
        });
    }

    updateAgents(agentsData) {
        // Smoothly interpolate agent positions
        const agentMap = new Map(this.agents.map(a => [a.id, a]));
        const updated = [];

        for (const raw of agentsData) {
            let existing = agentMap.get(raw.id);
            if (!existing) {
                existing = {
                    ...raw,
                    renderX: raw.x,
                    renderY: raw.y,
                    path: []
                };
            } else {
                existing.occupation = raw.occupation;
                existing.income = raw.income || raw.monthly_income;
                existing.savings = raw.savings;
                existing.risk_score = raw.risk_score;
                existing.is_distressed = raw.is_distressed;
                existing.x = raw.x;
                existing.y = raw.y;
            }
            updated.push(existing);
        }
        this.agents = updated;
    }

    startRenderLoop() {
        const render = () => {
            this.pulseTime += 0.04;
            this.draw();
            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.displayWidth, this.displayHeight);

        // 1. Draw City Ground & Street Grid
        this.drawStreets(ctx);

        // 2. Draw Functional Hubs (Buildings)
        this.drawHubs(ctx);

        // 3. Draw Selected Agent A* Path
        this.drawSelectedPath(ctx);

        // 4. Draw Animated Agents
        this.drawAgents(ctx);

        // 5. Draw Hover Tooltip
        if (this.hoveredAgent) {
            this.drawTooltip(ctx, this.hoveredAgent);
        }
    }

    drawStreets(ctx) {
        // Dark tech pavement background
        ctx.fillStyle = "#080d1a";
        ctx.fillRect(0, 0, this.displayWidth, this.displayHeight);

        // Subtle road grid lines
        ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
        ctx.lineWidth = 1;
        for (let x = 0; x <= this.width; x++) {
            ctx.beginPath();
            ctx.moveTo(x * this.cellW, 0);
            ctx.lineTo(x * this.cellW, this.displayHeight);
            ctx.stroke();
        }
        for (let y = 0; y <= this.height; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * this.cellH);
            ctx.lineTo(this.displayWidth, y * this.cellH);
            ctx.stroke();
        }

        // Main avenues connecting hubs (highlighted transit corridors)
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        // Horizontal Avenue
        ctx.fillRect(0, 6 * this.cellH, this.displayWidth, 4 * this.cellH);
        // Vertical Avenues
        ctx.fillRect(7 * this.cellW, 0, 3 * this.cellW, this.displayHeight);
        ctx.fillRect(15 * this.cellW, 0, 3 * this.cellW, this.displayHeight);

        // Road centerline glow
        ctx.strokeStyle = "rgba(6, 182, 212, 0.15)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 12]);
        ctx.beginPath();
        ctx.moveTo(0, 8 * this.cellH);
        ctx.lineTo(this.displayWidth, 8 * this.cellH);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    drawHubs(ctx) {
        const hubs = EcoConfig.HUBS;
        for (const key in hubs) {
            const hub = hubs[key];
            const [bx, by, bw, bh] = hub.box;
            const x = bx * this.cellW;
            const y = by * this.cellH;
            const w = bw * this.cellW;
            const h = bh * this.cellH;

            // Hub Card Container with soft gradient & glow
            const grad = ctx.createLinearGradient(x, y, x + w, y + h);
            grad.addColorStop(0, "rgba(15, 23, 42, 0.92)");
            grad.addColorStop(1, "rgba(30, 41, 59, 0.88)");

            ctx.save();
            ctx.shadowColor = hub.color;
            ctx.shadowBlur = 15;
            ctx.fillStyle = grad;
            this.roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 12);
            ctx.fill();
            ctx.restore();

            // Accent Border
            ctx.strokeStyle = hub.color;
            ctx.lineWidth = 1.5;
            this.roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 12);
            ctx.stroke();

            // Hub Header Label & Icon
            ctx.fillStyle = "#fff";
            ctx.font = "bold 12px Outfit, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(`${hub.icon} ${hub.name}`, x + w / 2, y + 26);

            // Door Access Node
            const [dx, dy] = hub.door;
            const doorX = (dx + 0.5) * this.cellW;
            const doorY = (dy + 0.5) * this.cellH;

            ctx.fillStyle = hub.color;
            ctx.beginPath();
            ctx.arc(doorX, doorY, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawSelectedPath(ctx) {
        const selected = this.agents.find(a => a.id === this.selectedAgentId);
        if (!selected || !selected.current_path || selected.current_path.length === 0) return;

        ctx.save();
        ctx.strokeStyle = "rgba(6, 182, 212, 0.7)";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "#06b6d4";
        ctx.shadowBlur = 10;
        ctx.beginPath();

        for (let i = 0; i < selected.current_path.length; i++) {
            const pt = selected.current_path[i];
            const px = (pt[0] + 0.5) * this.cellW;
            const py = (pt[1] + 0.5) * this.cellH;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
    }

    drawAgents(ctx) {
        for (const agent of this.agents) {
            // Smooth lerp movement toward target grid position
            agent.renderX = agent.renderX !== undefined ? agent.renderX + (agent.x - agent.renderX) * 0.15 : agent.x;
            agent.renderY = agent.renderY !== undefined ? agent.renderY + (agent.y - agent.renderY) * 0.15 : agent.y;

            const px = (agent.renderX + 0.5) * this.cellW;
            const py = (agent.renderY + 0.5) * this.cellH;

            // Determine status color from risk score
            let color = "#10b981"; // Solvent
            if (agent.is_distressed || agent.risk_score >= 0.55) {
                color = "#ef4444"; // Distressed
            } else if (agent.risk_score >= 0.35) {
                color = "#f59e0b"; // Strained
            }

            // Outer Pulse Halo
            ctx.save();
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            ctx.fillStyle = color;

            ctx.beginPath();
            ctx.arc(px, py, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Highlight Selected Agent
            if (agent.id === this.selectedAgentId) {
                ctx.save();
                ctx.strokeStyle = "#fbbf24";
                ctx.lineWidth = 2;
                ctx.shadowColor = "#fbbf24";
                ctx.shadowBlur = 12;
                ctx.beginPath();
                const ringRadius = 8.5 + Math.sin(this.pulseTime * 3) * 1.5;
                ctx.arc(px, py, ringRadius, 0, Math.PI * 2);
                ctx.stroke();

                // Name tag above selected
                ctx.fillStyle = "#fff";
                ctx.font = "bold 11px Outfit, sans-serif";
                ctx.textAlign = "center";
                ctx.fillText(agent.name, px, py - 14);
                ctx.restore();
            }
        }
    }

    drawTooltip(ctx, agent) {
        const px = (agent.renderX + 0.5) * this.cellW;
        const py = (agent.renderY + 0.5) * this.cellH;

        const text1 = `${agent.name} (${agent.occupation})`;
        const text2 = `Income: ${(agent.income || agent.monthly_income || 0).toLocaleString()} BDT | Risk: ${(agent.risk_score * 100).toFixed(0)}%`;

        ctx.font = "bold 11px Outfit, sans-serif";
        const w1 = ctx.measureText(text1).width;
        ctx.font = "10px Outfit, sans-serif";
        const w2 = ctx.measureText(text2).width;
        const boxW = Math.max(w1, w2) + 20;
        const boxH = 44;

        let bx = px - boxW / 2;
        let by = py - boxH - 12;
        if (by < 10) by = py + 16;

        ctx.save();
        ctx.fillStyle = "rgba(10, 15, 29, 0.92)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 1;
        this.roundRect(ctx, bx, by, boxW, boxH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#fff";
        ctx.font = "bold 11px Outfit, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(text1, px, by + 18);

        ctx.fillStyle = agent.is_distressed ? "#f87171" : "#34d399";
        ctx.font = "10px Outfit, sans-serif";
        ctx.fillText(text2, px, by + 34);
        ctx.restore();
    }

    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
}
