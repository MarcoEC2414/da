import type { Currency } from '../../types';
import { formatCompactCurrency } from '../../utils/format';
import { NO_DATA_COLOR } from './regionColors';

/** Remplazo en miniatura de la escala para no duplicar la barra. */
export function RegionMapLegend({ min, max, currency, hasData }: {
  min: number;
  max: number;
  currency: Currency;
  hasData: boolean;
}) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span>Más barato</span>
        <span
          className="h-2 w-24 rounded-full"
          style={{
            background:
              'linear-gradient(90deg, #34d399, #84cc16, #fbbf24, #fb923c, #f87171)',
          }}
        />
        <span>Más caro</span>
      </div>
      {hasData ? (
        <div className="mt-1 flex items-center justify-between text-[11px] tabular-nums text-slate-400">
          <span>{formatCompactCurrency(min, currency)}</span>
          <span>{formatCompactCurrency(max, currency)}</span>
        </div>
      ) : null}
      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: NO_DATA_COLOR }} />
        Sin datos
      </div>
    </div>
  );
}