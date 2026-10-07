import { useMemo } from 'react';
import type { Currency } from '../../types';
import { formatCurrency } from '../../utils/format';
import { Card } from '../ui/Card';

const W = 480;
const H = 200;
const PAD = { top: 16, right: 12, bottom: 30, left: 52 };
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function CumulativeChart({ monthly, currency }: { monthly: number; currency: Currency }) {
  const geom = useMemo(() => {
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const max = Math.max(monthly * 12, 1);
    const pts = MONTHS.map((_, i) => {
      const value = monthly * (i + 1);
      const x = PAD.left + (innerW * i) / 11;
      const y = PAD.top + innerH - (innerH * value) / max;
      return { x, y, i: i + 1, value };
    });
    const last = pts[pts.length - 1];
    const area = `M ${pts[0].x} ${H - PAD.bottom} L ${pts.map((p) => `${p.x} ${p.y}`).join(' L ')} L ${last.x} ${H - PAD.bottom} Z`;
    const line = pts.map((p) => `${p.x},${p.y}`).join(' ');
    const grid = [0.25, 0.5, 0.75, 1].map((f) => ({
      y: PAD.top + innerH - innerH * f,
      value: max * f,
      key: `g-${f}`,
    }));
    return { innerW, innerH, max, pts, area, line, grid };
  }, [monthly]);

  if (monthly <= 0) return null;

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Proyección 12 meses</h3>
          <p className="text-xs text-slate-400">Costo acumulado suponiendo una facturación mensual constante</p>
        </div>
        <div className="rounded-lg bg-indigo-50 px-3 py-1.5 text-right dark:bg-indigo-950/60">
          <p className="text-[11px] uppercase tracking-wide text-indigo-500 dark:text-indigo-300">Acumulado anual</p>
          <p className="text-sm font-semibold tabular-nums text-indigo-700 dark:text-indigo-200">
            {formatCurrency(monthly * 12, currency)}
          </p>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Proyección de costos acumulados a 12 meses" className="w-full">
        <defs>
          <linearGradient id="cumulative-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {geom.grid.map((g) => (
          <g key={g.key}>
            <line x1={PAD.left} y1={g.y} x2={W - PAD.right} y2={g.y} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />
            <text x={PAD.left - 6} y={g.y + 3} textAnchor="end" className="fill-slate-400" fontSize="9" tabular-nums>
              {formatCurrency(g.value, currency)}
            </text>
          </g>
        ))}
        <path d={geom.area} fill="url(#cumulative-fill)" />
        <polyline points={geom.line} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {geom.pts.map((p) => (
          <g key={p.i}>
            {(p.i === 1 || p.i % 2 === 0 || p.i === 12) && (
              <text x={p.x} y={H - PAD.bottom + 14} textAnchor="middle" className="fill-slate-400" fontSize="9">
                {MONTHS[p.i - 1]}
              </text>
            )}
            {p.i === 12 ? (
              <circle cx={p.x} cy={p.y} r="3.5" fill="#6366f1" stroke="#fff" strokeWidth="1.5" />
            ) : null}
          </g>
        ))}
        <text x={geom.pts[11].x} y={geom.pts[11].y - 10} textAnchor="end" fontSize="10" fontWeight="600" className="fill-indigo-500">
          {formatCurrency(geom.pts[11].value, currency)}
        </text>
      </svg>
    </Card>
  );
}