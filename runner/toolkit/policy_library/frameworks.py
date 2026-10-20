from __future__ import annotations

from ..policy_runtime.domain import PolicyTag


OWASP_LLM_2025_FRAMEWORK_ID = "owasp-llm-2025"
OWASP_LLM_2025_FRAMEWORK_LABEL = "OWASP LLM 2025"

# Phase-one discovery mapping. These Policies provide a direct runtime control
# or a scoped compensating control for at least one OWASP Top 10 for LLM
# Applications 2025 risk. The framework tag is intentionally Policy-level: it
# helps users discover candidates without implying that every Rule in a Policy
# covers every OWASP risk.
OWASP_LLM_2025_POLICY_IDS = frozenset(['builtin-indirect-prompt-injection', 'builtin-memory-poisoning', 'builtin-jailbreak', 'builtin-pii', 'builtin-contextual-grounding', 'builtin-automated-reasoning', 'local-injection-protection', 'local-credentials', 'local-payment-data', 'local-government-identifiers', 'local-contact-data', 'local-passports', 'local-data-use-boundaries', 'local-fraud-prevention', 'block-code-execution'])


def framework_tags_for_policy(policy_id: str) -> tuple[PolicyTag, ...]:
    """Return centrally reviewed framework-discovery tags for one Policy."""

    if policy_id not in OWASP_LLM_2025_POLICY_IDS:
        return ()
    return (
        PolicyTag(
            namespace="framework",
            value=OWASP_LLM_2025_FRAMEWORK_ID,
            label=OWASP_LLM_2025_FRAMEWORK_LABEL,
            source="declared",
        ),
    )
