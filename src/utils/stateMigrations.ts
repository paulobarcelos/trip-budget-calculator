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
      if (!id || !name) return null;
      return { id, name };
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

const sanitizeDailyPersonalExpenses = (
  value: unknown,
  defaultStartDate: string,
  defaultEndDate: string,
): DailyPersonalExpense[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((expense) => {
      if (!isRecord(expense)) return null;
      const id = toString(expense.id);
      const name = toString(expense.name);
      const currency = toString(expense.currency);
      const dailyCost = toNumber(expense.dailyCost);
      const startDate = toString(expense.startDate) ?? defaultStartDate;
      const endDate = toString(expense.endDate) ?? defaultEndDate;

      if (!id || !name || !currency || dailyCost === null || !startDate || !endDate)
        return null;
      return { id, name, currency, dailyCost, startDate, endDate };
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
  const displayCurrency = toString(raw.displayCurrency);

  // For migration from v2 to v3, we might need to preserve dates for expenses if they exist
  // but we no longer need trip level dates.
  // However, sanitizeDailyPersonalExpenses still needs default dates if they are missing on the expense itself.
  // We can try to extract them from the raw state if available, or just use empty strings/defaults.
  // Since we are removing trip dates, we should probably just use what's on the expense or fallback.
  // But wait, in v2 expenses MIGHT NOT have dates if they were migrated from v1 and relied on trip dates?
  // Actually v2 added dates to DailyPersonalExpense. DailySharedExpense already had them.
  // So we should be fine using what's on the expense.
  // But sanitizeDailyPersonalExpenses signature requires defaults.
  // Let's grab them from raw if they exist, just in case.
  const rawStartDate = toString(raw.startDate) ?? "";
  const rawEndDate = toString(raw.endDate) ?? "";

  const migrated: TripState = {
    ...base,
    version: TripStateVersion,
    travelers: sanitizeTravelers(raw.travelers),
    dailySharedExpenses: sanitizeDailySharedExpenses(raw.dailySharedExpenses),
    dailyPersonalExpenses: sanitizeDailyPersonalExpenses(
      raw.dailyPersonalExpenses,
      rawStartDate,
      rawEndDate,
    ),
    oneTimeSharedExpenses: sanitizeOneTimeSharedExpenses(raw.oneTimeSharedExpenses),
    oneTimePersonalExpenses: sanitizeOneTimePersonalExpenses(
      raw.oneTimePersonalExpenses,
    ),
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
