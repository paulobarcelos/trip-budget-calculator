import { currencies } from '@/data/currencies';

export async function getExchangeRates() {
  const res = await fetch(
    `https://openexchangerates.org/api/latest.json?app_id=${process.env.OPEN_EXCHANGE_RATES_APP_ID}&symbols=${currencies.map(c => c.code).join(',')}`,
    { next: { revalidate: 3600 } } // Revalidate every hour
  );

  if (!res.ok) {
    // Fallback rates if API fails
    return {
      base: 'USD',
      rates: {
        USD: 1,
        EUR: 0.85,
        GBP: 0.73,
        JPY: 110.0,
        AUD: 1.35,
        CAD: 1.25,
        CHF: 0.92,
        CNY: 6.45,
        BRL: 4.92,
      }
    };
  }

  return res.json();
}

export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRates: Record<string, number>
): number {
  // If currencies are the same, no conversion needed
  if (fromCurrency === toCurrency) return amount;
  
  // Convert to USD first (base currency)
  const amountInUSD = fromCurrency === 'USD'
    ? amount 
    : amount / exchangeRates[fromCurrency];
    
  // Convert from USD to target currency
  return amountInUSD * exchangeRates[toCurrency];
}

export async function formatCurrency(amount: number, fromCurrency: string, toCurrency: string, exchangeRates: Record<string, number>): Promise<string> {
  const convertedAmount = convertCurrency(amount, fromCurrency, toCurrency, exchangeRates);
  const isConverted = fromCurrency !== toCurrency;
  
  return `${isConverted ? '~' : ''}${convertedAmount.toFixed(2)} ${toCurrency}`;
}