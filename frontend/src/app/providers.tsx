'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider, signOut, useSession } from 'next-auth/react';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { Toaster } from '@/components/ui/toast';
import {
  setClientAccessToken,
  setClientRefreshToken,
  setRefreshFailedCallback,
  setSessionRefreshCallback,
} from '@/lib/api-client';
import { FeatureFlagsProvider } from '@/providers/feature-flags-provider';

interface ProvidersProps {
  children: ReactNode;
}

// =============================================================================
// Constants
// =============================================================================

/** Time buffer before token expiry to trigger proactive refresh (2 minutes) */
const TOKEN_REFRESH_BUFFER_MS = 2 * 60 * 1000;

/** Minimum interval between refresh attempts to prevent loops */
const REFRESH_COOLDOWN_MS = 2000; // 2 seconds

// =============================================================================
// Helpers
// =============================================================================

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

// =============================================================================
// AuthTokenSync Component
// =============================================================================

/**
 * Syncs tokens from SessionProvider to the api-client module.
 * Also proactively refreshes the token before it expires.
 */
function AuthTokenSync() {
  const { data: session, update } = useSession();
  // Track if we're currently refreshing to prevent infinite loops
  // Using ref instead of state to avoid triggering re-renders
  const isRefreshingRef = useRef(false);
  // Track the last token we tried to refresh to avoid refreshing the same token repeatedly
  const lastRefreshedTokenRef = useRef<string | null>(null);

  // Sync tokens to api-client
  useEffect(() => {
    const accessToken = session?.accessToken ?? null;
    const refreshToken = session?.refreshToken ?? null;

    setClientAccessToken(accessToken);
    setClientRefreshToken(refreshToken);
  }, [session]);

  // Register callback for api-client to trigger session refresh on 401
  // This uses NextAuth as single source of truth for token refresh
  useEffect(() => {
    setSessionRefreshCallback(async () => {
      // Trigger NextAuth session update which will refresh tokens server-side
      const updatedSession = await update();

      // Check if refresh was successful
      if (updatedSession?.error) {
        return null;
      }

      if (updatedSession?.accessToken) {
        // Immediately update the client token so the retry uses the new token
        setClientAccessToken(updatedSession.accessToken);
        if (updatedSession.refreshToken) {
          setClientRefreshToken(updatedSession.refreshToken);
        }
        return updatedSession.accessToken;
      }

      return null;
    });

    return () => setSessionRefreshCallback(null);
  }, [update]);

  // Register callback for when refresh token is invalid
  // This signs out the user to force re-authentication
  useEffect(() => {
    setRefreshFailedCallback(() => {
      signOut({ callbackUrl: '/login' });
    });

    return () => setRefreshFailedCallback(null);
  }, []);

  // Auto sign-out when session has RefreshAccessTokenError
  // This handles the case where refresh token is blacklisted/invalid
  // and ensures user is redirected to login immediately
  useEffect(() => {
    if (session?.error === 'RefreshAccessTokenError') {
      signOut({ callbackUrl: '/login' });
    }
  }, [session?.error]);

  // Proactive token refresh before expiry
  useEffect(() => {
    // Don't try to refresh if there's already an error (prevents infinite loop)
    if (session?.error) {
      return;
    }
    if (!session?.accessToken) {
      return;
    }

    const expiry = getTokenExpiry(session.accessToken);
    if (!expiry) {
      return;
    }

    const now = Date.now();
    const timeUntilExpiry = expiry - now;

    // Skip if we already tried to refresh this exact token
    if (lastRefreshedTokenRef.current === session.accessToken) {
      return;
    }

    // Token already expired or about to expire - refresh immediately
    if (timeUntilExpiry <= TOKEN_REFRESH_BUFFER_MS) {
      // Check if already refreshing
      if (isRefreshingRef.current) {
        return;
      }

      isRefreshingRef.current = true;
      lastRefreshedTokenRef.current = session.accessToken ?? null;

      update()
        .catch(() => {
          // Error handled by session error check
        })
        .finally(() => {
          // Delay before allowing next refresh
          setTimeout(() => {
            isRefreshingRef.current = false;
          }, REFRESH_COOLDOWN_MS);
        });
      return;
    }

    // Schedule refresh before expiry
    const refreshIn = timeUntilExpiry - TOKEN_REFRESH_BUFFER_MS;

    const timer = setTimeout(() => {
      if (isRefreshingRef.current) {
        return;
      }

      isRefreshingRef.current = true;
      lastRefreshedTokenRef.current = session.accessToken ?? null;

      update().finally(() => {
        setTimeout(() => {
          isRefreshingRef.current = false;
        }, REFRESH_COOLDOWN_MS);
      });
    }, refreshIn);

    return () => clearTimeout(timer);
  }, [session?.accessToken, session?.error, update]);

  return null;
}

// =============================================================================
// Providers Component
// =============================================================================

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
    // Note: refetchInterval is disabled to avoid race conditions with token rotation.
    // Token refresh is handled by:
    // 1. Proactive refresh in AuthTokenSync (2 min before expiry)
    // 2. 401 interceptor in api-client.ts
    // 3. refetchOnWindowFocus for when user returns to the tab
    <SessionProvider refetchOnWindowFocus={true}>
      <AuthTokenSync />
      <QueryClientProvider client={queryClient}>
        <FeatureFlagsProvider>
          <NuqsAdapter>{children}</NuqsAdapter>
          <Toaster />
        </FeatureFlagsProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
