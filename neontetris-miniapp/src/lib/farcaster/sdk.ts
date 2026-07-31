import { sdk } from '@farcaster/miniapp-sdk';

export { sdk };

export interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

/**
 * Signals to the Farcaster host that NeonTetris has finished loading and
 * hides the splash screen. Must be called once, after the board, wallet
 * connector, and skin data are ready — otherwise the user sees an infinite
 * spinner inside the Farcaster client.
 */
export async function markReady() {
  try {
    await sdk.actions.ready();
  } catch (err) {
    // Not running inside a Farcaster client (e.g. local dev in a browser tab).
    console.warn('[farcaster] sdk.actions.ready() failed, likely running outside a host:', err);
  }
}

export async function getCurrentUser(): Promise<FarcasterUser | null> {
  try {
    const context = await sdk.context;
    if (!context?.user) return null;
    return {
      fid: context.user.fid,
      username: context.user.username,
      displayName: context.user.displayName,
      pfpUrl: context.user.pfpUrl,
    };
  } catch {
    return null;
  }
}

/** Opens the native Farcaster composer pre-filled with a share of the score. */
export async function shareScore(score: number, lines: number) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://neontetris.example.com';
  try {
    await sdk.actions.composeCast({
      text: `I just scored ${score.toLocaleString()} points (${lines} lines) in NeonTetris ⚡🧱 Think you can beat me?`,
      embeds: [appUrl],
    });
  } catch (err) {
    console.warn('[farcaster] composeCast failed:', err);
  }
}
