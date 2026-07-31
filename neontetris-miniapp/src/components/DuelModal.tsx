'use client';

import { useState } from 'react';
import { useDuel } from '@/hooks/useDuel';
import { LeaderboardEntry } from './Leaderboard';

interface DuelModalProps {
  target: LeaderboardEntry | null;
  fromFid?: number;
  onClose: () => void;
  onCreated: (duel: any) => void;
}

const WAGER_PRESETS = [0.5, 1, 5, 10];

export function DuelModal({ target, fromFid, onClose, onCreated }: DuelModalProps) {
  const [wager, setWager] = useState(1);
  const { createDuel, busy, error } = useDuel();

  if (!target || !fromFid) return null;

  const handleChallenge = async () => {
    const duel = await createDuel({ challengerFid: fromFid, opponentFid: target.fid, wagerUsdc: wager });
    if (duel) onCreated(duel);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-xl border border-neon-magenta/40 bg-panel p-6 shadow-neon-sm">
        <h2 className="font-display text-xl text-neon-magenta">Duel {target.displayName}</h2>
        <p className="mt-1 text-xs text-white/50">
          Both players stake the wager in USDC. Highest score after one game wins the pot
          (minus a small house fee — see README).
        </p>

        <div className="mt-4 flex gap-2">
          {WAGER_PRESETS.map((v) => (
            <button
              key={v}
              onClick={() => setWager(v)}
              className={`flex-1 rounded-md border py-2 text-sm font-display ${
                wager === v ? 'border-neon-magenta text-neon-magenta shadow-neon-sm' : 'border-white/15 text-white/60'
              }`}
            >
              ${v}
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-md border border-white/10 bg-black/30 p-2 text-xs text-white/60">
          Pot: <span className="text-neon-yellow">${(wager * 2).toFixed(2)} USDC</span>
        </div>

        {error && <p className="mt-2 text-xs text-neon-red">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-md border border-white/20 py-2 text-sm text-white/70">
            Close
          </button>
          <button
            onClick={handleChallenge}
            disabled={busy}
            className="flex-1 rounded-md border border-neon-magenta bg-neon-magenta/10 py-2 text-sm font-display text-neon-magenta disabled:opacity-50"
          >
            {busy ? 'Staking…' : `Stake $${wager}`}
          </button>
        </div>
      </div>
    </div>
  );
}
