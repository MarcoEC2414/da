import type { Currency, RegionQuotesResponse, ServiceQuote } from '../types';
import rates from '../../../shared/awsRates.json';

/**
 * Tipos de cambio FIJOS de referencia (simulación académica).
 * El backend solo cotiza en USD; aquí convertimos para mostrar EUR/MXN.
 */
export const FX_RATES: Record<Currency, number> = rates.fxRates;

export function convertUsd(amount: number, currency: Currency): number {
  return amount * FX_RATES[currency];
}

export function toCurrencyQuote(usd: { monthly: number; hourly: number; breakdown: { label: string; amount: number }[] }, serviceId: string, currency: Currency): ServiceQuote {
  return {
    serviceId,
    monthly: convertUsd(usd.monthly, currency),
    hourly: convertUsd(usd.hourly, currency),
    currency,
    breakdown: usd.breakdown.map((l) => ({ label: l.label, amount: convertUsd(l.amount, currency) })),
  };
}

export function convertRegionQuotes(response: RegionQuotesResponse, currency: Currency): RegionQuotesResponse {
  return {
    currency,
    quotes: response.quotes.map((q) => ({
      ...q,
      monthly: q.monthly !== null ? convertUsd(q.monthly, currency) : null,
    })),
  };
}