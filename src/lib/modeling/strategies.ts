import { ModelWeights } from './edge-calculator';

export const ZEUS_STRATEGY: ModelWeights = {
    // "The Balanced Realist"
    EFFICIENCY: 0.25,
    MARGIN: 0.15,
    RECENT_FORM: 0.15,
    REST: 4.5,
    INJURY_SCALAR: 2.0,
    HOME_COURT_ADVANTAGE: 3.5,

    // Totals defaults (not used largely by Zeus but needed for type)
    PACE_WEIGHT: 0.40,
    PPG_WEIGHT: 0.35,
    DEF_WEIGHT: 0.35,
    FATIGUE_IMPACT: -2.5
};

export const LOKI_STRATEGY: ModelWeights = {
    // "The Trend Surfer"
    EFFICIENCY: 0.10,
    MARGIN: 0.15, // Default
    RECENT_FORM: 0.60, // High Weight on momentum
    REST: 2.0,
    INJURY_SCALAR: 2.0,
    HOME_COURT_ADVANTAGE: 2.5,

    PACE_WEIGHT: 0.40,
    PPG_WEIGHT: 0.35,
    DEF_WEIGHT: 0.35,
    FATIGUE_IMPACT: -2.5
};

export const SHIVA_STRATEGY: ModelWeights = {
    // "The Balanced Guru" (Totals Focused)
    EFFICIENCY: 0.25, // Default
    MARGIN: 0.15,
    RECENT_FORM: 0.15,
    REST: 4.5,
    INJURY_SCALAR: 2.0,
    HOME_COURT_ADVANTAGE: 3.5,

    // Totals Optimization
    PACE_WEIGHT: 0.40,
    PPG_WEIGHT: 0.35,
    DEF_WEIGHT: 0.35,
    FATIGUE_IMPACT: -2.5
};
