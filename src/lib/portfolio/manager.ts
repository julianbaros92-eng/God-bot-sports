import { Position, PortfolioStats } from './types';

// Simple in-memory storage for demo purposes
// In production, this would be a database (Postgres/Supabase)
let portfolioStorage: Position[] = [
    // Seed with some history
    {
        id: 'bet_1',
        gameId: 'mock_game_1',
        marketType: 'spread',
        selection: 'Celtics -4.5',
        price: -110,
        stake: 100,
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        status: 'WON',
        source: 'SPORTSBOOK'
    },
    {
        id: 'bet_2',
        gameId: 'mock_game_2',
        marketType: 'polymarket_share',
        selection: 'Lakers Win',
        price: 0.45,
        stake: 200,
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        status: 'LOST',
        source: 'POLYMARKET'
    }
];

export class PortfolioManager {

    /**
     * Calculates current performance stats
     */
    public getStats(): PortfolioStats {
        let totalPnL = 0;
        let wins = 0;
        let settled = 0;
        let exposure = 0;

        portfolioStorage.forEach(pos => {
            if (pos.status === 'OPEN') {
                exposure += pos.stake;
            } else {
                settled++;
                if (pos.status === 'WON') {
                    wins++;
                    // Calc PnL based on odds
                    if (pos.source === 'POLYMARKET') {
                        // Buy at 0.45, settle at 1.00 = 0.55 profit per share
                        const shares = pos.stake / pos.price;
                        const profit = shares * (1 - pos.price);
                        totalPnL += profit;
                    } else {
                        // Standard US odds logic
                        if (pos.price < 0) {
                            totalPnL += pos.stake * (100 / Math.abs(pos.price));
                        } else {
                            totalPnL += pos.stake * (pos.price / 100);
                        }
                    }
                } else if (pos.status === 'LOST') {
                    totalPnL -= pos.stake;
                }
            }
        });

        return {
            totalPnL: parseFloat(totalPnL.toFixed(2)),
            openExposure: exposure,
            winRate: settled > 0 ? (wins / settled) * 100 : 0,
            totalBets: portfolioStorage.length
        };
    }

    /**
     * "Execute" a trade. In a real app, this would call the Bookmaker/Polymarket API.
     */
    public async executeTrade(
        gameId: string,
        selection: string,
        price: number,
        stake: number,
        source: 'SPORTSBOOK' | 'POLYMARKET'
    ): Promise<Position> {
        const newPosition: Position = {
            id: `bet_${Date.now()}`,
            gameId,
            marketType: source === 'POLYMARKET' ? 'polymarket_share' : 'spread',
            selection,
            price,
            stake,
            timestamp: new Date().toISOString(),
            status: 'OPEN',
            source
        };

        portfolioStorage.unshift(newPosition); // Add to top
        return newPosition;
    }
}
