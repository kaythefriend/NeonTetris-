'use client';

import { useCallback, useState } from 'react';
import { useAccount, useSendTransaction } from 'wagmi';
import { encodeFunctionData } from 'viem';
import { ERC20_ABI, SKIN_PRICE_BASE_UNITS, SKIN_PRICE_USDC, TREASURY_ADDRESS, USDC_ADDRESS } from '@/lib/wallet/usdc';

export type SkinPurchaseStatus = 'idle' | 'awaiting-signature' | 'verifying' | 'unlocked' | 'error';

export function useSkinPurchase() {
  const { address } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const [status, setStatus] = useState<SkinPurchaseStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const purchaseSkin = useCallback(
    async (fid: number, skinId: string) => {
      if (!address) {
        setError('Connect your Farcaster wallet first.');
        setStatus('error');
        return false;
      }
      try {
        setError(null);
        setStatus('awaiting-signature');

        const data = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [TREASURY_ADDRESS, SKIN_PRICE_BASE_UNITS],
        });
        const txHash = await sendTransactionAsync({ to: USDC_ADDRESS, data });

        setStatus('verifying');
        const res = await fetch('/api/skins/purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fid, skinId, walletAddress: address, txHash }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? 'Purchase verification failed');
        }

        setStatus('unlocked');
        return true;
      } catch (err: any) {
        setError(err?.shortMessage ?? err?.message ?? 'Purchase failed');
        setStatus('error');
        return false;
      }
    },
    [address, sendTransactionAsync]
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return { purchaseSkin, status, error, priceUsdc: SKIN_PRICE_USDC, reset };
}
