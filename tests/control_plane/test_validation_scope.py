from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest

from runner import generated as protocol
from runner.compiler import DefaultRunnerCompiler
from runner.protocol_codec import plan_to_proto, validation_test_to_proto, validation_case_result_to_proto
from runner.validator import DefaultRunnerValidator, _metrics
from runner.validation_scope import local_test_plan, skipped_case
from runner.toolkit.nemo.action_registry import action_providers
from runner.toolkit.nemo.actions import local_action_providers, EvaluationActionProvider, EvaluationRoute


class ForbiddenModel:
    id = "forbidden-model"
    version = "1.0.0"
    capabilities = frozenset({"jailbreak", "content_safety"})
    contracts = frozenset({"tali.guard.jailbreak.v1", "tali.guard.content-safety.v1"})
    rails = frozenset({"input", "output"})
    calls = 0

    async def evaluate(self, _request):
        self.calls += 1
        raise AssertionError("Local-only validation must never invoke models")


@pytest.mark.asyncio
async def test_default_full_suite_local_scope_preserves_publication_models():
    """Real Controller Default selection, frozen cases and real NeMo execution."""
    source = """
      import { defaultGuardrailDraft, DEFAULT_GUARDRAIL_ID } from './server/domain/defaults.ts';
      import { buildGuardrailPlan } from './server/domain/guardrail-plan.ts';
      import { PolicyCatalog } from './server/policy-catalog/catalog.ts';
      import { generatedTestCases, applyValidationOverrides } from './server/domain/validation.ts';
      const policies = PolicyCatalog.load('../runner/toolkit/policy_library/assets').list();
      const draft = defaultGuardrailDraft(policies);
      const plan = buildGuardrailPlan({guardrailId: DEFAULT_GUARDRAIL_ID,
        guardrailVersion: '20261020-090915.265Z', draft, policies});
      console.log(JSON.stringify({plan, cases: applyValidationOverrides(generatedTestCases(DEFAULT_GUARDRAIL_ID, draft, policies), draft)}));
    """
    data = json.loads(subprocess.run(["node", "--import", "tsx", "--input-type=module", "-e", source],
        cwd=Path(__file__).resolve().parents[2] / "controller", check=True, capture_output=True, text=True, timeout=30).stdout)
    model = ForbiddenModel()
    providers = action_providers(*local_action_providers(), EvaluationActionProvider((
        EvaluationRoute("jailbreak", "tali.guard.jailbreak.v1", model),
        EvaluationRoute("content_safety", "tali.guard.content-safety.v1", model),
    )))
    compiler = DefaultRunnerCompiler()
    request = protocol.ValidationRequest(run_id="scope-regression", guardrail_id=data["plan"]["guardrail_id"],
        candidate_version=data["plan"]["guardrail_version"], plan=plan_to_proto(data["plan"]),
        test_model_rules=False, test_cases=[validation_test_to_proto(c) for c in data["cases"]])
    outcome = await DefaultRunnerValidator(compiler, providers).run(request)
    assert outcome.status == "passed"
    assert outcome.metrics["executed"] == outcome.metrics["passed"] == 608
    assert outcome.metrics["total"] == 611
    assert outcome.metrics["skipped"] == 3
    assert model.calls == outcome.test_scope["modelInvocations"] == 0
    assert outcome.test_scope["fullArtifactLoaded"]
    assert outcome.test_scope["executionDigest"] != outcome.artifact.checksum
    assert outcome.artifact.plan == request.plan
    assert {"tali.guard.jailbreak.v1", "tali.guard.content-safety.v1"} <= {s.contract_ref for s in outcome.artifact.plan.steps}
    skipped = [r for r in outcome.results if r.get("skipped")]
    assert all(not r["passed"] and not r["trace"] and r["skipReason"] for r in skipped)
    assert all(validation_case_result_to_proto(r).skipped for r in skipped)
    # No all-skipped report can manufacture a pass rate.
    assert _metrics(skipped)["complianceRate"] == _metrics(skipped)["passed"] == 0


def test_mixed_policy_and_conditional_local_rules_are_classified_per_rule():
    def step(id, contract, rule, dependency=None):
        return {"id": id, "contract_ref": contract,
                "parameters": [["policy_id", "mixed"], ["rule_id", rule]],
                "trigger": {"step_ref": dependency} if dependency else {}}
    plan = {"steps": [
        step("local", "tali.guard.topic-control.rules.v1", "keywords"),
        step("model", "tali.guard.topic-control.semantic.v1", "semantic"),
        step("semantic-prefilter", "tali.guard.topic-control.rules.v1", "semantic"),
        step("conditional", "tali.guard.pii.exact.v1", "dependent", "model"),
    ], "policy_bindings": [{"policy_id": "mixed", "enabled_rule_ids": ["keywords", "semantic", "dependent"],
        "rule_order": ["keywords", "semantic", "dependent"]}], "modules": [], "policy_versions": []}
    scoped, skipped = local_test_plan(plan)
    assert [s["id"] for s in scoped["steps"]] == ["local"]
    assert scoped["policy_bindings"][0]["enabled_rule_ids"] == ["keywords"]
    assert {r["ruleId"] for r in skipped} == {"semantic", "dependent"}
    assert len(plan["steps"]) == 4  # Immutable source was not mutated.
    case = {"id": "local-case", "sourcePolicyId": "mixed", "coveredRuleIds": ["keywords"]}
    assert skipped_case(case, skipped) is None
    assert skipped_case({**case, "coveredRuleIds": ["semantic"]}, skipped)["skipped"]
    assert skipped_case({**case, "expectationOverride": {"expectedMatches": [{"policyId": "mixed", "ruleId": "semantic"}]}}, skipped)["skipped"]


def test_custom_colang_is_not_assumed_model_free_and_local_failure_is_not_hidden():
    plan = {"steps": [], "modules": [], "policy_bindings": [{"policy_id": "custom", "enabled_rule_ids": ["flow/input/check"]}],
            "policy_versions": [{"policy_id": "custom", "evaluation_contracts": ["tali.guard.pii.exact.v1"]}]}
    scoped, skipped = local_test_plan(plan)
    assert not scoped["policy_versions"] and not scoped["policy_bindings"]
    assert skipped[0]["ruleId"] == "flow/input/check"
    case = {"id": "local", "policyId": "other", "coveredRuleIds": []}
    assert skipped_case(case, skipped) is None
