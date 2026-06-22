CREATE TYPE "public"."employees_role_enum" AS ENUM('admin', 'user');

ALTER TABLE "employees"
ADD COLUMN "password" character varying NOT NULL DEFAULT '',
ADD COLUMN "role" "public"."employees_role_enum" NOT NULL DEFAULT 'user';

ALTER TABLE "employees" ALTER COLUMN "password" DROP DEFAULT;
