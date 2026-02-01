// In a real implementation, we would import from @polymarket/clob-client
// import { ClobClient } from '@polymarket/clob-client';

export interface PolyMarket {
    conditionId: string;
    question: string;
    outcomes: string[]; // ["Yes", "No"]
    outcomePrices: string[]; // ["0.45", "0.55"]
    liquidity: string;
    myPrice?: string; // Derived helper field
}

export interface OrderResult {
    orderId: string;
    filledSize: string;
    filledPrice: string;
    status: 'filled' | 'canceled' | 'failed';
}

export class PolymarketClient {
    private baseUrl = 'https://gamma-api.polymarket.com';

    /**
     * 1. GET Markets: Find the market for a specific game/event
     * Docs: https://docs.polymarket.com/#gamma-api
     */
    public async findMarket(teamName: string): Promise<PolyMarket | null> {
        // console.log(`[Polymarket] Searching for markets for team: ${teamName}`);

        try {
            // Search for active events (broad search)
            // Removed slug=nba as it was returning empty results
            const url = `${this.baseUrl}/events?limit=50&active=true&closed=false`;
            const res = await fetch(url);

            if (!res.ok) {
                console.error(`[Polymarket] API Error: ${res.statusText}`);
                return null;
            }

            const events = await res.json();

            // Filter for an event that contains the Team Name in its title/description
            // AND ensure it is an NBA game (check for "NBA" in title or series)
            const gameEvent = events.find((e: any) => {
                const title = e.title.toLowerCase();
                if (!title.includes('nba')) return false; // Safety check

                const team = teamName.toLowerCase();
                // Naive but effective: check if title includes parts of the team name
                // e.g. "Lakers" in "Los Angeles Lakers vs..."
                // Split team name "Los Angeles Lakers" -> ["los", "angeles", "lakers"]
                // Check if the last word (usually the nickname) is in the title
                const parts = team.split(' ');
                const nickname = parts[parts.length - 1];
                return title.includes(nickname);
            });

            if (!gameEvent) {
                console.log(`   ⚠️ [Poly] No event found for: ${teamName} (Checked ${events.length} active NBA events)`);
                return null;
            }

            console.log(`   ✅ [Poly] Found Event: ${gameEvent.title}`);

            // Find the specific "Moneyline" or "Winner" market within that event
            // Usually the first market is the main winner market
            const market = gameEvent.markets[0];

            if (!market) return null;

            // Parse outcomes
            // Polymarket usually returns outcomes as JSON string or array
            // We need to find which outcome index corresponds to OUR team
            const teamIndex = JSON.parse(market.outcomes).findIndex((outcomeName: string) =>
                outcomeName.toLowerCase().includes(teamName.toLowerCase()) // Naive matching
            );

            if (teamIndex === -1) return null;

            return {
                conditionId: market.conditionId,
                question: market.question,
                outcomes: JSON.parse(market.outcomes),
                outcomePrices: JSON.parse(market.outcomePrices),
                liquidity: market.liquidity,
                // We add a helper to just get "My Team's Price"
                // If I am looking for "Lakers", and Lakers are index 0, price is outcomePrices[0]
                myPrice: JSON.parse(market.outcomePrices)[teamIndex]
            };

        } catch (e) {
            console.error("Polymarket Fetch Error:", e);
            return null;
        }
    }

    /**
     * 2. GET Orderbook: Check depth before buying
     */
    public async getOrderBook(conditionId: string) {
        // GET /book?token_id=...
        return {
            bids: [{ price: '0.51', size: '1000' }, { price: '0.50', size: '5000' }],
            asks: [{ price: '0.53', size: '2000' }, { price: '0.54', size: '10000' }]
        };
    }

    /**
     * 3. POST Order: Execute the trade
     * This is the complex part requiring EIP-712 signing in a real app.
     */
    public async placeOrder(
        conditionId: string,
        side: 'BUY' | 'SELL',
        price: number,
        size: number
    ): Promise<OrderResult> {
        console.log(`[Polymarket] 💸 STARTING TRANSACTION...`);
        console.log(`[Polymarket] Action: ${side} | Price: ${price} | Size: $${size}`);

        // Simulation of network delay and signing
        await new Promise(resolve => setTimeout(resolve, 800));

        // Success response
        console.log(`[Polymarket] 🚀 Transaction Broadcasted!`);

        return {
            orderId: `0xOrder_${Date.now()}`,
            filledSize: size.toString(),
            filledPrice: price.toString(),
            status: 'filled'
        };
    }
}
