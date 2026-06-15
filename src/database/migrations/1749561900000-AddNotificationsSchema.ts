import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationsSchema1749561900000 implements MigrationInterface {
  name = 'AddNotificationsSchema1749561900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."notification_type_enum" AS ENUM('approval_required', 'request_approved', 'request_rejected', 'request_update')`,
    );

    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "recipient_id" uuid NOT NULL,
        "type" "public"."notification_type_enum" NOT NULL,
        "title" character varying NOT NULL,
        "message" text NOT NULL,
        "is_read" boolean NOT NULL DEFAULT false,
        "read_at" TIMESTAMP,
        "request_id" uuid,
        "approval_step_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_recipient" FOREIGN KEY ("recipient_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_notifications_request" FOREIGN KEY ("request_id") REFERENCES "equipment_requests"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT "FK_notifications_approval_step" FOREIGN KEY ("approval_step_id") REFERENCES "approval_steps"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_recipient_read" ON "notifications" ("recipient_id", "is_read")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_notifications_recipient_read"`,
    );
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "public"."notification_type_enum"`);
  }
}
