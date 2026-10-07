import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { getCatalogStatus, getCatalogMeta } from './aws/awsCatalog';
import { mongoStatus } from './db/mongo';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { pricingRouter } from './routes/pricing';
import { pricingRegionsRouter } from './routes/pricingRegions';
import { ec2EstimateRouter } from './routes/ec2Estimate';
import { ec2RegionsRouter } from './routes/ec2Regions';

const app = express();
app.disable('x-powered-by');
// En producción (Render) las peticiones llegan a través del proxy de Render:
// con trust proxy la IP real del cliente se usa en el rate limit.
// En desarrollo sigue desactivado para no confiar en X-Forwarded-For local.
app.set('trust proxy', env.NODE_ENV === 'production' ? 1 : false);
app.use(express.json({ limit: '64kb' }));

/**
 * CORS con lista blanca: desarrollo local (Vite) + la URL del frontend de
 * producción proporcionada mediante FRONTEND_URL. Nunca '*' en producción.
 * Las peticiones sin cabecera Origin (curl, server-to-server) no requieren CORS.
 */
const allowedOrigins = ['http://localhost:5173', env.FRONTEND_URL].filter(
  (origin): origin is string => typeof origin === 'string' && origin.length > 0
);
app.use(cors({ origin: allowedOrigins }));

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
  const status = await getCatalogStatus();
  const meta = await getCatalogMeta();
  // getCatalogStatus ya intentó la conexión a Atlas; mongoStatus solo reporta el
  // estado resultante (sin URI ni credenciales).
  res.json({ ok: true, ...status, database: mongoStatus(), ...meta });
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
  // 0.0.0.0 obligatorio en Render (contenedor); local también funciona con él.
  const port = Number(process.env.PORT) || env.PORT;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Backend de CloudCalc escuchando en http://0.0.0.0:${port} (NODE_ENV=${env.NODE_ENV})`);
  });
}

export { app };