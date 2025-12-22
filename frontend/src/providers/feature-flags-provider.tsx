'use client';

import { useSession } from 'next-auth/react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { type ApiResponse, customFetch } from '@/lib/api-client';

interface FeatureFlagsData {
  flags: Record<string, boolean>;
  experiments: Record<string, string>;
}

interface FeatureFlagsContextValue extends FeatureFlagsData {
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

const FEATURE_FLAGS_ENDPOINT = '/api/feature-flags/';

interface FeatureFlagsProviderProps {
  children: ReactNode;
}

export function FeatureFlagsProvider({ children }: FeatureFlagsProviderProps) {
  const { data: session, status } = useSession();
  const [data, setData] = useState<FeatureFlagsData>({
    flags: {},
    experiments: {},
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // Track the last userId we fetched flags for to refetch on user change
  const lastUserIdRef = useRef<string | null | undefined>(undefined);

  const fetchFlags = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await customFetch<ApiResponse<FeatureFlagsData>>(FEATURE_FLAGS_ENDPOINT);

      setData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch feature flags'));
      setData({ flags: {}, experiments: {} });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch flags when session status changes or user changes
  useEffect(() => {
    // Wait for session to be determined (not 'loading')
    if (status === 'loading') {
      return;
    }

    const currentUserId = session?.user?.id ?? null;

    // Only refetch if user changed (or first load after session determined)
    if (lastUserIdRef.current !== currentUserId) {
      lastUserIdRef.current = currentUserId;
      fetchFlags();
    }
  }, [status, session?.user?.id, fetchFlags]);

  const value: FeatureFlagsContextValue = {
    ...data,
    isLoading,
    error,
    refetch: fetchFlags,
  };

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}

export function useFeatureFlags(): FeatureFlagsContextValue {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within FeatureFlagsProvider');
  }
  return context;
}

export function useFlag(name: string): boolean {
  const { flags, isLoading } = useFeatureFlags();
  if (isLoading) return false;
  return flags[name] ?? false;
}

export function useExperimentVariant(name: string): string {
  const { experiments, isLoading } = useFeatureFlags();
  if (isLoading) return 'control';
  return experiments[name] ?? 'control';
}
