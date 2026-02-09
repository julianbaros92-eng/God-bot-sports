
import { db } from '../db';
import { ApiSportsClient } from '../api-clients/providers/api-sports';
import { TheOddsApiClient } from '../api-clients/providers/the-odds-api';
import { EdgeCalculator } from '../modeling/edge-calculator';
import { StatsAggregator } from '../modeling/stats-aggregator';
import { ZEUS_STRATEGY, LOKI_STRATEGY, SHIVA_STRATEGY } from '../modeling/strategies';
import { BettingLine } from '../modeling/types';
import { STAR_PLAYERS } from '../data/stars';
import { updateTeamStats } from './stats-updater';

export async function runScanner() {
    console.log("⚡ Starting Market Scan...");

    try {
        const apiSports = new ApiSportsClient();
        const oddsApi = new TheOddsApiClient();
        const calculator = new EdgeCalculator();

        // 1. Build Stats from DB Cache
        console.log("   Fetching cached team stats...");
        let cachedStats = await db.teamStats.findMany();

        if (!cachedStats || cachedStats.length === 0) {
            console.warn("⚠️ Cache empty. Running Initial Stats Update (This may take a moment)...");
            await updateTeamStats();
            cachedStats = await db.teamStats.findMany();
        }

        if (!cachedStats || cachedStats.length === 0) {
            console.error("❌ Failed to load stats even after update.");
            return;
        }

        const teamStats = new Map<string, any>();
        cachedStats.forEach(stat => {
            // Recalculate Days Rest correctly based on NOW
            const lastGame = stat.lastGameDate || new Date(0);
            const diffTime = Math.abs(new Date().getTime() - lastGame.getTime());
            const daysRest = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            teamStats.set(stat.teamName, {
                teamName: stat.teamName,
                gp: stat.gp,
                pointsPerGame: stat.pointsPerGame,
                pointsAllowed: stat.pointsAllowed,
                pace: stat.pace,
                efficiency: stat.efficiency,
                recentTrend: stat.recentTrend,
                avgMargin: stat.avgMargin,
                daysRest: daysRest,
                injuryImpact: 0, // Placeholder
                lastGameDate: lastGame
            });
        });
        console.log(`   ✅ Stats loaded for ${teamStats.size} teams.`);

        // 2. Fetch Odds
        console.log("   Fetching live odds...");
        const oddsData = await oddsApi.getOdds('basketball_nba', 'us');
        if (!oddsData || oddsData.length === 0) {
            console.log("   ⚠️ No upcoming games/odds found.");
            // return; // Don't return, maybe we have partial data? Actually return is fine.
            return;
        }

        let newPicksCount = 0;

        // 3. Analyze
        // Fetch Injuries for unique dates in odds
        const distinctDates = Array.from(new Set(oddsData.map(g => new Date(g.commence_time).toISOString().split('T')[0])));
        const injuryReports: any[] = [];

        console.log(`   Fetching Injury Reports for ${distinctDates.length} days...`);
        for (const d of distinctDates) {
            const reports = await apiSports.getInjuries(d);
            if (reports && reports.length > 0) injuryReports.push(...reports);
        }

        for (const game of oddsData) {
            const homeName = game.home_team;
            const awayName = game.away_team;
            const commenceTime = new Date(game.commence_time);

            if (commenceTime < new Date()) continue;

            const homeStats = teamStats.get(homeName);
            const awayStats = teamStats.get(awayName);

            if (!homeStats || !awayStats) continue;

            // --- INJURY & REST IMPACT FACTOR ---
            // Check for missing stars
            // Filter reports for this game's teams
            const homeInjuredStars = injuryReports.filter((rep: any) =>
                rep.team.name === homeName &&
                (rep.type === 'Out' || rep.type === 'Missing') &&
                STAR_PLAYERS.includes(rep.player.name)
            );

            const awayInjuredStars = injuryReports.filter((rep: any) =>
                rep.team.name === awayName &&
                (rep.type === 'Out' || rep.type === 'Missing') &&
                STAR_PLAYERS.includes(rep.player.name)
            );

            let homePenalty = 0;
            let awayPenalty = 0;

            if (homeInjuredStars.length > 0) {
                homePenalty += homeInjuredStars.length * 3.0; // 3 pts per star
                console.log(`   🚨 IMPACT: ${homeName} missing ${homeInjuredStars.map((p: any) => p.player.name).join(', ')} (-${homeInjuredStars.length * 3.0})`);
            }
            if (awayInjuredStars.length > 0) {
                awayPenalty += awayInjuredStars.length * 3.0;
                console.log(`   🚨 IMPACT: ${awayName} missing ${awayInjuredStars.map((p: any) => p.player.name).join(', ')} (-${awayInjuredStars.length * 3.0})`);
            }

            // Rest / Fatigue Logic (Back-to-Back Check)
            // If they played yesterday (daysRest <= 1), impose penalty.
            if (homeStats.daysRest <= 1) {
                homePenalty += 3.0;
                console.log(`   😴 FATIGUE: ${homeName} is on Back-to-Back (-3.0)`);
            }
            if (awayStats.daysRest <= 1) {
                awayPenalty += 3.0;
                console.log(`   😴 FATIGUE: ${awayName} is on Back-to-Back (-3.0)`);
            }

            // Extract Lines
            const lines: BettingLine[] = [];
            game.bookmakers.forEach((book: any) => {
                book.markets.forEach((market: any) => {
                    if (market.key === 'spreads') {
                        market.outcomes.forEach((outcome: any) => {
                            if (outcome.name === homeName) {
                                lines.push({ source: book.title, line: outcome.point, odds: outcome.price, type: 'spread' });
                            }
                        });
                    }
                    if (market.key === 'totals') {
                        market.outcomes.forEach((outcome: any) => {
                            if (outcome.name === 'Over') {
                                lines.push({ source: book.title, line: outcome.point, odds: outcome.price, type: 'total' });
                            }
                        });
                    }
                    if (market.key === 'h2h') {
                        market.outcomes.forEach((outcome: any) => {
                            if (outcome.name === homeName) {
                                lines.push({ source: book.title, line: 0, odds: outcome.price, type: 'moneyline_home' });
                            } else if (outcome.name === awayName) {
                                lines.push({ source: book.title, line: 0, odds: outcome.price, type: 'moneyline_away' });
                            }
                        });
                    }
                });
            });

            if (lines.length === 0) continue;

            // --- ZEUS (Spreads) ---
            calculator.setWeights(ZEUS_STRATEGY);
            const rawMargin = calculator.predictSpread(homeStats, awayStats);

            // Apply Injury & Rest Impact
            const zeusMargin = rawMargin - homePenalty + awayPenalty;

            const zeusSpread = -zeusMargin; // Convert margin to spread (e.g. +10 margin -> -10 spread)
            const marketSpreadLine = lines.find(l => l.type === 'spread');

            if (marketSpreadLine) {
                const marketL = marketSpreadLine.line;
                const edge = Math.abs(zeusSpread - marketL);

                // Threshold > 2.0 (Standard)
                if (edge > 2.0) {
                    const pickSide = (zeusSpread < marketL) ? homeName : awayName;

                    // Invert line if picking Away team (e.g. Home -5 becomes Away +5) for display
                    const pickLine = pickSide === homeName ? marketL : -marketL;

                    await savePick('ZEUS', 'NBA', commenceTime, `${awayName} @ ${homeName}`, 'SPREAD', `${pickSide} ${pickLine > 0 ? '+' : ''}${pickLine}`, -110, parseFloat((edge * 2).toFixed(1)));
                    newPicksCount++;
                }
            }

            // --- SHIVA (Totals) ---
            calculator.setWeights(SHIVA_STRATEGY);
            const rawTotal = calculator.predictTotal(homeStats, awayStats);

            // Injury & Fatigue Impact on Totals
            // Stars Out -> Less Scoring (-1.5 per star)
            // Fatigue -> Less Defense? Less Offense? Usually Slower Pace (-1.0)
            let totalPenalty = (homeInjuredStars.length + awayInjuredStars.length) * 1.5;
            if (homeStats.daysRest <= 1) totalPenalty += 1.0;
            if (awayStats.daysRest <= 1) totalPenalty += 1.0;

            const shivaTotal = rawTotal - totalPenalty;

            const marketTotalLine = lines.find(l => l.type === 'total');

            if (marketTotalLine) {
                const markT = marketTotalLine.line;
                const edge = Math.abs(shivaTotal - markT);

                // Threshold > 5.0
                if (edge > 5.0) {
                    const pickType = shivaTotal > markT ? 'OVER' : 'UNDER';
                    await savePick('SHIVA', 'NBA', commenceTime, `${awayName} @ ${homeName}`, 'TOTAL', `${pickType} ${markT}`, -110, parseFloat((edge * 2).toFixed(1)));
                    newPicksCount++;
                }
            }

            // --- LOKI (Moneyline) ---
            calculator.setWeights(LOKI_STRATEGY);
            const mlHome = lines.find(l => l.type === 'moneyline_home');
            const mlAway = lines.find(l => l.type === 'moneyline_away');

            if (mlHome && mlAway) {
                const homeOdds = mlHome.odds;
                const awayOdds = mlAway.odds;

                let dogSide = null;
                let dogOdds = 0;
                if (homeOdds > 100) { dogSide = 'HOME'; dogOdds = homeOdds; }
                else if (awayOdds > 100) { dogSide = 'AWAY'; dogOdds = awayOdds; }

                if (dogSide) {
                    // Use Adjusted Margin for Win Prob
                    const predSpread = zeusMargin; // Reuse the injury/rest-adjusted spread!

                    const modelWinProb = dogSide === 'HOME'
                        ? calculator.calculateWinProbability(predSpread)
                        : calculator.calculateWinProbability(-predSpread);

                    const impliedProb = 100 / (dogOdds + 100);
                    const probEdge = modelWinProb - impliedProb;

                    if (probEdge > 0.08 && modelWinProb >= 0.40) {
                        const pickName = dogSide === 'HOME' ? homeName : awayName;
                        await savePick('LOKI', 'NBA', commenceTime, `${awayName} @ ${homeName}`, 'MONEYLINE', `${pickName} ML`, dogOdds, parseFloat((probEdge * 100).toFixed(1)));
                        newPicksCount++;
                    }
                }
            }

        }

        console.log(`\n🎉 Scan Complete. Found ${newPicksCount} new picks.`);

    } catch (e: any) {
        console.error("Scan Failed:", e);
    }
}

async function savePick(bot: string, sport: string, date: Date, matchup: string, type: string, details: string, odds: number, edge: number) {
    // Check for ANY pending pick for this bot & game (Ignore specific details to handle line moves)
    const existing = await db.pick.findFirst({
        where: {
            bot: bot,
            matchup: matchup,
            matchDate: date,
            status: 'PENDING'
        }
    });

    if (existing) {
        // Update existing pick with latest line/odds
        await db.pick.update({
            where: { id: existing.id },
            data: {
                pickDetails: details,
                odds: odds,
                edge: edge,
                pickType: type, // JIC
                updatedAt: new Date()
            }
        });
        console.log(`   🔄 Updated ${bot}: ${details} (${edge}% Edge)`);
    } else {
        // Create new
        await db.pick.create({
            data: {
                bot, sport, matchDate: date, matchup, pickType: type, pickDetails: details, odds, edge,
                status: 'PENDING'
            }
        });
        console.log(`   💾 Saved ${bot}: ${details} (${edge}% Edge)`);
    }
}
