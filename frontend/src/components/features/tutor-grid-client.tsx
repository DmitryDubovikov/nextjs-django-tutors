'use client';

import { parseAsInteger, useQueryState } from 'nuqs';
import { useState, useTransition } from 'react';

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
import type { Tutor } from '@/generated/schemas';

import { TutorCard } from './tutor-card';

interface TutorGridClientProps {
  tutors: Tutor[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

/**
 * Client-side tutor grid with pagination and booking dialog.
 * Filtering is now handled server-side via URL params.
 */
export function TutorGridClient({
  tutors,
  currentPage,
  totalPages,
  totalCount,
}: TutorGridClientProps) {
  const [bookingTutor, setBookingTutor] = useState<Tutor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bookingNotes, setBookingNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [, setPage] = useQueryState('page', parseAsInteger.withDefault(1));

  const handleBook = (tutorId: number) => {
    const tutor = tutors.find((t) => t.id === tutorId);
    if (tutor) {
      setBookingTutor(tutor);
      setSelectedDate(null);
      setBookingNotes('');
    }
  };

  const handleConfirmBooking = async () => {
    if (!bookingTutor || !selectedDate) return;

    setIsBooking(true);

    // TODO: Replace with actual booking API call when implemented
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsBooking(false);
    setBookingTutor(null);
    setSelectedDate(null);
    setBookingNotes('');

    toast({
      title: 'Booking request sent!',
      description: `Your booking request has been sent to ${bookingTutor.full_name}.`,
      variant: 'success',
    });
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

  return (
    <>
      {/* Results count */}
      <div className="mb-4 text-muted-foreground text-sm">
        Showing {tutors.length} of {totalCount} tutors
      </div>

      {/* Tutor grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tutors.map((tutor, index) => (
          <TutorCard key={tutor.id} tutor={tutor} index={index} onBook={handleBook} />
        ))}
      </div>

      {/* Pagination */}
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

      {/* Booking confirmation dialog */}
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
    </>
  );
}
