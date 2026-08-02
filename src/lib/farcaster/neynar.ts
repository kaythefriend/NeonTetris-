/**
 * Server-only. Wraps Neynar's user-search endpoint so the API key never
 * reaches the client bundle. Requires NEYNAR_API_KEY (server env var, no
 * NEXT_PUBLIC_ prefix). Get one at https://neynar.com.
 */

export interface FarcasterSearchResult {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl?: string;
}

export async function searchFarcasterUsers(query: string): Promise<FarcasterSearchResult[]> {
  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) {
    throw new Error('NEYNAR_API_KEY is not set — friend search is unavailable until it is configured.');
  }
  if (!query || query.trim().length < 1) return [];

  const res = await fetch(
    `https://api.neynar.com/v2/farcaster/user/search?q=${encodeURIComponent(query.trim())}&limit=10`,
    {
      headers: {
        'x-api-key': apiKey,
        accept: 'application/json',
      },
      cache: 'no-store',
    }
  );

  if (!res.ok) {
    throw new Error(`Neynar search failed: ${res.status} ${await res.text().catch(() => '')}`);
  }

  const json = await res.json();
  const users = json?.result?.users ?? [];
  return users.map((u: any) => ({
    fid: u.fid,
    username: u.username,
    displayName: u.display_name ?? u.username,
    pfpUrl: u.pfp_url,
  }));
}
