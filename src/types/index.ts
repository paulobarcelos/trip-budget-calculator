export interface Traveler {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface BaseExpense {
  id: string;
  name: string;
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
  date: string;
  travelers: string[]; // traveler IDs
  expenses: {
    dailyShared: Record<string, string[]>; // expense ID -> traveler IDs
    dailyPersonal: Record<string, string[]>;
  };
}

export interface UsageCosts {
  oneTimeShared: Record<string, string[]>; // expense ID -> traveler IDs
  oneTimePersonal: Record<string, string[]>;
}

export interface TripState {
  travelers: Traveler[];
  dailySharedExpenses: DailySharedExpense[];
  dailyPersonalExpenses: DailyPersonalExpense[];
  oneTimeSharedExpenses: OneTimeSharedExpense[];
  oneTimePersonalExpenses: OneTimePersonalExpense[];
  days: Day[];
  usageCosts: UsageCosts;
  baseCurrency: string;
  startDate: string;
  endDate: string;
} 