import { useEffect, useState } from 'react';
import type { CloudService, Currency, RegionQuote, RegionQuoteStatus } from '../types';
import { getPricingProvider } from '../pricing';
import { REGIONS } from '../data/regions';
import { useDebouncedValue } from './useDebouncedValue';

export interface UseRegionQuotesResult {
  status: 'loading' | 'ready' | 'error';
  quotes: RegionQuote[];
  retry: () => void;
}

const emptyQuotes = (): RegionQuote[] =>
  REGIONS.map((r) => ({ regionId: r.id, monthly: null, status: 'no-data' as RegionQuoteStatus }));

/**
 * Total mensual de la estimación en TODAS las regiones.
 * Debounce (500ms) para no disparar peticiones en cada tecla de los formularios.
 */
export function useRegionQuotes(services: CloudService[], currency: Currency, enabled = true): UseRegionQuotesResult {
  const provider = getPricingProvider();
  const key = JSON.stringify({ services, currency });
  const debouncedKey = useDebouncedValue(key, 500);
  const hasServices = services.length > 0 && enabled;
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<UseRegionQuotesResult>({
    status: hasServices ? 'loading' : 'ready',
    quotes: emptyQuotes(),
    retry: () => {},
  });

  useEffect(() => {
    let cancelled = false;
    if (!hasServices) {
      setResult({ status: 'ready', quotes: emptyQuotes(), retry: () => setNonce((n) => n + 1) });
      return;
    }

    const { services: ser, currency: cur } = JSON.parse(debouncedKey) as {
      services: CloudService[];
      currency: Currency;
    };

    setResult((prev) => ({ status: 'loading', quotes: prev.quotes, retry: prev.retry }));
    provider.getRegionQuotes(ser, cur).then(
      ({ quotes }) => {
        if (!cancelled) setResult({ status: 'ready', quotes, retry: () => setNonce((n) => n + 1) });
      },
      () => {
        if (!cancelled) {
          setResult({ status: 'error', quotes: emptyQuotes(), retry: () => setNonce((n) => n + 1) });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [debouncedKey, nonce, hasServices, provider]);

  return result;
}