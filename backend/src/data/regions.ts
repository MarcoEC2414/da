import regions from '../../../shared/regions.json';
import type { CatalogSku } from '../billing/normalize';

export interface Region {
  id: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  multiregion: 'us' | 'europe' | 'asia' | null;
}

export const REGIONS: Region[] = regions as Region[];

export function getRegion(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}

/** Precedencia región concreta > multirregión (us/europe/asia) > global. */
export function skuAppliesTo(sku: CatalogSku, regionId: string): boolean {
  if (sku.serviceRegions.length === 0) return false;
  if (sku.serviceRegions.includes('global')) return true;

  const region = getRegion(regionId);
  if (!region) return false;

  if (sku.serviceRegions.includes(region.id)) return true;
  return region.multiregion !== null && sku.serviceRegions.includes(region.multiregion);
}