// Currency conversion rates (to be replaced with API call)
// All rates are relative to USD
const CONVERSION_RATES: Record<string, number> = {
  'USD': 1,
  'EUR': 0.91,
  'GBP': 0.79,
  'BRL': 4.97,
};

export type Currency = string;

export function convertCurrency(amount: number, from: Currency, to: Currency): number {
  if (from === to) return amount;
  
  // Convert to USD first
  const amountInUSD = from === 'USD' ? amount : amount / CONVERSION_RATES[from];
  
  // Then convert from USD to target currency
  return to === 'USD' ? amountInUSD : amountInUSD * CONVERSION_RATES[to];
}

export function formatCurrency(amount: number, currency: Currency, isConverted: boolean = false): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formatted = formatter.format(amount);
  return isConverted ? `~${formatted}` : formatted;
} 