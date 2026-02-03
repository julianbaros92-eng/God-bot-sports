
import { ApiSportsClient } from '../lib/api-clients/providers/api-sports';
import { EdgeCalculator, ModelWeights } from '../lib/modeling/edge-calculator';
import { ZEUS_STRATEGY, LOKI_STRATEGY, SHIVA_STRATEGY } from '../lib/modeling/strategies';
import { StatsAggregator } from '../lib/modeling/stats-aggregator';
import fs from 'fs';
import path from 'path';

// Fix Env
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) process.env[key.trim()] = value.trim();
    });
}

function generateRandomWeights(base: ModelWeights, variability: number = 0.5): ModelWeights {
    const w = { ...base };
    for (const key of Object.keys(w) as Array<keyof ModelWeights>) {
        const val = w[key];
        // Mutate by +/- variability * val (or fixed amount?)
        // Let's do a uniform mutation around the base value
        // Special handling for some keys?
        if (key === 'FATIGUE_IMPACT' || key === 'INJURY_SCALAR' || key === 'HOME_COURT_ADVANTAGE' || key === 'REST') {
            // Larger steps for these scalars
            const mutation = (Math.random() * 2 - 1) * variability * 2;
            w[key] += mutation;
        } else {
            // Smaller steps for weights (0-1 range)
            const mutation = (Math.random() * 2 - 1) * (variability * 0.2);
            w[key] += mutation;
            if (w[key] < 0) w[key] = 0; // Weights shouldn't be negative usually
        }
    }
    return w;
}

// Custom Aggregator that handles "Simulation Date" for Rest Calculation
function aggregateStats(games: any[], simulationDate: Date) {
    const stats = StatsAggregator.aggregate(games);
    // Fix Rest Days based on simulationDate instead of "now"
    // StatsAggregator uses "new Date()" internally for daysRest. 
    // We can't easily patch it without changing the file. 
    // For now, let's just accept the small inaccuracy or try to monkey-patch? 
    // Actually, we can recalculate rest manually here.

    // Manual Rest Recalc
    stats.forEach((teamStat, teamName) => {
        // Find last game for this team in 'games'
        // games are already sorted in aggregator but not exposed
        const teamGames = games.filter(g => g.teams.home.name === teamName || g.teams.away.name === teamName);
        if (teamGames.length > 0) {
            const lastGame = teamGames[teamGames.length - 1]; // Assuming sorted input to aggregate
            const lastDate = new Date(lastGame.date);
            const diffTime = Math.abs(simulationDate.getTime() - lastDate.getTime());
            const daysRest = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            teamStat.daysRest = daysRest;
        }
    });

    return stats;
}

async function optimize() {
    console.log("🚀 Starting Optimization...");
    const api = new ApiSportsClient();
    const calculator = new EdgeCalculator();

    // 1. Fetch History
    console.log("   Fetching 2024 Season Games...");
    const allGames = await api.getGames('2024');
    if (!allGames || allGames.length === 0) {
        console.error("No games found.");
        return;
    }

    // Filter finished
    const finishedGames = allGames.filter((g: any) => g.scores.home && g.scores.away && g.scores.home.total !== null && g.scores.away.total !== null)
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log(`   Detailed Analysis on ${finishedGames.length} finished games.`);

    // Split into training dates
    // Get unique dates
    const uniqueDates = Array.from(new Set(finishedGames.map((g: any) => new Date(g.date).toISOString().split('T')[0]))).sort();

    // Skip first 10 dates to build history
    const evalDates = uniqueDates.slice(10);

    // Define Bots to Optimize
    const bots = [
        { name: 'ZEUS', base: ZEUS_STRATEGY, mode: 'SPREAD' },
        { name: 'SHIVA', base: SHIVA_STRATEGY, mode: 'TOTAL' },
        { name: 'LOKI', base: LOKI_STRATEGY, mode: 'MONEYLINE' }
    ];

    for (const bot of bots) {
        console.log(`\n🤖 Optimizing ${bot.name} (${bot.mode})...`);

        let bestScore = -Infinity;
        let bestWeights = bot.base;
        let bestStats = { wins: 0, losses: 0, winRate: 0, profit: 0 };

        // 50 Iterations
        for (let i = 0; i < 50; i++) {
            const weights = (i === 0) ? bot.base : generateRandomWeights(bot.base, 0.5);
            calculator.setWeights(weights);

            let wins = 0;
            let losses = 0;
            let profit = 0;

            // Run Simulation
            for (const dateStr of evalDates) {
                const simDate = new Date(dateStr);
                // Games BEFORE this date
                const pastGames = finishedGames.filter((g: any) => new Date(g.date) < simDate);
                // Games ON this date
                const todaysGames = finishedGames.filter((g: any) => new Date(g.date).toISOString().split('T')[0] === dateStr);

                if (pastGames.length < 20) continue; // Need min sample

                const stats = aggregateStats(pastGames, simDate);

                for (const game of todaysGames) {
                    const homeName = game.teams.home.name;
                    const awayName = game.teams.away.name;
                    const homeStats = stats.get(homeName);
                    const awayStats = stats.get(awayName);

                    if (!homeStats || !awayStats) continue;

                    const actualHomeScore = game.scores.home.total;
                    const actualAwayScore = game.scores.away.total;
                    const resultDiff = actualHomeScore - actualAwayScore;
                    const totalScore = actualHomeScore + actualAwayScore;

                    // SIMULATE MARKET LINE
                    // Assume Market is "Pretty Good" = Actual Result + Noise
                    // This is the tricky part. Optimizing against "Actual Result" directly is technically "Fundamental Prediction".
                    // Optimizing "Beating the Market" logic requires a Market Line.
                    // For this specialized optimization, we will check:
                    // Does our model predict the outcome ACCURATELY? (Square Error minimization?)
                    // OR
                    // If we assume Market is [Actual - 2, Actual + 2], can we find the edge?
                    // Let's optimize for PREDICTION ACCURACY (MAE - Mean Absolute Error). 
                    // If we predict the score well, we beat the market.

                    if (bot.mode === 'SPREAD') {
                        // Zeus: Predict Spread
                        const predSpread = calculator.predictSpread(homeStats, awayStats); // Result is Home - Away (Margin) -> No, predictSpread returns "Spread" e.g. -5 (Home wins by 5)
                        // Wait, edge-calculator predictSpread:
                        // "return Math.round(predictedDiff * 2) / 2;" -> This is Margin (positive = Home Win).
                        // Wait, Standard Spread is NEGATIVE for favorites.
                        // Let's check predictSpread implementation in edge-calculator.ts
                        // Line 79: predictedDiff = combined factors. 
                        // If Home is better, diff is positive.
                        // Line 88: return predictedDiff.

                        // So getting "5" means Home Wins by 5. 
                        // Spread would be Home -5.

                        // MAE Metric
                        const error = Math.abs(predSpread - resultDiff);
                        // Convert error to "Win/Loss" score?
                        // Let's just try to be within 5 points.
                        if (error < 5) wins++; else losses++; // highly simplified metric
                        profit -= error; // Lower error is better (so profit is negative error)

                    } else if (bot.mode === 'TOTAL') {
                        const predTotal = calculator.predictTotal(homeStats, awayStats);
                        const error = Math.abs(predTotal - totalScore);
                        if (error < 8) wins++; else losses++;
                        profit -= error; // Minimize MAE
                    } else if (bot.mode === 'MONEYLINE') {
                        // Loki: Upside.
                        // Check if we correctly predicted the winner when confident
                        const predMargin = calculator.predictSpread(homeStats, awayStats);
                        const predictedWinner = predMargin > 0 ? 'HOME' : 'AWAY';
                        const actualWinner = resultDiff > 0 ? 'HOME' : 'AWAY';

                        if (Math.abs(predMargin) > 3) { // Only count "Confident" picks
                            if (predictedWinner === actualWinner) {
                                wins++;
                                profit += 1;
                            } else {
                                losses++;
                                profit -= 1;
                            }
                        }
                    }
                }
            }

            // Evaluation
            // We want to MAXIMIZE "profit" (which is negative MAE for spread/total, or units for ML)
            if (profit > bestScore) {
                bestScore = profit;
                bestWeights = weights;
                bestStats = { wins, losses, winRate: (wins / (wins + losses)) * 100, profit };
                if (i > 0) process.stdout.write(`+`); // Improved
            } else {
                process.stdout.write(`.`);
            }
        }

        console.log(`\n   🏆 Best Score: ${bestScore.toFixed(2)}`);
        console.log(`   📊 Stats: ${bestStats.wins}W - ${bestStats.losses}L (${bestStats.winRate.toFixed(1)}%)`);
        console.log(`   ⚖️  Best Weights:`, JSON.stringify(bestWeights, null, 2));
    }
}

optimize().catch(console.error);
