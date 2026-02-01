
import { BacktestEngine } from '../lib/modeling/backtest-engine';
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
    console.log("Running Backtest...");
    const engine = new BacktestEngine();

    // Set Winning "Fundamentalist" Weights
    engine.calculator.setWeights({
        EFFICIENCY: 0.60,
        MARGIN: 0.30,
        RECENT_FORM: 0.05,
        REST: 1.0,
        INJURY_SCALAR: 0.5,
        HOME_COURT_ADVANTAGE: 2.5
    });

    // Run for 14 days to get a good history
    const results = await engine.runSimulation('2024-12-01', 14);

    console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
