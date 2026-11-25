# Job Board - Project Instructions

## Project overview

Backend REST API for a job board application.
Users can register as EMPLOYER or CANDIDATE.
Employers manage job offers. Candidates browse offers and apply.

## Technology stack

- Node.js
- Express
- TypeScript (strict mode)
- TypeORM
- PostgreSQL
- Zod
- JWT (jsonwebtoken)
- bcryptjs
- Vitest and Supertest

## Architecture

- Keep the existing layered architecture.
- Routes handle HTTP routing and middleware.
- Services contain business logic.
- Repositories handle database access.
- Entities define TypeORM models and relations.
- Zod schemas validate incoming data.
- Keep app.ts separate from main.ts for testing.

## Database

- PostgreSQL with TypeORM.
- synchronize must always remain false.
- migrationsRun must remain false.
- Schema: public (no custom schema).
- All primary keys use UUID.
- Use migrations for database structure changes.
- Never modify the development database during automated tests.
- Integration tests must use exclusively job_board_db_test.
- Never expose .env contents or secrets.
- .env must never be committed. .env.example must be tracked.

## Authentication

- Roles: EMPLOYER and CANDIDATE.
- Passwords must be hashed with bcryptjs.
- Authentication uses JWT Bearer tokens.
- JWT expiration: 1 hour.
- No refresh tokens in the current version.
- Never return password or password_hash.
- Obtain the authenticated user's identity from the verified JWT and database, never from client-supplied IDs.

## Development workflow

- Work only on the stage explicitly requested.
- Do not advance to another stage without the user's approval.
- Before implementation, follow Plan mode when the user requests architectural design.
- Do not refactor unrelated code or introduce unnecessary dependencies.
- Prefer simple solutions appropriate for the current project scope.
- Explain important decisions briefly when reporting completed work.

## Verification

After changes:

1. Run npm run build.
2. Run npm test.
3. Report files created and modified.
4. Report test results and database used.
5. Stop and wait for approval before continuing.

## Project commands

- npm run dev
- npm run build
- npm test
- npm run typecheck
- npm run migration:run
- npm run migration:revert
