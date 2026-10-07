import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(120),
  MONGODB_URI: z.string().url().optional(),
  // Origen permitido del frontend en producción (CORS). Ej.: https://cloudcalc.onrender.com
  FRONTEND_URL: z.string().url().optional(),
  SIMULATE_LATENCY_MS: z.coerce.number().int().min(0).default(400),
  SIMULATE_ERROR_RATE: z.coerce.number().min(0).max(1).default(0),
  // Deprecados (integración Google Cloud a AWS queda desactivada): se conservan
  // para no romper módulos sin uso. Ya no se requieren.
  GOOGLE_BILLING_API_KEY: z.string().optional(),
  CATALOG_REFRESH_MS: z.coerce.number().int().positive().default(6 * 60 * 60 * 1000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const lines = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
  console.error('Configuración inválida del backend:\n' + lines.join('\n'));
  process.exit(1);
}

export const env = parsed.data;

export const MONGO_AVAILABLE = Boolean(env.MONGODB_URI);