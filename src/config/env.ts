import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

function parseAllowedOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter((origin) => origin.length > 0);
}

function isHttpOrigin(value: string): boolean {
  if (value.includes('*')) {
    return false;
  }

  try {
    const url = new URL(value);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.origin === value
    );
  } catch {
    return false;
  }
}

const corsAllowedOrigins = z
  .string()
  .default('http://localhost:5173')
  .transform(parseAllowedOrigins)
  .refine((origins) => origins.length > 0, {
    message: 'CORS_ALLOWED_ORIGINS debe incluir al menos un origen',
  })
  .refine((origins) => origins.every(isHttpOrigin), {
    message:
      'CORS_ALLOWED_ORIGINS debe contener orígenes http/https explícitos, sin comodines ni rutas',
  });

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  DB_HOST: z.string().trim().min(1, 'DB_HOST es obligatorio'),
  DB_PORT: z.coerce.number().int().positive().max(65535).default(5432),
  DB_USER: z.string().trim().min(1, 'DB_USER es obligatorio'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD debe completarse en el .env local'),
  DB_NAME: z.string().trim().min(1, 'DB_NAME es obligatorio'),
  DB_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  TEST_DB_NAME: z.string().trim().min(1).default('job_board_db_test'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET debe completarse en el .env local'),
  CORS_ALLOWED_ORIGINS: corsAllowedOrigins,
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(raíz)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Variables de entorno inválidas:\n${details}`);
  }

  return result.data;
}

let cachedEnv: Env | undefined;

export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = loadEnv();
  }
  return cachedEnv;
}
