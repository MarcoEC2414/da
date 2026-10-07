import type { Currency, RegionQuote } from '../../types';
import { getRegion } from '../../data/regions';
import { formatCurrency } from '../../utils/format';

/** Primera región con datos más baratos para el total mensual de la estimación. */
export function cheapestRegion(quotes: RegionQuote[]): RegionQuote | null {
  let best: RegionQuote | null = null;
  for (const q of quotes) {
    if (q.status !== 'ok' || q.monthly === null) continue;
    if (best === null || (q.monthly as number) < (best.monthly as number)) best = q;
  }
  return best;
}

export function SavingsHint({ regionId, quotes, currency }: {
  regionId: string;
  quotes: RegionQuote[];
  currency: Currency;
}) {
  const selected = quotes.find((q) => q.regionId === regionId && q.status === 'ok' && q.monthly !== null);
  const cheapest = cheapestRegion(quotes);
  if (!selected || !cheapest || cheapest.regionId === regionId) {
    if (cheapest && cheapest.regionId === regionId) {
      return (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
          Ya estás en la región más barata: {getRegion(regionId)?.name}.
        </p>
      );
    }
    return null;
  }

  const selectedMonthly = selected.monthly as number;
  const cheapestMonthly = cheapest.monthly as number;
  if (selectedMonthly <= 0) return null;

  const diff = selectedMonthly - cheapestMonthly;
  const pct = (diff / selectedMonthly) * 100;

  return (
    <p className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
      <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M14 7h7v7" />
      </svg>
      <span>
        Sugerencia: cambiar a <strong>{getRegion(cheapest.regionId)?.name}</strong> reduce este total en{' '}
        <strong>{formatCurrency(diff, currency)}</strong> al mes (<strong>{pct.toLocaleString('es', { maximumFractionDigits: 0 })}%</strong>).
      </span>
    </p>
  );
}