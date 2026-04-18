# 12 Authority Interaction And Reconciliation Requirements

## Scope

- This pack exports the authority-facing protocol as implementation-grade data for preflight, request identity, response normalization, ingress checkpointing, and reconciliation.
- Canonical operation families indexed: `10`.
- Core protocol objects indexed: `9`.
- Request identity fields frozen: `31`.

## Core Protocol Objects

| Object | Truth owner | Schema | Primary seam |
| --- | --- | --- | --- |
| `AuthorityOperation` | `ENGINE_INTENT_AND_BOUNDARY_CONTROL` | `Algorithm/schemas/authority_operation.schema.json` | `Algorithm/modules.md::L1746[AUTHORITY_PREFLIGHT_...]` |
| `AuthorityBinding` | `FROZEN_AUTHORITY_CONTEXT` | `Algorithm/schemas/authority_binding.schema.json` | `Algorithm/modules.md::L1746[AUTHORITY_PREFLIGHT_...]` |
| `AuthorityRequestEnvelope` | `SEALED_REQUEST_IDENTITY` | `Algorithm/schemas/authority_request_envelope.schema.json` | `Algorithm/modules.md::L1816[CANONICALIZE_AUTHORITY_REQUEST_...]` |
| `AuthorityResponseEnvelope` | `NORMALIZED_AUTHORITY_OBSERVATION` | `Algorithm/schemas/authority_response_envelope.schema.json` | `Algorithm/modules.md::L1921[SUBMIT_TO_AUTHORITY_...]` |
| `AuthorityInteractionRecord` | `AUTHORITY_RUNTIME_LEDGER` | `Algorithm/schemas/authority_interaction_record.schema.json` | `Algorithm/modules.md::L2021[RECORD_AUTHORITY_INTERACTION_...]` |
| `AuthorityIngressReceipt` | `AUTHORITY_INGRESS_CHECKPOINT` | `Algorithm/schemas/authority_ingress_receipt.schema.json` | `Algorithm/modules.md::L1939[CHECKPOINT_AUTHORITY_INGRESS_...]` |
| `AuthorityOperationProfile` | `PROVIDER_CONTRACT_FREEZE` | `Algorithm/schemas/authority_operation_profile.schema.json` | `Algorithm/modules.md::L1746[AUTHORITY_PREFLIGHT_...]` |
| `SubmissionRecord` | `AUTHORITY_SETTLEMENT_LEDGER` | `Algorithm/schemas/submission_record.schema.json` | `Algorithm/modules.md::L1860[BEGIN_SUBMISSION_RECORD_...]` |
| `ObligationMirror` | `INTERNAL_OBLIGATION_MIRROR` | `Algorithm/schemas/obligation_mirror.schema.json` | `Algorithm/modules.md::L2085[RECONCILE_AUTHORITY_STATE_...]` |

## Operation Catalog

| Operation family | Protocol family | Idempotency | Settlement write rules |
| --- | --- | --- | --- |
| `AUTH_READ_REFERENCE` | `authority_read` | `REQUEST_HASH` | `none` |
| `AUTH_READ_OBLIGATIONS` | `authority_read` | `REQUEST_HASH` | `WRITE_OUT_OF_BAND_ONLY_FROM_EXTERNAL_DISCOVERY_OR_CORRECTION`, `REQUEST_BACKED_MUTATION_REQUIRES_PERSISTED_INGRESS_PROOF`, `FORBID_INTERNAL_OPTIMISTIC_CONFIRMATION` |
| `AUTH_READ_CALCULATION` | `authority_read` | `REQUEST_HASH` | `none` |
| `AUTH_CREATE_OR_AMEND_DATA` | `authority_mutation` | `REQUEST_HASH_AND_IDEMPOTENCY_KEY` | `WRITE_INTENT_ONLY_BEFORE_SEND`, `WRITE_PENDING_ACK_ONLY_FROM_ACCEPTED_OR_PROFILED_RETRYABLE_OUTCOME`, `WRITE_REJECTED_ONLY_FROM_VALIDATED_AUTHORITY_EVIDENCE`, `WRITE_UNKNOWN_ONLY_FROM_TIMEOUT_OR_UNRESOLVED_RECONCILIATION`, `WRITE_OUT_OF_BAND_ONLY_FROM_EXTERNAL_DISCOVERY_OR_CORRECTION`, `REQUEST_BACKED_MUTATION_REQUIRES_PERSISTED_INGRESS_PROOF`, `FORBID_INTERNAL_OPTIMISTIC_CONFIRMATION` |
| `AUTH_DELETE_DATA` | `authority_mutation` | `REQUEST_HASH_AND_IDEMPOTENCY_KEY` | `WRITE_INTENT_ONLY_BEFORE_SEND`, `WRITE_PENDING_ACK_ONLY_FROM_ACCEPTED_OR_PROFILED_RETRYABLE_OUTCOME`, `WRITE_REJECTED_ONLY_FROM_VALIDATED_AUTHORITY_EVIDENCE`, `WRITE_UNKNOWN_ONLY_FROM_TIMEOUT_OR_UNRESOLVED_RECONCILIATION`, `REQUEST_BACKED_MUTATION_REQUIRES_PERSISTED_INGRESS_PROOF`, `FORBID_INTERNAL_OPTIMISTIC_CONFIRMATION` |
| `AUTH_TRIGGER_CALCULATION` | `authority_calculation` | `REQUEST_HASH_AND_IDEMPOTENCY_KEY` | `none` |
| `AUTH_SUBMIT_FINAL_DECLARATION` | `authority_submission` | `REQUEST_HASH_AND_IDEMPOTENCY_KEY` | `WRITE_INTENT_ONLY_BEFORE_SEND`, `WRITE_PENDING_ACK_ONLY_FROM_ACCEPTED_OR_PROFILED_RETRYABLE_OUTCOME`, `WRITE_CONFIRMED_ONLY_FROM_VALIDATED_AUTHORITY_EVIDENCE`, `WRITE_REJECTED_ONLY_FROM_VALIDATED_AUTHORITY_EVIDENCE`, `WRITE_UNKNOWN_ONLY_FROM_TIMEOUT_OR_UNRESOLVED_RECONCILIATION`, `WRITE_OUT_OF_BAND_ONLY_FROM_EXTERNAL_DISCOVERY_OR_CORRECTION`, `REQUEST_BACKED_MUTATION_REQUIRES_PERSISTED_INGRESS_PROOF`, `FORBID_INTERNAL_OPTIMISTIC_CONFIRMATION` |
| `AUTH_SUBMIT_PERIODIC_UPDATE` | `authority_submission` | `REQUEST_HASH_AND_IDEMPOTENCY_KEY` | `WRITE_INTENT_ONLY_BEFORE_SEND`, `WRITE_PENDING_ACK_ONLY_FROM_ACCEPTED_OR_PROFILED_RETRYABLE_OUTCOME`, `WRITE_CONFIRMED_ONLY_FROM_VALIDATED_AUTHORITY_EVIDENCE`, `WRITE_REJECTED_ONLY_FROM_VALIDATED_AUTHORITY_EVIDENCE`, `WRITE_UNKNOWN_ONLY_FROM_TIMEOUT_OR_UNRESOLVED_RECONCILIATION`, `WRITE_OUT_OF_BAND_ONLY_FROM_EXTERNAL_DISCOVERY_OR_CORRECTION`, `REQUEST_BACKED_MUTATION_REQUIRES_PERSISTED_INGRESS_PROOF`, `FORBID_INTERNAL_OPTIMISTIC_CONFIRMATION` |
| `AUTH_SUBMIT_POST_FINALISATION_AMENDMENT` | `authority_submission` | `REQUEST_HASH_AND_IDEMPOTENCY_KEY` | `WRITE_INTENT_ONLY_BEFORE_SEND`, `WRITE_PENDING_ACK_ONLY_FROM_ACCEPTED_OR_PROFILED_RETRYABLE_OUTCOME`, `WRITE_CONFIRMED_ONLY_FROM_VALIDATED_AUTHORITY_EVIDENCE`, `WRITE_REJECTED_ONLY_FROM_VALIDATED_AUTHORITY_EVIDENCE`, `WRITE_UNKNOWN_ONLY_FROM_TIMEOUT_OR_UNRESOLVED_RECONCILIATION`, `WRITE_OUT_OF_BAND_ONLY_FROM_EXTERNAL_DISCOVERY_OR_CORRECTION`, `REQUEST_BACKED_MUTATION_REQUIRES_PERSISTED_INGRESS_PROOF`, `FORBID_INTERNAL_OPTIMISTIC_CONFIRMATION` |
| `AUTH_RECONCILE_STATUS` | `authority_reconciliation` | `REQUEST_HASH` | `WRITE_PENDING_ACK_ONLY_FROM_ACCEPTED_OR_PROFILED_RETRYABLE_OUTCOME`, `WRITE_CONFIRMED_ONLY_FROM_VALIDATED_AUTHORITY_EVIDENCE`, `WRITE_REJECTED_ONLY_FROM_VALIDATED_AUTHORITY_EVIDENCE`, `WRITE_UNKNOWN_ONLY_FROM_TIMEOUT_OR_UNRESOLVED_RECONCILIATION`, `WRITE_OUT_OF_BAND_ONLY_FROM_EXTERNAL_DISCOVERY_OR_CORRECTION`, `REQUEST_BACKED_MUTATION_REQUIRES_PERSISTED_INGRESS_PROOF`, `FORBID_INTERNAL_OPTIMISTIC_CONFIRMATION` |

## Shared Controls

- Preflight remains a hard control boundary: authorization, manifest posture, operation profile, binding lineage, human-gate evidence, canonicalization, duplicate checks, fraud-header posture, exclusive send claim, and send-time drift revalidation all happen before live transport.
- Request identity keeps `duplicate_meaning_key` and `request_hash` distinct so recovery can reuse exact lineage without confusing semantic duplicates with byte-identical packets.
- The authority layer owns response normalization, legal-state interpretation, and reconciliation. Internal workflow, customer projection, override, and accepted-risk posture remain subordinate.

## Audit Spine

- Required audit events: `AuthorityOperationPlanned`, `AuthorityRequestBuilt`, `AuthorityRequestSent`, `AuthorityResponseReceived`, `AuthorityStatusNormalized`, `AuthorityReconciliationAttempted`, `AuthorityReconciliationResolved`, `AuthorityReconciliationEscalated`.
- Every authority audit event carries: `manifest_id`, `operation_id`, `request_hash`, `idempotency_key`, `authority_link_ref`, `token_binding_ref`, `client_id`, `tenant_id`.
