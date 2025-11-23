import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import React from 'react';
import UsagePage from '../page';
import { renderWithProviders } from '@/test/renderWithProviders';
import { TripState } from '@/types';

const baseTripState: TripState = {
  version: 3,
  travelers: [
    { id: 't1', name: 'Alice' },
    { id: 't2', name: 'Bob' },
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
  days: [],
  usageCosts: {
    oneTimeShared: {},
    oneTimePersonal: {},
    days: {
      '2024-01-01': {
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

// Mock ResizeObserver
class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
}
global.ResizeObserver = ResizeObserver;

describe('UsagePage daily shared section', () => {
  beforeEach(() => {
    tripState = structuredClone(baseTripState);
  });

  it('shows expense details and allows toggling travelers', async () => {
    renderWithProviders(<UsagePage />);

    // The calendar should be visible.
    // We need to find the day '1' which corresponds to Jan 1st.
    // Since the trip starts in Jan 2024, the calendar should default to that month or we might need to navigate.
    // However, UsageCalendar defaults to trip start date.

    // Find the button for day 1.
    // There might be multiple "1"s (e.g. Feb 1st if visible), so we take the first one which should be Jan 1st.
    const dayButtons = screen.getAllByText('1', { selector: 'button' });
    const dayButton = dayButtons[0];
    fireEvent.click(dayButton);

    // Wait for dialog to open
    const dialog = await screen.findByRole('dialog');

    // Check for expense name
    expect(within(dialog).getByText('Hotel')).toBeInTheDocument();

    // Alice is selected, so she should be visible as a badge
    expect(within(dialog).getByText('Alice')).toBeInTheDocument();

    // Bob is NOT selected, so he should NOT be visible as a badge yet
    // Note: Bob might be in the list if the selector is open, but it shouldn't be open yet.
    expect(within(dialog).queryByText('Bob')).not.toBeInTheDocument();

    // Open the selector
    const trigger = within(dialog).getByRole('combobox');
    fireEvent.click(trigger);

    // Select Bob from the list
    const bobOption = await screen.findByText('Bob');
    fireEvent.click(bobOption);

    // Now Bob should be visible as a badge
    // We check inside the dialog to be sure
    expect(within(dialog).getAllByText('Bob').length).toBeGreaterThan(0);
  });
});

