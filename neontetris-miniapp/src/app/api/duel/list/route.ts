import { NextRequest, NextResponse } from 'next/server';
import { listDuelsForPlayer, listOpenDuels } from '@/lib/db/db';

export async function GET(req: NextRequest) {
  const fid = req.nextUrl.searchParams.get('fid');
  if (fid) {
    const duels = await listDuelsForPlayer(Number(fid));
    return NextResponse.json({ duels });
  }
  const open = await listOpenDuels();
  return NextResponse.json({ duels: open });
}
