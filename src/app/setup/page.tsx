'use client';

import { useLocalStorage } from '@/hooks/useLocalStorage';
import { TripState, Day } from '@/types';
import { currencies } from '@/data/currencies';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { initialTripState } from '@/constants/initialState';

function getDaysBetweenDates(startDate: string, endDate: string): Day[] {
  const days: Day[] = [];
  const currentDate = new Date(startDate);
  const lastDate = new Date(endDate);

  while (currentDate <= lastDate) {
    days.push({
      id: crypto.randomUUID(),
      date: currentDate.toISOString().split('T')[0],
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return days;
}

export default function SetupPage() {
  const router = useRouter();
  const [tripState, setTripState, isInitialized] = useLocalStorage<TripState>('tripState', initialTripState);
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const currency = formData.get('currency') as string;

    if (!startDate || !endDate || !currency) {
      setError('All fields are required');
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setError('End date must be after start date');
      return;
    }

    const days = getDaysBetweenDates(startDate, endDate);

    setTripState({
      ...tripState,
      startDate,
      endDate,
      baseCurrency: currency,
      days,
    });

    router.push('/travelers');
  };

  if (!isInitialized) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Trip Setup</h1>
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-8"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Trip Setup</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
            Start Date
          </label>
          <input
            type="date"
            name="startDate"
            id="startDate"
            defaultValue={tripState.startDate}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
          />
        </div>

        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
            End Date
          </label>
          <input
            type="date"
            name="endDate"
            id="endDate"
            defaultValue={tripState.endDate}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
          />
        </div>

        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
            Base Currency
          </label>
          <select
            name="currency"
            id="currency"
            defaultValue={tripState.baseCurrency}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
          >
            {[...currencies].sort((a, b) => a.name.localeCompare(b.name)).map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.name} ({currency.code})
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            This will be the base currency for all expenses
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">{error}</h3>
              </div>
            </div>
          </div>
        )}

        <div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900"
          >
            Continue to Travelers
          </button>
        </div>
      </form>
    </div>
  );
} 