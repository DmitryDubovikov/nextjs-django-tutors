import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../card';

describe('Card', () => {
  describe('rendering', () => {
    it('renders with children', () => {
      render(<Card>Card content</Card>);

      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<Card className="custom-class">Content</Card>);

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('custom-class');
    });

    it('applies default styles', () => {
      const { container } = render(<Card>Content</Card>);

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('rounded-lg');
      expect(card).toHaveClass('border');
    });
  });

  describe('composition', () => {
    it('renders complete card with all subcomponents', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
          </CardHeader>
          <CardContent>Card Content</CardContent>
          <CardFooter>Card Footer</CardFooter>
        </Card>
      );

      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card Description')).toBeInTheDocument();
      expect(screen.getByText('Card Content')).toBeInTheDocument();
      expect(screen.getByText('Card Footer')).toBeInTheDocument();
    });
  });
});

describe('CardHeader', () => {
  it('renders with children', () => {
    render(<CardHeader>Header content</CardHeader>);

    expect(screen.getByText('Header content')).toBeInTheDocument();
  });
});

describe('CardTitle', () => {
  it('renders as h3 element', () => {
    render(<CardTitle>Title</CardTitle>);

    const title = screen.getByText('Title');
    expect(title.tagName).toBe('H3');
  });
});

describe('CardDescription', () => {
  it('renders with muted foreground style', () => {
    const { container } = render(<CardDescription>Description</CardDescription>);

    const description = container.firstChild as HTMLElement;
    expect(description).toHaveClass('text-muted-foreground');
  });
});

describe('CardContent', () => {
  it('renders with padding', () => {
    const { container } = render(<CardContent>Content</CardContent>);

    const content = container.firstChild as HTMLElement;
    expect(content).toHaveClass('p-6');
  });
});

describe('CardFooter', () => {
  it('renders with flex layout', () => {
    const { container } = render(<CardFooter>Footer</CardFooter>);

    const footer = container.firstChild as HTMLElement;
    expect(footer).toHaveClass('flex');
  });
});
