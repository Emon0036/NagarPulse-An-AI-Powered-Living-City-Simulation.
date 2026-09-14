/**
 * EcoSim AI - 2.5D Isometric City Engine (Clash of Clans Aesthetic)
 * Features:
 * - 2.5D Isometric terrain projection with lush grass and cobblestone roads
 * - Stylized Clash of Clans inspired buildings (Town Hall, Bank Vault, Bazaar Stalls, Tech Workshop, Academy Tower, Cottages)
 * - Animated smoke particles, ambient sparkles, and floating economic combat numbers
 * - RTS-style troop health/solvency bars and dynamic emotion/action speech bubbles
 * - Pan and zoom camera controls
 */

class CityCanvas {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext("2d");
        
        // Grid setup
        this.gridSize = 22; // 22x22 isometric terrain
        this.tileW = 54;
        this.tileH = 27;

        // Camera Pan & Zoom
        this.camera = {
            x: 0,
            y: 0,
            zoom: 1.0,
            isDragging: false,
            startX: 0,
            startY: 0
        };

        // State
        this.agents = [];
        this.selectedAgentId = "agent_rohan_001";
        this.selectedBuilding = null;
        this.hoveredObject = null;
        this.time = 0;

        // Particles & Floating Numbers
        this.smokeParticles = [];
        this.floatingTexts = [];
        this.ambientSparkles = [];

        // Building definitions in isometric coordinates (isoX, isoY, sizeX, sizeY)
        this.buildings = {
            city_center: {
                id: "city_center",
                name: "Town Hall & Civic Fortress",
                category: "Governance",
                isoX: 9, isoY: 9, sizeX: 4, sizeY: 4,
                door: [11, 13],
                theme: "gold_castle",
                icon: "🏛️",
                level: 5,
                color: "#eab308",
                description: "Central municipal governance, city treasury, and tax administration."
            },
            bank: {
                id: "bank",
                name: "Treasury & Commercial Bank",
                category: "Finance",
                isoX: 2, isoY: 9, sizeX: 4, sizeY: 4,
                door: [4, 13],
                theme: "gold_vault",
                icon: "💰",
                level: 4,
                color: "#8b5cf6",
                description: "Vault for citizen savings deposits, microfinance credit, and business loans."
            },
            market: {
                id: "market",
                name: "Central Bazaar & Stalls",
                category: "Commerce",
                isoX: 16, isoY: 2, sizeX: 4, sizeY: 4,
                door: [16, 6],
                theme: "bazaar_stalls",
                icon: "🏪",
                level: 3,
                color: "#f59e0b",
                description: "Essential grain, meat, spices, produce, and consumer electronics retail."
            },
            workplace: {
                id: "workplace",
                name: "Industrial & Tech Workshop",
                category: "Employment",
                isoX: 9, isoY: 2, sizeX: 4, sizeY: 4,
                door: [11, 6],
                theme: "tech_forge",
                icon: "⚙️",
                level: 4,
                color: "#10b981",
                description: "Software dev firms, engineering labs, and garment manufacturing plants."
            },
            education: {
                id: "education",
                name: "University & Wizard Academy",
                category: "Education",
                isoX: 2, isoY: 2, sizeX: 4, sizeY: 4,
                door: [4, 6],
                theme: "academy_spire",
                icon: "🎓",
                level: 3,
                color: "#06b6d4",
                description: "Higher education, scientific research, and vocational skill upskilling."
            },
            housing: {
                id: "housing",
                name: "Residential Quarter & Cottages",
                category: "Living",
                isoX: 16, isoY: 9, sizeX: 4, sizeY: 4,
                door: [16, 13],
                theme: "village_cottages",
                icon: "🏡",
                level: 4,
                color: "#3b82f6",
                description: "Comfortable citizen family homes, apartment quarters, and gardens."
            }
        };

        this.initCanvas();
        this.initControls();
        this.initAmbientParticles();
        this.startLoop();
    }

    initCanvas() {
        const resize = () => {
            const rect = this.canvas.parentElement.getBoundingClientRect();
            this.canvas.width = rect.width * window.devicePixelRatio;
            this.canvas.height = rect.height * window.devicePixelRatio;
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            this.displayWidth = rect.width;
            this.displayHeight = rect.height;
            // Center camera
            if (this.camera.x === 0 && this.camera.y === 0) {
                this.camera.x = this.displayWidth / 2;
                this.camera.y = this.displayHeight / 4;
            }
        };
        window.addEventListener("resize", resize);
        resize();
    }

    initControls() {
        // Drag to pan
        this.canvas.addEventListener("mousedown", (e) => {
            this.camera.isDragging = true;
            this.camera.startX = e.clientX - this.camera.x;
            this.camera.startY = e.clientY - this.camera.y;
        });

        window.addEventListener("mousemove", (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            if (this.camera.isDragging) {
                this.camera.x = e.clientX - this.camera.startX;
                this.camera.y = e.clientY - this.camera.startY;
                return;
            }

            // Hover detection
            this.updateHover(mouseX, mouseY);
        });

        window.addEventListener("mouseup", () => {
            this.camera.isDragging = false;
        });

        // Mouse wheel zoom
        this.canvas.addEventListener("wheel", (e) => {
            e.preventDefault();
            const zoomDelta = e.deltaY < 0 ? 1.1 : 0.9;
            this.camera.zoom = Math.min(Math.max(this.camera.zoom * zoomDelta, 0.7), 2.2);
        }, { passive: false });

        // Click selection
        this.canvas.addEventListener("click", (e) => {
            if (soundFX) soundFX.playClick();
            if (this.hoveredObject) {
                if (this.hoveredObject.type === "agent") {
                    this.selectedAgentId = this.hoveredObject.data.id;
                    if (window.ecoApp && window.ecoApp.openAgentModal) {
                        window.ecoApp.openAgentModal(this.hoveredObject.data.id);
                    }
                } else if (this.hoveredObject.type === "building") {
                    this.selectedBuilding = this.hoveredObject.data;
                    this.openBuildingModal(this.hoveredObject.data);
                }
            }
        });
    }

    initAmbientParticles() {
        for (let i = 0; i < 35; i++) {
            this.ambientSparkles.push({
                x: Math.random() * 22,
                y: Math.random() * 22,
                speed: 0.005 + Math.random() * 0.01,
                size: 1 + Math.random() * 2,
                opacity: 0.3 + Math.random() * 0.5
            });
        }
    }

    // Isometric coordinate conversions
    isoToScreen(isoX, isoY, elevation = 0) {
        const x = (isoX - isoY) * (this.tileW / 2) * this.camera.zoom + this.camera.x;
        const y = (isoX + isoY) * (this.tileH / 2) * this.camera.zoom + this.camera.y - (elevation * this.camera.zoom);
        return { x, y };
    }

    screenToIso(screenX, screenY) {
        const relX = (screenX - this.camera.x) / this.camera.zoom;
        const relY = (screenY - this.camera.y) / this.camera.zoom;
        const isoX = (relX / (this.tileW / 2) + relY / (this.tileH / 2)) / 2;
        const isoY = (relY / (this.tileH / 2) - relX / (this.tileW / 2)) / 2;
        return { isoX, isoY };
    }

    updateHover(mouseX, mouseY) {
        this.hoveredObject = null;

        // Check agents first (top priority)
        for (const agent of this.agents) {
            const pos = this.isoToScreen(agent.renderX, agent.renderY, 6);
            const dist = Math.hypot(mouseX - pos.x, mouseY - pos.y);
            if (dist < 18 * this.camera.zoom) {
                this.hoveredObject = { type: "agent", data: agent };
                this.canvas.style.cursor = "pointer";
                return;
            }
        }

        // Check buildings
        const { isoX, isoY } = this.screenToIso(mouseX, mouseY);
        for (const key in this.buildings) {
            const b = this.buildings[key];
            if (isoX >= b.isoX && isoX <= b.isoX + b.sizeX &&
                isoY >= b.isoY && isoY <= b.isoY + b.sizeY) {
                this.hoveredObject = { type: "building", data: b };
                this.canvas.style.cursor = "pointer";
                return;
            }
        }

        this.canvas.style.cursor = this.camera.isDragging ? "grabbing" : "default";
    }

    updateAgents(agentsData) {
        const agentMap = new Map(this.agents.map(a => [a.id, a]));
        const updated = [];

        for (const raw of agentsData) {
            let existing = agentMap.get(raw.id);
            if (!existing) {
                // Map grid 24x16 to iso 20x20
                const targetIsoX = (raw.x / 24) * 18 + 1;
                const targetIsoY = (raw.y / 16) * 18 + 1;
                existing = {
                    ...raw,
                    renderX: targetIsoX,
                    renderY: targetIsoY,
                    targetIsoX,
                    targetIsoY,
                    walkCycle: Math.random() * 10,
                    speechBubble: null,
                    bubbleTimer: 0
                };
            } else {
                existing.occupation = raw.occupation;
                existing.income = raw.income || raw.monthly_income;
                existing.savings = raw.savings;
                existing.risk_score = raw.risk_score;
                existing.is_distressed = raw.is_distressed;
                existing.targetIsoX = (raw.x / 24) * 18 + 1;
                existing.targetIsoY = (raw.y / 16) * 18 + 1;

                // Random action speech bubbles
                if (Math.random() < 0.015 && !existing.speechBubble) {
                    const bubbles = ["🛒 Bazaar", "💼 Work", "💰 Bank", "🌾 Food", "☕ Break", "📚 Study"];
                    if (existing.is_distressed) bubbles.push("⚠️ High Cost!", "📉 Low Cash", "🚨 Stress!");
                    existing.speechBubble = bubbles[Math.floor(Math.random() * bubbles.length)];
                    existing.bubbleTimer = 60;
                }
            }
            updated.push(existing);
        }
        this.agents = updated;
    }

    // Add floating text effect (damage / coin popups)
    addFloatingText(text, isoX, isoY, color = "#10b981") {
        this.floatingTexts.push({
            text,
            isoX,
            isoY,
            elevation: 20,
            color,
            alpha: 1.0,
            life: 50
        });
    }

    startLoop() {
        const tick = () => {
            this.time += 0.03;
            this.updateParticles();
            this.draw();
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    updateParticles() {
        // Spawn chimney smoke from Workplace and Housing
        if (Math.random() < 0.25) {
            const b = this.buildings.workplace;
            this.smokeParticles.push({
                isoX: b.isoX + 1.2 + (Math.random() - 0.5) * 0.4,
                isoY: b.isoY + 1.2 + (Math.random() - 0.5) * 0.4,
                elevation: 42,
                size: 4 + Math.random() * 3,
                alpha: 0.6,
                vx: (Math.random() - 0.5) * 0.01,
                vy: -0.015,
                ve: 0.4 + Math.random() * 0.3
            });
        }

        // Update smoke
        for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
            const p = this.smokeParticles[i];
            p.isoX += p.vx;
            p.isoY += p.vy;
            p.elevation += p.ve;
            p.size += 0.15;
            p.alpha -= 0.012;
            if (p.alpha <= 0) {
                this.smokeParticles.splice(i, 1);
            }
        }

        // Update floating texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const t = this.floatingTexts[i];
            t.elevation += 0.5;
            t.alpha -= 0.02;
            t.life--;
            if (t.life <= 0 || t.alpha <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }

        // Update agent bubbles
        for (const a of this.agents) {
            if (a.speechBubble) {
                a.bubbleTimer--;
                if (a.bubbleTimer <= 0) a.speechBubble = null;
            }
        }
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.displayWidth, this.displayHeight);

        // Sky backdrop / Vignette
        const skyGrad = ctx.createRadialGradient(
            this.displayWidth / 2, this.displayHeight / 2, 50,
            this.displayWidth / 2, this.displayHeight / 2, this.displayWidth * 0.8
        );
        skyGrad.addColorStop(0, "#132338");
        skyGrad.addColorStop(1, "#070c17");
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, this.displayWidth, this.displayHeight);

        // 1. Draw Isometric Terrain Grass Grid
        this.drawTerrain(ctx);

        // 2. Draw Cobblestone Roads & Pathways
        this.drawRoadways(ctx);

        // 3. Render Isometric Village Elements Sorted by Depth (Y-sort)
        this.drawIsometricEntities(ctx);

        // 4. Draw Particles (Smoke & Floating Text)
        this.drawParticles(ctx);

        // 5. Draw UI HUD Overlay (Minimap / Hover details)
        this.drawOverlayHUD(ctx);
    }

    drawTerrain(ctx) {
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                const pt = this.isoToScreen(x, y);

                // Alternating lush grass tile pattern like Clash of Clans
                const isCheckered = (x + y) % 2 === 0;
                ctx.fillStyle = isCheckered ? "#3b7a26" : "#438c2c";

                // Perimeter stone border wall
                if (x === 0 || y === 0 || x === this.gridSize - 1 || y === this.gridSize - 1) {
                    ctx.fillStyle = "#2d541e";
                }

                this.drawIsoDiamond(ctx, pt.x, pt.y, this.tileW * this.camera.zoom, this.tileH * this.camera.zoom);
                ctx.fill();

                // Subtle grid borders
                ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
    }

    drawRoadways(ctx) {
        // Cobblestone avenues linking hubs
        const roads = [
            // Horizontal central avenue
            { start: [1, 7], end: [20, 8] },
            // Vertical central avenue
            { start: [7, 1], end: [8, 20] },
            { start: [14, 1], end: [15, 20] }
        ];

        for (const road of roads) {
            const [x1, y1] = road.start;
            const [x2, y2] = road.end;
            for (let x = x1; x <= x2; x++) {
                for (let y = y1; y <= y2; y++) {
                    const pt = this.isoToScreen(x, y);
                    ctx.fillStyle = "#b5996f"; // Cobblestone dirt/sand
                    this.drawIsoDiamond(ctx, pt.x, pt.y, this.tileW * this.camera.zoom, this.tileH * this.camera.zoom);
                    ctx.fill();

                    // Road stone accents
                    ctx.fillStyle = "#8c724e";
                    ctx.fillRect(pt.x - 2, pt.y - 1, 4, 2);
                }
            }
        }
    }

    drawIsometricEntities(ctx) {
        // Collect all entities that need Z-sorting: buildings, agents, trees
        const entities = [];

        // Add buildings
        for (const key in this.buildings) {
            const b = this.buildings[key];
            entities.push({
                type: "building",
                sortKey: b.isoX + b.isoY + b.sizeX + b.sizeY,
                data: b
            });
        }

        // Add agents
        for (const a of this.agents) {
            entities.push({
                type: "agent",
                sortKey: a.renderX + a.renderY,
                data: a
            });
        }

        // Add decorative trees
        const trees = [
            { x: 1, y: 1 }, { x: 7, y: 1 }, { x: 14, y: 1 }, { x: 20, y: 1 },
            { x: 1, y: 15 }, { x: 7, y: 15 }, { x: 20, y: 15 }, { x: 1, y: 20 },
            { x: 14, y: 20 }, { x: 20, y: 20 }
        ];
        for (const t of trees) {
            entities.push({
                type: "tree",
                sortKey: t.x + t.y,
                data: t
            });
        }

        // Sort back-to-front (painter's algorithm)
        entities.sort((a, b) => a.sortKey - b.sortKey);

        for (const ent of entities) {
            if (ent.type === "tree") {
                this.drawIsoTree(ctx, ent.data.x, ent.data.y);
            } else if (ent.type === "building") {
                this.drawIsoBuilding(ctx, ent.data);
            } else if (ent.type === "agent") {
                this.drawIsoAgent(ctx, ent.data);
            }
        }
    }

    drawIsoDiamond(ctx, cx, cy, w, h) {
        ctx.beginPath();
        ctx.moveTo(cx, cy - h / 2);
        ctx.lineTo(cx + w / 2, cy);
        ctx.lineTo(cx, cy + h / 2);
        ctx.lineTo(cx - w / 2, cy);
        ctx.closePath();
    }

    drawIsoTree(ctx, x, y) {
        const pt = this.isoToScreen(x, y);
        const z = this.camera.zoom;

        // Shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y + 2, 10 * z, 5 * z, 0, 0, Math.PI * 2);
        ctx.fill();

        // Trunk
        ctx.fillStyle = "#633c1d";
        ctx.fillRect(pt.x - 2 * z, pt.y - 12 * z, 4 * z, 12 * z);

        // Foliage Crown (Layered Greens like Clash of Clans)
        ctx.fillStyle = "#1e6822";
        ctx.beginPath();
        ctx.arc(pt.x, pt.y - 18 * z, 12 * z, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#2ea334";
        ctx.beginPath();
        ctx.arc(pt.x - 2 * z, pt.y - 21 * z, 8 * z, 0, Math.PI * 2);
        ctx.fill();
    }

    drawIsoBuilding(ctx, b) {
        const origin = this.isoToScreen(b.isoX, b.isoY);
        const z = this.camera.zoom;
        const bw = b.sizeX * this.tileW * 0.5 * z;
        const bh = b.sizeY * this.tileH * 0.5 * z;
        const heightPx = 52 * z; // 3D elevation height

        // 1. Large Ground Shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.beginPath();
        ctx.ellipse(origin.x, origin.y + bh * 0.6, bw * 1.5, bh * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Base Platform / Stonework Foundation
        const baseColor = b.color || "#10b981";
        
        // Front-left wall
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.moveTo(origin.x - bw, origin.y);
        ctx.lineTo(origin.x, origin.y + bh);
        ctx.lineTo(origin.x, origin.y + bh - heightPx);
        ctx.lineTo(origin.x - bw, origin.y - heightPx);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.stroke();

        // Front-right wall (shaded slightly darker)
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y + bh);
        ctx.lineTo(origin.x + bw, origin.y);
        ctx.lineTo(origin.x + bw, origin.y - heightPx);
        ctx.lineTo(origin.x, origin.y + bh - heightPx);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.stroke();

        // Roof Top (Isometric Diamond)
        ctx.fillStyle = baseColor;
        this.drawIsoDiamond(ctx, origin.x, origin.y - heightPx, bw * 2, bh * 2);
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 3. Theme-Specific Architectural Details
        if (b.theme === "gold_castle") {
            // Town Hall Golden Crown Battlements & Flag
            ctx.fillStyle = "#fbbf24";
            ctx.fillRect(origin.x - 6 * z, origin.y - heightPx - 16 * z, 12 * z, 16 * z);
            // Flag
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.moveTo(origin.x, origin.y - heightPx - 24 * z);
            ctx.lineTo(origin.x + 14 * z, origin.y - heightPx - 18 * z);
            ctx.lineTo(origin.x, origin.y - heightPx - 14 * z);
            ctx.closePath();
            ctx.fill();
        } else if (b.theme === "gold_vault") {
            // Gold Vault Coin Pile / Crystal
            ctx.fillStyle = "#a855f7";
            ctx.beginPath();
            ctx.arc(origin.x, origin.y - heightPx - 8 * z, 8 * z, 0, Math.PI * 2);
            ctx.fill();
        } else if (b.theme === "tech_forge") {
            // Twin smoking chimneys
            ctx.fillStyle = "#475569";
            ctx.fillRect(origin.x - 12 * z, origin.y - heightPx - 14 * z, 6 * z, 14 * z);
            ctx.fillRect(origin.x + 6 * z, origin.y - heightPx - 14 * z, 6 * z, 14 * z);
        } else if (b.theme === "bazaar_stalls") {
            // Striped Canvas Awning (Red & White)
            ctx.fillStyle = "#ef4444";
            ctx.fillRect(origin.x - 16 * z, origin.y - heightPx - 6 * z, 32 * z, 6 * z);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(origin.x - 8 * z, origin.y - heightPx - 6 * z, 8 * z, 6 * z);
            ctx.fillRect(origin.x + 8 * z, origin.y - heightPx - 6 * z, 8 * z, 6 * z);
        }

        // 4. Building Name & Level Badge (Clash of Clans Style Banner)
        const isHovered = this.hoveredObject && this.hoveredObject.data.id === b.id;
        const bannerY = origin.y - heightPx - 26 * z;

        ctx.save();
        ctx.shadowColor = isHovered ? b.color : "rgba(0,0,0,0.5)";
        ctx.shadowBlur = isHovered ? 15 : 6;

        // Banner backing
        ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
        ctx.strokeStyle = isHovered ? "#fbbf24" : "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = isHovered ? 2 : 1;

        const text = `${b.icon} ${b.name}`;
        ctx.font = `bold ${Math.round(11 * z)}px Outfit, sans-serif`;
        const textW = ctx.measureText(text).width + 16 * z;
        this.roundRect(ctx, origin.x - textW / 2, bannerY, textW, 20 * z, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(text, origin.x, bannerY + 14 * z);
        ctx.restore();
    }

    drawIsoAgent(ctx, a) {
        // Interpolate movement smoothly
        a.renderX += (a.targetIsoX - a.renderX) * 0.12;
        a.renderY += (a.targetIsoY - a.renderY) * 0.12;

        const isMoving = Math.hypot(a.targetIsoX - a.renderX, a.targetIsoY - a.renderY) > 0.05;
        if (isMoving) a.walkCycle += 0.25;

        // Walk-bob animation like Clash of Clans villagers
        const bob = Math.abs(Math.sin(a.walkCycle)) * 4;
        const pt = this.isoToScreen(a.renderX, a.renderY, bob);
        const z = this.camera.zoom;

        // 1. Ground Drop Shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y + bob * z + 3 * z, 7 * z, 3.5 * z, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Character Body (Stylized Tunic)
        let bodyColor = "#3b82f6"; // Default blue
        if (a.occupation.includes("Programmer")) bodyColor = "#06b6d4";
        else if (a.occupation.includes("Teacher") || a.occupation.includes("Lecturer")) bodyColor = "#10b981";
        else if (a.occupation.includes("Bank")) bodyColor = "#8b5cf6";
        else if (a.occupation.includes("Worker") || a.occupation.includes("Driver")) bodyColor = "#d97706";

        // Head
        ctx.fillStyle = "#fcd34d"; // Skin tone
        ctx.beginPath();
        ctx.arc(pt.x, pt.y - 12 * z, 4.5 * z, 0, Math.PI * 2);
        ctx.fill();

        // Tunic / Torso
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y - 5 * z, 5.5 * z, 0, Math.PI * 2);
        ctx.fill();

        // 3. RTS Troop Solvency / Health Bar (Clash of Clans health bar!)
        const barW = 20 * z;
        const barH = 3.5 * z;
        const barY = pt.y - 20 * z;

        // Background
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fillRect(pt.x - barW / 2, barY, barW, barH);

        // Solvency health fill
        const healthPct = Math.max(0.05, 1.0 - a.risk_score);
        let healthColor = "#10b981"; // Green (Healthy)
        if (a.is_distressed || a.risk_score >= 0.55) healthColor = "#ef4444"; // Red (Distressed)
        else if (a.risk_score >= 0.35) healthColor = "#f59e0b"; // Yellow (Strained)

        ctx.fillStyle = healthColor;
        ctx.fillRect(pt.x - barW / 2, barY, barW * healthPct, barH);

        // Thin border
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(pt.x - barW / 2, barY, barW, barH);

        // Distress blinking indicator
        if (a.is_distressed) {
            ctx.fillStyle = "#ef4444";
            ctx.font = `bold ${Math.round(9 * z)}px Outfit`;
            ctx.fillText("⚠️", pt.x + barW / 2 + 4 * z, barY + 3 * z);
        }

        // 4. Speech Bubble Popup
        if (a.speechBubble) {
            ctx.save();
            ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
            ctx.strokeStyle = healthColor;
            ctx.lineWidth = 1;
            ctx.font = `bold ${Math.round(9 * z)}px Outfit`;
            const textW = ctx.measureText(a.speechBubble).width + 8 * z;

            const bubbleY = barY - 14 * z;
            this.roundRect(ctx, pt.x - textW / 2, bubbleY, textW, 12 * z, 4);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.fillText(a.speechBubble, pt.x, bubbleY + 9 * z);
            ctx.restore();
        }

        // 5. Golden Selection Ring if this is the active agent (e.g. Rohan Rahman)
        if (a.id === this.selectedAgentId) {
            ctx.save();
            ctx.strokeStyle = "#fbbf24";
            ctx.lineWidth = 2;
            ctx.shadowColor = "#fbbf24";
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y + bob * z + 3 * z, 10 * z, 0, Math.PI * 2);
            ctx.stroke();

            // Name Tag
            ctx.fillStyle = "#fff";
            ctx.font = `bold ${Math.round(10 * z)}px Outfit`;
            ctx.textAlign = "center";
            ctx.fillText(a.name, pt.x, pt.y - 25 * z);
            ctx.restore();
        }
    }

    drawParticles(ctx) {
        const z = this.camera.zoom;

        // Smoke
        for (const p of this.smokeParticles) {
            const pt = this.isoToScreen(p.isoX, p.isoY, p.elevation);
            ctx.fillStyle = `rgba(203, 213, 225, ${p.alpha})`;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, p.size * z, 0, Math.PI * 2);
            ctx.fill();
        }

        // Floating Damage / Coin Numbers
        for (const t of this.floatingTexts) {
            const pt = this.isoToScreen(t.isoX, t.isoY, t.elevation);
            ctx.save();
            ctx.font = `bold ${Math.round(13 * z)}px Outfit, sans-serif`;
            ctx.fillStyle = t.color;
            ctx.shadowColor = t.color;
            ctx.shadowBlur = 8;
            ctx.textAlign = "center";
            ctx.globalAlpha = Math.max(0, t.alpha);
            ctx.fillText(t.text, pt.x, pt.y);
            ctx.restore();
        }
    }

    drawOverlayHUD(ctx) {
        // Controls guide on bottom-right of viewport
        ctx.save();
        ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
        this.roundRect(ctx, 12, this.displayHeight - 34, 260, 24, 6);
        ctx.fill();

        ctx.fillStyle = "#94a3b8";
        ctx.font = "11px Outfit, sans-serif";
        ctx.fillText("🖱️ Drag to Pan • Scroll to Zoom • Tap Hub to Inspect", 20, this.displayHeight - 18);
        ctx.restore();
    }

    openBuildingModal(building) {
        const modal = document.getElementById("buildingModal");
        const container = document.getElementById("buildingModalDetails");
        if (!modal || !container) return;

        // Count citizens currently near or assigned to this hub
        const workers = this.agents.filter(a => a.workplace_hub === building.id || a.current_hub === building.id);
        const totalIncome = workers.reduce((acc, a) => acc + (a.income || a.monthly_income || 0), 0);

        let html = `
            <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 16px;">
                <div style="width: 56px; height: 56px; border-radius: 12px; background: ${building.color}; display: flex; align-items: center; justify-content: center; font-size: 1.8rem;">
                    ${building.icon}
                </div>
                <div>
                    <h2 style="font-size: 1.25rem; font-weight: 700; color: #fff;">${building.name}</h2>
                    <span style="font-size: 0.75rem; color: var(--accent-cyan); font-weight: 600;">Sector: ${building.category} • Level ${building.level}</span>
                </div>
            </div>

            <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 16px;">
                ${building.description}
            </p>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px;">
                <div class="stat-box">
                    <div class="label">Affiliated Citizens</div>
                    <div class="value" style="font-size: 1.1rem; color: var(--accent-cyan);">${workers.length} Persons</div>
                </div>
                <div class="stat-box">
                    <div class="label">Monthly Payroll</div>
                    <div class="value" style="font-size: 1.1rem; color: var(--accent-emerald);">${totalIncome.toLocaleString()} BDT</div>
                </div>
                <div class="stat-box">
                    <div class="label">Operational Status</div>
                    <div class="value" style="font-size: 1.1rem; color: var(--accent-amber);">100% Active</div>
                </div>
            </div>

            <h4 style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">Associated Citizen Roster:</h4>
            <div style="max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; font-size: 0.76rem;">
                ${workers.slice(0, 12).map(w => `
                    <div style="display: flex; justify-content: space-between; padding: 6px 10px; background: rgba(255,255,255,0.03); border-radius: 6px;">
                        <span><strong>${w.name}</strong> (${w.occupation})</span>
                        <span style="font-family: var(--font-mono); color: var(--accent-emerald);">${(w.income || w.monthly_income || 0).toLocaleString()} BDT</span>
                    </div>
                `).join('')}
            </div>
        `;

        container.innerHTML = html;
        modal.classList.add("open");
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
