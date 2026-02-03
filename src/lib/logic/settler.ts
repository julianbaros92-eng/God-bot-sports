
import { db } from '../db';
import { ApiSportsClient } from '../api-clients/providers/api-sports';

export async function settlePicks() {
    console.log("⚖️  Settling Pending Picks (Real Data)...");

    const apiSports = new ApiSportsClient();

    // 1. Fetch PENDING
    const pending = await db.pick.findMany({
        where: { status: 'PENDING' }
    });

    if (pending.length === 0) {
        console.log("No pending picks to settle.");
        return;
    }

    console.log(`Found ${pending.length} pending picks. Grouping by date...`);

    // 2. Group by Date to minimize API calls
    const picksByDate: Record<string, typeof pending> = {};
    for (const pick of pending) {
        const dateStr = pick.matchDate.toISOString().split('T')[0];
        if (!picksByDate[dateStr]) picksByDate[dateStr] = [];
        picksByDate[dateStr].push(pick);
    }

    // 3. Process Each Date
    for (const [dateStr, picks] of Object.entries(picksByDate)) {
        console.log(`\n📅 Checking Date: ${dateStr}...`);

        // Fetch Games from API (Current Date + Next Date for robust matching)
        // This handles cases where API date is slightly ahead/behind pick date
        const d1 = await apiSports.getGamesByDate(dateStr);

        const dateObj = new Date(dateStr);
        dateObj.setDate(dateObj.getDate() + 1);
        const nextDateStr = dateObj.toISOString().split('T')[0];
        const d2 = await apiSports.getGamesByDate(nextDateStr);

        const allGames = [
            ...(d1?.response || []),
            ...(d2?.response || [])
        ];

        if (allGames.length === 0) {
            console.log("   ❌ Failed to fetch games from API.");
            continue;
        }

        const finishedGames = allGames.filter((g: any) =>
            g.status.short === 'FT' ||
            g.status.short === 'AOT' ||
            g.status.long === 'Finished' ||
            g.status.short === 3
        );

        if (finishedGames.length === 0) {
            console.log("   ⚠️ No finished games found for this date (checked +1 day also).");
            continue;
        }

        // Create Lookup: HomeTeam -> Result
        const gameResults = new Map<string, { homeScore: number, awayScore: number, finished: boolean }>();
        finishedGames.forEach((g: any) => {
            const homeName = g.teams.home.name;
            const homeScore = g.scores.home.points;
            const awayScore = g.scores.visitors.points;
            if (homeScore !== null && awayScore !== null) {
                gameResults.set(homeName, { homeScore, awayScore, finished: true });
            }
        });

        // Check Picks
        for (const pick of picks) {
            const parts = pick.matchup.split(' @ ');
            if (parts.length !== 2) continue;
            const homeTeamName = parts[1];

            const score = gameResults.get(homeTeamName);
            if (!score) {
                console.log(`   ⏳ Game not finished or not found: ${pick.matchup}`);
                continue;
            }

            console.log(`   🔎 Grading: ${pick.pickDetails} (Score: ${score.awayScore}-${score.homeScore})`);

            let result = 'LOSS';
            let profit = -1.0;
            const resultScore = `${score.awayScore}-${score.homeScore}`;

            // Logic
            if (pick.pickType === 'SPREAD') {
                const lineMatch = pick.pickDetails.match(/([+-]?\d+\.?\d*)$/);
                if (lineMatch) {
                    const line = parseFloat(lineMatch[0]);
                    const isHomePick = pick.pickDetails.includes(homeTeamName);
                    const diff = score.homeScore - score.awayScore;
                    const coverMargin = isHomePick ? (diff + line) : (-diff + line);

                    if (coverMargin > 0) result = 'WIN';
                    else if (coverMargin === 0) result = 'PUSH';
                    else result = 'LOSS';
                }
            }
            else if (pick.pickType === 'TOTAL') {
                const totalScore = score.homeScore + score.awayScore;
                const lineMatch = pick.pickDetails.match(/(\d+\.?\d*)/);
                if (lineMatch) {
                    const line = parseFloat(lineMatch[0]);
                    const isOver = pick.pickDetails.includes("OVER");

                    if (isOver) {
                        if (totalScore > line) result = 'WIN';
                        else if (totalScore === line) result = 'PUSH';
                        else result = 'LOSS';
                    } else { // UNDER
                        if (totalScore < line) result = 'WIN';
                        else if (totalScore === line) result = 'PUSH';
                        else result = 'LOSS';
                    }
                }
            }
            else if (pick.pickType === 'MONEYLINE') {
                const isHomePick = pick.pickDetails.includes(homeTeamName);
                if (isHomePick) {
                    if (score.homeScore > score.awayScore) result = 'WIN';
                    else result = 'LOSS';
                } else {
                    if (score.awayScore > score.homeScore) result = 'WIN';
                    else result = 'LOSS';
                }
            }

            // Calc Profit
            if (result === 'WIN') {
                if (pick.odds > 0) profit = pick.odds / 100;
                else profit = 100 / Math.abs(pick.odds);
            } else if (result === 'PUSH') {
                profit = 0;
            }

            // Update DB
            await db.pick.update({
                where: { id: pick.id },
                data: {
                    status: result,
                    profit: parseFloat(profit.toFixed(2)),
                    resultScore: `${score.awayScore} @ ${score.homeScore}`
                }
            });
            console.log(`      ✅ Result: ${result} (${profit > 0 ? '+' : ''}${profit.toFixed(2)}u)`);
        }
    }
}
