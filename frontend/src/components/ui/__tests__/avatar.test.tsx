import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar, AvatarFallback, AvatarImage } from '../avatar';

describe('Avatar', () => {
  describe('rendering', () => {
    it('renders container div', () => {
      const { container } = render(<Avatar />);

      const avatar = container.firstChild as HTMLElement;
      expect(avatar).toBeInTheDocument();
      expect(avatar.tagName).toBe('DIV');
    });

    it('applies rounded-full style', () => {
      const { container } = render(<Avatar />);

      const avatar = container.firstChild as HTMLElement;
      expect(avatar).toHaveClass('rounded-full');
    });
  });

  describe('sizes', () => {
    it('applies small size styles', () => {
      const { container } = render(<Avatar size="sm" />);

      const avatar = container.firstChild as HTMLElement;
      expect(avatar).toHaveClass('h-8');
      expect(avatar).toHaveClass('w-8');
    });

    it('applies medium size styles by default', () => {
      const { container } = render(<Avatar />);

      const avatar = container.firstChild as HTMLElement;
      expect(avatar).toHaveClass('h-10');
      expect(avatar).toHaveClass('w-10');
    });

    it('applies large size styles', () => {
      const { container } = render(<Avatar size="lg" />);

      const avatar = container.firstChild as HTMLElement;
      expect(avatar).toHaveClass('h-12');
      expect(avatar).toHaveClass('w-12');
    });

    it('applies xl size styles', () => {
      const { container } = render(<Avatar size="xl" />);

      const avatar = container.firstChild as HTMLElement;
      expect(avatar).toHaveClass('h-16');
      expect(avatar).toHaveClass('w-16');
    });
  });
});

describe('AvatarImage', () => {
  it('renders image with src', () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.jpg" alt="User avatar" />
      </Avatar>
    );

    const image = screen.getByAltText('User avatar');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('renders nothing when src is empty', () => {
    const { container } = render(
      <Avatar>
        <AvatarImage src="" alt="User avatar" />
      </Avatar>
    );

    expect(container.querySelector('img')).not.toBeInTheDocument();
  });
});

describe('AvatarFallback', () => {
  it('generates initials from name', () => {
    render(
      <Avatar>
        <AvatarFallback name="John Doe" />
      </Avatar>
    );

    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('generates single initial from single word name', () => {
    render(
      <Avatar>
        <AvatarFallback name="John" />
      </Avatar>
    );

    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('renders children when provided', () => {
    render(
      <Avatar>
        <AvatarFallback>Custom</AvatarFallback>
      </Avatar>
    );

    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('limits initials to 2 characters', () => {
    render(
      <Avatar>
        <AvatarFallback name="John Paul Doe" />
      </Avatar>
    );

    expect(screen.getByText('JP')).toBeInTheDocument();
  });
});

describe('composition', () => {
  it('renders fallback when image is not provided', () => {
    render(
      <Avatar>
        <AvatarFallback name="John Doe" />
      </Avatar>
    );

    expect(screen.getByText('JD')).toBeInTheDocument();
  });
});
