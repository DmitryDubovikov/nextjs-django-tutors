import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { server } from '../../../tests/setup';
import { checkSearchHealth, searchTutors } from '../search-client';

const SEARCH_SERVICE_URL = 'http://localhost:8080';

describe('searchTutors', () => {
  afterEach(() => {
    server.resetHandlers();
  });

  describe('successful responses', () => {
    it('returns converted tutors from search results', async () => {
      const rawResults = [
        {
          id: 1,
          slug: 'john-doe',
          full_name: 'John Doe',
          avatar_url: 'https://example.com/avatar.jpg',
          headline: 'Math Expert',
          bio: 'Experienced teacher',
          subjects: ['math', 'physics'],
          hourly_rate: 50.0,
          rating: 4.8,
          reviews_count: 42,
          is_verified: true,
          location: 'New York',
          formats: ['online', 'offline'],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ];

      server.use(
        http.get(`${SEARCH_SERVICE_URL}/tutors/search`, () => {
          return HttpResponse.json({ results: rawResults, total: 1 });
        })
      );

      const result = await searchTutors({});

      expect(result.total).toBe(1);
      expect(result.results).toHaveLength(1);

      const tutor = result.results[0];
      expect(tutor).toBeDefined();
      expect(tutor?.id).toBe(1);
      expect(tutor?.slug).toBe('john-doe');
      expect(tutor?.full_name).toBe('John Doe');
      expect(tutor?.avatar_url).toBe('https://example.com/avatar.jpg');
      expect(tutor?.hourly_rate).toBe('50'); // Converted to string
      expect(tutor?.rating).toBe('4.8'); // Converted to string
      expect(tutor?.user_id).toBe(0); // Default value
    });

    it('handles empty results', async () => {
      server.use(
        http.get(`${SEARCH_SERVICE_URL}/tutors/search`, () => {
          return HttpResponse.json({ results: [], total: 0 });
        })
      );

      const result = await searchTutors({});

      expect(result.total).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it('handles multiple results', async () => {
      const rawResults = [
        {
          id: 1,
          slug: 'tutor-1',
          full_name: 'Tutor 1',
          avatar_url: '',
          headline: '',
          bio: '',
          subjects: [],
          hourly_rate: 30,
          rating: 4.0,
          reviews_count: 10,
          is_verified: false,
          location: '',
          formats: [],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 2,
          slug: 'tutor-2',
          full_name: 'Tutor 2',
          avatar_url: '',
          headline: '',
          bio: '',
          subjects: [],
          hourly_rate: 40,
          rating: 4.5,
          reviews_count: 20,
          is_verified: true,
          location: '',
          formats: [],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      server.use(
        http.get(`${SEARCH_SERVICE_URL}/tutors/search`, () => {
          return HttpResponse.json({ results: rawResults, total: 2 });
        })
      );

      const result = await searchTutors({});

      expect(result.total).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.results[0]?.id).toBe(1);
      expect(result.results[1]?.id).toBe(2);
    });
  });

  describe('query parameters', () => {
    it('includes text search query', async () => {
      let capturedUrl = '';
      server.use(
        http.get(`${SEARCH_SERVICE_URL}/tutors/search`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ results: [], total: 0 });
        })
      );

      await searchTutors({ q: 'mathematics' });

      expect(capturedUrl).toContain('q=mathematics');
    });

    it('includes multiple subjects', async () => {
      let capturedUrl = '';
      server.use(
        http.get(`${SEARCH_SERVICE_URL}/tutors/search`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ results: [], total: 0 });
        })
      );

      await searchTutors({ subjects: ['math', 'physics'] });

      expect(capturedUrl).toContain('subjects=math');
      expect(capturedUrl).toContain('subjects=physics');
    });

    it('includes price range', async () => {
      let capturedUrl = '';
      server.use(
        http.get(`${SEARCH_SERVICE_URL}/tutors/search`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ results: [], total: 0 });
        })
      );

      await searchTutors({ minPrice: 30, maxPrice: 100 });

      expect(capturedUrl).toContain('min_price=30');
      expect(capturedUrl).toContain('max_price=100');
    });

    it('includes minimum rating', async () => {
      let capturedUrl = '';
      server.use(
        http.get(`${SEARCH_SERVICE_URL}/tutors/search`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ results: [], total: 0 });
        })
      );

      await searchTutors({ minRating: 4 });

      expect(capturedUrl).toContain('min_rating=4');
    });

    it('includes format filter', async () => {
      let capturedUrl = '';
      server.use(
        http.get(`${SEARCH_SERVICE_URL}/tutors/search`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ results: [], total: 0 });
        })
      );

      await searchTutors({ format: 'online' });

      expect(capturedUrl).toContain('format=online');
    });

    it('includes location filter', async () => {
      let capturedUrl = '';
      server.use(
        http.get(`${SEARCH_SERVICE_URL}/tutors/search`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ results: [], total: 0 });
        })
      );

      await searchTutors({ location: 'New York' });

      expect(capturedUrl).toContain('location=New+York');
    });

    it('includes pagination parameters', async () => {
      let capturedUrl = '';
      server.use(
        http.get(`${SEARCH_SERVICE_URL}/tutors/search`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ results: [], total: 0 });
        })
      );

      await searchTutors({ limit: 20, offset: 40 });

      expect(capturedUrl).toContain('limit=20');
      expect(capturedUrl).toContain('offset=40');
    });

    it('omits undefined parameters', async () => {
      let capturedUrl = '';
      server.use(
        http.get(`${SEARCH_SERVICE_URL}/tutors/search`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ results: [], total: 0 });
        })
      );

      await searchTutors({ q: 'test' });

      expect(capturedUrl).toContain('q=test');
      expect(capturedUrl).not.toContain('subjects');
      expect(capturedUrl).not.toContain('min_price');
      expect(capturedUrl).not.toContain('format');
    });
  });

  describe('error handling', () => {
    it('throws error on non-ok response', async () => {
      server.use(
        http.get(`${SEARCH_SERVICE_URL}/tutors/search`, () => {
          return new HttpResponse(null, { status: 500, statusText: 'Internal Server Error' });
        })
      );

      await expect(searchTutors({})).rejects.toThrow('Search failed: Internal Server Error');
    });

    it('throws error on 404', async () => {
      server.use(
        http.get(`${SEARCH_SERVICE_URL}/tutors/search`, () => {
          return new HttpResponse(null, { status: 404, statusText: 'Not Found' });
        })
      );

      await expect(searchTutors({})).rejects.toThrow('Search failed: Not Found');
    });
  });
});

describe('checkSearchHealth', () => {
  afterEach(() => {
    server.resetHandlers();
  });

  it('returns true when health check succeeds', async () => {
    server.use(
      http.get(`${SEARCH_SERVICE_URL}/health`, () => {
        return HttpResponse.json({ status: 'ok', opensearch: 'connected' });
      })
    );

    const result = await checkSearchHealth();

    expect(result).toBe(true);
  });

  it('returns false when health check fails', async () => {
    server.use(
      http.get(`${SEARCH_SERVICE_URL}/health`, () => {
        return new HttpResponse(null, { status: 503 });
      })
    );

    const result = await checkSearchHealth();

    expect(result).toBe(false);
  });

  it('returns false when network error occurs', async () => {
    server.use(
      http.get(`${SEARCH_SERVICE_URL}/health`, () => {
        return HttpResponse.error();
      })
    );

    const result = await checkSearchHealth();

    expect(result).toBe(false);
  });
});
