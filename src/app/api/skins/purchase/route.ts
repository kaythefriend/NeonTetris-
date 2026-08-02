import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { claimTxHash, unlockSkin } from '@/lib/db/db';
import { verifyUsdcTransfer } from '@/lib/wallet/verifyTx';
import { SKIN_PRICE_USDC, TREASURY_ADDRESS } from '@/lib/wallet/usdc';
import { SKINS } from '@/lib/skins';

const bodySchema = z.object({
  fid: z.number(),
  skinId: z.string(),
  walletAddress: z.string(),
  txHash: z.string(),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { fid, skinId, walletAddress, txHash } = parsed.data;

  const skin = SKINS.find((s) => s.id === skinId);
  if (!skin) {
    return NextResponse.json({ error: 'Unknown skin' }, { status: 404 });
  }
  if (skin.unlock === 'default') {
    return NextResponse.json({ error: 'This skin is already free' }, { status: 400 });
  }

  const verification = await verifyUsdcTransfer({
    txHash,
    from: walletAddress,
    to: TREASURY_ADDRESS,
    minAmountUsdc: SKIN_PRICE_USDC,
  });
  if (!verification.ok) {
    return NextResponse.json({ error: verification.reason }, { status: 402 });
  }

  const claimed = await claimTxHash(txHash, `skin:${fid}:${skinId}`);
  if (!claimed) {
    return NextResponse.json({ error: 'This transaction has already been used' }, { status: 409 });
  }

  const player = await unlockSkin(fid, skinId);
  return NextResponse.json({ ok: true, player });
}
