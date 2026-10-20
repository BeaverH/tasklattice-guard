ALTER TABLE "guardrail_validation_run" ADD COLUMN "test_model_rules" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "guardrail_validation_run" ADD COLUMN "test_scope" jsonb;
