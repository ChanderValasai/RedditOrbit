import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AppError } from '../types';

export interface AuthTokenPayload {
  userId: string;
  email: string;
  username: string;
  role?: string;
}

export function generateToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as any,
  });
}

export function verifyToken(token: string): AuthTokenPayload {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as AuthTokenPayload;
    return decoded;
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError(401, 'TOKEN_EXPIRED', 'Authentication token has expired. Please log in again.');
    }
    if (err.name === 'JsonWebTokenError') {
      throw new AppError(401, 'MALFORMED_TOKEN', 'Authentication token is invalid or malformed.');
    }
    throw new AppError(401, 'INVALID_TOKEN', 'Failed to authenticate token.');
  }
}
