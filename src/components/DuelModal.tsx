'use client';

import { useState } from 'react';
import { useDuel } from '@/hooks/useDuel';
import { shareDuelChallenge } from '@/lib/farcaster/sdk';
import { LeaderboardEntry } from './Leaderboard';

interface DuelOpponent {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl?: string;
}

interface DuelModalProps {
  /** true opens the modal even with no preset target (friend-search flow). */
  open: boolean;
  /** Optional preset opponent, e.g. from tapping "Duel" on a leaderboard row. */
  target: LeaderboardEntry | null;
  fromFid?: number;
  onClose: () => void;
  onCreated: (duel: any) => void;
}

const WAGER_PRESETS = [0.5, 1, 5, 10];

export function DuelModal({ open, target, fromFid, onClose, onCreated }: DuelModalProps) {
  const [wager, setWager] = useState(1);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DuelOpponent[]>([]);
  const [searching, setSearching] = useState(false);
  const [opponent, setOpponent] = useState<DuelOpponent | null>(target);
  const [created, setCreated] = useState<{ duel: any; opponentUsername: string } | null>(null);
  const { createDuel, busy, error } = useDuel();

  if (!open || !fromFid) return null;

  const effectiveOpponent = opponent ?? (target as DuelOpponent | null);

  const runSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 1) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      const body = await res.json();
      setResults(body.users ?? []);
    } finally {
      setSearching(false);
    }
  };

  const handleChallenge = async () => {
    if (!effectiveOpponent) return;
    const duel = await createDuel({
      challengerFid: fromFid,
      opponentFid: effectiveOpponent.fid,
      wagerUsdc: wager,
    });
    if (duel) {
      setCreated({ duel, opponentUsername: effectiveOpponent.username });
      onCreated(duel);
    }
  };

  const close = () => {
    setOpponent(null);
    setQuery('');
    setResults([]);
    setCreated(null);
    onClose();
  };

  // Post-creation: offer to share the challenge as a cast, tagging the opponent.
  if (created) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div className="w-full max-w-sm rounded-xl border border-neon-magenta/40 bg-panel p-6 shadow-neon-sm">
          <h2 className="font-display text-xl text-neon-magenta">Challenge sent!</h2>
          <p className="mt-2 text-sm text-white/70">
            @{created.opponentUsername} will see this if they've saved NeonTetris. Want to call
            them out publicly too?
          </p>
          <div className="mt-5 flex gap-3">
            <button onClick={close} className="flex-1 rounded-md border border-white/20 py-2 text-sm text-white/70">
              Skip
            </button>
            <button
              onClick={async () => {
                await shareDuelChallenge(created.opponentUsername, wager, created.duel.id);
                close();
              }}
              className="flex-1 rounded-md border border-neon-cyan bg-neon-cyan/10 py-2 text-sm font-display text-neon-cyan"
            >
              Share Cast
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-xl border border-neon-magenta/40 bg-panel p-6 shadow-neon-sm">
        <h2 className="font-display text-xl text-neon-magenta">
          {effectiveOpponent ? `Duel ${effectiveOpponent.displayName}` : 'New Challenge'}
        </h2>
        <p className="mt-1 text-xs text-white/50">
          Both players stake the wager in USDC. Highest score after one game wins the whole pot —
          paid out automatically the moment the duel resolves.
        </p>

        {!target && !opponent && (
          <div className="mt-4">
            <input
              value={query}
              onChange={(e) => runSearch(e.target.value)}
              placeholder="Search Farcaster username…"
              className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-neon-cyan focus:outline-none"
            />
            {searching && <p className="mt-2 text-xs text-white/40">Searching…</p>}
            {results.length > 0 && (
              <div className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto">
                {results.map((u) => (
                  <button
                    key={u.fid}
                    onClick={() => setOpponent(u)}
                    className="flex items-center gap-2 rounded-md border border-white/10 p-2 text-left text-sm hover:bg-white/5"
                  >
                    {u.pfpUrl && <img src={u.pfpUrl} alt="" className="h-6 w-6 rounded-full" />}
                    <div>
                      <div className="text-white">{u.displayName}</div>
                      <div className="text-xs text-white/40">@{u.username}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {effectiveOpponent && (
          <>
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
              Winner receives: <span className="text-neon-yellow">${(wager * 2).toFixed(2)} USDC</span>
            </div>
          </>
        )}

        {error && <p className="mt-2 text-xs text-neon-red">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button onClick={close} className="flex-1 rounded-md border border-white/20 py-2 text-sm text-white/70">
            Close
          </button>
          <button
            onClick={handleChallenge}
            disabled={busy || !effectiveOpponent}
            className="flex-1 rounded-md border border-neon-magenta bg-neon-magenta/10 py-2 text-sm font-display text-neon-magenta disabled:opacity-50"
          >
            {busy ? 'Staking…' : `Stake $${wager}`}
          </button>
        </div>
      </div>
    </div>
  );
}
