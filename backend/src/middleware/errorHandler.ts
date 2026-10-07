import type { NextFunction, Request, Response } from 'express';
import { redactMessage } from '../billing/redact';

export interface HttpError extends Error {
  statusCode?: number;
}

export function errorHandler(
  err: HttpError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.statusCode ?? 500;

  if (status >= 500) {
    console.error('Error interno:', redactMessage(err.message ?? String(err)));
    res.status(500).json({ error: 'Error interno del servidor' });
    return;
  }

  res.status(status).json({ error: err.message ?? 'Error' });
}