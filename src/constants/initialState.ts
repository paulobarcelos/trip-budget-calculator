import { TripState, DailyExpenses, TripStateVersion } from '@/types';

export const initialTripState: TripState = {
  version: TripStateVersion,
  travelers: [],
  dailySharedExpenses: [],
  dailyPersonalExpenses: [],
  oneTimeSharedExpenses: [],
  oneTimePersonalExpenses: [],
  days: [],
  usageCosts: {
    oneTimeShared: {} as Record<string, string[]>,
    oneTimePersonal: {} as Record<string, string[]>,
    days: {} as Record<string, DailyExpenses>,
  },
  startDate: '',
  endDate: '',
  displayCurrency: 'USD',
};
