CREATE INDEX "runtime_event_guardrail_time_id_idx" ON "runtime_event" ("guardrail_id", "occurred_at", "id");
--> statement-breakpoint
DROP INDEX "runtime_event_guardrail_time_idx";
