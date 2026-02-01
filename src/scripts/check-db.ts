
import 'dotenv/config';
import { db } from '../lib/db';

async function main() {
    console.log("🔍 Checking Database Picks...");
    const picks = await db.pick.findMany({
        orderBy: { createdAt: 'desc' }
    });

    if (picks.length === 0) {
        console.log("❌ No picks found in database.");
    } else {
        console.log(`✅ Found ${picks.length} picks:`);
        picks.forEach(p => {
            console.log(`   [${p.status}] ${p.bot} ${p.pickDetails} (${p.matchup}) - ${p.matchDate.toISOString()}`);
        });
    }
}

main().catch(console.error);
