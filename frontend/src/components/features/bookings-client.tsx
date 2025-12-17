'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useBookingsCancelCreate, useBookingsList } from '@/generated/api/bookings/bookings';
import type { Booking, BookingRequest } from '@/generated/schemas';
import { cn } from '@/lib/utils';

import { toast } from '../ui/toast';

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

function formatPrice(price: string | number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(price));
}

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

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full" />
            <div className="mt-4 flex justify-between">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-8 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function BookingCard({
  booking,
  onCancel,
  isCancelling,
}: {
  booking: Booking;
  onCancel: (id: number) => void;
  isCancelling: boolean;
}) {
  const { date, time } = formatDateTime(booking.scheduled_at);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">
              {/* biome-ignore lint/suspicious/noExplicitAny: Next.js typed routes limitation with dynamic segments */}
              <Link href={`/tutors/${booking.tutor_slug}` as any} className="hover:underline">
                {booking.tutor_name}
              </Link>
            </CardTitle>
            <CardDescription>
              {date} at {time} ({booking.duration_minutes} min)
            </CardDescription>
          </div>
          {getStatusBadge(booking.status ?? 'pending')}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {booking.notes && <p className="text-muted-foreground text-sm">{booking.notes}</p>}
        <div className="flex items-center justify-between">
          <span className="font-semibold">{formatPrice(booking.price)}</span>
          {(booking.status === 'pending' || booking.status === 'confirmed') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancel(booking.id)}
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelling...' : 'Cancel'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function BookingsClient() {
  const { status } = useSession();
  const isSessionReady = status === 'authenticated';

  const { data, isLoading, error, refetch } = useBookingsList(undefined, {
    query: {
      // Don't fetch until session is loaded to avoid race condition
      // where API request goes out before auth token is synced
      enabled: isSessionReady,
    },
  });
  const { mutate: cancelBooking, isPending: isCancelling } = useBookingsCancelCreate();

  const handleCancel = (bookingId: number) => {
    // TODO: Update Orval types if cancel endpoint doesn't require body
    // Current workaround: pass empty object as BookingRequest
    cancelBooking(
      {
        id: String(bookingId),
        data: {} as BookingRequest,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Booking cancelled',
            description: 'Your booking has been cancelled successfully.',
            variant: 'success',
          });
          refetch();
        },
        onError: () => {
          toast({
            title: 'Error',
            description: 'Failed to cancel booking. Please try again.',
            variant: 'error',
          });
        },
      }
    );
  };

  // Show loading state while session is loading or data is being fetched
  if (!isSessionReady || isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <p className="text-destructive">Failed to load bookings. Please try again.</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const bookings = data?.data?.results ?? [];

  if (bookings.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {bookings.map((booking) => (
        <BookingCard
          key={booking.id}
          booking={booking}
          onCancel={handleCancel}
          isCancelling={isCancelling}
        />
      ))}
    </div>
  );
}
