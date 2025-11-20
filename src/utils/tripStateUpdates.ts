import { TripState, Day } from '@/types';

const DAY_IN_MS = 1000 * 60 * 60 * 24;

const parseDate = (value: string): Date | null => {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp);
};

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

export function updateTripDates(tripState: TripState, newStartDate: string, newEndDate: string): TripState {
  // Generate the new set of days
  const newDays = generateDaysForDateRange(newStartDate, newEndDate);
  const newDayIds = new Set(newDays.map(day => day.id));
  const existingDayIds = new Set(tripState.days.map(day => day.id));
  
  // Keep track of which days are removed
  const removedDayIds = [...existingDayIds].filter(id => !newDayIds.has(id));
  
  // Update usageCosts by removing entries for deleted days
  const updatedDailyUsageCosts = { ...tripState.usageCosts.days };
  removedDayIds.forEach(dayId => {
    delete updatedDailyUsageCosts[dayId];
  });
  
  // Preserve existing days that are still valid and add new ones
  const updatedDays = newDays.map(newDay => {
    const existingDay = tripState.days.find(day => day.id === newDay.id);
    return existingDay || newDay;
  });

  // Update daily shared expenses to be within trip dates
  const updatedDailySharedExpenses = tripState.dailySharedExpenses.map(expense => ({
    ...expense,
    startDate: expense.startDate < newStartDate ? newStartDate : expense.startDate,
    endDate: expense.endDate > newEndDate ? newEndDate : expense.endDate,
  }));

  // Update travelers' dates to be within trip dates
  const updatedTravelers = tripState.travelers.map(traveler => ({
    ...traveler,
    startDate: traveler.startDate < newStartDate ? newStartDate : traveler.startDate,
    endDate: traveler.endDate > newEndDate ? newEndDate : traveler.endDate,
  }));
  
  return {
    ...tripState,
    startDate: newStartDate,
    endDate: newEndDate,
    days: updatedDays,
    travelers: updatedTravelers,
    dailySharedExpenses: updatedDailySharedExpenses,
    usageCosts: {
      ...tripState.usageCosts,
      days: updatedDailyUsageCosts,
    },
  };
}

export function updateTravelerDates(
  tripState: TripState, 
  travelerId: string, 
  newStartDate: string | null, 
  newEndDate: string | null
): TripState {
  const updatedTravelers = tripState.travelers.map(traveler => {
    if (traveler.id === travelerId) {
      return {
        ...traveler,
        startDate: newStartDate || traveler.startDate,
        endDate: newEndDate || traveler.endDate,
      };
    }
    return traveler;
  });

  // Clean up usage costs for days where the traveler is no longer present
  const updatedDailyUsageCosts = { ...tripState.usageCosts.days };
  
  Object.entries(updatedDailyUsageCosts).forEach(([dayId, dayUsage]) => {
    const dayDate = dayId; // Since we use the date as ID
    const traveler = updatedTravelers.find(t => t.id === travelerId);
    
    if (!traveler) return;
    
    const isDateInRange = dayDate >= traveler.startDate && dayDate < traveler.endDate;
    
    if (!isDateInRange) {
      // Remove traveler from daily shared expenses for this day
      Object.entries(dayUsage.dailyShared).forEach(([expenseId, travelerIds]) => {
        dayUsage.dailyShared[expenseId] = travelerIds.filter(id => id !== travelerId);
      });
      
      // Remove traveler from daily personal expenses for this day
      Object.entries(dayUsage.dailyPersonal).forEach(([expenseId, travelerIds]) => {
        dayUsage.dailyPersonal[expenseId] = travelerIds.filter(id => id !== travelerId);
      });
    }
  });

  // Clean up one-time expenses
  const updatedOneTimeShared = { ...tripState.usageCosts.oneTimeShared };
  const updatedOneTimePersonal = { ...tripState.usageCosts.oneTimePersonal };
  
  Object.entries(updatedOneTimeShared).forEach(([expenseId, travelerIds]) => {
    updatedOneTimeShared[expenseId] = travelerIds.filter(id => id !== travelerId);
  });
  
  Object.entries(updatedOneTimePersonal).forEach(([expenseId, travelerIds]) => {
    updatedOneTimePersonal[expenseId] = travelerIds.filter(id => id !== travelerId);
  });

  return {
    ...tripState,
    travelers: updatedTravelers,
    usageCosts: {
      ...tripState.usageCosts,
      days: updatedDailyUsageCosts,
      oneTimeShared: updatedOneTimeShared,
      oneTimePersonal: updatedOneTimePersonal,
    },
  };
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
