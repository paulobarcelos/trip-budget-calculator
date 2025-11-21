import { describe, expect, it } from 'vitest';
import { calculateDailyCost, generateDaysForDateRange, getDayCount } from '@/utils/tripStateUpdates';

describe('getDayCount', () => {
  it('returns exclusive day difference when end is after start', () => {
    expect(getDayCount('2024-01-01', '2024-01-05')).toBe(4);
  });

  it('clamps to zero when end is on or before start', () => {
    expect(getDayCount('2024-01-01', '2024-01-01')).toBe(0);
    expect(getDayCount('2024-01-02', '2024-01-01')).toBe(0);
  });

  it('returns zero for invalid dates', () => {
    expect(getDayCount('invalid', '2024-01-05')).toBe(0);
    expect(getDayCount('2024-01-01', 'invalid')).toBe(0);
  });
});

describe('calculateDailyCost', () => {
  it('spreads the total across the number of days', () => {
    expect(calculateDailyCost(100, '2024-01-01', '2024-01-05')).toBe(25);
  });

  it('falls back to total cost when day count is zero or negative', () => {
    expect(calculateDailyCost(100, '2024-01-01', '2024-01-01')).toBe(100);
    expect(calculateDailyCost(100, '2024-01-02', '2024-01-01')).toBe(100);
  });
});

describe('generateDaysForDateRange', () => {
  it('returns days for each date in the range (exclusive end)', () => {
    const days = generateDaysForDateRange('2024-01-01', '2024-01-04');
    expect(days).toEqual([
      { id: '2024-01-01', date: '2024-01-01' },
      { id: '2024-01-02', date: '2024-01-02' },
      { id: '2024-01-03', date: '2024-01-03' },
    ]);
  });

  it('returns an empty array when dates are invalid or range is zero/negative', () => {
    expect(generateDaysForDateRange('invalid', '2024-01-04')).toEqual([]);
    expect(generateDaysForDateRange('2024-01-01', 'invalid')).toEqual([]);
    expect(generateDaysForDateRange('2024-01-02', '2024-01-01')).toEqual([]);
    expect(generateDaysForDateRange('2024-01-01', '2024-01-01')).toEqual([]);
  });
});
