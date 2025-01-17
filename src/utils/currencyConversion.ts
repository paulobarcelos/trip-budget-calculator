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
        BRL: 4.92,
      }
    };
  }

  return res.json();
}

export async function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
  const { base, rates } = await getExchangeRates();
  
  // If currencies are the same, no conversion needed
  if (fromCurrency === toCurrency) return amount;
  
  // Convert to USD first (base currency)
  const amountInUSD = fromCurrency === base 
    ? amount 
    : amount / rates[fromCurrency];
    
  // Convert from USD to target currency
  return amountInUSD * rates[toCurrency];
}

export async function formatCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<string> {
  const convertedAmount = await convertCurrency(amount, fromCurrency, toCurrency);
  const isConverted = fromCurrency !== toCurrency;
  
  return `${isConverted ? '~' : ''}${convertedAmount.toFixed(2)} ${toCurrency}`;
} 