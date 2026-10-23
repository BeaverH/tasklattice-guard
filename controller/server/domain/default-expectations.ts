import type { ValidationExpectationOverride } from "./guardrail-plan.js";
import reviewed from "./default-expectations.json" with { type: "json" };

// Reviewed cross-Rule outcomes: first block wins and earlier redactions remain authoritative.
// These expectations retain the pre-consolidation Default behavior.
export function defaultTestCaseOverrides(policyId: string, version?: string): Record<string, ValidationExpectationOverride> {
  const overrides = structuredClone((reviewed as Record<string, Record<string, ValidationExpectationOverride>>)[policyId] ?? {});
  // Contact 4.1/4.2 preserve the existing selected rules; all reviewed contact
  // redaction/composition expectations remain valid. Older pins stay intact.
  if (policyId === "local-contact-data" && (version === "4.1.0" || version === "4.2.0" || version === "4.2.1" || version === "4.3.0")) {
    for (const override of Object.values(overrides)) override.sourcePolicyVersion = version;
  }
  return overrides;
}
