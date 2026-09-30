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
};
