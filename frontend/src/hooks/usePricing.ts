import { useEffect, useState } from 'react';
import type { CloudService, Currency, QuoteStatus, ServiceQuote } from '../types';
import { getPricingProvider } from '../pricing';
import { useDebouncedValue } from './useDebouncedValue';

export interface UsePricingResult {
  status: QuoteStatus;
  quote: ServiceQuote | null;
  retry: () => void;
}

function statusFor(message: string): QuoteStatus {
  switch (message) {
    case 'no-data':
      return 'no-data';
    case 'no-data-config':
      return 'no-data-config';
    case 'aws-unavailable':
      return 'aws-unavailable';
    default:
      return 'error';
  }
}

/**
 * Costo de un servicio en la región y moneda actuales.
 * Debounce corto (250ms) para no recalcular en cada tecla de los formularios.
 */
export function usePricing(service: CloudService, region: string, currency: Currency): UsePricingResult {
  const provider = getPricingProvider();
  const debounced = useDebouncedValue(service, 250);
  const key = JSON.stringify([debounced, region, currency]);
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<UsePricingResult>({ status: 'loading', quote: null, retry: () => {} });

  useEffect(() => {
    let cancelled = false;
    setResult({ status: 'loading', quote: null, retry: () => setNonce((n) => n + 1) });
    provider.getQuote(debounced, { region, currency }).then(
      (quote) => {
        if (!cancelled) setResult({ status: 'ready', quote, retry: () => setNonce((n) => n + 1) });
      },
      (err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : '';
        setResult({
          status: statusFor(message),
          quote: null,
          retry: () => setNonce((n) => n + 1),
        });
      },
    );
    return () => {
      cancelled = true;
    };
    // key ya incluye el servicio, la región y la moneda (valores debounceados)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce]);

  return result;
}