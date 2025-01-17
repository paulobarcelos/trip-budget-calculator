'use client';

import { useLocalStorage } from '@/hooks/useLocalStorage';
import { TripState, Traveler } from '@/types';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

export default function TravelersPage() {
  const router = useRouter();
  const [tripState, setTripState] = useLocalStorage<TripState>('tripState', initialState);
  const [newTravelerName, setNewTravelerName] = useState('');
  const [newTravelerStartDate, setNewTravelerStartDate] = useState('');
  const [newTravelerEndDate, setNewTravelerEndDate] = useState('');
  const [minDate, setMinDate] = useState('');
  const [maxDate, setMaxDate] = useState('');
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  // Set initial dates and mounted state after component mounts
  useEffect(() => {
    setNewTravelerStartDate(tripState.startDate);
    setNewTravelerEndDate(tripState.endDate);
    setMinDate(tripState.startDate);
    setMaxDate(tripState.endDate);
    setMounted(true);
  }, [tripState.startDate, tripState.endDate]);

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
      travelers: [...tripState.travelers, newTraveler]
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

    setTripState({
      ...tripState,
      travelers: tripState.travelers.map(t => 
        t.id === travelerId 
          ? { ...t, startDate, endDate }
          : t
      )
    });
    setError('');
  };

  const handleRemoveTraveler = (travelerId: string) => {
    setTripState({
      ...tripState,
      travelers: tripState.travelers.filter(t => t.id !== travelerId)
    });
  };

  const handleContinue = () => {
    if (tripState.travelers.length === 0) {
      setError('Add at least one traveler');
      return;
    }
    router.push('/expenses');
  };

  if (!mounted) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">Add Travelers</h1>
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded mb-8"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Add Travelers</h1>
      
      <form onSubmit={handleAddTraveler} className="mb-8 space-y-4">
        <div className="flex gap-4">
          <div className="flex-grow">
            <label htmlFor="travelerName" className="block text-sm font-medium text-gray-900 mb-1">
              Name
            </label>
            <input
              type="text"
              name="travelerName"
              id="travelerName"
              value={newTravelerName}
              onChange={(e) => setNewTravelerName(e.target.value)}
              placeholder="Enter traveler name"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 bg-white"
            />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-900 mb-1">
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
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 bg-white"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-900 mb-1">
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
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 bg-white"
            />
          </div>
        </div>
        <div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add Traveler
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 mb-8">
        {tripState.travelers.map((traveler) => (
          <div
            key={traveler.id}
            className="p-4 bg-white rounded-lg shadow space-y-4"
          >
            <div className="flex justify-between items-center">
              <span className="text-gray-900 font-medium">{traveler.name}</span>
              <button
                onClick={() => handleRemoveTraveler(traveler.id)}
                className="text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={traveler.startDate}
                  min={minDate}
                  max={maxDate}
                  onChange={(e) => handleUpdateTravelerDates(traveler.id, e.target.value, traveler.endDate)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 bg-white"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={traveler.endDate}
                  min={minDate}
                  max={maxDate}
                  onChange={(e) => handleUpdateTravelerDates(traveler.id, traveler.startDate, e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 bg-white"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleContinue}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Continue to Expenses
      </button>
    </div>
  );
} 