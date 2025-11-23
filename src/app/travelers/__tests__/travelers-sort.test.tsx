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

vi.mock('lucide-react', () => ({
  Plus: () => <div data-testid="Plus" />,
  Trash2: () => <div data-testid="Trash2" />,
  Edit2: () => <div data-testid="Edit2" />,
  X: () => <div data-testid="X" />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div data-testid="Select">{children}</div>,
  SelectTrigger: ({ children }: any) => <div data-testid="SelectTrigger">{children}</div>,
  SelectValue: () => <div data-testid="SelectValue" />,
  SelectContent: ({ children }: any) => <div data-testid="SelectContent">{children}</div>,
  SelectItem: ({ children }: any) => <div data-testid="SelectItem">{children}</div>,
}));

vi.mock('@/hooks/useTripBudget', () => ({
  useTripBudget: () => ({
    budgetData: {
      travelerCosts: new Map([
        ['a', { total: { amount: 100, isApproximate: false } }],
        ['b', { total: { amount: 200, isApproximate: false } }],
      ]),
      grandTotal: { amount: 300, isApproximate: false },
    },
    isLoading: false,
  }),
}));

describe('TravelersPage sorting', () => {
  beforeEach(() => {
    tripState = {
      ...initialTripState,
      travelers: [
        { id: 'b', name: 'Zed' },
        { id: 'a', name: 'Ada' },
      ],
    };
  });

  it('keeps travelers sorted alphabetically after add/delete', async () => {
    renderWithProviders(<TravelersPage />);

    // Check initial order by finding text elements
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Zed')).toBeInTheDocument();

    // We can check order by looking at the card headings
    const headings = screen.getAllByRole('heading', { level: 3 });
    const initialTravelerHeadings = headings.filter(h => h.textContent !== 'Grand Total');
    expect(initialTravelerHeadings.map(h => h.textContent)).toEqual(['Ada', 'Zed']);

    fireEvent.click(screen.getByRole('button', { name: /Add Traveler/i }));

    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText(/^Name$/i), {
      target: { value: 'Ben' },
    });

    fireEvent.click(within(dialog).getByRole('button', { name: /Add Traveler/i }));

    await screen.findByText('Ben');

    // Check updated order
    const updatedHeadings = screen.getAllByRole('heading', { level: 3 });
    const travelerHeadings = updatedHeadings.filter(h => h.textContent !== 'Grand Total');
    expect(travelerHeadings.map(h => h.textContent)).toEqual(['Ada', 'Ben', 'Zed']);

    // Delete Ada and ensure Ben then Zed remain sorted
    const removeButtons = screen.getAllByRole('button', { name: /Remove/ });
    fireEvent.click(removeButtons[0]);

    // Confirm deletion in dialog
    const confirmDialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(confirmDialog).getByRole('button', { name: 'Remove' }));

    const finalHeadings = screen.getAllByRole('heading', { level: 3 });
    const finalTravelerHeadings = finalHeadings.filter(h => h.textContent !== 'Grand Total');
    expect(finalTravelerHeadings.map(h => h.textContent)).toEqual(['Ben', 'Zed']);
  });

  it('allows editing an existing traveler', async () => {
    renderWithProviders(<TravelersPage />);

    // Find the edit button for Ada
    const editButtons = screen.getAllByTestId('Edit2');
    // Assuming the order is Ada, Zed. Ada is first.
    fireEvent.click(editButtons[0]);

    const dialog = await screen.findByRole('dialog');

    // Check if form is populated
    expect(within(dialog).getByLabelText(/^Name$/i)).toHaveValue('Ada');

    // Update name
    fireEvent.change(within(dialog).getByLabelText(/^Name$/i), {
      target: { value: 'Ada Updated' },
    });

    fireEvent.click(within(dialog).getByRole('button', { name: /Update Traveler/i }));

    // Wait for dialog to close and list to update
    await screen.findByText('Ada Updated');
  });
});
