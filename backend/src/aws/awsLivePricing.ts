import { PricingClient, GetProductsCommand } from '@aws-sdk/client-pricing';
import regionsJson from '../../../shared/awsRegions.json';
import { redactMessage } from '../billing/redact';

/**
 * Cotizaciones REALES de Amazon EC2 (On-Demand) contra la AWS Price List API.
 *
 * - El cliente SDK se crea de forma diferida (lazy) y solo si hay credenciales.
 * - La API de precios solo se expone en us-east-1 y ap-south-1; el cliente usa
 *   us-east-1 aunque el recurso cotizado sea de otra región (el filtro location
 *   determina la región del recurso).
 * - Se consulta con GetProducts (solo lectura) y se extrae el precio USD por hora
 *   de terms.OnDemand[offer].priceDimensions.
 * - Caché en memoria compartida (estimate + regions) con TTL de 30 minutos.
 *
 * SIN aprovisionamiento: este módulo jamás crea instancias ni recursos AWS.
 */

export type AwsOperatingSystem = 'Linux' | 'Windows' | 'SUSE';
export type Ec2CacheStatus = 'HIT' | 'MISS';

export const EC2_PRICE_CACHE_TTL_MS = 30 * 60 * 1000;
export const EC2_PRICE_API_REGION = 'us-east-1';
export const EC2_REGIONS_CONCURRENCY = 6;

export type Ec2PricingErrorKind = 'CONFIGURATION_NOT_FOUND' | 'AWS_UNAVAILABLE';

export class Ec2PricingError extends Error {
  readonly kind: Ec2PricingErrorKind;
  readonly statusCode: number;

  constructor(kind: Ec2PricingErrorKind, statusCode: number, message: string) {
    super(message);
    this.name = 'Ec2PricingError';
    this.kind = kind;
    this.statusCode = statusCode;
  }
}

interface RegionRecord {
  id: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}

const regionRecords = regionsJson.regions as RegionRecord[];

export const REGION_CODES: string[] = regionRecords.map((r) => r.id);

/** El `name` de awsRegions.json es el nombre de visualización de AWS. */
export function regionToLocation(regionId: string): string | null {
  return regionRecords.find((r) => r.id === regionId)?.name ?? null;
}

export function regionName(regionId: string): string | null {
  return regionToLocation(regionId);
}

/**
 * La AWS Price List API usa nombres de localización heredados que NO coinciden
 * siempre con el nombre de visualización de awsRegions.json (p. ej. el display
 * es "Europe (Ireland)" pero el filtro location real es "EU (Ireland)").
 * Verificado con GetAttributeValues(AmazonEC2, location) el 2026-10-07.
 */
export const PRICING_LOCATION_OVERRIDES: Record<string, string> = {
  'eu-west-1': 'EU (Ireland)',
  'eu-west-2': 'EU (London)',
  'eu-west-3': 'EU (Paris)',
  'eu-central-1': 'EU (Frankfurt)',
  'eu-central-2': 'Europe (Zurich)',
  'eu-north-1': 'EU (Stockholm)',
  'eu-south-1': 'EU (Milan)',
};

/**
 * La Pricing API solo acepta caracteres ASCII en el filtro location
 * (a-z, A-Z, 0-9 y un subconjunto de puntuación). awsRegions.json conserva
 * acentos legibles (p. ej. "South America (São Paulo)"), así que se normaliza
 * eliminando diacríticos y reemplazando cualquier carácter no permitido.
 */
export function asciiLocation(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ()%&+\-.,/:;<=>_]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Location exacto de la Pricing API (override + ASCII) para GetProducts. */
export function ec2LocationOf(regionId: string): string | null {
  const raw = PRICING_LOCATION_OVERRIDES[regionId] ?? regionToLocation(regionId);
  return raw ? asciiLocation(raw) : null;
}

export interface ParsedEc2Price {
  pricePerHour: number;
  sku: string;
}

/**
 * Estructura de un producto tal y como la expone la Pricing API. Las versiones
 * recientes del SDK devuelven los elementos de PriceList como objetos o como
 * String (caja) que envuelven el JSON; versiones anteriores los devolvían como
 * strings JSON. El parser normaliza los tres casos.
 */
export interface Ec2ProductLike {
  product?: { sku?: string };
  terms?: {
    OnDemand?: Record<string, { priceDimensions?: Record<string, { unit?: string; pricePerUnit?: { USD?: string | number } }> }>;
  };
}

export function toEc2ProductLike(raw: unknown): Ec2ProductLike | null {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Ec2ProductLike;
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object' && raw !== null && Object.prototype.toString.call(raw) === '[object String]') {
    try {
      return JSON.parse(String(raw)) as Ec2ProductLike;
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object' && raw !== null) {
    return raw as Ec2ProductLike;
  }
  return null;
}

/**
 * Extrae el primer precio on-demand por hora (unit "Hrs") de un producto.
 * Devuelve null si no hay OnDemand o ningún precio USD utilizable.
 */
export function parseEc2ProductPayload(raw: unknown): ParsedEc2Price | null {
  const data = toEc2ProductLike(raw);
  if (!data) return null;
  const sku = data.product?.sku;
  const onDemand = data.terms?.OnDemand;
  if (!sku || !onDemand) return null;

  let fallback: number | null = null;
  for (const offer of Object.values(onDemand)) {
    const dims = offer?.priceDimensions ?? {};
    for (const dim of Object.values(dims)) {
      const rawUsd = dim?.pricePerUnit?.USD;
      if (typeof rawUsd === 'undefined' || rawUsd === null) continue;
      const value = Number(rawUsd);
      if (!Number.isFinite(value)) continue;
      if (dim?.unit === 'Hrs') return { pricePerHour: value, sku };
      if (fallback === null) fallback = value;
    }
  }
  return fallback === null ? null : { pricePerHour: fallback, sku };
}

export function ec2CacheKey(regionId: string, instanceType: string, os: AwsOperatingSystem): string {
  return `ec2:${regionId}:${instanceType}:${os}`;
}

export interface Ec2OnDemandPrice {
  pricePerHour: number;
  sku: string;
  retrievedAt: string;
}

export type Ec2PriceResult = Ec2OnDemandPrice & { cacheStatus: Ec2CacheStatus };

export interface Ec2SingleQuote {
  status: 'ok';
  price: Ec2PriceResult;
}

export interface Ec2MissingQuote {
  status: 'not-found';
}

export type Ec2Lookup = Ec2SingleQuote | Ec2MissingQuote;

export type FetchEc2Fn = (params: { location: string; instanceType: string; os: AwsOperatingSystem }) => Promise<Ec2OnDemandPrice | null>;

export interface Ec2PriceStoreStats {
  cacheHits: number;
  realRequests: number;
}

export interface Ec2PriceStore {
  lookup(regionId: string, instanceType: string, os: AwsOperatingSystem): Promise<Ec2Lookup>;
  stats(): Ec2PriceStoreStats;
  clear(): void;
}

interface StoreEntry {
  pricePerHour: number;
  sku: string;
  retrievedAt: string;
  expiresAt: number;
}

export function createEc2PriceStore(options?: {
  fetch?: FetchEc2Fn;
  locationOf?: (regionId: string) => string | null;
  ttlMs?: number;
  now?: () => number;
  onLog?: (line: string) => void;
}): Ec2PriceStore {
  const fetchFn = options?.fetch ?? fetchEc2PriceFromAws;
  const locationOf = options?.locationOf ?? ec2LocationOf;
  const ttlMs = options?.ttlMs ?? EC2_PRICE_CACHE_TTL_MS;
  const now = options?.now ?? (() => Date.now());
  const onLog = options?.onLog ?? ((line: string) => console.log(line));

  const cache = new Map<string, StoreEntry>();
  let cacheHits = 0;
  let realRequests = 0;

  return {
    async lookup(regionId, instanceType, os) {
      const location = locationOf(regionId);
      if (!location) return { status: 'not-found' };

      const key = ec2CacheKey(regionId, instanceType, os);
      const entry = cache.get(key);
      if (entry && entry.expiresAt > now()) {
        cacheHits += 1;
        onLog(`[aws-pricing] cache HIT key=${key}`);
        return {
          status: 'ok',
          price: {
            pricePerHour: entry.pricePerHour,
            sku: entry.sku,
            retrievedAt: entry.retrievedAt,
            cacheStatus: 'HIT',
          },
        };
      }

      realRequests += 1;
      onLog(`[aws-pricing] cache MISS key=${key}`);
      try {
        const price = await fetchFn({ location, instanceType, os });
        if (!price) return { status: 'not-found' };
        cache.set(key, {
          pricePerHour: price.pricePerHour,
          sku: price.sku,
          retrievedAt: price.retrievedAt,
          expiresAt: now() + ttlMs,
        });
        return { status: 'ok', price: { ...price, cacheStatus: 'MISS' } };
      } catch (err) {
        if (err instanceof Ec2PricingError) throw err;
        throw new Ec2PricingError('AWS_UNAVAILABLE', 503, 'El precio real de AWS no está disponible en este momento. Inténtalo más tarde.');
      }
    },
    stats: () => ({ cacheHits, realRequests }),
    clear: () => cache.clear(),
  };
}

let pricingClient: PricingClient | null = null;

function getClient(): PricingClient {
  pricingClient ??= new PricingClient({ region: EC2_PRICE_API_REGION });
  return pricingClient;
}

async function fetchEc2PriceFromAws(params: { location: string; instanceType: string; os: AwsOperatingSystem }): Promise<Ec2OnDemandPrice | null> {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Ec2PricingError('AWS_UNAVAILABLE', 503, 'La integración con AWS Price List API no está configurada en el backend.');
  }

  const command = new GetProductsCommand({
    ServiceCode: 'AmazonEC2',
    FormatVersion: 'aws_v1',
    Filters: [
      { Type: 'TERM_MATCH', Field: 'instanceType', Value: params.instanceType },
      { Type: 'TERM_MATCH', Field: 'location', Value: params.location },
      { Type: 'TERM_MATCH', Field: 'operatingSystem', Value: params.os },
      { Type: 'TERM_MATCH', Field: 'tenancy', Value: 'Shared' },
      { Type: 'TERM_MATCH', Field: 'preInstalledSw', Value: 'NA' },
      { Type: 'TERM_MATCH', Field: 'capacitystatus', Value: 'Used' },
    ],
  });

  try {
    const response = await getClient().send(command);
    for (const raw of response.PriceList ?? []) {
      const parsed = parseEc2ProductPayload(raw);
      if (parsed) {
        return { pricePerHour: parsed.pricePerHour, sku: parsed.sku, retrievedAt: new Date().toISOString() };
      }
    }
    return null;
  } catch (err) {
    const requestId = (err as { $metadata?: { requestId?: string } }).$metadata?.requestId;
    const message = redactMessage(err instanceof Error ? err.message : String(err));
    console.error(`[aws-pricing] GetProducts falló: ${message}${requestId ? ` requestId=${requestId}` : ''}`);
    throw new Ec2PricingError('AWS_UNAVAILABLE', 503, 'El precio real de AWS no está disponible en este momento. Inténtalo más tarde.');
  }
}

export function toEc2MonthlyEstimate(pricePerHour: number, hoursPerMonth: number, quantity: number): number {
  return pricePerHour * hoursPerMonth * quantity;
}

/** Tienda compartida por las rutas estimate y regions. */
export const ec2LivePricing = createEc2PriceStore();

export interface Ec2RegionPrice {
  regionCode: string;
  regionName: string;
  available: boolean;
  unavailableReason: 'not-found' | 'aws-error' | null;
  pricePerHour: number | null;
  unit: 'Hrs';
  instanceType: string;
  operatingSystem: AwsOperatingSystem;
  source: string | null;
  retrievedAt: string | null;
  cacheStatus: Ec2CacheStatus | null;
  monthlyEstimate: number | null;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    results.push(...(await Promise.all(chunk.map(fn))));
  }
  return results;
}

export async function getEc2RegionPrices(
  instanceType: string,
  os: AwsOperatingSystem,
  hoursPerMonth: number,
  quantity: number
): Promise<{ quotes: Ec2RegionPrice[]; anyMiss: boolean }> {
  const quotes = await mapWithConcurrency(REGION_CODES, EC2_REGIONS_CONCURRENCY, async (regionCode) => {
    const base = {
      regionCode,
      regionName: regionName(regionCode) ?? regionCode,
      unit: 'Hrs' as const,
      instanceType,
      operatingSystem: os,
    };
    let result: Awaited<ReturnType<typeof ec2LivePricing.lookup>>;
    try {
      result = await ec2LivePricing.lookup(regionCode, instanceType, os);
    } catch (err) {
      if (!(err instanceof Ec2PricingError)) throw err;
      return {
        ...base,
        available: false,
        unavailableReason: 'aws-error' as const,
        pricePerHour: null,
        source: null,
        retrievedAt: null,
        cacheStatus: null,
        monthlyEstimate: null,
      };
    }
    if (result.status !== 'ok') {
      return {
        ...base,
        available: false,
        unavailableReason: 'not-found' as const,
        pricePerHour: null,
        source: null,
        retrievedAt: null,
        cacheStatus: null,
        monthlyEstimate: null,
      };
    }
    const { price } = result;
    return {
      ...base,
      available: true,
      unavailableReason: null,
      pricePerHour: price.pricePerHour,
      source: 'AWS Price List API',
      retrievedAt: price.retrievedAt,
      cacheStatus: price.cacheStatus,
      monthlyEstimate: toEc2MonthlyEstimate(price.pricePerHour, hoursPerMonth, quantity),
    };
  });
  const anyMiss = quotes.some((q) => q.cacheStatus === 'MISS');
  const awsErrors = quotes.filter((q) => q.unavailableReason === 'aws-error');
  if (awsErrors.length === quotes.length) {
    throw new Ec2PricingError('AWS_UNAVAILABLE', 503, 'El precio real de AWS no está disponible en este momento. Inténtalo más tarde.');
  }
  return { quotes, anyMiss };
}