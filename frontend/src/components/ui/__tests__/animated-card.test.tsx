import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AnimatedCard } from '../animated-card';

describe('AnimatedCard', () => {
  it('renders children', () => {
    const { getByText } = render(<AnimatedCard>Card content</AnimatedCard>);

    expect(getByText('Card content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<AnimatedCard className="custom-class">Content</AnimatedCard>);

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('custom-class');
  });

  it('applies default card styles', () => {
    const { container } = render(<AnimatedCard>Content</AnimatedCard>);

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('rounded-lg');
    expect(card).toHaveClass('border');
    expect(card).toHaveClass('bg-card');
    expect(card).toHaveClass('shadow-card');
  });

  it('accepts custom delay prop', () => {
    const { container } = render(<AnimatedCard delay={0.5}>Content</AnimatedCard>);

    expect(container.firstChild).toBeInTheDocument();
  });

  it('accepts custom duration prop', () => {
    const { container } = render(<AnimatedCard duration={0.5}>Content</AnimatedCard>);

    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders as div element', () => {
    const { container } = render(<AnimatedCard>Content</AnimatedCard>);

    const card = container.firstChild as HTMLElement;
    // Motion components render as div
    expect(card.tagName).toBe('DIV');
  });
});
