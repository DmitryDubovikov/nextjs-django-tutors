'use client';

import { useMemo, useState } from 'react';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import type { Tutor } from '@/generated/schemas';

import { TutorCard } from './tutor-card';

interface TutorGridClientProps {
  tutors: Tutor[];
}

/**
 * Client-side tutor grid with search, filter, and booking dialog.
 * Demonstrates usage of new UI components from Iteration 2.
 */
export function TutorGridClient({ tutors }: TutorGridClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [bookingTutor, setBookingTutor] = useState<Tutor | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  // Extract unique subjects from all tutors
  const allSubjects = useMemo(() => {
    const subjects = new Set<string>();
    for (const tutor of tutors) {
      for (const subject of tutor.subjects) {
        subjects.add(subject);
      }
    }
    return Array.from(subjects).sort();
  }, [tutors]);

  // Filter tutors based on search query and subject filter
  const filteredTutors = useMemo(() => {
    return tutors.filter((tutor) => {
      const matchesSearch =
        searchQuery === '' ||
        tutor.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tutor.headline.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSubject = subjectFilter === 'all' || tutor.subjects.includes(subjectFilter);

      return matchesSearch && matchesSubject;
    });
  }, [tutors, searchQuery, subjectFilter]);

  const handleBook = (tutorId: number) => {
    const tutor = tutors.find((t) => t.id === tutorId);
    if (tutor) {
      setBookingTutor(tutor);
    }
  };

  const handleConfirmBooking = async () => {
    if (!bookingTutor) return;

    setIsBooking(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsBooking(false);
    setBookingTutor(null);

    toast({
      title: 'Booking request sent!',
      description: `Your booking request has been sent to ${bookingTutor.full_name}.`,
      variant: 'success',
    });
  };

  return (
    <>
      {/* Search and filter controls */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <Input
            placeholder="Search by name or headline..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<SearchIcon />}
            aria-label="Search tutors"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger aria-label="Filter by subject">
              <SelectValue placeholder="All subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {allSubjects.map((subject) => (
                <SelectItem key={subject} value={subject} className="capitalize">
                  {subject.replace('-', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tutor grid */}
      {filteredTutors.length === 0 ? (
        <div className="py-12 text-center">
          <h2 className="font-semibold text-foreground text-xl">No tutors found</h2>
          <p className="mt-2 text-muted-foreground">
            Try adjusting your search or filter criteria.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSearchQuery('');
              setSubjectFilter('all');
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTutors.map((tutor, index) => (
            <TutorCard key={tutor.id} tutor={tutor} index={index} onBook={handleBook} />
          ))}
        </div>
      )}

      {/* Booking confirmation dialog */}
      <Dialog open={bookingTutor !== null} onOpenChange={() => setBookingTutor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book a lesson</DialogTitle>
            <DialogDescription>
              You are about to request a lesson with{' '}
              <span className="font-semibold">{bookingTutor?.full_name}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-muted-foreground text-sm">
              Rate:{' '}
              <span className="font-semibold text-foreground">
                {bookingTutor &&
                  new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 0,
                  }).format(Number(bookingTutor.hourly_rate))}
              </span>{' '}
              per hour
            </p>
            <p className="mt-2 text-muted-foreground text-sm">
              Subjects: {bookingTutor?.subjects.slice(0, 3).join(', ')}
              {(bookingTutor?.subjects.length ?? 0) > 3 && '...'}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingTutor(null)} disabled={isBooking}>
              Cancel
            </Button>
            <Button onClick={handleConfirmBooking} isLoading={isBooking}>
              Confirm booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Search icon component.
 */
function SearchIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
