/**
 * Minimal Upstash Redis REST client + local dev fallback.
 *
 * On Vercel, the deployed function filesystem is read-only outside /tmp and
 * is NOT shared across invocations or instances — a lowdb file adapter
 * writing to disk will silently lose data or throw in production. This
 * module lets the app use Upstash Redis (via Vercel's "KV" / Upstash
 * integration, which injects KV_REST_API_URL and KV_REST_API_TOKEN
 * automatically) when available, and falls back to a local JSON file only
 * for local development.
 *
 * It also provides claimTxHash(), which is used to atomically prevent a
 * single on-chain payment tx from being replayed against multiple API
 * calls (paying once and starting unlimited games, tipping repeatedly with
 * one tx, etc).
 */
import fs from 'node:fs';
import path from 'node:path';

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

export const KV_CONFIGURED = Boolean(KV_URL && KV_TOKEN);

if (!KV_CONFIGURED) {
  console.warn(
    '[kv] KV_REST_API_URL / KV_REST_API_TOKEN are not set. Falling back to a ' +
      'local JSON file for storage and tx-replay checks. This is fine for local ' +
      'dev, but will NOT persist or prevent replay attacks reliably once deployed ' +
      'to Vercel — add the Vercel KV / Upstash Redis integration before going live ' +
      'with real payments.'
  );
}

async function redisCommand(cmd: (string | number)[]): Promise<any> {
  if (!KV_URL || !KV_TOKEN) throw new Error('KV not configured');
  const res = await fetch(KV_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cmd),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`KV command failed: ${res.status} ${await res.text().catch(() => '')}`);
  }
  const json = await res.json();
  return json.result;
}

export async function kvGet(key: string): Promise<string | null> {
  return redisCommand(['GET', key]);
}

export async function kvSet(key: string, value: string): Promise<void> {
  await redisCommand(['SET', key, value]);
}

/** Atomically sets a key only if it doesn't already exist. Returns true if it claimed the key. */
async function kvSetNX(key: string, value: string): Promise<boolean> {
  const result = await redisCommand(['SET', key, value, 'NX']);
  return result === 'OK';
}

// --- Local dev fallback (NOT safe for concurrent/production use) ---

const LOCAL_USED_TX_PATH = path.join(process.cwd(), 'data', 'used-tx.local.json');

function readLocalUsedTxSet(): Set<string> {
  try {
    const raw = fs.readFileSync(LOCAL_USED_TX_PATH, 'utf-8');
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function writeLocalUsedTxSet(set: Set<string>) {
  fs.mkdirSync(path.dirname(LOCAL_USED_TX_PATH), { recursive: true });
  fs.writeFileSync(LOCAL_USED_TX_PATH, JSON.stringify([...set]));
}

/**
 * Atomically claims a txHash so it can only ever be used once across the
 * whole app (game start, tip, duel create, duel accept all call this).
 * Returns false if the txHash was already claimed (i.e. a replay attempt).
 */
export async function claimTxHash(txHash: string, context: string): Promise<boolean> {
  const key = `neontetris:tx:${txHash.toLowerCase()}`;
  if (KV_CONFIGURED) {
    return kvSetNX(key, context);
  }
  // Local fallback: not atomic (fine for single-process local dev only).
  const used = readLocalUsedTxSet();
  if (used.has(key)) return false;
  used.add(key);
  writeLocalUsedTxSet(used);
  return true;
}
