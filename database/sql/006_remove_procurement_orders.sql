UPDATE "equipment_requests"
SET "status" = 'procurement_approved'
WHERE "status" = 'purchase_pending';

DROP TABLE IF EXISTS "procurement_orders" CASCADE;
DROP TYPE IF EXISTS "public"."procurement_order_status_enum";
