import { Fragment, useState, type ReactNode } from 'react';
import type { CloudService, AwsQuoteMeta } from '../../types';
import { useEstimation } from '../../state/EstimationProvider';
import { useServiceQuote } from '../../state/QuotesProvider';
import { configSummary, quantityLabel } from '../../data/awsServices';
import { getRegion } from '../../data/regions';
import { formatCurrency, formatRetrievedAt } from '../../utils/format';
import { ServiceBadge, Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';
import { AwsEvidenceModal } from './AwsEvidenceModal';

function SourceBadge({
  kind,
  aws,
  onShowEvidence,
}: {
  kind: string;
  aws?: AwsQuoteMeta;
  onShowEvidence: (meta: AwsQuoteMeta) => void;
}) {
  if (kind === 'ec2' && aws) {
    const isMiss = aws.cacheStatus === 'MISS';
    return (
      <div className="flex flex-col items-start gap-1">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${
            isMiss
              ? 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300'
              : 'bg-blue-500/15 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${isMiss ? 'bg-emerald-500' : 'bg-blue-500'}`} />
          {isMiss ? 'AWS LIVE' : 'CACHE AWS'}
        </span>
        <button
          type="button"
          onClick={() => onShowEvidence(aws)}
          className="text-[10px] font-semibold text-blue-600 hover:underline dark:text-blue-400"
        >
          Ver evidencia AWS
        </button>
      </div>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
      Referencia
    </span>
  );
}

function QuoteCell({ id }: { id: string }) {
  const { status, quote, retry } = useServiceQuote(id);
  switch (status) {
    case 'loading':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
          <Spinner className="h-3.5 w-3.5" />
          Calculando…
        </span>
      );
    case 'no-data':
      return <Badge>Sin datos</Badge>;
    case 'no-data-config':
      return <Badge>Configuración no disponible</Badge>;
    case 'aws-unavailable':
      return (
        <button
          type="button"
          onClick={retry}
          className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          AWS no disponible · reintentar
        </button>
      );
    case 'error':
      return (
        <button
          type="button"
          onClick={retry}
          className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          Error · reintentar
        </button>
      );
    case 'ready':
      if (quote === null) return <Badge>Sin datos</Badge>;
      return (
        <div className="flex flex-col items-end gap-0.5">
          <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
            {formatCurrency(quote.monthly, quote.currency)}
          </span>
          {quote.aws ? (
            <span className="text-[10px] text-slate-400">
              ${quote.aws.pricePerHour}/h · {formatRetrievedAt(quote.aws.retrievedAt)}
            </span>
          ) : (
            <span className="text-[10px] text-slate-400">
              {formatCurrency(quote.hourly, quote.currency)}/h
            </span>
          )}
        </div>
      );
    default:
      return null;
  }
}

function ButtonIcon({
  label,
  children,
  onClick,
  tone,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  tone?: 'danger';
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${
        tone === 'danger'
          ? 'text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400'
          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

function BreakdownLines({ serviceId }: { serviceId: string }) {
  const { quote } = useServiceQuote(serviceId);
  if (!quote) return null;
  return (
    <div className="mt-2 space-y-1.5 border-l-2 border-slate-200 pl-3 dark:border-slate-800">
      {quote.breakdown.map((line, i) => (
        <div key={i} className="flex items-baseline justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="min-w-0 truncate">{line.label}</span>
          <span className="shrink-0 font-medium tabular-nums text-slate-700 dark:text-slate-300">
            {formatCurrency(line.amount, quote.currency)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function EstimateTable({ onEditStart }: { onEditStart: (service: CloudService) => void }) {
  const { state, removeService, duplicateService } = useEstimation();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeEvidence, setActiveEvidence] = useState<AwsQuoteMeta | null>(null);
  const region = getRegion(state.region);

  if (state.services.length === 0) return null;

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800/80 dark:bg-[#0f172a]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-[#0b0f19]/70 dark:text-slate-500">
                <th className="px-4 py-3">Servicio</th>
                <th className="px-4 py-3">Región</th>
                <th className="px-4 py-3 text-right">Cantidad</th>
                <th className="px-4 py-3 text-right">Costo mensual</th>
                <th className="px-4 py-3">Fuente</th>
                <th className="w-28 px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {state.services.map((service) => {
                const expanded = expandedId === service.id;
                return (
                  <Fragment key={service.id}>
                    <tr className="align-top hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      {/* Servicio y especificación técnica */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : service.id)}
                            className="mt-1 text-slate-400 transition-transform data-[open=true]:rotate-90"
                            data-open={expanded}
                            aria-label={expanded ? 'Colapsar detalle' : 'Ver detalle'}
                            title={expanded ? 'Colapsar detalle' : 'Ver detalle'}
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 6l6 6-6 6" />
                            </svg>
                          </button>
                          <div className="min-w-0">
                            <ServiceBadge kind={service.kind} />
                            <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{service.name}</p>
                            <p className="mt-0.5 max-w-[34ch] text-xs text-slate-400 dark:text-slate-400 leading-relaxed">
                              {configSummary(service)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Región */}
                      <td className="px-4 py-3.5">
                        <span className="whitespace-nowrap text-xs font-medium text-slate-600 dark:text-slate-300">
                          {region?.name ?? state.region}
                        </span>
                      </td>

                      {/* Cantidad */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-right text-xs font-medium tabular-nums text-slate-600 dark:text-slate-300">
                        {quantityLabel(service)}
                      </td>

                      {/* Costo mensual */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <QuoteCell id={service.id} />
                      </td>

                      {/* Fuente de la tarifa */}
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <ServiceSourceCell service={service} onShowEvidence={setActiveEvidence} />
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1">
                          <ButtonIcon label="Duplicar servicio" onClick={() => duplicateService(service.id)}>
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="11" height="11" rx="2" />
                              <path d="M5 15V5a2 2 0 012-2h10" />
                            </svg>
                          </ButtonIcon>
                          <ButtonIcon label="Editar servicio" onClick={() => onEditStart(service)}>
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                            </svg>
                          </ButtonIcon>
                          <ButtonIcon label="Eliminar servicio" onClick={() => removeService(service.id)} tone="danger">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                            </svg>
                          </ButtonIcon>
                        </div>
                      </td>
                    </tr>

                    {/* Desglose colapsable */}
                    {expanded ? (
                      <tr className="bg-slate-50/60 dark:bg-[#0b0f19]/40">
                        <td colSpan={6} className="px-4 py-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Desglose de cálculo
                          </p>
                          <BreakdownLines serviceId={service.id} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de evidencia de AWS */}
      <AwsEvidenceModal
        awsMeta={activeEvidence}
        regionCode={state.region}
        onClose={() => setActiveEvidence(null)}
      />
    </>
  );
}

function ServiceSourceCell({
  service,
  onShowEvidence,
}: {
  service: CloudService;
  onShowEvidence: (meta: AwsQuoteMeta) => void;
}) {
  const { quote } = useServiceQuote(service.id);
  return <SourceBadge kind={service.kind} aws={quote?.aws} onShowEvidence={onShowEvidence} />;
}