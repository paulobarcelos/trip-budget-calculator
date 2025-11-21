import { describe, expect, it } from 'vitest';
import { calculateDailySharedAllocations } from '@/utils/dailySharedSplit';
import { DailySharedExpense, UsageCosts } from '@/types';

const makeUsage = (entries: Record<string, string[]>): UsageCosts['days'] =>
  Object.fromEntries(
    Object.entries(entries).map(([dayId, travelerIds]) => [
      dayId,
      { dailyShared: { hotel: travelerIds }, dailyPersonal: {} },
    ]),
  );

const defaultExpense: DailySharedExpense = {
  id: 'hotel',
  name: 'Hotel',
  currency: 'USD',
  totalCost: 300,
  startDate: '2024-01-01',
  endDate: '2024-01-04',
  splitMode: 'dailyOccupancy',
};

const convertAmount = (amount: number, currency: string) => ({
  amount: currency === 'EUR' ? amount * 2 : amount,
  isApproximate: currency !== 'USD',
});

const calculateDailyCost = (
  totalCost: number,
  startDate: string,
  endDate: string,
  currency: string,
) => {
  const dayCount = 3; // fixed for the fixtures above
  return convertAmount(totalCost / dayCount, currency);
};

describe('calculateDailySharedAllocations', () => {
  it('splits by daily occupancy across days', () => {
    const usage = makeUsage({
      '2024-01-01': ['a', 'b'],
      '2024-01-02': ['a'],
      '2024-01-03': ['b'],
    });

    const allocations = calculateDailySharedAllocations(
      defaultExpense,
      usage,
      convertAmount,
      calculateDailyCost,
    );

    expect(allocations.get('a')).toEqual({ amount: 150, isApproximate: false });
    expect(allocations.get('b')).toEqual({ amount: 150, isApproximate: false });
  });

  it('splits by person-night when stayWeighted', () => {
    const expense = { ...defaultExpense, splitMode: 'stayWeighted' };
    const usage = makeUsage({
      '2024-01-01': ['a', 'b'],
      '2024-01-02': ['a'],
      '2024-01-03': ['a'],
    });

    const allocations = calculateDailySharedAllocations(
      expense,
      usage,
      convertAmount,
      calculateDailyCost,
    );

    // Nights: a=3, b=1 => per-night share = 300/4 = 75
    expect(allocations.get('a')).toEqual({ amount: 225, isApproximate: false });
    expect(allocations.get('b')).toEqual({ amount: 75, isApproximate: false });
  });

  it('returns empty map when no person-nights', () => {
    const expense = { ...defaultExpense, splitMode: 'stayWeighted' };
    const usage = makeUsage({
      '2024-01-01': [],
      '2024-01-02': [],
      '2024-01-03': [],
    });

    const allocations = calculateDailySharedAllocations(
      expense,
      usage,
      convertAmount,
      calculateDailyCost,
    );

    expect(allocations.size).toBe(0);
  });

  it('marks amounts approximate when converted currency used', () => {
    const expense: DailySharedExpense = {
      ...defaultExpense,
      currency: 'EUR',
      splitMode: 'dailyOccupancy',
    };
    const usage = makeUsage({ '2024-01-01': ['a', 'b'] });

    const allocations = calculateDailySharedAllocations(
      expense,
      usage,
      convertAmount,
      calculateDailyCost,
    );

    // total per-day cost = (300/3)*2 = 200, split between two travelers
    expect(allocations.get('a')).toEqual({ amount: 100, isApproximate: true });
    expect(allocations.get('b')).toEqual({ amount: 100, isApproximate: true });
  });
});
