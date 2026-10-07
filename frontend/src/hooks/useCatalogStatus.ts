import { useEffect, useState } from 'react';
import rates from '../../../shared/awsRates.json';
import { REGIONS } from '../data/regions';
import { SERVICE_DEFINITIONS } from '../data/awsServices';

const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '');

export interface CatalogInfo {
  ok: boolean;
  status: string;
  source: string;
  provider: string;
  mode: string;
  notice: string;
  referenceDate: string;
  serviceCount: number;
  regionCount: number;
  currency: string;
}

/** Fallback estático para el modo demo (sin backend): los datos del JSON local. */
function fallbackInfo(): CatalogInfo {
  return {
    ok: true,
    status: 'ready',
    source: 'json',
    provider: rates.meta.provider,
    mode: rates.meta.mode,
    notice: rates.meta.notice,
    referenceDate: rates.meta.referenceDate,
    serviceCount: SERVICE_DEFINITIONS.length,
    regionCount: REGIONS.length,
    currency: rates.currency,
  };
}

export interface UseCatalogStatusResult {
  status: 'loading' | 'ready' | 'error';
  info: CatalogInfo | null;
  retry: () => void;
}

export function useCatalogStatus(): UseCatalogStatusResult {
  const [info, setInfo] = useState<CatalogInfo | null>(null);
  const [status, setStatus] = useState<UseCatalogStatusResult['status']>('loading');
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetch(`${API_BASE}/health`)
      .then((res) => {
        if (!res.ok) throw new Error(`http-${res.status}`);
        return res.json() as Promise<CatalogInfo>;
      })
      .then((data) => {
        if (cancelled) return;
        setInfo(data);
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setInfo(fallbackInfo());
        setStatus('ready');
      });
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  return { status, info, retry: () => setNonce((n) => n + 1) };
}