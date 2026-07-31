import { getAddress, isAddress, parseUnits } from 'viem';

/** Native USDC on Base mainnet (6 decimals). Override in .env if needed. */
export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ??
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913') as `0x${string}`;

export const USDC_DECIMALS = 6;

/**
 * Deliberately NO fallback default here. A wrong or placeholder treasury
 * address means real user payments go to the wrong (or unrecoverable)
 * destination, so this fails loudly at startup instead of silently
 * accepting a bad value — better a clear error now than debugging a
 * "why did the money disappear" report later.
 */
function resolveTreasuryAddress(): `0x${string}` {
  const raw = process.env.NEXT_PUBLIC_TREASURY_ADDRESS;
  if (!raw || !isAddress(raw, { strict: false })) {
    throw new Error(
      'NEXT_PUBLIC_TREASURY_ADDRESS is missing or not a valid address. Set it in ' +
        'your Vercel project env vars to the wallet that should receive game fees, ' +
        'tips-adjacent escrow, and duel wagers, then redeploy.'
    );
  }
  // Normalize to the correct EIP-55 checksum casing so viem/wagmi never reject
  // an otherwise-correct address over a checksum mismatch.
  return getAddress(raw);
}

export const TREASURY_ADDRESS = resolveTreasuryAddress();

export const GAME_FEE_USDC = Number(process.env.NEXT_PUBLIC_GAME_FEE_USDC ?? '0.1');

export const GAME_FEE_BASE_UNITS = parseUnits(
  GAME_FEE_USDC.toString(),
  USDC_DECIMALS
);

/** Minimal ERC-20 ABI — only what NeonTetris needs (transfer + balance + decimals). */
export const ERC20_ABI = [
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

export function usdcToBaseUnits(amount: number): bigint {
  return parseUnits(amount.toString(), USDC_DECIMALS);
}

export function baseUnitsToUsdc(amount: bigint): number {
  return Number(amount) / 10 ** USDC_DECIMALS;
}
