import { TutorCardSkeleton } from '@/components/features/tutor-card';

export default function TutorsLoading() {
  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="h-9 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-5 w-80 animate-pulse rounded bg-muted" />
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton list never reorders
          <TutorCardSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}
