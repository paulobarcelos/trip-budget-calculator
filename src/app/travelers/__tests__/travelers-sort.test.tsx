import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import TravelersPage from '../page';
import { TripState } from '@/types';
import { initialTripState } from '@/constants/initialState';
import { renderWithProviders } from '@/test/renderWithProviders';

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

vi.mock('@/components/ui/date-range-picker', () => ({
  DatePickerWithRange: ({ date, onDateChange }: any) => (
    <div>
      <label>
        Start Date
        <input
          value={date?.from ? date.from.toISOString().split('T')[0] : ''}
          onChange={(e) =>
            onDateChange({
              from: new Date(e.target.value),
              to: date?.to,
            })
          }
        />
      </label>
      <label>
        End Date
        <input
          value={date?.to ? date.to.toISOString().split('T')[0] : ''}
          onChange={(e) =>
            onDateChange({
              from: date?.from,
              to: new Date(e.target.value),
            })
          }
        />
      </label>
    </div>
  ),
}));

describe('TravelersPage sorting', () => {
  beforeEach(() => {
    tripState = {
      ...initialTripState,
      travelers: [
        { id: 'b', name: 'Zed', startDate: '2024-01-01', endDate: '2024-01-05' },
        { id: 'a', name: 'Ada', startDate: '2024-01-01', endDate: '2024-01-05' },
      ],
    };
  });

  it('keeps travelers sorted alphabetically after add/delete', async () => {
    renderWithProviders(<TravelersPage />);

    const nameInputs = screen.getAllByDisplayValue(/Ada|Zed/);
    const initialNames = nameInputs.map((el) => (el as HTMLInputElement).value);
    expect(initialNames).toEqual(['Ada', 'Zed']);

    fireEvent.click(screen.getByRole('button', { name: /Add Traveler/i }));

    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText(/^Name$/i), {
      target: { value: 'Ben' },
    });
    fireEvent.change(within(dialog).getByLabelText(/^Start Date$/i), {
      target: { value: '2024-01-01' },
    });
    fireEvent.change(within(dialog).getByLabelText(/^End Date$/i), {
      target: { value: '2024-01-05' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /Add Traveler/i }));

    const updatedNames = screen
      .getAllByDisplayValue(/Ada|Ben|Zed/)
      .map((el) => (el as HTMLInputElement).value);
    expect(updatedNames.slice(0, 2)).toEqual(['Ada', 'Ben']);

    // Delete Ada and ensure Ben then Zed remain sorted
    const removeButtons = screen.getAllByRole('button', { name: /Remove/ });
    fireEvent.click(removeButtons[0]);
    const finalNames = screen
      .getAllByDisplayValue(/Ben|Zed/)
      .map((el) => (el as HTMLInputElement).value);
    expect(finalNames[0]).toBe('Ben');
  });
});
