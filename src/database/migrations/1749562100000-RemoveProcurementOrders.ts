import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveProcurementOrders1749562100000 implements MigrationInterface {
  name = 'RemoveProcurementOrders1749562100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "equipment_requests"
      SET "status" = 'procurement_approved'
      WHERE "status" = 'purchase_pending'
    `);

    await queryRunner.query(
      `DROP TABLE IF EXISTS "procurement_orders" CASCADE`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."procurement_order_status_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."procurement_order_status_enum" AS ENUM('pending', 'ordered', 'received', 'cancelled')`,
    );

    await queryRunner.query(`
      CREATE TABLE "procurement_orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "request_id" uuid NOT NULL,
        "item_name" character varying NOT NULL,
        "quantity" integer NOT NULL DEFAULT 1,
        "status" "public"."procurement_order_status_enum" NOT NULL DEFAULT 'pending',
        "created_by_id" uuid,
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_procurement_orders_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_procurement_orders_request" FOREIGN KEY ("request_id") REFERENCES "equipment_requests"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_procurement_orders_created_by" FOREIGN KEY ("created_by_id") REFERENCES "employees"("id") ON DELETE SET NULL
      )
    `);
  }
}
