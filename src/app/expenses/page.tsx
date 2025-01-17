'use client';

import { useLocalStorage } from '@/hooks/useLocalStorage';
import { TripState, DailySharedExpense, DailyPersonalExpense, OneTimeSharedExpense, OneTimePersonalExpense } from '@/types';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tab } from '@headlessui/react';
import { classNames } from '@/utils/classNames';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';

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

export default function ExpensesPage() {
  const router = useRouter();
  const [tripState, setTripState] = useLocalStorage<TripState>('tripState', initialState);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<{
    id: string;
    type: 'dailyShared' | 'dailyPersonal' | 'oneTimeShared' | 'oneTimePersonal';
    name: string;
  } | null>(null);

  // Daily Shared Expense form state
  const [newDailySharedExpense, setNewDailySharedExpense] = useState({
    name: '',
    totalCost: '',
    startDate: tripState.startDate,
    endDate: tripState.endDate,
  });

  // Daily Personal Expense form state
  const [newDailyPersonalExpense, setNewDailyPersonalExpense] = useState({
    name: '',
    dailyCost: '',
  });

  // One-time Shared Expense form state
  const [newOneTimeSharedExpense, setNewOneTimeSharedExpense] = useState({
    name: '',
    totalCost: '',
  });

  // One-time Personal Expense form state
  const [newOneTimePersonalExpense, setNewOneTimePersonalExpense] = useState({
    name: '',
    totalCost: '',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAddDailySharedExpense = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!newDailySharedExpense.name.trim() || !newDailySharedExpense.totalCost || !newDailySharedExpense.startDate || !newDailySharedExpense.endDate) {
      setError('All fields are required');
      return;
    }

    const cost = parseFloat(newDailySharedExpense.totalCost);
    if (isNaN(cost) || cost <= 0) {
      setError('Cost must be a positive number');
      return;
    }

    if (new Date(newDailySharedExpense.startDate) >= new Date(newDailySharedExpense.endDate)) {
      setError('End date must be after start date');
      return;
    }

    if (new Date(newDailySharedExpense.startDate) < new Date(tripState.startDate) ||
        new Date(newDailySharedExpense.endDate) > new Date(tripState.endDate)) {
      setError('Expense dates must be within trip dates');
      return;
    }

    const newExpense: DailySharedExpense = {
      id: crypto.randomUUID(),
      name: newDailySharedExpense.name.trim(),
      totalCost: cost,
      startDate: newDailySharedExpense.startDate,
      endDate: newDailySharedExpense.endDate,
    };

    setTripState({
      ...tripState,
      dailySharedExpenses: [...tripState.dailySharedExpenses, newExpense]
    });

    setNewDailySharedExpense({
      name: '',
      totalCost: '',
      startDate: tripState.startDate,
      endDate: tripState.endDate,
    });
    setError('');
  };

  const handleAddDailyPersonalExpense = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!newDailyPersonalExpense.name.trim() || !newDailyPersonalExpense.dailyCost) {
      setError('All fields are required');
      return;
    }

    const cost = parseFloat(newDailyPersonalExpense.dailyCost);
    if (isNaN(cost) || cost <= 0) {
      setError('Cost must be a positive number');
      return;
    }

    const newExpense: DailyPersonalExpense = {
      id: crypto.randomUUID(),
      name: newDailyPersonalExpense.name.trim(),
      dailyCost: cost,
    };

    setTripState({
      ...tripState,
      dailyPersonalExpenses: [...tripState.dailyPersonalExpenses, newExpense]
    });

    setNewDailyPersonalExpense({
      name: '',
      dailyCost: '',
    });
    setError('');
  };

  const handleAddOneTimeSharedExpense = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!newOneTimeSharedExpense.name.trim() || !newOneTimeSharedExpense.totalCost) {
      setError('All fields are required');
      return;
    }

    const cost = parseFloat(newOneTimeSharedExpense.totalCost);
    if (isNaN(cost) || cost <= 0) {
      setError('Cost must be a positive number');
      return;
    }

    const newExpense: OneTimeSharedExpense = {
      id: crypto.randomUUID(),
      name: newOneTimeSharedExpense.name.trim(),
      totalCost: cost,
    };

    setTripState({
      ...tripState,
      oneTimeSharedExpenses: [...tripState.oneTimeSharedExpenses, newExpense]
    });

    setNewOneTimeSharedExpense({
      name: '',
      totalCost: '',
    });
    setError('');
  };

  const handleAddOneTimePersonalExpense = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!newOneTimePersonalExpense.name.trim() || !newOneTimePersonalExpense.totalCost) {
      setError('All fields are required');
      return;
    }

    const cost = parseFloat(newOneTimePersonalExpense.totalCost);
    if (isNaN(cost) || cost <= 0) {
      setError('Cost must be a positive number');
      return;
    }

    const newExpense: OneTimePersonalExpense = {
      id: crypto.randomUUID(),
      name: newOneTimePersonalExpense.name.trim(),
      totalCost: cost,
    };

    setTripState({
      ...tripState,
      oneTimePersonalExpenses: [...tripState.oneTimePersonalExpenses, newExpense]
    });

    setNewOneTimePersonalExpense({
      name: '',
      totalCost: '',
    });
    setError('');
  };

  const handleDeleteExpense = () => {
    if (!expenseToDelete) return;

    switch (expenseToDelete.type) {
      case 'dailyShared':
        setTripState({
          ...tripState,
          dailySharedExpenses: tripState.dailySharedExpenses.filter(e => e.id !== expenseToDelete.id)
        });
        break;
      case 'dailyPersonal':
        setTripState({
          ...tripState,
          dailyPersonalExpenses: tripState.dailyPersonalExpenses.filter(e => e.id !== expenseToDelete.id)
        });
        break;
      case 'oneTimeShared':
        setTripState({
          ...tripState,
          oneTimeSharedExpenses: tripState.oneTimeSharedExpenses.filter(e => e.id !== expenseToDelete.id)
        });
        break;
      case 'oneTimePersonal':
        setTripState({
          ...tripState,
          oneTimePersonalExpenses: tripState.oneTimePersonalExpenses.filter(e => e.id !== expenseToDelete.id)
        });
        break;
    }
    setExpenseToDelete(null);
  };

  const handleContinue = () => {
    router.push('/usage');
  };

  if (!mounted) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Expenses</h1>
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
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Expenses</h1>

      <Tab.Group>
        <Tab.List className="flex space-x-1 rounded-xl bg-gray-200 dark:bg-gray-800 p-1">
          {['Daily Shared', 'Daily Personal', 'One-time Shared', 'One-time Personal'].map((category) => (
            <Tab
              key={category}
              className={({ selected }) =>
                classNames(
                  'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                  'ring-white/60 ring-offset-2 ring-offset-primary-400 focus:outline-none focus:ring-2',
                  selected
                    ? 'bg-white dark:bg-gray-700 text-primary-700 dark:text-primary-400 shadow'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-white/[0.12] hover:text-primary-600 dark:hover:text-primary-400'
                )
              }
            >
              {category}
            </Tab>
          ))}
        </Tab.List>
        <Tab.Panels className="mt-6">
          <Tab.Panel className="rounded-xl bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Daily Shared Expenses</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              These are expenses that will be split among all travelers present on the given dates (e.g., accommodation, car rental).
              The total cost will be divided by the number of travelers for each day.
            </p>
            
            <form onSubmit={handleAddDailySharedExpense} className="space-y-4">
              <div>
                <label htmlFor="expenseName" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                  Expense Name
                </label>
                <input
                  type="text"
                  name="expenseName"
                  id="expenseName"
                  value={newDailySharedExpense.name}
                  onChange={(e) => setNewDailySharedExpense({ ...newDailySharedExpense, name: e.target.value })}
                  placeholder="Enter expense name"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                />
              </div>

              <div>
                <label htmlFor="totalCost" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                  Total Cost ({tripState.baseCurrency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="totalCost"
                  id="totalCost"
                  value={newDailySharedExpense.totalCost}
                  onChange={(e) => setNewDailySharedExpense({ ...newDailySharedExpense, totalCost: e.target.value })}
                  placeholder="0.00"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    id="startDate"
                    value={newDailySharedExpense.startDate}
                    min={tripState.startDate}
                    max={tripState.endDate}
                    onChange={(e) => setNewDailySharedExpense({ ...newDailySharedExpense, startDate: e.target.value })}
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
                    value={newDailySharedExpense.endDate}
                    min={tripState.startDate}
                    max={tripState.endDate}
                    onChange={(e) => setNewDailySharedExpense({ ...newDailySharedExpense, endDate: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900"
              >
                Add Daily Shared Expense
              </button>
            </form>

            <div className="mt-8 space-y-4">
              {tripState.dailySharedExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{expense.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {expense.totalCost} {tripState.baseCurrency} • {expense.startDate} to {expense.endDate}
                    </p>
                  </div>
                  <button
                    onClick={() => setExpenseToDelete({ id: expense.id, type: 'dailyShared', name: expense.name })}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </Tab.Panel>
          <Tab.Panel className="rounded-xl bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Daily Personal Expenses</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              These are expenses that each traveler will pay individually (e.g., food, personal activities).
              You&apos;ll be able to assign which travelers use these expenses in the Usage tab.
            </p>
            
            <form onSubmit={handleAddDailyPersonalExpense} className="space-y-4">
              <div>
                <label htmlFor="personalExpenseName" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                  Expense Name
                </label>
                <input
                  type="text"
                  name="personalExpenseName"
                  id="personalExpenseName"
                  value={newDailyPersonalExpense.name}
                  onChange={(e) => setNewDailyPersonalExpense({ ...newDailyPersonalExpense, name: e.target.value })}
                  placeholder="Enter expense name"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                />
              </div>

              <div>
                <label htmlFor="dailyCost" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                  Daily Cost ({tripState.baseCurrency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="dailyCost"
                  id="dailyCost"
                  value={newDailyPersonalExpense.dailyCost}
                  onChange={(e) => setNewDailyPersonalExpense({ ...newDailyPersonalExpense, dailyCost: e.target.value })}
                  placeholder="0.00"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                />
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900"
              >
                Add Daily Personal Expense
              </button>
            </form>

            <div className="mt-8 space-y-4">
              {tripState.dailyPersonalExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{expense.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {expense.dailyCost} {tripState.baseCurrency} per day
                    </p>
                  </div>
                  <button
                    onClick={() => setExpenseToDelete({ id: expense.id, type: 'dailyPersonal', name: expense.name })}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </Tab.Panel>
          <Tab.Panel className="rounded-xl bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">One-time Shared Expenses</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              These are one-time expenses that will be split among all travelers who use them (e.g., tickets, tours).
              You&apos;ll be able to assign which travelers use these expenses in the Usage tab.
            </p>
            
            <form onSubmit={handleAddOneTimeSharedExpense} className="space-y-4">
              <div>
                <label htmlFor="oneTimeSharedExpenseName" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                  Expense Name
                </label>
                <input
                  type="text"
                  name="oneTimeSharedExpenseName"
                  id="oneTimeSharedExpenseName"
                  value={newOneTimeSharedExpense.name}
                  onChange={(e) => setNewOneTimeSharedExpense({ ...newOneTimeSharedExpense, name: e.target.value })}
                  placeholder="Enter expense name"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                />
              </div>

              <div>
                <label htmlFor="oneTimeTotalCost" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                  Total Cost ({tripState.baseCurrency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="oneTimeTotalCost"
                  id="oneTimeTotalCost"
                  value={newOneTimeSharedExpense.totalCost}
                  onChange={(e) => setNewOneTimeSharedExpense({ ...newOneTimeSharedExpense, totalCost: e.target.value })}
                  placeholder="0.00"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                />
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900"
              >
                Add One-time Shared Expense
              </button>
            </form>

            <div className="mt-8 space-y-4">
              {tripState.oneTimeSharedExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{expense.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {expense.totalCost} {tripState.baseCurrency}
                    </p>
                  </div>
                  <button
                    onClick={() => setExpenseToDelete({ id: expense.id, type: 'oneTimeShared', name: expense.name })}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </Tab.Panel>
          <Tab.Panel className="rounded-xl bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">One-time Personal Expenses</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              These are one-time expenses that each traveler will pay individually (e.g., souvenirs, personal activities).
              You&apos;ll be able to assign which travelers use these expenses in the Usage tab.
            </p>
            
            <form onSubmit={handleAddOneTimePersonalExpense} className="space-y-4">
              <div>
                <label htmlFor="oneTimePersonalExpenseName" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                  Expense Name
                </label>
                <input
                  type="text"
                  name="oneTimePersonalExpenseName"
                  id="oneTimePersonalExpenseName"
                  value={newOneTimePersonalExpense.name}
                  onChange={(e) => setNewOneTimePersonalExpense({ ...newOneTimePersonalExpense, name: e.target.value })}
                  placeholder="Enter expense name"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                />
              </div>

              <div>
                <label htmlFor="oneTimePersonalTotalCost" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                  Total Cost ({tripState.baseCurrency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="oneTimePersonalTotalCost"
                  id="oneTimePersonalTotalCost"
                  value={newOneTimePersonalExpense.totalCost}
                  onChange={(e) => setNewOneTimePersonalExpense({ ...newOneTimePersonalExpense, totalCost: e.target.value })}
                  placeholder="0.00"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                />
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900"
              >
                Add One-time Personal Expense
              </button>
            </form>

            <div className="mt-8 space-y-4">
              {tripState.oneTimePersonalExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{expense.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {expense.totalCost} {tripState.baseCurrency}
                    </p>
                  </div>
                  <button
                    onClick={() => setExpenseToDelete({ id: expense.id, type: 'oneTimePersonal', name: expense.name })}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/50 p-4 mt-6">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        <button
          onClick={handleContinue}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900"
        >
          Continue to Usage
        </button>
      </div>

      <ConfirmationDialog
        isOpen={expenseToDelete !== null}
        onClose={() => setExpenseToDelete(null)}
        onConfirm={handleDeleteExpense}
        title="Delete Expense"
        message={`Are you sure you want to delete "${expenseToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </div>
  );
} 