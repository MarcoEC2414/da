import type { Currency, ServiceQuote, Totals } from '../types';

export const HOURS_PER_MONTH = 730;

export function serviceTotals(quotes: ServiceQuote[]): Totals {
  const monthly = quotes.reduce((sum, q) => sum + q.monthly, 0);
  const currency: Currency = quotes[0]?.currency ?? 'USD';
  return {
    monthly,
    yearly: monthly * 12,
    hourly: monthly / HOURS_PER_MONTH,
    currency,
  };
}

export function quoteShare(quote: ServiceQuote, totalMonthly: number): number {
  if (totalMonthly <= 0) return 0;
  return (quote.monthly / totalMonthly) * 100;
}