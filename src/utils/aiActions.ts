import {
  DailySharedSplitMode,
  TripState,
  Traveler,
  DailySharedExpense,
  DailyPersonalExpense,
  OneTimeSharedExpense,
  OneTimePersonalExpense,
} from "@/types";
import { currencies } from "@/data/currencies";
import { removeExpense, sortTravelers } from "@/utils/tripStateUpdates";

export type ExpenseType =
  | "dailyShared"
  | "dailyPersonal"
  | "oneTimeShared"
  | "oneTimePersonal";

export type AiAction =
  | {
      type: "addTraveler";
      name: string;
    }
  | {
      type: "renameTraveler";
      travelerId?: string;
      travelerName?: string;
      newName: string;
    }
  | {
      type: "removeTraveler";
      travelerId?: string;
      travelerName?: string;
    }
  | {
      type: "addExpense";
      expenseType: ExpenseType;
      name: string;
      currency?: string;
      totalCost?: number;
      dailyCost?: number;
      startDate?: string;
      endDate?: string;
      splitMode?: DailySharedSplitMode;
    }
  | {
      type: "updateExpense";
      expenseType: ExpenseType;
      expenseId?: string;
      expenseName?: string;
      name?: string;
      currency?: string;
      totalCost?: number;
      dailyCost?: number;
      startDate?: string;
      endDate?: string;
      splitMode?: DailySharedSplitMode;
    }
  | {
      type: "removeExpense";
      expenseType: ExpenseType;
      expenseId?: string;
      expenseName?: string;
    }
  | {
      type: "setUsageDaily";
      expenseType: "dailyShared" | "dailyPersonal";
      date: string;
      expenseId?: string;
      expenseName?: string;
      travelerIds?: string[];
      travelerNames?: string[];
    }
  | {
      type: "setUsageOneTime";
      expenseType: "oneTimeShared" | "oneTimePersonal";
      expenseId?: string;
      expenseName?: string;
      travelerIds?: string[];
      travelerNames?: string[];
    };

export interface AiResponse {
  actions: AiAction[];
  explanation?: string;
  warnings?: string[];
}

export interface AiParseResult {
  response: AiResponse | null;
  errors: string[];
}

export interface ApplyResult {
  nextState: TripState;
  applied: AiAction[];
  errors: string[];
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SUPPORTED_CURRENCIES = new Set(currencies.map((currency) => currency.code));

const EXPENSE_TYPES: ExpenseType[] = [
  "dailyShared",
  "dailyPersonal",
  "oneTimeShared",
  "oneTimePersonal",
];

const SPLIT_MODES: DailySharedSplitMode[] = ["dailyOccupancy", "stayWeighted"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const isString = (value: unknown): value is string =>
  typeof value === "string";

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const normalizeCurrency = (code: string | undefined, fallback: string) => {
  if (!code) return fallback;
  const normalized = code.trim().toUpperCase();
  return SUPPORTED_CURRENCIES.has(normalized) ? normalized : fallback;
};

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
};

const normalizeName = (value: string) => value.trim().toLowerCase();

const resolveTraveler = (
  tripState: TripState,
  travelerId?: string,
  travelerName?: string,
) => {
  if (travelerId) {
    return tripState.travelers.find((traveler) => traveler.id === travelerId) ?? null;
  }
  if (travelerName) {
    const target = normalizeName(travelerName);
    const matches = tripState.travelers.filter(
      (traveler) => normalizeName(traveler.name) === target,
    );
    if (matches.length === 1) {
      return matches[0];
    }
  }
  return null;
};

const resolveExpense = (
  tripState: TripState,
  expenseType: ExpenseType,
  expenseId?: string,
  expenseName?: string,
) => {
  const list = getExpenseList(tripState, expenseType);
  if (expenseId) {
    return list.find((expense) => expense.id === expenseId) ?? null;
  }
  if (expenseName) {
    const target = normalizeName(expenseName);
    const matches = list.filter(
      (expense) => normalizeName(expense.name) === target,
    );
    if (matches.length === 1) {
      return matches[0];
    }
  }
  return null;
};

const getExpenseList = (tripState: TripState, expenseType: ExpenseType) => {
  switch (expenseType) {
    case "dailyShared":
      return tripState.dailySharedExpenses;
    case "dailyPersonal":
      return tripState.dailyPersonalExpenses;
    case "oneTimeShared":
      return tripState.oneTimeSharedExpenses;
    case "oneTimePersonal":
      return tripState.oneTimePersonalExpenses;
    default:
      return [];
  }
};

const isValidDate = (value: unknown): value is string =>
  isString(value) && DATE_PATTERN.test(value);

const isExpenseType = (value: string): value is ExpenseType =>
  EXPENSE_TYPES.includes(value as ExpenseType);

const isDailyExpenseType = (
  value: string,
): value is "dailyShared" | "dailyPersonal" =>
  value === "dailyShared" || value === "dailyPersonal";

const isOneTimeExpenseType = (
  value: string,
): value is "oneTimeShared" | "oneTimePersonal" =>
  value === "oneTimeShared" || value === "oneTimePersonal";

export const describeAction = (action: AiAction, tripState?: TripState) => {
  switch (action.type) {
    case "addTraveler":
      return `Add traveler: ${action.name}`;
    case "renameTraveler":
      return `Rename traveler: ${action.travelerName ?? action.travelerId ?? "Unknown"} → ${action.newName}`;
    case "removeTraveler":
      return `Remove traveler: ${action.travelerName ?? action.travelerId ?? "Unknown"}`;
    case "addExpense":
      return `Add ${action.expenseType} expense: ${action.name}`;
    case "updateExpense":
      return `Update ${action.expenseType} expense: ${action.expenseName ?? action.expenseId ?? "Unknown"}`;
    case "removeExpense":
      return `Remove ${action.expenseType} expense: ${action.expenseName ?? action.expenseId ?? "Unknown"}`;
    case "setUsageDaily": {
      const expense =
        tripState && resolveExpense(tripState, action.expenseType, action.expenseId, action.expenseName);
      return `Set ${action.expenseType} usage on ${action.date}: ${expense?.name ?? action.expenseName ?? action.expenseId ?? "Unknown"}`;
    }
    case "setUsageOneTime": {
      const expense =
        tripState && resolveExpense(tripState, action.expenseType, action.expenseId, action.expenseName);
      return `Set ${action.expenseType} usage: ${expense?.name ?? action.expenseName ?? action.expenseId ?? "Unknown"}`;
    }
    default:
      return "Unknown action";
  }
};

const parseAction = (value: unknown): AiAction | null => {
  if (!isRecord(value) || !isString(value.type)) {
    return null;
  }

  switch (value.type) {
    case "addTraveler": {
      if (!isString(value.name)) return null;
      return { type: "addTraveler", name: value.name };
    }
    case "renameTraveler": {
      if (!isString(value.newName)) return null;
      return {
        type: "renameTraveler",
        travelerId: isString(value.travelerId) ? value.travelerId : undefined,
        travelerName: isString(value.travelerName) ? value.travelerName : undefined,
        newName: value.newName,
      };
    }
    case "removeTraveler": {
      return {
        type: "removeTraveler",
        travelerId: isString(value.travelerId) ? value.travelerId : undefined,
        travelerName: isString(value.travelerName) ? value.travelerName : undefined,
      };
    }
    case "addExpense": {
      if (!isString(value.expenseType) || !isExpenseType(value.expenseType)) return null;
      if (!isString(value.name)) return null;
      const action: AiAction = {
        type: "addExpense",
        expenseType: value.expenseType,
        name: value.name,
        currency: isString(value.currency) ? value.currency : undefined,
        totalCost: isNumber(value.totalCost) ? value.totalCost : undefined,
        dailyCost: isNumber(value.dailyCost) ? value.dailyCost : undefined,
        startDate: isString(value.startDate) ? value.startDate : undefined,
        endDate: isString(value.endDate) ? value.endDate : undefined,
        splitMode:
          isString(value.splitMode) && SPLIT_MODES.includes(value.splitMode as DailySharedSplitMode)
            ? (value.splitMode as DailySharedSplitMode)
            : undefined,
      };
      return action;
    }
    case "updateExpense": {
      if (!isString(value.expenseType) || !isExpenseType(value.expenseType)) return null;
      const action: AiAction = {
        type: "updateExpense",
        expenseType: value.expenseType,
        expenseId: isString(value.expenseId) ? value.expenseId : undefined,
        expenseName: isString(value.expenseName) ? value.expenseName : undefined,
        name: isString(value.name) ? value.name : undefined,
        currency: isString(value.currency) ? value.currency : undefined,
        totalCost: isNumber(value.totalCost) ? value.totalCost : undefined,
        dailyCost: isNumber(value.dailyCost) ? value.dailyCost : undefined,
        startDate: isString(value.startDate) ? value.startDate : undefined,
        endDate: isString(value.endDate) ? value.endDate : undefined,
        splitMode:
          isString(value.splitMode) && SPLIT_MODES.includes(value.splitMode as DailySharedSplitMode)
            ? (value.splitMode as DailySharedSplitMode)
            : undefined,
      };
      return action;
    }
    case "removeExpense": {
      if (!isString(value.expenseType) || !isExpenseType(value.expenseType)) return null;
      return {
        type: "removeExpense",
        expenseType: value.expenseType,
        expenseId: isString(value.expenseId) ? value.expenseId : undefined,
        expenseName: isString(value.expenseName) ? value.expenseName : undefined,
      };
    }
    case "setUsageDaily": {
      if (!isString(value.expenseType) || !isDailyExpenseType(value.expenseType)) return null;
      if (!isString(value.date)) return null;
      return {
        type: "setUsageDaily",
        expenseType: value.expenseType,
        date: value.date,
        expenseId: isString(value.expenseId) ? value.expenseId : undefined,
        expenseName: isString(value.expenseName) ? value.expenseName : undefined,
        travelerIds: Array.isArray(value.travelerIds)
          ? value.travelerIds.filter(isString)
          : undefined,
        travelerNames: Array.isArray(value.travelerNames)
          ? value.travelerNames.filter(isString)
          : undefined,
      };
    }
    case "setUsageOneTime": {
      if (!isString(value.expenseType) || !isOneTimeExpenseType(value.expenseType)) return null;
      return {
        type: "setUsageOneTime",
        expenseType: value.expenseType,
        expenseId: isString(value.expenseId) ? value.expenseId : undefined,
        expenseName: isString(value.expenseName) ? value.expenseName : undefined,
        travelerIds: Array.isArray(value.travelerIds)
          ? value.travelerIds.filter(isString)
          : undefined,
        travelerNames: Array.isArray(value.travelerNames)
          ? value.travelerNames.filter(isString)
          : undefined,
      };
    }
    default:
      return null;
  }
};

export const parseAiResponse = (value: unknown): AiParseResult => {
  if (!isRecord(value)) {
    return { response: null, errors: ["Response is not an object."] };
  }

  const actionsRaw = value.actions;
  if (!Array.isArray(actionsRaw)) {
    return { response: null, errors: ["Response missing actions array."] };
  }

  const errors: string[] = [];
  const actions: AiAction[] = [];

  actionsRaw.forEach((action, index) => {
    const parsed = parseAction(action);
    if (!parsed) {
      errors.push(`Action ${index + 1} is invalid and was ignored.`);
      return;
    }
    actions.push(parsed);
  });

  if (actions.length === 0) {
    return { response: null, errors: errors.length ? errors : ["No valid actions found."] };
  }

  const explanation = isString(value.explanation) ? value.explanation : undefined;
  const warnings = Array.isArray(value.warnings)
    ? value.warnings.filter(isString)
    : undefined;

  return { response: { actions, explanation, warnings }, errors };
};

const removeTravelerFromUsage = (tripState: TripState, travelerId: string) => {
  const validTravelerIds = new Set(
    tripState.travelers.filter((traveler) => traveler.id !== travelerId).map((traveler) => traveler.id),
  );

  const cleanedDays = Object.fromEntries(
    Object.entries(tripState.usageCosts.days).map(([dayId, daily]) => {
      const dailyShared = Object.fromEntries(
        Object.entries(daily.dailyShared)
          .map(([expenseId, ids]) => [
            expenseId,
            ids.filter((id) => validTravelerIds.has(id)),
          ])
          .filter(([, ids]) => ids.length > 0),
      );

      const dailyPersonal = Object.fromEntries(
        Object.entries(daily.dailyPersonal)
          .map(([expenseId, ids]) => [
            expenseId,
            ids.filter((id) => validTravelerIds.has(id)),
          ])
          .filter(([, ids]) => ids.length > 0),
      );

      return [dayId, { dailyShared, dailyPersonal }];
    }),
  );

  const cleanedOneTimeShared = Object.fromEntries(
    Object.entries(tripState.usageCosts.oneTimeShared)
      .map(([expenseId, ids]) => [
        expenseId,
        ids.filter((id) => validTravelerIds.has(id)),
      ])
      .filter(([, ids]) => ids.length > 0),
  );

  const cleanedOneTimePersonal = Object.fromEntries(
    Object.entries(tripState.usageCosts.oneTimePersonal)
      .map(([expenseId, ids]) => [
        expenseId,
        ids.filter((id) => validTravelerIds.has(id)),
      ])
      .filter(([, ids]) => ids.length > 0),
  );

  return {
    oneTimeShared: cleanedOneTimeShared,
    oneTimePersonal: cleanedOneTimePersonal,
    days: cleanedDays,
  };
};

const resolveTravelerIds = (
  tripState: TripState,
  travelerIds?: string[],
  travelerNames?: string[],
) => {
  const ids = new Set<string>();
  travelerIds?.forEach((id) => {
    if (tripState.travelers.some((traveler) => traveler.id === id)) {
      ids.add(id);
    }
  });
  travelerNames?.forEach((name) => {
    const normalized = normalizeName(name);
    const match = tripState.travelers.find(
      (traveler) => normalizeName(traveler.name) === normalized,
    );
    if (match) {
      ids.add(match.id);
    }
  });

  return Array.from(ids);
};

export const applyAiActions = (
  tripState: TripState,
  actions: AiAction[],
): ApplyResult => {
  let nextState = structuredClone(tripState);
  const applied: AiAction[] = [];
  const errors: string[] = [];

  actions.forEach((action, index) => {
    const actionLabel = `Action ${index + 1}`;
    switch (action.type) {
      case "addTraveler": {
        const name = action.name.trim();
        if (!name) {
          errors.push(`${actionLabel}: traveler name is required.`);
          return;
        }
        const newTraveler: Traveler = {
          id: generateId(),
          name,
        };
        nextState = {
          ...nextState,
          travelers: sortTravelers([...nextState.travelers, newTraveler]),
        };
        applied.push(action);
        return;
      }
      case "renameTraveler": {
        const newName = action.newName.trim();
        if (!newName) {
          errors.push(`${actionLabel}: new traveler name is required.`);
          return;
        }
        const traveler = resolveTraveler(nextState, action.travelerId, action.travelerName);
        if (!traveler) {
          errors.push(`${actionLabel}: traveler not found.`);
          return;
        }
        nextState = {
          ...nextState,
          travelers: sortTravelers(
            nextState.travelers.map((item) =>
              item.id === traveler.id ? { ...item, name: newName } : item,
            ),
          ),
        };
        applied.push(action);
        return;
      }
      case "removeTraveler": {
        const traveler = resolveTraveler(nextState, action.travelerId, action.travelerName);
        if (!traveler) {
          errors.push(`${actionLabel}: traveler not found.`);
          return;
        }
        nextState = {
          ...nextState,
          travelers: sortTravelers(
            nextState.travelers.filter((item) => item.id !== traveler.id),
          ),
          usageCosts: removeTravelerFromUsage(nextState, traveler.id),
        };
        applied.push(action);
        return;
      }
      case "addExpense": {
        const name = action.name.trim();
        if (!name) {
          errors.push(`${actionLabel}: expense name is required.`);
          return;
        }

        const currency = normalizeCurrency(action.currency, nextState.displayCurrency);
        const splitMode: DailySharedSplitMode =
          action.splitMode && SPLIT_MODES.includes(action.splitMode)
            ? action.splitMode
            : "dailyOccupancy";

        switch (action.expenseType) {
          case "dailyShared": {
            if (!isNumber(action.totalCost) || !isValidDate(action.startDate) || !isValidDate(action.endDate)) {
              errors.push(`${actionLabel}: daily shared expenses need totalCost, startDate, and endDate.`);
              return;
            }
            const expense: DailySharedExpense = {
              id: generateId(),
              name,
              currency,
              totalCost: action.totalCost,
              startDate: action.startDate,
              endDate: action.endDate,
              splitMode,
            };
            nextState = {
              ...nextState,
              dailySharedExpenses: [...nextState.dailySharedExpenses, expense],
            };
            applied.push(action);
            return;
          }
          case "dailyPersonal": {
            if (!isNumber(action.dailyCost) || !isValidDate(action.startDate) || !isValidDate(action.endDate)) {
              errors.push(`${actionLabel}: daily personal expenses need dailyCost, startDate, and endDate.`);
              return;
            }
            const expense: DailyPersonalExpense = {
              id: generateId(),
              name,
              currency,
              dailyCost: action.dailyCost,
              startDate: action.startDate,
              endDate: action.endDate,
            };
            nextState = {
              ...nextState,
              dailyPersonalExpenses: [...nextState.dailyPersonalExpenses, expense],
            };
            applied.push(action);
            return;
          }
          case "oneTimeShared": {
            if (!isNumber(action.totalCost)) {
              errors.push(`${actionLabel}: one-time shared expenses need totalCost.`);
              return;
            }
            const expense: OneTimeSharedExpense = {
              id: generateId(),
              name,
              currency,
              totalCost: action.totalCost,
            };
            nextState = {
              ...nextState,
              oneTimeSharedExpenses: [...nextState.oneTimeSharedExpenses, expense],
            };
            applied.push(action);
            return;
          }
          case "oneTimePersonal": {
            if (!isNumber(action.totalCost)) {
              errors.push(`${actionLabel}: one-time personal expenses need totalCost.`);
              return;
            }
            const expense: OneTimePersonalExpense = {
              id: generateId(),
              name,
              currency,
              totalCost: action.totalCost,
            };
            nextState = {
              ...nextState,
              oneTimePersonalExpenses: [...nextState.oneTimePersonalExpenses, expense],
            };
            applied.push(action);
            return;
          }
          default:
            errors.push(`${actionLabel}: unsupported expense type.`);
            return;
        }
      }
      case "updateExpense": {
        const expense = resolveExpense(nextState, action.expenseType, action.expenseId, action.expenseName);
        if (!expense) {
          errors.push(`${actionLabel}: expense not found.`);
          return;
        }

        const name = action.name ? action.name.trim() : undefined;
        const currency = action.currency
          ? normalizeCurrency(action.currency, expense.currency)
          : expense.currency;

        switch (action.expenseType) {
          case "dailyShared": {
            const current = expense as DailySharedExpense;
            const updated: DailySharedExpense = {
              ...current,
              name: name || current.name,
              currency,
              totalCost: isNumber(action.totalCost) ? action.totalCost : current.totalCost,
              startDate: isValidDate(action.startDate) ? action.startDate : current.startDate,
              endDate: isValidDate(action.endDate) ? action.endDate : current.endDate,
              splitMode:
                action.splitMode && SPLIT_MODES.includes(action.splitMode)
                  ? action.splitMode
                  : current.splitMode,
            };
            nextState = {
              ...nextState,
              dailySharedExpenses: nextState.dailySharedExpenses.map((item) =>
                item.id === current.id ? updated : item,
              ),
            };
            applied.push(action);
            return;
          }
          case "dailyPersonal": {
            const current = expense as DailyPersonalExpense;
            const updated: DailyPersonalExpense = {
              ...current,
              name: name || current.name,
              currency,
              dailyCost: isNumber(action.dailyCost) ? action.dailyCost : current.dailyCost,
              startDate: isValidDate(action.startDate) ? action.startDate : current.startDate,
              endDate: isValidDate(action.endDate) ? action.endDate : current.endDate,
            };
            nextState = {
              ...nextState,
              dailyPersonalExpenses: nextState.dailyPersonalExpenses.map((item) =>
                item.id === current.id ? updated : item,
              ),
            };
            applied.push(action);
            return;
          }
          case "oneTimeShared": {
            const current = expense as OneTimeSharedExpense;
            const updated: OneTimeSharedExpense = {
              ...current,
              name: name || current.name,
              currency,
              totalCost: isNumber(action.totalCost) ? action.totalCost : current.totalCost,
            };
            nextState = {
              ...nextState,
              oneTimeSharedExpenses: nextState.oneTimeSharedExpenses.map((item) =>
                item.id === current.id ? updated : item,
              ),
            };
            applied.push(action);
            return;
          }
          case "oneTimePersonal": {
            const current = expense as OneTimePersonalExpense;
            const updated: OneTimePersonalExpense = {
              ...current,
              name: name || current.name,
              currency,
              totalCost: isNumber(action.totalCost) ? action.totalCost : current.totalCost,
            };
            nextState = {
              ...nextState,
              oneTimePersonalExpenses: nextState.oneTimePersonalExpenses.map((item) =>
                item.id === current.id ? updated : item,
              ),
            };
            applied.push(action);
            return;
          }
          default:
            errors.push(`${actionLabel}: unsupported expense type.`);
            return;
        }
      }
      case "removeExpense": {
        if (!action.expenseType) {
          errors.push(`${actionLabel}: expense type missing.`);
          return;
        }
        const expense = resolveExpense(nextState, action.expenseType, action.expenseId, action.expenseName);
        if (!expense) {
          errors.push(`${actionLabel}: expense not found.`);
          return;
        }
        nextState = removeExpense(nextState, expense.id, action.expenseType);
        applied.push(action);
        return;
      }
      case "setUsageDaily": {
        if (!isValidDate(action.date)) {
          errors.push(`${actionLabel}: invalid date format. Use YYYY-MM-DD.`);
          return;
        }
        const expense = resolveExpense(nextState, action.expenseType, action.expenseId, action.expenseName);
        if (!expense) {
          errors.push(`${actionLabel}: expense not found.`);
          return;
        }
        const travelerIds = resolveTravelerIds(nextState, action.travelerIds, action.travelerNames);
        if (travelerIds.length === 0) {
          errors.push(`${actionLabel}: no travelers matched.`);
          return;
        }
        const dateKey = action.date;
        const currentDayUsage = nextState.usageCosts.days[dateKey] || {
          dailyShared: {},
          dailyPersonal: {},
        };
        const usageKey = action.expenseType === "dailyShared" ? "dailyShared" : "dailyPersonal";
        const nextUsageList = {
          ...currentDayUsage[usageKey],
          [expense.id]: travelerIds,
        };

        nextState = {
          ...nextState,
          usageCosts: {
            ...nextState.usageCosts,
            days: {
              ...nextState.usageCosts.days,
              [dateKey]: {
                ...currentDayUsage,
                [usageKey]: nextUsageList,
              },
            },
          },
        };
        applied.push(action);
        return;
      }
      case "setUsageOneTime": {
        const expense = resolveExpense(nextState, action.expenseType, action.expenseId, action.expenseName);
        if (!expense) {
          errors.push(`${actionLabel}: expense not found.`);
          return;
        }
        const travelerIds = resolveTravelerIds(nextState, action.travelerIds, action.travelerNames);
        if (travelerIds.length === 0) {
          errors.push(`${actionLabel}: no travelers matched.`);
          return;
        }
        const usageKey = action.expenseType === "oneTimeShared" ? "oneTimeShared" : "oneTimePersonal";
        nextState = {
          ...nextState,
          usageCosts: {
            ...nextState.usageCosts,
            [usageKey]: {
              ...nextState.usageCosts[usageKey],
              [expense.id]: travelerIds,
            },
          },
        };
        applied.push(action);
        return;
      }
      default:
        errors.push(`${actionLabel}: unsupported action.`);
        return;
    }
  });

  return { nextState, applied, errors };
};
