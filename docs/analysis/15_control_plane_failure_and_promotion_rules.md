# Control-Plane Failure and Promotion Rules

## No-Blind-Resend and Authority Recovery

| resend_legality_state | state_or_outcome | allowed_next_actions | source_ref |
| --- | --- | --- | --- |
| FOLLOW_UP_READ_ONLY | Budget remains active; bounded read-after-write or read-after-timeout checks are still lawful without a duplicate mutation send. | follow_up_read<br>exact_idempotent_recovery<br>open_or_update_workflow<br>preserve_last_defensible_legal_state | Algorithm/authority_interaction_protocol.md::L1042[9.13A_Reconciliation_budget_and_escalation_rule] |
| IDEMPOTENT_RECOVERY_ONLY | Bytes already left the process but no provider response is durable; exact request-lineage recovery may continue without a fresh mutation packet. | follow_up_read<br>exact_idempotent_recovery<br>open_or_update_workflow<br>preserve_last_defensible_legal_state | Algorithm/authority_interaction_protocol.md::L1042[9.13A_Reconciliation_budget_and_escalation_rule] |
| BLOCKED_BY_RECONCILIATION | Automatic resend is blocked after budget exhaustion or unresolved contradictory evidence. | follow_up_read<br>exact_idempotent_recovery<br>open_or_update_workflow<br>preserve_last_defensible_legal_state | Algorithm/authority_interaction_protocol.md::L1042[9.13A_Reconciliation_budget_and_escalation_rule] |
| BLOCKED_BY_ESCALATION | Automatic resend is blocked because escalation ownership and workflow have taken over the unresolved case. | follow_up_read<br>exact_idempotent_recovery<br>open_or_update_workflow<br>preserve_last_defensible_legal_state | Algorithm/authority_interaction_protocol.md::L1042[9.13A_Reconciliation_budget_and_escalation_rule] |

## Recovery Reopen Blockers

| reopen_readiness_state | state_or_outcome | source_ref |
| --- | --- | --- |
| BLOCKED_PENDING_CHECKPOINT_CREATION | reopen_readiness_state = BLOCKED_PENDING_CHECKPOINT_CREATION | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L44[Recovery_checkpoint_law] |
| BLOCKED_PENDING_RESTORE_DRILL | reopen_readiness_state = BLOCKED_PENDING_RESTORE_DRILL | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L44[Recovery_checkpoint_law] |
| BLOCKED_PENDING_PRIVACY_RECONCILIATION | reopen_readiness_state = BLOCKED_PENDING_PRIVACY_RECONCILIATION | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L44[Recovery_checkpoint_law] |
| BLOCKED_PENDING_COMPENSATING_RE_ERASURE | reopen_readiness_state = BLOCKED_PENDING_COMPENSATING_RE_ERASURE | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L44[Recovery_checkpoint_law] |
| BLOCKED_PENDING_LIMITATION_RECONCILIATION | reopen_readiness_state = BLOCKED_PENDING_LIMITATION_RECONCILIATION | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L44[Recovery_checkpoint_law] |
| BLOCKED_LEGAL_HOLD_REVIEW | reopen_readiness_state = BLOCKED_LEGAL_HOLD_REVIEW | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L44[Recovery_checkpoint_law] |
| BLOCKED_PROOF_PRESERVATION_REVIEW | reopen_readiness_state = BLOCKED_PROOF_PRESERVATION_REVIEW | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L44[Recovery_checkpoint_law] |
| BLOCKED_AUTHORITY_AMBIGUITY_REVIEW | reopen_readiness_state = BLOCKED_AUTHORITY_AMBIGUITY_REVIEW | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L44[Recovery_checkpoint_law] |
| BLOCKED_PENDING_AUDIT_CONTINUITY | reopen_readiness_state = BLOCKED_PENDING_AUDIT_CONTINUITY | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L44[Recovery_checkpoint_law] |
| BLOCKED_PENDING_QUEUE_REBUILD | reopen_readiness_state = BLOCKED_PENDING_QUEUE_REBUILD | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L44[Recovery_checkpoint_law] |
| BLOCKED_PENDING_AUTHORITY_REVALIDATION | reopen_readiness_state = BLOCKED_PENDING_AUTHORITY_REVALIDATION | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L44[Recovery_checkpoint_law] |
| READY_FOR_REOPEN | reopen_readiness_state = READY_FOR_REOPEN | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L44[Recovery_checkpoint_law] |
| QUARANTINED | reopen_readiness_state = QUARANTINED | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L44[Recovery_checkpoint_law] |
| EXPIRED | reopen_readiness_state = EXPIRED | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L44[Recovery_checkpoint_law] |

## Restore Privacy Reconciliation

| privacy_reconciliation_state | state_or_outcome | source_ref |
| --- | --- | --- |
| PENDING_RECONCILIATION | privacy_reconciliation_state = PENDING_RECONCILIATION | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L86[Restore_privacy_reconciliation_law] |
| RECONCILED_NO_COMPENSATION_REQUIRED | privacy_reconciliation_state = RECONCILED_NO_COMPENSATION_REQUIRED | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L86[Restore_privacy_reconciliation_law] |
| COMPENSATING_RE_ERASURE_REQUIRED | privacy_reconciliation_state = COMPENSATING_RE_ERASURE_REQUIRED | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L86[Restore_privacy_reconciliation_law] |
| COMPENSATING_RE_ERASURE_IN_PROGRESS | privacy_reconciliation_state = COMPENSATING_RE_ERASURE_IN_PROGRESS | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L86[Restore_privacy_reconciliation_law] |
| RECONCILED_WITH_COMPENSATING_RE_ERASURE | privacy_reconciliation_state = RECONCILED_WITH_COMPENSATING_RE_ERASURE | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L86[Restore_privacy_reconciliation_law] |
| BLOCKED_LEGAL_HOLD | privacy_reconciliation_state = BLOCKED_LEGAL_HOLD | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L86[Restore_privacy_reconciliation_law] |
| BLOCKED_PROOF_PRESERVATION | privacy_reconciliation_state = BLOCKED_PROOF_PRESERVATION | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L86[Restore_privacy_reconciliation_law] |
| BLOCKED_AUTHORITY_AMBIGUITY | privacy_reconciliation_state = BLOCKED_AUTHORITY_AMBIGUITY | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L86[Restore_privacy_reconciliation_law] |

## Nightly Hard Boundaries

| hard_boundary | state_or_outcome | authority_safety_posture | source_ref |
| --- | --- | --- | --- |
| never_satisfy_step_up_or_approval_automatically | Hard unattended boundary: `never_satisfy_step_up_or_approval_automatically`. | Hard boundaries are never overridden by overnight convenience or raw trust score alone. | Algorithm/nightly_autopilot_contract.md::L443[6.3_Hard_unattended_boundaries] |
| never_approve_or_originate_filing_critical_overrides | Hard unattended boundary: `never_approve_or_originate_filing_critical_overrides`. | Hard boundaries are never overridden by overnight convenience or raw trust score alone. | Algorithm/nightly_autopilot_contract.md::L443[6.3_Hard_unattended_boundaries] |
| never_originate_or_self_approve_exceptional_authority | Hard unattended boundary: `never_originate_or_self_approve_exceptional_authority`. | Hard boundaries are never overridden by overnight convenience or raw trust score alone. | Algorithm/nightly_autopilot_contract.md::L443[6.3_Hard_unattended_boundaries] |
| never_mark_unknown_or_out_of_band_truth_confirmed_without_normalized_basis | Hard unattended boundary: `never_mark_unknown_or_out_of_band_truth_confirmed_without_normalized_basis`. | Hard boundaries are never overridden by overnight convenience or raw trust score alone. | Algorithm/nightly_autopilot_contract.md::L443[6.3_Hard_unattended_boundaries] |
| never_resend_externally_visible_mutation_after_reconciliation_budget_exhaustion | Hard unattended boundary: `never_resend_externally_visible_mutation_after_reconciliation_budget_exhaustion`. | Hard boundaries are never overridden by overnight convenience or raw trust score alone. | Algorithm/nightly_autopilot_contract.md::L443[6.3_Hard_unattended_boundaries] |
| never_auto_close_human_review_item_without_durable_upstream_resolution | Hard unattended boundary: `never_auto_close_human_review_item_without_durable_upstream_resolution`. | Hard boundaries are never overridden by overnight convenience or raw trust score alone. | Algorithm/nightly_autopilot_contract.md::L443[6.3_Hard_unattended_boundaries] |
| never_fabricate_client_declaration_or_sign_off | Hard unattended boundary: `never_fabricate_client_declaration_or_sign_off`. | Hard boundaries are never overridden by overnight convenience or raw trust score alone. | Algorithm/nightly_autopilot_contract.md::L443[6.3_Hard_unattended_boundaries] |
| never_publish_customer_legal_text_outside_frozen_template_family | Hard unattended boundary: `never_publish_customer_legal_text_outside_frozen_template_family`. | Hard boundaries are never overridden by overnight convenience or raw trust score alone. | Algorithm/nightly_autopilot_contract.md::L443[6.3_Hard_unattended_boundaries] |

## Promotion Admissibility

| state_or_outcome | source_ref |
| --- | --- |
| Gate result is bound to the exact candidate tuple. | Algorithm/release_candidate_identity_and_promotion_evidence_contract.md::L78[3._Admissibility_boundary] |
| Freshness remains valid for the candidate being promoted. | Algorithm/release_candidate_identity_and_promotion_evidence_contract.md::L78[3._Admissibility_boundary] |
| Rerun scope remains identical to the blocking suite scope. | Algorithm/release_candidate_identity_and_promotion_evidence_contract.md::L78[3._Admissibility_boundary] |
| Quarantine posture is NONE. | Algorithm/release_candidate_identity_and_promotion_evidence_contract.md::L78[3._Admissibility_boundary] |
| Manual waiver posture is NONE. | Algorithm/release_candidate_identity_and_promotion_evidence_contract.md::L78[3._Admissibility_boundary] |

## Rollback and Fail-Forward Boundary

| rollback_boundary_state | state_or_outcome | source_ref |
| --- | --- | --- |
| ROLLBACK_ALLOWED | rollback_boundary_state = ROLLBACK_ALLOWED | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L127[Rollback_and_fail-forward_law] |
| FAIL_FORWARD_ONLY | rollback_boundary_state = FAIL_FORWARD_ONLY | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L127[Rollback_and_fail-forward_law] |

### Rollout Strategy and State Alignment

| rollout_strategy | rollout_state | state_or_outcome | source_ref |
| --- | --- | --- | --- |
| STANDARD_CANARY | CANARY | STANDARD_CANARY / CANARY | Algorithm/deployment_and_resilience_contract.md::L177[6._Rollout_rollback_and_fail-forward_posture] |
| STANDARD_CANARY | ABORTED | STANDARD_CANARY / ABORTED | Algorithm/deployment_and_resilience_contract.md::L177[6._Rollout_rollback_and_fail-forward_posture] |
| PIN_BASELINE | PINNED | PIN_BASELINE / PINNED | Algorithm/deployment_and_resilience_contract.md::L177[6._Rollout_rollback_and_fail-forward_posture] |
| FAIL_FORWARD_COMPENSATING | FAILED_FORWARD | FAIL_FORWARD_COMPENSATING / FAILED_FORWARD | Algorithm/deployment_and_resilience_contract.md::L177[6._Rollout_rollback_and_fail-forward_posture] |
| STANDARD_CANARY | ROLLED_BACK | STANDARD_CANARY / ROLLED_BACK | Algorithm/deployment_and_resilience_contract.md::L177[6._Rollout_rollback_and_fail-forward_posture] |
| EMERGENCY_PROMOTE | PROMOTED | EMERGENCY_PROMOTE / PROMOTED | Algorithm/deployment_and_resilience_contract.md::L177[6._Rollout_rollback_and_fail-forward_posture] |

## Release and Resilience Invariants

| state_or_outcome | source_ref |
| --- | --- |
| No production promotion without a recorded DeploymentRelease. | Algorithm/deployment_and_resilience_contract.md::L228[8._Release_and_resilience_invariants] |
| No migration without a reversible or fail-forward-compatible plan. | Algorithm/deployment_and_resilience_contract.md::L228[8._Release_and_resilience_invariants] |
| No queue dependency that makes durable truth unrecoverable after broker loss. | Algorithm/deployment_and_resilience_contract.md::L228[8._Release_and_resilience_invariants] |
| No restore declared successful until audit continuity and privacy reconciliation are verified. | Algorithm/deployment_and_resilience_contract.md::L228[8._Release_and_resilience_invariants] |
| No rollback that rewrites or obscures already-persisted legal/compliance evidence. | Algorithm/deployment_and_resilience_contract.md::L228[8._Release_and_resilience_invariants] |
| No desktop rollout without a documented compatibility window and emergency disable or pin path. | Algorithm/deployment_and_resilience_contract.md::L228[8._Release_and_resilience_invariants] |
