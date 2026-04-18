#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[2]
ALGORITHM_DIR = ROOT / "Algorithm"
DATA_ANALYSIS_DIR = ROOT / "data" / "analysis"
DOCS_ANALYSIS_DIR = ROOT / "docs" / "analysis"
DIAGRAMS_ANALYSIS_DIR = ROOT / "diagrams" / "analysis"

REPLAY_PATH = ALGORITHM_DIR / "replay_and_reproducibility_contract.md"
MANIFEST_FREEZE_PATH = ALGORITHM_DIR / "manifest_and_config_freeze_contract.md"
MANIFEST_START_CLAIM_PATH = ALGORITHM_DIR / "manifest_start_claim_protocol.md"
MANIFEST_BRANCH_PATH = ALGORITHM_DIR / "manifest_branch_selection_contract.md"
NIGHTLY_AUTOPILOT_PATH = ALGORITHM_DIR / "nightly_autopilot_contract.md"
NIGHTLY_SELECTION_PATH = ALGORITHM_DIR / "nightly_selection_disposition_and_batch_isolation_contract.md"
RECOVERY_PATH = ALGORITHM_DIR / "recovery_tier_checkpoint_and_fail_forward_governance_contract.md"
RELEASE_PATH = ALGORITHM_DIR / "release_candidate_identity_and_promotion_evidence_contract.md"
DEPLOYMENT_PATH = ALGORITHM_DIR / "deployment_and_resilience_contract.md"
OBSERVABILITY_PATH = ALGORITHM_DIR / "observability_and_audit_contract.md"
AUTHORITY_PROTOCOL_PATH = ALGORITHM_DIR / "authority_interaction_protocol.md"
RETENTION_PRIVACY_PATH = ALGORITHM_DIR / "retention_and_privacy.md"
RETENTION_OBSERVABILITY_PATH = ALGORITHM_DIR / "retention_error_and_observability_contract.md"

SCHEMAS_DIR = ALGORITHM_DIR / "schemas"
REPLAY_ATTESTATION_SCHEMA_PATH = SCHEMAS_DIR / "replay_attestation.schema.json"
MANIFEST_START_CLAIM_SCHEMA_PATH = SCHEMAS_DIR / "manifest_start_claim_contract.schema.json"
NIGHTLY_BATCH_RUN_SCHEMA_PATH = SCHEMAS_DIR / "nightly_batch_run.schema.json"
NIGHTLY_BATCH_IDENTITY_SCHEMA_PATH = SCHEMAS_DIR / "nightly_batch_identity_contract.schema.json"
RECOVERY_GOVERNANCE_SCHEMA_PATH = SCHEMAS_DIR / "recovery_governance_contract.schema.json"
RECOVERY_CHECKPOINT_SCHEMA_PATH = SCHEMAS_DIR / "recovery_checkpoint.schema.json"
RESTORE_PRIVACY_SCHEMA_PATH = SCHEMAS_DIR / "restore_privacy_reconciliation_contract.schema.json"
RELEASE_CANDIDATE_SCHEMA_PATH = SCHEMAS_DIR / "release_candidate_identity_contract.schema.json"
COMPATIBILITY_GATE_SCHEMA_PATH = SCHEMAS_DIR / "schema_bundle_compatibility_gate_contract.schema.json"
DEPLOYMENT_RELEASE_SCHEMA_PATH = SCHEMAS_DIR / "deployment_release.schema.json"
RELEASE_VERIFICATION_MANIFEST_SCHEMA_PATH = SCHEMAS_DIR / "release_verification_manifest.schema.json"

REQUIREMENTS_DOC_PATH = DOCS_ANALYSIS_DIR / "15_replay_recovery_nightly_release_governance.md"
FAILURE_DOC_PATH = DOCS_ANALYSIS_DIR / "15_control_plane_failure_and_promotion_rules.md"

ARTIFACT_INVENTORY_PATH = DATA_ANALYSIS_DIR / "control_plane_artifact_inventory.json"
REPLAY_CLASS_MATRIX_PATH = DATA_ANALYSIS_DIR / "replay_class_and_precondition_matrix.json"
REPLAY_COMPARISON_MATRIX_PATH = DATA_ANALYSIS_DIR / "replay_comparison_and_attestation_matrix.json"
CLAIM_BRANCH_MATRIX_PATH = DATA_ANALYSIS_DIR / "manifest_start_claim_and_branch_selection_matrix.json"
NIGHTLY_SELECTION_MATRIX_PATH = DATA_ANALYSIS_DIR / "nightly_selection_disposition_matrix.json"
NIGHTLY_POLICY_MATRIX_PATH = DATA_ANALYSIS_DIR / "nightly_unattended_policy_matrix.json"
RECOVERY_REOPEN_MATRIX_PATH = DATA_ANALYSIS_DIR / "recovery_checkpoint_reopen_matrix.json"
RESEND_RECOVERY_MATRIX_PATH = DATA_ANALYSIS_DIR / "no_blind_resend_and_authority_recovery_rules.json"
RELEASE_GATE_MATRIX_PATH = DATA_ANALYSIS_DIR / "release_candidate_and_compatibility_gate_matrix.json"
ROLLBACK_MATRIX_PATH = DATA_ANALYSIS_DIR / "rollback_fail_forward_boundary_matrix.json"

LIFECYCLE_MERMAID_PATH = DIAGRAMS_ANALYSIS_DIR / "15_control_plane_lifecycle.mmd"
TOPOLOGY_MERMAID_PATH = DIAGRAMS_ANALYSIS_DIR / "15_nightly_recovery_release_topology.mmd"

HEADING_RE = re.compile(r"^(#{2,4})\s+(.*)$")

REQUIRED_RECORD_FIELDS = [
    "record_type",
    "canonical_id",
    "trigger_or_entry_condition",
    "identity_tuple",
    "frozen_inputs",
    "state_or_outcome",
    "allowed_next_actions",
    "idempotency_or_hash_fields",
    "recovery_posture",
    "privacy_reconciliation_required",
    "authority_safety_posture",
    "operator_visible_effect",
    "audit_events",
    "source_file",
    "source_heading_or_logical_block",
    "notes",
]
LIST_FIELDS = ["identity_tuple", "frozen_inputs", "allowed_next_actions", "idempotency_or_hash_fields", "audit_events", "notes"]

CLAIM_OUTCOMES = [
    "CLAIM_GRANTED",
    "ALREADY_ACTIVE",
    "ALREADY_TERMINAL",
    "INVALID_PRESTART_STATE",
    "RECOVERY_REQUIRED",
    "RECLAIM_GRANTED",
    "RECLAIM_REJECTED_ACTIVE_LEASE",
]
BRANCH_ACTIONS = [
    "NEW_MANIFEST",
    "RETURN_EXISTING_BUNDLE",
    "REUSE_SEALED_MANIFEST",
    "REPLAY_CHILD",
    "RECOVERY_CHILD",
    "CONTINUATION_CHILD",
    "NEW_REQUEST_CHILD",
]
BRANCH_REASON_CODES = [
    "NO_PRIOR_MANIFEST",
    "TERMINAL_IDEMPOTENT_RETRY",
    "PRESTART_SEALED_CONTEXT_REUSE",
    "REPLAY_REQUESTED_EXACT",
    "STARTED_ATTEMPT_RECOVERY",
    "POST_TERMINAL_CONTINUATION_REQUIRED",
    "REQUEST_IDENTITY_CHANGED",
    "NIGHTLY_WINDOW_ADVANCED",
]
REPLAY_PRECONDITION_SPECS = [
    ("CONTINUATION_BASIS_MATCH", "The requested `continuation_basis` names the exact lineage edge being replayed or recovered."),
    ("CONFIG_INHERITANCE_EXACT", "`continuation_set.config_inheritance_mode` stays exact rather than historically explicit or fresh."),
    ("INPUT_INHERITANCE_EXACT", "`continuation_set.input_inheritance_mode` stays exact rather than historically explicit or fresh."),
    ("SOURCE_MANIFEST_READABLE", "The source manifest remains sealed, historically readable, and not reconstructed from projections."),
    ("CONFIG_FREEZE_AVAILABLE", "The frozen `ConfigFreeze` is available, valid, and readable under the recorded schema bundle."),
    ("INPUT_FREEZE_AND_INTAKE_AVAILABLE", "The frozen `InputFreeze` and authoritative intake artifacts remain available, valid, and schema-readable."),
    ("READER_WINDOW_OR_HISTORICAL_BUNDLE_AVAILABLE", "The persisted reader-window still admits the replay reader or the runtime can load the exact historical bundle directly."),
    ("PRESEAL_TAPE_AVAILABLE", "Historical `preseal_gate_evaluation{...}` and the ordered pre-seal prefix are present and internally consistent."),
    ("AUTHORITY_AND_LATE_DATA_BASIS_AVAILABLE", "Authority and late-data basis artifacts remain available when they materially influenced the original run."),
    ("RUNTIME_CAN_DESERIALIZE_AND_DECRYPT", "The replay runtime can deserialize the historical schema bundle and decrypt retained artifacts where required."),
    ("NO_LIVE_MUTATION_SCOPE_TOKEN", "The requested replay scope contains no live mutation token."),
]
REPLAY_VARIANCE_TAXONOMY = [
    "NONE",
    "DECLARED_COUNTERFACTUAL",
    "UNDECLARED_BASIS_VARIANCE",
    "NON_MATERIAL_OUTCOME_VARIANCE",
    "MATERIAL_OUTCOME_VARIANCE",
    "BLOCKING_OUTCOME_VARIANCE",
    "LIMITATION_ONLY",
    "INTEGRITY_FAILURE",
]
COUNTERFACTUAL_DIMENSIONS = [
    "config_only",
    "input_only",
    "policy_or_formula_only",
    "authority_interpretation_only",
    "mixed_basis",
]
FROZEN_IDENTITY_INPUTS = [
    "requested_scope[]",
    "effective_scope[]",
    "access_binding_hash",
    "mode",
    "run_kind",
    "replay_class_or_null",
    "nightly_window_key_or_null",
    "selected_manifest_continuation_basis",
    "config_inheritance_mode_or_null",
    "input_inheritance_mode_or_null",
    "request_identity_hash",
]
NIGHTLY_STAGE_FAMILIES = [
    "COLLECT_AND_NORMALIZE",
    "COMPUTE_AND_PARITY",
    "TRUST_AND_GRAPH",
    "PREPARE_FILING_PACKET",
    "SUBMIT_TO_AUTHORITY",
    "AUTHORITY_RECONCILIATION",
    "LATE_DATA_CONTINUATION",
    "DRIFT_AND_AMENDMENT_BRANCH",
    "OPEN_INTERNAL_WORKFLOW",
    "OPEN_CUSTOMER_REQUEST",
    "REPLAY_OR_RECOVERY",
    "OVERRIDE_OR_EXCEPTION",
    "OUT_OF_BAND_STATE_MARKING",
]
UNATTENDED_POLICY_VALUES = [
    "ALLOW",
    "ALLOW_IF_TRUST_GREEN",
    "ALLOW_IF_TRUST_GREEN_AND_NO_OPEN_HUMAN_ITEM",
    "REVIEW_REQUIRED",
    "DENY",
]
NIGHTLY_CANDIDATE_SOURCES = [
    "active_client_roster",
    "open_obligation_or_filing_case_posture",
    "latest_decision_bundle_and_manifest_lineage",
    "open_workflow_items_and_rfi_posture",
    "authority_link_and_delegation_readiness",
    "latest_submission_and_reconciliation_posture",
    "late_data_monitor_result_and_policy_binding",
    "drift_and_amendment_posture",
    "error_and_remediation_posture",
    "frozen_unattended_policy_matrix",
]
NIGHTLY_INELIGIBLE_CONDITIONS = [
    "out_of_schedule_or_onboarding_incomplete",
    "no_valid_delegation_or_authority_link",
    "unattended_policy_denies_automation",
    "active_human_owned_workflow_item",
    "active_manifest_start_lease",
    "retry_not_legal_until_next_retry_at",
    "authority_state_unknown_or_out_of_band_and_policy_denies_reconciliation_only",
    "unresolved_step_up_approval_or_override",
    "tenant_wide_blocked_cohort",
]
NIGHTLY_HARD_BOUNDARIES = [
    "never_satisfy_step_up_or_approval_automatically",
    "never_approve_or_originate_filing_critical_overrides",
    "never_originate_or_self_approve_exceptional_authority",
    "never_mark_unknown_or_out_of_band_truth_confirmed_without_normalized_basis",
    "never_resend_externally_visible_mutation_after_reconciliation_budget_exhaustion",
    "never_auto_close_human_review_item_without_durable_upstream_resolution",
    "never_fabricate_client_declaration_or_sign_off",
    "never_publish_customer_legal_text_outside_frozen_template_family",
]
SAFE_CUSTOMER_VISIBLE_REQUIREMENTS = [
    "matrix_explicitly_allows_open_customer_request",
    "frozen_template_family_only",
    "derived_from_persisted_workflow_or_gate_posture",
    "does_not_satisfy_sign_off_step_up_or_override",
    "fully_reconstructible_from_persisted_artifacts_and_audit_evidence",
]
NIGHTLY_RETRY_CLASSES = [
    "SAFE_RETRY",
    "RECONCILE_THEN_RETRY",
    "HUMAN_REVIEW_THEN_RETRY",
    "MANUAL_INTERVENTION_REQUIRED",
    "NO_RETRY",
]
NIGHTLY_STOP_CONDITIONS = [
    "tenant_wide_blocked_conditions",
    "release_admissibility_failure",
    "governance_snapshot_unavailable",
    "audit_persistence_unavailable",
    "control_store_durability_unavailable",
    "authority_edge_blocked",
    "stability_threshold_exceeded",
    "restore_or_recovery_narrowed_environment",
]
RECONCILIATION_RESEND_STATES = [
    "FOLLOW_UP_READ_ONLY",
    "IDEMPOTENT_RECOVERY_ONLY",
    "BLOCKED_BY_RECONCILIATION",
    "BLOCKED_BY_ESCALATION",
]


def repo_rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def ordered_unique(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def json_write(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")


def text_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)


def find_heading_line(path: Path, heading_text: str) -> int:
    for line_number, line in enumerate(path.read_text().splitlines(), 1):
        match = HEADING_RE.match(line)
        if match and match.group(2).strip() == heading_text:
            return line_number
    raise ValueError(f"Heading `{heading_text}` not found in {path}")


def find_line_containing(path: Path, needle: str) -> int:
    for line_number, line in enumerate(path.read_text().splitlines(), 1):
        if needle in line:
            return line_number
    raise ValueError(f"Text `{needle}` not found in {path}")


def line_ref(path: Path, line_number: int, label: str) -> str:
    safe_label = re.sub(r"[^A-Za-z0-9_.-]+", "_", label).strip("_") or "line"
    return f"{repo_rel(path)}::L{line_number}[{safe_label}]"


def heading_ref(path: Path, heading_text: str, label: str | None = None) -> str:
    return line_ref(path, find_heading_line(path, heading_text), label or heading_text)


def text_ref(path: Path, needle: str, label: str | None = None) -> str:
    return line_ref(path, find_line_containing(path, needle), label or needle)


def schema_value(path: Path, *keys: str) -> Any:
    node: Any = load_json(path)
    for key in keys:
        node = node[key]
    return node


def schema_enum(path: Path, *keys: str) -> list[str]:
    return [str(value) for value in schema_value(path, *keys)]


def schema_required(path: Path) -> list[str]:
    return [str(value) for value in schema_value(path, "required")]


def control_record(
    *,
    record_type: str,
    canonical_id: str,
    trigger_or_entry_condition: str,
    identity_tuple: list[str],
    frozen_inputs: list[str],
    state_or_outcome: str,
    allowed_next_actions: list[str],
    idempotency_or_hash_fields: list[str],
    recovery_posture: str,
    privacy_reconciliation_required: bool,
    authority_safety_posture: str,
    operator_visible_effect: str,
    audit_events: list[str],
    source_path: Path,
    source_heading_or_logical_block: str,
    source_ref: str,
    notes: Iterable[str] = (),
    **extra: Any,
) -> dict[str, Any]:
    row = {
        "record_type": record_type,
        "canonical_id": canonical_id,
        "trigger_or_entry_condition": trigger_or_entry_condition,
        "identity_tuple": identity_tuple,
        "frozen_inputs": frozen_inputs,
        "state_or_outcome": state_or_outcome,
        "allowed_next_actions": allowed_next_actions,
        "idempotency_or_hash_fields": idempotency_or_hash_fields,
        "recovery_posture": recovery_posture,
        "privacy_reconciliation_required": privacy_reconciliation_required,
        "authority_safety_posture": authority_safety_posture,
        "operator_visible_effect": operator_visible_effect,
        "audit_events": audit_events,
        "source_file": repo_rel(source_path),
        "source_heading_or_logical_block": source_heading_or_logical_block,
        "source_ref": source_ref,
        "notes": list(notes),
    }
    row.update(extra)
    return row


def assert_required_record_fields(rows: Iterable[dict[str, Any]]) -> None:
    for row in rows:
        missing = [field for field in REQUIRED_RECORD_FIELDS if field not in row]
        if missing:
            raise ValueError(f"Record {row.get('canonical_id')} is missing required fields: {missing}")
        for field in LIST_FIELDS:
            if not isinstance(row[field], list):
                raise ValueError(f"Record {row['canonical_id']} field `{field}` must be a list.")


def flatten(*groups: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for group in groups:
        rows.extend(group)
    return rows


def format_value(value: Any) -> str:
    if isinstance(value, bool):
        return "yes" if value else "no"
    if value is None:
        return "null"
    if isinstance(value, list):
        return "<br>".join(str(item) for item in value) if value else "[]"
    return str(value)


def render_table(headers: list[str], rows: list[dict[str, Any]]) -> list[str]:
    if not rows:
        return ["_No rows._"]
    lines = ["| " + " | ".join(headers) + " |", "| " + " | ".join("---" for _ in headers) + " |"]
    for row in rows:
        values = [format_value(row.get(header, "")) for header in headers]
        values = [value.replace("|", "\\|") for value in values]
        lines.append("| " + " | ".join(values) + " |")
    return lines


def make_summary(rows: list[dict[str, Any]], *, extra: dict[str, Any] | None = None) -> dict[str, Any]:
    summary = {"row_count": len(rows)}
    if extra:
        summary.update(extra)
    return summary


REPLAY_CLASS_ENUM = schema_enum(REPLAY_ATTESTATION_SCHEMA_PATH, "properties", "replay_class", "enum")
COMPARISON_MODE_ENUM = schema_enum(REPLAY_ATTESTATION_SCHEMA_PATH, "properties", "comparison_mode", "enum")
BASIS_VALIDATION_ENUM = schema_enum(REPLAY_ATTESTATION_SCHEMA_PATH, "properties", "basis_validation_state", "enum")
OUTCOME_CLASS_ENUM = schema_enum(REPLAY_ATTESTATION_SCHEMA_PATH, "properties", "outcome_class", "enum")
BASIS_IDENTITY_ENUM = schema_enum(REPLAY_ATTESTATION_SCHEMA_PATH, "properties", "basis_identity_verdict", "enum")
EQUIVALENCE_ENUM = schema_enum(REPLAY_ATTESTATION_SCHEMA_PATH, "properties", "deterministic_equivalence_verdict", "enum")
ATTESTATION_CONFIDENCE_BANDS = schema_enum(REPLAY_ATTESTATION_SCHEMA_PATH, "properties", "attestation_confidence_band", "enum")

CLAIM_STATE_ENUM = schema_enum(MANIFEST_START_CLAIM_SCHEMA_PATH, "properties", "claim_state", "enum")
CLAIM_STATUS_ENUM = schema_enum(MANIFEST_START_CLAIM_SCHEMA_PATH, "properties", "claim_status_code", "enum")
STALE_RECLAIM_REASON_ENUM = schema_enum(MANIFEST_START_CLAIM_SCHEMA_PATH, "properties", "stale_reclaim_reason_code_or_null", "enum")
CLAIM_RELEASE_REASON_ENUM = schema_enum(MANIFEST_START_CLAIM_SCHEMA_PATH, "properties", "claim_release_reason_code_or_null", "enum")

NIGHTLY_TRIGGER_ENUM = schema_enum(NIGHTLY_BATCH_IDENTITY_SCHEMA_PATH, "properties", "trigger_class", "enum")
NIGHTLY_RESUME_ENUM = schema_enum(NIGHTLY_BATCH_IDENTITY_SCHEMA_PATH, "properties", "recovery_resume_state", "enum")
NIGHTLY_ENVIRONMENT_ENUM = schema_enum(NIGHTLY_BATCH_IDENTITY_SCHEMA_PATH, "properties", "environment_ref", "enum")
SELECTION_DISPOSITION_ENUM = schema_enum(
    NIGHTLY_BATCH_RUN_SCHEMA_PATH,
    "$defs",
    "selectionEntry",
    "properties",
    "selection_disposition",
    "enum",
)
TERMINAL_REUSE_ENUM = schema_enum(
    NIGHTLY_BATCH_RUN_SCHEMA_PATH,
    "$defs",
    "selectionEntry",
    "properties",
    "terminal_result_reuse_state",
    "enum",
)
ACTIVE_ATTEMPT_RESOLUTION_ENUM = schema_enum(
    NIGHTLY_BATCH_RUN_SCHEMA_PATH,
    "$defs",
    "selectionEntry",
    "properties",
    "active_attempt_resolution_state",
    "enum",
)
NIGHTLY_OUTCOME_BUCKET_ENUM = schema_enum(
    NIGHTLY_BATCH_RUN_SCHEMA_PATH,
    "$defs",
    "selectionEntry",
    "properties",
    "outcome_bucket",
    "enum",
)
NIGHTLY_OPERATOR_DIGEST_PUBLICATION_ENUM = schema_enum(
    NIGHTLY_BATCH_RUN_SCHEMA_PATH,
    "properties",
    "operator_digest_publication_state",
    "enum",
)
NIGHTLY_SHARD_FAILURE_ENUM = schema_enum(
    NIGHTLY_BATCH_RUN_SCHEMA_PATH,
    "$defs",
    "shardPlanEntry",
    "properties",
    "shard_state",
    "enum",
)

RECOVERY_BOUNDARY_SCOPE_ENUM = schema_enum(RECOVERY_GOVERNANCE_SCHEMA_PATH, "properties", "boundary_scope", "enum")
RECOVERY_WORKLOAD_CLASS_ENUM = schema_enum(
    RECOVERY_GOVERNANCE_SCHEMA_PATH, "properties", "protected_workload_class", "enum"
)
RECOVERY_TIER_ENUM = schema_enum(RECOVERY_GOVERNANCE_SCHEMA_PATH, "properties", "recovery_tier_class", "enum")
RPO_ENUM = schema_enum(RECOVERY_GOVERNANCE_SCHEMA_PATH, "properties", "rpo_class", "enum")
RTO_ENUM = schema_enum(RECOVERY_GOVERNANCE_SCHEMA_PATH, "properties", "rto_class", "enum")
RECOVERY_CHECKPOINT_STATE_ENUM = schema_enum(RECOVERY_CHECKPOINT_SCHEMA_PATH, "properties", "checkpoint_state", "enum")
REOPEN_READINESS_ENUM = schema_enum(RECOVERY_CHECKPOINT_SCHEMA_PATH, "properties", "reopen_readiness_state", "enum")
PRIVACY_RECONCILIATION_ENUM = schema_enum(
    RESTORE_PRIVACY_SCHEMA_PATH, "properties", "privacy_reconciliation_state", "enum"
)
REOPEN_ACCESS_ENUM = schema_enum(RESTORE_PRIVACY_SCHEMA_PATH, "properties", "reopen_access_state", "enum")

RELEASE_CANDIDATE_REQUIRED = schema_required(RELEASE_CANDIDATE_SCHEMA_PATH)
COMPATIBILITY_GATE_REQUIRED = schema_required(COMPATIBILITY_GATE_SCHEMA_PATH)
COMPATIBILITY_READER_WINDOW_ENUM = schema_enum(COMPATIBILITY_GATE_SCHEMA_PATH, "properties", "reader_window_state", "enum")
COMPATIBILITY_HISTORICAL_GUARD_ENUM = schema_enum(
    COMPATIBILITY_GATE_SCHEMA_PATH, "properties", "historical_manifest_guard_state", "enum"
)
COMPATIBILITY_REPLAY_RESTORE_ENUM = schema_enum(
    COMPATIBILITY_GATE_SCHEMA_PATH, "properties", "replay_restore_guard_state", "enum"
)
COMPATIBILITY_NATIVE_CLIENT_ENUM = schema_enum(
    COMPATIBILITY_GATE_SCHEMA_PATH, "properties", "native_client_window_state", "enum"
)
COMPATIBILITY_MIGRATION_ENUM = schema_enum(
    COMPATIBILITY_GATE_SCHEMA_PATH, "properties", "migration_chronology_state", "enum"
)
COMPATIBILITY_DESTRUCTIVE_ENUM = schema_enum(
    COMPATIBILITY_GATE_SCHEMA_PATH, "properties", "destructive_contract_state", "enum"
)
ROLLBACK_BOUNDARY_ENUM = schema_enum(DEPLOYMENT_RELEASE_SCHEMA_PATH, "properties", "rollback_boundary_state", "enum")
ROLLOUT_STRATEGY_ENUM = schema_enum(DEPLOYMENT_RELEASE_SCHEMA_PATH, "properties", "rollout_strategy", "enum")
ROLLOUT_STATE_ENUM = schema_enum(DEPLOYMENT_RELEASE_SCHEMA_PATH, "properties", "rollout_state", "enum")


def source_assertions() -> None:
    heading_ref(REPLAY_PATH, "Replay classes")
    heading_ref(REPLAY_PATH, "Exact replay preconditions")
    heading_ref(REPLAY_PATH, "Recovery and continuation semantics")
    heading_ref(REPLAY_PATH, "Idempotent rerun guarantees")
    heading_ref(REPLAY_PATH, "Replay comparison contract")
    heading_ref(REPLAY_PATH, "Replay attestation artifact")
    heading_ref(REPLAY_PATH, "Corruption and incomplete basis handling")
    heading_ref(MANIFEST_FREEZE_PATH, "5.10 Idempotency key contract")
    heading_ref(MANIFEST_FREEZE_PATH, "5.11 Seal contract")
    heading_ref(MANIFEST_START_CLAIM_PATH, "2. Legal claim outcomes")
    heading_ref(MANIFEST_START_CLAIM_PATH, "3. Atomicity rule")
    heading_ref(MANIFEST_START_CLAIM_PATH, "4. Recovery and reclaim")
    heading_ref(MANIFEST_START_CLAIM_PATH, "5. Invariants")
    heading_ref(MANIFEST_BRANCH_PATH, "Branch Actions")
    heading_ref(MANIFEST_BRANCH_PATH, "Frozen Identity Inputs")
    heading_ref(MANIFEST_BRANCH_PATH, "Typed Branch Reasons")
    heading_ref(NIGHTLY_AUTOPILOT_PATH, "2. Trigger contract and frozen operating window")
    heading_ref(NIGHTLY_AUTOPILOT_PATH, "4. Portfolio selection and eligibility contract")
    heading_ref(NIGHTLY_AUTOPILOT_PATH, "6. Per-client and per-stage unattended policy matrix")
    heading_ref(NIGHTLY_AUTOPILOT_PATH, "7. Batch-run sharding, concurrency, and retry windows")
    heading_ref(NIGHTLY_AUTOPILOT_PATH, "10. Crash recovery and stale-checkpoint resolution")
    heading_ref(NIGHTLY_AUTOPILOT_PATH, "11. Global stop conditions and partial-failure handling")
    heading_ref(NIGHTLY_AUTOPILOT_PATH, "12. Operator handoff, queues, and next-morning digest")
    heading_ref(NIGHTLY_SELECTION_PATH, "Identity law")
    heading_ref(NIGHTLY_SELECTION_PATH, "Selection law")
    heading_ref(NIGHTLY_SELECTION_PATH, "Shard-isolation law")
    heading_ref(NIGHTLY_SELECTION_PATH, "Recovery-reclaim law")
    heading_ref(RECOVERY_PATH, "Shared recovery-governance boundary")
    heading_ref(RECOVERY_PATH, "Recovery checkpoint law")
    heading_ref(RECOVERY_PATH, "Restore privacy reconciliation law")
    heading_ref(RECOVERY_PATH, "Queue and authority recovery law")
    heading_ref(RECOVERY_PATH, "Rollback and fail-forward law")
    heading_ref(RELEASE_PATH, "1. Governing candidate identity model")
    heading_ref(RELEASE_PATH, "2. Contract boundary")
    heading_ref(RELEASE_PATH, "3. Admissibility boundary")
    heading_ref(RELEASE_PATH, "4. Eliminated failure modes")
    heading_ref(DEPLOYMENT_PATH, "5. Backup, restore, and DR rules")
    heading_ref(DEPLOYMENT_PATH, "6. Rollout, rollback, and fail-forward posture")
    heading_ref(DEPLOYMENT_PATH, "8. Release and resilience invariants")
    heading_ref(OBSERVABILITY_PATH, "14.4 Mandatory correlation keys")
    heading_ref(OBSERVABILITY_PATH, "14.6 Required audit event families")
    heading_ref(AUTHORITY_PROTOCOL_PATH, "9.8 Request hashing and idempotency")
    heading_ref(AUTHORITY_PROTOCOL_PATH, "9.13A Reconciliation budget and escalation rule")
    heading_ref(RETENTION_PRIVACY_PATH, "Basis-preserving retention for replay")
    heading_ref(RETENTION_OBSERVABILITY_PATH, "15.5 Erasure, legal-hold, and proof-preservation invariants")


def artifact_inventory_rows() -> list[dict[str, Any]]:
    rows = [
        control_record(
            record_type="control_plane_artifact",
            canonical_id="artifact_run_manifest",
            trigger_or_entry_condition="A materially significant run allocates or reuses a manifest envelope.",
            identity_tuple=["manifest_id", "root_manifest_id", "parent_manifest_id_or_null", "run_kind", "mode"],
            frozen_inputs=["requested_scope[]", "effective_scope[]", "config_freeze_ref", "input_freeze_ref", "hash_set.execution_basis_hash"],
            state_or_outcome="RunManifest is the canonical execution, lineage, and sealing truth for request-time control.",
            allowed_next_actions=["freeze_manifest", "seal_manifest", "start_claim_or_reuse", "append_post_seal_outcomes"],
            idempotency_or_hash_fields=["idempotency_key", "manifest_hash", "execution_basis_hash", "decision_bundle_hash", "deterministic_outcome_hash"],
            recovery_posture="Root artifact for same-manifest reuse, replay child allocation, and recovery child lineage.",
            privacy_reconciliation_required=False,
            authority_safety_posture="No authority mutation, replay, or continuation may bypass manifest lineage truth.",
            operator_visible_effect="Operators can reconstruct why a run was new, reused, replayed, or continued from one manifest spine.",
            audit_events=["ManifestAllocated", "ManifestFrozen", "ManifestSealed", "ManifestCompleted", "ManifestSuperseded"],
            source_path=MANIFEST_FREEZE_PATH,
            source_heading_or_logical_block="5.3 RunManifest required field groups",
            source_ref=heading_ref(MANIFEST_FREEZE_PATH, "5.3 `RunManifest` required field groups"),
            notes=["Immutable after seal except append-only post-seal outcome fields."],
            artifact_name="RunManifest",
            schema_path="Algorithm/schemas/run_manifest.schema.json",
        ),
        control_record(
            record_type="control_plane_artifact",
            canonical_id="artifact_config_freeze",
            trigger_or_entry_condition="Freeze-before-decision and freeze-before-replay rules resolve stable config.",
            identity_tuple=["config_freeze_id", "config_surface_hash", "schema_bundle_hash"],
            frozen_inputs=["resolved_policy_snapshot", "formula_bundle", "provider_profile_set", "mode_specific_controls"],
            state_or_outcome="ConfigFreeze captures the lawful config basis for live, replay, nightly, and release flows.",
            allowed_next_actions=["hash_config_surface", "seal_manifest", "inherit_exact_or_historical_explicit"],
            idempotency_or_hash_fields=["config_freeze_hash", "config_surface_hash", "execution_basis_hash"],
            recovery_posture="Exact same-attempt recovery and exact replay require identical config freeze semantics.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Counterfactual analysis may vary config only under analysis posture and explicit declaration.",
            operator_visible_effect="Change reviews can point to one frozen config bundle instead of ambient runtime state.",
            audit_events=["ManifestFrozen", "ConfigInheritanceResolved"],
            source_path=MANIFEST_FREEZE_PATH,
            source_heading_or_logical_block="5.4 ConfigFreeze contract",
            source_ref=heading_ref(MANIFEST_FREEZE_PATH, "5.4 `ConfigFreeze` contract"),
            notes=["Compliance-grade replay forbids non-deterministic allowlists for exact reuse."],
            artifact_name="ConfigFreeze",
            schema_path="Algorithm/schemas/config_freeze.schema.json",
        ),
        control_record(
            record_type="control_plane_artifact",
            canonical_id="artifact_input_freeze",
            trigger_or_entry_condition="Intake and source collection complete before compute, submission, or replay.",
            identity_tuple=["input_freeze_id", "input_set_hash", "authoritative_intake_set_hash"],
            frozen_inputs=["ordered_input_artifacts", "authoritative_intake_artifacts", "retention_placeholders"],
            state_or_outcome="InputFreeze captures the exact input basis later used by replay, recovery, and audits.",
            allowed_next_actions=["seal_manifest", "derive_execution_basis_hash", "validate_basis_readability"],
            idempotency_or_hash_fields=["input_set_hash", "execution_basis_hash"],
            recovery_posture="Exact replay and same-attempt recovery require readable input freeze plus authoritative intake basis.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Fresh live recollection is forbidden while still claiming exact replay.",
            operator_visible_effect="Operators can distinguish lawful retained placeholders from missing or corrupted input basis.",
            audit_events=["SourceCollectionCompleted", "SnapshotBuilt"],
            source_path=MANIFEST_FREEZE_PATH,
            source_heading_or_logical_block="5.8 Input freeze contract",
            source_ref=heading_ref(MANIFEST_FREEZE_PATH, "5.8 Input freeze contract"),
            notes=["Retention-limited placeholders must surface explicitly instead of collapsing to not applicable."],
            artifact_name="InputFreeze",
            schema_path="Algorithm/schemas/input_freeze.schema.json",
        ),
        control_record(
            record_type="control_plane_artifact",
            canonical_id="artifact_hash_set",
            trigger_or_entry_condition="Manifest sealing derives the execution, manifest, decision, and outcome hashes.",
            identity_tuple=["manifest_id", "config_freeze_hash", "input_set_hash", "execution_basis_hash"],
            frozen_inputs=["config_freeze", "input_freeze", "scope_execution_binding", "deterministic_seed"],
            state_or_outcome="HashSet is the canonical replay, idempotency, and audit integrity spine.",
            allowed_next_actions=["reuse_preseal_tape", "compare_replay_basis", "prove_idempotent_retry"],
            idempotency_or_hash_fields=["config_freeze_hash", "config_surface_hash", "input_set_hash", "execution_basis_hash", "manifest_hash", "decision_bundle_hash", "deterministic_outcome_hash"],
            recovery_posture="Recovery children preserve `execution_basis_hash`; later lineage nodes must not rewrite it in place.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Authority recovery and replay attestations read persisted hashes instead of inferring basis from side effects.",
            operator_visible_effect="Investigations can explain exactly which hash changed between reuse, replay, continuation, and promotion.",
            audit_events=["ManifestFrozen", "ManifestSealed", "ComputeCompleted"],
            source_path=MANIFEST_FREEZE_PATH,
            source_heading_or_logical_block="5.9 Hash contract",
            source_ref=heading_ref(MANIFEST_FREEZE_PATH, "5.9 Hash contract"),
            notes=["Decision and outcome hashes are append-only once published for a manifest version."],
            artifact_name="HashSet",
            schema_path="Algorithm/schemas/hash_set.schema.json",
        ),
        control_record(
            record_type="control_plane_artifact",
            canonical_id="artifact_continuation_set",
            trigger_or_entry_condition="A child manifest or replay chooses inherited versus freshly resolved basis.",
            identity_tuple=["manifest_id", "continuation_basis", "selected_manifest_continuation_basis"],
            frozen_inputs=["config_inheritance_mode_or_null", "input_inheritance_mode_or_null", "lineage_refs"],
            state_or_outcome="ContinuationSet distinguishes exact recovery, replay, historically explicit continuation, and new-request children.",
            allowed_next_actions=["allocate_recovery_child", "allocate_replay_child", "allocate_continuation_child"],
            idempotency_or_hash_fields=["continuation_basis", "idempotency_key", "request_identity_hash"],
            recovery_posture="Same-attempt recovery is exact; historically explicit continuation is limited and must stay explicitly marked.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Continuation metadata cannot impersonate transport resume tokens or read-side stability tokens.",
            operator_visible_effect="Operator tooling can explain why a child reuses history without collapsing it into ordinary continuation.",
            audit_events=["ContinuationChildAllocated", "ConfigInheritanceResolved"],
            source_path=MANIFEST_FREEZE_PATH,
            source_heading_or_logical_block="5.7 Parent/child manifest semantics",
            source_ref=heading_ref(MANIFEST_FREEZE_PATH, "5.7 Parent/child manifest semantics"),
            notes=["Continuation legality is part of branch proof, not a late-stage convenience flag."],
            artifact_name="ContinuationSet",
            schema_path="Algorithm/schemas/continuation_set.schema.json",
        ),
        control_record(
            record_type="control_plane_artifact",
            canonical_id="artifact_frozen_execution_binding",
            trigger_or_entry_condition="Access evaluation resolves the executable request boundary before sealing or authority mutation.",
            identity_tuple=["manifest_id", "access_binding_hash", "access_decision", "required_authn_level"],
            frozen_inputs=["effective_scope[]", "masking_rules[]", "required_approvals[]", "delegation_and_authority_lineage"],
            state_or_outcome="FrozenExecutionBinding extends request identity with executable scope and approval context.",
            allowed_next_actions=["derive_manifest_idempotency_key", "derive_authority_request_hashes", "enforce_scope_and_masking"],
            idempotency_or_hash_fields=["access_binding_hash", "idempotency_key", "duplicate_meaning_key", "request_hash"],
            recovery_posture="Authority recovery may reuse request lineage only when binding lineage remains unchanged.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Access binding drift blocks silent replay or resend reuse.",
            operator_visible_effect="Access and authority investigations can separate token drift from request-body drift.",
            audit_events=["AccessScopeBound", "AuthorityBindingMismatchDetected"],
            source_path=MANIFEST_FREEZE_PATH,
            source_heading_or_logical_block="5.3 H. Frozen execution binding",
            source_ref=heading_ref(MANIFEST_FREEZE_PATH, "H. Frozen execution binding"),
            notes=["Executable identity includes access decision class, executable scope, masking, approvals, and authentication level."],
            artifact_name="FrozenExecutionBinding",
            schema_path="Algorithm/schemas/frozen_execution_binding.schema.json",
        ),
        control_record(
            record_type="control_plane_artifact",
            canonical_id="artifact_preseal_gate_evaluation",
            trigger_or_entry_condition="A manifest approaches seal and must freeze the canonical pre-seal gate prefix.",
            identity_tuple=["manifest_id", "execution_basis_hash", "ordered_gate_decision_ids[]"],
            frozen_inputs=["MANIFEST_GATE", "ARTIFACT_CONTRACT_GATE", "INPUT_BOUNDARY_GATE", "DATA_QUALITY_GATE"],
            state_or_outcome="preseal_gate_evaluation captures the authoritative pre-start tape and durability boundary.",
            allowed_next_actions=["seal_manifest", "reuse_same_manifest_preseal_tape", "block_prestart_execution"],
            idempotency_or_hash_fields=["execution_basis_hash", "ordered_gate_decision_ids[]"],
            recovery_posture="Exact replay and same-manifest reuse consume the persisted tape instead of recomputing on ambient state.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Missing or mismatched pre-seal tape forces fail-closed replay posture.",
            operator_visible_effect="Operators can see whether a run blocked before start or sealed with a complete pre-seal basis.",
            audit_events=["GateEvaluated", "ManifestSealed"],
            source_path=MANIFEST_FREEZE_PATH,
            source_heading_or_logical_block="5.11 Pre-seal gate evaluation contract",
            source_ref=heading_ref(MANIFEST_FREEZE_PATH, "Pre-seal gate evaluation contract"),
            notes=["The first four gate records remain an immutable prefix even when later gates append after seal."],
            artifact_name="preseal_gate_evaluation",
            schema_path="Algorithm/schemas/preseal_gate_evaluation_contract.schema.json",
        ),
        control_record(
            record_type="control_plane_artifact",
            canonical_id="artifact_manifest_start_claim",
            trigger_or_entry_condition="A sealed manifest is claimed for the first live post-seal execution or stale recovery successor flow.",
            identity_tuple=["manifest_id", "execution_basis_hash", "attempt_lineage_ref", "claim_epoch"],
            frozen_inputs=["claim_state", "claim_status_code", "claim_holder_ref_or_null", "claim_token_or_null", "publication_state"],
            state_or_outcome="manifest_start_claim is the single-writer start lease and first-publication truth for live execution.",
            allowed_next_actions=["grant_claim", "reject_duplicate_start", "mark_stale_reclaim_required", "publish_first_stage_or_outbox"],
            idempotency_or_hash_fields=["manifest_hash", "execution_basis_hash", "access_binding_hash", "attempt_lineage_ref"],
            recovery_posture="Nightly reclaim and recovery child allocation must read this control object instead of inferring from missing heartbeats.",
            privacy_reconciliation_required=False,
            authority_safety_posture="No second live start is legal while an active lease still exists.",
            operator_visible_effect="Schedulers and operators can distinguish already-active, reclaim-required, and terminal-reuse outcomes without worker logs.",
            audit_events=["RunStarted", "RunStartClaimRejected", "NightlyBatchShardReclaimed"],
            source_path=MANIFEST_START_CLAIM_PATH,
            source_heading_or_logical_block="1. Durable control object",
            source_ref=heading_ref(MANIFEST_START_CLAIM_PATH, "1. Durable control object"),
            notes=["Claim and first durable publication commit atomically."],
            artifact_name="manifest_start_claim",
            schema_path=repo_rel(MANIFEST_START_CLAIM_SCHEMA_PATH),
        ),
        control_record(
            record_type="control_plane_artifact",
            canonical_id="artifact_manifest_lineage_trace",
            trigger_or_entry_condition="Branch selection chooses reuse, replay, recovery, continuation, or fresh-child allocation.",
            identity_tuple=["manifest_lineage_trace_ref", "selected_branch_action", "selected_branch_reason_code"],
            frozen_inputs=["candidate_evaluations[]", "mirror_consistency_state", "prior_manifest_hash_at_decision_or_null", "nightly_predecessor_context"],
            state_or_outcome="ManifestLineageTrace is the request-time branch explainer and candidate rejection ledger.",
            allowed_next_actions=["render_branch_narrative", "bind_audit_and_trace_refs", "explain_nightly_window_continuity"],
            idempotency_or_hash_fields=["request_identity_hash", "idempotency_key", "prior_manifest_hash_at_decision_or_null"],
            recovery_posture="Recovery, replay, continuation, and same-manifest reuse remain explainable from one branch artifact.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Lineage truth is explicit; nearby timestamps or read mirrors cannot substitute for branch proof.",
            operator_visible_effect="Explorers and audit tooling can show why one candidate won and others were rejected.",
            audit_events=["ExistingDecisionBundleReturned", "ManifestContextReused", "ContinuationChildAllocated"],
            source_path=MANIFEST_BRANCH_PATH,
            source_heading_or_logical_block="Explorer Truth",
            source_ref=heading_ref(MANIFEST_BRANCH_PATH, "Explorer Truth"),
            notes=["The current corpus names ManifestLineageTrace in prose but does not provide a dedicated schema."],
            artifact_name="ManifestLineageTrace",
            schema_path=None,
        ),
        control_record(
            record_type="control_plane_artifact",
            canonical_id="artifact_replay_attestation",
            trigger_or_entry_condition="A replay child reaches a persisted decision outcome and must publish durable comparison truth.",
            identity_tuple=["replay_attestation_id", "manifest_id", "replay_of_manifest_id", "replay_class"],
            frozen_inputs=["comparison_mode", "basis_validation_state", "basis_identity_verdict", "deterministic_equivalence_verdict", "basis_dimension_results[]", "outcome_component_results[]"],
            state_or_outcome="ReplayAttestation is the durable replay-comparison and operator/auditor explanation artifact.",
            allowed_next_actions=["publish_replay_visible_outcome", "answer_audit_queries", "return_existing_replay_child_on_duplicate_request"],
            idempotency_or_hash_fields=["expected_execution_basis_hash", "actual_execution_basis_hash", "expected_deterministic_outcome_hash", "actual_deterministic_outcome_hash"],
            recovery_posture="Corrupt, incomplete, or retention-limited basis becomes explicit posture instead of silent substitution.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Counterfactual analysis remains analysis-only and may not mutate authority-facing state.",
            operator_visible_effect="Operators see exact, expected-difference, limited, corrupt, or unexpected mismatch posture from a signed artifact.",
            audit_events=["ReplayBasisCorruptionDetected", "ExistingDecisionBundleReturned"],
            source_path=REPLAY_PATH,
            source_heading_or_logical_block="Replay attestation artifact",
            source_ref=heading_ref(REPLAY_PATH, "Replay attestation artifact"),
            notes=["No replay child may publish replay-visible truth without a linked durable attestation."],
            artifact_name="ReplayAttestation",
            schema_path=repo_rel(REPLAY_ATTESTATION_SCHEMA_PATH),
        ),
        control_record(
            record_type="control_plane_artifact",
            canonical_id="artifact_nightly_batch_identity_contract",
            trigger_or_entry_condition="Nightly trigger allocation freezes same-window dedupe, cross-window continuity, and recovery lineage.",
            identity_tuple=["tenant_id", "nightly_window_key", "trigger_class", "release_verification_manifest_ref", "policy_snapshot_hash", "autopilot_policy_hash"],
            frozen_inputs=["schema_bundle_hash", "code_build_id", "environment_ref", "selection_universe_hash", "selection_universe_count", "reclaimed_predecessor_batch_run_ref_or_null", "recovery_resume_state"],
            state_or_outcome="NightlyBatchIdentityContract is the scheduler dedupe and batch identity tuple.",
            allowed_next_actions=["allocate_or_reuse_batch", "freeze_selection_universe", "prove_same_window_duplicate_suppression"],
            idempotency_or_hash_fields=["identity_contract_hash", "scheduler_dedupe_key"],
            recovery_posture="Recovery reclaim windows link the predecessor explicitly and forbid silent second-batch allocation.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Cross-window continuity requires a new nightly identity even if config and inputs are unchanged.",
            operator_visible_effect="Operators can trace a batch back to its trigger class, release-verification basis, and policy snapshot.",
            audit_events=["NightlyBatchAllocated"],
            source_path=NIGHTLY_SELECTION_PATH,
            source_heading_or_logical_block="Identity law",
            source_ref=heading_ref(NIGHTLY_SELECTION_PATH, "Identity law"),
            notes=["Same-window duplicates reuse batch identity; later windows remain separate control objects."],
            artifact_name="NightlyBatchIdentityContract",
            schema_path=repo_rel(NIGHTLY_BATCH_IDENTITY_SCHEMA_PATH),
        ),
        control_record(
            record_type="control_plane_artifact",
            canonical_id="artifact_nightly_batch_run",
            trigger_or_entry_condition="A nightly control-plane window has been allocated and frozen for one tenant.",
            identity_tuple=["batch_run_id", "tenant_id", "nightly_window_key", "trigger_class", "release_verification_manifest_ref"],
            frozen_inputs=["identity_contract", "global_concurrency_profile", "selection_entries[]", "shard_plan[]", "operator_digest_publication_state"],
            state_or_outcome="NightlyBatchRun is the authoritative overnight selection, shard, and quiescence control object.",
            allowed_next_actions=["select_portfolio", "dispatch_client_execution", "reclaim_stale_batch", "publish_operator_digest"],
            idempotency_or_hash_fields=["scheduler_dedupe_key", "identity_contract_hash", "selection_universe_hash"],
            recovery_posture="Crash recovery reuses predecessor selection and shard truth or escalates if proof is incomplete.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Nightly automation may not bypass manifest leases, authority ambiguity rules, or resend boundaries.",
            operator_visible_effect="Morning operations can read one batch artifact instead of reconstructing overnight behavior from queues.",
            audit_events=["NightlyBatchAllocated", "NightlyPortfolioSelected", "NightlyBatchCompleted", "OperatorMorningDigestPublished"],
            source_path=NIGHTLY_AUTOPILOT_PATH,
            source_heading_or_logical_block="2.3 Frozen batch envelope",
            source_ref=heading_ref(NIGHTLY_AUTOPILOT_PATH, "2.3 Frozen batch envelope"),
            notes=["Per-client entries remain explicit even for reuse, defer, escalation, and skip outcomes."],
            artifact_name="NightlyBatchRun",
            schema_path=repo_rel(NIGHTLY_BATCH_RUN_SCHEMA_PATH),
        ),
        control_record(
            record_type="control_plane_artifact",
            canonical_id="artifact_nightly_selection_entry",
            trigger_or_entry_condition="Nightly portfolio selection evaluates one candidate client-period tuple exactly once.",
            identity_tuple=["entry_id", "candidate_identity_hash", "client_id", "period", "selection_disposition"],
            frozen_inputs=["terminal_result_reuse_state", "active_attempt_resolution_state", "priority_tuple", "reason_codes[]", "workflow_item_refs[]", "next_checkpoint_at"],
            state_or_outcome="Nightly selection entry is the per-candidate operating decision row for overnight execution.",
            allowed_next_actions=["execute_new_manifest", "execute_continuation_child", "reuse_result", "defer", "escalate", "skip"],
            idempotency_or_hash_fields=["candidate_identity_hash", "selection_basis_hash"],
            recovery_posture="Selection rows survive reclaim and batch restarts; unrelated clients retain explicit outcomes despite shard failure.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Same-window active attempts may defer or reclaim; they may not silently duplicate live execution.",
            operator_visible_effect="Client-level overnight outcomes are visible even when no manifest is executed.",
            audit_events=["NightlyClientExecutionDispatched", "NightlyClientExecutionDeferred", "NightlyClientExecutionSkipped", "NightlyClientExecutionEscalated"],
            source_path=NIGHTLY_SELECTION_PATH,
            source_heading_or_logical_block="Selection law",
            source_ref=heading_ref(NIGHTLY_SELECTION_PATH, "Selection law"),
            notes=["Only execution-capable rows enter shard plans; reuse, defer, escalation, and skip remain off-shard."],
            artifact_name="NightlySelectionEntry",
            schema_path=repo_rel(NIGHTLY_BATCH_RUN_SCHEMA_PATH),
        ),
        control_record(
            record_type="control_plane_artifact",
            canonical_id="artifact_operator_morning_digest",
            trigger_or_entry_condition="Nightly quiescence succeeds far enough to publish one tenant coverage-date handoff summary.",
            identity_tuple=["coverage_date", "source_batch_run_refs[]", "supersedes_digest_id"],
            frozen_inputs=["covered_selection_entry_refs[]", "summary_counts{...}", "queue_summaries[]", "highlighted_client_outcomes[]", "published_workflow_item_refs[]", "published_notification_refs[]"],
            state_or_outcome="OperatorMorningDigest is the deterministic next-morning handoff artifact for overnight control-plane behavior.",
            allowed_next_actions=["publish_workflow_updates", "publish_notifications", "supersede_prior_digest"],
            idempotency_or_hash_fields=["derivation_contract_hash", "coverage_date", "source_batch_run_refs[]"],
            recovery_posture="Digest derivation remains pinned to live nightly compliance posture, not replay or analysis.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Customer-visible consequences remain bound to persisted workflow and audit evidence, not free-text summaries.",
            operator_visible_effect="Operators receive a single coverage-date digest instead of reconstructing overnight posture manually.",
            audit_events=["OperatorMorningDigestPublished"],
            source_path=NIGHTLY_AUTOPILOT_PATH,
            source_heading_or_logical_block="12.2 OperatorMorningDigest",
            source_ref=heading_ref(NIGHTLY_AUTOPILOT_PATH, "12.2 OperatorMorningDigest"),
            notes=["Publication state and QA are explicit parts of the digest contract."],
            artifact_name="OperatorMorningDigest",
            schema_path="Algorithm/schemas/operator_morning_digest.schema.json",
        ),
        control_record(
            record_type="control_plane_artifact",
            canonical_id="artifact_recovery_governance_contract",
            trigger_or_entry_condition="Checkpoint and release artifacts bind one shared recovery governance boundary.",
            identity_tuple=["boundary_scope", "protected_workload_class", "recovery_tier_class", "rpo_class", "rto_class"],
            frozen_inputs=["checkpoint_inventory_policy", "privacy_reconciliation_policy", "queue_recovery_policy", "authority_recovery_policy", "rollback_boundary_policy", "fail_forward_policy"],
            state_or_outcome="RecoveryGovernanceContract is the shared checkpoint and release resilience policy object.",
            allowed_next_actions=["bind_checkpoint", "bind_deployment_release", "validate_reopen_and_fail_forward_boundaries"],
            idempotency_or_hash_fields=["contract_version", "protected_workload_class", "boundary_scope"],
            recovery_posture="Tier mappings and reopen policy remain explicit and fail closed when weaker classes appear.",
            privacy_reconciliation_required=True,
            authority_safety_posture="Authority mutations require lineage and binding revalidation after restore or failover.",
            operator_visible_effect="SRE and release tooling can prove the tier, RPO/RTO, and reopen policy used by a checkpoint or release.",
            audit_events=["BackupCreated", "RestoreDrillExecuted", "ReleasePromoted", "ReleaseRolledBack"],
            source_path=RECOVERY_PATH,
            source_heading_or_logical_block="Shared recovery-governance boundary",
            source_ref=heading_ref(RECOVERY_PATH, "Shared recovery-governance boundary"),
            notes=["Control-plane legal truth may not serialize a weaker tier than TIER_0_CONTROL_PLANE."],
            artifact_name="RecoveryGovernanceContract",
            schema_path=repo_rel(RECOVERY_GOVERNANCE_SCHEMA_PATH),
        ),
        control_record(
            record_type="control_plane_artifact",
            canonical_id="artifact_recovery_checkpoint",
            trigger_or_entry_condition="Scheduled backup cadence or promotion/DR evidence binds a restore-capable checkpoint.",
            identity_tuple=["checkpoint_id", "datastore_ref", "checkpoint_state", "restore_drill_ref"],
            frozen_inputs=["checkpoint_inventory_ref", "restore_verification_hash", "privacy_reconciliation_contract", "audit_continuity_verified", "queue_rebuild_verified", "authority_binding_revalidation_verified", "reopen_readiness_state"],
            state_or_outcome="RecoveryCheckpoint is the authoritative restore evidence and reopen-gating artifact for a protected workload.",
            allowed_next_actions=["verify_checkpoint", "reopen_if_ready", "quarantine_or_expire", "bind_restore_drill_to_release"],
            idempotency_or_hash_fields=["restore_verification_hash", "checkpoint_id"],
            recovery_posture="Verified posture requires restore evidence, privacy reconciliation, queue rebuild, and authority revalidation.",
            privacy_reconciliation_required=True,
            authority_safety_posture="Restore of authority-integrated work must rebuild outstanding reconciliation from durable truth.",
            operator_visible_effect="Restore readiness remains blocked by typed missing gates instead of silent reopen optimism.",
            audit_events=["BackupCreated", "RestoreDrillExecuted", "DisasterRecoveryFailedOver", "DisasterRecoveryFailedBack"],
            source_path=RECOVERY_PATH,
            source_heading_or_logical_block="Recovery checkpoint law",
            source_ref=heading_ref(RECOVERY_PATH, "Recovery checkpoint law"),
            notes=["`READY_FOR_REOPEN` is lawful only after privacy, audit, queue, and authority checks all pass."],
            artifact_name="RecoveryCheckpoint",
            schema_path=repo_rel(RECOVERY_CHECKPOINT_SCHEMA_PATH),
        ),
        control_record(
            record_type="control_plane_artifact",
            canonical_id="artifact_restore_privacy_reconciliation_contract",
            trigger_or_entry_condition="A restore or drill may resurrect restricted data and must reconcile privacy before reopen.",
            identity_tuple=["checkpoint_ref", "restore_drill_ref", "privacy_reconciliation_state", "reopen_access_state"],
            frozen_inputs=["resurrected_data_posture", "compensating_re_erasure_state", "legal_hold_ref_or_null", "proof_preservation_basis_ref_or_null", "authority_ambiguity_ref_or_null", "audit_chain_continuity_state"],
            state_or_outcome="RestorePrivacyReconciliationContract is the authoritative restore privacy blocker and compensating re-erasure record.",
            allowed_next_actions=["reconcile_privacy", "complete_compensating_re_erasure", "block_reopen_pending_review"],
            idempotency_or_hash_fields=["reconciliation_contract_hash", "privacy_reconciliation_outcome_ref"],
            recovery_posture="Restore remains blocked until privacy, limitation, and audit continuity become reopen-safe.",
            privacy_reconciliation_required=True,
            authority_safety_posture="Authority ambiguity blocks reopen rather than being erased or hand-waved away.",
            operator_visible_effect="Operators can distinguish ready-for-reopen, limited, legal-hold-blocked, and proof-preservation-blocked restore posture.",
            audit_events=["ErasureRequested", "ErasureCompleted", "LegalHoldApplied", "LegalHoldReleased"],
            source_path=RECOVERY_PATH,
            source_heading_or_logical_block="Restore privacy reconciliation law",
            source_ref=heading_ref(RECOVERY_PATH, "Restore privacy reconciliation law"),
            notes=["Privacy reconciliation is a reopen blocker, not optional cleanup."],
            artifact_name="RestorePrivacyReconciliationContract",
            schema_path=repo_rel(RESTORE_PRIVACY_SCHEMA_PATH),
        ),
        control_record(
            record_type="control_plane_artifact",
            canonical_id="artifact_authority_interaction_record",
            trigger_or_entry_condition="An authority-bound submission or reconciliation exchange exists or is awaiting clarification.",
            identity_tuple=["interaction_id", "request_hash", "idempotency_key", "authority_operation_profile_ref"],
            frozen_inputs=["response_history_ids[]", "reconciliation_budget_state", "next_reconciliation_at", "resend_legality_state", "reconciliation_control_contract"],
            state_or_outcome="AuthorityInteractionRecord is the durable exchange and reconciliation truth for no-blind-resend safety.",
            allowed_next_actions=["follow_up_read_only", "exact_idempotent_recovery", "escalate_reconciliation", "bind_submission_projection"],
            idempotency_or_hash_fields=["request_hash", "duplicate_meaning_key", "idempotency_key", "binding_lineage_ref"],
            recovery_posture="Restore, replay, or reclaim reuses the persisted reconciliation control packet rather than recomputing from retries.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Fresh mutation resend is blocked after budget exhaustion or unresolved ambiguity.",
            operator_visible_effect="Operations can see whether recovery is read-only, idempotent-only, or blocked pending escalation.",
            audit_events=["AuthorityRequestSent", "AuthorityResponseReceived", "AuthorityReconciliationAttempted", "AuthorityReconciliationResolved"],
            source_path=AUTHORITY_PROTOCOL_PATH,
            source_heading_or_logical_block="9.13A Reconciliation budget and escalation rule",
            source_ref=heading_ref(AUTHORITY_PROTOCOL_PATH, "9.13A Reconciliation budget and escalation rule"),
            notes=["The reconciliation control packet is copied onto unresolved SubmissionRecord and ObligationMirror surfaces."],
            artifact_name="AuthorityInteractionRecord",
            schema_path="Algorithm/schemas/authority_interaction_record.schema.json",
        ),
        control_record(
            record_type="control_plane_artifact",
            canonical_id="artifact_release_candidate_identity_contract",
            trigger_or_entry_condition="A promotion candidate or restore drill binds one exact build, schema, config, provider-profile, and client-window tuple.",
            identity_tuple=["candidate_environment_ref", "build_artifact_ref", "artifact_digest", "schema_bundle_hash", "config_bundle_hash", "migration_plan_ref_or_null", "enabled_provider_profile_refs[]", "supported_client_window_ref_or_null"],
            frozen_inputs=["array_canonicalization_policy", "suite_context_policy", "admissibility_binding_policy"],
            state_or_outcome="ReleaseCandidateIdentityContract is the shared candidate tuple for release evidence and deployment records.",
            allowed_next_actions=["bind_verification_suite_results", "bind_release_verification_manifest", "bind_deployment_release"],
            idempotency_or_hash_fields=["candidate_identity_hash", "artifact_digest", "schema_bundle_hash", "config_bundle_hash"],
            recovery_posture="Restore drills and client compatibility evidence must remain bound to the exact candidate tuple they verified.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Authority sandbox evidence may not drift across enabled provider-profile sets.",
            operator_visible_effect="Release reviewers can reject mixed-candidate evidence from one candidate hash.",
            audit_events=["BuildAttested", "ReleaseCanaryStarted", "ReleasePromoted"],
            source_path=RELEASE_PATH,
            source_heading_or_logical_block="1. Governing candidate identity model",
            source_ref=heading_ref(RELEASE_PATH, "1. Governing candidate identity model"),
            notes=["Ordered arrays are canonicalized before hashing so the same candidate cannot drift across workers."],
            artifact_name="ReleaseCandidateIdentityContract",
            schema_path=repo_rel(RELEASE_CANDIDATE_SCHEMA_PATH),
        ),
        control_record(
            record_type="control_plane_artifact",
            canonical_id="artifact_schema_bundle_compatibility_gate_contract",
            trigger_or_entry_condition="Promotion or restore evidence claims schema safety for historical manifests, replay, restore, and native-client compatibility.",
            identity_tuple=["candidate_identity_hash", "compatibility_window_ref", "reader_window_state", "rollback_boundary_state"],
            frozen_inputs=["schema_reader_window_contract", "migration_plan_ref_or_null", "migration_ledger_refs[]", "historical_manifest_guard_state", "replay_restore_guard_state", "native_client_window_state", "destructive_contract_state", "reason_codes[]"],
            state_or_outcome="SchemaBundleCompatibilityGateContract is the mutable schema safety boundary around a fixed release candidate.",
            allowed_next_actions=["admit_release_gate", "block_destructive_contract", "force_fail_forward_after_window_close"],
            idempotency_or_hash_fields=["compatibility_gate_hash", "candidate_identity_hash", "schema_bundle_hash"],
            recovery_posture="Replay and restore require a compatible reader window or an explicitly blocked posture.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Closed reader windows and blocked native windows become explicit fail-forward boundaries.",
            operator_visible_effect="Release tooling can show why rollback remained legal or became fail-forward-only.",
            audit_events=["SchemaMigrationPlanned", "SchemaMigrationApplied", "SchemaMigrationVerified", "ReleaseRolledBack"],
            source_path=RELEASE_PATH,
            source_heading_or_logical_block="2. Contract boundary",
            source_ref=heading_ref(RELEASE_PATH, "2. Contract boundary"),
            notes=["Compatibility gate rows must bind the same candidate hash and compatibility hash across evidence artifacts."],
            artifact_name="SchemaBundleCompatibilityGateContract",
            schema_path=repo_rel(COMPATIBILITY_GATE_SCHEMA_PATH),
        ),
        control_record(
            record_type="control_plane_artifact",
            canonical_id="artifact_release_verification_manifest",
            trigger_or_entry_condition="Promotion assembles blocking evidence, admissibility posture, and companion artifacts into one durable release root.",
            identity_tuple=["release_verification_manifest_id", "candidate_identity_hash", "compatibility_gate_hash", "decision_posture"],
            frozen_inputs=["blocking_gates.*", "manifest_assembly_contract", "restore_drill_ref", "client_compatibility_matrix_ref", "canary_health_summary_ref"],
            state_or_outcome="ReleaseVerificationManifest is the machine-assembled promotion-evidence root for one candidate.",
            allowed_next_actions=["approve_release", "block_release", "supersede_manifest", "bind_deployment_release"],
            idempotency_or_hash_fields=["candidate_identity_hash", "compatibility_gate_hash", "manifest_assembly_contract_hash"],
            recovery_posture="Restore drills used for promotion bind the exact checkpoint and candidate tuple into the promotion record.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Authority sandbox coverage remains part of promotion admissibility when suite_family = AUTHORITY_SANDBOX.",
            operator_visible_effect="Operators can replay the exact gate order, evidence refs, and decision posture from one root object.",
            audit_events=["BuildAttested", "ReleaseCanaryStarted", "ReleasePromoted"],
            source_path=RELEASE_PATH,
            source_heading_or_logical_block="2. Contract boundary",
            source_ref=heading_ref(RELEASE_PATH, "2. Contract boundary"),
            notes=["Promotion evidence is machine-assembled from first-class artifacts instead of reconstructed dashboards."],
            artifact_name="ReleaseVerificationManifest",
            schema_path=repo_rel(RELEASE_VERIFICATION_MANIFEST_SCHEMA_PATH),
        ),
        control_record(
            record_type="control_plane_artifact",
            canonical_id="artifact_deployment_release",
            trigger_or_entry_condition="A candidate is deployed, rolled back, pinned, failed forward, or superseded in one environment.",
            identity_tuple=["release_id", "environment_ref", "candidate_identity_hash", "rollout_strategy", "rollout_state"],
            frozen_inputs=["schema_bundle_compatibility_gate_contract", "recovery_governance_contract", "rollback_boundary_state", "release_verification_manifest_ref", "supported_client_window_ref", "compensating_release_id_or_null", "fail_forward_owner_ref_or_null"],
            state_or_outcome="DeploymentRelease is the authoritative rollout, rollback, and fail-forward governance object.",
            allowed_next_actions=["promote", "abort_canary", "roll_back_if_allowed", "fail_forward_with_compensating_release", "supersede"],
            idempotency_or_hash_fields=["candidate_identity_hash", "schema_bundle_hash", "config_bundle_hash", "rollback_boundary_state"],
            recovery_posture="Closed schema windows force FAIL_FORWARD_ONLY; rollback cannot obscure already-persisted legal evidence.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Release rollback is distinct from legal authority truth; evidence is never deleted to simulate rollback.",
            operator_visible_effect="Release operators can see whether a rollout remained rollback-safe or crossed into fail-forward-only posture.",
            audit_events=["ReleaseCanaryStarted", "ReleasePromoted", "ReleaseRolledBack", "DisasterRecoveryFailedOver", "DisasterRecoveryFailedBack"],
            source_path=DEPLOYMENT_PATH,
            source_heading_or_logical_block="6. Rollout, rollback, and fail-forward posture",
            source_ref=heading_ref(DEPLOYMENT_PATH, "6. Rollout, rollback, and fail-forward posture"),
            notes=["FAILED_FORWARD posture is unlawful without a compensating release and named owner."],
            artifact_name="DeploymentRelease",
            schema_path=repo_rel(DEPLOYMENT_RELEASE_SCHEMA_PATH),
        ),
    ]
    return rows


def replay_class_and_precondition_payload() -> dict[str, Any]:
    replay_class_rows: list[dict[str, Any]] = []
    replay_class_details = {
        "STANDARD_REPLAY": {
            "trigger": "Caller requests an exact historical rerun against a sealed historical manifest.",
            "frozen_inputs": ["replay_of_manifest_id", "continuation_basis", "ConfigFreeze", "InputFreeze", "preseal_gate_evaluation"],
            "state": "Exact compliance-grade replay under historical-read-only posture.",
            "next": ["validate_exact_preconditions", "reuse_existing_replay_child_if_duplicate", "persist_replay_attestation"],
            "notes": ["Must retain compliance posture and may not carry `counterfactual_basis`.", "Non-deterministic allowlist must remain empty."],
            "analysis_only": False,
            "mutation_posture": "HISTORICAL_REPLAY_READ_ONLY",
        },
        "AUDIT_REPLAY": {
            "trigger": "Auditor, regulator, or dispute-resolution flow requests historical replay with evidentiary intent.",
            "frozen_inputs": ["replay_of_manifest_id", "continuation_basis", "ConfigFreeze", "InputFreeze", "preseal_gate_evaluation"],
            "state": "Exact replay semantics identical to STANDARD_REPLAY with audit-facing explanation posture.",
            "next": ["validate_exact_preconditions", "persist_replay_attestation", "serve_auditor_summary"],
            "notes": ["Equivalent to STANDARD_REPLAY in basis law; audit intent may not be smuggled into analysis-only replay."],
            "analysis_only": False,
            "mutation_posture": "REPLAY_COMPLIANCE_AND_EVIDENTIARY_READ_ONLY",
        },
        "COUNTERFACTUAL_ANALYSIS": {
            "trigger": "Analysis-mode replay intentionally changes one or more declared basis dimensions.",
            "frozen_inputs": ["replay_of_manifest_id", "counterfactual_basis", "declared_counterfactual_dimensions[]", "analysis_only=true"],
            "state": "Analysis-only replay that must classify expected equivalence, expected difference, or unexpected mismatch.",
            "next": ["declare_counterfactual_dimensions", "persist_replay_attestation", "prevent_authority_facing_mutation"],
            "notes": ["Counterfactual analysis must never mutate authoritative run history or authority-facing state.", "Declared dimensions are limited to config, input, policy/formula, authority interpretation, or mixed basis."],
            "analysis_only": True,
            "mutation_posture": "ANALYSIS_ONLY_NO_AUTHORITY_MUTATION",
        },
    }
    for replay_class in REPLAY_CLASS_ENUM:
        detail = replay_class_details[replay_class]
        replay_class_rows.append(
            control_record(
                record_type="replay_class",
                canonical_id=f"replay_class_{replay_class.lower()}",
                trigger_or_entry_condition=detail["trigger"],
                identity_tuple=["replay_of_manifest_id", "replay_class", "continuation_basis"],
                frozen_inputs=detail["frozen_inputs"],
                state_or_outcome=detail["state"],
                allowed_next_actions=detail["next"],
                idempotency_or_hash_fields=["replay_of_manifest_id", "execution_basis_hash", "request_identity_hash", "replay_attestation_id"],
                recovery_posture="Replay child reuse is idempotent for identical replay intent.",
                privacy_reconciliation_required=False,
                authority_safety_posture="Replay classes may not silently widen into live mutation semantics.",
                operator_visible_effect="Replay tooling exposes the replay class explicitly before any comparison result is rendered.",
                audit_events=["ManifestContextReused", "ExistingDecisionBundleReturned"],
                source_path=REPLAY_PATH,
                source_heading_or_logical_block=f"Replay classes > {replay_class}",
                source_ref=heading_ref(REPLAY_PATH, f"`{replay_class}`"),
                notes=detail["notes"],
                replay_class=replay_class,
                analysis_only=detail["analysis_only"],
                mutation_posture=detail["mutation_posture"],
            )
        )

    precondition_rows = [
        control_record(
            record_type="replay_precondition",
            canonical_id=f"replay_precondition_{code.lower()}",
            trigger_or_entry_condition="An exact replay or exact recovery is about to begin execution.",
            identity_tuple=["replay_of_manifest_id", "continuation_basis", "replay_class"],
            frozen_inputs=["ConfigFreeze", "InputFreeze", "schema_reader_window_contract", "preseal_gate_evaluation", "authority_basis_refs", "late_data_basis_refs"],
            state_or_outcome=description,
            allowed_next_actions=["proceed_exact_replay", "fail_closed_with_typed_basis_error", "downgrade_to_limited_historical_comparison_if_policy_allows"],
            idempotency_or_hash_fields=["execution_basis_hash", "manifest_hash", "config_freeze_hash", "input_set_hash"],
            recovery_posture="Exact recovery and exact replay share the same fail-closed pre-start basis check.",
            privacy_reconciliation_required=False,
            authority_safety_posture="No live recollection or live mutation token may be smuggled into exact replay.",
            operator_visible_effect="Replay requests surface which exact-basis condition passed or blocked before execution begins.",
            audit_events=["ManifestContextReused", "ReplayBasisCorruptionDetected"],
            source_path=REPLAY_PATH,
            source_heading_or_logical_block="Exact replay preconditions",
            source_ref=heading_ref(REPLAY_PATH, "Exact replay preconditions"),
            notes=["If a precondition fails, the system fails closed or emits a limited comparison posture.", "The engine must not silently recollect inputs or substitute live state."],
            precondition_code=code,
        )
        for code, description in REPLAY_PRECONDITION_SPECS
    ]

    recovery_rows = [
        control_record(
            record_type="replay_recovery_rule",
            canonical_id="recovery_rule_transport_reconnect_is_read_side_only",
            trigger_or_entry_condition="Transport, shell, or stream resume metadata is available during replay or recovery.",
            identity_tuple=["manifest_id", "resume_token_or_null", "frame_epoch_or_null"],
            frozen_inputs=["resume_token", "frame_epoch", "shell_stability_token", "workspace_version", "view_guard_ref"],
            state_or_outcome="Transport and UX resume metadata remains read-side recovery context, never replay lineage truth.",
            allowed_next_actions=["resume_view_state", "reload_projection", "ignore_as_branch_proof"],
            idempotency_or_hash_fields=["trace_id", "manifest_id"],
            recovery_posture="Read-side continuity can resume while control-plane lineage remains anchored in manifest artifacts.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Transport resume metadata cannot authorize replay legality or workflow mutation.",
            operator_visible_effect="UX continuity is available without confusing it for execution or authority truth.",
            audit_events=["ConfigInheritanceResolved"],
            source_path=REPLAY_PATH,
            source_heading_or_logical_block="Recovery and continuation semantics",
            source_ref=heading_ref(REPLAY_PATH, "Recovery and continuation semantics"),
            notes=["The same rule applies to calm-shell, portal, workspace, and projection artifacts."],
            rule_code="TRANSPORT_METADATA_READ_SIDE_ONLY",
        ),
        control_record(
            record_type="replay_recovery_rule",
            canonical_id="recovery_rule_same_attempt_recovery_child",
            trigger_or_entry_condition="A started attempt is being recovered under the same attempt lineage.",
            identity_tuple=["manifest_id", "attempt_lineage_ref", "branch_action=RECOVERY_CHILD"],
            frozen_inputs=["ConfigFreeze", "InputFreeze", "execution_basis_hash", "attempt_lineage_ref"],
            state_or_outcome="RECOVERY_CHILD reuses the exact frozen config and input basis and preserves `execution_basis_hash`.",
            allowed_next_actions=["resume_durable_stage", "preserve_same_attempt_lineage", "reject_fresh_child_recast"],
            idempotency_or_hash_fields=["execution_basis_hash", "attempt_lineage_ref"],
            recovery_posture="Same-attempt recovery is exact and not a fresh-child continuation.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Recovery must continue from durable receipts and claims, not broker silence or worker memory.",
            operator_visible_effect="Operators can distinguish exact same-attempt recovery from historically explicit continuation.",
            audit_events=["ContinuationChildAllocated", "RunStartClaimRejected"],
            source_path=REPLAY_PATH,
            source_heading_or_logical_block="Same-attempt recovery",
            source_ref=heading_ref(REPLAY_PATH, "Same-attempt recovery"),
            notes=["Same-attempt recovery children reuse the original `attempt_lineage_ref`."],
            rule_code="SAME_ATTEMPT_RECOVERY_CHILD",
        ),
        control_record(
            record_type="replay_recovery_rule",
            canonical_id="recovery_rule_historical_explicit_continuation",
            trigger_or_entry_condition="A non-replay child reuses historical config or input outside same-attempt recovery.",
            identity_tuple=["manifest_id", "selected_manifest_continuation_basis", "config_inheritance_mode_or_null", "input_inheritance_mode_or_null"],
            frozen_inputs=["HISTORICAL_EXPLICIT", "limitation_metadata", "parent_manifest_hash"],
            state_or_outcome="Historically explicit continuation is legal only when the child declares `HISTORICAL_EXPLICIT` and carries limitation metadata.",
            allowed_next_actions=["allocate_continuation_child", "emit_limitation_metadata", "block_present_tense_freshness_claims"],
            idempotency_or_hash_fields=["request_identity_hash", "prior_manifest_hash_at_decision_or_null"],
            recovery_posture="Historically explicit continuation is distinct from recovery and from exact replay.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Historical explicit reuse may not pretend to be current freshness or same-attempt recovery.",
            operator_visible_effect="Explainers can show why a child reused history without implying exact historical equivalence.",
            audit_events=["ContinuationChildAllocated", "ConfigInheritanceResolved"],
            source_path=REPLAY_PATH,
            source_heading_or_logical_block="Historically explicit continuation",
            source_ref=heading_ref(REPLAY_PATH, "Historically explicit continuation"),
            notes=["Non-replay children may reuse config or input only when they declare historical explicit inheritance."],
            rule_code="HISTORICAL_EXPLICIT_CONTINUATION",
        ),
        control_record(
            record_type="replay_recovery_rule",
            canonical_id="recovery_rule_counterfactual_dimension_declaration",
            trigger_or_entry_condition="Counterfactual analysis changes one or more basis dimensions.",
            identity_tuple=["replay_of_manifest_id", "replay_class=COUNTERFACTUAL_ANALYSIS", "declared_counterfactual_dimensions[]"],
            frozen_inputs=["counterfactual_basis", "declared_counterfactual_dimensions[]"],
            state_or_outcome="Counterfactual replay must declare which basis dimensions changed and classify difference as expected or limited.",
            allowed_next_actions=["persist_replay_attestation", "classify_expected_difference_or_equivalence", "flag_unexpected_mismatch_if_undeclared_variance_exists"],
            idempotency_or_hash_fields=["replay_attestation_id", "expected_execution_basis_hash", "actual_execution_basis_hash"],
            recovery_posture="Analysis-only counterfactual replay never publishes exact-match semantics when basis changed.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Counterfactual replay remains non-mutating even when it models authority interpretation changes.",
            operator_visible_effect="Analysts can see the declared basis dimensions instead of reverse-engineering them from mismatches.",
            audit_events=["ManifestContextReused"],
            source_path=REPLAY_PATH,
            source_heading_or_logical_block="Counterfactual replay",
            source_ref=heading_ref(REPLAY_PATH, "Counterfactual replay"),
            notes=[f"Declared dimensions: {', '.join(COUNTERFACTUAL_DIMENSIONS)}."],
            rule_code="COUNTERFACTUAL_DIMENSION_DECLARATION",
            declared_dimensions=COUNTERFACTUAL_DIMENSIONS,
        ),
    ]

    guarantee_rows = [
        control_record(
            record_type="idempotent_rerun_guarantee",
            canonical_id="rerun_guarantee_return_existing_decision_bundle",
            trigger_or_entry_condition="An exact same-request terminal rerun arrives against a completed manifest.",
            identity_tuple=["manifest_id", "request_identity_hash", "terminal_manifest"],
            frozen_inputs=["persisted DecisionBundle", "idempotency_key", "request_identity_hash"],
            state_or_outcome="The existing persisted DecisionBundle is returned; no continuation child is allocated.",
            allowed_next_actions=["return_existing_decision_bundle"],
            idempotency_or_hash_fields=["idempotency_key", "decision_bundle_hash", "request_identity_hash"],
            recovery_posture="Terminal same-manifest retry reuses the prior terminal result instead of creating new lineage.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Terminal idempotent retry must not create a continuation child merely because continuation could be legal.",
            operator_visible_effect="Operators see a terminal idempotent reuse outcome rather than fresh execution.",
            audit_events=["ExistingDecisionBundleReturned"],
            source_path=REPLAY_PATH,
            source_heading_or_logical_block="Idempotent rerun guarantees",
            source_ref=heading_ref(REPLAY_PATH, "Idempotent rerun guarantees"),
            notes=[],
            guarantee_code="RETURN_EXISTING_DECISION_BUNDLE",
        ),
        control_record(
            record_type="idempotent_rerun_guarantee",
            canonical_id="rerun_guarantee_return_existing_replay_child",
            trigger_or_entry_condition="An exact same-request replay rerun arrives for the same replay target and class.",
            identity_tuple=["replay_of_manifest_id", "replay_class", "request_identity_hash"],
            frozen_inputs=["persisted replay child", "ReplayAttestation"],
            state_or_outcome="The existing replay child and ReplayAttestation are returned instead of allocating a duplicate child.",
            allowed_next_actions=["return_existing_replay_child"],
            idempotency_or_hash_fields=["request_identity_hash", "replay_attestation_id"],
            recovery_posture="Replay child allocation is idempotent across identical replay intent.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Duplicate replay execution may not silently fork parallel replay children.",
            operator_visible_effect="Replay history shows one canonical replay child per identical replay request.",
            audit_events=["ManifestContextReused"],
            source_path=REPLAY_PATH,
            source_heading_or_logical_block="Idempotent rerun guarantees",
            source_ref=heading_ref(REPLAY_PATH, "Idempotent rerun guarantees"),
            notes=[],
            guarantee_code="RETURN_EXISTING_REPLAY_CHILD",
        ),
        control_record(
            record_type="idempotent_rerun_guarantee",
            canonical_id="rerun_guarantee_reuse_same_sealed_context",
            trigger_or_entry_condition="An exact same-request retry arrives against a still-pre-start sealed manifest.",
            identity_tuple=["manifest_id", "request_identity_hash", "sealed_prestart_manifest"],
            frozen_inputs=["preseal_gate_evaluation", "sealed manifest context", "manifest_start_claim.claim_state=UNCLAIMED_SEALED"],
            state_or_outcome="The already sealed context is reused instead of recollecting inputs or re-evaluating the pre-seal chain.",
            allowed_next_actions=["reuse_sealed_manifest", "claim_or_return_prestart_context"],
            idempotency_or_hash_fields=["idempotency_key", "manifest_hash", "execution_basis_hash"],
            recovery_posture="Same-manifest pre-start retries reuse persisted pre-seal tape.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Ambient state may not change the reused sealed context.",
            operator_visible_effect="Schedulers can prove pre-start context reuse without recomputing pre-seal state.",
            audit_events=["ManifestContextReused"],
            source_path=REPLAY_PATH,
            source_heading_or_logical_block="Idempotent rerun guarantees",
            source_ref=heading_ref(REPLAY_PATH, "Idempotent rerun guarantees"),
            notes=[],
            guarantee_code="REUSE_SAME_SEALED_CONTEXT",
        ),
        control_record(
            record_type="idempotent_rerun_guarantee",
            canonical_id="rerun_guarantee_preserve_same_attempt_recovery_identity",
            trigger_or_entry_condition="A same-attempt recovery resumes an interrupted execution.",
            identity_tuple=["attempt_lineage_ref", "execution_basis_hash", "branch_action=RECOVERY_CHILD"],
            frozen_inputs=["attempt_lineage_ref", "execution_basis_hash", "manifest_start_claim"],
            state_or_outcome="Same-attempt recovery preserves lineage and basis identity across retries and reclaims.",
            allowed_next_actions=["reclaim_or_resume", "continue_from_durable_stage"],
            idempotency_or_hash_fields=["attempt_lineage_ref", "execution_basis_hash", "claim_epoch"],
            recovery_posture="Recovery preserves lineage-safe identity instead of starting a fresh child.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Authority or workflow side effects resume from durable lineage rather than duplicate sends.",
            operator_visible_effect="Operators can reason about one interrupted attempt that resumed rather than multiple independent attempts.",
            audit_events=["RunStartClaimRejected", "NightlyBatchShardReclaimed"],
            source_path=REPLAY_PATH,
            source_heading_or_logical_block="Idempotent rerun guarantees",
            source_ref=heading_ref(REPLAY_PATH, "Idempotent rerun guarantees"),
            notes=[],
            guarantee_code="PRESERVE_SAME_ATTEMPT_RECOVERY_IDENTITY",
        ),
    ]

    retention_rows = [
        control_record(
            record_type="replay_retention_posture",
            canonical_id="replay_retention_posture_basis_preserving_retention",
            trigger_or_entry_condition="A material run enters the lawful review window for replay and audit.",
            identity_tuple=["manifest_id", "retention_class", "lawful_review_window"],
            frozen_inputs=["RunManifest", "ConfigFreeze", "InputFreeze", "authoritative intake set hashes", "execution_basis_hash", "decision_bundle_hash", "deterministic_outcome_hash", "GateDecisionRecord lineage", "historical authority basis refs", "ReplayAttestation"],
            state_or_outcome="Retention must preserve or explicitly placeholder the minimum replay basis for the full lawful review window.",
            allowed_next_actions=["retain_basis", "emit_limitation_placeholders", "answer_audit_queries"],
            idempotency_or_hash_fields=["execution_basis_hash", "decision_bundle_hash", "deterministic_outcome_hash"],
            recovery_posture="Replay and audit remain possible even when payloads were minimized, provided limitation posture is explicit.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Retention must not rewrite basis hashes or swap in newer content.",
            operator_visible_effect="Operators can distinguish lawful minimization from corruption or silent data loss.",
            audit_events=["RetentionApplied", "RetentionLimited"],
            source_path=RETENTION_PRIVACY_PATH,
            source_heading_or_logical_block="Basis-preserving retention for replay",
            source_ref=heading_ref(RETENTION_PRIVACY_PATH, "Basis-preserving retention for replay"),
            notes=[],
            retention_posture="BASIS_PRESERVING_OR_LIMITATION_EXPLICIT",
        ),
        control_record(
            record_type="replay_retention_posture",
            canonical_id="replay_retention_posture_limitation_must_be_explicit",
            trigger_or_entry_condition="Payload minimization or erasure removed underlying content while preserving replay placeholders or hashes.",
            identity_tuple=["manifest_id", "retention_class", "limitation_code"],
            frozen_inputs=["retained_hashes", "placeholder_refs", "ReplayAttestation limitation codes"],
            state_or_outcome="Replay must surface RETENTION_LIMITED or equivalent instead of silently treating minimized basis as unavailable or not applicable.",
            allowed_next_actions=["emit_limited_historical_comparison", "block_exact_replay_claim", "preserve_audit_proof_of_absence"],
            idempotency_or_hash_fields=["execution_basis_hash", "deterministic_outcome_hash"],
            recovery_posture="Limited historical comparison remains explicit rather than mutating exact replay semantics.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Erasure cannot resolve authority-facing ambiguity by deleting evidence.",
            operator_visible_effect="Investigators see why comparison became limited and what supporting history was lawfully hidden or erased.",
            audit_events=["RetentionLimited", "ErasureRequested", "ErasureCompleted"],
            source_path=RETENTION_PRIVACY_PATH,
            source_heading_or_logical_block="Basis-preserving retention for replay",
            source_ref=heading_ref(RETENTION_PRIVACY_PATH, "Basis-preserving retention for replay"),
            notes=["Surviving derived artifacts must point to explicit expired/erased placeholders or limitation notes."],
            retention_posture="LIMITATION_EXPLICIT_NOT_SILENT",
        ),
    ]

    rows = flatten(replay_class_rows, precondition_rows, recovery_rows, guarantee_rows, retention_rows)
    assert_required_record_fields(rows)
    return {
        "summary": make_summary(
            rows,
            extra={
                "replay_class_count": len(replay_class_rows),
                "precondition_count": len(precondition_rows),
                "recovery_rule_count": len(recovery_rows),
                "idempotent_guarantee_count": len(guarantee_rows),
                "retention_posture_count": len(retention_rows),
            },
        ),
        "replay_classes": replay_class_rows,
        "exact_replay_preconditions": precondition_rows,
        "recovery_and_continuation_rules": recovery_rows,
        "idempotent_rerun_guarantees": guarantee_rows,
        "retention_limit_postures": retention_rows,
        "rows": rows,
    }


def replay_comparison_and_attestation_payload() -> dict[str, Any]:
    comparison_mode_details = {
        "EXACT_HASH_MATCH": "Basis and deterministic outcome hashes match under exact replay claimable posture.",
        "COUNTERFACTUAL_DECLARED": "Declared counterfactual variance is present and comparison remains explained by the declared basis.",
        "LIMITED_HISTORICAL_COMPARISON": "Some basis or material outcome components are observable, but coverage is incomplete.",
        "BASIS_INCOMPLETE": "Retained basis is too incomplete to support even limited material comparison.",
        "BASIS_CORRUPT": "Integrity validation failed or verdicts are corrupt.",
    }
    basis_validation_details = {
        "VALID": "Full basis is available and reader-compatible.",
        "RETENTION_LIMITED": "Basis exists only in minimized or limitation-preserving form.",
        "MISSING_DEPENDENCY": "A required retained basis component cannot be found.",
        "CORRUPT": "A retained artifact or hash failed integrity validation.",
        "SCHEMA_INCOMPATIBLE": "Recorded schema bundle cannot be deserialized by the available runtime.",
        "BUILD_UNAVAILABLE": "Historical build or reader bundle is unavailable for exact comparison.",
    }
    verdict_details = {
        "IDENTICAL": "Observed dimensions/components match exactly under the declared comparison basis.",
        "DIFFERENT": "Observed dimensions/components differ without corruption.",
        "UNDECIDABLE": "Coverage is insufficient to resolve an exact verdict.",
        "CORRUPT": "At least one observed dimension/component failed integrity checks.",
    }
    outcome_details = {
        "EXACT_MATCH": "Exact replay claim is fully supportable.",
        "EXPECTED_EQUIVALENCE": "Declared counterfactual basis changed, but material outcome remained equivalent.",
        "EXPECTED_DIFFERENCE": "Declared counterfactual basis changed and the material difference was expected.",
        "LIMITED_COMPARABLE": "Material comparison is partially observable but limited.",
        "BASIS_INCOMPLETE": "Basis is too incomplete to support even limited material comparison.",
        "BASIS_CORRUPT": "Comparison basis is corrupt and not fit for replay claims.",
        "UNEXPECTED_MISMATCH": "Observed variance exceeds what the declared basis permits.",
    }
    confidence_band_details = {
        "VERY_HIGH": "Attestation confidence score is at least 95.",
        "HIGH": "Attestation confidence score is in [80, 94].",
        "MODERATE": "Attestation confidence score is in [60, 79].",
        "LOW": "Attestation confidence score is in [30, 59].",
        "INSUFFICIENT": "Attestation confidence score is below 30 or basis is corrupt.",
    }

    comparison_mode_rows = [
        control_record(
            record_type="replay_comparison_mode",
            canonical_id=f"replay_comparison_mode_{mode.lower()}",
            trigger_or_entry_condition="Replay comparison classifies one persisted replay child.",
            identity_tuple=["replay_attestation_id", "replay_class", "comparison_mode"],
            frozen_inputs=["basis_dimension_results[]", "outcome_component_results[]", "expected_execution_basis_hash", "actual_execution_basis_hash"],
            state_or_outcome=comparison_mode_details[mode],
            allowed_next_actions=["render_operator_summary", "render_auditor_summary", "answer_get_replay_attestation"],
            idempotency_or_hash_fields=["replay_attestation_id", "expected_execution_basis_hash", "actual_execution_basis_hash", "expected_deterministic_outcome_hash", "actual_deterministic_outcome_hash"],
            recovery_posture="Comparison mode remains immutable once the attestation is persisted.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Comparison mode cannot be upgraded later by re-reading live state.",
            operator_visible_effect="Replay dashboards expose the comparison mode directly instead of collapsing it into one pass/fail badge.",
            audit_events=["ExistingDecisionBundleReturned"],
            source_path=REPLAY_PATH,
            source_heading_or_logical_block="Comparison modes",
            source_ref=heading_ref(REPLAY_PATH, "Comparison modes"),
            notes=[],
            comparison_mode=mode,
        )
        for mode in COMPARISON_MODE_ENUM
    ]
    basis_validation_rows = [
        control_record(
            record_type="replay_basis_validation_state",
            canonical_id=f"replay_basis_validation_state_{state.lower()}",
            trigger_or_entry_condition="Replay comparison checks whether retained basis is usable and defensible.",
            identity_tuple=["replay_attestation_id", "basis_validation_state"],
            frozen_inputs=["ConfigFreeze", "InputFreeze", "preseal_gate_evaluation", "schema_reader_window_contract", "historical authority basis refs"],
            state_or_outcome=basis_validation_details[state],
            allowed_next_actions=["classify_comparison_mode", "persist_limitation_codes", "fail_closed_if_required"],
            idempotency_or_hash_fields=["execution_basis_hash", "schema_bundle_hash"],
            recovery_posture="Basis validation state defines whether replay may proceed, downgrade, or fail closed.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Missing, corrupt, or schema-incompatible basis may not be replaced from live truth.",
            operator_visible_effect="Investigators can see whether a replay was valid, limited, missing, corrupt, or blocked by build availability.",
            audit_events=["ReplayBasisCorruptionDetected", "RetentionLimited"],
            source_path=REPLAY_PATH,
            source_heading_or_logical_block="Basis validation states",
            source_ref=heading_ref(REPLAY_PATH, "Basis validation states"),
            notes=[],
            basis_validation_state=state,
        )
        for state in BASIS_VALIDATION_ENUM
    ]
    basis_identity_rows = [
        control_record(
            record_type="replay_basis_identity_verdict",
            canonical_id=f"replay_basis_identity_verdict_{verdict.lower()}",
            trigger_or_entry_condition="Observed basis-dimension results are classified after weighting and coverage computation.",
            identity_tuple=["replay_attestation_id", "basis_identity_verdict"],
            frozen_inputs=["basis_dimension_results[]", "basis_coverage", "basis_match_ratio"],
            state_or_outcome=verdict_details[verdict],
            allowed_next_actions=["classify_outcome", "compute_attestation_confidence"],
            idempotency_or_hash_fields=["expected_execution_basis_hash", "actual_execution_basis_hash"],
            recovery_posture="Basis verdict remains linked to persisted dimension results and cannot be recomputed from dashboards.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Undeclared basis variance remains explicit even when outcome differences are non-material.",
            operator_visible_effect="Replay inspectors can separate identical basis from limited or corrupt basis posture.",
            audit_events=["ExistingDecisionBundleReturned"],
            source_path=REPLAY_PATH,
            source_heading_or_logical_block="Basis-identity verdicts",
            source_ref=heading_ref(REPLAY_PATH, "Basis-identity verdicts"),
            notes=[],
            basis_identity_verdict=verdict,
        )
        for verdict in BASIS_IDENTITY_ENUM
    ]
    equivalence_rows = [
        control_record(
            record_type="replay_deterministic_equivalence_verdict",
            canonical_id=f"replay_deterministic_equivalence_verdict_{verdict.lower()}",
            trigger_or_entry_condition="Observed outcome-component results are classified after material coverage and match calculations.",
            identity_tuple=["replay_attestation_id", "deterministic_equivalence_verdict"],
            frozen_inputs=["outcome_component_results[]", "material_outcome_coverage", "material_outcome_match_ratio"],
            state_or_outcome=verdict_details[verdict],
            allowed_next_actions=["classify_outcome", "compute_attestation_confidence"],
            idempotency_or_hash_fields=["expected_deterministic_outcome_hash", "actual_deterministic_outcome_hash"],
            recovery_posture="Outcome verdict remains durable and replayable from persisted component results.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Material outcome equivalence cannot be inferred from a root hash alone without component evidence.",
            operator_visible_effect="Operators can see whether outcomes were identical, different, undecidable, or corrupt.",
            audit_events=["ComputeCompleted", "ParityEvaluated"],
            source_path=REPLAY_PATH,
            source_heading_or_logical_block="Deterministic-equivalence verdicts",
            source_ref=heading_ref(REPLAY_PATH, "Deterministic-equivalence verdicts"),
            notes=[],
            deterministic_equivalence_verdict=verdict,
        )
        for verdict in EQUIVALENCE_ENUM
    ]
    outcome_rows = [
        control_record(
            record_type="replay_outcome_class",
            canonical_id=f"replay_outcome_class_{outcome.lower()}",
            trigger_or_entry_condition="Classification rules finish evaluating basis state, verdicts, coverage, and declared variance.",
            identity_tuple=["replay_attestation_id", "comparison_mode", "outcome_class"],
            frozen_inputs=["basis_validation_state", "basis_identity_verdict", "deterministic_equivalence_verdict", "basis_coverage", "material_outcome_coverage"],
            state_or_outcome=outcome_details[outcome],
            allowed_next_actions=["publish_operator_summary", "publish_auditor_summary", "bind_manifest_replay_attestation_ref"],
            idempotency_or_hash_fields=["replay_attestation_id", "expected_execution_basis_hash", "expected_deterministic_outcome_hash"],
            recovery_posture="Outcome class remains coupled to the immutable attestation artifact.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Expected outcomes require declared basis variance; undeclared variance becomes UNEXPECTED_MISMATCH.",
            operator_visible_effect="Replay result consumers can tell exact match from limited, corrupt, or unexpected mismatch states.",
            audit_events=["ExistingDecisionBundleReturned"],
            source_path=REPLAY_PATH,
            source_heading_or_logical_block="Outcome classes",
            source_ref=heading_ref(REPLAY_PATH, "Outcome classes"),
            notes=[],
            outcome_class=outcome,
        )
        for outcome in OUTCOME_CLASS_ENUM
    ]
    variance_rows = [
        control_record(
            record_type="replay_variance_taxonomy",
            canonical_id=f"replay_variance_taxonomy_{variance.lower()}",
            trigger_or_entry_condition="A basis-dimension result or outcome-component result records comparison variance.",
            identity_tuple=["replay_attestation_id", "variance_class"],
            frozen_inputs=["basis_dimension_results[]", "outcome_component_results[]"],
            state_or_outcome=f"Variance classified as `{variance}`.",
            allowed_next_actions=["aggregate_declared_or_undeclared_variance", "drive_outcome_classification"],
            idempotency_or_hash_fields=["replay_attestation_id"],
            recovery_posture="Variance remains explicit at the per-dimension and per-component level.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Declared counterfactual variance differs from undeclared basis drift or integrity failure.",
            operator_visible_effect="Difference explainers can name whether divergence was declared, material, blocking, limited, or corrupt.",
            audit_events=["ExistingDecisionBundleReturned"],
            source_path=REPLAY_PATH,
            source_heading_or_logical_block="Variance taxonomy",
            source_ref=heading_ref(REPLAY_PATH, "Variance taxonomy"),
            notes=[],
            variance_class=variance,
        )
        for variance in REPLAY_VARIANCE_TAXONOMY
    ]
    confidence_rows = [
        control_record(
            record_type="replay_attestation_confidence_band",
            canonical_id=f"replay_attestation_confidence_band_{band.lower()}",
            trigger_or_entry_condition="Attestation confidence score is computed from signature status, coverage, and undeclared variance mass.",
            identity_tuple=["replay_attestation_id", "attestation_confidence_score", "attestation_confidence_band"],
            frozen_inputs=["signature_verification_state", "basis_coverage", "material_outcome_coverage", "basis_undeclared_variance_mass", "undeclared_material_variance_mass"],
            state_or_outcome=confidence_band_details[band],
            allowed_next_actions=["publish_defensibility_band", "gate_auditor_grade_evidence_use"],
            idempotency_or_hash_fields=["replay_attestation_id", "control_contract_hash"],
            recovery_posture="Confidence band is immutable once the attestation is sealed.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Unsigned or unverifiable evidence cannot be upgraded to auditor-grade confidence later.",
            operator_visible_effect="Replay reviewers can judge attestation defensibility separately from business correctness.",
            audit_events=["ExistingDecisionBundleReturned"],
            source_path=REPLAY_PATH,
            source_heading_or_logical_block="Attestation confidence and verifier binding",
            source_ref=heading_ref(REPLAY_PATH, "Attestation confidence and verifier binding"),
            notes=[],
            attestation_confidence_band=band,
        )
        for band in ATTESTATION_CONFIDENCE_BANDS
    ]
    corruption_rows = [
        control_record(
            record_type="replay_corruption_or_limitation_rule",
            canonical_id="replay_corruption_rule_missing_basis_component",
            trigger_or_entry_condition="A required frozen artifact cannot be found during replay.",
            identity_tuple=["replay_of_manifest_id", "basis_validation_state"],
            frozen_inputs=["required_frozen_artifact_refs[]"],
            state_or_outcome="Emit a typed missing-basis error or persist a limited replay attestation according to policy.",
            allowed_next_actions=["fail_closed", "persist_limited_attestation_if_policy_allows"],
            idempotency_or_hash_fields=["manifest_hash", "execution_basis_hash"],
            recovery_posture="Fresh replacement sourcing is forbidden.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Live state may not be used to fill missing historical basis.",
            operator_visible_effect="Investigators see missing dependency rather than synthetic substitute history.",
            audit_events=["RetentionLimited"],
            source_path=REPLAY_PATH,
            source_heading_or_logical_block="Missing basis component",
            source_ref=heading_ref(REPLAY_PATH, "Missing basis component"),
            notes=[],
            rule_code="MISSING_BASIS_COMPONENT",
        ),
        control_record(
            record_type="replay_corruption_or_limitation_rule",
            canonical_id="replay_corruption_rule_hash_mismatch",
            trigger_or_entry_condition="A retained artifact fails integrity validation or hash comparison.",
            identity_tuple=["replay_of_manifest_id", "basis_validation_state=CORRUPT"],
            frozen_inputs=["retained_artifact", "content_hash", "frozen_manifest_reference"],
            state_or_outcome="Replay enters BASIS_CORRUPT posture.",
            allowed_next_actions=["persist_corrupt_attestation", "block_exact_or_limited_match_claims"],
            idempotency_or_hash_fields=["expected_execution_basis_hash", "actual_execution_basis_hash"],
            recovery_posture="Corrupt basis remains explicit rather than silently repaired.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Integrity failure blocks reuse or resend decisions that depend on historical truth.",
            operator_visible_effect="Operators see corrupt basis as a first-class replay posture.",
            audit_events=["ReplayBasisCorruptionDetected"],
            source_path=REPLAY_PATH,
            source_heading_or_logical_block="Corrupt artifact or hash mismatch",
            source_ref=heading_ref(REPLAY_PATH, "Corrupt artifact or hash mismatch"),
            notes=[],
            rule_code="CORRUPT_ARTIFACT_OR_HASH_MISMATCH",
        ),
        control_record(
            record_type="replay_corruption_or_limitation_rule",
            canonical_id="replay_corruption_rule_schema_reader_incompatibility",
            trigger_or_entry_condition="The runtime cannot deserialize a historical artifact under the recorded schema bundle.",
            identity_tuple=["replay_of_manifest_id", "schema_bundle_hash", "basis_validation_state=SCHEMA_INCOMPATIBLE"],
            frozen_inputs=["schema_reader_window_contract", "schema_bundle_hash", "historical_artifact_refs[]"],
            state_or_outcome="Replay remains in SCHEMA_INCOMPATIBLE posture until a compatible reader is supplied.",
            allowed_next_actions=["fail_closed", "supply_compatible_reader"],
            idempotency_or_hash_fields=["schema_bundle_hash"],
            recovery_posture="Reader compatibility is taken from the persisted historical bundle boundary, not the currently live deploy.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Historical truth may not be silently deserialized through a newer shape with changed semantics.",
            operator_visible_effect="Release and replay teams can see when a reader window blocked historical access.",
            audit_events=["SchemaMigrationVerified"],
            source_path=REPLAY_PATH,
            source_heading_or_logical_block="Schema-reader incompatibility",
            source_ref=heading_ref(REPLAY_PATH, "Schema-reader incompatibility"),
            notes=[],
            rule_code="SCHEMA_READER_INCOMPATIBILITY",
        ),
        control_record(
            record_type="replay_corruption_or_limitation_rule",
            canonical_id="replay_corruption_rule_retention_limited_comparison",
            trigger_or_entry_condition="Privacy minimization preserved hashes or placeholders but not full payload content.",
            identity_tuple=["replay_of_manifest_id", "basis_validation_state=RETENTION_LIMITED"],
            frozen_inputs=["retained_hashes", "retention_placeholders", "limitation_codes[]"],
            state_or_outcome="Replay may proceed only as LIMITED_HISTORICAL_COMPARISON and must state the limitation.",
            allowed_next_actions=["persist_limited_attestation", "block_exact_replay_claim"],
            idempotency_or_hash_fields=["execution_basis_hash", "deterministic_outcome_hash"],
            recovery_posture="Limited historical comparison remains explicit rather than silently downgraded in UI copy alone.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Retention cannot erase the fact that historical basis was minimized.",
            operator_visible_effect="Auditors can tell that exact basis was not preserved even though hashes survived.",
            audit_events=["RetentionLimited"],
            source_path=REPLAY_PATH,
            source_heading_or_logical_block="Retention-limited comparison",
            source_ref=heading_ref(REPLAY_PATH, "Retention-limited comparison"),
            notes=[],
            rule_code="RETENTION_LIMITED_COMPARISON",
        ),
    ]
    artifact_requirement_rows = [
        control_record(
            record_type="replay_attestation_requirement",
            canonical_id="replay_attestation_requirement_core_fields",
            trigger_or_entry_condition="A replay child reaches a persisted decision outcome.",
            identity_tuple=["replay_attestation_id", "manifest_id", "replay_of_manifest_id", "replay_class"],
            frozen_inputs=["comparison_mode", "basis_validation_state", "basis_identity_verdict", "deterministic_equivalence_verdict", "outcome_class", "basis_integrity_contract", "difference_reason_codes[]", "limitation_codes[]"],
            state_or_outcome="ReplayAttestation must capture the full comparison envelope and explanation basis.",
            allowed_next_actions=["bind_manifest_replay_attestation_ref", "serve_operator_and_auditor_summaries"],
            idempotency_or_hash_fields=["expected_execution_basis_hash", "actual_execution_basis_hash", "expected_deterministic_outcome_hash", "actual_deterministic_outcome_hash"],
            recovery_posture="Attestation is immutable after persistence; corrections require new lineage or superseding artifacts.",
            privacy_reconciliation_required=False,
            authority_safety_posture="No replay-visible truth may publish before the attestation is durable and linked.",
            operator_visible_effect="Operators and auditors can consume the same durable comparison record at different explanation depths.",
            audit_events=["ExistingDecisionBundleReturned"],
            source_path=REPLAY_PATH,
            source_heading_or_logical_block="Replay attestation artifact",
            source_ref=heading_ref(REPLAY_PATH, "Replay attestation artifact"),
            notes=[],
            requirement_code="ATTESTATION_CORE_FIELDS",
        ),
        control_record(
            record_type="replay_attestation_requirement",
            canonical_id="replay_attestation_requirement_common_execution_context",
            trigger_or_entry_condition="ReplayAttestation is serialized for STANDARD_REPLAY, AUDIT_REPLAY, or COUNTERFACTUAL_ANALYSIS.",
            identity_tuple=["replay_attestation_id", "replay_class", "execution_mode"],
            frozen_inputs=["analysis_only", "counterfactual_basis", "difference_reason_codes[]", "limitation_codes[]"],
            state_or_outcome="Execution context fields must align coherently with the replay class and outcome class.",
            allowed_next_actions=["reject_incoherent_attestation", "publish_coherent_operator_summary"],
            idempotency_or_hash_fields=["replay_attestation_id"],
            recovery_posture="Replay class coherence remains part of the durable artifact contract, not just runtime validation.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Counterfactual analysis must stay analysis-only and exact/audit replay must stay compliance grade.",
            operator_visible_effect="Incoherent replay context becomes a validator failure rather than user-visible ambiguity.",
            audit_events=["ExistingDecisionBundleReturned"],
            source_path=REPLAY_PATH,
            source_heading_or_logical_block="Replay attestation artifact",
            source_ref=heading_ref(REPLAY_PATH, "Replay attestation artifact"),
            notes=["EXPECTED_EQUIVALENCE and EXPECTED_DIFFERENCE require non-empty difference reason codes.", "LIMITED_COMPARABLE and BASIS_INCOMPLETE require non-empty limitation codes."],
            requirement_code="ATTESTATION_COMMON_EXECUTION_CONTEXT",
        ),
    ]
    rows = flatten(
        comparison_mode_rows,
        basis_validation_rows,
        basis_identity_rows,
        equivalence_rows,
        outcome_rows,
        variance_rows,
        confidence_rows,
        corruption_rows,
        artifact_requirement_rows,
    )
    assert_required_record_fields(rows)
    return {
        "summary": make_summary(
            rows,
            extra={
                "comparison_mode_count": len(comparison_mode_rows),
                "basis_validation_state_count": len(basis_validation_rows),
                "basis_identity_verdict_count": len(basis_identity_rows),
                "deterministic_equivalence_verdict_count": len(equivalence_rows),
                "outcome_class_count": len(outcome_rows),
                "variance_taxonomy_count": len(variance_rows),
                "confidence_band_count": len(confidence_rows),
                "corruption_rule_count": len(corruption_rows),
            },
        ),
        "comparison_modes": comparison_mode_rows,
        "basis_validation_states": basis_validation_rows,
        "basis_identity_verdicts": basis_identity_rows,
        "deterministic_equivalence_verdicts": equivalence_rows,
        "outcome_classes": outcome_rows,
        "variance_taxonomy": variance_rows,
        "attestation_confidence_bands": confidence_rows,
        "corruption_and_limitation_rules": corruption_rows,
        "attestation_requirements": artifact_requirement_rows,
        "rows": rows,
    }


def claim_branch_payload() -> dict[str, Any]:
    claim_outcome_details = {
        "CLAIM_GRANTED": ("Start lease granted and run_started committed atomically.", ["publish_first_stage", "execute_manifest"], "ACTIVE_LEASED"),
        "ALREADY_ACTIVE": ("Another live lease still owns the same sealed manifest and attempt lineage.", ["defer_duplicate_start", "surface_active_lease_conflict"], "ACTIVE_LEASED"),
        "ALREADY_TERMINAL": ("Manifest already has a terminal post-start result.", ["return_existing_terminal_result"], "TERMINAL_RESULT_RECORDED"),
        "INVALID_PRESTART_STATE": ("Manifest is not in a legal pre-start state for new post-seal execution.", ["fail_closed"], "INVALID_PRESTART_STATE"),
        "RECOVERY_REQUIRED": ("The persisted attempt cannot restart fresh and must transition through recovery lineage.", ["allocate_recovery_child", "mark_reclaim_required"], "STALE_RECLAIM_REQUIRED"),
        "RECLAIM_GRANTED": ("Stale reclaim proof succeeded and a verified successor resumed the same attempt lineage.", ["resume_from_durable_stage", "publish_successor_linkage"], "STALE_RECLAIM_REQUIRED"),
        "RECLAIM_REJECTED_ACTIVE_LEASE": ("A reclaim attempt was rejected because the active lease still exists.", ["defer_duplicate_start", "surface_reclaim_conflict"], "ACTIVE_LEASED"),
    }
    claim_rows = [
        control_record(
            record_type="manifest_start_claim_outcome",
            canonical_id=f"manifest_start_claim_outcome_{outcome.lower()}",
            trigger_or_entry_condition="A caller attempts to start or reclaim one sealed manifest.",
            identity_tuple=["manifest_id", "attempt_lineage_ref", "claim_epoch", "claim_outcome"],
            frozen_inputs=["claim_state", "claim_status_code", "claim_holder_ref_or_null", "claim_token_or_null", "stage_dag_ref_or_null", "outbox_batch_ref_or_null"],
            state_or_outcome=claim_outcome_details[outcome][0],
            allowed_next_actions=claim_outcome_details[outcome][1],
            idempotency_or_hash_fields=["manifest_hash", "execution_basis_hash", "access_binding_hash", "attempt_lineage_ref"],
            recovery_posture="All non-granted outcomes are fail-closed for new post-seal execution.",
            privacy_reconciliation_required=False,
            authority_safety_posture="No second live start is authorized by broker silence or missing heartbeat alone.",
            operator_visible_effect="Claim results remain typed and visible for scheduler, API, and operator tooling.",
            audit_events=["RunStarted", "RunStartClaimRejected"],
            source_path=MANIFEST_START_CLAIM_PATH,
            source_heading_or_logical_block="2. Legal claim outcomes",
            source_ref=heading_ref(MANIFEST_START_CLAIM_PATH, "2. Legal claim outcomes"),
            notes=[],
            claim_outcome=outcome,
            projected_claim_state=claim_outcome_details[outcome][2],
        )
        for outcome in CLAIM_OUTCOMES
    ]
    atomicity_rows = [
        control_record(
            record_type="manifest_start_claim_atomicity",
            canonical_id=f"manifest_start_claim_atomicity_{idx}",
            trigger_or_entry_condition="CLAIM_GRANTED commits under one durable write boundary.",
            identity_tuple=["manifest_id", "attempt_lineage_ref", "claim_epoch"],
            frozen_inputs=["RunManifest.lifecycle_state", "RunManifest.opened_at", "manifest_start_claim.claim_state", "active_claim_token", "stage_dag_ref_or_null", "outbox_batch_ref_or_null"],
            state_or_outcome=statement,
            allowed_next_actions=["commit_claim_and_first_publication_together"],
            idempotency_or_hash_fields=["manifest_hash", "execution_basis_hash"],
            recovery_posture="There is no legal state where a run is open but the start claim remains pre-start.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Queue absence cannot imply execution if durable claim and publication proof are missing.",
            operator_visible_effect="Operators can trust one atomic start boundary instead of reconstructing worker-side order.",
            audit_events=["RunStarted"],
            source_path=MANIFEST_START_CLAIM_PATH,
            source_heading_or_logical_block="3. Atomicity rule",
            source_ref=heading_ref(MANIFEST_START_CLAIM_PATH, "3. Atomicity rule"),
            notes=[],
        )
        for idx, statement in enumerate(
            [
                "RunManifest.lifecycle_state becomes IN_PROGRESS.",
                "RunManifest.opened_at mirrors manifest_start_claim.claim_acquired_at_or_null.",
                "manifest_start_claim.claim_state becomes ACTIVE_LEASED.",
                "The active claim token, holder, epoch, and expiry are committed together.",
                "The first durable stage/outbox publication refs and first_publication_committed_at_or_null are committed together.",
            ],
            start=1,
        )
    ]
    reclaim_rows = [
        control_record(
            record_type="manifest_start_claim_recovery_rule",
            canonical_id="manifest_start_claim_recovery_rule_durable_expiry_proof_required",
            trigger_or_entry_condition="A stale-lease recovery or reclaim is attempted.",
            identity_tuple=["manifest_id", "attempt_lineage_ref", "claim_state"],
            frozen_inputs=["durable_expiry_proof", "claim_expires_at_or_null", "stale_reclaim_reason_code_or_null"],
            state_or_outcome="A claim becomes reclaimable only when durable expiry proof exists under frozen policy.",
            allowed_next_actions=["grant_reclaim", "reject_reclaim_active_lease"],
            idempotency_or_hash_fields=["claim_epoch", "attempt_lineage_ref"],
            recovery_posture="Reclaim is explicit and proof-driven rather than heartbeat-driven.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Heartbeat loss alone does not authorize second starts or authority replay.",
            operator_visible_effect="Schedulers can prove why reclaim succeeded or failed.",
            audit_events=["RunStartClaimRejected", "NightlyBatchShardReclaimed"],
            source_path=MANIFEST_START_CLAIM_PATH,
            source_heading_or_logical_block="4. Recovery and reclaim",
            source_ref=heading_ref(MANIFEST_START_CLAIM_PATH, "4. Recovery and reclaim"),
            notes=[],
            reclaim_rule="DURABLE_EXPIRY_PROOF_REQUIRED",
        ),
        control_record(
            record_type="manifest_start_claim_recovery_rule",
            canonical_id="manifest_start_claim_recovery_rule_preserve_same_attempt_lineage",
            trigger_or_entry_condition="A stale attempt is reclaimed by a successor.",
            identity_tuple=["manifest_id", "attempt_lineage_ref"],
            frozen_inputs=["attempt_lineage_ref", "stale_reclaim_reason_code_or_null"],
            state_or_outcome="Reclaim preserves the same `attempt_lineage_ref` and marks `claim_state = STALE_RECLAIM_REQUIRED`.",
            allowed_next_actions=["allocate_successor_child", "resume_from_durable_stage"],
            idempotency_or_hash_fields=["attempt_lineage_ref", "claim_epoch"],
            recovery_posture="Reclaim is same-attempt recovery lineage, not ordinary continuation.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Successor lineage cannot silently downgrade stale reclaim into ordinary continuation.",
            operator_visible_effect="Lineage explorers show the original attempt and the verified reclaim successor together.",
            audit_events=["RunStartClaimRejected", "ContinuationChildAllocated"],
            source_path=MANIFEST_START_CLAIM_PATH,
            source_heading_or_logical_block="4. Recovery and reclaim",
            source_ref=heading_ref(MANIFEST_START_CLAIM_PATH, "4. Recovery and reclaim"),
            notes=[],
            reclaim_rule="PRESERVE_SAME_ATTEMPT_LINEAGE",
        ),
        control_record(
            record_type="manifest_start_claim_recovery_rule",
            canonical_id="manifest_start_claim_recovery_rule_resume_from_durable_publication",
            trigger_or_entry_condition="A recovery successor resumes an interrupted started manifest.",
            identity_tuple=["manifest_id", "stage_dag_ref_or_null", "outbox_batch_ref_or_null"],
            frozen_inputs=["stage_dag_ref_or_null", "outbox_batch_ref_or_null", "first_publication_committed_at_or_null"],
            state_or_outcome="Recovery continues from durable stage/outbox publication proof instead of inferring safety from broker silence.",
            allowed_next_actions=["resume_durable_stage", "resume_outbox_replay"],
            idempotency_or_hash_fields=["claim_epoch", "stage_dag_ref_or_null", "outbox_batch_ref_or_null"],
            recovery_posture="Resume point is durable publication proof, not queue absence.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Recovery does not authorize fresh authority mutation if request lineage already left the process.",
            operator_visible_effect="Recovery dashboards can point to the exact durable stage that a successor resumed.",
            audit_events=["NightlyBatchShardReclaimed"],
            source_path=MANIFEST_START_CLAIM_PATH,
            source_heading_or_logical_block="4. Recovery and reclaim",
            source_ref=heading_ref(MANIFEST_START_CLAIM_PATH, "4. Recovery and reclaim"),
            notes=[],
            reclaim_rule="RESUME_FROM_DURABLE_PUBLICATION",
        ),
    ]
    invariant_rows = [
        control_record(
            record_type="manifest_start_claim_invariant",
            canonical_id=f"manifest_start_claim_invariant_{idx}",
            trigger_or_entry_condition="Manifest lifecycle and claim state must stay semantically aligned.",
            identity_tuple=["manifest_id", "lifecycle_state", "claim_state"],
            frozen_inputs=["lifecycle_state", "opened_at", "claim_state", "outputs_or_refs"],
            state_or_outcome=statement,
            allowed_next_actions=["validate_invariant", "reject_illegal_claim_state"],
            idempotency_or_hash_fields=["manifest_hash", "claim_epoch"],
            recovery_posture="Invariant failures block silent duplicate start or ambiguous failure collapse.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Invariant violations remain auditable instead of hidden in worker logs.",
            operator_visible_effect="Operators can trust claim-state semantics across sealed, in-progress, failed, and terminal posture.",
            audit_events=["RunStartClaimRejected", "ManifestFailed", "ManifestCompleted"],
            source_path=MANIFEST_START_CLAIM_PATH,
            source_heading_or_logical_block="5. Invariants",
            source_ref=heading_ref(MANIFEST_START_CLAIM_PATH, "5. Invariants"),
            notes=[],
        )
        for idx, statement in enumerate(
            [
                "`SEALED` manifests are strictly pre-start and therefore `manifest_start_claim.claim_state = UNCLAIMED_SEALED`.",
                "`IN_PROGRESS` manifests must have `manifest_start_claim.claim_state = ACTIVE_LEASED`.",
                "Terminal post-start manifests must have `manifest_start_claim.claim_state = TERMINAL_RESULT_RECORDED`.",
                "`FAILED` started manifests must distinguish reclaim-required posture from terminal failure posture.",
                "Same-attempt recovery children reuse the original `attempt_lineage_ref`; continuation, replay, and new-request children may not impersonate it.",
                "Audit events and metrics must make claim conflicts, stale-lease recovery, and duplicate-start suppression observable.",
            ],
            start=1,
        )
    ]
    claim_state_rows = [
        control_record(
            record_type="manifest_start_claim_state",
            canonical_id=f"manifest_start_claim_state_{state.lower()}",
            trigger_or_entry_condition="Manifest start-claim contract serializes its authoritative lifecycle state.",
            identity_tuple=["manifest_id", "claim_state"],
            frozen_inputs=["claim_status_code", "claim_epoch", "publication_state"],
            state_or_outcome=f"manifest_start_claim.claim_state = {state}",
            allowed_next_actions=["validate_start_or_reclaim_rule"],
            idempotency_or_hash_fields=["manifest_hash", "execution_basis_hash", "attempt_lineage_ref"],
            recovery_posture="Claim state is durable truth for duplicate-start suppression and reclaim semantics.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Claim state prevents ambiguous live restarts.",
            operator_visible_effect="Schedulers can classify whether a manifest is pre-start, active, reclaimable, or terminal.",
            audit_events=["RunStarted", "RunStartClaimRejected"],
            source_path=MANIFEST_START_CLAIM_PATH,
            source_heading_or_logical_block="1. Durable control object",
            source_ref=heading_ref(MANIFEST_START_CLAIM_PATH, "1. Durable control object"),
            notes=[],
            claim_state=state,
        )
        for state in CLAIM_STATE_ENUM
    ]
    claim_status_rows = [
        control_record(
            record_type="manifest_start_claim_status_code",
            canonical_id=f"manifest_start_claim_status_code_{status.lower()}",
            trigger_or_entry_condition="The claim contract reports its coarse-grained legal claim posture.",
            identity_tuple=["manifest_id", "claim_status_code"],
            frozen_inputs=["claim_state", "claim_epoch", "claim_holder_ref_or_null"],
            state_or_outcome=f"manifest_start_claim.claim_status_code = {status}",
            allowed_next_actions=["drive_api_and_scheduler_branching"],
            idempotency_or_hash_fields=["attempt_lineage_ref", "claim_epoch"],
            recovery_posture="Status code is stable read-side contract for scheduler and API flows.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Status codes keep already-active, reclaim-required, and already-terminal postures distinct.",
            operator_visible_effect="Claim UI can summarize coarse claim posture without hiding the underlying claim state.",
            audit_events=["RunStartClaimRejected"],
            source_path=MANIFEST_START_CLAIM_PATH,
            source_heading_or_logical_block="1. Durable control object",
            source_ref=heading_ref(MANIFEST_START_CLAIM_PATH, "1. Durable control object"),
            notes=[],
            claim_status_code=status,
        )
        for status in CLAIM_STATUS_ENUM
    ]
    branch_action_details = {
        "NEW_MANIFEST": "No reusable prior manifest exists for this request identity.",
        "RETURN_EXISTING_BUNDLE": "Exact retry against a terminal manifest returns the persisted decision bundle.",
        "REUSE_SEALED_MANIFEST": "Exact retry against a still-pre-start sealed manifest reuses the same context.",
        "REPLAY_CHILD": "Caller explicitly requested replay and the child preserves replay lineage.",
        "RECOVERY_CHILD": "A started attempt is recovered under the same attempt lineage.",
        "CONTINUATION_CHILD": "Legally distinct post-terminal continuation is required in the same lineage family.",
        "NEW_REQUEST_CHILD": "Material request identity change forces a fresh child lineage.",
    }
    branch_rows = [
        control_record(
            record_type="manifest_branch_action",
            canonical_id=f"manifest_branch_action_{action.lower()}",
            trigger_or_entry_condition="Branch selection resolves one request-time manifest choice.",
            identity_tuple=["request_identity_hash", "selected_branch_action", "selected_branch_reason_code"],
            frozen_inputs=FROZEN_IDENTITY_INPUTS,
            state_or_outcome=branch_action_details[action],
            allowed_next_actions=["persist_manifest_branch_decision", "persist_manifest_lineage_trace"],
            idempotency_or_hash_fields=["request_identity_hash", "idempotency_key", "prior_manifest_hash_at_decision_or_null"],
            recovery_posture="Branch action keeps terminal retry, pre-start reuse, replay, recovery, continuation, and new request distinct.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Branch decisions may not widen effective scope beyond requested scope or collapse recovery into ordinary continuation.",
            operator_visible_effect="Schedulers and APIs can execute one explicit branch action instead of heuristically diffing nearby manifests.",
            audit_events=["ExistingDecisionBundleReturned", "ManifestContextReused", "ContinuationChildAllocated"],
            source_path=MANIFEST_BRANCH_PATH,
            source_heading_or_logical_block="Branch Actions",
            source_ref=heading_ref(MANIFEST_BRANCH_PATH, "Branch Actions"),
            notes=[],
            branch_action=action,
        )
        for action in BRANCH_ACTIONS
    ]
    branch_reason_rows = [
        control_record(
            record_type="manifest_branch_reason",
            canonical_id=f"manifest_branch_reason_{reason.lower()}",
            trigger_or_entry_condition="One manifest branch action is chosen and needs a machine-checked legal basis.",
            identity_tuple=["request_identity_hash", "selected_branch_action", "branch_reason_code"],
            frozen_inputs=FROZEN_IDENTITY_INPUTS,
            state_or_outcome=f"branch_reason_code = {reason}",
            allowed_next_actions=["validate_branch_action_reason_alignment", "explain_candidate_rejection"],
            idempotency_or_hash_fields=["request_identity_hash", "idempotency_key", "prior_manifest_hash_at_decision_or_null"],
            recovery_posture="Typed reasons preserve replay, recovery, terminal retry, and nightly continuity distinctions.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Nightly continuation branches must explicitly carry NIGHTLY_WINDOW_ADVANCED.",
            operator_visible_effect="Manifest explorers can explain the legal branch basis with typed reasons instead of free-form copy.",
            audit_events=["ExistingDecisionBundleReturned", "ManifestContextReused", "ContinuationChildAllocated"],
            source_path=MANIFEST_BRANCH_PATH,
            source_heading_or_logical_block="Typed Branch Reasons",
            source_ref=heading_ref(MANIFEST_BRANCH_PATH, "Typed Branch Reasons"),
            notes=[],
            branch_reason_code=reason,
        )
        for reason in BRANCH_REASON_CODES
    ]
    frozen_identity_rows = [
        control_record(
            record_type="manifest_branch_frozen_identity_input",
            canonical_id=f"manifest_branch_identity_input_{field.lower().replace('[','').replace(']','').replace('.','_')}",
            trigger_or_entry_condition="Branch selection freezes the comparison vector for reuse, replay, recovery, and continuation decisions.",
            identity_tuple=["request_identity_hash", "selected_branch_action"],
            frozen_inputs=FROZEN_IDENTITY_INPUTS,
            state_or_outcome=f"Frozen identity input includes `{field}`.",
            allowed_next_actions=["compute_request_identity_hash", "persist_manifest_branch_decision"],
            idempotency_or_hash_fields=["request_identity_hash", "idempotency_key"],
            recovery_posture="All branch choices remain reproducible from the same frozen identity spine.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Requested and effective scope distinctions remain explicit inside branch proof.",
            operator_visible_effect="Operators can audit why one request was the same request, a replay, a recovery, or a materially new request.",
            audit_events=["AccessScopeBound", "ManifestContextReused", "ContinuationChildAllocated"],
            source_path=MANIFEST_BRANCH_PATH,
            source_heading_or_logical_block="Frozen Identity Inputs",
            source_ref=heading_ref(MANIFEST_BRANCH_PATH, "Frozen Identity Inputs"),
            notes=[],
            frozen_identity_input=field,
        )
        for field in FROZEN_IDENTITY_INPUTS
    ]
    rows = flatten(
        claim_rows,
        atomicity_rows,
        reclaim_rows,
        invariant_rows,
        claim_state_rows,
        claim_status_rows,
        branch_rows,
        branch_reason_rows,
        frozen_identity_rows,
    )
    assert_required_record_fields(rows)
    return {
        "summary": make_summary(
            rows,
            extra={
                "claim_outcome_count": len(claim_rows),
                "claim_atomicity_count": len(atomicity_rows),
                "claim_invariant_count": len(invariant_rows),
                "branch_action_count": len(branch_rows),
                "branch_reason_count": len(branch_reason_rows),
                "frozen_identity_input_count": len(frozen_identity_rows),
            },
        ),
        "claim_outcomes": claim_rows,
        "claim_atomicity_rules": atomicity_rows,
        "recovery_and_reclaim_rules": reclaim_rows,
        "claim_invariants": invariant_rows,
        "claim_states": claim_state_rows,
        "claim_status_codes": claim_status_rows,
        "branch_actions": branch_rows,
        "branch_reason_codes": branch_reason_rows,
        "frozen_identity_inputs": frozen_identity_rows,
        "rows": rows,
    }


def nightly_selection_payload() -> dict[str, Any]:
    trigger_rows = [
        control_record(
            record_type="nightly_trigger_class",
            canonical_id=f"nightly_trigger_class_{trigger.lower()}",
            trigger_or_entry_condition="Nightly control-plane allocation observes a new trigger window.",
            identity_tuple=["tenant_id", "nightly_window_key", "trigger_class", "release_verification_manifest_ref", "policy_snapshot_hash", "autopilot_policy_hash"],
            frozen_inputs=["scheduler_dedupe_key", "schema_bundle_hash", "code_build_id", "environment_ref"],
            state_or_outcome=f"Nightly trigger class = {trigger}",
            allowed_next_actions=["allocate_or_reuse_nightly_batch", "freeze_identity_contract"],
            idempotency_or_hash_fields=["scheduler_dedupe_key", "identity_contract_hash"],
            recovery_posture="Trigger class is part of the batch identity and duplicate-suppression law.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Later recovery or manual retry windows may not impersonate a scheduled window.",
            operator_visible_effect="Operators can tell whether overnight work was scheduled, manual retry, or stale-batch reclaim.",
            audit_events=["NightlyBatchAllocated"],
            source_path=NIGHTLY_AUTOPILOT_PATH,
            source_heading_or_logical_block="2.1 Trigger source",
            source_ref=heading_ref(NIGHTLY_AUTOPILOT_PATH, "2.1 Trigger source"),
            notes=[],
            trigger_class=trigger,
        )
        for trigger in NIGHTLY_TRIGGER_ENUM
    ]
    candidate_source_rows = [
        control_record(
            record_type="nightly_candidate_universe_source",
            canonical_id=f"nightly_candidate_source_{source}",
            trigger_or_entry_condition="Nightly selection builds the frozen candidate universe for one tenant window.",
            identity_tuple=["tenant_id", "nightly_window_key", "selection_universe_hash"],
            frozen_inputs=[source],
            state_or_outcome=f"Candidate universe source includes `{source}`.",
            allowed_next_actions=["freeze_selection_universe", "persist_selection_entry_per_candidate"],
            idempotency_or_hash_fields=["selection_universe_hash", "selection_universe_count"],
            recovery_posture="Selection sources are frozen into the batch envelope before per-client execution begins.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Nightly selection reads durable truth, not ambient queue or transport state.",
            operator_visible_effect="Portfolio selection remains explainable from one frozen universe hash and source list.",
            audit_events=["NightlyPortfolioSelected"],
            source_path=NIGHTLY_AUTOPILOT_PATH,
            source_heading_or_logical_block="4.1 Candidate universe",
            source_ref=heading_ref(NIGHTLY_AUTOPILOT_PATH, "4.1 Candidate universe"),
            notes=[],
            candidate_universe_source=source,
        )
        for source in NIGHTLY_CANDIDATE_SOURCES
    ]
    disposition_details = {
        "EXECUTE_NEW_MANIFEST": "Allocate a new manifest because no reusable terminal result or lawful continuation satisfies the request.",
        "EXECUTE_CONTINUATION_CHILD": "Allocate a continuation child only when same-request reuse is unlawful and reclaim or continuation is explicitly required.",
        "REUSE_EXISTING_TERMINAL_RESULT": "Attach a prior terminal result before considering fresh execution.",
        "DEFER_ACTIVE_ATTEMPT": "Active same-window attempt exists and remains live under manifest start lease.",
        "DEFER_RETRY_WINDOW": "Retry could be legal later, but capacity, checkpoint timing, or next_retry_at defers it to a later window.",
        "ESCALATE_ONLY": "Open or refresh workflow without executing a manifest.",
        "SKIP_INELIGIBLE": "Persist explicit skip posture because the candidate is ineligible this window.",
    }
    disposition_rows = [
        control_record(
            record_type="nightly_selection_disposition",
            canonical_id=f"nightly_selection_disposition_{disposition.lower()}",
            trigger_or_entry_condition="One frozen selection entry is classified during nightly portfolio selection.",
            identity_tuple=["batch_run_id", "entry_id", "candidate_identity_hash", "selection_disposition"],
            frozen_inputs=["terminal_result_reuse_state", "active_attempt_resolution_state", "reason_codes[]", "workflow_item_refs[]", "next_checkpoint_at", "priority_tuple"],
            state_or_outcome=disposition_details[disposition],
            allowed_next_actions=["persist_selection_entry", "dispatch_or_handoff_entry"],
            idempotency_or_hash_fields=["candidate_identity_hash", "selection_basis_hash", "scheduler_dedupe_key"],
            recovery_posture="Every candidate gets one persisted selection row and preserves its disposition across reclaim and restart.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Reuse is evaluated before new execution and live active attempts may not silently duplicate manifests.",
            operator_visible_effect="Nightly operations can see whether a client executed, reused, deferred, escalated, or skipped.",
            audit_events=["NightlyPortfolioSelected", "NightlyClientExecutionDispatched", "NightlyClientExecutionDeferred", "NightlyClientExecutionSkipped", "NightlyClientExecutionEscalated"],
            source_path=NIGHTLY_AUTOPILOT_PATH,
            source_heading_or_logical_block="4.2 Selection dispositions",
            source_ref=heading_ref(NIGHTLY_AUTOPILOT_PATH, "4.2 Selection dispositions"),
            notes=[],
            selection_disposition=disposition,
        )
        for disposition in SELECTION_DISPOSITION_ENUM
    ]
    ineligible_rows = [
        control_record(
            record_type="nightly_ineligible_or_deferred_condition",
            canonical_id=f"nightly_ineligible_condition_{condition}",
            trigger_or_entry_condition="Nightly selector evaluates whether a candidate can execute this window.",
            identity_tuple=["batch_run_id", "entry_id", "candidate_identity_hash"],
            frozen_inputs=["selection_disposition", "reason_codes[]", "workflow_item_refs[]", "next_checkpoint_at"],
            state_or_outcome=f"Ineligible or deferred condition: `{condition}`.",
            allowed_next_actions=["persist_skip_or_defer_posture", "escalate_if_required"],
            idempotency_or_hash_fields=["candidate_identity_hash", "selection_basis_hash"],
            recovery_posture="Condition is persisted explicitly instead of vanishing because the window filled up or truth changed.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Authority ambiguity, step-up, approval, override, or active lease blocks unattended execution.",
            operator_visible_effect="Morning handoff can explain why a client did not execute overnight.",
            audit_events=["NightlyClientExecutionDeferred", "NightlyClientExecutionSkipped", "NightlyClientExecutionEscalated"],
            source_path=NIGHTLY_AUTOPILOT_PATH,
            source_heading_or_logical_block="4.3 Ineligible or deferred cases",
            source_ref=heading_ref(NIGHTLY_AUTOPILOT_PATH, "4.3 Ineligible or deferred cases"),
            notes=[],
            ineligible_condition=condition,
        )
        for condition in NIGHTLY_INELIGIBLE_CONDITIONS
    ]
    terminal_reuse_rows = [
        control_record(
            record_type="nightly_terminal_result_reuse_state",
            canonical_id=f"nightly_terminal_result_reuse_state_{state.lower()}",
            trigger_or_entry_condition="Nightly selection checks for reusable terminal results before new allocation.",
            identity_tuple=["entry_id", "terminal_result_reuse_state"],
            frozen_inputs=["prior_manifest_ref", "decision_bundle_hash_or_null", "reason_codes[]"],
            state_or_outcome=f"terminal_result_reuse_state = {state}",
            allowed_next_actions=["reuse_terminal_result", "advance_to_execution_or_defer"],
            idempotency_or_hash_fields=["candidate_identity_hash", "decision_bundle_hash_or_null"],
            recovery_posture="Terminal-result reuse remains explicit even when the batch later needs checkpoint refresh or policy re-evaluation.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Reused result wins before new execution and prevents duplicate legal work.",
            operator_visible_effect="Batch operators can see why a result was reused or why reuse was rejected.",
            audit_events=["NightlyPortfolioSelected"],
            source_path=NIGHTLY_SELECTION_PATH,
            source_heading_or_logical_block="Selection law",
            source_ref=heading_ref(NIGHTLY_SELECTION_PATH, "Selection law"),
            notes=[],
            terminal_result_reuse_state=state,
        )
        for state in TERMINAL_REUSE_ENUM
    ]
    active_attempt_rows = [
        control_record(
            record_type="nightly_active_attempt_resolution_state",
            canonical_id=f"nightly_active_attempt_resolution_state_{state.lower()}",
            trigger_or_entry_condition="Nightly selection encounters active or stale manifest work for the same client-period tuple.",
            identity_tuple=["entry_id", "active_attempt_resolution_state"],
            frozen_inputs=["manifest_start_claim", "prior_manifest_ref", "predecessor_selection_entry_ref_or_null"],
            state_or_outcome=f"active_attempt_resolution_state = {state}",
            allowed_next_actions=["defer_active_attempt", "require_stale_reclaim", "allow_new_execution_if_no_active_attempt"],
            idempotency_or_hash_fields=["candidate_identity_hash", "attempt_lineage_ref_or_null"],
            recovery_posture="Same-window active attempts resolve to defer or stale-reclaim-required posture rather than duplicate execution.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Manifest lease truth governs active-attempt isolation, not scheduler optimism.",
            operator_visible_effect="Operators can see when a client was deferred because live work already existed.",
            audit_events=["NightlyClientExecutionDeferred", "NightlyBatchShardReclaimed"],
            source_path=NIGHTLY_SELECTION_PATH,
            source_heading_or_logical_block="Selection law",
            source_ref=heading_ref(NIGHTLY_SELECTION_PATH, "Selection law"),
            notes=[],
            active_attempt_resolution_state=state,
        )
        for state in ACTIVE_ATTEMPT_RESOLUTION_ENUM
    ]
    recovery_resume_rows = [
        control_record(
            record_type="nightly_recovery_resume_state",
            canonical_id=f"nightly_recovery_resume_state_{state.lower()}",
            trigger_or_entry_condition="A batch is either a fresh window or a stale-batch recovery successor.",
            identity_tuple=["batch_run_id", "trigger_class", "recovery_resume_state"],
            frozen_inputs=["reclaimed_predecessor_batch_run_ref_or_null", "selection_entries[]", "shard_plan[]"],
            state_or_outcome=f"recovery_resume_state = {state}",
            allowed_next_actions=["reuse_predecessor_selection", "reshard_if_required", "mark_not_applicable_for_non_recovery_windows"],
            idempotency_or_hash_fields=["identity_contract_hash", "scheduler_dedupe_key"],
            recovery_posture="Successor batches must link the predecessor and either resume its selection/shards or explicitly reshards them.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Stale-batch reclamation requires durable proof, not missing heartbeat alone.",
            operator_visible_effect="Nightly recovery dashboards can tell whether selection and shard plans were resumed or rebuilt.",
            audit_events=["NightlyBatchShardReclaimed", "NightlyBatchAbandoned"],
            source_path=NIGHTLY_AUTOPILOT_PATH,
            source_heading_or_logical_block="10.2 Stale-batch reclamation",
            source_ref=heading_ref(NIGHTLY_AUTOPILOT_PATH, "10.2 Stale-batch reclamation"),
            notes=[],
            recovery_resume_state=state,
        )
        for state in NIGHTLY_RESUME_ENUM
    ]
    shard_rows = [
        control_record(
            record_type="nightly_shard_failure_state",
            canonical_id=f"nightly_shard_failure_state_{state.lower()}",
            trigger_or_entry_condition="Shard-level execution or recovery isolates one subset of selected entries.",
            identity_tuple=["batch_run_id", "shard_id", "shard_state"],
            frozen_inputs=["entry_refs[]", "global_concurrency_profile", "stale_heartbeat_after_seconds"],
            state_or_outcome=f"shard_state = {state}",
            allowed_next_actions=["continue_other_shards", "block_tenant_wide_if_required", "request_reclaim_if_required"],
            idempotency_or_hash_fields=["batch_run_id", "shard_id"],
            recovery_posture="Shard-local failure isolation keeps unrelated clients explicit even when one shard fails.",
            privacy_reconciliation_required=False,
            authority_safety_posture="One stuck shard may not serialize unrelated shards or hide their outcomes.",
            operator_visible_effect="Operations can see whether one shard failed in isolation, blocked the tenant, or requires reclaim.",
            audit_events=["NightlyBatchShardClaimed", "NightlyBatchShardReclaimed"],
            source_path=NIGHTLY_SELECTION_PATH,
            source_heading_or_logical_block="Shard-isolation law",
            source_ref=heading_ref(NIGHTLY_SELECTION_PATH, "Shard-isolation law"),
            notes=[],
            shard_state=state,
        )
        for state in NIGHTLY_SHARD_FAILURE_ENUM
    ]
    outcome_rows = [
        control_record(
            record_type="nightly_outcome_bucket",
            canonical_id=f"nightly_outcome_bucket_{state.lower()}" if state is not None else "nightly_outcome_bucket_null",
            trigger_or_entry_condition="A selected entry, client execution, or batch convergence settles into one explicit bucket.",
            identity_tuple=["entry_id", "outcome_bucket"],
            frozen_inputs=["selection_disposition", "workflow_item_refs[]", "next_checkpoint_at"],
            state_or_outcome=f"outcome_bucket = {state}",
            allowed_next_actions=["publish_digest_and_queue_consequences"],
            idempotency_or_hash_fields=["entry_id", "candidate_identity_hash"],
            recovery_posture="Finite-progress buckets ensure overnight behavior converges to explicit quiescent posture.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Authority-waiting and late-data-waiting posture remain explicit rather than hidden as generic failure.",
            operator_visible_effect="Morning handoff can summarize completed, deferred, review-required, blocked, failed, reused, or skipped outcomes.",
            audit_events=["NightlyBatchQuiesced", "NightlyBatchCompleted"],
            source_path=NIGHTLY_AUTOPILOT_PATH,
            source_heading_or_logical_block="10.5 Finite-progress convergence guarantee",
            source_ref=heading_ref(NIGHTLY_AUTOPILOT_PATH, "10.5 Finite-progress convergence guarantee"),
            notes=[],
            outcome_bucket=state,
        )
        for state in NIGHTLY_OUTCOME_BUCKET_ENUM
    ]
    digest_publication_rows = [
        control_record(
            record_type="nightly_operator_digest_publication_state",
            canonical_id=f"nightly_operator_digest_publication_state_{state.lower()}",
            trigger_or_entry_condition="Nightly batch reaches a digest-publication boundary after selection or quiescence.",
            identity_tuple=["batch_run_id", "operator_digest_publication_state"],
            frozen_inputs=["operator_digest_derivation_contract_or_null", "operator_digest_ref", "published_workflow_item_refs[]", "published_notification_refs[]"],
            state_or_outcome=f"operator_digest_publication_state = {state}",
            allowed_next_actions=["advance_digest_publication", "block_on_missing_publication_step"],
            idempotency_or_hash_fields=["batch_run_id", "coverage_date_or_null"],
            recovery_posture="Digest publication remains explicit across retries and quiescence rather than being implied by missing inbox work.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Digest publication must remain derived from persisted nightly artifacts and queues.",
            operator_visible_effect="Operators can tell whether digest publication is not ready, pending workflow publication, pending notification publication, or complete.",
            audit_events=["OperatorMorningDigestPublished"],
            source_path=NIGHTLY_AUTOPILOT_PATH,
            source_heading_or_logical_block="12.3 Digest publication rule",
            source_ref=heading_ref(NIGHTLY_AUTOPILOT_PATH, "12.3 Digest publication rule"),
            notes=[],
            operator_digest_publication_state=state,
        )
        for state in NIGHTLY_OPERATOR_DIGEST_PUBLICATION_ENUM
    ]
    rows = flatten(
        trigger_rows,
        candidate_source_rows,
        disposition_rows,
        ineligible_rows,
        terminal_reuse_rows,
        active_attempt_rows,
        recovery_resume_rows,
        shard_rows,
        outcome_rows,
        digest_publication_rows,
    )
    assert_required_record_fields(rows)
    return {
        "summary": make_summary(
            rows,
            extra={
                "trigger_class_count": len(trigger_rows),
                "candidate_source_count": len(candidate_source_rows),
                "selection_disposition_count": len(disposition_rows),
                "ineligible_condition_count": len(ineligible_rows),
                "terminal_result_reuse_state_count": len(terminal_reuse_rows),
                "active_attempt_resolution_state_count": len(active_attempt_rows),
                "recovery_resume_state_count": len(recovery_resume_rows),
                "shard_state_count": len(shard_rows),
                "outcome_bucket_count": len(outcome_rows),
            },
        ),
        "trigger_classes": trigger_rows,
        "candidate_universe_sources": candidate_source_rows,
        "selection_dispositions": disposition_rows,
        "ineligible_or_deferred_conditions": ineligible_rows,
        "terminal_result_reuse_states": terminal_reuse_rows,
        "active_attempt_resolution_states": active_attempt_rows,
        "recovery_resume_states": recovery_resume_rows,
        "shard_failure_states": shard_rows,
        "quiescence_outcome_buckets": outcome_rows,
        "operator_digest_publication_states": digest_publication_rows,
        "rows": rows,
    }


def unattended_policy_effect(policy_value: str) -> str:
    if policy_value == "ALLOW":
        return "Stage may progress unattended when other trust, lease, and authority preconditions are satisfied."
    if policy_value == "ALLOW_IF_TRUST_GREEN":
        return "Stage may progress unattended only when trust is green and no other blocking posture exists."
    if policy_value == "ALLOW_IF_TRUST_GREEN_AND_NO_OPEN_HUMAN_ITEM":
        return "Stage may progress unattended only when trust is green and no open human-owned workflow item remains."
    if policy_value == "REVIEW_REQUIRED":
        return "Stage may not progress unattended and requires explicit human review."
    return "Stage is denied for unattended progression in this matrix cell."


def authority_posture_for_stage(stage_family: str) -> str:
    if stage_family in {"SUBMIT_TO_AUTHORITY", "AUTHORITY_RECONCILIATION", "OUT_OF_BAND_STATE_MARKING"}:
        return "Controlled-edge authority stage; blind resend, ambiguous truth, and self-approved exception posture are forbidden."
    if stage_family == "OPEN_CUSTOMER_REQUEST":
        return "Customer-visible stage; frozen templates and durable evidence are required."
    if stage_family == "OVERRIDE_OR_EXCEPTION":
        return "Override stage; filing-critical overrides and exceptional authority may not be self-approved overnight."
    if stage_family == "REPLAY_OR_RECOVERY":
        return "Replay and recovery stage; exact-vs-counterfactual posture must remain explicit and non-mutating when analysis-only."
    return "Internal control-plane stage subject to trust, approval, override, and lease boundaries."


def nightly_policy_payload() -> dict[str, Any]:
    policy_rows = []
    for stage_family in NIGHTLY_STAGE_FAMILIES:
        for policy_value in UNATTENDED_POLICY_VALUES:
            policy_rows.append(
                control_record(
                    record_type="nightly_unattended_policy_cell",
                    canonical_id=f"nightly_unattended_policy_cell_{stage_family.lower()}_{policy_value.lower()}",
                    trigger_or_entry_condition="A nightly batch freezes one tenant/client unattended policy matrix row for a stage family.",
                    identity_tuple=["tenant_id", "client_id", "stage_family", "policy_value"],
                    frozen_inputs=["trust_input_basis_contract", "decision_constraint_codes[]", "required_human_steps[]", "authority_truth_clear_i", "manifest_lease_clear_i"],
                    state_or_outcome=unattended_policy_effect(policy_value),
                    allowed_next_actions=["progress_stage_if_all_preconditions_hold", "open_internal_workflow_if_not_admissible"],
                    idempotency_or_hash_fields=["policy_snapshot_hash", "autopilot_policy_hash"],
                    recovery_posture="Policy matrix remains frozen for the window and is replayable from persisted policy hashes.",
                    privacy_reconciliation_required=False,
                    authority_safety_posture=authority_posture_for_stage(stage_family),
                    operator_visible_effect="Operators can inspect unattended legality per stage family instead of inferring it from overnight behavior.",
                    audit_events=["NightlyPortfolioSelected", "NightlyClientExecutionDeferred", "NightlyClientExecutionEscalated"],
                    source_path=NIGHTLY_AUTOPILOT_PATH,
                    source_heading_or_logical_block="6.1 Matrix requirement",
                    source_ref=heading_ref(NIGHTLY_AUTOPILOT_PATH, "6.1 Matrix requirement"),
                    notes=[],
                    stage_family=stage_family,
                    policy_value=policy_value,
                )
            )
    boundary_rows = [
        control_record(
            record_type="nightly_hard_unattended_boundary",
            canonical_id=f"nightly_hard_unattended_boundary_{boundary}",
            trigger_or_entry_condition="Nightly automation considers progressing a stage or publishing customer-visible work unattended.",
            identity_tuple=["tenant_id", "nightly_window_key", "hard_boundary"],
            frozen_inputs=["selection_disposition", "trust_input_basis_contract", "required_human_steps[]", "reconciliation_budget_state"],
            state_or_outcome=f"Hard unattended boundary: `{boundary}`.",
            allowed_next_actions=["block_unattended_progression", "open_internal_workflow"],
            idempotency_or_hash_fields=["policy_snapshot_hash", "autopilot_policy_hash"],
            recovery_posture="Boundaries survive retries, reclaims, and successor batches.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Hard boundaries are never overridden by overnight convenience or raw trust score alone.",
            operator_visible_effect="Morning operations can see which non-delegable act forced review-required or deny posture.",
            audit_events=["NightlyClientExecutionEscalated", "WorkflowOpened"],
            source_path=NIGHTLY_AUTOPILOT_PATH,
            source_heading_or_logical_block="6.3 Hard unattended boundaries",
            source_ref=heading_ref(NIGHTLY_AUTOPILOT_PATH, "6.3 Hard unattended boundaries"),
            notes=[],
            hard_boundary=boundary,
        )
        for boundary in NIGHTLY_HARD_BOUNDARIES
    ]
    safe_customer_rows = [
        control_record(
            record_type="nightly_safe_customer_visible_requirement",
            canonical_id=f"nightly_safe_customer_visible_requirement_{requirement}",
            trigger_or_entry_condition="Nightly automation wants to publish customer-visible follow-up automatically.",
            identity_tuple=["tenant_id", "client_id", "stage_family=OPEN_CUSTOMER_REQUEST"],
            frozen_inputs=["unattended_policy_matrix", "frozen_template_family", "persisted_workflow_or_gate_posture", "audit_evidence_refs[]"],
            state_or_outcome=f"Safe customer-visible automation requires `{requirement}`.",
            allowed_next_actions=["publish_customer_request_if_all_requirements_hold", "open_internal_workflow_only"],
            idempotency_or_hash_fields=["policy_snapshot_hash", "template_family_hash_or_ref"],
            recovery_posture="Safe customer-visible automation remains reconstructible from persisted artifacts after restore or replay.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Customer-visible follow-up may not satisfy sign-off, step-up, or override on behalf of a user.",
            operator_visible_effect="Operators can distinguish lawful templated follow-up from cases that required internal workflow instead.",
            audit_events=["NightlyClientExecutionEscalated", "WorkflowOpened"],
            source_path=NIGHTLY_AUTOPILOT_PATH,
            source_heading_or_logical_block="6.4 Safe customer-visible automation",
            source_ref=heading_ref(NIGHTLY_AUTOPILOT_PATH, "6.4 Safe customer-visible automation"),
            notes=[],
            safe_customer_visible_requirement=requirement,
        )
        for requirement in SAFE_CUSTOMER_VISIBLE_REQUIREMENTS
    ]
    retry_rows = [
        control_record(
            record_type="nightly_retry_class",
            canonical_id=f"nightly_retry_class_{retry_class.lower()}",
            trigger_or_entry_condition="A batch decides whether a failed or deferred client attempt may retry inside the same window.",
            identity_tuple=["batch_run_id", "entry_id", "retry_class"],
            frozen_inputs=["ErrorRecord posture", "next_retry_at", "retry_expected_gain_i", "retry_capacity_fraction", "reconciliation_control_contract"],
            state_or_outcome=f"Retry class = {retry_class}.",
            allowed_next_actions=["retry_inside_batch_if_lawful", "defer_to_successor_batch", "open_queue_visible_handoff"],
            idempotency_or_hash_fields=["retry_idempotency_scope", "manifest_idempotency_key", "authority_idempotency_key_or_null"],
            recovery_posture="Retries preserve manifest or authority idempotency scope and use deterministic phase offsets.",
            privacy_reconciliation_required=False,
            authority_safety_posture="RECONCILE_THEN_RETRY may not blind-resend a mutation and human-review classes become queue-visible handoff.",
            operator_visible_effect="Operators can see whether a retry stayed in-batch, deferred to the next window, or required human action.",
            audit_events=["NightlyClientExecutionDeferred", "NightlyClientExecutionEscalated"],
            source_path=NIGHTLY_AUTOPILOT_PATH,
            source_heading_or_logical_block="7.3 Retry classes inside a batch",
            source_ref=heading_ref(NIGHTLY_AUTOPILOT_PATH, "7.3 Retry classes inside a batch"),
            notes=[],
            retry_class=retry_class,
        )
        for retry_class in NIGHTLY_RETRY_CLASSES
    ]
    stop_rows = [
        control_record(
            record_type="nightly_global_stop_condition",
            canonical_id=f"nightly_global_stop_condition_{condition}",
            trigger_or_entry_condition="Batch-level governance evaluates whether overnight execution should stop, throttle, or publish partial-failure posture.",
            identity_tuple=["batch_run_id", "nightly_window_key", "stability_state"],
            frozen_inputs=["release_verification_manifest_ref", "policy_snapshot_hash", "audit_refs[]", "provenance_refs[]"],
            state_or_outcome=f"Global stop or batch-level condition: `{condition}`.",
            allowed_next_actions=["block_new_dispatch", "quiesce_batch", "publish_completed_with_failures_if_quiescent"],
            idempotency_or_hash_fields=["batch_run_id", "scheduler_dedupe_key"],
            recovery_posture="Per-client failures alone do not force batch FAILED when the batch can quiesce explicitly with failures.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Authority edge or release admissibility failure may stop the batch before new control-plane work begins.",
            operator_visible_effect="Morning handoff can explain why a batch stopped, throttled, or completed with failures.",
            audit_events=["NightlyBatchAbandoned", "NightlyBatchCompleted"],
            source_path=NIGHTLY_AUTOPILOT_PATH,
            source_heading_or_logical_block="11. Global stop conditions and partial-failure handling",
            source_ref=heading_ref(NIGHTLY_AUTOPILOT_PATH, "11. Global stop conditions and partial-failure handling"),
            notes=[],
            global_stop_condition=condition,
        )
        for condition in NIGHTLY_STOP_CONDITIONS
    ]
    digest_rows = [
        control_record(
            record_type="nightly_digest_requirement",
            canonical_id="nightly_digest_requirement_derivation_contract",
            trigger_or_entry_condition="The batch is ready to publish its next-morning digest.",
            identity_tuple=["coverage_date", "source_batch_run_refs[]", "operator_digest_ref_or_null"],
            frozen_inputs=["covered_selection_entry_refs[]", "summary_counts{...}", "queue_summaries[]", "highlighted_client_outcomes[]", "waiting_on_authority_refs[]", "late_data_hold_refs[]"],
            state_or_outcome="OperatorMorningDigest must carry an explicit derivation contract tied to the same source batch set.",
            allowed_next_actions=["publish_digest", "supersede_prior_digest"],
            idempotency_or_hash_fields=["derivation_contract_hash", "coverage_date"],
            recovery_posture="Digest derivation remains replayable from the same source batch set.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Customer-visible and queue-visible consequences remain sourced from persisted overnight truth.",
            operator_visible_effect="Operators receive one exact portfolio handoff per coverage date.",
            audit_events=["OperatorMorningDigestPublished"],
            source_path=NIGHTLY_AUTOPILOT_PATH,
            source_heading_or_logical_block="12.2 OperatorMorningDigest",
            source_ref=heading_ref(NIGHTLY_AUTOPILOT_PATH, "12.2 OperatorMorningDigest"),
            notes=[],
        ),
        control_record(
            record_type="nightly_digest_requirement",
            canonical_id="nightly_digest_requirement_publication_state_is_explicit",
            trigger_or_entry_condition="Digest publication may require workflow publication and notification publication before completion.",
            identity_tuple=["batch_run_id", "operator_digest_publication_state"],
            frozen_inputs=["published_workflow_item_refs[]", "published_notification_refs[]", "published_at_or_null"],
            state_or_outcome="Digest publication state and QA remain explicit rather than implied.",
            allowed_next_actions=["advance_publication_state", "block_on_missing_publication_step"],
            idempotency_or_hash_fields=["batch_run_id", "operator_digest_ref"],
            recovery_posture="Digest publication survives retries and resume as a durable state machine.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Publication state cannot be inferred solely from operator inbox side effects.",
            operator_visible_effect="Operators can see whether digest publication is pending or complete.",
            audit_events=["OperatorMorningDigestPublished"],
            source_path=NIGHTLY_AUTOPILOT_PATH,
            source_heading_or_logical_block="12.3 Digest publication rule",
            source_ref=heading_ref(NIGHTLY_AUTOPILOT_PATH, "12.3 Digest publication rule"),
            notes=[],
        ),
    ]
    rows = flatten(policy_rows, boundary_rows, safe_customer_rows, retry_rows, stop_rows, digest_rows)
    assert_required_record_fields(rows)
    return {
        "summary": make_summary(
            rows,
            extra={
                "policy_cell_count": len(policy_rows),
                "hard_boundary_count": len(boundary_rows),
                "safe_customer_visible_requirement_count": len(safe_customer_rows),
                "retry_class_count": len(retry_rows),
                "global_stop_condition_count": len(stop_rows),
            },
        ),
        "policy_cells": policy_rows,
        "hard_boundaries": boundary_rows,
        "safe_customer_visible_requirements": safe_customer_rows,
        "retry_classes": retry_rows,
        "global_stop_conditions": stop_rows,
        "operator_digest_requirements": digest_rows,
        "rows": rows,
    }


def recovery_checkpoint_payload() -> dict[str, Any]:
    workload_mapping = {
        "CONTROL_PLANE_LEGAL_TRUTH": ("TIER_0_CONTROL_PLANE", "RPO_15M", "RTO_60M"),
        "REBUILDABLE_PROJECTION": ("TIER_1_REBUILDABLE", "RPO_4H", "RTO_4H"),
        "DISPOSABLE_RUNTIME_CACHE": ("TIER_2_DISPOSABLE", "RPO_BEST_EFFORT", "RTO_24H"),
    }
    tier_rows = [
        control_record(
            record_type="recovery_tier_mapping",
            canonical_id=f"recovery_tier_mapping_{workload.lower()}",
            trigger_or_entry_condition="A checkpoint or deployment release binds recovery governance.",
            identity_tuple=["boundary_scope", "protected_workload_class", "recovery_tier_class", "rpo_class", "rto_class"],
            frozen_inputs=["checkpoint_inventory_policy", "privacy_reconciliation_policy", "queue_recovery_policy", "authority_recovery_policy", "rollback_boundary_policy", "fail_forward_policy"],
            state_or_outcome=f"{workload} maps to {mapping[0]} / {mapping[1]} / {mapping[2]}.",
            allowed_next_actions=["validate_checkpoint_or_release_tier", "reject_weaker_serialization"],
            idempotency_or_hash_fields=["contract_version", "protected_workload_class"],
            recovery_posture="Tier mapping is shared across RecoveryCheckpoint and DeploymentRelease artifacts.",
            privacy_reconciliation_required=True,
            authority_safety_posture="Authority-integrated control-plane truth may not serialize a weaker tier than the mapping allows.",
            operator_visible_effect="SRE and release teams can prove the expected RPO and RTO for each protected workload class.",
            audit_events=["BackupCreated", "RestoreDrillExecuted", "ReleasePromoted"],
            source_path=RECOVERY_PATH,
            source_heading_or_logical_block="Shared recovery-governance boundary",
            source_ref=heading_ref(RECOVERY_PATH, "Shared recovery-governance boundary"),
            notes=[],
            protected_workload_class=workload,
            recovery_tier_class=mapping[0],
            rpo_class=mapping[1],
            rto_class=mapping[2],
        )
        for workload, mapping in workload_mapping.items()
    ]
    checkpoint_gate_rows = [
        control_record(
            record_type="recovery_checkpoint_gate",
            canonical_id=f"recovery_checkpoint_gate_{code.lower()}",
            trigger_or_entry_condition="A checkpoint claims VERIFIED posture or an environment claims READY_FOR_REOPEN.",
            identity_tuple=["checkpoint_id", "checkpoint_state", "reopen_readiness_state"],
            frozen_inputs=["restore_drill_ref", "privacy_reconciliation_contract", "audit_continuity_verified", "queue_rebuild_verified", "authority_rebuild_verified", "authority_binding_revalidation_verified"],
            state_or_outcome=description,
            allowed_next_actions=["advance_to_verified_or_ready_for_reopen", "remain_blocked_by_missing_gate"],
            idempotency_or_hash_fields=["restore_verification_hash", "checkpoint_id"],
            recovery_posture="Verified checkpoint and reopen claims fail closed until every required gate is bound explicitly.",
            privacy_reconciliation_required=True,
            authority_safety_posture="Authority rebuild and binding revalidation are distinct mandatory gates.",
            operator_visible_effect="Restore operators can see the specific missing checkpoint gate instead of a generic not-ready badge.",
            audit_events=["BackupCreated", "RestoreDrillExecuted"],
            source_path=RECOVERY_PATH,
            source_heading_or_logical_block="Recovery checkpoint law",
            source_ref=heading_ref(RECOVERY_PATH, "Recovery checkpoint law"),
            notes=[],
            checkpoint_gate=code,
        )
        for code, description in [
            ("RESTORE_EVIDENCE_BOUND", "Checkpoint cannot claim VERIFIED without bound restore drill evidence and verification basis."),
            ("PRIVACY_RECONCILIATION_BOUND", "Checkpoint cannot reopen until privacy reconciliation evidence is bound and reopen-safe."),
            ("AUDIT_CONTINUITY_VERIFIED", "Audit continuity must be verified before reopen."),
            ("QUEUE_REBUILD_VERIFIED", "Queues must be rebuilt from durable truth before reopen."),
            ("AUTHORITY_REBUILD_VERIFIED", "Outstanding authority work must be rebuilt from durable receipts and records."),
            ("AUTHORITY_BINDING_REVALIDATED", "Authority binding lineage must be revalidated before authority-facing work resumes."),
            ("READY_FOR_REOPEN", "Typed reopen readiness must remain READY_FOR_REOPEN before normal access resumes."),
        ]
    ]
    reopen_rows = [
        control_record(
            record_type="recovery_reopen_readiness_state",
            canonical_id=f"recovery_reopen_readiness_state_{state.lower()}",
            trigger_or_entry_condition="RecoveryCheckpoint serializes its reopen readiness state after restore evaluation.",
            identity_tuple=["checkpoint_id", "reopen_readiness_state"],
            frozen_inputs=["privacy_reconciliation_contract", "audit_continuity_verified", "queue_rebuild_verified", "authority_binding_revalidation_verified"],
            state_or_outcome=f"reopen_readiness_state = {state}",
            allowed_next_actions=["stay_blocked", "quarantine", "expire", "reopen_if_ready"],
            idempotency_or_hash_fields=["checkpoint_id", "restore_verification_hash"],
            recovery_posture="Readiness state is explicit and typed; reopen never happens through generic success inference.",
            privacy_reconciliation_required=True,
            authority_safety_posture="Authority ambiguity review and binding revalidation remain explicit reopen blockers.",
            operator_visible_effect="Restore dashboards can show the exact blocker, quarantine, expiry, or ready-for-reopen state.",
            audit_events=["RestoreDrillExecuted"],
            source_path=RECOVERY_PATH,
            source_heading_or_logical_block="Recovery checkpoint law",
            source_ref=heading_ref(RECOVERY_PATH, "Recovery checkpoint law"),
            notes=[],
            reopen_readiness_state=state,
        )
        for state in REOPEN_READINESS_ENUM
    ]
    privacy_rows = [
        control_record(
            record_type="restore_privacy_reconciliation_state",
            canonical_id=f"restore_privacy_reconciliation_state_{state.lower()}",
            trigger_or_entry_condition="A restore privacy reconciliation contract evaluates resurrected data, limitations, and hold blockers.",
            identity_tuple=["checkpoint_ref", "restore_drill_ref", "privacy_reconciliation_state", "reopen_access_state"],
            frozen_inputs=["resurrected_data_posture", "compensating_re_erasure_state", "legal_hold_ref_or_null", "proof_preservation_basis_ref_or_null", "authority_ambiguity_ref_or_null", "audit_chain_continuity_state"],
            state_or_outcome=f"privacy_reconciliation_state = {state}",
            allowed_next_actions=["complete_reconciliation", "complete_compensating_re_erasure", "remain_blocked_for_legal_review"],
            idempotency_or_hash_fields=["reconciliation_contract_hash", "privacy_reconciliation_outcome_ref"],
            recovery_posture="Restore privacy posture remains durable and grouped with limitation and audit continuity evidence.",
            privacy_reconciliation_required=True,
            authority_safety_posture="Authority ambiguity blocks reopen instead of being resolved by deletion or omission.",
            operator_visible_effect="Operators can see whether restore is reconciled, compensating re-erasure is in progress, or review is blocked by holds or proof preservation.",
            audit_events=["ErasureRequested", "ErasureCompleted", "LegalHoldApplied", "LegalHoldReleased"],
            source_path=RECOVERY_PATH,
            source_heading_or_logical_block="Restore privacy reconciliation law",
            source_ref=heading_ref(RECOVERY_PATH, "Restore privacy reconciliation law"),
            notes=[],
            privacy_reconciliation_state=state,
        )
        for state in PRIVACY_RECONCILIATION_ENUM
    ]
    policy_rows = [
        control_record(
            record_type="recovery_policy",
            canonical_id="recovery_policy_queues_rebuilt_from_durable_truth_only",
            trigger_or_entry_condition="Queues or projections must be reconstructed after restore, failover, or broker loss.",
            identity_tuple=["boundary_scope", "queue_recovery_policy"],
            frozen_inputs=["outbox_truth", "inbox_truth", "manifests", "workflow_items", "audit_evidence"],
            state_or_outcome="queue_recovery_policy = QUEUES_REBUILT_FROM_DURABLE_TRUTH_ONLY",
            allowed_next_actions=["rebuild_queues_from_durable_truth", "reject_projection_as_legal_source"],
            idempotency_or_hash_fields=["checkpoint_id", "restore_verification_hash"],
            recovery_posture="Queue state is rebuildable projection, not legal source of record.",
            privacy_reconciliation_required=True,
            authority_safety_posture="Queue rebuild cannot authorize duplicate authority mutation or replay without lineage proof.",
            operator_visible_effect="Recovery runbooks can rebuild work queues deterministically from durable artifacts.",
            audit_events=["RestoreDrillExecuted", "DisasterRecoveryFailedOver", "DisasterRecoveryFailedBack"],
            source_path=RECOVERY_PATH,
            source_heading_or_logical_block="Queue and authority recovery law",
            source_ref=heading_ref(RECOVERY_PATH, "Queue and authority recovery law"),
            notes=[],
            policy_code="QUEUES_REBUILT_FROM_DURABLE_TRUTH_ONLY",
        ),
        control_record(
            record_type="recovery_policy",
            canonical_id="recovery_policy_authority_mutations_require_lineage_and_binding_revalidation",
            trigger_or_entry_condition="Outstanding authority-integrated work is resumed after restore or failover.",
            identity_tuple=["boundary_scope", "authority_recovery_policy"],
            frozen_inputs=["AuthorityIngressReceipt", "AuthorityInteractionRecord", "SubmissionRecord", "canonical_ingress_receipt_ref", "reconciliation_control_contract"],
            state_or_outcome="authority_recovery_policy = AUTHORITY_MUTATIONS_REQUIRE_LINEAGE_AND_BINDING_REVALIDATION",
            allowed_next_actions=["rebuild_outstanding_authority_work", "resume_reconciliation_from_control_contract", "block_fresh_resend_without_exact_recovery"],
            idempotency_or_hash_fields=["request_hash", "idempotency_key", "binding_lineage_ref"],
            recovery_posture="Authority recovery rebuilds outstanding transmit and reconciliation work from durable truth instead of broker replay.",
            privacy_reconciliation_required=True,
            authority_safety_posture="No-blind-resend and binding-lineage validation survive restore, reclaim, and fail-forward pressure.",
            operator_visible_effect="Authority recovery tools can point to exact persisted receipts and reconciliation packets.",
            audit_events=["AuthorityReconciliationAttempted", "AuthorityReconciliationResolved", "RestoreDrillExecuted"],
            source_path=RECOVERY_PATH,
            source_heading_or_logical_block="Queue and authority recovery law",
            source_ref=heading_ref(RECOVERY_PATH, "Queue and authority recovery law"),
            notes=[],
            policy_code="AUTHORITY_MUTATIONS_REQUIRE_LINEAGE_AND_BINDING_REVALIDATION",
        ),
        control_record(
            record_type="recovery_policy",
            canonical_id="recovery_policy_post_restore_privacy_reconciliation_required_before_reopen",
            trigger_or_entry_condition="Restore completed for an environment containing retained or previously erased restricted data.",
            identity_tuple=["checkpoint_id", "privacy_reconciliation_state", "reopen_access_state"],
            frozen_inputs=["resurrected_data_posture", "compensating_re_erasure_state", "audit_chain_continuity_state"],
            state_or_outcome="privacy_reconciliation_policy = POST_RESTORE_PRIVACY_RECONCILIATION_REQUIRED_BEFORE_REOPEN",
            allowed_next_actions=["complete_privacy_reconciliation", "remain_blocked", "complete_compensating_re_erasure_if_required"],
            idempotency_or_hash_fields=["reconciliation_contract_hash", "privacy_reconciliation_outcome_ref"],
            recovery_posture="Privacy reconciliation is part of reopen law, not a later cleanup queue.",
            privacy_reconciliation_required=True,
            authority_safety_posture="Authority ambiguity or proof-preservation conflicts block reopen instead of being hidden.",
            operator_visible_effect="Restore dashboards surface blocked legal-hold, proof-preservation, and authority-ambiguity review states.",
            audit_events=["ErasureRequested", "ErasureCompleted", "LegalHoldApplied", "LegalHoldReleased"],
            source_path=RECOVERY_PATH,
            source_heading_or_logical_block="Restore privacy reconciliation law",
            source_ref=heading_ref(RECOVERY_PATH, "Restore privacy reconciliation law"),
            notes=[],
            policy_code="POST_RESTORE_PRIVACY_RECONCILIATION_REQUIRED_BEFORE_REOPEN",
        ),
    ]
    rows = flatten(tier_rows, checkpoint_gate_rows, reopen_rows, privacy_rows, policy_rows)
    assert_required_record_fields(rows)
    return {
        "summary": make_summary(
            rows,
            extra={
                "recovery_tier_count": len(tier_rows),
                "checkpoint_gate_count": len(checkpoint_gate_rows),
                "reopen_readiness_state_count": len(reopen_rows),
                "privacy_reconciliation_state_count": len(privacy_rows),
                "policy_count": len(policy_rows),
            },
        ),
        "recovery_tier_mappings": tier_rows,
        "checkpoint_gates": checkpoint_gate_rows,
        "reopen_readiness_states": reopen_rows,
        "privacy_reconciliation_states": privacy_rows,
        "recovery_policies": policy_rows,
        "rows": rows,
    }


def resend_recovery_payload() -> dict[str, Any]:
    resend_rows = [
        control_record(
            record_type="authority_recovery_resend_rule",
            canonical_id="authority_recovery_resend_rule_auto_resend_preconditions",
            trigger_or_entry_condition="The engine considers automatic resend of a mutation-capable authority packet.",
            identity_tuple=["request_hash", "idempotency_key", "binding_lineage_ref"],
            frozen_inputs=["binding_lineage_ref", "idempotency_scope", "collision_flags", "unresolved_external_ambiguity"],
            state_or_outcome="Automatic resend of mutation-capable packets requires unchanged binding lineage, unchanged idempotency scope, zero collision flags, and low unresolved external ambiguity.",
            allowed_next_actions=["continue_if_preconditions_hold", "downgrade_to_follow_up_or_blocked_resend_posture"],
            idempotency_or_hash_fields=["request_hash", "duplicate_meaning_key", "idempotency_key", "binding_lineage_ref"],
            recovery_posture="Mutation resend is not the default recovery posture; it must still satisfy exact recovery prerequisites.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Changed binding lineage or ambiguous evidence blocks automatic resend.",
            operator_visible_effect="Operators can see whether a resend was truly legal or downgraded to read-only or blocked posture.",
            audit_events=["AuthorityRequestSent", "AuthorityReconciliationAttempted"],
            source_path=AUTHORITY_PROTOCOL_PATH,
            source_heading_or_logical_block="9.13A Reconciliation budget and escalation rule",
            source_ref=heading_ref(AUTHORITY_PROTOCOL_PATH, "9.13A Reconciliation budget and escalation rule"),
            notes=[],
            resend_legality_state="PRECONDITIONED_MUTATION_RESEND",
        ),
    ]
    resend_state_details = {
        "FOLLOW_UP_READ_ONLY": "Budget remains active; bounded read-after-write or read-after-timeout checks are still lawful without a duplicate mutation send.",
        "IDEMPOTENT_RECOVERY_ONLY": "Bytes already left the process but no provider response is durable; exact request-lineage recovery may continue without a fresh mutation packet.",
        "BLOCKED_BY_RECONCILIATION": "Automatic resend is blocked after budget exhaustion or unresolved contradictory evidence.",
        "BLOCKED_BY_ESCALATION": "Automatic resend is blocked because escalation ownership and workflow have taken over the unresolved case.",
    }
    state_rows = [
        control_record(
            record_type="authority_recovery_resend_rule",
            canonical_id=f"authority_recovery_resend_rule_{state.lower()}",
            trigger_or_entry_condition="The reconciliation control contract evaluates resend legality after a response, timeout, restore, or reclaim boundary.",
            identity_tuple=["request_hash", "idempotency_key", "resend_legality_state"],
            frozen_inputs=["reconciliation_budget_state", "next_reconciliation_at", "reconciliation_deadline_at", "resend_control_reason_codes[]", "reconciliation_control_contract"],
            state_or_outcome=resend_state_details[state],
            allowed_next_actions=["follow_up_read", "exact_idempotent_recovery", "open_or_update_workflow", "preserve_last_defensible_legal_state"],
            idempotency_or_hash_fields=["request_hash", "duplicate_meaning_key", "idempotency_key", "binding_lineage_ref"],
            recovery_posture="Restore, replay, or continuation resumes from the persisted reconciliation budget and deadline rather than resetting the clock.",
            privacy_reconciliation_required=False,
            authority_safety_posture="No blind resend is lawful after budget exhaustion, contradictory evidence, or escalation posture.",
            operator_visible_effect="Authority recovery views can show whether follow-up remained read-only, idempotent-only, or blocked pending escalation.",
            audit_events=["AuthorityReconciliationAttempted", "AuthorityReconciliationResolved", "AuthorityReconciliationEscalated"],
            source_path=AUTHORITY_PROTOCOL_PATH,
            source_heading_or_logical_block="9.13A Reconciliation budget and escalation rule",
            source_ref=heading_ref(AUTHORITY_PROTOCOL_PATH, "9.13A Reconciliation budget and escalation rule"),
            notes=[],
            resend_legality_state=state,
        )
        for state in RECONCILIATION_RESEND_STATES
    ]
    grouped_control_rows = [
        control_record(
            record_type="authority_recovery_grouped_control_rule",
            canonical_id="authority_recovery_grouped_control_rule_copy_control_packet_to_submission_and_obligation",
            trigger_or_entry_condition="An unresolved authority interaction remains pending across restore, replay, or continuation boundaries.",
            identity_tuple=["request_hash", "submission_record_id_or_null", "obligation_mirror_id_or_null"],
            frozen_inputs=["reconciliation_control_contract", "AuthorityInteractionRecord", "SubmissionRecord", "ObligationMirror"],
            state_or_outcome="The persisted reconciliation control contract must be copied onto AuthorityInteractionRecord, unresolved SubmissionRecord, and unresolved ObligationMirror.",
            allowed_next_actions=["resume_follow_up_from_persisted_budget", "reject_recomputation_from_retry_logs"],
            idempotency_or_hash_fields=["request_hash", "idempotency_key", "control_contract_hash"],
            recovery_posture="Replay, restore, and continuation reuse the grouped control packet instead of recomputing attempt budget and resend legality.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Budget exhaustion and ambiguity state cannot be reset by worker restarts or new profile defaults.",
            operator_visible_effect="Operators can inspect one grouped control packet across interaction, submission, and obligation views.",
            audit_events=["AuthorityReconciliationEscalated", "SubmissionUnknown"],
            source_path=AUTHORITY_PROTOCOL_PATH,
            source_heading_or_logical_block="9.13A Reconciliation budget and escalation rule",
            source_ref=heading_ref(AUTHORITY_PROTOCOL_PATH, "9.13A Reconciliation budget and escalation rule"),
            notes=[],
        ),
        control_record(
            record_type="authority_recovery_grouped_control_rule",
            canonical_id="authority_recovery_grouped_control_rule_restore_rebuilds_from_durable_truth",
            trigger_or_entry_condition="Restore or failover reconstructs outstanding authority-integrated workloads.",
            identity_tuple=["checkpoint_id", "environment_ref", "authority_recovery_policy"],
            frozen_inputs=["AuthorityIngressReceipt", "AuthorityInteractionRecord", "SubmissionRecord", "canonical_ingress_receipt_ref", "response_history_ids[]", "meaning_resolution_state"],
            state_or_outcome="Authority recovery rebuilds outstanding transmit and reconciliation work from persisted receipts, interaction records, submissions, and inbox truth instead of broker replay.",
            allowed_next_actions=["rebuild_outstanding_authority_work", "reuse_persisted_ingress_proof", "resume_reconciliation_from_control_contract"],
            idempotency_or_hash_fields=["request_hash", "idempotency_key", "canonical_ingress_receipt_ref"],
            recovery_posture="Outstanding unresolved authority work resumes from persisted control packets and ingress proofs.",
            privacy_reconciliation_required=True,
            authority_safety_posture="Canonical ingress receipt lineage prevents duplicate callback or poll deliveries from mutating legal state twice.",
            operator_visible_effect="Recovery tooling can show exactly which persisted authority artifacts justified resumed work.",
            audit_events=["RestoreDrillExecuted", "AuthorityReconciliationAttempted", "AuthorityReconciliationResolved"],
            source_path=DEPLOYMENT_PATH,
            source_heading_or_logical_block="5. Backup, restore, and DR rules",
            source_ref=heading_ref(DEPLOYMENT_PATH, "5. Backup, restore, and DR rules"),
            notes=[],
        ),
    ]
    rows = flatten(resend_rows, state_rows, grouped_control_rows)
    assert_required_record_fields(rows)
    return {
        "summary": make_summary(
            rows,
            extra={
                "resend_legality_state_count": len(state_rows),
                "grouped_control_rule_count": len(grouped_control_rows),
            },
        ),
        "precondition_rules": resend_rows,
        "resend_legality_rules": state_rows,
        "grouped_control_rules": grouped_control_rows,
        "rows": rows,
    }


def release_gate_payload() -> dict[str, Any]:
    candidate_rows = [
        control_record(
            record_type="release_candidate_identity_field",
            canonical_id=f"release_candidate_identity_field_{field.lower()}",
            trigger_or_entry_condition="A promotion candidate freezes one release candidate identity contract.",
            identity_tuple=["candidate_identity_hash", "candidate_environment_ref", "build_artifact_ref"],
            frozen_inputs=RELEASE_CANDIDATE_REQUIRED,
            state_or_outcome=f"ReleaseCandidateIdentityContract requires `{field}`.",
            allowed_next_actions=["compute_candidate_identity_hash", "bind_release_evidence_to_candidate"],
            idempotency_or_hash_fields=["candidate_identity_hash", "artifact_digest", "schema_bundle_hash", "config_bundle_hash"],
            recovery_posture="Restore drills and release evidence remain bound to the exact candidate tuple they verified.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Provider-profile and client-window drift cannot silently reuse green evidence from a different candidate.",
            operator_visible_effect="Release tooling can inspect every required field that contributes to exact candidate binding.",
            audit_events=["BuildAttested", "ReleaseCanaryStarted", "ReleasePromoted"],
            source_path=RELEASE_PATH,
            source_heading_or_logical_block="1. Governing candidate identity model",
            source_ref=heading_ref(RELEASE_PATH, "1. Governing candidate identity model"),
            notes=[],
            candidate_identity_field=field,
        )
        for field in RELEASE_CANDIDATE_REQUIRED
    ]
    compatibility_rows = [
        control_record(
            record_type="release_compatibility_gate_field",
            canonical_id=f"release_compatibility_gate_field_{field.lower()}",
            trigger_or_entry_condition="A blocking release gate claims schema, replay, restore, and client compatibility safety.",
            identity_tuple=["candidate_identity_hash", "compatibility_gate_hash", "compatibility_window_ref"],
            frozen_inputs=COMPATIBILITY_GATE_REQUIRED,
            state_or_outcome=f"SchemaBundleCompatibilityGateContract requires `{field}`.",
            allowed_next_actions=["compute_compatibility_gate_hash", "bind_release_verification_manifest_rows", "block_release_if_reason_codes_present"],
            idempotency_or_hash_fields=["compatibility_gate_hash", "candidate_identity_hash", "schema_bundle_hash"],
            recovery_posture="Rollback and fail-forward posture remains reader-window-bound as part of the same compatibility tuple.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Reader-window, restore, replay, and native-client compatibility remain one blocking boundary.",
            operator_visible_effect="Release reviewers can point to the exact compatibility field that blocked promotion or rollback.",
            audit_events=["SchemaMigrationPlanned", "SchemaMigrationApplied", "SchemaMigrationVerified", "ReleaseRolledBack"],
            source_path=RELEASE_PATH,
            source_heading_or_logical_block="2. Contract boundary",
            source_ref=heading_ref(RELEASE_PATH, "2. Contract boundary"),
            notes=[],
            compatibility_gate_field=field,
        )
        for field in COMPATIBILITY_GATE_REQUIRED
    ]
    artifact_binding_rows = [
        control_record(
            record_type="release_evidence_binding",
            canonical_id=f"release_evidence_binding_{artifact.lower()}",
            trigger_or_entry_condition="Release evidence claims to describe one promotion candidate or blocking gate.",
            identity_tuple=["candidate_identity_hash", "compatibility_gate_hash_or_null", "artifact_kind"],
            frozen_inputs=["candidate_identity_contract", "candidate_identity_hash", "compatibility_gate_hash_or_null"],
            state_or_outcome=f"{artifact} must bind the exact candidate identity and, where applicable, the shared compatibility gate hash.",
            allowed_next_actions=["reject_mixed_candidate_evidence", "assemble_release_verification_manifest"],
            idempotency_or_hash_fields=["candidate_identity_hash", "compatibility_gate_hash_or_null"],
            recovery_posture="Restore drill, canary, and client compatibility evidence stay attached to the candidate they actually verified.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Authority sandbox coverage remains exact to provider-profile and operation-family scope.",
            operator_visible_effect="Promotion reviewers can see which first-class evidence artifact satisfied or blocked each gate.",
            audit_events=["BuildAttested", "ReleaseCanaryStarted", "ReleasePromoted"],
            source_path=RELEASE_PATH,
            source_heading_or_logical_block="2. Contract boundary",
            source_ref=heading_ref(RELEASE_PATH, "2. Contract boundary"),
            notes=[],
            evidence_artifact=artifact,
        )
        for artifact in [
            "VerificationSuiteResult",
            "GateAdmissibilityRecord",
            "CanaryHealthSummary",
            "RestoreDrillResult",
            "ClientCompatibilityMatrix",
            "ReleaseVerificationManifest",
            "DeploymentRelease",
        ]
    ]
    admissibility_rows = [
        control_record(
            record_type="release_admissibility_requirement",
            canonical_id=f"release_admissibility_requirement_{idx}",
            trigger_or_entry_condition="A blocking release gate reports GREEN or APPROVED posture.",
            identity_tuple=["candidate_identity_hash", "compatibility_gate_hash", "gate_result_ref"],
            frozen_inputs=["candidate_identity_contract", "freshness_window", "rerun_scope", "quarantine_posture", "manual_waiver_posture"],
            state_or_outcome=statement,
            allowed_next_actions=["admit_green_gate", "block_release_if_requirement_fails"],
            idempotency_or_hash_fields=["candidate_identity_hash", "compatibility_gate_hash"],
            recovery_posture="Admissibility is replayable from durable evidence rather than CI dashboards or waiver narratives.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Stale, mixed-scope, quarantined, or manually waived evidence cannot satisfy a blocking green gate.",
            operator_visible_effect="Release reviewers can see which admissibility prerequisite blocked promotion.",
            audit_events=["BuildAttested", "ReleaseCanaryStarted", "ReleasePromoted"],
            source_path=RELEASE_PATH,
            source_heading_or_logical_block="3. Admissibility boundary",
            source_ref=heading_ref(RELEASE_PATH, "3. Admissibility boundary"),
            notes=[],
        )
        for idx, statement in enumerate(
            [
                "Gate result is bound to the exact candidate tuple.",
                "Freshness remains valid for the candidate being promoted.",
                "Rerun scope remains identical to the blocking suite scope.",
                "Quarantine posture is NONE.",
                "Manual waiver posture is NONE.",
            ],
            start=1,
        )
    ]
    eliminated_rows = [
        control_record(
            record_type="release_eliminated_failure_mode",
            canonical_id=f"release_eliminated_failure_mode_{idx}",
            trigger_or_entry_condition="Promotion evidence claims that candidate binding and compatibility gates eliminate a known failure mode.",
            identity_tuple=["candidate_identity_hash", "compatibility_gate_hash_or_null"],
            frozen_inputs=["release_candidate_identity_contract", "schema_bundle_compatibility_gate_contract", "manifest_assembly_contract"],
            state_or_outcome=statement,
            allowed_next_actions=["reject_drifted_evidence", "preserve_exact_gate_binding"],
            idempotency_or_hash_fields=["candidate_identity_hash", "compatibility_gate_hash_or_null"],
            recovery_posture="Eliminated failure modes stay covered by durable hashes and first-class evidence refs.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Sandbox, migration, reader-window, and native-client compatibility drift cannot silently remain green.",
            operator_visible_effect="Release reviewers can point to the exact failure class this governance pack blocks.",
            audit_events=["BuildAttested", "ReleasePromoted", "ReleaseRolledBack"],
            source_path=RELEASE_PATH,
            source_heading_or_logical_block="4. Eliminated failure modes",
            source_ref=heading_ref(RELEASE_PATH, "4. Eliminated failure modes"),
            notes=[],
        )
        for idx, statement in enumerate(
            [
                "Mixed-candidate gate reuse across different build digests.",
                "Migration-sensitive gates reusing results from the wrong migration plan.",
                "Authority sandbox evidence drifting across provider-profile sets.",
                "Authority sandbox coverage drifting across exercised operation-family sets or controlled-edge case matrices.",
                "Operator-client gates reusing the wrong compatibility window.",
                "Schema-compatibility evidence surviving reader-window changes or closure.",
                "Server-side schema safety remaining green while native supported-client persistence is blocked.",
                "Restore-drill or canary evidence swapped in from a different release candidate.",
                "Manifest gate rows pointing at mixed-candidate evidence while the manifest appears green overall.",
                "Manifest gate rows stitched in a different order or with different result/admissibility refs.",
                "Green operator-client, canary, or restore gates serialized without companion first-class evidence refs.",
                "Approval, deployment, or supersession posture inferred from logs instead of one frozen assembly contract.",
                "Candidate hashes drifting because ordered arrays were not canonicalized before hashing.",
                "Schema-compatibility gates staying candidate-bound while no longer reader-window-bound.",
            ],
            start=1,
        )
    ]
    enforcement_rows = [
        control_record(
            record_type="release_enforcement_surface",
            canonical_id=f"release_enforcement_surface_{idx}",
            trigger_or_entry_condition="Promotion governance is validated or forensic-checked.",
            identity_tuple=["enforcement_surface"],
            frozen_inputs=["candidate_identity_hash", "compatibility_gate_hash"],
            state_or_outcome=f"Machine enforcement surface: `{surface}`.",
            allowed_next_actions=["validate_contract", "forensic_guard_release_evidence"],
            idempotency_or_hash_fields=["candidate_identity_hash", "compatibility_gate_hash"],
            recovery_posture="Enforcement remains deterministic and reproducible from local schemas and validators.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Release evidence must fail closed before promotion rather than relying on human memory.",
            operator_visible_effect="Reviewers know which schema or validator enforces each promotion boundary.",
            audit_events=["BuildAttested"],
            source_path=RELEASE_PATH,
            source_heading_or_logical_block="5. Enforcement",
            source_ref=heading_ref(RELEASE_PATH, "5. Enforcement"),
            notes=[],
            enforcement_surface=surface,
        )
        for idx, surface in enumerate(
            [
                "schemas/release_candidate_identity_contract.schema.json",
                "schemas/schema_bundle_compatibility_gate_contract.schema.json",
                "schemas/authority_sandbox_coverage_contract.schema.json",
                "schemas/release_verification_manifest_assembly_contract.schema.json",
                "schemas/release_verification_manifest.schema.json",
                "scripts/validate_contracts.py",
                "tools/forensic_contract_guard.py",
            ],
            start=1,
        )
    ]
    rows = flatten(candidate_rows, compatibility_rows, artifact_binding_rows, admissibility_rows, eliminated_rows, enforcement_rows)
    assert_required_record_fields(rows)
    return {
        "summary": make_summary(
            rows,
            extra={
                "candidate_identity_field_count": len(candidate_rows),
                "compatibility_gate_field_count": len(compatibility_rows),
                "evidence_binding_count": len(artifact_binding_rows),
                "admissibility_requirement_count": len(admissibility_rows),
                "eliminated_failure_mode_count": len(eliminated_rows),
            },
        ),
        "candidate_identity_fields": candidate_rows,
        "compatibility_gate_fields": compatibility_rows,
        "evidence_bindings": artifact_binding_rows,
        "admissibility_requirements": admissibility_rows,
        "eliminated_failure_modes": eliminated_rows,
        "enforcement_surfaces": enforcement_rows,
        "rows": rows,
    }


def rollback_payload() -> dict[str, Any]:
    rollback_rows = [
        control_record(
            record_type="rollback_boundary_state",
            canonical_id=f"rollback_boundary_state_{state.lower()}",
            trigger_or_entry_condition="A DeploymentRelease or compatibility gate evaluates rollback safety.",
            identity_tuple=["release_id", "rollback_boundary_state", "reader_window_state"],
            frozen_inputs=["schema_bundle_compatibility_gate_contract", "schema_reader_window_contract", "supported_client_window_ref"],
            state_or_outcome=f"rollback_boundary_state = {state}",
            allowed_next_actions=["allow_rollback_if_safe", "force_fail_forward_if_not_safe"],
            idempotency_or_hash_fields=["compatibility_gate_hash", "candidate_identity_hash"],
            recovery_posture="Rollback legality remains a reader-window and client-window governed boundary.",
            privacy_reconciliation_required=False,
            authority_safety_posture="Rollback never deletes or rewrites legal authority truth, audit history, or submitted artifacts.",
            operator_visible_effect="Release operators can see whether a release remained rollback-safe or crossed into fail-forward-only posture.",
            audit_events=["ReleaseRolledBack", "ReleasePromoted"],
            source_path=RECOVERY_PATH,
            source_heading_or_logical_block="Rollback and fail-forward law",
            source_ref=heading_ref(RECOVERY_PATH, "Rollback and fail-forward law"),
            notes=[],
            rollback_boundary_state=state,
        )
        for state in ROLLBACK_BOUNDARY_ENUM
    ]
    rollout_rows = [
        control_record(
            record_type="rollout_strategy_state_alignment",
            canonical_id=f"rollout_strategy_state_alignment_{strategy.lower()}_{state.lower()}",
            trigger_or_entry_condition="DeploymentRelease serializes a rollout strategy and rollout state combination.",
            identity_tuple=["release_id", "rollout_strategy", "rollout_state"],
            frozen_inputs=["rollback_boundary_state", "compensating_release_id_or_null", "fail_forward_owner_ref_or_null", "rollback_runbook_ref", "fail_forward_runbook_ref"],
            state_or_outcome=f"{strategy} / {state}",
            allowed_next_actions=["validate_alignment", "reject_illegal_state_transition"],
            idempotency_or_hash_fields=["candidate_identity_hash", "release_id"],
            recovery_posture="Rollout strategy and state remain semantically aligned with rollback and fail-forward posture.",
            privacy_reconciliation_required=False,
            authority_safety_posture="FAILED_FORWARD requires compensating release and owner; ROLLED_BACK is unlawful when FAIL_FORWARD_ONLY.",
            operator_visible_effect="Release dashboards can distinguish canary abort, rollback, baseline pin, and compensating fail-forward posture.",
            audit_events=["ReleaseCanaryStarted", "ReleasePromoted", "ReleaseRolledBack"],
            source_path=DEPLOYMENT_PATH,
            source_heading_or_logical_block="6. Rollout, rollback, and fail-forward posture",
            source_ref=heading_ref(DEPLOYMENT_PATH, "6. Rollout, rollback, and fail-forward posture"),
            notes=[],
            rollout_strategy=strategy,
            rollout_state=state,
        )
        for strategy, state in [
            ("STANDARD_CANARY", "CANARY"),
            ("STANDARD_CANARY", "ABORTED"),
            ("PIN_BASELINE", "PINNED"),
            ("FAIL_FORWARD_COMPENSATING", "FAILED_FORWARD"),
            ("STANDARD_CANARY", "ROLLED_BACK"),
            ("EMERGENCY_PROMOTE", "PROMOTED"),
        ]
    ]
    restore_rows = [
        control_record(
            record_type="restore_drill_requirement",
            canonical_id=f"restore_drill_requirement_{idx}",
            trigger_or_entry_condition="Promotion, DR, or reopen logic claims restore capability or successful checkpoint verification.",
            identity_tuple=["checkpoint_id", "restore_drill_ref", "release_verification_manifest_ref_or_null"],
            frozen_inputs=["restore_checkpoint_ref", "release_candidate_identity_contract", "schema_reader_window_contract", "checkpoint_inventory_ref", "audit_continuity_verified", "queue_rebuild_verified", "authority_binding_revalidation_verified"],
            state_or_outcome=statement,
            allowed_next_actions=["prove_restore_capability", "bind_restore_evidence_to_release_or_checkpoint"],
            idempotency_or_hash_fields=["restore_verification_hash", "candidate_identity_hash"],
            recovery_posture="Restore claims remain tied to exact checkpoints, candidate tuples, and reopen gates.",
            privacy_reconciliation_required=True,
            authority_safety_posture="Restore of authority-integrated workloads must rebuild outstanding work from durable receipts and control packets.",
            operator_visible_effect="Release and DR reviewers can inspect the exact restore proof used for promotion or reopen.",
            audit_events=["RestoreDrillExecuted", "BackupCreated", "DisasterRecoveryFailedOver", "DisasterRecoveryFailedBack"],
            source_path=DEPLOYMENT_PATH,
            source_heading_or_logical_block="5. Backup, restore, and DR rules",
            source_ref=heading_ref(DEPLOYMENT_PATH, "5. Backup, restore, and DR rules"),
            notes=[],
        )
        for idx, statement in enumerate(
            [
                "Restore drills verify control store, audit store, object store, and secret metadata recovery.",
                "Promotion or DR restore drills record the exact checkpoint, outcome, and verification basis through RecoveryCheckpoint, RestoreDrillResult, and ReleaseVerificationManifest.",
                "Checkpoint cannot claim VERIFIED without bound restore evidence, privacy reconciliation, audit continuity, queue rebuild verification, authority rebuild, and binding revalidation.",
                "Read-side rebuild or cache repair replays persisted manifests, workflow items, gate records, authority records, receipts, and audit evidence rather than copying projection tables back into truth.",
                "Restore of authority-integrated workloads rebuilds outstanding transmit and reconciliation work from persisted AuthorityIngressReceipt, AuthorityInteractionRecord, SubmissionRecord, and inbox truth.",
                "Restore of previously erased data triggers privacy reconciliation before normal user access reopens.",
                "Failover and failback remain auditable events with explicit operator ownership.",
            ],
            start=1,
        )
    ]
    invariant_rows = [
        control_record(
            record_type="release_resilience_invariant",
            canonical_id=f"release_resilience_invariant_{idx}",
            trigger_or_entry_condition="The release and resilience control plane validates its non-negotiable invariants.",
            identity_tuple=["environment_ref", "release_or_checkpoint_scope"],
            frozen_inputs=["DeploymentRelease", "ReleaseVerificationManifest", "RecoveryCheckpoint", "RestorePrivacyReconciliationContract"],
            state_or_outcome=statement,
            allowed_next_actions=["reject_invalid_promotion_or_restore_claim"],
            idempotency_or_hash_fields=["candidate_identity_hash", "compatibility_gate_hash", "checkpoint_id_or_null"],
            recovery_posture="Invariants remain fail-closed guards for promotion, rollback, restore, and fail-forward.",
            privacy_reconciliation_required=True,
            authority_safety_posture="Invariants prevent rollback or restore from obscuring already-persisted legal evidence.",
            operator_visible_effect="SRE and release teams can audit whether one invariant blocked a rollout, reopen, or restore claim.",
            audit_events=["ReleasePromoted", "ReleaseRolledBack", "RestoreDrillExecuted", "DisasterRecoveryFailedOver", "DisasterRecoveryFailedBack"],
            source_path=DEPLOYMENT_PATH,
            source_heading_or_logical_block="8. Release and resilience invariants",
            source_ref=heading_ref(DEPLOYMENT_PATH, "8. Release and resilience invariants"),
            notes=[],
        )
        for idx, statement in enumerate(
            [
                "No production promotion without a recorded DeploymentRelease.",
                "No migration without a reversible or fail-forward-compatible plan.",
                "No queue dependency that makes durable truth unrecoverable after broker loss.",
                "No restore declared successful until audit continuity and privacy reconciliation are verified.",
                "No rollback that rewrites or obscures already-persisted legal/compliance evidence.",
                "No desktop rollout without a documented compatibility window and emergency disable or pin path.",
            ],
            start=1,
        )
    ]
    rows = flatten(rollback_rows, rollout_rows, restore_rows, invariant_rows)
    assert_required_record_fields(rows)
    return {
        "summary": make_summary(
            rows,
            extra={
                "rollback_boundary_state_count": len(rollback_rows),
                "rollout_alignment_count": len(rollout_rows),
                "restore_drill_requirement_count": len(restore_rows),
                "resilience_invariant_count": len(invariant_rows),
            },
        ),
        "rollback_boundary_states": rollback_rows,
        "rollout_strategy_state_alignment": rollout_rows,
        "restore_drill_requirements": restore_rows,
        "resilience_invariants": invariant_rows,
        "rows": rows,
    }


def build_outputs() -> dict[str, Any]:
    source_assertions()

    artifact_rows = artifact_inventory_rows()
    assert_required_record_fields(artifact_rows)
    explicit_gaps = [
        {
            "gap_id": "manifest_lineage_trace_schema_missing",
            "severity": "medium",
            "description": "ManifestLineageTrace is normatively required by prose but no dedicated schema artifact exists in the current corpus.",
            "source_ref": heading_ref(MANIFEST_BRANCH_PATH, "Explorer Truth"),
        },
        {
            "gap_id": "legal_claim_outcomes_prose_only",
            "severity": "medium",
            "description": "Legal start-claim outcomes are prose-defined but are not mirrored as an enum on the manifest_start_claim schema.",
            "source_ref": heading_ref(MANIFEST_START_CLAIM_PATH, "2. Legal claim outcomes"),
        },
        {
            "gap_id": "branch_reason_codes_prose_only",
            "severity": "medium",
            "description": "Branch reason codes are contractually required in prose but no dedicated schema-backed enum was found for manifest_branch_decision.",
            "source_ref": heading_ref(MANIFEST_BRANCH_PATH, "Typed Branch Reasons"),
        },
        {
            "gap_id": "tenant_specific_unattended_defaults_not_canonicalized",
            "severity": "medium",
            "description": "The corpus defines the unattended policy value domain and required stage families, but does not publish one canonical tenant-default stage/value assignment matrix.",
            "source_ref": heading_ref(NIGHTLY_AUTOPILOT_PATH, "6.1 Matrix requirement"),
        },
        {
            "gap_id": "shared_operating_contract_reference_missing_for_pc_0015",
            "severity": "low",
            "description": "pc_0015 references ../shared_operating_contract_0014_to_0021.md, but no such file exists under PROMPT/ at generation time.",
            "source_ref": line_ref(Path("/Users/test/Code/taxat_/PROMPT/CARDS/pc_0015.md"), find_line_containing(Path("/Users/test/Code/taxat_/PROMPT/CARDS/pc_0015.md"), "shared_operating_contract_0014_to_0021.md"), "missing_shared_contract_reference"),
        },
    ]
    artifact_inventory = {
        "summary": make_summary(artifact_rows, extra={"artifact_count": len(artifact_rows), "explicit_gap_count": len(explicit_gaps)}),
        "artifacts": artifact_rows,
        "explicit_gaps": explicit_gaps,
        "rows": artifact_rows,
    }

    replay_class_matrix = replay_class_and_precondition_payload()
    replay_comparison_matrix = replay_comparison_and_attestation_payload()
    claim_branch_matrix = claim_branch_payload()
    nightly_selection_matrix = nightly_selection_payload()
    nightly_policy_matrix = nightly_policy_payload()
    recovery_matrix = recovery_checkpoint_payload()
    resend_matrix = resend_recovery_payload()
    release_gate_matrix = release_gate_payload()
    rollback_matrix = rollback_payload()

    docs = render_docs(
        artifact_inventory,
        replay_class_matrix,
        replay_comparison_matrix,
        claim_branch_matrix,
        nightly_selection_matrix,
        nightly_policy_matrix,
        recovery_matrix,
        resend_matrix,
        release_gate_matrix,
        rollback_matrix,
    )
    mermaids = render_mermaids()

    return {
        "artifact_inventory": artifact_inventory,
        "replay_class_matrix": replay_class_matrix,
        "replay_comparison_matrix": replay_comparison_matrix,
        "claim_branch_matrix": claim_branch_matrix,
        "nightly_selection_matrix": nightly_selection_matrix,
        "nightly_policy_matrix": nightly_policy_matrix,
        "recovery_matrix": recovery_matrix,
        "resend_matrix": resend_matrix,
        "release_gate_matrix": release_gate_matrix,
        "rollback_matrix": rollback_matrix,
        "docs": docs,
        "mermaids": mermaids,
    }


def render_docs(
    artifact_inventory: dict[str, Any],
    replay_class_matrix: dict[str, Any],
    replay_comparison_matrix: dict[str, Any],
    claim_branch_matrix: dict[str, Any],
    nightly_selection_matrix: dict[str, Any],
    nightly_policy_matrix: dict[str, Any],
    recovery_matrix: dict[str, Any],
    resend_matrix: dict[str, Any],
    release_gate_matrix: dict[str, Any],
    rollback_matrix: dict[str, Any],
) -> tuple[str, str]:
    lifecycle_lines = [
        "# Replay, Recovery, Nightly, and Release Governance",
        "",
        "## Pack Summary",
        "",
        f"- Control-plane artifacts: {artifact_inventory['summary']['artifact_count']}",
        f"- Replay rows: {replay_class_matrix['summary']['row_count'] + replay_comparison_matrix['summary']['row_count']}",
        f"- Claim and branch rows: {claim_branch_matrix['summary']['row_count']}",
        f"- Nightly selection rows: {nightly_selection_matrix['summary']['row_count']}",
        f"- Nightly unattended-policy rows: {nightly_policy_matrix['summary']['row_count']}",
        f"- Recovery rows: {recovery_matrix['summary']['row_count']}",
        f"- Authority resend and recovery rows: {resend_matrix['summary']['row_count']}",
        f"- Release and rollback rows: {release_gate_matrix['summary']['row_count'] + rollback_matrix['summary']['row_count']}",
        "",
        "## Control-Plane Artifact Inventory",
        "",
    ]
    lifecycle_lines.extend(
        render_table(
            ["artifact_name", "state_or_outcome", "recovery_posture", "authority_safety_posture", "source_ref"],
            artifact_inventory["artifacts"],
        )
    )
    lifecycle_lines.extend(
        [
            "",
            "## Replay Taxonomy",
            "",
        ]
    )
    lifecycle_lines.extend(
        render_table(
            ["replay_class", "state_or_outcome", "mutation_posture", "analysis_only", "source_ref"],
            replay_class_matrix["replay_classes"],
        )
    )
    lifecycle_lines.extend(
        [
            "",
            "### Exact Replay Preconditions",
            "",
        ]
    )
    lifecycle_lines.extend(
        render_table(
            ["precondition_code", "state_or_outcome", "allowed_next_actions", "source_ref"],
            replay_class_matrix["exact_replay_preconditions"],
        )
    )
    lifecycle_lines.extend(
        [
            "",
            "## Manifest Claim and Branch Control",
            "",
        ]
    )
    lifecycle_lines.extend(
        render_table(
            ["claim_outcome", "state_or_outcome", "projected_claim_state", "source_ref"],
            claim_branch_matrix["claim_outcomes"],
        )
    )
    lifecycle_lines.extend(
        [
            "",
            "### Branch Actions",
            "",
        ]
    )
    lifecycle_lines.extend(
        render_table(
            ["branch_action", "state_or_outcome", "recovery_posture", "source_ref"],
            claim_branch_matrix["branch_actions"],
        )
    )
    lifecycle_lines.extend(
        [
            "",
            "### Branch Reason Codes",
            "",
        ]
    )
    lifecycle_lines.extend(
        render_table(
            ["branch_reason_code", "state_or_outcome", "authority_safety_posture", "source_ref"],
            claim_branch_matrix["branch_reason_codes"],
        )
    )
    lifecycle_lines.extend(
        [
            "",
            "## Nightly Selection Model",
            "",
        ]
    )
    lifecycle_lines.extend(
        render_table(
            ["selection_disposition", "state_or_outcome", "recovery_posture", "source_ref"],
            nightly_selection_matrix["selection_dispositions"],
        )
    )
    lifecycle_lines.extend(
        [
            "",
            "### Nightly Outcome Buckets",
            "",
        ]
    )
    lifecycle_lines.extend(
        render_table(
            ["outcome_bucket", "state_or_outcome", "source_ref"],
            nightly_selection_matrix["quiescence_outcome_buckets"],
        )
    )
    lifecycle_lines.extend(
        [
            "",
            "## Recovery and Reopen Governance",
            "",
        ]
    )
    lifecycle_lines.extend(
        render_table(
            ["protected_workload_class", "recovery_tier_class", "rpo_class", "rto_class", "source_ref"],
            recovery_matrix["recovery_tier_mappings"],
        )
    )
    lifecycle_lines.extend(
        [
            "",
            "## Release Promotion and Compatibility",
            "",
        ]
    )
    lifecycle_lines.extend(
        render_table(
            ["evidence_artifact", "state_or_outcome", "source_ref"],
            release_gate_matrix["evidence_bindings"],
        )
    )
    lifecycle_lines.extend(
        [
            "",
            "## Explicit Gaps",
            "",
        ]
    )
    for gap in artifact_inventory["explicit_gaps"]:
        lifecycle_lines.append(f"- `{gap['gap_id']}` ({gap['severity']}): {gap['description']} [{gap['source_ref']}]")

    failure_lines = [
        "# Control-Plane Failure and Promotion Rules",
        "",
        "## No-Blind-Resend and Authority Recovery",
        "",
    ]
    failure_lines.extend(
        render_table(
            ["resend_legality_state", "state_or_outcome", "allowed_next_actions", "source_ref"],
            resend_matrix["resend_legality_rules"],
        )
    )
    failure_lines.extend(
        [
            "",
            "## Recovery Reopen Blockers",
            "",
        ]
    )
    failure_lines.extend(
        render_table(
            ["reopen_readiness_state", "state_or_outcome", "source_ref"],
            recovery_matrix["reopen_readiness_states"],
        )
    )
    failure_lines.extend(
        [
            "",
            "## Restore Privacy Reconciliation",
            "",
        ]
    )
    failure_lines.extend(
        render_table(
            ["privacy_reconciliation_state", "state_or_outcome", "source_ref"],
            recovery_matrix["privacy_reconciliation_states"],
        )
    )
    failure_lines.extend(
        [
            "",
            "## Nightly Hard Boundaries",
            "",
        ]
    )
    failure_lines.extend(
        render_table(
            ["hard_boundary", "state_or_outcome", "authority_safety_posture", "source_ref"],
            nightly_policy_matrix["hard_boundaries"],
        )
    )
    failure_lines.extend(
        [
            "",
            "## Promotion Admissibility",
            "",
        ]
    )
    failure_lines.extend(
        render_table(
            ["state_or_outcome", "source_ref"],
            release_gate_matrix["admissibility_requirements"],
        )
    )
    failure_lines.extend(
        [
            "",
            "## Rollback and Fail-Forward Boundary",
            "",
        ]
    )
    failure_lines.extend(
        render_table(
            ["rollback_boundary_state", "state_or_outcome", "source_ref"],
            rollback_matrix["rollback_boundary_states"],
        )
    )
    failure_lines.extend(
        [
            "",
            "### Rollout Strategy and State Alignment",
            "",
        ]
    )
    failure_lines.extend(
        render_table(
            ["rollout_strategy", "rollout_state", "state_or_outcome", "source_ref"],
            rollback_matrix["rollout_strategy_state_alignment"],
        )
    )
    failure_lines.extend(
        [
            "",
            "## Release and Resilience Invariants",
            "",
        ]
    )
    failure_lines.extend(
        render_table(
            ["state_or_outcome", "source_ref"],
            rollback_matrix["resilience_invariants"],
        )
    )
    return ("\n".join(lifecycle_lines), "\n".join(failure_lines))


def render_mermaids() -> tuple[str, str]:
    lifecycle = "\n".join(
        [
            "flowchart LR",
            '  A["Sealed Manifest"] --> B["Start Claim or Reuse"]',
            '  B --> C["Branch Selection"]',
            '  C --> D["Freeze and Seal Boundary"]',
            '  D --> E["Live Execution"]',
            '  D --> F["Replay Child"]',
            '  E --> G["Authority Interaction and Reconciliation"]',
            '  E --> H["Nightly Batch Selection"]',
            '  H --> I["Unattended Policy Matrix"]',
            '  I --> J["Quiescent Outcome Bucket"]',
            '  G --> K["Recovery Checkpoint or Reclaim"]',
            '  F --> L["Replay Attestation"]',
            '  K --> M["Restore Privacy Reconciliation"]',
            '  M --> N["Ready for Reopen or Remain Blocked"]',
            '  J --> O["OperatorMorningDigest"]',
            '  N --> P["Release Verification Manifest"]',
            '  P --> Q["DeploymentRelease"]',
            '  Q --> R["Rollback Allowed"]',
            '  Q --> S["Fail Forward Only"]',
            "",
        ]
    )
    topology = "\n".join(
        [
            "flowchart TB",
            '  subgraph Nightly["Nightly Control Plane"]',
            '    A["NightlyBatchIdentityContract"] --> B["NightlyBatchRun"]',
            '    B --> C["Selection Entries"]',
            '    C --> D["Shard Plan"]',
            '    D --> E["Outcome Buckets"]',
            "  end",
            '  subgraph Recovery["Recovery and Authority Safety"]',
            '    F["RecoveryCheckpoint"] --> G["RestorePrivacyReconciliationContract"]',
            '    G --> H["Reopen Readiness"]',
            '    I["AuthorityInteractionRecord"] --> J["Reconciliation Control Contract"]',
            '    J --> K["No Blind Resend Boundary"]',
            "  end",
            '  subgraph Release["Release Promotion"]',
            '    L["ReleaseCandidateIdentityContract"] --> M["SchemaBundleCompatibilityGateContract"]',
            '    M --> N["ReleaseVerificationManifest"]',
            '    N --> O["DeploymentRelease"]',
            '    O --> P["Rollback Allowed"]',
            '    O --> Q["Fail Forward Only"]',
            "  end",
            '  B --> F',
            '  E --> N',
            '  H --> N',
            '  K --> N',
            "",
        ]
    )
    return lifecycle, topology


def write_outputs(outputs: dict[str, Any]) -> None:
    json_write(ARTIFACT_INVENTORY_PATH, outputs["artifact_inventory"])
    json_write(REPLAY_CLASS_MATRIX_PATH, outputs["replay_class_matrix"])
    json_write(REPLAY_COMPARISON_MATRIX_PATH, outputs["replay_comparison_matrix"])
    json_write(CLAIM_BRANCH_MATRIX_PATH, outputs["claim_branch_matrix"])
    json_write(NIGHTLY_SELECTION_MATRIX_PATH, outputs["nightly_selection_matrix"])
    json_write(NIGHTLY_POLICY_MATRIX_PATH, outputs["nightly_policy_matrix"])
    json_write(RECOVERY_REOPEN_MATRIX_PATH, outputs["recovery_matrix"])
    json_write(RESEND_RECOVERY_MATRIX_PATH, outputs["resend_matrix"])
    json_write(RELEASE_GATE_MATRIX_PATH, outputs["release_gate_matrix"])
    json_write(ROLLBACK_MATRIX_PATH, outputs["rollback_matrix"])

    lifecycle_doc, failure_doc = outputs["docs"]
    text_write(REQUIREMENTS_DOC_PATH, lifecycle_doc + "\n")
    text_write(FAILURE_DOC_PATH, failure_doc + "\n")

    lifecycle_mermaid, topology_mermaid = outputs["mermaids"]
    text_write(LIFECYCLE_MERMAID_PATH, lifecycle_mermaid)
    text_write(TOPOLOGY_MERMAID_PATH, topology_mermaid)


def main() -> int:
    outputs = build_outputs()
    write_outputs(outputs)
    summary = {
        "status": "PASS",
        "artifact_count": outputs["artifact_inventory"]["summary"]["artifact_count"],
        "replay_row_count": outputs["replay_class_matrix"]["summary"]["row_count"] + outputs["replay_comparison_matrix"]["summary"]["row_count"],
        "claim_branch_row_count": outputs["claim_branch_matrix"]["summary"]["row_count"],
        "nightly_row_count": outputs["nightly_selection_matrix"]["summary"]["row_count"] + outputs["nightly_policy_matrix"]["summary"]["row_count"],
        "recovery_row_count": outputs["recovery_matrix"]["summary"]["row_count"] + outputs["resend_matrix"]["summary"]["row_count"],
        "release_row_count": outputs["release_gate_matrix"]["summary"]["row_count"] + outputs["rollback_matrix"]["summary"]["row_count"],
        "explicit_gap_count": outputs["artifact_inventory"]["summary"]["explicit_gap_count"],
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
