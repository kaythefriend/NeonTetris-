import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { selectSkin } from '@/lib/db/db';

const bodySchema = z.object({
  fid: z.number(),
  skinId: z.string(),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  try {
    const player = await selectSkin(parsed.data.fid, parsed.data.skinId);
    return NextResponse.json({ ok: true, player });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Could not select skin' }, { status: 403 });
  }
}
