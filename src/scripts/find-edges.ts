
// Usage: npx tsx src/scripts/find-edges.ts

import fs from 'fs';
import path from 'path';
import { ApiSportsClient } from '../lib/api-clients/providers/api-sports';
import { TheOddsApiClient } from '../lib/api-clients/providers/the-odds-api';
import { EdgeCalculator } from '../lib/modeling/edge-calculator';
import { StatsAggregator } from '../lib/modeling/stats-aggregator';
import { BettingLine } from '../lib/modeling/types';

// Load Env
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

async function main() {
    console.log("🏀 Starting Sports Betting Edge Finder...\n");

    const apiSports = new ApiSportsClient();
    const oddsApi = new TheOddsApiClient();
    const calculator = new EdgeCalculator();

    // 1. Fetch Season History to Build Stats
    console.log("1. Fetching 2024-2025 NBA Season Data for Stats Calculation...");
    const games = await apiSports.getGames('2024');
    if (!games || games.length === 0) {
        console.error("❌ Failed to fetch games from API Sports.");
        return;
    }
    console.log(`   ✅ Fetched ${games.length} games. Building Team Stats...`);

    const teamStats = StatsAggregator.aggregate(games);
    console.log(`   ✅ Computed stats for ${teamStats.size} teams.`);
    // Debug print one team
    // console.log("   Sample (Lakers):", teamStats.get("Los Angeles Lakers"));

    // 2. Fetch Tonight's Odds from The-Odds-API
    console.log("\n2. Fetching Tonight's Odds from The-Odds-API...");
    const oddsData = await oddsApi.getOdds('basketball_nba', 'us');

    if (!oddsData || oddsData.length === 0) {
        console.log("   ⚠️ No odds available right now (or API error).");
        return;
    }
    console.log(`   ✅ Received odds for ${oddsData.length} upcoming games.`);

    // 3. Analyze Each Matchup
    console.log("\n3. 🧠 Analyzing Matchups for Edges...\n");
    console.log("--------------------------------------------------------------------------------");
    console.log("----------------------------------------------------------------------------------------------------");
    console.log(pad("MATCHUP", 40) + pad("VEGAS", 15) + pad("MODEL", 15) + pad("EDGE", 10) + pad("COMMENCE TIME", 25));
    console.log("----------------------------------------------------------------------------------------------------");

    for (const game of oddsData) {
        const homeName = game.home_team;
        const awayName = game.away_team;
        const commenceTime = new Date(game.commence_time);
        const isLive = commenceTime < new Date();

        if (isLive) {
            // Our model is pre-game only. We cannot compare pre-game stats to a live line 
            // without knowing the current score/quarter.
            // console.log(`   [LIVE] ${awayName} @ ${homeName} - Skipping (Game in Progress)`);
            continue;
        }

        // Map Odds API names to API Sports names (Naive matching for now)
        // Odds API: 'Los Angeles Lakers'
        // API Sports: 'Los Angeles Lakers'
        // Usually they match well for NBA.
        const homeStats = teamStats.get(homeName);
        const awayStats = teamStats.get(awayName);

        if (!homeStats || !awayStats) {
            // console.log(`   ⚠️ Stats missing for ${homeName} or ${awayName}. Skipping.`);
            continue;
        }

        // Extract Spreads
        const lines: BettingLine[] = [];
        game.bookmakers.forEach((book: any) => {
            book.markets.forEach((market: any) => {
                if (market.key === 'spreads') {
                    market.outcomes.forEach((outcome: any) => {
                        if (outcome.name === homeName) {
                            lines.push({
                                source: book.title,
                                line: outcome.point, // e.g. -4.5
                                odds: outcome.price,
                                type: 'spread'
                            });
                        }
                    });
                }
            });
        });

        // Use the first spread found as "Market Consensus" for display (re-calculate on every run to be safe)
        if (lines.length === 0) continue;

        const analysis = calculator.analyzeMatchup(homeStats, awayStats, lines);

        // Relaxed criteria for display
        if (analysis.recommendation === 'BET' || analysis.edge > 0.5) {
            const vegasLine = lines[0].line; // Taking first book as reference
            const modelLine = analysis.calculatedSpread;

            let color = "\x1b[37m"; // White
            if (analysis.recommendation === 'BET') color = "\x1b[32m"; // Green

            console.log(
                color +
                pad(`${awayName} @ ${homeName}`, 40) +
                pad(`${vegasLine > 0 ? '+' : ''}${vegasLine}`, 15) +
                pad(`${modelLine > 0 ? '+' : ''}${modelLine}`, 15) +
                pad(`${analysis.edge}%`, 10) +
                pad(commenceTime.toLocaleString(), 25) +
                "\x1b[0m"
            );
        }
    }
    console.log("----------------------------------------------------------------------------------------------------");
}

function pad(str: string, len: number) {
    return str.padEnd(len);
}

main().catch(console.error);
