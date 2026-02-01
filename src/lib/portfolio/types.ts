export interface Position {
    id: string;
    gameId: string;
    marketType: 'spread' | 'total' | 'moneyline' | 'polymarket_share';
    selection: string; // e.g. "Celtics -4.5"
    price: number; // e.g. -110 or $0.45 (Poly)
    stake: number; // $ value
    timestamp: string;
    status: 'OPEN' | 'WON' | 'LOST' | 'PUSH';
    source: 'SPORTSBOOK' | 'POLYMARKET';
}

export interface PortfolioStats {
    totalPnL: number;
    openExposure: number;
    winRate: number; // 0-100
    totalBets: number;
}
