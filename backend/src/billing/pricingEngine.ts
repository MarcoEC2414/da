import type { CatalogSku } from './normalize';
import { INSTANCE_SPECS, DB_SIZE_SPECS } from '../data/products';
import { skuAppliesTo } from '../data/regions';

export const HOURS_PER_MONTH = 730;

export interface ComputeSpec {
  instanceType: string;
  os: string;
  hoursPerMonth: number;
  instanceCount: number;
}

export interface DatabaseSpec {
  engine: string; // 'mysql' | 'postgresql'
  instanceSize: string;
  storageGb: number;
  highAvailability: boolean;
}

export interface StorageSpec {
  storageGb: number;
  storageClass: string; // 'standard' | 'nearline' | 'coldline' | 'archive'
}

export interface CostBreakdownItem {
  label: string;
  amount: number;
}

export interface QuoteResult {
  monthly: number;
  hourly: number;
  currency: 'USD';
  breakdown: CostBreakdownItem[];
}

const lower = (sku: CatalogSku): string => sku.description.toLowerCase();
const isHourly = (sku: CatalogSku): boolean => sku.unit.includes('h');
const isPriced = (sku: CatalogSku): boolean => sku.unitPriceUsd > 0;

const EXCLUDE = /committed|sustained|scaled|license|licensing|certificate|ssl/;

interface Filter {
  family?: RegExp | null;
  extra?: (sku: CatalogSku) => boolean;
  slot?: (sku: CatalogSku) => boolean;
}

function applicable(all: CatalogSku[], regionId: string, filter: Filter = {}): CatalogSku[] {
  const { family = null, extra = () => true, slot = () => true } = filter;
  return all.filter(
    (sku) =>
      !EXCLUDE.test(lower(sku)) &&
      isPriced(sku) &&
      skuAppliesTo(sku, regionId) &&
      slot(sku) &&
      (family === null || family.test(lower(sku))) &&
      extra(sku)
  );
}

function cheapest(list: CatalogSku[]): CatalogSku | null {
  if (list.length === 0) return null;
  return list.reduce((best, cur) => (cur.unitPriceUsd < best.unitPriceUsd ? cur : best));
}

const round = (n: number): number => Math.round(n * 100) / 100;

/* ------------------------------------------------------------------ */
/* Compute Engine                                                      */
/* ------------------------------------------------------------------ */

interface CoreRam {
  core: number | null;
  ram: number | null;
}

/** Reglas de filtrado para SKUs de Compute Engine (vCPU + memoria). */
function computeSlot(sku: CatalogSku): boolean {
  const l = lower(sku);
  if (/\bpreemptible\b|\bspot\b/.test(l)) return false;
  if (/\broadcast|multicast|local ssd|gpu\b|tap|balanced pd|extreme pd/.test(l)) return false;
  return sku.resourceFamily.toLowerCase() === 'compute';
}

function findCoreRam(all: CatalogSku[], regionId: string, family: string): CoreRam {
  const fam = applicable(all, regionId, {
    family: new RegExp(`\\b${family}\\b`, 'i'),
    extra: (s) => isHourly(s),
    slot: computeSlot,
  });
  const core = cheapest(fam.filter((s) => /\bcore\b/.test(lower(s)) && !/\bram\b/.test(lower(s))));
  const ram = cheapest(fam.filter((s) => /\bram\b/.test(lower(s))));
  return { core: core ? core.unitPriceUsd : null, ram: ram ? ram.unitPriceUsd : null };
}

function estimateCompute(all: CatalogSku[], regionId: string, spec: ComputeSpec): QuoteResult | null {
  const instance = INSTANCE_SPECS.find((i) => i.id === spec.instanceType);
  if (!instance) return null;
  if (![1, 730].includes(spec.hoursPerMonth) && !(spec.hoursPerMonth > 0 && spec.hoursPerMonth <= 730)) return null;

  // Preferir la familia real; si no existe en la región, caer a e2.
  let unit = findCoreRam(all, regionId, instance.family);
  if (unit.core === null || unit.ram === null) unit = findCoreRam(all, regionId, 'e2');
  if (unit.core === null || unit.ram === null) return null;

  // Sin multiplicadores inventados: el costo sale directo del catálogo (core + ram).
  const hourly = unit.core * instance.vCpu + unit.ram * instance.memoryGb;
  const monthly = round(hourly * spec.hoursPerMonth * spec.instanceCount);
  if (monthly <= 0) return null;

  return {
    monthly,
    hourly: round(hourly),
    currency: 'USD',
    breakdown: [
      {
        label: `${spec.os} · ${instance.vCpu} vCPU · ${instance.memoryGb} GB ×${spec.instanceCount} (${spec.hoursPerMonth}h/mes)`,
        amount: monthly,
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Cloud SQL                                                           */
/* ------------------------------------------------------------------ */

const VCPU_RE = /\b(\d+(?:\.\d+)?)\s*vcpu\b/i;
const MEM_RE = /\b(\d+(?:\.\d+)?)\s*(?:gb|gib)\b/i;

const parseVcpu = (l: string): number | null => {
  const m = l.match(VCPU_RE);
  return m ? Number(m[1]) : null;
};

const parseMemGb = (l: string): number | null => {
  const m = l.match(MEM_RE);
  return m ? Number(m[1]) : null;
};

const tokenIn = (engine: string): RegExp => new RegExp(`\\b${engine}(\\b|\\s)`, 'i');

const DB_EXCLUDE = /storage|backup|add.?on|ip address|load balancing|snapshot|certificate|dns|monitoring|monitor/;

function dbCandidates(all: CatalogSku[], regionId: string, engine: string): CatalogSku[] {
  return applicable(all, regionId, {
    extra: (s) => {
      const l = lower(s);
      return tokenIn(engine).test(l) && isHourly(s) && !DB_EXCLUDE.test(l);
    },
  });
}

/**
 * Empareja la SKU de instancia de Cloud SQL: vCPU + memoria iguales a la
 * configuración (o token exacto para f1-micro) y preferencia HA/Zonal según spec.
 */
function matchDbInstance(all: CatalogSku[], regionId: string, spec: DatabaseSpec): number | null {
  const pool = dbCandidates(all, regionId, spec.engine);
  if (pool.length === 0) return null;

  const desired = DB_SIZE_SPECS.find((d) => d.id === spec.instanceSize);

  const scored = pool
    .map((sku) => {
      const l = lower(sku);
      const isHa = l.includes('high availability') || l.includes('(2 units)');
      const isZonal = l.includes('zonal');
      const f1 = /\bf1-micro\b|\bmicro instance\b/.test(l);
      const vcpu = parseVcpu(l);
      const mem = parseMemGb(l);

      let ok: boolean;
      if (spec.instanceSize === 'db-f1-micro') {
        ok = f1 || (vcpu !== null && vcpu === 1);
      } else if (desired) {
        ok =
          vcpu !== null &&
          vcpu === desired.vCpu &&
          mem !== null &&
          Math.abs(mem - desired.memoryGb) <= 1.5;
      } else {
        ok = vcpu !== null;
      }
      return { sku, ok, isHa, isZonal };
    })
    .filter((r) => r.ok && r.sku.unitPriceUsd > 0);

  if (scored.length === 0) return null;

  const withHa = scored.filter((r) => r.isHa);
  const zonal = scored.filter((r) => !r.isHa && (r.isZonal || withHa.length === 0));
  const chosen = spec.highAvailability ? withHa : zonal;
  const best = cheapest((chosen.length > 0 ? chosen : scored).map((r) => r.sku));
  return best ? best.unitPriceUsd : null;
}

/** Precio mensual por GiB de storage en Cloud SQL (preferencia SSD). */
function matchDbStorage(all: CatalogSku[], regionId: string, engine: string): number | null {
  const pool = all.filter((sku) => {
    const l = lower(sku);
    if (!tokenIn(engine).test(l) || !l.includes('storage')) return false;
    if (EXCLUDE.test(l) || !isPriced(sku) || !skuAppliesTo(sku, regionId)) return false;
    const monthly = l.includes('month') || /mo|gibyte/.test(sku.unit.toLowerCase());
    return monthly;
  });
  const ssd = cheapest(pool.filter((s) => lower(s).includes('ssd')));
  const chosen = ssd ?? cheapest(pool);
  return chosen ? chosen.unitPriceUsd : null;
}

function estimateDatabase(all: CatalogSku[], regionId: string, spec: DatabaseSpec): QuoteResult | null {
  const instancePerHour = matchDbInstance(all, regionId, spec);
  if (instancePerHour === null) return null;

  const storagePerGbMonth = matchDbStorage(all, regionId, spec.engine);
  if (storagePerGbMonth === null || storagePerGbMonth <= 0) return null;

  const instanceMonthly = round(instancePerHour * HOURS_PER_MONTH);
  const storageMonthly = round(storagePerGbMonth * spec.storageGb);
  const monthly = round(instanceMonthly + storageMonthly);
  if (monthly <= 0) return null;

  return {
    monthly,
    hourly: round(monthly / HOURS_PER_MONTH),
    currency: 'USD',
    breakdown: [
      {
        label: `Instancia ${spec.engine} (${spec.instanceSize}${spec.highAvailability ? ', HA' : ''})`,
        amount: instanceMonthly,
      },
      { label: `Storage SSD ${spec.storageGb} GB`, amount: storageMonthly },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Cloud Storage                                                       */
/* ------------------------------------------------------------------ */

const STORAGE_CLASS_TOKENS: Record<string, RegExp> = {
  standard: /\bstandard storage\b/i,
  nearline: /\bnearline storage\b/i,
  coldline: /\bcoldline storage\b/i,
  archive: /\barchive storage\b/i,
};

const STORAGE_LABELS: Record<string, string> = {
  standard: 'Standard',
  nearline: 'Nearline',
  coldline: 'Coldline',
  archive: 'Archive',
};

function estimateStorage(all: CatalogSku[], regionId: string, spec: StorageSpec): QuoteResult | null {
  const token = STORAGE_CLASS_TOKENS[spec.storageClass];
  if (!token) return null;

  const pool = all.filter((sku) => {
    const l = lower(sku);
    if (!token.test(l) || !skuAppliesTo(sku, regionId)) return false;
    if (EXCLUDE.test(l) || !isPriced(sku)) return false;
    const monthly = l.includes('month') || /mo|gibyte/.test(sku.unit.toLowerCase());
    return monthly;
  });

  const best = cheapest(pool);
  if (!best) return null;

  const monthly = round(best.unitPriceUsd * spec.storageGb);
  if (monthly <= 0) return null;

  return {
    monthly,
    hourly: round(monthly / HOURS_PER_MONTH),
    currency: 'USD',
    breakdown: [{ label: `${STORAGE_LABELS[spec.storageClass]} ${spec.storageGb} GB`, amount: monthly }],
  };
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

export function estimateServiceUsd(
  serviceId: 'compute' | 'database' | 'storage',
  spec: ComputeSpec | DatabaseSpec | StorageSpec,
  regionId: string,
  catalog: Record<'compute' | 'database' | 'storage', CatalogSku[]>
): QuoteResult | null {
  switch (serviceId) {
    case 'compute':
      return estimateCompute(catalog.compute, regionId, spec as ComputeSpec);
    case 'database':
      return estimateDatabase(catalog.database, regionId, spec as DatabaseSpec);
    case 'storage':
      return estimateStorage(catalog.storage, regionId, spec as StorageSpec);
    default:
      return null;
  }
}