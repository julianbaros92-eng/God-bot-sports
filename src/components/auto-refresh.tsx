'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Pause, RefreshCw } from 'lucide-react';

export function AutoRefresh({ intervalMinutes = 5 }: { intervalMinutes?: number }) {
    const router = useRouter();
    const [timeLeft, setTimeLeft] = useState(intervalMinutes * 60);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (isPaused) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timer);
    }, [isPaused]);

    useEffect(() => {
        if (timeLeft === 0) {
            router.refresh();
            setTimeLeft(intervalMinutes * 60);
        }
    }, [timeLeft, intervalMinutes, router]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] p-2 rounded-lg shadow-2xl z-50 text-xs font-mono">
            <div className="flex items-center gap-2 px-2">
                <RefreshCw size={12} className={timeLeft < 60 ? "animate-spin text-[var(--primary)]" : "text-[var(--text-muted)]"} />
                <span className="text-[var(--text-muted)]">Next Scan:</span>
                <span className="text-white font-bold w-10">{formatTime(timeLeft)}</span>
            </div>
            <button
                onClick={() => setIsPaused(!isPaused)}
                className={`p-1.5 rounded hover:bg-white/10 ${isPaused ? 'text-yellow-400' : 'text-green-400'}`}
                title={isPaused ? "Resume Auto-Scan" : "Pause Auto-Scan"}
            >
                {isPaused ? <Play size={14} /> : <Pause size={14} />}
            </button>
        </div>
    );
}
