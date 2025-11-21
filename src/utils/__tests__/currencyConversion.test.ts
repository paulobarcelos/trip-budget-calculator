import { describe, expect, it } from 'vitest';
import { convertCurrency, formatCurrency } from '@/utils/currencyConversion';

const rates = {
  USD: 1,
  EUR: 0.8,
  GBP: 0.5,
};

describe('convertCurrency', () => {
  it('returns the same amount when currencies match', () => {
    expect(convertCurrency(100, 'USD', 'USD', rates)).toBe(100);
  });

  it('converts from USD to another currency', () => {
    expect(convertCurrency(100, 'USD', 'EUR', rates)).toBeCloseTo(80);
  });

  it('converts from a non-USD currency to USD', () => {
    expect(convertCurrency(80, 'EUR', 'USD', rates)).toBeCloseTo(100);
  });

  it('converts between two non-USD currencies via USD', () => {
    expect(convertCurrency(80, 'EUR', 'GBP', rates)).toBeCloseTo(50);
  });
});

describe('formatCurrency', () => {
  it('adds approximate marker when converting between currencies', async () => {
    await expect(formatCurrency(100, 'USD', 'EUR', rates)).resolves.toBe('~80.00 EUR');
  });

  it('omits approximate marker when no conversion is needed', async () => {
    await expect(formatCurrency(100, 'USD', 'USD', rates)).resolves.toBe('100.00 USD');
  });
});
