# Manifest Lineage Explorer And Reuse Decision Tracer Contract

## Purpose
This contract closes the gap between manifest-local lineage truth and request-time branch-selection
narration. `RunManifest.manifest_branch_decision{...}` remains the selected manifest's frozen
lineage snapshot, but it cannot by itself explain later bundle-return or same-manifest pre-start
reuse outcomes because those paths intentionally do not rewrite the selected manifest's persisted
`continuation_basis`.

`ManifestLineageTrace` is therefore the authoritative branch-selection explorer artifact emitted for
every manifest-branch invocation. It records the request identity inputs, selected branch action,
selected manifest lineage snapshot, every considered candidate branch with typed rejection reasons,
mirror-parity state, nightly predecessor context, and the audit/span refs that narrate the choice.

## Contract Boundary
`ManifestLineageTrace` SHALL be persisted whenever orchestration compares a request against prior
manifests, regardless of whether the outcome:

- allocates a new manifest
- returns an existing terminal decision bundle
- reuses a sealed pre-start manifest
- allocates a replay child
- allocates a recovery child
- allocates an ordinary continuation child
- allocates a materially new-request child

The selected manifest SHALL retain append-only `manifest_lineage_trace_refs[]` so operator tooling,
audit, and product surfaces can follow explicit links instead of reconstructing the decision from
adjacent manifests or stale scheduler memory.

## Paired Truth Model
- `ManifestBranchDecisionContract` is the manifest-local lineage snapshot embedded on `RunManifest`.
  It freezes the selected manifest's own lineage basis.
- `ManifestLineageTrace` is the request-time explorer artifact emitted for every branch-selection
  invocation. It freezes the selected branch action, candidate evaluations, mirror parity, nightly
  predecessor context, and audit/span linkage.

The two artifacts serve different purposes and SHALL NOT be collapsed:

- `manifest_branch_decision.branch_action` on `RunManifest` SHALL continue to mirror the manifest's
  persisted `continuation_basis`
- `ManifestLineageTrace.selected_branch_action` SHALL record the actual request-time branch outcome,
  including `RETURN_EXISTING_BUNDLE` and `REUSE_SEALED_MANIFEST`

## Explorer Payload
Each `ManifestLineageTrace` SHALL serialize:

- the exact branch inputs: `idempotency_key`, `request_identity_hash`, `access_binding_hash`,
  `requested_scope[]`, `effective_scope[]`, `mode`, `run_kind`, `replay_class_or_null`, and
  `nightly_window_key_or_null`
- the selected branch outcome: `selected_branch_action`, `selected_branch_reason_code`, selected
  manifest id, selected manifest continuation basis, generation, and selected lineage refs
- the prior-manifest comparison anchor: prior manifest id, prior manifest hash at decision time, and
  prior lifecycle state
- full `candidate_evaluations[]` coverage for every branch action, with exactly one `SELECTED`
  candidate and typed `disqualifier_reason_codes[]` for every rejected candidate
- explicit `mirror_consistency_state` plus `mirror_sources[]` so tooling can see whether top-level
  lineage fields, `continuation_set{...}`, `manifest_branch_decision{...}`, and
  `frozen_execution_binding{...}` stayed in sync
- nightly predecessor context: predecessor batch ref, predecessor manifest id/hash, and typed
  nightly context reason
- audit and span refs that narrate the branch

## Candidate Evaluation Law
`candidate_evaluations[]` SHALL be exhaustive over the canonical branch vocabulary:

- `NEW_MANIFEST`
- `RETURN_EXISTING_BUNDLE`
- `REUSE_SEALED_MANIFEST`
- `REPLAY_CHILD`
- `RECOVERY_CHILD`
- `CONTINUATION_CHILD`
- `NEW_REQUEST_CHILD`

Each rejected candidate SHALL carry explicit disqualifier codes rather than relying on negative
inference from the selected branch. At minimum, the system SHALL surface typed rejection for scope,
access-binding, replay-class, nightly-window, inheritance-mode, parent-hash, lifecycle-state, and
decision-bundle availability mismatches where applicable.

## Mirror Parity Law
The lineage explorer SHALL make selected-manifest mirror parity replay-safe:

- `RunManifest` top-level lineage mirrors
- `continuation_set{...}`
- `manifest_branch_decision{...}`
- `frozen_execution_binding{...}` when the selected manifest is frozen

If those mirrors diverge, the explorer SHALL fail closed rather than choosing one representation as
ambient truth.

## Nightly Context Law
For `run_kind = NIGHTLY`, the explorer SHALL preserve `nightly_window_key_or_null` and explicit
predecessor context. Same-window reuse and later-window continuation SHALL remain distinguishable:

- same-window reuse SHALL remain typed as same-window reuse
- later-window continuation SHALL preserve predecessor batch and predecessor manifest linkage
- missing nightly predecessor context on a continuation path SHALL fail closed

## Operator Tooling Law
Operator or UI surfaces SHALL render manifest lineage from persisted `ManifestLineageTrace` plus the
selected manifest's own explicit refs. They SHALL NOT rebuild branch meaning by diffing nearby
manifests, walking sibling rows heuristically, or inferring nightly predecessors from timestamps
alone.

## Conformance Requirements
The validator suite SHALL reject at minimum:

- traces that omit any canonical branch candidate
- traces whose selected candidate does not match `selected_branch_action`
- rejected candidates without typed disqualifier codes
- traces whose selected lineage snapshot widens executable scope or drops branch inputs
- traces that lose nightly predecessor context for nightly continuation
- selected-manifest links without append-only `manifest_lineage_trace_refs[]`
- spans or audit events that narrate reuse/continuation but do not carry a durable
  `manifest_lineage_trace_ref`
