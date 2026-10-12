ALTER TABLE "guardrail_package" ALTER COLUMN "key_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "guardrail_version_provenance" ALTER COLUMN "source_key_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "guardrail_version_provenance" ALTER COLUMN "source_signature" DROP NOT NULL;
