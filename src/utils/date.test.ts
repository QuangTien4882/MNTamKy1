import { describe, it, expect } from 'vitest';
import { formatDate, getInitialLunchDate, getBreakfastDateFrom } from './date';

describe('formatDate', () => {
  it('formats a date as YYYY-MM-DD with zero padding', () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(formatDate(new Date(2026, 8, 7))).toBe('2026-09-07');
  });
});

describe('getBreakfastDateFrom', () => {
  it('returns the next day', () => {
    expect(getBreakfastDateFrom('2026-09-07')).toBe('2026-09-08');
  });

  it('skips Sunday when the next day is a Sunday', () => {
    // 2026-09-05 is a Saturday, so next day (Sunday 09-06) is skipped to Monday.
    expect(getBreakfastDateFrom('2026-09-05')).toBe('2026-09-07');
  });

  it('returns empty string for empty input', () => {
    expect(getBreakfastDateFrom('')).toBe('');
  });
});

describe('getInitialLunchDate', () => {
  it('returns today (not a Sunday) as YYYY-MM-DD', () => {
    const today = new Date();
    if (today.getDay() !== 0) {
      expect(getInitialLunchDate()).toBe(formatDate(today));
    }
  });
});