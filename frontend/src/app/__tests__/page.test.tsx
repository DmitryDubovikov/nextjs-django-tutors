import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from '../page';

describe('HomePage', () => {
  it('renders the main heading', () => {
    render(<HomePage />);

    const heading = screen.getByRole('heading', { name: /tutors marketplace/i });
    expect(heading).toBeInTheDocument();
  });

  it('renders the description text', () => {
    render(<HomePage />);

    const description = screen.getByText(/find and book tutors for any subject/i);
    expect(description).toBeInTheDocument();
  });

  it('renders the main container with correct styles', () => {
    render(<HomePage />);

    const main = screen.getByRole('main');
    expect(main).toHaveClass('flex', 'min-h-screen', 'flex-col', 'items-center', 'justify-center');
  });
});
