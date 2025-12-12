import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RootLayout from '../layout';

describe('RootLayout', () => {
  it('renders children correctly', () => {
    // Note: Testing Next.js RootLayout with <html> tag has limitations in jsdom
    // We test that children are rendered, not the html structure
    render(
      <RootLayout>
        <div data-testid="child">Test Content</div>
      </RootLayout>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('exports metadata with correct title', async () => {
    // Test that metadata is exported (compile-time check)
    const { metadata } = await import('../layout');
    expect(metadata).toBeDefined();
    expect(metadata.title).toBe('Tutors Marketplace');
    expect(metadata.description).toBe('Find and book tutors for any subject');
  });
});
