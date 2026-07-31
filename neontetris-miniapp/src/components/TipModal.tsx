'use client';

import { useState } from 'react';
import { useTip } from '@/hooks/useTip';
import { LeaderboardEntry } from './Leaderboard';

interface TipModalProps {
  target: LeaderboardEntry | null;
  fromFid?: number;
  onClose: () => void;
}

const PRESET_AMOUNTS = [0.25, 1, 5];

export function TipModal({ target, fromFid, onClose }: TipModalProps) {
  const [amount, setAmount] = useState(1);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const { sendTip, sending, error } = useTip();

  if (!target || !fromFid) return null;

  // NOTE: in production, resolve the recipient's connected wallet address
  // via the Farcaster API (verified addresses) rather than assuming it's
  // present on the leaderboard entry — this is left as a clear extension
  // point (see README "Wiring up real player wallet addresses").
  const toWallet = (target as any).walletAddress as string | undefined;

  const handleSend = async () => {
    if (!toWallet) return;
    const ok = await sendTip({ fromFid, toFid: target.fid, toWallet, amountUsdc: amount, message });
    if (ok) setSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-xl border border-neon-green/40 bg-panel p-6 shadow-neon-sm">
        <h2 className="font-display text-xl text-neon-green">Tip {target.displayName}</h2>
        <p className="mt-1 text-xs text-white/50">Sent instantly as USDC on Base.</p>

        {!toWallet && (
          <p className="mt-3 text-xs text-neon-yellow">
            This player hasn't linked a payable wallet address yet.
          </p>
        )}

        <div className="mt-4 flex gap-2">
          {PRESET_AMOUNTS.map((v) => (
            <button
              key={v}
              onClick={() => setAmount(v)}
              className={`flex-1 rounded-md border py-2 text-sm font-display ${
                amount === v ? 'border-neon-green text-neon-green shadow-neon-sm' : 'border-white/15 text-white/60'
              }`}
            >
              ${v}
            </button>
          ))}
        </div>

        <input
          type="number"
          min={0.01}
          step={0.01}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="mt-2 w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
        />

        <textarea
          placeholder="Add a message (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={280}
          className="mt-2 w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
          rows={2}
        />

        {error && <p className="mt-2 text-xs text-neon-red">{error}</p>}
        {sent && <p className="mt-2 text-xs text-neon-green">Tip sent! 🎉</p>}

        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-md border border-white/20 py-2 text-sm text-white/70">
            Close
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !toWallet}
            className="flex-1 rounded-md border border-neon-green bg-neon-green/10 py-2 text-sm font-display text-neon-green disabled:opacity-50"
          >
            {sending ? 'Sending…' : `Send $${amount}`}
          </button>
        </div>
      </div>
    </div>
  );
}
