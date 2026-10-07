import { Router } from 'express';
import type { ServiceQuote } from '../types';
import { pricingBodySchema } from '../schemas/estimation';
import { getRegionInfo, quoteForService } from '../aws/awsCatalog';
import { simulateNetwork } from '../middleware/simulate';

export const pricingRouter = Router();

pricingRouter.use(simulateNetwork);

pricingRouter.post('/', async (req, res) => {
  const parsed = pricingBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join('; ') });
    return;
  }

  const { service, region } = parsed.data;
  if (!(await getRegionInfo(region))) {
    res.status(400).json({ error: `Región desconocida: ${region}` });
    return;
  }

  const quote: ServiceQuote | null = await quoteForService(service, region);
  if (!quote) {
    res.json({ noData: true });
    return;
  }

  res.json(quote);
});