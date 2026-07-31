'use client';

import { useAccount, useConnect } from 'wagmi';

/**
 * Inside a Farcaster client, the miniapp connector auto-connects the user's
 * Farcaster (Base) wallet — this just shows connection state and offers a
 * manual "Connect" fallback for local/browser testing.
 */
export function WalletStatus() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-neon-cyan/40 bg-panel/60 px-3 py-1 text-xs text-neon-cyan shadow-neon-sm">
        <span className="h-2 w-2 rounded-full bg-neon-cyan shadow-neon" />
        {address.slice(0, 6)}…{address.slice(-4)}
      </div>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: connectors[0] })}
      disabled={isPending}
      className="rounded-full border border-neon-magenta/50 bg-panel/60 px-3 py-1 text-xs text-neon-magenta shadow-neon-sm hover:bg-neon-magenta/10 disabled:opacity-50"
    >
      {isPending ? 'Connecting…' : 'Connect Wallet'}
    </button>
  );
}
