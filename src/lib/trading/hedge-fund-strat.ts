import { BettingLine } from "../modeling/types";

export interface TradeOpportunity {
    id: string;
    ticker: string;
    marketPrice: number;    // What Polymarket says (e.g. 60c)
    vegasPrice: number;     // What Vegas says (converted to prob e.g. 50%)
    discrepancy: number;    // The 'Gap'
    action: 'BUY_SIGNAL' | 'WAIT';
    targetEntry: number;    // Limit order price
    reason: string;
}

export class HedgeFundStrategy {

    // Strategy: "Value Arbitrage"
    // We look for when the Crowd (Polymarket/Kalshi) Undervalues a team compared to Vegas.
    private readonly THRESHOLDS = {
        MIN_DISCREPANCY: 0.05, // 5% difference required to enter
    };

    /**
     * Scans for arbitrage/value opportunities between Vegas and Polymarket
     */
    public evaluate(gameId: string, teamName: string, polyPrice: number, vegasOdds: number): TradeOpportunity {
        // 1. Convert Vegas American Odds to Implied Probability
        const vegasProb = this.oddsToProbability(vegasOdds);

        // 2. Calculate Discrepancy
        const discrepancy = vegasProb - polyPrice;
        // If Vegas says 60c (0.60) and Kalshi says 50c (0.50). Diff = +0.10.
        // This means the asset is UNDERVALUED. We buy.

        let action: 'BUY_SIGNAL' | 'WAIT' = 'WAIT';
        let reason = `Market efficient. Diff: ${(discrepancy * 100).toFixed(1)}%`;

        if (discrepancy > this.THRESHOLDS.MIN_DISCREPANCY) {
            action = 'BUY_SIGNAL';
            reason = `Undervalued by ${(discrepancy * 100).toFixed(1)}% vs Vegas`;
        } else if (discrepancy < -this.THRESHOLDS.MIN_DISCREPANCY) {
            reason = `Overvalued by ${Math.abs(discrepancy * 100).toFixed(1)}% vs Vegas`;
        }

        return {
            id: `opp_${gameId}`,
            ticker: teamName,
            marketPrice: polyPrice,
            vegasPrice: vegasProb,
            discrepancy,
            action,
            targetEntry: polyPrice,
            reason
        };
    }

    private oddsToProbability(americanOdds: number): number {
        if (americanOdds > 0) {
            return 100 / (americanOdds + 100);
        } else {
            return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
        }
    }
}
