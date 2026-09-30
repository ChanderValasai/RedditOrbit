import { Router } from 'express';
import subredditRoutes from './subredditRoutes';
import dashboardRoutes from './dashboardRoutes';
import authRoutes from './authRoutes';
import { isDatabaseConnected } from '../db/connection';

const apiRouter = Router();

// Health check endpoint with database connection status
apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: {
      connected: isDatabaseConnected(),
      mode: isDatabaseConnected() ? 'mongodb_atlas' : 'resilient_offline_mode',
    },
  });
});

// Mount /api/auth routes
apiRouter.use('/auth', authRoutes);

// Mount /api/subreddits routes
apiRouter.use('/subreddits', subredditRoutes);

// Mount /api/dashboards routes
apiRouter.use('/dashboards', dashboardRoutes);

export default apiRouter;
