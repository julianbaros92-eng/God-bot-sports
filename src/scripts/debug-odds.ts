
import 'dotenv/config';
import { TheOddsApiClient } from '../lib/api-clients/providers/the-odds-api';
import path from 'path';
import fs from 'fs';

// Load Env
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

async function debugOdds() {
    const client = new TheOddsApiClient();
    const odds = await client.getOdds('basketball_nba', 'us');

    if (!odds) { console.log('No odds data'); return; }

    const targets = ['Milwaukee Bucks', 'Brooklyn Nets'];

    console.log('--- Debugging Odds Data ---');
    odds.forEach((game: any) => {
        const isTarget = targets.includes(game.home_team) || targets.includes(game.away_team);
        if (isTarget) {
            console.log(`\nGame: ${game.away_team} @ ${game.home_team}`);
            console.log(`Commence: ${game.commence_time}`);

            game.bookmakers.forEach((book: any) => {
                const spreadMarket = book.markets.find((m: any) => m.key === 'spreads');
                if (spreadMarket) {
                    console.log(`  Book: ${book.title}`);
                    spreadMarket.outcomes.forEach((outcome: any) => {
                        console.log(`    ${outcome.name}: ${outcome.point} (Price: ${outcome.price})`);
                    });
                }
            });
        }
    });
}

debugOdds();
