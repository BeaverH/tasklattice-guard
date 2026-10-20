import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { protectionPresets } from "../../shared/protection-presets.js";
import { buildGuardrailPlan } from "../domain/guardrail-plan.js";
import { PolicyCatalog } from "./catalog.js";
import { expandProtectionPreset } from "./presets.js";

const policies = PolicyCatalog.load(resolve("../runner/toolkit/policy_library/assets")).list();

describe("Protection presets", () => {
  it("adds Singapore identifier Rules to an existing China capability selection without losing either region", () => {
    const china = expandProtectionPreset(protectionPresets.find(p => p.id === "china-mainland-runtime")!, policies);
    const singapore = protectionPresets.find(p => p.id === "singapore-data-protection")!;
    const combined = expandProtectionPreset(singapore, policies, china);
    const identifiers = combined.find(b => b.policyId === "local-government-identifiers")!;
    expect(identifiers.enabledRuleIds).toContain("cn-personal-information/resident-identity-card");
    for (const id of singapore.policies.find(p => p.policyId === identifiers.policyId)!.enabledRuleIds!) {
      expect(identifiers.enabledRuleIds).toContain(id);
    }
    expect(identifiers.ruleOrder![0]).toBe("cn-personal-information/resident-identity-card");
    expect(expandProtectionPreset(singapore, policies, combined)).toEqual(combined);
    expect(china.find(b => b.policyId === identifiers.policyId)!.enabledRuleIds).toHaveLength(1);
  });

  it("selects regional identifiers explicitly without enabling every identifier format", () => {
    const china = expandProtectionPreset(protectionPresets.find(p => p.id === "china-mainland-runtime")!, policies);
    const identifiers = china.find(b => b.policyId === "local-government-identifiers")!;
    expect(identifiers.enabledRuleIds).toEqual(["cn-personal-information/resident-identity-card"]);
    expect(identifiers.enabledRuleIds).not.toContain("pattern/au_abn");
  });

  it.each(protectionPresets)("$name expands selected, pinned, model-free Policies in reviewed order", (preset) => {
    const bindings = expandProtectionPreset(preset, policies);
    expect(bindings.map((binding) => binding.policyId)).toEqual(preset.policies.map((reference) => reference.policyId));
    for (const binding of bindings) {
      const policy = policies.flatMap(item => [item, ...item.published_versions ?? []])
        .find(item => item.id === binding.policyId && item.version === binding.policyVersion)!;
      expect(binding.policyVersion).toBe(policy.version);
      const reference = preset.policies.find(r => r.policyId === binding.policyId)!;
      expect(binding.enabledRuleIds).toEqual(reference.enabledRuleIds ?? policy.rules.map(rule => rule.id));
      expect(binding.ruleOrder).toEqual(reference.ruleOrder ?? []);
      expect(policy.protection.execution).toBe("local");
      expect(binding.testCaseOverrides).toEqual(preset.policies.find(r => r.policyId === binding.policyId)!.testCaseOverrides ?? {});
    }
    const plan = buildGuardrailPlan({ guardrailId: preset.id, guardrailVersion: "20260906-010000.001Z", policies, draft: {
      allowedTopics: [], restrictedTopics: [], safetyLevel: "balanced", outputDelivery: "full_buffered", policyBindings: bindings,
    } });
    expect(plan.steps).toHaveLength(bindings.length);
    expect(plan.policy_bindings).toHaveLength(bindings.length);
  });

  it("does not offer retired, unverified MAS-labelled phrase collections", () => {
    const retired = new Set(["mas-ai-risk-management", "singapore-financial-conduct"]);
    expect(policies.some(policy => retired.has(policy.id))).toBe(false);
    for (const preset of protectionPresets) {
      expect(preset.policies.some(policy => retired.has(policy.policyId))).toBe(false);
      expect(preset.optionalPolicyIds.some(policyId => retired.has(policyId))).toBe(false);
    }
    const singapore = protectionPresets.find(preset => preset.id === "singapore-financial-assistant")!;
    expect(singapore.version).toBe("2.0.0");
    expect(singapore.limitations.join(" ")).toContain("No MAS-specific control");
  });

  it("keeps China mainland Profiles runtime-bounded and model integrations optional", () => {
    const general = protectionPresets.find(preset => preset.id === "china-mainland-runtime")!;
    const banking = protectionPresets.find(preset => preset.id === "china-banking-assistant")!;
    expect(expandProtectionPreset(general, policies).map(binding => binding.policyId)).toEqual([
      "local-credentials", "local-passports", "local-government-identifiers", "local-contact-data", "local-payment-data", "local-injection-protection",
    ]);
    expect(expandProtectionPreset(banking, policies).map(binding => binding.policyId)).toEqual([
      "local-credentials", "local-passports", "local-government-identifiers", "local-contact-data", "local-payment-data", "local-injection-protection", "local-fraud-prevention",
    ]);
    expect(general.optionalPolicyIds).toEqual(expect.arrayContaining(["builtin-content-safety", "builtin-contextual-grounding", "local-government-identifiers"]));
    expect(general.limitations.join(" ")).toContain("Runtime Enforced");
    expect(general.limitations.join(" ")).toContain("Requires Integration");
    expect(general.limitations.join(" ")).toContain("Governance Only");
  });

  it("shares the baseline without overwriting user changes when switching scenarios", () => {
    const bank = expandProtectionPreset(protectionPresets[1]!, policies);
    bank[0]!.ruleActions[bank[0]!.enabledRuleIds[0]!] = "transform";
    bank[0]!.enabledRails = ["output"];
    bank.reverse();
    const before = structuredClone(bank);
    const combined = expandProtectionPreset(protectionPresets[2]!, policies, bank);
    expect(combined.slice(0, bank.length).map(b => b.policyId)).toEqual(before.map(b => b.policyId));
    for (const previous of before) {
      const next = combined.find(b => b.policyId === previous.policyId)!;
      expect(next).toMatchObject({ policyVersion: previous.policyVersion, ruleActions: previous.ruleActions,
        enabledRails: previous.enabledRails, parameterValues: previous.parameterValues });
      expect(next.enabledRuleIds.slice(0, previous.enabledRuleIds.length)).toEqual(previous.enabledRuleIds);
    }
    expect(bank).toEqual(before);
    expect(new Set(combined.map((binding) => binding.policyId)).size).toBe(combined.length);
    expect(expandProtectionPreset(protectionPresets[2]!, policies, combined)).toEqual(combined);
  });

  it("fails on missing, stale, misdirected or incomplete references", () => {
    const preset = structuredClone(protectionPresets[0]!);
    expect(() => expandProtectionPreset(preset, [])).toThrow(/unavailable/);
    preset.policies[0]!.policyVersion = "unknown";
    expect(() => expandProtectionPreset(preset, policies)).toThrow(/requires version/);
    preset.policies = [{ policyId: "builtin-jailbreak", policyVersion: "1.0.0", enabledRails: ["output"], parameterValues: {} }];
    expect(() => expandProtectionPreset(preset, policies)).toThrow(/unsupported Rails/);
    preset.policies = [{ policyId: "keyword-blocking", policyVersion: "1.95.0", enabledRails: ["input"], parameterValues: {} }];
    expect(() => expandProtectionPreset(preset, policies)).toThrow(/needs blocked_words/);
  });
});
