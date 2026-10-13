CREATE TABLE policy_resource (
 id text PRIMARY KEY, definition jsonb NOT NULL, revision integer NOT NULL DEFAULT 1,
 maintainer text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE policy_resource_version (
 policy_id text NOT NULL REFERENCES policy_resource(id), version text NOT NULL, revision integer NOT NULL,
 definition jsonb NOT NULL, view jsonb NOT NULL, digest text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(policy_id, version), UNIQUE(policy_id, revision)
);
CREATE TABLE policy_resource_validation (
 id text PRIMARY KEY, policy_id text NOT NULL REFERENCES policy_resource(id), parent_id text,
 revision integer NOT NULL, status text NOT NULL, tests jsonb NOT NULL, results jsonb NOT NULL DEFAULT '[]',
 failure_reason text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX policy_resource_validation_parent_idx ON policy_resource_validation(parent_id);
CREATE INDEX policy_resource_validation_policy_idx ON policy_resource_validation(policy_id, created_at);
