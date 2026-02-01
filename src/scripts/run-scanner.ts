
import 'dotenv/config'; // Load .env first
import { runScanner } from '../lib/logic/scanner';
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

// Execute
runScanner().catch(console.error);
