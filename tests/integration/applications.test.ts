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
const initialMigration = new InitialSchema1764038400000();
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

const applicationPayload = {
  candidateName: 'Ana Pérez',
  phone: '+5491112345678',
};

interface TestUser {
  id: string;
  token: string;
  role: 'EMPLOYER' | 'CANDIDATE';
}

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
    await initialMigration.up(queryRunner);
    await companyNameMigration.up(queryRunner);
  } finally {
    await queryRunner.release();
  }
}

async function registerUser(role: TestUser['role']): Promise<TestUser> {
  const response = await request(app).post('/api/auth/register').send({
    email: `${randomUUID()}@test.local`,
    password,
    role,
    ...(role === 'EMPLOYER' ? { companyName: 'Empresa de prueba' } : {}),
  });

  expect(response.status).toBe(201);
  return {
    id: response.body.user.id,
    token: response.body.token,
    role,
  };
}

async function createOffer(
  token: string,
  overrides: Partial<typeof validOffer> = {},
): Promise<{ id: string }> {
  const response = await request(app)
    .post('/api/offers')
    .set('Authorization', `Bearer ${token}`)
    .send({ ...validOffer, ...overrides });

  expect(response.status).toBe(201);
  return { id: response.body.offer.id };
}

async function setStatus(
  token: string,
  id: string,
  status: 'PAUSED' | 'CLOSED',
): Promise<void> {
  const response = await request(app)
    .patch(`/api/offers/${id}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status });

  expect(response.status).toBe(200);
}

function postApplication(
  token: string,
  offerId: string,
  body: Record<string, unknown> = applicationPayload,
) {
  return request(app)
    .post(`/api/offers/${offerId}/applications`)
    .set('Authorization', `Bearer ${token}`)
    .send(body);
}

async function applicationRows(offerId: string) {
  return AppDataSource.query(
    `SELECT id, offer_id, candidate_id, candidate_name, phone, created_at
     FROM applications WHERE offer_id = $1 ORDER BY created_at DESC`,
    [offerId],
  );
}

async function countApplications(): Promise<number> {
  const rows: Array<{ count: string }> = await AppDataSource.query(
    `SELECT COUNT(*)::text AS count FROM applications`,
  );
  return Number(rows[0]?.count ?? 0);
}

function expectCandidateSafe(application: Record<string, unknown>): void {
  expect(application).not.toHaveProperty('candidateId');
  expect(application).not.toHaveProperty('candidate');
  expect(application).not.toHaveProperty('offer');
  expect(application).not.toHaveProperty('email');
  expect(application).not.toHaveProperty('passwordHash');
}

describe.skipIf(!shouldRunIntegrationTests())('Postulaciones HTTP', () => {
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

  it('crea una postulación con el candidateId del token', async () => {
    const employer = await registerUser('EMPLOYER');
    const candidate = await registerUser('CANDIDATE');
    const offer = await createOffer(employer.token);

    const response = await postApplication(candidate.token, offer.id);

    expect(response.status).toBe(201);
    expect(response.body.application).toEqual({
      id: expect.any(String),
      offerId: offer.id,
      candidateName: applicationPayload.candidateName,
      phone: applicationPayload.phone,
      createdAt: expect.any(String),
    });
    expectCandidateSafe(response.body.application);

    const rows = await applicationRows(offer.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.offer_id).toBe(offer.id);
    expect(rows[0]?.candidate_id).toBe(candidate.id);
    expect(rows[0]?.candidate_name).toBe(applicationPayload.candidateName);
    expect(rows[0]?.phone).toBe(applicationPayload.phone);
  });

  it('rechaza candidateId en el body con 400', async () => {
    const employer = await registerUser('EMPLOYER');
    const candidate = await registerUser('CANDIDATE');
    const offer = await createOffer(employer.token);

    const response = await postApplication(candidate.token, offer.id, {
      ...applicationPayload,
      candidateId: randomUUID(),
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(await countApplications()).toBe(0);
  });

  it('rechaza una segunda postulación de la misma pareja con 409 ALREADY_APPLIED', async () => {
    const employer = await registerUser('EMPLOYER');
    const candidate = await registerUser('CANDIDATE');
    const offer = await createOffer(employer.token);

    const first = await postApplication(candidate.token, offer.id);
    const second = await postApplication(candidate.token, offer.id);

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('ALREADY_APPLIED');
    expect(await countApplications()).toBe(1);
  });

  it('permite una sola postulación ante solicitudes simultáneas', async () => {
    const employer = await registerUser('EMPLOYER');
    const candidate = await registerUser('CANDIDATE');
    const offer = await createOffer(employer.token);

    const first = postApplication(candidate.token, offer.id);
    const second = postApplication(candidate.token, offer.id);
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect([firstResult.status, secondResult.status].sort((a, b) => a - b)).toEqual(
      [201, 409],
    );
    expect(
      [firstResult.body.error?.code, secondResult.body.error?.code].filter(
        Boolean,
      ),
    ).toEqual(['ALREADY_APPLIED']);
    expect(await countApplications()).toBe(1);
  });

  it('devuelve 404 para ofertas inexistentes, pausadas o cerradas', async () => {
    const employer = await registerUser('EMPLOYER');
    const candidate = await registerUser('CANDIDATE');

    const missing = await postApplication(candidate.token, randomUUID());
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');

    const paused = await createOffer(employer.token);
    await setStatus(employer.token, paused.id, 'PAUSED');
    const pausedResponse = await postApplication(candidate.token, paused.id);
    expect(pausedResponse.status).toBe(404);

    const closed = await createOffer(employer.token);
    await setStatus(employer.token, closed.id, 'CLOSED');
    const closedResponse = await postApplication(candidate.token, closed.id);
    expect(closedResponse.status).toBe(404);

    expect(await countApplications()).toBe(0);
  });

  it('devuelve solo las postulaciones del candidato autenticado', async () => {
    const employerA = await registerUser('EMPLOYER');
    const employerB = await registerUser('EMPLOYER');
    const candidate = await registerUser('CANDIDATE');
    const otherCandidate = await registerUser('CANDIDATE');
    const offerA = await createOffer(employerA.token);
    const offerB = await createOffer(employerB.token);

    const ownA = await postApplication(candidate.token, offerA.id);
    const ownB = await postApplication(candidate.token, offerB.id);
    await postApplication(otherCandidate.token, offerA.id);

    const response = await request(app)
      .get('/api/me/applications')
      .set('Authorization', `Bearer ${candidate.token}`);

    expect(response.status).toBe(200);
    expect(response.body.applications.map((item: { id: string }) => item.id).sort()).toEqual(
      [ownA.body.application.id, ownB.body.application.id].sort(),
    );
    for (const application of response.body.applications) {
      expectCandidateSafe(application);
    }
  });

  it('permite al propietario ver postulaciones incluso si la oferta está pausada', async () => {
    const owner = await registerUser('EMPLOYER');
    const other = await registerUser('EMPLOYER');
    const candidateA = await registerUser('CANDIDATE');
    const candidateB = await registerUser('CANDIDATE');
    const offer = await createOffer(owner.token);

    const applicationA = await postApplication(candidateA.token, offer.id);
    const applicationB = await postApplication(candidateB.token, offer.id);
    await setStatus(owner.token, offer.id, 'PAUSED');

    const forbidden = await request(app)
      .get(`/api/offers/${offer.id}/applications`)
      .set('Authorization', `Bearer ${other.token}`);
    expect(forbidden.status).toBe(404);

    const response = await request(app)
      .get(`/api/offers/${offer.id}/applications`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(response.status).toBe(200);
    expect(
      response.body.applications
        .map((item: { id: string }) => item.id)
        .sort(),
    ).toEqual(
      [applicationA.body.application.id, applicationB.body.application.id].sort(),
    );
    expect(
      response.body.applications
        .map((item: { candidateId: string }) => item.candidateId)
        .sort(),
    ).toEqual([candidateA.id, candidateB.id].sort());

    for (const application of response.body.applications) {
      expect(application).not.toHaveProperty('candidate');
      expect(application).not.toHaveProperty('offer');
      expect(application).not.toHaveProperty('email');
      expect(application).not.toHaveProperty('passwordHash');
    }
  });

  it('aplica autenticación y roles en los tres endpoints', async () => {
    const employer = await registerUser('EMPLOYER');
    const candidate = await registerUser('CANDIDATE');
    const offer = await createOffer(employer.token);

    const unauthenticatedPost = await request(app)
      .post(`/api/offers/${offer.id}/applications`)
      .send(applicationPayload);
    expect(unauthenticatedPost.status).toBe(401);

    const employerPost = await postApplication(employer.token, offer.id);
    expect(employerPost.status).toBe(403);
    expect(employerPost.body.error.code).toBe('FORBIDDEN');

    const unauthenticatedMine = await request(app).get('/api/me/applications');
    expect(unauthenticatedMine.status).toBe(401);

    const employerMine = await request(app)
      .get('/api/me/applications')
      .set('Authorization', `Bearer ${employer.token}`);
    expect(employerMine.status).toBe(403);

    const unauthenticatedOfferList = await request(app).get(
      `/api/offers/${offer.id}/applications`,
    );
    expect(unauthenticatedOfferList.status).toBe(401);

    const candidateOfferList = await request(app)
      .get(`/api/offers/${offer.id}/applications`)
      .set('Authorization', `Bearer ${candidate.token}`);
    expect(candidateOfferList.status).toBe(403);

    expect(await countApplications()).toBe(0);
  });

  it('valida UUID de la oferta y campos del body', async () => {
    const employer = await registerUser('EMPLOYER');
    const candidate = await registerUser('CANDIDATE');
    const offer = await createOffer(employer.token);

    const invalidUuid = await postApplication(candidate.token, 'no-uuid');
    expect(invalidUuid.status).toBe(400);

    const missingPhone = await postApplication(candidate.token, offer.id, {
      candidateName: 'Ana',
    });
    expect(missingPhone.status).toBe(400);
    expect(missingPhone.body.error.code).toBe('VALIDATION_ERROR');

    expect(await countApplications()).toBe(0);
  });
});
