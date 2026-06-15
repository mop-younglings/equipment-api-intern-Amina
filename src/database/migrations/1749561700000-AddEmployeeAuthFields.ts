import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmployeeAuthFields1749561700000 implements MigrationInterface {
  name = 'AddEmployeeAuthFields1749561700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."employees_role_enum" AS ENUM('admin', 'user')`,
    );

    await queryRunner.query(`
      ALTER TABLE "employees"
      ADD COLUMN "password" character varying NOT NULL DEFAULT '',
      ADD COLUMN "role" "public"."employees_role_enum" NOT NULL DEFAULT 'user'
    `);

    await queryRunner.query(`
      ALTER TABLE "employees" ALTER COLUMN "password" DROP DEFAULT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "employees"
      DROP COLUMN "role",
      DROP COLUMN "password"
    `);

    await queryRunner.query(`DROP TYPE "public"."employees_role_enum"`);
  }
}
