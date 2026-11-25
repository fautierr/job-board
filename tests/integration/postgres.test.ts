import 'reflect-metadata';
import type { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createTestDataSource,
  shouldRunIntegrationTests,
  TEST_DATABASE_NAME,
} from '../helpers/create-test-data-source';

describe.skipIf(!shouldRunIntegrationTests())('PostgreSQL de testing', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = createTestDataSource();
    await dataSource.initialize();
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('ejecuta SELECT 1', async () => {
    const rows: Array<{ ok: number }> = await dataSource.query('SELECT 1 AS ok');
    expect(rows[0]?.ok).toBe(1);
  });

  it('usa exclusivamente la base de testing', () => {
    const options = dataSource.options as { database?: string };
    expect(options.database).toBe(TEST_DATABASE_NAME);
  });
});
