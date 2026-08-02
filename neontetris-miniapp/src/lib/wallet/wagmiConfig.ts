import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

/**
 * Wagmi config for NeonTetris.
 *
 * We use the official Farcaster Mini App connector so that the "connect
 * wallet" step is invisible to the user — inside a Farcaster client the
 * user's Farcaster wallet (Base) is already available and pre-authorized,
 * matching the "charged directly from their Farcaster wallet" flow.
 */
export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [farcasterMiniApp()],
  transports: {
    [base.id]: http(
      process.env.NEXT_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org'
    ),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
