
export interface KalshiMarket {
    ticker: string;
    event_ticker: string;
    market_type: string;
    title: string;
    subtitle: string;
    yes_bid: number;
    yes_ask: number;
    expiration_time: string;
    implied_probability: number;
}

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export class KalshiClient {
    // Demo API Environment as requested
    private baseUrl = 'https://demo-api.kalshi.co/trade-api/v2';
    private apiKey = process.env.KALSHI_API_KEY || ''; // From .env.local
    private privateKeyPath = process.env.KALSHI_PRIVATE_KEY_PATH || '';
    private privateKey: string | null = process.env.KALSHI_PRIVATE_KEY || null;

    // Cache
    private marketsCache: KalshiMarket[] = [];
    private lastFetch = 0;

    constructor() {
        this.loadPrivateKey();
    }

    private loadPrivateKey() {
        // If already loaded from Env Var, skip file read
        if (this.privateKey) return;

        if (this.privateKeyPath) {
            try {
                // Handle relative path
                const resolvedPath = this.privateKeyPath.startsWith('/')
                    ? this.privateKeyPath
                    : path.join(process.cwd(), this.privateKeyPath);

                if (fs.existsSync(resolvedPath)) {
                    this.privateKey = fs.readFileSync(resolvedPath, 'utf-8');
                } else {
                    console.warn(`[Kalshi] Private key not found at: ${resolvedPath}`);
                }
            } catch (e) {
                console.warn("[Kalshi] Failed to load private key", e);
            }
        }
    }

    private signRequest(method: string, endpoint: string, body: string = '', timestamp: string): string {
        if (!this.privateKey) return '';

        // Path matches endpoint usually, e.g. /trade-api/v2/portfolio/balance
        // Note: Kalshi signature usually requires the PARTIAL path starting from /trade-api...
        // My baseUrl includes /trade-api/v2.
        // Endpoint passed here should be like '/portfolio/balance'.
        // Full path signed: /trade-api/v2/portfolio/balance

        const pathIs = `/trade-api/v2${endpoint}`;
        const msg = `${timestamp}${method}${pathIs}`;

        if (method === 'POST') {
            // console.debug('[Kalshi] Signing POST (Body Excluded)');
        }

        const sign = crypto.createSign('SHA256');

        sign.update(Buffer.from(msg, 'utf-8'));
        sign.end();

        // Try PSS Padding
        try {
            return sign.sign({
                key: this.privateKey,
                padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
                saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
            }, 'base64');
        } catch (e) {
            console.warn("PSS Sign failed, falling back to PKCS1", e);
            return sign.sign(this.privateKey, 'base64');
        }
    }

    private async authFetch(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any) {
        if (!this.apiKey || !this.privateKey) {
            console.error("[Kalshi] Missing API Key or Private Key");
            return null;
        }

        const timestamp = Date.now().toString();
        const bodyStr = body ? JSON.stringify(body) : '';
        const signature = this.signRequest(method, endpoint, bodyStr, timestamp);

        const url = `${this.baseUrl}${endpoint}`;

        const headers: any = {
            'Content-Type': 'application/json',
            'KALSHI-ACCESS-KEY': this.apiKey,
            'KALSHI-ACCESS-SIGNATURE': signature,
            'KALSHI-ACCESS-TIMESTAMP': timestamp
        };

        try {
            const res = await fetch(url, {
                method,
                headers,
                body: method === 'POST' ? bodyStr : undefined
            });

            if (!res.ok) {
                const err = await res.text();
                console.error(`[Kalshi] Auth Request Failed [${endpoint}]:`, err);
                return null;
            }

            return await res.json();
        } catch (e) {
            console.error(`[Kalshi] Request Error [${endpoint}]:`, e);
            return null;
        }
    }

    /**
     * Get Portfolio Balance (Cents)
     */
    public async getBalance(): Promise<number> {
        // GET /portfolio/balance
        const data = await this.authFetch('/portfolio/balance');
        if (data && data.balance) {
            return data.balance; // usually returned in cents
        }
        return 0;
    }

    /**
     * Place Order
     * @param ticker Market Ticker
     * @param action 'buy' or 'sell' YES contracts? 
     *               Kalshi API 'action': 'buy' (buy position)
     *               'side': 'yes' / 'no'
     * @param count Number of contracts
     */
    public async placeOrder(ticker: string, count: number, side: 'yes' | 'no', price: number) {
        // POST /portfolio/orders
        const body = {
            action: 'buy', // We always 'buy' to open.
            side: side,
            count: count,
            type: 'limit',
            ticker: ticker,
            yes_price: side === 'yes' ? price : undefined,
            no_price: side === 'no' ? price : undefined,
            client_order_id: crypto.randomUUID()
        };

        console.log(`[Kalshi] Placing Order: ${count}x ${side} on ${ticker} @ ${price}c`);
        return await this.authFetch('/portfolio/orders', 'POST', body);
    }

    /**
     * Get single market details (for result checking)
     */
    public async getMarket(ticker: string) {
        try {
            const url = `${this.baseUrl}/markets/${ticker}`;
            const res = await fetch(url);
            if (!res.ok) return null;
            const data = await res.json();
            return data.market;
        } catch (e) {
            console.error(`[Kalshi] Failed to fetch market ${ticker}`, e);
            return null;
        }
    }

    /**
     * Fetch ONLY the Standard NBA Game Winner markets.
     * Series Ticker: KXNBAGAME (Discovered via debug)
     */
    public async loadMarkets() {
        const now = Date.now();
        if (this.marketsCache.length > 0 && (now - this.lastFetch) < 60000) {
            return; // Use cache if < 1 min old
        }
        // Public Endpoint (No Auth Needed usually, but we can use authFetch if rate limits stricter)
        // Sticking to public fetch for now as it worked.

        console.log("[Kalshi] 📥 Loading standard NBA Game Winner markets...");

        try {
            // Target the specific series for Game Winners
            const url = `${this.baseUrl}/markets?limit=500&series_ticker=KXNBAGAME`;
            const res = await fetch(url);

            if (!res.ok) {
                console.error(`[Kalshi] API Error: ${res.statusText}`);
                return;
            }

            const data = await res.json();
            const markets: any[] = data.markets;

            if (!markets) return;

            // Pre-process and store
            this.marketsCache = markets.map(match => ({
                ticker: match.ticker,
                event_ticker: match.event_ticker,
                market_type: match.market_type,
                title: match.title,
                subtitle: match.yes_sub_title, // Using yes_sub_title as it contains the Team Name
                yes_bid: match.yes_bid,
                yes_ask: match.yes_ask,
                expiration_time: match.expiration_time,
                implied_probability: match.yes_ask / 100
            }));

            console.log(`[Kalshi] ✅ Cached ${this.marketsCache.length} NBA Winner markets.`);
            this.lastFetch = now;
        } catch (e) {
            console.error("Kalshi Load Error:", e);
        }
    }

    /**
     * Find a market for a specific team win.
     * Checks against opponent name if provided to ensure correct game matching.
     */
    public findMarketLocal(teamName: string, opponentName?: string): KalshiMarket | null {
        if (this.marketsCache.length === 0) return null;

        // Strategy: Match Team Name to Market Subtitle
        // Subtitle is usually the Team Name (e.g. "Sacramento", "Milwaukee")

        // Prepare search terms (e.g. "Milwaukee Bucks" -> ["Milwaukee", "Bucks"])
        const nameParts = teamName.toLowerCase().split(' ').filter(p => p.length > 2);

        // Prepare opponent terms if available
        const oppParts = opponentName ? opponentName.toLowerCase().split(' ').filter(p => p.length > 2) : [];

        const match = this.marketsCache.find(m => {
            if (!m.subtitle) return false;
            const subtitle = m.subtitle.toLowerCase(); // "sacramento"
            const title = m.title.toLowerCase();       // "sacramento at cleveland winner?"

            // 1. Check Primary Team (Subtitle match)
            if (teamName.includes("Los Angeles")) {
                if (teamName.includes("Lakers") && !subtitle.includes("lakers")) return false;
                if (teamName.includes("Clippers") && !subtitle.includes("clippers")) return false;
            }

            const matchesTeam = nameParts.some(part => subtitle.includes(part));
            if (!matchesTeam) return false;

            // 2. Check Opponent (Title match)
            if (oppParts.length > 0) {
                const matchesOpponent = oppParts.some(part => title.includes(part));
                if (!matchesOpponent) return false;
            }

            return true;
        });

        if (!match) return null;

        return match;
    }
}
