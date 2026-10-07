import type { CloudService, Currency, RegionQuotesResponse, ServiceQuote } from '../types';

/**
 * Contrato de obtención de precios.
 *
 * Los componentes visuales NUNCA importan de pricing/ directamente:
 * consumen los hooks usePricing / useRegionQuotes, que a su vez usan la
 * implementación activa (mock o HTTP hacia el backend).
 *
 * Cuando llegue la integración real, solo cambia `HttpPricingProvider`
 * o el factory; la UI queda intacta porque depende de estos tipos.
 */
export interface PricingRequestContext {
  region: string;
  currency: Currency;
}

export interface PricingProvider {
  readonly id: string;
  /** Costo mensual/por hora de UN servicio en UNA región. */
  getQuote(service: CloudService, context: PricingRequestContext): Promise<ServiceQuote>;
  /** Total mensual de la estimación en TODAS las regiones (una sola respuesta). */
  getRegionQuotes(services: CloudService[], currency: Currency): Promise<RegionQuotesResponse>;
}