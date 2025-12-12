/**
 * API functions for fetching tutors.
 * Uses generated types from orval.
 */

import type { PaginatedTutorList, TutorDetail } from '@/generated/schemas';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

/**
 * Fetch a paginated list of tutors.
 */
export async function getTutors(params?: {
  page?: number;
}): Promise<PaginatedTutorList> {
  const url = new URL(`${API_BASE_URL}/tutors/`);

  if (params?.page) {
    url.searchParams.set('page', String(params.page));
  }

  const response = await fetch(url.toString(), {
    next: { revalidate: 60 }, // Cache for 1 minute
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tutors: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch a single tutor by ID.
 */
export async function getTutor(id: number): Promise<TutorDetail> {
  const response = await fetch(`${API_BASE_URL}/tutors/${id}/`, {
    next: { revalidate: 60 }, // Cache for 1 minute
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tutor: ${response.statusText}`);
  }

  return response.json();
}
