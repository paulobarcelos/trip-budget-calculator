import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { DisplayCurrencyProvider } from '@/providers/DisplayCurrencyProvider';

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <DisplayCurrencyProvider>{children}</DisplayCurrencyProvider>;
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
