import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { DataTransferControls } from '../DataTransferControls';
import { TripState } from '@/types';
import { initialTripState } from '@/constants/initialState';
import { migrateState } from '@/utils/stateMigrations';

let tripState: TripState;
let capturedState: TripState | null;

vi.mock('@/hooks/useLocalStorage', () => {
  const React = require('react');
  return {
    useLocalStorage: () => {
      const [state, setState] = React.useState(tripState);
      return [
        state,
        (value: TripState) => {
          capturedState = value;
          setState(value);
        },
        true,
      ] as const;
    },
  };
});

describe('DataTransferControls', () => {
  beforeEach(() => {
    tripState = structuredClone(initialTripState);
    capturedState = null;
  });

  it('exports JSON when clicking Export JSON', async () => {
    const clickMock = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    render(<DataTransferControls />);

    fireEvent.click(screen.getByRole('button', { name: /Export JSON/i }));

    await waitFor(() => expect(clickMock).toHaveBeenCalled());
    clickMock.mockRestore();
  });

  it('copies shareable link including encoded data', async () => {
    const writeText = vi.fn();
    (navigator as any).clipboard = { writeText };

    render(<DataTransferControls />);
    fireEvent.click(screen.getByRole('button', { name: /Copy Shareable Link/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied).toContain('/?data=');
  });

  it('imports JSON and migrates state', async () => {
    const parsed: TripState = {
      ...initialTripState,
      travelers: [{ id: 't1', name: 'Alex', startDate: '2024-01-01', endDate: '2024-01-02' }],
      displayCurrency: 'EUR',
    };
    const file = {
      name: 'trip.json',
      type: 'application/json',
      text: vi.fn().mockResolvedValue(JSON.stringify(parsed)),
    };

    render(<DataTransferControls />);

    const input = document.querySelector('input[type=\"file\"]') as HTMLInputElement;
    await fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(capturedState?.displayCurrency).toBe('EUR'));
    expect(file.text).toHaveBeenCalled();
  });
});
