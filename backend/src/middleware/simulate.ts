import type { RequestHandler } from 'express';
import { env } from '../config/env';

/**
 * Simula la latencia y los errores de red del "catálogo de AWS".
 * En modo test no hace nada para no ralentizar las pruebas.
 * Un cliente puede forzar un error con el header `x-simulate-error: true`.
 */
export const simulateNetwork: RequestHandler = (req, res, next) => {
  if (env.NODE_ENV === 'test') {
    next();
    return;
  }

  const forceError =
    req.get('x-simulate-error') === 'true' ||
    (env.SIMULATE_ERROR_RATE > 0 && Math.random() < env.SIMULATE_ERROR_RATE);

  setTimeout(() => {
    if (forceError) {
      res.status(503).json({ error: 'Error simulado: el servicio de precios de AWS no respondió. Intenta de nuevo.' });
      return;
    }
    next();
  }, env.SIMULATE_LATENCY_MS);
};