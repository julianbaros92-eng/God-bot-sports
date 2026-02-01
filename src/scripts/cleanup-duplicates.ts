
import 'dotenv/config';
import { db } from '../lib/db';

async function cleanup() {
    console.log("🧹 Cleaning up duplicate pending picks...");

    // Fetch all pending picks
    const pending = await db.pick.findMany({
        where: { status: 'PENDING' }
    });

    // Group by unique key
    const groups = new Map<string, any[]>();

    for (const p of pending) {
        // Key: BOT + MATCHUP + DATE (Date string only to ignore time diffs if any)
        const dateStr = p.matchDate.toISOString().split('T')[0];
        const key = `${p.bot}|${p.matchup}|${dateStr}`;

        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)?.push(p);
    }

    let deletedCount = 0;

    for (const [key, picks] of groups.entries()) {
        if (picks.length > 1) {
            // Sort by createdAt DESC (Keep newest)
            picks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

            // Keep index 0, delete rest
            const toDelete = picks.slice(1);
            console.log(`   Found duplicate for ${key}. Keeping newest (${picks[0].pickDetails}). Deleting ${toDelete.length} others.`);

            for (const d of toDelete) {
                await db.pick.delete({ where: { id: d.id } });
                deletedCount++;
            }
        }
    }

    console.log(`✅ Cleanup complete. Removed ${deletedCount} duplicate picks.`);
}

cleanup().catch(console.error);
