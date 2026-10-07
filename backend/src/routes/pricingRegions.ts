import { Router } from 'express';
import { pricingRegionsBodySchema } from '../schemas/estimation';
import { quoteAllRegions } from '../aws/awsCatalog';
import { simulateNetwork } from '../middleware/simulate';

export const pricingRegionsRouter = Router();

pricingRegionsRouter.use(simulateNetwork);

pricingRegionsRouter.post('/', async (req, res) => {
  const parsed = pricingRegionsBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join('; ') });
    return;
  }

  const response = await quoteAllRegions(parsed.data.services);
  res.json(response);
});