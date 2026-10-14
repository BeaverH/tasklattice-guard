CREATE TABLE "model_price_revision" (
  "id" text PRIMARY KEY, "key" text NOT NULL, "source" text NOT NULL,
  "catalog_key" text, "rates" jsonb, "effective_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "model_price_revision_lookup_idx" ON "model_price_revision" ("key", "effective_at" DESC);
CREATE TABLE "model_price_sync" (
  "id" text PRIMARY KEY, "catalog_version" text, "last_success_at" timestamptz, "error" text, "entries" integer NOT NULL DEFAULT 0,
  "metering_since" timestamptz NOT NULL DEFAULT now()
);
INSERT INTO "model_price_sync" ("id") VALUES ('litellm');
CREATE TABLE "model_usage_cost" (
  "id" text PRIMARY KEY, "event_id" text NOT NULL, "guardrail_id" text NOT NULL,
  "guardrail_version" text, "model_id" text, "model" text NOT NULL, "provider" text NOT NULL,
  "source" text NOT NULL, "occurred_at" timestamptz NOT NULL, "calls" integer NOT NULL DEFAULT 1,
  "input_tokens" bigint, "output_tokens" bigint, "cached_input_tokens" bigint,
  "price_id" text, "currency" text CHECK ("currency" = 'USD'), "amount" numeric(30,12), "reason" text NOT NULL
);
CREATE INDEX "model_usage_cost_guardrail_time_idx" ON "model_usage_cost" ("guardrail_id", "occurred_at");
CREATE INDEX "model_usage_cost_event_idx" ON "model_usage_cost" ("event_id");
