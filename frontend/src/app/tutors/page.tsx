import type { Metadata } from 'next';
import { Suspense } from 'react';

import { TutorCardSkeleton } from '@/components/features/tutor-card';
import { TutorFilters } from '@/components/features/tutor-filters';
import { TutorGridClient } from '@/components/features/tutor-grid-client';
import { tutorsList } from '@/generated/api/tutors/tutors';

import { searchParamsCache } from './search-params';

export const metadata: Metadata = {
  title: 'Find Tutors | Tutors Marketplace',
  description: 'Browse our selection of verified tutors for any subject',
};

// Force dynamic rendering - data depends on backend API and URL params
export const dynamic = 'force-dynamic';

interface TutorsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Fetch all unique subjects from tutors for filter dropdown.
 */
async function getSubjects(): Promise<string[]> {
  try {
    const response = await tutorsList();
    const tutors = response.data.results ?? [];
    const subjects = new Set<string>();
    for (const tutor of tutors) {
      for (const subject of tutor.subjects) {
        subjects.add(subject);
      }
    }
    return Array.from(subjects).sort();
  } catch {
    return [];
  }
}

/**
 * Server component that fetches and renders the tutor grid.
 */
async function TutorGrid({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = searchParamsCache.parse(searchParams);

  // Build API query params
  const queryParams: Record<string, string | number | undefined> = {
    page: params.page,
    ordering: params.ordering,
  };

  if (params.q) queryParams.q = params.q;
  if (params.subject) queryParams.subject = params.subject;
  if (params.minPrice) queryParams.min_price = params.minPrice;
  if (params.maxPrice) queryParams.max_price = params.maxPrice;
  if (params.minRating) queryParams.min_rating = params.minRating;
  if (params.format) queryParams.format = params.format;
  if (params.location) queryParams.location = params.location;

  try {
    const response = await tutorsList(queryParams);
    const tutors = response.data.results ?? [];
    const count = response.data.count ?? 0;
    const pageSize = 20;
    const totalPages = Math.ceil(count / pageSize);

    if (tutors.length === 0) {
      return (
        <div className="py-12 text-center">
          <h2 className="font-semibold text-foreground text-xl">No tutors found</h2>
          <p className="mt-2 text-muted-foreground">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      );
    }

    return (
      <TutorGridClient
        tutors={tutors}
        currentPage={params.page}
        totalPages={totalPages}
        totalCount={count}
      />
    );
  } catch {
    return (
      <div className="py-12 text-center">
        <h2 className="font-semibold text-foreground text-xl">Error loading tutors</h2>
        <p className="mt-2 text-muted-foreground">Please try again later.</p>
      </div>
    );
  }
}

/**
 * Loading skeleton for the tutor grid.
 */
function TutorGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton list never reorders
        <TutorCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default async function TutorsPage({ searchParams }: TutorsPageProps) {
  const resolvedSearchParams = await searchParams;
  const subjects = await getSubjects();

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="font-bold text-3xl text-foreground">Find a Tutor</h1>
        <p className="mt-2 text-muted-foreground">
          Browse our selection of verified tutors for any subject
        </p>
      </header>

      <TutorFilters subjects={subjects} />

      <Suspense fallback={<TutorGridSkeleton />}>
        <TutorGrid searchParams={resolvedSearchParams} />
      </Suspense>
    </main>
  );
}
