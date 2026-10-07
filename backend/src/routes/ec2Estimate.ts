import { Router } from 'express';
import { ec2EstimateBodySchema } from '../schemas/ec2Pricing';
import {
  Ec2PricingError,
  ec2LivePricing,
  regionName,
  regionToLocation,
  toEc2MonthlyEstimate,
} from '../aws/awsLivePricing';

export const ec2EstimateRouter = Router();

/**
 * Cotización REAL de una instancia EC2 (On-Demand) en UNA región.
 * Sin latencia simulada: consulta directa a la AWS Price List API (solo lectura).
 * Respuesta: precio por hora, SKU, fecha de obtención y estimación mensual.
 * Cabecera X-Cache: HIT (caché de 30 min) | MISS (consultado en vivo).
 */
ec2EstimateRouter.post('/', async (req, res, next) => {
  const parsed = ec2EstimateBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues.map((i) => i.message).join('; '),
      code: 'INVALID_INPUT',
    });
    return;
  }

  const { instanceType, region, operatingSystem, quantity, hoursPerMonth } = parsed.data;

  const location = regionToLocation(region);
  if (!location) {
    res.status(400).json({ error: `Región desconocida: ${region}`, code: 'INVALID_INPUT' });
    return;
  }

  try {
    const result = await ec2LivePricing.lookup(region, instanceType, operatingSystem);
    if (result.status === 'not-found') {
      res.status(404).json({
        error: `Configuración no disponible para ${instanceType} (${operatingSystem}) en ${region}.`,
        code: 'CONFIGURATION_NOT_FOUND',
      });
      return;
    }

    const { price } = result;
    res.setHeader('X-Cache', price.cacheStatus);
    res.json({
      provider: 'AWS',
      service: 'Amazon EC2',
      instanceType,
      region,
      regionName: regionName(region) ?? region,
      operatingSystem,
      pricingModel: 'On-Demand',
      currency: 'USD',
      unit: 'Hrs',
      pricePerHour: price.pricePerHour,
      hoursPerMonth,
      quantity,
      monthlyEstimate: toEc2MonthlyEstimate(price.pricePerHour, hoursPerMonth, quantity),
      source: 'AWS Price List API',
      retrievedAt: price.retrievedAt,
      sku: price.sku,
      cacheStatus: price.cacheStatus,
    });
  } catch (err) {
    if (err instanceof Ec2PricingError) {
      res.status(err.statusCode).json({ error: err.message, code: err.kind });
      return;
    }
    next(err);
  }
});