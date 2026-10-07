import type {
  CloudService,
  Currency,
  Ec2RegionPrice,
  Ec2RegionsResponse,
  RegionQuote,
  RegionQuotesResponse,
  ServiceQuote,
} from '../types';
import type { PricingProvider, PricingRequestContext } from './PricingProvider';
import { convertRegionQuotes, toCurrencyQuote } from '../data/fx';
import { ec2OperatingSystem } from '../data/awsServices';
import { REGIONS } from '../data/regions';

const API_BASE = (import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '');

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { code?: string } | null;
    if (payload?.code === 'CONFIGURATION_NOT_FOUND') throw new Error('no-data-config');
    if (payload?.code === 'AWS_UNAVAILABLE') throw new Error('aws-unavailable');
    throw new Error(`http-${res.status}`);
  }
  return res.json() as Promise<T>;
}

function toBoundedInt(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1 ? value : fallback;
}

interface Ec2EstimateResponse {
  service: string;
  instanceType: string;
  operatingSystem: string;
  pricingModel: string;
  pricePerHour: number;
  hoursPerMonth: number;
  quantity: number;
  monthlyEstimate: number;
  unit: string;
  source: 'AWS Price List API';
  retrievedAt: string;
  sku: string;
  cacheStatus: 'HIT' | 'MISS';
}

/**
 * Implementación que delega en nuestro backend.
 * - EC2: precios REALES de la AWS Price List API (POST /api/aws/ec2/*).
 * - Resto de servicios: catálogo de referencia simulado (POST /pricing).
 * El backend siempre cotiza en USD; aquí convertimos a la moneda elegida.
 */
export class HttpPricingProvider implements PricingProvider {
  readonly id = 'http';

  async getQuote(service: CloudService, context: PricingRequestContext): Promise<ServiceQuote> {
    if (service.kind === 'ec2') {
      return this.getEc2Quote(service, context.region, context.currency);
    }
    const result = await post<ServiceQuote | { noData: true }>('/pricing', {
      service,
      region: context.region,
      currency: context.currency,
    });
    if ('noData' in result) {
      throw new Error('no-data');
    }
    const { serviceId, monthly, hourly, breakdown } = result;
    return toCurrencyQuote({ monthly, hourly, breakdown }, serviceId, context.currency);
  }

  private async getEc2Quote(service: CloudService, region: string, currency: Currency): Promise<ServiceQuote> {
    const result = await post<Ec2EstimateResponse>('/aws/ec2/estimate', {
      instanceType: String(service.spec.instanceType ?? ''),
      region,
      operatingSystem: ec2OperatingSystem(service.spec.os),
      quantity: toBoundedInt(service.spec.instanceCount, 1),
      hoursPerMonth: toBoundedInt(service.spec.hoursPerMonth, 730),
    });
    const quote = toCurrencyQuote(
      {
        monthly: result.monthlyEstimate,
        hourly: result.pricePerHour,
        breakdown: [{ label: `${result.instanceType} (${result.operatingSystem}) · ${result.pricePerHour} USD/h × ${result.hoursPerMonth} h × ${result.quantity}`, amount: result.monthlyEstimate }],
      },
      service.id,
      currency,
    );
    return {
      ...quote,
      aws: {
        service: result.service,
        instanceType: result.instanceType,
        operatingSystem: result.operatingSystem,
        pricingModel: result.pricingModel,
        currency: 'USD',
        unit: result.unit,
        pricePerHour: result.pricePerHour,
        source: result.source,
        retrievedAt: result.retrievedAt,
        sku: result.sku,
        cacheStatus: result.cacheStatus,
      },
    };
  }

  async getRegionQuotes(services: CloudService[], currency: Currency): Promise<RegionQuotesResponse> {
    const ec2 = services.find((s) => s.kind === 'ec2');
    const others = services.filter((s) => s.kind !== 'ec2');

    let ec2Quotes: Ec2RegionPrice[] | null = null;
    if (ec2) {
      const ec2Res = await post<Ec2RegionsResponse>('/aws/ec2/regions', {
        instanceType: String(ec2.spec.instanceType ?? ''),
        operatingSystem: ec2OperatingSystem(ec2.spec.os),
        quantity: toBoundedInt(ec2.spec.instanceCount, 1),
        hoursPerMonth: toBoundedInt(ec2.spec.hoursPerMonth, 730),
      });
      ec2Quotes = ec2Res.quotes;
    }

    let catalogQuotes: RegionQuotesResponse = {
      currency: 'USD',
      quotes: REGIONS.map((r) => ({ regionId: r.id, monthly: null, status: 'no-data' as const })),
    };
    if (others.length > 0) {
      catalogQuotes = await post<RegionQuotesResponse>('/pricing/regions', { services: others, currency });
    }

    const ec2ByRegion = new Map((ec2Quotes ?? []).map((q) => [q.regionCode, q]));
    const catalogByRegion = new Map(catalogQuotes.quotes.map((q) => [q.regionId, q]));

    const quotes: RegionQuote[] = REGIONS.map((r) => {
      const ec2Q = ec2Quotes ? ec2ByRegion.get(r.id) : undefined;
      const catQ = catalogByRegion.get(r.id);

      if (ec2Quotes && ec2Q) {
        if (!ec2Q.available) {
          return {
            regionId: r.id,
            monthly: null,
            status: 'no-data',
            source: 'AWS Price List API',
            cacheStatus: ec2Q.cacheStatus ?? undefined,
            unavailableReason: ec2Q.unavailableReason ?? 'not-found',
          };
        }
        const monthly = (ec2Q.monthlyEstimate ?? 0) + (catQ?.monthly ?? 0);
        return {
          regionId: r.id,
          monthly,
          status: 'ok',
          source: 'AWS Price List API',
          cacheStatus: ec2Q.cacheStatus ?? undefined,
          unavailableReason: null,
        };
      }

      return {
        regionId: r.id,
        monthly: catQ?.monthly ?? null,
        status: catQ?.status ?? 'no-data',
        source: 'Catálogo de referencia',
        unavailableReason: null,
      };
    });

    return convertRegionQuotes({ currency: 'USD', quotes }, currency);
  }
}