import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAuthMock } from '../../../tests/test-utils';
import HomePage from '../page';

// Setup auth mock using shared utility
const authMock = createAuthMock();
vi.mock('@/auth', () => ({
  auth: () => authMock.mock(),
}));

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock Header component to avoid auth dependencies
vi.mock('@/components/features/layout/header', () => ({
  Header: () => <header data-testid="header">Header</header>,
}));

describe('HomePage', () => {
  beforeEach(() => {
    authMock.setSession(null);
  });
  it('renders the main heading', async () => {
    render(await HomePage());

    const heading = screen.getByRole('heading', { name: /tutors marketplace/i });
    expect(heading).toBeInTheDocument();
  });

  it('renders the description text', async () => {
    render(await HomePage());

    const description = screen.getByText(/find and book tutors for any subject/i);
    expect(description).toBeInTheDocument();
  });

  it('renders the main container with correct styles', async () => {
    render(await HomePage());

    const main = screen.getByRole('main');
    expect(main).toHaveClass('flex', 'flex-1', 'flex-col', 'items-center', 'justify-center');
  });
});
