import asyncio
import pytest

from runner.compiler import DefaultRunnerCompiler
from runner.draft_preview import DraftPreviewRuntime
from runner.toolkit.nemo.action_registry import action_providers
from runner.toolkit.runtime.contracts import ProtectionRequest, RequestContext
from tests.control_plane.test_ordered_execution import RecordingSecrets, chain_plan


@pytest.mark.parametrize("phase", ["input", "output"])
@pytest.mark.parametrize("block", [False, True])
@pytest.mark.parametrize("programmable", [False, True])
async def test_parallel_checks_wait_for_all_safe_results_or_cancel_on_block(phase, block, programmable):
    entered = set()
    both = asyncio.Event()
    cancelled = []
    class Checks(RecordingSecrets):
        async def execute(self, request):
            if request.binding.id in {"left", "right"}:
                entered.add(request.binding.id)
                if len(entered) == 2: both.set()
                await asyncio.wait_for(both.wait(), 1)
                if block and request.binding.id == "right":
                    try: await asyncio.Event().wait()
                    except asyncio.CancelledError: cancelled.append("right"); raise
            return await super().execute(request)
    steps = [("left", "alpha" if block else "missing", "unused", "block"),
             ("right", "missing", "unused", "block"), ("redact", "alpha", "[A]", "transform")]
    plan = chain_plan(steps, phase)
    for i, step in enumerate(plan["steps"][:2]):
        step["parameters"] += [[f"parallel_group_{phase}", "independent"], [f"parallel_leader_{phase}", str(i == 0).lower()]]
    plan["modules"][1]["depends_on"] = []
    plan["modules"][2]["depends_on"] = [m["id"] for m in plan["modules"][:2]]
    if programmable:
        plan["steps"][2]["trigger"] = {"type": "on_result", "step_ref": "right", "verdicts": ["not_matched"]}
    provider = Checks()
    runtime = DraftPreviewRuntime(DefaultRunnerCompiler(), action_providers(provider))
    try:
        result = await runtime.evaluate(ProtectionRequest(phase=phase, texts=("alpha beta",), context=RequestContext(protocol="playground")),
            preview_id="parallel", guardrail_id="ordered", draft_revision=1, candidate_version="20260904-010000.001Z",
            plan=plan, runtime_profile="auto")
        assert entered == {"left", "right"}
        assert not result.usage.fail_closed, result.reason
        assert result.decision == ("block" if block else "transform")
        if block:
            assert cancelled == ["right"]
            assert all(id != "redact" for id, _ in provider.calls)
            assert any(t.status == "cancelled" and t.policy_id == "right" for t in result.trace)
            assert result.assessments[1].coverage.status == "none"
        else:
            assert result.texts == ("[A] beta",)
            assert provider.calls[-1] == ("redact", "alpha beta")
            assert {t.policy_id for t in result.trace if t.kind == "action" and t.policy_id} == {"left", "right", "redact"}
    finally:
        await runtime.shutdown()


async def test_allow_observation_does_not_skip_a_later_block():
    from tests.control_plane.test_ordered_execution import run_chain
    result, calls = await run_chain([("observe", "alpha", "unused", "allow"), ("block", "beta", "unused", "block")])
    assert result.decision == "block"
    assert [id for id, _ in calls] == ["observe", "block"]


async def test_cancelled_real_model_action_preserves_usage_without_reporting_timeout():
    import httpx
    from tests.model_policy_fixture import model_enabled_guardrail
    from tests.control_plane.test_default_model_runtime import runtime_and_identity
    entered = set()
    both = asyncio.Event()
    async def respond(request):
        entered.add(request.url.host)
        if len(entered) == 2: both.set()
        await asyncio.wait_for(both.wait(), 1)
        if request.url.host == 'jailbreak.test':
            return httpx.Response(200, json={'jailbreak': True, 'score': .99})
        await asyncio.Event().wait()
    plan = model_enabled_guardrail()['plan']
    runtime, identity = runtime_and_identity(plan, respond)
    try:
        result = await runtime.evaluate(ProtectionRequest(phase='input', texts=('Synthetic parallel model contract test.',),
            context=RequestContext(protocol='playground')), **identity)
        assert result.decision == 'block'
        assert not result.usage.fail_closed
        assert result.usage.model_invocations == 2
        assert sorted(call.result for call in result.usage.model_calls) == ['cancelled', 'success']
        assert any(t.status == 'cancelled' and not t.timed_out and t.verdict is None for t in result.trace)
        assert not any(t.verdict == 'error' for t in result.trace)
    finally:
        await runtime.shutdown()


@pytest.mark.parametrize('invalid', ['transform', 'different-input', 'missing-leader', 'streaming'])
def test_invalid_parallel_contract_is_rejected_before_runtime(invalid):
    from runner.toolkit.compiler.domain import PlanCompilationError
    from runner.toolkit.compiler.nemo_compiler import NeMoConfigCompiler
    from runner.serialization import plan_from_dict
    plan = chain_plan([('a', 'x', 'y', 'block'), ('b', 'x', 'y', 'block')], 'output')
    for i, step in enumerate(plan['steps']):
        step['parameters'] += [['parallel_group_output', 'checks'], ['parallel_leader_output', str(i == 0).lower()]]
    if invalid == 'transform': plan['steps'][1]['on_unsafe'] = 'transform'
    if invalid == 'different-input': plan['modules'][1]['input_view'] = 'original'
    if invalid == 'missing-leader': plan['steps'][0]['parameters'][-1][1] = 'false'
    if invalid == 'streaming': plan['output_delivery'] = 'window_buffered'
    with pytest.raises(PlanCompilationError, match='Parallel'):
        NeMoConfigCompiler().compile(plan_from_dict(plan))
