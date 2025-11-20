'use client';

import { PropsWithChildren, createContext, useCallback, useContext, useMemo } from 'react';

import { useLocalStorage } from '@/hooks/useLocalStorage';
import { TripState } from '@/types';
import { initialTripState } from '@/constants/initialState';
import { currencies } from '@/data/currencies';

interface DisplayCurrencyContextValue {
  displayCurrency: string;
  setDisplayCurrency: (currency: string) => void;
  isApproximate: (sourceCurrency: string) => boolean;
}

const SUPPORTED_CURRENCY_CODES = new Set(currencies.map(currency => currency.code));

const DisplayCurrencyContext = createContext<DisplayCurrencyContextValue | null>(null);

function normalizeCurrency(code: string | null | undefined): string | null {
  if (!code) {
    return null;
  }

  const normalized = code.toUpperCase();
  return SUPPORTED_CURRENCY_CODES.has(normalized) ? normalized : null;
}

export function DisplayCurrencyProvider({ children }: PropsWithChildren) {
  const [tripState, setTripState] = useLocalStorage<TripState>('tripState', initialTripState);

  const effectiveCurrency = normalizeCurrency(tripState.displayCurrency) ?? initialTripState.displayCurrency;

  const setDisplayCurrency = useCallback(
    (nextCurrency: string) => {
      const normalized = normalizeCurrency(nextCurrency) ?? initialTripState.displayCurrency;
      setTripState(prev => ({
        ...prev,
        displayCurrency: normalized,
      }));
    },
    [setTripState]
  );

  const isApproximate = useCallback(
    (sourceCurrency: string) => {
      const normalizedSource = normalizeCurrency(sourceCurrency) ?? initialTripState.displayCurrency;
      return normalizedSource !== effectiveCurrency;
    },
    [effectiveCurrency]
  );

  const contextValue = useMemo<DisplayCurrencyContextValue>(
    () => ({
      displayCurrency: effectiveCurrency,
      setDisplayCurrency,
      isApproximate,
    }),
    [effectiveCurrency, setDisplayCurrency, isApproximate]
  );

  return <DisplayCurrencyContext.Provider value={contextValue}>{children}</DisplayCurrencyContext.Provider>;
}

export function useDisplayCurrency() {
  const context = useContext(DisplayCurrencyContext);

  if (!context) {
    throw new Error('useDisplayCurrency must be used within a DisplayCurrencyProvider');
  }

  return context;
}
