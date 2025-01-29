export interface Traveler {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface BaseExpense {
  id: string;
  name: string;
  currency: string;
}

export interface DailySharedExpense extends BaseExpense {
  totalCost: number;
  startDate: string;
  endDate: string;
}

export interface DailyPersonalExpense extends BaseExpense {
  dailyCost: number;
}

export interface OneTimeSharedExpense extends BaseExpense {
  totalCost: number;
}

export interface OneTimePersonalExpense extends BaseExpense {
  totalCost: number;
}

export interface Day {
  id: string;
  date: string;
}

export interface DailyExpenses {
  dailyShared: Record<string, string[]>; // expense ID -> traveler IDs
  dailyPersonal: Record<string, string[]>;
}

export interface UsageCosts {
  oneTimeShared: Record<string, string[]>; // expense ID -> traveler IDs
  oneTimePersonal: Record<string, string[]>;
  days: Record<string, DailyExpenses>; // day ID -> daily expenses
}

export interface TripState {
  travelers: Traveler[];
  dailySharedExpenses: DailySharedExpense[];
  dailyPersonalExpenses: DailyPersonalExpense[];
  oneTimeSharedExpenses: OneTimeSharedExpense[];
  oneTimePersonalExpenses: OneTimePersonalExpense[];
  days: Day[];
  usageCosts: UsageCosts;
  startDate: string;
  endDate: string;
  baseCurrency: string;
} 