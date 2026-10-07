import type { Currency } from '../types';

function nf(currency: Currency, digits: number, compact: boolean): Intl.NumberFormat {
  return new Intl.NumberFormat('es', {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    ...(compact ? { notation: 'compact' as const } : {}),
  });
}

export function formatCurrency(amount: number, currency: Currency, digits = 2): string {
  if (!Number.isFinite(amount)) return '—';
  return nf(currency, digits, false).format(amount);
}

export function formatCompactCurrency(amount: number, currency: Currency): string {
  if (!Number.isFinite(amount)) return '—';
  return nf(currency, 1, true).format(amount);
}

export function formatPercent(value: number): string {
  return `${value.toLocaleString('es', { maximumFractionDigits: 1 })}%`;
}

/** Fecha/hora corta (p. ej. "07/10/2026 15:04") para retrievedAt de AWS. */
export function formatRetrievedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('es', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}