'use client';

import { useLocalStorage } from '@/hooks/useLocalStorage';
import { TripState } from '@/types';
import { useRouter } from 'next/navigation';
import { Tab } from '@headlessui/react';
import { classNames } from '@/utils/classNames';
import { initialTripState } from '@/constants/initialState';
import { calculateDailyCost } from '@/utils/tripStateUpdates';
import { Instructions } from '@/components/Instructions';
import { instructions } from './instructions';

export default function UsagePage() {
  const router = useRouter();
  const [tripState, setTripState, isInitialized] = useLocalStorage<TripState>('tripState', initialTripState);

  if (!isInitialized) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Usage</h1>
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-8"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const handleContinue = () => {
    router.push('/budget');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Usage</h1>
      <Instructions text={instructions} />

      <Tab.Group>
        <Tab.List className="flex space-x-1 rounded-xl bg-gray-200 dark:bg-gray-800 p-1">
          {['Daily Expenses', 'One-time Expenses'].map((category) => (
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
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Daily Expenses Usage</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              For each day, select which travelers used each expense.
            </p>

            {tripState.days.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500 dark:text-gray-400">No days in the trip yet.</p>
              </div>
            ) : (
              <div className="space-y-12">
                {tripState.days.map((day, index) => (
                  <div key={day.date} className="border-t border-gray-200 dark:border-gray-700 pt-8">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{day.date}</h3>
                      {index > 0 && (
                        <button
                          onClick={() => {
                            const previousDay = tripState.days[index - 1];
                            const previousDayExpenses = tripState.usageCosts.days[previousDay.id];
                            if (!previousDayExpenses) return;

                            setTripState(prev => {
                              const newUsageCosts = {
                                ...prev.usageCosts,
                                days: {
                                  ...prev.usageCosts.days,
                                  [day.id]: {
                                    ...prev.usageCosts.days[day.id] ?? {},
                                    dailyShared: {
                                      ...previousDayExpenses.dailyShared ?? {}
                                    },
                                    dailyPersonal: {
                                      ...previousDayExpenses.dailyPersonal ?? {}
                                    }
                                  }
                                }
                              };

                              // Filter out travelers that are not present on this day
                              Object.entries(newUsageCosts.days[day.id].dailyShared ?? {}).forEach(([expenseId, travelerIds]) => {
                                newUsageCosts.days[day.id].dailyShared[expenseId] = travelerIds.filter(travelerId => {
                                  const traveler = tripState.travelers.find(t => t.id === travelerId);
                                  return traveler && 
                                    new Date(day.date) >= new Date(traveler.startDate) && 
                                    new Date(day.date) <= new Date(traveler.endDate);
                                });
                              });

                              Object.entries(newUsageCosts.days[day.id].dailyPersonal ?? {}).forEach(([expenseId, travelerIds]) => {
                                newUsageCosts.days[day.id].dailyPersonal[expenseId] = travelerIds.filter(travelerId => {
                                  const traveler = tripState.travelers.find(t => t.id === travelerId);
                                  return traveler && 
                                    new Date(day.date) >= new Date(traveler.startDate) && 
                                    new Date(day.date) <= new Date(traveler.endDate);
                                });
                              });

                              return { ...prev, usageCosts: newUsageCosts };
                            });
                          }}
                          className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                        >
                          Copy from previous day
                        </button>
                      )}
                    </div>
                    
                    {/* Daily Shared Expenses */}
                    <div className="mb-8">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">Shared Expenses</h4>
                      {tripState.dailySharedExpenses.some(expense => 
                        new Date(day.date) >= new Date(expense.startDate) && 
                        new Date(day.date) <= new Date(expense.endDate)
                      ) ? (
                        <div className="space-y-4">
                          {tripState.dailySharedExpenses.map((expense) => {
                            const isExpenseActive = new Date(day.date) >= new Date(expense.startDate) && 
                                                  new Date(day.date) <= new Date(expense.endDate);
                            if (!isExpenseActive) return null;

                            return (
                              <div key={expense.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                                <div className="flex justify-between items-start mb-4">
                                  <div>
                                    <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100">{expense.name}</h5>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      {(() => {
                                        const dailyCost = calculateDailyCost(expense.totalCost, expense.startDate, expense.endDate);
                                        const days = Math.ceil((new Date(expense.endDate).getTime() - new Date(expense.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                        return `${dailyCost.toFixed(2)} ${tripState.baseCurrency} per day (${expense.totalCost} ${tripState.baseCurrency} total over ${days} days)`;
                                      })()}
                                    </p>
                                  </div>
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => {
                                        // Select all travelers
                                        setTripState(prev => {
                                          const newDays = prev.days.map(d => {
                                            if (d.date !== day.date) return d;
                                            return d;
                                          });

                                          // Get all travelers present on this day
                                          const presentTravelers = tripState.travelers
                                            .filter(traveler => 
                                              new Date(day.date) >= new Date(traveler.startDate) && 
                                              new Date(day.date) <= new Date(traveler.endDate)
                                            )
                                            .map(t => t.id);

                                          const newUsageCosts = {
                                            ...prev.usageCosts,
                                            days: {
                                              ...prev.usageCosts.days,
                                              [day.id]: {
                                                ...prev.usageCosts.days[day.id] ?? {},
                                                dailyShared: {
                                                  ...prev.usageCosts.days[day.id]?.dailyShared ?? {},
                                                  [expense.id]: presentTravelers
                                                },
                                                dailyPersonal: prev.usageCosts.days[day.id]?.dailyPersonal ?? {}
                                              }
                                            }
                                          };

                                          return { ...prev, days: newDays, usageCosts: newUsageCosts };
                                        });
                                      }}
                                      className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                                    >
                                      Select All
                                    </button>
                                    <button
                                      onClick={() => {
                                        // Clear all travelers
                                        setTripState(prev => {
                                          const newDays = prev.days.map(d => {
                                            if (d.date !== day.date) return d;
                                            return d;
                                          });

                                          const newUsageCosts = {
                                            ...prev.usageCosts,
                                            days: {
                                              ...prev.usageCosts.days,
                                              [day.id]: {
                                                ...prev.usageCosts.days[day.id] ?? {},
                                                dailyPersonal: {
                                                  ...prev.usageCosts.days[day.id]?.dailyPersonal ?? {},
                                                  [expense.id]: []
                                                },
                                                dailyShared: prev.usageCosts.days[day.id]?.dailyShared ?? {}
                                              }
                                            }
                                          };

                                          return { ...prev, days: newDays, usageCosts: newUsageCosts };
                                        });
                                      }}
                                      className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                                    >
                                      Clear
                                    </button>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  {tripState.travelers.map((traveler) => {
                                    const isTravelerPresent = new Date(day.date) >= new Date(traveler.startDate) && 
                                                            new Date(day.date) <= new Date(traveler.endDate);
                                    if (!isTravelerPresent) return null;

                                    return (
                                      <label key={traveler.id} className="flex items-center space-x-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer">
                                        <input
                                          type="checkbox"
                                          className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 dark:focus:ring-offset-gray-900"
                                          checked={tripState.usageCosts.days[day.id]?.dailyShared[expense.id]?.includes(traveler.id) ?? false}
                                          onChange={(e) => {
                                            const isChecked = e.target.checked;
                                            setTripState(prev => {
                                              const newDays = prev.days.map(d => {
                                                if (d.date !== day.date) return d;
                                                return d;
                                              });

                                              const newUsageCosts = {
                                                ...prev.usageCosts,
                                                days: {
                                                  ...prev.usageCosts.days,
                                                  [day.id]: {
                                                    dailyShared: {
                                                      ...prev.usageCosts.days[day.id]?.dailyShared ?? {},
                                                      [expense.id]: isChecked 
                                                        ? [...(prev.usageCosts.days[day.id]?.dailyShared[expense.id] ?? []), traveler.id]
                                                        : (prev.usageCosts.days[day.id]?.dailyShared[expense.id] ?? []).filter(id => id !== traveler.id)
                                                    },
                                                    dailyPersonal: prev.usageCosts.days[day.id]?.dailyPersonal ?? {}
                                                  }
                                                }
                                              };

                                              return { ...prev, days: newDays, usageCosts: newUsageCosts };
                                            });
                                          }}
                                        />
                                        <span className="text-sm text-gray-900 dark:text-gray-100">
                                          {traveler.name}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <p className="text-sm text-gray-500 dark:text-gray-400">No shared expenses active for this day.</p>
                        </div>
                      )}
                    </div>

                    {/* Daily Personal Expenses */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">Personal Expenses</h4>
                      {tripState.dailyPersonalExpenses.length > 0 ? (
                        <div className="space-y-4">
                          {tripState.dailyPersonalExpenses.map((expense) => (
                            <div key={expense.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100">{expense.name}</h5>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {expense.dailyCost} {tripState.baseCurrency} per person per day
                                  </p>
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => {
                                      // Select all travelers
                                      setTripState(prev => {
                                        const newDays = prev.days.map(d => {
                                          if (d.date !== day.date) return d;
                                          return d;
                                        });

                                        // Get all travelers present on this day
                                        const presentTravelers = tripState.travelers
                                          .filter(traveler => 
                                            new Date(day.date) >= new Date(traveler.startDate) && 
                                            new Date(day.date) <= new Date(traveler.endDate)
                                          )
                                          .map(t => t.id);

                                        const newUsageCosts = {
                                          ...prev.usageCosts,
                                          days: {
                                            ...prev.usageCosts.days,
                                            [day.id]: {
                                              dailyShared: prev.usageCosts.days[day.id]?.dailyShared ?? {},
                                              dailyPersonal: {
                                                ...prev.usageCosts.days[day.id]?.dailyPersonal ?? {},
                                                [expense.id]: presentTravelers
                                              }
                                            }
                                          }
                                        };

                                        return { ...prev, days: newDays, usageCosts: newUsageCosts };
                                      });
                                    }}
                                    className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                                  >
                                    Select All
                                  </button>
                                  <button
                                    onClick={() => {
                                      // Clear all travelers
                                      setTripState(prev => {
                                        const newDays = prev.days.map(d => {
                                          if (d.date !== day.date) return d;
                                          return d;
                                        });

                                        const newUsageCosts = {
                                          ...prev.usageCosts,
                                          days: {
                                            ...prev.usageCosts.days,
                                            [day.id]: {
                                              ...prev.usageCosts.days[day.id] ?? {},
                                              dailyPersonal: {
                                                ...prev.usageCosts.days[day.id]?.dailyPersonal ?? {},
                                                [expense.id]: []
                                              },
                                              dailyShared: prev.usageCosts.days[day.id]?.dailyShared ?? {}
                                            }
                                          }
                                        };

                                        return { ...prev, days: newDays, usageCosts: newUsageCosts };
                                      });
                                    }}
                                    className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                                  >
                                    Clear
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {tripState.travelers.map((traveler) => {
                                  const isTravelerPresent = new Date(day.date) >= new Date(traveler.startDate) && 
                                                          new Date(day.date) <= new Date(traveler.endDate);
                                  if (!isTravelerPresent) return null;

                                  return (
                                    <label key={traveler.id} className="flex items-center space-x-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer">
                                      <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 dark:focus:ring-offset-gray-900"
                                        checked={tripState.usageCosts.days[day.id]?.dailyPersonal[expense.id]?.includes(traveler.id) ?? false}
                                        onChange={(e) => {
                                          const isChecked = e.target.checked;
                                          setTripState(prev => {
                                            const newDays = prev.days.map(d => {
                                              if (d.date !== day.date) return d;
                                              return d;
                                            });

                                            const newUsageCosts = {
                                              ...prev.usageCosts,
                                              days: {
                                                ...prev.usageCosts.days,
                                                [day.id]: {
                                                  dailyShared: prev.usageCosts.days[day.id]?.dailyShared ?? {},
                                                  dailyPersonal: {
                                                    ...prev.usageCosts.days[day.id]?.dailyPersonal ?? {},
                                                    [expense.id]: isChecked 
                                                      ? [...(prev.usageCosts.days[day.id]?.dailyPersonal[expense.id] ?? []), traveler.id]
                                                      : (prev.usageCosts.days[day.id]?.dailyPersonal[expense.id] ?? []).filter(id => id !== traveler.id)
                                                  }
                                                }
                                              }
                                            };

                                            return { ...prev, days: newDays, usageCosts: newUsageCosts };
                                          });
                                        }}
                                      />
                                      <span className="text-sm text-gray-900 dark:text-gray-100">
                                        {traveler.name}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <p className="text-sm text-gray-500 dark:text-gray-400">No personal expenses added yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Tab.Panel>

          <Tab.Panel className="rounded-xl bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700">
            <div className="space-y-12">
              {/* One-time Shared Expenses */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">One-time Shared Expenses</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Select which travelers will share each one-time expense. The total cost will be split equally among selected travelers.
                </p>

                {tripState.oneTimeSharedExpenses.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No one-time shared expenses added yet.</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {tripState.oneTimeSharedExpenses.map((expense) => (
                      <div key={expense.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{expense.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {expense.totalCost} {tripState.baseCurrency} total
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                // Select all travelers
                                setTripState(prev => ({
                                  ...prev,
                                  usageCosts: {
                                    ...prev.usageCosts,
                                    oneTimeShared: {
                                      ...prev.usageCosts.oneTimeShared,
                                      [expense.id]: tripState.travelers.map(t => t.id)
                                    }
                                  }
                                }));
                              }}
                              className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                            >
                              Select All
                            </button>
                            <button
                              onClick={() => {
                                // Clear all travelers
                                setTripState(prev => ({
                                  ...prev,
                                  usageCosts: {
                                    ...prev.usageCosts,
                                    oneTimeShared: {
                                      ...prev.usageCosts.oneTimeShared,
                                      [expense.id]: []
                                    }
                                  }
                                }));
                              }}
                              className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {tripState.travelers.map((traveler) => (
                            <label key={traveler.id} className="flex items-center space-x-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 dark:focus:ring-offset-gray-900"
                                checked={tripState.usageCosts.oneTimeShared[expense.id]?.includes(traveler.id) ?? false}
                                onChange={(e) => {
                                  const isChecked = e.target.checked;
                                  setTripState(prev => {
                                    const newUsageCosts = {
                                      ...prev.usageCosts,
                                      oneTimeShared: {
                                        ...prev.usageCosts.oneTimeShared
                                      }
                                    };
                                    
                                    if (!newUsageCosts.oneTimeShared[expense.id]) {
                                      newUsageCosts.oneTimeShared[expense.id] = [];
                                    }

                                    if (isChecked) {
                                      newUsageCosts.oneTimeShared[expense.id] = [...newUsageCosts.oneTimeShared[expense.id], traveler.id];
                                    } else {
                                      newUsageCosts.oneTimeShared[expense.id] = newUsageCosts.oneTimeShared[expense.id].filter(id => id !== traveler.id);
                                    }

                                    return { ...prev, usageCosts: newUsageCosts };
                                  });
                                }}
                              />
                              <span className="text-sm text-gray-900 dark:text-gray-100">
                                {traveler.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* One-time Personal Expenses */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">One-time Personal Expenses</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Select which travelers will use each one-time personal expense. Each selected traveler will pay the full amount.
                </p>

                {tripState.oneTimePersonalExpenses.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No one-time personal expenses added yet.</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {tripState.oneTimePersonalExpenses.map((expense) => (
                      <div key={expense.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{expense.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {expense.totalCost} {tripState.baseCurrency} per person
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                // Select all travelers
                                setTripState(prev => ({
                                  ...prev,
                                  usageCosts: {
                                    ...prev.usageCosts,
                                    oneTimePersonal: {
                                      ...prev.usageCosts.oneTimePersonal,
                                      [expense.id]: tripState.travelers.map(t => t.id)
                                    }
                                  }
                                }));
                              }}
                              className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                            >
                              Select All
                            </button>
                            <button
                              onClick={() => {
                                // Clear all travelers
                                setTripState(prev => ({
                                  ...prev,
                                  usageCosts: {
                                    ...prev.usageCosts,
                                    oneTimePersonal: {
                                      ...prev.usageCosts.oneTimePersonal,
                                      [expense.id]: []
                                    }
                                  }
                                }));
                              }}
                              className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {tripState.travelers.map((traveler) => (
                            <label key={traveler.id} className="flex items-center space-x-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 dark:focus:ring-offset-gray-900"
                                checked={tripState.usageCosts.oneTimePersonal[expense.id]?.includes(traveler.id) ?? false}
                                onChange={(e) => {
                                  const isChecked = e.target.checked;
                                  setTripState(prev => {
                                    const newUsageCosts = {
                                      ...prev.usageCosts,
                                      oneTimePersonal: {
                                        ...prev.usageCosts.oneTimePersonal
                                      }
                                    };
                                    
                                    if (!newUsageCosts.oneTimePersonal[expense.id]) {
                                      newUsageCosts.oneTimePersonal[expense.id] = [];
                                    }

                                    if (isChecked) {
                                      newUsageCosts.oneTimePersonal[expense.id] = [...newUsageCosts.oneTimePersonal[expense.id], traveler.id];
                                    } else {
                                      newUsageCosts.oneTimePersonal[expense.id] = newUsageCosts.oneTimePersonal[expense.id].filter(id => id !== traveler.id);
                                    }

                                    return { ...prev, usageCosts: newUsageCosts };
                                  });
                                }}
                              />
                              <span className="text-sm text-gray-900 dark:text-gray-100">
                                {traveler.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>

      <div className="mt-8">
        <button
          onClick={handleContinue}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900"
        >
          Continue to Budget
        </button>
      </div>
    </div>
  );
} 