import { Router } from 'express';
import subredditRoutes from './subredditRoutes';

const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Mount /api/subreddits routes
apiRouter.use('/subreddits', subredditRoutes);

export default apiRouter;
