import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1764038400000 implements MigrationInterface {
  name = 'InitialSchema1764038400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`CREATE TYPE "user_role" AS ENUM ('EMPLOYER', 'CANDIDATE')`);
    await queryRunner.query(`CREATE TYPE "offer_status" AS ENUM ('PUBLISHED', 'PAUSED', 'CLOSED')`);
    await queryRunner.query(`CREATE TYPE "job_category" AS ENUM (
      'TECHNOLOGY_SYSTEMS', 'ADMINISTRATION', 'SALES_COMMERCIAL', 'CUSTOMER_SERVICE',
      'MARKETING_COMMUNICATION', 'DESIGN_MULTIMEDIA', 'HUMAN_RESOURCES',
      'FINANCE_ACCOUNTING', 'LOGISTICS_TRANSPORT', 'PRODUCTION_OPERATIONS',
      'GASTRONOMY_TOURISM', 'HEALTH', 'EDUCATION', 'CONSTRUCTION_TRADES',
      'LEGAL', 'OTHER'
    )`);
    await queryRunner.query(`CREATE TYPE "seniority" AS ENUM (
      'NO_EXPERIENCE', 'TRAINEE', 'JUNIOR', 'SEMI_SENIOR', 'SENIOR', 'LEADER_MANAGER'
    )`);
    await queryRunner.query(`CREATE TYPE "work_mode" AS ENUM ('REMOTE', 'ONSITE', 'HYBRID')`);
    await queryRunner.query(`CREATE TYPE "workday" AS ENUM ('FULL_TIME', 'PART_TIME')`);
    await queryRunner.query(`CREATE TYPE "contract_type" AS ENUM (
      'EMPLOYMENT', 'TEMPORARY_CONTRACT', 'FREELANCE_PROJECT', 'INTERNSHIP'
    )`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" text NOT NULL,
        "password_hash" text NOT NULL,
        "role" "user_role" NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "offers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "employer_id" uuid NOT NULL,
        "title" text NOT NULL,
        "description" text NOT NULL,
        "category" "job_category" NOT NULL,
        "seniority" "seniority" NOT NULL,
        "work_mode" "work_mode" NOT NULL,
        "workday" "workday" NOT NULL,
        "contract_type" "contract_type" NOT NULL,
        "status" "offer_status" NOT NULL DEFAULT 'PUBLISHED',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_offers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_offers_employer" FOREIGN KEY ("employer_id")
          REFERENCES "users" ("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "applications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "offer_id" uuid NOT NULL,
        "candidate_id" uuid NOT NULL,
        "candidate_name" text NOT NULL,
        "phone" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_applications" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_applications_offer_candidate" UNIQUE ("offer_id", "candidate_id"),
        CONSTRAINT "FK_applications_offer" FOREIGN KEY ("offer_id")
          REFERENCES "offers" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_applications_candidate" FOREIGN KEY ("candidate_id")
          REFERENCES "users" ("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_offers_status_category" ON "offers" ("status", "category")`);
    await queryRunner.query(`CREATE INDEX "IDX_offers_employer_id" ON "offers" ("employer_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_applications_offer_id" ON "applications" ("offer_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_applications_candidate_id" ON "applications" ("candidate_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "applications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "offers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "contract_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "workday"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "work_mode"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "seniority"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "job_category"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "offer_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role"`);
  }
}
