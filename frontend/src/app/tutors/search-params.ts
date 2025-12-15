/**
 * Type-safe URL search parameters for the tutors catalog page.
 *
 * Uses nuqs library for parsing and serializing URL parameters.
 */

import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from 'nuqs/server';

/**
 * Available sort options for tutors list.
 */
export const SORT_OPTIONS = [
  'rating',
  '-rating',
  'hourly_rate',
  '-hourly_rate',
  '-created_at',
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

/**
 * Available teaching formats.
 */
export const FORMAT_OPTIONS = ['online', 'offline'] as const;
export type FormatOption = (typeof FORMAT_OPTIONS)[number];

/**
 * Search params configuration for tutors catalog.
 */
export const searchParamsCache = createSearchParamsCache({
  q: parseAsString.withDefault(''),
  subject: parseAsString,
  minPrice: parseAsInteger,
  maxPrice: parseAsInteger,
  minRating: parseAsInteger,
  format: parseAsStringLiteral(FORMAT_OPTIONS),
  location: parseAsString,
  ordering: parseAsStringLiteral(SORT_OPTIONS).withDefault('-rating'),
  page: parseAsInteger.withDefault(1),
});

/**
 * Type for parsed search params.
 */
export type TutorSearchParams = Awaited<ReturnType<typeof searchParamsCache.parse>>;
