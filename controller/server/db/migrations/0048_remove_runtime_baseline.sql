-- Reconcile pools that previously received an implicit global artifact.
UPDATE "controller_state"
SET "desired_generation" = "desired_generation" + 1, "updated_at" = now()
WHERE "baseline_version" IS NOT NULL;

INSERT INTO "controller_outbox" ("id", "kind", "aggregate_id", "payload")
SELECT gen_random_uuid()::text, 'runner.desired_state_changed', 'platform',
       jsonb_build_object('generation', "desired_generation")
FROM "controller_state" WHERE "baseline_version" IS NOT NULL;

ALTER TABLE "controller_state" DROP COLUMN "baseline_version";
