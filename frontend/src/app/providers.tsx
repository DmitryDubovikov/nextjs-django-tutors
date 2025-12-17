'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider, signOut, useSession } from 'next-auth/react';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';

import { Toaster } from '@/components/ui/toast';
import {
  setClientAccessToken,
  setClientRefreshToken,
  setRefreshFailedCallback,
  setTokenRefreshCallback,
} from '@/lib/api-client';

interface ProvidersProps {
  children: ReactNode;
}

/** Time buffer before token expiry to trigger refresh (2 minutes) */
const TOKEN_REFRESH_BUFFER_MS = 2 * 60 * 1000;

/**
 * Decode JWT payload to get expiration time.
 * Returns null if token is invalid.
 */
function getTokenExpiry(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) return null;
    const payload = JSON.parse(atob(parts[1])) as { exp?: number };
    return payload.exp ? payload.exp * 1000 : null; // Convert to milliseconds
  } catch {
    return null;
  }
}

/**
 * Syncs tokens from SessionProvider to the api-client module.
 * Also proactively refreshes the token before it expires.
 */
function AuthTokenSync() {
  const { data: session, update } = useSession();

  // Sync tokens to api-client
  useEffect(() => {
    setClientAccessToken(session?.accessToken ?? null);
    setClientRefreshToken(session?.refreshToken ?? null);
  }, [session?.accessToken, session?.refreshToken]);

  // Register callback for api-client to notify us about token refresh
  // This updates the NextAuth session when interceptor refreshes tokens
  useEffect(() => {
    setTokenRefreshCallback((newAccessToken, newRefreshToken) => {
      // Update NextAuth session with new tokens
      update({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    });

    return () => setTokenRefreshCallback(null);
  }, [update]);

  // Register callback for when refresh token is invalid
  // This signs out the user to force re-authentication
  useEffect(() => {
    setRefreshFailedCallback(() => {
      console.warn('[AuthTokenSync] Refresh token invalid, signing out...');
      signOut({ callbackUrl: '/login' });
    });

    return () => setRefreshFailedCallback(null);
  }, []);

  // Memoize update to avoid unnecessary effect re-runs
  const triggerRefresh = useCallback(() => {
    update();
  }, [update]);

  // Proactive token refresh before expiry
  useEffect(() => {
    // Don't try to refresh if there's already an error (prevents infinite loop)
    if (session?.error) return;
    if (!session?.accessToken) return;

    const expiry = getTokenExpiry(session.accessToken);
    if (!expiry) return;

    const now = Date.now();
    const timeUntilExpiry = expiry - now;

    // Token already expired or about to expire - refresh immediately
    if (timeUntilExpiry <= TOKEN_REFRESH_BUFFER_MS) {
      triggerRefresh();
      return;
    }

    // Schedule refresh before expiry
    const refreshIn = timeUntilExpiry - TOKEN_REFRESH_BUFFER_MS;
    const timer = setTimeout(triggerRefresh, refreshIn);

    return () => clearTimeout(timer);
  }, [session?.accessToken, session?.error, triggerRefresh]);

  return null;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
      <AuthTokenSync />
      <QueryClientProvider client={queryClient}>
        <NuqsAdapter>{children}</NuqsAdapter>
        <Toaster />
      </QueryClientProvider>
    </SessionProvider>
  );
}
