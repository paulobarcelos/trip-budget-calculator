'use client';

import { useLocalStorage } from '@/hooks/useLocalStorage';
import { TripState } from '@/types';
import { initialTripState } from '@/constants/initialState';
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
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Budget Summary</h1>

      <div className="mb-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Grand Total</h2>
          <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
            {grandTotal.toFixed(2)} {tripState.baseCurrency}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {tripState.travelers.map(traveler => {
          const costs = travelerCosts.get(traveler.id);
          if (!costs) return null;

          return (
            <div key={traveler.id} className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">{traveler.name}</h2>
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 mb-6">
                  {costs.total.toFixed(2)} {tripState.baseCurrency}
                </p>

                <div className="space-y-4">
                  {/* Shared Expenses */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Shared Expenses</h3>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Daily</span>
                        <span className="text-gray-900 dark:text-gray-100">
                          {costs.shared.daily.toFixed(2)} {tripState.baseCurrency}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">One-time</span>
                        <span className="text-gray-900 dark:text-gray-100">
                          {costs.shared.oneTime.toFixed(2)} {tripState.baseCurrency}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-gray-900 dark:text-gray-100">Total Shared</span>
                          <span className="text-gray-900 dark:text-gray-100">
                            {(costs.shared.daily + costs.shared.oneTime).toFixed(2)} {tripState.baseCurrency}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Personal Expenses */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Personal Expenses</h3>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Daily</span>
                        <span className="text-gray-900 dark:text-gray-100">
                          {costs.personal.daily.toFixed(2)} {tripState.baseCurrency}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">One-time</span>
                        <span className="text-gray-900 dark:text-gray-100">
                          {costs.personal.oneTime.toFixed(2)} {tripState.baseCurrency}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-gray-900 dark:text-gray-100">Total Personal</span>
                          <span className="text-gray-900 dark:text-gray-100">
                            {(costs.personal.daily + costs.personal.oneTime).toFixed(2)} {tripState.baseCurrency}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 