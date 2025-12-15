/**
 * Shared test utilities and fixtures.
 * Use these to avoid code duplication across test files.
 */
import { vi } from 'vitest';

/**
 * Mock session data factory.
 * Creates a valid session object with sensible defaults.
 */
export const createMockSession = (overrides: Record<string, unknown> = {}) => ({
  user: {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    image: null,
  },
  expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  accessToken: 'test-access-token',
  ...overrides,
});

/**
 * Helper to create a mock for @/auth module.
 * This should be called at the top level of test files before imports.
 *
 * @example
 * ```typescript
 * const mockAuth = vi.fn();
 * vi.mock('@/auth', () => ({
 *   auth: () => mockAuth(),
 * }));
 *
 * // In tests:
 * mockAuth.mockResolvedValue(createMockSession());
 * ```
 */
export const createAuthMock = () => {
  const mockAuth = vi.fn();
  return {
    mock: mockAuth,
    setSession: (session: ReturnType<typeof createMockSession> | null) =>
      mockAuth.mockResolvedValue(session),
    setError: (error: Error) => mockAuth.mockRejectedValue(error),
    reset: () => mockAuth.mockClear(),
  };
};

/**
 * Common mock configurations for next-auth/react hooks.
 */
export const createNextAuthMocks = () => ({
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
});

/**
 * Mock session states for useSession hook.
 */
export const sessionStates = {
  unauthenticated: { data: null, status: 'unauthenticated' as const },
  loading: { data: null, status: 'loading' as const },
  authenticated: (session = createMockSession()) => ({
    data: session,
    status: 'authenticated' as const,
  }),
};
