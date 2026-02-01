
// Mock data for API Sports
export const MOCK_GAMES = [
    // Celtics dominating
    {
        id: 1, date: "2025-10-25T00:00:00.000Z", league: { season: 2025 },
        teams: { home: { id: 1, name: "Boston Celtics", logo: "" }, away: { id: 2, name: "New York Knicks", logo: "" } },
        scores: { home: { total: 120 }, away: { total: 100 } }
    },
    {
        id: 2, date: "2025-10-27T00:00:00.000Z", league: { season: 2025 },
        teams: { home: { id: 3, name: "Washington Wizards", logo: "" }, away: { id: 1, name: "Boston Celtics", logo: "" } },
        scores: { home: { total: 95 }, away: { total: 125 } }
    },
    {
        id: 3, date: "2025-10-30T00:00:00.000Z", league: { season: 2025 },
        teams: { home: { id: 1, name: "Boston Celtics", logo: "" }, away: { id: 4, name: "Miami Heat", logo: "" } },
        scores: { home: { total: 115 }, away: { total: 105 } }
    },
    // Hornets struggling
    {
        id: 4, date: "2025-10-25T00:00:00.000Z", league: { season: 2025 },
        teams: { home: { id: 5, name: "Charlotte Hornets", logo: "" }, away: { id: 6, name: "Atlanta Hawks", logo: "" } },
        scores: { home: { total: 90 }, away: { total: 120 } }
    },
    {
        id: 5, date: "2025-10-28T00:00:00.000Z", league: { season: 2025 },
        teams: { home: { id: 7, name: "Detroit Pistons", logo: "" }, away: { id: 5, name: "Charlotte Hornets", logo: "" } },
        scores: { home: { total: 110 }, away: { total: 100 } }
    },
    // Spurs mixed
    {
        id: 6, date: "2025-10-26T00:00:00.000Z", league: { season: 2025 },
        teams: { home: { id: 8, name: "San Antonio Spurs", logo: "" }, away: { id: 9, name: "Dallas Mavericks", logo: "" } },
        scores: { home: { total: 119 }, away: { total: 126 } }
    },
    // Lakers Check (for Pro Insights)
    {
        id: 7, date: "2025-10-29T00:00:00.000Z", league: { season: 2025 },
        teams: { home: { id: 10, name: "Los Angeles Lakers", logo: "" }, away: { id: 11, name: "Phoenix Suns", logo: "" } },
        scores: { home: { total: 110 }, away: { total: 100 } }
    }
];
