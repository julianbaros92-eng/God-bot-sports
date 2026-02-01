
import { ApiSportsClient } from '../lib/api-clients/providers/api-sports';
import fs from 'fs';
import path from 'path';

// Manual Env Load
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) process.env[key.trim()] = value.trim();
    });
}

async function debug() {
    const api = new ApiSportsClient();
    const games = await api.getGames('2024');
    console.log(`Total Games: ${games.length}`);
    if (games.length > 0) {
        console.log("Sample Game:", JSON.stringify(games[0], null, 2));
    }
}
debug();
