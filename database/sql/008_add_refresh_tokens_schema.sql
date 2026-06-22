CREATE TABLE "refresh_tokens" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "employee_id" uuid NOT NULL,
  "token_hash" character varying NOT NULL,
  "expires_at" TIMESTAMP NOT NULL,
  "revoked_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_refresh_tokens_token_hash" UNIQUE ("token_hash"),
  CONSTRAINT "PK_refresh_tokens_id" PRIMARY KEY ("id"),
  CONSTRAINT "FK_refresh_tokens_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "IDX_refresh_tokens_employee_id" ON "refresh_tokens" ("employee_id");
