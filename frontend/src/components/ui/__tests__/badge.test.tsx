import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from '../badge';

describe('Badge', () => {
  describe('rendering', () => {
    it('renders with children', () => {
      render(<Badge>Badge text</Badge>);

      expect(screen.getByText('Badge text')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<Badge className="custom-class">Badge</Badge>);

      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('custom-class');
    });

    it('renders as span element', () => {
      const { container } = render(<Badge>Badge</Badge>);

      const badge = container.firstChild as HTMLElement;
      expect(badge.tagName).toBe('SPAN');
    });
  });

  describe('variants', () => {
    it('renders default variant', () => {
      const { container } = render(<Badge variant="default">Default</Badge>);

      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('bg-primary');
    });

    it('renders secondary variant', () => {
      const { container } = render(<Badge variant="secondary">Secondary</Badge>);

      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('bg-muted');
    });

    it('renders success variant', () => {
      const { container } = render(<Badge variant="success">Success</Badge>);

      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('bg-success');
    });

    it('renders warning variant', () => {
      const { container } = render(<Badge variant="warning">Warning</Badge>);

      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('bg-warning');
    });

    it('renders destructive variant', () => {
      const { container } = render(<Badge variant="destructive">Destructive</Badge>);

      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('bg-error');
    });

    it('renders outline variant', () => {
      const { container } = render(<Badge variant="outline">Outline</Badge>);

      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('border');
      expect(badge).toHaveClass('bg-transparent');
    });
  });

  describe('default variant', () => {
    it('uses default variant when not specified', () => {
      const { container } = render(<Badge>Badge</Badge>);

      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('bg-primary');
    });
  });
});
