'use client';

import { useCallback, useState } from 'react';
import { useAccount, useSendTransaction } from 'wagmi';
import { encodeFunctionData } from 'viem';
import { ERC20_ABI, TREASURY_ADDRESS, USDC_ADDRESS, usdcToBaseUnits } from '@/lib/wallet/usdc';

/** Handles staking USDC into escrow to create or accept a duel. */
export function useDuel() {
  const { address } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stake = useCallback(
    async (amountUsdc: number) => {
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [TREASURY_ADDRESS, usdcToBaseUnits(amountUsdc)],
      });
      return sendTransactionAsync({ to: USDC_ADDRESS, data });
    },
    [sendTransactionAsync]
  );

  const createDuel = useCallback(
    async (input: { challengerFid: number; opponentFid: number; wagerUsdc: number }) => {
      if (!address) return null;
      try {
        setBusy(true);
        setError(null);
        const txHash = await stake(input.wagerUsdc);
        const res = await fetch('/api/duel/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            challengerFid: input.challengerFid,
            opponentFid: input.opponentFid,
            challengerWallet: address,
            wagerUsdc: input.wagerUsdc,
            txHash,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to create duel');
        return (await res.json()).duel;
      } catch (err: any) {
        setError(err?.shortMessage ?? err?.message ?? 'Could not create duel');
        return null;
      } finally {
        setBusy(false);
      }
    },
    [address, stake]
  );

  const acceptDuel = useCallback(
    async (duelId: string, wagerUsdc: number) => {
      if (!address) return null;
      try {
        setBusy(true);
        setError(null);
        const txHash = await stake(wagerUsdc);
        const res = await fetch('/api/duel/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ duelId, opponentWallet: address, wagerUsdc, txHash }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to accept duel');
        return (await res.json()).duel;
      } catch (err: any) {
        setError(err?.shortMessage ?? err?.message ?? 'Could not accept duel');
        return null;
      } finally {
        setBusy(false);
      }
    },
    [address, stake]
  );

  const submitScore = useCallback(
    async (duelId: string, fid: number, score: number, txHash: string) => {
      // txHash must be the stake tx this fid submitted for this duel (the
      // hash returned by createDuel/acceptDuel above) — the API uses it to
      // verify this submission belongs to a real participant.
      const res = await fetch('/api/duel/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duelId, fid, score, txHash }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to submit duel score');
      return (await res.json()).duel;
    },
    []
  );

  return { createDuel, acceptDuel, submitScore, busy, error };
}
