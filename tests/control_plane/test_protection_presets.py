"""Real Controller composition -> protobuf -> NeMo validation, with no models."""
from __future__ import annotations

import base64
import json
from pathlib import Path
import subprocess

import pytest

from runner import generated as protocol
from runner.compiler import DefaultRunnerCompiler
from runner.validator import DefaultRunnerValidator
from runner.toolkit.nemo.action_registry import action_providers
from runner.toolkit.nemo.actions import local_action_providers


@pytest.fixture(scope="module")
def preset_requests() -> list[dict]:
    source = """
      import { PolicyCatalog } from './server/policy-catalog/catalog.ts';
      import { protectionPresets } from './shared/protection-presets.ts';
      import { expandProtectionPreset } from './server/policy-catalog/presets.ts';
      import { buildGuardrailPlan } from './server/domain/guardrail-plan.ts';
      import { generatedTestCases, applyValidationOverrides } from './server/domain/validation.ts';
      import { planToWire, validationTestToWire } from './server/control-channel/protocol-codec.ts';
      import { loadSync } from '@grpc/proto-loader';
      import { loadPackageDefinition } from '@grpc/grpc-js';
      const policies = PolicyCatalog.load('../runner/toolkit/policy_library/assets').list();
      const definition = loadSync('../proto/tasklattice/guard/control/v1/runner_control.proto', {
        includeDirs: ['../proto/tasklattice/guard/control/v1'], longs: String, enums: String, defaults: true, oneofs: true,
      });
      const codec = loadPackageDefinition(definition).tasklattice.guard.control.v1.RunnerControl.service.Connect;
      const compositions = protectionPresets.map(preset => ({ id: preset.id, bindings: expandProtectionPreset(preset, policies) }));
      const china = compositions.find(preset => preset.id === 'china-mainland-runtime');
      const combined = expandProtectionPreset(
        protectionPresets.find(preset => preset.id === 'singapore-data-protection'), policies, china.bindings);
      // This composed draft preserves the existing generic labelled-passport check.
      // Review its one overlapping acceptance case explicitly, as a user would
      // before publishing a newly combined Profile; do not change either template.
      combined.find(binding => binding.policyId === 'local-passports').testCaseOverrides[
        'pdpa-singapore/rule-sg-pdpa-pii-identifiers/passport_singapore-acceptance'] = {
          sourcePolicyVersion: '4.0.0',
          reason: 'The existing labelled-passport Rule runs first and redacts the complete labelled Singapore passport.',
          expectedDecision: 'transform', expectedOutputContent: 'Acceptance sample: [REDACTED]',
          expectedMatches: [{ policyId: 'local-passports', ruleId: 'identity/passport' }],
        };
      compositions.push({ id: 'china-plus-singapore', bindings: combined });
      const output = compositions.map(preset => {
        const draft = { allowedTopics: [], restrictedTopics: [], policyBindings: preset.bindings, safetyLevel: 'balanced', outputDelivery: 'full_buffered' };
        const plan = buildGuardrailPlan({ guardrailId: preset.id, guardrailVersion: '20260906-010000.001Z', policies, draft });
        const cases = applyValidationOverrides(generatedTestCases(preset.id, draft, policies), draft);
        const binary = codec.responseSerialize({ validationRequest: {
          runId: preset.id, guardrailId: preset.id, candidateVersion: '20260906-010000.001Z', sourceDraftRevision: 1, runtimeProfile: 'auto',
          plan: planToWire(plan), testCases: cases.map(validationTestToWire),
        }});
        return { id: preset.id, count: cases.length, wire: binary.toString('base64') };
      });
      console.log(JSON.stringify(output));
    """
    result = subprocess.run(["node", "--import", "tsx", "--input-type=module", "-e", source], cwd=Path(__file__).resolve().parents[2] / "controller", text=True, capture_output=True, check=True, timeout=30)
    return json.loads(result.stdout)


@pytest.mark.asyncio
@pytest.mark.parametrize("preset_index", range(16))
async def test_profiles_pass_real_model_free_composition(preset_requests, preset_index) -> None:
    preset = preset_requests[preset_index]
    request = protocol.ControllerMessage.FromString(base64.b64decode(preset["wire"])).validation_request
    status, metrics, results = await DefaultRunnerValidator(DefaultRunnerCompiler(), action_providers(*local_action_providers())).validate(request)
    failures = [{"name": item["name"], "reason": item.get("reason"), "expected": item.get("expectedDecision"), "actual": item.get("actualDecision"), "matched": [(f.get("policy_id"), f.get("rule_id")) for f in item["findings"]]} for item in results if not item["passed"]]
    assert status == "passed", (preset["id"], failures)
    assert metrics["total"] == metrics["passed"] == preset["count"]
    assert all(item["modelInvocations"] == 0 and item["actualFailure"] is None for item in results)
