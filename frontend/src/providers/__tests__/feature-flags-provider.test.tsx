import { renderHook, waitFor } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock api-client to avoid next-auth import chain
const mockCustomFetch = vi.fn();
vi.mock('@/lib/api-client', () => ({
  customFetch: (url: string) => mockCustomFetch(url),
  ApiResponse: {},
}));

// Helper wrapper that includes SessionProvider
function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SessionProvider session={{ user: { id: 'test-user' }, expires: '' }}>
        <FeatureFlagsProvider>{children}</FeatureFlagsProvider>
      </SessionProvider>
    );
  };
}

import {
  FeatureFlagsProvider,
  useExperimentVariant,
  useFeatureFlags,
  useFlag,
} from '../feature-flags-provider';

describe('FeatureFlagsProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useFeatureFlags', () => {
    it('throws error when used outside provider', () => {
      expect(() => {
        renderHook(() => useFeatureFlags());
      }).toThrow('useFeatureFlags must be used within FeatureFlagsProvider');
    });

    it('fetches flags on mount', async () => {
      mockCustomFetch.mockResolvedValueOnce({
        data: {
          flags: { semantic_search_enabled: true },
          experiments: { tutor_card_experiment: 'v2' },
        },
      });

      const { result } = renderHook(() => useFeatureFlags(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.flags).toEqual({ semantic_search_enabled: true });
      expect(result.current.experiments).toEqual({ tutor_card_experiment: 'v2' });
      expect(result.current.error).toBeNull();
      expect(mockCustomFetch).toHaveBeenCalledWith('/api/feature-flags/');
    });

    it('handles fetch error gracefully', async () => {
      mockCustomFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useFeatureFlags(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Network error');
      expect(result.current.flags).toEqual({});
      expect(result.current.experiments).toEqual({});
    });

    it('handles non-Error exceptions', async () => {
      mockCustomFetch.mockRejectedValueOnce('String error');

      const { result } = renderHook(() => useFeatureFlags(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to fetch feature flags');
    });
  });

  describe('useFlag', () => {
    it('returns flag value when loaded', async () => {
      mockCustomFetch.mockResolvedValueOnce({
        data: {
          flags: {
            semantic_search_enabled: true,
            chat_reactions_enabled: false,
          },
          experiments: {},
        },
      });

      const { result } = renderHook(() => useFlag('semantic_search_enabled'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('returns false for non-existent flag', async () => {
      mockCustomFetch.mockResolvedValueOnce({
        data: {
          flags: { semantic_search_enabled: true },
          experiments: {},
        },
      });

      const { result } = renderHook(() => useFlag('non_existent_flag'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current).toBe(false);
      });
    });

    it('throws error when used outside provider', () => {
      expect(() => {
        renderHook(() => useFlag('semantic_search_enabled'));
      }).toThrow('useFeatureFlags must be used within FeatureFlagsProvider');
    });
  });

  describe('useExperimentVariant', () => {
    it('returns variant value when loaded', async () => {
      mockCustomFetch.mockResolvedValueOnce({
        data: {
          flags: {},
          experiments: {
            tutor_card_experiment: 'v2',
            checkout_flow_experiment: 'streamlined',
          },
        },
      });

      const { result } = renderHook(() => useExperimentVariant('tutor_card_experiment'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current).toBe('v2');
      });
    });

    it('returns control for non-existent experiment', async () => {
      mockCustomFetch.mockResolvedValueOnce({
        data: {
          flags: {},
          experiments: { tutor_card_experiment: 'v2' },
        },
      });

      const { result } = renderHook(() => useExperimentVariant('non_existent_experiment'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current).toBe('control');
      });
    });

    it('throws error when used outside provider', () => {
      expect(() => {
        renderHook(() => useExperimentVariant('tutor_card_experiment'));
      }).toThrow('useFeatureFlags must be used within FeatureFlagsProvider');
    });
  });
});
