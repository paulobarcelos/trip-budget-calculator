'use client';

import { useLocalStorage } from '@/hooks/useLocalStorage';
import { TripState } from '@/types';
import { initialTripState } from '@/constants/initialState';
import { Currency, convertCurrency, formatCurrency } from '@/utils/currencyConversion';
import { currencies } from '@/data/currencies';
import { calculateDailyCost } from '@/utils/tripStateUpdates';

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
  const [displayCurrency, setDisplayCurrency] = useLocalStorage<Currency>(
    'displayCurrency',
    tripState.baseCurrency
  );

  const formatAmount = (amount: number, isConverted: boolean = false) => {
    if (displayCurrency === tripState.baseCurrency) {
      return formatCurrency(amount, displayCurrency as Currency);
    }
    const converted = convertCurrency(amount, tripState.baseCurrency as Currency, displayCurrency);
    return formatCurrency(converted, displayCurrency, isConverted);
  };

  if (!isInitialized) {
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
  tripState.days.forEach(day => {
    const dayExpenses = tripState.usageCosts.days[day.id];
    if (!dayExpenses) return;

    // Daily shared expenses
    Object.entries(dayExpenses.dailyShared).forEach(([expenseId, travelerIds]) => {
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

    // Daily personal expenses
    Object.entries(dayExpenses.dailyPersonal).forEach(([expenseId, travelerIds]) => {
      const expense = tripState.dailyPersonalExpenses.find(e => e.id === expenseId);
      if (!expense) return;

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
            onChange={(e) => setDisplayCurrency(e.target.value as Currency)}
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
        {/* Per Traveler Breakdown */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Cost per Traveler</h2>
          <div className="space-y-6">
            {tripState.travelers.map(traveler => {
              const costs = travelerCosts.get(traveler.id);
              if (!costs) return null;

              return (
                <div key={traveler.id} className="border-t border-gray-200 dark:border-gray-700 pt-4 first:border-0 first:pt-0">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{traveler.name}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Daily Shared Expenses</p>
                      <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {formatAmount(costs.shared.daily, true)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Daily Personal Expenses</p>
                      <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {formatAmount(costs.personal.daily, true)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">One-time Shared Expenses</p>
                      <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {formatAmount(costs.shared.oneTime, true)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">One-time Personal Expenses</p>
                      <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {formatAmount(costs.personal.oneTime, true)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Total</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {formatAmount(costs.total, true)}
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
              {formatAmount(grandTotal, true)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 