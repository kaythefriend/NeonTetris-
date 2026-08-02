import { NextRequest, NextResponse } from 'next/server';
import { getPlayer } from '@/lib/db/db';

export async function GET(req: NextRequest, { params }: { params: { fid: string } }) {
  const fid = Number(params.fid);
  if (!Number.isFinite(fid)) {
    return NextResponse.json({ error: 'Invalid fid' }, { status: 400 });
  }
  const player = await getPlayer(fid);
  return NextResponse.json({ player });
}
