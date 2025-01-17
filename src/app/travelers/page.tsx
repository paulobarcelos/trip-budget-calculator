'use client';

import { useLocalStorage } from '@/hooks/useLocalStorage';
import { TripState, Traveler, Day } from '@/types';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { initialTripState } from '@/constants/initialState';

export default function TravelersPage() {
  const router = useRouter();
  const [tripState, setTripState, isInitialized] = useLocalStorage<TripState>('tripState', initialTripState);
  const [newTravelerName, setNewTravelerName] = useState('');
  const [newTravelerStartDate, setNewTravelerStartDate] = useState('');
  const [newTravelerEndDate, setNewTravelerEndDate] = useState('');
  const [minDate, setMinDate] = useState('');
  const [maxDate, setMaxDate] = useState('');
  const [error, setError] = useState('');
  const [travelerToDelete, setTravelerToDelete] = useState<Traveler | null>(null);

  // Set initial dates after component mounts
  useEffect(() => {
    setNewTravelerStartDate(tripState.startDate);
    setNewTravelerEndDate(tripState.endDate);
    setMinDate(tripState.startDate);
    setMaxDate(tripState.endDate);
  }, [tripState.startDate, tripState.endDate]);

  const updateDaysWithTraveler = (days: Day[], traveler: Traveler, isRemoving = false) => {
    const updatedDays = days;
    const newUsageCosts = {
      ...tripState.usageCosts,
      days: { ...tripState.usageCosts.days }
    };

    days.forEach(day => {
      const dayDate = new Date(day.date);
      const travelerStart = new Date(traveler.startDate);
      const travelerEnd = new Date(traveler.endDate);
      
      if (dayDate >= travelerStart && dayDate <= travelerEnd && !isRemoving) {
        // Initialize the day's expenses if they don't exist
        if (!newUsageCosts.days[day.id]) {
          newUsageCosts.days[day.id] = {
            dailyShared: {},
            dailyPersonal: {},
          };
        }

        // Add the traveler to all active expenses for this day
        tripState.dailySharedExpenses.forEach(expense => {
          const isExpenseActive = dayDate >= new Date(expense.startDate) && 
                                dayDate <= new Date(expense.endDate);
          if (isExpenseActive) {
            if (!newUsageCosts.days[day.id].dailyShared[expense.id]) {
              newUsageCosts.days[day.id].dailyShared[expense.id] = [];
            }
            if (!newUsageCosts.days[day.id].dailyShared[expense.id].includes(traveler.id)) {
              newUsageCosts.days[day.id].dailyShared[expense.id].push(traveler.id);
            }
          }
        });

        tripState.dailyPersonalExpenses.forEach(expense => {
          if (!newUsageCosts.days[day.id].dailyPersonal[expense.id]) {
            newUsageCosts.days[day.id].dailyPersonal[expense.id] = [];
          }
          if (!newUsageCosts.days[day.id].dailyPersonal[expense.id].includes(traveler.id)) {
            newUsageCosts.days[day.id].dailyPersonal[expense.id].push(traveler.id);
          }
        });
      } else if (isRemoving) {
        // Remove the traveler from all expenses on this day
        if (newUsageCosts.days[day.id]) {
          Object.keys(newUsageCosts.days[day.id].dailyShared).forEach(expenseId => {
            newUsageCosts.days[day.id].dailyShared[expenseId] = 
              newUsageCosts.days[day.id].dailyShared[expenseId].filter(id => id !== traveler.id);
          });

          Object.keys(newUsageCosts.days[day.id].dailyPersonal).forEach(expenseId => {
            newUsageCosts.days[day.id].dailyPersonal[expenseId] = 
              newUsageCosts.days[day.id].dailyPersonal[expenseId].filter(id => id !== traveler.id);
          });
        }
      }
    });

    setTripState(prev => ({
      ...prev,
      usageCosts: newUsageCosts
    }));

    return updatedDays;
  };

  const handleAddTraveler = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!newTravelerName.trim() || !newTravelerStartDate || !newTravelerEndDate) {
      setError('All fields are required');
      return;
    }

    if (new Date(newTravelerStartDate) >= new Date(newTravelerEndDate)) {
      setError('End date must be after start date');
      return;
    }

    if (new Date(newTravelerStartDate) < new Date(tripState.startDate) ||
        new Date(newTravelerEndDate) > new Date(tripState.endDate)) {
      setError('Traveler dates must be within trip dates');
      return;
    }

    if (tripState.travelers.some(t => t.name === newTravelerName.trim())) {
      setError('Traveler already exists');
      return;
    }

    const newTraveler: Traveler = {
      id: crypto.randomUUID(),
      name: newTravelerName.trim(),
      startDate: newTravelerStartDate,
      endDate: newTravelerEndDate,
    };

    setTripState({
      ...tripState,
      travelers: [...tripState.travelers, newTraveler],
      days: updateDaysWithTraveler(tripState.days, newTraveler),
    });
    setNewTravelerName('');
    setError('');
  };

  const handleUpdateTravelerDates = (travelerId: string, startDate: string, endDate: string) => {
    if (new Date(startDate) >= new Date(endDate)) {
      setError('End date must be after start date');
      return;
    }

    if (new Date(startDate) < new Date(tripState.startDate) ||
        new Date(endDate) > new Date(tripState.endDate)) {
      setError('Traveler dates must be within trip dates');
      return;
    }

    const traveler = tripState.travelers.find(t => t.id === travelerId);
    if (!traveler) return;

    const updatedTraveler = { ...traveler, startDate, endDate };

    setTripState({
      ...tripState,
      travelers: tripState.travelers.map(t => 
        t.id === travelerId 
          ? updatedTraveler
          : t
      ),
      days: updateDaysWithTraveler(tripState.days, updatedTraveler),
    });
    setError('');
  };

  const handleRemoveTraveler = (travelerId: string) => {
    const traveler = tripState.travelers.find(t => t.id === travelerId);
    if (!traveler) return;

    setTripState({
      ...tripState,
      travelers: tripState.travelers.filter(t => t.id !== travelerId),
      days: updateDaysWithTraveler(tripState.days, traveler, true),
    });
    setTravelerToDelete(null);
  };

  const handleContinue = () => {
    if (tripState.travelers.length === 0) {
      setError('Add at least one traveler');
      return;
    }
    router.push('/expenses');
  };

  if (!isInitialized) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Add Travelers</h1>
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
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Add Travelers</h1>
      
      <form onSubmit={handleAddTraveler} className="mb-8 space-y-4">
        <div className="flex gap-4">
          <div className="flex-grow">
            <label htmlFor="travelerName" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Name
            </label>
            <input
              type="text"
              name="travelerName"
              id="travelerName"
              value={newTravelerName}
              onChange={(e) => setNewTravelerName(e.target.value)}
              placeholder="Enter traveler name"
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
            />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Start Date
            </label>
            <input
              type="date"
              name="startDate"
              id="startDate"
              value={newTravelerStartDate}
              min={minDate}
              max={maxDate}
              onChange={(e) => setNewTravelerStartDate(e.target.value)}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              End Date
            </label>
            <input
              type="date"
              name="endDate"
              id="endDate"
              value={newTravelerEndDate}
              min={minDate}
              max={maxDate}
              onChange={(e) => setNewTravelerEndDate(e.target.value)}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
            />
          </div>
        </div>
        <div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900"
          >
            Add Traveler
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/50 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 mb-8">
        {tripState.travelers.map((traveler) => (
          <div
            key={traveler.id}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow space-y-4 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex justify-between items-center">
              <span className="text-gray-900 dark:text-gray-100 font-medium">{traveler.name}</span>
              <button
                onClick={() => setTravelerToDelete(traveler)}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
              >
                Remove
              </button>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={traveler.startDate}
                  min={minDate}
                  max={maxDate}
                  onChange={(e) => handleUpdateTravelerDates(traveler.id, e.target.value, traveler.endDate)}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={traveler.endDate}
                  min={minDate}
                  max={maxDate}
                  onChange={(e) => handleUpdateTravelerDates(traveler.id, traveler.startDate, e.target.value)}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
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