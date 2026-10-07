import express, { type ErrorRequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { getCatalogStatus, getCatalogMeta } from './aws/awsCatalog';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { pricingRouter } from './routes/pricing';
import { pricingRegionsRouter } from './routes/pricingRegions';
import { ec2EstimateRouter } from './routes/ec2Estimate';
import { ec2RegionsRouter } from './routes/ec2Regions';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', false);
app.use(express.json({ limit: '64kb' }));

app.use(
  rateLimit({
    windowMs: 60_000,
    limit: env.RATE_LIMIT_PER_MIN,
    standardHeaders: true,
    legacyHeaders: false,
    // Sin IP real detrás de proxy; Vite añade X-Forwarded-For en dev.
    validate: { xForwardedForHeader: false },
    message: { error: 'Demasiadas peticiones, inténtalo más tarde.' },
  })
);
app.use(requestLogger);

app.get('/api/health', async (_req, res) => {
  res.json({ ok: true, ...(await getCatalogStatus()), ...(await getCatalogMeta()) });
});

app.use('/api/pricing', pricingRouter);
app.use('/api/pricing/regions', pricingRegionsRouter);

// Precios reales de Amazon EC2 (AWS Price List API, solo lectura).
app.use('/api/aws/ec2/estimate', ec2EstimateRouter);
app.use('/api/aws/ec2/regions', ec2RegionsRouter);

// Errores de parsing del body JSON -> 400
const bodyParserError: ErrorRequestHandler = (err, _req, res, next) => {
  if (err && typeof err === 'object' && 'type' in err && err.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'JSON inválido en el cuerpo de la petición.' });
    return;
  }
  next(err);
};
app.use(bodyParserError);
app.use(errorHandler);

if (env.NODE_ENV !== 'test') {
  app.listen(env.PORT, () => {
    console.log(`Backend de CloudCalc (simulación AWS) escuchando en http://localhost:${env.PORT}`);
  });
}

export { app };