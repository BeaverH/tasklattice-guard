#!/usr/bin/env python3
"""Audit frozen Default evaluations and replay selected cases without network I/O.

Reads existing evidence without updating it. Writes only to a fresh audit folder.
Recorded HTTP replay checks wiring and reproducibility, not new model quality.
"""
from __future__ import annotations

import argparse
import asyncio
from collections import Counter, defaultdict
from dataclasses import fields
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

OLD = ROOT / "output/default-public-evaluation/baseline"
JAIL = ROOT / "output/jailbreak-public-evaluation/baseline"
LIVE = ROOT / "output/default-public-evaluation/live-20261019"
GOAL = ROOT / "output/evaluation-catalog/local-goal-replay-v1"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path: Path):
    return json.loads(path.read_text())


def rows(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text().splitlines()]


def write(path: Path, value) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def jsonl(path: Path, values: list[dict]) -> None:
    path.write_text("".join(json.dumps(v, ensure_ascii=False) + "\n" for v in values))


def scored(row: dict) -> dict:
    unknown = any(t.get("kind") == "action" and t.get("verdict") == "unknown"
                  for t in row.get("model_trace", []))
    return {**row, "status": "indeterminate"} if row["status"] == "complete" and unknown else row


def metrics(population: list[dict]) -> dict:
    valid = [r for r in population if r["status"] == "complete"]
    risk = [r for r in valid if r["expected"] == "block_reference"]
    safe = [r for r in valid if r["expected"] == "preserve"]
    return {
        "attempted": len(population), "complete": len(valid),
        "execution_errors": sum(r["status"] == "execution_error" for r in population),
        "indeterminate": sum(r["status"] == "indeterminate" for r in population),
        "risk_reference": len(risk), "risk_decisions": dict(Counter(r["decision"] for r in risk)),
        "safe_reference": len(safe), "safe_decisions": dict(Counter(r["decision"] for r in safe)),
        "model_calls": sum(r.get("model_invocations", 0) for r in population),
    }


def verify_frozen(folder: Path) -> dict:
    checks = read(folder / "checksums.json")
    for name, expected in checks.items():
        assert sha(folder / name) == expected, (folder.name, "checksum mismatch", name)
    manifest_file = folder / ("source-code-manifest.json" if folder == JAIL else "manifest.json")
    manifest = read(manifest_file)
    files = manifest if folder == JAIL else manifest["implementation"]["files"]
    with zipfile.ZipFile(folder / "implementation.zip") as archive:
        for name, expected in files.items():
            assert hashlib.sha256(archive.read(name)).hexdigest() == expected, name
    return {"root": str(folder.relative_to(ROOT)), "checked_files": len(checks),
            "archived_source_files": len(files), "checksums_sha256": sha(folder / "checksums.json")}


def inventory(plan: dict) -> dict:
    return {
        "guardrail_id": plan["guardrail_id"], "version": plan["guardrail_version"],
        "steps": len(plan["steps"]), "capabilities": dict(Counter(s["capability"] for s in plan["steps"])),
        "policies": [{"id": b["policy_id"], "version": b["policy_version"],
                      "rails": b["enabled_rails"], "rules": b["enabled_rule_ids"],
                      "action": b.get("action"), "rule_actions": b["rule_actions"]}
                     for b in plan["policy_bindings"]],
    }


def verify_cases(cases: list[dict], results: list[dict]) -> None:
    by_id = {r["id"]: r for r in results}
    assert len(by_id) == len(results) == len(cases)
    assert set(by_id) == {c["id"] for c in cases}
    for case in cases:
        result = by_id[case["id"]]
        assert all(result[k] == v for k, v in case.items()), case["id"]
        assert result["text_sha256"] == hashlib.sha256(case["text"].encode()).hexdigest()
        assert result["history_sha256"] == hashlib.sha256(
            json.dumps(case["messages"], sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def audit_http(content: list[dict], jailbreak: list[dict], output: Path) -> dict:
    from runner.toolkit.safety.providers import NemotronSafetyGuardV3Adapter

    http = rows(LIVE / "http.jsonl")
    by_case = defaultdict(list)
    for line, item in enumerate(http, 1):
        by_case[item["case_id"]].append({**item, "evidence_line": line})
    index, families = [], defaultdict(list)
    for result in content + jailbreak:
        calls = by_case[result["id"]]
        assert len(calls) == result["model_invocations"] == len(result["model_calls"])
        native = [c for c in calls if c["host"] == "ai.api.nvidia.com"]
        assert len(native) == (1 if result["phase"] == "input" else 0)
        messages = [m for m in result["messages"][-12:]
                    if m.get("role") in {"user", "assistant"} and m.get("content", "").strip()]
        target = {"role": "user" if result["phase"] == "input" else "assistant", "content": result["text"]}
        if not messages or messages[-1] != target:
            messages.append(target)
        expected_messages = NemotronSafetyGuardV3Adapter().messages(
            tuple(messages), scope=result["phase"], candidate_taxonomy_ids=())
        evidence = []
        for call in calls:
            response = json.loads(call["response"])
            if call["host"] == "ai.api.nvidia.com":
                assert call["request"] == {"input": result["text"]}
                action = next(t for t in result["model_trace"]
                              if t["kind"] == "action" and t["capability"] == "jailbreak")
                assert action["verdict"] == ("matched" if response["jailbreak"] else "not_matched")
                native_result = response
                family = result.get("metadata", {}).get("attack_family")
                if result.get("label") == "attack_prompt":
                    families[family].append(response)
            else:
                assert call["host"] == "integrate.api.nvidia.com"
                assert call["request"]["model"] == "nvidia/llama-3.1-nemotron-safety-guard-8b-v3"
                assert call["request"]["messages"] == list(expected_messages), result["id"]
                raw = response["choices"][0]["message"]["content"]
                try:
                    native_result = json.loads(raw)
                except ValueError:
                    native_result = {"unparsed": True}
                if isinstance(native_result, dict):
                    label = native_result.get("User Safety" if result["phase"] == "input" else "Response Safety")
                    action = next(t for t in result["model_trace"]
                                  if t["kind"] == "action" and t["capability"] == "content_safety")
                    if str(label).strip().lower() == "safe":
                        assert action["verdict"] == "not_matched", result["id"]
                    elif str(label).strip().lower() == "unsafe":
                        assert action["verdict"] in {"matched", "unknown"}, result["id"]
            evidence.append({"http_line": call["evidence_line"], "host": call["host"],
                             "status": call["status"], "native_result": native_result})
        index.append({"id": result["id"], "phase": result["phase"], "http": evidence})
    assert set(by_case) == {r["id"] for r in content + jailbreak}
    jsonl(output / "http-case-index.jsonl", index)
    return {"requests": len(http), "cases": len(index),
            "status": dict(Counter(str(h["status"]) for h in http)),
            "raw_input_and_rendered_prompt_verified": True,
            "attack_families": {name: {"n": len(items), "matched": sum(i["jailbreak"] for i in items),
                "score_min": min(i["score"] for i in items), "score_max": max(i["score"] for i in items)}
                for name, items in families.items()}}


async def offline_probes(output: Path, old: list[dict], live: list[dict], jail: list[dict]) -> dict:
    import httpx
    from google.protobuf.json_format import Parse
    from runner import generated as protocol
    from runner.compiler import DefaultRunnerCompiler
    from runner.draft_preview import DraftPreviewRuntime
    from runner.providers import dynamic_runtime_action_providers
    from runner.toolkit.nemo.action_registry import action_providers
    from runner.toolkit.nemo.actions import local_action_providers
    from scripts import evaluate_default_public as evaluator
    from scripts import evaluate_jailbreak_public as legacy

    local = evaluator.build_default_plan(local_components_only=True)["plan"]
    assert local == read(OLD / "plan.json")["plan"]
    current_plans = legacy.build_plans()
    runtime = DraftPreviewRuntime(DefaultRunnerCompiler(), action_providers(*local_action_providers()))
    try:
        try:
            await runtime.prepare(preview_id="audit-legacy-entry", guardrail_id="guardrail-default", draft_revision=1,
                candidate_version=current_plans["default_local"]["guardrail_version"],
                plan=current_plans["default_local"], runtime_profile="auto")
            drift = {"prepare": "unexpected_success"}
        except Exception as error:
            drift = {"prepare": "rejected", "error_type": type(error).__name__, "reason": str(error)[:500]}
    finally:
        await runtime.shutdown()

    selected = [r for r in live if
        (r["expected"] == "block_reference" and r["source"] != "diagnostic" and r["decision"] != "block")
        or r["status"] != "complete" or scored(r)["status"] != r["status"] or "history-" in r["id"]]
    selected += [r for r in jail if r["label"] == "attack_prompt" and r["decision"] != "block"]
    # Include positive and benign controls as well as unresolved cases.
    for predicate in [lambda r: r["expected"] == "preserve" and r["decision"] == "allow",
                      lambda r: r["expected"] == "preserve" and r["decision"] == "block",
                      lambda r: r["expected"] == "block_reference" and r["decision"] == "block"]:
        selected += [r for r in live if predicate(r) and r["status"] == "complete"][:2]
    selected = list({r["id"]: r for r in selected}.values())
    case_fields = {f.name for f in fields(evaluator.Case)}
    cases = [evaluator.Case(**{k: (tuple(v) if k in {"messages", "categories"} else v)
                              for k, v in r.items() if k in case_fields}) for r in selected]
    all_http = defaultdict(list)
    for item in rows(LIVE / "http.jsonl"):
        all_http[item["case_id"]].append(item)
    consumed, transport_errors = Counter(), []

    def respond(request):
        case_id = evaluator.CURRENT_CASE_ID.get()
        try:
            original = all_http[case_id][consumed[case_id]]
            assert request.url.host == original["host"]
            assert request.url.path == original["path"]
            assert json.loads(request.content) == original["request"]
            consumed[case_id] += 1
            return httpx.Response(original["status"], content=original["response"].encode())
        except Exception as error:
            transport_errors.append({"id": case_id, "type": type(error).__name__})
            raise

    configuration = Parse((LIVE / "models.json").read_text(), protocol.DataPlaneModelConfiguration())
    credentials = {r.credential_ref: "audit-recorded-response-only" for r in configuration.runtimes}
    providers = dynamic_runtime_action_providers(configuration, credentials, transport=httpx.MockTransport(respond))
    replay_folder = output / "recorded-model-replay"
    replay_folder.mkdir()
    replayed = await evaluator.evaluate_cases(cases, read(LIVE / "plan.json")["plan"], replay_folder, 4, providers=providers)
    expected = {r["id"]: scored(r) for r in selected}
    disagreements = []
    for r in replayed:
        original = expected[r["id"]]
        keys = ["decision", "status", "transformed_texts", "findings", "model_invocations"]
        delta = {k: {"frozen": original[k], "replayed": r[k]} for k in keys if original[k] != r[k]}
        if delta:
            disagreements.append({"id": r["id"], "differences": delta})
        assert consumed[r["id"]] == len(all_http[r["id"]])
    assert not transport_errors, transport_errors
    assert not disagreements, disagreements

    old_by_id = {r["id"]: r for r in old}
    local_cases = [c for c in cases if c.id in old_by_id]
    local_folder = output / "frozen-local-replay"
    local_folder.mkdir()
    local_rows = await evaluator.evaluate_cases(local_cases, local, local_folder, 4)
    for result in local_rows:
        original = old_by_id[result["id"]]
        for key in ["decision", "status", "transformed_texts", "findings", "model_invocations"]:
            assert result[key] == original[key], (result["id"], key)
    return {"external_network_calls": 0, "recorded_response_cases": len(replayed),
            "recorded_http_requests": sum(consumed.values()), "recorded_response_disagreements": disagreements,
            "local_cases": len(local_rows), "local_disagreements": 0,
            "current_local_plan_equals_frozen": True,
            "legacy_entrypoint": {"current_default_local_policy_count": len(current_plans["default_local"]["policy_bindings"]),
                                  "frozen_default_local_policy_count": 32, **drift}}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    output = args.output.resolve()
    if output.exists():
        parser.error("Audit output must be a new directory")
    output.mkdir(parents=True)
    provenance = [verify_frozen(folder) for folder in (OLD, JAIL, LIVE)]
    for source in read(OLD / "manifest.json")["sources"]:
        assert sha(OLD.parent / "sources" / source["path"]) == source["sha256"]
    old, content = rows(OLD / "results.jsonl"), rows(LIVE / "content/results.jsonl")
    jailbreak = rows(LIVE / "jailbreak/results.jsonl")
    verify_cases(rows(OLD / "cases.jsonl"), old)
    verify_cases(rows(LIVE / "content/cases.jsonl"), content)
    verify_cases(rows(LIVE / "jailbreak/cases.jsonl"), jailbreak)
    assert rows(OLD / "cases.jsonl") == rows(LIVE / "content/cases.jsonl")
    from scripts import evaluate_default_public as evaluator
    from scripts import evaluate_jailbreak_public as legacy
    from dataclasses import asdict

    legacy.verify_sources(JAIL.parent / "sources")
    regenerated = evaluator.load_cases(evaluator.DEFAULT_SOURCES)[0] + evaluator.diagnostic_cases()
    assert [asdict(c) for c in regenerated] == [
        {**c, "categories": tuple(c["categories"]), "messages": tuple(c["messages"])}
        for c in rows(OLD / "cases.jsonl")]
    stored_summary = read(OLD / "summary.json")
    public_old = [r for r in old if r["source"] != "diagnostic"]
    recomputed = evaluator.summarize(public_old)
    assert all(recomputed[k] == v for k, v in stored_summary["public"].items())
    old_jail = rows(JAIL / "results.jsonl")
    assert legacy.summarize(old_jail) == read(JAIL / "summary.json")
    for r in old_jail:
        assert legacy.measurement_outcome(r, r) == r["measurement_outcome"]
        assert not r.get("runtime_error") and r["usage"]["model_invocations"] == 0
    samples = {r["sample_id"]: r for r in rows(JAIL / "samples.jsonl")}
    assert len(samples) == 1752
    for r in old_jail:
        assert hashlib.sha256(samples[r["sample_id"]]["text"].encode()).hexdigest() == r["text_sha256"]
    for r in old:
        assert r["status"] == "complete" and r["model_invocations"] == 0 and r["fail_closed"] is False

    plans = {"content_local": read(OLD / "plan.json")["plan"],
             **read(JAIL / "plans.json"), "live_models": read(LIVE / "plan.json")["plan"],
             "goal_local": read(GOAL / "plan.json")["plan"]}
    assert plans["content_local"] == plans["default_local"] == plans["goal_local"]
    write(output / "policy-inventory.json", {k: inventory(p) for k, p in plans.items()})
    old_files = read(OLD / "manifest.json")["implementation"]["files"]
    live_files = read(LIVE / "manifest.json")["implementation"]["files"]
    runtime_files = {k: v for k, v in old_files.items() if k.startswith(("runner/", "policies/"))}
    assert runtime_files == {k: v for k, v in live_files.items() if k.startswith(("runner/", "policies/"))}
    current_drift = [name for name, expected in runtime_files.items() if sha(ROOT / name) != expected]

    new_by_id = {r["id"]: scored(r) for r in content}
    misses = []
    for line, r in enumerate(old, 1):
        if r["source"] == "diagnostic" or r["expected"] != "block_reference" or r["decision"] == "block":
            continue
        n = new_by_id[r["id"]]
        misses.append({"id": r["id"], "source": r["source"], "phase": r["phase"],
            "old_decision": r["decision"], "new_decision": n["decision"], "new_score_status": n["status"],
            "old_mechanism": "transform_residual_unjudged" if r["decision"] == "transform"
                else "observation_only_match" if r["findings"] else "no_local_match",
            "old_findings": r["findings"], "new_findings": n["findings"],
            "text_sha256": r["text_sha256"], "history_messages": len(r["messages"]),
            "evidence": {"file": str((OLD / "results.jsonl").relative_to(ROOT)), "line": line}})
    jsonl(output / "old-reference-nonblocks.jsonl", misses)
    unresolved = [{**r, "status": scored(r)["status"]} for r in content
                  if r["source"] != "diagnostic" and r["expected"] == "block_reference"
                  and scored(r)["status"] == "complete" and r["decision"] != "block"]
    jsonl(output / "model-reference-nonblocks.jsonl", unresolved)
    review_path = Path(__file__).with_name("audit_default_test_chain_review.json")
    review = read(review_path)
    assert set(review["cases"]) == {r["id"] for r in unresolved}
    qualitative = [{"id": r["id"], "triage": review["cases"][r["id"]][0],
                    "note": review["cases"][r["id"]][1], "source_label": r["label"],
                    "expected": r["expected"], "decision": r["decision"],
                    "text_sha256": r["text_sha256"], "history_messages": len(r["messages"]),
                    "semantic_residual_score": None} for r in unresolved]
    jsonl(output / "qualitative-case-review.jsonl", qualitative)
    raw_unknowns = [r["id"] for r in content + jailbreak if scored(r)["status"] != r["status"]]
    anomalies = [{"id": r["id"], "runtime_status": r["status"], "score_status": scored(r)["status"],
                  "decision": r["decision"], "expected": r["expected"], "reason": r["reason"],
                  "error_types": r["error_types"]} for r in content + jailbreak
                 if scored(r)["status"] != "complete"]
    jsonl(output / "execution-and-scoring-anomalies.jsonl", anomalies)
    goals = rows(GOAL / "results.jsonl")
    goal_summary = read(GOAL / "summary.json")
    for name, group in goal_summary["groups"].items():
        rs = [r for r in goals if r["source"] == name]
        assert len(rs) == group["attempted"]
        assert Counter(r["decision"] for r in rs) == Counter(group["decisions"])
    fixtures = {}
    for name in ["scenarios-public-run-v1", "scenarios-contract-run-v2"]:
        folder = ROOT / "output/evaluation-catalog" / name
        run, summary = read(folder / "run.json"), read(folder / "summary.json")
        assert sha(folder / "results.jsonl") == summary["results_sha256"]
        assert summary["external_model_calls"] == 0
        assert all(g["asr"] is None for g in summary["groups"].values())
        fixtures[name] = {"target": run["target"], "judge": run["judge"], "guard": run["guard"],
                          "records": summary["completed_records"], "external_model_calls": 0, "asr": None}
    http = audit_http(content, jailbreak, output)
    probes = asyncio.run(offline_probes(output, old, content, jailbreak))
    public_new = [scored(r) for r in content if r["source"] != "diagnostic"]
    model_configuration = read(LIVE / "models.json")
    summary = {"audited_at": datetime.now(timezone.utc).isoformat(), "auditor_sha256": sha(Path(__file__)),
        "frozen_provenance": provenance, "source_runtime_files": len(runtime_files),
        "current_runtime_drift": current_drift, "old_public": metrics(public_old), "model_public": metrics(public_new),
        "model_public_raw_status": metrics([r for r in content if r["source"] != "diagnostic"]),
        "models": [{k: v for k, v in runtime.items()
                    if k in {"id", "model", "profileRef", "baseUrl", "maxTokens", "timeoutSeconds"}}
                   for runtime in model_configuration["runtimes"]],
        "model_bindings": model_configuration["bindings"],
        "qualitative_review": {"method": review["method"], "annotation_sha256": sha(review_path),
                               "counts": dict(Counter(r["triage"] for r in qualitative))},
        "old_nonblocks": len(misses), "old_nonblock_mechanisms": dict(Counter(r["old_mechanism"] for r in misses)),
        "old_nonblock_transitions": dict(Counter(f"{r['new_score_status']}:{r['new_decision']}" for r in misses)),
        "raw_complete_unknown_ids": raw_unknowns, "http": http, "offline_probes": probes,
        "goal_local": {k: metrics([r for r in goals if r["source"] == k]) for k in sorted({r["source"] for r in goals})},
        "scenario_fixtures": fixtures,
        "limits": ["No fresh inference or independent semantic judge; reference labels are unchanged.",
                   "Historical runs exercise draft previews, not the published Endpoint/Gateway path.",
                   "Screenshot-only PII, DBS Secrets, PromptInject and Deepset scores have no identified run here."]}
    write(output / "summary.json", summary)
    write(output / "checksums.json", {str(p.relative_to(output)): sha(p) for p in sorted(output.rglob("*"))
                                      if p.is_file() and p.name != "checksums.json"})
    print(json.dumps({"output": str(output), "old_nonblocks": len(misses), "http_requests": http["requests"],
                      "offline_probes": probes}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
