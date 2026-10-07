import { z } from 'zod';

export const fieldValueSchema = z.union([z.string(), z.number(), z.boolean()]);

export const serviceBodySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.string().min(1),
  spec: z.record(z.string(), fieldValueSchema),
});

export const pricingBodySchema = z.object({
  service: serviceBodySchema,
  region: z.string().min(1),
  currency: z.enum(['USD', 'EUR', 'MXN', 'PEN']).default('USD'),
});

export const pricingRegionsBodySchema = z.object({
  services: z.array(serviceBodySchema).min(1).max(20),
  currency: z.enum(['USD', 'EUR', 'MXN', 'PEN']).default('USD'),
});

export type ServiceBody = z.infer<typeof serviceBodySchema>;
export type PricingBody = z.infer<typeof pricingBodySchema>;
export type PricingRegionsBody = z.infer<typeof pricingRegionsBodySchema>;