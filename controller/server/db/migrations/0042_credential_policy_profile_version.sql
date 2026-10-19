-- Keep built-in Profile references compatible with the current credential
-- catalog. Preserve ordering, parameters, disabled Profiles, and custom pins.
-- Published Guardrails and their immutable artifacts are not changed here.
UPDATE "guardrail_profile"
SET "definition" = jsonb_set("definition", '{policies}', (
  SELECT jsonb_agg(
    CASE WHEN entry.item->>'policyId' = 'local-credentials'
           AND entry.item->>'policyVersion' = '2.0.0'
      THEN jsonb_set(entry.item, '{policyVersion}', '"2.1.0"'::jsonb)
      ELSE entry.item END
    ORDER BY entry.position
  )
  FROM jsonb_array_elements("definition"->'policies')
    WITH ORDINALITY AS entry(item, position)
))
WHERE "id" IN (
  'common-baseline', 'banking-assistant', 'securities-assistant',
  'internet-customer-support', 'singapore-financial-assistant',
  'china-mainland-runtime', 'china-banking-assistant'
)
AND EXISTS (
  SELECT 1 FROM jsonb_array_elements(COALESCE("definition"->'policies', '[]'::jsonb)) AS entry(item)
  WHERE entry.item->>'policyId' = 'local-credentials' AND entry.item->>'policyVersion' = '2.0.0'
);

UPDATE "guardrail_profile" AS profile
SET "definition" = jsonb_set(profile."definition", '{version}', to_jsonb(versions.new_version))
FROM (VALUES
  ('common-baseline', '1.0.0', '1.0.1'),
  ('banking-assistant', '1.0.1', '1.0.2'),
  ('securities-assistant', '1.0.1', '1.0.2'),
  ('internet-customer-support', '1.0.0', '1.0.1'),
  ('singapore-financial-assistant', '1.0.1', '1.0.2'),
  ('china-mainland-runtime', '1.0.0', '1.0.1'),
  ('china-banking-assistant', '1.0.0', '1.0.1')
) AS versions(id, old_version, new_version)
WHERE profile."id" = versions.id AND profile."definition"->>'version' = versions.old_version
AND EXISTS (
  SELECT 1 FROM jsonb_array_elements(COALESCE(profile."definition"->'policies', '[]'::jsonb)) AS entry(item)
  WHERE entry.item->>'policyId' = 'local-credentials' AND entry.item->>'policyVersion' = '2.1.0'
);
