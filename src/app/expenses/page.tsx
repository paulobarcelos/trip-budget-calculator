'use client';

import { useLocalStorage } from '@/hooks/useLocalStorage';
import { TripState, DailySharedExpense, DailyPersonalExpense, OneTimeSharedExpense, OneTimePersonalExpense } from '@/types';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tab } from '@headlessui/react';
import { classNames } from '@/utils/classNames';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { initialTripState } from '@/constants/initialState';
import { currencies } from '@/data/currencies';
import { Instructions } from '@/components/Instructions';
import { instructions } from './instructions';
import { getDayCount, calculateDailyCost, removeExpense } from '@/utils/tripStateUpdates';
import { shiftDate } from '@/utils/dateMath';
import { migrateState } from '@/utils/stateMigrations';
import { decodeState } from '@/utils/stateEncoding';

type CurrencySelectProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

function CurrencySelect({ value, onChange, className }: CurrencySelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      {currencies.map((currency) => (
        <option key={currency.code} value={currency.code}>
          {currency.code} - {currency.name}
        </option>
      ))}
    </select>
  );
}

export default function ExpensesPage() {
  const router = useRouter();
  const [tripState, setTripState, isInitialized] = useLocalStorage<TripState>('tripState', initialTripState, {
    migrate: migrateState,
    decodeFromUrl: decodeState,
  });
  const [error, setError] = useState('');
  const [expenseToDelete, setExpenseToDelete] = useState<{
    id: string;
    type: 'dailyShared' | 'dailyPersonal' | 'oneTimeShared' | 'oneTimePersonal';
    name: string;
  } | null>(null);

  const [expenseToEdit, setExpenseToEdit] = useState<{
    id: string;
    type: 'dailyShared' | 'dailyPersonal' | 'oneTimeShared' | 'oneTimePersonal';
  } | null>(null);

  // Daily Shared Expense form state
  const [newDailySharedExpense, setNewDailySharedExpense] = useState({
    name: '',
    totalCost: '',
    startDate: tripState.startDate,
    endDate: tripState.endDate,
    currency: 'USD',
  });
  const formStartDateMax = useMemo(
    () => shiftDate(newDailySharedExpense.endDate, -1),
    [newDailySharedExpense.endDate]
  );
  const formEndDateMin = useMemo(
    () => shiftDate(newDailySharedExpense.startDate, 1),
    [newDailySharedExpense.startDate]
  );

  // Daily Personal Expense form state
  const [newDailyPersonalExpense, setNewDailyPersonalExpense] = useState({
    name: '',
    dailyCost: '',
    currency: 'USD',
  });

  // One-time Shared Expense form state
  const [newOneTimeSharedExpense, setNewOneTimeSharedExpense] = useState({
    name: '',
    totalCost: '',
    currency: 'USD',
  });

  // One-time Personal Expense form state
  const [newOneTimePersonalExpense, setNewOneTimePersonalExpense] = useState({
    name: '',
    totalCost: '',
    currency: 'USD',
  });

  const handleAddDailySharedExpense = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const totalCost = parseFloat(newDailySharedExpense.totalCost);
    if (isNaN(totalCost)) {
      setError('Please enter a valid cost');
      return;
    }
    
    if (!newDailySharedExpense.name.trim() || !newDailySharedExpense.totalCost || !newDailySharedExpense.startDate || !newDailySharedExpense.endDate) {
      setError('All fields are required');
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

    const expense: DailySharedExpense = {
      id: crypto.randomUUID(),
      name: newDailySharedExpense.name.trim(),
      totalCost,
      startDate: newDailySharedExpense.startDate,
      endDate: newDailySharedExpense.endDate,
      currency: newDailySharedExpense.currency,
    };

    setTripState({
      ...tripState,
      dailySharedExpenses: [...tripState.dailySharedExpenses, expense]
    });

    setNewDailySharedExpense({
      name: '',
      totalCost: '',
      startDate: tripState.startDate,
      endDate: tripState.endDate,
      currency: 'USD',
    });
    setError('');
  };

  const handleAddDailyPersonalExpense = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const dailyCost = parseFloat(newDailyPersonalExpense.dailyCost);
    if (isNaN(dailyCost)) {
      setError('Please enter a valid cost');
      return;
    }

    if (!newDailyPersonalExpense.name.trim() || !newDailyPersonalExpense.dailyCost) {
      setError('All fields are required');
      return;
    }

    const expense: DailyPersonalExpense = {
      id: crypto.randomUUID(),
      name: newDailyPersonalExpense.name.trim(),
      dailyCost,
      currency: newDailyPersonalExpense.currency,
    };

    setTripState({
      ...tripState,
      dailyPersonalExpenses: [...tripState.dailyPersonalExpenses, expense]
    });

    setNewDailyPersonalExpense({
      name: '',
      dailyCost: '',
      currency: 'USD',
    });
    setError('');
  };

  const handleAddOneTimeSharedExpense = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const totalCost = parseFloat(newOneTimeSharedExpense.totalCost);
    if (isNaN(totalCost)) {
      setError('Please enter a valid cost');
      return;
    }

    if (!newOneTimeSharedExpense.name.trim() || !newOneTimeSharedExpense.totalCost) {
      setError('All fields are required');
      return;
    }

    const expense: OneTimeSharedExpense = {
      id: crypto.randomUUID(),
      name: newOneTimeSharedExpense.name.trim(),
      totalCost,
      currency: newOneTimeSharedExpense.currency,
    };

    setTripState({
      ...tripState,
      oneTimeSharedExpenses: [...tripState.oneTimeSharedExpenses, expense]
    });

    setNewOneTimeSharedExpense({
      name: '',
      totalCost: '',
      currency: 'USD',
    });
    setError('');
  };

  const handleAddOneTimePersonalExpense = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const totalCost = parseFloat(newOneTimePersonalExpense.totalCost);
    if (isNaN(totalCost)) {
      setError('Please enter a valid cost');
      return;
    }

    if (!newOneTimePersonalExpense.name.trim() || !newOneTimePersonalExpense.totalCost) {
      setError('All fields are required');
      return;
    }

    const expense: OneTimePersonalExpense = {
      id: crypto.randomUUID(),
      name: newOneTimePersonalExpense.name.trim(),
      totalCost,
      currency: newOneTimePersonalExpense.currency,
    };

    setTripState({
      ...tripState,
      oneTimePersonalExpenses: [...tripState.oneTimePersonalExpenses, expense]
    });

    setNewOneTimePersonalExpense({
      name: '',
      totalCost: '',
      currency: 'USD',
    });
    setError('');
  };

  const handleDeleteExpense = () => {
    if (!expenseToDelete) return;

    setTripState(prev => removeExpense(prev, expenseToDelete.id, expenseToDelete.type));
    setExpenseToDelete(null);
  };

  const handleContinue = () => {
    router.push('/usage');
  };

  const handleEditDailySharedExpense = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!expenseToEdit || expenseToEdit.type !== 'dailyShared') return;
    
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

    const updatedExpense: DailySharedExpense = {
      id: expenseToEdit.id,
      name: newDailySharedExpense.name.trim(),
      totalCost: cost,
      startDate: newDailySharedExpense.startDate,
      endDate: newDailySharedExpense.endDate,
      currency: newDailySharedExpense.currency,
    };

    setTripState({
      ...tripState,
      dailySharedExpenses: tripState.dailySharedExpenses.map(expense => 
        expense.id === expenseToEdit.id ? updatedExpense : expense
      )
    });

    setNewDailySharedExpense({
      name: '',
      totalCost: '',
      startDate: tripState.startDate,
      endDate: tripState.endDate,
      currency: 'USD',
    });
    setExpenseToEdit(null);
    setError('');
  };

  const handleEditDailyPersonalExpense = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!expenseToEdit || expenseToEdit.type !== 'dailyPersonal') return;
    
    if (!newDailyPersonalExpense.name.trim() || !newDailyPersonalExpense.dailyCost) {
      setError('All fields are required');
      return;
    }

    const cost = parseFloat(newDailyPersonalExpense.dailyCost);
    if (isNaN(cost) || cost <= 0) {
      setError('Cost must be a positive number');
      return;
    }

    const updatedExpense: DailyPersonalExpense = {
      id: expenseToEdit.id,
      name: newDailyPersonalExpense.name.trim(),
      dailyCost: cost,
      currency: newDailyPersonalExpense.currency,
    };

    setTripState({
      ...tripState,
      dailyPersonalExpenses: tripState.dailyPersonalExpenses.map(expense => 
        expense.id === expenseToEdit.id ? updatedExpense : expense
      )
    });

    setNewDailyPersonalExpense({
      name: '',
      dailyCost: '',
      currency: 'USD',
    });
    setExpenseToEdit(null);
    setError('');
  };

  const handleEditOneTimeSharedExpense = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!expenseToEdit || expenseToEdit.type !== 'oneTimeShared') return;
    
    if (!newOneTimeSharedExpense.name.trim() || !newOneTimeSharedExpense.totalCost) {
      setError('All fields are required');
      return;
    }

    const cost = parseFloat(newOneTimeSharedExpense.totalCost);
    if (isNaN(cost) || cost <= 0) {
      setError('Cost must be a positive number');
      return;
    }

    const updatedExpense: OneTimeSharedExpense = {
      id: expenseToEdit.id,
      name: newOneTimeSharedExpense.name.trim(),
      totalCost: cost,
      currency: newOneTimeSharedExpense.currency,
    };

    setTripState({
      ...tripState,
      oneTimeSharedExpenses: tripState.oneTimeSharedExpenses.map(expense => 
        expense.id === expenseToEdit.id ? updatedExpense : expense
      )
    });

    setNewOneTimeSharedExpense({
      name: '',
      totalCost: '',
      currency: 'USD',
    });
    setExpenseToEdit(null);
    setError('');
  };

  const handleEditOneTimePersonalExpense = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!expenseToEdit || expenseToEdit.type !== 'oneTimePersonal') return;
    
    if (!newOneTimePersonalExpense.name.trim() || !newOneTimePersonalExpense.totalCost) {
      setError('All fields are required');
      return;
    }

    const cost = parseFloat(newOneTimePersonalExpense.totalCost);
    if (isNaN(cost) || cost <= 0) {
      setError('Cost must be a positive number');
      return;
    }

    const updatedExpense: OneTimePersonalExpense = {
      id: expenseToEdit.id,
      name: newOneTimePersonalExpense.name.trim(),
      totalCost: cost,
      currency: newOneTimePersonalExpense.currency,
    };

    setTripState({
      ...tripState,
      oneTimePersonalExpenses: tripState.oneTimePersonalExpenses.map(expense => 
        expense.id === expenseToEdit.id ? updatedExpense : expense
      )
    });

    setNewOneTimePersonalExpense({
      name: '',
      totalCost: '',
      currency: 'USD',
    });
    setExpenseToEdit(null);
    setError('');
  };

  const startEditing = (expense: DailySharedExpense | DailyPersonalExpense | OneTimeSharedExpense | OneTimePersonalExpense, type: 'dailyShared' | 'dailyPersonal' | 'oneTimeShared' | 'oneTimePersonal') => {
    setExpenseToEdit({ id: expense.id, type });
    setError('');

    switch (type) {
      case 'dailyShared':
        const dailyShared = expense as DailySharedExpense;
        setNewDailySharedExpense({
          name: dailyShared.name,
          totalCost: dailyShared.totalCost.toString(),
          startDate: dailyShared.startDate,
          endDate: dailyShared.endDate,
          currency: dailyShared.currency,
        });
        break;
      case 'dailyPersonal':
        const dailyPersonal = expense as DailyPersonalExpense;
        setNewDailyPersonalExpense({
          name: dailyPersonal.name,
          dailyCost: dailyPersonal.dailyCost.toString(),
          currency: dailyPersonal.currency,
        });
        break;
      case 'oneTimeShared':
        const oneTimeShared = expense as OneTimeSharedExpense;
        setNewOneTimeSharedExpense({
          name: oneTimeShared.name,
          totalCost: oneTimeShared.totalCost.toString(),
          currency: oneTimeShared.currency,
        });
        break;
      case 'oneTimePersonal':
        const oneTimePersonal = expense as OneTimePersonalExpense;
        setNewOneTimePersonalExpense({
          name: oneTimePersonal.name,
          totalCost: oneTimePersonal.totalCost.toString(),
          currency: oneTimePersonal.currency,
        });
        break;
    }
  };

  const cancelEditing = () => {
    setExpenseToEdit(null);
    setError('');
    
    setNewDailySharedExpense({
      name: '',
      totalCost: '',
      startDate: tripState.startDate,
      endDate: tripState.endDate,
      currency: 'USD',
    });
    setNewDailyPersonalExpense({
      name: '',
      dailyCost: '',
      currency: 'USD',
    });
    setNewOneTimeSharedExpense({
      name: '',
      totalCost: '',
      currency: 'USD',
    });
    setNewOneTimePersonalExpense({
      name: '',
      totalCost: '',
      currency: 'USD',
    });
  };

  if (!isInitialized) {
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
      <Instructions text={instructions} />

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
            
            <form onSubmit={expenseToEdit?.type === 'dailyShared' ? handleEditDailySharedExpense : handleAddDailySharedExpense} className="space-y-4">
              <div>
                <label htmlFor="sharedExpenseName" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                  Expense Name
                </label>
                <input
                  type="text"
                  name="sharedExpenseName"
                  id="sharedExpenseName"
                  value={newDailySharedExpense.name}
                  onChange={(e) => setNewDailySharedExpense({ ...newDailySharedExpense, name: e.target.value })}
                  placeholder="Enter expense name"
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
                  min={tripState.startDate || undefined}
                  max={(formStartDateMax ?? tripState.endDate) ?? undefined}
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
                  min={(formEndDateMin ?? shiftDate(tripState.startDate, 1) ?? tripState.startDate) ?? undefined}
                  max={tripState.endDate || undefined}
                  onChange={(e) => setNewDailySharedExpense({ ...newDailySharedExpense, endDate: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                />
              </div>
            </div>

            {newDailySharedExpense.startDate && newDailySharedExpense.endDate && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {(() => {
                  const days = getDayCount(newDailySharedExpense.startDate, newDailySharedExpense.endDate);
                  return `Total days: ${days}`;
                })()}
              </div>
            )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="totalCost" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                    Total Cost ({newDailySharedExpense.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="totalCost"
                    id="totalCost"
                    value={newDailySharedExpense.totalCost}
                    onChange={(e) => {
                      const totalCost = parseFloat(e.target.value);
                      setNewDailySharedExpense({ 
                        ...newDailySharedExpense, 
                        totalCost: isNaN(totalCost) ? '' : e.target.value 
                      });
                    }}
                    placeholder="0.00"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                  />
                </div>

                <div>
                <label htmlFor="dailyCost" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                  Cost per Day ({newDailySharedExpense.currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="dailyCost"
                  id="dailyCost"
                  value={(() => {
                    if (!newDailySharedExpense.startDate || !newDailySharedExpense.endDate || !newDailySharedExpense.totalCost) return '';
                    const days = getDayCount(newDailySharedExpense.startDate, newDailySharedExpense.endDate);
                    if (days <= 0) return '';
                    return (parseFloat(newDailySharedExpense.totalCost) / days).toFixed(2);
                  })()}
                  onChange={(e) => {
                    if (!newDailySharedExpense.startDate || !newDailySharedExpense.endDate) return;
                    const dailyCost = parseFloat(e.target.value);
                    if (isNaN(dailyCost)) {
                        setNewDailySharedExpense({ 
                          ...newDailySharedExpense, 
                        totalCost: '' 
                      });
                      return;
                    }
                    const days = getDayCount(newDailySharedExpense.startDate, newDailySharedExpense.endDate);
                    if (days <= 0) return;
                    setNewDailySharedExpense({ 
                      ...newDailySharedExpense, 
                      totalCost: (dailyCost * days).toString()
                    });
                  }}
                    placeholder="0.00"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <CurrencySelect
                  value={newDailySharedExpense.currency}
                  onChange={(value) => setNewDailySharedExpense({ ...newDailySharedExpense, currency: value })}
                  className="block w-32 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:text-gray-100 sm:text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900"
              >
                {expenseToEdit?.type === 'dailyShared' ? 'Save Changes' : 'Add Daily Shared Expense'}
              </button>
              {expenseToEdit?.type === 'dailyShared' && (
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900"
                >
                  Cancel
                </button>
              )}
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
                      {(() => {
                        const days = getDayCount(expense.startDate, expense.endDate);
                        const dailyCost = calculateDailyCost(expense.totalCost, expense.startDate, expense.endDate);
                        const safeDays = days > 0 ? days : 1;
                        return `${expense.totalCost} ${expense.currency} total • ${dailyCost.toFixed(2)} ${expense.currency} per day • ${safeDays} days (${expense.startDate} → ${expense.endDate} departure)`;
                      })()}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => startEditing(expense, 'dailyShared')}
                      className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setExpenseToDelete({ id: expense.id, type: 'dailyShared', name: expense.name })}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
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
            
            <form onSubmit={expenseToEdit?.type === 'dailyPersonal' ? handleEditDailyPersonalExpense : handleAddDailyPersonalExpense} className="space-y-4">
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

              <div className="flex gap-2">
                <label htmlFor="dailyCost" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                  Daily Cost ({newDailyPersonalExpense.currency})
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
                <CurrencySelect
                  value={newDailyPersonalExpense.currency}
                  onChange={(value) => setNewDailyPersonalExpense({ ...newDailyPersonalExpense, currency: value })}
                  className="block w-32 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:text-gray-100 sm:text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900"
              >
                {expenseToEdit?.type === 'dailyPersonal' ? 'Save Changes' : 'Add Daily Personal Expense'}
              </button>
              {expenseToEdit?.type === 'dailyPersonal' && (
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900"
                >
                  Cancel
                </button>
              )}
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
                      {expense.dailyCost} {expense.currency} per day
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => startEditing(expense, 'dailyPersonal')}
                      className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setExpenseToDelete({ id: expense.id, type: 'dailyPersonal', name: expense.name })}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
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
            
            <form onSubmit={expenseToEdit?.type === 'oneTimeShared' ? handleEditOneTimeSharedExpense : handleAddOneTimeSharedExpense} className="space-y-4">
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

              <div className="flex gap-2">
                <label htmlFor="oneTimeTotalCost" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                  Total Cost ({newOneTimeSharedExpense.currency})
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
                <CurrencySelect
                  value={newOneTimeSharedExpense.currency}
                  onChange={(value) => setNewOneTimeSharedExpense({ ...newOneTimeSharedExpense, currency: value })}
                  className="block w-32 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:text-gray-100 sm:text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900"
              >
                {expenseToEdit?.type === 'oneTimeShared' ? 'Save Changes' : 'Add One-time Shared Expense'}
              </button>
              {expenseToEdit?.type === 'oneTimeShared' && (
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900"
                >
                  Cancel
                </button>
              )}
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
                      {expense.totalCost} {expense.currency}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => startEditing(expense, 'oneTimeShared')}
                      className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setExpenseToDelete({ id: expense.id, type: 'oneTimeShared', name: expense.name })}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
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
            
            <form onSubmit={expenseToEdit?.type === 'oneTimePersonal' ? handleEditOneTimePersonalExpense : handleAddOneTimePersonalExpense} className="space-y-4">
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

              <div className="flex gap-2">
                <label htmlFor="oneTimePersonalTotalCost" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                  Total Cost ({newOneTimePersonalExpense.currency})
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
                <CurrencySelect
                  value={newOneTimePersonalExpense.currency}
                  onChange={(value) => setNewOneTimePersonalExpense({ ...newOneTimePersonalExpense, currency: value })}
                  className="block w-32 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:text-gray-100 sm:text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900"
              >
                {expenseToEdit?.type === 'oneTimePersonal' ? 'Save Changes' : 'Add One-time Personal Expense'}
              </button>
              {expenseToEdit?.type === 'oneTimePersonal' && (
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900"
                >
                  Cancel
                </button>
              )}
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
                      {expense.totalCost} {expense.currency}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => startEditing(expense, 'oneTimePersonal')}
                      className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setExpenseToDelete({ id: expense.id, type: 'oneTimePersonal', name: expense.name })}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
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
