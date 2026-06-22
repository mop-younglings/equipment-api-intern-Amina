DELETE FROM "notifications"
WHERE "type" = 'alternative_suggested';

DROP TABLE IF EXISTS "request_alternatives" CASCADE;
DROP TYPE IF EXISTS "public"."request_alternative_status_enum";
