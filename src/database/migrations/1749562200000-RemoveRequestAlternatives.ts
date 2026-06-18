import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveRequestAlternatives1749562200000 implements MigrationInterface {
  name = 'RemoveRequestAlternatives1749562200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "notifications"
      WHERE "type" = 'alternative_suggested'
    `);

    await queryRunner.query(
      `DROP TABLE IF EXISTS "request_alternatives" CASCADE`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."request_alternative_status_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."request_alternative_status_enum" AS ENUM('suggested', 'accepted_by_employee', 'rejected_by_employee')`,
    );

    await queryRunner.query(`
      CREATE TABLE "request_alternatives" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "request_id" uuid NOT NULL,
        "equipment_model_id" uuid NOT NULL,
        "suggested_by_id" uuid NOT NULL,
        "status" "public"."request_alternative_status_enum" NOT NULL DEFAULT 'suggested',
        "message" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_request_alternatives_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_request_alternatives_request" FOREIGN KEY ("request_id") REFERENCES "equipment_requests"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_request_alternatives_model" FOREIGN KEY ("equipment_model_id") REFERENCES "equipment_models"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_request_alternatives_suggested_by" FOREIGN KEY ("suggested_by_id") REFERENCES "employees"("id") ON DELETE CASCADE
      )
    `);
  }
}
