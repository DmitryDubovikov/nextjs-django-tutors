import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { signIn } from 'next-auth/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SignInButton } from '../sign-in-button';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}));

describe('SignInButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe('rendering', () => {
    it('renders Google sign-in button', () => {
      render(<SignInButton provider="google" />);

      const button = screen.getByRole('button', { name: /sign in with google/i });
      expect(button).toBeInTheDocument();
    });

    it('renders GitHub sign-in button', () => {
      render(<SignInButton provider="github" />);

      const button = screen.getByRole('button', { name: /sign in with github/i });
      expect(button).toBeInTheDocument();
    });

    it('displays Google icon for Google provider', () => {
      const { container } = render(<SignInButton provider="google" />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAccessibleName('Google');
    });

    it('displays GitHub icon for GitHub provider', () => {
      const { container } = render(<SignInButton provider="github" />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAccessibleName('GitHub');
    });

    it('applies custom className', () => {
      render(<SignInButton provider="google" className="custom-class" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('applies default styling', () => {
      render(<SignInButton provider="google" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('flex');
      expect(button).toHaveClass('w-full');
      expect(button).toHaveClass('items-center');
      expect(button).toHaveClass('justify-center');
      expect(button).toHaveClass('rounded-lg');
    });
  });

  describe('interactions', () => {
    it('calls signIn with google provider when clicked', async () => {
      const user = userEvent.setup();
      render(<SignInButton provider="google" />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(signIn).toHaveBeenCalledWith('google');
      expect(signIn).toHaveBeenCalledTimes(1);
    });

    it('calls signIn with github provider when clicked', async () => {
      const user = userEvent.setup();
      render(<SignInButton provider="github" />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(signIn).toHaveBeenCalledWith('github');
      expect(signIn).toHaveBeenCalledTimes(1);
    });

    it('handles multiple clicks', async () => {
      const user = userEvent.setup();
      render(<SignInButton provider="google" />);

      const button = screen.getByRole('button');
      await user.click(button);
      await user.click(button);

      expect(signIn).toHaveBeenCalledTimes(2);
    });

    it('has type="button" to prevent form submission', () => {
      render(<SignInButton provider="google" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });
  });

  describe('accessibility', () => {
    it('is keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<SignInButton provider="google" />);

      const button = screen.getByRole('button');
      await user.tab();
      expect(button).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(signIn).toHaveBeenCalledWith('google');
    });

    it('is accessible via Space key', async () => {
      const user = userEvent.setup();
      render(<SignInButton provider="google" />);

      await user.tab();
      await user.keyboard(' ');

      expect(signIn).toHaveBeenCalledWith('google');
    });
  });
});
