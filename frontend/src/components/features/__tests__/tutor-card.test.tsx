import type { Tutor } from '@/generated/schemas';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TutorCard, TutorCardSkeleton, type TutorCardVariant } from '../tutor-card';

// Mock experiment tracking to avoid session/fetch issues in tests
vi.mock('@/lib/experiment-tracking', () => ({
  useExperimentWithTracking: () => ({
    variant: 'control',
    trackClick: vi.fn(),
    trackBooking: vi.fn(),
    trackCheckoutSuccess: vi.fn(),
    trackCheckoutAbandon: vi.fn(),
  }),
}));

const mockTutor: Tutor = {
  id: 1,
  user_id: 101,
  slug: 'john-doe',
  full_name: 'John Doe',
  avatar_url: 'https://example.com/avatar.jpg',
  headline: 'Expert Mathematics Tutor with 10 years experience',
  bio: 'I specialize in algebra, calculus, and geometry.',
  hourly_rate: '50.00',
  subjects: ['math', 'algebra', 'calculus'],
  is_verified: true,
  formats: ['online', 'offline'],
  created_at: '2024-01-01T00:00:00Z',
};

describe('TutorCard', () => {
  describe('rendering', () => {
    it('renders tutor full name', () => {
      render(<TutorCard tutor={mockTutor} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('renders tutor headline', () => {
      render(<TutorCard tutor={mockTutor} />);

      expect(screen.getByText(mockTutor.headline)).toBeInTheDocument();
    });

    it('renders tutor avatar', () => {
      render(<TutorCard tutor={mockTutor} />);

      const avatar = screen.getByAltText('John Doe');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', mockTutor.avatar_url);
    });
  });

  describe('verification badge', () => {
    it('shows verified badge for verified tutors', () => {
      render(<TutorCard tutor={mockTutor} />);

      expect(screen.getByText('Verified')).toBeInTheDocument();
    });

    it('does not show verified badge for unverified tutors', () => {
      const unverifiedTutor = { ...mockTutor, is_verified: false };
      render(<TutorCard tutor={unverifiedTutor} />);

      expect(screen.queryByText('Verified')).not.toBeInTheDocument();
    });
  });

  describe('subjects display', () => {
    it('renders all subjects when 4 or fewer', () => {
      const tutorWith3Subjects = {
        ...mockTutor,
        subjects: ['math', 'physics', 'chemistry'],
      };
      render(<TutorCard tutor={tutorWith3Subjects} />);

      expect(screen.getByText('math')).toBeInTheDocument();
      expect(screen.getByText('physics')).toBeInTheDocument();
      expect(screen.getByText('chemistry')).toBeInTheDocument();
    });

    it('shows +N badge when more than 4 subjects', () => {
      const tutorWith6Subjects = {
        ...mockTutor,
        subjects: ['math', 'physics', 'chemistry', 'biology', 'history', 'geography'],
      };
      render(<TutorCard tutor={tutorWith6Subjects} />);

      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('handles hyphenated subjects', () => {
      const tutorWithHyphenatedSubject = {
        ...mockTutor,
        subjects: ['computer-science'],
      };
      render(<TutorCard tutor={tutorWithHyphenatedSubject} />);

      expect(screen.getByText('computer science')).toBeInTheDocument();
    });

    it('handles empty subjects', () => {
      const tutorWithNoSubjects = {
        ...mockTutor,
        subjects: [],
      };
      const { container } = render(<TutorCard tutor={tutorWithNoSubjects} />);

      expect(container).toBeInTheDocument();
    });
  });

  describe('price formatting', () => {
    it('formats price in USD', () => {
      render(<TutorCard tutor={mockTutor} />);

      // Check for price with dollar symbol
      expect(screen.getByText(/\$50/)).toBeInTheDocument();
    });

    it('shows per hour label', () => {
      render(<TutorCard tutor={mockTutor} />);

      expect(screen.getByText('per hour')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies custom className to Card', () => {
      const { container } = render(<TutorCard tutor={mockTutor} className="custom-class" />);

      // className is applied to the inner Card component, not the motion wrapper
      const card = container.querySelector('.custom-class');
      expect(card).toBeInTheDocument();
    });
  });
});

describe('TutorCardSkeleton', () => {
  it('renders skeleton placeholder', () => {
    const { container } = render(<TutorCardSkeleton />);

    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders avatar skeleton', () => {
    const { container } = render(<TutorCardSkeleton />);

    const avatarSkeleton = container.querySelector('.rounded-full');
    expect(avatarSkeleton).toBeInTheDocument();
  });

  it('renders multiple subject skeletons', () => {
    const { container } = render(<TutorCardSkeleton />);

    const subjectSkeletons = container.querySelectorAll('.rounded-full.animate-pulse');
    expect(subjectSkeletons.length).toBeGreaterThan(0);
  });
});

describe('TutorCard variants', () => {
  const variants: TutorCardVariant[] = ['control', 'compact', 'detailed'];

  describe.each(variants)('%s variant', (variant) => {
    it('renders tutor name', () => {
      render(<TutorCard tutor={mockTutor} variant={variant} />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('renders price', () => {
      render(<TutorCard tutor={mockTutor} variant={variant} />);
      expect(screen.getByText(/\$50/)).toBeInTheDocument();
    });

    it('renders verified badge for verified tutors', () => {
      render(<TutorCard tutor={mockTutor} variant={variant} />);
      expect(screen.getByText('Verified')).toBeInTheDocument();
    });

    it('renders book button', () => {
      render(<TutorCard tutor={mockTutor} variant={variant} />);
      expect(screen.getByRole('button', { name: /book/i })).toBeInTheDocument();
    });

    it('has correct testid', () => {
      render(<TutorCard tutor={mockTutor} variant={variant} />);
      expect(screen.getByTestId(`tutor-card-${variant}`)).toBeInTheDocument();
    });
  });

  describe('control variant specifics', () => {
    it('renders headline', () => {
      render(<TutorCard tutor={mockTutor} variant="control" />);
      expect(screen.getByText(mockTutor.headline)).toBeInTheDocument();
    });

    it('renders multiple subjects', () => {
      render(<TutorCard tutor={mockTutor} variant="control" />);
      expect(screen.getByText('math')).toBeInTheDocument();
      expect(screen.getByText('algebra')).toBeInTheDocument();
    });

    it('renders location', () => {
      const tutorWithLocation = { ...mockTutor, location: 'New York' };
      render(<TutorCard tutor={tutorWithLocation} variant="control" />);
      expect(screen.getByText('New York')).toBeInTheDocument();
    });
  });

  describe('compact variant specifics', () => {
    it('renders only first subject', () => {
      render(<TutorCard tutor={mockTutor} variant="compact" />);
      expect(screen.getByText('math')).toBeInTheDocument();
      // Compact variant doesn't show additional subjects as badges
      expect(screen.queryByText('algebra')).not.toBeInTheDocument();
    });

    it('does not render headline', () => {
      render(<TutorCard tutor={mockTutor} variant="compact" />);
      expect(screen.queryByText(mockTutor.headline)).not.toBeInTheDocument();
    });

    it('has shorter book button text', () => {
      render(<TutorCard tutor={mockTutor} variant="compact" />);
      expect(screen.getByRole('button', { name: /book/i })).toHaveTextContent('Book');
    });
  });

  describe('detailed variant specifics', () => {
    it('renders headline', () => {
      render(<TutorCard tutor={mockTutor} variant="detailed" />);
      expect(screen.getByText(mockTutor.headline)).toBeInTheDocument();
    });

    it('shows response time', () => {
      render(<TutorCard tutor={mockTutor} variant="detailed" />);
      expect(screen.getByText(/responds within/i)).toBeInTheDocument();
    });

    it('shows Top Rated badge for high-rated tutors', () => {
      const topRatedTutor = { ...mockTutor, rating: '4.9', reviews_count: 15 };
      render(<TutorCard tutor={topRatedTutor} variant="detailed" />);
      expect(screen.getByText('Top Rated')).toBeInTheDocument();
    });

    it('does not show Top Rated badge for lower-rated tutors', () => {
      const regularTutor = { ...mockTutor, rating: '4.5', reviews_count: 5 };
      render(<TutorCard tutor={regularTutor} variant="detailed" />);
      expect(screen.queryByText('Top Rated')).not.toBeInTheDocument();
    });

    it('shows students count for tutors with reviews', () => {
      const tutorWithReviews = { ...mockTutor, reviews_count: 20 };
      render(<TutorCard tutor={tutorWithReviews} variant="detailed" />);
      expect(screen.getByText(/students/i)).toBeInTheDocument();
    });
  });

  describe('fallback behavior', () => {
    it('renders control variant for unknown variant', () => {
      // @ts-expect-error Testing invalid variant
      render(<TutorCard tutor={mockTutor} variant="unknown" />);
      expect(screen.getByTestId('tutor-card-control')).toBeInTheDocument();
    });
  });
});
