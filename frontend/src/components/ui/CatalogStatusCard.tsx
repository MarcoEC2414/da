import { useCatalogStatus, type CatalogInfo } from '../../hooks/useCatalogStatus';
import { Card } from './Card';
import { Spinner } from './Spinner';

function sourceLabel(source: string): string {
  if (source === 'mongo') return 'MongoDB Atlas';
  return 'Catálogo local (JSON)';
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-700 dark:text-slate-200">{children}</span>
    </div>
  );
}

function Info({ info }: { info: CatalogInfo }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 dark:border-slate-800">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Fuentes de Datos
        </span>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
            info.source === 'mongo'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
          }`}
        >
          {sourceLabel(info.source)}
        </span>
      </div>

      <div className="space-y-1.5 pt-1">
        <Row label="Amazon EC2">
          <span className="text-emerald-600 dark:text-emerald-400">AWS Price List API (Precios reales)</span>
        </Row>
        <Row label="Otros servicios AWS">
          <span className="text-slate-500 dark:text-slate-400">Tarifas académicas de referencia</span>
        </Row>
        <Row label="Catálogo de metadatos">{sourceLabel(info.source)}</Row>
        <Row label="Regiones soportadas">{info.regionCount || 28}</Row>
        <Row label="Moneda base">{info.currency || 'USD'}</Row>
      </div>

      {/* Aviso académico discreto (Regla 25) */}
      <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-[11px] leading-relaxed text-slate-500 dark:bg-[#131d33] dark:text-slate-400">
        Las tarifas identificadas como <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">AWS LIVE</strong> o <strong className="text-blue-600 dark:text-blue-400 font-semibold">CACHE AWS</strong> provienen directamente de la AWS Price List API. Los servicios marcados como <strong>Referencia</strong> utilizan valores académicos aproximados.
      </div>
    </div>
  );
}

export function CatalogStatusCard() {
  const { status, info, retry } = useCatalogStatus();

  return (
    <Card className="p-4 shadow-sm">
      {status === 'loading' ? (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Spinner className="h-3.5 w-3.5" />
          Consultando estado de las fuentes de datos…
        </div>
      ) : status === 'error' ? (
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-slate-400">No se pudo verificar la fuente de catálogo.</span>
          <button
            type="button"
            onClick={retry}
            className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            Reintentar
          </button>
        </div>
      ) : info ? (
        <Info info={info} />
      ) : null}
    </Card>
  );
}