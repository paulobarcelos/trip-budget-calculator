'use client';

import { useLocalStorage } from '@/hooks/useLocalStorage';
import { TripState } from '@/types';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { initialTripState } from '@/constants/initialState';
import { updateTravelerDates } from '@/utils/tripStateUpdates';

interface TravelerToDelete {
  id: string;
  name: string;
}

export default function TravelersPage() {
  const router = useRouter();
  const [tripState, setTripState, isInitialized] = useLocalStorage<TripState>('tripState', initialTripState);
  const [travelerToDelete, setTravelerToDelete] = useState<TravelerToDelete | null>(null);

  if (!isInitialized) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Travelers</h1>
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-8"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const handleAddTraveler = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;

    setTripState({
      ...tripState,
      travelers: [
        ...tripState.travelers,
        {
          id: crypto.randomUUID(),
          name,
          startDate,
          endDate,
        },
      ],
    });

    (e.target as HTMLFormElement).reset();
  };

  const handleUpdateTraveler = (
    travelerId: string,
    updates: { name?: string; startDate?: string; endDate?: string }
  ) => {
    const updatedTripState = updateTravelerDates(
      tripState,
      travelerId,
      updates.startDate || null,
      updates.endDate || null
    );

    if (updates.name) {
      updatedTripState.travelers = updatedTripState.travelers.map(traveler =>
        traveler.id === travelerId ? { ...traveler, name: updates.name! } : traveler
      );
    }

    setTripState(updatedTripState);
  };

  const handleRemoveTraveler = (travelerId: string) => {
    // First update the traveler's dates to null to clean up their usage entries
    const cleanedState = updateTravelerDates(tripState, travelerId, null, null);
    
    // Then remove the traveler
    setTripState({
      ...cleanedState,
      travelers: cleanedState.travelers.filter(t => t.id !== travelerId),
    });
  };

  const handleContinue = () => {
    router.push('/expenses');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Travelers</h1>

      <form onSubmit={handleAddTraveler} className="mb-8 space-y-4 bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Add Traveler</h2>
        
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Name
          </label>
          <input
            type="text"
            name="name"
            id="name"
            required
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:text-gray-100 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Start Date
          </label>
          <input
            type="date"
            name="startDate"
            id="startDate"
            required
            min={tripState.startDate}
            max={tripState.endDate}
            defaultValue={tripState.startDate}
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
            min={tripState.startDate}
            max={tripState.endDate}
            defaultValue={tripState.endDate}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:text-gray-100 sm:text-sm"
          />
        </div>

        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900"
        >
          Add Traveler
        </button>
      </form>

      <div className="space-y-4">
        {tripState.travelers.map((traveler) => (
          <div
            key={traveler.id}
            className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <input
                type="text"
                value={traveler.name}
                onChange={(e) => handleUpdateTraveler(traveler.id, { name: e.target.value })}
                className="text-lg font-medium text-gray-900 dark:text-gray-100 bg-transparent border-none focus:ring-0 p-0"
              />
              <button
                onClick={() => setTravelerToDelete({ id: traveler.id, name: traveler.name })}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
              >
                Remove
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Start Date
                </label>
                <input
                  type="date"
                  value={traveler.startDate}
                  min={tripState.startDate}
                  max={tripState.endDate}
                  onChange={(e) => handleUpdateTraveler(traveler.id, { startDate: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:text-gray-100 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  End Date
                </label>
                <input
                  type="date"
                  value={traveler.endDate}
                  min={tripState.startDate}
                  max={tripState.endDate}
                  onChange={(e) => handleUpdateTraveler(traveler.id, { endDate: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:text-gray-100 sm:text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleContinue}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900"
      >
        Continue to Expenses
      </button>

      <ConfirmationDialog
        isOpen={travelerToDelete !== null}
        onClose={() => setTravelerToDelete(null)}
        onConfirm={() => handleRemoveTraveler(travelerToDelete!.id)}
        title="Remove Traveler"
        message={`Are you sure you want to remove ${travelerToDelete?.name}? This action cannot be undone.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
      />
    </div>
  );
} 