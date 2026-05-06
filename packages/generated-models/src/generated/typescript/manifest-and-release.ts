/* DO NOT EDIT: generated downstream from packages/contracts-core. */
import type { ExactDecimalString, ISO8601DateTimeString, JsonValue } from "./primitives";

export type ApiCommandReceipt = {
  "artifact_type": "ApiCommandReceipt";
  "receipt_id": string;
  "tenant_id": string;
  "client_id": string;
  "principal_ref": string;
  "session_ref": string;
  "command_id": string;
  "command_type": string;
  "target_scope_class": "MANIFEST" | "WORK_ITEM" | "GOVERNANCE";
  "manifest_id": string | null;
  "work_item_id": string | null;
  "governance_target_ref": string | null;
  "request_hash": string;
  "dependency_topology_hash": string | null;
  "simulation_basis_hash": string | null;
  "latest_mutation_basis_contract_or_null": null | GovernanceMutationBasisContract;
  "idempotency_key": string;
  "acceptance_state": "ACCEPTED" | "DUPLICATE_REPLAY" | "REJECTED_STALE_VIEW" | "REJECTED_POLICY" | "REJECTED_INVALID" | "EXPIRED";
  "original_acceptance_state": "ACCEPTED" | "DUPLICATE_REPLAY" | "REJECTED_STALE_VIEW" | "REJECTED_POLICY" | "REJECTED_INVALID" | null;
  "duplicate_of_receipt_id": string | null;
  "projection_stream_class": "MANIFEST_EXPERIENCE" | "WORKSPACE" | "NONE";
  "latest_projection_sequence": number | null;
  "latest_projection_ref": string | null;
  "semantic_action_id": string | null;
  "result_ref": string | null;
  "reason_codes": Array<string>;
  "truth_boundary_contract": CommandTruthBoundaryContract & {
    "artifact_role"?: "BOUNDARY_RECEIPT";
    "authoritative_record_families"?: ["RUN_MANIFEST","WORKFLOW_ITEM","AUTHORITY_INTERACTION_RECORD","GOVERNANCE_DOMAIN_OBJECT","AUDIT_EVENT","API_COMMAND_RECEIPT"];
    "observable_projection_families"?: ["DECISION_BUNDLE","EXPERIENCE_DELTA","LOW_NOISE_EXPERIENCE_FRAME","WORKSPACE_SNAPSHOT","CLIENT_PORTAL_WORKSPACE","CLIENT_APPROVAL_PACK","CLIENT_UPLOAD_SESSION","GOVERNANCE_POLICY_SNAPSHOT"];
  };
  "mutation_precondition_binding": MutationPreconditionBinding;
  "stale_guard_family": "DECISION_BUNDLE_HASH" | "SHELL_STABILITY_TOKEN" | "FRAME_EPOCH" | "WORK_ITEM_VERSION" | "INTERNAL_THREAD_HEAD" | "CUSTOMER_THREAD_HEAD" | "REQUEST_STATE_VERSION" | "APPROVAL_PACK_HASH" | "CLIENT_PORTAL_WORKSPACE_VERSION" | "POLICY_SNAPSHOT_HASH" | "DEPENDENCY_TOPOLOGY_HASH" | "SIMULATION_BASIS_HASH" | "MUTATION_BASIS_CONTRACT_HASH" | null;
  "latest_stale_guard_value": string | number | null;
  "latest_stability_contract_or_null": RouteStabilityContract | null;
  "activity_refs": Array<string>;
  "audit_event_refs": Array<string>;
  "notification_refs": Array<string>;
  "accepted_at": ISO8601DateTimeString;
  "expires_at": ISO8601DateTimeString;
};
export const ApiCommandReceiptSchemaLineage = { schemaId: "https://taxat.dev/schemas/api_command_receipt.schema.json", sourceHash: "fe995f1540fa1295edffbce7fef87cc9f63da5b0d8e05b45c08c6dbb06a12ad6" } as const;

export type BackfillExecutionContract = {
  "contract_version": "BACKFILL_EXECUTION_CONTRACT_V1";
  "migration_id": string;
  "target_version": string;
  "target_schema_bundle_hash": string;
  "execution_requirement": "NO_BACKFILL_REQUIRED" | "IDEMPOTENT_BACKFILL_REQUIRED";
  "execution_state": "NOT_APPLICABLE" | "PLANNED" | "IN_PROGRESS" | "COMPLETE" | "HALTED" | "FAILED";
  "idempotency_policy": "REENTRANT_UPSERT_OR_COMPARE_AND_SWAP_ONLY";
  "meaning_preservation_policy": "HISTORICAL_MEANING_IMMUTABLE_APPEND_OR_DERIVE_ONLY";
  "lineage_recording_policy": "EVERY_BACKFILL_WRITE_RETAINS_LEDGER_AND_AUDIT_LINEAGE";
  "retry_safety_policy": "DUPLICATE_SAFE_AND_PARTIAL_PROGRESS_RESUMABLE";
  "affected_artifact_types": Array<string>;
  "backfill_audit_refs": Array<string>;
};
export const BackfillExecutionContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/backfill_execution_contract.schema.json", sourceHash: "5aad8237fd5fa59c1aafae3d0379ac3582dc186d0ec4030ae9e100fe31161b93" } as const;

export type BuildArtifact = {
  "build_id": string;
  "vcs_ref": string;
  "artifact_digest": string;
  "sbom_ref": string;
  "provenance_ref": string;
  "signature_ref": string;
  "artifact_registry_ref": string;
  "release_channel": string;
  "build_time": ISO8601DateTimeString;
  "distribution_targets": Array<"SERVER" | "WEB_OPERATOR_SHELL" | "MACOS_DESKTOP">;
  "desktop_notarization_ref": string | null;
  "hardened_runtime_attestation_ref": string | null;
};
export const BuildArtifactSchemaLineage = { schemaId: "https://taxat.dev/schemas/build_artifact.schema.json", sourceHash: "c3beec556ae7f806aa1e8cb64911e1fef389ae8b92297d7cadde58f5257ed2dc" } as const;

export type CanaryHealthSummary = {
  "canary_summary_id": string;
  "candidate_environment_ref": string;
  "build_artifact_ref": string;
  "artifact_digest": string;
  "candidate_identity_hash": string;
  "candidate_identity_contract": ReleaseCandidateIdentityContract;
  "canary_fraction": number;
  "slo_profile_ref": string;
  "error_budget_profile_ref": string;
  "latency_budget_state": "WITHIN_BUDGET" | "BREACHED";
  "error_budget_state": "WITHIN_BUDGET" | "BREACHED";
  "health_gate_state": "GREEN" | "AMBER" | "RED";
  "abort_recommended": boolean;
  "summary_ref": string;
  "evaluated_at": ISO8601DateTimeString;
};
export const CanaryHealthSummarySchemaLineage = { schemaId: "https://taxat.dev/schemas/canary_health_summary.schema.json", sourceHash: "dae0f978bc9c36ce668547a631f996ab2d657274a9ed55c2264d9466ccce81b8" } as const;

export type DeploymentRelease = {
  "release_id": string;
  "environment_ref": string;
  "build_id": string;
  "candidate_identity_hash": string;
  "candidate_identity_contract": ReleaseCandidateIdentityContract;
  "recovery_governance_contract": RecoveryGovernanceContract & {
    "boundary_scope"?: "DEPLOYMENT_RELEASE";
    "protected_workload_class"?: "CONTROL_PLANE_LEGAL_TRUTH";
    "recovery_tier_class"?: "TIER_0_CONTROL_PLANE";
    "rpo_class"?: "RPO_15M";
    "rto_class"?: "RTO_60M";
    "boundary_specific_binding_policy"?: "RELEASE_RETAINS_ROLLBACK_BOUNDARY_AND_FAIL_FORWARD_GOVERNANCE";
  };
  "schema_bundle_hash": string;
  "schema_reader_window_contract": SchemaReaderWindowContract;
  "schema_bundle_compatibility_gate_contract": SchemaBundleCompatibilityGateContract;
  "config_bundle_hash": string;
  "rollout_strategy": "STANDARD_CANARY" | "EMERGENCY_PROMOTE" | "PIN_BASELINE" | "FAIL_FORWARD_COMPENSATING";
  "rollout_state": "PLANNED" | "CANARY" | "PROMOTED" | "FAILED_FORWARD" | "PINNED" | "ABORTED" | "ROLLED_BACK" | "SUPERSEDED";
  "state_transition_contract": StateTransitionContract & {
    "object_family"?: "DEPLOYMENT_RELEASE";
    "machine_code"?: "DEPLOYMENT_RELEASE_ROLLOUT_V1";
    "state_field_name"?: "rollout_state";
  };
  "rollback_boundary_state": "ROLLBACK_ALLOWED" | "FAIL_FORWARD_ONLY";
  "canary_fraction": number | null;
  "health_gate_state": "GREEN" | "AMBER" | "RED";
  "release_verification_manifest_ref": string;
  "supported_client_window_ref": string;
  "deployed_at": ISO8601DateTimeString;
  "rollback_of_release_id": string | null;
  "compensating_release_id_or_null": string | null;
  "rollback_runbook_ref": string;
  "fail_forward_runbook_ref": string;
  "fail_forward_owner_ref_or_null": string | null;
  "emergency_override_ref": string | null;
  "emergency_override_expires_at": ISO8601DateTimeString;
};
export const DeploymentReleaseSchemaLineage = { schemaId: "https://taxat.dev/schemas/deployment_release.schema.json", sourceHash: "aadebeda257a73863828b7d26a512e42abdf1c0cc06ec73768df2e8922595154" } as const;

export type DeterministicGoldenPack = {
  "golden_pack_id": string;
  "artifact_type": "DeterministicGoldenPack";
  "contract_version": "DETERMINISTIC_GOLDEN_PACK_V1";
  "golden_pack_hash": string;
  "candidate_identity_hash": string;
  "candidate_identity_contract": ReleaseCandidateIdentityContract;
  "schema_bundle_hash": string;
  "config_bundle_hash": string;
  "canonical_serialization_policy": "CANONICAL_JSON_SORTED_KEYS_UTF8";
  "exact_decimal_policy": "EXACT_DECIMAL_STRING_NO_LOCALE_NO_EXPONENT";
  "null_slot_policy": "EXPLICIT_NULL_SLOTS_RETAINED_IN_ORDERED_PAYLOADS";
  "replay_comparison_policy": "GOLDEN_FIXTURES_BIND_CANDIDATE_SCHEMA_SCOPE_AND_EXPECTED_HASHES";
  "state_transition_policy": "STATE_MACHINE_FIXTURES_REQUIRE_NAMED_PREVIOUS_AND_CURRENT_STATE";
  "cadence_policy": "DETERMINISTIC_RETRY_AND_RECONCILIATION_CADENCE_NO_RANDOM_JITTER";
  "module_fixtures": Array<DeterministicGoldenPackModuleFixture>;
  "state_transition_fixtures": Array<DeterministicGoldenPackStateTransitionFixture>;
  "replay_fixtures": Array<DeterministicGoldenPackReplayFixture>;
  "cadence_fixtures": Array<DeterministicGoldenPackCadenceFixture>;
};
export const DeterministicGoldenPackSchemaLineage = { schemaId: "https://taxat.dev/schemas/deterministic_golden_pack.schema.json", sourceHash: "f83bf3c5f265358b73c11893797564a683e566fbf9b23a290b84125ef7d36ea1" } as const;

export type DeterministicGoldenPackDecimalFieldExpectation = {
  "field_path": string;
  "decimal_value": ExactDecimalString;
};

export type DeterministicGoldenPackOrderedArrayExpectation = {
  "field_path": string;
  "ordering_policy": "PRESERVE_DECLARED_ORDER";
  "expected_values": Array<string>;
};

export type DeterministicGoldenPackModuleFixture = {
  "fixture_id": string;
  "module_code": string;
  "artifact_family": string;
  "scope_binding_hash": string;
  "canonical_payload_hash": string;
  "expected_null_field_paths": Array<string>;
  "expected_decimal_fields": Array<DeterministicGoldenPackDecimalFieldExpectation>;
  "expected_ordered_array_fields": Array<DeterministicGoldenPackOrderedArrayExpectation>;
  "fixture_binding_policy": "CANDIDATE_SCHEMA_SCOPE_BOUND";
};

export type DeterministicGoldenPackStateTransitionFixture = {
  "fixture_id": string;
  "scope_binding_hash": string;
  "state_transition_contract": StateTransitionContract;
  "expected_current_state": string;
  "expected_previous_state_or_null": string | null;
  "expected_transition_event_code": string;
  "transition_binding_policy": "NAMED_STATE_MACHINE_TUPLE_AND_EVENT";
};

export type DeterministicGoldenPackReplayFixture = {
  "fixture_id": string;
  "scope_binding_hash": string;
  "replay_class": "STANDARD_REPLAY" | "AUDIT_REPLAY" | "COUNTERFACTUAL_ANALYSIS";
  "comparison_mode": "EXACT_HASH_MATCH" | "COUNTERFACTUAL_DECLARED" | "LIMITED_HISTORICAL_COMPARISON" | "BASIS_INCOMPLETE" | "BASIS_CORRUPT";
  "expected_outcome_class": "EXACT_MATCH" | "EXPECTED_EQUIVALENCE" | "EXPECTED_DIFFERENCE" | "LIMITED_COMPARABLE" | "BASIS_INCOMPLETE" | "BASIS_CORRUPT" | "UNEXPECTED_MISMATCH";
  "expected_execution_basis_hash": string;
  "expected_deterministic_outcome_hash": string;
  "comparison_binding_policy": "CANDIDATE_SCHEMA_SCOPE_AND_HASH_BOUND";
};

export type DeterministicGoldenPackCadenceFixture = {
  "fixture_id": string;
  "scope_binding_hash": string;
  "cadence_family": "RETRY" | "RECONCILIATION";
  "attempt_index": number;
  "expected_cadence_seconds": number;
  "jitter_policy": "NONE";
  "schedule_derivation_basis": string;
};

export type ManifestBranchDecisionContract = {
  "branch_action": "NEW_MANIFEST" | "RETURN_EXISTING_BUNDLE" | "REUSE_SEALED_MANIFEST" | "REPLAY_CHILD" | "RECOVERY_CHILD" | "CONTINUATION_CHILD" | "NEW_REQUEST_CHILD";
  "branch_reason_code": "NO_PRIOR_MANIFEST" | "TERMINAL_IDEMPOTENT_RETRY" | "PRESTART_SEALED_CONTEXT_REUSE" | "REPLAY_REQUESTED_EXACT" | "STARTED_ATTEMPT_RECOVERY" | "POST_TERMINAL_CONTINUATION_REQUIRED" | "REQUEST_IDENTITY_CHANGED" | "NIGHTLY_WINDOW_ADVANCED";
  "idempotency_key": string;
  "request_identity_hash": string;
  "access_binding_hash": string;
  "requested_scope": ManifestBranchDecisionContractScopeArray;
  "effective_scope": ManifestBranchDecisionContractScopeArray;
  "mode": "COMPLIANCE" | "ANALYSIS";
  "run_kind": "INTERACTIVE" | "NIGHTLY" | "BACKFILL" | "REPLAY" | "REMEDIATION" | "AMENDMENT" | "MIGRATION";
  "replay_class_or_null": "STANDARD_REPLAY" | "AUDIT_REPLAY" | "COUNTERFACTUAL_ANALYSIS" | null;
  "nightly_window_key_or_null": string | null;
  "prior_manifest_id_or_null": string | null;
  "prior_manifest_hash_at_decision_or_null": string | null;
  "prior_manifest_lifecycle_state_or_null": "ALLOCATED" | "FROZEN" | "SEALED" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED" | "FAILED" | "SUPERSEDED" | "REPLAY_ONLY" | "RETIRED" | null;
  "selected_manifest_id": string;
  "selected_manifest_continuation_basis": "NEW_MANIFEST" | "REPLAY_CHILD" | "RECOVERY_CHILD" | "CONTINUATION_CHILD" | "NEW_REQUEST_CHILD";
  "root_manifest_id": string;
  "parent_manifest_id_or_null": string | null;
  "continuation_of_manifest_id_or_null": string | null;
  "replay_of_manifest_id_or_null": string | null;
  "supersedes_manifest_id_or_null": string | null;
  "selected_manifest_generation": number;
  "config_inheritance_mode_or_null": "FRESH_CHILD_RESOLUTION" | "REPLAY_EXACT" | "RECOVERY_EXACT" | "HISTORICAL_EXPLICIT" | null;
  "input_inheritance_mode_or_null": "FRESH_CHILD_COLLECTION" | "REPLAY_EXACT" | "RECOVERY_EXACT" | "HISTORICAL_EXPLICIT" | null;
  "returned_decision_bundle_hash_or_null": string | null;
};
export const ManifestBranchDecisionContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/manifest_branch_decision_contract.schema.json", sourceHash: "8f8fc12d22eb147ce194ad6d6970f68aaaa4b124eaa858c0c34237593dee545c" } as const;

export type ManifestBranchDecisionContractScopeArray = JsonValue & JsonValue & JsonValue & JsonValue & JsonValue & JsonValue;

export type ManifestLineageTrace = {
  "lineage_trace_id": string;
  "contract_version": "MANIFEST_LINEAGE_TRACE_V1";
  "binding_scope": "RUN_MANIFEST_BRANCH_SELECTION";
  "explorer_binding_policy": "PERSIST_SELECTED_BRANCH_AND_ALL_REJECTION_BASES";
  "operator_rendering_policy": "USE_PERSISTED_TRACE_NOT_ADJACENT_MANIFEST_INFERENCE";
  "mirror_consistency_policy": "SELECTED_MANIFEST_LINEAGE_MIRRORS_MUST_STAY_EXACT";
  "nightly_context_policy": "NIGHTLY_WINDOW_AND_PREDECESSOR_CONTEXT_PERSISTED_WHEN_APPLICABLE";
  "idempotency_key": string;
  "request_identity_hash": string;
  "access_binding_hash": string;
  "requested_scope": ManifestLineageTraceScopeArray;
  "effective_scope": ManifestLineageTraceScopeArray;
  "mode": "COMPLIANCE" | "ANALYSIS";
  "run_kind": "INTERACTIVE" | "NIGHTLY" | "BACKFILL" | "REPLAY" | "REMEDIATION" | "AMENDMENT" | "MIGRATION";
  "replay_class_or_null": "STANDARD_REPLAY" | "AUDIT_REPLAY" | "COUNTERFACTUAL_ANALYSIS" | null;
  "nightly_window_key_or_null": string | null;
  "selected_branch_action": "NEW_MANIFEST" | "RETURN_EXISTING_BUNDLE" | "REUSE_SEALED_MANIFEST" | "REPLAY_CHILD" | "RECOVERY_CHILD" | "CONTINUATION_CHILD" | "NEW_REQUEST_CHILD";
  "selected_branch_reason_code": "NO_PRIOR_MANIFEST" | "TERMINAL_IDEMPOTENT_RETRY" | "PRESTART_SEALED_CONTEXT_REUSE" | "REPLAY_REQUESTED_EXACT" | "STARTED_ATTEMPT_RECOVERY" | "POST_TERMINAL_CONTINUATION_REQUIRED" | "REQUEST_IDENTITY_CHANGED" | "NIGHTLY_WINDOW_ADVANCED";
  "selected_manifest_id": string;
  "selected_manifest_continuation_basis": "NEW_MANIFEST" | "REPLAY_CHILD" | "RECOVERY_CHILD" | "CONTINUATION_CHILD" | "NEW_REQUEST_CHILD";
  "selected_manifest_generation": number;
  "root_manifest_id": string;
  "parent_manifest_id_or_null": string | null;
  "continuation_of_manifest_id_or_null": string | null;
  "replay_of_manifest_id_or_null": string | null;
  "supersedes_manifest_id_or_null": string | null;
  "prior_manifest_id_or_null": string | null;
  "prior_manifest_hash_at_decision_or_null": string | null;
  "prior_manifest_lifecycle_state_or_null": "ALLOCATED" | "FROZEN" | "SEALED" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED" | "FAILED" | "SUPERSEDED" | "REPLAY_ONLY" | "RETIRED" | null;
  "config_inheritance_mode_or_null": "FRESH_CHILD_RESOLUTION" | "REPLAY_EXACT" | "RECOVERY_EXACT" | "HISTORICAL_EXPLICIT" | null;
  "input_inheritance_mode_or_null": "FRESH_CHILD_COLLECTION" | "REPLAY_EXACT" | "RECOVERY_EXACT" | "HISTORICAL_EXPLICIT" | null;
  "returned_decision_bundle_hash_or_null": string | null;
  "candidate_evaluations": Array<ManifestLineageTraceCandidateEvaluation>;
  "mirror_consistency_state": "ALL_MIRRORS_IN_SYNC";
  "mirror_sources": Array<"RUN_MANIFEST_TOP_LEVEL" | "CONTINUATION_SET" | "MANIFEST_BRANCH_DECISION" | "FROZEN_EXECUTION_BINDING">;
  "nightly_predecessor_batch_run_ref_or_null": string | null;
  "nightly_predecessor_manifest_id_or_null": string | null;
  "nightly_predecessor_manifest_hash_or_null": string | null;
  "nightly_context_reason_code_or_null": "NOT_NIGHTLY" | "NO_PREDECESSOR_BATCH" | "SAME_WINDOW_REUSE" | "WINDOW_ADVANCE_FROM_PREDECESSOR";
  "branch_decision_audit_refs": Array<string>;
  "branch_decision_trace_span_refs": Array<string>;
};
export const ManifestLineageTraceSchemaLineage = { schemaId: "https://taxat.dev/schemas/manifest_lineage_trace.schema.json", sourceHash: "cd09f533c78f7b4580cafbf4ce26d515759094c9df230f82e6f67bcfcdc53335" } as const;

export type ManifestLineageTraceScopeArray = Array<"year_end" | "quarterly_update" | "estimate_only" | "prepare_submission" | "submit" | "amendment_intent" | "amendment_submit">;

export type ManifestLineageTraceCandidateEvaluation = {
  "candidate_action": "NEW_MANIFEST" | "RETURN_EXISTING_BUNDLE" | "REUSE_SEALED_MANIFEST" | "REPLAY_CHILD" | "RECOVERY_CHILD" | "CONTINUATION_CHILD" | "NEW_REQUEST_CHILD";
  "evaluation_state": "SELECTED" | "REJECTED";
  "compared_manifest_id_or_null": string | null;
  "compared_manifest_hash_or_null": string | null;
  "compared_manifest_lifecycle_state_or_null": "ALLOCATED" | "FROZEN" | "SEALED" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED" | "FAILED" | "SUPERSEDED" | "REPLAY_ONLY" | "RETIRED" | null;
  "disqualifier_reason_codes": Array<"NO_PRIOR_MANIFEST" | "REQUEST_IDENTITY_HASH_MISMATCH" | "ACCESS_BINDING_HASH_MISMATCH" | "REQUESTED_SCOPE_MISMATCH" | "EFFECTIVE_SCOPE_MISMATCH" | "MODE_MISMATCH" | "RUN_KIND_MISMATCH" | "REPLAY_CLASS_MISMATCH" | "NIGHTLY_WINDOW_MISMATCH" | "PRIOR_MANIFEST_NOT_TERMINAL" | "PRIOR_MANIFEST_NOT_SEALED" | "PRIOR_MANIFEST_ALREADY_STARTED" | "PRIOR_MANIFEST_HASH_MISSING" | "PARENT_MANIFEST_HASH_MISMATCH" | "CONFIG_INHERITANCE_MODE_MISMATCH" | "INPUT_INHERITANCE_MODE_MISMATCH" | "REPLAY_NOT_REQUESTED" | "RECOVERY_NOT_REQUIRED" | "CONTINUATION_NOT_LEGAL" | "REQUEST_IDENTITY_CONTINUATION_NOT_REQUIRED" | "RETURNED_BUNDLE_NOT_AVAILABLE" | "NIGHTLY_PREDECESSOR_CONTEXT_MISSING" | "NIGHTLY_PREDECESSOR_BATCH_MISSING" | "NIGHTLY_PREDECESSOR_MANIFEST_MISSING" | "CHILD_ALLOCATION_NOT_REQUIRED">;
};

export type ManifestStartClaimContract = {
  "contract_class": "MANIFEST_START_CLAIM";
  "manifest_id": string;
  "manifest_hash": string;
  "execution_basis_hash": string;
  "access_binding_hash": string;
  "attempt_lineage_ref": string;
  "claim_state": "UNCLAIMED_SEALED" | "ACTIVE_LEASED" | "STALE_RECLAIM_REQUIRED" | "TERMINAL_RESULT_RECORDED";
  "claim_status_code": "CLAIMABLE" | "ALREADY_ACTIVE" | "STALE_RECLAIM_REQUIRED" | "ALREADY_TERMINAL";
  "claim_epoch": number;
  "claim_holder_ref_or_null": string | null;
  "claim_token_or_null": string | null;
  "claim_acquired_at_or_null": ISO8601DateTimeString;
  "claim_expires_at_or_null": ISO8601DateTimeString;
  "claim_released_at_or_null": ISO8601DateTimeString;
  "claim_release_reason_code_or_null": "COMPLETED" | "FAILED" | "BLOCKED" | "SUPERSEDED" | "REPLAY_ONLY" | "RETIRED" | null;
  "stale_reclaim_reason_code_or_null": "LEASE_EXPIRED_OWNER_UNHEALTHY" | "SUCCESSOR_RECOVERY_AFTER_CRASH" | "SUCCESSOR_RECOVERY_AFTER_BROKER_LOSS" | "NIGHTLY_RECLAIM_SUCCESSOR_VERIFIED" | null;
  "publication_state": "NOT_PUBLISHED" | "PUBLISHED_WITH_ACTIVE_LEASE" | "PUBLISHED_STALE_RECLAIM_REQUIRED" | "PUBLISHED_TERMINAL";
  "stage_dag_ref_or_null": string | null;
  "outbox_batch_ref_or_null": string | null;
  "first_publication_committed_at_or_null": ISO8601DateTimeString;
  "concurrency_policy": "SINGLE_WRITER_LEASED_START_ONLY";
  "claim_publication_atomicity": "CLAIM_AND_FIRST_PUBLICATION_COMMIT_TOGETHER";
  "stale_reclaim_policy": "EXPLICIT_SUCCESSOR_PROOF_REQUIRED";
  "recovery_child_policy": "FORBID_WHILE_ACTIVE_LEASE";
  "nightly_reclaim_policy": "DEFER_DUPLICATE_START_WHILE_ACTIVE_LEASE";
};
export const ManifestStartClaimContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/manifest_start_claim_contract.schema.json", sourceHash: "43f25058c5b8c17c08d2c0e0f764f551f26d42a6af824f15382123bcae4beb00" } as const;

export type RecoveryCheckpoint = {
  "checkpoint_id": string;
  "datastore_ref": string;
  "recovery_governance_contract": RecoveryGovernanceContract & {
    "boundary_scope"?: "RECOVERY_CHECKPOINT";
  };
  "backup_ref": string | null;
  "checkpoint_inventory_ref": string | null;
  "snapshot_time": ISO8601DateTimeString;
  "restore_tested_at": ISO8601DateTimeString;
  "restore_verification_hash": string | null;
  "rpo_class": "RPO_15M" | "RPO_4H" | "RPO_BEST_EFFORT";
  "rto_class": "RTO_60M" | "RTO_4H" | "RTO_24H";
  "checkpoint_state": "REQUESTED" | "CREATED" | "VERIFIED" | "QUARANTINED" | "EXPIRED";
  "state_transition_contract": StateTransitionContract & {
    "object_family"?: "RECOVERY_CHECKPOINT";
    "machine_code"?: "RECOVERY_CHECKPOINT_LIFECYCLE_V1";
    "state_field_name"?: "checkpoint_state";
  };
  "restore_drill_ref": string | null;
  "privacy_reconciliation_contract": null | RestorePrivacyReconciliationContract;
  "audit_continuity_verified": boolean;
  "queue_rebuild_verified": boolean;
  "authority_rebuild_verified": boolean;
  "authority_binding_revalidation_verified": boolean;
  "privacy_reconciliation_outcome_ref": string | null;
  "reopen_readiness_state": "BLOCKED_PENDING_CHECKPOINT_CREATION" | "BLOCKED_PENDING_RESTORE_DRILL" | "BLOCKED_PENDING_PRIVACY_RECONCILIATION" | "BLOCKED_PENDING_COMPENSATING_RE_ERASURE" | "BLOCKED_PENDING_LIMITATION_RECONCILIATION" | "BLOCKED_LEGAL_HOLD_REVIEW" | "BLOCKED_PROOF_PRESERVATION_REVIEW" | "BLOCKED_AUTHORITY_AMBIGUITY_REVIEW" | "BLOCKED_PENDING_AUDIT_CONTINUITY" | "BLOCKED_PENDING_QUEUE_REBUILD" | "BLOCKED_PENDING_AUTHORITY_REVALIDATION" | "READY_FOR_REOPEN" | "QUARANTINED" | "EXPIRED";
  "quarantine_reason_code": string | null;
};
export const RecoveryCheckpointSchemaLineage = { schemaId: "https://taxat.dev/schemas/recovery_checkpoint.schema.json", sourceHash: "ff731ca38252d78d1bb84979fc46c20f4527d8acc52b19bbafd7f31641134dce" } as const;

export type RecoveryGovernanceContract = {
  "contract_version": "RECOVERY_GOVERNANCE_V1";
  "boundary_scope": "RECOVERY_CHECKPOINT" | "DEPLOYMENT_RELEASE";
  "protected_workload_class": "CONTROL_PLANE_LEGAL_TRUTH" | "REBUILDABLE_PROJECTION" | "DISPOSABLE_RUNTIME_CACHE";
  "recovery_tier_class": "TIER_0_CONTROL_PLANE" | "TIER_1_REBUILDABLE" | "TIER_2_DISPOSABLE";
  "rpo_class": "RPO_15M" | "RPO_4H" | "RPO_BEST_EFFORT";
  "rto_class": "RTO_60M" | "RTO_4H" | "RTO_24H";
  "boundary_specific_binding_policy": "CHECKPOINT_RETAINS_INVENTORY_RESTORE_EVIDENCE_AND_REOPEN_GATES" | "RELEASE_RETAINS_ROLLBACK_BOUNDARY_AND_FAIL_FORWARD_GOVERNANCE";
  "checkpoint_inventory_policy": "CHECKPOINTS_REQUIRED_AND_INVENTORY_LINKED";
  "checkpoint_evidence_policy": "VERIFIED_CHECKPOINT_REQUIRES_BOUND_RESTORE_DRILL";
  "privacy_reconciliation_policy": "POST_RESTORE_PRIVACY_RECONCILIATION_REQUIRED_BEFORE_REOPEN";
  "compensating_re_erasure_policy": "RESURRECTED_RESTRICTED_DATA_REQUIRES_TYPED_COMPENSATING_RE_ERASURE";
  "limitation_reconciliation_policy": "REPLAY_AND_ENQUIRY_LIMITATIONS_MUST_REMAIN_REOPEN_SAFE";
  "queue_recovery_policy": "QUEUES_REBUILT_FROM_DURABLE_TRUTH_ONLY";
  "authority_recovery_policy": "AUTHORITY_MUTATIONS_REQUIRE_LINEAGE_AND_BINDING_REVALIDATION";
  "reopen_gate_policy": "REOPEN_BLOCKED_UNTIL_RESTORE_PRIVACY_AUDIT_QUEUE_AND_AUTHORITY_PASS";
  "rollback_boundary_policy": "ROLLBACK_ONLY_WHILE_SCHEMA_WINDOW_COMPATIBLE";
  "fail_forward_policy": "FAIL_FORWARD_REQUIRES_COMPENSATING_RELEASE_AND_OWNER";
  "failover_audit_policy": "FAILOVER_AND_FAILBACK_REQUIRE_AUDITABLE_OWNER";
};
export const RecoveryGovernanceContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/recovery_governance_contract.schema.json", sourceHash: "34f94dd39c5e0d3f88b505641986bfb1ec497fea2e98baede2729f22b3b87952" } as const;

export type ReleaseCandidateIdentityContract = {
  "contract_version": "RELEASE_CANDIDATE_IDENTITY_V1";
  "candidate_identity_hash": string;
  "candidate_environment_ref": string;
  "build_artifact_ref": string;
  "artifact_digest": string;
  "schema_bundle_hash": string;
  "config_bundle_hash": string;
  "migration_plan_ref_or_null": string | null;
  "enabled_provider_profile_refs": Array<string>;
  "supported_client_window_ref_or_null": string | null;
  "array_canonicalization_policy": "SORTED_UNIQUE_ARRAY_COMPONENTS_ONLY";
  "suite_context_policy": "SUITE_SPECIFIC_DIMENSIONS_MUST_BE_DECLARED_OR_EXPLICITLY_NULL";
  "admissibility_binding_policy": "GREEN_GATES_REQUIRE_EXACT_CANDIDATE_BINDING";
};
export const ReleaseCandidateIdentityContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/release_candidate_identity_contract.schema.json", sourceHash: "c37f45e4b5bd4ad16bc3849f65e102d0f0c0b3d63c89c2b9d4e6620809b64656" } as const;

export type ReleaseVerificationManifest = {
  "verification_manifest_id": string;
  "candidate_environment_ref": string;
  "build_artifact_ref": string;
  "artifact_digest": string;
  "candidate_identity_hash": string;
  "candidate_identity_contract": ReleaseCandidateIdentityContract;
  "manifest_assembly_contract": ReleaseVerificationManifestAssemblyContract;
  "schema_bundle_hash": string;
  "schema_reader_window_contract": SchemaReaderWindowContract;
  "schema_bundle_compatibility_gate_contract": SchemaBundleCompatibilityGateContract;
  "config_bundle_hash": string;
  "migration_mode": "NO_MIGRATION" | "MIGRATION_REQUIRED";
  "migration_plan_ref": string | null;
  "enabled_provider_profile_refs": Array<string>;
  "executed_test_run_identifiers": Array<string>;
  "blocking_gates": {
    "schema_compatibility": ReleaseVerificationManifestGateResult & {
      "suite_family"?: "SCHEMA_COMPATIBILITY";
    };
    "deterministic_and_state_machine": ReleaseVerificationManifestGateResult & {
      "suite_family"?: "DETERMINISTIC_AND_STATE_MACHINE";
    };
    "northbound_api": ReleaseVerificationManifestGateResult & {
      "suite_family"?: "NORTHBOUND_API";
    };
    "authority_sandbox": ReleaseVerificationManifestGateResult & {
      "suite_family"?: "AUTHORITY_SANDBOX";
    };
    "operator_client": ReleaseVerificationManifestGateResult & {
      "suite_family"?: "OPERATOR_CLIENT";
    };
    "security": ReleaseVerificationManifestGateResult & {
      "suite_family"?: "SECURITY";
    };
    "performance_and_canary": ReleaseVerificationManifestGateResult & {
      "suite_family"?: "PERFORMANCE_AND_CANARY";
    };
    "restore_drill": ReleaseVerificationManifestGateResult & {
      "suite_family"?: "RESTORE_DRILL";
    };
    "migration_verification": ReleaseVerificationManifestGateResult & {
      "suite_family"?: "MIGRATION_VERIFICATION";
    };
    "supply_chain": ReleaseVerificationManifestGateResult & {
      "suite_family"?: "SUPPLY_CHAIN";
    };
    "suite_admissibility": ReleaseVerificationManifestGateResult & {
      "suite_family"?: "SUITE_ADMISSIBILITY";
    };
  };
  "migration_ledger_refs": Array<string>;
  "canary_summary_ref": string | null;
  "deterministic_golden_pack_ref": string | null;
  "restore_drill_ref": string | null;
  "restore_checkpoint_ref": string | null;
  "supported_client_window_ref": string;
  "client_compatibility_matrix_ref": string | null;
  "decision_state": "PENDING" | "BLOCKED" | "APPROVED" | "SUPERSEDED";
  "state_transition_contract": StateTransitionContract & {
    "object_family"?: "RELEASE_VERIFICATION_MANIFEST";
    "machine_code"?: "RELEASE_VERIFICATION_MANIFEST_DECISION_V1";
    "state_field_name"?: "decision_state";
  };
  "approval_ref": string | null;
  "deployment_release_ref": string | null;
  "superseded_by_verification_manifest_ref": string | null;
  "decision_changed_at": ISO8601DateTimeString;
  "created_at": ISO8601DateTimeString;
};
export const ReleaseVerificationManifestSchemaLineage = { schemaId: "https://taxat.dev/schemas/release_verification_manifest.schema.json", sourceHash: "f3aa0e66b6ccb71a8a0e8f39d538dbd4611b07942b62ad3b2024e64ac446d8a6" } as const;

export type ReleaseVerificationManifestGateResult = {
  "suite_family": "SCHEMA_COMPATIBILITY" | "DETERMINISTIC_AND_STATE_MACHINE" | "NORTHBOUND_API" | "AUTHORITY_SANDBOX" | "OPERATOR_CLIENT" | "SECURITY" | "PERFORMANCE_AND_CANARY" | "RESTORE_DRILL" | "MIGRATION_VERIFICATION" | "SUPPLY_CHAIN" | "SUITE_ADMISSIBILITY";
  "candidate_identity_hash": string;
  "compatibility_gate_hash_or_null": string | null;
  "authority_sandbox_coverage_hash_or_null": string | null;
  "result_ref": string;
  "admissibility_ref": string;
  "status": "GREEN" | "RED";
  "admissibility_state": "ADMISSIBLE" | "INADMISSIBLE";
  "quarantine_state": "NONE" | "QUARANTINED";
  "manual_waiver_state": "NONE" | "WAIVED";
  "executed_at": ISO8601DateTimeString;
};

export type ReleaseVerificationManifestAssemblyContract = {
  "contract_version": "RELEASE_VERIFICATION_MANIFEST_ASSEMBLY_V1";
  "assembly_contract_hash": string;
  "candidate_identity_hash": string;
  "compatibility_gate_hash": string;
  "gate_order_policy": "CANONICAL_BLOCKING_GATE_ORDER_V1";
  "evidence_source_policy": "FIRST_CLASS_RESULT_AND_ADMISSIBILITY_ARTIFACTS_ONLY";
  "admissibility_derivation_policy": "GREEN_REQUIRES_ADMISSIBLE_UNQUARANTINED_UNWAIVED_EVIDENCE";
  "companion_evidence_policy": "GREEN_SUPPORTING_GATES_REQUIRE_COMPANION_EVIDENCE_REFS";
  "decision_posture_policy": "APPROVAL_AND_SUPERSESSION_REQUIRE_EXPLICIT_DECISION_LINEAGE";
  "supersession_policy": "NEW_MANIFEST_SUPERSEDES_OLD_MANIFEST_EXPLICITLY_NO_POST_HOC_REWRITE";
  "enabled_provider_profile_refs": Array<string>;
  "executed_test_run_identifiers": Array<string>;
  "gate_bindings": Array<ReleaseVerificationManifestAssemblyContractGateBinding>;
  "migration_mode": "NO_MIGRATION" | "MIGRATION_REQUIRED";
  "migration_plan_ref_or_null": string | null;
  "migration_ledger_refs": Array<string>;
  "supported_client_window_ref": string;
  "canary_summary_ref_or_null": string | null;
  "deterministic_golden_pack_ref_or_null": string | null;
  "restore_drill_ref_or_null": string | null;
  "restore_checkpoint_ref_or_null": string | null;
  "client_compatibility_matrix_ref_or_null": string | null;
  "decision_state": "PENDING" | "BLOCKED" | "APPROVED" | "SUPERSEDED";
  "approval_ref_or_null": string | null;
  "deployment_release_ref_or_null": string | null;
  "superseded_by_verification_manifest_ref_or_null": string | null;
};
export const ReleaseVerificationManifestAssemblyContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/release_verification_manifest_assembly_contract.schema.json", sourceHash: "7862e41c2a9073354e350cfe2bba3821df32b3e765a7e3a30d5949d68d85eb9c" } as const;

export type ReleaseVerificationManifestAssemblyContractGateBinding = {
  "gate_name": "schema_compatibility" | "deterministic_and_state_machine" | "northbound_api" | "authority_sandbox" | "operator_client" | "security" | "performance_and_canary" | "restore_drill" | "migration_verification" | "supply_chain" | "suite_admissibility";
  "suite_family": "SCHEMA_COMPATIBILITY" | "DETERMINISTIC_AND_STATE_MACHINE" | "NORTHBOUND_API" | "AUTHORITY_SANDBOX" | "OPERATOR_CLIENT" | "SECURITY" | "PERFORMANCE_AND_CANARY" | "RESTORE_DRILL" | "MIGRATION_VERIFICATION" | "SUPPLY_CHAIN" | "SUITE_ADMISSIBILITY";
  "candidate_identity_hash": string;
  "compatibility_gate_hash_or_null": string | null;
  "authority_sandbox_coverage_hash_or_null": string | null;
  "result_ref": string;
  "admissibility_ref": string;
  "status": "GREEN" | "RED";
  "admissibility_state": "ADMISSIBLE" | "INADMISSIBLE";
  "quarantine_state": "NONE" | "QUARANTINED";
  "manual_waiver_state": "NONE" | "WAIVED";
  "executed_at": ISO8601DateTimeString;
};

export type ReplayAttestation = {
  "replay_attestation_id": string;
  "manifest_id": string;
  "replay_of_manifest_id": string;
  "artifact_type": "ReplayAttestation";
  "execution_mode": "COMPLIANCE" | "ANALYSIS";
  "analysis_only": boolean;
  "non_compliance_config_refs": Array<string>;
  "counterfactual_basis": string | null;
  "execution_mode_boundary_contract": ExecutionModeBoundaryContract & {
    "run_kind"?: "REPLAY";
  };
  "replay_class": "STANDARD_REPLAY" | "AUDIT_REPLAY" | "COUNTERFACTUAL_ANALYSIS";
  "comparison_mode": "EXACT_HASH_MATCH" | "COUNTERFACTUAL_DECLARED" | "LIMITED_HISTORICAL_COMPARISON" | "BASIS_INCOMPLETE" | "BASIS_CORRUPT";
  "basis_validation_state": "VALID" | "RETENTION_LIMITED" | "MISSING_DEPENDENCY" | "CORRUPT" | "SCHEMA_INCOMPATIBLE" | "BUILD_UNAVAILABLE";
  "outcome_class": "EXACT_MATCH" | "EXPECTED_EQUIVALENCE" | "EXPECTED_DIFFERENCE" | "LIMITED_COMPARABLE" | "BASIS_INCOMPLETE" | "BASIS_CORRUPT" | "UNEXPECTED_MISMATCH";
  "basis_integrity_contract": ReplayBasisIntegrityContract;
  "basis_identity_verdict": "IDENTICAL" | "DIFFERENT" | "UNDECIDABLE" | "CORRUPT";
  "deterministic_equivalence_verdict": "IDENTICAL" | "DIFFERENT" | "UNDECIDABLE" | "CORRUPT";
  "expected_execution_basis_hash": string | null;
  "actual_execution_basis_hash": string | null;
  "expected_deterministic_outcome_hash": string | null;
  "actual_deterministic_outcome_hash": string | null;
  "basis_dimension_results": JsonValue & JsonValue & JsonValue & JsonValue & JsonValue & JsonValue;
  "outcome_component_results": JsonValue & JsonValue & JsonValue & JsonValue & JsonValue & JsonValue & JsonValue & JsonValue & JsonValue & JsonValue & JsonValue & JsonValue & JsonValue & JsonValue;
  "basis_coverage": number;
  "basis_match_ratio": number;
  "outcome_coverage": number;
  "outcome_match_ratio": number;
  "material_outcome_coverage": number;
  "material_outcome_match_ratio": number;
  "difference_reason_codes": Array<string>;
  "limitation_codes": Array<string>;
  "mismatch_inventory": Array<ReplayAttestationMismatchItem>;
  "plain_summary": string;
  "operator_summary_ref": string | null;
  "auditor_summary_ref": string | null;
  "compared_at": ISO8601DateTimeString;
  "signature_verification_state": "VERIFIED" | "NOT_SIGNED" | "VERIFICATION_MATERIAL_MISSING" | "SIGNATURE_INVALID";
  "attestation_envelope_ref": string | null;
  "verification_material_refs": Array<string>;
  "attestation_confidence_score": number;
  "attestation_confidence_band": "VERY_HIGH" | "HIGH" | "MODERATE" | "LOW" | "INSUFFICIENT";
  "contract": SchemaBundle;
};
export const ReplayAttestationSchemaLineage = { schemaId: "https://taxat.dev/schemas/replay_attestation.schema.json", sourceHash: "47b616c74105f9d95cb779da399ae23526279da6e9dddaffdf33e0efe9e57e79" } as const;

export type ReplayAttestationMismatchItem = {
  "component_class": "EXECUTION_BASIS" | "CONFIG_FREEZE" | "INPUT_FREEZE" | "AUTHORITY_BASIS" | "LATE_DATA_BASIS" | "GATE_SEQUENCE" | "SNAPSHOT" | "COMPUTE_RESULT" | "FORECAST_SET" | "RISK_REPORT" | "PARITY_RESULT" | "TRUST_SUMMARY" | "EVIDENCE_GRAPH" | "TWIN_VIEW" | "FILING_PACKET" | "AUTHORITY_RESULT" | "DRIFT_RECORD" | "DECISION_BUNDLE" | "OTHER";
  "component_ref"?: string | null;
  "mismatch_class": "HASH_DIFFERENCE" | "MISSING_EXPECTED" | "MISSING_ACTUAL" | "CORRUPT_EXPECTED" | "CORRUPT_ACTUAL" | "SCHEMA_READER_INCOMPATIBLE" | "RETENTION_LIMITED" | "DECLARED_COUNTERFACTUAL" | "VALUE_DIFFERENCE";
  "materiality": "NON_MATERIAL" | "MATERIAL" | "BLOCKING";
  "expected_hash": string | null;
  "actual_hash": string | null;
  "reason_codes": Array<string>;
  "variance_class": "DECLARED_COUNTERFACTUAL" | "UNDECLARED_BASIS_VARIANCE" | "NON_MATERIAL_OUTCOME_VARIANCE" | "MATERIAL_OUTCOME_VARIANCE" | "BLOCKING_OUTCOME_VARIANCE" | "LIMITATION_ONLY" | "INTEGRITY_FAILURE";
  "comparison_weight": number;
};

export type ReplayAttestationBasisDimensionResult = {
  "dimension_code": "IDENTITY_AUTHORITY" | "EXECUTABLE" | "CONFIG" | "INPUT" | "POST_SEAL" | "DETERMINISM";
  "comparison_state": "MATCH" | "MISMATCH" | "DECLARED_CHANGE" | "UNOBSERVABLE" | "CORRUPT";
  "variance_class": "NONE" | "DECLARED_COUNTERFACTUAL" | "UNDECLARED_BASIS_VARIANCE" | "LIMITATION_ONLY" | "INTEGRITY_FAILURE";
  "comparison_weight": number;
  "expected_hash": string | null;
  "actual_hash": string | null;
  "reason_codes": Array<string>;
};

export type ReplayAttestationOutcomeComponentResult = {
  "component_class": "DECISION_BUNDLE" | "GATE_SEQUENCE" | "SNAPSHOT" | "COMPUTE_RESULT" | "FORECAST_SET" | "RISK_REPORT" | "PARITY_RESULT" | "TRUST_SUMMARY" | "EVIDENCE_GRAPH" | "TWIN_VIEW" | "FILING_PACKET" | "AUTHORITY_RESULT" | "LATE_DATA_BASIS" | "DRIFT_RECORD";
  "component_ref"?: string | null;
  "comparison_state": "MATCH" | "MISMATCH" | "DECLARED_CHANGE" | "UNOBSERVABLE" | "CORRUPT";
  "variance_class": "NONE" | "DECLARED_COUNTERFACTUAL" | "NON_MATERIAL_OUTCOME_VARIANCE" | "MATERIAL_OUTCOME_VARIANCE" | "BLOCKING_OUTCOME_VARIANCE" | "LIMITATION_ONLY" | "INTEGRITY_FAILURE";
  "comparison_weight": number;
  "materiality": "NON_MATERIAL" | "MATERIAL" | "BLOCKING";
  "expected_hash": string | null;
  "actual_hash": string | null;
  "reason_codes": Array<string>;
};

export type RestoreDrillResult = {
  "restore_drill_id": string;
  "checkpoint_ref": string;
  "candidate_environment_ref": string;
  "build_artifact_ref": string;
  "artifact_digest": string;
  "candidate_identity_hash": string;
  "candidate_identity_contract": ReleaseCandidateIdentityContract;
  "schema_bundle_hash": string;
  "schema_reader_window_contract": SchemaReaderWindowContract;
  "config_bundle_hash": string;
  "migration_plan_ref": string | null;
  "enabled_provider_profile_refs": Array<string>;
  "drill_scope": "CURRENT_RELEASE_CANDIDATE" | "DR_FAILOVER_FAILBACK";
  "executed_at": ISO8601DateTimeString;
  "outcome": "PASSED" | "FAILED" | "QUARANTINED";
  "audit_continuity_verified": boolean;
  "privacy_reconciliation_verified": boolean;
  "queue_rebuild_verified": boolean;
  "authority_rebuild_verified": boolean;
  "authority_binding_revalidation_verified": boolean;
  "privacy_reconciliation_contract": RestorePrivacyReconciliationContract;
  "drill_report_ref": string;
  "failure_reason_codes": Array<string>;
};
export const RestoreDrillResultSchemaLineage = { schemaId: "https://taxat.dev/schemas/restore_drill_result.schema.json", sourceHash: "819473b6d28a889373b01749e3970634bb682884a7fc44ec95bc09cc69b7a4bb" } as const;

export type RestorePrivacyReconciliationContract = {
  "contract_version": "RESTORE_PRIVACY_RECONCILIATION_V1";
  "reconciliation_contract_hash": string;
  "checkpoint_ref": string;
  "restore_drill_ref": string;
  "reconciliation_scope_policy": "RESTORE_REQUIRES_PRIVACY_LIMITATION_AND_RE_ERASURE_PROOF";
  "resurrected_data_posture": "UNKNOWN_UNTIL_RECONCILED" | "NONE_DETECTED" | "ERASURE_OR_PSEUDONYMISATION_RESURRECTED";
  "resurrected_subject_count_or_null": number | null;
  "privacy_reconciliation_state": "PENDING_RECONCILIATION" | "RECONCILED_NO_COMPENSATION_REQUIRED" | "COMPENSATING_RE_ERASURE_REQUIRED" | "COMPENSATING_RE_ERASURE_IN_PROGRESS" | "RECONCILED_WITH_COMPENSATING_RE_ERASURE" | "BLOCKED_LEGAL_HOLD" | "BLOCKED_PROOF_PRESERVATION" | "BLOCKED_AUTHORITY_AMBIGUITY";
  "privacy_reconciliation_outcome_ref": string;
  "compensating_re_erasure_state": "NOT_REQUIRED" | "REQUIRED_PENDING" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED";
  "compensating_re_erasure_workflow_ref_or_null": string | null;
  "compensating_re_erasure_audit_ref_or_null": string | null;
  "legal_hold_ref_or_null": string | null;
  "proof_preservation_basis_ref_or_null": string | null;
  "authority_ambiguity_ref_or_null": string | null;
  "audit_chain_continuity_state": "VERIFIED" | "FAILED";
  "audit_chain_continuity_ref": string;
  "replay_limitation_state": "VERIFIED" | "LIMITED_RECONCILED" | "FAILED";
  "enquiry_limitation_state": "VERIFIED" | "LIMITED_RECONCILED" | "FAILED";
  "reopen_access_state": "BLOCKED" | "LIMITED" | "READY_FOR_REOPEN";
  "reconciliation_decided_at_or_null": ISO8601DateTimeString;
  "re_erasure_completed_at_or_null": ISO8601DateTimeString;
};
export const RestorePrivacyReconciliationContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/restore_privacy_reconciliation_contract.schema.json", sourceHash: "7157d0d667ba768df915443b04f67d9474abca3625c0a4074af73511e307bf47" } as const;

export type SchemaBundle = {
  "schema_bundle_hash": string;
  "published_at"?: ISO8601DateTimeString;
  "compatibility_profile_ref": string;
  "schema_reader_window_contract": SchemaReaderWindowContract;
  "entries": Array<SchemaBundleSchemaBundleEntry>;
};
export const SchemaBundleSchemaLineage = { schemaId: "https://taxat.dev/schemas/schema_bundle.schema.json", sourceHash: "901500d2d44a2c6b76bc64dd2afe5daa5a8a0f1d853f04f6ea7555f994086bb8" } as const;

export type SchemaBundleSchemaBundleEntry = {
  "schema_id": string;
  "artifact_type": string;
  "semantic_version": string;
  "content_hash": string;
  "dialect_ref": string;
  "compatibility_class": string;
  "supersedes_schema_id"?: string | null;
  "writer_min_reader_version": string;
  "allowed_upgrade_kinds": Array<"PATCH_BACKWARD" | "MINOR_BACKWARD" | "MAJOR_BREAKING">;
};

export type SchemaBundleExactDecimalString = ExactDecimalString;

export type SchemaBundleMoneyValue = ExactDecimalString;

export type SchemaBundleMoneyProfile = {
  "currency_code": string;
  "scale": number;
  "rounding_mode": "HALF_UP" | "HALF_EVEN" | "DOWN" | "UP";
  "aggregation_boundary": "DECLARED_AGGREGATION_BOUNDARY_ONLY";
  "serialization_profile": "CANONICAL_DECIMAL_STRING_V1";
};

export type SchemaBundleArtifactContract = {
  "artifact_id": string;
  "schema_id": string;
  "artifact_type": string;
  "semantic_version": string;
  "content_hash": string;
  "dialect_ref": string;
  "compatibility_class": string;
  "supersedes_schema_id"?: string | null;
  "writer_min_reader_version": string;
  "allowed_upgrade_kinds": Array<"PATCH_BACKWARD" | "MINOR_BACKWARD" | "MAJOR_BREAKING">;
  "schema_bundle_hash": string;
  "artifact_content_hash": string;
  "writer_build_id": string;
};

export type SchemaBundleCompatibilityGateContract = {
  "contract_version": "SCHEMA_BUNDLE_COMPATIBILITY_GATE_V1";
  "compatibility_gate_hash": string;
  "candidate_identity_hash": string;
  "candidate_identity_contract": ReleaseCandidateIdentityContract;
  "schema_bundle_hash": string;
  "compatibility_window_ref": string;
  "reader_window_state": "EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED" | "BACKFILL_IN_PROGRESS_PREVIOUS_READERS_SUPPORTED" | "VERIFIED_PREVIOUS_READERS_SUPPORTED" | "CONTRACT_ELIGIBLE_WINDOW_CLOSED";
  "schema_reader_window_contract": SchemaReaderWindowContract;
  "migration_plan_ref_or_null": string | null;
  "migration_ledger_refs": Array<string>;
  "supported_client_window_ref_or_null": string | null;
  "historical_manifest_guard_state": "PROTECTED" | "BLOCKED";
  "replay_restore_guard_state": "PROTECTED" | "BLOCKED";
  "native_client_window_state": "NOT_APPLICABLE" | "VERIFIED_COMPATIBLE" | "BLOCKED";
  "migration_chronology_state": "NOT_REQUIRED" | "EXPAND_ONLY" | "BACKFILL_IN_PROGRESS" | "VERIFIED_PREVIOUS_READERS_SUPPORTED" | "CONTRACT_WINDOW_CLOSED";
  "destructive_contract_state": "BLOCKED_UNTIL_WINDOW_CLOSE" | "ELIGIBLE_AFTER_WINDOW_CLOSE";
  "rollback_boundary_state": "ROLLBACK_ALLOWED" | "FAIL_FORWARD_ONLY";
  "reason_codes": Array<string>;
  "historical_manifest_policy": "FROZEN_MANIFESTS_REQUIRE_RECORDED_BUNDLE_OR_COMPATIBLE_READER";
  "destructive_change_policy": "DESTRUCTIVE_CHANGE_BLOCKED_UNTIL_WINDOW_CLOSED";
  "rollback_boundary_policy": "ROLLBACK_ALLOWED_ONLY_WHILE_PREVIOUS_READERS_SUPPORTED";
  "fail_forward_policy": "FAIL_FORWARD_REQUIRED_AFTER_WINDOW_CLOSE_OR_BREAKING_CONTRACT";
  "replay_restore_policy": "RESTORE_AND_REPLAY_REQUIRE_WINDOW_COMPATIBLE_READER";
  "client_persistence_policy": "SERVER_SCHEMA_GATE_REQUIRES_SUPPORTED_CLIENT_WINDOW_COMPATIBILITY";
  "evidence_binding_policy": "EXACT_CANDIDATE_READER_WINDOW_AND_CLIENT_WINDOW_BINDING_REQUIRED";
};
export const SchemaBundleCompatibilityGateContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/schema_bundle_compatibility_gate_contract.schema.json", sourceHash: "7e87b2e2b66221a56cae5df34ebce70e45b3dee0cb6131fd4905af4321f666a6" } as const;

export type SchemaMigrationLedger = {
  "migration_id": string;
  "datastore_ref": string;
  "target_version": string;
  "target_schema_bundle_hash": string;
  "compatibility_window_ref": string;
  "contract_phase_required": boolean;
  "phase_state": "PLANNED" | "APPLYING" | "APPLIED" | "VERIFYING" | "VERIFIED" | "CONTRACTING" | "CONTRACTED" | "HALTED" | "FAILED" | "SUPERSEDED";
  "state_transition_contract": StateTransitionContract & {
    "object_family"?: "SCHEMA_MIGRATION_LEDGER";
    "machine_code"?: "SCHEMA_MIGRATION_LEDGER_PHASE_V1";
    "state_field_name"?: "phase_state";
  };
  "schema_reader_window_contract": SchemaReaderWindowContract;
  "backfill_execution_contract": BackfillExecutionContract;
  "applied_at": ISO8601DateTimeString;
  "verified_at": ISO8601DateTimeString;
  "rollback_class": "ROLLBACK_SAFE" | "FAIL_FORWARD_ONLY";
  "verification_ref": string | null;
  "halted_subphase": "APPLYING" | "VERIFYING" | "CONTRACTING" | null;
  "compatibility_window_closed_at": ISO8601DateTimeString;
  "failure_ref": string | null;
};
export const SchemaMigrationLedgerSchemaLineage = { schemaId: "https://taxat.dev/schemas/schema_migration_ledger.schema.json", sourceHash: "f76ac0227adfa99b463e48fc219d02067b26bb53762b7fc7e3839398f1fca9d5" } as const;

export type SchemaReaderWindowContract = {
  "contract_version": "SCHEMA_READER_WINDOW_CONTRACT_V1";
  "compatibility_window_ref": string;
  "writer_schema_bundle_hash": string;
  "supported_reader_schema_bundle_hashes": Array<string>;
  "protected_historical_schema_bundle_hashes": Array<string>;
  "window_state": "EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED" | "BACKFILL_IN_PROGRESS_PREVIOUS_READERS_SUPPORTED" | "VERIFIED_PREVIOUS_READERS_SUPPORTED" | "CONTRACT_ELIGIBLE_WINDOW_CLOSED";
  "historical_manifest_policy": "FROZEN_MANIFESTS_REQUIRE_RECORDED_BUNDLE_OR_COMPATIBLE_READER";
  "destructive_change_policy": "DESTRUCTIVE_CHANGE_BLOCKED_UNTIL_WINDOW_CLOSED";
  "rollback_boundary_policy": "ROLLBACK_ALLOWED_ONLY_WHILE_PREVIOUS_READERS_SUPPORTED";
  "fail_forward_policy": "FAIL_FORWARD_REQUIRED_AFTER_WINDOW_CLOSE_OR_BREAKING_CONTRACT";
  "replay_restore_policy": "RESTORE_AND_REPLAY_REQUIRE_WINDOW_COMPATIBLE_READER";
};
export const SchemaReaderWindowContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/schema_reader_window_contract.schema.json", sourceHash: "8f24727857ddc21e7524291ded9f10b82329d8462dd18640f36b95b03356285f" } as const;

export type StateTransitionContract = {
  "contract_version": "STATE_TRANSITION_CONTRACT_V1";
  "object_family": "RUN_MANIFEST" | "NIGHTLY_BATCH_RUN" | "CONFIG_VERSION" | "CONFIG_CHANGE_REQUEST" | "SOURCE_COLLECTION_RUN" | "SNAPSHOT" | "WORKFLOW_ITEM" | "FILING_CASE" | "FILING_PACKET" | "SUBMISSION_RECORD" | "RECOVERY_CHECKPOINT" | "SCHEMA_MIGRATION_LEDGER" | "DEPLOYMENT_RELEASE" | "RELEASE_VERIFICATION_MANIFEST";
  "machine_code": "RUN_MANIFEST_LIFECYCLE_V1" | "NIGHTLY_BATCH_RUN_LIFECYCLE_V1" | "CONFIG_VERSION_LIFECYCLE_V1" | "CONFIG_CHANGE_REQUEST_LIFECYCLE_V1" | "SOURCE_COLLECTION_RUN_LIFECYCLE_V1" | "SNAPSHOT_LIFECYCLE_V1" | "WORKFLOW_ITEM_LIFECYCLE_V1" | "FILING_CASE_LIFECYCLE_V1" | "FILING_PACKET_LIFECYCLE_V1" | "SUBMISSION_RECORD_LIFECYCLE_V1" | "RECOVERY_CHECKPOINT_LIFECYCLE_V1" | "SCHEMA_MIGRATION_LEDGER_PHASE_V1" | "DEPLOYMENT_RELEASE_ROLLOUT_V1" | "RELEASE_VERIFICATION_MANIFEST_DECISION_V1";
  "state_field_name": "lifecycle_state" | "checkpoint_state" | "phase_state" | "rollout_state" | "decision_state";
  "current_state": string;
  "previous_state_or_null": string | null;
  "transition_event_code": string;
  "transition_applied_at": ISO8601DateTimeString;
  "transition_audit_ref": string;
  "transition_application_policy": "NAMED_EVENT_ONLY";
  "illegal_transition_policy": "REJECT_WITH_TYPED_REASON_AND_NO_PARTIAL_WRITE";
  "concurrency_guard_policy": "COMPARE_AND_SWAP_OR_SINGLE_WRITER_LEASE";
  "terminal_reentry_policy": "TERMINAL_STATES_REQUIRE_NEW_LINEAGE";
  "recovery_supersession_policy": "RECOVERY_AND_SUPERSESSION_ALLOCATE_SUCCESSOR_OR_SUPERSEDING_LINEAGE";
  "audit_evidence_policy": "EVERY_TRANSITION_RETAINS_AUDIT_EVENT_REF";
  "typed_rejection_family": "ILLEGAL_STATE_TRANSITION";
};
export const StateTransitionContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/state_transition_contract.schema.json", sourceHash: "af225ca70a88d2193c3a7d9ed722233b7379aed6ad45674e2c3814cfd7738c47" } as const;

export const ManifestAndReleaseBindingManifest = { familyRef: "MANIFEST_AND_RELEASE", schemaCount: 22 } as const;
