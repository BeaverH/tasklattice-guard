"""Coverage and Default order are checked against the pre-consolidation contracts.

The fixture is an audit oracle, not a compatibility catalog or a runtime alias map.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import subprocess
from copy import deepcopy

from runner.toolkit.policy_library.package import load_package

ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / 'tests/fixtures'
REPAIR_AUDIT = json.loads((FIXTURES / 'policy-rule-repairs.json').read_text())
REPAIRS = REPAIR_AUDIT['rules']


def signature(rule: dict) -> str:
    contract = {k: v for k, v in rule.items()
                if k not in ('id', 'name', 'description', 'runtime_adapter', 'stages')}
    return hashlib.sha256(json.dumps(contract, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def catalog():
    return {p.parent.name: load_package(p.parent).definition.model_dump(mode='json', exclude_none=True)
            for p in (ROOT / 'policies/builtin').glob('*/policy.yaml')}


def test_every_previous_rule_retains_its_detector_handling_risk_and_stages():
    before = json.loads((FIXTURES / 'policy-capability-contracts.json').read_text())
    current = catalog()
    assert before['source_policy_count'] == 64
    assert len(before['rules']) == 405
    for old in before['rules']:
        if old.get('profile'):
            continue  # General-topic examples are audited against the optional Topic Control preset below.
        rule = next(r for r in current[old['policy']]['rules'] if r['id'] == old['rule'])
        repair = REPAIRS.get(f"{old['policy']}/{old['rule']}")
        if repair:
            assert current[old['policy']]['metadata']['version'] == repair['version']
            assert signature(rule) == repair['sha256']
            # Keep the historical migration oracle intact. A reviewed behavior
            # repair is versioned, never a rewrite of its original contract.
            historical = load_package(ROOT / 'policies/history' / old['policy'] / repair['previousVersion'])
            rule = next(r for r in historical.definition.model_dump(mode='json', exclude_none=True)['rules'] if r['id'] == old['rule'])
            assert signature(rule) == repair['previousSha256']
        if old.get('keyword_superset'):
            proof = before['keyword_supersets'][old['sha256']]
            contract = deepcopy({k: v for k, v in rule.items() if k not in ('id', 'name', 'description', 'runtime_adapter', 'stages')})
            parent = contract
            for key in proof['path'][:-1]:
                parent = parent[key]
            leaf = proof['path'][-1]
            assert set(proof['terms']) <= set(parent[leaf])
            parent[leaf] = []
            assert hashlib.sha256(json.dumps(contract, sort_keys=True, ensure_ascii=False).encode()).hexdigest() == proof['other_contract_sha256']
        else:
            assert signature(rule) == old['sha256'], (old['source_policy'], old['source_rule'])
        assert set(old['stages']) <= set(rule['stages'])


def test_local_rules_have_one_canonical_owner():
    owners = {}
    aliases = {(item['policy'], frozenset(item['rules'])): item
               for item in REPAIR_AUDIT['samePolicyAliases']}
    seen_aliases = set()
    for pid, policy in catalog().items():
        for rule in policy['rules']:
            if not rule['detector']['ref'].startswith(('text/', 'code/')) or policy['parameters']:
                continue
            key = signature(rule)
            if key in owners:
                owner, original = owners[key]
                alias_key = (pid, frozenset((original, rule['id'])))
                # Versioned repairs may converge two established IDs within
                # one Policy. Only explicitly audited aliases are permitted.
                assert owner == pid and alias_key in aliases, ((pid, rule['id']), owners[key])
                alias = aliases[alias_key]
                assert alias['version'] == policy['metadata']['version']
                assert alias['sha256'] == key
                seen_aliases.add(alias_key)
            owners[key] = (pid, rule['id'])
    assert seen_aliases == aliases.keys()


def test_default_preserves_order_actions_and_models_with_new_rules_opt_in():
    old = json.loads((FIXTURES / 'default-capability-consolidation.json').read_text())
    contracts = json.loads((FIXTURES / 'policy-capability-contracts.json').read_text())['rules']
    lookup = {(v['source_policy'], v['source_rule']): v for v in contracts}
    result = subprocess.run(['node', '--import', 'tsx', '--input-type=module', '-e', '''
      import { PolicyCatalog } from './server/policy-catalog/catalog.ts';
      import { defaultGuardrailDraft } from './server/domain/defaults.ts';
      console.log(JSON.stringify(defaultGuardrailDraft(PolicyCatalog.load('../runner/toolkit/policy_library/assets').list())));
    '''], cwd=ROOT / 'controller', check=True, capture_output=True, text=True)
    draft = json.loads(result.stdout)
    current = catalog()
    for phase in ('input', 'output'):
        expected = []
        seen = set()
        for binding in old['bindings']:
            if binding['policyId'] in {'builtin-jailbreak', 'builtin-content-safety'}:
                continue
            for rid in binding['enabledRuleIds']:
                contract = lookup[(binding['policyId'], rid)]
                if phase not in contract['stages']:
                    continue
                target = (contract['policy'], contract['rule'])
                if target in seen:
                    continue
                seen.add(target)
                expected.append((contract['sha256'], binding['ruleActions'].get(rid)))
        actual = []
        for binding in draft['policyBindings']:
            by_id = {r['id']: r for r in current[binding['policyId']]['rules']}
            for rid in binding['ruleOrder']:
                rule = by_id[rid]
                if phase in rule['stages']:
                    repair = REPAIRS.get(f"{binding['policyId']}/{rid}")
                    actual.append((repair['previousSha256'] if repair else signature(rule), binding['ruleActions'].get(rid)))
        assert actual == expected
    assert draft['outputDelivery'] == 'full_buffered'
    assert [b['policyId'] for b in draft['policyBindings']][:2] == [
        'builtin-indirect-prompt-injection', 'builtin-memory-poisoning']
    assert sum(len(b['enabledRuleIds']) for b in draft['policyBindings']) == 122


def test_topic_preset_covers_previous_examples_without_an_independent_profile():
    before = json.loads((FIXTURES / 'policy-capability-contracts.json').read_text())['topic_profile']
    result = subprocess.run(['node', '--import', 'tsx', '--input-type=module', '-e', """
      import { protectionPresets } from './shared/protection-presets.ts';
      import { generalTopicRestrictions } from './shared/topic-policy-presets.ts';
      console.log(JSON.stringify({ topics: generalTopicRestrictions, retired: protectionPresets.some(p => p.id === 'restricted-general-topics') }));
    """], cwd=ROOT / 'controller', check=True, capture_output=True, text=True)
    preset = json.loads(result.stdout)
    assert not preset['retired']
    # New bindings use semantic topic classification; these are coverage examples,
    # not a claim that model decisions equal the previous literal phrase matcher.
    assert sorted(e for item in preset['topics'] for e in item['examples']) == sorted(before['phrases'])
    topic = catalog()['builtin-topic-safety']
    assert len(topic['rules']) == 2
    assert all(r['stages'] == ['input'] for r in topic['rules'])
    assert all(not p.get('default') for p in topic['parameters'] if p['name'] in ('allowed_topics', 'denied_topics'))
