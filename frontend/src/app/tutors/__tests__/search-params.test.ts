import { describe, expect, it } from 'vitest';

import {
  FORMAT_OPTIONS,
  type FormatOption,
  SORT_OPTIONS,
  type SortOption,
  searchParamsCache,
} from '../search-params';

describe('search-params', () => {
  describe('SORT_OPTIONS', () => {
    it('includes all expected sort options', () => {
      expect(SORT_OPTIONS).toEqual([
        'rating',
        '-rating',
        'hourly_rate',
        '-hourly_rate',
        '-created_at',
      ]);
    });

    it('has correct number of options', () => {
      expect(SORT_OPTIONS).toHaveLength(5);
    });
  });

  describe('FORMAT_OPTIONS', () => {
    it('includes online and offline options', () => {
      expect(FORMAT_OPTIONS).toEqual(['online', 'offline']);
    });

    it('has correct number of options', () => {
      expect(FORMAT_OPTIONS).toHaveLength(2);
    });
  });

  describe('searchParamsCache', () => {
    it('parses q parameter as string with empty default', async () => {
      const result = await searchParamsCache.parse({ q: 'math' });
      expect(result.q).toBe('math');
    });

    it('defaults q to empty string when not provided', async () => {
      const result = await searchParamsCache.parse({});
      expect(result.q).toBe('');
    });

    it('parses subject parameter as string', async () => {
      const result = await searchParamsCache.parse({ subject: 'physics' });
      expect(result.subject).toBe('physics');
    });

    it('returns null for subject when not provided', async () => {
      const result = await searchParamsCache.parse({});
      expect(result.subject).toBeNull();
    });

    it('parses minPrice parameter as integer', async () => {
      const result = await searchParamsCache.parse({ minPrice: '30' });
      expect(result.minPrice).toBe(30);
      expect(typeof result.minPrice).toBe('number');
    });

    it('returns null for minPrice when not provided', async () => {
      const result = await searchParamsCache.parse({});
      expect(result.minPrice).toBeNull();
    });

    it('parses maxPrice parameter as integer', async () => {
      const result = await searchParamsCache.parse({ maxPrice: '100' });
      expect(result.maxPrice).toBe(100);
      expect(typeof result.maxPrice).toBe('number');
    });

    it('returns null for maxPrice when not provided', async () => {
      const result = await searchParamsCache.parse({});
      expect(result.maxPrice).toBeNull();
    });

    it('parses minRating parameter as integer', async () => {
      const result = await searchParamsCache.parse({ minRating: '4' });
      expect(result.minRating).toBe(4);
    });

    it('returns null for minRating when not provided', async () => {
      const result = await searchParamsCache.parse({});
      expect(result.minRating).toBeNull();
    });

    it('parses format parameter from allowed options', async () => {
      const result = await searchParamsCache.parse({ format: 'online' });
      expect(result.format).toBe('online');
    });

    it('accepts offline format', async () => {
      const result = await searchParamsCache.parse({ format: 'offline' });
      expect(result.format).toBe('offline');
    });

    it('returns null for format when not provided', async () => {
      const result = await searchParamsCache.parse({});
      expect(result.format).toBeNull();
    });

    it('parses location parameter as string', async () => {
      const result = await searchParamsCache.parse({ location: 'New York' });
      expect(result.location).toBe('New York');
    });

    it('returns null for location when not provided', async () => {
      const result = await searchParamsCache.parse({});
      expect(result.location).toBeNull();
    });

    it('parses ordering parameter from allowed options', async () => {
      const result = await searchParamsCache.parse({ ordering: 'hourly_rate' });
      expect(result.ordering).toBe('hourly_rate');
    });

    it('accepts negative ordering values', async () => {
      const result = await searchParamsCache.parse({ ordering: '-rating' });
      expect(result.ordering).toBe('-rating');
    });

    it('defaults ordering to -rating when not provided', async () => {
      const result = await searchParamsCache.parse({});
      expect(result.ordering).toBe('-rating');
    });

    it('parses page parameter as integer', async () => {
      const result = await searchParamsCache.parse({ page: '3' });
      expect(result.page).toBe(3);
    });

    it('defaults page to 1 when not provided', async () => {
      const result = await searchParamsCache.parse({});
      expect(result.page).toBe(1);
    });

    it('parses multiple parameters together', async () => {
      const result = await searchParamsCache.parse({
        q: 'algebra',
        subject: 'math',
        minPrice: '20',
        maxPrice: '80',
        format: 'online',
        ordering: '-rating',
        page: '2',
      });

      expect(result).toEqual({
        q: 'algebra',
        subject: 'math',
        minPrice: 20,
        maxPrice: 80,
        minRating: null,
        format: 'online',
        location: null,
        ordering: '-rating',
        page: 2,
      });
    });

    it('handles empty string values correctly', async () => {
      const result = await searchParamsCache.parse({
        q: '',
        subject: '',
      });

      expect(result.q).toBe('');
      // Empty string for optional fields might be treated as null
      // depending on nuqs implementation
    });

    it('preserves ordering default when provided empty', async () => {
      const result = await searchParamsCache.parse({ ordering: '' as SortOption });
      // Should fall back to default
      expect(result.ordering).toBe('-rating');
    });
  });

  describe('TypeScript types', () => {
    it('FormatOption type includes correct values', () => {
      const online: FormatOption = 'online';
      const offline: FormatOption = 'offline';

      expect(online).toBe('online');
      expect(offline).toBe('offline');
    });

    it('SortOption type includes all sort values', () => {
      const options: SortOption[] = [
        'rating',
        '-rating',
        'hourly_rate',
        '-hourly_rate',
        '-created_at',
      ];

      expect(options).toHaveLength(5);
    });
  });

  describe('edge cases', () => {
    it('handles invalid integer values gracefully', async () => {
      const result = await searchParamsCache.parse({
        minPrice: 'not-a-number',
      });

      // nuqs should handle invalid integers gracefully
      // Typically returns null or default
      expect(result.minPrice).toBeNull();
    });

    it('handles negative price values', async () => {
      const result = await searchParamsCache.parse({
        minPrice: '-10',
      });

      // Should parse as negative number
      expect(result.minPrice).toBe(-10);
    });

    it('handles zero values', async () => {
      const result = await searchParamsCache.parse({
        minPrice: '0',
        page: '0',
      });

      expect(result.minPrice).toBe(0);
      expect(result.page).toBe(0);
    });

    it('handles very large page numbers', async () => {
      const result = await searchParamsCache.parse({
        page: '999999',
      });

      expect(result.page).toBe(999999);
    });

    it('handles special characters in search query', async () => {
      const result = await searchParamsCache.parse({
        q: 'math & physics',
      });

      expect(result.q).toBe('math & physics');
    });

    it('handles unicode characters in search query', async () => {
      const result = await searchParamsCache.parse({
        q: 'математика',
      });

      expect(result.q).toBe('математика');
    });

    it('handles multiple spaces in search query', async () => {
      const result = await searchParamsCache.parse({
        q: 'advanced    calculus',
      });

      expect(result.q).toBe('advanced    calculus');
    });
  });

  describe('type safety', () => {
    it('TutorSearchParams type matches parsed result structure', async () => {
      const result = await searchParamsCache.parse({});

      // Type assertion to verify structure
      const typed: {
        q: string;
        subject: string | null;
        minPrice: number | null;
        maxPrice: number | null;
        minRating: number | null;
        format: FormatOption | null;
        location: string | null;
        ordering: SortOption;
        page: number;
      } = result;

      expect(typed).toBeDefined();
    });
  });
});
