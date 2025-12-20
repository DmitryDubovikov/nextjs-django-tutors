'use client';

import { useQueryStates } from 'nuqs';
import { parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs';
import { useCallback, useEffect, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  FORMAT_OPTIONS,
  type FormatOption,
  SORT_OPTIONS,
  type SortOption,
} from '@/app/tutors/search-params';

interface TutorFiltersProps {
  subjects: string[];
}

/**
 * TutorFilters component provides filtering and sorting controls for the tutor catalog.
 * Uses nuqs for type-safe URL state management.
 */
export function TutorFilters({ subjects }: TutorFiltersProps) {
  const [isPending, startTransition] = useTransition();
  const [localSearch, setLocalSearch] = useState('');

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

  // Sync local search with URL param
  useEffect(() => {
    setLocalSearch(params.q);
  }, [params.q]);

  // Debounced search update with minimum 2 characters
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== params.q) {
        // Only search if empty (to clear) or at least 2 characters
        const shouldSearch = localSearch.length === 0 || localSearch.length >= 2;
        if (shouldSearch) {
          startTransition(() => {
            setParams({ q: localSearch || null, page: 1 });
          });
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localSearch, params.q, setParams]);

  const handleSubjectChange = useCallback(
    (value: string) => {
      startTransition(() => {
        setParams({ subject: value === 'all' ? null : value, page: 1 });
      });
    },
    [setParams]
  );

  const handleFormatChange = useCallback(
    (value: string) => {
      startTransition(() => {
        setParams({ format: (value === 'all' ? null : value) as FormatOption | null, page: 1 });
      });
    },
    [setParams]
  );

  const handleSortChange = useCallback(
    (value: string) => {
      startTransition(() => {
        setParams({ ordering: value as SortOption, page: 1 });
      });
    },
    [setParams]
  );

  const handleClearFilters = useCallback(() => {
    setLocalSearch('');
    startTransition(() => {
      setParams({
        q: null,
        subject: null,
        minPrice: null,
        maxPrice: null,
        format: null,
        ordering: '-rating',
        page: 1,
      });
    });
  }, [setParams]);

  const hasActiveFilters =
    params.q || params.subject || params.minPrice || params.maxPrice || params.format;

  return (
    <div className="mb-6 space-y-4">
      {/* Search and main filters row */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <Input
            placeholder="Search by name or headline..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            leftIcon={<SearchIcon />}
            aria-label="Search tutors"
            disabled={isPending}
          />
        </div>

        <div className="w-full sm:w-40">
          <Select value={params.subject ?? 'all'} onValueChange={handleSubjectChange}>
            <SelectTrigger aria-label="Filter by subject" disabled={isPending}>
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject} value={subject} className="capitalize">
                  {subject.replace('-', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-36">
          <Select value={params.format ?? 'all'} onValueChange={handleFormatChange}>
            <SelectTrigger aria-label="Filter by format" disabled={isPending}>
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All formats</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">In-person</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-44">
          <Select value={params.ordering} onValueChange={handleSortChange}>
            <SelectTrigger aria-label="Sort by" disabled={isPending}>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="-rating">Highest rated</SelectItem>
              <SelectItem value="rating">Lowest rated</SelectItem>
              <SelectItem value="hourly_rate">Price: Low to High</SelectItem>
              <SelectItem value="-hourly_rate">Price: High to Low</SelectItem>
              <SelectItem value="-created_at">Newest first</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active filters row */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Active filters:</span>
          {params.q && (
            <FilterBadge
              label={`Search: "${params.q}"`}
              onRemove={() => {
                setLocalSearch('');
                setParams({ q: null, page: 1 });
              }}
            />
          )}
          {params.subject && (
            <FilterBadge
              label={`Subject: ${params.subject.replace('-', ' ')}`}
              onRemove={() => setParams({ subject: null, page: 1 })}
            />
          )}
          {params.format && (
            <FilterBadge
              label={`Format: ${params.format}`}
              onRemove={() => setParams({ format: null, page: 1 })}
            />
          )}
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * FilterBadge displays an active filter with a remove button.
 */
function FilterBadge({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-primary text-sm">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 rounded-full p-0.5 hover:bg-primary/20"
        aria-label={`Remove filter: ${label}`}
      >
        <svg
          className="h-3 w-3"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </span>
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
