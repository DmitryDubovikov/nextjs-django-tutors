import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mock next-auth to avoid 'next/server' import issues in vitest
vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}));

// Mock api-client to avoid auth import chain
vi.mock('@/lib/api-client', () => ({
  setClientAccessToken: vi.fn(),
}));

import { Providers } from '../providers';

describe('RootLayout', () => {
  it('renders children through Providers correctly', () => {
    // Test that Providers correctly renders children
    // We don't test the full RootLayout with <html> tag as it causes hydration warnings in jsdom
    render(
      <Providers>
        <div data-testid="child">Test Content</div>
      </Providers>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('exports metadata with correct title', async () => {
    // Test that metadata is exported (compile-time check)
    const { metadata } = await import('../layout');
    expect(metadata).toBeDefined();
    expect(metadata.title).toBe('Tutors Marketplace');
    expect(metadata.description).toBe('Find and book tutors for any subject');
  });
});
