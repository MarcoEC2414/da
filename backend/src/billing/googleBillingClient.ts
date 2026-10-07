import { env } from '../config/env';
import { redactUrl } from './redact';

const BASE_URL = 'https://cloudbilling.googleapis.com/v1';

export interface RawPricingTier {
  startUsageAmount?: string;
  unitPrice?: { units?: string; nanos?: number };
}

export interface RawPricingInfo {
  currencyCode?: string;
  summary?: string;
  pricingExpression?: {
    usageUnit?: string;
    tieredRates?: RawPricingTier[];
  };
}

export interface RawSku {
  name?: string;
  skuId?: string;
  description?: string;
  category?: { resourceFamily?: string; resourceGroup?: string; serviceDisplayName?: string };
  serviceRegions?: string[];
  pricingInfo?: RawPricingInfo[];
}

interface ListSkusResponse {
  skus?: RawSku[];
  nextPageToken?: string;
}

/**
 * Obtiene los SKUs de un servicio del catálogo público de Google usando la API key
 * como parámetro `?key=`. La URL nunca se loguea; si se necesita, se usa `redactUrl`.
 */
async function fetchSkuPage(serviceId: string, pageToken?: string): Promise<ListSkusResponse> {
  const page = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
  const url = `${BASE_URL}/services/${serviceId}/skus?key=${encodeURIComponent(env.GOOGLE_BILLING_API_KEY ?? '')}&pageSize=5000${page}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw new Error(`No se pudo consultar el catálogo (${redactUrl(url)})`, { cause });
  }

  if (!response.ok) {
    let detail = '';
    try {
      detail = (await response.text()).slice(0, 200);
    } catch {
      /* sin cuerpo legible */
    }
    throw new Error(
      `El catálogo respondió ${response.status} (${redactUrl(url)}). ${detail}`.trim()
    );
  }

  return (await response.json()) as ListSkusResponse;
}

export async function listCatalogSkus(serviceId: string): Promise<RawSku[]> {
  const skus: RawSku[] = [];
  let pageToken: string | undefined;

  do {
    const page = await fetchSkuPage(serviceId, pageToken);
    skus.push(...(page.skus ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);

  return skus;
}