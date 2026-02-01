export interface BettingLine {
    source: string; // e.g., 'DraftKings', 'Fanduel'
    line: number;   // e.g., -4.5 or 210.5
    odds: number;   // American odds, e.g., -110, +105
    type: 'spread' | 'total' | 'moneyline' | 'moneyline_home' | 'moneyline_away';
}

export interface TeamStats {
    teamName: string;
    pointsPerGame: number;
    pointsAllowed: number;
    pace: number;         // Possessions per game
    efficiency: number;   // Net rating
    recentTrend: number;  // Last 5 games point differential
    injuryImpact: number; // 0-1 scale, but let's treat it as "Points Lost Due to Injury" (e.g. 3.5 = Star Player Out)
    daysRest: number;     // Days since last game (0 = back-to-back)
    avgMargin: number;    // Average winning/losing margin
}

export interface MatchupAnalysis {
    id: string;
    homeTeam: TeamStats;
    awayTeam: TeamStats;
    marketLines: BettingLine[];

    // Calculated Metrics
    calculatedWinProb: number;    // 0 to 1 (e.g., 0.65)
    calculatedSpread: number;     // e.g., -6.5
    calculatedTotal: number;      // e.g., 215.4

    // Final Output
    edge: number;                 // Percentage difference (e.g., 5.4%)
    recommendation: 'BET' | 'PASS';
    confidenceScore: number;      // 0-100
}
