import { getNotificationToken } from '@/lib/db/db';

/**
 * Sends a Mini App notification to `fid` if they've added the app and have
 * a stored notification token. Silently does nothing if they haven't —
 * that's the normal/expected case for most players, not an error.
 *
 * Per the Farcaster Mini App notification spec, this POSTs to the
 * per-user notification URL captured from the /api/webhook events.
 */
export async function sendMiniAppNotification(
  fid: number,
  input: { title: string; body: string; targetUrl?: string }
): Promise<void> {
  const stored = await getNotificationToken(fid);
  if (!stored) return; // user hasn't added the app / enabled notifications

  try {
    await fetch(stored.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notificationId: crypto.randomUUID(),
        title: input.title,
        body: input.body,
        targetUrl: input.targetUrl ?? process.env.NEXT_PUBLIC_APP_URL,
        tokens: [stored.token],
      }),
    });
  } catch (err) {
    // Best-effort only — a failed notification should never block the
    // action that triggered it (e.g. creating a duel).
    console.warn(`[notify] failed to notify fid ${fid}:`, err);
  }
}
