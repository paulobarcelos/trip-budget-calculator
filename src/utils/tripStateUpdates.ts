import { TripState, Day } from '@/types';

function getDayId(date: string): string {
  return date;
}

function generateDaysForDateRange(startDate: string, endDate: string): Day[] {
  const days: Day[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dateStr = date.toISOString().split('T')[0];
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
  
  return {
    ...tripState,
    startDate: newStartDate,
    endDate: newEndDate,
    days: updatedDays,
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
    
    const isDateInRange = dayDate >= (newStartDate || traveler.startDate) && 
                         dayDate <= (newEndDate || traveler.endDate);
    
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
  const updatedTripState = { ...tripState };
  
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
      delete updatedTripState.usageCosts.oneTimeShared[expenseId];
      break;
    case 'oneTimePersonal':
      updatedTripState.oneTimePersonalExpenses = tripState.oneTimePersonalExpenses.filter(e => e.id !== expenseId);
      delete updatedTripState.usageCosts.oneTimePersonal[expenseId];
      break;
  }
  
  // Clean up usage costs for daily expenses
  if (expenseType === 'dailyShared' || expenseType === 'dailyPersonal') {
    const updatedDailyUsageCosts = { ...tripState.usageCosts.days };
    Object.keys(updatedDailyUsageCosts).forEach(dayId => {
      const dayUsage = updatedDailyUsageCosts[dayId];
      if (expenseType === 'dailyShared') {
        delete dayUsage.dailyShared[expenseId];
      } else {
        delete dayUsage.dailyPersonal[expenseId];
      }
    });
    
    updatedTripState.usageCosts.days = updatedDailyUsageCosts;
  }
  
  return updatedTripState;
} 