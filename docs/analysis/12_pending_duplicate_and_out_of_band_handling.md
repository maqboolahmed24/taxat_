# 12 Pending Duplicate And Out-Of-Band Handling

## Response Classes

| Response class | Default state | Legal effect | Retry floor |
| --- | --- | --- | --- |
| `ACK_SUCCESS` | `CONFIRMED` | `DIRECT_STATE_MUTATION` | `NO_RETRY` |
| `ACK_ACCEPTED_PENDING` | `PENDING_ACK` | `DIRECT_STATE_MUTATION` | `RECONCILE_THEN_RETRY` |
| `ACK_REJECTED_VALIDATION` | `REJECTED` | `DIRECT_STATE_MUTATION` | `REBUILD_THEN_RETRY` |
| `ACK_REJECTED_AUTH` | `none` | `DIRECT_STATE_MUTATION` | `HUMAN_REVIEW_THEN_RETRY` |
| `ACK_RETRYABLE_FAILURE` | `PROFILE_DEPENDENT_PENDING_ACK_OR_UNKNOWN` | `DIRECT_STATE_MUTATION` | `SAFE_RETRY` |
| `ACK_TIMEOUT_OR_NO_RESOLUTION` | `UNKNOWN` | `PROVISIONAL_STATE_MUTATION` | `RECONCILE_THEN_RETRY` |
| `ACK_EXTERNAL_STATE_DISCOVERED` | `OUT_OF_BAND` | `DIRECT_STATE_MUTATION` | `NO_RETRY` |
| `ACK_AMBIGUOUS_CORRELATION` | `none` | `RECONCILIATION_ONLY` | `RECONCILE_THEN_RETRY` |
| `ACK_INCONSISTENT_STATE` | `none` | `RECONCILIATION_ONLY` | `MANUAL_INTERVENTION_REQUIRED` |

## Reconciliation Scenarios

| Scenario | Result | Resend posture | Escalation |
| --- | --- | --- | --- |
| `direct_confirmed_success` | `CONFIRMED` | `CLOSED_NO_RESEND` | `NOT_REQUIRED` |
| `accepted_pending_or_retryable_follow_up` | `PENDING_ACK` | `FOLLOW_UP_READ_ONLY` | `NOT_REQUIRED` |
| `timeout_or_no_resolution_unknown` | `UNKNOWN` | `IDEMPOTENT_RECOVERY_ONLY -> FOLLOW_UP_READ_ONLY` | `NOT_REQUIRED` |
| `duplicate_or_pending_bucket_blocks_resend` | `preserve existing authority-grounded posture` | `BLOCKED_BY_RECONCILIATION or CLOSED_NO_RESEND` | `NOT_REQUIRED` |
| `ambiguous_callback_or_reference_only_ingress` | `no settlement mutation` | `BLOCKED_BY_RECONCILIATION` | `READY_FOR_ESCALATION` |
| `out_of_band_or_authority_correction_discovered` | `OUT_OF_BAND` | `BLOCKED_BY_RECONCILIATION` | `NOT_REQUIRED` |
| `conflicting_authority_evidence_requires_quantitative_reconciliation` | `remain unresolved until thresholds are met` | `BLOCKED_BY_RECONCILIATION` | `READY_FOR_ESCALATION` |
| `budget_exhausted_or_deadline_elapsed` | `PENDING_ACK or UNKNOWN` | `BLOCKED_BY_ESCALATION` | `ESCALATED` |

## Request Identity Hazards

- Collision rules: `BODY_COLLISION`, `IDENTITY_NAMESPACE_COLLISION`.
- Unsafe retry conditions: `binding_lineage_ref changed`, `BODY_COLLISION open`, `IDENTITY_NAMESPACE_COLLISION open`, `duplicate bucket occupied by stronger authority truth`, `authenticated ambiguous or unbound ingress remains unresolved`, `reconciliation_budget_state in {EXHAUSTED, ESCALATED}`, `resend_legality_state in {BLOCKED_BY_RECONCILIATION, BLOCKED_BY_ESCALATION, CLOSED_NO_RESEND}`.

## Explicit Gaps

| Gap | Area | Required closure |
| --- | --- | --- |
| `GAP-AUTH-001` | `provider_profile_instantiation` | Instantiate authority product profiles per provider/environment and bind exact provider codes to the canonical response classes. |
| `GAP-AUTH-002` | `weak_ingress_resolution` | Define the manual investigation and approval workflow for promoting quarantined ingress after stronger evidence is gathered. |
| `GAP-AUTH-003` | `quantitative_weight_policy_binding` | Bind reconciliation source-family weights to a versioned runtime policy artifact shared with the trust and authority uncertainty layers. |
| `GAP-AUTH-004` | `authority_correction_taxonomy` | Define operator, client-visible, and replay behavior for each authority correction cause before live provider support is enabled. |
| `GAP-AUTH-005` | `reason_code_registry` | Publish a dedicated authority reason-code registry covering send-time blocks, resend refusals, escalation triggers, and correction causes. |
