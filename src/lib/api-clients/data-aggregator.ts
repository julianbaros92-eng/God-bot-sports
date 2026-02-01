import { BettingLine, TeamStats } from "../modeling/types";
import { TheOddsApiClient } from "./providers/the-odds-api";
import { ApiSportsClient } from "./providers/api-sports";

// Cache instances
const oddsClient = new TheOddsApiClient();
const statsClient = new ApiSportsClient();

/**
 * Service to fetch Real Live Odds from The-Odds-API
 */
export async function fetchLiveOdds(gameId: string): Promise<BettingLine[]> {
    // 1. Try Real API
    const realData = await oddsClient.getOdds('basketball_nba', 'us');

    if (realData && Array.isArray(realData) && realData.length > 0) {
        // Find the specific game if needed, or return all relevant lines
        // For this simple demo, we'll map the first game that matches our ID or just returning the first valid game's odds if ID is 'any'

        // In a real app we'd filter: realData.find(g => g.id === gameId);
        const game = realData[0]; // Just taking the first game for the Live Demo feed

        if (game && game.bookmakers) {
            const lines: BettingLine[] = [];

            game.bookmakers.forEach((book: any) => {
                book.markets.forEach((market: any) => {
                    if (market.key === 'spreads') {
                        market.outcomes.forEach((outcome: any) => {
                            lines.push({
                                source: book.title,
                                line: outcome.point,
                                odds: outcome.price,
                                type: 'spread'
                            });
                        });
                    }
                });
            });

            return lines.slice(0, 5); // Return top 5 lines
        }
    }

    // Fallback to Mock Data if API fails or quota exceeded
    console.log("Using Fallback Mock Odds");
    await new Promise(resolve => setTimeout(resolve, 300));
    return [
        { source: 'DraftKings', line: 4.5, odds: -110, type: 'spread' },
        { source: 'FanDuel', line: 4.0, odds: -115, type: 'spread' },
        { source: 'MGM', line: 4.5, odds: -105, type: 'spread' }
    ];
}

/**
 * Service to Fetch Real Stats from API-Sports (RapidAPI)
 */
export async function fetchTeamStats(teamCode: string): Promise<TeamStats> {
    // Map our internal codes to API-Sports Team IDs (Simplified map for demo)
    // Real app would have a full database table for this.
    const TEAM_IDS: Record<string, number> = {
        'BOS': 1, 'MIA': 20, 'LAL': 17, 'GSW': 11, 'DEN': 9, 'PHI': 23
    };

    const teamId = TEAM_IDS[teamCode];

    if (teamId) {
        try {
            // Fetch real data
            const response = await statsClient.getTeamStats('2024'); // Using 2024-2025 season

            if (response && response.response && Array.isArray(response.response)) {
                const teamData = response.response.find((t: any) => t.team.id === teamId);

                if (teamData) {
                    console.log(`[Data] Found Real Stats for ${teamCode}`);
                    // Map API structure to our Schema
                    return {
                        teamName: teamData.team.name,
                        pointsPerGame: parseFloat(teamData.avg.points) || 110,
                        pointsAllowed: 112.5, // API doesn't always give this directly in summary, calculating via diff or defaulting
                        pace: parseFloat(teamData.game.pace) || 98.0,
                        efficiency: parseFloat(teamData.avg.plus_minus) || 0,
                        recentTrend: parseFloat(teamData.form) || 0, // 'form' might need parsing "WLWWL"
                        injuryImpact: 1.0, // This requires a separate Injury API, defaulting to Healthy
                        daysRest: 1, // Defaulting to standard rest until we add Schedule API
                        avgMargin: (parseFloat(teamData.avg.points) || 110) - 112.5 // Rough calc
                    };
                }
            }
        } catch (e) {
            console.error("Failed to map real stats", e);
        }
    }

    // Fallback Mock Database (tuned with more realistic 2025 stats)
    // We now include 'daysRest' (0 = B2B) and 'avgMargin' (+/- diff)
    const mockDatabase: Record<string, TeamStats> = {
        'BOS': { teamName: 'Celtics', pointsPerGame: 121.2, pointsAllowed: 109.8, pace: 99.5, efficiency: 11.4, recentTrend: 15.2, injuryImpact: 0.95, daysRest: 2, avgMargin: 11.4 },
        'MIA': { teamName: 'Heat', pointsPerGame: 110.5, pointsAllowed: 108.9, pace: 96.2, efficiency: 1.6, recentTrend: -4.1, injuryImpact: 0.6, daysRest: 0, avgMargin: 1.6 }, // 0 Days Rest (B2B Disadvantage!)
        'LAL': { teamName: 'Lakers', pointsPerGame: 117.1, pointsAllowed: 116.5, pace: 102.1, efficiency: 0.6, recentTrend: 6.5, injuryImpact: 1.0, daysRest: 1, avgMargin: 0.6 },
        'GSW': { teamName: 'Warriors', pointsPerGame: 119.5, pointsAllowed: 115.2, pace: 100.8, efficiency: 4.3, recentTrend: 2.1, injuryImpact: 0.9, daysRest: 1, avgMargin: 4.3 },
        'DEN': { teamName: 'Nuggets', pointsPerGame: 114.8, pointsAllowed: 110.2, pace: 97.4, efficiency: 4.6, recentTrend: 3.5, injuryImpact: 0.8, daysRest: 3, avgMargin: 4.6 },
        'PHI': { teamName: '76ers', pointsPerGame: 113.1, pointsAllowed: 112.9, pace: 98.2, efficiency: 0.2, recentTrend: -1.5, injuryImpact: 4.5, daysRest: 1, avgMargin: 0.2 }, // Embiid Out (High injury impact)
    };

    return mockDatabase[teamCode] || {
        teamName: 'Unknown', pointsPerGame: 100, pointsAllowed: 100, pace: 100, efficiency: 0, recentTrend: 0, injuryImpact: 0, daysRest: 1, avgMargin: 0
    };
}
