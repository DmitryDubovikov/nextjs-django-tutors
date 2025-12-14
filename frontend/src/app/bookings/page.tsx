import type { Metadata } from 'next';

import { BookingsClient } from '@/components/features/bookings-client';

export const metadata: Metadata = {
  title: 'My Bookings | Tutors Marketplace',
  description: 'View and manage your lesson bookings',
};

export const dynamic = 'force-dynamic';

export default function BookingsPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="font-bold text-3xl text-foreground">My Bookings</h1>
        <p className="mt-2 text-muted-foreground">View and manage your scheduled lessons</p>
      </header>

      <BookingsClient />
    </main>
  );
}
