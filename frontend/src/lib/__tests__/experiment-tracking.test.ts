import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock next-auth to avoid 'next/server' import issues
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({ data: null })),
}));

// Mock feature flags provider to avoid import chain issues
vi.mock('@/providers/feature-flags-provider', () => ({
  useExperimentVariant: vi.fn(() => 'control'),
}));

import {
  type ConversionMetric,
  clearExposureCache,
  trackConversion,
  trackExposure,
} from '../experiment-tracking';

// Mock fetch - must be done with vi.stubGlobal to override MSW
const mockFetch = vi.fn();

function getRequestBody(callIndex: number): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const call = mockFetch.mock.calls[callIndex] as [string, RequestInit] | undefined;
  if (!call || !call[1]?.body) {
    throw new Error(`No call at index ${callIndex} or missing body`);
  }
  return JSON.parse(call[1].body as string) as Record<string, unknown>;
}

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})();

describe('experiment-tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
    vi.stubGlobal('sessionStorage', sessionStorageMock);
    sessionStorageMock.clear();
    clearExposureCache();
    mockFetch.mockResolvedValue({ ok: true });
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';
  });

  afterEach(() => {
    clearExposureCache();
    vi.unstubAllGlobals();
  });

  describe('trackExposure', () => {
    it('sends exposure event to backend', () => {
      trackExposure('tutor_card_experiment', 'v2', 'user-123');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/analytics/exposure/',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const callBody = getRequestBody(0);
      expect(callBody.experiment).toBe('tutor_card_experiment');
      expect(callBody.variant).toBe('v2');
      expect(callBody.session_id).toBeTruthy();
    });

    it('deduplicates exposure events per user per experiment', () => {
      trackExposure('tutor_card_experiment', 'v2', 'user-123');
      trackExposure('tutor_card_experiment', 'v2', 'user-123');
      trackExposure('tutor_card_experiment', 'v2', 'user-123');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('tracks different experiments separately', () => {
      trackExposure('tutor_card_experiment', 'v2', 'user-123');
      trackExposure('checkout_flow_experiment', 'streamlined', 'user-123');

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('tracks different users separately', () => {
      trackExposure('tutor_card_experiment', 'v2', 'user-123');
      trackExposure('tutor_card_experiment', 'v2', 'user-456');

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('handles anonymous users', () => {
      trackExposure('tutor_card_experiment', 'control');

      expect(mockFetch).toHaveBeenCalledTimes(1);

      const callBody = getRequestBody(0);
      expect(callBody.experiment).toBe('tutor_card_experiment');
      expect(callBody.variant).toBe('control');
    });

    it('includes session_id in exposure event', () => {
      trackExposure('tutor_card_experiment', 'v2', 'user-123');

      const callBody = getRequestBody(0);
      expect(callBody.session_id).toBeTruthy();
      expect(typeof callBody.session_id).toBe('string');
    });

    it('uses consistent session ID across calls', () => {
      trackExposure('tutor_card_experiment', 'v2', 'user-123');
      clearExposureCache();
      trackExposure('tutor_card_experiment', 'v2', 'user-123');

      const callBody1 = getRequestBody(0);
      const callBody2 = getRequestBody(1);
      expect(callBody1.session_id).toBe(callBody2.session_id);
    });

    it('silently fails on network error', () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      expect(() => trackExposure('tutor_card_experiment', 'v2', 'user-123')).not.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('trackConversion', () => {
    it('sends conversion event with all valid metrics', () => {
      const metrics: ConversionMetric[] = [
        'click',
        'booking',
        'checkout_success',
        'checkout_abandon',
      ];

      for (const metric of metrics) {
        vi.clearAllMocks();
        trackConversion('tutor_card_experiment', 'v2', metric);

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/analytics/conversion/',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        );

        const callBody = getRequestBody(0);
        expect(callBody.experiment).toBe('tutor_card_experiment');
        expect(callBody.variant).toBe('v2');
        expect(callBody.metric).toBe(metric);
      }
    });

    it('includes metadata when provided', () => {
      const metadata = { tutorId: 123, subject: 'math' };

      trackConversion('tutor_card_experiment', 'v2', 'click', metadata);

      expect(mockFetch).toHaveBeenCalledTimes(1);

      const callBody = getRequestBody(0);
      expect(callBody.metadata).toEqual(metadata);
    });

    it('sends empty object when metadata is not provided', () => {
      trackConversion('tutor_card_experiment', 'v2', 'click');

      expect(mockFetch).toHaveBeenCalledTimes(1);

      const callBody = getRequestBody(0);
      expect(callBody.metadata).toEqual({});
    });

    it('does not deduplicate conversion events', () => {
      trackConversion('tutor_card_experiment', 'v2', 'click');
      trackConversion('tutor_card_experiment', 'v2', 'click');
      trackConversion('tutor_card_experiment', 'v2', 'click');

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('silently fails on network error', () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      expect(() => trackConversion('tutor_card_experiment', 'v2', 'click')).not.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearExposureCache', () => {
    it('clears exposure cache allowing re-tracking', () => {
      trackExposure('tutor_card_experiment', 'v2', 'user-123');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      vi.clearAllMocks();

      // Same call should not trigger new event (deduplicated)
      trackExposure('tutor_card_experiment', 'v2', 'user-123');
      expect(mockFetch).not.toHaveBeenCalled();

      // Clear cache
      clearExposureCache();

      // Now it should track again
      trackExposure('tutor_card_experiment', 'v2', 'user-123');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
