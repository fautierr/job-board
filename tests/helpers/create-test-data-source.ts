import 'dotenv/config';
import { DataSource } from 'typeorm';
import { getEnv } from '../../src/config/env';
import { AddCompanyName1795584000000 } from '../../src/db/migrations/1795584000000-add-company-name';
import { InitialSchema1764038400000 } from '../../src/db/migrations/1764038400000-initial-schema';
import { Application } from '../../src/modules/applications/applications.entity';
import { Offer } from '../../src/modules/offers/offers.entity';
import { User } from '../../src/modules/users/users.entity';

export const TEST_DATABASE_NAME = 'job_board_db_test';

export function assertTestDatabase(database: string): void {
  if (database !== TEST_DATABASE_NAME) {
    throw new Error(
      `Los tests solo pueden conectarse a "${TEST_DATABASE_NAME}". Se recibió "${database}".`,
    );
  }
}

export function shouldRunIntegrationTests(): boolean {
  const database = process.env.TEST_DB_NAME ?? TEST_DATABASE_NAME;
  return Boolean(process.env.DB_PASSWORD) && database === TEST_DATABASE_NAME;
}

export function createTestDataSource(): DataSource {
  const env = getEnv();
  assertTestDatabase(env.TEST_DB_NAME);

  return new DataSource({
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.TEST_DB_NAME,
    entities: [User, Offer, Application],
    migrations: [InitialSchema1764038400000, AddCompanyName1795584000000],
    synchronize: false,
    migrationsRun: false,
    logging: false,
  });
}
