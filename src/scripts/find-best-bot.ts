
import { ModelOptimizer } from '../lib/modeling/model-optimizer';
import path from 'path';
import fs from 'fs';

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
    console.log("🏆 Running Bot Tournament...");
    const optimizer = new ModelOptimizer();

    // We need to hack the runTournament method slightly or just copy its logic here 
    // because the original file uses `new Date()` (today) which won't work with our 2024 data.
    // So let's just re-implement the loop here to be safe and clean.

    const strategies = [
        {
            name: "1. The Balanced Sharp (Baseline)",
            config: { EFFICIENCY: 0.35, MARGIN: 0.20, RECENT_FORM: 0.25, REST: 2.5, INJURY_SCALAR: 1.0, HOME_COURT_ADVANTAGE: 3.2 }
        },
        {
            name: "2. The Momentum (Form Heavy)",
            config: { EFFICIENCY: 0.20, MARGIN: 0.10, RECENT_FORM: 0.60, REST: 1.5, INJURY_SCALAR: 0.8, HOME_COURT_ADVANTAGE: 3.0 }
        },
        {
            name: "3. The Situational (Rest/Injury Focus - Current Zeus)",
            config: { EFFICIENCY: 0.25, MARGIN: 0.15, RECENT_FORM: 0.15, REST: 4.5, INJURY_SCALAR: 2.0, HOME_COURT_ADVANTAGE: 3.5 }
        },
        {
            name: "4. The Fundamentalist (Raw Efficiency)",
            config: { EFFICIENCY: 0.60, MARGIN: 0.30, RECENT_FORM: 0.05, REST: 1.0, INJURY_SCALAR: 0.5, HOME_COURT_ADVANTAGE: 2.5 }
        },
        {
            name: "5. Home Court Hero (Venue Bias)",
            config: { EFFICIENCY: 0.30, MARGIN: 0.15, RECENT_FORM: 0.15, REST: 2.0, INJURY_SCALAR: 1.0, HOME_COURT_ADVANTAGE: 5.5 }
        },
        {
            name: "6. The Contrarian (Fade Public)",
            config: { EFFICIENCY: 0.10, MARGIN: 0.10, RECENT_FORM: -0.20, REST: 2.0, INJURY_SCALAR: 1.0, HOME_COURT_ADVANTAGE: 2.0 }
        }
    ];

    // Access the private engine via 'any' or just creating a new one if needed, 
    // but the class is exported so we can just use the public 'baseEngine' if we made it public?
    // Checking file... 'private baseEngine'. 
    // Let's just make a new engine here.
    const { BacktestEngine } = require('../lib/modeling/backtest-engine');
    const engine = new BacktestEngine();

    console.log("----------------------------------------------------------------");
    console.log("STRATEGY                       WIN RATE    ROI      BETS    W-L");
    console.log("----------------------------------------------------------------");

    for (const strat of strategies) {
        // Set Weights
        engine.calculator.setWeights(strat.config);

        // Run Simulation (2024 data)
        const simResult = await engine.runSimulation('2024-12-01', 14);

        if (simResult.betsPlaced > 5) {
            const winRate = simResult.winRate.toFixed(1) + '%';
            const roi = simResult.roi.toFixed(1) + '%';
            const record = `${simResult.wins}-${simResult.losses}`;

            console.log(
                strat.name.substring(0, 30).padEnd(30) +
                winRate.padEnd(12) +
                roi.padEnd(9) +
                simResult.betsPlaced.toString().padEnd(8) +
                record
            );
        }
    }
    console.log("----------------------------------------------------------------");
}

main().catch(console.error);
