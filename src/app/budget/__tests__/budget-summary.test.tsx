import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderWithProviders } from '@/test/renderWithProviders';
import BudgetPage from '../page';
import { TripState } from '@/types';
import { screen, waitFor } from '@testing-library/react';

const baseTripState: TripState = {
  version: 1,
  startDate: '2024-01-01',
  endDate: '2024-01-04',
  travelers: [
    { id: 't1', name: 'Alice', startDate: '2024-01-01', endDate: '2024-01-04' },
    { id: 't2', name: 'Bob', startDate: '2024-01-01', endDate: '2024-01-04' },
  ],
  dailySharedExpenses: [
    {
      id: 'hotel',
      name: 'Hotel',
      currency: 'USD',
      totalCost: 300,
      startDate: '2024-01-01',
      endDate: '2024-01-04',
      splitMode: 'stayWeighted',
    },
  ],
  dailyPersonalExpenses: [
    { id: 'lunch', name: 'Lunch', currency: 'USD', dailyCost: 30 },
  ],
  oneTimeSharedExpenses: [
    { id: 'flight', name: 'Flight', currency: 'EUR', totalCost: 200 },
  ],
  oneTimePersonalExpenses: [],
  days: [],
  usageCosts: {
    oneTimeShared: { flight: ['t1', 't2'] },
    oneTimePersonal: {},
    days: {
      '2024-01-01': {
        dailyShared: { hotel: ['t1', 't2'] },
        dailyPersonal: { lunch: ['t1', 't2'] },
      },
      '2024-01-02': {
        dailyShared: { hotel: ['t1', 't2'] },
        dailyPersonal: { lunch: ['t1', 't2'] },
      },
      '2024-01-03': {
        dailyShared: { hotel: ['t1', 't2'] },
        dailyPersonal: { lunch: ['t1', 't2'] },
      },
    },
  },
  displayCurrency: 'USD',
};

let tripState: TripState;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/hooks/useLocalStorage', () => {
  const React = require('react');
  return {
    useLocalStorage: () => React.useState(tripState).concat(true) as const,
  };
});

describe('BudgetPage summary', () => {
  beforeEach(() => {
    tripState = structuredClone(baseTripState);
  });

  it('renders per-traveler totals and grand total with approximate marker on converted costs', async () => {
    renderWithProviders(<BudgetPage />);

    await waitFor(() => {
      expect(screen.getByText('Grand Total')).toBeInTheDocument();
    });

    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();

    // Approximate marker (~) should appear because flight is EUR while display currency is USD
    expect(screen.getAllByText(/~\$/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Grand Total/)).toBeInTheDocument();
  });
});
