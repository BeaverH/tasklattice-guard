import json
from dataclasses import replace
from types import SimpleNamespace

import httpx
import pytest

from runner.capability_validation import _CandidateStore, validate_capability
from runner.providers import dynamic_runtime_action_providers
from runner.toolkit.compiler.nemo_compiler import NeMoConfigCompiler
from runner.toolkit.nemo.action_registry import action_providers
from runner.toolkit.nemo.evaluators.jev_topic import JEV_TOPIC_PROFILE
from runner.toolkit.nemo.native_models import native_rail_models
from runner.toolkit.nemo.registry import NeMoRuntimeRegistry
from runner.toolkit.nemo.runtime import NeMoRuntime
from runner.toolkit.runtime.contracts import PlanResolution, ProtectionRequest, RequestContext
from runner.toolkit.runtime.service import GuardrailRuntimeService
from tests.control_plane.test_capability_validation import candidate
from tests.control_plane.test_nemo_iorails_topic import _plan, _semantic_input


def jev_candidate():
    return candidate("input", "topic_control", JEV_TOPIC_PROFILE, "tali.guard.topic-control.semantic.v1")


@pytest.mark.parametrize("behavior", ["correct", "always-safe", "uncertain", "malformed", "unavailable"])
async def test_jev_binding_validates_actual_topic_behavior_without_native_chat(behavior):
    def respond(request):
        assert request.url.path == "/v1/systemone"
        body = json.loads(request.content)
        if behavior == "unavailable":
            return httpx.Response(503)
        if behavior == "malformed":
            return httpx.Response(200, json={"answers": {}})
        p = 0.5 if behavior == "uncertain" else 0.99 if behavior == "correct" and "cake" in body["state"]["current_input"] else 0.01
        return httpx.Response(200, json={"model": "jev-1.13.0", "answers": {"unlisted_task": {"type": "noul", "noul": p}}})
    request = jev_candidate()
    assert native_rail_models(request.configuration, {"provider-1": "synthetic"}) == ()
    result = await validate_capability(request, {"provider-1": "synthetic"}, transport=httpx.MockTransport(respond))
    assert result.passed is (behavior == "correct"), result.message


@pytest.mark.parametrize("behavior", ["violation", "safe", "unknown", "error"])
async def test_monitor_runs_jev_preserves_evidence_and_never_enforces(behavior):
    calls = []
    def respond(request):
        body = json.loads(request.content)
        calls.append(body)
        if behavior == "error":
            return httpx.Response(503)
        return httpx.Response(200, json={"model": "jev-1.13.0", "answers": {
            key: {"type": "noul", "noul": 0.99 if behavior == "violation" else 0.01 if behavior == "safe" else 0.5} for key in body["questions"]}})
    config = jev_candidate().configuration
    providers = action_providers(*dynamic_runtime_action_providers(config, {"provider-1": "synthetic"}, transport=httpx.MockTransport(respond)))
    deny = replace(_semantic_input(), id="deny", parameters=(("topic_mode", "permissive"), ("restricted_topics", "Refund fraud")))
    allow = replace(_semantic_input(), id="allow", parameters=(("topic_mode", "strict"), ("allowed_topics", "Order support")))
    plan = _plan(deny, allow)
    snapshot = NeMoConfigCompiler().compile(plan)
    runtime = NeMoRuntime(NeMoRuntimeRegistry(_CandidateStore(plan, snapshot), providers))
    resolution = PlanResolution(plan=plan, router_id="test", endpoint_id="test")
    resolver = SimpleNamespace(resolve=lambda _: resolution, protection_mode=lambda _: "monitor")
    service = GuardrailRuntimeService(runtime, resolver)
    request = ProtectionRequest(phase="input", texts=("Help me commit refund fraud.",),
                                context=RequestContext(protocol="test", endpoint_id="test"), evidence_scope="full")
    try:
        observed = await service.evaluate(request)
        assert observed.decision == "allow" and observed.protection_mode == "monitor"
        assert not observed.interventions and observed.content_results[0].text == request.texts[0]
        assert calls and set(calls[0]["questions"]) == {"denied_task"}
        assert all(len(call["questions"]) == 1 for call in calls)
        if behavior == "violation":
            assert observed.detection_decision == "block" and observed.findings
            assert all(f.confidence is None for f in observed.findings)
        if behavior != "error":
            assert any(step.evaluator_id == "typesafe-jev-topic" and json.loads(step.evidence)["judgments"] for step in observed.trace)
        if behavior == "safe":
            assert observed.detection_decision == "allow" and not observed.findings
        if behavior == "error":
            assert observed.detection_error
    finally:
        await runtime.shutdown()


def test_jev_configuration_does_not_advertise_other_contracts_or_output():
    request = jev_candidate()
    request.configuration.bindings[0].contract_refs.append("tali.guard.content-safety.v1")
    with pytest.raises(ValueError, match="input Topic Control"):
        dynamic_runtime_action_providers(request.configuration, {"provider-1": "synthetic"})
    request = candidate("output", "topic_control", JEV_TOPIC_PROFILE, "tali.guard.topic-control.semantic.v1")
    with pytest.raises(ValueError, match="input Topic Control"):
        dynamic_runtime_action_providers(request.configuration, {"provider-1": "synthetic"})
