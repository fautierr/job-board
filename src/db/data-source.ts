import 'reflect-metadata';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { getEnv } from '../config/env';
import { Application } from '../modules/applications/applications.entity';
import { Offer } from '../modules/offers/offers.entity';
import { User } from '../modules/users/users.entity';
import { AddCompanyName1795584000000 } from './migrations/1795584000000-add-company-name';
import { InitialSchema1764038400000 } from './migrations/1764038400000-initial-schema';

export function buildDataSourceOptions(database?: string): DataSourceOptions {
  const env = getEnv();

  return {
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: database ?? env.DB_NAME,
    entities: [User, Offer, Application],
    migrations: [InitialSchema1764038400000, AddCompanyName1795584000000],
    synchronize: false,
    migrationsRun: false,
    logging: false,
  };
}

export const AppDataSource = new DataSource(buildDataSourceOptions());
