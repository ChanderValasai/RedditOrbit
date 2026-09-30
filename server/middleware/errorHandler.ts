import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';
import { config } from '../config/env';

/**
 * Centralized error handling middleware.
 * Formats errors consistently for all client requests and outputs structured [API ERROR] logs.
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : err.status || 500;
  const code = isAppError ? err.code : 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected internal error occurred.';

  // Standardized [API ERROR] log (excludes sensitive info / headers / tokens)
  console.error(
    `[API ERROR] ${statusCode} ${code} - "${message}" on ${req.method} ${req.baseUrl + req.path}`
  );

  res.status(statusCode).json({
    error: {
      code,
      message,
      statusCode,
      details: err.details,
      ...(config.nodeEnv !== 'production' && !isAppError ? { stack: err.stack } : {}),
    },
  });
}
