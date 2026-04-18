# Replay, Recovery, Nightly, and Release Governance

## Pack Summary

- Control-plane artifacts: 22
- Replay rows: 69
- Claim and branch rows: 55
- Nightly selection rows: 63
- Nightly unattended-policy rows: 93
- Recovery rows: 35
- Authority resend and recovery rows: 7
- Release and rollback rows: 92

## Control-Plane Artifact Inventory

| artifact_name | state_or_outcome | recovery_posture | authority_safety_posture | source_ref |
| --- | --- | --- | --- | --- |
| RunManifest | RunManifest is the canonical execution, lineage, and sealing truth for request-time control. | Root artifact for same-manifest reuse, replay child allocation, and recovery child lineage. | No authority mutation, replay, or continuation may bypass manifest lineage truth. | Algorithm/manifest_and_config_freeze_contract.md::L78[5.3_RunManifest_required_field_groups] |
| ConfigFreeze | ConfigFreeze captures the lawful config basis for live, replay, nightly, and release flows. | Exact same-attempt recovery and exact replay require identical config freeze semantics. | Counterfactual analysis may vary config only under analysis posture and explicit declaration. | Algorithm/manifest_and_config_freeze_contract.md::L338[5.4_ConfigFreeze_contract] |
| InputFreeze | InputFreeze captures the exact input basis later used by replay, recovery, and audits. | Exact replay and same-attempt recovery require readable input freeze plus authoritative intake basis. | Fresh live recollection is forbidden while still claiming exact replay. | Algorithm/manifest_and_config_freeze_contract.md::L651[5.8_Input_freeze_contract] |
| HashSet | HashSet is the canonical replay, idempotency, and audit integrity spine. | Recovery children preserve `execution_basis_hash`; later lineage nodes must not rewrite it in place. | Authority recovery and replay attestations read persisted hashes instead of inferring basis from side effects. | Algorithm/manifest_and_config_freeze_contract.md::L744[5.9_Hash_contract] |
| ContinuationSet | ContinuationSet distinguishes exact recovery, replay, historically explicit continuation, and new-request children. | Same-attempt recovery is exact; historically explicit continuation is limited and must stay explicitly marked. | Continuation metadata cannot impersonate transport resume tokens or read-side stability tokens. | Algorithm/manifest_and_config_freeze_contract.md::L505[5.7_Parent_child_manifest_semantics] |
| FrozenExecutionBinding | FrozenExecutionBinding extends request identity with executable scope and approval context. | Authority recovery may reuse request lineage only when binding lineage remains unchanged. | Access binding drift blocks silent replay or resend reuse. | Algorithm/manifest_and_config_freeze_contract.md::L229[H._Frozen_execution_binding] |
| preseal_gate_evaluation | preseal_gate_evaluation captures the authoritative pre-start tape and durability boundary. | Exact replay and same-manifest reuse consume the persisted tape instead of recomputing on ambient state. | Missing or mismatched pre-seal tape forces fail-closed replay posture. | Algorithm/manifest_and_config_freeze_contract.md::L951[Pre-seal_gate_evaluation_contract] |
| manifest_start_claim | manifest_start_claim is the single-writer start lease and first-publication truth for live execution. | Nightly reclaim and recovery child allocation must read this control object instead of inferring from missing heartbeats. | No second live start is legal while an active lease still exists. | Algorithm/manifest_start_claim_protocol.md::L8[1._Durable_control_object] |
| ManifestLineageTrace | ManifestLineageTrace is the request-time branch explainer and candidate rejection ledger. | Recovery, replay, continuation, and same-manifest reuse remain explainable from one branch artifact. | Lineage truth is explicit; nearby timestamps or read mirrors cannot substitute for branch proof. | Algorithm/manifest_branch_selection_contract.md::L84[Explorer_Truth] |
| ReplayAttestation | ReplayAttestation is the durable replay-comparison and operator/auditor explanation artifact. | Corrupt, incomplete, or retention-limited basis becomes explicit posture instead of silent substitution. | Counterfactual analysis remains analysis-only and may not mutate authority-facing state. | Algorithm/replay_and_reproducibility_contract.md::L564[Replay_attestation_artifact] |
| NightlyBatchIdentityContract | NightlyBatchIdentityContract is the scheduler dedupe and batch identity tuple. | Recovery reclaim windows link the predecessor explicitly and forbid silent second-batch allocation. | Cross-window continuity requires a new nightly identity even if config and inputs are unchanged. | Algorithm/nightly_selection_disposition_and_batch_isolation_contract.md::L17[Identity_law] |
| NightlyBatchRun | NightlyBatchRun is the authoritative overnight selection, shard, and quiescence control object. | Crash recovery reuses predecessor selection and shard truth or escalates if proof is incomplete. | Nightly automation may not bypass manifest leases, authority ambiguity rules, or resend boundaries. | Algorithm/nightly_autopilot_contract.md::L85[2.3_Frozen_batch_envelope] |
| NightlySelectionEntry | Nightly selection entry is the per-candidate operating decision row for overnight execution. | Selection rows survive reclaim and batch restarts; unrelated clients retain explicit outcomes despite shard failure. | Same-window active attempts may defer or reclaim; they may not silently duplicate live execution. | Algorithm/nightly_selection_disposition_and_batch_isolation_contract.md::L35[Selection_law] |
| OperatorMorningDigest | OperatorMorningDigest is the deterministic next-morning handoff artifact for overnight control-plane behavior. | Digest derivation remains pinned to live nightly compliance posture, not replay or analysis. | Customer-visible consequences remain bound to persisted workflow and audit evidence, not free-text summaries. | Algorithm/nightly_autopilot_contract.md::L732[12.2_OperatorMorningDigest] |
| RecoveryGovernanceContract | RecoveryGovernanceContract is the shared checkpoint and release resilience policy object. | Tier mappings and reopen policy remain explicit and fail closed when weaker classes appear. | Authority mutations require lineage and binding revalidation after restore or failover. | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L11[Shared_recovery-governance_boundary] |
| RecoveryCheckpoint | RecoveryCheckpoint is the authoritative restore evidence and reopen-gating artifact for a protected workload. | Verified posture requires restore evidence, privacy reconciliation, queue rebuild, and authority revalidation. | Restore of authority-integrated work must rebuild outstanding reconciliation from durable truth. | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L44[Recovery_checkpoint_law] |
| RestorePrivacyReconciliationContract | RestorePrivacyReconciliationContract is the authoritative restore privacy blocker and compensating re-erasure record. | Restore remains blocked until privacy, limitation, and audit continuity become reopen-safe. | Authority ambiguity blocks reopen rather than being erased or hand-waved away. | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L86[Restore_privacy_reconciliation_law] |
| AuthorityInteractionRecord | AuthorityInteractionRecord is the durable exchange and reconciliation truth for no-blind-resend safety. | Restore, replay, or reclaim reuses the persisted reconciliation control packet rather than recomputing from retries. | Fresh mutation resend is blocked after budget exhaustion or unresolved ambiguity. | Algorithm/authority_interaction_protocol.md::L1042[9.13A_Reconciliation_budget_and_escalation_rule] |
| ReleaseCandidateIdentityContract | ReleaseCandidateIdentityContract is the shared candidate tuple for release evidence and deployment records. | Restore drills and client compatibility evidence must remain bound to the exact candidate tuple they verified. | Authority sandbox evidence may not drift across enabled provider-profile sets. | Algorithm/release_candidate_identity_and_promotion_evidence_contract.md::L12[1._Governing_candidate_identity_model] |
| SchemaBundleCompatibilityGateContract | SchemaBundleCompatibilityGateContract is the mutable schema safety boundary around a fixed release candidate. | Replay and restore require a compatible reader window or an explicitly blocked posture. | Closed reader windows and blocked native windows become explicit fail-forward boundaries. | Algorithm/release_candidate_identity_and_promotion_evidence_contract.md::L30[2._Contract_boundary] |
| ReleaseVerificationManifest | ReleaseVerificationManifest is the machine-assembled promotion-evidence root for one candidate. | Restore drills used for promotion bind the exact checkpoint and candidate tuple into the promotion record. | Authority sandbox coverage remains part of promotion admissibility when suite_family = AUTHORITY_SANDBOX. | Algorithm/release_candidate_identity_and_promotion_evidence_contract.md::L30[2._Contract_boundary] |
| DeploymentRelease | DeploymentRelease is the authoritative rollout, rollback, and fail-forward governance object. | Closed schema windows force FAIL_FORWARD_ONLY; rollback cannot obscure already-persisted legal evidence. | Release rollback is distinct from legal authority truth; evidence is never deleted to simulate rollback. | Algorithm/deployment_and_resilience_contract.md::L177[6._Rollout_rollback_and_fail-forward_posture] |

## Replay Taxonomy

| replay_class | state_or_outcome | mutation_posture | analysis_only | source_ref |
| --- | --- | --- | --- | --- |
| STANDARD_REPLAY | Exact compliance-grade replay under historical-read-only posture. | HISTORICAL_REPLAY_READ_ONLY | no | Algorithm/replay_and_reproducibility_contract.md::L71[STANDARD_REPLAY] |
| AUDIT_REPLAY | Exact replay semantics identical to STANDARD_REPLAY with audit-facing explanation posture. | REPLAY_COMPLIANCE_AND_EVIDENTIARY_READ_ONLY | no | Algorithm/replay_and_reproducibility_contract.md::L80[AUDIT_REPLAY] |
| COUNTERFACTUAL_ANALYSIS | Analysis-only replay that must classify expected equivalence, expected difference, or unexpected mismatch. | ANALYSIS_ONLY_NO_AUTHORITY_MUTATION | yes | Algorithm/replay_and_reproducibility_contract.md::L88[COUNTERFACTUAL_ANALYSIS] |

### Exact Replay Preconditions

| precondition_code | state_or_outcome | allowed_next_actions | source_ref |
| --- | --- | --- | --- |
| CONTINUATION_BASIS_MATCH | The requested `continuation_basis` names the exact lineage edge being replayed or recovered. | proceed_exact_replay<br>fail_closed_with_typed_basis_error<br>downgrade_to_limited_historical_comparison_if_policy_allows | Algorithm/replay_and_reproducibility_contract.md::L227[Exact_replay_preconditions] |
| CONFIG_INHERITANCE_EXACT | `continuation_set.config_inheritance_mode` stays exact rather than historically explicit or fresh. | proceed_exact_replay<br>fail_closed_with_typed_basis_error<br>downgrade_to_limited_historical_comparison_if_policy_allows | Algorithm/replay_and_reproducibility_contract.md::L227[Exact_replay_preconditions] |
| INPUT_INHERITANCE_EXACT | `continuation_set.input_inheritance_mode` stays exact rather than historically explicit or fresh. | proceed_exact_replay<br>fail_closed_with_typed_basis_error<br>downgrade_to_limited_historical_comparison_if_policy_allows | Algorithm/replay_and_reproducibility_contract.md::L227[Exact_replay_preconditions] |
| SOURCE_MANIFEST_READABLE | The source manifest remains sealed, historically readable, and not reconstructed from projections. | proceed_exact_replay<br>fail_closed_with_typed_basis_error<br>downgrade_to_limited_historical_comparison_if_policy_allows | Algorithm/replay_and_reproducibility_contract.md::L227[Exact_replay_preconditions] |
| CONFIG_FREEZE_AVAILABLE | The frozen `ConfigFreeze` is available, valid, and readable under the recorded schema bundle. | proceed_exact_replay<br>fail_closed_with_typed_basis_error<br>downgrade_to_limited_historical_comparison_if_policy_allows | Algorithm/replay_and_reproducibility_contract.md::L227[Exact_replay_preconditions] |
| INPUT_FREEZE_AND_INTAKE_AVAILABLE | The frozen `InputFreeze` and authoritative intake artifacts remain available, valid, and schema-readable. | proceed_exact_replay<br>fail_closed_with_typed_basis_error<br>downgrade_to_limited_historical_comparison_if_policy_allows | Algorithm/replay_and_reproducibility_contract.md::L227[Exact_replay_preconditions] |
| READER_WINDOW_OR_HISTORICAL_BUNDLE_AVAILABLE | The persisted reader-window still admits the replay reader or the runtime can load the exact historical bundle directly. | proceed_exact_replay<br>fail_closed_with_typed_basis_error<br>downgrade_to_limited_historical_comparison_if_policy_allows | Algorithm/replay_and_reproducibility_contract.md::L227[Exact_replay_preconditions] |
| PRESEAL_TAPE_AVAILABLE | Historical `preseal_gate_evaluation{...}` and the ordered pre-seal prefix are present and internally consistent. | proceed_exact_replay<br>fail_closed_with_typed_basis_error<br>downgrade_to_limited_historical_comparison_if_policy_allows | Algorithm/replay_and_reproducibility_contract.md::L227[Exact_replay_preconditions] |
| AUTHORITY_AND_LATE_DATA_BASIS_AVAILABLE | Authority and late-data basis artifacts remain available when they materially influenced the original run. | proceed_exact_replay<br>fail_closed_with_typed_basis_error<br>downgrade_to_limited_historical_comparison_if_policy_allows | Algorithm/replay_and_reproducibility_contract.md::L227[Exact_replay_preconditions] |
| RUNTIME_CAN_DESERIALIZE_AND_DECRYPT | The replay runtime can deserialize the historical schema bundle and decrypt retained artifacts where required. | proceed_exact_replay<br>fail_closed_with_typed_basis_error<br>downgrade_to_limited_historical_comparison_if_policy_allows | Algorithm/replay_and_reproducibility_contract.md::L227[Exact_replay_preconditions] |
| NO_LIVE_MUTATION_SCOPE_TOKEN | The requested replay scope contains no live mutation token. | proceed_exact_replay<br>fail_closed_with_typed_basis_error<br>downgrade_to_limited_historical_comparison_if_policy_allows | Algorithm/replay_and_reproducibility_contract.md::L227[Exact_replay_preconditions] |

## Manifest Claim and Branch Control

| claim_outcome | state_or_outcome | projected_claim_state | source_ref |
| --- | --- | --- | --- |
| CLAIM_GRANTED | Start lease granted and run_started committed atomically. | ACTIVE_LEASED | Algorithm/manifest_start_claim_protocol.md::L27[2._Legal_claim_outcomes] |
| ALREADY_ACTIVE | Another live lease still owns the same sealed manifest and attempt lineage. | ACTIVE_LEASED | Algorithm/manifest_start_claim_protocol.md::L27[2._Legal_claim_outcomes] |
| ALREADY_TERMINAL | Manifest already has a terminal post-start result. | TERMINAL_RESULT_RECORDED | Algorithm/manifest_start_claim_protocol.md::L27[2._Legal_claim_outcomes] |
| INVALID_PRESTART_STATE | Manifest is not in a legal pre-start state for new post-seal execution. | INVALID_PRESTART_STATE | Algorithm/manifest_start_claim_protocol.md::L27[2._Legal_claim_outcomes] |
| RECOVERY_REQUIRED | The persisted attempt cannot restart fresh and must transition through recovery lineage. | STALE_RECLAIM_REQUIRED | Algorithm/manifest_start_claim_protocol.md::L27[2._Legal_claim_outcomes] |
| RECLAIM_GRANTED | Stale reclaim proof succeeded and a verified successor resumed the same attempt lineage. | STALE_RECLAIM_REQUIRED | Algorithm/manifest_start_claim_protocol.md::L27[2._Legal_claim_outcomes] |
| RECLAIM_REJECTED_ACTIVE_LEASE | A reclaim attempt was rejected because the active lease still exists. | ACTIVE_LEASED | Algorithm/manifest_start_claim_protocol.md::L27[2._Legal_claim_outcomes] |

### Branch Actions

| branch_action | state_or_outcome | recovery_posture | source_ref |
| --- | --- | --- | --- |
| NEW_MANIFEST | No reusable prior manifest exists for this request identity. | Branch action keeps terminal retry, pre-start reuse, replay, recovery, continuation, and new request distinct. | Algorithm/manifest_branch_selection_contract.md::L31[Branch_Actions] |
| RETURN_EXISTING_BUNDLE | Exact retry against a terminal manifest returns the persisted decision bundle. | Branch action keeps terminal retry, pre-start reuse, replay, recovery, continuation, and new request distinct. | Algorithm/manifest_branch_selection_contract.md::L31[Branch_Actions] |
| REUSE_SEALED_MANIFEST | Exact retry against a still-pre-start sealed manifest reuses the same context. | Branch action keeps terminal retry, pre-start reuse, replay, recovery, continuation, and new request distinct. | Algorithm/manifest_branch_selection_contract.md::L31[Branch_Actions] |
| REPLAY_CHILD | Caller explicitly requested replay and the child preserves replay lineage. | Branch action keeps terminal retry, pre-start reuse, replay, recovery, continuation, and new request distinct. | Algorithm/manifest_branch_selection_contract.md::L31[Branch_Actions] |
| RECOVERY_CHILD | A started attempt is recovered under the same attempt lineage. | Branch action keeps terminal retry, pre-start reuse, replay, recovery, continuation, and new request distinct. | Algorithm/manifest_branch_selection_contract.md::L31[Branch_Actions] |
| CONTINUATION_CHILD | Legally distinct post-terminal continuation is required in the same lineage family. | Branch action keeps terminal retry, pre-start reuse, replay, recovery, continuation, and new request distinct. | Algorithm/manifest_branch_selection_contract.md::L31[Branch_Actions] |
| NEW_REQUEST_CHILD | Material request identity change forces a fresh child lineage. | Branch action keeps terminal retry, pre-start reuse, replay, recovery, continuation, and new request distinct. | Algorithm/manifest_branch_selection_contract.md::L31[Branch_Actions] |

### Branch Reason Codes

| branch_reason_code | state_or_outcome | authority_safety_posture | source_ref |
| --- | --- | --- | --- |
| NO_PRIOR_MANIFEST | branch_reason_code = NO_PRIOR_MANIFEST | Nightly continuation branches must explicitly carry NIGHTLY_WINDOW_ADVANCED. | Algorithm/manifest_branch_selection_contract.md::L63[Typed_Branch_Reasons] |
| TERMINAL_IDEMPOTENT_RETRY | branch_reason_code = TERMINAL_IDEMPOTENT_RETRY | Nightly continuation branches must explicitly carry NIGHTLY_WINDOW_ADVANCED. | Algorithm/manifest_branch_selection_contract.md::L63[Typed_Branch_Reasons] |
| PRESTART_SEALED_CONTEXT_REUSE | branch_reason_code = PRESTART_SEALED_CONTEXT_REUSE | Nightly continuation branches must explicitly carry NIGHTLY_WINDOW_ADVANCED. | Algorithm/manifest_branch_selection_contract.md::L63[Typed_Branch_Reasons] |
| REPLAY_REQUESTED_EXACT | branch_reason_code = REPLAY_REQUESTED_EXACT | Nightly continuation branches must explicitly carry NIGHTLY_WINDOW_ADVANCED. | Algorithm/manifest_branch_selection_contract.md::L63[Typed_Branch_Reasons] |
| STARTED_ATTEMPT_RECOVERY | branch_reason_code = STARTED_ATTEMPT_RECOVERY | Nightly continuation branches must explicitly carry NIGHTLY_WINDOW_ADVANCED. | Algorithm/manifest_branch_selection_contract.md::L63[Typed_Branch_Reasons] |
| POST_TERMINAL_CONTINUATION_REQUIRED | branch_reason_code = POST_TERMINAL_CONTINUATION_REQUIRED | Nightly continuation branches must explicitly carry NIGHTLY_WINDOW_ADVANCED. | Algorithm/manifest_branch_selection_contract.md::L63[Typed_Branch_Reasons] |
| REQUEST_IDENTITY_CHANGED | branch_reason_code = REQUEST_IDENTITY_CHANGED | Nightly continuation branches must explicitly carry NIGHTLY_WINDOW_ADVANCED. | Algorithm/manifest_branch_selection_contract.md::L63[Typed_Branch_Reasons] |
| NIGHTLY_WINDOW_ADVANCED | branch_reason_code = NIGHTLY_WINDOW_ADVANCED | Nightly continuation branches must explicitly carry NIGHTLY_WINDOW_ADVANCED. | Algorithm/manifest_branch_selection_contract.md::L63[Typed_Branch_Reasons] |

## Nightly Selection Model

| selection_disposition | state_or_outcome | recovery_posture | source_ref |
| --- | --- | --- | --- |
| EXECUTE_NEW_MANIFEST | Allocate a new manifest because no reusable terminal result or lawful continuation satisfies the request. | Every candidate gets one persisted selection row and preserves its disposition across reclaim and restart. | Algorithm/nightly_autopilot_contract.md::L168[4.2_Selection_dispositions] |
| EXECUTE_CONTINUATION_CHILD | Allocate a continuation child only when same-request reuse is unlawful and reclaim or continuation is explicitly required. | Every candidate gets one persisted selection row and preserves its disposition across reclaim and restart. | Algorithm/nightly_autopilot_contract.md::L168[4.2_Selection_dispositions] |
| REUSE_EXISTING_TERMINAL_RESULT | Attach a prior terminal result before considering fresh execution. | Every candidate gets one persisted selection row and preserves its disposition across reclaim and restart. | Algorithm/nightly_autopilot_contract.md::L168[4.2_Selection_dispositions] |
| DEFER_ACTIVE_ATTEMPT | Active same-window attempt exists and remains live under manifest start lease. | Every candidate gets one persisted selection row and preserves its disposition across reclaim and restart. | Algorithm/nightly_autopilot_contract.md::L168[4.2_Selection_dispositions] |
| DEFER_RETRY_WINDOW | Retry could be legal later, but capacity, checkpoint timing, or next_retry_at defers it to a later window. | Every candidate gets one persisted selection row and preserves its disposition across reclaim and restart. | Algorithm/nightly_autopilot_contract.md::L168[4.2_Selection_dispositions] |
| ESCALATE_ONLY | Open or refresh workflow without executing a manifest. | Every candidate gets one persisted selection row and preserves its disposition across reclaim and restart. | Algorithm/nightly_autopilot_contract.md::L168[4.2_Selection_dispositions] |
| SKIP_INELIGIBLE | Persist explicit skip posture because the candidate is ineligible this window. | Every candidate gets one persisted selection row and preserves its disposition across reclaim and restart. | Algorithm/nightly_autopilot_contract.md::L168[4.2_Selection_dispositions] |

### Nightly Outcome Buckets

| outcome_bucket | state_or_outcome | source_ref |
| --- | --- | --- |
| AUTO_COMPLETED | outcome_bucket = AUTO_COMPLETED | Algorithm/nightly_autopilot_contract.md::L650[10.5_Finite-progress_convergence_guarantee] |
| WAITING_ON_AUTHORITY | outcome_bucket = WAITING_ON_AUTHORITY | Algorithm/nightly_autopilot_contract.md::L650[10.5_Finite-progress_convergence_guarantee] |
| WAITING_ON_LATE_DATA | outcome_bucket = WAITING_ON_LATE_DATA | Algorithm/nightly_autopilot_contract.md::L650[10.5_Finite-progress_convergence_guarantee] |
| REVIEW_REQUIRED | outcome_bucket = REVIEW_REQUIRED | Algorithm/nightly_autopilot_contract.md::L650[10.5_Finite-progress_convergence_guarantee] |
| REQUEST_CLIENT_INFO | outcome_bucket = REQUEST_CLIENT_INFO | Algorithm/nightly_autopilot_contract.md::L650[10.5_Finite-progress_convergence_guarantee] |
| BLOCKED_INTERNAL | outcome_bucket = BLOCKED_INTERNAL | Algorithm/nightly_autopilot_contract.md::L650[10.5_Finite-progress_convergence_guarantee] |
| FAILED_RETRYABLE | outcome_bucket = FAILED_RETRYABLE | Algorithm/nightly_autopilot_contract.md::L650[10.5_Finite-progress_convergence_guarantee] |
| FAILED_NON_RETRYABLE | outcome_bucket = FAILED_NON_RETRYABLE | Algorithm/nightly_autopilot_contract.md::L650[10.5_Finite-progress_convergence_guarantee] |
| REUSED_RESULT | outcome_bucket = REUSED_RESULT | Algorithm/nightly_autopilot_contract.md::L650[10.5_Finite-progress_convergence_guarantee] |
| DEFERRED | outcome_bucket = DEFERRED | Algorithm/nightly_autopilot_contract.md::L650[10.5_Finite-progress_convergence_guarantee] |
| SKIPPED | outcome_bucket = SKIPPED | Algorithm/nightly_autopilot_contract.md::L650[10.5_Finite-progress_convergence_guarantee] |
| None | outcome_bucket = None | Algorithm/nightly_autopilot_contract.md::L650[10.5_Finite-progress_convergence_guarantee] |

## Recovery and Reopen Governance

| protected_workload_class | recovery_tier_class | rpo_class | rto_class | source_ref |
| --- | --- | --- | --- | --- |
| CONTROL_PLANE_LEGAL_TRUTH | TIER_0_CONTROL_PLANE | RPO_15M | RTO_60M | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L11[Shared_recovery-governance_boundary] |
| REBUILDABLE_PROJECTION | TIER_1_REBUILDABLE | RPO_4H | RTO_4H | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L11[Shared_recovery-governance_boundary] |
| DISPOSABLE_RUNTIME_CACHE | TIER_2_DISPOSABLE | RPO_BEST_EFFORT | RTO_24H | Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md::L11[Shared_recovery-governance_boundary] |

## Release Promotion and Compatibility

| evidence_artifact | state_or_outcome | source_ref |
| --- | --- | --- |
| VerificationSuiteResult | VerificationSuiteResult must bind the exact candidate identity and, where applicable, the shared compatibility gate hash. | Algorithm/release_candidate_identity_and_promotion_evidence_contract.md::L30[2._Contract_boundary] |
| GateAdmissibilityRecord | GateAdmissibilityRecord must bind the exact candidate identity and, where applicable, the shared compatibility gate hash. | Algorithm/release_candidate_identity_and_promotion_evidence_contract.md::L30[2._Contract_boundary] |
| CanaryHealthSummary | CanaryHealthSummary must bind the exact candidate identity and, where applicable, the shared compatibility gate hash. | Algorithm/release_candidate_identity_and_promotion_evidence_contract.md::L30[2._Contract_boundary] |
| RestoreDrillResult | RestoreDrillResult must bind the exact candidate identity and, where applicable, the shared compatibility gate hash. | Algorithm/release_candidate_identity_and_promotion_evidence_contract.md::L30[2._Contract_boundary] |
| ClientCompatibilityMatrix | ClientCompatibilityMatrix must bind the exact candidate identity and, where applicable, the shared compatibility gate hash. | Algorithm/release_candidate_identity_and_promotion_evidence_contract.md::L30[2._Contract_boundary] |
| ReleaseVerificationManifest | ReleaseVerificationManifest must bind the exact candidate identity and, where applicable, the shared compatibility gate hash. | Algorithm/release_candidate_identity_and_promotion_evidence_contract.md::L30[2._Contract_boundary] |
| DeploymentRelease | DeploymentRelease must bind the exact candidate identity and, where applicable, the shared compatibility gate hash. | Algorithm/release_candidate_identity_and_promotion_evidence_contract.md::L30[2._Contract_boundary] |

## Explicit Gaps

- `manifest_lineage_trace_schema_missing` (medium): ManifestLineageTrace is normatively required by prose but no dedicated schema artifact exists in the current corpus. [Algorithm/manifest_branch_selection_contract.md::L84[Explorer_Truth]]
- `legal_claim_outcomes_prose_only` (medium): Legal start-claim outcomes are prose-defined but are not mirrored as an enum on the manifest_start_claim schema. [Algorithm/manifest_start_claim_protocol.md::L27[2._Legal_claim_outcomes]]
- `branch_reason_codes_prose_only` (medium): Branch reason codes are contractually required in prose but no dedicated schema-backed enum was found for manifest_branch_decision. [Algorithm/manifest_branch_selection_contract.md::L63[Typed_Branch_Reasons]]
- `tenant_specific_unattended_defaults_not_canonicalized` (medium): The corpus defines the unattended policy value domain and required stage families, but does not publish one canonical tenant-default stage/value assignment matrix. [Algorithm/nightly_autopilot_contract.md::L396[6.1_Matrix_requirement]]
- `shared_operating_contract_reference_missing_for_pc_0015` (low): pc_0015 references ../shared_operating_contract_0014_to_0021.md, but no such file exists under PROMPT/ at generation time. [PROMPT/CARDS/pc_0015.md::L61[missing_shared_contract_reference]]
