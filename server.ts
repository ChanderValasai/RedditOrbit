import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createExpressApp } from './server/app';
import { config } from './server/config/env';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = createExpressApp();
  const isProd = config.isProduction;
  const port = config.port;

  if (!isProd) {
    // In development, mount Vite middleware for instant HMR / dev bundling
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve built frontend assets from dist/
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));

    app.get('*', (req, res, next) => {
      // Don't intercept API requests with HTML
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[Reddit Orbit] Server running in ${config.nodeEnv} mode at http://0.0.0.0:${port}`);
    console.log(`[Reddit Orbit] API routes available under /api/subreddits`);
  });
}

startServer().catch((err) => {
  console.error('[Reddit Orbit] Failed to start server:', err);
  process.exit(1);
});
