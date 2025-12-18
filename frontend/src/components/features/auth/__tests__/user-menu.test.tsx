import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { signOut, useSession } from 'next-auth/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { UserMenu } from '../user-menu';

// Suppress JSDOM navigation errors (JSDOM doesn't implement navigation)
let consoleError: ReturnType<typeof vi.spyOn>;

beforeAll(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Not implemented: navigation')) {
      return;
    }
    console.warn(...args);
  });
});

afterAll(() => {
  consoleError.mockRestore();
});

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

// Mock Next.js Image component
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    // biome-ignore lint/a11y/useAltText: test mock needs explicit props
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockSession = {
  user: {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    image: 'https://example.com/avatar.jpg',
  },
  expires: '2024-12-31',
};

describe('UserMenu', () => {
  describe('rendering', () => {
    it('renders nothing when no session', () => {
      vi.mocked(useSession).mockReturnValue({ data: null, status: 'unauthenticated' } as any);

      const { container } = render(<UserMenu />);

      expect(container).toBeEmptyDOMElement();
    });

    it('renders user avatar when session exists', () => {
      vi.mocked(useSession).mockReturnValue({ data: mockSession, status: 'authenticated' } as any);

      render(<UserMenu />);

      const avatar = screen.getByAltText('John Doe');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('renders user initials when no image', () => {
      const sessionWithoutImage = {
        ...mockSession,
        user: { ...mockSession.user, image: null },
      };
      vi.mocked(useSession).mockReturnValue({
        data: sessionWithoutImage,
        status: 'authenticated',
      } as any);

      render(<UserMenu />);

      const initials = screen.getByText('J');
      expect(initials).toBeInTheDocument();
    });

    it('renders email initial when no name', () => {
      const sessionWithoutName = {
        ...mockSession,
        user: { ...mockSession.user, name: null, image: null },
      };
      vi.mocked(useSession).mockReturnValue({
        data: sessionWithoutName,
        status: 'authenticated',
      } as any);

      render(<UserMenu />);

      const initials = screen.getByText('j'); // First letter of email
      expect(initials).toBeInTheDocument();
    });

    it('does not show menu dropdown by default', () => {
      vi.mocked(useSession).mockReturnValue({ data: mockSession, status: 'authenticated' } as any);

      render(<UserMenu />);

      const becomeTutorLink = screen.queryByText('Become a Tutor');
      expect(becomeTutorLink).not.toBeInTheDocument();
    });
  });

  describe('menu interactions', () => {
    it('opens menu when avatar is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(useSession).mockReturnValue({ data: mockSession, status: 'authenticated' } as any);

      render(<UserMenu />);

      const button = screen.getByRole('button', { expanded: false });
      await user.click(button);

      expect(screen.getByText('Become a Tutor')).toBeInTheDocument();
      expect(screen.getByText('My Bookings')).toBeInTheDocument();
      expect(screen.getByText('Sign out')).toBeInTheDocument();
    });

    it('displays user info in menu header', async () => {
      const user = userEvent.setup();
      vi.mocked(useSession).mockReturnValue({ data: mockSession, status: 'authenticated' } as any);

      render(<UserMenu />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('closes menu when clicking outside', async () => {
      const user = userEvent.setup();
      vi.mocked(useSession).mockReturnValue({ data: mockSession, status: 'authenticated' } as any);

      render(<UserMenu />);

      // Open menu
      const button = screen.getByRole('button');
      await user.click(button);
      expect(screen.getByText('Become a Tutor')).toBeInTheDocument();

      // Click backdrop
      const backdrop = screen.getByLabelText('Close menu');
      await user.click(backdrop);

      // Menu should be closed
      expect(screen.queryByText('Become a Tutor')).not.toBeInTheDocument();
    });

    it('closes menu when Escape is pressed', async () => {
      const user = userEvent.setup();
      vi.mocked(useSession).mockReturnValue({ data: mockSession, status: 'authenticated' } as any);

      render(<UserMenu />);

      // Open menu
      const button = screen.getByRole('button');
      await user.click(button);
      expect(screen.getByText('Become a Tutor')).toBeInTheDocument();

      // Press Escape
      await user.keyboard('{Escape}');

      // Menu should be closed
      expect(screen.queryByText('Become a Tutor')).not.toBeInTheDocument();
    });

    it('closes menu when clicking a navigation link', async () => {
      const user = userEvent.setup();
      vi.mocked(useSession).mockReturnValue({ data: mockSession, status: 'authenticated' } as any);

      render(<UserMenu />);

      // Open menu
      const button = screen.getByRole('button');
      await user.click(button);

      // Click navigation link
      const becomeTutorLink = screen.getByText('Become a Tutor');
      await user.click(becomeTutorLink);

      // Menu should be closed
      expect(screen.queryByText('My Bookings')).not.toBeInTheDocument();
    });
  });

  describe('navigation links', () => {
    it('has correct href for Become a Tutor link', async () => {
      const user = userEvent.setup();
      vi.mocked(useSession).mockReturnValue({ data: mockSession, status: 'authenticated' } as any);

      render(<UserMenu />);

      const button = screen.getByRole('button');
      await user.click(button);

      const link = screen.getByText('Become a Tutor').closest('a');
      expect(link).toHaveAttribute('href', '/tutors/create');
    });

    it('has correct href for My Bookings link', async () => {
      const user = userEvent.setup();
      vi.mocked(useSession).mockReturnValue({ data: mockSession, status: 'authenticated' } as any);

      render(<UserMenu />);

      const button = screen.getByRole('button');
      await user.click(button);

      const link = screen.getByText('My Bookings').closest('a');
      expect(link).toHaveAttribute('href', '/bookings');
    });
  });

  describe('sign out', () => {
    it('calls signOut when Sign out is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(useSession).mockReturnValue({ data: mockSession, status: 'authenticated' } as any);

      render(<UserMenu />);

      // Open menu
      const button = screen.getByRole('button');
      await user.click(button);

      // Click sign out
      const signOutButton = screen.getByText('Sign out');
      await user.click(signOutButton);

      expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/' });
    });

    it('sign out button has distinct styling', async () => {
      const user = userEvent.setup();
      vi.mocked(useSession).mockReturnValue({ data: mockSession, status: 'authenticated' } as any);

      render(<UserMenu />);

      const button = screen.getByRole('button');
      await user.click(button);

      const signOutButton = screen.getByText('Sign out');
      expect(signOutButton).toHaveClass('text-red-600');
    });
  });

  describe('accessibility', () => {
    it('has correct ARIA attributes for menu button', () => {
      vi.mocked(useSession).mockReturnValue({ data: mockSession, status: 'authenticated' } as any);

      render(<UserMenu />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAttribute('aria-haspopup', 'true');
    });

    it('updates aria-expanded when menu is open', async () => {
      const user = userEvent.setup();
      vi.mocked(useSession).mockReturnValue({ data: mockSession, status: 'authenticated' } as any);

      render(<UserMenu />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('backdrop has accessible label', async () => {
      const user = userEvent.setup();
      vi.mocked(useSession).mockReturnValue({ data: mockSession, status: 'authenticated' } as any);

      render(<UserMenu />);

      const button = screen.getByRole('button');
      await user.click(button);

      const backdrop = screen.getByLabelText('Close menu');
      expect(backdrop).toBeInTheDocument();
    });

    it('is keyboard navigable', async () => {
      const user = userEvent.setup();
      vi.mocked(useSession).mockReturnValue({ data: mockSession, status: 'authenticated' } as any);

      render(<UserMenu />);

      // Tab to button
      await user.tab();
      const button = screen.getByRole('button');
      expect(button).toHaveFocus();

      // Open with Enter
      await user.keyboard('{Enter}');
      expect(screen.getByText('Become a Tutor')).toBeInTheDocument();
    });
  });
});
