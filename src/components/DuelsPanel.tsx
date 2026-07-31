'use client';

import { useEffect, useState } from 'react';
import { useDuel } from '@/hooks/useDuel';

interface DuelsPanelProps {
  fid?: number;
  onAccepted?: (duel: any) => void;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Awaiting opponent',
  accepted: 'Accepted',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function DuelsPanel({ fid, onAccepted }: DuelsPanelProps) {
  const [duels, setDuels] = useState<any[]>([]);
  const { acceptDuel, busy } = useDuel();

  const refresh = () => {
    if (!fid) return;
    fetch(`/api/duel/list?fid=${fid}`)
      .then((r) => r.json())
      .then((d) => setDuels(d.duels ?? []));
  };

  useEffect(refresh, [fid]);

  if (!fid) return null;

  return (
    <div className="rounded-xl border border-neon-magenta/30 bg-panel/60 p-4">
      <h2 className="font-display text-lg text-neon-magenta mb-3">⚔️ Duels</h2>
      {duels.length === 0 && <div className="text-sm text-white/50">No duels yet. Challenge someone from the leaderboard.</div>}
      <div className="flex flex-col gap-2">
        {duels.map((d) => {
          const isChallenger = d.challengerFid === fid;
          const opponentFid = isChallenger ? d.opponentFid : d.challengerFid;
          const canAccept = d.status === 'pending' && !isChallenger;
          return (
            <div key={d.id} className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2 text-sm">
              <div>
                <div className="text-white/80">vs FID {opponentFid}</div>
                <div className="text-[10px] text-white/40">
                  ${d.wagerUsdc} wager · {STATUS_LABEL[d.status] ?? d.status}
                  {d.winnerFid && (d.winnerFid === fid ? ' · You won! 🎉' : ' · You lost')}
                </div>
              </div>
              {canAccept && (
                <button
                  disabled={busy}
                  onClick={async () => {
                    const accepted = await acceptDuel(d.id, d.wagerUsdc);
                    if (accepted) onAccepted?.(accepted);
                    refresh();
                  }}
                  className="rounded border border-neon-magenta/50 px-2 py-1 text-xs text-neon-magenta hover:bg-neon-magenta/10"
                >
                  Accept
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
