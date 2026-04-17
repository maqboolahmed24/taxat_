# Authority Truth And Internal Projection Separation Contract

## Purpose

The system SHALL keep authority-of-record truth, internal workflow truth, mirror truth, and
customer-safe projection truth as distinct classes. No internal completion, queue progress,
accepted-risk posture, override posture, or reassuring copy may masquerade as confirmed authority
state.

The shared machine contract for this boundary is
`schemas/authority_truth_contract.schema.json`.

## Governing Model

Each governed artifact SHALL bind one `authority_truth_contract{...}` with:

- `boundary_scope`
- `truth_surface_role`
- `surface_specific_binding_policy`
- fixed non-negotiable policies that:
  - only authority evidence may confirm;
  - pending, unknown, and out-of-band stay typed and non-confirming;
  - ingress must checkpoint and correlate before mutation;
  - internal mirrors and projections remain subordinate to authority truth;
  - unresolved authority truth must not render as confirmed;
  - overrides and accepted-risk never count as authority confirmation; and
  - late authority corrections reopen downstream state.

The governed roles are:

- `AUTHORITY_RUNTIME_LEDGER`: `AuthorityInteractionRecord`
- `AUTHORITY_INGRESS_CHECKPOINT`: `AuthorityIngressReceipt`
- `AUTHORITY_SETTLEMENT_LEDGER`: `SubmissionRecord`
- `INTERNAL_OBLIGATION_MIRROR`: `ObligationMirror`
- `INTERNAL_WORKFLOW_COORDINATION`: `WorkflowItem`
- `CUSTOMER_SAFE_STATUS_PROJECTION`: `ClientTimelineEvent`

## State Vocabulary

Where an internal or customer-facing artifact needs to surface authority posture, it SHALL use the
typed shared vocabulary:

- `NOT_APPLICABLE`
- `NOT_REQUESTED`
- `UNKNOWN`
- `PENDING_ACK`
- `PARTIAL_ACK`
- `CONFIRMED`
- `REJECTED`
- `OUT_OF_BAND`

`CONFIRMED` is reserved for durable authority-grounded truth. `PENDING_ACK`, `UNKNOWN`,
`PARTIAL_ACK`, and `OUT_OF_BAND` are explicitly non-confirming.

## Required Outcomes

The architecture SHALL reject the following ambiguity classes:

- persisting or rendering `PENDING_ACK`, `UNKNOWN`, or `OUT_OF_BAND` as confirmed;
- allowing workflow `DONE` or customer `RESOLVED` projection while authority truth remains
  unresolved;
- mutating `SubmissionRecord` or `ObligationMirror` from ingress before checkpointed correlation;
- letting `ObligationMirror` reuse pending or confirmed anchors for unknown, rejected, or
  out-of-band posture;
- treating override or accepted-risk posture as legal confirmation; and
- treating late authority correction as advisory instead of reopening downstream mirrors and
  projections.

## Surface Rules

`AuthorityIngressReceipt` is a checkpoint, not truth settlement. It MAY prove authenticated
transport and correlation posture, but it SHALL NOT decide legal truth until strong binding and
normalization complete. Its grouped `authority_ingress_proof_contract{...}` is the durable witness
for authenticated channel evidence, canonical delivery identity, exact lineage-binding basis, and
mutation-gate posture; downstream truth artifacts SHALL reuse that witness instead of re-deriving
ingress legality from raw callback, poll, or recovery payloads.

`SubmissionRecord` is the durable settlement ledger. It alone carries authority-settlement truth for
one meaning, including confirmed, rejected, unknown, and out-of-band outcomes.

`ObligationMirror` is an internal view. It SHALL expose explicit `authority_truth_state` and keep
pending lineage, confirmed lineage, and pre-submit readiness as separate anchors.

`WorkflowItem` is coordination state. It SHALL expose explicit `authority_truth_state`, and no
internal lifecycle or customer projection may imply resolved authority truth while that state is
pending, unknown, partial, or out-of-band.

`ClientTimelineEvent` is customer-safe status projection. It SHALL expose explicit
`authority_truth_state`, and authority-related headlines SHALL remain compatible with that state.
Authority-neutral events SHALL keep `authority_truth_state = NOT_APPLICABLE`.
