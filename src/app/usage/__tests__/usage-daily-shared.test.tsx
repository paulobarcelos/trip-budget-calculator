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
    useLocalStorage: () => React.useState(tripState).concat(true) as any,
  };
});

describe('UsagePage daily shared section', () => {
  beforeEach(() => {
    tripState = structuredClone(baseTripState);
  });

  it('shows expense details and allows toggling travelers', async () => {
    renderWithProviders(<UsagePage />);

    // Click on the day button to open the sheet
    fireEvent.click(screen.getByText('Jan 1'));

    // Wait for sheet to open
    await screen.findByText('Hotel');

    // expect(screen.getByText(/Even-day split/i)).toBeInTheDocument(); // Removed from UI

    const alice = screen.getByLabelText('Alice') as HTMLInputElement;
    const bob = screen.getByLabelText('Bob') as HTMLInputElement;

    expect(alice).toBeChecked();
    expect(bob).not.toBeChecked();

    fireEvent.click(bob);
    expect(bob).toBeChecked();
  });
});
