import type { CloudService, Currency, QuoteLine, RegionQuote, RegionQuotesResponse, ServiceQuote, ServiceSpec, SpecValue } from '../types';
import type { PricingProvider, PricingRequestContext } from './PricingProvider';
import { getRegion, REGIONS } from '../data/regions';
import { convertUsd, toCurrencyQuote } from '../data/fx';
import { HOURS_PER_MONTH } from '../utils/totals';
import rates from '../../../shared/awsRates.json';

/** Espejo del motor del backend para el modo demo (sin servidor). */
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

function estimateUsd(spec: ServiceSpec, kind: string, regionId: string): { monthly: number; breakdown: QuoteLine[] } | null {
  if (!getRegion(regionId)) return null;
  const factor = rates.regionFactor[regionId as keyof typeof rates.regionFactor];
  if (typeof factor !== 'number') return null;

  switch (kind) {
    case 'ec2': {
      const type = rates.ec2.types.find((t) => t.id === str(spec.instanceType, ''));
      if (!type) return null;
      const os = str(spec.os, 'linux') as keyof typeof rates.ec2.osFactor;
      const osMult = rates.ec2.osFactor[os] ?? 1;
      const hours = num(spec.hoursPerMonth, rates.ec2.monthlyHours);
      const count = num(spec.instanceCount, 1);
      const amount = round2(type.platformPrice * osMult * factor * hours * count);
      return { monthly: amount, breakdown: [{ label: `${type.label} (${os}) × ${count}`, amount }] };
    }
    case 'rds': {
      const type = rates.rds.types.find((t) => t.id === str(spec.instanceType, ''));
      if (!type) return null;
      const engine = str(spec.engine, 'postgresql');
      const multiAz = bool(spec.multiAz);
      const storageGb = num(spec.storageGb, 100);
      const instance = round2(type.price * (multiAz ? rates.rds.multiAzFactor : 1) * factor * rates.rds.monthlyHours);
      const storage = round2(storageGb * rates.rds.storagePerGbMonth * factor);
      return {
        monthly: round2(instance + storage),
        breakdown: [
          { label: `${type.label} (${engine}${multiAz ? ', Multi-AZ' : ', Single-AZ'})`, amount: instance },
          { label: `Almacenamiento ${storageGb} GB (gp3)`, amount: storage },
        ],
      };
    }
    case 's3': {
      const storageClass = rates.s3.classes.find((c) => c.id === str(spec.storageClass, 'standard'));
      if (!storageClass) return null;
      const storageGb = num(spec.storageGb, 1000);
      const amount = round2(storageGb * storageClass.price * factor);
      return { monthly: amount, breakdown: [{ label: `${storageClass.label} — ${storageGb} GB`, amount }] };
    }
    case 'lambda': {
      const requestsMillions = num(spec.requestsMillions, 0);
      const gbSeconds = num(spec.gbSeconds, 0);
      const requests = round2(requestsMillions * rates.lambda.requestPerMillion * factor);
      const compute = round2(gbSeconds * rates.lambda.gbSecond * factor);
      return {
        monthly: round2(requests + compute),
        breakdown: [
          { label: `${requestsMillions} M invocaciones`, amount: requests },
          ...(gbSeconds > 0 ? [{ label: `${gbSeconds} GB-segundo`, amount: compute }] : []),
        ],
      };
    }
    case 'dynamodb': {
      const storageGb = num(spec.storageGb, 100);
      const rcu = num(spec.readCapacityUnits, 5);
      const wcu = num(spec.writeCapacityUnits, 5);
      const storage = round2(storageGb * rates.dynamodb.storagePerGbMonth * factor);
      const read = round2(rcu * HOURS_PER_MONTH * rates.dynamodb.rcuPerHour * factor);
      const write = round2(wcu * HOURS_PER_MONTH * rates.dynamodb.wcuPerHour * factor);
      return {
        monthly: round2(storage + read + write),
        breakdown: [
          { label: `Almacenamiento ${storageGb} GB`, amount: storage },
          { label: `${rcu} RCU`, amount: read },
          { label: `${wcu} WCU`, amount: write },
        ],
      };
    }
    case 'sns': {
      const requestsMillions = num(spec.requestsMillions, 1);
      const amount = round2(requestsMillions * rates.sns.requestPerMillion * factor);
      return { monthly: amount, breakdown: [{ label: `${requestsMillions} M publicaciones`, amount }] };
    }
    case 'cloudfront': {
      const dataOutGb = num(spec.dataOutGb, 100);
      const amount = round2(dataOutGb * rates.cloudfront.dataOutPerGb * factor);
      return { monthly: amount, breakdown: [{ label: `${dataOutGb} GB de salida`, amount }] };
    }
    case 'route53': {
      const zones = num(spec.zones, 1);
      const queriesMillions = num(spec.queriesMillions, 0);
      const zoneCost = round2(zones * rates.route53.hostedZonePerMonth * factor);
      const queryCost = round2(queriesMillions * rates.route53.queryPerMillion * factor);
      return {
        monthly: round2(zoneCost + queryCost),
        breakdown: [
          { label: `${zones} zona(s) hospedada(s)`, amount: zoneCost },
          ...(queriesMillions > 0 ? [{ label: `${queriesMillions} M consultas`, amount: queryCost }] : []),
        ],
      };
    }
    default:
      return null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockPricingProvider implements PricingProvider {
  readonly id = 'mock';

  async getQuote(service: CloudService, context: PricingRequestContext): Promise<ServiceQuote> {
    await delay(180 + Math.random() * 220);
    const usd = estimateUsd(service.spec, service.kind, context.region);
    if (!usd) {
      throw new Error('no-data');
    }
    return toCurrencyQuote({ ...usd, hourly: usd.monthly / HOURS_PER_MONTH }, service.id, context.currency);
  }

  async getRegionQuotes(services: CloudService[], currency: Currency): Promise<RegionQuotesResponse> {
    await delay(220 + Math.random() * 280);
    const quotes: RegionQuote[] = REGIONS.map((region) => {
      if (services.length === 0) {
        return { regionId: region.id, monthly: null, status: 'no-data' };
      }
      let monthly = 0;
      let data = false;
      for (const service of services) {
        const usd = estimateUsd(service.spec, service.kind, region.id);
        if (usd === null) continue;
        data = true;
        monthly += usd.monthly;
      }
      if (!data) {
        return { regionId: region.id, monthly: null, status: 'no-data' };
      }
      return { regionId: region.id, monthly: convertUsd(monthly, currency), status: 'ok' };
    });
    return { currency, quotes };
  }
}