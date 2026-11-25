import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    env: {
      NODE_ENV: 'test',
      DB_NAME: 'job_board_db_test',
      JWT_SECRET: 'test-only-jwt-secret',
    },
    include: ['tests/**/*.test.ts'],
    pool: 'forks',
    fileParallelism: false,
  },
});
