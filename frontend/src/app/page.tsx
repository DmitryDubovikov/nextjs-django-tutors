import Link from 'next/link';

import { auth } from '@/auth';
import { Header } from '@/components/features/layout/header';

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center p-24">
        <h1 className="font-bold text-4xl text-foreground">Tutors Marketplace</h1>
        <p className="mt-4 text-lg text-muted-foreground">Find and book tutors for any subject</p>
        <div className="mt-8 flex gap-4">
          <Link
            href="/tutors"
            className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary-600"
          >
            Browse Tutors
          </Link>
          {!session && (
            <Link
              href="/tutors/create"
              className="rounded-lg border border-primary bg-white px-6 py-3 font-medium text-primary transition-colors hover:bg-primary-50"
            >
              Become a Tutor
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
