import type { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';
import { AppError } from '../shared/errors';

interface BodyParserError {
  type?: string;
  status?: number;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  const maybeBodyParserError = err as BodyParserError | null;
  if (
    maybeBodyParserError &&
    typeof maybeBodyParserError === 'object' &&
    maybeBodyParserError.type === 'entity.parse.failed'
  ) {
    res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'El cuerpo de la solicitud no es un JSON válido',
      },
    });
    return;
  }

  logger.error('Error no manejado', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
    },
  });
}
