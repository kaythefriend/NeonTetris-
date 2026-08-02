import { createWalletClient, http, encodeFunctionData, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { ERC20_ABI, USDC_ADDRESS, usdcToBaseUnits } from './usdc';

/**
 * Server-only. This module holds the treasury's PRIVATE KEY and can move
 * real funds with no human approval step. Hard requirements for whoever
 * runs this in production:
 *
 *   1. TREASURY_PRIVATE_KEY must belong to a DEDICATED wallet that only
 *      ever holds operating float for duel payouts — never your personal
 *      wallet, never one holding unrelated funds.
 *   2. It must be set as a server-only env var (no NEXT_PUBLIC_ prefix,
 *      which is what keeps it out of the client bundle). Double-check it
 *      never gets logged, and rotate it if you ever suspect exposure.
 *   3. Fund it deliberately and monitor its balance — if a payout fails
 *      because the treasury is empty, the duel still resolves (status:
 *      'completed', winnerFid set) but payoutStatus is 'failed' so it's
 *      visible and can be retried once funded. See retryDuelPayout in db.ts.
 */

let cachedClient: ReturnType<typeof createWalletClient> | null = null;

function getTreasuryWalletClient() {
  if (cachedClient) return cachedClient;
  const key = process.env.TREASURY_PRIVATE_KEY;
  if (!key) {
    throw new Error(
      'TREASURY_PRIVATE_KEY is not set. Duel payouts cannot be sent automatically until a ' +
        'dedicated payout wallet private key is configured as a server-only env var.'
    );
  }
  const normalized = (key.startsWith('0x') ? key : `0x${key}`) as Hex;
  const account = privateKeyToAccount(normalized);
  cachedClient = createWalletClient({
    account,
    chain: base,
    transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org'),
  });
  return cachedClient;
}

/**
 * Sends `amountUsdc` USDC from the treasury wallet to `toAddress`. Used
 * exclusively for auto-paying duel winners the full pot on resolution.
 * Throws on failure — callers must catch this and record payoutStatus:
 * 'failed' rather than letting it silently disappear.
 */
export async function sendUsdcPayout(toAddress: string, amountUsdc: number): Promise<string> {
  const client = getTreasuryWalletClient();
  const data = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [toAddress as `0x${string}`, usdcToBaseUnits(amountUsdc)],
  });
  const hash = await client.sendTransaction({
    account: client.account!,
    to: USDC_ADDRESS,
    data,
    chain: base,
  });
  return hash;
}
