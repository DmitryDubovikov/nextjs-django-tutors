import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Toaster, toast } from '../toast';

describe('Toaster', () => {
  beforeEach(() => {
    // Reset any toasts before each test
    toast.dismiss();
  });

  afterEach(() => {
    // Clean up toasts after each test
    toast.dismiss();
  });

  describe('rendering', () => {
    it('renders Toaster component', () => {
      const { container } = render(<Toaster />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('toast function', () => {
    it('shows default toast', async () => {
      render(<Toaster />);

      act(() => {
        toast({ title: 'Default Toast' });
      });

      await waitFor(() => {
        expect(screen.getByText('Default Toast')).toBeInTheDocument();
      });
    });

    it('shows toast with title and description', async () => {
      render(<Toaster />);

      act(() => {
        toast({
          title: 'Toast Title',
          description: 'Toast description text',
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Toast Title')).toBeInTheDocument();
        expect(screen.getByText('Toast description text')).toBeInTheDocument();
      });
    });

    it('shows success toast', async () => {
      render(<Toaster />);

      act(() => {
        toast({
          title: 'Success!',
          variant: 'success',
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Success!')).toBeInTheDocument();
      });
    });

    it('shows error toast', async () => {
      render(<Toaster />);

      act(() => {
        toast({
          title: 'Error!',
          variant: 'error',
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Error!')).toBeInTheDocument();
      });
    });

    it('shows warning toast', async () => {
      render(<Toaster />);

      act(() => {
        toast({
          title: 'Warning!',
          variant: 'warning',
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Warning!')).toBeInTheDocument();
      });
    });

    it('shows info toast', async () => {
      render(<Toaster />);

      act(() => {
        toast({
          title: 'Info',
          variant: 'info',
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Info')).toBeInTheDocument();
      });
    });

    it('returns toast ID', () => {
      render(<Toaster />);

      let toastId: string | number | undefined;
      act(() => {
        toastId = toast({ title: 'Test' });
      });

      expect(toastId).toBeDefined();
    });
  });

  describe('toast.dismiss', () => {
    it('dismisses toast by ID', async () => {
      render(<Toaster />);

      let toastId: string | number | undefined;
      act(() => {
        toastId = toast({ title: 'Dismissable', duration: 100000 });
      });

      await waitFor(() => {
        expect(screen.getByText('Dismissable')).toBeInTheDocument();
      });

      act(() => {
        toast.dismiss(toastId);
      });

      await waitFor(() => {
        expect(screen.queryByText('Dismissable')).not.toBeInTheDocument();
      });
    });

    it('dismisses all toasts when no ID provided', async () => {
      render(<Toaster />);

      act(() => {
        toast({ title: 'Toast 1', duration: 100000 });
        toast({ title: 'Toast 2', duration: 100000 });
      });

      await waitFor(() => {
        expect(screen.getByText('Toast 1')).toBeInTheDocument();
        expect(screen.getByText('Toast 2')).toBeInTheDocument();
      });

      act(() => {
        toast.dismiss();
      });

      await waitFor(() => {
        expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
        expect(screen.queryByText('Toast 2')).not.toBeInTheDocument();
      });
    });
  });

  describe('action button', () => {
    it('renders action button when provided', async () => {
      render(<Toaster />);

      const onClick = vi.fn();
      act(() => {
        toast({
          title: 'With Action',
          action: {
            label: 'Undo',
            onClick,
          },
          duration: 100000,
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Undo')).toBeInTheDocument();
      });
    });
  });

  describe('toast.promise', () => {
    it('exposes promise method', () => {
      expect(toast.promise).toBeDefined();
      expect(typeof toast.promise).toBe('function');
    });
  });

  describe('Toaster props', () => {
    it('accepts position prop', () => {
      // Should not throw
      const { container } = render(<Toaster position="top-center" />);
      expect(container).toBeInTheDocument();
    });

    it('accepts expand prop', () => {
      // Should not throw
      const { container } = render(<Toaster expand={true} />);
      expect(container).toBeInTheDocument();
    });

    it('accepts richColors prop', () => {
      // Should not throw
      const { container } = render(<Toaster richColors={true} />);
      expect(container).toBeInTheDocument();
    });

    it('accepts closeButton prop', () => {
      // Should not throw
      const { container } = render(<Toaster closeButton={true} />);
      expect(container).toBeInTheDocument();
    });

    it('accepts offset prop', () => {
      // Should not throw
      const { container } = render(<Toaster offset="24px" />);
      expect(container).toBeInTheDocument();
    });
  });
});
