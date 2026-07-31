import { createPublicClient, http, getAddress } from 'viem';
import { base } from 'viem/chains';
import { USDC_ADDRESS, usdcToBaseUnits } from './usdc';

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org'),
});

// ERC-20 Transfer(address indexed from, address indexed to, uint256 value)
// topic0 (keccak256 of the event signature) — used to confirm we're
// decoding the right kind of log before pulling from/to out of the topics.
const TRANSFER_TOPIC0 = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export interface VerifyResult {
  ok: boolean;
  reason?: string;
}

/**
 * Confirms that a given transaction hash is a real, mined, successful USDC
 * `Transfer` event on Base from `from` to `to` of at least `minAmountUsdc`.
 *
 * This is what stands between "the client says it paid" and "the game
 * actually unlocks" — every pay-to-play, tip, and duel-wager endpoint in
 * this repo runs its tx hash through here before crediting anything.
 */
export async function verifyUsdcTransfer(input: {
  txHash: string;
  from: string;
  to: string;
  minAmountUsdc: number;
}): Promise<VerifyResult> {
  const { txHash, from, to, minAmountUsdc } = input;

  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return { ok: false, reason: 'Malformed transaction hash' };
  }

  try {
    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    if (receipt.status !== 'success') {
      return { ok: false, reason: 'Transaction did not succeed on-chain' };
    }

    const minAmount = usdcToBaseUnits(minAmountUsdc);
    const expectedFrom = getAddress(from);
    const expectedTo = getAddress(to);

    const matchingLog = receipt.logs.find((log) => {
      if (getAddress(log.address) !== getAddress(USDC_ADDRESS)) return false;
      if (log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC0) return false;
      try {
        const decoded = decodeTransferLog(log.topics, log.data);
        if (!decoded) return false;
        return (
          getAddress(decoded.from) === expectedFrom &&
          getAddress(decoded.to) === expectedTo &&
          decoded.value >= minAmount
        );
      } catch {
        return false;
      }
    });

    if (!matchingLog) {
      return {
        ok: false,
        reason: `No matching USDC transfer of >= ${minAmountUsdc} found in this transaction`,
      };
    }

    return { ok: true };
  } catch (err) {
    console.error('[verifyUsdcTransfer] failed', err);
    return { ok: false, reason: 'Could not fetch or verify transaction' };
  }
}

function decodeTransferLog(
  topics: readonly `0x${string}`[],
  data: `0x${string}`
): { from: string; to: string; value: bigint } | null {
  // Transfer(address indexed from, address indexed to, uint256 value)
  if (topics.length < 3) return null;
  const from = `0x${topics[1].slice(-40)}`;
  const to = `0x${topics[2].slice(-40)}`;
  const value = BigInt(data);
  return { from, to, value };
}
