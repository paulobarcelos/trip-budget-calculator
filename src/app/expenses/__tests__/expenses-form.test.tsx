import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
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

    fireEvent.change(screen.getByLabelText('Expense Name'), {
      target: { value: 'Hotel' },
    });
    fireEvent.click(screen.getByRole('radio', { name: 'Even-day split' }));

    fireEvent.change(screen.getByLabelText(/Total Cost/i), {
      target: { value: '300' },
    });

    await waitFor(() => {
      expect(
        (screen.getByLabelText(/Cost per Day/i) as HTMLInputElement).value,
      ).toBe('100.00');
    });

    fireEvent.click(
      screen.getByRole('button', { name: /Add Daily Shared Expense/i }),
    );

    await screen.findByText('Hotel');
    const splitLabels = screen.getAllByText(/Even-day split/);
    expect(splitLabels.length).toBeGreaterThan(0);
    expect(screen.getByText(/100.00 USD per day/)).toBeInTheDocument();

    expect(capturedState?.dailySharedExpenses[0]?.splitMode).toBe(
      'stayWeighted',
    );
    expect(capturedState?.dailySharedExpenses[0]?.totalCost).toBe(300);
  });
});
