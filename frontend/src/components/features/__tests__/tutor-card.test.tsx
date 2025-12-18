import type { Tutor } from '@/generated/schemas';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TutorCard, TutorCardSkeleton } from '../tutor-card';

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
