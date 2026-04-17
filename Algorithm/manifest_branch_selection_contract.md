# Manifest Branch Selection Contract

## Purpose
This contract is the authoritative branch-selection model for `RunManifest` reuse, return, replay,
recovery, continuation, and fresh-child allocation. Its job is to make one branch decision durable,
typed, and later-auditable so the system never has to infer why a manifest was reused, why a child
was created, or why a terminal result was returned.

## Contract Boundary
Branch selection is governed by paired artifacts:

- `ManifestBranchDecisionContract` is the manifest-local lineage snapshot embedded on
  `RunManifest`. It freezes the selected manifest's own lineage basis.
- `ManifestLineageTrace` is the request-time explorer artifact emitted for every branch-selection
  invocation. It freezes the selected branch action, candidate evaluations, mirror parity, nightly
  predecessor context, and audit/span linkage.

Together they bind:

- exact request identity
- selected branch action
- typed legal reason for that action
- selected manifest lineage
- prior-manifest anchor and hash at decision time

Neither queue behavior, worker retries, read-side projections, nor later lineage repair may
reinterpret that decision after the fact. `ManifestLineageTrace` exists because bundle return and
same-manifest pre-start reuse intentionally do not rewrite the selected manifest's persisted
`continuation_basis`; those request-time outcomes still need first-class durable narration.

## Branch Actions
- `NEW_MANIFEST`: no reusable prior manifest exists for this request identity.
- `RETURN_EXISTING_BUNDLE`: the request is an exact retry against a terminal manifest, so the
  persisted decision bundle is returned.
- `REUSE_SEALED_MANIFEST`: the request is an exact retry against a still-pre-start sealed manifest,
  so the same manifest context is reused.
- `REPLAY_CHILD`: the caller explicitly requested replay and the child must preserve replay lineage.
- `RECOVERY_CHILD`: a started attempt is being recovered under the same attempt lineage.
- `CONTINUATION_CHILD`: a legally distinct post-terminal continuation is required even though the
  request remains in the same lineage family.
- `NEW_REQUEST_CHILD`: the caller changed request identity materially enough that a fresh child
  lineage is required.

## Frozen Identity Inputs
The branch-selection comparison SHALL freeze at minimum:

- `requested_scope[]`
- `effective_scope[]`
- `access_binding_hash`
- `mode`
- `run_kind`
- `replay_class_or_null`
- `nightly_window_key_or_null`
- `selected_manifest_continuation_basis`
- `config_inheritance_mode_or_null`
- `input_inheritance_mode_or_null`
- `request_identity_hash`

`request_identity_hash` is the replay-safe digest of the comparison vector used to decide whether
the request is the same request, the same sealed context, a replay, a recovery, a legal
continuation, or a materially new request.

## Typed Branch Reasons
The contract SHALL also persist one typed `branch_reason_code`:

- `NO_PRIOR_MANIFEST`
- `TERMINAL_IDEMPOTENT_RETRY`
- `PRESTART_SEALED_CONTEXT_REUSE`
- `REPLAY_REQUESTED_EXACT`
- `STARTED_ATTEMPT_RECOVERY`
- `POST_TERMINAL_CONTINUATION_REQUIRED`
- `REQUEST_IDENTITY_CHANGED`
- `NIGHTLY_WINDOW_ADVANCED`

The reason code is not optional explanation copy. It is the machine-checked legal basis for the
chosen branch and SHALL align with `branch_action`.

## Continuation Truth
`prior_manifest_id_or_null` and `prior_manifest_hash_at_decision_or_null` are the authoritative
comparison anchor. When a child is created, they SHALL identify the exact parent manifest and its
sealed manifest hash at the branch moment. Read-side lineage mirrors may accelerate reads, but they
shall not replace this decision artifact as branch truth.

## Explorer Truth
`ManifestLineageTrace` SHALL make the request-time branch explainable without dereferencing adjacent
manifests heuristically. It SHALL serialize:

- `selected_branch_action` and `selected_branch_reason_code`
- the selected manifest's persisted continuation basis and selected lineage refs
- exhaustive `candidate_evaluations[]` with typed disqualifier reason codes
- `mirror_consistency_state` plus the exact mirror sources checked
- nightly predecessor batch and manifest context where applicable
- explicit audit and trace refs for the branch narrative

Operator tooling SHALL render reuse and continuation from `ManifestLineageTrace` plus the selected
manifest's own explicit refs, not by diffing nearby manifest rows or inferring predecessor meaning
from timestamps alone.

## Conformance Requirements
The validator suite SHALL reject at minimum:

- branch decisions whose `effective_scope[]` widens beyond `requested_scope[]`
- branch decisions whose `branch_reason_code` does not match `branch_action`
- nightly continuation branches that fail to declare `NIGHTLY_WINDOW_ADVANCED`
- run manifests whose authorized executable scope diverges from
  `manifest_branch_decision.effective_scope[]`
- audit and trace payloads whose embedded branch decision can no longer explain the selected branch
- lineage traces that omit branch candidates, hide rejection reasons, lose nightly predecessor
  context, or fail to link the branch back to its audit/span narrative
