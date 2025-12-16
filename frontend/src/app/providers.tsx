'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider, useSession } from 'next-auth/react';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { Toaster } from '@/components/ui/toast';
import { setClientAccessToken } from '@/lib/api-client';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Syncs the access token from SessionProvider to the api-client module.
 * This allows customFetch to access the token without making HTTP requests.
 */
function AuthTokenSync() {
  const { data: session } = useSession();

  useEffect(() => {
    setClientAccessToken(session?.accessToken ?? null);
  }, [session?.accessToken]);

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
    <SessionProvider>
      <AuthTokenSync />
      <QueryClientProvider client={queryClient}>
        <NuqsAdapter>{children}</NuqsAdapter>
        <Toaster />
      </QueryClientProvider>
    </SessionProvider>
  );
}
