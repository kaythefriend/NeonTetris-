import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDuelById, submitDuelScore } from '@/lib/db/db';
import { isScorePlausible } from '@/lib/tetris/antiCheat';

const bodySchema = z.object({
  duelId: z.string(),
  fid: z.number(),
  score: z.number().min(0),
  // The stake tx this fid submitted for THIS duel (challengerTxHash or
  // opponentTxHash). This repo has no Farcaster identity/session layer
  // (no Quick Auth / SIWF), so `fid` alone in the request body can't be
  // trusted as proof of who's calling — requiring the matching stake tx at
  // least ties the request to whoever actually funded that side of the
  // duel. It is NOT a substitute for real auth: anyone who has both the
  // fid and its stake txHash (e.g. from a shared link or client logs)
  // could still submit on that player's behalf. Wiring up Farcaster Quick
  // Auth (sdk.quickAuth.getToken()) is the real fix and out of scope here.
  txHash: z.string(),
});

/**
 * Called when a player finishes their duel game. Once both sides have
 * submitted a score, the duel auto-resolves and the winner is flagged for
 * payout (see README for the escrow payout / house-fee model).
 */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { duelId, fid, score, txHash } = parsed.data;

  const duel = await getDuelById(duelId);
  if (!duel) {
    return NextResponse.json({ error: 'Duel not found' }, { status: 404 });
  }

  const expectedTxHash =
    duel.challengerFid === fid
      ? duel.challengerTxHash
      : duel.opponentFid === fid
        ? duel.opponentTxHash
        : null;

  if (!expectedTxHash) {
    return NextResponse.json({ error: 'This fid is not part of this duel' }, { status: 403 });
  }
  if (expectedTxHash !== txHash) {
    return NextResponse.json(
      { error: "txHash does not match this player's stake for this duel" },
      { status: 403 }
    );
  }

  const startedAt = duel.challengerFid === fid ? duel.challengerStartedAt : duel.opponentStartedAt;
  const elapsedMs = startedAt ? Date.now() - new Date(startedAt).getTime() : 0;
  const plausibility = isScorePlausible(score, elapsedMs);
  if (!plausibility.ok) {
    return NextResponse.json({ error: plausibility.reason }, { status: 400 });
  }

  const updated = await submitDuelScore(duelId, fid, score);
  return NextResponse.json({ ok: true, duel: updated });
}
