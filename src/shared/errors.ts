export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ValidationError extends AppError {
  constructor(details?: unknown, message = 'Datos inválidos') {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(
    message = 'Autenticación requerida',
    code = 'UNAUTHORIZED',
  ) {
    super(401, code, message);
  }
}

export class ConflictError extends AppError {
  constructor(
    message = 'El recurso ya existe',
    code = 'CONFLICT',
    details?: unknown,
  ) {
    super(409, code, message, details);
  }
}
