import { Router } from 'express';
import { ec2RegionsBodySchema } from '../schemas/ec2Pricing';
import { Ec2PricingError, getEc2RegionPrices } from '../aws/awsLivePricing';

export const ec2RegionsRouter = Router();

/**
 * Comparación REAL de costos EC2 (On-Demand) en TODAS las regiones.
 * - La primera petición consulta AWS Price List por región (concurrencia limitada) y cachea (TTL 30 min).
 * - La segunda petición idéntica responde desde caché (cacheStatus HIT), sin consultar AWS.
 * - Regiones sin la combinación solicitada → available:false (sin precio inventado).
 * Cabecera X-Cache: HIT si todas llegaron de caché, MISS si alguna se consultó en vivo.
 */
ec2RegionsRouter.post('/', async (req, res, next) => {
  const parsed = ec2RegionsBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues.map((i) => i.message).join('; '),
      code: 'INVALID_INPUT',
    });
    return;
  }

  const { instanceType, operatingSystem, quantity, hoursPerMonth } = parsed.data;

  try {
    const { quotes, anyMiss } = await getEc2RegionPrices(instanceType, operatingSystem, hoursPerMonth, quantity);
    res.setHeader('X-Cache', anyMiss ? 'MISS' : 'HIT');
    res.json({
      instanceType,
      operatingSystem,
      hoursPerMonth,
      quantity,
      source: 'AWS Price List API',
      quotes,
    });
  } catch (err) {
    if (err instanceof Ec2PricingError) {
      res.status(err.statusCode).json({ error: err.message, code: err.kind });
      return;
    }
    next(err);
  }
});