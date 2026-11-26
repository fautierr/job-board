import type { NextFunction, Request, Response } from 'express';
import { getEnv } from '../config/env';

const ALLOWED_METHODS = 'GET,POST,PATCH,OPTIONS';
const ALLOWED_HEADERS = 'Content-Type,Authorization';
const MAX_AGE_SECONDS = 600;

function normalizeOrigin(header: string | undefined): string | null {
  if (!header) {
    return null;
  }

  try {
    return new URL(header).origin;
  } catch {
    return null;
  }
}

export function cors(req: Request, res: Response, next: NextFunction): void {
  const origin = normalizeOrigin(
    typeof req.headers.origin === 'string' ? req.headers.origin : undefined,
  );
  const isAllowed =
    origin !== null && getEnv().CORS_ALLOWED_ORIGINS.includes(origin);

  if (isAllowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
    res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
    res.setHeader('Access-Control-Max-Age', String(MAX_AGE_SECONDS));
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
}
