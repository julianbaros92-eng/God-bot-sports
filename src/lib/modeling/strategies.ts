import { ModelWeights } from './edge-calculator';

export const ZEUS_STRATEGY: ModelWeights = {
    // "The Balanced Realist" - Optimized v2 (Feb 2026)
    EFFICIENCY: 0.24,
    MARGIN: 0.17,
    RECENT_FORM: 0.16,
    REST: 5.25,          // High impact from rest advantages
    INJURY_SCALAR: 2.1,
    HOME_COURT_ADVANTAGE: 2.50,

    // Totals defaults
    PACE_WEIGHT: 0.40,
    PPG_WEIGHT: 0.35,
    DEF_WEIGHT: 0.35,
    FATIGUE_IMPACT: -2.5
};

export const LOKI_STRATEGY: ModelWeights = {
    // "The Trend Surfer" - Optimized v2 (Feb 2026)
    // 68% Win Rate in Backtest
    EFFICIENCY: 0.17,
    MARGIN: 0.23,
    RECENT_FORM: 0.55,   // Heavy momentum focus
    REST: 1.5,
    INJURY_SCALAR: 1.7,
    HOME_COURT_ADVANTAGE: 3.1,

    PACE_WEIGHT: 0.42,
    PPG_WEIGHT: 0.41,
    DEF_WEIGHT: 0.30,
    FATIGUE_IMPACT: -2.2
};

export const SHIVA_STRATEGY: ModelWeights = {
    // "The Balanced Guru" - Optimized v2 (Feb 2026)
    EFFICIENCY: 0.18,
    MARGIN: 0.20,
    RECENT_FORM: 0.16, // Low impact
    REST: 5.35,        // High Rest Impact
    INJURY_SCALAR: 2.8, // Massive Injury Impact on Totals
    HOME_COURT_ADVANTAGE: 2.6,

    // Totals Optimization
    PACE_WEIGHT: 0.48,  // Speed Kills
    PPG_WEIGHT: 0.45,   // Prolific Scoring focus
    DEF_WEIGHT: 0.26,   // Defense matters less?
    FATIGUE_IMPACT: -3.0
};
