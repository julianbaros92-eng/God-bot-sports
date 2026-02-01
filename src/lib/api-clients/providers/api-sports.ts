


export interface ApiSportsGame {
    id: number;
    date: string;
    league: { season: number | string };
    teams: {
        home: { id: number; name: string; logo: string };
        away: { id: number; name: string; logo: string };
    };
    scores: {
        home: { total: number };
        away: { total: number };
    };
}

export class ApiSportsClient {
    private readonly apiKey = process.env.NEXT_PUBLIC_API_SPORTS_KEY || '';
    private readonly baseUrl = 'https://v2.nba.api-sports.io';

    constructor() {
        if (!this.apiKey) {
            console.error("❌ ApiSportsClient: API Key is MISSING. Check .env.local");
        } else {
            // console.log(`✅ ApiSportsClient: Key loaded (${this.apiKey.substring(0, 4)}...)`);
        }
    }

    private async fetch(endpoint: string) {
        const res = await fetch(`${this.baseUrl}${endpoint}`, {
            headers: {
                'x-apisports-key': this.apiKey
            },
            // Cache for 60 seconds (Live Scores) - User has high quota (7500/day)
            next: { revalidate: 60 }
        });

        if (!res.ok) {
            console.error(`API Sports Error: ${res.status} ${res.statusText}`);
            return { errors: { request: "Fetch failed" }, response: [] };
        }

        return res.json();
    }

    /**
     * Fetch recent games for a season.
     * Switch to v2.nba.api-sports.io (API-NBA)
     */
    async getGames(season: string = '2024') {
        try {
            // API-NBA v2: /games?season=YYYY
            const url = `/games?season=${season}`;
            console.log(`[ApiSports] Fetching (API-NBA): ${url}`);
            const data = await this.fetch(url);

            const hasErrors = data.errors && Object.keys(data.errors).length > 0;
            const isEmpty = !Array.isArray(data.response) || data.response.length === 0;

            if (hasErrors) {
                console.warn("[ApiSports] API Error:", JSON.stringify(data.errors));
                return [];
            }

            if (isEmpty) {
                console.warn("[ApiSports] No games found.");
                return [];
            }

            // Map API-NBA v2 response to ApiSportsGame interface
            return data.response.map((game: any) => ({
                id: game.id,
                date: game.date.start, // v2 structure
                league: { season: game.season },
                teams: {
                    home: {
                        id: game.teams.home.id,
                        name: game.teams.home.name,
                        logo: game.teams.home.logo
                    },
                    away: {
                        id: game.teams.visitors.id,
                        name: game.teams.visitors.name,
                        logo: game.teams.visitors.logo
                    }
                },
                scores: {
                    home: { total: game.scores.home.points },
                    away: { total: game.scores.visitors.points }
                }
            })) as ApiSportsGame[];

        } catch (e) {
            console.error("API Sports Fetch Failed", e);
            return [];
        }
    }

    /**
     * Placeholder for Team Stats until we have a proper endpoint.
     */
    async getTeamStats(season: string = '2023-2024') {
        return { response: [] };
    }

    async getGamesByDate(date: string) {
        try {
            // API-NBA v2: Season 2024 covers 2024-2025
            const data = await this.fetch(`/games?season=2024&date=${date}`);

            if (data.errors && Object.keys(data.errors).length > 0) {
                console.warn("API Sports Date Key Error:", JSON.stringify(data.errors));
            }

            return data;
        } catch (e) {
            console.error("API Sports Date Fetch Failed", e);
            return { response: [] };
        }
    }

    /**
     * Fetch Live Odds using API-NBA endpoint
     * Endpoint: /odds?season=2024&bookmaker=1&game={id} (Need to iterate)
     * OR /odds?date=YYYY-MM-DD
     */
    async getOdds(date: string) {
        // ... (existing code) ...
        try {
            console.log(`[ApiSports] Fetching Games for Date: ${date} to get Odds...`);
            const games = await this.getGamesByDate(date);

            if (!games || !games.response || games.response.length === 0) return { response: [] };

            const allOdds: any[] = [];

            // Limit to first 5 for testing/speed to avoid hitting rate limits too hard loop
            for (const game of games.response.slice(0, 5)) {
                const gameId = game.id;
                const url = `/odds?game=${gameId}`;
                console.log(`[ApiSports] Fetching Odds for Game ${gameId}...`);
                const oddsRes = await this.fetch(url);
                // console.log("Debug Odds Res:", JSON.stringify(oddsRes)); // DEBUG
                if (oddsRes && oddsRes.response && Array.isArray(oddsRes.response)) {
                    allOdds.push(...oddsRes.response);
                } else {
                    console.log(`   ⚠️ No odds for game ${gameId}`, oddsRes);
                }
            }

            return { response: allOdds };
        } catch (e) {
            console.error("API Sports Odds Strategy Failed", e);
            return { response: [] };
        }
    }

    async getInjuries(date: string) {
        try {
            console.log(`[ApiSports] Fetching Injuries for ${date}...`);
            const url = `/injuries?date=${date}`;
            const data = await this.fetch(url);
            if (!data.response) return [];
            return data.response;
        } catch (e) {
            console.error("Failed to fetch injuries", e);
            return [];
        }
    }
}
