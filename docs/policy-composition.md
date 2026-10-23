# Policy composition and execution

A published Guardrail is an immutable execution plan. New plans use the effective Rule action (Rule override, Policy override, then Rule default) to schedule compiler-owned checks. Existing published artifacts keep their original execution order until a new version is compiled and published.

```text
Input / buffered output
  -> local Block checks (stable order, stop on Block)
  -> independent model Block checks (same text, bounded parallelism)
       any Block -> reject; cancel remaining work
       all pass  -> continue
  -> Transform checks (serial, each sees the preceding output)
  -> Allow observations (cannot bypass another check)
  -> final response
```

## Dependencies and concurrency

- Trigger prerequisites override action priority. A conditional exact/semantic chain stays together. A Transform prerequisite is not moved behind its dependent check.
- Transform order is stable and Transform checks never share a parallel group.
- Independent, unconditional, single-step model checks can share a group. The Runner starts at most four checks per request. This limit is separate from Veritas request concurrency.
- A Block cancels pending group work and prevents later stages. Cancellation is recorded as `cancelled` or `skipped`; it is not a successful check. An upstream service may have already processed or billed a cancelled call, so missing provider usage is not zero cost.
- Timeouts and transport errors retain the configured failure policy; an Allow result cannot override another required check's Block or failure.
- Arbitrary authored Colang flows retain their declared execution order as a conservative dependency barrier. Streaming output checks remain serial. Full-buffered input/output checks support parallel groups.
- NeMo owns flow execution and each existing Action/evaluator still owns its model request, deadline, verdict and evidence. No second evaluation framework is introduced.

## PII and content safety

Block takes precedence over Transform. If PII would redact a request but the content-safety or jailbreak check blocks it, the final decision is Block and no redacted request is released. A content-safety Privacy classification is not silently removed because a narrower PII detector exists. An uncertain jailbreak verdict retains its configured handling and remains distinguishable from an explicit detection.

If all required Block checks pass, PII transformations run sequentially. Later checks consume the current transformed text, while unrelated conversation history and external-content boundaries remain intact. Allow means that a particular check does not object; it is not a global exemption.

Model checks before PII redaction can receive the original text. A deployment requiring redaction before external model processing must express that dependency explicitly or use a local model; action priority alone does not establish a data-egress policy.

## Validation and reporting

Single-Policy acceptance tests and combined final decisions answer different questions. A PII-only test expecting Transform can legitimately produce Block in a composition, but this must remain a visible conflict, not an automatic pass or a relabelled benchmark.

The existing local-only validation option verifies local Rules without model calls, explicitly lists skipped model tests, and publishes the complete model-enabled artifact. It does not certify combined model behavior. Real-target Veritas runs are separate evidence, with unchanged source labels and frozen samples. Report strict scorer Accuracy alongside binary intervention Precision/Recall/F1, new failures, fixes, repeat instability, execution errors and latency. For PII, an arbitrary Block or incomplete redaction must not count as successful full removal when the scorer requires a transformed output.

The progressive combination regression uses four, six and eight benchmark areas against their corresponding single-capability baselines. It is not an exhaustive all-pairs experiment. Baselines with one repetition do not eliminate model randomness as a cause of a changed result.

## Independent offline verification

From the repository root, with the existing Controller dependencies and Python
virtual environment installed, run:

```sh
(cd controller && node node_modules/vitest/vitest.mjs run \
  server/domain/execution-plan.test.ts \
  server/domain/guardrail-plan.test.ts \
  server/domain/validation.test.ts)

.venv/bin/python -m pytest -q \
  tests/control_plane/test_action_composition_matrix.py \
  tests/control_plane/test_ordered_execution.py \
  tests/control_plane/test_parallel_checks.py \
  tests/control_plane/test_catalog_rule_overrides.py \
  tests/control_plane/test_validation_expectations.py \
  tests/control_plane/test_released_version_validation.py
```

These are ordinary test-suite commands, not a deployment or CI workflow. They do
not load credentials or make external model calls. Controller tests verify
effective actions, scheduling, dependencies, and validation assertions. Runner
tests execute real NeMo flows with local detectors or deterministic providers.

`tests/control_plane/test_action_composition_matrix.py` compiles its synthetic
Policies through the real Controller and executes the resulting plans through
NeMo. The expected result is derived independently from the action contract.
The matrix covers all nine two-Rule action sequences and all 27 three-Rule
sequences, including repeated actions. Every sequence is tested with all matching
and nonmatching input combinations, both within one Policy and across Policies,
and in Input and Output: 1,008 scenarios in total. Assertions check executed Rule
order, the current text at each Rule, terminal Block short-circuiting, unchanged
Allow content, complete sequential Transform output, final decision, and finding
identity. Compilation must leave source definitions unchanged.

Companion tests cover overlapping transformations, explicit Rule order, Allow
continuation, missing Transform output, parallel checks and cancellation,
conditional dependencies, custom Colang flow boundaries, invalid parallel plans,
publication expectation safeguards, and replay of an existing released Artifact
without recompilation. These tests do not establish model accuracy or exhaust
every combination of remote failure timing, streaming mode, and authored flow.
The product's publication Validation uses selected Policies' acceptance cases;
it does not automatically generate this complete synthetic matrix for each draft.
