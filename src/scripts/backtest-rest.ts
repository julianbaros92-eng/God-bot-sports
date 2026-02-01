
import 'dotenv/config';
import { db } from '../lib/db';
import { ApiSportsClient, ApiSportsGame } from '../lib/api-clients/providers/api-sports';
import { EdgeCalculator } from '../lib/modeling/edge-calculator';
import { StatsAggregator } from '../lib/modeling/stats-aggregator';
import { ZEUS_STRATEGY } from '../lib/modeling/strategies';
import fs from 'fs';
import path from 'path';

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

async function backtest() {
    console.log("🧪 Starting Rest-Advantage Backtest (RMSE Comparison)...");

    const apiSports = new ApiSportsClient();
    const calculator = new EdgeCalculator();
    calculator.setWeights(ZEUS_STRATEGY);

    // 1. Fetch History
    console.log("   Fetching 2024 season games...");
    const games = await apiSports.getGames('2024');

    // Filter finished (Check for valid scores)
    // Structure: scores.home.total
    const finished = games
        .filter(g => g && g.scores && g.scores.home && g.scores.home.total !== null && g.scores.away && g.scores.away.total !== null)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log(`   Found ${finished.length} finished games.`);

    // 2. Loop
    let baseSqErrSum = 0;
    let restSqErrSum = 0;
    let count = 0;

    // Start from game 100
    const startIdx = 100;

    for (let i = startIdx; i < finished.length; i++) {
        const game = finished[i];
        const prevGames = finished.slice(0, i);

        // Current Game Info
        const hName = game.teams.home.name;
        const aName = game.teams.away.name;
        // Use .total not .points
        const hScore = game.scores.home.total;
        const aScore = game.scores.away.total;
        const actualMargin = hScore - aScore; // + means Home Won by X
        const gDate = new Date(game.date);

        // Build Stats
        const statsMap = StatsAggregator.aggregate(prevGames);
        const hStats = statsMap.get(hName);
        const aStats = statsMap.get(aName);

        if (!hStats || !aStats) continue;

        // Base Prediction
        const basePred = calculator.predictSpread(hStats, aStats);

        // Rest Logic
        const findLastGameDate = (team: string) => {
            for (let j = prevGames.length - 1; j >= 0; j--) {
                const pg = prevGames[j];
                if (pg.teams.home.name === team || pg.teams.away.name === team) {
                    return new Date(pg.date);
                }
            }
            return null;
        };

        const hLast = findLastGameDate(hName);
        const aLast = findLastGameDate(aName);

        const getRestParam = (last: Date | null, current: Date) => {
            if (!last) return 3;
            const diff = Math.abs(current.getTime() - last.getTime());
            const days = diff / (1000 * 3600 * 24);
            // Check for Back-to-Back (< 1.4 days)
            if (days < 1.4) return 0;
            return Math.floor(days);
        };

        const hRestDays = getRestParam(hLast, gDate);
        const aRestDays = getRestParam(aLast, gDate);

        // Calculate Penalty (3.0 pts for 0 rest)
        let hPenalty = 0;
        let aPenalty = 0;

        if (hRestDays === 0) hPenalty = 3.0;
        if (aRestDays === 0) aPenalty = 3.0;

        // "Rest Aware" Prediction
        const restPred = basePred - hPenalty + aPenalty;

        // Errors
        const baseErr = Math.pow(actualMargin - basePred, 2);
        const restErr = Math.pow(actualMargin - restPred, 2);

        baseSqErrSum += baseErr;
        restSqErrSum += restErr;
        count++;

        if (i % 100 === 0) console.log(`   Processed ${i}/${finished.length} games...`);
    }

    const baseRMSE = Math.sqrt(baseSqErrSum / count);
    const restRMSE = Math.sqrt(restSqErrSum / count);

    console.log("------------------------------------------------");
    console.log(`📊 Backtest Results (N=${count} games)`);
    console.log(`   Base Model RMSE:        ${baseRMSE.toFixed(4)}`);
    console.log(`   Rest-Aware Model RMSE:  ${restRMSE.toFixed(4)}`);

    if (restRMSE < baseRMSE) {
        console.log("✅ CONCLUSION: Rest-Aware is MORE accurate.");
        const improvement = ((baseRMSE - restRMSE) / baseRMSE) * 100;
        console.log(`   Improvement: ${improvement.toFixed(2)}%`);
    } else {
        console.log("❌ CONCLUSION: Rest-Aware is LESS accurate (or noise).");
    }
    console.log("------------------------------------------------");
}

backtest().catch(console.error);
