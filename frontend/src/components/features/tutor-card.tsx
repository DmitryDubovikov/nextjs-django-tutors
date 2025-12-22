'use client';

import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Tutor } from '@/generated/schemas';
import { useExperimentWithTracking } from '@/lib/experiment-tracking';
import { cardHoverAnimation } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

export type TutorCardVariant = 'control' | 'compact' | 'detailed';

interface TutorCardProps {
  tutor: Tutor;
  className?: string;
  index?: number;
  onBook?: (tutorId: number) => void;
  /** Override variant for testing/storybook. If not provided, uses experiment variant. */
  variant?: TutorCardVariant;
}

const EXPERIMENT_NAME = 'tutor_card_experiment';

/**
 * Star rating component for displaying tutor ratings.
 */
function StarRating({ rating, reviewsCount }: { rating: number; reviewsCount: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <div className="flex items-center gap-1">
      <div className="flex" aria-label={`Rating: ${rating.toFixed(1)} out of 5`}>
        {[...Array(5)].map((_, i) => (
          <svg
            key={`star-${i}-${rating}`}
            className={cn(
              'h-4 w-4',
              i < fullStars
                ? 'fill-yellow-400 text-yellow-400'
                : i === fullStars && hasHalfStar
                  ? 'fill-yellow-400/50 text-yellow-400'
                  : 'fill-gray-200 text-gray-200'
            )}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
      <span className="text-muted-foreground text-sm">
        {rating > 0 ? rating.toFixed(1) : 'New'}
        {reviewsCount > 0 && ` (${reviewsCount})`}
      </span>
    </div>
  );
}

/**
 * Compact rating display - just stars and number.
 */
function CompactRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-1 text-sm">
      <svg
        className="h-4 w-4 fill-yellow-400 text-yellow-400"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      <span className="font-medium">{rating > 0 ? rating.toFixed(1) : 'New'}</span>
    </span>
  );
}

/**
 * Location icon component.
 */
function LocationIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

interface TutorCardInternalProps extends Omit<TutorCardProps, 'variant'> {
  effectiveVariant: TutorCardVariant;
  onCardClick: () => void;
}

/**
 * Compact variant: Minimal info, more cards per screen.
 * Shows: avatar, name, primary subject, rating, price.
 */
function TutorCardCompact({
  tutor,
  className,
  index = 0,
  onBook,
  onCardClick,
}: TutorCardInternalProps) {
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(tutor.hourly_rate));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      {...cardHoverAnimation}
      data-testid="tutor-card-compact"
    >
      <Card className={cn('h-full', className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* biome-ignore lint/suspicious/noExplicitAny: Next.js typed routes limitation */}
            <Link href={`/tutors/${tutor.slug}` as any} onClick={onCardClick}>
              <Avatar size="md" className="cursor-pointer transition-opacity hover:opacity-80">
                <AvatarImage src={tutor.avatar_url} alt={tutor.full_name} />
                <AvatarFallback name={tutor.full_name} />
              </Avatar>
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link
                  // biome-ignore lint/suspicious/noExplicitAny: Next.js typed routes limitation
                  href={`/tutors/${tutor.slug}` as any}
                  className="hover:underline"
                  onClick={onCardClick}
                >
                  <h3 className="truncate font-semibold">{tutor.full_name}</h3>
                </Link>
                {tutor.is_verified && (
                  <Badge variant="success" className="shrink-0 text-[10px]">
                    Verified
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                {tutor.subjects[0] && (
                  <span className="truncate capitalize">{tutor.subjects[0].replace('-', ' ')}</span>
                )}
                <span className="text-muted-foreground/50">·</span>
                <CompactRating rating={Number(tutor.rating)} />
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-semibold text-primary">{formattedPrice}</div>
              <Button
                size="sm"
                variant="outline"
                className="mt-1 h-7 px-2 text-xs"
                onClick={() => onBook?.(tutor.id)}
                aria-label={`Book lesson with ${tutor.full_name}`}
              >
                Book
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Detailed variant: More info, trust signals, availability hint.
 * Shows: everything from control + badges, response time, students count.
 */
function TutorCardDetailed({
  tutor,
  className,
  index = 0,
  onBook,
  onCardClick,
}: TutorCardInternalProps) {
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(tutor.hourly_rate));

  // Simulated data for detailed view (in real app, these would come from API)
  const responseTime = 'Responds within 1 hour';
  const isTopRated = Number(tutor.rating) >= 4.8 && (tutor.reviews_count ?? 0) >= 10;
  const studentsCount = Math.floor((tutor.reviews_count ?? 0) * 1.5) || null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      {...cardHoverAnimation}
      data-testid="tutor-card-detailed"
    >
      <Card className={cn('h-full', className)}>
        <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-3">
          {/* biome-ignore lint/suspicious/noExplicitAny: Next.js typed routes limitation */}
          <Link href={`/tutors/${tutor.slug}` as any} onClick={onCardClick}>
            <Avatar size="lg" className="cursor-pointer transition-opacity hover:opacity-80">
              <AvatarImage src={tutor.avatar_url} alt={tutor.full_name} />
              <AvatarFallback name={tutor.full_name} />
            </Avatar>
          </Link>
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                // biome-ignore lint/suspicious/noExplicitAny: Next.js typed routes limitation
                href={`/tutors/${tutor.slug}` as any}
                className="hover:underline"
                onClick={onCardClick}
              >
                <CardTitle className="text-lg">{tutor.full_name}</CardTitle>
              </Link>
              {tutor.is_verified && (
                <Badge variant="success" className="text-[10px]">
                  Verified
                </Badge>
              )}
              {isTopRated && (
                <Badge variant="default" className="bg-amber-500 text-[10px] hover:bg-amber-600">
                  Top Rated
                </Badge>
              )}
            </div>
            <CardDescription className="line-clamp-2">{tutor.headline}</CardDescription>
            <StarRating rating={Number(tutor.rating)} reviewsCount={tutor.reviews_count ?? 0} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {/* Trust signals */}
          <div className="flex flex-wrap gap-2 text-muted-foreground text-xs">
            <span className="flex items-center gap-1">
              <svg
                className="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {responseTime}
            </span>
            {studentsCount && (
              <span className="flex items-center gap-1">
                <svg
                  className="h-3 w-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {studentsCount} students
              </span>
            )}
          </div>

          {/* Subjects */}
          <div className="flex flex-wrap gap-1.5">
            {tutor.subjects.slice(0, 4).map((subject) => (
              <Badge key={subject} variant="secondary" className="capitalize">
                {subject.replace('-', ' ')}
              </Badge>
            ))}
            {tutor.subjects.length > 4 && (
              <Badge variant="outline">+{tutor.subjects.length - 4}</Badge>
            )}
          </div>

          {/* Location and formats */}
          <div className="flex items-center gap-3 text-muted-foreground text-sm">
            {tutor.location && (
              <span className="flex items-center gap-1">
                <LocationIcon />
                {tutor.location}
              </span>
            )}
            {tutor.formats.length > 0 && (
              <span className="flex items-center gap-1">
                {tutor.formats.includes('online') && (
                  <Badge variant="outline" className="text-[10px]">
                    Online
                  </Badge>
                )}
                {tutor.formats.includes('offline') && (
                  <Badge variant="outline" className="text-[10px]">
                    In-person
                  </Badge>
                )}
              </span>
            )}
          </div>

          {/* Price and CTA */}
          <div className="flex items-center justify-between border-t pt-3">
            <div className="flex flex-col">
              <span className="text-muted-foreground text-sm">per hour</span>
              <span className="font-semibold text-lg text-primary">{formattedPrice}</span>
            </div>
            <Button
              onClick={() => onBook?.(tutor.id)}
              aria-label={`Book lesson with ${tutor.full_name}`}
            >
              Book lesson
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Control variant: Current design (default).
 */
function TutorCardControl({
  tutor,
  className,
  index = 0,
  onBook,
  onCardClick,
}: TutorCardInternalProps) {
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(tutor.hourly_rate));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      {...cardHoverAnimation}
      data-testid="tutor-card-control"
    >
      <Card className={cn('h-full', className)}>
        <CardHeader className="flex flex-row items-start gap-4 space-y-0">
          {/* biome-ignore lint/suspicious/noExplicitAny: Next.js typed routes limitation */}
          <Link href={`/tutors/${tutor.slug}` as any} onClick={onCardClick}>
            <Avatar size="lg" className="cursor-pointer transition-opacity hover:opacity-80">
              <AvatarImage src={tutor.avatar_url} alt={tutor.full_name} />
              <AvatarFallback name={tutor.full_name} />
            </Avatar>
          </Link>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Link
                // biome-ignore lint/suspicious/noExplicitAny: Next.js typed routes limitation
                href={`/tutors/${tutor.slug}` as any}
                className="hover:underline"
                onClick={onCardClick}
              >
                <CardTitle className="text-lg">{tutor.full_name}</CardTitle>
              </Link>
              {tutor.is_verified && (
                <Badge variant="success" className="text-[10px]">
                  Verified
                </Badge>
              )}
            </div>
            <CardDescription className="line-clamp-2">{tutor.headline}</CardDescription>
            <StarRating rating={Number(tutor.rating)} reviewsCount={tutor.reviews_count ?? 0} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {tutor.subjects.slice(0, 4).map((subject) => (
              <Badge key={subject} variant="secondary" className="capitalize">
                {subject.replace('-', ' ')}
              </Badge>
            ))}
            {tutor.subjects.length > 4 && (
              <Badge variant="outline">+{tutor.subjects.length - 4}</Badge>
            )}
          </div>

          {/* Location and formats */}
          <div className="flex items-center gap-3 text-muted-foreground text-sm">
            {tutor.location && (
              <span className="flex items-center gap-1">
                <LocationIcon />
                {tutor.location}
              </span>
            )}
            {tutor.formats.length > 0 && (
              <span className="flex items-center gap-1">
                {tutor.formats.includes('online') && (
                  <Badge variant="outline" className="text-[10px]">
                    Online
                  </Badge>
                )}
                {tutor.formats.includes('offline') && (
                  <Badge variant="outline" className="text-[10px]">
                    In-person
                  </Badge>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex flex-col">
              <span className="text-muted-foreground text-sm">per hour</span>
              <span className="font-semibold text-lg text-primary">{formattedPrice}</span>
            </div>
            <Button
              size="sm"
              onClick={() => onBook?.(tutor.id)}
              aria-label={`Book lesson with ${tutor.full_name}`}
            >
              Book lesson
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * TutorCard displays a tutor's profile information in a card format.
 * Supports A/B testing via `tutor_card_experiment` with variants:
 * - control: Current design (default)
 * - compact: Minimal info, more cards per screen
 * - detailed: More info with trust signals
 *
 * Automatically tracks exposure and click events for experiment analysis.
 */
export function TutorCard({ tutor, className, index = 0, onBook, variant }: TutorCardProps) {
  const { variant: experimentVariant, trackClick } = useExperimentWithTracking(EXPERIMENT_NAME);

  // Use prop variant if provided (for testing), otherwise use experiment variant
  const effectiveVariant = (variant ?? experimentVariant) as TutorCardVariant;

  const handleCardClick = () => {
    trackClick({ tutorId: tutor.id, tutorSlug: tutor.slug });
  };

  const props: TutorCardInternalProps = {
    tutor,
    className,
    index,
    onBook,
    effectiveVariant,
    onCardClick: handleCardClick,
  };

  switch (effectiveVariant) {
    case 'compact':
      return <TutorCardCompact {...props} />;
    case 'detailed':
      return <TutorCardDetailed {...props} />;
    default:
      return <TutorCardControl {...props} />;
  }
}

/**
 * TutorCardSkeleton displays a loading placeholder for TutorCard.
 */
export function TutorCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start gap-4 space-y-0">
        <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-5 w-16 animate-pulse rounded-full bg-muted" />
          ))}
        </div>
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="flex items-center justify-between border-t pt-4">
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-6 w-20 animate-pulse rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}
