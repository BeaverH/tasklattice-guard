# Model Configuration

The Default Guardrail runs locally without a detection-model setup. Configure
models when your selected Policies require model-backed checks. Provider
connectivity, model callability, and assignment to a protection check are
separate steps.

## Providers, Models, and Guardrail Catalog

The Helm install command does not read model configuration or credentials from
`.env` and does not create Provider Secrets. Runtime model configuration has four
separate UI owners:

| Settings page | Responsibility |
| --- | --- |
| Health | Global Controller, baseline Guardrail, Runner convergence, and active model-binding readiness |
| Providers | Endpoint, encrypted credential, discovery, connectivity, and Provider-scoped TLS policy |
| Models | Registered inventory plus one real callability check per physical model |
| Guardrail Catalog | Rail-specific model assignment, behavioral validation, Save, and activation |

A callable model is not automatically used by a Rail. The active Guardrail
Catalog revision maps a stable binding such as `content_safety.input`,
`content_safety.output`, or `jailbreak.input` to one registered model. One model
may serve multiple bindings when its explicit protocol profile supports each
contract. Input and Output assignments remain independent.

DeepSeek Providers are control-plane-only. Controller rejects DeepSeek as a
Data Plane assignment and projects only models referenced by active Data Plane
bindings—and only their credentials—to Runner. Data Plane Rails must use a
purpose-built or bounded low-parameter model. This boundary is enforced by the
API and desired-state protocol, not only by filtering a browser dropdown.

The current executable Rail surface is Input and Output. Retrieval, Dialog, and
Execution are reserved manifest values for later expansion; adding them extends
the shared binding manifest without changing Provider, Model, Policy, or
Guardrail ownership.

## Dedicated JailbreakDetect or a chat-based judge

`nvidia/nemoguard-jailbreak-detect` is an additional implementation of the existing
`tali.guard.jailbreak.v1` capability, alongside an OpenAI-compatible chat judge and
Qwen3Guard. It does not add a new scenario, modify Policies, or recompile Guardrail
artifacts when the selected detector changes.

- **NVIDIA hosted:** use the existing NVIDIA NIM Provider
  (`https://integrate.api.nvidia.com/v1`). Discovery includes JailbreakDetect as a
  supported endpoint candidate even when it is absent from the chat catalog.
  Registration makes an actual call; a catalog entry does not prove availability.
  Only this exact public NVIDIA origin is mapped to the official security API.
- **Self-hosted NIM:** register a Provider using its full
  `https://your-nim-host/v1/classify` URL. Discovery checks that classifier directly;
  a Chat Completions or `/models` endpoint is not required. Custom gateway prefixes
  remain intact and never redirect to NVIDIA's public service.
- Register the model in **Models**, then select it for **Jailbreak detection** in
  **Guardrail Catalog → Input**, validate, save, and activate. The protocol is inferred for the
  canonical model ID; deployment aliases can use the existing protocol settings.
  Any chat model that supports OpenAI-compatible Chat Completions can instead use
  the `tali.openai-compatible-jailbreak.v1` profile and must return `SAFE` or
  `JAILBREAK` for the supplied classification prompt.

The dedicated client sends raw user input as `{"input":"..."}` and strictly
checks the native `jailbreak` boolean and finite `[-1, 1]` `score`. It uses the
service's boolean decision, not an invented local threshold. It does not send
chat prompts, model IDs, or generation parameters. **Models → Test call** checks
the response envelope only; **Guardrail Catalog → Validate** runs both benign and
jailbreak smoke samples. These samples do not constitute a comprehensive accuracy
benchmark. Classification errors remain errors and follow the Guardrail's failure
policy; they never become a safe verdict. This detector is input-only.

Tests are separated by architectural ownership: Controller tests cover registration,
endpoint routing, validation, and assignment; Runner tests load the frozen signed
`jailbreak-v1` artifact and exercise both detectors through the real runtime API
without importing the compiler or contacting external model services. Both sides
also test Provider-scoped self-signed TLS behavior.

Protocol references: [NVIDIA hosted classification API](https://docs.api.nvidia.com/nim/reference/nvidia-nemoguard-jailbreak-detect-infer)
and [self-hosted NIM request/response examples](https://docs.nvidia.com/nim/nemoguard-jailbreakdetect/latest/getting-started.html).

## TypeSafe Jev for input Topic Control

Register **TypeSafe AI** under **Settings → Providers** with the API base URL
`https://api.typesafe.ai/v1` and your TypeSafe API key. Click **Choose models** to
select a version directly; `jev-1.13.0` is preselected. Discovery is optional:
**Fetch catalog (optional)** retrieves account aliases without discarding your
selection. Pinned versions may be accepted even when absent from `/models`.
You can select `jev-latest` to follow releases or enter another version/alias
manually. Registration always checks the selected IDs with actual calls, including
when discovery fails. TypeSafe registrations use the
`tali.typesafe-jev-topic.v1` profile, including custom model aliases. The native
transport is `typesafe_systemone`: discovery reads `/models` (`models[].name`),
and evaluation posts `model`, `state`, and typed `questions` to `/systemone`.
Chat generation settings such as `max_tokens` are not sent.

Deploy the Controller and Runner with TypeSafe support together with the UI.
An older Controller rejects `kind: "typesafe"` at request validation, before
contacting TypeSafe; skipping discovery does not bypass that schema incompatibility.
The running Controller's `/api/openapi.json` must include `typesafe` in the Provider
kind enum. Keep the Provider → Model → detector binding structure: credentials and
endpoint belong to the Provider, while the version and evaluator profile belong
to the Model, preserving switching and rollback.

Assign the model to **Guardrail Catalog → Input → Topic Control**, validate the
candidate, save, then activate through the existing revision workflow. Registration
checks callability; binding validation executes actual benign and off-topic samples
through NeMo. The profile supports only `tali.guard.topic-control.semantic.v1`
on input. It does not advertise output, Company Policy, or content safety.
NVIDIA Topic Control and the chat taxonomy judge remain selectable. Switching a
binding uses the existing revision/rollback mechanism. Old artifacts that explicitly
pin a native NVIDIA `topic_control` model still require that native dependency;
republish them with the current Topic Policy (2.0.0) before switching to Jev.

`TopicJudgeActionProvider` retains the stable NeMo action name and delegates to a
`GuardEvaluator`. `JevTopicEvaluator` and the existing `ChatTopicEvaluator` return
the same `EvaluationResult`; rule actions remain owned by the runtime. Jev asks
whether any requested task matches denied topics and, in strict mode, whether any
substantive task falls outside the union of allowed topics. Split allowlist and
denylist rules keep independent questions and their existing ordering. Context
resolves follow-ups; labels and annotation metadata are never sent as model input.

The initial profile uses a lower threshold of **0.1** and an upper threshold of
**0.9**. Any violation probability at or above the upper threshold yields
`matched`; all required probabilities at or below the lower threshold yield
`not_matched`; the remaining cases yield `unknown`. Invalid/missing answers,
authentication failures, rate limits and timeouts yield `error`, never a safe
classification. Calls are bounded by the evaluation deadline and have no automatic
retry. These thresholds are starting points, not calibrated quality guarantees.
The runtime retains its existing handling of `unknown` and failures. Trace evidence
stores question revision, requested/returned model, thresholds and raw probabilities
for all successful evaluations; Noul probabilities are not reported as confidence
or severity scores.

For online observation, use the Guardrail's existing **Monitor** mode: it records
Jev findings and `detection_decision` while forwarding the original input, including
when detection fails. **Monitor applies to the entire Guardrail and still waits for
detection**; it is not background dual-model execution alongside an enforced
incumbent. Use an isolated test Guardrail for that workflow. Bypass skips evaluation,
and explicit Playground/version tests continue to evaluate normally.

For an offline comparison that does not change active assignments, replay the same
annotated JSONL through either evaluator from the repository root:

```sh
# TYPESAFE_API_KEY must already be present in the environment.
.venv/bin/python -m scripts.evaluate_topic_control \
  --samples docs/examples/topic-control-lora/examples.jsonl \
  --provider jev --model jev-1.13.0 --include-proposed \
  --output /tmp/topic-jev.json

# Use your existing model's endpoint, ID and credential environment variable.
.venv/bin/python -m scripts.evaluate_topic_control \
  --samples docs/examples/topic-control-lora/examples.jsonl \
  --provider chat --base-url https://your-provider.example/v1 \
  --model your-topic-model --api-key-env TOPIC_MODEL_API_KEY --max-tokens 512 --include-proposed \
  --output /tmp/topic-current.json
```

Output includes dataset hash, per-sample verdicts, false positives/negatives,
unknowns, errors, latency and model usage. Compare matching sample IDs and dataset
hashes; match the current model's configured timeout and completion budget when
replaying chat models. By default only approved input labels are eligible; output and unresolved
labels are skipped. The bundled synthetic examples require `--include-proposed`
and validate plumbing only. Review real Chinese inputs and policy boundary cases
before treating results as quality evidence. `--lower-threshold` and
`--upper-threshold` support offline threshold experiments; they do not change the
activated profile's defaults. Existing result files are not overwritten.

Protocol references: [TypeSafe API](https://docs.typesafe.ai/api),
[models and aliases](https://docs.typesafe.ai/models),
[Noul semantics](https://docs.typesafe.ai/primitives/noul).

## Provider TLS settings

For a trusted Provider using a private CA or self-signed HTTPS certificate,
enable **Skip TLS certificate verification** under **Settings → Providers**.
The switch appears below the HTTPS Base URL during registration; saved Providers
have a **TLS settings** action. It defaults to off and applies only to that
Provider's discovery, detector validation, and Control Plane/Data Plane model
requests. Enabling it skips certificate-chain and hostname checks, not HTTPS
encryption. Changes are persisted and sent to active Runners; test affected models
again in Models and revalidate their bindings in Guardrail Catalog because previous
connection and validation evidence is cleared.
This does not change Controller–Runner mTLS or other Providers' verification.

For model revision activation and rollback, see
[revision lifecycles](revision-lifecycle.md). API clients should follow
[model-binding validation conventions](api-contract.md#validation-credentials-for-model-bindings).
