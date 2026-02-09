
import { db } from '../lib/db';

async function checkDb() {
    try {
        const totalPicks = await db.pick.count();
        const pendingPicks = await db.pick.count({ where: { status: 'PENDING' } });
        const recentPicks = await db.pick.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' }
        });

        console.log(`\n📊 DB Status:`);
        console.log(`   Total Picks: ${totalPicks}`);
        console.log(`   Pending Picks: ${pendingPicks}`);
        console.log(`\n🆕 Most Recent 5 Picks:`);
        recentPicks.forEach(p => {
            console.log(`   - ${p.matchup} (${p.bot}) [${p.status}] Created: ${p.createdAt.toISOString()}`);
        });

    } catch (e) {
        console.error("DB Check Failed:", e);
    }
}

checkDb();
