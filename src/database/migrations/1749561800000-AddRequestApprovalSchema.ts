import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRequestApprovalSchema1749561800000 implements MigrationInterface {
  name = 'AddRequestApprovalSchema1749561800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "employees" ADD "manager_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "employees" ADD CONSTRAINT "FK_employees_manager" FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "equipment" ADD "value" numeric(10,2) NOT NULL DEFAULT '0'`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."request_status_enum" AS ENUM('pending', 'partially_approved', 'approved', 'rejected', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."approval_step_status_enum" AS ENUM('pending', 'approved', 'rejected', 'skipped')`,
    );

    await queryRunner.query(`
      CREATE TABLE "equipment_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "requester_id" uuid NOT NULL,
        "equipment_id" uuid NOT NULL,
        "reason" text NOT NULL,
        "status" "public"."request_status_enum" NOT NULL DEFAULT 'pending',
        "equipment_value" numeric(10,2) NOT NULL,
        "required_approval_levels" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_equipment_requests_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_equipment_requests_requester" FOREIGN KEY ("requester_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_equipment_requests_equipment" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "approval_steps" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "request_id" uuid NOT NULL,
        "level" integer NOT NULL,
        "approver_id" uuid NOT NULL,
        "status" "public"."approval_step_status_enum" NOT NULL DEFAULT 'pending',
        "comment" text,
        "acted_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_approval_steps_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_approval_steps_request" FOREIGN KEY ("request_id") REFERENCES "equipment_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_approval_steps_approver" FOREIGN KEY ("approver_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_approval_steps_approver_status" ON "approval_steps" ("approver_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_approval_steps_request_level" ON "approval_steps" ("request_id", "level")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_approval_steps_request_level"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_approval_steps_approver_status"`,
    );
    await queryRunner.query(`DROP TABLE "approval_steps"`);
    await queryRunner.query(`DROP TABLE "equipment_requests"`);
    await queryRunner.query(`DROP TYPE "public"."approval_step_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."request_status_enum"`);
    await queryRunner.query(`ALTER TABLE "equipment" DROP COLUMN "value"`);
    await queryRunner.query(
      `ALTER TABLE "employees" DROP CONSTRAINT "FK_employees_manager"`,
    );
    await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "manager_id"`);
  }
}
