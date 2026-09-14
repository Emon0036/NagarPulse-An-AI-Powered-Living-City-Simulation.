// EcoSim AI Global Client Configuration
const EcoConfig = {
    API_BASE: window.location.origin.includes("localhost") || window.location.origin.includes("127.0.0.1") 
        ? "" 
        : "",
    CURRENCY: "BDT",
    TICK_INTERVAL_MS: 800, // Speed of autonomous simulation tick
    GRID_WIDTH: 24,
    GRID_HEIGHT: 16,
    HUBS: {
        housing: { name: "Residential Quarter", color: "#3B82F6", icon: "🏠", box: [2, 2, 5, 4], door: [4, 6] },
        workplace: { name: "Industrial & Tech Park", color: "#10B981", icon: "🏢", box: [10, 2, 5, 4], door: [12, 6] },
        market: { name: "Central Bazaar", color: "#F59E0B", icon: "🏪", box: [18, 2, 4, 4], door: [18, 6] },
        bank: { name: "City Commercial Bank", color: "#8B5CF6", icon: "🏛️", box: [2, 10, 5, 4], door: [4, 10] },
        education: { name: "University & Academy", color: "#06B6D4", icon: "🎓", box: [10, 10, 5, 4], door: [12, 10] },
        city_center: { name: "City Hall & Center", color: "#EC4899", icon: "🏛️", box: [18, 10, 4, 4], door: [18, 10] }
    }
};
