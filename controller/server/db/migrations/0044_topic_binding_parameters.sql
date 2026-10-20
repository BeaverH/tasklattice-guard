-- General topic restrictions are optional Topic Control binding parameters.
-- Existing Guardrail bindings and immutable versions retain their reviewed content.
DELETE FROM "guardrail_profile" WHERE "id" = 'restricted-general-topics';
