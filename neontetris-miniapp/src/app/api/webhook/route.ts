import { NextRequest, NextResponse } from 'next/server';

/**
 * Receives Farcaster Mini App lifecycle events (miniapp added/removed,
 * notifications enabled/disabled). Stub implementation — wire this up to
 * your notification token store if you want to send push notifications
 * (e.g. "Your duel opponent just played!").
 *
 * See: https://miniapps.farcaster.xyz/docs/guides/notifications
 */
export async function POST(req: NextRequest) {
  const event = await req.json().catch(() => null);
  console.log('[farcaster webhook]', event);
  return NextResponse.json({ ok: true });
}
