'use client';

import { useLocalStorage } from '@/hooks/useLocalStorage';
import { TripState } from '@/types';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { initialTripState } from '@/constants/initialState';
import { updateTripDates } from '@/utils/tripStateUpdates';
import { Instructions } from '@/components/Instructions';
import { instructions } from './instructions';

export default function SetupPage() {
  const router = useRouter();
  const [tripState, setTripState, isInitialized] = useLocalStorage<TripState>('tripState', initialTripState);
  const [formState, setFormState] = useState(() => ({
    startDate: initialTripState.startDate,
    endDate: initialTripState.endDate,
  }));

  // Initialize form state from tripState only once when isInitialized becomes true
  useEffect(() => {
    if (isInitialized && tripState) {
      setFormState({
        startDate: tripState.startDate,
        endDate: tripState.endDate,
      });
    }
  }, [isInitialized, tripState]); // Only run when isInitialized changes

  // Handle form changes and update trip state
  const handleFormChange = (changes: Partial<typeof formState>) => {
    setFormState(prev => {
      const newState = { ...prev, ...changes };
      
      // Only update trip state if we have all required values
      if (isInitialized && newState.startDate && newState.endDate) {
        const updatedTripState = updateTripDates(tripState, newState.startDate, newState.endDate);
        setTripState(updatedTripState);
      }
      
      return newState;
    });
  };

  if (!isInitialized) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Setup Trip</h1>
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

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Setup Trip</h1>
      <Instructions text={instructions} />
      <div className="space-y-6">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Start Date
          </label>
          <input
            type="date"
            name="startDate"
            id="startDate"
            required
            value={formState.startDate}
            onChange={(e) => handleFormChange({ startDate: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:text-gray-100 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            End Date
          </label>
          <input
            type="date"
            name="endDate"
            id="endDate"
            required
            value={formState.endDate}
            onChange={(e) => handleFormChange({ endDate: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:text-gray-100 sm:text-sm"
          />
        </div>

        <button
          type="button"
          onClick={() => router.push('/travelers')}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900"
        >
          Continue to Travelers
        </button>
      </div>
    </div>
  );
}