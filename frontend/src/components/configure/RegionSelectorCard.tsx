import { REGIONS, getRegion } from '../../data/regions';
import { useEstimation } from '../../state/EstimationProvider';
import { Card } from '../ui/Card';

export function RegionSelectorCard() {
  const { state, setRegion } = useEstimation();
  const currentRegion = getRegion(state.region);

  return (
    <Card className="relative overflow-hidden p-5 transition-all">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Izquierda: Info y selector */}
        <div className="space-y-3 z-10 max-w-xl">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </span>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                Región de AWS
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                La región se aplica a todos los servicios de la estimación.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full max-w-sm">
              <select
                id="region-selector"
                value={state.region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-10 text-xs font-semibold text-slate-800 shadow-sm transition-colors hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-[#131d33] dark:text-slate-100 dark:hover:border-slate-700"
              >
                {REGIONS.map((r) => (
                  <option key={r.id} value={r.id} className="bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100">
                    {r.name} ({r.id})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>

            {currentRegion && (
              <span className="hidden sm:inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[11px] font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {currentRegion.id}
              </span>
            )}
          </div>
        </div>

        {/* Derecha: Mapa mundial decorativo discreto */}
        <div className="hidden lg:flex items-center justify-end opacity-20 dark:opacity-15 select-none pointer-events-none">
          <svg className="h-20 w-44 text-blue-500" viewBox="0 0 200 100" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M20 25 Q35 15 50 20 Q65 25 75 35 Q60 50 45 45 Q30 40 20 25 Z" fill="currentColor" fillOpacity="0.1" />
            <path d="M40 55 Q50 50 60 60 Q55 75 45 80 Q35 70 40 55 Z" fill="currentColor" fillOpacity="0.1" />
            <path d="M95 20 Q120 15 130 30 Q115 45 100 40 Q90 30 95 20 Z" fill="currentColor" fillOpacity="0.1" />
            <path d="M100 45 Q120 45 125 65 Q115 80 105 70 Q95 60 100 45 Z" fill="currentColor" fillOpacity="0.1" />
            <path d="M135 25 Q165 20 175 40 Q160 55 140 45 Q130 35 135 25 Z" fill="currentColor" fillOpacity="0.1" />
            <path d="M150 65 Q170 60 175 75 Q165 85 150 80 Z" fill="currentColor" fillOpacity="0.1" />
            {/* Pulsing beacon in Zurich/Europe */}
            <circle cx="106" cy="32" r="3" className="fill-blue-500 animate-pulse" />
            <circle cx="106" cy="32" r="6" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
          </svg>
        </div>
      </div>
    </Card>
  );
}
