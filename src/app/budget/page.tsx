"use client";

import { useLocalStorage } from "@/hooks/useLocalStorage";
import { TripState, DailyPersonalExpense } from "@/types";
import { useState, useEffect } from "react";
import { initialTripState } from "@/constants/initialState";
import { migrateState } from "@/utils/stateMigrations";
import { formatCurrency } from "@/utils/currencyFormatting";
import { convertCurrency } from "@/utils/currencyConversion";
import { currencies } from "@/data/currencies";
import { Instructions } from "@/components/Instructions";
import { useDisplayCurrency } from "@/providers/DisplayCurrencyProvider";
import { instructions } from "./instructions";
import { getDayCount } from "@/utils/tripStateUpdates";
import { decodeState } from "@/utils/stateEncoding";

type CurrencyTotal = {
  amount: number;
  isApproximate: boolean;
};

const createCurrencyTotal = (): CurrencyTotal => ({
  amount: 0,
  isApproximate: false,
});

const sumCurrencyTotals = (
  a: CurrencyTotal,
  b: CurrencyTotal,
): CurrencyTotal => ({
  amount: a.amount + b.amount,
  isApproximate: a.isApproximate || b.isApproximate,
});

const aggregateTotals = (...totals: CurrencyTotal[]): CurrencyTotal =>
  totals.reduce(
    (acc, total) => sumCurrencyTotals(acc, total),
    createCurrencyTotal(),
  );

type TravelerCostBreakdown = {
  shared: { daily: CurrencyTotal; oneTime: CurrencyTotal };
  personal: { daily: CurrencyTotal; oneTime: CurrencyTotal };
  total: CurrencyTotal;
};

const createTravelerCostBreakdown = (): TravelerCostBreakdown => ({
  shared: { daily: createCurrencyTotal(), oneTime: createCurrencyTotal() },
  personal: { daily: createCurrencyTotal(), oneTime: createCurrencyTotal() },
  total: createCurrencyTotal(),
});

export default function BudgetPage() {
  const [tripState, , isInitialized] = useLocalStorage<TripState>(
    "tripState",
    initialTripState,
    {
      migrate: migrateState,
      decodeFromUrl: decodeState,
    },
  );
  const { displayCurrency, setDisplayCurrency, isApproximate } =
    useDisplayCurrency();
  const [exchangeRates, setExchangeRates] = useState<Record<
    string,
    number
  > | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRates() {
      try {
        const response = await fetch("/api/exchange-rates");
        const data = await response.json();
        setExchangeRates(data.rates);
      } catch (error) {
        console.error("Failed to fetch exchange rates:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchRates();
  }, []);

  if (!isInitialized || isLoading || !exchangeRates) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">
          Budget Summary
        </h1>
        <Instructions text={instructions} />
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-8"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const convertAmount = (
    amount: number,
    sourceCurrency: string,
  ): CurrencyTotal => ({
    amount: convertCurrency(
      amount,
      sourceCurrency,
      displayCurrency,
      exchangeRates!,
    ),
    isApproximate: isApproximate(sourceCurrency),
  });

  const calculateTotalCost = (
    expenses: { totalCost: number; currency: string }[],
  ): CurrencyTotal =>
    expenses.reduce<CurrencyTotal>(
      (total, expense) =>
        sumCurrencyTotals(
          total,
          convertAmount(expense.totalCost, expense.currency),
        ),
      createCurrencyTotal(),
    );

  const calculateDailyCost = (
    totalCost: number,
    startDate: string,
    endDate: string,
    currency: string,
  ): CurrencyTotal => {
    const dayCount = getDayCount(startDate, endDate);
    const safeDays = dayCount > 0 ? dayCount : 1;
    const dailyCost = totalCost / safeDays;
    return convertAmount(dailyCost, currency);
  };

  const calculateDailyExpensesTotal = (
    expenses: DailyPersonalExpense[],
  ): CurrencyTotal =>
    expenses.reduce<CurrencyTotal>(
      (total, expense) =>
        sumCurrencyTotals(
          total,
          convertAmount(expense.dailyCost, expense.currency),
        ),
      createCurrencyTotal(),
    );

  const addAmountWithFlag = (
    target: CurrencyTotal,
    amount: number,
    isApproximation: boolean,
  ) => {
    target.amount += amount;
    target.isApproximate = target.isApproximate || isApproximation;
  };

  const oneTimeSharedTotal = calculateTotalCost(
    tripState.oneTimeSharedExpenses,
  );
  const oneTimePersonalTotal = calculateTotalCost(
    tripState.oneTimePersonalExpenses,
  );
  const dailySharedTotal = tripState.dailySharedExpenses.reduce<CurrencyTotal>(
    (total, expense) =>
      sumCurrencyTotals(
        total,
        calculateDailyCost(
          expense.totalCost,
          expense.startDate,
          expense.endDate,
          expense.currency,
        ),
      ),
    createCurrencyTotal(),
  );
  const dailyPersonalTotal = calculateDailyExpensesTotal(
    tripState.dailyPersonalExpenses,
  );

  const totalDailyCost = sumCurrencyTotals(
    dailySharedTotal,
    dailyPersonalTotal,
  );
  const totalOneTimeCost = sumCurrencyTotals(
    oneTimeSharedTotal,
    oneTimePersonalTotal,
  );
  const totalCost = aggregateTotals(totalDailyCost, totalOneTimeCost);

  const travelerCosts = new Map<string, TravelerCostBreakdown>();

  tripState.travelers.forEach((traveler) => {
    travelerCosts.set(traveler.id, createTravelerCostBreakdown());
  });

  Object.entries(tripState.usageCosts.days).forEach(([, dailyExpenses]) => {
    Object.entries(dailyExpenses.dailyShared).forEach(
      ([expenseId, travelerIds]) => {
        const expense = tripState.dailySharedExpenses.find(
          (e) => e.id === expenseId,
        );
        if (!expense || travelerIds.length === 0) return;

        const dailyCost = calculateDailyCost(
          expense.totalCost,
          expense.startDate,
          expense.endDate,
          expense.currency,
        );
        const costPerPerson = dailyCost.amount / travelerIds.length;

        travelerIds.forEach((travelerId) => {
          const costs = travelerCosts.get(travelerId);
          if (!costs) return;

          addAmountWithFlag(
            costs.shared.daily,
            costPerPerson,
            dailyCost.isApproximate,
          );
          addAmountWithFlag(
            costs.total,
            costPerPerson,
            dailyCost.isApproximate,
          );
        });
      },
    );

    Object.entries(dailyExpenses.dailyPersonal).forEach(
      ([expenseId, travelerIds]) => {
        const expense = tripState.dailyPersonalExpenses.find(
          (e) => e.id === expenseId,
        );
        if (!expense || travelerIds.length === 0) return;

        const dailyCost = convertAmount(expense.dailyCost, expense.currency);

        travelerIds.forEach((travelerId) => {
          const costs = travelerCosts.get(travelerId);
          if (!costs) return;

          addAmountWithFlag(
            costs.personal.daily,
            dailyCost.amount,
            dailyCost.isApproximate,
          );
          addAmountWithFlag(
            costs.total,
            dailyCost.amount,
            dailyCost.isApproximate,
          );
        });
      },
    );
  });

  Object.entries(tripState.usageCosts.oneTimeShared).forEach(
    ([expenseId, travelerIds]) => {
      const expense = tripState.oneTimeSharedExpenses.find(
        (e) => e.id === expenseId,
      );
      if (!expense || travelerIds.length === 0) return;

      const convertedCost = convertAmount(expense.totalCost, expense.currency);
      const costPerPerson = convertedCost.amount / travelerIds.length;

      travelerIds.forEach((travelerId) => {
        const costs = travelerCosts.get(travelerId);
        if (!costs) return;

        addAmountWithFlag(
          costs.shared.oneTime,
          costPerPerson,
          convertedCost.isApproximate,
        );
        addAmountWithFlag(
          costs.total,
          costPerPerson,
          convertedCost.isApproximate,
        );
      });
    },
  );

  Object.entries(tripState.usageCosts.oneTimePersonal).forEach(
    ([expenseId, travelerIds]) => {
      const expense = tripState.oneTimePersonalExpenses.find(
        (e) => e.id === expenseId,
      );
      if (!expense) return;

      const totalCost = convertAmount(expense.totalCost, expense.currency);

      travelerIds.forEach((travelerId) => {
        const costs = travelerCosts.get(travelerId);
        if (!costs) return;

        addAmountWithFlag(
          costs.personal.oneTime,
          totalCost.amount,
          totalCost.isApproximate,
        );
        addAmountWithFlag(
          costs.total,
          totalCost.amount,
          totalCost.isApproximate,
        );
      });
    },
  );

  const grandTotal = Array.from(travelerCosts.values()).reduce<CurrencyTotal>(
    (acc, costs) => sumCurrencyTotals(acc, costs.total),
    createCurrencyTotal(),
  );

  function formatAmount(total: CurrencyTotal): string {
    return formatCurrency(total.amount, displayCurrency, total.isApproximate);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">
        Budget Summary
      </h1>
      <Instructions text={instructions} />
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <label
            htmlFor="currency"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            View in
          </label>
          <select
            id="currency"
            value={displayCurrency}
            onChange={(e) => setDisplayCurrency(e.target.value)}
            className="rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
          >
            {currencies.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {tripState.travelers.map((traveler) => {
              const costs = travelerCosts.get(traveler.id)!;
              return (
                <div key={traveler.id} className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    {traveler.name}
                  </h3>

                  {/* Shared Expenses */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Daily Shared
                      </p>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {formatAmount(costs.shared.daily)}
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        One-time Shared
                      </p>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {formatAmount(costs.shared.oneTime)}
                      </p>
                    </div>
                  </div>

                  {/* Personal Expenses */}
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Daily Personal
                      </p>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {formatAmount(costs.personal.daily)}
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        One-time Personal
                      </p>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {formatAmount(costs.personal.oneTime)}
                      </p>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Total
                      </p>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {formatAmount(costs.total)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Grand Total */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Grand Total
            </h2>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatAmount(grandTotal)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
