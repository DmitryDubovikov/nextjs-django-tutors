import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Input } from '../input';

describe('Input', () => {
  describe('rendering', () => {
    it('renders text input by default', () => {
      render(<Input />);

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'text');
    });

    it('renders with placeholder', () => {
      render(<Input placeholder="Enter name" />);

      expect(screen.getByPlaceholderText('Enter name')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<Input className="custom-input" />);

      expect(screen.getByRole('textbox')).toHaveClass('custom-input');
    });

    it('renders with different input types', () => {
      const { rerender } = render(<Input type="email" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');

      rerender(<Input type="tel" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'tel');
    });
  });

  describe('label', () => {
    it('renders with label', () => {
      render(<Input label="Username" />);

      expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });

    it('associates label with input', () => {
      render(<Input label="Email" id="email-input" />);

      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('id', 'email-input');
    });

    it('generates unique id when not provided', () => {
      render(<Input label="Name" />);

      const input = screen.getByLabelText('Name');
      expect(input).toHaveAttribute('id');
    });

    it('styles label red when error', () => {
      const { container } = render(<Input label="Email" error="Invalid email" />);

      const label = container.querySelector('label');
      expect(label).toHaveClass('text-error');
    });

    it('styles label with opacity when disabled', () => {
      const { container } = render(<Input label="Email" disabled />);

      const label = container.querySelector('label');
      expect(label).toHaveClass('opacity-50');
    });
  });

  describe('error state', () => {
    it('displays error message', () => {
      render(<Input error="This field is required" />);

      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('sets aria-invalid when error', () => {
      render(<Input error="Invalid" />);

      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('associates error with input via aria-describedby', () => {
      render(<Input error="Invalid email" id="email" />);

      const input = screen.getByRole('textbox');
      const errorId = `${input.id}-error`;
      expect(input).toHaveAttribute('aria-describedby', errorId);
    });

    it('applies error border styles', () => {
      render(<Input error="Error" />);

      expect(screen.getByRole('textbox')).toHaveClass('border-error');
    });

    it('error message has role="alert"', () => {
      render(<Input error="Required field" />);

      expect(screen.getByRole('alert')).toHaveTextContent('Required field');
    });
  });

  describe('helper text', () => {
    it('displays helper text', () => {
      render(<Input helperText="Enter your email address" />);

      expect(screen.getByText('Enter your email address')).toBeInTheDocument();
    });

    it('hides helper text when error is present', () => {
      render(<Input helperText="Helper text" error="Error message" />);

      expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('associates helper text with input via aria-describedby', () => {
      render(<Input helperText="Helper" id="input" />);

      const input = screen.getByRole('textbox');
      const helperId = `${input.id}-helper`;
      expect(input).toHaveAttribute('aria-describedby', helperId);
    });
  });

  describe('icons', () => {
    it('renders with left icon', () => {
      const LeftIcon = () => <span data-testid="left-icon">🔍</span>;
      render(<Input leftIcon={<LeftIcon />} />);

      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('renders with right icon', () => {
      const RightIcon = () => <span data-testid="right-icon">ℹ️</span>;
      render(<Input rightIcon={<RightIcon />} />);

      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('adjusts padding when left icon present', () => {
      const LeftIcon = () => <span>Icon</span>;
      render(<Input leftIcon={<LeftIcon />} />);

      expect(screen.getByRole('textbox')).toHaveClass('pl-10');
    });

    it('adjusts padding when right icon present', () => {
      const RightIcon = () => <span>Icon</span>;
      render(<Input rightIcon={<RightIcon />} />);

      expect(screen.getByRole('textbox')).toHaveClass('pr-10');
    });
  });

  describe('password toggle', () => {
    it('renders password toggle button when type="password" and showPasswordToggle', () => {
      render(<Input type="password" showPasswordToggle />);

      const toggleButton = screen.getByRole('button', { name: /show password/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it('toggles password visibility when clicked', async () => {
      const user = userEvent.setup();
      render(<Input type="password" showPasswordToggle />);

      // Password inputs don't have 'textbox' role by default, find by input element
      const input = document.querySelector('input') as HTMLInputElement;
      expect(input).toHaveAttribute('type', 'password');

      const toggleButton = screen.getByRole('button', { name: /show password/i });
      await user.click(toggleButton);

      expect(input).toHaveAttribute('type', 'text');
      expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /hide password/i }));
      expect(input).toHaveAttribute('type', 'password');
    });

    it('does not render toggle for non-password inputs', () => {
      render(<Input type="text" showPasswordToggle />);

      expect(screen.queryByRole('button', { name: /password/i })).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('accepts user input', async () => {
      const user = userEvent.setup();
      render(<Input />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'Hello World');

      expect(input).toHaveValue('Hello World');
    });

    it('cannot be edited when disabled', () => {
      render(<Input disabled />);

      expect(screen.getByRole('textbox')).toBeDisabled();
    });
  });

  describe('accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<Input label="Name" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAccessibleName('Name');
    });

    it('has focus-visible styles', () => {
      render(<Input />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('focus-visible:outline-none');
      expect(input).toHaveClass('focus-visible:ring-2');
    });
  });
});
