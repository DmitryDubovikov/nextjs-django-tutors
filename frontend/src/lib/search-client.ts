import type { Tutor } from '@/generated/schemas';

const SEARCH_SERVICE_URL = process.env.NEXT_PUBLIC_SEARCH_SERVICE_URL || 'http://localhost:8080';

export interface SearchParams {
  q?: string;
  subjects?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  format?: 'online' | 'offline';
  location?: string;
  limit?: number;
  offset?: number;
}

// Raw response from Go search service (numbers as numbers)
interface RawSearchResult {
  id: number;
  slug: string;
  full_name: string;
  avatar_url: string;
  headline: string;
  bio: string;
  subjects: string[];
  hourly_rate: number;
  rating: number;
  reviews_count: number;
  is_verified: boolean;
  location: string;
  formats: string[];
  created_at: string;
  updated_at: string;
}

interface RawSearchResponse {
  results: RawSearchResult[];
  total: number;
}

export interface SearchResponse {
  results: Tutor[];
  total: number;
}

// Convert Go search result to Tutor format (numbers to strings for decimal fields)
function toTutor(raw: RawSearchResult): Tutor {
  return {
    id: raw.id,
    user_id: 0, // Not available from search
    slug: raw.slug,
    full_name: raw.full_name,
    avatar_url: raw.avatar_url,
    headline: raw.headline,
    bio: raw.bio,
    subjects: raw.subjects,
    hourly_rate: raw.hourly_rate.toString(),
    rating: raw.rating?.toString(),
    reviews_count: raw.reviews_count,
    is_verified: raw.is_verified,
    location: raw.location,
    formats: raw.formats,
    created_at: raw.created_at,
  };
}

export async function searchTutors(params: SearchParams): Promise<SearchResponse> {
  const query = new URLSearchParams();

  if (params.q) query.set('q', params.q);
  if (params.subjects) {
    for (const s of params.subjects) {
      query.append('subjects', s);
    }
  }
  if (params.minPrice !== undefined) query.set('min_price', params.minPrice.toString());
  if (params.maxPrice !== undefined) query.set('max_price', params.maxPrice.toString());
  if (params.minRating !== undefined) query.set('min_rating', params.minRating.toString());
  if (params.format) query.set('format', params.format);
  if (params.location) query.set('location', params.location);
  if (params.limit !== undefined) query.set('limit', params.limit.toString());
  if (params.offset !== undefined) query.set('offset', params.offset.toString());

  const response = await fetch(`${SEARCH_SERVICE_URL}/tutors/search?${query}`);
  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  const raw: RawSearchResponse = await response.json();
  return {
    results: raw.results.map(toTutor),
    total: raw.total,
  };
}

export async function checkSearchHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${SEARCH_SERVICE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
