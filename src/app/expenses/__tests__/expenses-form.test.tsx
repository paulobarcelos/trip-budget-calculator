import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import ExpensesPage from '../page';
import { renderWithProviders } from '@/test/renderWithProviders';
import { TripState } from '@/types';

const baseTripState: TripState = {
  version: 3,
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

vi.mock('@/utils/tripDates', () => ({
  getTripDateRange: () => ({ startDate: '2024-01-01', endDate: '2024-01-04' }),
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
    const user = userEvent.setup();
    renderWithProviders(<ExpensesPage />);

    // Open the Add Expense dialog
    await user.click(screen.getByRole('button', { name: /Add Expense/i }));

    // Wait for dialog to open
    const dialog = await screen.findByRole('dialog');

    const nameInputs = within(dialog).getAllByLabelText('Name');
    fireEvent.change(nameInputs[0], {
      target: { value: 'Hotel' },
    });

    // Select split mode (assuming RadioGroup is used)
    const splitRadios = within(dialog).getAllByLabelText(/Even-day split/i);
    await user.click(splitRadios[0]);

    const costInputs = within(dialog).getAllByLabelText(/Total Cost/i);
    fireEvent.change(costInputs[0], {
      target: { value: '300' },
    });

    // Removed Cost per Day check as it's not in the form anymore

    await user.click(
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

  it('adds a daily personal expense with dates', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExpensesPage />);

    // Switch to Daily Personal tab
    const personalTab = screen.getByRole('tab', { name: /Daily Personal/i });
    await user.click(personalTab);

    // Wait for the tab content to be visible to ensure state updated
    await screen.findByText("No daily personal expenses added yet.");

    // Open the Add Expense dialog
    await user.click(screen.getByRole('button', { name: /Add Expense/i }));

    // Wait for dialog to open
    const dialog = await screen.findByRole('dialog');

    // Debug: check if the correct form is shown
    // expect(within(dialog).getByText(/Daily Cost/i)).toBeInTheDocument();

    const nameInputs = within(dialog).getAllByLabelText('Name');
    fireEvent.change(nameInputs[0], {
      target: { value: 'Coffee' },
    });

    const costInputs = within(dialog).getAllByLabelText(/Daily Cost/i);
    fireEvent.change(costInputs[0], {
      target: { value: '5' },
    });

    // Submit
    await user.click(
      screen.getByRole('button', { name: 'Add Expense' }),
    );

    // Wait for dialog to close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    await screen.findByText('Coffee');
    expect(screen.getByText(/USD 5.00 \/ day/)).toBeInTheDocument();

    expect(capturedState?.dailyPersonalExpenses[0]?.name).toBe('Coffee');
    expect(capturedState?.dailyPersonalExpenses[0]?.dailyCost).toBe(5);
    expect(capturedState?.dailyPersonalExpenses[0]?.startDate).toBe('2024-01-01');
    expect(capturedState?.dailyPersonalExpenses[0]?.endDate).toBe('2024-01-04');
  });
});
