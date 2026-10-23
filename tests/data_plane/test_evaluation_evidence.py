import json
from dataclasses import replace

import httpx
import pytest
from fastapi import FastAPI

from runner.api import RunnerAPI
from runner.evaluation_evidence import evaluation_evidence, MAX_HEADER_BYTES
from runner.toolkit.runtime.contracts import ProtectionDecision, RuntimeTraceStep, AppliedIntervention, RuntimeUsage
from tests.test_runner_api import Store, Metrics, Runtime, Telemetry


def decision(verdict="unknown", mode="enforce"):
    native = {"question_revision": "jailbreak-input.v3", "thresholds": {"lower": 0.1, "upper": 0.9},
              "judgments": {"jailbreak_attempt": {"probability": 0.4}, "unsafe_pretext": {"probability": 0.5}},
              "raw_input": "private content must not leave the runtime"}
    trace = RuntimeTraceStep(id="jb:jev", kind="evaluation", name="Jev", status="completed", detail="private reason",
                             evaluator_id="typesafe-jev-jailbreak", capability="jailbreak", verdict=verdict,
                             model_name="jev-1.13.0", policy_id="builtin-jailbreak", evidence=json.dumps(native),
                             content_block_id="input:0")
    return ProtectionDecision(decision="block", action="block", guardrail_id="guard", trace=(trace,), protection_mode=mode,
         interventions=(AppliedIntervention(kind="block",module_id="jb",fragment_id="nemo:jb:block",content_block_id="input:0"),))


@pytest.mark.parametrize("verdict", ["matched", "unknown", "not_matched", "error"])
def test_evidence_preserves_verdict_and_native_operating_point_without_source_text(verdict):
    raw=evaluation_evidence(decision(verdict)); body=json.loads(raw); row=body["evaluations"][0]
    assert row["verdict"] == verdict and row["enforcedAction"] == "block"
    assert row["questionRevision"] == "jailbreak-input.v3"
    assert row["probabilities"] == {"jailbreak_attempt":0.4,"unsafe_pretext":0.5}
    assert "private" not in raw and body["complete"]


def test_content_safety_evidence_uses_its_own_capability_and_question():
    original = decision()
    trace = replace(original.trace[0], evaluator_id="typesafe-jev-content-safety", capability="content_safety",
        policy_id="builtin-content-safety", evidence=json.dumps({"question_revision": "content-safety-input.v1",
            "thresholds": {"lower": .1, "upper": .9}, "judgments": {"unsafe_content": {"probability": .4},
            "jailbreak_attempt": {"probability": .8}}, "raw_input": "private"}))
    raw = evaluation_evidence(replace(original, trace=(trace,)))
    row = json.loads(raw)["evaluations"][0]
    assert row["evaluatorId"] == "typesafe-jev-content-safety" and row["capability"] == "content_safety"
    assert row["probabilities"] == {"unsafe_content": .4}
    assert row["verdict"] == "unknown" and row["enforcedAction"] == "block"
    assert "private" not in raw


def test_monitor_nonterminal_unknown_other_content_and_truncation_do_not_claim_enforcement():
    original=decision()
    for modified in [decision(mode="monitor"),replace(original,interventions=()),
                     replace(original,interventions=(replace(original.interventions[0],content_block_id="input:1"),))]:
        assert json.loads(evaluation_evidence(modified))["evaluations"][0]["enforcedAction"] is None
    bounded=json.loads(evaluation_evidence(replace(original,trace=original.trace*40)))
    assert not bounded["complete"] and len(json.dumps(bounded,separators=(",",":")))<=MAX_HEADER_BYTES
    assert json.loads(evaluation_evidence(replace(original,trace=())))['evaluations']==[]


async def test_litellm_opt_in_evidence_keeps_standard_body_and_default_contract():
    class JevRuntime(Runtime):
        async def evaluate(self,*args,**kwargs):return decision()
    app=FastAPI();app.include_router(RunnerAPI(JevRuntime(),Store(),Metrics(),Telemetry(),"runner","token").router)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url="http://runner") as client:
        for opt_in in (False,True):
            response=await client.post('/runtime/v1/endpoints/endpoint-1/beta/litellm_basic_guardrail_api',
                headers={"x-api-key":"valid-secret",**({"x-guard-evidence":"evaluations-v1"} if opt_in else {})},
                json={"input_type":"request","texts":["benign"]})
            assert response.status_code==200 and response.json()=={"action":"BLOCKED"}
            assert ('x-guard-evaluation-evidence' in response.headers) is opt_in


def test_execution_failure_is_separate_from_jailbreak_verdict_and_contains_no_reason():
    safe = decision('not_matched')
    failed = replace(safe, usage=RuntimeUsage(fail_closed=True), trace=(*safe.trace,
        RuntimeTraceStep(id='cs', kind='action', name='Content safety', status='error',
                         verdict='error', error_type='http_5xx', detail='private upstream response')))
    body = json.loads(evaluation_evidence(failed))
    assert body['execution'] == {'status': 'error', 'failClosed': True, 'errorTypes': ['http_5xx']}
    assert body['evaluations'][0]['verdict'] == 'not_matched'
    assert 'private' not in json.dumps(body)
    assert json.loads(evaluation_evidence(decision()))['execution']['status'] == 'complete'
    assert json.loads(evaluation_evidence(decision(mode='bypass')))['execution']['status'] == 'bypassed'
    recovered = replace(safe, trace=(*safe.trace, RuntimeTraceStep(id='provider-attempt', kind='model',
        name='Recovered provider attempt', status='error', detail='Fallback succeeded', error_type='http_5xx')))
    assert json.loads(evaluation_evidence(recovered))['execution']['status'] == 'complete'
