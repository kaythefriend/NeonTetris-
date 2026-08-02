import { Low, type Adapter } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { DEFAULT_DB, DbSchema, PlayerRecord } from './schema';
import { KV_CONFIGURED, claimTxHash as kvClaimTxHash, kvGet, kvSet } from './kv';
import { sendUsdcPayout } from '../wallet/payout';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');
const REDIS_DB_KEY = 'neontetris:db';

/**
 * lowdb Adapter backed by a single JSON blob in Upstash Redis, instead of a
 * local file. Needed because Vercel's serverless filesystem is read-only
 * outside /tmp and isn't shared across invocations/instances — a JSONFile
 * adapter alone will lose data (or throw) in production.
 *
 * This is still a whole-blob read-modify-write, so it's only eventually
 * consistent under concurrent writes (last write wins). That's an
 * acceptable tradeoff for player/game/tip/duel records here, but it is NOT
 * used for payment replay protection — see claimTxHash() in kv.ts, which
 * uses an atomic per-key Redis SETNX instead.
 */
class RedisJsonAdapter implements Adapter<DbSchema> {
  async read(): Promise<DbSchema | null> {
    const raw = await kvGet(REDIS_DB_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as DbSchema;
    } catch {
      return null;
    }
  }
  async write(data: DbSchema): Promise<void> {
    await kvSet(REDIS_DB_KEY, JSON.stringify(data));
  }
}

let dbInstance: Low<DbSchema> | null = null;

/**
 * Lazily-initialized singleton lowdb instance. Uses Upstash Redis (via
 * Vercel's KV / Upstash integration) when KV_REST_API_URL and
 * KV_REST_API_TOKEN are set, and falls back to a local JSON file otherwise
 * (local dev only — see the warning kv.ts logs when this happens).
 */
async function getDb(): Promise<Low<DbSchema>> {
  if (dbInstance) return dbInstance;
  const adapter: Adapter<DbSchema> = KV_CONFIGURED
    ? new RedisJsonAdapter()
    : new JSONFile<DbSchema>(DB_PATH);
  const db = new Low<DbSchema>(adapter, DEFAULT_DB);
  await db.read();
  db.data ||= structuredClone(DEFAULT_DB);
  db.data.sessions ||= [];
  db.data.notificationTokens ||= [];
  dbInstance = db;
  return db;
}

/** Re-exported so route handlers only need to import from '@/lib/db/db'. */
export const claimTxHash = kvClaimTxHash;

/**
 * Creates a one-time "receipt" tying a verified payment tx to a player, so
 * /api/game/complete can require proof of payment without trusting the
 * client's score submission to also carry the payment info unchecked.
 */
export async function createGameSession(fid: number, txHash: string) {
  const db = await getDb();
  db.data.sessions.push({ txHash, fid, consumed: false, createdAt: new Date().toISOString() });
  await db.write();
}

/**
 * Consumes a game session so it can only back a single /api/game/complete
 * call. Throws if there's no matching unconsumed session for this fid+tx.
 */
export async function consumeGameSession(fid: number, txHash: string) {
  const db = await getDb();
  const session = db.data.sessions.find((s) => s.txHash === txHash && s.fid === fid);
  if (!session) throw new Error('No matching paid game session found for this player and transaction');
  if (session.consumed) throw new Error('This game session has already been used to submit a result');
  session.consumed = true;
  await db.write();
}

export async function getDuelById(duelId: string) {
  const db = await getDb();
  return db.data.duels.find((d) => d.id === duelId) ?? null;
}

/** Read-only lookup — unlike getOrCreatePlayer, does not create a record. */
export async function getPlayer(fid: number) {
  const db = await getDb();
  return db.data.players.find((p) => p.fid === fid) ?? null;
}

export async function saveNotificationToken(fid: number, url: string, token: string) {
  const db = await getDb();
  const existing = db.data.notificationTokens.find((t) => t.fid === fid);
  if (existing) {
    existing.url = url;
    existing.token = token;
    existing.updatedAt = new Date().toISOString();
  } else {
    db.data.notificationTokens.push({ fid, url, token, updatedAt: new Date().toISOString() });
  }
  await db.write();
}

export async function removeNotificationToken(fid: number) {
  const db = await getDb();
  db.data.notificationTokens = db.data.notificationTokens.filter((t) => t.fid !== fid);
  await db.write();
}

export async function getNotificationToken(fid: number) {
  const db = await getDb();
  return db.data.notificationTokens.find((t) => t.fid === fid) ?? null;
}

export async function getOrCreatePlayer(fid: number, seed: Partial<PlayerRecord> = {}) {
  const db = await getDb();
  let player = db.data.players.find((p) => p.fid === fid);
  if (!player) {
    player = {
      fid,
      username: seed.username ?? `fid:${fid}`,
      displayName: seed.displayName ?? seed.username ?? `Player ${fid}`,
      pfpUrl: seed.pfpUrl,
      walletAddress: seed.walletAddress,
      bestScore: 0,
      totalLines: 0,
      gamesPlayed: 0,
      duelWins: 0,
      duelLosses: 0,
      totalTipsReceivedUsdc: 0,
      totalTipsSentUsdc: 0,
      unlockedSkins: ['classic-neon'],
      selectedSkin: 'classic-neon',
      updatedAt: new Date().toISOString(),
    };
    db.data.players.push(player);
    await db.write();
  }
  return player;
}

export async function recordGameResult(input: {
  fid: number;
  score: number;
  lines: number;
  level: number;
  txHash: string;
}) {
  const db = await getDb();
  const player = await getOrCreatePlayer(input.fid);

  db.data.games.push({
    id: crypto.randomUUID(),
    fid: input.fid,
    score: input.score,
    lines: input.lines,
    level: input.level,
    txHash: input.txHash,
    playedAt: new Date().toISOString(),
  });

  player.gamesPlayed += 1;
  player.totalLines += input.lines;
  player.bestScore = Math.max(player.bestScore, input.score);
  player.updatedAt = new Date().toISOString();

  await db.write();
  return player;
}

export async function getLeaderboard(limit = 50) {
  const db = await getDb();
  return [...db.data.players]
    .sort((a, b) => b.bestScore - a.bestScore)
    .slice(0, limit);
}

export async function recordTip(input: {
  fromFid: number;
  toFid: number;
  amountUsdc: number;
  txHash: string;
  message?: string;
}) {
  const db = await getDb();
  const sender = await getOrCreatePlayer(input.fromFid);
  const receiver = await getOrCreatePlayer(input.toFid);

  db.data.tips.push({
    id: crypto.randomUUID(),
    ...input,
    createdAt: new Date().toISOString(),
  });

  sender.totalTipsSentUsdc += input.amountUsdc;
  receiver.totalTipsReceivedUsdc += input.amountUsdc;
  sender.updatedAt = new Date().toISOString();
  receiver.updatedAt = new Date().toISOString();

  await db.write();
}

export async function createDuel(input: {
  challengerFid: number;
  opponentFid: number;
  wagerUsdc: number;
  challengerTxHash: string;
  challengerWallet: string;
}) {
  const db = await getDb();
  const duel = {
    id: crypto.randomUUID(),
    challengerFid: input.challengerFid,
    opponentFid: input.opponentFid,
    wagerUsdc: input.wagerUsdc,
    challengerTxHash: input.challengerTxHash,
    challengerWallet: input.challengerWallet,
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
  };
  db.data.duels.push(duel);
  await db.write();
  return duel;
}

export async function acceptDuel(duelId: string, opponentTxHash: string, opponentWallet: string) {
  const db = await getDb();
  const duel = db.data.duels.find((d) => d.id === duelId);
  if (!duel) throw new Error('Duel not found');
  duel.status = 'in_progress';
  duel.opponentTxHash = opponentTxHash;
  duel.opponentWallet = opponentWallet;
  await db.write();
  return duel;
}

export async function submitDuelScore(duelId: string, fid: number, score: number) {
  const db = await getDb();
  const duel = db.data.duels.find((d) => d.id === duelId);
  if (!duel) throw new Error('Duel not found');

  if (duel.challengerFid === fid) duel.challengerScore = score;
  else if (duel.opponentFid === fid) duel.opponentScore = score;
  else throw new Error('Player is not part of this duel');

  if (duel.challengerScore !== undefined && duel.opponentScore !== undefined) {
    duel.status = 'completed';
    duel.resolvedAt = new Date().toISOString();
    duel.winnerFid =
      duel.challengerScore >= duel.opponentScore ? duel.challengerFid : duel.opponentFid;

    const winner = await getOrCreatePlayer(duel.winnerFid);
    const loserFid = duel.winnerFid === duel.challengerFid ? duel.opponentFid : duel.challengerFid;
    const loser = await getOrCreatePlayer(loserFid);
    winner.duelWins += 1;
    loser.duelLosses += 1;

    await db.write();
    await payoutDuel(duelId);
    return duel;
  }

  await db.write();
  return duel;
}

/**
 * Sends the full pot (both wagers, no house cut) from the treasury to the
 * winner's verified stake wallet. Runs automatically right after a duel
 * resolves. If it fails (treasury underfunded, RPC hiccup, etc.), the duel
 * stays resolved with a winner on record and payoutStatus: 'failed' —
 * call this again with the same duelId to retry once the issue is fixed.
 */
export async function payoutDuel(duelId: string) {
  const db = await getDb();
  const duel = db.data.duels.find((d) => d.id === duelId);
  if (!duel) throw new Error('Duel not found');
  if (duel.status !== 'completed' || !duel.winnerFid) {
    throw new Error('Duel is not resolved yet — cannot pay out');
  }
  if (duel.payoutStatus === 'paid') return duel; // already paid, don't double-send

  const winnerWallet = duel.winnerFid === duel.challengerFid ? duel.challengerWallet : duel.opponentWallet;
  if (!winnerWallet) {
    duel.payoutStatus = 'failed';
    duel.payoutError = 'No verified wallet address on record for the winner';
    await db.write();
    return duel;
  }

  const pot = duel.wagerUsdc * 2; // both sides staked equally; winner gets the whole pot, no house cut

  try {
    const payoutTxHash = await sendUsdcPayout(winnerWallet, pot);
    duel.payoutTxHash = payoutTxHash;
    duel.payoutStatus = 'paid';
    duel.payoutError = undefined;
  } catch (err: any) {
    console.error(`[payoutDuel] failed for duel ${duelId}:`, err);
    duel.payoutStatus = 'failed';
    duel.payoutError = err?.message ?? 'Unknown payout error';
  }

  await db.write();
  return duel;
}

export async function listDuelsForPlayer(fid: number) {
  const db = await getDb();
  return db.data.duels.filter((d) => d.challengerFid === fid || d.opponentFid === fid);
}

export async function listOpenDuels() {
  const db = await getDb();
  return db.data.duels.filter((d) => d.status === 'pending');
}

/** Called by /api/skins/purchase after payment verification. Unlocks and equips. */
export async function unlockSkin(fid: number, skinId: string) {
  const db = await getDb();
  const player = await getOrCreatePlayer(fid);
  if (!player.unlockedSkins.includes(skinId)) {
    player.unlockedSkins.push(skinId);
  }
  player.selectedSkin = skinId;
  player.updatedAt = new Date().toISOString();
  await db.write();
  return player;
}

/** Equips an already-owned skin. No payment involved — throws if not owned. */
export async function selectSkin(fid: number, skinId: string) {
  const db = await getDb();
  const player = await getOrCreatePlayer(fid);
  if (!player.unlockedSkins.includes(skinId)) {
    throw new Error('This skin has not been purchased yet');
  }
  player.selectedSkin = skinId;
  player.updatedAt = new Date().toISOString();
  await db.write();
  return player;
}
