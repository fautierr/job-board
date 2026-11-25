import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  DB_HOST: z.string().trim().min(1, 'DB_HOST es obligatorio'),
  DB_PORT: z.coerce.number().int().positive().max(65535).default(5432),
  DB_USER: z.string().trim().min(1, 'DB_USER es obligatorio'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD debe completarse en el .env local'),
  DB_NAME: z.string().trim().min(1, 'DB_NAME es obligatorio'),
  TEST_DB_NAME: z.string().trim().min(1).default('job_board_db_test'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET debe completarse en el .env local'),
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
