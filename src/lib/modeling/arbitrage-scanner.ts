
import { BettingLine } from "./types";

export interface ArbitrageOpportunity {
    id: string;
    matchup: string;
    marketProb: number; // Implied probability from Vegas (0-1)
    polyPrice: number;    // Polymarket price (0-1)
    edgeRaw: number;      // marketProb - polyPrice
    edgePercent: number;  // (edgeRaw / polyPrice) * 100 (ROI potential)
    recommendation: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;   // 0-100
    potentialProfit: number; // For a $100 bet
}

export class ArbitrageScanner {
    private readonly MIN_EDGE_THRESHOLD = 0.05; // 5% minimum edge to trigger signal

    /**
     * Converts American Odds (e.g. -110, +150) to Implied Probability (0-1)
     */
    public oddsToProbability(americanOdds: number): number {
        if (americanOdds > 0) {
            return 100 / (americanOdds + 100);
        } else {
            return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
        }
    }

    /**
     * Scans for arbitrage between a Vegas line (Anchor) and a Polymarket price.
     */
    public scan(
        matchupId: string,
        homeTeam: string,
        vegasLine: BettingLine,
        polyPrice: number // 0.00 to 1.00
    ): ArbitrageOpportunity {

        // 1. Calculate Vegas "True" Probability (removing vig would be better, but basic for now)
        const vegasProb = this.oddsToProbability(vegasLine.odds);

        // 2. Calculate Discrepancy
        // If Vegas says 60% chance (0.60) and Poly is selling at 40 cents (0.40):
        // We buy at 0.40. If it hits, we get $1.00. 
        // Valued at 0.60. Edge is 0.20.
        const edgeRaw = vegasProb - polyPrice;

        // 3. Determine Signal
        let recommendation: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';

        if (edgeRaw > this.MIN_EDGE_THRESHOLD) {
            recommendation = 'BUY'; // Market is undervaluing
        } else if (edgeRaw < -this.MIN_EDGE_THRESHOLD) {
            recommendation = 'SELL'; // Market is overvaluing (if we owned it)
        }

        // 4. Calculate ROI / Profit for a standard $100 unit
        // If we buy at 0.40, we get 2.5 shares for $1. 
        // Expected Value = (WinProb * Payoff) - Cost
        // EV = (0.60 * $1.00) - $0.40 = $0.20 per share.
        // ROI = 0.20 / 0.40 = 50%
        const roi = polyPrice > 0 ? (edgeRaw / polyPrice) : 0;

        return {
            id: `arb_${matchupId}`,
            matchup: homeTeam,
            marketProb: vegasProb,
            polyPrice: polyPrice,
            edgeRaw: edgeRaw,
            edgePercent: parseFloat((roi * 100).toFixed(2)),
            recommendation,
            confidence: Math.min(Math.abs(edgeRaw) * 200, 99), // Mock confidence scaling
            potentialProfit: parseFloat((roi * 100).toFixed(2)) // $ profit on $100
        };
    }
}
