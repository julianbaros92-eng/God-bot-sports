
import Link from 'next/link';
import { db } from '../../lib/db';
import { Pick as PrismaPick } from '@prisma/client';
import styles from './loki.module.css';
import {
    Zap,
    Trophy,
    Activity,
    TrendingUp,
    Calendar,
    Filter,
    ArrowRight,
    Skull
} from 'lucide-react';
import ProfitChart from '../../components/profit-chart';

export const dynamic = 'force-dynamic';

export default async function LokiPage() {
    // 1. Fetch Picks
    let picks: any[] = [];
    try {
        picks = await db.pick.findMany({
            where: { bot: 'LOKI' },
            orderBy: { matchDate: 'desc' }
        });
    } catch (e) {
        console.warn("DB Fetch Failed (Expected during Vercel Build if using SQLite):", e);
        picks = [];
    }

    const pendingPicks = picks
        .filter((p: PrismaPick) => p.status === 'PENDING')
        .sort((a: PrismaPick, b: PrismaPick) => b.edge - a.edge);
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

    // ROI
    const investment = completedCount * 1.0; // Assume 1u per bet
    const roi = investment > 0 ? ((profit / investment) * 100).toFixed(1) : '0.0';

    // Chart Data
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

    return (
        <div className={styles.container}>
            {/* Left Panel: Loki Image */}
            <aside className={styles.leftPanel}>
                <img
                    src="/loki-new.png"
                    alt="Loki Bot"
                />
                <div className={styles.overlay}></div>
            </aside>

            {/* Right Panel: Data & Content */}
            <main className={styles.rightPanel}>

                {/* Header */}
                <header className={styles.header}>
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'white' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>GodBot<span style={{ color: '#34d399' }}>Sports</span></span>
                    </Link>
                    <nav style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#94a3b8' }}>
                        <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
                        <Link href="/zeus" style={{ color: 'inherit', textDecoration: 'none' }}>Zeus</Link>
                        <Link href="/loki" style={{ color: '#34d399', fontWeight: 'bold', textDecoration: 'none' }}>Loki</Link>
                        <Link href="/shiva" style={{ color: 'inherit', textDecoration: 'none' }}>Shiva</Link>
                    </nav>
                </header>

                <div className={styles.scrollArea}>
                    <div className={styles.contentWrapper}>

                        {/* Title Section */}
                        <div className={styles.titleSection}>
                            <h1>LOKI</h1>
                            <p>
                                The Trickster finds value in <span style={{ color: '#34d399', fontWeight: '600' }}>Underdog Moneylines</span>. Auto-picks only trigger on a <span style={{ color: '#facc15', fontWeight: 'bold' }}>40%+ Model Win Probability</span>.
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
                                <p className={`${styles.statValue} ${styles.textGreen}`}>
                                    {profit >= 0 ? '+' : ''}{profit.toFixed(2)}u
                                </p>
                            </div>
                            <div className={styles.statCard}>
                                <p className={styles.statLabel}>Avg ROI</p>
                                <p className={`${styles.statValue} ${styles.textEmerald}`}>{parseFloat(roi) > 0 ? '+' : ''}{roi}%</p>
                            </div>
                            <div className={styles.statCard}>
                                <p className={styles.statLabel}>Avg Odds</p>
                                <p className={`${styles.statValue} ${styles.textBlue}`}>+210</p>
                            </div>
                        </div>

                        {/* Chart Section */}
                        <div style={{ marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#94a3b8', marginBottom: '0.5rem' }}>Chaos Theory Curve</h3>
                            <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: '1rem', padding: '1rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                <ProfitChart data={chartData} color="#34d399" />
                            </div>
                        </div>

                        {/* Content Grid (Picks & History) */}
                        <div className={styles.contentGrid}>
                            {/* Picks List */}
                            <div>
                                <h3 className={styles.sectionTitle}>
                                    <div style={{ padding: '0.5rem', background: 'rgba(52, 211, 153, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(52, 211, 153, 0.2)', display: 'flex' }}>
                                        <Skull color="#34d399" size={24} />
                                    </div>
                                    Moneyline Upsets
                                </h3>

                                {/* No Picks Placeholder */}
                                {pendingPicks.length === 0 && (
                                    <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '1rem', border: '1px dashed rgba(255, 255, 255, 0.1)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                                            <Activity size={32} color="#64748b" />
                                        </div>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>No Active Opportunities</h3>
                                        <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0 }}>
                                            Scanning for underdog upsets with &gt;40% win probability...
                                        </p>
                                    </div>
                                )}

                                {pendingPicks.map((pick: PrismaPick) => (
                                    <div key={pick.id} className={styles.pickCard}>
                                        <div className={styles.pickHeader}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ background: 'rgba(52, 211, 153, 0.2)', color: '#6ee7b7', fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', border: '1px solid rgba(52, 211, 153, 0.2)' }}>NBA ML</span>
                                                <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '500' }}>Tonight</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#facc15' }}>
                                                <Zap size={14} fill="#facc15" />
                                                <span style={{ fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Value</span>
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
                                                    <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '9999px', background: 'rgba(52, 211, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                                                        <Activity size={18} color="#34d399" />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'white' }}>{pick.edge}% Edge Detected</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                                            {(() => {
                                                                const odds = pick.odds;
                                                                let impliedProb = 0;
                                                                if (odds > 0) impliedProb = 100 / (odds + 100);
                                                                else impliedProb = Math.abs(odds) / (Math.abs(odds) + 100);

                                                                const impliedPct = (impliedProb * 100).toFixed(1);
                                                                const modelPct = ((impliedProb * 100) + (pick.edge || 0)).toFixed(1);

                                                                return (
                                                                    <span style={{ display: 'flex', gap: '0.5rem' }}>
                                                                        <span>Implied: <span style={{ color: 'white', fontWeight: 'bold' }}>{impliedPct}%</span></span>
                                                                        <span>Model: <span style={{ color: '#facc15', fontWeight: 'bold' }}>{modelPct}%</span></span>
                                                                    </span>
                                                                );
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
                                    <TrendingUp size={18} color="#4ade80" /> Recent Chaos
                                </h3>

                                <div>
                                    {historyPicks.map((record: PrismaPick) => (
                                        <div key={record.id} className={styles.historyRow}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', color: 'white' }}>{record.pickDetails}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {record.matchDate.toLocaleDateString()} • <span style={{ color: '#34d399', fontWeight: '600' }}>{record.edge}% Edge</span>
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
