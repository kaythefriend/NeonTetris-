'use client';

import { useEffect, useState } from 'react';

export interface LeaderboardEntry {
  rank: number;
  fid: number;
  username: string;
  displayName: string;
  pfpUrl?: string;
  bestScore: number;
  totalLines: number;
  gamesPlayed: number;
  duelWins: number;
  duelLosses: number;
  totalTipsReceivedUsdc: number;
}

interface LeaderboardProps {
  currentFid?: number;
  onTip: (entry: LeaderboardEntry) => void;
  onDuel: (entry: LeaderboardEntry) => void;
}

export function Leaderboard({ currentFid, onTip, onDuel }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/leaderboard')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setEntries(data.leaderboard ?? []);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-xl border border-neon-cyan/30 bg-panel/60 p-4">
      <h2 className="font-display text-lg text-neon-cyan mb-3">🏆 Leaderboard</h2>
      {loading && <div className="text-sm text-white/50">Loading scores…</div>}
      {!loading && entries.length === 0 && (
        <div className="text-sm text-white/50">No games played yet. Be the first!</div>
      )}
      <div className="flex flex-col gap-1">
        {entries.map((e) => (
          <div
            key={e.fid}
            className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm ${
              e.fid === currentFid ? 'bg-neon-cyan/10 border border-neon-cyan/30' : 'hover:bg-white/5'
            }`}
          >
            <span className="w-6 text-center font-display text-white/50">{e.rank}</span>
            {e.pfpUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.pfpUrl} alt="" className="h-7 w-7 rounded-full border border-white/20" />
            ) : (
              <div className="h-7 w-7 rounded-full bg-white/10" />
            )}
            <div className="flex-1 min-w-0">
              <div className="truncate text-white/90">{e.displayName}</div>
              <div className="truncate text-[10px] text-white/40">@{e.username}</div>
            </div>
            <div className="text-right">
              <div className="font-display text-neon-yellow">{e.bestScore.toLocaleString()}</div>
              <div className="text-[10px] text-white/40">{e.duelWins}W-{e.duelLosses}L</div>
            </div>
            {e.fid !== currentFid && (
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => onTip(e)}
                  className="rounded border border-neon-green/40 px-2 py-0.5 text-[10px] text-neon-green hover:bg-neon-green/10"
                >
                  Tip
                </button>
                <button
                  onClick={() => onDuel(e)}
                  className="rounded border border-neon-magenta/40 px-2 py-0.5 text-[10px] text-neon-magenta hover:bg-neon-magenta/10"
                >
                  Duel
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
