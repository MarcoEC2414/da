import type { CloudService } from './service';

export type Currency = 'USD' | 'EUR' | 'MXN' | 'PEN';

export interface QuoteLine {
  label: string;
  amount: number;
}

/**
 * Estado de cotización de un servicio.
 * - no-data          : falta configuración en el catálogo simulado.
 * - no-data-config   : EC2 real: la combinación (región/instancia/SO) no existe en AWS.
 * - aws-unavailable  : EC2 real: la AWS Price List API no respondió.
 */
export type QuoteStatus = 'loading' | 'ready' | 'error' | 'no-data' | 'no-data-config' | 'aws-unavailable';

/** Metadatos de una cotización REAL de EC2 (AWS Price List API). */
export interface AwsQuoteMeta {
  service: string;
  instanceType: string;
  operatingSystem: string;
  pricingModel: string;
  currency: 'USD';
  unit: string;
  pricePerHour: number;
  source: 'AWS Price List API';
  retrievedAt: string;
  sku: string;
  cacheStatus: 'HIT' | 'MISS';
}

export interface ServiceQuote {
  serviceId: string;
  monthly: number;
  hourly: number;
  currency: Currency;
  breakdown: QuoteLine[];
  /** Presente solo cuando el precio viene de la AWS Price List API (EC2 real). */
  aws?: AwsQuoteMeta;
}

export interface Totals {
  monthly: number;
  yearly: number;
  hourly: number;
  currency: Currency;
}

export interface Estimation {
  id: string;
  name: string;
  region: string;
  currency: Currency;
  services: CloudService[];
}

export type RegionQuoteStatus = 'ok' | 'no-data' | 'error';

export type UnavailableReason = 'not-found' | 'aws-error';

export interface RegionQuote {
  regionId: string;
  monthly: number | null;
  status: RegionQuoteStatus;
  /** 'AWS Price List API' cuando el total incluye EC2 real; 'Catálogo de referencia' en el resto. */
  source?: string;
  /** Solo cuando el total incluye EC2 real. */
  cacheStatus?: 'HIT' | 'MISS';
  unavailableReason?: UnavailableReason | null;
}

export interface RegionQuotesResponse {
  currency: Currency;
  quotes: RegionQuote[];
}

/** Respuesta de POST /api/aws/ec2/regions (precios reales por región). */
export interface Ec2RegionPrice {
  regionCode: string;
  regionName: string;
  available: boolean;
  unavailableReason: UnavailableReason | null;
  pricePerHour: number | null;
  unit: 'Hrs';
  instanceType: string;
  operatingSystem: string;
  source: string | null;
  retrievedAt: string | null;
  cacheStatus: 'HIT' | 'MISS' | null;
  monthlyEstimate: number | null;
}

export interface Ec2RegionsResponse {
  instanceType: string;
  operatingSystem: string;
  hoursPerMonth: number;
  quantity: number;
  source: string;
  quotes: Ec2RegionPrice[];
}