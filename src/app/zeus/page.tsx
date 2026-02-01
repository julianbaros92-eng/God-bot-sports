
import Link from 'next/link';
import { db } from '../../lib/db';
import { Pick as PrismaPick } from '@prisma/client';
import styles from './zeus.module.css';
import {
    Zap,
    Trophy,
    Activity,
    TrendingUp,
    Calendar,
    Filter,
    ArrowRight
} from 'lucide-react';
import ProfitChart from '../../components/profit-chart';

export const dynamic = 'force-dynamic'; // Ensure realtime data

export default async function ZeusPage() {
    // 1. Fetch Picks
    let picks: any[] = [];
    try {
        picks = await db.pick.findMany({
            where: { bot: 'ZEUS' },
            orderBy: { matchDate: 'desc' }
        });
    } catch (e) {
        console.warn("DB Fetch Failed (Expected during Vercel Build if using SQLite):", e);
        picks = [];
    }

    const pendingPicks = picks
        .filter((p: PrismaPick) => p.status === 'PENDING')
        .sort((a: PrismaPick, b: PrismaPick) => b.edge - a.edge);

    // Filter History: Only show High Confidence (>9%) picks in the record
    const historyPicks = picks.filter((p: PrismaPick) =>
        (p.status === 'WIN' || p.status === 'LOSS' || p.status === 'PUSH') &&
        (p.edge >= 9.0)
    );

    // 2. Calculate Stats
    const completedCount = historyPicks.length;
    const wins = historyPicks.filter((p: PrismaPick) => p.status === 'WIN').length;
    const winRate = completedCount > 0 ? ((wins / completedCount) * 100).toFixed(1) : '0.0';

    // Profit
    const profit = historyPicks.reduce((sum: number, p: PrismaPick) => sum + (p.profit || 0), 0);

    // Chart Data (Chronological)
    const chartData = historyPicks
        .slice()
        .reverse()
        .reduce((acc: any[], pick) => {
            const lastBalance = acc.length > 0 ? acc[acc.length - 1].profit : 0;
            const newBalance = lastBalance + (pick.profit || 0);
            const dateStr = new Date(pick.matchDate).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });

            acc.push({ date: dateStr, profit: parseFloat(newBalance.toFixed(2)) });
            return acc;
        }, []);

    // Streak
    let streak = 0;
    for (const p of historyPicks) {
        if (p.status === 'WIN') streak++;
        else break;
    }

    return (
        <div className={styles.container}>
            {/* Left Panel: Zeus Image */}
            <aside className={styles.leftPanel}>
                <img
                    src="/zeus-realist.png"
                    alt="Zeus Bot"
                />
                <div className={styles.overlay}></div>
            </aside>

            {/* Right Panel: Data & Content */}
            <main className={styles.rightPanel}>

                {/* Header */}
                <header className={styles.header}>
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'white' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>GodBot<span style={{ color: '#eab308' }}>Sports</span></span>
                    </Link>
                    <nav style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#94a3b8' }}>
                        <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
                        <Link href="/zeus" style={{ color: '#eab308', fontWeight: 'bold', textDecoration: 'none' }}>Zeus</Link>
                        <Link href="/loki" style={{ color: 'inherit', textDecoration: 'none' }}>Loki</Link>
                        <Link href="/shiva" style={{ color: 'inherit', textDecoration: 'none' }}>Shiva</Link>
                    </nav>
                </header>

                <div className={styles.scrollArea}>
                    <div className={styles.contentWrapper}>

                        {/* Title Section */}
                        <div className={styles.titleSection}>
                            <h1>ZEUS</h1>
                            <p>
                                Zeus targets structural mismatches. The model heavily weighs <span style={{ color: '#facc15', fontWeight: '600' }}>Rest Disadvantages</span> (schedule fatigue), <span style={{ color: '#facc15', fontWeight: '600' }}>Availability</span> (injury impact), and <span style={{ color: '#facc15', fontWeight: '600' }}>Home Court</span> to identify spots where the market undervalues situational factors.
                            </p>
                        </div>

                        {/* Stats Grid */}
                        <div className={styles.statsGrid}>
                            <div className={styles.statCard}>
                                <p className={styles.statLabel}>Win Rate</p>
                                <p className={`${styles.statValue} ${styles.textGreen}`}>{winRate}%</p>
                            </div>
                            <div className={styles.statCard}>
                                <p className={styles.statLabel}>Profit (YTD)</p>
                                <p className={`${styles.statValue} ${profit >= 0 ? styles.textGreen : 'text-red-400'}`}>
                                    {profit >= 0 ? '+' : ''}{profit.toFixed(2)}u
                                </p>
                            </div>
                            <div className={styles.statCard}>
                                <p className={styles.statLabel}>Active Streak</p>
                                <p className={`${styles.statValue} ${styles.textYellow}`}>
                                    {streak > 0 ? `🔥 ${streak}W` : '-'}
                                </p>
                            </div>
                            <div className={styles.statCard}>
                                <p className={styles.statLabel}>Confidence </p>
                                <p className={`${styles.statValue} ${styles.textBlue}`}>High</p>
                            </div>
                        </div>

                        {/* Chart Section */}
                        <div style={{ marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#94a3b8', marginBottom: '0.5rem' }}>Performance Curve</h3>
                            <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: '1rem', padding: '1rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                <ProfitChart data={chartData} color="#facc15" />
                            </div>
                        </div>

                        {/* Content Grid (Picks & History) */}
                        <div className={styles.contentGrid}>
                            {/* Picks List */}
                            <div>
                                <h3 className={styles.sectionTitle}>
                                    <div style={{ padding: '0.5rem', background: 'rgba(234, 179, 8, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(234, 179, 8, 0.2)', display: 'flex' }}>
                                        <Zap color="#facc15" size={24} fill="#facc15" />
                                    </div>
                                    Today's Lightning Strikes
                                </h3>

                                {pendingPicks.length === 0 && (
                                    <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '1rem', border: '1px dashed rgba(255, 255, 255, 0.1)' }}>
                                        <p style={{ color: '#94a3b8' }}>Scanning for high-value edges...</p>
                                    </div>
                                )}

                                {pendingPicks.map((pick: PrismaPick) => (
                                    <div key={pick.id} className={styles.pickCard}>
                                        <div className={styles.pickHeader}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>NBA</span>
                                                <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '500' }}>Tonight</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#facc15' }}>
                                                <Zap size={14} fill="#facc15" />
                                                <span style={{ fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top Value</span>
                                            </div>
                                        </div>

                                        <div className={styles.pickContent}>
                                            <div className={styles.pickRow}>
                                                <div>
                                                    <div className={styles.teamName}>{pick.pickDetails}</div>
                                                    <p style={{ fontSize: '0.875rem', color: '#94a3b8', fontWeight: '500', margin: 0 }}>{pick.matchup}</p>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '9999px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                                        <Activity size={18} color="#60a5fa" />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'white' }}>{pick.edge}% Edge Detected</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                                            {(() => {
                                                                const match = pick.pickDetails.match(/([+-]?\d+(\.\d+)?)$/);
                                                                if (match) {
                                                                    const marketLine = parseFloat(match[0]);
                                                                    const edgePoints = (pick.edge || 0) / 2;
                                                                    const modelLine = (marketLine - edgePoints).toFixed(1);
                                                                    const modelLineStr = parseFloat(modelLine) > 0 ? `+${modelLine}` : modelLine;
                                                                    return (
                                                                        <span style={{ display: 'flex', gap: '0.5rem' }}>
                                                                            <span>Vegas: <span style={{ color: '#white', fontWeight: 'bold' }}>{match[0]}</span></span>
                                                                            <span>Model: <span style={{ color: '#facc15', fontWeight: 'bold' }}>{modelLineStr}</span></span>
                                                                        </span>
                                                                    );
                                                                }
                                                                return null;
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.125rem' }}>Odds</span>
                                                    <span style={{ fontSize: '1.5rem', fontWeight: '900', color: '#facc15', lineHeight: 1 }}>{pick.odds > 0 ? '+' + pick.odds : pick.odds}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Recent History */}
                            <div className={styles.historySection}>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <TrendingUp size={18} color="#4ade80" /> Recent History
                                </h3>

                                <div>
                                    {historyPicks.map((record: PrismaPick) => (
                                        <div key={record.id} className={styles.historyRow}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', color: 'white' }}>{record.pickDetails}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {record.matchDate.toLocaleDateString()} • <span style={{ color: '#60a5fa', fontWeight: '600' }}>{record.edge}% Edge</span>
                                                </div>
                                            </div>
                                            <div style={{ fontFamily: 'monospace', fontWeight: 'bold', color: record.status === 'WIN' ? '#4ade80' : '#f87171' }}>
                                                {record.status === 'WIN' ? '+' : ''}{record.profit?.toFixed(2)}u
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}
