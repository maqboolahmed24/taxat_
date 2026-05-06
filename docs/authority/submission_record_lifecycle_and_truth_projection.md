# Submission Record Lifecycle And Truth Projection

`pc_0134` implements `SubmissionRecord` as the durable authority-settlement ledger. The implementation cross-checks:

- `PROMPT/CARDS/pc_0134.md`
- `PROMPT/shared_operating_contract_0134_to_0141.md`
- `packages/contracts-core/schemas/submission_record.schema.json`
- `packages/contracts-core/schemas/authority_request_identity_contract.schema.json`
- `packages/contracts-core/python/validate_contracts.py::validate_submission_record`
- `Algorithm/state_machines.md` section 6.19
- `Algorithm/modules.md` `BEGIN_SUBMISSION_RECORD`, `TRANSITION_SUBMISSION_RECORD`, `RECONCILE_AUTHORITY_STATE`, and `UPSERT_OBLIGATION_MIRROR`
- `Algorithm/authority_interaction_protocol.md` sections 9.10 through 9.14
- `Algorithm/authority_truth_and_internal_projection_separation_contract.md`
- `Algorithm/test_vectors.md` TV-70I through TV-70N and TV-70O through TV-70T

## Settlement Ledger

`SubmissionRecord` owns legal settlement truth for one authority meaning. It freezes request identity before transmit:

- `packet_ref`
- `request_envelope_ref`
- `request_hash`
- `idempotency_key`
- `identity_namespace_hash`
- `duplicate_meaning_key`
- grouped `request_identity_contract`
- `proof_bundle_ref`
- `proof_bundle_hash`

Only `OUT_OF_BAND` may clear packet-origin request lineage. `CONFIRMED`, `REJECTED`, `PENDING_ACK`, `UNKNOWN`, and `SUPERSEDED` retain request lineage unless the state is explicitly out-of-band.

## Mutation Gates

Request-backed `PENDING_ACK`, `CONFIRMED`, and `REJECTED` require a `SUBMISSION_RECORD` scoped `authority_ingress_proof_contract` with authenticated channel state, `BOUND` correlation, and mutation attributed to the persisted receipt. Weak, ambiguous, unbound, duplicate-suppressed, or quarantine-only ingress proof cannot update settlement truth.

`CONFIRMED` and `REJECTED` require authority evidence. `baseline_type` is non-null only for `CONFIRMED` and `OUT_OF_BAND`. `reconciliation_deadline_at` is non-null only while a submission is `PENDING_ACK` or `UNKNOWN`.

## Projection Rules

`ObligationMirror`, workflow projection, and client timeline projection are subordinate to `SubmissionRecord`.

- `ObligationMirror.current_submission_ref` is used only for `SUBMITTED_PENDING`.
- `ObligationMirror.last_confirmed_submission_ref` is used only for `MET_CONFIRMED`.
- `REJECTED`, `UNKNOWN`, and `OUT_OF_BAND` do not reuse pending or confirmed anchors.
- Workflow and client timeline projections may resolve or use confirming copy only when authority truth is `CONFIRMED`.
- Override, accepted-risk, or workflow completion remains internal governance context and never changes settlement truth.
- Late authority correction or supersession reopens downstream projections instead of rewriting history into a single false state.

## Persistence

`db/migrations/phase03_0134_submission_record_lifecycle_and_truth_projection.sql` adds the `submission_records` table with state-specific checks and a partial unique index enforcing one non-superseded submission per `duplicate_meaning_key`.
