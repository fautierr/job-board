import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../shared/constants/work-offer-values';
import { ForbiddenError, UnauthorizedError } from '../shared/errors';

export function requireRole(role: UserRole) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    if (req.user.role !== role) {
      next(
        new ForbiddenError('No tenés permiso para realizar esta acción'),
      );
      return;
    }

    next();
  };
}
