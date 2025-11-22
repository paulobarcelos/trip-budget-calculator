import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import ExpensesPage from '../page';
import { renderWithProviders } from '@/test/renderWithProviders';
import { TripState } from '@/types';

const baseTripState: TripState = {
  version: 1,
  startDate: '2024-01-01',
  endDate: '2024-01-04',
  travelers: [],
  dailySharedExpenses: [],
  dailyPersonalExpenses: [],
  oneTimeSharedExpenses: [],
  oneTimePersonalExpenses: [],
  days: [],
  usageCosts: { oneTimeShared: {}, oneTimePersonal: {}, days: {} },
  displayCurrency: 'USD',
};

let tripState: TripState;
let capturedState: TripState | null;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/hooks/useLocalStorage', () => {
  const React = require('react');
  return {
    useLocalStorage: () => {
      const [state, setState] = React.useState(tripState);
      return [state, (updater: any) => {
        setState((prev: TripState) => {
          const next = typeof updater === 'function' ? updater(prev) : updater;
          capturedState = next;
          return next;
        });
      }, true] as const;
    },
  };
});

describe('ExpensesPage daily shared form', () => {
  beforeEach(() => {
    tripState = structuredClone(baseTripState);
    capturedState = null;
  });

  it('adds a daily shared expense with selected split mode and updates per-day preview', async () => {
    renderWithProviders(<ExpensesPage />);

    // Open the Add Expense dialog
    fireEvent.click(screen.getByRole('button', { name: /Add Expense/i }));

    // Wait for dialog to open
    const dialog = await screen.findByRole('dialog');

    const nameInputs = within(dialog).getAllByLabelText('Name');
    fireEvent.change(nameInputs[0], {
      target: { value: 'Hotel' },
    });

    // Select split mode (assuming RadioGroup is used)
    const splitRadios = within(dialog).getAllByLabelText(/Even-day split/i);
    fireEvent.click(splitRadios[0]);

    const costInputs = within(dialog).getAllByLabelText(/Total Cost/i);
    fireEvent.change(costInputs[0], {
      target: { value: '300' },
    });

    // Removed Cost per Day check as it's not in the form anymore

    fireEvent.click(
      screen.getByRole('button', { name: 'Add Expense' }),
    );

    // Wait for dialog to close and expense to appear in the list
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    await screen.findByText('Hotel');
    // The split mode text is "Even Split" in the list view
    expect(screen.getByText(/Even Split/)).toBeInTheDocument();
    // The list view shows total cost, not per day
    expect(screen.getByText(/USD 300.00 total/)).toBeInTheDocument();

    expect(capturedState?.dailySharedExpenses[0]?.splitMode).toBe(
      'stayWeighted',
    );
    expect(capturedState?.dailySharedExpenses[0]?.totalCost).toBe(300);
  });
});
