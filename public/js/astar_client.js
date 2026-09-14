/**
 * Client-Side A* Search Algorithm for real-time 60 FPS agent movement
 */
class ClientAStar {
    constructor(width = 24, height = 16) {
        this.width = width;
        this.height = height;
        this.obstacles = new Set();
        this._initObstacles();
    }

    _initObstacles() {
        const hubs = EcoConfig.HUBS;
        for (const key in hubs) {
            const [bx, by, bw, bh] = hubs[key].box;
            const [dx, dy] = hubs[key].door;
            for (let x = bx; x < bx + bw; x++) {
                for (let y = by; y < by + bh; y++) {
                    if (x !== dx || y !== dy) {
                        this.obstacles.add(`${x},${y}`);
                    }
                }
            }
        }
    }

    heuristic(x1, y1, x2, y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2); // Manhattan
    }

    getNeighbors(x, y) {
        const deltas = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        const neighbors = [];
        for (const [dx, dy] of deltas) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                if (!this.obstacles.has(`${nx},${ny}`)) {
                    neighbors.push([nx, ny]);
                }
            }
        }
        return neighbors;
    }

    findPath(start, goal) {
        const [sx, sy] = start;
        const [gx, gy] = goal;
        if (sx === gx && sy === gy) return [start];

        const startKey = `${sx},${sy}`;
        const goalKey = `${gx},${gy}`;

        const frontier = [{ cost: 0, priority: 0, pt: [sx, sy] }];
        const cameFrom = new Map();
        const costSoFar = new Map();

        cameFrom.set(startKey, null);
        costSoFar.set(startKey, 0);

        while (frontier.length > 0) {
            // Sort by priority (Min Heap behavior)
            frontier.sort((a, b) => a.priority - b.priority);
            const current = frontier.shift().pt;
            const curKey = `${current[0]},${current[1]}`;

            if (current[0] === gx && current[1] === gy) {
                break;
            }

            for (const neighbor of this.getNeighbors(current[0], current[1])) {
                const nKey = `${neighbor[0]},${neighbor[1]}`;
                const newCost = costSoFar.get(curKey) + 1;

                if (!costSoFar.has(nKey) || newCost < costSoFar.get(nKey)) {
                    costSoFar.set(nKey, newCost);
                    const priority = newCost + this.heuristic(neighbor[0], neighbor[1], gx, gy);
                    frontier.push({ cost: newCost, priority, pt: neighbor });
                    cameFrom.set(nKey, current);
                }
            }
        }

        if (!cameFrom.has(goalKey)) {
            return [start, goal];
        }

        const path = [];
        let curr = [gx, gy];
        while (curr !== null) {
            path.push(curr);
            const parent = cameFrom.get(`${curr[0]},${curr[1]}`);
            curr = parent || null;
        }
        path.reverse();
        return path;
    }
}

const clientPathfinder = new ClientAStar();
