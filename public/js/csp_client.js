/**
 * CSP Labor Market Allocator Client Visualizer
 */
class CSPClient {
    constructor() {
        this.lastResults = null;
    }

    async runSolver() {
        try {
            const res = await fetch("/api/csp-match", { method: "POST" });
            const data = await res.json();
            this.lastResults = data.result;
            this.renderModal(data.result);
            return data.result;
        } catch (e) {
            console.error("CSP match error:", e);
        }
    }

    renderModal(result) {
        let modal = document.getElementById("cspModal");
        if (!modal) return;

        const container = document.getElementById("cspResultsContainer");
        if (!container) return;

        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div>
                    <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--accent-cyan);">
                        <i class="fas fa-network-wired"></i> Constraint Satisfaction Problem (CSP) Solver
                    </h3>
                    <p style="font-size: 0.8rem; color: var(--text-muted);">
                        Algorithm: Backtracking Search with MRV (Minimum Remaining Values) & Forward Checking
                    </p>
                </div>
                <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); padding: 6px 14px; border-radius: 8px;">
                    <span style="font-size: 0.85rem; font-weight: 700; color: var(--accent-emerald);">
                        ${result.matched_count} Vacancies Successfully Allocated
                    </span>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px;">
                <!-- Allocations Table -->
                <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px;">
                    <h4 style="font-size: 0.85rem; margin-bottom: 10px; color: var(--text-secondary);">
                        <i class="fas fa-handshake"></i> Optimal Matched Allocations
                    </h4>
                    <div style="max-height: 320px; overflow-y: auto;">
                        <table style="font-size: 0.76rem;">
                            <thead>
                                <tr>
                                    <th>Role</th>
                                    <th>Citizen Candidate</th>
                                    <th>Salary</th>
                                </tr>
                            </thead>
                            <tbody>
        `;

        for (const alloc of result.allocations || []) {
            html += `
                <tr>
                    <td>
                        <strong style="color: var(--accent-cyan);">${alloc.job_title}</strong><br>
                        <span style="font-size: 0.68rem; color: var(--text-muted);">${alloc.sector}</span>
                    </td>
                    <td>
                        <strong>${alloc.agent_name}</strong><br>
                        <span style="font-size: 0.68rem; color: var(--text-muted);">${alloc.agent_id}</span>
                    </td>
                    <td style="font-family: var(--font-mono); color: var(--accent-emerald);">
                        ${alloc.salary_bdt.toLocaleString()} BDT
                    </td>
                </tr>
            `;
        }

        html += `
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Backtracking Trace Log -->
                <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px;">
                    <h4 style="font-size: 0.85rem; margin-bottom: 10px; color: var(--text-secondary);">
                        <i class="fas fa-terminal"></i> MRV Constraint Search Trace
                    </h4>
                    <div style="font-family: var(--font-mono); font-size: 0.72rem; color: #a5b4fc; max-height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px;">
        `;

        for (const item of result.trace || []) {
            const isBacktrack = item.status === "backtrack";
            const color = isBacktrack ? "#f87171" : "#34d399";
            html += `
                <div style="padding: 4px 8px; border-left: 2px solid ${color}; background: rgba(255,255,255,0.02);">
                    ${item.step}
                </div>
            `;
        }

        html += `
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
        modal.classList.add("open");
    }
}

const clientCSP = new CSPClient();
