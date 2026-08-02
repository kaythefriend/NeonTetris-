'use client';

import { useEffect, useState } from 'react';
import { FarcasterUser, getCurrentUser, markReady } from '@/lib/farcaster/sdk';

export function useMiniApp() {
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const currentUser = await getCurrentUser();
      if (cancelled) return;
      setUser(currentUser);
      await markReady();
      if (!cancelled) setIsReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, isReady };
}
