
import { db } from '../db';
import { ApiSportsClient } from '../api-clients/providers/api-sports';
import { StatsAggregator } from '../modeling/stats-aggregator';

export async function updateTeamStats() {
    console.log("📊 Updating Team Stats Cache...");

    try {
        const api = new ApiSportsClient();

        // 1. Fetch All Games for Current Season
        console.log("   Fetching full season history...");
        const games = await api.getGames('2025');

        if (!games || games.length === 0) {
            console.error("❌ Failed to fetch games for stats update.");
            return;
        }

        // 2. Aggregate Stats
        const statsMap = StatsAggregator.aggregate(games); // returns Map<string, TeamStats>

        console.log(`   Calculated stats for ${statsMap.size} teams.`);

        // 3. Save to DB (Upsert)
        for (const [teamName, stats] of statsMap.entries()) {
            await db.teamStats.upsert({
                where: { teamName: teamName },
                update: {
                    gp: stats.gp,
                    pointsPerGame: stats.pointsPerGame,
                    pointsAllowed: stats.pointsAllowed,
                    pace: stats.pace,
                    efficiency: stats.efficiency,
                    recentTrend: stats.recentTrend,
                    avgMargin: stats.avgMargin,
                    lastGameDate: stats.lastGameDate || new Date(), // Use real last game date
                    updatedAt: new Date()
                },
                create: {
                    teamName: teamName,
                    season: '2025',
                    gp: stats.gp,
                    pointsPerGame: stats.pointsPerGame,
                    pointsAllowed: stats.pointsAllowed,
                    pace: stats.pace,
                    efficiency: stats.efficiency,
                    recentTrend: stats.recentTrend,
                    avgMargin: stats.avgMargin,
                    lastGameDate: stats.lastGameDate || new Date(),
                }
            });
        }

        console.log("✅ Team Stats Cache Updated Successfully.");

    } catch (e) {
        console.error("Stats Update Failed:", e);
    }
}
