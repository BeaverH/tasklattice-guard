import type { GuardrailPolicyBindingConfig } from "../domain/guardrail-plan.js";
import type { ProtectionPreset } from "../../shared/protection-map.js";
import { appendProfileRules } from "../../shared/profile-rule-selection.js";
type ProfilePolicy = { id: string; version: string; rails: readonly string[]; parameters: readonly { name: string; required?: boolean; default?: string | null | undefined }[]; rules: readonly { id: string }[]; published_versions?: readonly ProfilePolicy[] };

/** Validate a preset against this exact installed catalog, never best-effort. */
export function expandProtectionPreset(preset: ProtectionPreset, policies: readonly ProfilePolicy[], current: readonly GuardrailPolicyBindingConfig[] = []): GuardrailPolicyBindingConfig[] {
  const byId = new Map(policies.map((policy) => [policy.id, policy]));
  const selected = new Set(current.map((binding) => binding.policyId));
  const result = structuredClone([...current]);
  for (const reference of preset.policies) {
    const head = byId.get(reference.policyId);
    if (!head) throw new Error(`Profile ${preset.id}: Policy ${reference.policyId} is unavailable.`);
    const policy = [head, ...head.published_versions ?? []].find(item => item.version === reference.policyVersion);
    if (!policy) throw new Error(`Profile ${preset.id}: Policy ${head.id} requires version ${reference.policyVersion}, found ${head.version}.`);
    if (!reference.enabledRails.length || reference.enabledRails.some((rail) => !policy.rails.includes(rail))) {
      throw new Error(`Profile ${preset.id}: Policy ${policy.id} has unsupported Rails.`);
    }
    const parameterValues = Object.fromEntries(policy.parameters.flatMap((parameter) => parameter.default == null ? [] : [[parameter.name, parameter.default]]));
    Object.assign(parameterValues, reference.parameterValues);
    for (const parameter of policy.parameters) {
      if (parameter.required && !parameterValues[parameter.name]?.trim()) throw new Error(`Profile ${preset.id}: Policy ${policy.id} needs ${parameter.name}.`);
    }
    const knownRules = new Set(policy.rules.map(rule => rule.id));
    const enabledRuleIds = reference.enabledRuleIds ?? policy.rules.map(rule => rule.id);
    const ruleOrder = reference.ruleOrder ?? [];
    if (!enabledRuleIds.length || new Set(enabledRuleIds).size !== enabledRuleIds.length || enabledRuleIds.some(id => !knownRules.has(id))) {
      throw new Error(`Profile ${preset.id}: Policy ${policy.id} has an invalid Rule selection.`);
    }
    if (new Set(ruleOrder).size !== ruleOrder.length || ruleOrder.some(id => !enabledRuleIds.includes(id))) {
      throw new Error(`Profile ${preset.id}: Policy ${policy.id} has an invalid Rule order.`);
    }
    if (selected.has(policy.id)) {
      const existing = result.find(binding => binding.policyId === policy.id)!;
      // Rule IDs from a different version cannot be safely added to a user pin.
      if (existing.policyVersion === policy.version) {
        const selection = appendProfileRules(existing, { enabledRuleIds, ruleOrder });
        if (selection) Object.assign(existing, selection);
      }
      continue; // Keep user actions, parameters, directions and reviewed expectations.
    }
    selected.add(policy.id);
    result.push({
      policyId: policy.id, policyVersion: policy.version, action: null,
      parameterValues, enabledRuleIds: [...enabledRuleIds], ruleOrder: [...ruleOrder],
      testCaseOverrides: structuredClone(reference.testCaseOverrides ?? {}), ruleActions: {}, enabledRails: [...reference.enabledRails], reasoningPolicy: null,
    });
  }
  return result;
}
