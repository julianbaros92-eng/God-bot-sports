import { Zap, Activity, Clock, TrendingUp, Trophy, History as HistoryIcon } from 'lucide-react';
import { ModelOptimizer, OptimizationResult } from '@/lib/modeling/model-optimizer';
import { TradeManager } from '@/lib/trading/trade-manager';

async function getTournamentResults() {
    const optimizer = new ModelOptimizer();
    return await optimizer.runTournament();
}

async function getLiveTrades() {
    const tradeManager = new TradeManager();
    return tradeManager.getRecentTrades().slice(0, 50);
}

export default async function HistoryPage() {
    const tournamentResults = await getTournamentResults();
    const liveTrades = await getLiveTrades();
    const champion = tournamentResults[0]; // Best model

    return (
        <div className="min-h-screen flex flex-col p-6">
            <header className="mb-8 border-b border-[var(--border)] pb-4 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Performance History
                    </h1>
                    <p className="text-[var(--text-muted)] mt-2">
                        Live execution logs and model optimization results.
                    </p>
                </div>
                <a href="/" className="text-sm text-[var(--text-muted)] hover:text-white transition-colors">
                    &larr; Back to Dashboard
                </a>
            </header>

            {/* LIVE TRADES SECTION */}
            <div className="mb-12">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <HistoryIcon size={18} className="text-[var(--primary)]" />
                    Live Execution Log
                </h3>
                {liveTrades.length === 0 ? (
                    <div className="p-8 text-center border dashed border-[var(--border)] rounded-xl text-[var(--text-muted)]">
                        No live trades executed yet.
                    </div>
                ) : (
                    <div className="glass-panel overflow-hidden">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Market / Team</th>
                                    <th>Amount</th>
                                    <th>Price</th>
                                    <th>Status</th>
                                    <th>PnL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {liveTrades.map((trade, i) => (
                                    <tr key={i} className="hover:bg-[rgba(255,255,255,0.02)]">
                                        <td className="text-[var(--text-muted)] text-xs">
                                            {new Date(trade.date).toLocaleString()}
                                        </td>
                                        <td className="font-medium">
                                            {trade.team}
                                            <div className="text-[10px] text-[var(--text-muted)]">
                                                {trade.id.split('_').pop()}
                                            </div>
                                        </td>
                                        <td>${trade.amount.toFixed(2)}</td>
                                        <td>${trade.entryPrice.toFixed(2)}</td>
                                        <td>
                                            <span className={`badge ${trade.status === 'WON' ? 'bg-green-500/10 text-green-500' :
                                                trade.status === 'LOST' ? 'bg-red-500/10 text-red-500' :
                                                    'bg-yellow-500/10 text-yellow-500'
                                                }`}>
                                                {trade.status}
                                            </span>
                                        </td>
                                        <td className={`font-bold ${(trade.pnl || 0) > 0 ? 'text-green-500' :
                                            (trade.pnl || 0) < 0 ? 'text-red-500' : ''
                                            }`}>
                                            {(trade.pnl || 0) > 0 ? '+' : ''}
                                            {trade.pnl ? `$${trade.pnl.toFixed(2)}` : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>


            {/* Champion Card */}
            <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-[rgba(255,215,0,0.1)] to-transparent border border-[rgba(255,215,0,0.3)]">
                <div className="flex items-center gap-3 mb-2">
                    <Trophy className="text-yellow-400" size={24} />
                    <span className="text-yellow-400 font-bold uppercase tracking-widest text-xs">Model Laboratory Champion</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">{champion.modelName}</h2>
                <div className="flex gap-8">
                    <div>
                        <p className="text-xs text-[var(--text-muted)]">Win Rate</p>
                        <p className="text-3xl font-bold text-[var(--primary)]">{champion.winRate.toFixed(1)}%</p>
                    </div>
                    <div>
                        <p className="text-xs text-[var(--text-muted)]">ROI</p>
                        <p className={`text-3xl font-bold ${champion.roi > 0 ? 'text-[var(--primary)]' : 'text-[var(--danger)]'}`}>
                            {champion.roi > 0 ? '+' : ''}{champion.roi.toFixed(1)}%
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-[var(--text-muted)]">Bets</p>
                        <p className="text-3xl font-bold">{champion.betsPlaced}</p>
                    </div>
                </div>
            </div>

            {/* Leaderboard Table */}
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Activity size={18} /> Optimization Leaderboard
            </h3>
            <div className="glass-panel overflow-hidden">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Strategy Name</th>
                            <th>Win Rate</th>
                            <th>ROI</th>
                            <th>Volume</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tournamentResults.map((result, i) => (
                            <tr key={i} className={`hover:bg-[rgba(255,255,255,0.02)] ${i === 0 ? 'bg-[rgba(255,215,0,0.05)]' : ''}`}>
                                <td className="font-bold text-[var(--text-muted)]">#{i + 1}</td>
                                <td className="font-medium">
                                    {result.modelName}
                                    <div className="text-[10px] text-[var(--text-muted)] opacity-50 font-mono mt-1">
                                        {JSON.stringify(result.config).substring(0, 50)}...
                                    </div>
                                </td>
                                <td>
                                    <span className={`badge ${result.winRate > 55 ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}`}>
                                        {result.winRate.toFixed(1)}%
                                    </span>
                                </td>
                                <td className={`font-bold ${result.roi > 0 ? 'text-[var(--primary)]' : 'text-[var(--danger)]'}`}>
                                    {result.roi > 0 ? '+' : ''}{result.roi.toFixed(1)}%
                                </td>
                                <td>{result.betsPlaced}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
