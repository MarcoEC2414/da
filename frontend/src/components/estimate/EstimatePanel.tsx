import { useMemo } from 'react';
import type { CloudService, RegionQuote } from '../../types';
import { useEstimation } from '../../state/EstimationProvider';
import { useQuotes } from '../../state/QuotesProvider';
import { getRegion } from '../../data/regions';
import { serviceTotals } from '../../utils/totals';
import { formatCurrency } from '../../utils/format';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Spinner } from '../ui/Spinner';
import { CostChart, type DonutDatum } from '../summary/CostChart';
import { CumulativeChart } from '../summary/CumulativeChart';
import { BreakdownList } from '../summary/BreakdownList';
import { EstimateTable } from './EstimateTable';
import { SavingsHint } from './SavingsHint';
import { SaveScenario } from './SaveScenario';
import { CatalogStatusCard } from '../ui/CatalogStatusCard';
import { buildEstimationCsv, downloadCsv } from '../../utils/exportCsv';

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1', '#f97316'];

interface EstimatePanelProps {
  onBack: () => void;
  onAddService: () => void;
  onEditStart: (service: CloudService) => void;
  regionQuotes?: RegionQuote[];
}

export function EstimatePanel({
  onBack,
  onAddService,
  onEditStart,
  regionQuotes,
}: EstimatePanelProps) {
  const { state } = useEstimation();
  const { quotes } = useQuotes();
  const region = getRegion(state.region);

  const ready = useMemo(
    () =>
      state.services
        .map((service, idx) => ({
          service,
          quote: quotes[service.id]?.quote ?? null,
          color: PALETTE[idx % PALETTE.length],
        }))
        .filter((x) => x.quote !== null),
    [state.services, quotes],
  );

  const pending = state.services.some((s) => !quotes[s.id] || quotes[s.id].status === 'loading');
  const error = state.services.some(
    (s) =>
      quotes[s.id]?.status === 'error' ||
      quotes[s.id]?.status === 'no-data' ||
      quotes[s.id]?.status === 'no-data-config' ||
      quotes[s.id]?.status === 'aws-unavailable',
  );
  const totals = serviceTotals(ready.map((x) => x.quote as NonNullable<typeof x.quote>));

  const donut: DonutDatum[] = ready.map((x) => ({
    id: x.service.id,
    label: x.service.name,
    value: (x.quote as { monthly: number }).monthly,
    color: x.color,
  }));

  const exportCsv = () => {
    const quotesMap = Object.fromEntries(Object.entries(quotes).map(([id, v]) => [id, { quote: v.quote }]));
    downloadCsv(
      `cloudcalc-${new Date().toISOString().slice(0, 10)}.csv`,
      buildEstimationCsv(state.services, state.region, state.currency, quotesMap),
    );
  };

  const exportPdf = () => window.print();

  return (
    <div className="space-y-6">
      {/* Barra de Herramientas Superior de Resultados */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={onBack}
            className="no-print font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-400"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Editar configuración
          </Button>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Resultado de la estimación
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {region ? region.name : state.region} · {state.services.length} servicio(s) · Moneda base USD
              {state.currency !== 'USD' ? ` (convertido a ${state.currency})` : ''}
            </p>
          </div>
        </div>

        {/* Acciones de exportación y agregar */}
        <div className="no-print flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={exportCsv}
            disabled={ready.length === 0 || pending}
            className="font-medium"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12m0 0l4-4m-4 4l-4-4" />
              <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
            </svg>
            Exportar CSV
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={exportPdf}
            disabled={ready.length === 0}
            className="font-medium"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 17v2a1 1 0 001 1h8a1 1 0 001-1v-2" />
              <path d="M6 11h12M12 15V7M12 7L9 10m3-3l3 3" />
            </svg>
            Imprimir / PDF
          </Button>

          <Button
            size="sm"
            onClick={onAddService}
            className="bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 text-white font-semibold"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Añadir otro servicio
          </Button>
        </div>
      </div>

      {state.services.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          No hay servicios en la estimación.{' '}
          <button
            type="button"
            onClick={onAddService}
            className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            Configura un servicio
          </button>{' '}
          para calcular costos.
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Tarjeta Heroica: Costo Mensual Estimado */}
          <Card className="relative overflow-hidden border-t-4 border-t-blue-600 p-6 shadow-sm dark:border-t-blue-500">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                    Costo mensual estimado
                  </span>
                  {pending && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-400/10 dark:text-blue-400">
                      <Spinner className="h-3 w-3" />
                      Calculando estimación… Consultando precios…
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
                    {formatCurrency(totals.monthly, totals.currency)}
                  </span>
                  <span className="text-xs font-medium text-slate-400">/ mes</span>
                </div>
              </div>

              {/* Métricas secundarias: Anual y Por Hora */}
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-2.5 text-right dark:border-slate-800/80 dark:bg-[#131d33]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Por año</p>
                  <p className="mt-0.5 text-base font-bold tabular-nums text-slate-800 dark:text-slate-100">
                    {formatCurrency(totals.yearly, totals.currency)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-2.5 text-right dark:border-slate-800/80 dark:bg-[#131d33]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Por hora</p>
                  <p className="mt-0.5 text-base font-bold tabular-nums text-slate-800 dark:text-slate-100">
                    {formatCurrency(totals.hourly, totals.currency)}
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-amber-200/60 bg-amber-50/60 p-3 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                Algunas consultas no pudieron completarse. Utiliza el enlace «reintentar» en la tabla de resultados.
              </div>
            )}
          </Card>

          {/* Sugerencia de ahorro regional real de Fase 2 */}
          <SavingsHint regionId={state.region} quotes={regionQuotes ?? []} currency={state.currency} />

          {/* Tabla de resultados por servicio */}
          <div className="space-y-2">
            <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              Detalle de servicios y tarifas
            </h2>
            <EstimateTable onEditStart={onEditStart} />
          </div>

          {/* Gráficos de distribución de costos */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {donut.length > 0 && (
              <CostChart data={donut} total={totals.monthly} currency={totals.currency} />
            )}
            <CumulativeChart monthly={totals.monthly} currency={totals.currency} />
          </div>

          {/* Desglose acumulado */}
          <BreakdownList
            items={ready.map((x) => ({
              serviceId: x.service.id,
              name: x.service.name,
              quote: x.quote as NonNullable<typeof x.quote>,
            }))}
            currency={totals.currency}
            showBreakdown
          />

          {/* Guardar Escenario */}
          <SaveScenario />

          {/* Fuentes de Datos y Transparencia */}
          <CatalogStatusCard />
        </div>
      )}
    </div>
  );
}