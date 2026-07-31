import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { claimTxHash, createDuel } from '@/lib/db/db';
import { verifyUsdcTransfer } from '@/lib/wallet/verifyTx';
import { TREASURY_ADDRESS } from '@/lib/wallet/usdc';

const bodySchema = z.object({
  challengerFid: z.number(),
  opponentFid: z.number(),
  challengerWallet: z.string(),
  wagerUsdc: z.number().min(0.1),
  txHash: z.string(),
});

/**
 * Challenger stakes their wager into the treasury escrow wallet, then this
 * creates a pending duel that the opponent can accept via /api/duel/accept.
 */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { challengerFid, opponentFid, challengerWallet, wagerUsdc, txHash } = parsed.data;

  const verification = await verifyUsdcTransfer({
    txHash,
    from: challengerWallet,
    to: TREASURY_ADDRESS,
    minAmountUsdc: wagerUsdc,
  });
  if (!verification.ok) {
    return NextResponse.json({ error: verification.reason }, { status: 402 });
  }

  const claimed = await claimTxHash(txHash, `duel-create:${challengerFid}`);
  if (!claimed) {
    return NextResponse.json({ error: 'This transaction has already been used' }, { status: 409 });
  }

  const duel = await createDuel({
    challengerFid,
    opponentFid,
    wagerUsdc,
    challengerTxHash: txHash,
  });
  return NextResponse.json({ ok: true, duel });
}
