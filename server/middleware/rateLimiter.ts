import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

interface ClientRateRecord {
  count: number;
  resetAt: number;
}

/**
 * In-memory sliding window rate limiter.
 * Tracks request counts per client IP and protects backend and upstream APIs.
 */
class RateLimiter {
  private records = new Map<string, ClientRateRecord>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up stale rate limit entries every 2 minutes
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [ip, record] of this.records.entries()) {
        if (now > record.resetAt) {
          this.records.delete(ip);
        }
      }
    }, 120000);

    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Express middleware handler
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const forwarded = req.headers['x-forwarded-for'];
      const rawIp =
        (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') ||
        req.ip ||
        req.socket.remoteAddress ||
        'unknown-client';

      // Anonymize/normalize IP for logging if needed
      const clientIp = rawIp.replace(/^::ffff:/, '');

      const now = Date.now();
      let record = this.records.get(clientIp);

      if (!record || now >= record.resetAt) {
        record = {
          count: 1,
          resetAt: now + config.rateLimit.windowMs,
        };
        this.records.set(clientIp, record);
      } else {
        record.count++;
      }

      const remaining = Math.max(0, config.rateLimit.maxRequests - record.count);
      const resetSeconds = Math.ceil((record.resetAt - now) / 1000);

      // Set standard rate limit headers
      res.setHeader('X-RateLimit-Limit', config.rateLimit.maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));

      if (record.count > config.rateLimit.maxRequests) {
        console.warn(
          `[RATE LIMIT] IP ${clientIp} exceeded threshold (${record.count}/${config.rateLimit.maxRequests}) on ${req.method} ${req.baseUrl + req.path}`
        );

        res.setHeader('Retry-After', resetSeconds);
        res.status(429).json({
          error: {
            code: 'RATE_LIMITED',
            message: `Rate limit of ${config.rateLimit.maxRequests} requests per minute exceeded. Please retry after ${resetSeconds}s.`,
            statusCode: 429,
          },
        });
        return;
      }

      next();
    };
  }
}

export const rateLimiter = new RateLimiter();
