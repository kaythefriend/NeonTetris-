import { NextResponse } from 'next/server';
import { getLeaderboard } from '@/lib/db/db';

export async function GET() {
  const players = await getLeaderboard(100);
  return NextResponse.json({
    leaderboard: players.map((p, i) => ({
      rank: i + 1,
      fid: p.fid,
      username: p.username,
      displayName: p.displayName,
      pfpUrl: p.pfpUrl,
      bestScore: p.bestScore,
      totalLines: p.totalLines,
      gamesPlayed: p.gamesPlayed,
      duelWins: p.duelWins,
      duelLosses: p.duelLosses,
      totalTipsReceivedUsdc: p.totalTipsReceivedUsdc,
    })),
  });
}
