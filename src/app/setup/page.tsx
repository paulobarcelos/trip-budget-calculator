'use client';

import { useLocalStorage } from '@/hooks/useLocalStorage';
import { TripState } from '@/types';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const currencies = [
  'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'HKD', 'NZD'
].sort();

const initialState: TripState = {
  travelers: [],
  dailySharedExpenses: [],
  dailyPersonalExpenses: [],
  oneTimeSharedExpenses: [],
  oneTimePersonalExpenses: [],
  days: [],
  usageCosts: {
    oneTimeShared: {},
    oneTimePersonal: {},
  },
  baseCurrency: 'USD',
  startDate: '',
  endDate: '',
};

export default function SetupPage() {
  const router = useRouter();
  const [tripState, setTripState] = useLocalStorage<TripState>('tripState', initialState);
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

    setTripState({
      ...tripState,
      startDate,
      endDate,
      baseCurrency: currency,
    });

    router.push('/travelers');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Trip Setup</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-900">
            Start Date
          </label>
          <input
            type="date"
            name="startDate"
            id="startDate"
            defaultValue={tripState.startDate}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 bg-white"
          />
        </div>

        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-900">
            End Date
          </label>
          <input
            type="date"
            name="endDate"
            id="endDate"
            defaultValue={tripState.endDate}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 bg-white"
          />
        </div>

        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-900">
            Base Currency
          </label>
          <select
            name="currency"
            id="currency"
            defaultValue={tripState.baseCurrency}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 bg-white"
          >
            {currencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-600">
            This will be the base currency for all expenses
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        <div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Continue to Travelers
          </button>
        </div>
      </form>
    </div>
  );
} 