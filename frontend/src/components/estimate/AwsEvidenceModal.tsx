import type { AwsQuoteMeta } from '../../types';
import { getRegion } from '../../data/regions';
import { formatRetrievedAt } from '../../utils/format';

interface AwsEvidenceModalProps {
  awsMeta: AwsQuoteMeta | null;
  regionCode: string;
  onClose: () => void;
}

export function AwsEvidenceModal({ awsMeta, regionCode, onClose }: AwsEvidenceModalProps) {
  if (!awsMeta) return null;

  const region = getRegion(regionCode);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0f172a] sm:p-7 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-modal-title"
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </span>
            <div>
              <h2 id="evidence-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                Evidencia de Integración AWS
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Consulta real de solo lectura a la AWS Price List API
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de evidencia"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tabla de metadatos de evidencia (estrictamente SIN credenciales ni datos secretos) */}
        <div className="py-4 space-y-3">
          <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80 text-xs">
            <span className="text-slate-400">Proveedor</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">Amazon Web Services</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80 text-xs">
            <span className="text-slate-400">API de Precios</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">{awsMeta.source}</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80 text-xs">
            <span className="text-slate-400">Servicio</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">{awsMeta.service}</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80 text-xs">
            <span className="text-slate-400">Tipo de Instancia</span>
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">{awsMeta.instanceType}</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80 text-xs">
            <span className="text-slate-400">Sistema Operativo</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">{awsMeta.operatingSystem}</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80 text-xs">
            <span className="text-slate-400">Región AWS</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {region ? `${region.name} (${regionCode})` : regionCode}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80 text-xs">
            <span className="text-slate-400">Tarifa Unitaria On-Demand</span>
            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              ${awsMeta.pricePerHour} {awsMeta.currency}/{awsMeta.unit}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80 text-xs">
            <span className="text-slate-400">SKU AWS</span>
            <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
              {awsMeta.sku || 'N/A'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80 text-xs">
            <span className="text-slate-400">Actualizado</span>
            <span className="text-slate-600 dark:text-slate-300">
              {formatRetrievedAt(awsMeta.retrievedAt)}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5 text-xs">
            <span className="text-slate-400">Estado de Caché</span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                awsMeta.cacheStatus === 'MISS'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300'
                  : 'bg-blue-500/15 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300'
              }`}
            >
              {awsMeta.cacheStatus === 'MISS' ? 'AWS LIVE (Consulta directa)' : 'CACHE AWS (Caché local/Atlas)'}
            </span>
          </div>
        </div>

        {/* Pie de modal */}
        <div className="mt-2 rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500 dark:bg-[#131d33] dark:text-slate-400">
          Nota de seguridad: Esta aplicación realiza exclusivamente consultas de lectura de precios a la API de AWS. No crea ni modifica recursos de infraestructura.
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
