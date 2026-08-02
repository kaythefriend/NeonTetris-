import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { consumeGameSession, recordGameResult } from '@/lib/db/db';

const bodySchema = z.object({
  fid: z.number(),
  score: z.number().min(0),
  lines: z.number().min(0),
  level: z.number().min(1),
  txHash: z.string(), // the payment tx from /api/game/start, used as the session id
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Requires the one-time session created by /api/game/start for this
  // fid+txHash, and consumes it — so one payment can back exactly one
  // result submission, not unlimited ones.
  try {
    await consumeGameSession(parsed.data.fid, parsed.data.txHash);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Invalid game session' }, { status: 409 });
  }

  const player = await recordGameResult(parsed.data);
  return NextResponse.json({ ok: true, player });
}
