/**
 * Format a number as currency with the specified currency code
 * @param amount The amount to format
 * @param currencyCode The ISO currency code (e.g. USD, EUR)
 * @param isApproximation Whether to prefix with "~" to indicate approximate value
 */
export function formatCurrency(amount: number, currencyCode: string, isApproximation = false): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${isApproximation ? '~' : ''}${formatter.format(amount)}`;
} 