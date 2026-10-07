import { env } from '../config/env';
import { redactMessage } from './redact';
import { SERVICES, type CatalogServiceId } from './serviceIds';
import { listCatalogSkus } from './googleBillingClient';
import { normalizeCatalog, type CatalogSku } from './normalize';

export type CatalogStatus = 'idle' | 'syncing' | 'ready' | 'error';

const store = new Map<string, CatalogSku[]>();

let status: CatalogStatus = 'idle';
let lastSyncAt: number | null = null;
let lastError: string | null = null;
let started = false;
let timer: NodeJS.Timeout | null = null;

export function getCatalogStatus(): {
  status: CatalogStatus;
  lastSyncAt: number | null;
  lastError: string | null;
  skuTotals: Record<CatalogServiceId, number>;
} {
  const skuTotals = Object.fromEntries(
    Object.values(SERVICES).map((id) => [id, store.get(id)?.length ?? 0])
  ) as Record<CatalogServiceId, number>;
  return { status, lastSyncAt, lastError, skuTotals };
}

export async function syncCatalog(): Promise<void> {
  status = 'syncing';
  try {
    const next = new Map<string, CatalogSku[]>();
    for (const [name, serviceId] of Object.entries(SERVICES)) {
      const raw = await listCatalogSkus(serviceId);
      const normalized = normalizeCatalog(serviceId, raw);
      next.set(serviceId, normalized);
      console.log(`Catálogo: ${name} (${serviceId}) -> ${normalized.length} SKUs`);
    }
    store.clear();
    for (const [id, skus] of next) store.set(id, skus);
    status = 'ready';
    lastSyncAt = Date.now();
    lastError = null;
    console.log('Catálogo sincronizado correctamente.');
  } catch (cause) {
    status = 'error';
    lastError = cause instanceof Error ? redactMessage(cause.message) : String(cause);
    console.error('Error sincronizando el catálogo:', lastError);
    throw cause;
  }
}

/** Inicia la sincronización inicial y el refresco periódico (sin bloquear el arranque). */
export function startCatalogSync(): void {
  if (started) return;
  started = true;

  void syncCatalog().catch(() => {
    /* visible vía getCatalogStatus() */
  });

  timer = setInterval(
    () => {
      void syncCatalog().catch(() => {
        /* visible vía getCatalogStatus() */
      });
    },
    env.CATALOG_REFRESH_MS
  );
  timer.unref();
}

/** Devuelve el catálogo listo para consulta, o null si aún no se sincronizó. */
export function getCatalogReady(): { skus: CatalogSku[]; serviceId: CatalogServiceId; key: string }[] | null {
  if (status !== 'ready') return null;
  return Array.from(store.entries()).map(([key, skus]) => ({
    skus,
    serviceId: key as CatalogServiceId,
    key,
  }));
}

export function getSkusFor(serviceId: CatalogServiceId): CatalogSku[] {
  return store.get(serviceId) ?? [];
}