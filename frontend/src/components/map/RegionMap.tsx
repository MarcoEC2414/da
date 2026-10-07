import { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import type { Currency, RegionQuote } from '../../types';
import type { Region } from '../../types';
import { REGIONS, getRegion } from '../../data/regions';
import { formatCurrency } from '../../utils/format';
import { useTheme } from '../../hooks/useTheme';
import { markerFill, NO_DATA_COLOR } from './regionColors';
import { RegionMapLegend } from './RegionMapLegend';
import { Spinner } from '../ui/Spinner';
import { ErrorState } from '../ui/ErrorState';

const WORLD_BOUNDS: [[number, number], [number, number]] = [
  [-56, -140],
  [78, 160],
];

function RegionTooltipContent({ region, quote, currency }: {
  region: Region;
  quote: RegionQuote | undefined;
  currency: Currency;
}) {
  const hasPrice = quote?.status === 'ok' && quote.monthly !== null;
  const isAws = quote?.source === 'AWS Price List API' && (quote.cacheStatus === 'HIT' || quote.cacheStatus === 'MISS');
  const unavailable = quote?.unavailableReason === 'aws-error'
    ? 'AWS no disponible en este momento'
    : quote?.source === 'AWS Price List API'
      ? 'Configuración no disponible'
      : 'Sin datos de precio';
  return (
    <div>
      <p className="font-semibold text-slate-900 dark:text-white">{region.name}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {region.city}, {region.country}
      </p>
      {hasPrice ? (
        <>
          <p className="mt-1 text-xs font-medium text-slate-900 dark:text-white">
            {formatCurrency(quote.monthly as number, currency)}
            <span className="font-normal text-slate-400"> / mes</span>
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">
            {isAws
              ? quote?.cacheStatus === 'MISS'
                ? 'Precio real AWS · consulta en vivo'
                : 'Precio real AWS · desde caché'
              : 'Catálogo de referencia (simulado)'}
          </p>
        </>
      ) : (
        <p className="mt-1 text-xs italic text-slate-400">{unavailable}</p>
      )}
    </div>
  );
}

export function RegionMap({ quotes, status, selectedRegion, currency, onSelect, onRetry }: {
  quotes: RegionQuote[];
  status: 'loading' | 'ready' | 'error';
  selectedRegion: string;
  currency: Currency;
  onSelect: (regionId: string) => void;
  onRetry: () => void;
}) {
  const { theme } = useTheme();

  const ok = useMemo(() => quotes.filter((q) => q.status === 'ok' && q.monthly !== null), [quotes]);
  const months = ok.map((q) => q.monthly as number);
  const min = months.length > 0 ? Math.min(...months) : 0;
  const max = months.length > 0 ? Math.max(...months) : 0;

  const cheapestId = useMemo(() => {
    let best: { id: string; m: number } | null = null;
    for (const q of ok) {
      if (q.monthly === null) continue;
      if (best === null || q.monthly < best.m) best = { id: q.regionId, m: q.monthly };
    }
    return best?.id ?? null;
  }, [ok]);

  const noDataCount = REGIONS.length - ok.length;
  const hasAws = quotes.some((q) => q.source === 'AWS Price List API' && (q.cacheStatus === 'HIT' || q.cacheStatus === 'MISS'));
  const anyAwsMiss = quotes.some((q) => q.cacheStatus === 'MISS');

  return (
    <div className="relative isolate z-0 h-80 overflow-hidden rounded-xl border border-slate-200 shadow-sm sm:h-96 dark:border-slate-800">
      <MapContainer
        bounds={WORLD_BOUNDS}
        boundsOptions={{ padding: [20, 20] }}
        minZoom={2}
        maxZoom={12}
        worldCopyJump
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {REGIONS.map((r) => {
          const quote = quotes.find((q) => q.regionId === r.id);
          const isSelected = r.id === selectedRegion;
          const isCheapest = r.id === cheapestId;
          const hasData = quote?.status === 'ok' && quote.monthly !== null;
          const fill = hasData ? markerFill(quote?.monthly ?? 0, min, max) : NO_DATA_COLOR;
          const ring = isSelected
            ? '#facc15'
            : isCheapest
              ? '#22c55e'
              : theme === 'dark'
                ? '#0f172a'
                : '#ffffff';
          const radius = isSelected ? 9 : isCheapest ? 8 : hasData ? 6 : 5;
          const weight = isSelected || isCheapest ? 3 : 1.5;

          return (
            <CircleMarker
              key={r.id}
              center={[r.lat, r.lng]}
              radius={radius}
              pathOptions={{
                color: ring,
                weight,
                fillColor: fill,
                fillOpacity: isSelected ? 1 : 0.85,
              }}
              eventHandlers={{ click: () => onSelect(r.id) }}
            >
              <Tooltip direction="top" opacity={1} className="region-tooltip">
                <RegionTooltipContent region={r} quote={quote} currency={currency} />
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <RegionMapLegend min={min} max={max} currency={currency} hasData={ok.length > 0} />

      {hasAws ? (
        <div
          className={`pointer-events-none absolute left-3 top-3 z-[500] inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold shadow-sm backdrop-blur ${
            anyAwsMiss
              ? 'border-emerald-200 bg-emerald-50/95 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/95 dark:text-emerald-300'
              : 'border-slate-200 bg-white/95 text-slate-500 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-400'
          }`}
        >
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${anyAwsMiss ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-500'}`} />
          {anyAwsMiss ? 'AWS LIVE' : 'CACHE AWS'}
          <span className="font-normal">{anyAwsMiss ? 'precios reales consultados ahora' : 'precios reales desde caché'}</span>
        </div>
      ) : null}

      {status === 'loading' ? (
        <div className="pointer-events-none absolute right-3 top-3 z-[500] flex items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-xs text-slate-500 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-400">
          <Spinner className="h-3.5 w-3.5" />
          Calculando por región…
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <ErrorState message="No se pudieron obtener los precios por región." onRetry={onRetry} compact />
          </div>
        </div>
      ) : null}

      {status === 'ready' && noDataCount > 0 ? (
        <div className="pointer-events-none absolute bottom-3 right-3 z-[500] rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] text-slate-400 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
          {noDataCount} región(es) sin datos
        </div>
      ) : null}

      {status === 'ready' && ok.length === 0 ? (
        <div className="pointer-events-none absolute left-1/2 top-3 z-[500] -translate-x-1/2 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-xs text-slate-500 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-400">
          {getRegion(selectedRegion) ? 'Agrega servicios para comparar costos por región.' : ''}
        </div>
      ) : null}
    </div>
  );
}