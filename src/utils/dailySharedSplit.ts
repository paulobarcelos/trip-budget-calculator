import { DailySharedExpense, UsageCosts } from '@/types';

export type CurrencyTotalLike = { amount: number; isApproximate: boolean };

const defaultCreateTotal = (): CurrencyTotalLike => ({ amount: 0, isApproximate: false });

const addAmount = (target: CurrencyTotalLike, amount: number, isApproximate: boolean) => {
  target.amount += amount;
  target.isApproximate = target.isApproximate || isApproximate;
};

export function calculateDailySharedAllocations(
  expense: DailySharedExpense,
  usageByDay: UsageCosts['days'],
  convertAmount: (amount: number, currency: string) => CurrencyTotalLike,
  calculateDailyCost: (
    totalCost: number,
    startDate: string,
    endDate: string,
    currency: string,
  ) => CurrencyTotalLike,
  createTotal: () => CurrencyTotalLike = defaultCreateTotal,
): Map<string, CurrencyTotalLike> {
  const allocations = new Map<string, CurrencyTotalLike>();

  const ensureTraveler = (travelerId: string) => {
    if (!allocations.has(travelerId)) {
      allocations.set(travelerId, createTotal());
    }
    return allocations.get(travelerId)!;
  };

  const isPersonNight = expense.splitMode === 'stayWeighted';

  if (isPersonNight) {
    const nights = new Map<string, number>();

    Object.entries(usageByDay).forEach(([dayId, dailyExpenses]) => {
      if (dayId < expense.startDate || dayId >= expense.endDate) return;
      const travelerIds = dailyExpenses.dailyShared[expense.id] ?? [];
      travelerIds.forEach((travelerId) => {
        nights.set(travelerId, (nights.get(travelerId) ?? 0) + 1);
      });
    });

    const totalNights = Array.from(nights.values()).reduce((sum, n) => sum + n, 0);
    if (totalNights === 0) return allocations;

    const convertedTotal = convertAmount(expense.totalCost, expense.currency);
    const perNight = convertedTotal.amount / totalNights;

    nights.forEach((count, travelerId) => {
      const target = ensureTraveler(travelerId);
      addAmount(target, perNight * count, convertedTotal.isApproximate);
    });

    return allocations;
  }

  const dailyCost = calculateDailyCost(
    expense.totalCost,
    expense.startDate,
    expense.endDate,
    expense.currency,
  );

  Object.entries(usageByDay).forEach(([dayId, dailyExpenses]) => {
    if (dayId < expense.startDate || dayId >= expense.endDate) return;
    const travelerIds = dailyExpenses.dailyShared[expense.id] ?? [];
    if (travelerIds.length === 0) return;

    const costPerPerson = dailyCost.amount / travelerIds.length;
    travelerIds.forEach((travelerId) => {
      const target = ensureTraveler(travelerId);
      addAmount(target, costPerPerson, dailyCost.isApproximate);
    });
  });

  return allocations;
}
