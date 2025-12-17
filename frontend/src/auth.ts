/**
 * Auth.js v5 configuration for Next.js.
 *
 * Sets up Google and GitHub OAuth providers and handles
 * exchanging OAuth tokens for Django JWT tokens.
 */

import NextAuth, { type User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    error?: string;
    user: User & {
      id: string;
      userType?: string;
      isStaff?: boolean;
    };
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: string;
    backendUser?: {
      id: number;
      email: string;
      first_name: string;
      last_name: string;
      avatar: string;
      user_type: string;
      is_staff: boolean;
    };
  }
}

// =============================================================================
// Constants
// =============================================================================

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://backend:8000';

/** Access token lifetime in milliseconds (slightly less than Django's 15 min to account for clock drift) */
const ACCESS_TOKEN_LIFETIME_MS = 14 * 60 * 1000; // 14 minutes

/** How long to cache refresh results to prevent duplicate requests */
const REFRESH_CACHE_TTL_MS = 5000; // 5 seconds

/** OAuth domains that need retry logic (for Docker network issues) */
const OAUTH_DOMAINS = ['googleapis.com', 'accounts.google.com', 'github.com'];

/** Max retries for OAuth fetch requests */
const OAUTH_FETCH_MAX_RETRIES = 3;

/** Base delay for OAuth fetch retry (exponential backoff) */
const OAUTH_FETCH_RETRY_DELAY_MS = 500;

/** Whether credentials auth (email/password) is enabled */
const ENABLE_CREDENTIALS_AUTH = process.env.ENABLE_CREDENTIALS_AUTH === 'true';

// =============================================================================
// OAuth Fetch with Retry (replaces global monkey-patching)
// =============================================================================

/**
 * Check if URL is an OAuth provider URL that needs retry logic.
 */
function isOAuthUrl(url: string): boolean {
  return OAUTH_DOMAINS.some((domain) => url.includes(domain));
}

/**
 * Fetch with retry logic for OAuth domains.
 * Handles intermittent network issues in Docker environment.
 */
async function oauthFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

  // Only apply retry logic to OAuth URLs
  if (!isOAuthUrl(url)) {
    return fetch(input, init);
  }

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < OAUTH_FETCH_MAX_RETRIES; attempt++) {
    try {
      return await fetch(input, init);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < OAUTH_FETCH_MAX_RETRIES - 1) {
        const delay = OAUTH_FETCH_RETRY_DELAY_MS * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError ?? new Error('All OAuth fetch retries failed');
}

// =============================================================================
// Server-side Refresh Cache
// =============================================================================

/**
 * Server-side refresh deduplication and caching.
 * Stores both in-flight Promises AND completed results to prevent duplicate refresh requests.
 * This is critical with Django's ROTATE_REFRESH_TOKENS=True + BLACKLIST_AFTER_ROTATION=True.
 */
type RefreshResult = {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  error?: string;
  backendUser?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    avatar: string;
    user_type: string;
    is_staff: boolean;
  };
};

type RefreshCacheEntry = {
  promise: Promise<RefreshResult>;
  result?: RefreshResult;
  timestamp: number;
};

const refreshCache = new Map<string, RefreshCacheEntry>();

/**
 * Get last 8 characters of a token for cache key (safe identifier).
 */
function getTokenSuffix(token: string | undefined): string {
  if (!token) return 'none';
  return token.slice(-8);
}

/**
 * Clean up expired cache entries
 */
function cleanupRefreshCache(): void {
  const now = Date.now();
  for (const [key, entry] of refreshCache.entries()) {
    if (now - entry.timestamp > REFRESH_CACHE_TTL_MS) {
      refreshCache.delete(key);
    }
  }
}

/**
 * Handle session update from client (e.g., after interceptor refreshes tokens).
 * Returns updated token with new access/refresh tokens.
 */
function handleSessionUpdate(
  token: { accessToken?: string; refreshToken?: string; error?: string },
  updateData: { accessToken?: string; refreshToken?: string }
): typeof token {
  const result = { ...token };
  if (updateData.accessToken) {
    result.accessToken = updateData.accessToken;
    result.error = undefined;
  }
  if (updateData.refreshToken) {
    result.refreshToken = updateData.refreshToken;
  }
  return result;
}

/**
 * Refresh the access token using the refresh token.
 * Uses deduplication AND result caching to prevent race conditions when multiple requests
 * try to refresh with the same token simultaneously or in quick succession.
 */
async function refreshAccessToken(token: {
  refreshToken?: string;
  backendUser?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    avatar: string;
    user_type: string;
    is_staff: boolean;
  };
}): Promise<RefreshResult> {
  const refreshTokenSuffix = getTokenSuffix(token.refreshToken);

  // Clean up old cache entries
  cleanupRefreshCache();

  // Check for existing cache entry (in-flight OR recently completed)
  const existingEntry = refreshCache.get(refreshTokenSuffix);
  if (existingEntry) {
    // If we have a cached result, return it immediately
    if (existingEntry.result) {
      return existingEntry.result;
    }
    // Otherwise, wait for the in-flight promise
    return existingEntry.promise;
  }

  // Create new refresh promise
  const refreshPromise = (async (): Promise<RefreshResult> => {
    try {
      const url = `${INTERNAL_API_URL}/api/auth/token/refresh/`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: token.refreshToken }),
      });

      if (!res.ok) {
        return {
          ...token,
          error: 'RefreshAccessTokenError',
        };
      }

      const data = await res.json();
      const newRefreshToken = data.refresh ?? token.refreshToken;

      return {
        accessToken: data.access,
        refreshToken: newRefreshToken,
        accessTokenExpires: Date.now() + ACCESS_TOKEN_LIFETIME_MS,
        backendUser: token.backendUser,
      };
    } catch {
      return {
        ...token,
        error: 'RefreshAccessTokenError',
      };
    }
  })();

  // Store cache entry with promise
  const cacheEntry: RefreshCacheEntry = {
    promise: refreshPromise,
    timestamp: Date.now(),
  };
  refreshCache.set(refreshTokenSuffix, cacheEntry);

  // Wait for result and cache it
  const result = await refreshPromise;
  cacheEntry.result = result;

  return result;
}

// =============================================================================
// NextAuth Configuration
// =============================================================================

/**
 * Build the list of auth providers.
 * Credentials provider is only added if ENABLE_CREDENTIALS_AUTH=true.
 */
function buildProviders() {
  // biome-ignore lint/suspicious/noExplicitAny: NextAuth providers have complex union types that don't work well with array.push()
  const providers: any[] = [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      authorization: { params: { prompt: 'consent', access_type: 'offline' } },
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    }),
  ];

  // Add Credentials provider if enabled
  if (ENABLE_CREDENTIALS_AUTH) {
    providers.push(
      Credentials({
        id: 'credentials',
        name: 'Email & Password',
        credentials: {
          email: { label: 'Email', type: 'email', placeholder: 'test@example.com' },
          password: { label: 'Password', type: 'password' },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          try {
            const url = `${INTERNAL_API_URL}/api/auth/login/`;

            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
              }),
            });

            if (!res.ok) {
              return null;
            }

            const data = await res.json();

            // Return user object with tokens attached
            // These will be picked up by the jwt callback
            return {
              id: String(data.user.id),
              email: data.user.email,
              name: `${data.user.first_name} ${data.user.last_name}`.trim(),
              image: data.user.avatar,
              // Attach tokens for jwt callback
              accessToken: data.access,
              refreshToken: data.refresh,
              backendUser: data.user,
            };
          } catch {
            return null;
          }
        },
      })
    );
  }

  return providers;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: buildProviders(),
  callbacks: {
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: JWT callback handles multiple auth flows (signin, refresh, update) - splitting would obscure the flow
    async jwt({ token, account, trigger, session: updateData, user }) {
      // Handle session update from client
      if (trigger === 'update') {
        // If updateData contains new tokens (from a successful direct refresh), use them
        if (updateData) {
          const data = updateData as { accessToken?: string; refreshToken?: string };
          if (data.accessToken) {
            return handleSessionUpdate(token, data);
          }
        }

        // Otherwise, update() was called to force a refresh (e.g., on 401)
        if (token.refreshToken && token.error !== 'RefreshAccessTokenError') {
          const refreshedToken = await refreshAccessToken(token);
          return {
            ...token,
            ...refreshedToken,
          };
        }
        return token;
      }

      // Initial sign in - exchange OAuth token for Django JWT
      if (account) {
        // Handle Credentials provider - tokens already obtained in authorize()
        if (account.provider === 'credentials') {
          // User object from authorize() contains the tokens (passed via `user` param in NextAuth v5)
          const credentialsUser = user as unknown as {
            accessToken?: string;
            refreshToken?: string;
            backendUser?: {
              id: number;
              email: string;
              first_name: string;
              last_name: string;
              avatar: string;
              user_type: string;
              is_staff: boolean;
            };
          };

          if (credentialsUser?.accessToken && credentialsUser?.refreshToken) {
            token.accessToken = credentialsUser.accessToken;
            token.refreshToken = credentialsUser.refreshToken;
            token.accessTokenExpires = Date.now() + ACCESS_TOKEN_LIFETIME_MS;
            token.backendUser = credentialsUser.backendUser;
            token.error = undefined;
          }
          return token;
        }

        // Handle OAuth providers (Google, GitHub)
        const endpoint = account.provider === 'google' ? '/api/auth/google/' : '/api/auth/github/';
        const body =
          account.provider === 'google'
            ? { id_token: account.id_token }
            : { access_token: account.access_token };

        try {
          const url = `${INTERNAL_API_URL}${endpoint}`;

          // Use oauthFetch for OAuth token exchange (with retry logic)
          const res = await oauthFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

          if (!res.ok) {
            token.error = 'BackendAuthError';
            return token;
          }

          const data = await res.json();
          token.accessToken = data.access;
          token.refreshToken = data.refresh;
          token.accessTokenExpires = Date.now() + ACCESS_TOKEN_LIFETIME_MS;
          token.backendUser = data.user;
          token.error = undefined;
        } catch {
          token.error = 'BackendAuthError';
        }
        return token;
      }

      // Return previous token if it hasn't expired yet
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
        return token;
      }

      // Don't retry refresh if it already failed - prevents infinite loop
      if (token.error === 'RefreshAccessTokenError') {
        return token;
      }

      // Access token has expired, try to refresh it
      if (token.refreshToken) {
        const refreshedToken = await refreshAccessToken(token);
        return {
          ...token,
          ...refreshedToken,
        };
      }

      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.error = token.error;
      if (token.backendUser) {
        session.user = {
          ...session.user,
          id: String(token.backendUser.id),
          name: `${token.backendUser.first_name} ${token.backendUser.last_name}`.trim(),
          email: token.backendUser.email,
          image: token.backendUser.avatar,
          userType: token.backendUser.user_type,
          isStaff: token.backendUser.is_staff,
        };
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});
