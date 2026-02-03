import { Zap, Crown, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import styles from './page.module.css';
import { getBotStats } from '@/app/actions/get-home-stats';

const GODS = [
  {
    id: 'zeus',
    name: 'ZEUS',
    title: 'The Thunder God',
    description: 'A situational specialist. Targets Point Spreads by weighing schedule rest advantages, player availability, and home court impact.',
    gradient: 'linear-gradient(to right, #3b82f6, #facc15)',
    icon: '/zeus-realist.png',
    stats: { winRate: '0%', profit: '$0', type: 'NBA Spreads' },
    link: '/zeus',
    active: true,
    btnGradient: 'linear-gradient(to right, #3b82f6, #eab308)'
  },
  {
    id: 'loki',
    name: 'LOKI',
    title: 'The Trickster',
    description: 'Finds value in chaos. Specializes in Underdog Moneylines and identifying trap games where the public is wrong.',
    gradient: 'linear-gradient(to right, #22c55e, #047857)',
    icon: '/loki-new.png',
    stats: { winRate: '0%', profit: '$0', type: 'NBA Moneyline' },
    link: '/loki',
    active: true,
    btnGradient: 'linear-gradient(to right, #4ade80, #059669)'
  },
  {
    id: 'shiva',
    name: 'SHIVA',
    title: 'The Destroyer',
    description: 'Specializes in Totals (Over/Under). Destroys inefficiencies by analyzing Pace, Efficiency, and Scoring trends.',
    gradient: 'linear-gradient(to right, #a855f7, #db2777)',
    icon: '/shiva-realist.png',
    stats: { winRate: '0%', profit: '$0', type: 'NBA Totals' },
    link: '/shiva',
    active: true,
    btnGradient: 'linear-gradient(to right, #c084fc, #db2777)'
  }
];

export default async function Home() {
  const botStats = await getBotStats();
  return (
    <div className={styles.container}>
      {/* Background Ambience */}
      <div className={styles.backgroundEffects}>
        <div className={styles.blobBlue}></div>
        <div className={styles.blobPurple}></div>
      </div>

      {/* Header */}
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoText}>GodBot<span style={{ color: '#eab308' }}>Sports</span></span>
        </Link>
        <nav className={styles.nav}>
          <Link href="/" className={`${styles.navLink} ${styles.navLinkActive}`}>Home</Link>
          <Link href="/zeus" className={styles.navLink}>Zeus</Link>
          <Link href="/loki" className={styles.navLink}>Loki</Link>
          <Link href="/shiva" className={styles.navLink}>Shiva</Link>
        </nav>
      </header>

      <div className={styles.main}>

        {/* Hero Section */}
        <div className={styles.heroHeader}>
          <div className={styles.heroIcon}>
            <Zap size={28} color="black" fill="black" strokeWidth={3} />
          </div>
          <h1 className={styles.heroTitle}>
            GODBOT<span style={{ background: 'linear-gradient(to right, #facc15, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SPORTS</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Choose your deity. Align your strategy. Beat the books with divine intelligence.
          </p>
        </div>

        {/* Gods Grid */}
        <div className={styles.godGrid}>
          {GODS.map((god) => {
            const stats = botStats[god.name] || { profit: 0, winRate: '0%' };
            const profitVal = stats.profit;
            const profitStr = (profitVal > 0 ? '+' : '') + profitVal.toFixed(2) + 'u';
            const profitColor = profitVal >= 0 ? '#4ade80' : '#f87171';

            return (
              <div key={god.id} className={`${styles.godCard} ${!god.active ? styles.godCardDisabled : ''}`}>

                {/* Icon */}
                <div className={styles.godImageContainer}>
                  {god.icon ? (
                    <img src={god.icon} alt={god.name} className={styles.godImage} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: god.gradient, opacity: 0.2 }}>
                      <Crown color="white" size={32} />
                    </div>
                  )}
                </div>

                <h2 className={styles.godName}>{god.name}</h2>
                <p className={styles.godTitle} style={{ backgroundImage: god.gradient }}>
                  {god.title}
                </p>

                <p className={styles.godDesc}>
                  {god.description}
                </p>

                {/* Mini Stats */}
                <div className={styles.miniStats}>
                  <div className={styles.statBlock}>
                    <span className={styles.miniStatLabel}>Strategy</span>
                    <span className={styles.miniStatValue}>{god.stats.type}</span>
                  </div>
                  <div className={`${styles.statBlock} ${styles.statBlockBorder}`}>
                    <span className={styles.miniStatLabel}>Win Rate</span>
                    <span className={styles.miniStatValue}>{stats.winRate}</span>
                  </div>
                  <div className={`${styles.statBlock} ${styles.statBlockBorder}`}>
                    <span className={styles.miniStatLabel}>Profit (30d)</span>
                    <span className={styles.miniStatValue} style={{ color: profitColor }}>{profitStr}</span>
                  </div>
                </div>

                {god.active ? (
                  <Link href={god.link} className={styles.enterBtn} style={{ background: god.btnGradient }}>
                    Enter Domain <ArrowRight size={18} />
                  </Link>
                ) : (
                  <button disabled className={styles.enterBtn} style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b', cursor: 'not-allowed' }}>
                    Summoning...
                  </button>
                )}
              </div>
            )
          })}
        </div>

      </div>
    </div>
  );
}
