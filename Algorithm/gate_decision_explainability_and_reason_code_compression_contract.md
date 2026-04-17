# Gate Decision Explainability And Reason-Code Compression Contract

## Purpose

Gate explainability SHALL be a persisted backend contract, not a UI-side reconstruction problem.
Every gate, trust, and terminal decision artifact therefore binds to one shared
`decision_explainability_contract` so dominant-reason selection, ordered reason emission, compressed
summary reasons, semantic qualifiers, action projection, and bounded plain-language explanation stay
stable across replay, queue projection, workflow reload, and low-noise shell rendering.

## 1. Governing explainability model

`DecisionExplainabilityContract` is the authoritative persisted explainability packet for:

- `GateDecisionRecord`
- `TrustSummary`
- `DecisionBundle`

It freezes:

- one canonical ordered `ordered_reason_codes[]`
- one authoritative `dominant_reason_code`
- one bounded compressed prefix `compressed_reason_codes[]`
- one exact `suppressed_reason_count`
- one canonical ordered `semantic_qualifiers[]`
- one typed `action_projection_state`
- one typed `plain_text_field_name`
- one shared bounded plain-text limit

The contract uses one shared grammar profile and one shared dominant-reason rule:

- `reason_order_policy = DOMINANT_REASON_FIRST_CANONICAL_PRIORITY`
- `dominant_reason_selection_policy = FIRST_ORDERED_REASON_IS_DOMINANT`
- `summary_source_policy = READ_SURFACES_MUST_USE_PERSISTED_FIELDS`
- `compression_policy = PREFIX_COMPRESS_ORDERED_REASON_CODES_WITH_SUPPRESSED_COUNT`

## 2. Compression boundary

Reason-code compression SHALL be deterministic and semantically lossless at the backend contract
layer.

- `compressed_reason_codes[]` SHALL be the canonical prefix of `ordered_reason_codes[]`
- `compression_reason_cap = 3`
- `suppressed_reason_count` SHALL equal the exact remainder beyond that cap
- downstream shells, queues, and workflow reloads SHALL consume the persisted compressed prefix
  instead of replaying the full gate chain or re-sorting reasons from metrics

This closes the failure mode where verbose reason chains displace the safe next action or cause two
clients to choose different summary reasons for the same persisted posture.

## 3. Semantic qualifier disclosure

Generic prose SHALL NOT hide decisive legal distinctions. The shared contract therefore retains
canonical `semantic_qualifiers[]` drawn from:

- `AUTHORITY_STATE`
- `LIMITATION_STATE`
- `OVERRIDE_STATE`
- `ACTIONABILITY_STATE`

The emitting artifact SHALL require the exact qualifiers implied by its persisted posture.

Examples:

- authority-pending, authority-unknown, or authority-rejected decision bundles SHALL disclose
  `AUTHORITY_STATE`
- review-limited, blocked, or threshold-edge trust posture SHALL disclose `LIMITATION_STATE`
- override-governed or override-missing gate posture SHALL disclose `OVERRIDE_STATE`
- action-bearing or no-safe-action terminal bundles SHALL disclose `ACTIONABILITY_STATE`

## 4. Cross-layer binding

The shared contract SHALL be serialized into:

- `GateDecisionRecord.decision_explainability_contract`
- `TrustSummary.decision_explainability_contract`
- `DecisionBundle.decision_explainability_contract`

`DecisionBundle` SHALL also persist top-level `dominant_reason_code`, and
`decision_reason_codes[]` SHALL exactly mirror the compressed prefix from the shared contract.

The parent artifact SHALL remain authoritative:

- parent `reason_codes[]` SHALL exactly mirror `ordered_reason_codes[]`
- parent `dominant_reason_code` SHALL exactly mirror the contract dominant reason
- parent plain text (`plain_explanation`, `plain_summary`, or `plain_reason`) SHALL remain within
  the shared explainability budget

## 5. Eliminated failure modes

This contract closes the following issue class:

- `dominant_reason_code` drifting from the first decisive emitted reason
- `DecisionBundle` consumers re-deriving a dominant reason from `reason_codes[]` order
- compressed summaries choosing different reasons on replay-equivalent inputs
- verbose summaries pushing safe next actions off the primary shell
- trust and gate summaries hiding limitation, override, or authority posture inside generic prose
- queue and shell clients rebuilding explanation from metrics because persisted backend fields were
  incomplete

## 6. Enforcement

Machine enforcement lives in:

- `schemas/decision_explainability_contract.schema.json`
- `schemas/gate_decision_record.schema.json`
- `schemas/trust_summary.schema.json`
- `schemas/decision_bundle.schema.json`
- `scripts/validate_contracts.py`
- `tools/forensic_contract_guard.py`

The validator SHALL reject:

- non-prefix compressed reason lists
- incorrect suppressed-reason counts
- non-canonical semantic qualifier ordering
- parent/contract reason drift
- `DecisionBundle.decision_reason_codes[]` that differ from the canonical compressed reason prefix
- missing authority/limitation/override/actionability qualifiers implied by the persisted posture
