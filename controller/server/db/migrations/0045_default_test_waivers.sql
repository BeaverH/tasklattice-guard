ALTER TABLE guardrail_version ADD COLUMN source_validation_run_id text;
ALTER TABLE guardrail_version ADD COLUMN test_waiver jsonb;
ALTER TABLE guardrail_version ADD CONSTRAINT default_test_waiver_only
  CHECK (test_waiver IS NULL OR (guardrail_id = 'guardrail-default' AND source_validation_run_id IS NOT NULL));
