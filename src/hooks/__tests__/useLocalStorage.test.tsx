import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLocalStorage } from '@/hooks/useLocalStorage';
import { initialTripState } from '@/constants/initialState';
import { TripStateVersion, TripState } from '@/types';
import { migrateState } from '@/utils/stateMigrations';
import { decodeState, encodeState } from '@/utils/stateEncoding';

const setLocation = (url: string) => {
  Object.defineProperty(window, 'location', {
    value: new URL(url),
    writable: true,
  });
};

const resetUrl = (url = 'http://localhost/') => setLocation(url);


describe('useLocalStorage', () => {
  let replaceStateMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    replaceStateMock = vi
      .spyOn(window.history, 'replaceState')
      .mockImplementation((state, title, url) => {
        if (!url) return null as unknown as void;
        const nextUrl = typeof url === 'string' ? url : url.toString();
        setLocation(nextUrl);
        return undefined;
      });
    localStorage.clear();
    resetUrl();
  });

  it('hydrates stored value and applies migrations', async () => {
    const rawValue = {
      startDate: '2024-01-01',
      endDate: '2024-01-03',
      travelers: [
        { id: 't1', name: 'Alex', startDate: '2024-01-01', endDate: '2024-01-03' },
      ],
      dailySharedExpenses: [
        {
          id: 'ds1',
          name: 'Lodging',
          currency: 'USD',
          totalCost: 300,
          startDate: '2024-01-01',
          endDate: '2024-01-03',
        },
      ],
    };

    localStorage.setItem('tripState', JSON.stringify(rawValue));

    const { result } = renderHook(() =>
      useLocalStorage<TripState>('tripState', initialTripState, { migrate: migrateState }),
    );

    await waitFor(() => expect(result.current[2]).toBe(true));

    const [value] = result.current;
    expect(value.version).toBe(TripStateVersion);
    expect(value.displayCurrency).toBe('USD');
    expect(value.dailySharedExpenses[0]?.splitMode).toBe('dailyOccupancy');
  });

  it('decodes state from URL, writes to localStorage, and strips the param', async () => {
    const sharableState: TripState = {
      ...initialTripState,
      startDate: '2024-02-01',
      endDate: '2024-02-05',
      travelers: [{ id: 't1', name: 'Jamie', startDate: '2024-02-01', endDate: '2024-02-05' }],
    };

    const encoded = encodeState(sharableState);
    resetUrl(`http://localhost/?data=${encoded}`);

    const { result } = renderHook(() =>
      useLocalStorage<TripState>('tripState', initialTripState, {
        migrate: migrateState,
        decodeFromUrl: decodeState,
      }),
    );

    await waitFor(() => expect(result.current[2]).toBe(true));

    const [value] = result.current;
    expect(value.startDate).toBe('2024-02-01');
    expect(value.endDate).toBe('2024-02-05');
    expect(localStorage.getItem('tripState')).not.toBeNull();
    expect(window.location.search).toBe('');
    expect(window.location.hash).toBe('');
    expect(replaceStateMock).toHaveBeenCalled();
  });
});
