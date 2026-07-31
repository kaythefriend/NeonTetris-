'use client';

import { useCallback, useState } from 'react';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { encodeFunctionData } from 'viem';
import { ERC20_ABI, GAME_FEE_BASE_UNITS, GAME_FEE_USDC, TREASURY_ADDRESS, USDC_ADDRESS } from '@/lib/wallet/usdc';

export type PayToPlayStatus = 'idle' | 'awaiting-signature' | 'confirming' | 'verifying' | 'unlocked' | 'error';

/**
 * Drives the "Play" button flow:
 *  1. User taps Play -> wallet prompts to send 0.1 USDC to the treasury.
 *  2. Wait for the tx to confirm on Base.
 *  3. POST the tx hash to /api/game/start, which independently re-verifies
 *     the transfer on-chain before unlocking a session.
 */
export function usePayToPlay() {
  const { address } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const [status, setStatus] = useState<PayToPlayStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const { data: receipt } = useWaitForTransactionReceipt({ hash: txHash ?? undefined });

  const payToPlay = useCallback(
    async (fid: number, profile: { username?: string; displayName?: string; pfpUrl?: string }) => {
      if (!address) {
        setError('Connect your Farcaster wallet first.');
        setStatus('error');
        return null;
      }
      try {
        setError(null);
        setStatus('awaiting-signature');

        const data = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [TREASURY_ADDRESS, GAME_FEE_BASE_UNITS],
        });

        const hash = await sendTransactionAsync({ to: USDC_ADDRESS, data });
        setTxHash(hash);
        setStatus('confirming');

        setStatus('verifying');
        const res = await fetch('/api/game/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fid,
            username: profile.username,
            displayName: profile.displayName,
            pfpUrl: profile.pfpUrl,
            walletAddress: address,
            txHash: hash,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? 'Payment verification failed');
        }

        setStatus('unlocked');
        return hash;
      } catch (err: any) {
        setError(err?.shortMessage ?? err?.message ?? 'Payment failed');
        setStatus('error');
        return null;
      }
    },
    [address, sendTransactionAsync]
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setTxHash(null);
  }, []);

  return { payToPlay, status, error, txHash, receipt, feeUsdc: GAME_FEE_USDC, reset };
}
