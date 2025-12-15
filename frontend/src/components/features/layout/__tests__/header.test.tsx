import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Header } from '../header';

// Mock auth function
const mockAuth = vi.fn();
vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}));

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock UserMenu component
vi.mock('@/components/features/auth/user-menu', () => ({
  UserMenu: () => <div data-testid="user-menu">User Menu</div>,
}));

describe('Header', () => {
  describe('rendering - unauthenticated', () => {
    it('renders site logo', async () => {
      mockAuth.mockResolvedValue(null);

      render(await Header());

      const logo = screen.getByText('Tutors Marketplace');
      expect(logo).toBeInTheDocument();
      expect(logo.closest('a')).toHaveAttribute('href', '/');
    });

    it('renders Find Tutors navigation link', async () => {
      mockAuth.mockResolvedValue(null);

      render(await Header());

      const link = screen.getByText('Find Tutors');
      expect(link).toBeInTheDocument();
      expect(link.closest('a')).toHaveAttribute('href', '/tutors');
    });

    it('renders Sign in button when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      render(await Header());

      const signInButton = screen.getByText('Sign in');
      expect(signInButton).toBeInTheDocument();
      expect(signInButton.closest('a')).toHaveAttribute('href', '/login');
    });

    it('does not render UserMenu when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      render(await Header());

      const userMenu = screen.queryByTestId('user-menu');
      expect(userMenu).not.toBeInTheDocument();
    });

    it('does not render Become a Tutor button when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      render(await Header());

      const becomeTutorButton = screen.queryByText('Become a Tutor');
      expect(becomeTutorButton).not.toBeInTheDocument();
    });
  });

  describe('rendering - authenticated', () => {
    const mockSession = {
      user: {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        image: 'https://example.com/avatar.jpg',
      },
      expires: '2024-12-31',
    };

    it('renders UserMenu when authenticated', async () => {
      mockAuth.mockResolvedValue(mockSession);

      render(await Header());

      const userMenu = screen.getByTestId('user-menu');
      expect(userMenu).toBeInTheDocument();
    });

    it('renders Become a Tutor button when authenticated', async () => {
      mockAuth.mockResolvedValue(mockSession);

      render(await Header());

      const becomeTutorButton = screen.getByText('Become a Tutor');
      expect(becomeTutorButton).toBeInTheDocument();
      expect(becomeTutorButton.closest('a')).toHaveAttribute('href', '/tutors/create');
    });

    it('does not render Sign in button when authenticated', async () => {
      mockAuth.mockResolvedValue(mockSession);

      render(await Header());

      const signInButton = screen.queryByText('Sign in');
      expect(signInButton).not.toBeInTheDocument();
    });

    it('still renders site logo and navigation', async () => {
      mockAuth.mockResolvedValue(mockSession);

      render(await Header());

      expect(screen.getByText('Tutors Marketplace')).toBeInTheDocument();
      expect(screen.getByText('Find Tutors')).toBeInTheDocument();
    });
  });

  describe('layout and styling', () => {
    it('has proper header structure', async () => {
      mockAuth.mockResolvedValue(null);

      const { container } = render(await Header());

      const header = container.querySelector('header');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('border-b', 'bg-white');
    });

    it('has responsive navigation hidden on mobile', async () => {
      mockAuth.mockResolvedValue(null);

      const { container } = render(await Header());

      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('hidden', 'md:flex');
    });

    it('Become a Tutor button is hidden on mobile', async () => {
      mockAuth.mockResolvedValue({
        user: { id: '1', name: 'Test', email: 'test@example.com' },
        expires: '2024-12-31',
      });

      render(await Header());

      const becomeTutorButton = screen.getByText('Become a Tutor');
      expect(becomeTutorButton.closest('a')).toHaveClass('hidden', 'md:block');
    });

    it('applies correct max-width container', async () => {
      mockAuth.mockResolvedValue(null);

      const { container } = render(await Header());

      const innerContainer = container.querySelector('.max-w-7xl');
      expect(innerContainer).toBeInTheDocument();
    });
  });

  describe('navigation links', () => {
    it('all links have correct styling', async () => {
      mockAuth.mockResolvedValue(null);

      render(await Header());

      const findTutorsLink = screen.getByText('Find Tutors');
      expect(findTutorsLink).toHaveClass('text-muted-foreground', 'hover:text-foreground');
    });

    it('Sign in button has primary styling', async () => {
      mockAuth.mockResolvedValue(null);

      render(await Header());

      const signInButton = screen.getByText('Sign in');
      expect(signInButton).toHaveClass('bg-primary', 'text-primary-foreground');
    });

    it('Become a Tutor has outline button styling', async () => {
      mockAuth.mockResolvedValue({
        user: { id: '1', name: 'Test', email: 'test@example.com' },
        expires: '2024-12-31',
      });

      render(await Header());

      const becomeTutorButton = screen.getByText('Become a Tutor');
      expect(becomeTutorButton).toHaveClass('border', 'border-primary', 'bg-white');
    });
  });

  describe('accessibility', () => {
    it('header is a semantic header element', async () => {
      mockAuth.mockResolvedValue(null);

      const { container } = render(await Header());

      const header = container.querySelector('header');
      expect(header).toBeInTheDocument();
    });

    it('navigation is a semantic nav element', async () => {
      mockAuth.mockResolvedValue(null);

      const { container } = render(await Header());

      const nav = container.querySelector('nav');
      expect(nav).toBeInTheDocument();
    });

    it('all interactive elements are accessible', async () => {
      mockAuth.mockResolvedValue({
        user: { id: '1', name: 'Test', email: 'test@example.com' },
        expires: '2024-12-31',
      });

      render(await Header());

      // Check links are links
      const logo = screen.getByText('Tutors Marketplace').closest('a');
      expect(logo).toHaveAttribute('href', '/');

      const findTutors = screen.getByText('Find Tutors').closest('a');
      expect(findTutors).toHaveAttribute('href', '/tutors');

      const becomeTutor = screen.getByText('Become a Tutor').closest('a');
      expect(becomeTutor).toHaveAttribute('href', '/tutors/create');
    });
  });
});
