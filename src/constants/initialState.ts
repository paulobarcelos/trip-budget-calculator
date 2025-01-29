import { TripState, DailyExpenses } from '@/types';

export const initialTripState: TripState = {
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
}; 