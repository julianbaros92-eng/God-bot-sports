
import fs from 'fs';
import path from 'path';
import { KalshiClient } from '../api-clients/kalshi-client';

export interface TradeRecord {
    id: string; // Unique ID (e.g. gameId_team)
    date: string;
    gameId: string;
    team: string; // Stores Ticker used for API lookup
    action: string;
    entryPrice: number; // e.g. 0.35
    vegasPrice: number;
    amount: number; // Invested Amount ($)
    status: 'OPEN' | 'WON' | 'LOST';
    pnl: number;
}

const TRADES_FILE = path.join(process.cwd(), 'src', 'data', 'trades.json');

export class TradeManager {
    private trades: TradeRecord[] = [];

    constructor() {
        this.load();
    }

    private load() {
        if (fs.existsSync(TRADES_FILE)) {
            try {
                const data = fs.readFileSync(TRADES_FILE, 'utf-8');
                this.trades = JSON.parse(data);
            } catch (e) {
                console.error("Failed to load trades:", e);
                this.trades = [];
            }
        }
    }

    private save() {
        fs.writeFileSync(TRADES_FILE, JSON.stringify(this.trades, null, 2));
    }

    public hasTrade(id: string): boolean {
        return !!this.trades.find(t => t.id === id);
    }

    public logTrade(opp: any) {
        // Unique ID for this specific opportunity
        const id = `${opp.id}_${opp.ticker}`;

        // Check availability
        if (this.trades.find(t => t.id === id)) return; // Already logged

        const trade: TradeRecord = {
            id,
            date: new Date().toISOString(),
            gameId: opp.id,
            team: opp.ticker || opp.team,
            action: opp.action,
            entryPrice: opp.marketPrice, // e.g. 0.35
            vegasPrice: opp.vegasPrice,
            amount: 50, // Standard Unit of Investment ($50)
            status: 'OPEN',
            pnl: 0
        };

        this.trades.push(trade);
        this.save();
        console.log(`[TradeManager] 📝 Logged trade: ${trade.team} @ ${trade.entryPrice}`);
    }

    public async updateTrades(client: KalshiClient) {
        let changed = false;
        const openTrades = this.trades.filter(t => t.status === 'OPEN');

        for (const trade of openTrades) {
            // trade.team holds the TICKER (e.g. KXNBAGAME-...)
            const market = await client.getMarket(trade.team);

            if (market && (market.status === 'finalized' || market.result)) {
                // Determine Result (Assuming we bought YES)
                const isWin = market.result === 'yes';

                if (isWin) {
                    trade.status = 'WON';
                    // PnL Calculation:
                    // Bought $50 worth at 0.35.
                    // Contracts = 50 / 0.35 = 142.8
                    // Payout = 142.8 * $1.00 = $142.8
                    // Profit = 142.8 - 50 = $92.8
                    const contracts = trade.amount / (trade.entryPrice > 0 ? trade.entryPrice : 1); // Avoid div0
                    const payout = contracts * 1.0;
                    trade.pnl = payout - trade.amount;
                } else if (market.result === 'no') {
                    trade.status = 'LOST';
                    trade.pnl = -trade.amount;
                }

                if (trade.status !== 'OPEN') {
                    console.log(`[TradeManager] 💰 Trade Settled: ${trade.team} -> ${trade.status} ($${trade.pnl.toFixed(2)})`);
                    changed = true;
                }
            }
        }

        if (changed) this.save();
    }

    public getStats() {
        const totalTrades = this.trades.length;
        const openTrades = this.trades.filter(t => t.status === 'OPEN').length;
        const totalProfit = this.trades.reduce((sum, t) => sum + t.pnl, 0);

        // Calculate Win Rate on CLOSED trades only
        const closedTrades = this.trades.filter(t => t.status !== 'OPEN');
        const wins = closedTrades.filter(t => t.status === 'WON').length;
        const winRate = closedTrades.length > 0 ? (wins / closedTrades.length * 100).toFixed(1) : 0;

        return {
            totalTrades,
            openTrades,
            totalProfit,
            winRate
        };
    }

    public getRecentTrades() {
        return this.trades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
}
