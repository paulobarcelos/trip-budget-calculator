import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import UsagePage from '../page';
import { renderWithProviders } from '@/test/renderWithProviders';
import { TripState } from '@/types';

const day = { id: '2024-01-01', date: '2024-01-01' };

const baseTripState: TripState = {
  version: 1,
  startDate: '2024-01-01',
  endDate: '2024-01-03',
  travelers: [
    { id: 't1', name: 'Alice', startDate: '2024-01-01', endDate: '2024-01-03' },
    { id: 't2', name: 'Bob', startDate: '2024-01-01', endDate: '2024-01-03' },
  ],
  dailySharedExpenses: [
    {
      id: 'hotel',
      name: 'Hotel',
      currency: 'USD',
      totalCost: 300,
      startDate: '2024-01-01',
      endDate: '2024-01-03',
      splitMode: 'stayWeighted',
    },
  ],
  dailyPersonalExpenses: [],
  oneTimeSharedExpenses: [],
  oneTimePersonalExpenses: [],
  days: [day],
  usageCosts: {
    oneTimeShared: {},
    oneTimePersonal: {},
    days: {
      [day.id]: {
        dailyShared: { hotel: ['t1'] },
        dailyPersonal: {},
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

describe('UsagePage daily shared section', () => {
  beforeEach(() => {
    tripState = structuredClone(baseTripState);
  });

  it('shows split mode label and allows toggling travelers', () => {
    renderWithProviders(<UsagePage />);

    expect(screen.getByText(/Even-day split/i)).toBeInTheDocument();

    const alice = screen.getByLabelText('Alice') as HTMLInputElement;
    const bob = screen.getByLabelText('Bob') as HTMLInputElement;

    expect(alice.checked).toBe(true);
    expect(bob.checked).toBe(false);

    fireEvent.click(bob);
    expect(bob.checked).toBe(true);
  });
});
