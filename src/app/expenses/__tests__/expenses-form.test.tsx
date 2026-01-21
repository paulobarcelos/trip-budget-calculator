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

describe('ExpensesPage unified creator flow', () => {
  beforeEach(() => {
    tripState = structuredClone(baseTripState);
    capturedState = null;
  });

  it('adds a daily shared expense (Time-Bound, Shared)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExpensesPage />);

    // 1. Open Unified Creator
    await user.click(screen.getByRole('button', { name: /Add Expense/i }));

    // 2. Step 1: Name
    const nameInput = await screen.findByPlaceholderText(/e\.g\., Airbnb/i);
    await user.type(nameInput, 'Hotel');
    await user.click(screen.getByRole('button', { name: /Next/i }));

    // 3. Step 2: Type (Time-Bound)
    // Wait for Time-Bound button to be visible
    const timeBoundBtn = await screen.findByRole('button', { name: /Time-Bound/i });
    await user.click(timeBoundBtn);
    await user.click(screen.getByRole('button', { name: /Next/i }));

    // 4. Step 3: Cost
    const costInput = await screen.findByPlaceholderText('0.00');
    await user.type(costInput, '300');
    await user.click(screen.getByRole('button', { name: /Next/i }));

    // 5. Step 4: Sharing (Shared)
    const sharedBtn = await screen.findByRole('button', { name: /Shared/i });
    await user.click(sharedBtn);

    // Submit
    await user.click(screen.getByRole('button', { name: /Save Expense/i }));

    // Wait for dialog to close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Verify UI
    await screen.findByText('Hotel');
    expect(screen.getByText(/USD 300.00 total/)).toBeInTheDocument();

    // Verify State
    expect(capturedState?.dailySharedExpenses[0]?.name).toBe('Hotel');
    expect(capturedState?.dailySharedExpenses[0]?.totalCost).toBe(300);
    expect(capturedState?.dailySharedExpenses[0]?.splitMode).toBe('dailyOccupancy'); // Default
  });

  it('adds a daily personal expense (Time-Bound, Individual)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExpensesPage />);

    // 1. Open
    await user.click(screen.getByRole('button', { name: /Add Expense/i }));

    // 2. Name
    const nameInput = await screen.findByPlaceholderText(/e\.g\., Airbnb/i);
    await user.type(nameInput, 'Coffee');
    await user.click(screen.getByRole('button', { name: /Next/i }));

    // 3. Type
    const timeBoundBtn = await screen.findByRole('button', { name: /Time-Bound/i });
    await user.click(timeBoundBtn);
    await user.click(screen.getByRole('button', { name: /Next/i }));

    // 4. Cost
    const costInput = await screen.findByPlaceholderText('0.00');
    await user.type(costInput, '15');
    await user.click(screen.getByRole('button', { name: /Next/i }));

    // 5. Allocation (Individual)
    const individualBtn = await screen.findByRole('button', { name: /Individual/i });
    await user.click(individualBtn);

    // Submit
    await user.click(screen.getByRole('button', { name: /Save Expense/i }));

    // Verify
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    await screen.findByText('Coffee');
    // 15 total / 3 days = 5 per day
    expect(screen.getByText(/USD 5.00 \/ day/)).toBeInTheDocument();

    expect(capturedState?.dailyPersonalExpenses[0]?.name).toBe('Coffee');
    expect(capturedState?.dailyPersonalExpenses[0]?.dailyCost).toBe(5); // 15 / 3
  });
});
