import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { AppDataSource } from '../../src/db/data-source';
import { AddCompanyName1795584000000 } from '../../src/db/migrations/1795584000000-add-company-name';
import { InitialSchema1764038400000 } from '../../src/db/migrations/1764038400000-initial-schema';
import {
  shouldRunIntegrationTests,
  TEST_DATABASE_NAME,
} from '../helpers/create-test-data-source';

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
const companyNameMigration = new AddCompanyName1795584000000();
const password = 'password-de-prueba';

const validOffer = {
  title: 'Desarrollador TypeScript',
  description: 'Desarrollo de APIs con Node.js y TypeScript',
  category: 'TECHNOLOGY_SYSTEMS',
  seniority: 'JUNIOR',
  workMode: 'REMOTE',
  workday: 'FULL_TIME',
  contractType: 'EMPLOYMENT',
};

async function resetSchema(): Promise<void> {
  await AppDataSource.query(`DROP TABLE IF EXISTS "applications" CASCADE`);
  await AppDataSource.query(`DROP TABLE IF EXISTS "offers" CASCADE`);
  await AppDataSource.query(`DROP TABLE IF EXISTS "users" CASCADE`);

  for (const enumName of ENUM_NAMES) {
    await AppDataSource.query(`DROP TYPE IF EXISTS "${enumName}"`);
  }
}

async function applyMigration(): Promise<void> {
  const queryRunner = AppDataSource.createQueryRunner();
  try {
    await migration.up(queryRunner);
    await companyNameMigration.up(queryRunner);
  } finally {
    await queryRunner.release();
  }
}

async function registerUser(role: 'EMPLOYER' | 'CANDIDATE') {
  const response = await request(app).post('/api/auth/register').send({
    email: `${randomUUID()}@test.local`,
    password,
    role,
    ...(role === 'EMPLOYER' ? { companyName: 'Empresa de prueba' } : {}),
  });

  expect(response.status).toBe(201);
  return { id: response.body.user.id as string, token: response.body.token as string };
}

async function createOffer(token: string) {
  const response = await request(app)
    .post('/api/offers')
    .set('Authorization', `Bearer ${token}`)
    .send(validOffer);

  expect(response.status).toBe(201);
  return response.body.offer as { id: string };
}

async function getOfferRow(id: string) {
  const rows: Array<{ title: string; status: string; employer_id: string }> =
    await AppDataSource.query(
      `SELECT title, status, employer_id FROM offers WHERE id = $1`,
      [id],
    );
  return rows[0];
}

function protectedRequests(token?: string) {
  const id = randomUUID();
  const authorization = token ? { Authorization: `Bearer ${token}` } : {};

  return [
    request(app).post('/api/offers').set(authorization).send(validOffer),
    request(app).get('/api/me/offers').set(authorization),
    request(app)
      .patch(`/api/offers/${id}`)
      .set(authorization)
      .send({ title: 'Nuevo título' }),
    request(app)
      .patch(`/api/offers/${id}/status`)
      .set(authorization)
      .send({ status: 'PAUSED' }),
  ];
}

describe.skipIf(!shouldRunIntegrationTests())('Autorización de ofertas', () => {
  beforeAll(async () => {
    const configuredDatabase = (AppDataSource.options as { database?: string })
      .database;
    expect(configuredDatabase).toBe(TEST_DATABASE_NAME);

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
  });

  beforeEach(async () => {
    await resetSchema();
    await applyMigration();
  });

  afterAll(async () => {
    await resetSchema();
    await AppDataSource.destroy();
  });

  it('permite las consultas públicas sin token', async () => {
    const employer = await registerUser('EMPLOYER');
    const offer = await createOffer(employer.token);

    const list = await request(app).get('/api/offers');
    expect(list.status).toBe(200);
    expect(list.body.offers.map((item: { id: string }) => item.id)).toContain(
      offer.id,
    );

    const detail = await request(app).get(`/api/offers/${offer.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.offer.id).toBe(offer.id);
  });

  it('rechaza con 401 las rutas protegidas sin token', async () => {
    for (const response of await Promise.all(protectedRequests())) {
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    }
  });

  it('rechaza con 403 las rutas protegidas para CANDIDATE', async () => {
    const candidate = await registerUser('CANDIDATE');

    for (const response of await Promise.all(protectedRequests(candidate.token))) {
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    }
  });

  it('devuelve 404 y no modifica la BD ante ofertas de otro EMPLOYER', async () => {
    const owner = await registerUser('EMPLOYER');
    const other = await registerUser('EMPLOYER');
    const offer = await createOffer(owner.token);
    const before = await getOfferRow(offer.id);

    const update = await request(app)
      .patch(`/api/offers/${offer.id}`)
      .set('Authorization', `Bearer ${other.token}`)
      .send({ title: 'Intento de edición ajena' });
    expect(update.status).toBe(404);
    expect(update.body.error.code).toBe('NOT_FOUND');

    const status = await request(app)
      .patch(`/api/offers/${offer.id}/status`)
      .set('Authorization', `Bearer ${other.token}`)
      .send({ status: 'PAUSED' });
    expect(status.status).toBe(404);
    expect(status.body.error.code).toBe('NOT_FOUND');

    expect(await getOfferRow(offer.id)).toEqual(before);
  });
});
