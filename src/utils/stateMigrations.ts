import { initialTripState } from '@/constants/initialState';
import {
  DailyExpenses,
  DailyPersonalExpense,
  DailySharedExpense,
  Day,
  OneTimePersonalExpense,
  OneTimeSharedExpense,
  TripState,
  TripStateVersion,
  Traveler,
  UsageCosts,
} from '@/types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toString = (value: unknown): string | null => (typeof value === 'string' ? value : null);

const toNumber = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];

const sanitizeTravelers = (value: unknown): Traveler[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((traveler) => {
      if (!isRecord(traveler)) return null;
      const id = toString(traveler.id);
      const name = toString(traveler.name);
      const startDate = toString(traveler.startDate);
      const endDate = toString(traveler.endDate);
      if (!id || !name || !startDate || !endDate) return null;
      return { id, name, startDate, endDate };
    })
    .filter((traveler): traveler is Traveler => traveler !== null);
};

const sanitizeDailySharedExpenses = (value: unknown): DailySharedExpense[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((expense) => {
      if (!isRecord(expense)) return null;
      const id = toString(expense.id);
      const name = toString(expense.name);
      const currency = toString(expense.currency);
      const totalCost = toNumber(expense.totalCost);
      const startDate = toString(expense.startDate);
      const endDate = toString(expense.endDate);
      const splitMode =
        expense.splitMode === "stayWeighted"
          ? "stayWeighted"
          : "dailyOccupancy";
      if (!id || !name || !currency || totalCost === null || !startDate || !endDate) return null;
      return { id, name, currency, totalCost, startDate, endDate, splitMode };
    })
    .filter((expense): expense is DailySharedExpense => expense !== null);
};

const sanitizeDailyPersonalExpenses = (value: unknown): DailyPersonalExpense[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((expense) => {
      if (!isRecord(expense)) return null;
      const id = toString(expense.id);
      const name = toString(expense.name);
      const currency = toString(expense.currency);
      const dailyCost = toNumber(expense.dailyCost);
      if (!id || !name || !currency || dailyCost === null) return null;
      return { id, name, currency, dailyCost };
    })
    .filter((expense): expense is DailyPersonalExpense => expense !== null);
};

const sanitizeOneTimeSharedExpenses = (value: unknown): OneTimeSharedExpense[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((expense) => {
      if (!isRecord(expense)) return null;
      const id = toString(expense.id);
      const name = toString(expense.name);
      const currency = toString(expense.currency);
      const totalCost = toNumber(expense.totalCost);
      if (!id || !name || !currency || totalCost === null) return null;
      return { id, name, currency, totalCost };
    })
    .filter((expense): expense is OneTimeSharedExpense => expense !== null);
};

const sanitizeOneTimePersonalExpenses = (value: unknown): OneTimePersonalExpense[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((expense) => {
      if (!isRecord(expense)) return null;
      const id = toString(expense.id);
      const name = toString(expense.name);
      const currency = toString(expense.currency);
      const totalCost = toNumber(expense.totalCost);
      if (!id || !name || !currency || totalCost === null) return null;
      return { id, name, currency, totalCost };
    })
    .filter((expense): expense is OneTimePersonalExpense => expense !== null);
};

const sanitizeDays = (value: unknown): Day[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((day) => {
      if (!isRecord(day)) return null;
      const id = toString(day.id);
      const date = toString(day.date);
      if (!id || !date) return null;
      return { id, date };
    })
    .filter((day): day is Day => day !== null);
};

const sanitizeDailyExpensesRecord = (value: unknown): DailyExpenses => {
  const dailyShared: Record<string, string[]> = {};
  const dailyPersonal: Record<string, string[]> = {};

  if (isRecord(value)) {
    if (isRecord(value.dailyShared)) {
      Object.entries(value.dailyShared).forEach(([expenseId, travelers]) => {
        const ids = toStringArray(travelers);
        if (ids.length) dailyShared[expenseId] = ids;
      });
    }
    if (isRecord(value.dailyPersonal)) {
      Object.entries(value.dailyPersonal).forEach(([expenseId, travelers]) => {
        const ids = toStringArray(travelers);
        if (ids.length) dailyPersonal[expenseId] = ids;
      });
    }
  }

  return { dailyShared, dailyPersonal };
};

const sanitizeUsageCosts = (value: unknown): UsageCosts => {
  const base: UsageCosts = {
    oneTimeShared: {},
    oneTimePersonal: {},
    days: {},
  };

  if (!isRecord(value)) return base;

  if (isRecord(value.oneTimeShared)) {
    Object.entries(value.oneTimeShared).forEach(([expenseId, travelers]) => {
      const ids = toStringArray(travelers);
      if (ids.length) base.oneTimeShared[expenseId] = ids;
    });
  }

  if (isRecord(value.oneTimePersonal)) {
    Object.entries(value.oneTimePersonal).forEach(([expenseId, travelers]) => {
      const ids = toStringArray(travelers);
      if (ids.length) base.oneTimePersonal[expenseId] = ids;
    });
  }

  if (isRecord(value.days)) {
    Object.entries(value.days).forEach(([dayId, daily]) => {
      const sanitized = sanitizeDailyExpensesRecord(daily);
      if (
        Object.keys(sanitized.dailyShared).length > 0 ||
        Object.keys(sanitized.dailyPersonal).length > 0
      ) {
        base.days[dayId] = sanitized;
      }
    });
  }

  return base;
};

const pruneUsageToTravelers = (
  usage: UsageCosts,
  validTravelerIds: Set<string>,
): UsageCosts => {
  const oneTimeShared: Record<string, string[]> = {};
  const oneTimePersonal: Record<string, string[]> = {};
  const days: Record<string, DailyExpenses> = {};

  Object.entries(usage.oneTimeShared).forEach(([expenseId, ids]) => {
    const filtered = ids.filter((id) => validTravelerIds.has(id));
    if (filtered.length) oneTimeShared[expenseId] = filtered;
  });

  Object.entries(usage.oneTimePersonal).forEach(([expenseId, ids]) => {
    const filtered = ids.filter((id) => validTravelerIds.has(id));
    if (filtered.length) oneTimePersonal[expenseId] = filtered;
  });

  Object.entries(usage.days).forEach(([dayId, daily]) => {
    const dailyShared: Record<string, string[]> = {};
    const dailyPersonal: Record<string, string[]> = {};

    Object.entries(daily.dailyShared).forEach(([expenseId, ids]) => {
      const filtered = ids.filter((id) => validTravelerIds.has(id));
      if (filtered.length) dailyShared[expenseId] = filtered;
    });

    Object.entries(daily.dailyPersonal).forEach(([expenseId, ids]) => {
      const filtered = ids.filter((id) => validTravelerIds.has(id));
      if (filtered.length) dailyPersonal[expenseId] = filtered;
    });

    days[dayId] = { dailyShared, dailyPersonal };
  });

  return { oneTimeShared, oneTimePersonal, days };
};

export function migrateState(raw: unknown): TripState {
  const base: TripState = {
    ...initialTripState,
    travelers: [],
    dailySharedExpenses: [],
    dailyPersonalExpenses: [],
    oneTimeSharedExpenses: [],
    oneTimePersonalExpenses: [],
    days: [],
    usageCosts: {
      oneTimeShared: {},
      oneTimePersonal: {},
      days: {},
    },
  };

  if (!isRecord(raw)) {
    return { ...base, version: TripStateVersion };
  }

  const version = toNumber(raw.version);
  const startDate = toString(raw.startDate);
  const endDate = toString(raw.endDate);
  const displayCurrency = toString(raw.displayCurrency);

  const migrated: TripState = {
    ...base,
    version: TripStateVersion,
    startDate: startDate ?? base.startDate,
    endDate: endDate ?? base.endDate,
    travelers: sanitizeTravelers(raw.travelers),
    dailySharedExpenses: sanitizeDailySharedExpenses(raw.dailySharedExpenses),
    dailyPersonalExpenses: sanitizeDailyPersonalExpenses(raw.dailyPersonalExpenses),
    oneTimeSharedExpenses: sanitizeOneTimeSharedExpenses(raw.oneTimeSharedExpenses),
    oneTimePersonalExpenses: sanitizeOneTimePersonalExpenses(raw.oneTimePersonalExpenses),
    days: sanitizeDays(raw.days),
    usageCosts: sanitizeUsageCosts(raw.usageCosts),
    displayCurrency: displayCurrency ?? base.displayCurrency,
  };

  const travelerIds = new Set(migrated.travelers.map((t) => t.id));
  migrated.usageCosts = pruneUsageToTravelers(migrated.usageCosts, travelerIds);

  // Future migrations would be chained here based on migrated.version.
  migrated.version = TripStateVersion;

  return migrated;
}
