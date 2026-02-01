
// Usage: npx tsx src/scripts/run-bot.ts

import fs from 'fs';
import path from 'path';
import { ApiSportsClient } from '../lib/api-clients/providers/api-sports';
import { TheOddsApiClient } from '../lib/api-clients/providers/the-odds-api';
// import { PolymarketClient } from '../lib/api-clients/polymarket-client';
import { KalshiClient } from '../lib/api-clients/kalshi-client';
import { HedgeFundStrategy } from '../lib/trading/hedge-fund-strat';

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
    console.log("🤖 Starting Hedge Fund Bot (Kalshi vs Vegas)...");

    // Initialize Agents
    const oddsApi = new TheOddsApiClient();
    // const polyClient = new PolymarketClient();
    const kalshiClient = new KalshiClient();
    const strategy = new HedgeFundStrategy();

    // 1. Get Vegas Odds (The "Anchor")
    console.log("1. Fetching Vegas Odds...");
    const vegasGames = await oddsApi.getOdds('basketball_nba', 'us');

    if (!vegasGames || vegasGames.length === 0) {
        console.error("❌ No Vegas odds found. Exiting.");
        return;
    }

    console.log(`   ✅ Loaded ${vegasGames.length} Vegas markets.`);

    // 2. Load Kalshi Markets ONCE
    await kalshiClient.loadMarkets();

    try {
        const balance = await kalshiClient.getBalance();
        console.log(`[Auth Check] 🔐 Kalshi Balance: $${(balance / 100).toFixed(2)}`);
    } catch (e) {
        console.error("[Auth Check] ❌ Failed to get balance. Auth/Key issue?");
    }

    // 3. Scan each game against Kalshi
    console.log("\n3. Scanning for Arbitrage w/ Kalshi...");
    console.log("------------------------------------------------------------------------------------------------------------------------");
    console.log(pad("MATCHUP", 25) + pad("MARKET TITLE", 35) + pad("VEGAS(Implied)", 20) + pad("KALSHI", 10) + pad("EDGE", 10) + pad("ACTION", 10));
    console.log("------------------------------------------------------------------------------------------------------------------------");

    for (const game of vegasGames) {

        // Skip Live Games for now to simplify matching
        if (new Date(game.commence_time) < new Date()) continue;

        // Check Home Team
        const homeTeam = game.home_team;
        const awayTeam = game.away_team;

        let market = kalshiClient.findMarketLocal(homeTeam, awayTeam);

        // If not found, check Away Team
        let isHome = true;
        if (!market) {
            market = kalshiClient.findMarketLocal(awayTeam, homeTeam);
            isHome = false;
        }

        const teamName = isHome ? homeTeam : awayTeam;

        // Get Consensus Moneyline from Vegas
        // We need Moneyline (win probability), not Spread, for direct comparison
        let vegasHomePrice = 0;
        let vegasAwayPrice = 0;

        // Find best avaialble line or average
        game.bookmakers.forEach((book: any) => {
            book.markets.forEach((market: any) => {
                if (market.key === 'h2h') { // Moneyline
                    market.outcomes.forEach((outcome: any) => {
                        if (outcome.name === homeTeam) vegasHomePrice = outcome.price;
                        if (outcome.name === awayTeam) vegasAwayPrice = outcome.price;
                    });
                }
            });
        });

        if (!vegasHomePrice || !vegasAwayPrice) continue;

        // Check Each Side
        checkSide(homeTeam, vegasHomePrice, kalshiClient, strategy, game.id);
        checkSide(awayTeam, vegasAwayPrice, kalshiClient, strategy, game.id);
    }
}

function checkSide(teamName: string, vegasOdds: number, kalshiClient: KalshiClient, strategy: HedgeFundStrategy, gameId: string) {
    // 1. Get Real Kalshi Price (Local Lookup)
    const market = kalshiClient.findMarketLocal(teamName);

    if (!market || !market.implied_probability) {
        // console.log(`   ⚠️ No Kalshi market found for ${teamName}`);
        return;
    }

    const kalshiPrice = market.implied_probability; // 0.54

    // 2. Evaluate Strategy
    const opp = strategy.evaluate(gameId, teamName, kalshiPrice, vegasOdds);

    // 3. Print Result
    let color = "\x1b[37m"; // White
    if (opp.action === 'BUY_SIGNAL') color = "\x1b[32m"; // Green

    // Vegas Implied Probability
    const vegasProb = (opp.vegasPrice * 100).toFixed(1) + "%";
    const kalshiDisplay = (kalshiPrice * 100).toFixed(1) + "¢";

    const diff = (opp.discrepancy * 100).toFixed(1) + "%";

    // Only show if market is liquid enough (ask > 0)
    // Show all matches for debugging
    if (kalshiPrice > 0) {
        console.log(
            color +
            pad(teamName, 25) +
            pad(market.title.substring(0, 30) + (market.title.length > 30 ? '...' : ''), 35) +
            pad(`${vegasOdds} (${vegasProb})`, 20) +
            pad(kalshiDisplay, 10) +
            pad(diff, 10) +
            pad(opp.action, 10) +
            "\x1b[0m"
        );
    }
}

function pad(str: string, len: number) {
    return str.padEnd(len);
}

main().catch(console.error);
