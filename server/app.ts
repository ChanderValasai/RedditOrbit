import express, { Request, Response, NextFunction } from 'express';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import apiRouter from './routes';
import { AppError } from './types';

export function createExpressApp() {
  const app = express();

  // Basic middleware
  app.use(corsMiddleware);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API router mounted under /api
  app.use('/api', apiRouter);

  // 404 handler for unmatched /api routes
  app.use('/api/*', (req: Request, res: Response, next: NextFunction) => {
    next(new AppError(404, 'NOT_FOUND', `API endpoint ${req.method} ${req.originalUrl} not found`));
  });

  // Centralized error handling middleware
  app.use(errorHandler);

  return app;
}
