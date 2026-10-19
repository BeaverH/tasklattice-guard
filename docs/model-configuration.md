# Model Configuration

The Default Guardrail requires validated `jailbreak.input`, `content_safety.input`,
and `content_safety.output` model bindings, followed by its local checks. Missing
bindings prevent preparation; model failures fail closed. Provider connectivity,
model callability, assignment to a protection check, and full Default validation
are separate steps. See [Default requirements](guardrail-policies.md).

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

Company Policy uses its own `company_policy.input` binding and the
`tali.guard.company-policy.v1` contract. It does not inherit `topic_control.input`.
Assign a compatible taxonomy judge or NeMoGuard Topic Control model separately;
Jev remains limited to the Topic Control semantic contract. Missing Company
bindings fail preparation instead of falling back to another detector's model.

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

## Generic semantic PII

The `tali.openai-compatible-pii.v1` profile accepts an OpenAI-compatible chat model
for `pii_semantic.input` and `pii_semantic.output`. The adapter asks for one JSON
field, `verdict`, with `pii`, `safe`, or `unknown`. It evaluates the current target
block, treats embedded instructions as data, and validates the response strictly.
Unknown judgments and invalid/provider responses never become positive findings.

PII Protection 1.1.0 first redacts exact identifiers and then checks the remaining
text semantically, including text without identifier keywords. Chinese document
labels alone are not exact PII matches. This also prevents an email match from
skipping a personal name in the same block. A semantic transform replaces the
whole target block with `[PII_REDACTED]`; it does not claim accurate model-generated
character spans. The complete semantic check adds a model call per evaluated
block. Qwen3Guard remains available as an alternative PII profile.

The PII and Company adapters disable optional thinking for hosted NVIDIA
Lightning, as does the Grounding adapter. Other judges retain their validated
reasoning behavior; other model/provider combinations do not receive this option.
Provider rate limits and Guardrail deadlines still apply.

For providers with a small concurrency quota, set the Runner environment variable
`GUARD_VALIDATION_MAX_CONCURRENCY=1` to run test cases sequentially (default: 8).
This changes validation scheduling only, not live traffic admission or detector
timeouts. Report sequential classification results separately from concurrent
availability failures. A blocked request alone is not detection evidence: inspect
the successful model call, detector verdict, and matched Policy/Rule together.

## Global prices and Guardrail usage costs

**Settings → Models → Model prices** manages estimated model costs globally for
one Provider/model pair, shared across all its registered profiles and Guardrails.
This is internal cost accounting, not customer billing.

The bundled catalog derives from LiteLLM's public
[`model_prices_and_context_window.json`](https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json)
and is stored in the repository as `controller/server/catalog/model-prices.json`. The initial
snapshot is version `2026-10-14` with 2,440 supported USD prices. Controller loads
this local snapshot before accepting telemetry, and the production build includes
it. Startup, price lookup and accounting require no external network connection;
there is no scheduled download. The UI shows the loaded version and entry count.
An invalid snapshot retains the last successfully loaded prices. Removed entries
stop applying to new calls; historical revisions remain available.

Administrators can correct an individual model price in **Models → Model prices**
without editing files or restarting. To update the initial catalog for a release,
edit `controller/server/catalog/model-prices.json` (all token rates are USD per million,
request rates USD per thousand), change its `version`, review the diff, and rebuild
or restart Controller. Manual overrides always take precedence. Alternatively,
a maintainer can download the upstream JSON on a connected machine, transfer it,
and run this local-only conversion from `controller/`:

```sh
node --import tsx scripts/update-model-prices.mjs /path/to/model_prices_and_context_window.json 2026-10-14.revision1
```

The generator records the source URL, original file SHA-256 and MIT notice. It
replaces the bundled catalog; review and preserve any intended local corrections.
Never fetch the catalog as part of offline deployment.

Automatic matching requires the provider's actual service hostname and an exact
catalog model key. A custom gateway can explicitly select a LiteLLM catalog entry.
There is no fuzzy match or fallback to another provider's rate. Only supported
standard text token rates are imported; context-length tiers and unsupported
surcharges require manual pricing. Batch, priority and flex rates do not replace
standard synchronous rates.

For unlisted models, administrators can set USD prices per million input,
output and cached input tokens, per thousand calls, or explicitly mark the model
free. Manual rates override LiteLLM and survive catalog updates. Returning to LiteLLM
removes the manual override prospectively. Local deployment costs must be supplied
by the operator; the product does not invent a token price from model size.

The Guardrails list shows **Month cost (USD)** for the current UTC calendar month,
across all versions and runtime/testing calls, with an unaccounted count beside
partial totals. No model calls means USD 0; only unknown calls means Unaccounted.
Click the amount to open **Guardrail → Usage & cost**, which shows call counts, reported token totals, accounted
amounts, unaccounted calls, model breakdowns and daily cost trends. Periods use UTC;
all prices and amounts use USD, with no currency conversion. Runtime
traffic and Guardrail validation/Playground calls can be filtered separately.
Model connection probes and control-plane authoring calls are not attributed to a
Guardrail and are outside these totals. Rules without model calls incur no model
cost. Cost metering is independent of Runtime log capture level.

Token cost = (uncached input tokens × input rate + cached input tokens × cache rate
+ output tokens × output rate) / 1,000,000. Cached tokens are a subset of input;
they are subtracted before pricing the uncached portion. For request pricing,
cost = calls × request rate / 1,000. Missing cache prices do not silently fall
back to an ordinary input price. For example, 1,000 input tokens at USD 0.20/M
and 100 output tokens at USD 0.60/M cost USD 0.00026, without caching.

Each call stores its effective price revision and calculated amount at ingestion.
Pricing changes affect future calls; they do not backfill or reprice history. Missing
prices, missing token usage, unmatched model identity, nonstandard service tiers
or unsupported usage remain **Unaccounted**, never silently zero. Request rates
can account for models that do not report tokens. Failed calls are recorded too;
a token-priced failure without usage remains unaccounted. Amounts are estimates,
not a provider invoice (credits, taxes, discounts and subscription costs are not
inferred). Metering starts with this feature's migration; older Runners without
per-call details report unaccounted usage until upgraded.

Prices and cost records are separate operational tables. They are excluded from
Guardrail version snapshots, release packages and exports, and are never sent to
Runners as Guardrail configuration. Deletion/restoration clears Guardrail cost
records alongside its other operational data; model price revisions remain global.
