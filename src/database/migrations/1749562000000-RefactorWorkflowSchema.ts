import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorWorkflowSchema1749562000000 implements MigrationInterface {
  name = 'RefactorWorkflowSchema1749562000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "approval_steps" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "equipment_requests" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "equipment" CASCADE`);

    await queryRunner.query(
      `ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "FK_employees_manager"`,
    );
    await queryRunner.query(
      `ALTER TABLE "employees" DROP COLUMN IF EXISTS "manager_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "employees" DROP COLUMN IF EXISTS "department"`,
    );

    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."request_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."equipment_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."notification_type_enum"`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."employee_role_enum" AS ENUM('employee', 'direct_manager', 'procurement_manager', 'admin')`,
    );
    await queryRunner.query(
      `ALTER TABLE "employees" ALTER COLUMN "role" DROP DEFAULT`,
    );
    await queryRunner.query(`
      ALTER TABLE "employees"
      ALTER COLUMN "role" TYPE "public"."employee_role_enum"
      USING (
        CASE
          WHEN "role"::text = 'admin' THEN 'admin'::"public"."employee_role_enum"
          ELSE 'employee'::"public"."employee_role_enum"
        END
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "employees" ALTER COLUMN "role" SET DEFAULT 'employee'`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."employees_role_enum"`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."account_status_enum" AS ENUM('active', 'inactive')`,
    );
    await queryRunner.query(
      `ALTER TABLE "employees" ADD "account_status" "public"."account_status_enum" NOT NULL DEFAULT 'active'`,
    );

    await queryRunner.query(`
      CREATE TABLE "departments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "direct_manager_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_departments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_departments_direct_manager" FOREIGN KEY ("direct_manager_id") REFERENCES "employees"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`ALTER TABLE "employees" ADD "department_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "employees" ADD CONSTRAINT "FK_employees_department" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "equipment_categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" text,
        "category_image" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_equipment_categories_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "equipment_models" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "category_id" uuid NOT NULL,
        "description" text,
        "default_value" numeric(10,2) NOT NULL DEFAULT '0',
        "procurement_year" integer,
        "release_year" integer,
        "expected_lifespan_months" integer,
        "low_stock_threshold" integer NOT NULL DEFAULT 1,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_equipment_models_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_equipment_models_category" FOREIGN KEY ("category_id") REFERENCES "equipment_categories"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(
      `CREATE TYPE "public"."equipment_asset_status_enum" AS ENUM('available', 'in_use', 'reserved', 'return_requested', 'maintenance', 'retired')`,
    );

    await queryRunner.query(`
      CREATE TABLE "equipment_assets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "equipment_model_id" uuid NOT NULL,
        "asset_tag" character varying NOT NULL,
        "serial_number" character varying,
        "status" "public"."equipment_asset_status_enum" NOT NULL DEFAULT 'available',
        "assigned_employee_id" uuid,
        "assigned_at" TIMESTAMP,
        "expected_return_date" date,
        "notes" text,
        "retired_at" TIMESTAMP,
        "retired_by_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_equipment_assets_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_equipment_assets_asset_tag" UNIQUE ("asset_tag"),
        CONSTRAINT "FK_equipment_assets_model" FOREIGN KEY ("equipment_model_id") REFERENCES "equipment_models"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_equipment_assets_assigned_employee" FOREIGN KEY ("assigned_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_equipment_assets_retired_by" FOREIGN KEY ("retired_by_id") REFERENCES "employees"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE TYPE "public"."request_type_enum" AS ENUM('loan', 'procurement')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."request_status_enum" AS ENUM('pending_manager_approval', 'pending_procurement_approval', 'procurement_approved', 'purchase_pending', 'approved', 'fulfilled', 'rejected', 'cancelled')`,
    );

    await queryRunner.query(`
      CREATE TABLE "equipment_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "requester_id" uuid NOT NULL,
        "request_type" "public"."request_type_enum" NOT NULL,
        "equipment_model_id" uuid,
        "requested_item_name" character varying,
        "category_id" uuid,
        "quantity" integer NOT NULL DEFAULT 1,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "purpose" text NOT NULL,
        "status" "public"."request_status_enum" NOT NULL DEFAULT 'pending_manager_approval',
        "cancellation_reason" text,
        "cancelled_at" TIMESTAMP,
        "rejected_reason" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_equipment_requests_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_equipment_requests_requester" FOREIGN KEY ("requester_id") REFERENCES "employees"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_equipment_requests_model" FOREIGN KEY ("equipment_model_id") REFERENCES "equipment_models"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_equipment_requests_category" FOREIGN KEY ("category_id") REFERENCES "equipment_categories"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE TYPE "public"."approval_role_enum" AS ENUM('direct_manager', 'procurement_manager', 'admin')`,
    );

    await queryRunner.query(`
      CREATE TABLE "approval_steps" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "request_id" uuid NOT NULL,
        "level" integer NOT NULL,
        "approver_id" uuid NOT NULL,
        "approver_role" "public"."approval_role_enum" NOT NULL,
        "status" "public"."approval_step_status_enum" NOT NULL DEFAULT 'pending',
        "comment" text,
        "acted_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_approval_steps_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_approval_steps_request" FOREIGN KEY ("request_id") REFERENCES "equipment_requests"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_approval_steps_approver" FOREIGN KEY ("approver_id") REFERENCES "employees"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE TYPE "public"."request_alternative_status_enum" AS ENUM('suggested', 'accepted_by_employee', 'rejected_by_employee')`,
    );

    await queryRunner.query(`
      CREATE TABLE "request_alternatives" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "request_id" uuid NOT NULL,
        "equipment_model_id" uuid NOT NULL,
        "suggested_by_id" uuid NOT NULL,
        "message" text,
        "status" "public"."request_alternative_status_enum" NOT NULL DEFAULT 'suggested',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_request_alternatives_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_request_alternatives_request" FOREIGN KEY ("request_id") REFERENCES "equipment_requests"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_request_alternatives_model" FOREIGN KEY ("equipment_model_id") REFERENCES "equipment_models"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_request_alternatives_suggested_by" FOREIGN KEY ("suggested_by_id") REFERENCES "employees"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE TYPE "public"."equipment_assignment_status_enum" AS ENUM('active', 'return_requested', 'returned', 'cancelled')`,
    );

    await queryRunner.query(`
      CREATE TABLE "equipment_assignments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "equipment_asset_id" uuid NOT NULL,
        "employee_id" uuid NOT NULL,
        "request_id" uuid,
        "assigned_by_id" uuid,
        "assigned_at" TIMESTAMP NOT NULL,
        "expected_return_date" date,
        "return_requested_by_id" uuid,
        "return_requested_at" TIMESTAMP,
        "return_by_date" date,
        "returned_at" TIMESTAMP,
        "return_note" text,
        "status" "public"."equipment_assignment_status_enum" NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_equipment_assignments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_equipment_assignments_asset" FOREIGN KEY ("equipment_asset_id") REFERENCES "equipment_assets"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_equipment_assignments_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_equipment_assignments_request" FOREIGN KEY ("request_id") REFERENCES "equipment_requests"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_equipment_assignments_assigned_by" FOREIGN KEY ("assigned_by_id") REFERENCES "employees"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_equipment_assignments_return_requested_by" FOREIGN KEY ("return_requested_by_id") REFERENCES "employees"("id") ON DELETE SET NULL
      )
    `);

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

    await queryRunner.query(
      `CREATE TYPE "public"."notification_type_enum" AS ENUM('approval_required', 'request_approved', 'request_rejected', 'request_cancelled', 'request_update', 'procurement_approved', 'alternative_suggested', 'equipment_assigned', 'equipment_return_requested', 'equipment_returned')`,
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
        "equipment_assignment_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_recipient" FOREIGN KEY ("recipient_id") REFERENCES "employees"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notifications_request" FOREIGN KEY ("request_id") REFERENCES "equipment_requests"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_notifications_approval_step" FOREIGN KEY ("approval_step_id") REFERENCES "approval_steps"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_notifications_equipment_assignment" FOREIGN KEY ("equipment_assignment_id") REFERENCES "equipment_assignments"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_approval_steps_approver_status" ON "approval_steps" ("approver_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_approval_steps_request_level" ON "approval_steps" ("request_id", "level")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_recipient_read" ON "notifications" ("recipient_id", "is_read")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_equipment_assets_model_status" ON "equipment_assets" ("equipment_model_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_equipment_requests_status" ON "equipment_requests" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_equipment_requests_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_equipment_assets_model_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notifications_recipient_read"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_approval_steps_request_level"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_approval_steps_approver_status"`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "notifications" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "procurement_orders" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "equipment_assignments" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "request_alternatives" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "approval_steps" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "equipment_requests" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "equipment_assets" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "equipment_models" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "equipment_categories" CASCADE`,
    );

    await queryRunner.query(
      `ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "FK_employees_department"`,
    );
    await queryRunner.query(
      `ALTER TABLE "employees" DROP COLUMN IF EXISTS "department_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "departments" CASCADE`);

    await queryRunner.query(
      `ALTER TABLE "employees" DROP COLUMN IF EXISTS "account_status"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."account_status_enum"`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."employees_role_enum" AS ENUM('admin', 'user')`,
    );
    await queryRunner.query(
      `ALTER TABLE "employees" ALTER COLUMN "role" DROP DEFAULT`,
    );
    await queryRunner.query(`
      ALTER TABLE "employees"
      ALTER COLUMN "role" TYPE "public"."employees_role_enum"
      USING (
        CASE
          WHEN "role"::text = 'admin' THEN 'admin'::"public"."employees_role_enum"
          ELSE 'user'::"public"."employees_role_enum"
        END
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "employees" ALTER COLUMN "role" SET DEFAULT 'user'`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."employee_role_enum"`,
    );

    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."notification_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."procurement_order_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."equipment_assignment_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."request_alternative_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."approval_role_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."request_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."request_type_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."equipment_asset_status_enum"`,
    );

    await queryRunner.query(
      `ALTER TABLE "employees" ADD "department" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "employees" ADD "manager_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "employees" ADD CONSTRAINT "FK_employees_manager" FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE SET NULL`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."equipment_status_enum" AS ENUM('available', 'in_use', 'maintenance')`,
    );
    await queryRunner.query(`
      CREATE TABLE "equipment" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "category" character varying NOT NULL,
        "description" text,
        "status" "public"."equipment_status_enum" NOT NULL DEFAULT 'available',
        "assigned_employee_id" uuid,
        "value" numeric(10,2) NOT NULL DEFAULT '0',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_equipment_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_equipment_assigned_employee" FOREIGN KEY ("assigned_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE TYPE "public"."request_status_enum" AS ENUM('pending', 'partially_approved', 'approved', 'rejected', 'cancelled')`,
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
        CONSTRAINT "FK_equipment_requests_requester" FOREIGN KEY ("requester_id") REFERENCES "employees"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_equipment_requests_equipment" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE
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
        CONSTRAINT "FK_approval_steps_request" FOREIGN KEY ("request_id") REFERENCES "equipment_requests"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_approval_steps_approver" FOREIGN KEY ("approver_id") REFERENCES "employees"("id") ON DELETE CASCADE
      )
    `);

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
        CONSTRAINT "FK_notifications_recipient" FOREIGN KEY ("recipient_id") REFERENCES "employees"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notifications_request" FOREIGN KEY ("request_id") REFERENCES "equipment_requests"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_notifications_approval_step" FOREIGN KEY ("approval_step_id") REFERENCES "approval_steps"("id") ON DELETE SET NULL
      )
    `);
  }
}
