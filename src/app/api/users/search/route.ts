import { NextRequest, NextResponse } from 'next/server';
import { searchFarcasterUsers } from '@/lib/farcaster/neynar';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  try {
    const users = await searchFarcasterUsers(q);
    return NextResponse.json({ users });
  } catch (err: any) {
    console.error('[users/search] failed', err);
    return NextResponse.json({ error: err?.message ?? 'Search failed', users: [] }, { status: 500 });
  }
}
