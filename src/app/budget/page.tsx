'use client';

import { useLocalStorage } from '@/hooks/useLocalStorage';
import { TripState, DailyPersonalExpense } from '@/types';
import { useState, useEffect } from 'react';
import { initialTripState } from '@/constants/initialState';
import { formatCurrency } from '@/utils/currencyFormatting';
import { convertCurrency } from '@/utils/currencyConversion';
import { currencies } from '@/data/currencies';
import { Instructions } from '@/components/Instructions';
import { instructions } from './instructions';

export default function BudgetPage() {
  const [tripState, , isInitialized] = useLocalStorage<TripState>('tripState', initialTripState);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(null);
  const [displayCurrency, setDisplayCurrency] = useLocalStorage<string>('displayCurrency', tripState.displayCurrency);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRates() {
      try {
        const response = await fetch('/api/exchange-rates');
        const data = await response.json();
        setExchangeRates(data.rates);
      } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchRates();
  }, []);

  if (!isInitialized || isLoading || !exchangeRates) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Budget Summary</h1>
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

  const calculateTotalCost = (expenses: { totalCost: number; currency: string }[]) => {
    return expenses.reduce((total, expense) => {
      const convertedCost = convertCurrency(expense.totalCost, expense.currency, displayCurrency, exchangeRates!);
      return total + convertedCost;
    }, 0);
  };

  const calculateDailyCost = (totalCost: number, startDate: string, endDate: string, currency: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const dailyCost = totalCost / days;
    return convertCurrency(dailyCost, currency, displayCurrency, exchangeRates!);
  };

  const calculateDailyExpensesTotal = (expenses: DailyPersonalExpense[]) => {
    return expenses.reduce((total, expense) => {
      const convertedCost = convertCurrency(expense.dailyCost, expense.currency, displayCurrency, exchangeRates!);
      return total + convertedCost;
    }, 0);
  };

  const oneTimeSharedTotal = calculateTotalCost(tripState.oneTimeSharedExpenses);
  const oneTimePersonalTotal = calculateTotalCost(tripState.oneTimePersonalExpenses);
  const dailySharedTotal = tripState.dailySharedExpenses.reduce((total, expense) => {
    return total + calculateDailyCost(expense.totalCost, expense.startDate, expense.endDate, expense.currency);
  }, 0);
  const dailyPersonalTotal = calculateDailyExpensesTotal(tripState.dailyPersonalExpenses);

  const totalDailyCost = dailySharedTotal + dailyPersonalTotal;
  const totalOneTimeCost = oneTimeSharedTotal + oneTimePersonalTotal;
  const totalCost = totalDailyCost + totalOneTimeCost;

  const travelerCosts = new Map<string, { shared: { daily: number; oneTime: number }; personal: { daily: number; oneTime: number }; total: number }>();

  tripState.travelers.forEach(traveler => {
    travelerCosts.set(traveler.id, {
      shared: { daily: 0, oneTime: 0 },
      personal: { daily: 0, oneTime: 0 },
      total: 0
    });
  });

  Object.entries(tripState.usageCosts.days).forEach(([, dailyExpenses]) => {
    Object.entries(dailyExpenses.dailyShared).forEach(([expenseId, travelerIds]) => {
      const expense = tripState.dailySharedExpenses.find(e => e.id === expenseId);
      if (!expense || travelerIds.length === 0) return;

      const dailyCost = calculateDailyCost(expense.totalCost, expense.startDate, expense.endDate, expense.currency);
      const costPerPerson = dailyCost / travelerIds.length;

      travelerIds.forEach(travelerId => {
        const costs = travelerCosts.get(travelerId);
        if (costs) {
          costs.shared.daily += costPerPerson;
          costs.total += costPerPerson;
        }
      });
    });

    Object.entries(dailyExpenses.dailyPersonal).forEach(([expenseId, travelerIds]) => {
      const expense = tripState.dailyPersonalExpenses.find(e => e.id === expenseId);
      if (!expense || travelerIds.length === 0) return;

      const dailyCost = calculateDailyExpensesTotal([expense]);

      travelerIds.forEach(travelerId => {
        const costs = travelerCosts.get(travelerId);
        if (costs) {
          costs.personal.daily += dailyCost;
          costs.total += dailyCost;
        }
      });
    });
  });

  Object.entries(tripState.usageCosts.oneTimeShared).forEach(([expenseId, travelerIds]) => {
    const expense = tripState.oneTimeSharedExpenses.find(e => e.id === expenseId);
    if (!expense || travelerIds.length === 0) return;

    const costPerPerson = calculateTotalCost([expense]) / travelerIds.length;

    travelerIds.forEach(travelerId => {
      const costs = travelerCosts.get(travelerId);
      if (costs) {
        costs.shared.oneTime += costPerPerson;
        costs.total += costPerPerson;
      }
    });
  });

  Object.entries(tripState.usageCosts.oneTimePersonal).forEach(([expenseId, travelerIds]) => {
    const expense = tripState.oneTimePersonalExpenses.find(e => e.id === expenseId);
    if (!expense) return;

    const totalCost = calculateTotalCost([expense]);

    travelerIds.forEach(travelerId => {
      const costs = travelerCosts.get(travelerId);
      if (costs) {
        costs.personal.oneTime += totalCost;
        costs.total += totalCost;
      }
    });
  });

  const grandTotal = Array.from(travelerCosts.values()).reduce((sum, costs) => sum + costs.total, 0);

  function formatAmount(amount: number): string {
    return formatCurrency(amount, displayCurrency);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Budget Summary</h1>
      <Instructions text={instructions} />
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <label htmlFor="currency" className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
            {tripState.travelers.map(traveler => {
              const costs = travelerCosts.get(traveler.id)!;
              return (
                <div key={traveler.id} className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    {traveler.name}
                  </h3>

                  {/* Shared Expenses */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Daily Shared</p>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {formatAmount(costs.shared.daily)}
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400">One-time Shared</p>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {formatAmount(costs.shared.oneTime)}
                      </p>
                    </div>
                  </div>

                  {/* Personal Expenses */}
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Daily Personal</p>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {formatAmount(costs.personal.daily)}
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400">One-time Personal</p>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {formatAmount(costs.personal.oneTime)}
                      </p>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Total</p>
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
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Grand Total</h2>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatAmount(grandTotal)}
            </p>
          </div>
        </div>

        {/* Cost Summary */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">Cost Summary</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Daily Costs</h3>
              <div className="mt-2 space-y-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Shared: {formatAmount(dailySharedTotal)} per day
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Personal: {formatAmount(dailyPersonalTotal)} per day
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Total: {formatAmount(totalDailyCost)} per day
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">One-time Costs</h3>
              <div className="mt-2 space-y-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Shared: {formatAmount(oneTimeSharedTotal)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Personal: {formatAmount(oneTimePersonalTotal)}
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Total: {formatAmount(totalOneTimeCost)}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Total Cost</h3>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatAmount(totalCost)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}