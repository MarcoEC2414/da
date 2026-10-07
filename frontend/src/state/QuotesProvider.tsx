import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CloudService, Currency, QuoteStatus, ServiceQuote } from '../types';
import { usePricing, type UsePricingResult } from '../hooks/usePricing';
import { useEstimation } from './EstimationProvider';

export interface ServiceQuoteState {
  status: QuoteStatus;
  quote: ServiceQuote | null;
  retry: () => void;
}

interface QuotesContextValue {
  quotes: Record<string, ServiceQuoteState>;
}

const QuotesContext = createContext<QuotesContextValue | null>(null);

function ServiceFetcher({
  service,
  region,
  currency,
  onResult,
}: {
  service: CloudService;
  region: string;
  currency: Currency;
  onResult: (id: string, result: UsePricingResult) => void;
}) {
  const result = usePricing(service, region, currency);
  const { status, quote, retry } = result;

  useEffect(() => {
    onResult(service.id, { status, quote, retry });
  }, [service.id, status, quote, retry, onResult]);

  return null;
}

/**
 * Centraliza las cotizaciones de todos los servicios de la estimación actual.
 * Una sola petición por servicio (mock o backend), compartida entre las
 * tarjetas y el resumen. La UI solo lee el contexto; nunca toca pricing/.
 *
 * `enabled` gatea la cotización: el precio solo se pide cuando estamos en la
 * pantalla de resultados (paso 2). Al desactivarlo se limpian las cotizaciones.
 */
export function QuotesProvider({ enabled = true, children }: { enabled?: boolean; children: ReactNode }) {
  const { state } = useEstimation();
  const [quotes, setQuotes] = useState<Record<string, UsePricingResult>>({});

  useEffect(() => {
    if (!enabled) setQuotes({});
  }, [enabled]);

  const onResult = useCallback((id: string, result: UsePricingResult) => {
    setQuotes((prev) => {
      const existing = prev[id];
      if (existing && existing.status === result.status && existing.quote === result.quote) {
        return prev;
      }
      return { ...prev, [id]: result };
    });
  }, []);

  const value = useMemo<QuotesContextValue>(() => ({ quotes }), [quotes]);

  return (
    <QuotesContext.Provider value={value}>
      {enabled
        ? state.services.map((s) => (
            <ServiceFetcher
              key={s.id}
              service={s}
              region={state.region}
              currency={state.currency}
              onResult={onResult}
            />
          ))
        : null}
      {children}
    </QuotesContext.Provider>
  );
}

export function useQuotes(): QuotesContextValue {
  const ctx = useContext(QuotesContext);
  if (!ctx) throw new Error('useQuotes debe usarse dentro de <QuotesProvider>');
  return ctx;
}

export function useServiceQuote(serviceId: string): ServiceQuoteState {
  const { quotes } = useQuotes();
  return (
    quotes[serviceId] ?? {
      status: 'loading',
      quote: null,
      retry: () => {},
    }
  );
}