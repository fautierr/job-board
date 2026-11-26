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

interface OfferPayload {
  title: string;
  description: string;
  category: string;
  seniority: string;
  workMode: string;
  workday: string;
  contractType: string;
}

interface TestOffer extends OfferPayload {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface TestUser {
  id: string;
  token: string;
}

const app = createApp();
const migration = new InitialSchema1764038400000();
const companyNameMigration = new AddCompanyName1795584000000();
const password = 'password-de-prueba';

const validOffer: OfferPayload = {
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

async function registerUser(
  role: 'EMPLOYER' | 'CANDIDATE' = 'EMPLOYER',
  companyName = 'Empresa de prueba',
): Promise<TestUser> {
  const response = await request(app).post('/api/auth/register').send({
    email: `${randomUUID()}@test.local`,
    password,
    role,
    ...(role === 'EMPLOYER' ? { companyName } : {}),
  });

  expect(response.status).toBe(201);
  return { id: response.body.user.id, token: response.body.token };
}

async function createOffer(
  token: string,
  overrides: Partial<OfferPayload> = {},
): Promise<TestOffer> {
  const response = await request(app)
    .post('/api/offers')
    .set('Authorization', `Bearer ${token}`)
    .send({ ...validOffer, ...overrides });

  expect(response.status).toBe(201);
  return response.body.offer;
}

async function setStatus(
  token: string,
  id: string,
  status: string,
): Promise<TestOffer> {
  const response = await request(app)
    .patch(`/api/offers/${id}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status });

  expect(response.status).toBe(200);
  return response.body.offer;
}

async function getOfferRow(id: string) {
  const rows: Array<{ employer_id: string; title: string; status: string }> =
    await AppDataSource.query(
      `SELECT employer_id, title, status FROM offers WHERE id = $1`,
      [id],
    );
  return rows[0];
}

async function countOffers(): Promise<number> {
  const rows: Array<{ count: string }> = await AppDataSource.query(
    `SELECT COUNT(*)::text AS count FROM offers`,
  );
  return Number(rows[0]?.count ?? 0);
}

function ids(offers: TestOffer[]): string[] {
  return offers.map((offer) => offer.id).sort();
}

describe.skipIf(!shouldRunIntegrationTests())('Ofertas HTTP', () => {
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

  it('confirma que la conexión apunta exclusivamente a job_board_db_test', async () => {
    const rows: Array<{ db: string }> = await AppDataSource.query(
      `SELECT current_database() AS db`,
    );
    expect(rows[0]?.db).toBe(TEST_DATABASE_NAME);
  });

  it('crea una oferta con el employer_id del token y estado PUBLISHED', async () => {
    const employer = await registerUser();

    const response = await request(app)
      .post('/api/offers')
      .set('Authorization', `Bearer ${employer.token}`)
      .send(validOffer);

    expect(response.status).toBe(201);
    expect(response.body.offer).toMatchObject({
      title: validOffer.title,
      status: 'PUBLISHED',
    });
    expect(response.body.offer).not.toHaveProperty('employerId');
    expect(response.body.offer).not.toHaveProperty('employer');

    const row = await getOfferRow(response.body.offer.id);
    expect(row?.employer_id).toBe(employer.id);
  });

  it('rechaza employerId y status enviados en el body de creación', async () => {
    const employer = await registerUser();

    const response = await request(app)
      .post('/api/offers')
      .set('Authorization', `Bearer ${employer.token}`)
      .send({ ...validOffer, employerId: randomUUID(), status: 'CLOSED' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(await countOffers()).toBe(0);
  });

  it('devuelve solo ofertas propias con todos los estados en /me/offers', async () => {
    const employerA = await registerUser();
    const employerB = await registerUser();
    const offerA1 = await createOffer(employerA.token);
    const offerA2 = await createOffer(employerA.token, { title: 'Otra oferta' });
    await setStatus(employerA.token, offerA2.id, 'PAUSED');
    await createOffer(employerB.token, { title: 'Oferta ajena' });

    const response = await request(app)
      .get('/api/me/offers')
      .set('Authorization', `Bearer ${employerA.token}`);

    expect(response.status).toBe(200);
    expect(ids(response.body.offers)).toEqual([offerA1.id, offerA2.id].sort());
    expect(
      response.body.offers.find((offer: TestOffer) => offer.id === offerA2.id)
        ?.status,
    ).toBe('PAUSED');
    expect(response.body.offers[0]).not.toHaveProperty('employerId');
  });

  it('edita campos propios sin permitir el cambio de estado', async () => {
    const employer = await registerUser();
    const offer = await createOffer(employer.token);

    const response = await request(app)
      .patch(`/api/offers/${offer.id}`)
      .set('Authorization', `Bearer ${employer.token}`)
      .send({ title: 'Nuevo título', category: 'ADMINISTRATION' });

    expect(response.status).toBe(200);
    expect(response.body.offer).toMatchObject({
      title: 'Nuevo título',
      category: 'ADMINISTRATION',
      status: 'PUBLISHED',
    });

    const row = await getOfferRow(offer.id);
    expect(row?.title).toBe('Nuevo título');
    expect(row?.status).toBe('PUBLISHED');
    expect(new Date(response.body.offer.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(offer.updatedAt).getTime(),
    );
  });

  it('rechaza un PATCH vacío o con status en el body', async () => {
    const employer = await registerUser();
    const offer = await createOffer(employer.token);

    const empty = await request(app)
      .patch(`/api/offers/${offer.id}`)
      .set('Authorization', `Bearer ${employer.token}`)
      .send({});
    expect(empty.status).toBe(400);

    const withStatus = await request(app)
      .patch(`/api/offers/${offer.id}`)
      .set('Authorization', `Bearer ${employer.token}`)
      .send({ status: 'CLOSED' });
    expect(withStatus.status).toBe(400);

    const row = await getOfferRow(offer.id);
    expect(row?.status).toBe('PUBLISHED');
  });

  it('aplica transiciones válidas y rechaza inválidas con 409', async () => {
    const employer = await registerUser();
    const offer = await createOffer(employer.token);

    expect((await setStatus(employer.token, offer.id, 'PAUSED')).status).toBe(
      'PAUSED',
    );
    expect((await setStatus(employer.token, offer.id, 'PUBLISHED')).status).toBe(
      'PUBLISHED',
    );
    expect((await setStatus(employer.token, offer.id, 'CLOSED')).status).toBe(
      'CLOSED',
    );

    const sameStatus = await request(app)
      .patch(`/api/offers/${offer.id}/status`)
      .set('Authorization', `Bearer ${employer.token}`)
      .send({ status: 'CLOSED' });
    expect(sameStatus.status).toBe(409);
    expect(sameStatus.body.error.code).toBe('INVALID_STATUS_TRANSITION');

    const terminal = await request(app)
      .patch(`/api/offers/${offer.id}/status`)
      .set('Authorization', `Bearer ${employer.token}`)
      .send({ status: 'PUBLISHED' });
    expect(terminal.status).toBe(409);
    expect((await getOfferRow(offer.id))?.status).toBe('CLOSED');
  });

  it('lista públicamente solo ofertas PUBLICADAS con companyName', async () => {
    const employer = await registerUser('EMPLOYER', 'Meta');
    const other = await registerUser('EMPLOYER', 'Vercel');
    const published = await createOffer(employer.token, { title: 'Publicada' });
    const paused = await createOffer(employer.token, { title: 'Pausada' });
    await setStatus(employer.token, paused.id, 'PAUSED');
    const closed = await createOffer(employer.token, { title: 'Cerrada' });
    await setStatus(employer.token, closed.id, 'CLOSED');
    const otherPublished = await createOffer(other.token, {
      title: 'Otra empresa',
    });

    const response = await request(app).get('/api/offers');

    expect(response.status).toBe(200);
    expect(ids(response.body.offers)).toEqual(
      [published.id, otherPublished.id].sort(),
    );
    const byId = new Map(
      response.body.offers.map((offer: TestOffer) => [offer.id, offer]),
    );
    expect(byId.get(published.id)).toMatchObject({ companyName: 'Meta' });
    expect(byId.get(otherPublished.id)).toMatchObject({ companyName: 'Vercel' });

    for (const offer of response.body.offers) {
      expect(offer).not.toHaveProperty('employerId');
      expect(offer).not.toHaveProperty('employer');
      expect(offer).not.toHaveProperty('email');
      expect(offer).not.toHaveProperty('passwordHash');
    }
  });

  it('devuelve 404 en el detalle público de ofertas pausadas o cerradas', async () => {
    const employer = await registerUser();
    const published = await createOffer(employer.token);
    const paused = await createOffer(employer.token);
    await setStatus(employer.token, paused.id, 'PAUSED');
    const closed = await createOffer(employer.token);
    await setStatus(employer.token, closed.id, 'CLOSED');

    const visible = await request(app).get(`/api/offers/${published.id}`);
    expect(visible.status).toBe(200);
    expect(visible.body.offer.id).toBe(published.id);
    expect(visible.body.offer.companyName).toBe('Empresa de prueba');
    expect(visible.body.offer).not.toHaveProperty('employerId');
    expect(visible.body.offer).not.toHaveProperty('employer');
    expect(visible.body.offer).not.toHaveProperty('email');
    expect(visible.body.offer).not.toHaveProperty('passwordHash');

    for (const id of [paused.id, closed.id]) {
      const response = await request(app).get(`/api/offers/${id}`);
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    }
  });

  it('filtra por los cinco campos y permite combinarlos', async () => {
    const employer = await registerUser();
    const offerA = await createOffer(employer.token);
    const offerB = await createOffer(employer.token, {
      title: 'Administrativo',
      category: 'ADMINISTRATION',
      seniority: 'SENIOR',
      workMode: 'ONSITE',
      workday: 'PART_TIME',
      contractType: 'FREELANCE_PROJECT',
    });
    const offerC = await createOffer(employer.token, {
      title: 'Líder remoto',
      category: 'TECHNOLOGY_SYSTEMS',
      seniority: 'SENIOR',
      workMode: 'HYBRID',
      workday: 'FULL_TIME',
      contractType: 'INTERNSHIP',
    });

    const cases: Array<[Record<string, string>, string[]]> = [
      [{ category: 'ADMINISTRATION' }, [offerB.id]],
      [{ seniority: 'JUNIOR' }, [offerA.id]],
      [{ workMode: 'HYBRID' }, [offerC.id]],
      [{ workday: 'PART_TIME' }, [offerB.id]],
      [{ contractType: 'INTERNSHIP' }, [offerC.id]],
      [
        {
          category: 'TECHNOLOGY_SYSTEMS',
          seniority: 'SENIOR',
          workMode: 'HYBRID',
          workday: 'FULL_TIME',
          contractType: 'INTERNSHIP',
        },
        [offerC.id],
      ],
    ];

    for (const [query, expected] of cases) {
      const response = await request(app).get('/api/offers').query(query);
      expect(response.status).toBe(200);
      expect(ids(response.body.offers)).toEqual(expected.sort());
    }

    const invalid = await request(app)
      .get('/api/offers')
      .query({ workMode: 'EN_CASA' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('valida UUID en las rutas públicas y protegidas', async () => {
    const employer = await registerUser();

    const publicDetail = await request(app).get('/api/offers/no-uuid');
    expect(publicDetail.status).toBe(400);

    const protectedUpdate = await request(app)
      .patch('/api/offers/no-uuid')
      .set('Authorization', `Bearer ${employer.token}`)
      .send({ title: 'Nuevo título' });
    expect(protectedUpdate.status).toBe(400);
  });

  it('pagina el listado público y devuelve metadatos', async () => {
    const employer = await registerUser();
    const created: string[] = [];
    for (let index = 0; index < 12; index += 1) {
      created.push((await createOffer(employer.token, { title: `Oferta ${index}` })).id);
    }

    const firstPage = await request(app).get('/api/offers');
    const secondPage = await request(app)
      .get('/api/offers')
      .query({ page: '2', limit: '10' });

    expect(firstPage.status).toBe(200);
    expect(firstPage.body.offers).toHaveLength(10);
    expect(firstPage.body.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 12,
      totalPages: 2,
      hasNext: true,
      hasPrevious: false,
    });

    expect(secondPage.status).toBe(200);
    expect(secondPage.body.offers).toHaveLength(2);
    expect(secondPage.body.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 12,
      totalPages: 2,
      hasNext: false,
      hasPrevious: true,
    });
    expect(
      new Set([...firstPage.body.offers, ...secondPage.body.offers].map((offer: { id: string }) => offer.id)).size,
    ).toBe(created.length);
  });

  it('responde 200 con resultados vacíos para páginas fuera de rango y búsquedas sin coincidencias', async () => {
    const employer = await registerUser();
    await createOffer(employer.token);

    const outOfRange = await request(app)
      .get('/api/offers')
      .query({ page: '99', limit: '10' });
    expect(outOfRange.status).toBe(200);
    expect(outOfRange.body.offers).toEqual([]);
    expect(outOfRange.body.pagination).toEqual({
      page: 99,
      limit: 10,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrevious: true,
    });

    const noMatches = await request(app)
      .get('/api/offers')
      .query({ q: 'no-existe' });
    expect(noMatches.status).toBe(200);
    expect(noMatches.body.offers).toEqual([]);
    expect(noMatches.body.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false,
    });
  });

  it('busca por título, descripción y empresa, y combina búsqueda, filtros y paginación', async () => {
    const employerA = await registerUser('EMPLOYER', 'Acme Tech');
    const employerB = await registerUser('EMPLOYER', 'Globex');
    const byTitle = await createOffer(employerA.token, {
      title: 'Backend Node',
      description: 'API REST',
    });
    const byCompany = await createOffer(employerB.token, {
      title: 'Analista',
      description: 'Reportes',
    });
    const byDescription = await createOffer(employerA.token, {
      title: 'Otro puesto',
      description: 'Trabajo con Kubernetes',
    });
    const admin = await createOffer(employerA.token, {
      title: 'Backend Admin',
      description: 'API REST',
      category: 'ADMINISTRATION',
    });

    const title = await request(app).get('/api/offers').query({ q: 'node' });
    const company = await request(app).get('/api/offers').query({ q: 'globex' });
    const description = await request(app).get('/api/offers').query({ q: 'kubernetes' });
    const combined = await request(app).get('/api/offers').query({
      q: 'api',
      category: 'ADMINISTRATION',
      page: '1',
      limit: '1',
    });

    expect(ids(title.body.offers)).toEqual([byTitle.id]);
    expect(ids(company.body.offers)).toEqual([byCompany.id]);
    expect(ids(description.body.offers)).toEqual([byDescription.id]);
    expect(ids(combined.body.offers)).toEqual([admin.id]);
    expect(combined.body.pagination).toMatchObject({
      page: 1,
      limit: 1,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    });
  });

  it('valida page, limit y q en el listado público', async () => {
    const invalidPage = await request(app)
      .get('/api/offers')
      .query({ page: '0' });
    const invalidLimit = await request(app)
      .get('/api/offers')
      .query({ limit: '51' });
    const invalidQ = await request(app).get('/api/offers').query({ q: '   ' });

    expect(invalidPage.status).toBe(400);
    expect(invalidPage.body.error.code).toBe('VALIDATION_ERROR');
    expect(invalidLimit.status).toBe(400);
    expect(invalidQ.status).toBe(400);
  });
});
