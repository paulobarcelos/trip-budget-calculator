export interface Traveler {
  id: string;
  name: string;
}

export interface BaseExpense {
  id: string;
  name: string;
  currency: string;
}

export type DailySharedSplitMode = "dailyOccupancy" | "stayWeighted";

export interface DailySharedExpense extends BaseExpense {
  totalCost: number;
  startDate: string;
  endDate: string;
  splitMode: DailySharedSplitMode;
}

export interface DailyPersonalExpense extends BaseExpense {
  dailyCost: number;
  startDate: string;
  endDate: string;
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
  version: TripStateVersion;
  travelers: Traveler[];
  dailySharedExpenses: DailySharedExpense[];
  dailyPersonalExpenses: DailyPersonalExpense[];
  oneTimeSharedExpenses: OneTimeSharedExpense[];
  oneTimePersonalExpenses: OneTimePersonalExpense[];
  days: Day[];
  usageCosts: UsageCosts;
  displayCurrency: string;
}

export const TripStateVersion = 3 as const;
export type TripStateVersion = typeof TripStateVersion;
