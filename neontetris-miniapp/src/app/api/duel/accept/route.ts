import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { acceptDuel, claimTxHash } from '@/lib/db/db';
import { verifyUsdcTransfer } from '@/lib/wallet/verifyTx';
import { TREASURY_ADDRESS } from '@/lib/wallet/usdc';

const bodySchema = z.object({
  duelId: z.string(),
  opponentWallet: z.string(),
  wagerUsdc: z.number().min(0.1),
  txHash: z.string(),
});

/** Opponent matches the wager into escrow, flipping the duel to in_progress. */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { duelId, opponentWallet, wagerUsdc, txHash } = parsed.data;

  const verification = await verifyUsdcTransfer({
    txHash,
    from: opponentWallet,
    to: TREASURY_ADDRESS,
    minAmountUsdc: wagerUsdc,
  });
  if (!verification.ok) {
    return NextResponse.json({ error: verification.reason }, { status: 402 });
  }

  const claimed = await claimTxHash(txHash, `duel-accept:${duelId}`);
  if (!claimed) {
    return NextResponse.json({ error: 'This transaction has already been used' }, { status: 409 });
  }

  const duel = await acceptDuel(duelId, txHash, opponentWallet);
  return NextResponse.json({ ok: true, duel });
}
