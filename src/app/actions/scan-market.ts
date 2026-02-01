'use server';

import { db } from '../../lib/db';
import { ApiSportsClient } from '../../lib/api-clients/providers/api-sports';
import { TheOddsApiClient } from '../../lib/api-clients/providers/the-odds-api';
import { EdgeCalculator } from '../../lib/modeling/edge-calculator';
import { StatsAggregator } from '../../lib/modeling/stats-aggregator';
import { ZEUS_STRATEGY, LOKI_STRATEGY, SHIVA_STRATEGY } from '../../lib/modeling/strategies';
import { BettingLine } from '../../lib/modeling/types';
import { revalidatePath } from 'next/cache';

export async function scanMarketAction() {
    console.log("⚡ Starting Market Scan...");

    try {
        const apiSports = new ApiSportsClient();
        const oddsApi = new TheOddsApiClient();
        const calculator = new EdgeCalculator();

        // 1. Build Stats (Heavy Operation - could be cached)
        // Fetch 2024 season games to build stats
        const historyGames = await apiSports.getGames('2024');
        if (!historyGames || historyGames.length === 0) {
            return { success: false, message: "Failed to fetch stats history." };
        }
        const teamStats = StatsAggregator.aggregate(historyGames);
        console.log(`✅ Stats built for ${teamStats.size} teams.`);

        // 2. Fetch Odds for Upcoming Games
        const oddsData = await oddsApi.getOdds('basketball_nba', 'us');
        if (!oddsData || oddsData.length === 0) {
            return { success: false, message: "No upcoming games/odds found." };
        }

        let newPicksCount = 0;

        // 3. Analyze Each Game
        for (const game of oddsData) {
            const homeName = game.home_team;
            const awayName = game.away_team;
            const commenceTime = new Date(game.commence_time);

            // Skip live games for now
            if (commenceTime < new Date()) continue;

            const homeStats = teamStats.get(homeName);
            const awayStats = teamStats.get(awayName);

            if (!homeStats || !awayStats) continue;

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
                    // Moneyline logic if needed (h2h)
                    if (market.key === 'h2h') {
                        market.outcomes.forEach((outcome: any) => {
                            // Store ML odds for both relative to home/away?
                            // Just simplify: if this outcome is "Home Team", store it.
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
            const zeusCalcString = calculator.predictSpread(homeStats, awayStats);
            // Market Line (First available spread)
            const marketSpreadLine = lines.find(l => l.type === 'spread');

            if (marketSpreadLine) {
                const marketL = marketSpreadLine.line;
                const edge = Math.abs(zeusCalcString - marketL);

                // Threshold > 2.0 (Standard)
                if (edge > 2.0) {
                    // Determine Pick
                    // Predicted: -5 (Home wins by 5). Market: -2 (Home wins by 2).
                    // We think Home is stronger. Bet Home.
                    // Pick details: "LAL -2"
                    // Wait, we bet the MARKET line.
                    const pickSide = (zeusCalcString < marketL) ? homeName : awayName;
                    // Spread logic is tricky. 
                    // If we predict -8, Market is -4. Home covers -4 easily. Pick Home.
                    // -8 < -4. Correct.

                    // Upsert Pick
                    await savePick('ZEUS', 'NBA', commenceTime, `${awayName} @ ${homeName}`, 'SPREAD', `${pickSide} ${marketL > 0 ? '+' : ''}${marketL}`, -110, parseFloat((edge * 2).toFixed(1)));
                    newPicksCount++;
                }
            }

            // --- SHIVA (Totals) ---
            calculator.setWeights(SHIVA_STRATEGY);
            const shivaTotal = calculator.predictTotal(homeStats, awayStats);
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
            // Logic: Find Underdog. Check Win Prob.
            // We need Moneyline Odds.
            const mlHome = lines.find(l => l.type === 'moneyline_home');
            const mlAway = lines.find(l => l.type === 'moneyline_away');

            if (mlHome && mlAway) {
                const homeOdds = mlHome.odds;
                const awayOdds = mlAway.odds;

                // Identify Underdog
                let dogSide = null;
                let dogOdds = 0;
                if (homeOdds > 100) { dogSide = 'HOME'; dogOdds = homeOdds; }
                else if (awayOdds > 100) { dogSide = 'AWAY'; dogOdds = awayOdds; }

                if (dogSide) {
                    // Check Model Probability
                    const predSpread = calculator.predictSpread(homeStats, awayStats); // Home - Away
                    const modelWinProb = dogSide === 'HOME'
                        ? calculator.calculateWinProbability(predSpread)
                        : calculator.calculateWinProbability(-predSpread);

                    const impliedProb = 100 / (dogOdds + 100);
                    const probEdge = modelWinProb - impliedProb;

                    // Thresholds: Edge > 8%, WinProb >= 40%
                    if (probEdge > 0.08 && modelWinProb >= 0.40) {
                        const pickName = dogSide === 'HOME' ? homeName : awayName;
                        await savePick('LOKI', 'NBA', commenceTime, `${awayName} @ ${homeName}`, 'MONEYLINE', `${pickName} ML`, dogOdds, parseFloat((probEdge * 100).toFixed(1)));
                        newPicksCount++;
                    }
                }
            }

        }

        revalidatePath('/');
        return { success: true, message: `Scan Complete. Found ${newPicksCount} new picks.` };

    } catch (e: any) {
        console.error("Scan Failed:", e);
        return { success: false, message: e.message };
    }
}

async function savePick(bot: string, sport: string, date: Date, matchup: string, type: string, details: string, odds: number, edge: number) {
    // Check if exists
    const existing = await db.pick.findFirst({
        where: {
            bot: bot,
            matchup: matchup,
            pickDetails: details,
            // Only allow one pick per matchup/type per day roughly
            matchDate: date
        }
    });

    if (!existing) {
        await db.pick.create({
            data: {
                bot, sport, matchDate: date, matchup, pickType: type, pickDetails: details, odds, edge,
                status: 'PENDING'
            }
        });
        console.log(`💾 Saved ${bot} Pick: ${details}`);
    }
}
