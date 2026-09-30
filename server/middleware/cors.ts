import cors from 'cors';
import { config } from '../config/env';

export const corsMiddleware = cors({
  origin: config.cors.origin,
  methods: config.cors.methods,
  allowedHeaders: config.cors.allowedHeaders,
  credentials: true,
});
