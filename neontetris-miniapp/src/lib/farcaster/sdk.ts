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

/** Opens the composer to share the Mini App itself (no score/challenge context). */
export async function shareApp() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://neontetris.example.com';
  try {
    await sdk.actions.composeCast({
      text: `Playing NeonTetris right here on Farcaster 🕹️⚡ Pay-to-play, duels, real USDC stakes.`,
      embeds: [appUrl],
    });
  } catch (err) {
    console.warn('[farcaster] composeCast failed:', err);
  }
}

/**
 * Opens the composer for a duel challenge cast: tags the opponent by
 * username and embeds a link straight to this duel (so tapping it opens
 * the app pre-scrolled to the accept flow — see the `?duel=` handling in
 * page.tsx). The opponent also gets a push notification via
 * /api/duel/create if they've saved the app — this cast is the *public*
 * callout on top of that, not a replacement for it.
 */
export async function shareDuelChallenge(opponentUsername: string, wagerUsdc: number, duelId: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://neontetris.example.com';
  try {
    await sdk.actions.composeCast({
      text: `I just challenged @${opponentUsername} to a $${wagerUsdc} USDC NeonTetris duel ⚡🧱 Winner takes the whole pot. Accept?`,
      embeds: [`${appUrl}?duel=${duelId}`],
    });
  } catch (err) {
    console.warn('[farcaster] composeCast failed:', err);
  }
}
