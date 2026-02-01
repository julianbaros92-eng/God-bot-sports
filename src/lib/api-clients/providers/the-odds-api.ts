export class TheOddsApiClient {
    private apiKey: string;
    private baseUrl = 'https://api.the-odds-api.com/v4/sports';

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.NEXT_PUBLIC_ODDS_API_KEY || '';
    }

    async getOdds(sport: string = 'basketball_nba', region: string = 'us') {
        if (!this.apiKey) {
            console.warn("⚠️ No Odds-API Key provided. Using Mock Data.");
            return null;
        }

        try {
            const url = `${this.baseUrl}/${sport}/odds?regions=${region}&markets=h2h,spreads&oddsFormat=american&apiKey=${this.apiKey}`;
            // Cache for 5 minutes (300s) to catch short-lived Arb edges.
            // Warning: Uses ~12 calls/hour -> ~8,600/month.
            const res = await fetch(url, { next: { revalidate: 300 } });
            const data = await res.json();
            if (!Array.isArray(data)) {
                console.error("Odds API Error: Response is not an array", data);
                return [];
            }
            return data;
        } catch (e) {
            console.error("Odds API Error:", e);
            return [];
        }
    }
}
