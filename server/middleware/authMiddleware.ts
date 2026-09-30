import { Request, Response, NextFunction } from 'express';
import { verifyToken, AuthTokenPayload } from '../utils/jwt';
import { AppError } from '../types';

// Augment Express Request interface with user
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

/**
 * Enforces valid authentication token.
 * Rejects missing, malformed, or expired tokens.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(new AppError(401, 'MISSING_TOKEN', 'Authentication token is required.'));
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return next(
      new AppError(401, 'MALFORMED_TOKEN', 'Authorization header format must be "Bearer <token>".')
    );
  }

  const token = parts[1];
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Optional authentication middleware.
 * If token is provided, validates it strictly (rejecting expired or malformed tokens).
 * If no token is provided, proceeds cleanly as anonymous/guest.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    // Proceed as anonymous/guest
    return next();
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return next(
      new AppError(401, 'MALFORMED_TOKEN', 'Authorization header format must be "Bearer <token>".')
    );
  }

  const token = parts[1];
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err) {
    next(err);
  }
}
