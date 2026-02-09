
import { ApiSportsGame } from '../api-clients/providers/api-sports'; // We need to export this interface first
import { TeamStats } from './types';

export class StatsAggregator {

    /**
     * Aggregates a list of completed games into TeamStats for every team.
     */
    public static aggregate(games: ApiSportsGame[]): Map<string, TeamStats> {
        const statsMap = new Map<string, {
            totalPoints: number;
            totalAllowed: number;
            totalGames: number;
            margins: number[];
            lastGameDate: Date;
            name: string;
        }>();

        // Sort games by date ascending to track recent trend and rest
        const sortedGames = [...games].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        for (const game of sortedGames) {
            // Skip games that haven't happened (no scores)
            if (!game.scores.home.total || !game.scores.away.total) continue;

            this.updateTeam(statsMap, game.teams.home.name, game.scores.home.total, game.scores.away.total, game.date);
            this.updateTeam(statsMap, game.teams.away.name, game.scores.away.total, game.scores.home.total, game.date);
        }

        // Convert to Final TeamStats
        const finalStats = new Map<string, TeamStats>();
        statsMap.forEach((data, teamName) => {
            const avgPoints = data.totalPoints / data.totalGames;
            const avgAllowed = data.totalAllowed / data.totalGames;
            const avgMargin = (data.totalPoints - data.totalAllowed) / data.totalGames;

            // Recent Trend: Last 5 games margin average
            const recentMargins = data.margins.slice(-5);
            const recentTrend = recentMargins.reduce((sum, m) => sum + m, 0) / recentMargins.length;

            // Rest Days: Diff between Now and Last Game
            const now = new Date();
            const lastGame = data.lastGameDate;
            const diffTime = Math.abs(now.getTime() - lastGame.getTime());
            const daysRest = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            finalStats.set(teamName, {
                teamName: data.name,
                gp: data.totalGames,
                pointsPerGame: parseFloat(avgPoints.toFixed(1)),
                pointsAllowed: parseFloat(avgAllowed.toFixed(1)),
                pace: 100, // Placeholder, difficult to calc without play-by-play
                efficiency: parseFloat((avgPoints - avgAllowed).toFixed(1)), // Simple Net Rating
                recentTrend: parseFloat(recentTrend.toFixed(1)),
                injuryImpact: 0, // Placeholder
                daysRest: daysRest,
                avgMargin: parseFloat(avgMargin.toFixed(1)),
                lastGameDate: data.lastGameDate
            });
        });

        return finalStats;
    }

    private static updateTeam(map: Map<any, any>, teamName: string, scored: number, allowed: number, dateStr: string) {
        if (!map.has(teamName)) {
            map.set(teamName, {
                totalPoints: 0,
                totalAllowed: 0,
                totalGames: 0,
                margins: [],
                lastGameDate: new Date(0), // Epoch
                name: teamName
            });
        }

        const record = map.get(teamName);
        record.totalPoints += scored;
        record.totalAllowed += allowed;
        record.totalGames += 1;
        record.margins.push(scored - allowed);

        const gameDate = new Date(dateStr);
        if (gameDate > record.lastGameDate) {
            record.lastGameDate = gameDate;
        }
    }
}
