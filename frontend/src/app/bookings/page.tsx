import type { Metadata } from 'next';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'My Bookings | Tutors Marketplace',
  description: 'View and manage your lesson bookings',
};

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Status badge variants.
 */
function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return <Badge variant="outline">Pending</Badge>;
    case 'confirmed':
      return <Badge variant="success">Confirmed</Badge>;
    case 'cancelled':
      return <Badge variant="destructive">Cancelled</Badge>;
    case 'completed':
      return <Badge>Completed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

/**
 * Format date and time for display.
 */
function formatDateTime(dateString: string) {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    time: date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }),
  };
}

/**
 * Format price for display.
 */
function formatPrice(price: string | number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(price));
}

/**
 * Empty state when user has no bookings.
 */
function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <svg
          className="h-16 w-16 text-muted-foreground/50"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <h2 className="mt-4 font-semibold text-xl">No bookings yet</h2>
        <p className="mt-2 text-center text-muted-foreground">
          Browse our tutors and book your first lesson.
        </p>
        <Link
          href="/tutors"
          className={cn(
            'mt-6 inline-flex items-center justify-center font-medium',
            'rounded-md transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            'bg-primary text-primary-foreground hover:bg-primary-600 focus-visible:ring-primary-300',
            'h-10 gap-2 px-4 text-sm'
          )}
        >
          Find a Tutor
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * Placeholder booking card for demonstration.
 * Will be replaced with actual data from the API.
 */
function BookingCard({
  booking,
}: {
  booking: {
    id: number;
    tutorName: string;
    tutorSlug: string;
    scheduledAt: string;
    durationMinutes: number;
    status: string;
    price: number;
    notes?: string;
  };
}) {
  const { date, time } = formatDateTime(booking.scheduledAt);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">
              {/* biome-ignore lint/suspicious/noExplicitAny: Next.js typed routes limitation with dynamic segments */}
              <Link href={`/tutors/${booking.tutorSlug}` as any} className="hover:underline">
                {booking.tutorName}
              </Link>
            </CardTitle>
            <CardDescription>
              {date} at {time} ({booking.durationMinutes} min)
            </CardDescription>
          </div>
          {getStatusBadge(booking.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {booking.notes && <p className="text-muted-foreground text-sm">{booking.notes}</p>}
        <div className="flex items-center justify-between">
          <span className="font-semibold">{formatPrice(booking.price)}</span>
          {booking.status === 'pending' && (
            <Button variant="outline" size="sm">
              Cancel
            </Button>
          )}
          {booking.status === 'confirmed' && (
            <Button variant="outline" size="sm">
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function BookingsPage() {
  // TODO: Replace with actual API call when authentication is implemented
  // const { data: bookings } = await bookingsList();

  // For now, show empty state
  const bookings: Array<{
    id: number;
    tutorName: string;
    tutorSlug: string;
    scheduledAt: string;
    durationMinutes: number;
    status: string;
    price: number;
    notes?: string;
  }> = [];

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="font-bold text-3xl text-foreground">My Bookings</h1>
        <p className="mt-2 text-muted-foreground">View and manage your scheduled lessons</p>
      </header>

      {bookings.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </main>
  );
}
