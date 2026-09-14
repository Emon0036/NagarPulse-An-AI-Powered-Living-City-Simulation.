/**
 * Real-time Macroeconomic Visualizer Charts
 */
class EcoCharts {
    constructor() {
        this.giniCanvas = document.getElementById("giniChart");
        this.quintileCanvas = document.getElementById("quintileChart");
        this.giniCtx = this.giniCanvas ? this.giniCanvas.getContext("2d") : null;
        this.quintileCtx = this.quintileCanvas ? this.quintileCanvas.getContext("2d") : null;
        this.historyData = [];
    }

    update(metrics, history = []) {
        this.historyData = history;
        if (this.giniCtx) this.drawGiniTrend(history);
        if (this.quintileCtx && metrics.quintiles) this.drawQuintiles(metrics.quintiles);
    }

    drawGiniTrend(history) {
        const ctx = this.giniCtx;
        const w = this.giniCanvas.width = this.giniCanvas.parentElement.clientWidth * window.devicePixelRatio;
        const h = this.giniCanvas.height = this.giniCanvas.parentElement.clientHeight * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        const dw = w / window.devicePixelRatio;
        const dh = h / window.devicePixelRatio;

        ctx.clearRect(0, 0, dw, dh);

        if (!history || history.length < 2) {
            ctx.fillStyle = "#64748b";
            ctx.font = "11px Outfit";
            ctx.textAlign = "center";
            ctx.fillText("Gathering economic simulation ticks...", dw / 2, dh / 2);
            return;
        }

        const padding = { top: 20, bottom: 25, left: 35, right: 15 };
        const chartW = dw - padding.left - padding.right;
        const chartH = dh - padding.top - padding.bottom;

        // Grid lines
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (chartH / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(dw - padding.right, y);
            ctx.stroke();
        }

        // Min and Max Gini
        const values = history.map(d => d.gini_coefficient || 0.35);
        const minVal = Math.max(0.2, Math.min(...values) - 0.05);
        const maxVal = Math.min(0.7, Math.max(...values) + 0.05);

        // Path
        ctx.beginPath();
        const stepX = chartW / (history.length - 1);
        for (let i = 0; i < history.length; i++) {
            const val = values[i];
            const x = padding.left + i * stepX;
            const y = padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }

        // Gradient Stroke
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "rgba(245, 158, 11, 0.4)";
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Current Value label
        const lastVal = values[values.length - 1];
        ctx.fillStyle = "#f59e0b";
        ctx.font = "bold 11px JetBrains Mono";
        ctx.textAlign = "right";
        ctx.fillText(`Gini: ${lastVal.toFixed(4)}`, dw - padding.right, padding.top - 6);
    }

    drawQuintiles(quintiles) {
        const ctx = this.quintileCtx;
        const w = this.quintileCanvas.width = this.quintileCanvas.parentElement.clientWidth * window.devicePixelRatio;
        const h = this.quintileCanvas.height = this.quintileCanvas.parentElement.clientHeight * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        const dw = w / window.devicePixelRatio;
        const dh = h / window.devicePixelRatio;

        ctx.clearRect(0, 0, dw, dh);

        const padding = { top: 15, bottom: 20, left: 65, right: 15 };
        const chartW = dw - padding.left - padding.right;
        const rowH = (dh - padding.top - padding.bottom) / quintiles.length;

        const maxIncome = Math.max(...quintiles.map(q => q.avg_income || 10000));

        for (let i = 0; i < quintiles.length; i++) {
            const q = quintiles[i];
            const y = padding.top + i * rowH;
            const barW = (q.avg_income / maxIncome) * chartW;

            // Label
            ctx.fillStyle = "#94a3b8";
            ctx.font = "10px Outfit";
            ctx.textAlign = "right";
            ctx.fillText(q.label, padding.left - 8, y + rowH / 2 + 3);

            // Bar background
            ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
            ctx.fillRect(padding.left, y + 4, chartW, rowH - 8);

            // Gradient Income Bar
            const grad = ctx.createLinearGradient(padding.left, 0, padding.left + barW, 0);
            grad.addColorStop(0, "#06b6d4");
            grad.addColorStop(1, "#10b981");

            ctx.fillStyle = grad;
            ctx.fillRect(padding.left, y + 4, barW, rowH - 8);

            // Value text
            ctx.fillStyle = "#fff";
            ctx.font = "bold 9px JetBrains Mono";
            ctx.textAlign = "left";
            ctx.fillText(`${q.avg_income.toLocaleString()} BDT`, padding.left + barW + 6, y + rowH / 2 + 3);
        }
    }
}
