import { Suspense } from 'react';

import { TutorCardSkeleton } from '@/components/features/tutor-card';
import { TutorGridClient } from '@/components/features/tutor-grid-client';
import { tutorsList } from '@/generated/api/tutors/tutors';

export const metadata = {
  title: 'Find Tutors | Tutors Marketplace',
  description: 'Browse our selection of verified tutors for any subject',
};

// Force dynamic rendering - data depends on backend API
export const dynamic = 'force-dynamic';

async function TutorGrid() {
  const response = await tutorsList();
  const tutors = response.data.results ?? [];

  if (tutors.length === 0) {
    return (
      <div className="py-12 text-center">
        <h2 className="font-semibold text-foreground text-xl">No tutors found</h2>
        <p className="mt-2 text-muted-foreground">Check back later for new tutors.</p>
      </div>
    );
  }

  return <TutorGridClient tutors={tutors} />;
}

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

export default function TutorsPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="font-bold text-3xl text-foreground">Find a Tutor</h1>
        <p className="mt-2 text-muted-foreground">
          Browse our selection of verified tutors for any subject
        </p>
      </header>

      <Suspense fallback={<TutorGridSkeleton />}>
        <TutorGrid />
      </Suspense>
    </main>
  );
}
