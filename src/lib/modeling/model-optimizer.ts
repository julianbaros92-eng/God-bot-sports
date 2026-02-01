import { BacktestEngine } from './backtest-engine';
import { ModelWeights } from './edge-calculator';

export interface OptimizationResult {
    modelName: string;
    config: Partial<ModelWeights>;
    winRate: number;
    roi: number;
    betsPlaced: number;
}

export class ModelOptimizer {
    private baseEngine: BacktestEngine;

    constructor() {
        this.baseEngine = new BacktestEngine();
    }

    /**
     * We will run a "Tournament" of 5 strategies to see which one performs best.
     */
    public async runTournament(): Promise<OptimizationResult[]> {
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
                name: "3. The Situational (Rest/Injury Focus)",
                config: { EFFICIENCY: 0.25, MARGIN: 0.15, RECENT_FORM: 0.15, REST: 4.5, INJURY_SCALAR: 2.0, HOME_COURT_ADVANTAGE: 3.5 }
            },
            {
                name: "4. The Fundamentalist (Raw Efficiency)",
                config: { EFFICIENCY: 0.60, MARGIN: 0.30, RECENT_FORM: 0.05, REST: 1.0, INJURY_SCALAR: 0.5, HOME_COURT_ADVANTAGE: 2.5 }
            },
            {
                name: "5. Home Court Hero (Venue Bias)",
                config: { EFFICIENCY: 0.30, MARGIN: 0.15, RECENT_FORM: 0.15, REST: 2.0, INJURY_SCALAR: 1.0, HOME_COURT_ADVANTAGE: 5.5 }
            }
        ];

        const results: OptimizationResult[] = [];

        for (const strat of strategies) {
            console.log(`Running Simulation for: ${strat.name}`);

            // Inject Weights into the Engine's Calculator
            this.baseEngine.calculator.setWeights(strat.config);

            // Run Simulation (Last 7 Days)
            // Note: In a real app we'd parallelize this
            const simResult = await this.baseEngine.runSimulation(new Date().toISOString().split('T')[0], 7);

            results.push({
                modelName: strat.name,
                config: strat.config,
                winRate: simResult.winRate,
                roi: simResult.roi,
                betsPlaced: simResult.betsPlaced
            });
        }

        // Sort by ROI descending
        return results.sort((a, b) => b.roi - a.roi);
    }
}
