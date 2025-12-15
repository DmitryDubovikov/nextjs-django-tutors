import { describe, expect, it } from 'vitest';

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

describe('bookings page utilities', () => {
  describe('formatDateTime', () => {
    it('formats date with weekday, month, and day', () => {
      const result = formatDateTime('2024-12-15T14:30:00Z');

      expect(result.date).toMatch(/\w{3}, \w{3} \d{1,2}/);
    });

    it('formats time with hour and minute', () => {
      const result = formatDateTime('2024-12-15T14:30:00Z');

      expect(result.time).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
    });

    it('returns object with date and time properties', () => {
      const result = formatDateTime('2024-12-15T14:30:00Z');

      expect(result).toHaveProperty('date');
      expect(result).toHaveProperty('time');
    });

    it('handles morning times correctly', () => {
      const result = formatDateTime('2024-12-15T09:00:00Z');

      expect(result.time).toContain('AM');
    });

    it('handles afternoon times correctly', () => {
      const result = formatDateTime('2024-12-15T15:00:00Z');

      expect(result.time).toContain('PM');
    });

    it('handles midnight correctly', () => {
      const result = formatDateTime('2024-12-15T00:00:00Z');

      expect(result.time).toMatch(/12:00 AM/);
    });

    it('handles noon correctly', () => {
      const result = formatDateTime('2024-12-15T12:00:00Z');

      expect(result.time).toMatch(/12:00 PM/);
    });

    it('formats different date formats correctly', () => {
      const result1 = formatDateTime('2024-12-15T14:30:00Z');
      expect(result1.date).toBeTruthy();
      expect(result1.time).toBeTruthy();

      const result2 = formatDateTime('2024-12-15T14:30:00');
      expect(result2.date).toBeTruthy();
      expect(result2.time).toBeTruthy();
    });

    it('handles single-digit hours without leading zero', () => {
      const result = formatDateTime('2024-12-15T09:05:00Z');

      expect(result.time).toMatch(/^\d{1,2}:\d{2}/);
    });

    it('handles dates in different months', () => {
      const jan = formatDateTime('2024-01-15T12:00:00Z');
      const dec = formatDateTime('2024-12-15T12:00:00Z');

      expect(jan.date).toContain('Jan');
      expect(dec.date).toContain('Dec');
    });

    it('handles dates in different years consistently', () => {
      const result2024 = formatDateTime('2024-12-15T12:00:00Z');
      const result2025 = formatDateTime('2025-12-15T12:00:00Z');

      expect(result2024.date).toBeTruthy();
      expect(result2025.date).toBeTruthy();
    });

    it('handles leap year dates', () => {
      const leapDay = formatDateTime('2024-02-29T12:00:00Z');

      expect(leapDay.date).toContain('Feb');
      expect(leapDay.date).toContain('29');
    });
  });

  describe('formatPrice', () => {
    it('formats number as USD currency', () => {
      const result = formatPrice(50);

      expect(result).toBe('$50');
    });

    it('formats string number as currency', () => {
      const result = formatPrice('75.50');

      expect(result).toBe('$76');
    });

    it('removes decimal places', () => {
      const result = formatPrice(49.99);

      expect(result).toBe('$50');
    });

    it('formats large numbers with commas', () => {
      const result = formatPrice(1500);

      expect(result).toBe('$1,500');
    });

    it('handles zero correctly', () => {
      const result = formatPrice(0);

      expect(result).toBe('$0');
    });

    it('handles very large numbers', () => {
      const result = formatPrice(999999);

      expect(result).toBe('$999,999');
    });

    it('rounds decimal values to nearest integer', () => {
      expect(formatPrice(49.4)).toBe('$49');
      expect(formatPrice(49.5)).toBe('$50');
      expect(formatPrice(49.6)).toBe('$50');
    });

    it('formats negative numbers with minus sign', () => {
      const result = formatPrice(-50);

      expect(result).toBe('-$50');
    });

    it('handles decimal string inputs', () => {
      const result = formatPrice('123.45');

      expect(result).toBe('$123');
    });

    it('handles string with many decimal places', () => {
      const result = formatPrice('99.999');

      expect(result).toBe('$100');
    });

    it('includes dollar sign', () => {
      const result = formatPrice(100);

      expect(result).toContain('$');
    });

    it('formats cents correctly', () => {
      const result = formatPrice(0.99);

      expect(result).toBe('$1');
    });

    it('handles numeric strings with whitespace', () => {
      const result = formatPrice(' 50 ');

      expect(result).toBe('$50');
    });
  });

  describe('edge cases', () => {
    describe('formatDateTime edge cases', () => {
      it('handles invalid date strings gracefully', () => {
        const result = formatDateTime('invalid-date');

        expect(result.date).toContain('Invalid');
      });

      it('handles empty string', () => {
        const result = formatDateTime('');

        expect(result.date).toContain('Invalid');
      });

      it('handles very old dates', () => {
        const result = formatDateTime('1900-01-01T00:00:00Z');

        expect(result.date).toBeTruthy();
        expect(result.time).toBeTruthy();
      });

      it('handles far future dates', () => {
        const result = formatDateTime('2099-12-31T23:59:59Z');

        expect(result.date).toBeTruthy();
        expect(result.time).toBeTruthy();
      });
    });

    describe('formatPrice edge cases', () => {
      it('handles NaN input', () => {
        const result = formatPrice(Number.NaN);

        expect(result).toBe('$NaN');
      });

      it('handles Infinity', () => {
        const result = formatPrice(Number.POSITIVE_INFINITY);

        expect(result).toContain('$');
      });

      it('handles very small decimal numbers', () => {
        const result = formatPrice(0.01);

        expect(result).toBe('$0');
      });

      it('handles non-numeric string gracefully', () => {
        const result = formatPrice('not-a-number');

        expect(result).toBe('$NaN');
      });
    });
  });

  describe('type handling', () => {
    it('formatPrice accepts number type', () => {
      const num: number = 100;
      const result = formatPrice(num);

      expect(result).toBe('$100');
    });

    it('formatPrice accepts string type', () => {
      const str: string = '100';
      const result = formatPrice(str);

      expect(result).toBe('$100');
    });

    it('formatDateTime returns consistent structure', () => {
      const result = formatDateTime('2024-12-15T12:00:00Z');

      const typed: { date: string; time: string } = result;
      expect(typed.date).toBeDefined();
      expect(typed.time).toBeDefined();
    });
  });

  describe('locale consistency', () => {
    it('formatDateTime uses en-US locale consistently', () => {
      const result = formatDateTime('2024-12-15T14:30:00Z');

      expect(result.date).toMatch(/\w{3}, \w{3} \d{1,2}/);
      expect(result.time).toMatch(/(AM|PM)/);
    });

    it('formatPrice uses en-US currency format', () => {
      const result = formatPrice(1234.56);

      expect(result).toBe('$1,235');
      expect(result).toMatch(/^\$/);
    });
  });

  describe('real-world scenarios', () => {
    it('formats typical booking datetime correctly', () => {
      const result = formatDateTime('2025-01-15T15:00:00Z');

      expect(result.date).toContain('Jan');
      expect(result.date).toContain('15');
      expect(result.time).toContain('PM');
    });

    it('formats typical lesson price correctly', () => {
      expect(formatPrice(50)).toBe('$50');
      expect(formatPrice(75)).toBe('$75');
      expect(formatPrice(100)).toBe('$100');
    });

    it('handles early morning lessons', () => {
      const result = formatDateTime('2024-12-15T07:30:00Z');

      expect(result.time).toContain('AM');
    });

    it('handles evening lessons', () => {
      const result = formatDateTime('2024-12-15T19:00:00Z');

      expect(result.time).toContain('PM');
    });

    it('formats fractional hour pricing correctly', () => {
      expect(formatPrice(90)).toBe('$90');
      expect(formatPrice(45)).toBe('$45');
    });
  });
});
