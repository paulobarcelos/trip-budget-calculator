'use client';

import { useLocalStorage } from '@/hooks/useLocalStorage';
import { TripState } from '@/types';
import { initialTripState } from '@/constants/initialState';
import { currencies } from '@/data/currencies';
import { calculateDailyCost } from '@/utils/tripStateUpdates';
import { formatCurrency } from '@/utils/currencyFormatting';
import { useEffect, useState } from 'react';

interface TravelerCosts {
  shared: {
    daily: number;
    oneTime: number;
  };
  personal: {
    daily: number;
    oneTime: number;
  };
  total: number;
}

export default function BudgetPage() {
  const [tripState, , isInitialized] = useLocalStorage<TripState>('tripState', initialTripState);
  const [displayCurrency, setDisplayCurrency] = useLocalStorage<string>(
    'displayCurrency',
    tripState.baseCurrency
  );
  const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(null);
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

  if (!isInitialized || isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Budget Summary</h1>
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-8"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate costs for each traveler
  const travelerCosts = new Map<string, TravelerCosts>();

  // Initialize costs for each traveler
  tripState.travelers.forEach(traveler => {
    travelerCosts.set(traveler.id, {
      shared: { daily: 0, oneTime: 0 },
      personal: { daily: 0, oneTime: 0 },
      total: 0
    });
  });

  // Calculate daily shared expenses
  Object.entries(tripState.usageCosts.days).forEach(([, dailyExpenses]) => {
    // Handle shared expenses
    Object.entries(dailyExpenses.dailyShared).forEach(([expenseId, travelerIds]) => {
      const expense = tripState.dailySharedExpenses.find(e => e.id === expenseId);
      if (!expense || travelerIds.length === 0) return;

      const dailyCost = calculateDailyCost(expense.totalCost, expense.startDate, expense.endDate);
      const costPerPerson = dailyCost / travelerIds.length;
      
      travelerIds.forEach(travelerId => {
        const costs = travelerCosts.get(travelerId);
        if (costs) {
          costs.shared.daily += costPerPerson;
          costs.total += costPerPerson;
        }
      });
    });

    // Handle personal expenses
    Object.entries(dailyExpenses.dailyPersonal).forEach(([expenseId, travelerIds]) => {
      const expense = tripState.dailyPersonalExpenses.find(e => e.id === expenseId);
      if (!expense || travelerIds.length === 0) return;

      travelerIds.forEach(travelerId => {
        const costs = travelerCosts.get(travelerId);
        if (costs) {
          costs.personal.daily += expense.dailyCost;
          costs.total += expense.dailyCost;
        }
      });
    });
  });

  // Calculate one-time shared expenses
  Object.entries(tripState.usageCosts.oneTimeShared).forEach(([expenseId, travelerIds]) => {
    const expense = tripState.oneTimeSharedExpenses.find(e => e.id === expenseId);
    if (!expense || travelerIds.length === 0) return;

    const costPerPerson = expense.totalCost / travelerIds.length;
    travelerIds.forEach(travelerId => {
      const costs = travelerCosts.get(travelerId);
      if (costs) {
        costs.shared.oneTime += costPerPerson;
        costs.total += costPerPerson;
      }
    });
  });

  // Calculate one-time personal expenses
  Object.entries(tripState.usageCosts.oneTimePersonal).forEach(([expenseId, travelerIds]) => {
    const expense = tripState.oneTimePersonalExpenses.find(e => e.id === expenseId);
    if (!expense) return;

    travelerIds.forEach(travelerId => {
      const costs = travelerCosts.get(travelerId);
      if (costs) {
        costs.personal.oneTime += expense.totalCost;
        costs.total += expense.totalCost;
      }
    });
  });

  // Calculate grand total
  const grandTotal = Array.from(travelerCosts.values()).reduce((sum, costs) => sum + costs.total, 0);

  // Function to convert and format amount
  function formatAmount(amount: number): string {
    if (!exchangeRates || displayCurrency === tripState.baseCurrency) {
      return formatCurrency(amount, displayCurrency);
    }

    // Convert through USD
    const amountInUSD = amount / exchangeRates[tripState.baseCurrency];
    const convertedAmount = amountInUSD * exchangeRates[displayCurrency];
    return formatCurrency(convertedAmount, displayCurrency, true);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Budget Summary</h1>
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
      </div>
    </div>
  );
} 