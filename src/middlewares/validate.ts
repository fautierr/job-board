import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { ValidationError } from '../shared/errors';

type ValidationSource = 'body' | 'query' | 'params';

export function validate(
  schema: ZodTypeAny,
  source: ValidationSource = 'body',
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      next(new ValidationError(details));
      return;
    }

    if (source === 'body') {
      req.body = result.data;
    } else if (source === 'query') {
      req.query = result.data as Request['query'];
    } else {
      req.params = result.data as Request['params'];
    }

    next();
  };
}
