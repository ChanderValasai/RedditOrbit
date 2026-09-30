import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  reddit: {
    baseUrl: process.env.REDDIT_BASE_URL || 'https://www.reddit.com',
    userAgent: process.env.REDDIT_USER_AGENT || 'web:reddit-orbit:v1.0.0 (by /u/orbit_bot)',
    requestTimeoutMs: parseInt(process.env.REDDIT_TIMEOUT_MS || '6000', 10),
    maxLimit: 100,
    defaultLimit: 25,
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  cache: {
    postsTtlSeconds: parseInt(process.env.CACHE_POSTS_TTL || '60', 10),
    aboutTtlSeconds: parseInt(process.env.CACHE_ABOUT_TTL || '300', 10),
    cleanupIntervalMs: 60000, // Periodic purge of expired entries
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '60', 10), // 60 requests per minute
  },
};
