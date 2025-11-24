import { TripState, Day, Traveler } from '@/types';

const DAY_IN_MS = 1000 * 60 * 60 * 24;

const parseDate = (value: string): Date | null => {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp);
};

export function sortTravelers(travelers: Traveler[]): Traveler[] {
  return [...travelers].sort((a, b) => a.name.localeCompare(b.name, undefined, {
    sensitivity: 'base',
  }));
}

export function getDayCount(startDate: string, endDate: string): number {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end) return 0;
  const diff = end.getTime() - start.getTime();
  if (diff <= 0) return 0;
  return Math.floor(diff / DAY_IN_MS);
}

export function calculateDailyCost(totalCost: number, startDate: string, endDate: string): number {
  const dayCount = getDayCount(startDate, endDate);
  if (dayCount <= 0) {
    return totalCost;
  }
  return totalCost / dayCount;
}

function getDayId(date: string): string {
  return date;
}

export function generateDaysForDateRange(startDate: string, endDate: string): Day[] {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end) {
    return [];
  }

  const dayCount = getDayCount(startDate, endDate);
  if (dayCount <= 0) {
    return [];
  }

  const days: Day[] = [];
  for (let offset = 0; offset < dayCount; offset += 1) {
    const current = new Date(start);
    current.setUTCDate(current.getUTCDate() + offset);
    const dateStr = current.toISOString().split('T')[0];
    days.push({
      id: getDayId(dateStr),
      date: dateStr,
    });
  }

  return days;
}



export function removeExpense(
  tripState: TripState,
  expenseId: string,
  expenseType: 'dailyShared' | 'dailyPersonal' | 'oneTimeShared' | 'oneTimePersonal'
): TripState {
  const updatedTripState: TripState = {
    ...tripState,
    usageCosts: {
      ...tripState.usageCosts,
      days: { ...tripState.usageCosts.days },
      oneTimeShared: { ...tripState.usageCosts.oneTimeShared },
      oneTimePersonal: { ...tripState.usageCosts.oneTimePersonal },
    },
  };

  // Remove the expense from the appropriate list
  switch (expenseType) {
    case 'dailyShared':
      updatedTripState.dailySharedExpenses = tripState.dailySharedExpenses.filter(e => e.id !== expenseId);
      break;
    case 'dailyPersonal':
      updatedTripState.dailyPersonalExpenses = tripState.dailyPersonalExpenses.filter(e => e.id !== expenseId);
      break;
    case 'oneTimeShared':
      updatedTripState.oneTimeSharedExpenses = tripState.oneTimeSharedExpenses.filter(e => e.id !== expenseId);
      if (updatedTripState.usageCosts.oneTimeShared[expenseId]) {
        delete updatedTripState.usageCosts.oneTimeShared[expenseId];
      }
      break;
    case 'oneTimePersonal':
      updatedTripState.oneTimePersonalExpenses = tripState.oneTimePersonalExpenses.filter(e => e.id !== expenseId);
      if (updatedTripState.usageCosts.oneTimePersonal[expenseId]) {
        delete updatedTripState.usageCosts.oneTimePersonal[expenseId];
      }
      break;
  }

  // Clean up usage costs for daily expenses
  if (expenseType === 'dailyShared' || expenseType === 'dailyPersonal') {
    const updatedDailyUsageCosts = { ...updatedTripState.usageCosts.days };
    Object.entries(updatedDailyUsageCosts).forEach(([dayId, dayUsage]) => {
      const nextDayUsage = {
        dailyShared: { ...dayUsage.dailyShared },
        dailyPersonal: { ...dayUsage.dailyPersonal },
      };
      if (expenseType === 'dailyShared') {
        delete nextDayUsage.dailyShared[expenseId];
      } else {
        delete nextDayUsage.dailyPersonal[expenseId];
      }
      updatedDailyUsageCosts[dayId] = nextDayUsage;
    });

    updatedTripState.usageCosts.days = updatedDailyUsageCosts;
  }

  return updatedTripState;
} 
