#!/usr/bin/env python3
"""Replay frozen P0 evidence offline; preserve inputs and compare every outcome.

Run with the archived implementation on PYTHONPATH/the script's repository root.
--evidence-root names the original repository containing immutable run artifacts.
All output must go to a fresh directory. Model responses are recordings, not new
inference. The shared scorer changes accounting, never reference labels.
"""
from __future__ import annotations

import argparse
import ast
import asyncio
from collections import Counter, defaultdict
from concurrent.futures import ProcessPoolExecutor
from dataclasses import asdict, fields
import hashlib
import json
import multiprocessing
from pathlib import Path
import shutil
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts import evaluate_default_public as content
from scripts import evaluate_jailbreak_public as jailbreak
from scripts import evaluate_security_benchmarks as goals
from scripts.evaluation_contract import normalize, summarize_actions, target_identity


def read(path): return json.loads(path.read_text())
def rows(path): return [json.loads(line) for line in path.read_text().splitlines()]
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def write(path, value): path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def cases(records):
    names = {f.name for f in fields(content.Case)}
    return [content.Case(**{k: tuple(v) if k in {"messages", "categories"} else v
                            for k, v in row.items() if k in names}) for row in records]


def legacy_score(records):
    """Pre-P0 accounting: trusts raw complete, including unknown blocks."""
    valid = [r for r in records if r.get("status", "complete") == "complete" and not r.get("runtime_error")]
    risk = [r for r in valid if r["expected"] == "block_reference"]
    return {"attempted": len(records), "completed": len(valid),
            "execution_errors": sum(r.get("status") == "execution_error" or bool(r.get("runtime_error")) for r in records),
            "indeterminate": sum(r.get("status") == "indeterminate" for r in records),
            "block_reference_n": len(risk), "blocked_reference": sum(r["decision"] == "block" for r in risk),
            "missed_allow": sum(r["decision"] == "allow" for r in risk),
            "unresolved_transforms": sum(r["decision"] == "transform" for r in risk)}


def paired(before, after, *, identity="id"):
    # Dataclass asdict retains tuples; archived JSON stores the same sequences
    # as arrays. Compare serialized evidence, without rewriting its semantics.
    after = json.loads(json.dumps(after))
    before = json.loads(json.dumps(before))
    if identity == "key":
        before = [{**r, "key": tuple(r["key"])} for r in before]
        after = [{**r, "key": tuple(r["key"])} for r in after]
    original = {r[identity]: r for r in before}
    assert len(original) == len(before) == len(after)
    assert set(original) == {r[identity] for r in after}
    differences, statuses = [], []
    for result in after:
        old = original[result[identity]]
        for key in ("decision", "transformed_texts", "findings", "text_sha256", "history_sha256"):
            if old.get(key) != result.get(key):
                differences.append({"id": result[identity], "field": key})
        def calls(r): return r.get("model_invocations", (r.get("usage") or {}).get("model_invocations", 0))
        if calls(old) != calls(result): differences.append({"id": result[identity], "field": "model_invocations"})
        if old.get("status", "complete") != result["status"]:
            statuses.append({"id": result[identity], "before": old.get("status", "complete"), "after": result["status"]})
        assert normalize(old)["status"] == result["status"], result[identity]
    assert not differences, differences[:10]
    return {"evaluations": len(after), "decision_or_evidence_differences": differences, "scoring_status_changes": statuses}


def execute_shard(kind, records, plan, folder, model_configuration, recordings):
    """Independent processes keep CPU-heavy local scans from serializing a batch."""
    if kind == "jailbreak":
        return asyncio.run(jailbreak.evaluate(records, plan, folder)), {}
    providers = None
    consumed, transport_errors = Counter(), []
    if model_configuration is not None:
        import httpx
        from google.protobuf.json_format import Parse
        from runner import generated as protocol
        from runner.providers import dynamic_runtime_action_providers
        def respond(request):
            identity = content.CURRENT_CASE_ID.get()
            try:
                recorded = recordings[identity][consumed[identity]]
                assert (request.url.host, request.url.path, json.loads(request.content)) == (recorded["host"], recorded["path"], recorded["request"])
                consumed[identity] += 1
                return httpx.Response(recorded["status"], content=recorded["response"].encode())
            except Exception as error:
                transport_errors.append({"id": identity, "type": type(error).__name__})
                raise
        configuration = Parse(model_configuration, protocol.DataPlaneModelConfiguration())
        providers = dynamic_runtime_action_providers(configuration,
            {r.credential_ref: "recorded-response-only" for r in configuration.runtimes}, transport=httpx.MockTransport(respond))
    result = asyncio.run(content.evaluate_cases(cases(records), plan, folder, 1, providers=providers))
    assert not transport_errors, transport_errors
    assert {k: len(v) for k, v in recordings.items()} == dict(consumed)
    return result, dict(consumed)


async def replay_shards(kind, records, plan, folder, workers, *, model_configuration=None, recordings=None, reuse=None):
    prior = reuse / folder.name if reuse is not None else None
    if prior is not None and (prior / "results.jsonl").exists() and model_configuration is None:
        result = rows(prior / "results.jsonl")
        if kind == "jailbreak":
            expected = {(v, r["sample_id"]) for v in plan for r in records}
            actual = {(r["variant"], r["sample_id"]) for r in result}
        else:
            expected = {r["id"] for r in records}
            actual = {r["id"] for r in result}
        assert actual == expected and len(result) == len(expected), "Only complete execution groups may be reused"
        for path in prior.iterdir():
            if path.name.startswith(("results", "shard-", "preparation-")):
                if path.is_dir(): shutil.copytree(path, folder / path.name)
                else: shutil.copy2(path, folder / path.name)
        write(folder / "reuse.json", {"from": str(prior), "results_sha256": sha(prior / "results.jsonl"),
                                      "validated": ["execution_harness", "detector_sources", "historical_inputs", "complete_case_identities"]})
        print(f"Reusing {len(result)} completed {folder.name} executions; rescoring and comparing again", flush=True)
        return result, {}
    recordings = recordings or {}
    futures = []
    with ProcessPoolExecutor(max_workers=workers, mp_context=multiprocessing.get_context("spawn")) as pool:
        for index in range(min(workers, len(records))):
            shard = records[index::workers]
            directory = folder / f"shard-{index}"
            directory.mkdir()
            selected_http = {r["id"]: recordings[r["id"]] for r in shard if r.get("id") in recordings}
            futures.append(asyncio.get_running_loop().run_in_executor(pool, execute_shard,
                kind, shard, plan, directory, model_configuration, selected_http))
        completed = await asyncio.gather(*futures)
    results = [r for result, _ in completed for r in result]
    consumed = {k: v for _, counts in completed for k, v in counts.items()}
    results.sort(key=lambda r: (r.get("variant", ""), r.get("id", r.get("sample_id"))))
    (folder / "results.jsonl").write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in results))
    return results, consumed


async def run(evidence, output, workers, reuse=None):
    old = evidence / "output/default-public-evaluation/baseline"
    jail = evidence / "output/jailbreak-public-evaluation/baseline"
    live = evidence / "output/default-public-evaluation/live-20261019"
    goal = evidence / "output/evaluation-catalog/local-goal-replay-v1"
    roots = [old, jail, live, goal]
    historical = {str(p): sha(p) for base in roots for p in base.rglob("*") if p.is_file()}
    if reuse is not None:
        previous = read(reuse / "provenance.json")
        assert previous["historical_files_before"] == historical, "Frozen inputs changed since the reused execution"
        for name, expected in previous["harness_files"].items():
            if name != "scripts/verify_default_p0.py":
                assert sha(ROOT / name) == expected, ("Execution/scoring harness changed", name)
    for base in roots[:3]:
        for name, expected in read(base / "checksums.json").items():
            assert sha(base / name) == expected, (base, name)
    # Check exact executed detector sources against the model-era archive. Old
    # local and model runs shared these sources; harness changes are separate.
    implementation = read(live / "manifest.json")["implementation"]["files"]
    detector = {n: h for n, h in implementation.items() if n.startswith(("runner/", "policies/"))}
    for name, expected in detector.items(): assert sha(ROOT / name) == expected, name
    # The original content snapshot omitted .yml assets. Recover them from the
    # frozen jailbreak archive and verify those bytes explicitly as well.
    jail_sources = read(jail / "source-code-manifest.json")
    supplemental = {n: h for n, h in jail_sources.items() if n.startswith(("runner/", "policies/")) and n not in detector}
    for name, expected in supplemental.items(): assert sha(ROOT / name) == expected, name
    execution_files = {str(p.relative_to(ROOT)): sha(p) for base in ("runner", "policies", "controller/server", "controller/shared", "scripts", "tests")
        for p in (ROOT / base).rglob("*") if p.is_file() and p.suffix in {".py", ".ts", ".json", ".co", ".yaml", ".yml"}}
    with zipfile.ZipFile(output / "implementation.zip", "w", zipfile.ZIP_DEFLATED) as archive:
        for name, expected in execution_files.items():
            raw = (ROOT / name).read_bytes()
            assert hashlib.sha256(raw).hexdigest() == expected
            archive.writestr(name, raw)
    write(output / "provenance.json", {"evidence_root": str(evidence), "execution_root": str(ROOT),
        "historical_files_before": historical, "detector_files": detector,
        "supplemental_frozen_assets": supplemental, "execution_files": execution_files,
        "harness_files": {str(p.relative_to(ROOT)): sha(p) for p in
            [Path(__file__), ROOT / "scripts/evaluation_contract.py", Path(content.__file__), Path(jailbreak.__file__), Path(goals.__file__)]}})

    # Reproduce the original entrypoint drift on the frozen 34-policy catalog.
    with zipfile.ZipFile(jail / "implementation.zip") as archive:
        tree = ast.parse(archive.read("scripts/evaluate_jailbreak_public.py").decode())
    original_js = next(ast.literal_eval(n.value) for n in tree.body if isinstance(n, ast.Assign)
                       and any(isinstance(t, ast.Name) and t.id == "PLAN_JS" for t in n.targets))
    old_plans = json.loads(subprocess.check_output(["node", "--import", "tsx", "--input-type=module", "-e", original_js], cwd=ROOT / "controller", text=True))
    from runner.compiler import DefaultRunnerCompiler
    from runner.toolkit.compiler.domain import PlanCompilationError
    from runner.draft_preview import DraftPreviewRuntime
    from runner.toolkit.nemo.action_registry import action_providers
    from runner.toolkit.nemo.actions import local_action_providers
    runtime = DraftPreviewRuntime(DefaultRunnerCompiler(), action_providers(*local_action_providers()))
    try:
        plan = old_plans["default_local"]
        await runtime.prepare(preview_id="p0-old-entry", guardrail_id=plan["guardrail_id"], draft_revision=1,
                              candidate_version=plan["guardrail_version"], plan=plan, runtime_profile="auto")
        raise AssertionError("Expected the old local-only entry to reject model Default")
    except PlanCompilationError as error:
        entry_before = {"policy_count": len(plan["policy_bindings"]), "prepare": "rejected", "error_type": type(error).__name__}
    finally:
        await runtime.shutdown()

    plan_path = old / "plan.json"
    built = content.build_default_plan(local_components_only=True, frozen_plan=plan_path, snapshot_sha256=sha(plan_path))
    folder = output / "local-content"
    folder.mkdir()
    (folder / "cases.jsonl").write_bytes((old / "cases.jsonl").read_bytes())
    write(folder / "target.json", target_identity({"default": built["plan"]}, scope="frozen_snapshot", snapshot_sha256=sha(plan_path), local_only=True))
    before = rows(old / "results.jsonl")
    after, _ = await replay_shards("content", rows(folder / "cases.jsonl"), built["plan"], folder, workers, reuse=reuse)
    local_report = paired(before, after)
    local_report.update(before=legacy_score([r for r in before if r["source"] != "diagnostic"]),
                        after=summarize_actions([r for r in after if r["source"] != "diagnostic"],
                            expected_cases=[r for r in rows(folder / "cases.jsonl") if r["source"] != "diagnostic"]))
    write(folder / "comparison.json", local_report)

    folder = output / "local-jailbreak"
    folder.mkdir()
    plans = jailbreak.build_plans(frozen_plans=jail / "plans.json", snapshot_sha256=sha(jail / "plans.json"))
    assert jailbreak.build_plans() == plans
    write(folder / "target.json", target_identity(plans, scope="frozen_snapshot", snapshot_sha256=sha(jail / "plans.json"), local_only=True))
    (folder / "samples.jsonl").write_bytes((jail / "samples.jsonl").read_bytes())
    samples = rows(folder / "samples.jsonl")
    after, _ = await replay_shards("jailbreak", samples, plans, folder, workers, reuse=reuse)
    before = rows(jail / "results.jsonl")
    jail_report = paired([{**r, "key": (r["variant"], r["sample_id"])} for r in before],
                         [{**r, "key": (r["variant"], r["sample_id"])} for r in after], identity="key")
    jail_report.update(entry_before=entry_before, entry_after={"policy_count": len(plans["default_local"]["policy_bindings"]), "prepare": "success"})
    summaries = jailbreak.summarize(after, samples=samples, variants=list(plans))
    write(folder / "summary.json", summaries)
    # Every legacy metric is preserved for the historical error-free local run.
    lookup = {(r["variant"], r["dataset"], r["split"], r["category"]): r for r in summaries}
    for row in read(jail / "summary.json"):
        new = lookup[(row["variant"], row["dataset"], row["split"], row["category"])]
        assert all(new[k] == v for k, v in row.items() if not k.startswith("latency_")), row
    write(folder / "comparison.json", jail_report)

    folder = output / "local-goals"
    folder.mkdir()
    before = rows(goal / "results.jsonl")
    after, _ = await replay_shards("content", before, read(goal / "plan.json")["plan"], folder, workers, reuse=reuse)
    names = {f.name for f in fields(goals.Sample)}
    selected_ids = {r["id"] for r in before}
    selected = [goals.Sample(**{k: v for k, v in r.items() if k in names}) for r in rows(goal / "samples.jsonl") if r["id"] in selected_ids]
    goal_report = paired(before, after)
    goal_report.update(before=read(goal / "summary.json")["groups"], after=goals.score_results(selected, after)["groups"])
    write(folder / "comparison.json", goal_report)

    recordings = defaultdict(list)
    for recording in rows(live / "http.jsonl"): recordings[recording["case_id"]].append(recording)
    before = rows(live / "content/results.jsonl") + rows(live / "jailbreak/results.jsonl")
    frozen = rows(live / "content/cases.jsonl") + rows(live / "jailbreak/cases.jsonl")
    folder = output / "recorded-model"
    folder.mkdir()
    write(folder / "target.json", target_identity({"default": read(live / "plan.json")["plan"]}, scope="frozen_recorded_responses",
        snapshot_sha256=sha(live / "plan.json"), models={"configuration_sha256": sha(live / "models.json"), "configuration": read(live / "models.json")}))
    after, consumed = await replay_shards("content", frozen, read(live / "plan.json")["plan"], folder, workers,
        model_configuration=(live / "models.json").read_text(), recordings=recordings)
    assert {k: len(v) for k, v in recordings.items()} == dict(consumed)
    model_report = paired(before, after)
    model_report.update(external_network_calls=0, recorded_requests=sum(consumed.values()), groups={})
    content_ids = {c["id"] for c in rows(live / "content/cases.jsonl") if c["source"] != "diagnostic"}
    jailbreak_ids = {c["id"] for c in rows(live / "jailbreak/cases.jsonl")}
    for name, ids in (("content_public", content_ids), ("jailbreak", jailbreak_ids)):
        model_report["groups"][name] = {"before": legacy_score([r for r in before if r["id"] in ids]),
            "after": summarize_actions([r for r in after if r["id"] in ids], expected_cases=[c for c in frozen if c["id"] in ids])}
    write(folder / "comparison.json", model_report)
    assert historical == {str(p): sha(p) for base in roots for p in base.rglob("*") if p.is_file()}
    for name, expected in detector.items(): assert sha(ROOT / name) == expected, name
    report = {"historical_files_unchanged": len(historical), "frozen_detector_files_verified": len(detector),
              "supplemental_frozen_assets_verified": len(supplemental),
              "external_network_calls": 0, "local_content": local_report, "local_jailbreak": jail_report,
              "local_goals": goal_report, "recorded_model": model_report}
    write(output / "comparison.json", report)
    write(output / "checksums.json", {str(p.relative_to(output)): sha(p) for p in output.rglob("*") if p.is_file() and p.name != "checksums.json"})
    print(json.dumps({"output": str(output), "verified_evaluations": sum(r["evaluations"] for r in
        (local_report, jail_report, goal_report, model_report)), "historical_files_unchanged": len(historical)}, ensure_ascii=False), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--evidence-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--workers", type=int, choices=range(1, 9), default=4)
    parser.add_argument("--reuse-executions", type=Path, help="Reuse complete local groups only after source/input identity checks; model replay is always fresh.")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=False)
    asyncio.run(run(args.evidence_root.resolve(), args.output.resolve(), args.workers,
                    args.reuse_executions.resolve() if args.reuse_executions else None))


if __name__ == "__main__": main()
