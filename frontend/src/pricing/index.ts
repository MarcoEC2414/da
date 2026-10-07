import type { PricingProvider } from './PricingProvider';
import { HttpPricingProvider } from './HttpPricingProvider';
import { MockPricingProvider } from './MockPricingProvider';

export type { PricingProvider } from './PricingProvider';
export type { QuoteStatus } from '../types';

export type PricingMode = 'mock' | 'http';

/**
 * Proveedor activo: 'mock' por defecto (datos de ejemplo), 'http' cuando
 * apuntamos al backend. Se elige con VITE_PRICING_PROVIDER.
 */
export const PRICING_MODE: PricingMode =
  ((import.meta.env.VITE_PRICING_PROVIDER as PricingMode | undefined) ?? 'mock');

let cached: PricingProvider | undefined;

export function getPricingProvider(): PricingProvider {
  cached ??= PRICING_MODE === 'http' ? new HttpPricingProvider() : new MockPricingProvider();
  return cached;
}