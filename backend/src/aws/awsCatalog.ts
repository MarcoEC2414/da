import ratesJson from '../../../shared/awsRates.json';
import regionsJson from '../../../shared/awsRegions.json';
import { getDb } from '../db/mongo';
import { env } from '../config/env';
import type { ServiceQuote, RegionQuotesResponse } from '../types';

export type AwsServiceKind = 'ec2' | 'rds' | 's3' | 'lambda' | 'dynamodb' | 'sns' | 'cloudfront' | 'route53';

export type SpecValue = string | number | boolean;
export interface AwsServiceBody {
  id: string;
  name: string;
  kind: string;
  spec: Record<string, SpecValue>;
}

export interface QuoteLine {
  label: string;
  amount: number;
}

export interface QuoteResult {
  monthly: number;
  hourly: number;
  currency: 'USD';
  breakdown: QuoteLine[];
}

export interface RegionInfo {
  id: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}

interface LoadedCatalog {
  rates: typeof ratesJson;
  regions: RegionInfo[];
  source: 'json' | 'mongo';
}

let cached: LoadedCatalog | null = null;

function num(value: SpecValue | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function bool(value: SpecValue | undefined): boolean {
  return value === true;
}

function str(value: SpecValue | undefined, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function loadFromMongo(): Promise<LoadedCatalog | null> {
  if (env.NODE_ENV === 'test') return null;
  const db = await getDb();
  if (!db) return null;
  try {
    const [ratesDoc, regionsDoc] = await Promise.all([
      db.collection('aws_catalog').findOne({ slug: 'rates' }),
      db.collection('aws_catalog').findOne({ slug: 'regions' }),
    ]);
    if (!ratesDoc || !regionsDoc || typeof ratesDoc['data'] === 'undefined' || typeof regionsDoc['data'] === 'undefined') {
      return null;
    }
    const rates = ratesDoc['data'] as Record<string, unknown>;
    const regions = regionsDoc['data'] as unknown[];
    if (!rates['ec2'] || !Array.isArray(regions)) return null;
    return {
      rates: rates as typeof ratesJson,
      regions: regions as RegionInfo[],
      source: 'mongo',
    };
  } catch {
    return null;
  }
}

/** Carga el catálogo simulado (Mongo Atlas si está disponible, si no los JSON locales). */
export async function getAwsCatalog(): Promise<LoadedCatalog> {
  if (cached) return cached;
  const fromMongo = await loadFromMongo();
  cached = fromMongo ?? {
    rates: ratesJson,
    regions: regionsJson.regions as RegionInfo[],
    source: 'json',
  };
  return cached;
}

export async function getCatalogStatus(): Promise<{ status: 'ready'; source: 'json' | 'mongo' }> {
  const catalog = await getAwsCatalog();
  return { status: 'ready', source: catalog.source };
}

export interface CatalogMeta {
  provider: string;
  mode: string;
  notice: string;
  referenceDate: string;
  source: 'json' | 'mongo';
  serviceCount: number;
  regionCount: number;
  currency: string;
}

const META_KEYS = ['meta', 'currency', 'fxRates', 'regionFactor'];

export async function getCatalogMeta(): Promise<CatalogMeta> {
  const catalog = await getAwsCatalog();
  const serviceCount = Object.keys(catalog.rates).filter((k) => !META_KEYS.includes(k)).length;
  return {
    provider: catalog.rates.meta.provider,
    mode: catalog.rates.meta.mode,
    notice: catalog.rates.meta.notice,
    referenceDate: catalog.rates.meta.referenceDate,
    source: catalog.source,
    serviceCount,
    regionCount: catalog.regions.length,
    currency: catalog.rates.currency,
  };
}

export async function getRegionInfo(id: string): Promise<RegionInfo | undefined> {
  const { regions } = await getAwsCatalog();
  return regions.find((r) => r.id === id);
}

export async function getRegions(): Promise<RegionInfo[]> {
  const { regions } = await getAwsCatalog();
  return regions;
}

export function regionFactor(rates: typeof ratesJson, regionId: string): number | null {
  const factor = rates.regionFactor[regionId as keyof typeof rates.regionFactor];
  return typeof factor === 'number' ? factor : null;
}

function compute(rates: typeof ratesJson, kind: string, spec: Record<string, SpecValue>, regionId: string): QuoteResult | null {
  const factor = regionFactor(rates, regionId);
  if (factor === null) return null;

  const roundLine = (amount: number): number => round2(amount);

  switch (kind) {
    case 'ec2': {
      const type = rates.ec2.types.find((t) => t.id === str(spec.instanceType, ''));
      if (!type) return null;
      const os = str(spec.os, 'linux') as keyof typeof rates.ec2.osFactor;
      const osMult = rates.ec2.osFactor[os] ?? 1;
      const hours = num(spec.hoursPerMonth, rates.ec2.monthlyHours);
      const count = num(spec.instanceCount, 1);
      const rate = type.platformPrice * osMult * factor;
      const monthlyTotal = rate * hours * count;
      const monthly = roundLine(monthlyTotal);
      return {
        monthly,
        hourly: round2(monthly / rates.ec2.monthlyHours),
        currency: 'USD',
        breakdown: [
          { label: `${type.label} (${os}) × ${count}`, amount: monthly },
        ],
      };
    }
    case 'rds': {
      const type = rates.rds.types.find((t) => t.id === str(spec.instanceType, ''));
      if (!type) return null;
      const engine = str(spec.engine, 'postgresql');
      const multiAz = bool(spec.multiAz);
      const storageGb = num(spec.storageGb, 100);
      const instance = type.price * (multiAz ? rates.rds.multiAzFactor : 1) * factor * rates.rds.monthlyHours;
      const storage = storageGb * rates.rds.storagePerGbMonth * factor;
      const monthly = roundLine(instance + storage);
      return {
        monthly,
        hourly: round2(monthly / rates.rds.monthlyHours),
        currency: 'USD',
        breakdown: [
          { label: `${type.label} (${engine}${multiAz ? ', Multi-AZ' : ', Single-AZ'})`, amount: roundLine(instance) },
          { label: `Almacenamiento ${storageGb} GB (gp3)`, amount: roundLine(storage) },
        ],
      };
    }
    case 's3': {
      const storageClass = rates.s3.classes.find((c) => c.id === str(spec.storageClass, 'standard'));
      if (!storageClass) return null;
      const storageGb = num(spec.storageGb, 1000);
      const monthly = roundLine(storageGb * storageClass.price * factor);
      return {
        monthly,
        hourly: round2(monthly / 730),
        currency: 'USD',
        breakdown: [{ label: `${storageClass.label} — ${storageGb} GB`, amount: monthly }],
      };
    }
    case 'lambda': {
      const requestsMillions = num(spec.requestsMillions, 0);
      const gbSeconds = num(spec.gbSeconds, 0);
      const requests = requestsMillions * rates.lambda.requestPerMillion * factor;
      const compute = gbSeconds * rates.lambda.gbSecond * factor;
      const monthly = roundLine(requests + compute);
      return {
        monthly,
        hourly: round2(monthly / 730),
        currency: 'USD',
        breakdown: [
          { label: `${requestsMillions} M invocaciones`, amount: roundLine(requests) },
          ...(gbSeconds > 0 ? [{ label: `${gbSeconds} GB-segundo`, amount: roundLine(compute) }] : []),
        ],
      };
    }
    case 'dynamodb': {
      const storageGb = num(spec.storageGb, 100);
      const rcu = num(spec.readCapacityUnits, 5);
      const wcu = num(spec.writeCapacityUnits, 5);
      const storage = storageGb * rates.dynamodb.storagePerGbMonth * factor;
      const read = rcu * 730 * rates.dynamodb.rcuPerHour * factor;
      const write = wcu * 730 * rates.dynamodb.wcuPerHour * factor;
      const monthly = roundLine(storage + read + write);
      return {
        monthly,
        hourly: round2(monthly / 730),
        currency: 'USD',
        breakdown: [
          { label: `Almacenamiento ${storageGb} GB`, amount: roundLine(storage) },
          { label: `${rcu} RCU`, amount: roundLine(read) },
          { label: `${wcu} WCU`, amount: roundLine(write) },
        ],
      };
    }
    case 'sns': {
      const requestsMillions = num(spec.requestsMillions, 1);
      const monthly = roundLine(requestsMillions * rates.sns.requestPerMillion * factor);
      return {
        monthly,
        hourly: round2(monthly / 730),
        currency: 'USD',
        breakdown: [{ label: `${requestsMillions} M publicaciones`, amount: monthly }],
      };
    }
    case 'cloudfront': {
      const dataOutGb = num(spec.dataOutGb, 100);
      const monthly = roundLine(dataOutGb * rates.cloudfront.dataOutPerGb * factor);
      return {
        monthly,
        hourly: round2(monthly / 730),
        currency: 'USD',
        breakdown: [{ label: `${dataOutGb} GB de salida`, amount: monthly }],
      };
    }
    case 'route53': {
      const zones = num(spec.zones, 1);
      const queriesMillions = num(spec.queriesMillions, 0);
      const zoneCost = zones * rates.route53.hostedZonePerMonth * factor;
      const queryCost = queriesMillions * rates.route53.queryPerMillion * factor;
      const monthly = roundLine(zoneCost + queryCost);
      return {
        monthly,
        hourly: round2(monthly / 730),
        currency: 'USD',
        breakdown: [
          { label: `${zones} zona(s) hospedada(s)`, amount: roundLine(zoneCost) },
          ...(queriesMillions > 0 ? [{ label: `${queriesMillions} M consultas`, amount: roundLine(queryCost) }] : []),
        ],
      };
    }
    default:
      return null;
  }
}

export async function estimateServiceUsd(
  service: AwsServiceBody,
  regionId: string
): Promise<QuoteResult | null> {
  const { rates } = await getAwsCatalog();
  return compute(rates, service.kind, service.spec, regionId);
}

export async function quoteForService(service: AwsServiceBody, regionId: string): Promise<ServiceQuote | null> {
  const result = await estimateServiceUsd(service, regionId);
  if (!result) return null;
  return { serviceId: service.id, ...result };
}

export async function quoteAllRegions(services: AwsServiceBody[]): Promise<RegionQuotesResponse> {
  const { rates } = await getAwsCatalog();
  const regions = regionsJson.regions as RegionInfo[];
  const quotes = regions.map((region) => {
    const totals = services
      .map((service) => compute(rates, service.kind, service.spec, region.id))
      .filter((q): q is QuoteResult => q !== null);

    const monthly = totals.length > 0 ? round2(totals.reduce((sum, q) => sum + q.monthly, 0)) : null;
    return { regionId: region.id, monthly, status: totals.length > 0 ? ('ok' as const) : ('no-data' as const) };
  });
  return { currency: 'USD', quotes };
}