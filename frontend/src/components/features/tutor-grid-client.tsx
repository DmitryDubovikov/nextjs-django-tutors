'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { parseAsInteger, useQueryState } from 'nuqs';
import { useEffect, useState, useTransition } from 'react';
import { useInView } from 'react-intersection-observer';

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
import { tutorsList } from '@/generated/api/tutors/tutors';
import type { Tutor } from '@/generated/schemas';
import { useMediaQuery } from '@/hooks/use-media-query';

import { TutorCard } from './tutor-card';

interface TutorGridClientProps {
  tutors: Tutor[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  searchParams?: Record<string, string>;
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-4">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export function TutorGridClient({
  tutors,
  currentPage,
  totalPages,
  totalCount,
  searchParams = {},
}: TutorGridClientProps) {
  const [bookingTutor, setBookingTutor] = useState<Tutor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bookingNotes, setBookingNotes] = useState('');
  const [isPending, startTransition] = useTransition();

  const isMobile = useMediaQuery('(max-width: 768px)');
  const { ref: loadMoreRef, inView } = useInView();

  const { mutate: createBooking, isPending: isBooking } = useBookingsCreate();

  const [, setPage] = useQueryState(
    'page',
    parseAsInteger.withDefault(1).withOptions({ shallow: false })
  );

  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['tutors', 'infinite', searchParams],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await tutorsList({ ...searchParams, page: pageParam });
      return {
        results: response.data.results,
        nextPage: response.data.next ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    initialData: {
      pages: [{ results: tutors, nextPage: totalPages > 1 ? 2 : undefined }],
      pageParams: [1],
    },
    enabled: isMobile,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage && isMobile) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage, isMobile]);

  const handleBook = (tutorId: number) => {
    const allTutors = isMobile
      ? (infiniteData?.pages.flatMap((page) => page.results) ?? [])
      : tutors;
    const tutor = allTutors.find((t) => t.id === tutorId);
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
    if (currentPage > 1) {
      startTransition(() => {
        setPage(currentPage - 1);
      });
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      startTransition(() => {
        setPage(currentPage + 1);
      });
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

  if (isMobile) {
    const allTutors = infiniteData?.pages.flatMap((page) => page.results) ?? [];

    return (
      <>
        <div className="mb-4 text-muted-foreground text-sm">
          Showing {allTutors.length} of {totalCount} tutors
        </div>

        <div className="grid grid-cols-1 gap-4">
          {allTutors.map((tutor, index) => (
            <TutorCard key={tutor.id} tutor={tutor} index={index} onBook={handleBook} />
          ))}
        </div>

        <div ref={loadMoreRef} className="flex justify-center py-4">
          {isFetchingNextPage && <LoadingSpinner />}
          {!hasNextPage && allTutors.length > 0 && (
            <p className="text-muted-foreground text-sm">No more tutors to load</p>
          )}
        </div>

        {/* Booking Dialog */}
        <BookingDialog
          bookingTutor={bookingTutor}
          setBookingTutor={setBookingTutor}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          bookingNotes={bookingNotes}
          setBookingNotes={setBookingNotes}
          handleConfirmBooking={handleConfirmBooking}
          isBooking={isBooking}
          formatPrice={formatPrice}
        />
      </>
    );
  }

  return (
    <>
      <div className="mb-4 text-muted-foreground text-sm">
        Showing {tutors.length} of {totalCount} tutors
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tutors.map((tutor, index) => (
          <TutorCard key={tutor.id} tutor={tutor} index={index} onBook={handleBook} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button
            variant="outline"
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || isPending}
          >
            Previous
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages || isPending}
          >
            Next
          </Button>
        </div>
      )}

      {/* Booking Dialog */}
      <BookingDialog
        bookingTutor={bookingTutor}
        setBookingTutor={setBookingTutor}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        bookingNotes={bookingNotes}
        setBookingNotes={setBookingNotes}
        handleConfirmBooking={handleConfirmBooking}
        isBooking={isBooking}
        formatPrice={formatPrice}
      />
    </>
  );
}

interface BookingDialogProps {
  bookingTutor: Tutor | null;
  setBookingTutor: (tutor: Tutor | null) => void;
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  bookingNotes: string;
  setBookingNotes: (notes: string) => void;
  handleConfirmBooking: () => void;
  isBooking: boolean;
  formatPrice: (price: string | number | undefined) => string;
}

function BookingDialog({
  bookingTutor,
  setBookingTutor,
  selectedDate,
  setSelectedDate,
  bookingNotes,
  setBookingNotes,
  handleConfirmBooking,
  isBooking,
  formatPrice,
}: BookingDialogProps) {
  return (
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
  );
}
