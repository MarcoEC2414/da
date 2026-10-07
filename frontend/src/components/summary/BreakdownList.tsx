import type { Currency, ServiceQuote } from '../../types';
import { formatCurrency } from '../../utils/format';

export interface BreakdownItem {
  serviceId: string;
  name: string;
  quote: ServiceQuote;
}

export function BreakdownList({ items, currency, showBreakdown }: {
  items: BreakdownItem[];
  currency: Currency;
  showBreakdown: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-2.5">
      {items.map(({ serviceId, name, quote }) => (
        <li key={serviceId}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-slate-600 dark:text-slate-300">{name}</span>
            <span className="shrink-0 font-medium tabular-nums text-slate-900 dark:text-white">
              {formatCurrency(quote.monthly, currency)}
            </span>
          </div>
          {showBreakdown && quote.breakdown.length > 0 ? (
            <div className="mt-1 space-y-1 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
              {quote.breakdown.map((line, i) => (
                <div key={i} className="flex items-baseline justify-between gap-3 text-xs text-slate-400">
                  <span className="min-w-0 truncate">{line.label}</span>
                  <span className="shrink-0 tabular-nums">{formatCurrency(line.amount, currency)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}