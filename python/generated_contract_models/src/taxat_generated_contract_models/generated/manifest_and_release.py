"""DO NOT EDIT: generated downstream from packages/contracts-core."""
from __future__ import annotations

from typing import Literal, NotRequired, Required, TypedDict

from .primitives import ExactDecimalString, ISO8601DateTimeString, JSONValue

class ApiCommandReceipt(TypedDict, total=False):
    artifact_type: Required[Literal["ApiCommandReceipt"]]
    receipt_id: Required[str]
    tenant_id: Required[str]
    client_id: Required[str]
    principal_ref: Required[str]
    session_ref: Required[str]
    command_id: Required[str]
    command_type: Required[str]
    target_scope_class: Required[Literal["MANIFEST", "WORK_ITEM", "GOVERNANCE"]]
    manifest_id: Required[str | None]
    work_item_id: Required[str | None]
    governance_target_ref: Required[str | None]
    request_hash: Required[str]
    dependency_topology_hash: Required[str | None]
    simulation_basis_hash: Required[str | None]
    latest_mutation_basis_contract_or_null: Required[None | GovernanceMutationBasisContract]
    idempotency_key: Required[str]
    acceptance_state: Required[Literal["ACCEPTED", "DUPLICATE_REPLAY", "REJECTED_STALE_VIEW", "REJECTED_POLICY", "REJECTED_INVALID", "EXPIRED"]]
    original_acceptance_state: Required[Literal["ACCEPTED", "DUPLICATE_REPLAY", "REJECTED_STALE_VIEW", "REJECTED_POLICY", "REJECTED_INVALID", None]]
    duplicate_of_receipt_id: Required[str | None]
    projection_stream_class: Required[Literal["MANIFEST_EXPERIENCE", "WORKSPACE", "NONE"]]
    latest_projection_sequence: Required[int | None]
    latest_projection_ref: Required[str | None]
    semantic_action_id: Required[str | None]
    result_ref: Required[str | None]
    reason_codes: Required[list[str]]
    truth_boundary_contract: Required[CommandTruthBoundaryContract]
    mutation_precondition_binding: Required[MutationPreconditionBinding]
    stale_guard_family: Required[Literal["DECISION_BUNDLE_HASH", "SHELL_STABILITY_TOKEN", "FRAME_EPOCH", "WORK_ITEM_VERSION", "INTERNAL_THREAD_HEAD", "CUSTOMER_THREAD_HEAD", "REQUEST_STATE_VERSION", "APPROVAL_PACK_HASH", "CLIENT_PORTAL_WORKSPACE_VERSION", "POLICY_SNAPSHOT_HASH", "DEPENDENCY_TOPOLOGY_HASH", "SIMULATION_BASIS_HASH", "MUTATION_BASIS_CONTRACT_HASH", None]]
    latest_stale_guard_value: Required[str | int | None]
    latest_stability_contract_or_null: Required[RouteStabilityContract | None]
    activity_refs: Required[list[str]]
    audit_event_refs: Required[list[str]]
    notification_refs: Required[list[str]]
    accepted_at: Required[ISO8601DateTimeString]
    expires_at: Required[ISO8601DateTimeString]

ApiCommandReceiptSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/api_command_receipt.schema.json",
    "source_hash": "fe995f1540fa1295edffbce7fef87cc9f63da5b0d8e05b45c08c6dbb06a12ad6",
}

class BackfillExecutionContract(TypedDict, total=False):
    contract_version: Required[Literal["BACKFILL_EXECUTION_CONTRACT_V1"]]
    migration_id: Required[str]
    target_version: Required[str]
    target_schema_bundle_hash: Required[str]
    execution_requirement: Required[Literal["NO_BACKFILL_REQUIRED", "IDEMPOTENT_BACKFILL_REQUIRED"]]
    execution_state: Required[Literal["NOT_APPLICABLE", "PLANNED", "IN_PROGRESS", "COMPLETE", "HALTED", "FAILED"]]
    idempotency_policy: Required[Literal["REENTRANT_UPSERT_OR_COMPARE_AND_SWAP_ONLY"]]
    meaning_preservation_policy: Required[Literal["HISTORICAL_MEANING_IMMUTABLE_APPEND_OR_DERIVE_ONLY"]]
    lineage_recording_policy: Required[Literal["EVERY_BACKFILL_WRITE_RETAINS_LEDGER_AND_AUDIT_LINEAGE"]]
    retry_safety_policy: Required[Literal["DUPLICATE_SAFE_AND_PARTIAL_PROGRESS_RESUMABLE"]]
    affected_artifact_types: Required[list[str]]
    backfill_audit_refs: Required[list[str]]

BackfillExecutionContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/backfill_execution_contract.schema.json",
    "source_hash": "5aad8237fd5fa59c1aafae3d0379ac3582dc186d0ec4030ae9e100fe31161b93",
}

class BuildArtifact(TypedDict, total=False):
    build_id: Required[str]
    vcs_ref: Required[str]
    artifact_digest: Required[str]
    sbom_ref: Required[str]
    provenance_ref: Required[str]
    signature_ref: Required[str]
    artifact_registry_ref: Required[str]
    release_channel: Required[str]
    build_time: Required[ISO8601DateTimeString]
    distribution_targets: Required[list[Literal["SERVER", "WEB_OPERATOR_SHELL", "MACOS_DESKTOP"]]]
    desktop_notarization_ref: Required[str | None]
    hardened_runtime_attestation_ref: Required[str | None]

BuildArtifactSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/build_artifact.schema.json",
    "source_hash": "c3beec556ae7f806aa1e8cb64911e1fef389ae8b92297d7cadde58f5257ed2dc",
}

class CanaryHealthSummary(TypedDict, total=False):
    canary_summary_id: Required[str]
    candidate_environment_ref: Required[str]
    build_artifact_ref: Required[str]
    artifact_digest: Required[str]
    candidate_identity_hash: Required[str]
    candidate_identity_contract: Required[ReleaseCandidateIdentityContract]
    canary_fraction: Required[float]
    slo_profile_ref: Required[str]
    error_budget_profile_ref: Required[str]
    latency_budget_state: Required[Literal["WITHIN_BUDGET", "BREACHED"]]
    error_budget_state: Required[Literal["WITHIN_BUDGET", "BREACHED"]]
    health_gate_state: Required[Literal["GREEN", "AMBER", "RED"]]
    abort_recommended: Required[bool]
    summary_ref: Required[str]
    evaluated_at: Required[ISO8601DateTimeString]

CanaryHealthSummarySchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/canary_health_summary.schema.json",
    "source_hash": "dae0f978bc9c36ce668547a631f996ab2d657274a9ed55c2264d9466ccce81b8",
}

class DeploymentRelease(TypedDict, total=False):
    release_id: Required[str]
    environment_ref: Required[str]
    build_id: Required[str]
    candidate_identity_hash: Required[str]
    candidate_identity_contract: Required[ReleaseCandidateIdentityContract]
    recovery_governance_contract: Required[RecoveryGovernanceContract]
    schema_bundle_hash: Required[str]
    schema_reader_window_contract: Required[SchemaReaderWindowContract]
    schema_bundle_compatibility_gate_contract: Required[SchemaBundleCompatibilityGateContract]
    config_bundle_hash: Required[str]
    rollout_strategy: Required[Literal["STANDARD_CANARY", "EMERGENCY_PROMOTE", "PIN_BASELINE", "FAIL_FORWARD_COMPENSATING"]]
    rollout_state: Required[Literal["PLANNED", "CANARY", "PROMOTED", "FAILED_FORWARD", "PINNED", "ABORTED", "ROLLED_BACK", "SUPERSEDED"]]
    state_transition_contract: Required[StateTransitionContract]
    rollback_boundary_state: Required[Literal["ROLLBACK_ALLOWED", "FAIL_FORWARD_ONLY"]]
    canary_fraction: Required[float | None]
    health_gate_state: Required[Literal["GREEN", "AMBER", "RED"]]
    release_verification_manifest_ref: Required[str]
    supported_client_window_ref: Required[str]
    deployed_at: Required[ISO8601DateTimeString]
    rollback_of_release_id: Required[str | None]
    compensating_release_id_or_null: Required[str | None]
    rollback_runbook_ref: Required[str]
    fail_forward_runbook_ref: Required[str]
    fail_forward_owner_ref_or_null: Required[str | None]
    emergency_override_ref: Required[str | None]
    emergency_override_expires_at: Required[ISO8601DateTimeString]

DeploymentReleaseSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/deployment_release.schema.json",
    "source_hash": "aadebeda257a73863828b7d26a512e42abdf1c0cc06ec73768df2e8922595154",
}

class DeterministicGoldenPack(TypedDict, total=False):
    golden_pack_id: Required[str]
    artifact_type: Required[Literal["DeterministicGoldenPack"]]
    contract_version: Required[Literal["DETERMINISTIC_GOLDEN_PACK_V1"]]
    golden_pack_hash: Required[str]
    candidate_identity_hash: Required[str]
    candidate_identity_contract: Required[ReleaseCandidateIdentityContract]
    schema_bundle_hash: Required[str]
    config_bundle_hash: Required[str]
    canonical_serialization_policy: Required[Literal["CANONICAL_JSON_SORTED_KEYS_UTF8"]]
    exact_decimal_policy: Required[Literal["EXACT_DECIMAL_STRING_NO_LOCALE_NO_EXPONENT"]]
    null_slot_policy: Required[Literal["EXPLICIT_NULL_SLOTS_RETAINED_IN_ORDERED_PAYLOADS"]]
    replay_comparison_policy: Required[Literal["GOLDEN_FIXTURES_BIND_CANDIDATE_SCHEMA_SCOPE_AND_EXPECTED_HASHES"]]
    state_transition_policy: Required[Literal["STATE_MACHINE_FIXTURES_REQUIRE_NAMED_PREVIOUS_AND_CURRENT_STATE"]]
    cadence_policy: Required[Literal["DETERMINISTIC_RETRY_AND_RECONCILIATION_CADENCE_NO_RANDOM_JITTER"]]
    module_fixtures: Required[list[DeterministicGoldenPackModuleFixture]]
    state_transition_fixtures: Required[list[DeterministicGoldenPackStateTransitionFixture]]
    replay_fixtures: Required[list[DeterministicGoldenPackReplayFixture]]
    cadence_fixtures: Required[list[DeterministicGoldenPackCadenceFixture]]

class DeterministicGoldenPackDecimalFieldExpectation(TypedDict, total=False):
    field_path: Required[str]
    decimal_value: Required[ExactDecimalString]

class DeterministicGoldenPackOrderedArrayExpectation(TypedDict, total=False):
    field_path: Required[str]
    ordering_policy: Required[Literal["PRESERVE_DECLARED_ORDER"]]
    expected_values: Required[list[str]]

class DeterministicGoldenPackModuleFixture(TypedDict, total=False):
    fixture_id: Required[str]
    module_code: Required[str]
    artifact_family: Required[str]
    scope_binding_hash: Required[str]
    canonical_payload_hash: Required[str]
    expected_null_field_paths: Required[list[str]]
    expected_decimal_fields: Required[list[DeterministicGoldenPackDecimalFieldExpectation]]
    expected_ordered_array_fields: Required[list[DeterministicGoldenPackOrderedArrayExpectation]]
    fixture_binding_policy: Required[Literal["CANDIDATE_SCHEMA_SCOPE_BOUND"]]

class DeterministicGoldenPackStateTransitionFixture(TypedDict, total=False):
    fixture_id: Required[str]
    scope_binding_hash: Required[str]
    state_transition_contract: Required[StateTransitionContract]
    expected_current_state: Required[str]
    expected_previous_state_or_null: Required[str | None]
    expected_transition_event_code: Required[str]
    transition_binding_policy: Required[Literal["NAMED_STATE_MACHINE_TUPLE_AND_EVENT"]]

class DeterministicGoldenPackReplayFixture(TypedDict, total=False):
    fixture_id: Required[str]
    scope_binding_hash: Required[str]
    replay_class: Required[Literal["STANDARD_REPLAY", "AUDIT_REPLAY", "COUNTERFACTUAL_ANALYSIS"]]
    comparison_mode: Required[Literal["EXACT_HASH_MATCH", "COUNTERFACTUAL_DECLARED", "LIMITED_HISTORICAL_COMPARISON", "BASIS_INCOMPLETE", "BASIS_CORRUPT"]]
    expected_outcome_class: Required[Literal["EXACT_MATCH", "EXPECTED_EQUIVALENCE", "EXPECTED_DIFFERENCE", "LIMITED_COMPARABLE", "BASIS_INCOMPLETE", "BASIS_CORRUPT", "UNEXPECTED_MISMATCH"]]
    expected_execution_basis_hash: Required[str]
    expected_deterministic_outcome_hash: Required[str]
    comparison_binding_policy: Required[Literal["CANDIDATE_SCHEMA_SCOPE_AND_HASH_BOUND"]]

class DeterministicGoldenPackCadenceFixture(TypedDict, total=False):
    fixture_id: Required[str]
    scope_binding_hash: Required[str]
    cadence_family: Required[Literal["RETRY", "RECONCILIATION"]]
    attempt_index: Required[int]
    expected_cadence_seconds: Required[int]
    jitter_policy: Required[Literal["NONE"]]
    schedule_derivation_basis: Required[str]

DeterministicGoldenPackSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/deterministic_golden_pack.schema.json",
    "source_hash": "f83bf3c5f265358b73c11893797564a683e566fbf9b23a290b84125ef7d36ea1",
}

type ManifestBranchDecisionContractScopeArray = JSONValue

class ManifestBranchDecisionContract(TypedDict, total=False):
    branch_action: Required[Literal["NEW_MANIFEST", "RETURN_EXISTING_BUNDLE", "REUSE_SEALED_MANIFEST", "REPLAY_CHILD", "RECOVERY_CHILD", "CONTINUATION_CHILD", "NEW_REQUEST_CHILD"]]
    branch_reason_code: Required[Literal["NO_PRIOR_MANIFEST", "TERMINAL_IDEMPOTENT_RETRY", "PRESTART_SEALED_CONTEXT_REUSE", "REPLAY_REQUESTED_EXACT", "STARTED_ATTEMPT_RECOVERY", "POST_TERMINAL_CONTINUATION_REQUIRED", "REQUEST_IDENTITY_CHANGED", "NIGHTLY_WINDOW_ADVANCED"]]
    idempotency_key: Required[str]
    request_identity_hash: Required[str]
    access_binding_hash: Required[str]
    requested_scope: Required[ManifestBranchDecisionContractScopeArray]
    effective_scope: Required[ManifestBranchDecisionContractScopeArray]
    mode: Required[Literal["COMPLIANCE", "ANALYSIS"]]
    run_kind: Required[Literal["INTERACTIVE", "NIGHTLY", "BACKFILL", "REPLAY", "REMEDIATION", "AMENDMENT", "MIGRATION"]]
    replay_class_or_null: Required[Literal["STANDARD_REPLAY", "AUDIT_REPLAY", "COUNTERFACTUAL_ANALYSIS", None]]
    nightly_window_key_or_null: Required[str | None]
    prior_manifest_id_or_null: Required[str | None]
    prior_manifest_hash_at_decision_or_null: Required[str | None]
    prior_manifest_lifecycle_state_or_null: Required[Literal["ALLOCATED", "FROZEN", "SEALED", "IN_PROGRESS", "COMPLETED", "BLOCKED", "FAILED", "SUPERSEDED", "REPLAY_ONLY", "RETIRED", None]]
    selected_manifest_id: Required[str]
    selected_manifest_continuation_basis: Required[Literal["NEW_MANIFEST", "REPLAY_CHILD", "RECOVERY_CHILD", "CONTINUATION_CHILD", "NEW_REQUEST_CHILD"]]
    root_manifest_id: Required[str]
    parent_manifest_id_or_null: Required[str | None]
    continuation_of_manifest_id_or_null: Required[str | None]
    replay_of_manifest_id_or_null: Required[str | None]
    supersedes_manifest_id_or_null: Required[str | None]
    selected_manifest_generation: Required[int]
    config_inheritance_mode_or_null: Required[Literal["FRESH_CHILD_RESOLUTION", "REPLAY_EXACT", "RECOVERY_EXACT", "HISTORICAL_EXPLICIT", None]]
    input_inheritance_mode_or_null: Required[Literal["FRESH_CHILD_COLLECTION", "REPLAY_EXACT", "RECOVERY_EXACT", "HISTORICAL_EXPLICIT", None]]
    returned_decision_bundle_hash_or_null: Required[str | None]

ManifestBranchDecisionContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/manifest_branch_decision_contract.schema.json",
    "source_hash": "8f8fc12d22eb147ce194ad6d6970f68aaaa4b124eaa858c0c34237593dee545c",
}

type ManifestLineageTraceScopeArray = list[Literal["year_end", "quarterly_update", "estimate_only", "prepare_submission", "submit", "amendment_intent", "amendment_submit"]]

class ManifestLineageTrace(TypedDict, total=False):
    lineage_trace_id: Required[str]
    contract_version: Required[Literal["MANIFEST_LINEAGE_TRACE_V1"]]
    binding_scope: Required[Literal["RUN_MANIFEST_BRANCH_SELECTION"]]
    explorer_binding_policy: Required[Literal["PERSIST_SELECTED_BRANCH_AND_ALL_REJECTION_BASES"]]
    operator_rendering_policy: Required[Literal["USE_PERSISTED_TRACE_NOT_ADJACENT_MANIFEST_INFERENCE"]]
    mirror_consistency_policy: Required[Literal["SELECTED_MANIFEST_LINEAGE_MIRRORS_MUST_STAY_EXACT"]]
    nightly_context_policy: Required[Literal["NIGHTLY_WINDOW_AND_PREDECESSOR_CONTEXT_PERSISTED_WHEN_APPLICABLE"]]
    idempotency_key: Required[str]
    request_identity_hash: Required[str]
    access_binding_hash: Required[str]
    requested_scope: Required[ManifestLineageTraceScopeArray]
    effective_scope: Required[ManifestLineageTraceScopeArray]
    mode: Required[Literal["COMPLIANCE", "ANALYSIS"]]
    run_kind: Required[Literal["INTERACTIVE", "NIGHTLY", "BACKFILL", "REPLAY", "REMEDIATION", "AMENDMENT", "MIGRATION"]]
    replay_class_or_null: Required[Literal["STANDARD_REPLAY", "AUDIT_REPLAY", "COUNTERFACTUAL_ANALYSIS", None]]
    nightly_window_key_or_null: Required[str | None]
    selected_branch_action: Required[Literal["NEW_MANIFEST", "RETURN_EXISTING_BUNDLE", "REUSE_SEALED_MANIFEST", "REPLAY_CHILD", "RECOVERY_CHILD", "CONTINUATION_CHILD", "NEW_REQUEST_CHILD"]]
    selected_branch_reason_code: Required[Literal["NO_PRIOR_MANIFEST", "TERMINAL_IDEMPOTENT_RETRY", "PRESTART_SEALED_CONTEXT_REUSE", "REPLAY_REQUESTED_EXACT", "STARTED_ATTEMPT_RECOVERY", "POST_TERMINAL_CONTINUATION_REQUIRED", "REQUEST_IDENTITY_CHANGED", "NIGHTLY_WINDOW_ADVANCED"]]
    selected_manifest_id: Required[str]
    selected_manifest_continuation_basis: Required[Literal["NEW_MANIFEST", "REPLAY_CHILD", "RECOVERY_CHILD", "CONTINUATION_CHILD", "NEW_REQUEST_CHILD"]]
    selected_manifest_generation: Required[int]
    root_manifest_id: Required[str]
    parent_manifest_id_or_null: Required[str | None]
    continuation_of_manifest_id_or_null: Required[str | None]
    replay_of_manifest_id_or_null: Required[str | None]
    supersedes_manifest_id_or_null: Required[str | None]
    prior_manifest_id_or_null: Required[str | None]
    prior_manifest_hash_at_decision_or_null: Required[str | None]
    prior_manifest_lifecycle_state_or_null: Required[Literal["ALLOCATED", "FROZEN", "SEALED", "IN_PROGRESS", "COMPLETED", "BLOCKED", "FAILED", "SUPERSEDED", "REPLAY_ONLY", "RETIRED", None]]
    config_inheritance_mode_or_null: Required[Literal["FRESH_CHILD_RESOLUTION", "REPLAY_EXACT", "RECOVERY_EXACT", "HISTORICAL_EXPLICIT", None]]
    input_inheritance_mode_or_null: Required[Literal["FRESH_CHILD_COLLECTION", "REPLAY_EXACT", "RECOVERY_EXACT", "HISTORICAL_EXPLICIT", None]]
    returned_decision_bundle_hash_or_null: Required[str | None]
    candidate_evaluations: Required[list[ManifestLineageTraceCandidateEvaluation]]
    mirror_consistency_state: Required[Literal["ALL_MIRRORS_IN_SYNC"]]
    mirror_sources: Required[list[Literal["RUN_MANIFEST_TOP_LEVEL", "CONTINUATION_SET", "MANIFEST_BRANCH_DECISION", "FROZEN_EXECUTION_BINDING"]]]
    nightly_predecessor_batch_run_ref_or_null: Required[str | None]
    nightly_predecessor_manifest_id_or_null: Required[str | None]
    nightly_predecessor_manifest_hash_or_null: Required[str | None]
    nightly_context_reason_code_or_null: Required[Literal["NOT_NIGHTLY", "NO_PREDECESSOR_BATCH", "SAME_WINDOW_REUSE", "WINDOW_ADVANCE_FROM_PREDECESSOR"]]
    branch_decision_audit_refs: Required[list[str]]
    branch_decision_trace_span_refs: Required[list[str]]

class ManifestLineageTraceCandidateEvaluation(TypedDict, total=False):
    candidate_action: Required[Literal["NEW_MANIFEST", "RETURN_EXISTING_BUNDLE", "REUSE_SEALED_MANIFEST", "REPLAY_CHILD", "RECOVERY_CHILD", "CONTINUATION_CHILD", "NEW_REQUEST_CHILD"]]
    evaluation_state: Required[Literal["SELECTED", "REJECTED"]]
    compared_manifest_id_or_null: Required[str | None]
    compared_manifest_hash_or_null: Required[str | None]
    compared_manifest_lifecycle_state_or_null: Required[Literal["ALLOCATED", "FROZEN", "SEALED", "IN_PROGRESS", "COMPLETED", "BLOCKED", "FAILED", "SUPERSEDED", "REPLAY_ONLY", "RETIRED", None]]
    disqualifier_reason_codes: Required[list[Literal["NO_PRIOR_MANIFEST", "REQUEST_IDENTITY_HASH_MISMATCH", "ACCESS_BINDING_HASH_MISMATCH", "REQUESTED_SCOPE_MISMATCH", "EFFECTIVE_SCOPE_MISMATCH", "MODE_MISMATCH", "RUN_KIND_MISMATCH", "REPLAY_CLASS_MISMATCH", "NIGHTLY_WINDOW_MISMATCH", "PRIOR_MANIFEST_NOT_TERMINAL", "PRIOR_MANIFEST_NOT_SEALED", "PRIOR_MANIFEST_ALREADY_STARTED", "PRIOR_MANIFEST_HASH_MISSING", "PARENT_MANIFEST_HASH_MISMATCH", "CONFIG_INHERITANCE_MODE_MISMATCH", "INPUT_INHERITANCE_MODE_MISMATCH", "REPLAY_NOT_REQUESTED", "RECOVERY_NOT_REQUIRED", "CONTINUATION_NOT_LEGAL", "REQUEST_IDENTITY_CONTINUATION_NOT_REQUIRED", "RETURNED_BUNDLE_NOT_AVAILABLE", "NIGHTLY_PREDECESSOR_CONTEXT_MISSING", "NIGHTLY_PREDECESSOR_BATCH_MISSING", "NIGHTLY_PREDECESSOR_MANIFEST_MISSING", "CHILD_ALLOCATION_NOT_REQUIRED"]]]

ManifestLineageTraceSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/manifest_lineage_trace.schema.json",
    "source_hash": "cd09f533c78f7b4580cafbf4ce26d515759094c9df230f82e6f67bcfcdc53335",
}

class ManifestStartClaimContract(TypedDict, total=False):
    contract_class: Required[Literal["MANIFEST_START_CLAIM"]]
    manifest_id: Required[str]
    manifest_hash: Required[str]
    execution_basis_hash: Required[str]
    access_binding_hash: Required[str]
    attempt_lineage_ref: Required[str]
    claim_state: Required[Literal["UNCLAIMED_SEALED", "ACTIVE_LEASED", "STALE_RECLAIM_REQUIRED", "TERMINAL_RESULT_RECORDED"]]
    claim_status_code: Required[Literal["CLAIMABLE", "ALREADY_ACTIVE", "STALE_RECLAIM_REQUIRED", "ALREADY_TERMINAL"]]
    claim_epoch: Required[int]
    claim_holder_ref_or_null: Required[str | None]
    claim_token_or_null: Required[str | None]
    claim_acquired_at_or_null: Required[ISO8601DateTimeString]
    claim_expires_at_or_null: Required[ISO8601DateTimeString]
    claim_released_at_or_null: Required[ISO8601DateTimeString]
    claim_release_reason_code_or_null: Required[Literal["COMPLETED", "FAILED", "BLOCKED", "SUPERSEDED", "REPLAY_ONLY", "RETIRED", None]]
    stale_reclaim_reason_code_or_null: Required[Literal["LEASE_EXPIRED_OWNER_UNHEALTHY", "SUCCESSOR_RECOVERY_AFTER_CRASH", "SUCCESSOR_RECOVERY_AFTER_BROKER_LOSS", "NIGHTLY_RECLAIM_SUCCESSOR_VERIFIED", None]]
    publication_state: Required[Literal["NOT_PUBLISHED", "PUBLISHED_WITH_ACTIVE_LEASE", "PUBLISHED_STALE_RECLAIM_REQUIRED", "PUBLISHED_TERMINAL"]]
    stage_dag_ref_or_null: Required[str | None]
    outbox_batch_ref_or_null: Required[str | None]
    first_publication_committed_at_or_null: Required[ISO8601DateTimeString]
    concurrency_policy: Required[Literal["SINGLE_WRITER_LEASED_START_ONLY"]]
    claim_publication_atomicity: Required[Literal["CLAIM_AND_FIRST_PUBLICATION_COMMIT_TOGETHER"]]
    stale_reclaim_policy: Required[Literal["EXPLICIT_SUCCESSOR_PROOF_REQUIRED"]]
    recovery_child_policy: Required[Literal["FORBID_WHILE_ACTIVE_LEASE"]]
    nightly_reclaim_policy: Required[Literal["DEFER_DUPLICATE_START_WHILE_ACTIVE_LEASE"]]

ManifestStartClaimContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/manifest_start_claim_contract.schema.json",
    "source_hash": "43f25058c5b8c17c08d2c0e0f764f551f26d42a6af824f15382123bcae4beb00",
}

class RecoveryCheckpoint(TypedDict, total=False):
    checkpoint_id: Required[str]
    datastore_ref: Required[str]
    recovery_governance_contract: Required[RecoveryGovernanceContract]
    backup_ref: Required[str | None]
    checkpoint_inventory_ref: Required[str | None]
    snapshot_time: Required[ISO8601DateTimeString]
    restore_tested_at: Required[ISO8601DateTimeString]
    restore_verification_hash: Required[str | None]
    rpo_class: Required[Literal["RPO_15M", "RPO_4H", "RPO_BEST_EFFORT"]]
    rto_class: Required[Literal["RTO_60M", "RTO_4H", "RTO_24H"]]
    checkpoint_state: Required[Literal["REQUESTED", "CREATED", "VERIFIED", "QUARANTINED", "EXPIRED"]]
    state_transition_contract: Required[StateTransitionContract]
    restore_drill_ref: Required[str | None]
    privacy_reconciliation_contract: Required[None | RestorePrivacyReconciliationContract]
    audit_continuity_verified: Required[bool]
    queue_rebuild_verified: Required[bool]
    authority_rebuild_verified: Required[bool]
    authority_binding_revalidation_verified: Required[bool]
    privacy_reconciliation_outcome_ref: Required[str | None]
    reopen_readiness_state: Required[Literal["BLOCKED_PENDING_CHECKPOINT_CREATION", "BLOCKED_PENDING_RESTORE_DRILL", "BLOCKED_PENDING_PRIVACY_RECONCILIATION", "BLOCKED_PENDING_COMPENSATING_RE_ERASURE", "BLOCKED_PENDING_LIMITATION_RECONCILIATION", "BLOCKED_LEGAL_HOLD_REVIEW", "BLOCKED_PROOF_PRESERVATION_REVIEW", "BLOCKED_AUTHORITY_AMBIGUITY_REVIEW", "BLOCKED_PENDING_AUDIT_CONTINUITY", "BLOCKED_PENDING_QUEUE_REBUILD", "BLOCKED_PENDING_AUTHORITY_REVALIDATION", "READY_FOR_REOPEN", "QUARANTINED", "EXPIRED"]]
    quarantine_reason_code: Required[str | None]

RecoveryCheckpointSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/recovery_checkpoint.schema.json",
    "source_hash": "ff731ca38252d78d1bb84979fc46c20f4527d8acc52b19bbafd7f31641134dce",
}

class RecoveryGovernanceContract(TypedDict, total=False):
    contract_version: Required[Literal["RECOVERY_GOVERNANCE_V1"]]
    boundary_scope: Required[Literal["RECOVERY_CHECKPOINT", "DEPLOYMENT_RELEASE"]]
    protected_workload_class: Required[Literal["CONTROL_PLANE_LEGAL_TRUTH", "REBUILDABLE_PROJECTION", "DISPOSABLE_RUNTIME_CACHE"]]
    recovery_tier_class: Required[Literal["TIER_0_CONTROL_PLANE", "TIER_1_REBUILDABLE", "TIER_2_DISPOSABLE"]]
    rpo_class: Required[Literal["RPO_15M", "RPO_4H", "RPO_BEST_EFFORT"]]
    rto_class: Required[Literal["RTO_60M", "RTO_4H", "RTO_24H"]]
    boundary_specific_binding_policy: Required[Literal["CHECKPOINT_RETAINS_INVENTORY_RESTORE_EVIDENCE_AND_REOPEN_GATES", "RELEASE_RETAINS_ROLLBACK_BOUNDARY_AND_FAIL_FORWARD_GOVERNANCE"]]
    checkpoint_inventory_policy: Required[Literal["CHECKPOINTS_REQUIRED_AND_INVENTORY_LINKED"]]
    checkpoint_evidence_policy: Required[Literal["VERIFIED_CHECKPOINT_REQUIRES_BOUND_RESTORE_DRILL"]]
    privacy_reconciliation_policy: Required[Literal["POST_RESTORE_PRIVACY_RECONCILIATION_REQUIRED_BEFORE_REOPEN"]]
    compensating_re_erasure_policy: Required[Literal["RESURRECTED_RESTRICTED_DATA_REQUIRES_TYPED_COMPENSATING_RE_ERASURE"]]
    limitation_reconciliation_policy: Required[Literal["REPLAY_AND_ENQUIRY_LIMITATIONS_MUST_REMAIN_REOPEN_SAFE"]]
    queue_recovery_policy: Required[Literal["QUEUES_REBUILT_FROM_DURABLE_TRUTH_ONLY"]]
    authority_recovery_policy: Required[Literal["AUTHORITY_MUTATIONS_REQUIRE_LINEAGE_AND_BINDING_REVALIDATION"]]
    reopen_gate_policy: Required[Literal["REOPEN_BLOCKED_UNTIL_RESTORE_PRIVACY_AUDIT_QUEUE_AND_AUTHORITY_PASS"]]
    rollback_boundary_policy: Required[Literal["ROLLBACK_ONLY_WHILE_SCHEMA_WINDOW_COMPATIBLE"]]
    fail_forward_policy: Required[Literal["FAIL_FORWARD_REQUIRES_COMPENSATING_RELEASE_AND_OWNER"]]
    failover_audit_policy: Required[Literal["FAILOVER_AND_FAILBACK_REQUIRE_AUDITABLE_OWNER"]]

RecoveryGovernanceContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/recovery_governance_contract.schema.json",
    "source_hash": "34f94dd39c5e0d3f88b505641986bfb1ec497fea2e98baede2729f22b3b87952",
}

class ReleaseCandidateIdentityContract(TypedDict, total=False):
    contract_version: Required[Literal["RELEASE_CANDIDATE_IDENTITY_V1"]]
    candidate_identity_hash: Required[str]
    candidate_environment_ref: Required[str]
    build_artifact_ref: Required[str]
    artifact_digest: Required[str]
    schema_bundle_hash: Required[str]
    config_bundle_hash: Required[str]
    migration_plan_ref_or_null: Required[str | None]
    enabled_provider_profile_refs: Required[list[str]]
    supported_client_window_ref_or_null: Required[str | None]
    array_canonicalization_policy: Required[Literal["SORTED_UNIQUE_ARRAY_COMPONENTS_ONLY"]]
    suite_context_policy: Required[Literal["SUITE_SPECIFIC_DIMENSIONS_MUST_BE_DECLARED_OR_EXPLICITLY_NULL"]]
    admissibility_binding_policy: Required[Literal["GREEN_GATES_REQUIRE_EXACT_CANDIDATE_BINDING"]]

ReleaseCandidateIdentityContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/release_candidate_identity_contract.schema.json",
    "source_hash": "c37f45e4b5bd4ad16bc3849f65e102d0f0c0b3d63c89c2b9d4e6620809b64656",
}

class ReleaseVerificationManifest(TypedDict, total=False):
    verification_manifest_id: Required[str]
    candidate_environment_ref: Required[str]
    build_artifact_ref: Required[str]
    artifact_digest: Required[str]
    candidate_identity_hash: Required[str]
    candidate_identity_contract: Required[ReleaseCandidateIdentityContract]
    manifest_assembly_contract: Required[ReleaseVerificationManifestAssemblyContract]
    schema_bundle_hash: Required[str]
    schema_reader_window_contract: Required[SchemaReaderWindowContract]
    schema_bundle_compatibility_gate_contract: Required[SchemaBundleCompatibilityGateContract]
    config_bundle_hash: Required[str]
    migration_mode: Required[Literal["NO_MIGRATION", "MIGRATION_REQUIRED"]]
    migration_plan_ref: Required[str | None]
    enabled_provider_profile_refs: Required[list[str]]
    executed_test_run_identifiers: Required[list[str]]
    blocking_gates: Required[dict[str, JSONValue]]
    migration_ledger_refs: Required[list[str]]
    canary_summary_ref: Required[str | None]
    deterministic_golden_pack_ref: Required[str | None]
    restore_drill_ref: Required[str | None]
    restore_checkpoint_ref: Required[str | None]
    supported_client_window_ref: Required[str]
    client_compatibility_matrix_ref: Required[str | None]
    decision_state: Required[Literal["PENDING", "BLOCKED", "APPROVED", "SUPERSEDED"]]
    state_transition_contract: Required[StateTransitionContract]
    approval_ref: Required[str | None]
    deployment_release_ref: Required[str | None]
    superseded_by_verification_manifest_ref: Required[str | None]
    decision_changed_at: Required[ISO8601DateTimeString]
    created_at: Required[ISO8601DateTimeString]

class ReleaseVerificationManifestGateResult(TypedDict, total=False):
    suite_family: Required[Literal["SCHEMA_COMPATIBILITY", "DETERMINISTIC_AND_STATE_MACHINE", "NORTHBOUND_API", "AUTHORITY_SANDBOX", "OPERATOR_CLIENT", "SECURITY", "PERFORMANCE_AND_CANARY", "RESTORE_DRILL", "MIGRATION_VERIFICATION", "SUPPLY_CHAIN", "SUITE_ADMISSIBILITY"]]
    candidate_identity_hash: Required[str]
    compatibility_gate_hash_or_null: Required[str | None]
    authority_sandbox_coverage_hash_or_null: Required[str | None]
    result_ref: Required[str]
    admissibility_ref: Required[str]
    status: Required[Literal["GREEN", "RED"]]
    admissibility_state: Required[Literal["ADMISSIBLE", "INADMISSIBLE"]]
    quarantine_state: Required[Literal["NONE", "QUARANTINED"]]
    manual_waiver_state: Required[Literal["NONE", "WAIVED"]]
    executed_at: Required[ISO8601DateTimeString]

ReleaseVerificationManifestSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/release_verification_manifest.schema.json",
    "source_hash": "f3aa0e66b6ccb71a8a0e8f39d538dbd4611b07942b62ad3b2024e64ac446d8a6",
}

class ReleaseVerificationManifestAssemblyContract(TypedDict, total=False):
    contract_version: Required[Literal["RELEASE_VERIFICATION_MANIFEST_ASSEMBLY_V1"]]
    assembly_contract_hash: Required[str]
    candidate_identity_hash: Required[str]
    compatibility_gate_hash: Required[str]
    gate_order_policy: Required[Literal["CANONICAL_BLOCKING_GATE_ORDER_V1"]]
    evidence_source_policy: Required[Literal["FIRST_CLASS_RESULT_AND_ADMISSIBILITY_ARTIFACTS_ONLY"]]
    admissibility_derivation_policy: Required[Literal["GREEN_REQUIRES_ADMISSIBLE_UNQUARANTINED_UNWAIVED_EVIDENCE"]]
    companion_evidence_policy: Required[Literal["GREEN_SUPPORTING_GATES_REQUIRE_COMPANION_EVIDENCE_REFS"]]
    decision_posture_policy: Required[Literal["APPROVAL_AND_SUPERSESSION_REQUIRE_EXPLICIT_DECISION_LINEAGE"]]
    supersession_policy: Required[Literal["NEW_MANIFEST_SUPERSEDES_OLD_MANIFEST_EXPLICITLY_NO_POST_HOC_REWRITE"]]
    enabled_provider_profile_refs: Required[list[str]]
    executed_test_run_identifiers: Required[list[str]]
    gate_bindings: Required[list[ReleaseVerificationManifestAssemblyContractGateBinding]]
    migration_mode: Required[Literal["NO_MIGRATION", "MIGRATION_REQUIRED"]]
    migration_plan_ref_or_null: Required[str | None]
    migration_ledger_refs: Required[list[str]]
    supported_client_window_ref: Required[str]
    canary_summary_ref_or_null: Required[str | None]
    deterministic_golden_pack_ref_or_null: Required[str | None]
    restore_drill_ref_or_null: Required[str | None]
    restore_checkpoint_ref_or_null: Required[str | None]
    client_compatibility_matrix_ref_or_null: Required[str | None]
    decision_state: Required[Literal["PENDING", "BLOCKED", "APPROVED", "SUPERSEDED"]]
    approval_ref_or_null: Required[str | None]
    deployment_release_ref_or_null: Required[str | None]
    superseded_by_verification_manifest_ref_or_null: Required[str | None]

class ReleaseVerificationManifestAssemblyContractGateBinding(TypedDict, total=False):
    gate_name: Required[Literal["schema_compatibility", "deterministic_and_state_machine", "northbound_api", "authority_sandbox", "operator_client", "security", "performance_and_canary", "restore_drill", "migration_verification", "supply_chain", "suite_admissibility"]]
    suite_family: Required[Literal["SCHEMA_COMPATIBILITY", "DETERMINISTIC_AND_STATE_MACHINE", "NORTHBOUND_API", "AUTHORITY_SANDBOX", "OPERATOR_CLIENT", "SECURITY", "PERFORMANCE_AND_CANARY", "RESTORE_DRILL", "MIGRATION_VERIFICATION", "SUPPLY_CHAIN", "SUITE_ADMISSIBILITY"]]
    candidate_identity_hash: Required[str]
    compatibility_gate_hash_or_null: Required[str | None]
    authority_sandbox_coverage_hash_or_null: Required[str | None]
    result_ref: Required[str]
    admissibility_ref: Required[str]
    status: Required[Literal["GREEN", "RED"]]
    admissibility_state: Required[Literal["ADMISSIBLE", "INADMISSIBLE"]]
    quarantine_state: Required[Literal["NONE", "QUARANTINED"]]
    manual_waiver_state: Required[Literal["NONE", "WAIVED"]]
    executed_at: Required[ISO8601DateTimeString]

ReleaseVerificationManifestAssemblyContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/release_verification_manifest_assembly_contract.schema.json",
    "source_hash": "7862e41c2a9073354e350cfe2bba3821df32b3e765a7e3a30d5949d68d85eb9c",
}

class ReplayAttestation(TypedDict, total=False):
    replay_attestation_id: Required[str]
    manifest_id: Required[str]
    replay_of_manifest_id: Required[str]
    artifact_type: Required[Literal["ReplayAttestation"]]
    execution_mode: Required[Literal["COMPLIANCE", "ANALYSIS"]]
    analysis_only: Required[bool]
    non_compliance_config_refs: Required[list[str]]
    counterfactual_basis: Required[str | None]
    execution_mode_boundary_contract: Required[ExecutionModeBoundaryContract]
    replay_class: Required[Literal["STANDARD_REPLAY", "AUDIT_REPLAY", "COUNTERFACTUAL_ANALYSIS"]]
    comparison_mode: Required[Literal["EXACT_HASH_MATCH", "COUNTERFACTUAL_DECLARED", "LIMITED_HISTORICAL_COMPARISON", "BASIS_INCOMPLETE", "BASIS_CORRUPT"]]
    basis_validation_state: Required[Literal["VALID", "RETENTION_LIMITED", "MISSING_DEPENDENCY", "CORRUPT", "SCHEMA_INCOMPATIBLE", "BUILD_UNAVAILABLE"]]
    outcome_class: Required[Literal["EXACT_MATCH", "EXPECTED_EQUIVALENCE", "EXPECTED_DIFFERENCE", "LIMITED_COMPARABLE", "BASIS_INCOMPLETE", "BASIS_CORRUPT", "UNEXPECTED_MISMATCH"]]
    basis_integrity_contract: Required[ReplayBasisIntegrityContract]
    basis_identity_verdict: Required[Literal["IDENTICAL", "DIFFERENT", "UNDECIDABLE", "CORRUPT"]]
    deterministic_equivalence_verdict: Required[Literal["IDENTICAL", "DIFFERENT", "UNDECIDABLE", "CORRUPT"]]
    expected_execution_basis_hash: Required[str | None]
    actual_execution_basis_hash: Required[str | None]
    expected_deterministic_outcome_hash: Required[str | None]
    actual_deterministic_outcome_hash: Required[str | None]
    basis_dimension_results: Required[JSONValue]
    outcome_component_results: Required[JSONValue]
    basis_coverage: Required[float]
    basis_match_ratio: Required[float]
    outcome_coverage: Required[float]
    outcome_match_ratio: Required[float]
    material_outcome_coverage: Required[float]
    material_outcome_match_ratio: Required[float]
    difference_reason_codes: Required[list[str]]
    limitation_codes: Required[list[str]]
    mismatch_inventory: Required[list[ReplayAttestationMismatchItem]]
    plain_summary: Required[str]
    operator_summary_ref: Required[str | None]
    auditor_summary_ref: Required[str | None]
    compared_at: Required[ISO8601DateTimeString]
    signature_verification_state: Required[Literal["VERIFIED", "NOT_SIGNED", "VERIFICATION_MATERIAL_MISSING", "SIGNATURE_INVALID"]]
    attestation_envelope_ref: Required[str | None]
    verification_material_refs: Required[list[str]]
    attestation_confidence_score: Required[int]
    attestation_confidence_band: Required[Literal["VERY_HIGH", "HIGH", "MODERATE", "LOW", "INSUFFICIENT"]]
    contract: Required[SchemaBundle]

class ReplayAttestationMismatchItem(TypedDict, total=False):
    component_class: Required[Literal["EXECUTION_BASIS", "CONFIG_FREEZE", "INPUT_FREEZE", "AUTHORITY_BASIS", "LATE_DATA_BASIS", "GATE_SEQUENCE", "SNAPSHOT", "COMPUTE_RESULT", "FORECAST_SET", "RISK_REPORT", "PARITY_RESULT", "TRUST_SUMMARY", "EVIDENCE_GRAPH", "TWIN_VIEW", "FILING_PACKET", "AUTHORITY_RESULT", "DRIFT_RECORD", "DECISION_BUNDLE", "OTHER"]]
    component_ref: NotRequired[str | None]
    mismatch_class: Required[Literal["HASH_DIFFERENCE", "MISSING_EXPECTED", "MISSING_ACTUAL", "CORRUPT_EXPECTED", "CORRUPT_ACTUAL", "SCHEMA_READER_INCOMPATIBLE", "RETENTION_LIMITED", "DECLARED_COUNTERFACTUAL", "VALUE_DIFFERENCE"]]
    materiality: Required[Literal["NON_MATERIAL", "MATERIAL", "BLOCKING"]]
    expected_hash: Required[str | None]
    actual_hash: Required[str | None]
    reason_codes: Required[list[str]]
    variance_class: Required[Literal["DECLARED_COUNTERFACTUAL", "UNDECLARED_BASIS_VARIANCE", "NON_MATERIAL_OUTCOME_VARIANCE", "MATERIAL_OUTCOME_VARIANCE", "BLOCKING_OUTCOME_VARIANCE", "LIMITATION_ONLY", "INTEGRITY_FAILURE"]]
    comparison_weight: Required[float]

class ReplayAttestationBasisDimensionResult(TypedDict, total=False):
    dimension_code: Required[Literal["IDENTITY_AUTHORITY", "EXECUTABLE", "CONFIG", "INPUT", "POST_SEAL", "DETERMINISM"]]
    comparison_state: Required[Literal["MATCH", "MISMATCH", "DECLARED_CHANGE", "UNOBSERVABLE", "CORRUPT"]]
    variance_class: Required[Literal["NONE", "DECLARED_COUNTERFACTUAL", "UNDECLARED_BASIS_VARIANCE", "LIMITATION_ONLY", "INTEGRITY_FAILURE"]]
    comparison_weight: Required[float]
    expected_hash: Required[str | None]
    actual_hash: Required[str | None]
    reason_codes: Required[list[str]]

class ReplayAttestationOutcomeComponentResult(TypedDict, total=False):
    component_class: Required[Literal["DECISION_BUNDLE", "GATE_SEQUENCE", "SNAPSHOT", "COMPUTE_RESULT", "FORECAST_SET", "RISK_REPORT", "PARITY_RESULT", "TRUST_SUMMARY", "EVIDENCE_GRAPH", "TWIN_VIEW", "FILING_PACKET", "AUTHORITY_RESULT", "LATE_DATA_BASIS", "DRIFT_RECORD"]]
    component_ref: NotRequired[str | None]
    comparison_state: Required[Literal["MATCH", "MISMATCH", "DECLARED_CHANGE", "UNOBSERVABLE", "CORRUPT"]]
    variance_class: Required[Literal["NONE", "DECLARED_COUNTERFACTUAL", "NON_MATERIAL_OUTCOME_VARIANCE", "MATERIAL_OUTCOME_VARIANCE", "BLOCKING_OUTCOME_VARIANCE", "LIMITATION_ONLY", "INTEGRITY_FAILURE"]]
    comparison_weight: Required[float]
    materiality: Required[Literal["NON_MATERIAL", "MATERIAL", "BLOCKING"]]
    expected_hash: Required[str | None]
    actual_hash: Required[str | None]
    reason_codes: Required[list[str]]

ReplayAttestationSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/replay_attestation.schema.json",
    "source_hash": "47b616c74105f9d95cb779da399ae23526279da6e9dddaffdf33e0efe9e57e79",
}

class RestoreDrillResult(TypedDict, total=False):
    restore_drill_id: Required[str]
    checkpoint_ref: Required[str]
    candidate_environment_ref: Required[str]
    build_artifact_ref: Required[str]
    artifact_digest: Required[str]
    candidate_identity_hash: Required[str]
    candidate_identity_contract: Required[ReleaseCandidateIdentityContract]
    schema_bundle_hash: Required[str]
    schema_reader_window_contract: Required[SchemaReaderWindowContract]
    config_bundle_hash: Required[str]
    migration_plan_ref: Required[str | None]
    enabled_provider_profile_refs: Required[list[str]]
    drill_scope: Required[Literal["CURRENT_RELEASE_CANDIDATE", "DR_FAILOVER_FAILBACK"]]
    executed_at: Required[ISO8601DateTimeString]
    outcome: Required[Literal["PASSED", "FAILED", "QUARANTINED"]]
    audit_continuity_verified: Required[bool]
    privacy_reconciliation_verified: Required[bool]
    queue_rebuild_verified: Required[bool]
    authority_rebuild_verified: Required[bool]
    authority_binding_revalidation_verified: Required[bool]
    privacy_reconciliation_contract: Required[RestorePrivacyReconciliationContract]
    drill_report_ref: Required[str]
    failure_reason_codes: Required[list[str]]

RestoreDrillResultSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/restore_drill_result.schema.json",
    "source_hash": "819473b6d28a889373b01749e3970634bb682884a7fc44ec95bc09cc69b7a4bb",
}

class RestorePrivacyReconciliationContract(TypedDict, total=False):
    contract_version: Required[Literal["RESTORE_PRIVACY_RECONCILIATION_V1"]]
    reconciliation_contract_hash: Required[str]
    checkpoint_ref: Required[str]
    restore_drill_ref: Required[str]
    reconciliation_scope_policy: Required[Literal["RESTORE_REQUIRES_PRIVACY_LIMITATION_AND_RE_ERASURE_PROOF"]]
    resurrected_data_posture: Required[Literal["UNKNOWN_UNTIL_RECONCILED", "NONE_DETECTED", "ERASURE_OR_PSEUDONYMISATION_RESURRECTED"]]
    resurrected_subject_count_or_null: Required[int | None]
    privacy_reconciliation_state: Required[Literal["PENDING_RECONCILIATION", "RECONCILED_NO_COMPENSATION_REQUIRED", "COMPENSATING_RE_ERASURE_REQUIRED", "COMPENSATING_RE_ERASURE_IN_PROGRESS", "RECONCILED_WITH_COMPENSATING_RE_ERASURE", "BLOCKED_LEGAL_HOLD", "BLOCKED_PROOF_PRESERVATION", "BLOCKED_AUTHORITY_AMBIGUITY"]]
    privacy_reconciliation_outcome_ref: Required[str]
    compensating_re_erasure_state: Required[Literal["NOT_REQUIRED", "REQUIRED_PENDING", "IN_PROGRESS", "COMPLETED", "BLOCKED"]]
    compensating_re_erasure_workflow_ref_or_null: Required[str | None]
    compensating_re_erasure_audit_ref_or_null: Required[str | None]
    legal_hold_ref_or_null: Required[str | None]
    proof_preservation_basis_ref_or_null: Required[str | None]
    authority_ambiguity_ref_or_null: Required[str | None]
    audit_chain_continuity_state: Required[Literal["VERIFIED", "FAILED"]]
    audit_chain_continuity_ref: Required[str]
    replay_limitation_state: Required[Literal["VERIFIED", "LIMITED_RECONCILED", "FAILED"]]
    enquiry_limitation_state: Required[Literal["VERIFIED", "LIMITED_RECONCILED", "FAILED"]]
    reopen_access_state: Required[Literal["BLOCKED", "LIMITED", "READY_FOR_REOPEN"]]
    reconciliation_decided_at_or_null: Required[ISO8601DateTimeString]
    re_erasure_completed_at_or_null: Required[ISO8601DateTimeString]

RestorePrivacyReconciliationContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/restore_privacy_reconciliation_contract.schema.json",
    "source_hash": "7157d0d667ba768df915443b04f67d9474abca3625c0a4074af73511e307bf47",
}

type SchemaBundleExactDecimalString = ExactDecimalString

type SchemaBundleMoneyValue = ExactDecimalString

class SchemaBundle(TypedDict, total=False):
    schema_bundle_hash: Required[str]
    published_at: NotRequired[ISO8601DateTimeString]
    compatibility_profile_ref: Required[str]
    schema_reader_window_contract: Required[SchemaReaderWindowContract]
    entries: Required[list[SchemaBundleSchemaBundleEntry]]

class SchemaBundleSchemaBundleEntry(TypedDict, total=False):
    schema_id: Required[str]
    artifact_type: Required[str]
    semantic_version: Required[str]
    content_hash: Required[str]
    dialect_ref: Required[str]
    compatibility_class: Required[str]
    supersedes_schema_id: NotRequired[str | None]
    writer_min_reader_version: Required[str]
    allowed_upgrade_kinds: Required[list[Literal["PATCH_BACKWARD", "MINOR_BACKWARD", "MAJOR_BREAKING"]]]

class SchemaBundleMoneyProfile(TypedDict, total=False):
    currency_code: Required[str]
    scale: Required[int]
    rounding_mode: Required[Literal["HALF_UP", "HALF_EVEN", "DOWN", "UP"]]
    aggregation_boundary: Required[Literal["DECLARED_AGGREGATION_BOUNDARY_ONLY"]]
    serialization_profile: Required[Literal["CANONICAL_DECIMAL_STRING_V1"]]

class SchemaBundleArtifactContract(TypedDict, total=False):
    artifact_id: Required[str]
    schema_id: Required[str]
    artifact_type: Required[str]
    semantic_version: Required[str]
    content_hash: Required[str]
    dialect_ref: Required[str]
    compatibility_class: Required[str]
    supersedes_schema_id: NotRequired[str | None]
    writer_min_reader_version: Required[str]
    allowed_upgrade_kinds: Required[list[Literal["PATCH_BACKWARD", "MINOR_BACKWARD", "MAJOR_BREAKING"]]]
    schema_bundle_hash: Required[str]
    artifact_content_hash: Required[str]
    writer_build_id: Required[str]

SchemaBundleSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/schema_bundle.schema.json",
    "source_hash": "901500d2d44a2c6b76bc64dd2afe5daa5a8a0f1d853f04f6ea7555f994086bb8",
}

class SchemaBundleCompatibilityGateContract(TypedDict, total=False):
    contract_version: Required[Literal["SCHEMA_BUNDLE_COMPATIBILITY_GATE_V1"]]
    compatibility_gate_hash: Required[str]
    candidate_identity_hash: Required[str]
    candidate_identity_contract: Required[ReleaseCandidateIdentityContract]
    schema_bundle_hash: Required[str]
    compatibility_window_ref: Required[str]
    reader_window_state: Required[Literal["EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED", "BACKFILL_IN_PROGRESS_PREVIOUS_READERS_SUPPORTED", "VERIFIED_PREVIOUS_READERS_SUPPORTED", "CONTRACT_ELIGIBLE_WINDOW_CLOSED"]]
    schema_reader_window_contract: Required[SchemaReaderWindowContract]
    migration_plan_ref_or_null: Required[str | None]
    migration_ledger_refs: Required[list[str]]
    supported_client_window_ref_or_null: Required[str | None]
    historical_manifest_guard_state: Required[Literal["PROTECTED", "BLOCKED"]]
    replay_restore_guard_state: Required[Literal["PROTECTED", "BLOCKED"]]
    native_client_window_state: Required[Literal["NOT_APPLICABLE", "VERIFIED_COMPATIBLE", "BLOCKED"]]
    migration_chronology_state: Required[Literal["NOT_REQUIRED", "EXPAND_ONLY", "BACKFILL_IN_PROGRESS", "VERIFIED_PREVIOUS_READERS_SUPPORTED", "CONTRACT_WINDOW_CLOSED"]]
    destructive_contract_state: Required[Literal["BLOCKED_UNTIL_WINDOW_CLOSE", "ELIGIBLE_AFTER_WINDOW_CLOSE"]]
    rollback_boundary_state: Required[Literal["ROLLBACK_ALLOWED", "FAIL_FORWARD_ONLY"]]
    reason_codes: Required[list[str]]
    historical_manifest_policy: Required[Literal["FROZEN_MANIFESTS_REQUIRE_RECORDED_BUNDLE_OR_COMPATIBLE_READER"]]
    destructive_change_policy: Required[Literal["DESTRUCTIVE_CHANGE_BLOCKED_UNTIL_WINDOW_CLOSED"]]
    rollback_boundary_policy: Required[Literal["ROLLBACK_ALLOWED_ONLY_WHILE_PREVIOUS_READERS_SUPPORTED"]]
    fail_forward_policy: Required[Literal["FAIL_FORWARD_REQUIRED_AFTER_WINDOW_CLOSE_OR_BREAKING_CONTRACT"]]
    replay_restore_policy: Required[Literal["RESTORE_AND_REPLAY_REQUIRE_WINDOW_COMPATIBLE_READER"]]
    client_persistence_policy: Required[Literal["SERVER_SCHEMA_GATE_REQUIRES_SUPPORTED_CLIENT_WINDOW_COMPATIBILITY"]]
    evidence_binding_policy: Required[Literal["EXACT_CANDIDATE_READER_WINDOW_AND_CLIENT_WINDOW_BINDING_REQUIRED"]]

SchemaBundleCompatibilityGateContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/schema_bundle_compatibility_gate_contract.schema.json",
    "source_hash": "7e87b2e2b66221a56cae5df34ebce70e45b3dee0cb6131fd4905af4321f666a6",
}

class SchemaMigrationLedger(TypedDict, total=False):
    migration_id: Required[str]
    datastore_ref: Required[str]
    target_version: Required[str]
    target_schema_bundle_hash: Required[str]
    compatibility_window_ref: Required[str]
    contract_phase_required: Required[bool]
    phase_state: Required[Literal["PLANNED", "APPLYING", "APPLIED", "VERIFYING", "VERIFIED", "CONTRACTING", "CONTRACTED", "HALTED", "FAILED", "SUPERSEDED"]]
    state_transition_contract: Required[StateTransitionContract]
    schema_reader_window_contract: Required[SchemaReaderWindowContract]
    backfill_execution_contract: Required[BackfillExecutionContract]
    applied_at: Required[ISO8601DateTimeString]
    verified_at: Required[ISO8601DateTimeString]
    rollback_class: Required[Literal["ROLLBACK_SAFE", "FAIL_FORWARD_ONLY"]]
    verification_ref: Required[str | None]
    halted_subphase: Required[Literal["APPLYING", "VERIFYING", "CONTRACTING", None]]
    compatibility_window_closed_at: Required[ISO8601DateTimeString]
    failure_ref: Required[str | None]

SchemaMigrationLedgerSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/schema_migration_ledger.schema.json",
    "source_hash": "f76ac0227adfa99b463e48fc219d02067b26bb53762b7fc7e3839398f1fca9d5",
}

class SchemaReaderWindowContract(TypedDict, total=False):
    contract_version: Required[Literal["SCHEMA_READER_WINDOW_CONTRACT_V1"]]
    compatibility_window_ref: Required[str]
    writer_schema_bundle_hash: Required[str]
    supported_reader_schema_bundle_hashes: Required[list[str]]
    protected_historical_schema_bundle_hashes: Required[list[str]]
    window_state: Required[Literal["EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED", "BACKFILL_IN_PROGRESS_PREVIOUS_READERS_SUPPORTED", "VERIFIED_PREVIOUS_READERS_SUPPORTED", "CONTRACT_ELIGIBLE_WINDOW_CLOSED"]]
    historical_manifest_policy: Required[Literal["FROZEN_MANIFESTS_REQUIRE_RECORDED_BUNDLE_OR_COMPATIBLE_READER"]]
    destructive_change_policy: Required[Literal["DESTRUCTIVE_CHANGE_BLOCKED_UNTIL_WINDOW_CLOSED"]]
    rollback_boundary_policy: Required[Literal["ROLLBACK_ALLOWED_ONLY_WHILE_PREVIOUS_READERS_SUPPORTED"]]
    fail_forward_policy: Required[Literal["FAIL_FORWARD_REQUIRED_AFTER_WINDOW_CLOSE_OR_BREAKING_CONTRACT"]]
    replay_restore_policy: Required[Literal["RESTORE_AND_REPLAY_REQUIRE_WINDOW_COMPATIBLE_READER"]]

SchemaReaderWindowContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/schema_reader_window_contract.schema.json",
    "source_hash": "8f24727857ddc21e7524291ded9f10b82329d8462dd18640f36b95b03356285f",
}

class StateTransitionContract(TypedDict, total=False):
    contract_version: Required[Literal["STATE_TRANSITION_CONTRACT_V1"]]
    object_family: Required[Literal["RUN_MANIFEST", "NIGHTLY_BATCH_RUN", "CONFIG_VERSION", "CONFIG_CHANGE_REQUEST", "SOURCE_COLLECTION_RUN", "SNAPSHOT", "WORKFLOW_ITEM", "FILING_CASE", "FILING_PACKET", "SUBMISSION_RECORD", "RECOVERY_CHECKPOINT", "SCHEMA_MIGRATION_LEDGER", "DEPLOYMENT_RELEASE", "RELEASE_VERIFICATION_MANIFEST"]]
    machine_code: Required[Literal["RUN_MANIFEST_LIFECYCLE_V1", "NIGHTLY_BATCH_RUN_LIFECYCLE_V1", "CONFIG_VERSION_LIFECYCLE_V1", "CONFIG_CHANGE_REQUEST_LIFECYCLE_V1", "SOURCE_COLLECTION_RUN_LIFECYCLE_V1", "SNAPSHOT_LIFECYCLE_V1", "WORKFLOW_ITEM_LIFECYCLE_V1", "FILING_CASE_LIFECYCLE_V1", "FILING_PACKET_LIFECYCLE_V1", "SUBMISSION_RECORD_LIFECYCLE_V1", "RECOVERY_CHECKPOINT_LIFECYCLE_V1", "SCHEMA_MIGRATION_LEDGER_PHASE_V1", "DEPLOYMENT_RELEASE_ROLLOUT_V1", "RELEASE_VERIFICATION_MANIFEST_DECISION_V1"]]
    state_field_name: Required[Literal["lifecycle_state", "checkpoint_state", "phase_state", "rollout_state", "decision_state"]]
    current_state: Required[str]
    previous_state_or_null: Required[str | None]
    transition_event_code: Required[str]
    transition_applied_at: Required[ISO8601DateTimeString]
    transition_audit_ref: Required[str]
    transition_application_policy: Required[Literal["NAMED_EVENT_ONLY"]]
    illegal_transition_policy: Required[Literal["REJECT_WITH_TYPED_REASON_AND_NO_PARTIAL_WRITE"]]
    concurrency_guard_policy: Required[Literal["COMPARE_AND_SWAP_OR_SINGLE_WRITER_LEASE"]]
    terminal_reentry_policy: Required[Literal["TERMINAL_STATES_REQUIRE_NEW_LINEAGE"]]
    recovery_supersession_policy: Required[Literal["RECOVERY_AND_SUPERSESSION_ALLOCATE_SUCCESSOR_OR_SUPERSEDING_LINEAGE"]]
    audit_evidence_policy: Required[Literal["EVERY_TRANSITION_RETAINS_AUDIT_EVENT_REF"]]
    typed_rejection_family: Required[Literal["ILLEGAL_STATE_TRANSITION"]]

StateTransitionContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/state_transition_contract.schema.json",
    "source_hash": "af225ca70a88d2193c3a7d9ed722233b7379aed6ad45674e2c3814cfd7738c47",
}

ManifestAndReleaseBindingManifest = {"family_ref": "MANIFEST_AND_RELEASE", "schema_count": 22}
