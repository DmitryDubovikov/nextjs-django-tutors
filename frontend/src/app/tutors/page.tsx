'use client';

import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';
import { useMemo, useState } from 'react';

import { TutorCard, TutorCardSkeleton } from '@/components/features/tutor-card';
import { TutorFilters } from '@/components/features/tutor-filters';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { useBookingsCreate } from '@/generated/api/bookings/bookings';
import { useTutorsList } from '@/generated/api/tutors/tutors';
import type { Tutor } from '@/generated/schemas';
import { useSearch } from '@/hooks/use-search';

import { FORMAT_OPTIONS, SORT_OPTIONS } from './search-params';

const PAGE_SIZE = 20;

export default function TutorsPage() {
  const [bookingTutor, setBookingTutor] = useState<Tutor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bookingNotes, setBookingNotes] = useState('');

  const { mutate: createBooking, isPending: isBooking } = useBookingsCreate();

  // URL state for filters
  const [params, setParams] = useQueryStates(
    {
      q: parseAsString.withDefault(''),
      subject: parseAsString,
      minPrice: parseAsInteger,
      maxPrice: parseAsInteger,
      format: parseAsStringLiteral(FORMAT_OPTIONS),
      ordering: parseAsStringLiteral(SORT_OPTIONS).withDefault('-rating'),
      page: parseAsInteger.withDefault(1),
    },
    { shallow: true }
  );

  // Get subjects from Django for filter dropdown
  const { data: subjectsData } = useTutorsList(
    {},
    {
      query: {
        select: (response) => {
          const tutors = response.data.results ?? [];
          const subjects = new Set<string>();
          for (const tutor of tutors) {
            for (const subject of tutor.subjects) {
              subjects.add(subject);
            }
          }
          return Array.from(subjects).sort();
        },
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      },
    }
  );

  const subjects = subjectsData ?? [];

  // Search using Go service
  const searchParams = useMemo(
    () => ({
      q: params.q || undefined,
      subjects: params.subject ? [params.subject] : undefined,
      minPrice: params.minPrice ?? undefined,
      maxPrice: params.maxPrice ?? undefined,
      format: params.format ?? undefined,
      limit: PAGE_SIZE,
      offset: (params.page - 1) * PAGE_SIZE,
    }),
    [params.q, params.subject, params.minPrice, params.maxPrice, params.format, params.page]
  );

  const { data: searchData, isLoading, error } = useSearch(searchParams);

  const tutors = searchData?.results ?? [];
  const total = searchData?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleBook = (tutorId: number) => {
    const tutor = tutors.find((t) => t.id === tutorId);
    if (tutor) {
      setBookingTutor(tutor);
      setSelectedDate(null);
      setBookingNotes('');
    }
  };

  const handleConfirmBooking = () => {
    if (!bookingTutor || !selectedDate) return;

    createBooking(
      {
        data: {
          tutor: bookingTutor.id,
          scheduled_at: selectedDate.toISOString(),
          duration_minutes: 60,
          notes: bookingNotes || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: 'Booking request sent!',
            description: `Your booking request has been sent to ${bookingTutor.full_name}.`,
            variant: 'success',
          });
          setBookingTutor(null);
          setSelectedDate(null);
          setBookingNotes('');
        },
        onError: () => {
          toast({
            title: 'Booking failed',
            description: 'Failed to create booking. Please try again.',
            variant: 'error',
          });
        },
      }
    );
  };

  const handlePrevPage = () => {
    if (params.page > 1) {
      setParams({ page: params.page - 1 });
    }
  };

  const handleNextPage = () => {
    if (params.page < totalPages) {
      setParams({ page: params.page + 1 });
    }
  };

  const formatPrice = (price: string | number | undefined) => {
    if (!price) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(Number(price));
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="font-bold text-3xl text-foreground">Find a Tutor</h1>
        <p className="mt-2 text-muted-foreground">
          Browse our selection of verified tutors for any subject
        </p>
      </header>

      <TutorFilters subjects={subjects} />

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton list never reorders
            <TutorCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="py-12 text-center">
          <h2 className="font-semibold text-foreground text-xl">Search error</h2>
          <p className="mt-2 text-muted-foreground">
            Failed to search tutors. Please try again later.
          </p>
        </div>
      )}

      {/* Results */}
      {!isLoading && !error && (
        <>
          <div className="mb-4 text-muted-foreground text-sm">
            Showing {tutors.length} of {total} tutors
          </div>

          {tutors.length === 0 ? (
            <div className="py-12 text-center">
              <h2 className="font-semibold text-foreground text-xl">No tutors found</h2>
              <p className="mt-2 text-muted-foreground">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {tutors.map((tutor, index) => (
                <TutorCard key={tutor.id} tutor={tutor} index={index} onBook={handleBook} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <Button variant="outline" onClick={handlePrevPage} disabled={params.page <= 1}>
                Previous
              </Button>
              <span className="text-muted-foreground text-sm">
                Page {params.page} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={handleNextPage}
                disabled={params.page >= totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Booking Dialog */}
      <Dialog open={bookingTutor !== null} onOpenChange={(open) => !open && setBookingTutor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book a lesson with {bookingTutor?.full_name}</DialogTitle>
            <DialogDescription>Select a date and time for your lesson.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label htmlFor="booking-datetime" className="font-medium text-sm">
                Select date and time
              </label>
              <Input
                id="booking-datetime"
                type="datetime-local"
                value={selectedDate?.toISOString().slice(0, 16) ?? ''}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            <div>
              <label htmlFor="booking-notes" className="font-medium text-sm">
                Notes (optional)
              </label>
              <Input
                id="booking-notes"
                placeholder="Any specific topics you want to cover?"
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
              />
            </div>

            <p className="text-muted-foreground text-sm">
              Price:{' '}
              <span className="font-semibold text-foreground">
                {formatPrice(bookingTutor?.hourly_rate)}
              </span>{' '}
              per hour
            </p>
            <p className="text-muted-foreground text-sm">
              Subjects: {bookingTutor?.subjects.slice(0, 3).join(', ')}
              {(bookingTutor?.subjects.length ?? 0) > 3 && '...'}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingTutor(null)} disabled={isBooking}>
              Cancel
            </Button>
            <Button onClick={handleConfirmBooking} disabled={!selectedDate} isLoading={isBooking}>
              Confirm booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
