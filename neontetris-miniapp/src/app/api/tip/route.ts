import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { claimTxHash, recordTip } from '@/lib/db/db';
import { verifyUsdcTransfer } from '@/lib/wallet/verifyTx';

const bodySchema = z.object({
  fromFid: z.number(),
  toFid: z.number(),
  fromWallet: z.string(),
  toWallet: z.string(),
  amountUsdc: z.number().min(0.01),
  txHash: z.string(),
  message: z.string().max(280).optional(),
});

/** Records a peer-to-peer USDC tip sent directly wallet-to-wallet (leaderboard tipping). */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { fromFid, toFid, fromWallet, toWallet, amountUsdc, txHash, message } = parsed.data;

  if (fromFid === toFid) {
    return NextResponse.json({ error: 'Cannot tip yourself' }, { status: 400 });
  }

  const verification = await verifyUsdcTransfer({
    txHash,
    from: fromWallet,
    to: toWallet,
    minAmountUsdc: amountUsdc,
  });
  if (!verification.ok) {
    return NextResponse.json({ error: verification.reason }, { status: 402 });
  }

  const claimed = await claimTxHash(txHash, `tip:${fromFid}->${toFid}`);
  if (!claimed) {
    return NextResponse.json({ error: 'This transaction has already been recorded' }, { status: 409 });
  }

  await recordTip({ fromFid, toFid, amountUsdc, txHash, message });
  return NextResponse.json({ ok: true });
}
