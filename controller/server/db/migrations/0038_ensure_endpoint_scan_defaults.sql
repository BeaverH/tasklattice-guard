-- main may already have applied 0037 without the earlier branch-only 0036.
-- Reconcile both upgrade histories without changing existing Endpoint settings.
ALTER TABLE "endpoint" ADD COLUMN IF NOT EXISTS "scan_flag_only_default" boolean DEFAULT true NOT NULL;
