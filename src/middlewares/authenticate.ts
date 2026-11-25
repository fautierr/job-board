import type { NextFunction, Request, Response } from 'express';
import { verifyToken, type AuthTokenPayload } from '../modules/auth/token';
import { findById } from '../modules/users/users.repository';
import { UnauthorizedError } from '../shared/errors';

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedError();
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedError();
    }

    let payload: AuthTokenPayload;
    try {
      payload = verifyToken(token);
    } catch {
      throw new UnauthorizedError('Token inválido o expirado');
    }

    const user = await findById(payload.sub);
    if (!user) {
      throw new UnauthorizedError('Token inválido o expirado');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}
