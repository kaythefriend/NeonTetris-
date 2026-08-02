import { NextRequest, NextResponse } from 'next/server';
import { parseWebhookEvent, verifyAppKeyWithNeynar } from '@farcaster/miniapp-node';
import { removeNotificationToken, saveNotificationToken } from '@/lib/db/db';

/**
 * Receives Farcaster Mini App lifecycle events (miniapp added/removed,
 * notifications enabled/disabled) and stores/clears the per-fid
 * notification token so /api/duel/create can alert a challenged opponent.
 *
 * Each event arrives as a JSON Farcaster Signature payload:
 * { header, payload, signature }. parseWebhookEvent cryptographically
 * verifies it was actually signed by that fid's registered app key (via
 * verifyAppKeyWithNeynar, using NEYNAR_API_KEY) before we trust anything in
 * it — so a spoofed request can't overwrite someone else's notification
 * endpoint or fabricate a token for a fid that never asked for one.
 *
 * See: https://miniapps.farcaster.xyz/docs/guides/notifications
 */
export async function POST(req: NextRequest) {
  const requestJson = await req.json().catch(() => null);
  if (!requestJson) {
    return NextResponse.json({ ok: false, error: 'Malformed webhook payload' }, { status: 400 });
  }

  let data;
  try {
    data = await parseWebhookEvent(requestJson, verifyAppKeyWithNeynar);
  } catch (err: any) {
    // Includes signature verification failures — reject rather than trust
    // an unverified payload. Farcaster clients retry on non-200, so this
    // is safe even for transient Neynar hiccups.
    console.error('[farcaster webhook] verification failed', err);
    return NextResponse.json({ ok: false, error: 'Webhook signature verification failed' }, { status: 401 });
  }

  const { fid, event } = data;

  try {
    switch (event.event) {
      case 'miniapp_added':
      case 'notifications_enabled':
        if (event.notificationDetails?.url && event.notificationDetails?.token) {
          await saveNotificationToken(fid, event.notificationDetails.url, event.notificationDetails.token);
        }
        break;
      case 'miniapp_removed':
      case 'notifications_disabled':
        await removeNotificationToken(fid);
        break;
      default:
        // The union type from @farcaster/miniapp-node only has these 4
        // variants and all are handled above, so TS narrows `event` to
        // `never` here — cast to log defensively in case a 5th event type
        // ships in a future SDK version before this switch is updated.
        console.log('[farcaster webhook] unhandled event', (event as { event: string }).event);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[farcaster webhook] failed to process verified event', err);
    return NextResponse.json({ ok: false, error: 'Failed to process webhook' }, { status: 500 });
  }
}
