/**
 * Seeds a couple of demo players + a leaderboard so you have something to
 * look at locally without doing real payments end-to-end. Local dev only —
 * writes straight to data/db.json via the same lowdb helpers the app uses,
 * so run this only when KV_REST_API_URL / KV_REST_API_TOKEN are NOT set.
 *
 * Usage: npm run db:seed
 */
import { getOrCreatePlayer, recordGameResult } from '../src/lib/db/db';

async function main() {
  const demo = [
    { fid: 1001, username: 'zaodev', displayName: 'Zao', score: 48200, lines: 61 },
    { fid: 1002, username: 'pixelqueen', displayName: 'Pixel Queen', score: 39100, lines: 52 },
    { fid: 1003, username: 'blockhead', displayName: 'Blockhead', score: 27650, lines: 40 },
  ];

  for (const p of demo) {
    await getOrCreatePlayer(p.fid, { username: p.username, displayName: p.displayName });
    await recordGameResult({
      fid: p.fid,
      score: p.score,
      lines: p.lines,
      level: Math.max(1, Math.floor(p.lines / 10)),
      txHash: `0xseed${p.fid}`,
    });
  }

  console.log(`Seeded ${demo.length} demo players.`);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
