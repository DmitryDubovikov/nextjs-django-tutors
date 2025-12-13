import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../dialog';

/**
 * Helper component that provides required accessibility elements for Dialog.
 * Includes visually hidden description to satisfy aria-describedby requirement.
 */
function TestDialogContent({
  children,
  title = 'Test Dialog',
  description = 'Test dialog description',
  showCloseButton,
  className,
}: {
  children?: React.ReactNode;
  title?: string;
  description?: string;
  showCloseButton?: boolean;
  className?: string;
}) {
  return (
    <DialogContent showCloseButton={showCloseButton} className={className}>
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription className="sr-only">{description}</DialogDescription>
      {children}
    </DialogContent>
  );
}

describe('Dialog', () => {
  describe('opening and closing', () => {
    it('opens dialog when trigger is clicked', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <TestDialogContent title="Dialog Title" />
        </Dialog>
      );

      await user.click(screen.getByText('Open Dialog'));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Dialog Title')).toBeInTheDocument();
    });

    it('closes dialog when close button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <TestDialogContent />
        </Dialog>
      );

      await user.click(screen.getByText('Open'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Close' }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('closes dialog when ESC key is pressed', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <TestDialogContent />
        </Dialog>
      );

      await user.click(screen.getByText('Open'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('can be closed via onOpenChange callback', async () => {
      const onOpenChange = vi.fn();

      render(
        <Dialog defaultOpen onOpenChange={onOpenChange}>
          <TestDialogContent />
        </Dialog>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // The close button triggers onOpenChange
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: 'Close' }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('can be controlled with open prop', async () => {
      const onOpenChange = vi.fn();

      const { rerender } = render(
        <Dialog open={true} onOpenChange={onOpenChange}>
          <TestDialogContent title="Controlled Dialog" />
        </Dialog>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      rerender(
        <Dialog open={false} onOpenChange={onOpenChange}>
          <TestDialogContent title="Controlled Dialog" />
        </Dialog>
      );

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('close button visibility', () => {
    it('shows close button by default', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <TestDialogContent />
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });

    it('hides close button when showCloseButton is false', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <TestDialogContent showCloseButton={false} />
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
    });
  });

  describe('DialogClose component', () => {
    it('closes dialog when DialogClose is clicked', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <TestDialogContent showCloseButton={false}>
            <DialogClose>Cancel</DialogClose>
          </TestDialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await user.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('content structure', () => {
    it('renders DialogHeader with children', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>My Title</DialogTitle>
              <DialogDescription>My Description</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      expect(screen.getByText('My Title')).toBeInTheDocument();
      expect(screen.getByText('My Description')).toBeInTheDocument();
    });

    it('renders DialogFooter with children', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <TestDialogContent>
            <DialogFooter>
              <button type="button">Save</button>
              <button type="button">Cancel</button>
            </DialogFooter>
          </TestDialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has correct ARIA role', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <TestDialogContent />
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('associates title with dialog via aria-labelledby', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <TestDialogContent title="Accessible Title" />
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('associates description with dialog via aria-describedby', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>This is a description</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-describedby');
    });

    it('close button has aria-label', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <TestDialogContent />
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies custom className to DialogContent', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <TestDialogContent className="custom-dialog" />
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      expect(screen.getByRole('dialog')).toHaveClass('custom-dialog');
    });

    it('applies custom className to DialogHeader', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogHeader className="custom-header">
              <DialogTitle>Title</DialogTitle>
              <DialogDescription>Description</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      const header = screen.getByText('Title').parentElement;
      expect(header).toHaveClass('custom-header');
    });

    it('applies custom className to DialogFooter', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <TestDialogContent>
            <DialogFooter className="custom-footer">
              <button type="button">Action</button>
            </DialogFooter>
          </TestDialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      const footer = screen.getByText('Action').parentElement;
      expect(footer).toHaveClass('custom-footer');
    });

    it('applies custom className to DialogTitle', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle className="custom-title">Title</DialogTitle>
            <DialogDescription>Description</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      expect(screen.getByText('Title')).toHaveClass('custom-title');
    });

    it('applies custom className to DialogDescription', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription className="custom-description">Description</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      expect(screen.getByText('Description')).toHaveClass('custom-description');
    });
  });
});
