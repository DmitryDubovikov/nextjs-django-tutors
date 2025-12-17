/**
 * Custom fetch client for API requests.
 * Used as the mutator for orval-generated hooks.
 *
 * Token refresh strategy:
 * - All token refresh happens through NextAuth (single source of truth)
 * - This avoids race conditions with Django's ROTATE_REFRESH_TOKENS=True
 * - On 401, we trigger NextAuth session refresh via getSession()
 */

import { auth } from '@/auth';

// =============================================================================
// Constants
// =============================================================================

/** Maximum number of retry attempts on 401 */
const MAX_RETRY_COUNT = 2;

/** Base delay for retry exponential backoff (ms) */
const RETRY_BASE_DELAY_MS = 100;

// =============================================================================
// Client-side Token Storage
// =============================================================================

/**
 * Client-side token storage.
 * Synced from SessionProvider via AuthTokenSync component in providers.tsx.
 * This avoids HTTP requests to /api/auth/session on every API call.
 */
let clientAccessToken: string | null = null;

/**
 * Promise deduplication for session refresh.
 * All concurrent refresh requests share the same Promise.
 */
let sessionRefreshPromise: Promise<string | null> | null = null;

/**
 * Set the client-side tokens.
 * Called by AuthTokenSync component when session changes.
 */
export function setClientAccessToken(token: string | null): void {
  clientAccessToken = token;
}

export function setClientRefreshToken(_token: string | null): void {
  // Refresh token is stored in NextAuth session, not used directly by api-client
}

// =============================================================================
// Session Refresh Callbacks
// =============================================================================

/**
 * Callback to trigger NextAuth session refresh.
 * Set by AuthTokenSync component.
 * Returns the new access token if successful.
 */
let onSessionRefreshNeeded: (() => Promise<string | null>) | null = null;

export function setSessionRefreshCallback(callback: (() => Promise<string | null>) | null): void {
  onSessionRefreshNeeded = callback;
}

/**
 * Callback to trigger signOut when refresh fails.
 * Set by AuthTokenSync component.
 */
let onRefreshFailed: (() => void) | null = null;

export function setRefreshFailedCallback(callback: (() => void) | null): void {
  onRefreshFailed = callback;
}

/**
 * Trigger NextAuth session refresh via callback.
 * Uses Promise deduplication - all concurrent calls share the same Promise.
 * Returns the new access token if successful, null otherwise.
 */
async function triggerSessionRefresh(): Promise<string | null> {
  if (!onSessionRefreshNeeded) {
    return null;
  }

  // Return existing refresh promise if one is in progress (deduplication)
  if (sessionRefreshPromise) {
    return sessionRefreshPromise;
  }

  sessionRefreshPromise = (async () => {
    try {
      const newToken = await onSessionRefreshNeeded?.();

      if (newToken) {
        return newToken;
      }

      if (onRefreshFailed) {
        onRefreshFailed();
      }
      return null;
    } catch {
      if (onRefreshFailed) {
        onRefreshFailed();
      }
      return null;
    }
  })();

  try {
    return await sessionRefreshPromise;
  } finally {
    sessionRefreshPromise = null;
  }
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Response shape returned by customFetch.
 * Use this type when calling customFetch directly (not via orval-generated hooks).
 */
export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
}

// Use internal Docker URL for server-side requests, public URL for client-side
const API_BASE_URL =
  typeof window === 'undefined'
    ? process.env.INTERNAL_API_URL || 'http://backend:8000'
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// =============================================================================
// Custom Fetch
// =============================================================================

/**
 * Custom fetch function for orval-generated hooks.
 * Orval calls this with (url, options) signature.
 *
 * For server-side rendering, this automatically adds JWT auth headers
 * from the user's session.
 *
 * @param _retryCount - Internal retry counter (do not set manually)
 */
export async function customFetch<T>(
  url: string,
  options?: RequestInit,
  _retryCount = 0
): Promise<T> {
  const fetchOptions = options;
  // Build full URL
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  // Prepare headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions?.headers,
  };

  // Add auth header from session
  if (typeof window === 'undefined') {
    // Server-side: use auth() to get session
    try {
      const session = await auth();
      if (session?.accessToken) {
        (headers as Record<string, string>).Authorization = `Bearer ${session.accessToken}`;
      }
    } catch {
      // Auth not available, continue without auth header
    }
  } else {
    // Client-side: use synced token (no HTTP request)
    if (clientAccessToken) {
      (headers as Record<string, string>).Authorization = `Bearer ${clientAccessToken}`;
    }
  }

  // Make request
  const response = await fetch(fullUrl, {
    ...fetchOptions,
    headers,
  });

  // 401 Interceptor - trigger NextAuth session refresh and retry (client-side only)
  if (response.status === 401 && typeof window !== 'undefined' && _retryCount < MAX_RETRY_COUNT) {
    const newToken = await triggerSessionRefresh();

    if (newToken) {
      // Exponential backoff delay before retry
      const delay = RETRY_BASE_DELAY_MS * 2 ** _retryCount;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return customFetch(url, options, _retryCount + 1);
    }
  }

  // Handle errors
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(response.status, response.statusText, errorData);
  }

  // Parse response
  if (response.status === 204) {
    return {
      data: {},
      status: 204,
      headers: response.headers,
    } as T;
  }

  const data = await response.json();

  return {
    data,
    status: response.status,
    headers: response.headers,
  } as T;
}

// =============================================================================
// API Error Class
// =============================================================================

/**
 * API error class with status and data.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data: unknown
  ) {
    super(`API Error: ${status} ${statusText}`);
    this.name = 'ApiError';
  }
}

export default customFetch;
