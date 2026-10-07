import type { RawSku } from './googleBillingClient';

/** SKU normalizado a lo que el motor de precios necesita. */
export interface CatalogSku {
  skuId: string;
  serviceId: string;
  resourceFamily: string;
  resourceGroup: string;
  description: string;
  serviceRegions: string[];
  unit: string;
  /** Precio (USD) de la primera tarifa por unidad. */
  unitPriceUsd: number;
}

const toUsd = (units?: string, nanos?: number): number =>
  (Number(units ?? 0) || 0) + (Number(nanos ?? 0) || 0) / 1_000_000_000;

/** Estructura mínima del precio por unidad de un SKU (primera tarifa). */
export function normalizeSku(serviceId: string, sku: RawSku): CatalogSku | null {
  const pricing = sku.pricingInfo?.[0];
  const tier = pricing?.pricingExpression?.tieredRates?.[0];
  if (!pricing || !tier?.unitPrice) return null;

  return {
    skuId: sku.skuId ?? sku.name ?? 'unknown',
    serviceId,
    resourceFamily: sku.category?.resourceFamily ?? '',
    resourceGroup: sku.category?.resourceGroup ?? '',
    description: sku.description ?? '',
    serviceRegions: sku.serviceRegions ?? [],
    unit: pricing.pricingExpression?.usageUnit ?? '',
    unitPriceUsd: toUsd(tier.unitPrice.units, tier.unitPrice.nanos),
  };
}

export function normalizeCatalog(serviceId: string, skus: RawSku[]): CatalogSku[] {
  return skus
    .map((sku) => normalizeSku(serviceId, sku))
    .filter((sku): sku is CatalogSku => sku !== null);
}