'use client';

import { useCallback, useState } from 'react';
import { useAccount, useSendTransaction } from 'wagmi';
import { encodeFunctionData } from 'viem';
import { ERC20_ABI, USDC_ADDRESS, usdcToBaseUnits } from '@/lib/wallet/usdc';

export function useTip() {
  const { address } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendTip = useCallback(
    async (input: {
      fromFid: number;
      toFid: number;
      toWallet: string;
      amountUsdc: number;
      message?: string;
    }) => {
      if (!address) {
        setError('Connect your wallet first.');
        return false;
      }
      try {
        setSending(true);
        setError(null);

        const data = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [input.toWallet as `0x${string}`, usdcToBaseUnits(input.amountUsdc)],
        });
        const txHash = await sendTransactionAsync({ to: USDC_ADDRESS, data });

        const res = await fetch('/api/tip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromFid: input.fromFid,
            toFid: input.toFid,
            fromWallet: address,
            toWallet: input.toWallet,
            amountUsdc: input.amountUsdc,
            txHash,
            message: input.message,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? 'Tip failed to record');
        }
        return true;
      } catch (err: any) {
        setError(err?.shortMessage ?? err?.message ?? 'Tip failed');
        return false;
      } finally {
        setSending(false);
      }
    },
    [address, sendTransactionAsync]
  );

  return { sendTip, sending, error };
}
