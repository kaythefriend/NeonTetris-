import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyUsdcTransfer } from '@/lib/wallet/verifyTx';
import { claimTxHash, createGameSession, getOrCreatePlayer } from '@/lib/db/db';
import { GAME_FEE_USDC, TREASURY_ADDRESS } from '@/lib/wallet/usdc';

const bodySchema = z.object({
  fid: z.number(),
  username: z.string().optional(),
  displayName: z.string().optional(),
  pfpUrl: z.string().optional(),
  walletAddress: z.string(),
  txHash: z.string(),
});

/**
 * Called right after the client submits the 0.1 USDC "pay to play"
 * transaction. Verifies the on-chain transfer went to the treasury for at
 * least the required amount before unlocking a play session.
 */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { fid, username, displayName, pfpUrl, walletAddress, txHash } = parsed.data;

  const verification = await verifyUsdcTransfer({
    txHash,
    from: walletAddress,
    to: TREASURY_ADDRESS,
    minAmountUsdc: GAME_FEE_USDC,
  });

  if (!verification.ok) {
    return NextResponse.json({ error: verification.reason }, { status: 402 });
  }

  // Prevent this same payment tx from being replayed to unlock more than
  // one game (or reused against /api/tip or /api/duel/*).
  const claimed = await claimTxHash(txHash, `game:${fid}`);
  if (!claimed) {
    return NextResponse.json({ error: 'This transaction has already been used' }, { status: 409 });
  }

  const player = await getOrCreatePlayer(fid, { username, displayName, pfpUrl, walletAddress });
  await createGameSession(fid, txHash);

  return NextResponse.json({ ok: true, sessionToken: txHash, player });
}
