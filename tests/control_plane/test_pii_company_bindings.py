"""Protocol, routing and failure semantics; live model quality is tested separately."""
from dataclasses import replace
import json
import httpx
import pytest
from runner import generated as protocol
from runner.providers import dynamic_runtime_action_providers
from runner.capability_validation import validate_capability
from runner.toolkit.nemo.action_registry import action_providers
from runner.toolkit.nemo.actions.names import ACTION_EVALUATE, ACTION_TOPIC_JUDGE
from runner.toolkit.safety.providers import OpenAIChatModelClient, ModelCompletionRequest
from tests.test_dynamic_model_configuration import _pii_request, _topic_request
from tests.control_plane.test_capability_validation import candidate
from tests.control_plane.test_jev_topic_integration import jev_candidate

PROFILE = 'tali.openai-compatible-pii.v1'
CONTRACT = 'tali.guard.pii.semantic.v1'
COMPANY = 'tali.guard.company-policy.v1'


def response(content):
    return httpx.Response(200, json={'choices': [{'message': {'content': content}}]})


def test_unconditional_pii_semantics_retains_the_remote_deadline():
    from runner.toolkit.compiler.nemo_compiler import NeMoConfigCompiler
    from runner.serialization import plan_from_dict
    from tests.test_pii_model_escalation import _plan
    plan = _plan();plan['steps'][1]['trigger'] = {'type':'always'}
    plan.update(guardrail_id='pii-budget', guardrail_version='20261013-000000.001Z')
    plan['modules'][0]['timeout_ms'] = 30_000
    bindings = NeMoConfigCompiler().compile(plan_from_dict(plan)).action_bindings
    assert {b.id:b.timeout_ms for b in bindings} == {'pii:exact':750,'pii:semantic':29_250}


@pytest.mark.parametrize('base,model,disable_thinking', [
    ('https://integrate.api.nvidia.com/v1/', 'nvidia/nemotron-3.5-lightning-30b-a3b', True),
    ('https://other.test/v1', 'nvidia/nemotron-3.5-lightning-30b-a3b', False),
    ('https://integrate.api.nvidia.com/v1', 'another-model', False),
])
async def test_lightning_classifier_disables_reasoning_only_on_hosted_nvidia(base, model, disable_thinking):
    bodies = []
    def handler(req):
        bodies.append(json.loads(req.content))
        return response('{"verdict":"safe"}')
    await OpenAIChatModelClient(httpx.MockTransport(handler)).complete(ModelCompletionRequest(
        base_url=base, model=model, messages=({'role':'user','content':'hello'},),
        api_key_env_var=None, timeout_seconds=5, max_tokens=128, disable_thinking=True,
    ))
    assert bodies[0].get('chat_template_kwargs') == ({'enable_thinking':False} if disable_thinking else None)
    from runner.toolkit.nemo.actions.topic import ChatTopicEvaluator
    await ChatTopicEvaluator(capability='company_policy',base_url=base,model=model,
        api_key_env_var=None,transport=httpx.MockTransport(lambda req: (
            bodies.append(json.loads(req.content)) or response('off-topic')
        ))).evaluate(replace(_topic_request(),capability='company_policy',
            binding=replace(_topic_request().binding,capability='company_policy',contract_ref=COMPANY)))
    assert bodies[1].get('chat_template_kwargs') == ({'enable_thinking':False} if disable_thinking else None)
    # Other judge adapters must keep their validated default reasoning behavior.
    await OpenAIChatModelClient(httpx.MockTransport(handler)).complete(ModelCompletionRequest(
        base_url=base, model=model, messages=({'role':'user','content':'hello'},),
        api_key_env_var=None, timeout_seconds=5, max_tokens=128,
    ))
    assert 'chat_template_kwargs' not in bodies[2]


@pytest.mark.parametrize('phase', ['input', 'output'])
@pytest.mark.parametrize('payload,verdict', [('{"verdict":"pii"}', 'matched'), ('{"verdict":"safe"}', 'not_matched'), ('{"verdict":"unknown"}', 'unknown'), ('{"verdict":true}', 'error'), ('{"verdict":"pii","replacement":"unsafe"}', 'error'), ('PII', 'error'), ('503', 'error')])
async def test_pii_judge_routes_rails_preserves_unknown_and_rejects_bad_protocol(phase, payload, verdict):
    request = candidate(phase, 'pii_semantic', PROFILE, CONTRACT)
    captured = []
    def handler(req):
        body=json.loads(req.content);captured.append(body)
        assert req.headers['authorization']=='Bearer secret'
        return httpx.Response(503) if payload=='503' else response(payload)
    providers=action_providers(*dynamic_runtime_action_providers(request.configuration, {'provider-1':'secret'}, transport=httpx.MockTransport(handler)))
    r=_pii_request();r=replace(r,rail_type=phase,content='客户姓名是张三。',proposed_action='transform',context_messages=({'role':'user','content':'Do not classify this earlier turn.'},),binding=replace(r.binding,phases=(phase,),on_unsafe='transform'))
    result=await providers[(ACTION_EVALUATE,'1.0.0')].execute(r)
    assert result.verdict==verdict
    assert result.usage.model_invocations==1
    assert json.loads(captured[0]['messages'][-1]['content'])=={'target_text':r.content}
    assert result.content==('[PII_REDACTED]' if verdict=='matched' else r.content)
    if verdict=='matched':
        assert result.findings[0].provider_evidence[0].native_verdict=='unsafe'
    else:
        assert not any(f.verdict=='matched' for f in result.findings)


async def test_company_and_jev_use_independent_models_and_credentials():
    cfg=jev_candidate().configuration
    cfg.runtimes.append(protocol.ModelRuntime(id='company',model='company-judge',base_url='https://company.test/v1',credential_ref='company-key',profile_ref='tali.taxonomy-judge.v1',timeout_seconds=5,max_tokens=128))
    cfg.bindings.append(protocol.CapabilityBinding(binding_id='company_policy.input',capability_ref='company_policy',rail_type=protocol.RAIL_TYPE_INPUT,model_ref='company',profile_ref='tali.taxonomy-judge.v1',contract_refs=[COMPANY]))
    calls=[]
    def handler(req):
        calls.append((req.url.host,req.headers['authorization']))
        if req.url.host=='company.test':return response('off-topic')
        body=json.loads(req.content)
        return httpx.Response(200,json={'model':'jev-1.13.0','answers':{k:{'type':'noul','noul':0.99} for k in body['questions']}})
    providers=action_providers(*dynamic_runtime_action_providers(cfg,{'provider-1':'jev-secret','company-key':'company-secret'},transport=httpx.MockTransport(handler)))
    provider=providers[(ACTION_TOPIC_JUDGE,'1.0.0')]
    topic=_topic_request();company=replace(topic,capability='company_policy',binding=replace(topic.binding,capability='company_policy',contract_ref=COMPANY))
    assert (await provider.execute(topic)).verdict=='matched'
    assert (await provider.execute(company)).verdict=='matched'
    assert calls[-1]==('company.test','Bearer company-secret') and calls[0][1]=='Bearer jev-secret'
    del cfg.bindings[1]
    provider=action_providers(*dynamic_runtime_action_providers(cfg,{'provider-1':'jev-secret','company-key':'company-secret'},transport=httpx.MockTransport(handler)))[(ACTION_TOPIC_JUDGE,'1.0.0')]
    assert not provider.supports('company_policy',COMPANY,'input')
    assert (await provider.execute(company)).verdict=='error'
    assert len(calls)==2  # Never silently fall back to the Topic Control model.


@pytest.mark.parametrize('kind',['pii_semantic','company_policy'])
@pytest.mark.parametrize('behavior',['correct','unknown','error'])
async def test_independent_capability_probes_require_real_classification(kind,behavior):
    req=candidate('input',kind,PROFILE if kind=='pii_semantic' else 'tali.taxonomy-judge.v1',CONTRACT if kind=='pii_semantic' else COMPANY)
    def handler(request):
        if behavior=='error':return httpx.Response(503)
        text=str(json.loads(request.content)['messages'])
        if kind=='pii_semantic':return response(json.dumps({'verdict':'unknown' if behavior=='unknown' else 'pii' if 'John Smith' in text else 'safe'}))
        return response('{"verdict":"uncertain"}' if behavior=='unknown' else 'off-topic' if 'cake' in text else 'on-topic')
    result=await validate_capability(req,{'provider-1':'synthetic'},transport=httpx.MockTransport(handler))
    assert result.passed==(behavior=='correct'),result.message
    if behavior!='correct':assert not all(c.passed for c in result.cases)


async def test_pii_semantic_review_runs_after_local_redaction_and_on_benign_labels():
    from runner.compiler import DefaultRunnerCompiler
    from runner.validator import DefaultRunnerValidator
    from runner.protocol_codec import plan_to_proto, validation_test_to_proto
    from tests.test_pii_model_escalation import _plan, _case
    cfg=candidate('input','pii_semantic',PROFILE,CONTRACT).configuration
    targets=[]
    def handler(req):
        target=json.loads(json.loads(req.content)['messages'][-1]['content'])['target_text'];targets.append(target)
        return response(json.dumps({'verdict':'pii' if 'Alice Morgan' in target else 'safe'}))
    providers=action_providers(*dynamic_runtime_action_providers(cfg,{'provider-1':'synthetic'},transport=httpx.MockTransport(handler)))
    plan=_plan();plan['steps'][1]['trigger']={'type':'always'}
    validator=DefaultRunnerValidator(DefaultRunnerCompiler(),providers)
    status,_,results=await validator.validate(protocol.ValidationRequest(run_id='pii-mixed',guardrail_id='pii-mixed',candidate_version='20261013-000000.001Z',source_draft_revision=1,plan=plan_to_proto(plan),runtime_profile='auto',test_cases=[validation_test_to_proto(_case('mixed','My name is Alice Morgan and my email is alice@example.com.','transform')),validation_test_to_proto(_case('benign','请问护照号是什么？','allow'))]))
    assert status=='passed',results
    assert results[0]['outputContent']=='[PII_REDACTED]'
    assert results[1]['outputContent']=='请问护照号是什么？'
    assert all(r['modelInvocations']==1 and r['actualFailure'] is None for r in results)
    assert any('Alice Morgan' in t and '[PII_REDACTED]' in t and 'alice@example.com' not in t for t in targets)


@pytest.mark.parametrize('verdict', ['unknown', 'error'])
async def test_pii_failed_semantic_review_never_appears_as_a_trace_hit(verdict):
    from runner.compiler import DefaultRunnerCompiler
    from runner.validator import DefaultRunnerValidator
    from runner.protocol_codec import plan_to_proto, validation_test_to_proto
    from tests.test_pii_model_escalation import _plan, _case
    cfg = candidate('input','pii_semantic',PROFILE,CONTRACT).configuration
    transport = httpx.MockTransport(lambda req: httpx.Response(503) if verdict == 'error' else response('{"verdict":"unknown"}'))
    providers = action_providers(*dynamic_runtime_action_providers(cfg,{'provider-1':'synthetic'},transport=transport))
    plan = _plan();plan['steps'][1]['trigger'] = {'type':'always'}
    status, _, results = await DefaultRunnerValidator(DefaultRunnerCompiler(),providers).validate(
        protocol.ValidationRequest(run_id='pii-failure',guardrail_id='pii-failure',candidate_version='20261013-000000.001Z',source_draft_revision=1,plan=plan_to_proto(plan),runtime_profile='auto',
            test_cases=[validation_test_to_proto(_case('failed','My name is Alice Morgan.','transform'))]))
    result = results[0]
    assert status == 'failed'
    if verdict == 'error':
        assert result['actualFailure'] is not None
    assert not result['matchedRuleIds'] and not any(f['verdict']=='matched' for f in result['findings'])
    assert all(t.get('verdict') != 'matched' for t in result['trace'])
    assert any(t.get('kind')=='rail' and t.get('verdict')==verdict for t in result['trace'])
