import type { Currency } from '../../types';
import { formatCurrency, formatPercent } from '../../utils/format';

export interface DonutDatum {
  id: string;
  label: string;
  value: number;
  color: string;
}

const SIZE = 150;
const RADIUS = 56;
const STROKE = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CostChart({ data, total, currency }: { data: DonutDatum[]; total: number; currency: Currency }) {
  let acc = 0;
  const segments = data.map((d) => {
    const frac = total > 0 ? d.value / total : 0;
    const segment = {
      ...d,
      dashArray: `${frac * CIRCUMFERENCE} ${CIRCUMFERENCE}`,
      dashOffset: -acc * CIRCUMFERENCE,
    };
    acc += frac;
    return segment;
  });

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full -rotate-90">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-slate-100 dark:stroke-slate-800"
          />
          {segments.map((s) => (
            <circle
              key={s.id}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={s.color}
              strokeWidth={STROKE}
              strokeDasharray={s.dashArray}
              strokeDashoffset={s.dashOffset}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase tracking-wide text-slate-400">Total / mes</span>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            {formatCurrency(total, currency, 0)}
          </span>
        </div>
      </div>

      <ul className="w-full min-w-0 space-y-2">
        {data.length === 0 ? (
          <li className="text-sm text-slate-500 dark:text-slate-400">Sin servicios para mostrar.</li>
        ) : (
          data.map((d) => (
            <li key={d.id} className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="min-w-0 truncate text-slate-600 dark:text-slate-300">{d.label}</span>
              <span className="ml-auto shrink-0 text-slate-400">{formatPercent((d.value / total) * 100)}</span>
              <span className="w-20 shrink-0 text-right font-medium text-slate-900 dark:text-white">
                {formatCurrency(d.value, currency, 0)}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}