import type { ValidationExpectationOverride } from "./guardrail-plan.js";

// Reviewed composition contracts for the focused Policies and retained local
// filters, remapped below for the 3.0.0 PII consolidation. These are Default-local,
// exclusions or expectations learned automatically from a runtime result.
const completeRedaction = "The earlier configured Policy redacts the complete sensitive value. Assert its Policy/Rule and the complete output instead of detecting already-redacted text again.";
const firstReject = "The earlier configured Policy rejects and terminates the chain. Assert its Policy/Rule; later Rules must not execute.";
const specificFirst = "Require complete identifier redaction, not merely a transform decision or a partially masked value.";
type Overrides = Record<string, Record<string, ValidationExpectationOverride>>;

function reviewedExpectations(): Overrides {
  const result: Overrides = {};
  const add = (source: string, caseId: string, target: string, rule: string, output?: string, reason = completeRedaction) => {
    const focused = source.startsWith("local-");
    for (const id of focused ? [`${caseId}/input`, `${caseId}/output`] : [caseId]) {
      (result[source] ??= {})[id] = {
        sourcePolicyVersion: focused ? "2.0.0" : "1.95.0", reason,
        expectedDecision: output === undefined ? "block" : "transform",
        expectedOutputContent: output ?? "",
        expectedMatches: [{ policyId: target, ruleId: rule }],
      };
    }
  };
  const sample = (name: string) => `Acceptance sample: [${name}_REDACTED]`;

  result["filter-denied-insults"] = {};
  for (const caseId of ["accept/denied_insults", "accept/denied_insults/output"]) {
    result["filter-denied-insults"][caseId] = {
      sourcePolicyVersion: "1.95.0",
      reason: "Default records insults findings without intervening: broad word co-occurrence also matches benign Agent instructions. Other Policies continue to enforce their own actions.",
      expectedDecision: "allow",
      expectedOutputContent: "Please review this request: idiot.",
      expectedMatches: [{ policyId: "filter-denied-insults", ruleId: "category/denied_insults" }],
    };
  }

  for (const name of ["harmful-violence", "harmful-self-harm", "harmful-child-safety", "bias-sexual-orientation"]) {
    add(`filter-${name}`, `accept/${name.replaceAll("-", "_")}`, "filter-harm-toxic-abuse", "category/harm_toxic_abuse", undefined, firstReject);
  }
  add("filter-prompt-injection-sql", "accept/prompt_injection_sql", "local-sql-injection", "sql-injection-blocker/blocked-word-1", undefined, firstReject);
  add("filter-prompt-injection-system-prompt", "accept/prompt_injection_system_prompt", "local-prompt-manipulation", "prompt-injection-blocker/blocked-word-2", undefined, firstReject);
  add("local-sensitive-attribute-terms", "accept/religion", "filter-bias-religious", "category/bias_religious", undefined, firstReject);
  for (const [name, category] of [
    ["weapons_firearms", "harmful_illegal_weapons"], ["explosives", "harmful_illegal_weapons"],
    ["terrorism", "harmful_violence"], ["self_harm_suicide", "harmful_self_harm"],
  ] as const) {
    add("local-risk-content-terms", `accept/${name}`, `filter-${category.replaceAll("_", "-")}`, `category/${category}`, undefined, firstReject);
  }

  const government = "local-government-identifiers";
  const australia = "local-australian-tax-health-identifiers";
  for (const [name, detector, output] of [
    ["br_cpf_unformatted", "au_abn", sample("au_abn")],
    ["au_tfn", "au_tfn", "Tax file number [au_tfn_REDACTED]."],
    ["au_abn", "au_abn", sample("au_abn")], ["au_medicare", "au_medicare", sample("au_medicare")],
    ["uoft_student_id", "au_medicare", "University of Toronto student number [au_medicare_REDACTED]."],
  ] as const) add(government, `accept/${name}`, australia, `au-pii-tax-identifiers/${detector}`, output);
  // '+' is punctuation. All country/subscriber digits are redacted.
  add("local-regional-contact-formats", "accept/fr_phone", australia, "au-pii-tax-identifiers/au_abn", "Acceptance sample: +[au_abn_REDACTED]");

  for (const [name, output] of [
    ["uae_emirates_id", sample("uae_emirates_id")],
    ["ca_on_drivers_licence", "Driver's licence [ca_on_drivers_licence_REDACTED]."],
    ["ca_immigration_doc", "UCI [ca_immigration_doc_REDACTED]."],
    ["fr_nir", sample("fr_nir")], ["uoft_tcard", "TCard number [uoft_tcard_REDACTED]."],
    ["sg_uen", "Acceptance sample: UEN [sg_uen_REDACTED]"],
    ["eu_vat", "Acceptance sample: VAT [eu_vat_REDACTED]"],
    ["nl_bsn_contextual", "Acceptance sample: BSN [nl_bsn_contextual_REDACTED]"],
  ] as const) add(government, `accept/${name}`, government, `pattern/${name}`, output, specificFirst);
  add("local-bank-account-formats", "accept/ca_bank_account", "local-bank-account-formats", "pattern/ca_bank_account", "Bank account [ca_bank_account_REDACTED].", specificFirst);
  for (const name of ["br_phone_mobile", "sg_phone", "uae_phone"]) {
    add("local-regional-contact-formats", `accept/${name}`, "local-regional-contact-formats", `pattern/${name}`, sample(name), specificFirst);
  }
  add("local-passport-formats", "accept/passport_china", "local-passport-formats", "pattern/passport_china", sample("passport_china"), specificFirst);

  // Context-labelled starter coverage complements the international formats,
  // but cannot re-detect a value already fully redacted by an earlier Policy.
  for (const [id, detector, output] of [
    ["passport-en", "passport_china", "Passport: [passport_china_REDACTED]"],
    ["passport-zh", "passport_india", "护照号码：[passport_india_REDACTED]"],
    ["passport-mixed", "passport_france", "Passport number: [passport_france_REDACTED]"],
  ] as const) add("local-passports", id, "local-passport-formats", `pattern/${detector}`, output);
  return result;
}

// Preserve the reviewed composition contracts when source packages are merged.
// Absorbed case IDs are namespaced; stable Rule IDs retain their provenance.
const mergedPolicies: Record<string, string> = {
  "local-payment-data": "local-payment-data",
  "local-bank-account-formats": "local-payment-data",
  "local-government-identifiers": "local-government-identifiers",
  "local-australian-tax-health-identifiers": "local-government-identifiers",
  "local-passports": "local-passports",
  "local-passport-formats": "local-passports",
  "local-contact-data": "local-contact-data",
  "local-regional-contact-formats": "local-contact-data",
};
const expectations: Overrides = {};
for (const [source, cases] of Object.entries(reviewedExpectations())) {
  const target = mergedPolicies[source] ?? source;
  for (const [caseId, override] of Object.entries(cases)) {
    (expectations[target] ??= {})[source === target ? caseId : `${source}/${caseId}`] = {
      ...override,
      sourcePolicyVersion: mergedPolicies[source] ? "3.0.0" : override.sourcePolicyVersion,
      expectedMatches: override.expectedMatches.map(match => ({ ...match, policyId: mergedPolicies[match.policyId] ?? match.policyId })),
    };
  }
}
export function defaultTestCaseOverrides(policyId: string): Record<string, ValidationExpectationOverride> {
  return structuredClone(expectations[policyId] ?? {});
}
