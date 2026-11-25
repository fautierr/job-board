import jwt from 'jsonwebtoken';
import { getEnv } from '../../config/env';
import type { UserRole } from '../../shared/constants/work-offer-values';

export interface AuthTokenPayload {
  sub: string;
  role: UserRole;
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, getEnv().JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '1h',
  });
}

export function verifyToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, getEnv().JWT_SECRET, {
    algorithms: ['HS256'],
  });

  if (
    typeof decoded === 'string' ||
    typeof decoded.sub !== 'string' ||
    typeof decoded.role !== 'string'
  ) {
    throw new Error('Payload de token inválido');
  }

  return { sub: decoded.sub, role: decoded.role as UserRole };
}
