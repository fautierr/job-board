import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../src/config/env';

const baseEnv = {
  DB_HOST: 'localhost',
  DB_USER: 'postgres',
  DB_PASSWORD: 'valor-solo-para-test-de-schema',
  DB_NAME: 'job_board_db',
  JWT_SECRET: 'secreto-solo-para-test-de-schema',
};

describe('loadEnv', () => {
  it('aplica los valores por defecto', () => {
    const parsed = loadEnv(baseEnv);

    expect(parsed).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      DB_PORT: 5432,
      TEST_DB_NAME: 'job_board_db_test',
    });
  });

  it('respeta los valores explícitos', () => {
    const parsed = loadEnv({
      ...baseEnv,
      NODE_ENV: 'test',
      PORT: '4000',
      DB_PORT: '5433',
      DB_NAME: 'otra_base',
      TEST_DB_NAME: 'job_board_db_test',
    });

    expect(parsed).toMatchObject({
      NODE_ENV: 'test',
      PORT: 4000,
      DB_PORT: 5433,
      DB_NAME: 'otra_base',
    });
  });

  it('rechaza DB_PASSWORD vacío', () => {
    expect(() => loadEnv({ ...baseEnv, DB_PASSWORD: '' })).toThrow(/DB_PASSWORD/);
  });

  it('rechaza DB_NAME ausente', () => {
    expect(() => loadEnv({ ...baseEnv, DB_NAME: undefined })).toThrow(/DB_NAME/);
  });

  it('rechaza un puerto fuera de rango', () => {
    expect(() => loadEnv({ ...baseEnv, DB_PORT: '70000' })).toThrow(/DB_PORT/);
  });

  it('rechaza un NODE_ENV desconocido', () => {
    expect(() => loadEnv({ ...baseEnv, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  it('rechaza JWT_SECRET vacío', () => {
    expect(() => loadEnv({ ...baseEnv, JWT_SECRET: '' })).toThrow(/JWT_SECRET/);
  });
});
