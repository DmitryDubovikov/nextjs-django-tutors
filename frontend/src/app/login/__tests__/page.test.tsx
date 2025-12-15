import { render, screen } from '@testing-library/react';
import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LoginPage from '../page';

// Mock auth function
const mockAuth = vi.fn();
vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}));

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock SignInButton component
vi.mock('@/components/features/auth/sign-in-button', () => ({
  SignInButton: ({ provider }: { provider: string }) => (
    <button type="button" data-testid={`sign-in-${provider}`}>
      Sign in with {provider}
    </button>
  ),
}));

describe('LoginPage', () => {
  describe('when not authenticated', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(null);
      vi.mocked(redirect).mockClear();
    });

    it('renders the site title', async () => {
      render(await LoginPage());

      const title = screen.getByText('Tutors Marketplace');
      expect(title).toBeInTheDocument();
    });

    it('renders sign in message', async () => {
      render(await LoginPage());

      expect(screen.getByText('Sign in to continue')).toBeInTheDocument();
    });

    it('renders Google sign-in button', async () => {
      render(await LoginPage());

      const googleButton = screen.getByTestId('sign-in-google');
      expect(googleButton).toBeInTheDocument();
    });

    it('renders GitHub sign-in button', async () => {
      render(await LoginPage());

      const githubButton = screen.getByTestId('sign-in-github');
      expect(githubButton).toBeInTheDocument();
    });

    it('renders terms of service text', async () => {
      render(await LoginPage());

      const termsText = screen.getByText(/by signing in, you agree to our/i);
      expect(termsText).toBeInTheDocument();
      expect(screen.getByText(/terms of service/i)).toBeInTheDocument();
      expect(screen.getByText(/privacy policy/i)).toBeInTheDocument();
    });

    it('renders back to home link', async () => {
      render(await LoginPage());

      const backLink = screen.getByText('Back to home');
      expect(backLink).toBeInTheDocument();
      expect(backLink.closest('a')).toHaveAttribute('href', '/');
    });

    it('does not redirect when not authenticated', async () => {
      render(await LoginPage());

      expect(redirect).not.toHaveBeenCalled();
    });
  });

  describe('when authenticated', () => {
    it('redirects to home page when already authenticated', async () => {
      const mockSession = {
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        expires: '2024-12-31',
      };
      mockAuth.mockResolvedValue(mockSession);

      // The redirect will throw in actual Next.js, but we're mocking it
      await LoginPage();

      expect(redirect).toHaveBeenCalledWith('/');
    });
  });

  describe('layout and styling', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(null);
    });

    it('has centered layout', async () => {
      const { container } = render(await LoginPage());

      const main = container.querySelector('main');
      expect(main).toHaveClass('flex', 'min-h-screen', 'items-center', 'justify-center');
    });

    it('has max-width constraint on content', async () => {
      const { container } = render(await LoginPage());

      const contentWrapper = container.querySelector('.max-w-sm');
      expect(contentWrapper).toBeInTheDocument();
    });

    it('has proper spacing between elements', async () => {
      const { container } = render(await LoginPage());

      const buttonContainer = container.querySelector('.space-y-3');
      expect(buttonContainer).toBeInTheDocument();
    });

    it('has card-like styling for sign-in section', async () => {
      const { container } = render(await LoginPage());

      const signInCard = container.querySelector('.rounded-xl.border.bg-white');
      expect(signInCard).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(null);
    });

    it('uses semantic main element', async () => {
      const { container } = render(await LoginPage());

      const main = container.querySelector('main');
      expect(main).toBeInTheDocument();
    });

    it('site title is a clickable link', async () => {
      render(await LoginPage());

      const titleLink = screen.getByText('Tutors Marketplace').closest('a');
      expect(titleLink).toHaveAttribute('href', '/');
    });

    it('all navigation links are accessible', async () => {
      render(await LoginPage());

      const backLink = screen.getByText('Back to home').closest('a');
      expect(backLink).toHaveAttribute('href', '/');
    });

    it('has proper text hierarchy', async () => {
      render(await LoginPage());

      // Title should be larger than subtitle
      const title = screen.getByText('Tutors Marketplace');
      const subtitle = screen.getByText('Sign in to continue');

      expect(title).toHaveClass('text-2xl');
      expect(subtitle).toHaveClass('text-muted-foreground');
    });
  });

  describe('metadata', () => {
    it('exports metadata with correct title', async () => {
      // Import the metadata export
      const { metadata } = await import('../page');

      expect(metadata.title).toBe('Sign In - Tutors Marketplace');
    });

    it('exports metadata with correct description', async () => {
      const { metadata } = await import('../page');

      expect(metadata.description).toBe('Sign in to find and book tutors');
    });
  });

  describe('sign-in button ordering', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(null);
    });

    it('renders Google button before GitHub button', async () => {
      render(await LoginPage());

      const buttons = screen.getAllByRole('button');
      const googleIndex = buttons.findIndex((btn) =>
        btn.getAttribute('data-testid')?.includes('google')
      );
      const githubIndex = buttons.findIndex((btn) =>
        btn.getAttribute('data-testid')?.includes('github')
      );

      expect(googleIndex).toBeLessThan(githubIndex);
    });
  });
});
