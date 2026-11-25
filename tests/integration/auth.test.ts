import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { getEnv } from '../../src/config/env';
import { AppDataSource } from '../../src/db/data-source';
import { InitialSchema1764038400000 } from '../../src/db/migrations/1764038400000-initial-schema';
import { shouldRunIntegrationTests, TEST_DATABASE_NAME } from '../helpers/create-test-data-source';

const ENUM_NAMES = [
  'user_role',
  'offer_status',
  'job_category',
  'seniority',
  'work_mode',
  'workday',
  'contract_type',
];

const app = createApp();
const migration = new InitialSchema1764038400000();
const password = 'password-de-prueba';

async function resetSchema(): Promise<void> {
  await AppDataSource.query(`DROP TABLE IF EXISTS "applications" CASCADE`);
  await AppDataSource.query(`DROP TABLE IF EXISTS "offers" CASCADE`);
  await AppDataSource.query(`DROP TABLE IF EXISTS "users" CASCADE`);

  for (const enumName of ENUM_NAMES) {
    await AppDataSource.query(`DROP TYPE IF EXISTS "${enumName}"`);
  }
}

function registerUser(email = `${randomUUID()}@test.local`, role: 'CANDIDATE' | 'EMPLOYER' = 'CANDIDATE') {
  return request(app)
    .post('/api/auth/register')
    .send({ email, password, role });
}

describe.skipIf(!shouldRunIntegrationTests())('Autenticación HTTP', () => {
  beforeAll(async () => {
    const configuredDatabase = (AppDataSource.options as { database?: string }).database;
    expect(configuredDatabase).toBe(TEST_DATABASE_NAME);

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    await resetSchema();

    const queryRunner = AppDataSource.createQueryRunner();
    try {
      await migration.up(queryRunner);
    } finally {
      await queryRunner.release();
    }
  });

  afterAll(async () => {
    await resetSchema();
    await AppDataSource.destroy();
  });

  it('la conexión apunta exclusivamente a job_board_db_test', async () => {
    const rows: Array<{ db: string }> = await AppDataSource.query(
      `SELECT current_database() AS db`,
    );
    expect(rows[0]?.db).toBe(TEST_DATABASE_NAME);
  });

  it('registra un candidato y devuelve JWT y usuario público', async () => {
    const email = `${randomUUID()}@test.local`;
    const response = await registerUser(email, 'CANDIDATE');

    expect(response.status).toBe(201);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user).toEqual({
      id: expect.any(String),
      email,
      role: 'CANDIDATE',
    });
    expect(response.body).not.toHaveProperty('password');
    expect(response.body).not.toHaveProperty('passwordHash');

    const rows: Array<{ password_hash: string; role: string }> =
      await AppDataSource.query(
        `SELECT password_hash, role FROM users WHERE email = $1`,
        [email],
      );
    expect(rows[0]?.role).toBe('CANDIDATE');
    expect(rows[0]?.password_hash).not.toBe(password);
  });

  it('acepta registro con rol EMPLOYER', async () => {
    const response = await registerUser(`${randomUUID()}@test.local`, 'EMPLOYER');

    expect(response.status).toBe(201);
    expect(response.body.user.role).toBe('EMPLOYER');
  });

  it('rechaza email duplicado con 409', async () => {
    const email = `${randomUUID()}@test.local`;
    await registerUser(email);

    const response = await registerUser(email);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('rechaza datos inválidos con 400', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'invalido', password: 'corto', role: 'ADMIN' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toEqual(expect.any(Array));
  });

  it('hace login correcto con JWT de 1 hora', async () => {
    const email = `${randomUUID()}@test.local`;
    await registerUser(email);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(email);

    const decoded = jwt.decode(response.body.token) as jwt.JwtPayload;
    expect(decoded.exp! - decoded.iat!).toBe(3600);
  });

  it('rechaza contraseña incorrecta con error genérico', async () => {
    const email = `${randomUUID()}@test.local`;
    await registerUser(email);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'contraseña-incorrecta' });

    expect(response.status).toBe(401);
    expect(response.body.error).toEqual({
      code: 'INVALID_CREDENTIALS',
      message: 'Credenciales inválidas',
    });
  });

  it('rechaza email inexistente con el mismo error genérico', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: `${randomUUID()}@test.local`, password });

    expect(response.status).toBe(401);
    expect(response.body.error).toEqual({
      code: 'INVALID_CREDENTIALS',
      message: 'Credenciales inválidas',
    });
  });

  it('devuelve el usuario autenticado en GET /me', async () => {
    const email = `${randomUUID()}@test.local`;
    const registered = await registerUser(email);

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${registered.body.token}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({
      id: registered.body.user.id,
      email,
      role: 'CANDIDATE',
    });
    expect(response.body.user).not.toHaveProperty('passwordHash');
  });

  it('rechaza acceso sin autenticación', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rechaza token inválido', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token-invalido');

    expect(response.status).toBe(401);
  });

  it('rechaza token expirado', async () => {
    const expired = jwt.sign(
      { sub: randomUUID(), role: 'CANDIDATE' },
      getEnv().JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '-1s' },
    );

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expired}`);

    expect(response.status).toBe(401);
  });

  it('rechaza token con usuario inexistente', async () => {
    const token = jwt.sign(
      { sub: randomUUID(), role: 'CANDIDATE' },
      getEnv().JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '1h' },
    );

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });
});
