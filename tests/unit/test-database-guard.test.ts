import { describe, expect, it } from 'vitest';
import { assertTestDatabase, TEST_DATABASE_NAME } from '../helpers/create-test-data-source';

describe('assertTestDatabase', () => {
  it('acepta únicamente job_board_db_test', () => {
    expect(() => assertTestDatabase(TEST_DATABASE_NAME)).not.toThrow();
  });

  it('rechaza la base de desarrollo', () => {
    expect(() => assertTestDatabase('job_board_db')).toThrow(/job_board_db_test/);
  });

  it('rechaza cualquier otra base', () => {
    expect(() => assertTestDatabase('production_db')).toThrow(/job_board_db_test/);
  });
});
