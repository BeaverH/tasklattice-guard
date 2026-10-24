// @vitest-environment node
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { fullFeatureBaseline } from "../../shared/full-feature-baseline.js";
import { PolicyCatalog } from "./catalog.js";
import { DeclarativeCompiler } from "../policy-studio/declarative.js";
import { profileDraft, previewProtectionProfile } from "./presets.js";
import { buildGuardrailPlan, normalizeGuardrailDraft } from "../domain/guardrail-plan.js";
import { applyValidationOverrides, generatedTestCases, reconcileValidationOverrides } from "../domain/validation.js";
const directory = resolve("../runner/toolkit/policy_library/assets");
const compiler = new DeclarativeCompiler(directory);
const catalog = PolicyCatalog.load(directory).list().map(policy => {
  const definition = policy.protection.execution === "custom" ? compiler.shipped(policy.id) : null;
  return definition ? { ...compiler.compile(definition), published_versions: policy.published_versions } : policy;
});
const fresh = () => profileDraft(fullFeatureBaseline, catalog);
const cases = (draft: ReturnType<typeof fresh>) => generatedTestCases("baseline", draft, catalog);
const reconcile = (draft: ReturnType<typeof fresh>, reference = fresh()) => {
  reconcileValidationOverrides(draft, reference, cases(reference));
  return applyValidationOverrides(cases(draft), draft);
};

it("pins the benchmark configuration and executable model parameters without instance resources", () => {
  const draft = fresh();
  expect(draft.profileOrigin).toEqual({ id: "full-feature-baseline", version: "1.0.0" });
  expect(normalizeGuardrailDraft(draft)).toEqual(draft);
  expect(draft.outputDelivery).toBe("full_buffered");
  expect(draft.topicControlMode).toBe("strict");
  expect(draft.policyBindings).toHaveLength(8);
  expect(draft.policyBindings.flatMap(binding => binding.enabledRuleIds)).toHaveLength(77);
  expect(draft.policyBindings.flatMap(binding => Object.keys(binding.testCaseOverrides ?? {}))).toHaveLength(106);
  const plan = buildGuardrailPlan({ guardrailId: "baseline", guardrailVersion: "1", draft, policies: catalog });
  const steps = plan.steps as Array<{ contract_ref: string; parameters: Array<[string, string]>; phases: string[] }>;
  const jailbreak = steps.find(step => step.contract_ref === "tali.guard.jailbreak.v1")!;
  expect(jailbreak.parameters).toContainEqual(["on_unknown", "block"]);
  expect(jailbreak.phases).toEqual(["input"]);
  expect(steps.filter(step => step.contract_ref === "tali.guard.content-safety.v1")).toHaveLength(1);
  expect(() => applyValidationOverrides(cases(draft), draft)).not.toThrow();
  expect(catalog.find(policy => policy.id === "builtin-jailbreak-strict")!.protection.modelCapabilities).toEqual(["jailbreak"]);
});

it.each(fullFeatureBaseline.policies.map(policy => policy.policyId))("keeps remaining tests valid after removing %s", id => {
  const draft = fresh();
  draft.policyBindings = draft.policyBindings.filter(binding => binding.policyId !== id);
  const result = reconcile(draft);
  expect(result.some(test => test.sourcePolicyId === id)).toBe(false);
  expect(result.length).toBeGreaterThan(0);
  expect(draft.profileOrigin).toEqual(fresh().profileOrigin);
});

it("restores the five cross-policy Contact assertions and retains unrelated overlays", () => {
  const draft = fresh();
  draft.policyBindings = draft.policyBindings.filter(binding => binding.policyId !== "local-government-identifiers");
  const contact = draft.policyBindings.find(binding => binding.policyId === "local-contact-data")!;
  const dependentIds = Object.entries(contact.testCaseOverrides!).filter(([, overlay]) => overlay.expectedMatches.some(match => match.policyId === "local-government-identifiers")).map(([id]) => id);
  expect(dependentIds).toHaveLength(5);
  const result = reconcile(draft);
  expect(Object.keys(contact.testCaseOverrides!)).toHaveLength(25);
  for (const id of dependentIds) {
    const test = result.find(item => item.sourcePolicyId === contact.policyId && item.sourceCaseId === id)!;
    expect(test).toBeDefined();
    expect(test.expectationOverride).toBeUndefined();
    expect(test.expectedDecision).toBe(cases(draft).find(item => item.id === test.id)!.expectedDecision);
  }
});

it("cleans inherited overlays when any covered Rule or Rail is deselected", () => {
  for (const original of fresh().policyBindings) {
    for (const rule of original.enabledRuleIds) {
      if (original.enabledRuleIds.length === 1) continue;
      const draft = fresh();
      const binding = draft.policyBindings.find(item => item.policyId === original.policyId)!;
      binding.enabledRuleIds = binding.enabledRuleIds.filter(id => id !== rule);
      binding.ruleOrder = binding.ruleOrder!.filter(id => id !== rule);
      expect(() => reconcile(draft), `${binding.policyId}/${rule}`).not.toThrow();
    }
    if (original.enabledRails.length > 1) {
      const draft = fresh();
      draft.policyBindings.find(item => item.policyId === original.policyId)!.enabledRails = ["output"];
      expect(() => reconcile(draft)).not.toThrow();
    }
  }
});

it("rejects edited, unavailable and stale overrides instead of dropping assertions", () => {
  const draft = fresh();
  draft.policyBindings = draft.policyBindings.filter(binding => binding.policyId !== "local-government-identifiers");
  const contact = draft.policyBindings.find(binding => binding.policyId === "local-contact-data")!;
  Object.values(contact.testCaseOverrides!).find(item => item.expectedMatches.some(match => match.policyId === "local-government-identifiers"))!.reason = "New user expectation";
  expect(() => reconcile(draft)).toThrow(/not enabled/);
  const invalid = fresh();
  const binding = invalid.policyBindings[0]!;
  binding.testCaseOverrides = { missing: { sourcePolicyVersion: binding.policyVersion, reason: "new", expectedDecision: "block", expectedMatches: [{ policyId: binding.policyId, ruleId: binding.enabledRuleIds[0]! }] } };
  expect(() => reconcile(invalid)).toThrow(/unavailable Test Case/);
  const stale = fresh();
  Object.values(stale.policyBindings[1]!.testCaseOverrides!)[0]!.sourcePolicyVersion = "old";
  expect(() => reconcile(stale)).toThrow(/stale/);
});

it("supports subsequent deletions using the previous draft without its source Profile", () => {
  const previous = fresh();
  delete previous.profileOrigin;
  const draft = structuredClone(previous);
  draft.policyBindings = draft.policyBindings.filter(binding => binding.policyId !== "local-government-identifiers");
  expect(() => reconcile(draft, previous)).not.toThrow();
});

it("isolates unavailable Profiles and never substitutes a different pin", () => {
  const missing = catalog.filter(policy => policy.id !== "builtin-jailbreak-strict");
  expect(previewProtectionProfile(fullFeatureBaseline, missing)).toMatchObject({ policyBindings: [], availability: { available: false } });
  const newer = catalog.map(policy => policy.id === "builtin-jailbreak-strict" ? { ...policy, version: "2.0.0", published_versions: [] } : policy);
  expect(() => profileDraft(fullFeatureBaseline, newer)).toThrow(/requires version 1.0.0/);
  expect(previewProtectionProfile(fullFeatureBaseline, catalog).availability.available).toBe(true);
});
