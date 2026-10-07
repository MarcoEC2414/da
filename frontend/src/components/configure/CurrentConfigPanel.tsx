import type { CloudService } from '../../types';
import { getRegion } from '../../data/regions';
import { configSummary } from '../../data/awsServices';
import { useEstimation } from '../../state/EstimationProvider';
import { Card } from '../ui/Card';
import { ServiceBadge } from '../ui/Badge';

interface CurrentConfigPanelProps {
  onEditService: (service: CloudService) => void;
  onCalculate: () => void;
  onFocusRegion?: () => void;
}

export function CurrentConfigPanel({
  onEditService,
  onCalculate,
  onFocusRegion,
}: CurrentConfigPanelProps) {
  const { state, removeService } = useEstimation();
  const region = getRegion(state.region);

  return (
    <aside className="w-full lg:w-80 xl:w-96 shrink-0 flex flex-col gap-4">
      <Card className="flex flex-col p-5 shadow-sm">
        {/* Cabecera del Panel */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Configuración actual
            </h2>
            <p className="text-[11px] text-slate-400">
              Resumen técnico de la infraestructura
            </p>
          </div>
          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-bold text-blue-600 dark:bg-blue-400/10 dark:text-blue-400">
            {state.services.length} {state.services.length === 1 ? 'servicio' : 'servicios'}
          </span>
        </div>

        {/* Región seleccionada */}
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800/80 dark:bg-[#131d33]/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Región seleccionada
            </span>
            {onFocusRegion && (
              <button
                type="button"
                onClick={onFocusRegion}
                className="text-[11px] font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                Cambiar
              </button>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
              {region ? region.name : state.region}
            </p>
          </div>
          <p className="mt-0.5 font-mono text-[10px] text-slate-400 dark:text-slate-500">
            {state.region}
          </p>
        </div>

        {/* Lista de servicios configurados (estrictamente SIN PRECIOS) */}
        <div className="mt-4 flex-1">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Servicios configurados ({state.services.length})
            </span>
          </div>

          {state.services.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-800">
              <svg
                className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="2" width="20" height="8" rx="2" />
                <rect x="2" y="14" width="20" height="8" rx="2" />
                <line x1="6" y1="6" x2="6.01" y2="6" />
                <line x1="6" y1="18" x2="6.01" y2="18" />
              </svg>
              <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                Aún no has agregado servicios.
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                Elige de la cuadrícula para comenzar a diseñar tu arquitectura.
              </p>
            </div>
          ) : (
            <div className="max-h-[360px] space-y-2.5 overflow-y-auto pr-1">
              {state.services.map((service) => (
                <div
                  key={service.id}
                  className="group relative rounded-xl border border-slate-200/80 bg-white p-3 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-[#11192e] dark:hover:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <ServiceBadge kind={service.kind} />
                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400">
                          Configurado
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs font-bold text-slate-900 dark:text-white">
                        {service.name}
                      </p>
                      {/* Resumen de especificaciones técnicas SIN ningún precio */}
                      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                        {configSummary(service)}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEditService(service)}
                        title="Editar parámetros"
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeService(service.id)}
                        title="Eliminar de la estimación"
                        className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tarjeta Informativa del Profesor (Regla 17) */}
        <div className="mt-5 rounded-xl border border-blue-200/60 bg-blue-50/50 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/20">
          <div className="flex items-start gap-2.5">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <div className="space-y-0.5 text-xs">
              <p className="font-semibold text-blue-900 dark:text-blue-200">
                Los precios se mostrarán al calcular la estimación
              </p>
              <p className="text-[11px] leading-relaxed text-blue-700/80 dark:text-blue-300/80">
                Configura todos los servicios y luego continúa para ver tu estimación de costos y evidencias.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Principal: CALCULAR ESTIMACIÓN → (Regla 18) */}
        <div className="mt-4">
          <button
            type="button"
            disabled={state.services.length === 0}
            onClick={onCalculate}
            className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:shadow-indigo-500/40 hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            <span>CALCULAR ESTIMACIÓN</span>
            <svg
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </Card>
    </aside>
  );
}
