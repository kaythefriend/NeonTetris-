'use client';

import { usePayToPlay } from '@/hooks/usePayToPlay';
import { FarcasterUser } from '@/lib/farcaster/sdk';

interface PayToPlayModalProps {
  open: boolean;
  user: FarcasterUser | null;
  onClose: () => void;
  onUnlocked: (txHash: string) => void;
}

export function PayToPlayModal({ open, user, onClose, onUnlocked }: PayToPlayModalProps) {
  const { payToPlay, status, error, feeUsdc, reset } = usePayToPlay();

  if (!open) return null;

  const handlePlay = async () => {
    if (!user) return;
    const hash = await payToPlay(user.fid, {
      username: user.username,
      displayName: user.displayName,
      pfpUrl: user.pfpUrl,
    });
    if (hash) onUnlocked(hash);
  };

  const close = () => {
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-xl border border-neon-cyan/40 bg-panel p-6 shadow-neon-sm">
        <h2 className="font-display text-xl text-neon-cyan animate-flicker">Pay to Play</h2>
        <p className="mt-2 text-sm text-white/70">
          Each game costs <span className="text-neon-yellow">{feeUsdc} USDC</span>, charged
          directly from your Farcaster wallet on Base. Win big, climb the leaderboard, and
          challenge friends to duels.
        </p>

        <div className="mt-4 rounded-md border border-white/10 bg-black/40 p-3 text-xs text-white/60">
          {status === 'idle' && 'Ready when you are.'}
          {status === 'awaiting-signature' && 'Confirm the 0.1 USDC payment in your wallet…'}
          {status === 'confirming' && 'Waiting for the transaction to confirm on Base…'}
          {status === 'verifying' && 'Verifying payment…'}
          {status === 'unlocked' && 'Payment confirmed! Starting game…'}
          {status === 'error' && <span className="text-neon-red">{error}</span>}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={close}
            className="flex-1 rounded-md border border-white/20 py-2 text-sm text-white/70 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={handlePlay}
            disabled={status === 'awaiting-signature' || status === 'confirming' || status === 'verifying'}
            className="flex-1 rounded-md border border-neon-magenta bg-neon-magenta/10 py-2 text-sm font-display text-neon-magenta shadow-neon-sm hover:bg-neon-magenta/20 disabled:opacity-50"
          >
            Pay {feeUsdc} USDC
          </button>
        </div>
      </div>
    </div>
  );
}
