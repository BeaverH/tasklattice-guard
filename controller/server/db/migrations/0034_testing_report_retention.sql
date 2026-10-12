ALTER TABLE "guardrail_version" ADD COLUMN "testing_evidence" jsonb;
--> statement-breakpoint
CREATE INDEX "guardrail_validation_retention_idx" ON "guardrail_validation_run" ("guardrail_id", "status", (coalesce("completed_at", "created_at")) DESC, "id" DESC);
