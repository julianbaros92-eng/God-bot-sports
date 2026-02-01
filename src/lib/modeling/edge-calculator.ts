import { BettingLine, MatchupAnalysis, TeamStats } from './types';

/**
 * Converts American Odds (e.g. -110, +150) to Implied Probability (0-1)
 */
export function oddsToProbability(odds: number): number {
    if (odds > 0) {
        return 100 / (odds + 100);
    } else {
        return Math.abs(odds) / (Math.abs(odds) + 100);
    }
}

/**
 * The Core Algorithm: Calculates the "Fair Value" of a matchup based on raw stats.
 * This is where we combine multiple data points to create our own line.
 */
export interface ModelWeights {
    // Spread Weights
    EFFICIENCY: number;
    RECENT_FORM: number;
    MARGIN: number;
    REST: number;
    INJURY_SCALAR: number; // Impact on Spread
    HOME_COURT_ADVANTAGE: number;

    // Totals Weights (Shiva)
    PACE_WEIGHT: number;        // Importance of Pace stats
    PPG_WEIGHT: number;         // Points Per Game importance
    DEF_WEIGHT: number;         // Points Allowed importance
    FATIGUE_IMPACT: number;     // Impact of rest on scoring (Usually negative)
}

export class EdgeCalculator {

    // Default Weights (The "Champion" Profile - Situational)
    private weights: ModelWeights = {
        // Spread Defaults
        EFFICIENCY: 0.25,
        MARGIN: 0.15,
        RECENT_FORM: 0.15,
        REST: 4.5,
        INJURY_SCALAR: 2.0,
        HOME_COURT_ADVANTAGE: 3.5,

        // Totals Defaults (Shiva Baseline)
        PACE_WEIGHT: 0.40,
        PPG_WEIGHT: 0.35,
        DEF_WEIGHT: 0.35,
        FATIGUE_IMPACT: -2.5 // Fatigue reduces total score by 2.5 pts avg
    };

    public setWeights(newWeights: Partial<ModelWeights>) {
        this.weights = { ...this.weights, ...newWeights };
    }

    /**
     * Generates a "True Spread" prediction for Home Team vs Away Team
     */
    public predictSpread(home: TeamStats, away: TeamStats): number {
        // 1. Efficiency Differential (Base Strength)
        const effDiff = (home.efficiency - away.efficiency) * this.weights.EFFICIENCY;

        // 2. Margin Power (Do they blow teams out?)
        const marginDiff = (home.avgMargin - away.avgMargin) * this.weights.MARGIN;

        // 3. Form Factor (Momentum)
        const formDiff = (home.recentTrend - away.recentTrend) * this.weights.RECENT_FORM;

        // 4. Player Availability Impact (Vegas keeps this tight, we can be sharper)
        const injuryPenalty = (away.injuryImpact - home.injuryImpact) * this.weights.INJURY_SCALAR;

        // 5. Rest Disadvantage (The "Schedule Loss" Factor)
        let restFactor = 0;
        if (home.daysRest === 0 && away.daysRest > 0) restFactor -= this.weights.REST;
        if (away.daysRest === 0 && home.daysRest > 0) restFactor += this.weights.REST;

        // Combine into Predicted Point Differential (Home - Away)
        let predictedDiff =
            effDiff +
            marginDiff +
            formDiff +
            injuryPenalty +
            restFactor +
            this.weights.HOME_COURT_ADVANTAGE;

        // Round to nearest 0.5 for standardized spread format
        return Math.round(predictedDiff * 2) / 2;
    }

    /**
     * Generates a "True Total" prediction (Over/Under)
     */
    public predictTotal(home: TeamStats, away: TeamStats): number {
        // 1. Base Score (Average of Points For and Points Allowed scenarios)
        // (Home Offense vs Away Defense) + (Away Offense vs Home Defense)

        // Simple Average of all scoring metrics involved
        // Home PPG, Away PPG, Home Allowed, Away Allowed
        const rawScoreMetrics =
            (home.pointsPerGame * this.weights.PPG_WEIGHT) +
            (away.pointsPerGame * this.weights.PPG_WEIGHT) +
            (home.pointsAllowed * this.weights.DEF_WEIGHT) +
            (away.pointsAllowed * this.weights.DEF_WEIGHT);

        // Normalize divisor based on weights used (Simplification: Just average them for now logic)
        // If weights sum to ~1.0 per side
        const baseTotal = (home.pointsPerGame + away.pointsPerGame + home.pointsAllowed + away.pointsAllowed) / 2;

        // 2. Pace Adjustment
        // Avg NBA Pace is approx 100.
        const avgPace = (home.pace + away.pace) / 2;
        const paceFactor = (avgPace - 98.5) * this.weights.PACE_WEIGHT; // 98.5 is rough baseline

        // 3. Fatigue / Rest Impact (Tired legs = missed shots = Under?)
        let fatigueFactor = 0;
        if (home.daysRest === 0) fatigueFactor += this.weights.FATIGUE_IMPACT;
        if (away.daysRest === 0) fatigueFactor += this.weights.FATIGUE_IMPACT;

        const predictedTotal = baseTotal + paceFactor + fatigueFactor;

        return Math.round(predictedTotal * 2) / 2;
    }

    /**
     * Compares our Calculated Line vs the Vegas Line to find Edges
     */
    public analyzeMatchup(home: TeamStats, away: TeamStats, lines: BettingLine[]): MatchupAnalysis {
        const ourSpread = this.predictSpread(home, away);
        const ourTotal = this.predictTotal(home, away);
        const ourWinProb = this.calculateWinProbability(ourSpread);

        let bestEdge = 0;
        let totalEdge = 0;

        // Find the best line to attack
        lines.forEach(line => {
            if (line.type === 'spread') {
                const spreadEdge = (ourSpread - line.line);
                bestEdge = Math.max(bestEdge, Math.abs(spreadEdge));
            }
            if (line.type === 'total') {
                // If we say 230 and Vegas says 220 -> Over is valid.
                // Edge = 10 pts.
                totalEdge = Math.max(totalEdge, Math.abs(ourTotal - line.line));
            }
        });

        // Combined Confidence (Prioritize Total for Shiva context later)
        const primaryEdge = Math.max(bestEdge, totalEdge);
        const confidence = Math.min(Math.max((primaryEdge * 10) + 50, 0), 99);

        return {
            id: `${home.teamName}-${away.teamName}`,
            homeTeam: home,
            awayTeam: away,
            marketLines: lines,
            calculatedWinProb: ourWinProb,
            calculatedSpread: -ourSpread,
            calculatedTotal: ourTotal,
            edge: parseFloat((primaryEdge * 2.0).toFixed(2)), // Approx % edge
            recommendation: primaryEdge > 4 ? 'BET' : 'PASS',
            confidenceScore: Math.round(confidence)
        };
    }

    // Helper helper to convert spread to rough win probability for the favorited team (Home team in this context)
    public calculateWinProbability(pointDiff: number): number {
        // Simple heuristic with bounds: -1 point ~ 47% (if negative diff), +1 ~ 53%
        // Max at 99%, Min at 1%
        const prob = 0.5 + (0.03 * pointDiff);
        return Math.max(0.01, Math.min(0.99, prob));
    }
}
