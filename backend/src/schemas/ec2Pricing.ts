import { z } from 'zod';

const instanceTypeSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9.-]+$/, 'Tipo de instancia inválido');

const quantitySchema = z.coerce.number().int('Cantidad entera').min(1).max(1000).default(1);

const hoursPerMonthSchema = z.coerce.number().min(1).max(744).default(730);

export const awsOperatingSystemSchema = z.enum(['Linux', 'Windows', 'SUSE']).default('Linux');

export const ec2EstimateBodySchema = z.object({
  instanceType: instanceTypeSchema,
  region: z.string().min(1).max(64),
  operatingSystem: awsOperatingSystemSchema,
  quantity: quantitySchema,
  hoursPerMonth: hoursPerMonthSchema,
});

export const ec2RegionsBodySchema = z.object({
  instanceType: instanceTypeSchema,
  operatingSystem: awsOperatingSystemSchema,
  quantity: quantitySchema,
  hoursPerMonth: hoursPerMonthSchema,
});

export type AwsOperatingSystemValue = z.infer<typeof awsOperatingSystemSchema>;
export type Ec2EstimateBody = z.infer<typeof ec2EstimateBodySchema>;
export type Ec2RegionsBody = z.infer<typeof ec2RegionsBodySchema>;