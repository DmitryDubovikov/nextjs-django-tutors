import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMediaQuery } from '../use-media-query';

describe('useMediaQuery', () => {
  let matchMediaMock: ReturnType<typeof vi.fn>;
  let listeners: ((e: MediaQueryListEvent) => void)[];

  beforeEach(() => {
    listeners = [];

    matchMediaMock = vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          listeners.push(listener);
        }
      }),
      removeEventListener: vi.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          const index = listeners.indexOf(listener);
          if (index !== -1) {
            listeners.splice(index, 1);
          }
        }
      }),
      dispatchEvent: vi.fn(),
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      onchange: null,
    }));

    window.matchMedia = matchMediaMock;
  });

  afterEach(() => {
    vi.clearAllMocks();
    listeners = [];
  });

  describe('rendering', () => {
    it('returns false initially on server/first render', () => {
      const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));

      expect(result.current).toBe(false);
    });

    it('calls window.matchMedia with the correct query', () => {
      const query = '(max-width: 768px)';
      renderHook(() => useMediaQuery(query));

      expect(matchMediaMock).toHaveBeenCalledWith(query);
    });
  });

  describe('media query matching', () => {
    it('returns true when media query matches', async () => {
      matchMediaMock.mockReturnValue({
        matches: true,
        media: '(max-width: 768px)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        onchange: null,
      });

      const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('returns false when media query does not match', async () => {
      matchMediaMock.mockReturnValue({
        matches: false,
        media: '(max-width: 768px)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        onchange: null,
      });

      const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));

      await waitFor(() => {
        expect(result.current).toBe(false);
      });
    });
  });

  describe('event listeners', () => {
    it('updates when media query match changes', async () => {
      let currentMatches = false;

      matchMediaMock.mockImplementation((query: string) => ({
        matches: currentMatches,
        media: query,
        addEventListener: vi.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
          if (event === 'change') {
            listeners.push(listener);
          }
        }),
        removeEventListener: vi.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
          if (event === 'change') {
            const index = listeners.indexOf(listener);
            if (index !== -1) {
              listeners.splice(index, 1);
            }
          }
        }),
        dispatchEvent: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        onchange: null,
      }));

      const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));

      await waitFor(() => {
        expect(result.current).toBe(false);
      });

      // Simulate media query change
      currentMatches = true;
      act(() => {
        for (const listener of listeners) {
          listener({ matches: true } as MediaQueryListEvent);
        }
      });

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('removes event listener on unmount', () => {
      const removeEventListenerMock = vi.fn();

      matchMediaMock.mockReturnValue({
        matches: false,
        media: '(max-width: 768px)',
        addEventListener: vi.fn(),
        removeEventListener: removeEventListenerMock,
        dispatchEvent: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        onchange: null,
      });

      const { unmount } = renderHook(() => useMediaQuery('(max-width: 768px)'));

      unmount();

      expect(removeEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('different queries', () => {
    it('works with mobile breakpoint', async () => {
      matchMediaMock.mockReturnValue({
        matches: true,
        media: '(max-width: 768px)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        onchange: null,
      });

      const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('works with desktop breakpoint', async () => {
      matchMediaMock.mockReturnValue({
        matches: true,
        media: '(min-width: 1024px)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        onchange: null,
      });

      const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('works with prefers-color-scheme', async () => {
      matchMediaMock.mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        onchange: null,
      });

      const { result } = renderHook(() => useMediaQuery('(prefers-color-scheme: dark)'));

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });
  });

  describe('re-rendering', () => {
    it('updates when query prop changes', async () => {
      matchMediaMock.mockImplementation((query: string) => ({
        matches: query === '(max-width: 768px)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        onchange: null,
      }));

      const { result, rerender } = renderHook(({ query }) => useMediaQuery(query), {
        initialProps: { query: '(max-width: 768px)' },
      });

      await waitFor(() => {
        expect(result.current).toBe(true);
      });

      rerender({ query: '(min-width: 1024px)' });

      await waitFor(() => {
        expect(result.current).toBe(false);
      });
    });
  });
});
