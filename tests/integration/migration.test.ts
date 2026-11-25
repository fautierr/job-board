import { randomUUID } from 'node:crypto';
import type { DataSource, QueryRunner } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AddCompanyName1795584000000 } from '../../src/db/migrations/1795584000000-add-company-name';
import { InitialSchema1764038400000 } from '../../src/db/migrations/1764038400000-initial-schema';
import {
  createTestDataSource,
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

const CONSTRAINT_NAMES = [
  'PK_users',
  'UQ_users_email',
  'PK_offers',
  'FK_offers_employer',
  'PK_applications',
  'UQ_applications_offer_candidate',
  'FK_applications_offer',
  'FK_applications_candidate',
];

const INDEX_NAMES = [
  'IDX_offers_status_category',
  'IDX_offers_employer_id',
  'IDX_applications_offer_id',
  'IDX_applications_candidate_id',
];

async function withQueryRunner<T>(
  dataSource: DataSource,
  fn: (queryRunner: QueryRunner) => Promise<T>,
): Promise<T> {
  const queryRunner = dataSource.createQueryRunner();
  try {
    return await fn(queryRunner);
  } finally {
    await queryRunner.release();
  }
}

async function resetTestSchema(dataSource: DataSource): Promise<void> {
  await dataSource.query(`DROP TABLE IF EXISTS "applications" CASCADE`);
  await dataSource.query(`DROP TABLE IF EXISTS "offers" CASCADE`);
  await dataSource.query(`DROP TABLE IF EXISTS "users" CASCADE`);

  for (const enumName of ENUM_NAMES) {
    await dataSource.query(`DROP TYPE IF EXISTS "${enumName}"`);
  }
}

async function insertUser(
  dataSource: DataSource,
  values: {
    id?: string;
    email?: string;
    role?: 'EMPLOYER' | 'CANDIDATE';
    companyName?: string;
  } = {},
): Promise<string> {
  const id = values.id ?? randomUUID();
  const email = values.email ?? `${randomUUID()}@test.local`;
  const role = values.role ?? 'CANDIDATE';
  const columns = ['"id"', '"email"', '"password_hash"', '"role"'];
  const params: unknown[] = [id, email, 'hash-de-prueba', role];

  if (values.companyName !== undefined) {
    columns.push('"company_name"');
    params.push(values.companyName);
  }

  await dataSource.query(
    `INSERT INTO "users" (${columns.join(', ')})
     VALUES (${params.map((_, index) => `$${index + 1}`).join(', ')})`,
    params,
  );

  return id;
}

async function insertOffer(
  dataSource: DataSource,
  employerId: string,
  overrides: { id?: string; category?: string } = {},
): Promise<string> {
  const id = overrides.id ?? randomUUID();
  const category = overrides.category ?? 'TECHNOLOGY_SYSTEMS';

  await dataSource.query(
    `INSERT INTO "offers" (
       "id", "employer_id", "title", "description", "category", "seniority",
       "work_mode", "workday", "contract_type", "status"
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      id,
      employerId,
      'Puesto de prueba',
      'Descripción de prueba',
      category,
      'JUNIOR',
      'REMOTE',
      'FULL_TIME',
      'EMPLOYMENT',
      'PUBLISHED',
    ],
  );

  return id;
}

describe.skipIf(!shouldRunIntegrationTests())('Migración inicial', () => {
  const migration = new InitialSchema1764038400000();
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = createTestDataSource();
    await dataSource.initialize();
    await resetTestSchema(dataSource);
    await withQueryRunner(dataSource, (queryRunner) => migration.up(queryRunner));
  });

  afterAll(async () => {
    await resetTestSchema(dataSource);
    await dataSource.destroy();
  });

  it('se ejecuta exclusivamente contra job_board_db_test', async () => {
    const rows: Array<{ name: string }> = await dataSource.query(
      `SELECT current_database() AS name`,
    );
    expect(rows[0]?.name).toBe(TEST_DATABASE_NAME);
  });

  it('crea los enums nativos con sus códigos internos', async () => {
    const rows: Array<{ typname: string }> = await dataSource.query(
      `SELECT typname FROM pg_type WHERE typtype = 'e' AND typname = ANY($1)`,
      [ENUM_NAMES],
    );

    expect(rows.map((row) => row.typname).sort()).toEqual([...ENUM_NAMES].sort());
  });

  it('crea las tres tablas con las columnas y tipos esperados', async () => {
    const rows: Array<{
      table_name: string;
      column_name: string;
      udt_name: string;
    }> = await dataSource.query(
      `SELECT table_name, column_name, udt_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name IN ('users', 'offers', 'applications')`,
    );

    const columns = new Map<string, Map<string, string>>();
    for (const row of rows) {
      if (!columns.has(row.table_name)) columns.set(row.table_name, new Map());
      columns.get(row.table_name)?.set(row.column_name, row.udt_name);
    }

    expect([...columns.keys()].sort()).toEqual(['applications', 'offers', 'users']);
    expect(Object.fromEntries(columns.get('users') ?? {})).toMatchObject({
      id: 'uuid',
      email: 'text',
      password_hash: 'text',
      role: 'user_role',
      created_at: 'timestamptz',
    });
    expect(Object.fromEntries(columns.get('offers') ?? {})).toMatchObject({
      id: 'uuid',
      employer_id: 'uuid',
      title: 'text',
      description: 'text',
      category: 'job_category',
      seniority: 'seniority',
      work_mode: 'work_mode',
      workday: 'workday',
      contract_type: 'contract_type',
      status: 'offer_status',
      created_at: 'timestamptz',
      updated_at: 'timestamptz',
    });
    expect(Object.fromEntries(columns.get('applications') ?? {})).toMatchObject({
      id: 'uuid',
      offer_id: 'uuid',
      candidate_id: 'uuid',
      candidate_name: 'text',
      phone: 'text',
      created_at: 'timestamptz',
    });
  });

  it('crea las restricciones PRIMARY KEY, UNIQUE y FOREIGN KEY', async () => {
    const rows: Array<{ conname: string; contype: string }> = await dataSource.query(
      `SELECT conname, contype FROM pg_constraint WHERE conname = ANY($1)`,
      [CONSTRAINT_NAMES],
    );

    expect(rows.map((row) => row.conname).sort()).toEqual([...CONSTRAINT_NAMES].sort());
    expect(rows.find((row) => row.conname === 'UQ_users_email')?.contype).toBe('u');
    expect(rows.find((row) => row.conname === 'UQ_applications_offer_candidate')?.contype).toBe('u');
    expect(rows.find((row) => row.conname === 'FK_offers_employer')?.contype).toBe('f');
    expect(rows.find((row) => row.conname === 'FK_applications_offer')?.contype).toBe('f');
    expect(rows.find((row) => row.conname === 'FK_applications_candidate')?.contype).toBe('f');
  });

  it('crea los índices iniciales', async () => {
    const rows: Array<{ indexname: string }> = await dataSource.query(
      `SELECT indexname FROM pg_indexes WHERE indexname = ANY($1)`,
      [INDEX_NAMES],
    );

    expect(rows.map((row) => row.indexname).sort()).toEqual([...INDEX_NAMES].sort());
  });

  it('genera identificadores UUID automáticamente', async () => {
    const id = await insertUser(dataSource);
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('rechaza claves foráneas inexistentes', async () => {
    await expect(insertOffer(dataSource, randomUUID())).rejects.toMatchObject({
      code: '23503',
    });
  });

  it('rechaza códigos de enum fuera del catálogo', async () => {
    const employerId = await insertUser(dataSource, { role: 'EMPLOYER' });
    await expect(
      insertOffer(dataSource, employerId, { category: 'TECNOLOGIA' }),
    ).rejects.toMatchObject({ code: '22P02' });
  });

  it('aplica UNIQUE sobre users.email', async () => {
    const email = `${randomUUID()}@test.local`;
    await insertUser(dataSource, { email });

    await expect(insertUser(dataSource, { email })).rejects.toMatchObject({
      code: '23505',
    });
  });

  it('aplica UNIQUE sobre (offer_id, candidate_id)', async () => {
    const employerId = await insertUser(dataSource, { role: 'EMPLOYER' });
    const candidateId = await insertUser(dataSource);
    const offerId = await insertOffer(dataSource, employerId);

    await dataSource.query(
      `INSERT INTO "applications" ("id", "offer_id", "candidate_id", "candidate_name", "phone")
       VALUES ($1, $2, $3, $4, $5)`,
      [randomUUID(), offerId, candidateId, 'Candidato', '+5491112345678'],
    );

    await expect(
      dataSource.query(
        `INSERT INTO "applications" ("id", "offer_id", "candidate_id", "candidate_name", "phone")
         VALUES ($1, $2, $3, $4, $5)`,
        [randomUUID(), offerId, candidateId, 'Otro nombre', '+5491187654321'],
      ),
    ).rejects.toMatchObject({ code: '23505' });
  });
});

describe.skipIf(!shouldRunIntegrationTests())('Reversión de la migración inicial', () => {
  const migration = new InitialSchema1764038400000();
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = createTestDataSource();
    await dataSource.initialize();
    await resetTestSchema(dataSource);
    await withQueryRunner(dataSource, (queryRunner) => migration.up(queryRunner));
  });

  afterAll(async () => {
    await resetTestSchema(dataSource);
    await dataSource.destroy();
  });

  it('down elimina tablas y enums', async () => {
    await withQueryRunner(dataSource, (queryRunner) => migration.down(queryRunner));

    const tables: Array<{ regclass: string | null }> = await dataSource.query(
      `SELECT to_regclass('public.users') AS regclass`,
    );
    expect(tables[0]?.regclass).toBeNull();

    const enums: Array<{ typname: string }> = await dataSource.query(
      `SELECT typname FROM pg_type WHERE typtype = 'e' AND typname = ANY($1)`,
      [ENUM_NAMES],
    );
    expect(enums).toHaveLength(0);
  });
});

describe.skipIf(!shouldRunIntegrationTests())('Migración company_name', () => {
  const initialMigration = new InitialSchema1764038400000();
  const migration = new AddCompanyName1795584000000();
  const constraintName = 'CK_users_company_name_required_for_employer';
  const expectedCompanies: Array<{ email: string; company_name: string }> = [
    { email: 'empresa@test.com', company_name: 'Google' },
    { email: 'empresa_dos@test.com', company_name: 'Amazon' },
    { email: 'mercadolibre@test.com', company_name: 'Mercado Libre' },
    { email: 'meta@test.com', company_name: 'Meta' },
    { email: 'vercel@test.com', company_name: 'Vercel' },
  ];

  let dataSource: DataSource;
  let offersBefore: Array<{
    id: string;
    title: string;
    status: string;
    employer_id: string;
  }>;

  beforeAll(async () => {
    dataSource = createTestDataSource();
    await dataSource.initialize();
    await resetTestSchema(dataSource);
    await withQueryRunner(dataSource, (queryRunner) =>
      initialMigration.up(queryRunner),
    );

    for (const { email } of expectedCompanies) {
      await insertUser(dataSource, { email, role: 'EMPLOYER' });
    }
    await insertUser(dataSource, {
      email: 'candidato@test.local',
      role: 'CANDIDATE',
    });

    const employers: Array<{ id: string; email: string }> =
      await dataSource.query(`SELECT id, email FROM users WHERE role = 'EMPLOYER'`);
    const metaId = employers.find((user) => user.email === 'meta@test.com')?.id;
    const vercelId = employers.find(
      (user) => user.email === 'vercel@test.com',
    )?.id;

    if (!metaId || !vercelId) {
      throw new Error('No se encontraron los empleadores para las ofertas de prueba');
    }

    await insertOffer(dataSource, metaId, { category: 'TECHNOLOGY_SYSTEMS' });
    await insertOffer(dataSource, vercelId, { category: 'ADMINISTRATION' });
    offersBefore = await dataSource.query(
      `SELECT id, title, status, employer_id FROM offers ORDER BY id`,
    );

    await withQueryRunner(dataSource, (queryRunner) => migration.up(queryRunner));
  });

  afterAll(async () => {
    await resetTestSchema(dataSource);
    await dataSource.destroy();
  });

  it('agrega la columna company_name y la restricción condicional', async () => {
    const columns: Array<{
      column_name: string;
      is_nullable: string;
      udt_name: string;
    }> = await dataSource.query(
      `SELECT column_name, is_nullable, udt_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'users'
         AND column_name = 'company_name'`,
    );

    expect(columns).toEqual([
      { column_name: 'company_name', is_nullable: 'YES', udt_name: 'text' },
    ]);

    const constraints: Array<{ conname: string; contype: string }> =
      await dataSource.query(
        `SELECT conname, contype FROM pg_constraint WHERE conname = $1`,
        [constraintName],
      );
    expect(constraints).toEqual([
      { conname: constraintName, contype: 'c' },
    ]);
  });

  it('completa company_name para los cinco EMPLOYER existentes por email', async () => {
    const rows: Array<{ email: string; company_name: string | null }> =
      await dataSource.query(
        `SELECT email, company_name FROM users
         WHERE role = 'EMPLOYER' ORDER BY email`,
      );

    expect(rows).toEqual(expectedCompanies);
  });

  it('conserva las ofertas existentes y sus relaciones', async () => {
    const rows: Array<{
      id: string;
      title: string;
      status: string;
      employer_id: string;
      employer_company: string | null;
    }> = await dataSource.query(
      `SELECT o.id, o.title, o.status, o.employer_id, u.company_name AS employer_company
       FROM offers o JOIN users u ON u.id = o.employer_id
       ORDER BY o.id`,
    );

    expect(rows.map(({ employer_company: _company, ...offer }) => offer)).toEqual(
      offersBefore,
    );
    expect(rows.every((row) => Boolean(row.employer_company))).toBe(true);
  });

  it('rechaza EMPLOYER sin companyName y acepta EMPLOYER con companyName', async () => {
    await expect(
      insertUser(dataSource, {
        email: `${randomUUID()}@test.local`,
        role: 'EMPLOYER',
      }),
    ).rejects.toMatchObject({ code: '23514' });

    await expect(
      insertUser(dataSource, {
        email: `${randomUUID()}@test.local`,
        role: 'EMPLOYER',
        companyName: 'Empresa nueva',
      }),
    ).resolves.toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('acepta CANDIDATE sin companyName', async () => {
    await expect(
      insertUser(dataSource, {
        email: `${randomUUID()}@test.local`,
        role: 'CANDIDATE',
      }),
    ).resolves.toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('down elimina la restricción y la columna sin tocar las ofertas', async () => {
    const offersCountBefore: Array<{ count: string }> = await dataSource.query(
      `SELECT COUNT(*)::text AS count FROM offers`,
    );

    await withQueryRunner(dataSource, (queryRunner) => migration.down(queryRunner));

    const columns: Array<{ column_name: string }> = await dataSource.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'users'
         AND column_name = 'company_name'`,
    );
    expect(columns).toHaveLength(0);

    const constraints: Array<{ conname: string }> = await dataSource.query(
      `SELECT conname FROM pg_constraint WHERE conname = $1`,
      [constraintName],
    );
    expect(constraints).toHaveLength(0);

    const offersCountAfter: Array<{ count: string }> = await dataSource.query(
      `SELECT COUNT(*)::text AS count FROM offers`,
    );
    expect(offersCountAfter).toEqual(offersCountBefore);
  });
});
