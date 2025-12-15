'use client';

import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Tutor } from '@/generated/schemas';
import { cardHoverAnimation } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

interface TutorCardProps {
  tutor: Tutor;
  className?: string;
  index?: number;
  onBook?: (tutorId: number) => void;
}

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
 * TutorCard displays a tutor's profile information in a card format.
 * Includes smooth animations for enter and hover states.
 */
export function TutorCard({ tutor, className, index = 0, onBook }: TutorCardProps) {
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(tutor.hourly_rate));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        delay: index * 0.05,
        ease: [0.16, 1, 0.3, 1],
      }}
      {...cardHoverAnimation}
    >
      <Card className={cn('h-full', className)}>
        <CardHeader className="flex flex-row items-start gap-4 space-y-0">
          {/* biome-ignore lint/suspicious/noExplicitAny: Next.js typed routes limitation with dynamic segments */}
          <Link href={`/tutors/${tutor.slug}` as any}>
            <Avatar size="lg" className="cursor-pointer transition-opacity hover:opacity-80">
              <AvatarImage src={tutor.avatar_url} alt={tutor.full_name} />
              <AvatarFallback name={tutor.full_name} />
            </Avatar>
          </Link>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              {/* biome-ignore lint/suspicious/noExplicitAny: Next.js typed routes limitation with dynamic segments */}
              <Link href={`/tutors/${tutor.slug}` as any} className="hover:underline">
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
