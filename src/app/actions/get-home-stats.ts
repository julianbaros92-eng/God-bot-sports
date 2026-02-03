import { db } from '@/lib/db';

export async function getBotStats() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const bots = ['ZEUS', 'LOKI', 'SHIVA'];
    const stats: Record<string, { profit: number; winRate: string }> = {};

    for (const bot of bots) {
        const picks = await db.pick.findMany({
            where: {
                bot: bot,
                status: { in: ['WIN', 'LOSS', 'PUSH'] },
                matchDate: { gte: thirtyDaysAgo }
            }
        });

        let profit = 0;
        let wins = 0;
        let totalDecided = 0; // Excludes Pust for Win Rate typically or includes? Usually Win / (Win + Loss).

        for (const pick of picks) {
            profit += (pick.profit || 0);
            if (pick.status === 'WIN') {
                wins++;
                totalDecided++;
            } else if (pick.status === 'LOSS') {
                totalDecided++;
            }
        }

        const winRate = totalDecided > 0 ? ((wins / totalDecided) * 100).toFixed(1) + '%' : '0%';
        stats[bot] = { profit: parseFloat(profit.toFixed(2)), winRate };
    }

    return stats;
}
