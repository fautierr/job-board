import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompanyName1795584000000 implements MigrationInterface {
  name = 'AddCompanyName1795584000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "company_name" text`);

    await queryRunner.query(`
      UPDATE "users"
      SET "company_name" = CASE lower("email")
        WHEN 'meta@test.com' THEN 'Meta'
        WHEN 'vercel@test.com' THEN 'Vercel'
        WHEN 'mercadolibre@test.com' THEN 'Mercado Libre'
        WHEN 'empresa@test.com' THEN 'Google'
        WHEN 'empresa_dos@test.com' THEN 'Amazon'
      END
      WHERE "role" = 'EMPLOYER' AND "company_name" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "CK_users_company_name_required_for_employer"
      CHECK (
        "role" <> 'EMPLOYER'
        OR ("company_name" IS NOT NULL AND btrim("company_name") <> '')
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "CK_users_company_name_required_for_employer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "company_name"`,
    );
  }
}
