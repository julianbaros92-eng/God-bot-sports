import { PortfolioManager } from '../portfolio/manager';
import { MatchupAnalysis } from '../modeling/types';
import { PolymarketClient } from '../api-clients/polymarket-client';

export class ExecutionEngine {
    private portfolioManager: PortfolioManager;
    private polymarketClient: PolymarketClient;

    // Polymarket-Specific Config
    private readonly CONFIG = {
        AUTO_BET_EDGE_THRESHOLD: 12.0, // Increased: Only bet on major mispricings
        MIN_CONFIDENCE_SCORE: 75,      // Smart check: Only bet if model is confident
        MAX_SHARE_PRICE: 0.75,         // Lower cap: Don't chase expensive favs
        BASE_UNIT_SIZE: 100            // $100 base Unit
    };

    constructor() {
        this.portfolioManager = new PortfolioManager();
        this.polymarketClient = new PolymarketClient();
    }

    /**
     * The Brain: Evaluates specific Polymarket opportunities
     */
    public async processOpportunity(analysis: MatchupAnalysis) {
        // 1. Initial Filtering
        if (analysis.edge < this.CONFIG.AUTO_BET_EDGE_THRESHOLD) {
            console.log(`[Bot] ${analysis.id}: Edge ${analysis.edge}% too low. Looking for >${this.CONFIG.AUTO_BET_EDGE_THRESHOLD}%`);
            return;
        }

        if (analysis.confidenceScore < this.CONFIG.MIN_CONFIDENCE_SCORE) {
            console.log(`[Bot] ${analysis.id}: Edge exists but confidence low (${analysis.confidenceScore}). Pass.`);
            return;
        }

        // 2. Interact with Polymarket
        const market = await this.polymarketClient.findMarket(analysis.homeTeam.teamName);
        if (!market) {
            console.log(`[Bot] No Polymarket found for ${analysis.homeTeam.teamName}`);
            return;
        }

        // 3. Price Validation
        const currentMarketPrice = parseFloat(market.outcomePrices[0]); // 'Yes' price

        if (currentMarketPrice > this.CONFIG.MAX_SHARE_PRICE) {
            console.log(`[Bot] ${analysis.id}: Price ${currentMarketPrice} too expensive. Value trap.`);
            return;
        }

        // 4. Dynamic Staking (Fractional Kelly)
        // If Edge is 15%, we bet 1.5 Units. If Edge is 20%, we bet 2.0 Units.
        // Cap at 3 Units.
        const stakeMultiplier = Math.min(Math.max(analysis.edge / 10, 0.5), 3.0);
        const stakeAmount = Math.round(this.CONFIG.BASE_UNIT_SIZE * stakeMultiplier);

        console.log(`[Bot] 🎯 SNIPER MODE: ${analysis.homeTeam.teamName}`);
        console.log(`       Edge: ${analysis.edge}% | Confidence: ${analysis.confidenceScore}`);
        console.log(`       Sizing: ${stakeMultiplier}x Unit ($${stakeAmount})`);

        // 5. EXECUTE
        await this.executeTrade(analysis, market.conditionId, currentMarketPrice, stakeAmount);
    }

    private async executeTrade(analysis: MatchupAnalysis, conditionId: string, price: number, stake: number) {
        try {
            console.log(`[Bot] 🤖 SENDING ORDER TO CLOB...`);

            // A. Place Real Order
            const result = await this.polymarketClient.placeOrder(
                conditionId,
                'BUY',
                price,
                stake
            );

            if (result.status === 'filled') {
                // B. Track in Portfolio
                await this.portfolioManager.executeTrade(
                    analysis.id,
                    `${analysis.homeTeam.teamName} (Yes)`,
                    price,
                    stake,
                    'POLYMARKET'
                );
                console.log(`[Bot] ✅ FILLED: $${stake} @ ${price}`);
            }

        } catch (e) {
            console.error(`[Bot] ❌ Execution Error:`, e);
        }
    }
}
