#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from textwrap import dedent
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[2]
ALGORITHM_DIR = ROOT / "Algorithm"
SCHEMAS_DIR = ALGORITHM_DIR / "schemas"
DATA_ANALYSIS_DIR = ROOT / "data" / "analysis"
DOCS_ANALYSIS_DIR = ROOT / "docs" / "analysis"
DIAGRAMS_ANALYSIS_DIR = ROOT / "diagrams" / "analysis"
PROTOTYPE_DIR = ROOT / "prototypes" / "analysis" / "failure_ops_contract_atlas"

OBSERVABILITY_PATH = ALGORITHM_DIR / "observability_and_audit_contract.md"
RETENTION_OBSERVABILITY_PATH = ALGORITHM_DIR / "retention_error_and_observability_contract.md"
ERROR_MODEL_PATH = ALGORITHM_DIR / "error_model_and_remediation_model.md"
FAILURE_DASHBOARD_PATH = ALGORITHM_DIR / "failure_lifecycle_dashboard_and_lineage_contract.md"
FAILURE_OWNERSHIP_PATH = ALGORITHM_DIR / "failure_resolution_ownership_and_closure_contract.md"
PROVENANCE_PATH = ALGORITHM_DIR / "provenance_graph_semantics.md"
FRONTEND_LAW_PATH = ALGORITHM_DIR / "frontend_shell_and_interaction_law.md"
GOVERNANCE_PATH = ALGORITHM_DIR / "admin_governance_console_architecture.md"
EMPTY_STATE_PATH = ALGORITHM_DIR / "empty_state_limitation_and_recovery_taxonomy_contract.md"

AUDIT_EVENT_SCHEMA_PATH = SCHEMAS_DIR / "audit_event.schema.json"
TRACE_SPAN_SCHEMA_PATH = SCHEMAS_DIR / "trace_span.schema.json"
METRIC_EVENT_SCHEMA_PATH = SCHEMAS_DIR / "metric_event.schema.json"
LOG_RECORD_SCHEMA_PATH = SCHEMAS_DIR / "log_record.schema.json"
TELEMETRY_RESOURCE_SCHEMA_PATH = SCHEMAS_DIR / "telemetry_resource.schema.json"
ERROR_RECORD_SCHEMA_PATH = SCHEMAS_DIR / "error_record.schema.json"
REMEDIATION_TASK_SCHEMA_PATH = SCHEMAS_DIR / "remediation_task.schema.json"
FAILURE_INVESTIGATION_SCHEMA_PATH = SCHEMAS_DIR / "failure_investigation.schema.json"
COMPENSATION_RECORD_SCHEMA_PATH = SCHEMAS_DIR / "compensation_record.schema.json"
ACCEPTED_RISK_SCHEMA_PATH = SCHEMAS_DIR / "accepted_risk_approval.schema.json"
FAILURE_DASHBOARD_SCHEMA_PATH = SCHEMAS_DIR / "failure_lifecycle_dashboard.schema.json"
FAILURE_RESOLUTION_SCHEMA_PATH = SCHEMAS_DIR / "failure_resolution_contract.schema.json"
AUDIT_INVESTIGATION_SCHEMA_PATH = SCHEMAS_DIR / "audit_investigation_frame.schema.json"

OBSERVABILITY_DOC_PATH = DOCS_ANALYSIS_DIR / "17_observability_audit_and_failure_management.md"
SIGNAL_DOC_PATH = DOCS_ANALYSIS_DIR / "17_signal_model_correlation_and_retention_spec.md"
DASHBOARD_DOC_PATH = DOCS_ANALYSIS_DIR / "17_failure_lifecycle_dashboard_spec.md"

AUDIT_REGISTRY_PATH = DATA_ANALYSIS_DIR / "audit_event_family_registry.json"
SIGNAL_CATALOG_PATH = DATA_ANALYSIS_DIR / "signal_catalog.json"
CORRELATION_TOPOLOGY_PATH = DATA_ANALYSIS_DIR / "correlation_topology_and_query_contracts.json"
ERROR_MATRIX_PATH = DATA_ANALYSIS_DIR / "error_family_retry_remediation_matrix.json"
DASHBOARD_RULES_PATH = DATA_ANALYSIS_DIR / "failure_lifecycle_dashboard_projection_rules.json"
OWNER_CLOSURE_PATH = DATA_ANALYSIS_DIR / "failure_owner_closure_and_risk_matrix.json"
RETENTION_VISIBILITY_PATH = DATA_ANALYSIS_DIR / "retention_visibility_signal_binding_matrix.json"

MERMAID_PATH = DIAGRAMS_ANALYSIS_DIR / "17_signal_and_failure_lineage.mmd"

ATLAS_INDEX_PATH = PROTOTYPE_DIR / "index.html"
ATLAS_STYLES_PATH = PROTOTYPE_DIR / "styles.css"
ATLAS_APP_PATH = PROTOTYPE_DIR / "app.js"
ATLAS_DATA_PATH = PROTOTYPE_DIR / "atlas_data.json"

REQUIRED_RECORD_FIELDS = [
    "record_type",
    "domain",
    "canonical_name",
    "producer_or_owner",
    "correlation_keys",
    "visibility_boundary",
    "retention_boundary",
    "query_contract_or_projection",
    "linked_failure_or_provenance_edges",
    "retry_or_resolution_posture",
    "closure_requirements",
    "source_file",
    "source_heading_or_logical_block",
    "notes",
]


SOURCE_ASSERTIONS: dict[Path, list[str]] = {
    OBSERVABILITY_PATH: [
        "## 14.2 Separation of concerns",
        "## 14.4 Mandatory correlation keys",
        "## 14.6 Required audit event families",
        "## 14.11 Query contracts",
        "## 14.14A Replay and reproducibility observability",
        "No compliance-significant event may be emitted",
    ],
    RETENTION_OBSERVABILITY_PATH: [
        "## 15.2 Retention-state to error-state binding",
        "## 15.4 Correlation, visibility, and signal separation",
        "## 15.5 Erasure, legal-hold, and proof-preservation invariants",
        "FailureLifecycleDashboard",
    ],
    ERROR_MODEL_PATH: [
        "## 13.2 Canonical error object",
        "## 13.3 Error families",
        "## 13.6 Retry model",
        "## 13.9B Failure lifecycle dashboard projection",
        "## 13.13 Deduplication and escalation",
        "no failure dashboard reconstructed from logs, notes, or free text",
    ],
    FAILURE_DASHBOARD_PATH: [
        "The backend SHALL persist one authoritative read-side dashboard",
        "lineage_error_refs_in_order[]",
        "NO_LOG_ONLY_OR_FREE_TEXT_STATUS_RECONSTRUCTION",
        "BUILD_FAILURE_LIFECYCLE_DASHBOARD(...)",
    ],
    FAILURE_OWNERSHIP_PATH: [
        "The failure lifecycle SHALL preserve one continuous basis",
        "`ERROR_RECORD`",
        "`REMEDIATION_TASK`",
        "`COMPENSATION_RECORD`",
        "`FAILURE_INVESTIGATION`",
        "`ACCEPTED_RISK_APPROVAL`",
    ],
    PROVENANCE_PATH: [
        "Rule E1 - Gate and audit anchoring rule",
        "Rule E2 - Failure and remediation rule",
        "`ED_AUDITED_BY`",
        "`ED_CAUSED_BY_ERROR`",
        "`ED_COMPENSATED_BY`",
        "`PATH_REMEDIATION_CHAIN`",
    ],
    FRONTEND_LAW_PATH: [
        "blocker, compare, contradiction, or audit-investigation states MAY promote a second support region",
        "reduced-motion semantics stay server-authored",
        "semantic_accessibility_contract",
    ],
    GOVERNANCE_PATH: [
        "/governance/audit",
        "AUDIT_SIDECAR",
        "integrity markers",
        "active saved-view",
    ],
    EMPTY_STATE_PATH: [
        "limitation",
        "recovery",
    ],
}


def repo_rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def schema_value(path: Path, *keys: str) -> Any:
    node: Any = load_json(path)
    for key in keys:
        node = node[key]
    return node


def schema_enum(path: Path, *keys: str) -> list[str]:
    return [str(value) for value in schema_value(path, *keys) if value is not None]


def ordered_unique(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def json_write(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def text_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.rstrip() + "\n", encoding="utf-8")


def assert_source_grounding() -> None:
    missing: list[str] = []
    for path, snippets in SOURCE_ASSERTIONS.items():
        text = path.read_text(encoding="utf-8")
        for snippet in snippets:
            if snippet not in text:
                missing.append(f"{repo_rel(path)} missing {snippet!r}")
    if missing:
        raise RuntimeError("Source grounding assertions failed:\n" + "\n".join(missing))


def record(
    *,
    record_type: str,
    domain: str,
    canonical_name: str,
    producer_or_owner: str,
    correlation_keys: Iterable[str],
    visibility_boundary: str,
    retention_boundary: str,
    query_contract_or_projection: str,
    linked_failure_or_provenance_edges: Iterable[str],
    retry_or_resolution_posture: str,
    closure_requirements: Iterable[str],
    source_path: Path,
    source_heading_or_logical_block: str,
    notes: Iterable[str] = (),
    **extra: Any,
) -> dict[str, Any]:
    payload = {
        "record_type": record_type,
        "domain": domain,
        "canonical_name": canonical_name,
        "producer_or_owner": producer_or_owner,
        "correlation_keys": ordered_unique(correlation_keys),
        "visibility_boundary": visibility_boundary,
        "retention_boundary": retention_boundary,
        "query_contract_or_projection": query_contract_or_projection,
        "linked_failure_or_provenance_edges": ordered_unique(linked_failure_or_provenance_edges),
        "retry_or_resolution_posture": retry_or_resolution_posture,
        "closure_requirements": ordered_unique(closure_requirements),
        "source_file": repo_rel(source_path),
        "source_heading_or_logical_block": source_heading_or_logical_block,
        "notes": list(notes),
    }
    payload.update(extra)
    return payload


def assert_required_record_fields(rows: Iterable[dict[str, Any]]) -> None:
    for row in rows:
        missing = [field for field in REQUIRED_RECORD_FIELDS if field not in row]
        if missing:
            raise ValueError(f"Row {row.get('canonical_name')} missing required fields: {missing}")
        if not isinstance(row["correlation_keys"], list):
            raise ValueError(f"Row {row['canonical_name']} has invalid correlation_keys.")
        if not isinstance(row["linked_failure_or_provenance_edges"], list):
            raise ValueError(f"Row {row['canonical_name']} has invalid linked edges.")
        if not isinstance(row["closure_requirements"], list):
            raise ValueError(f"Row {row['canonical_name']} has invalid closure_requirements.")
        if not isinstance(row["notes"], list):
            raise ValueError(f"Row {row['canonical_name']} has invalid notes.")


def format_value(value: Any) -> str:
    if isinstance(value, bool):
        return "yes" if value else "no"
    if value is None:
        return "null"
    if isinstance(value, list):
        return "<br>".join(str(item) for item in value) if value else "[]"
    return str(value)


def render_table(headers: list[str], rows: list[dict[str, Any]]) -> str:
    if not rows:
        return "_No rows._"
    lines = ["| " + " | ".join(headers) + " |", "| " + " | ".join("---" for _ in headers) + " |"]
    for row_data in rows:
        values = [format_value(row_data.get(header, "")).replace("|", "\\|") for header in headers]
        lines.append("| " + " | ".join(values) + " |")
    return "\n".join(lines)


def normalize_markdown(text: str) -> str:
    prefix = " " * 8
    return "\n".join(
        line[len(prefix):] if line.startswith(prefix) else line
        for line in dedent(text).strip().splitlines()
    )


AUDIT_EVENT_ENUM = schema_enum(AUDIT_EVENT_SCHEMA_PATH, "properties", "event_type", "enum")
TRACE_SPAN_ENUM = schema_enum(TRACE_SPAN_SCHEMA_PATH, "properties", "span_code", "enum")
TRACE_SAMPLING_ENUM = schema_enum(TRACE_SPAN_SCHEMA_PATH, "properties", "sampling_class", "enum")
METRIC_FAMILY_ENUM = schema_enum(METRIC_EVENT_SCHEMA_PATH, "properties", "metric_family", "enum")
METRIC_INSTRUMENT_ENUM = schema_enum(METRIC_EVENT_SCHEMA_PATH, "properties", "instrument_kind", "enum")
LOG_FAMILY_ENUM = schema_enum(LOG_RECORD_SCHEMA_PATH, "properties", "log_family", "enum")
LOG_ACCESS_TIER_ENUM = schema_enum(LOG_RECORD_SCHEMA_PATH, "properties", "access_tier", "enum")
ERROR_FAMILY_ENUM = schema_enum(ERROR_RECORD_SCHEMA_PATH, "properties", "error_family", "enum")
ERROR_SEVERITY_ENUM = schema_enum(ERROR_RECORD_SCHEMA_PATH, "properties", "severity", "enum")
BLOCKING_CLASS_ENUM = schema_enum(ERROR_RECORD_SCHEMA_PATH, "properties", "blocking_class", "enum")
RETRY_CLASS_ENUM = schema_enum(ERROR_RECORD_SCHEMA_PATH, "properties", "retry_class", "enum")
RETRY_BUDGET_ENUM = schema_enum(ERROR_RECORD_SCHEMA_PATH, "properties", "retry_budget_class", "enum")
REMEDIATION_CLASS_ENUM = schema_enum(ERROR_RECORD_SCHEMA_PATH, "properties", "remediation_class", "enum")
REMEDIATION_OWNER_ENUM = schema_enum(ERROR_RECORD_SCHEMA_PATH, "properties", "remediation_owner_type", "enum")
RESOLUTION_STATE_ENUM = schema_enum(ERROR_RECORD_SCHEMA_PATH, "properties", "resolution_state", "enum")
REMEDIATION_TASK_TYPE_ENUM = schema_enum(REMEDIATION_TASK_SCHEMA_PATH, "properties", "task_type", "enum")
REMEDIATION_EFFECT_ENUM = schema_enum(
    REMEDIATION_TASK_SCHEMA_PATH, "properties", "error_resolution_effect", "enum"
)
INVESTIGATION_CLASS_ENUM = schema_enum(
    FAILURE_INVESTIGATION_SCHEMA_PATH, "properties", "investigation_class", "enum"
)
COMPENSATION_MODE_ENUM = schema_enum(COMPENSATION_RECORD_SCHEMA_PATH, "properties", "compensation_mode", "enum")
APPROVAL_STATE_ENUM = schema_enum(ACCEPTED_RISK_SCHEMA_PATH, "properties", "approval_state", "enum")
APPROVER_TYPE_ENUM = schema_enum(ACCEPTED_RISK_SCHEMA_PATH, "properties", "approver_type", "enum")
DASHBOARD_STATE_ENUM = schema_enum(FAILURE_DASHBOARD_SCHEMA_PATH, "properties", "current_lineage_state", "enum")
DASHBOARD_SOURCE_ARTIFACT_ENUM = schema_enum(
    FAILURE_DASHBOARD_SCHEMA_PATH, "$defs", "sourceArtifactType", "enum"
)
DASHBOARD_OWNER_ENUM = schema_enum(FAILURE_DASHBOARD_SCHEMA_PATH, "$defs", "ownerType", "enum")
QUERY_CODE_ENUM = schema_enum(AUDIT_INVESTIGATION_SCHEMA_PATH, "properties", "query_contract_code", "enum")
QUERY_ORDERING_ENUM = schema_enum(AUDIT_INVESTIGATION_SCHEMA_PATH, "properties", "ordering_basis", "enum")
INTEGRITY_POSTURE_ENUM = schema_enum(
    AUDIT_INVESTIGATION_SCHEMA_PATH, "properties", "integrity_chain_posture", "enum"
)

# The telemetry resource schema exposes the correlation context under $defs.
TELEMETRY_RESOURCE = load_json(TELEMETRY_RESOURCE_SCHEMA_PATH)
CORRELATION_CONTEXT_PROPS = TELEMETRY_RESOURCE["$defs"]["correlationContext"]["properties"]
SELECTION_DISPOSITION_ENUM = [value for value in CORRELATION_CONTEXT_PROPS["selection_disposition"]["enum"] if value is not None]
RUN_KIND_ENUM = [value for value in CORRELATION_CONTEXT_PROPS["run_kind"]["enum"] if value is not None]
MODE_ENUM = [value for value in CORRELATION_CONTEXT_PROPS["mode"]["enum"] if value is not None]
REPLAY_CLASS_ENUM = [value for value in CORRELATION_CONTEXT_PROPS["replay_class"]["enum"] if value is not None]
COMPARISON_MODE_ENUM = [value for value in CORRELATION_CONTEXT_PROPS["comparison_mode"]["enum"] if value is not None]
BASIS_VALIDATION_ENUM = [value for value in CORRELATION_CONTEXT_PROPS["basis_validation_state"]["enum"] if value is not None]
INPUT_INHERITANCE_ENUM = [value for value in CORRELATION_CONTEXT_PROPS["input_inheritance_mode"]["enum"] if value is not None]
CONFIG_INHERITANCE_ENUM = [value for value in CORRELATION_CONTEXT_PROPS["config_inheritance_mode"]["enum"] if value is not None]


CORE_KEYS = ["tenant_id", "client_id", "manifest_id", "trace_id", "service_name", "environment_ref"]
LINEAGE_KEYS = [
    "root_manifest_id",
    "parent_manifest_id",
    "continuation_of_manifest_id",
    "replay_of_manifest_id",
    "manifest_lineage_trace_ref",
    "manifest_branch_decision",
]
BRANCH_KEYS = [
    "idempotency_key",
    "request_hash",
    "identity_namespace_hash",
    "duplicate_meaning_key",
    "continuation_basis",
    "access_binding_hash",
    "policy_snapshot_hash",
]
AUTHORITY_KEYS = [
    "authority_binding_ref",
    "authority_link_ref",
    "delegation_grant_ref",
    "submission_record_id",
    "authority_operation_id",
]
NIGHTLY_KEYS = ["nightly_batch_run_ref", "nightly_window_key", "selection_disposition"]
FAILURE_KEYS = ["error_id", "workflow_item_id", "task_id", "investigation_id", "compensation_id", "accepted_risk_approval_id"]
RETENTION_KEYS = ["retention_class"]
REPLAY_KEYS = [
    "run_kind",
    "mode",
    "replay_class",
    "comparison_mode",
    "basis_validation_state",
    "expected_execution_basis_hash",
    "actual_execution_basis_hash",
    "expected_deterministic_outcome_hash",
    "actual_deterministic_outcome_hash",
    "input_inheritance_mode",
    "config_inheritance_mode",
    "config_freeze_id",
]


AUDIT_EVENT_GROUPS: list[dict[str, Any]] = [
    {
        "group_id": "identity_authority",
        "title": "Identity and authority",
        "heading": "14.6 Required audit event families / A. Identity and authority",
        "events": [
            "PrincipalAuthenticated",
            "StepUpRequired",
            "StepUpSatisfied",
            "AuthorityLinked",
            "AuthorityRelinked",
            "AuthorityBindingMismatchDetected",
        ],
        "correlation_keys": CORE_KEYS + AUTHORITY_KEYS + ["access_binding_hash", "policy_snapshot_hash"],
        "owner": "Identity boundary, authority-linking workflow, and security decision surfaces",
        "query": "get_audit_trail(root_ref, options)",
        "notes": [
            "Carries frozen binding and delegation references so access anomalies do not collapse into generic transport logs.",
            "Security telemetry and append-only audit remain correlated but separable.",
        ],
    },
    {
        "group_id": "idempotency_reuse_continuation",
        "title": "Idempotency, reuse, and continuation",
        "heading": "14.6 Required audit event families / A1. Idempotency, reuse, and continuation",
        "events": [
            "AccessScopeBound",
            "ExistingDecisionBundleReturned",
            "ManifestContextReused",
            "ContinuationChildAllocated",
            "ConfigInheritanceResolved",
        ],
        "correlation_keys": CORE_KEYS + LINEAGE_KEYS + BRANCH_KEYS + ["input_inheritance_mode", "config_inheritance_mode", "config_freeze_id"],
        "owner": "Manifest branch-selection logic and decision-bundle reuse boundary",
        "query": "get_run_timeline(manifest_id)",
        "notes": [
            "Must distinguish idempotent bundle return from child allocation, replay, recovery, and same-manifest reuse.",
            "Config resolution basis remains queryable and replay-safe.",
        ],
    },
    {
        "group_id": "manifest_lifecycle",
        "title": "Manifest lifecycle",
        "heading": "14.6 Required audit event families / B. Manifest lifecycle",
        "events": [
            "ManifestAllocated",
            "ManifestFrozen",
            "ManifestSealed",
            "RunStarted",
            "RunStartClaimRejected",
            "ManifestFailed",
            "ManifestBlocked",
            "ManifestCompleted",
            "ManifestSuperseded",
        ],
        "correlation_keys": CORE_KEYS + LINEAGE_KEYS + FAILURE_KEYS + ["gate_code"],
        "owner": "Run engine orchestration and manifest-state transitions",
        "query": "get_run_timeline(manifest_id)",
        "notes": [
            "Terminal and blocked states must retain typed reason codes and error correlation.",
            "Start-claim rejection stays distinct from already-terminal reuse and stale reclaim cases.",
        ],
    },
    {
        "group_id": "nightly_scheduler",
        "title": "Nightly scheduler and portfolio autopilot",
        "heading": "14.6 Required audit event families / B1. Nightly scheduler and portfolio autopilot",
        "events": [
            "NightlyBatchAllocated",
            "NightlyPortfolioSelected",
            "NightlyClientExecutionDispatched",
            "NightlyClientExecutionDeferred",
            "NightlyClientExecutionSkipped",
            "NightlyClientExecutionEscalated",
            "NightlyBatchShardClaimed",
            "NightlyBatchShardReclaimed",
            "NightlyBatchQuiesced",
            "NightlyBatchCompleted",
            "NightlyBatchAbandoned",
            "OperatorMorningDigestPublished",
        ],
        "correlation_keys": CORE_KEYS + NIGHTLY_KEYS + LINEAGE_KEYS,
        "owner": "Nightly control plane, sharding, and morning-digest publication",
        "query": "get_nightly_batch_timeline(batch_run_id); get_operator_morning_digest(tenant_id, coverage_date)",
        "notes": [
            "Batch-level decisions that precede manifest allocation still need durable nightly identifiers.",
            "Scheduler intent must remain reconstructible without queue archaeology.",
        ],
    },
    {
        "group_id": "data_evidence",
        "title": "Data and evidence",
        "heading": "14.6 Required audit event families / C. Data and evidence",
        "events": [
            "SourceCollectionStarted",
            "SourceCollectionCompleted",
            "SnapshotBuilt",
            "SnapshotValidated",
            "FactPromoted",
            "ConflictRecorded",
        ],
        "correlation_keys": CORE_KEYS + LINEAGE_KEYS + ["workflow_item_id"],
        "owner": "Collection, snapshot, and canonical-promotion stages",
        "query": "get_run_timeline(manifest_id); get_filing_evidence_ledger(submission_record_id)",
        "notes": [
            "Evidence and conflict narration must remain queryable without reading logs.",
        ],
    },
    {
        "group_id": "decisioning",
        "title": "Decisioning",
        "heading": "14.6 Required audit event families / D. Decisioning",
        "events": [
            "GateEvaluated",
            "ComputeCompleted",
            "ParityEvaluated",
            "TrustSynthesized",
            "GraphBuilt",
            "TwinBuilt",
        ],
        "correlation_keys": CORE_KEYS + LINEAGE_KEYS + ["gate_code"] + FAILURE_KEYS,
        "owner": "Run-engine compute, parity, trust, and graph synthesis boundaries",
        "query": "get_run_timeline(manifest_id)",
        "notes": [
            "A blocking gate outcome cannot exist without both audit anchoring and typed failure lineage when the gate fails closed.",
        ],
    },
    {
        "group_id": "workflow_overrides",
        "title": "Workflow and overrides",
        "heading": "14.6 Required audit event families / E. Workflow and overrides",
        "events": [
            "WorkflowOpened",
            "WorkflowResolved",
            "OverrideRequested",
            "OverrideApproved",
            "OverrideRejected",
            "OverrideExpired",
        ],
        "correlation_keys": CORE_KEYS + ["workflow_item_id", "gate_code"] + FAILURE_KEYS,
        "owner": "Workflow coordination, override approval, and tracked follow-up surfaces",
        "query": "get_audit_trail(root_ref, options)",
        "notes": [
            "Override lineage stays tied to the same failure, gate, and workflow record instead of drifting into notes.",
        ],
    },
    {
        "group_id": "filing_authority",
        "title": "Filing and authority interaction",
        "heading": "14.6 Required audit event families / F. Filing and authority interaction",
        "events": [
            "FilingPacketPrepared",
            "SubmissionAttempted",
            "AuthorityOperationPlanned",
            "AuthorityRequestBuilt",
            "AuthorityRequestSent",
            "AuthorityResponseReceived",
            "AuthorityStatusNormalized",
            "AuthorityReconciliationAttempted",
            "AuthorityReconciliationResolved",
            "SubmissionReconciled",
            "SubmissionConfirmed",
            "SubmissionRejected",
            "SubmissionUnknown",
            "OutOfBandStateObserved",
        ],
        "correlation_keys": CORE_KEYS + AUTHORITY_KEYS + FAILURE_KEYS + ["request_hash", "idempotency_key"],
        "owner": "Authority transport, response normalization, and reconciliation surfaces",
        "query": "get_filing_evidence_ledger(submission_record_id)",
        "notes": [
            "Submission-lineage events must retain authority operation and request identity rather than free-floating transport detail.",
        ],
    },
    {
        "group_id": "drift_amendment",
        "title": "Drift and amendment",
        "heading": "14.6 Required audit event families / G. Drift and amendment",
        "events": [
            "BaselineSelected",
            "AmendmentWindowEvaluated",
            "DriftDetected",
            "DriftClassified",
            "DriftRetroactiveImpactAnalyzed",
            "DriftSuperseded",
            "AmendmentEligibilityEvaluated",
            "AmendmentFreshnessInvalidated",
            "IntentToAmendTriggered",
            "IntentToAmendValidated",
            "AmendmentBundlePrepared",
            "AmendmentSubmitted",
            "AmendmentConfirmed",
            "AuthorityCorrectionObserved",
            "AuthorityAcceptedStateInternallySuperseded",
            "DriftReviewEscalated",
        ],
        "correlation_keys": CORE_KEYS + LINEAGE_KEYS + AUTHORITY_KEYS + FAILURE_KEYS,
        "owner": "Baseline, drift-classification, and amendment-readiness surfaces",
        "query": "get_audit_trail(root_ref, options); get_drift_path(drift_id)",
        "notes": [
            "Drift lineage must distinguish newly detected divergence, supersession, and authority-correction-driven state changes.",
        ],
    },
    {
        "group_id": "retention_privacy",
        "title": "Retention and privacy",
        "heading": "14.6 Required audit event families / H. Retention and privacy",
        "events": [
            "RetentionApplied",
            "RetentionLimited",
            "LegalHoldApplied",
            "LegalHoldReleased",
            "ErasureRequested",
            "ErasureCompleted",
            "SensitiveViewOpened",
            "MaskedExportProduced",
        ],
        "correlation_keys": CORE_KEYS + RETENTION_KEYS + FAILURE_KEYS + AUTHORITY_KEYS,
        "owner": "Retention/privacy control plane and sensitive-view access logging",
        "query": "get_privacy_action_ledger(client_id, options); get_retention_limitation_path(object_id)",
        "notes": [
            "Privacy actions keep deterministic audit order and explicit limitation posture.",
            "Visibility fences stay explicit even when payloads age out or become hash-only.",
        ],
    },
    {
        "group_id": "platform_release_resilience",
        "title": "Platform release, migration, and resilience",
        "heading": "14.6 Required audit event families / I. Platform release, migration, and resilience",
        "events": [
            "BuildAttested",
            "ReleaseCanaryStarted",
            "ReleasePromoted",
            "ReleaseRolledBack",
            "SchemaMigrationPlanned",
            "SchemaMigrationApplied",
            "SchemaMigrationVerified",
            "SecretRotated",
            "BackupCreated",
            "RestoreDrillExecuted",
            "DisasterRecoveryFailedOver",
            "DisasterRecoveryFailedBack",
        ],
        "correlation_keys": CORE_KEYS + NIGHTLY_KEYS + ["code_build_id"],
        "owner": "Release governance, migration, backup, and disaster-recovery control plane",
        "query": "get_audit_trail(root_ref, options)",
        "notes": [
            "Operational release gates still need append-only proof and lineage into resilience posture.",
        ],
    },
    {
        "group_id": "error_remediation",
        "title": "Error and remediation",
        "heading": "14.6 Required audit event families / J. Error and remediation",
        "events": [
            "ErrorRecorded",
            "RemediationOpened",
            "RemediationCompleted",
            "CompensationApplied",
            "CompensationVerified",
        ],
        "correlation_keys": CORE_KEYS + FAILURE_KEYS + RETENTION_KEYS + AUTHORITY_KEYS,
        "owner": "Structured failure, remediation, compensation, and closure boundaries",
        "query": "BUILD_FAILURE_LIFECYCLE_DASHBOARD(...); get_audit_trail(root_ref, options)",
        "notes": [
            "No remediation or compensation posture may exist without linked error lineage and audit evidence.",
        ],
    },
    {
        "group_id": "replay_reproducibility",
        "title": "Replay and reproducibility",
        "heading": "14.14A Replay and reproducibility observability",
        "events": [
            "ReplayPreflightValidated",
            "ReplayBasisCorruptionDetected",
            "FrozenPostSealBasisLoaded",
            "HistoricalAuthorityBasisReused",
            "HistoricalLateDataBasisReused",
            "ReplayOutcomeCompared",
            "ReplayAttested",
        ],
        "correlation_keys": CORE_KEYS + LINEAGE_KEYS + REPLAY_KEYS,
        "owner": "Replay preflight, basis loading, comparison, and attestation surfaces",
        "query": "get_replay_attestation(manifest_id)",
        "notes": [
            "Replay evidence must retain basis hashes and comparison posture instead of sampling away determinism.",
        ],
    },
]


QUERY_CONTRACTS: list[dict[str, Any]] = [
    {
        "query_code": "AUDIT_TRAIL",
        "name": "get_audit_trail(root_ref, options)",
        "domain": "AUDIT",
        "owner": "Audit investigation frame",
        "dependencies": CORE_KEYS + LINEAGE_KEYS + AUTHORITY_KEYS + FAILURE_KEYS + RETENTION_KEYS,
        "ordering_basis": "AUDIT_STREAM_SEQUENCE",
        "integrity_posture": "VERIFIED",
        "response_shape_notes": "Append-only event ledger merged by recorded_at and audit_stream_ref + stream_sequence.",
        "source_path": OBSERVABILITY_PATH,
        "source_heading": "14.11 Query contracts / get_audit_trail(root_ref, options)",
    },
    {
        "query_code": "RUN_TIMELINE",
        "name": "get_run_timeline(manifest_id)",
        "domain": "OPS",
        "owner": "Run-level investigation view",
        "dependencies": CORE_KEYS + LINEAGE_KEYS + FAILURE_KEYS + ["gate_code"],
        "ordering_basis": "RECORDED_AT_THEN_STREAM_SEQUENCE",
        "integrity_posture": "VERIFIED",
        "response_shape_notes": "Joins traces, audit events, typed failures, and gate outcomes without flattening signal classes.",
        "source_path": OBSERVABILITY_PATH,
        "source_heading": "14.11 Query contracts / get_run_timeline(manifest_id)",
    },
    {
        "query_code": "NIGHTLY_BATCH_TIMELINE",
        "name": "get_nightly_batch_timeline(batch_run_id)",
        "domain": "OPS",
        "owner": "Nightly control-plane inspection",
        "dependencies": NIGHTLY_KEYS + CORE_KEYS + LINEAGE_KEYS,
        "ordering_basis": "RECORDED_AT_THEN_STREAM_SEQUENCE",
        "integrity_posture": "VERIFIED",
        "response_shape_notes": "Shows batch allocation, selection disposition, shard claims, deferrals, and digests.",
        "source_path": OBSERVABILITY_PATH,
        "source_heading": "14.11 Query contracts / get_nightly_batch_timeline(batch_run_id)",
    },
    {
        "query_code": "FILING_EVIDENCE_LEDGER",
        "name": "get_filing_evidence_ledger(submission_record_id)",
        "domain": "AUDIT",
        "owner": "Authority-facing evidence ledger",
        "dependencies": AUTHORITY_KEYS + CORE_KEYS + FAILURE_KEYS,
        "ordering_basis": "AUDIT_STREAM_SEQUENCE",
        "integrity_posture": "VERIFIED",
        "response_shape_notes": "Pairs filing packet, request/response lineage, and authority reconciliation evidence.",
        "source_path": OBSERVABILITY_PATH,
        "source_heading": "14.11 Query contracts / get_filing_evidence_ledger(submission_record_id)",
    },
    {
        "query_code": "PRIVACY_ACTION_LEDGER",
        "name": "get_privacy_action_ledger(client_id, options)",
        "domain": "PRIVACY",
        "owner": "Privacy and retention review surface",
        "dependencies": CORE_KEYS + RETENTION_KEYS + FAILURE_KEYS,
        "ordering_basis": "AUDIT_STREAM_SEQUENCE",
        "integrity_posture": "VERIFIED",
        "response_shape_notes": "Privacy-safe ledger of masking, legal hold, erasure, and sensitive-view events with explicit limitations.",
        "source_path": OBSERVABILITY_PATH,
        "source_heading": "14.11 Query contracts / get_privacy_action_ledger(client_id, options)",
    },
    {
        "query_code": "OPERATOR_MORNING_DIGEST",
        "name": "get_operator_morning_digest(tenant_id, coverage_date)",
        "domain": "OPS",
        "owner": "Morning digest projection",
        "dependencies": NIGHTLY_KEYS + CORE_KEYS + FAILURE_KEYS,
        "ordering_basis": "RECORDED_AT_THEN_STREAM_SEQUENCE",
        "integrity_posture": "PARTIAL_GAP",
        "response_shape_notes": "Summarized operational briefing backed by batch audit evidence and exceptions.",
        "source_path": OBSERVABILITY_PATH,
        "source_heading": "14.11 Query contracts / get_operator_morning_digest(tenant_id, coverage_date)",
    },
    {
        "query_code": "REPLAY_ATTESTATION",
        "name": "get_replay_attestation(manifest_id)",
        "domain": "AUDIT",
        "owner": "Replay comparison and attestation surface",
        "dependencies": CORE_KEYS + LINEAGE_KEYS + REPLAY_KEYS + FAILURE_KEYS,
        "ordering_basis": "AUDIT_STREAM_SEQUENCE",
        "integrity_posture": "VERIFIED",
        "response_shape_notes": "Replay basis validation, comparison mode, deterministic outcome hashes, and attestation posture.",
        "source_path": OBSERVABILITY_PATH,
        "source_heading": "14.14A Replay and reproducibility observability / get_replay_attestation(manifest_id)",
    },
    {
        "query_code": "PROVENANCE_OBJECT",
        "name": "get_provenance(object_type, object_id, options)",
        "domain": "FAILURE",
        "owner": "General provenance explorer",
        "dependencies": CORE_KEYS + LINEAGE_KEYS + FAILURE_KEYS + AUTHORITY_KEYS,
        "ordering_basis": "PATH_ORDER",
        "integrity_posture": "VERIFIED",
        "response_shape_notes": "Stable graph traversal over durable nodes, edges, and lineage boundaries.",
        "source_path": PROVENANCE_PATH,
        "source_heading": "Path classes and query contracts",
    },
    {
        "query_code": "DEFENCE_PATH",
        "name": "get_defence_path(target_ref, options)",
        "domain": "FAILURE",
        "owner": "Proof-closure path builder",
        "dependencies": CORE_KEYS + LINEAGE_KEYS + FAILURE_KEYS + AUTHORITY_KEYS,
        "ordering_basis": "PATH_ORDER",
        "integrity_posture": "VERIFIED",
        "response_shape_notes": "Returns proof closure, contradiction isolation, and support state for a target claim.",
        "source_path": PROVENANCE_PATH,
        "source_heading": "Proof-path closure semantics",
    },
    {
        "query_code": "AUTHORITY_STATE_PATH",
        "name": "get_authority_state_path(submission_record_id)",
        "domain": "AUDIT",
        "owner": "Authority-state reconciliation path",
        "dependencies": AUTHORITY_KEYS + CORE_KEYS + FAILURE_KEYS,
        "ordering_basis": "PATH_ORDER",
        "integrity_posture": "VERIFIED",
        "response_shape_notes": "Traverses request, response, normalization, and reconciliation nodes without hidden joins.",
        "source_path": PROVENANCE_PATH,
        "source_heading": "Path classes",
    },
    {
        "query_code": "DRIFT_PATH",
        "name": "get_drift_path(drift_id)",
        "domain": "FAILURE",
        "owner": "Drift and amendment investigation",
        "dependencies": CORE_KEYS + LINEAGE_KEYS + FAILURE_KEYS + AUTHORITY_KEYS,
        "ordering_basis": "PATH_ORDER",
        "integrity_posture": "VERIFIED",
        "response_shape_notes": "Explains baseline, contradiction, supersession, and amendment justification lineage.",
        "source_path": PROVENANCE_PATH,
        "source_heading": "Path classes",
    },
    {
        "query_code": "RETENTION_LIMITATION_PATH",
        "name": "get_retention_limitation_path(object_id)",
        "domain": "PRIVACY",
        "owner": "Retention-limitation proof surface",
        "dependencies": CORE_KEYS + RETENTION_KEYS + FAILURE_KEYS,
        "ordering_basis": "PATH_ORDER",
        "integrity_posture": "VERIFIED",
        "response_shape_notes": "Explains lawful absence versus corruption through explicit limited or erased placeholders.",
        "source_path": PROVENANCE_PATH,
        "source_heading": "Path classes",
    },
]


ERROR_FAMILY_CONFIG: list[dict[str, Any]] = [
    {
        "error_family": "AUTHN_ERROR",
        "primary_severity": "ERROR",
        "blocking_class": "BLOCKS_RUN",
        "retry_class": "HUMAN_REVIEW_THEN_RETRY",
        "retry_budget_class": "HUMAN_GATED",
        "remediation_class": "REQUEST_CLIENT_INPUT",
        "remediation_owner_type": "CLIENT",
        "compensation_modes": ["NONE"],
        "accepted_risk_allowed": False,
        "focus": "Authentication or step-up proof is missing, stale, or incomplete.",
        "example_codes": ["AUTHZ_STEP_UP_REQUIRED"],
        "closure_requirements": [
            "Retain step-up or authentication evidence in audit lineage.",
            "Preserve current accountable owner until the missing auth posture is corrected.",
        ],
    },
    {
        "error_family": "AUTHZ_ERROR",
        "primary_severity": "CRITICAL",
        "blocking_class": "BLOCKS_RUN",
        "retry_class": "HUMAN_REVIEW_THEN_RETRY",
        "retry_budget_class": "HUMAN_GATED",
        "remediation_class": "REQUEST_APPROVAL",
        "remediation_owner_type": "TENANT_ADMIN",
        "compensation_modes": ["NONE"],
        "accepted_risk_allowed": False,
        "focus": "Privilege, scope, or delegation law fails closed.",
        "example_codes": ["AUTHZ_STEP_UP_REQUIRED"],
        "closure_requirements": [
            "Approval or access restoration must remain auditable.",
            "Customer-visible surfaces may not inherit internal-only access failure detail.",
        ],
    },
    {
        "error_family": "MANIFEST_ERROR",
        "primary_severity": "ERROR",
        "blocking_class": "BLOCKS_RUN",
        "retry_class": "REBUILD_THEN_RETRY",
        "retry_budget_class": "SINGLE_ATTEMPT",
        "remediation_class": "REBUILD_ARTIFACT",
        "remediation_owner_type": "SERVICE_OPERATOR",
        "compensation_modes": ["MARK_AS_SUPERSEDED"],
        "accepted_risk_allowed": False,
        "focus": "Manifest lifecycle invariants, sealing, or start claims are invalid.",
        "example_codes": ["MANIFEST_NOT_FROZEN_FOR_PRESEAL", "MANIFEST_START_CLAIM_INVALID"],
        "closure_requirements": [
            "Manifest lineage must preserve root-to-current replacement chain.",
            "Terminal outcomes require basis and audit lineage before closure.",
        ],
    },
    {
        "error_family": "CONFIG_ERROR",
        "primary_severity": "ERROR",
        "blocking_class": "BLOCKS_RUN",
        "retry_class": "REBUILD_THEN_RETRY",
        "retry_budget_class": "HUMAN_GATED",
        "remediation_class": "REQUEST_OPERATOR_REVIEW",
        "remediation_owner_type": "SERVICE_OPERATOR",
        "compensation_modes": ["MARK_AS_SUPERSEDED"],
        "accepted_risk_allowed": False,
        "focus": "Config resolution or inheritance basis is missing or incompatible.",
        "example_codes": ["REPLAY_CONFIG_FREEZE_MISSING"],
        "closure_requirements": [
            "Corrected config basis must be frozen and linked before retry.",
            "Replay-exact or recovery-exact mode cannot be approximated.",
        ],
    },
    {
        "error_family": "INPUT_BOUNDARY_ERROR",
        "primary_severity": "WARNING",
        "blocking_class": "BLOCKS_AUTOMATION",
        "retry_class": "NO_RETRY",
        "retry_budget_class": "NONE",
        "remediation_class": "REQUEST_CLIENT_INPUT",
        "remediation_owner_type": "CLIENT",
        "compensation_modes": ["NONE"],
        "accepted_risk_allowed": False,
        "focus": "Required inputs, scope, or submission-boundary material is incomplete or illegal.",
        "example_codes": ["RUNTIME_SCOPE_EMPTY"],
        "closure_requirements": [
            "Replacement input must be captured through a tracked remediation path.",
            "No silent reuse of incomplete boundary material.",
        ],
    },
    {
        "error_family": "SOURCE_COLLECTION_ERROR",
        "primary_severity": "ERROR",
        "blocking_class": "BLOCKS_RUN",
        "retry_class": "SAFE_RETRY",
        "retry_budget_class": "BOUNDED_EXPONENTIAL",
        "remediation_class": "AUTO_RETRY",
        "remediation_owner_type": "SYSTEM",
        "compensation_modes": ["NONE"],
        "accepted_risk_allowed": False,
        "focus": "Source fetch or upstream materialization failed before legal side effects occurred.",
        "example_codes": ["SOURCE_FETCH_TIMEOUT"],
        "closure_requirements": [
            "Safe retry must preserve retry_idempotency_scope_ref and backoff formula.",
            "Escalate to a typed owner if retry budget is exhausted.",
        ],
    },
    {
        "error_family": "CANONICALIZATION_ERROR",
        "primary_severity": "ERROR",
        "blocking_class": "BLOCKS_RUN",
        "retry_class": "REBUILD_THEN_RETRY",
        "retry_budget_class": "SINGLE_ATTEMPT",
        "remediation_class": "REBUILD_ARTIFACT",
        "remediation_owner_type": "REVIEWER",
        "compensation_modes": ["MARK_AS_SUPERSEDED"],
        "accepted_risk_allowed": False,
        "focus": "Promotion or canonicalization logic detected an impossible or cross-partition state.",
        "example_codes": ["CROSS_PARTITION_PROMOTION_DETECTED"],
        "closure_requirements": [
            "Promotion lineage and evidence links stay intact through rebuild.",
            "No closed state without explicit evidence of the corrected canonical fact.",
        ],
    },
    {
        "error_family": "DATA_QUALITY_ERROR",
        "primary_severity": "WARNING",
        "blocking_class": "BLOCKS_REVIEW_PROGRESS",
        "retry_class": "HUMAN_REVIEW_THEN_RETRY",
        "retry_budget_class": "HUMAN_GATED",
        "remediation_class": "REQUEST_OPERATOR_REVIEW",
        "remediation_owner_type": "REVIEWER",
        "compensation_modes": ["PRESERVE_AND_LIMIT"],
        "accepted_risk_allowed": True,
        "focus": "Critical fields or completeness scores degrade the admissible evidence posture.",
        "example_codes": ["DQ_CRITICAL_DOMAIN_MISSING"],
        "closure_requirements": [
            "Closure must declare whether the source error is fixed, limited, or accepted risk.",
            "Customer-safe messaging must remain plainer than operator-visible error detail.",
        ],
    },
    {
        "error_family": "PARITY_ERROR",
        "primary_severity": "ERROR",
        "blocking_class": "BLOCKS_FILING",
        "retry_class": "HUMAN_REVIEW_THEN_RETRY",
        "retry_budget_class": "HUMAN_GATED",
        "remediation_class": "REQUEST_OPERATOR_REVIEW",
        "remediation_owner_type": "REVIEWER",
        "compensation_modes": ["PRESERVE_AND_LIMIT", "OPEN_RECONCILIATION"],
        "accepted_risk_allowed": True,
        "focus": "Material parity differences need review, override, or limitation.",
        "example_codes": ["PARITY_BLOCKING_DIFFERENCE"],
        "closure_requirements": [
            "Parity explanation path must remain available through provenance and audit refs.",
            "Accepted risk, if used, must stay bounded and expiry-backed.",
        ],
    },
    {
        "error_family": "TRUST_ERROR",
        "primary_severity": "ERROR",
        "blocking_class": "BLOCKS_FILING",
        "retry_class": "HUMAN_REVIEW_THEN_RETRY",
        "retry_budget_class": "HUMAN_GATED",
        "remediation_class": "REQUEST_APPROVAL",
        "remediation_owner_type": "APPROVER",
        "compensation_modes": ["PRESERVE_AND_LIMIT"],
        "accepted_risk_allowed": True,
        "focus": "Trust thresholds or trust perturbation probes fail legal or review thresholds.",
        "example_codes": ["TRUST_MINIMUM_NOT_MET"],
        "closure_requirements": [
            "Closure must preserve the specific trust trigger and explainability basis.",
            "No silent closure from low-trust posture.",
        ],
    },
    {
        "error_family": "WORKFLOW_ERROR",
        "primary_severity": "ERROR",
        "blocking_class": "BLOCKS_REVIEW_PROGRESS",
        "retry_class": "SAFE_RETRY",
        "retry_budget_class": "BOUNDED_EXPONENTIAL",
        "remediation_class": "SPAWN_WORKFLOW",
        "remediation_owner_type": "SERVICE_OPERATOR",
        "compensation_modes": ["NONE"],
        "accepted_risk_allowed": False,
        "focus": "Workflow coordination or routing failed while the source error remains open.",
        "example_codes": ["WORKFLOW_ROUTE_NOT_FOUND"],
        "closure_requirements": [
            "A lawful next action or workflow reference must remain explicit while open.",
            "No lineages stranded without owner or next path.",
        ],
    },
    {
        "error_family": "AUTHORITY_PROTOCOL_ERROR",
        "primary_severity": "ERROR",
        "blocking_class": "BLOCKS_AUTHORITY_CALL",
        "retry_class": "RECONCILE_THEN_RETRY",
        "retry_budget_class": "RECONCILIATION_GATED",
        "remediation_class": "AUTO_RECONCILE",
        "remediation_owner_type": "SERVICE_OPERATOR",
        "compensation_modes": ["OPEN_RECONCILIATION"],
        "accepted_risk_allowed": False,
        "focus": "Authority request transport, idempotency, or external acknowledgement is ambiguous.",
        "example_codes": ["AUTH_TIMEOUT_UNRESOLVED", "AUTH_SEND_CLAIM_CONFLICT"],
        "closure_requirements": [
            "Retry requires current truth reconciliation plus preserved request identity.",
            "Authority-facing actions may not be blindly resent.",
        ],
    },
    {
        "error_family": "AUTHORITY_RECONCILIATION_ERROR",
        "primary_severity": "ERROR",
        "blocking_class": "BLOCKS_FILING",
        "retry_class": "RECONCILE_THEN_RETRY",
        "retry_budget_class": "RECONCILIATION_GATED",
        "remediation_class": "OPEN_INVESTIGATION",
        "remediation_owner_type": "REVIEWER",
        "compensation_modes": ["OPEN_RECONCILIATION", "REQUIRE_MANUAL_SETTLEMENT"],
        "accepted_risk_allowed": False,
        "focus": "Observed authority state diverges from internal submission truth.",
        "example_codes": ["AUTH_AMBIGUOUS_CORRELATION", "AUTH_INCONSISTENT_EXTERNAL_STATE"],
        "closure_requirements": [
            "Out-of-band state must remain visible in the dashboard and audit chain.",
            "Closure requires reconciliation basis rather than note-only narrative.",
        ],
    },
    {
        "error_family": "AMENDMENT_ERROR",
        "primary_severity": "ERROR",
        "blocking_class": "BLOCKS_AMENDMENT",
        "retry_class": "HUMAN_REVIEW_THEN_RETRY",
        "retry_budget_class": "HUMAN_GATED",
        "remediation_class": "SUPERSEDE_AND_REPLAN",
        "remediation_owner_type": "REVIEWER",
        "compensation_modes": ["MARK_AS_SUPERSEDED"],
        "accepted_risk_allowed": True,
        "focus": "Amendment timing, freshness, or readiness laws are not satisfied.",
        "example_codes": ["AMENDMENT_WINDOW_CLOSED", "AMENDMENT_CASE_NOT_READY_TO_SUBMIT"],
        "closure_requirements": [
            "Supersession or bounded exception must preserve the root lineage and amendment basis.",
            "No closed amendment state without explicit next legal action or terminal no-action posture.",
        ],
    },
    {
        "error_family": "RETENTION_ERROR",
        "primary_severity": "ERROR",
        "blocking_class": "BLOCKS_ERASURE",
        "retry_class": "NO_RETRY",
        "retry_budget_class": "NONE",
        "remediation_class": "REQUEST_OPERATOR_REVIEW",
        "remediation_owner_type": "SERVICE_OPERATOR",
        "compensation_modes": ["PRESERVE_AND_LIMIT"],
        "accepted_risk_allowed": False,
        "focus": "Retention state blocks progression, erasure, or replay-preserving explainability.",
        "example_codes": ["RETENTION_HOLD_PREVENTS_ERASURE", "REPLAY_RETENTION_LIMITED"],
        "closure_requirements": [
            "artifact_retention_ref and retention_class must stay attached to every typed companion object.",
            "Legal-hold visibility cannot disappear even when erasure is blocked.",
        ],
    },
    {
        "error_family": "PRIVACY_ERROR",
        "primary_severity": "CRITICAL",
        "blocking_class": "BLOCKS_RUN",
        "retry_class": "MANUAL_INTERVENTION_REQUIRED",
        "retry_budget_class": "HUMAN_GATED",
        "remediation_class": "OPEN_INVESTIGATION",
        "remediation_owner_type": "SECURITY_OPERATOR",
        "compensation_modes": ["PRESERVE_AND_LIMIT"],
        "accepted_risk_allowed": False,
        "focus": "Sensitive-view, masking, export, or privacy-boundary law is violated.",
        "example_codes": ["PRIVACY_MASKING_BREACH"],
        "closure_requirements": [
            "Customer-safe surfaces must remain fenced from internal-only failure detail.",
            "Closure requires explicit privacy-safe evidence rather than log inference.",
        ],
    },
    {
        "error_family": "PROVENANCE_ERROR",
        "primary_severity": "CRITICAL",
        "blocking_class": "BLOCKS_FILING",
        "retry_class": "REBUILD_THEN_RETRY",
        "retry_budget_class": "HUMAN_GATED",
        "remediation_class": "OPEN_INVESTIGATION",
        "remediation_owner_type": "SERVICE_OPERATOR",
        "compensation_modes": ["PRESERVE_AND_LIMIT"],
        "accepted_risk_allowed": False,
        "focus": "Proof paths or graph invariants fail closed.",
        "example_codes": ["GRAPH_QUALITY_MISSING"],
        "closure_requirements": [
            "Proof-closure state and contradiction handling must remain explicit.",
            "No claim may appear closed without persisted closure evidence.",
        ],
    },
    {
        "error_family": "IDEMPOTENCY_ERROR",
        "primary_severity": "ERROR",
        "blocking_class": "BLOCKS_RUN",
        "retry_class": "RECONCILE_THEN_RETRY",
        "retry_budget_class": "RECONCILIATION_GATED",
        "remediation_class": "SUPERSEDE_AND_REPLAN",
        "remediation_owner_type": "SERVICE_OPERATOR",
        "compensation_modes": ["MARK_AS_SUPERSEDED"],
        "accepted_risk_allowed": False,
        "focus": "Duplicate-meaning keys or request identity no longer admit a legal retry or reuse path.",
        "example_codes": ["IDEMPOTENCY_SCOPE_CONFLICT"],
        "closure_requirements": [
            "Duplicate and continuation lineage must stay queryable on the same failure chain.",
            "Retry only after reconciliation of current truth and idempotency scope.",
        ],
    },
    {
        "error_family": "SYSTEM_FAULT",
        "primary_severity": "CRITICAL",
        "blocking_class": "BLOCKS_RUN",
        "retry_class": "MANUAL_INTERVENTION_REQUIRED",
        "retry_budget_class": "NONE",
        "remediation_class": "OPEN_INVESTIGATION",
        "remediation_owner_type": "SERVICE_OPERATOR",
        "compensation_modes": ["MARK_AS_SUPERSEDED", "REQUIRE_MANUAL_SETTLEMENT"],
        "accepted_risk_allowed": False,
        "focus": "Supposedly impossible invariant breach or runtime corruption.",
        "example_codes": [
            "MANIFEST_EXECUTION_BASIS_HASH_MISSING",
            "REPLAY_BASIS_CORRUPT",
            "REPLAY_SCHEMA_READER_INCOMPATIBLE",
            "REPLAY_UNEXPECTED_MISMATCH",
        ],
        "closure_requirements": [
            "Fail closed with a typed object rather than a crash or log-only report.",
            "Closure requires basis, audit lineage, and often a durable investigation branch.",
        ],
    },
]


FAILURE_DASHBOARD_RULES = [
    {
        "canonical_name": "FailureLifecycleDashboard",
        "notes": [
            "Persist exactly one authoritative dashboard per governed lineage.",
            "The dashboard is a read model, not mutation-side truth.",
        ],
        "required_projection_fields": [
            "root_error_ref",
            "current_error_ref",
            "lineage_error_refs_in_order",
            "current_state_source",
            "current_owner",
            "next_legal_action",
            "blocking_scope",
            "remediation_summary",
            "compensation_posture",
            "investigation_posture",
            "accepted_risk_posture",
            "workflow_coordination",
            "closure_posture",
        ],
    },
    {
        "canonical_name": "LineageSpine",
        "notes": [
            "First lineage entry equals root_error_ref and last entry equals current_error_ref.",
            "Supersession and reopen flows keep the root-to-current chain visible.",
        ],
        "required_projection_fields": ["root_error_ref", "current_error_ref", "lineage_error_refs_in_order"],
    },
    {
        "canonical_name": "CurrentStateSource",
        "notes": [
            "If remediation, compensation, investigation, risk approval, or workflow is active, the source must point at that typed child object.",
        ],
        "required_projection_fields": ["current_state_source.source_artifact_type", "current_state_source.source_ref"],
    },
    {
        "canonical_name": "CurrentOwner",
        "notes": [
            "Accepted-risk posture still carries a current accountable owner.",
        ],
        "required_projection_fields": ["current_owner.owner_type", "current_owner.owner_ref_or_null"],
    },
    {
        "canonical_name": "NextLegalAction",
        "notes": [
            "Terminal dashboards force NO_FURTHER_ACTION.",
            "Non-terminal dashboards need a concrete action code or explicit waiting posture.",
        ],
        "required_projection_fields": ["next_legal_action.action_state", "next_legal_action.action_code"],
    },
    {
        "canonical_name": "CompensationVisibility",
        "notes": [
            "Compensation posture never replaces the underlying failure chain.",
        ],
        "required_projection_fields": ["compensation_posture", "root_error_ref", "current_error_ref"],
    },
    {
        "canonical_name": "AcceptedRiskVisibility",
        "notes": [
            "Accepted risk is not silent closure; it requires approval lineage, bounded scope, expiry, and owner visibility.",
        ],
        "required_projection_fields": ["accepted_risk_posture", "current_owner"],
    },
    {
        "canonical_name": "ClosureEvidenceContinuity",
        "notes": [
            "Closure evidence, audit refs, and provenance refs stay visible even when compensation or supersession appears.",
        ],
        "required_projection_fields": ["closure_posture", "lineage_refs.audit_refs", "lineage_refs.provenance_refs"],
    },
    {
        "canonical_name": "DataSourcePolicy",
        "notes": [
            "Logs, traces, free text, UI-local joins, and unordered scans are forbidden as lifecycle truth sources.",
        ],
        "required_projection_fields": [
            "underlying_error_visibility_policy",
            "accepted_risk_owner_policy",
            "data_source_policy",
            "log_reconstruction_policy",
        ],
    },
]


OWNER_CLOSURE_RULES = [
    {
        "role": "ERROR_RECORD",
        "owner_requirement": "Dominant remediation owner and object-backed next path unless system-owned automatic retry remains lawful.",
        "risk_requirement": "Accepted-risk refs only under resolution_state = ACCEPTED_RISK.",
        "closure_requirement": "Closure basis, evidence, and audit refs stay attached to the error.",
        "domain": "FAILURE",
    },
    {
        "role": "REMEDIATION_TASK",
        "owner_requirement": "Explicit owner type and owner ref unless the task is system-owned.",
        "risk_requirement": "Task completion cannot silently close the source error.",
        "closure_requirement": "Closure must declare error_resolution_effect and evidence refs.",
        "domain": "REMEDIATION",
    },
    {
        "role": "COMPENSATION_RECORD",
        "owner_requirement": "Explicit owner plus verification and closure basis.",
        "risk_requirement": "Settlement does not hide the error lineage or accepted-risk posture.",
        "closure_requirement": "Verification or supersession evidence must remain queryable.",
        "domain": "REMEDIATION",
    },
    {
        "role": "FAILURE_INVESTIGATION",
        "owner_requirement": "Durable forensic owner while ambiguity remains open.",
        "risk_requirement": "Investigation may lead to accepted risk, but only through a typed approval companion.",
        "closure_requirement": "Outcome and evidence remain durable even when the lineage resolves elsewhere.",
        "domain": "REMEDIATION",
    },
    {
        "role": "ACCEPTED_RISK_APPROVAL",
        "owner_requirement": "Approval lineage must still expose the current accountable owner.",
        "risk_requirement": "Bounded scope, authorization basis, and expiry are mandatory.",
        "closure_requirement": "Only lawful companion for accepted-risk closure.",
        "domain": "RISK",
    },
    {
        "role": "FAILURE_LIFECYCLE_DASHBOARD",
        "owner_requirement": "Projects the active owner from persisted lifecycle objects only.",
        "risk_requirement": "Keeps risk, compensation, and investigation branches visible without substituting them for the root lineage.",
        "closure_requirement": "No log-only reconstruction or note-derived next action.",
        "domain": "FAILURE",
    },
]


RETENTION_VISIBILITY_ROWS = [
    {
        "canonical_name": "AUDIT_EVENTS",
        "domain": "AUDIT",
        "visibility_boundary": "Operator, reviewer, compliance, and audit investigation surfaces; customer-safe derivatives only through dedicated projection.",
        "retention_boundary": "Append-only durable stream; payload may degrade to HASH_ONLY or ERASED while object refs, hashes, and lineage survive.",
        "query": "get_audit_trail(root_ref, options); get_filing_evidence_ledger(submission_record_id)",
        "notes": ["Audit is never sampled away.", "Deterministic ordering uses stream sequence, not event_time."],
    },
    {
        "canonical_name": "TRACES",
        "domain": "OPS",
        "visibility_boundary": "Operational and reliability investigation surfaces only.",
        "retention_boundary": "Potentially sampled operational telemetry; filing- and retention-critical spans are deterministic-retain or mandatory-forensic.",
        "query": "get_run_timeline(manifest_id)",
        "notes": ["Error spans require typed failure detail.", "Sampling may not remove mandatory audit history."],
    },
    {
        "canonical_name": "METRICS",
        "domain": "OPS",
        "visibility_boundary": "Aggregated operational, quality, and release-governance surfaces.",
        "retention_boundary": "Aggregated metric retention shorter than audit; no privacy-reintroducing dimensions.",
        "query": "Operational dashboards; get_operator_morning_digest(tenant_id, coverage_date)",
        "notes": ["Metrics summarize behavior and never become proof of record."],
    },
    {
        "canonical_name": "LOGS_RUNTIME",
        "domain": "OPS",
        "visibility_boundary": "Standard operations access tier.",
        "retention_boundary": "Short-lived structured logs; may be sampled or rotated faster than audit evidence.",
        "query": "get_run_timeline(manifest_id) as secondary explanation only",
        "notes": ["Logs cannot reconstruct the failure dashboard or privacy ledger."],
    },
    {
        "canonical_name": "LOGS_SESSION_SECURITY",
        "domain": "SECURITY",
        "visibility_boundary": "Security-restricted access tier.",
        "retention_boundary": "Security telemetry is durable enough for investigation but still distinct from audit proof.",
        "query": "Security investigations correlated through audit and failure ids",
        "notes": ["Carries access decisions, step-up events, and session anomalies."],
    },
    {
        "canonical_name": "LOGS_PRIVACY_RETENTION",
        "domain": "PRIVACY",
        "visibility_boundary": "Privacy-restricted access tier with customer-safe projection fences.",
        "retention_boundary": "Limited privacy telemetry does not erase explicit limitation posture.",
        "query": "get_privacy_action_ledger(client_id, options)",
        "notes": ["Missing rows may not silently imply lawful erasure."],
    },
    {
        "canonical_name": "ERROR_RECORD",
        "domain": "FAILURE",
        "visibility_boundary": "Operator-visible detail with explicit customer_visibility_class fencing.",
        "retention_boundary": "Typed failure objects persist per governed retention classes and link back to artifact_retention_ref where applicable.",
        "query": "BUILD_FAILURE_LIFECYCLE_DASHBOARD(...); get_run_timeline(manifest_id)",
        "notes": ["Material failure may not degrade into free text or logs only."],
    },
    {
        "canonical_name": "FAILURE_LIFECYCLE_DASHBOARD",
        "domain": "FAILURE",
        "visibility_boundary": "Operator-facing inspection surface with filtered customer-safe derivations.",
        "retention_boundary": "Persists as an authoritative read-side projection until lineage closure and retention policy allow archival.",
        "query": "Failure lifecycle dashboard projection",
        "notes": ["No log-only reconstruction.", "Underlying error remains visible through compensation and accepted risk."],
    },
    {
        "canonical_name": "ACCEPTED_RISK_APPROVAL",
        "domain": "RISK",
        "visibility_boundary": "Operator, approver, tenant-admin, or security-operator visibility depending on scope.",
        "retention_boundary": "Retains approval lineage, bounded scope, and expiry through the life of the exception.",
        "query": "Failure lifecycle dashboard projection",
        "notes": ["Accepted risk is explicit, not silent closure."],
    },
]


def build_signal_catalog() -> dict[str, Any]:
    rows = [
        record(
            record_type="SIGNAL_FAMILY",
            domain="AUDIT",
            canonical_name="AUDIT_EVENTS",
            producer_or_owner="Compliance-significant decision and lifecycle boundaries",
            correlation_keys=CORE_KEYS + LINEAGE_KEYS + AUTHORITY_KEYS + FAILURE_KEYS + RETENTION_KEYS,
            visibility_boundary="Append-only audit and investigation surfaces; customer-safe derivatives require explicit masking or separate projections.",
            retention_boundary="Durable append-only retention with explicit payload_availability_state and audit_sufficiency_state when payload bodies age out.",
            query_contract_or_projection="get_audit_trail(root_ref, options); get_filing_evidence_ledger(submission_record_id); get_privacy_action_ledger(client_id, options); get_replay_attestation(manifest_id)",
            linked_failure_or_provenance_edges=["ED_AUDITED_BY"],
            retry_or_resolution_posture="Not retried as telemetry; proves material decisions and legal state transitions.",
            closure_requirements=[
                "Persist audit_stream_ref + stream_sequence ordering.",
                "Retain object refs, reason codes, hashes, and lineage when payloads expire.",
            ],
            source_path=OBSERVABILITY_PATH,
            source_heading_or_logical_block="14.2 Separation of concerns / A. Audit evidence and 14.5 Audit event contract",
            notes=["Audit exists to prove what happened, not to optimize runtime tuning."],
            representative_event_types=AUDIT_EVENT_GROUPS[0]["events"][:3],
        ),
        record(
            record_type="SIGNAL_FAMILY",
            domain="OPS",
            canonical_name="TRACES",
            producer_or_owner="Run-engine orchestration and service runtime instrumentation",
            correlation_keys=CORE_KEYS + LINEAGE_KEYS + FAILURE_KEYS + REPLAY_KEYS,
            visibility_boundary="Operational investigation surfaces and run-timeline views; not the proof of record.",
            retention_boundary="Potentially sampled, except filing-, retention-, authority-, and replay-critical spans which stay deterministic-retain or mandatory-forensic.",
            query_contract_or_projection="get_run_timeline(manifest_id)",
            linked_failure_or_provenance_edges=["ED_CAUSED_BY_ERROR"],
            retry_or_resolution_posture="Typed error spans drive remediation only when correlated ErrorRecord lineage exists.",
            closure_requirements=[
                "Error spans require typed failure_class and failure_phase detail.",
                "Sampling may not remove mandatory audit anchors.",
            ],
            source_path=OBSERVABILITY_PATH,
            source_heading_or_logical_block="14.3 Signal model and 14.7 Trace contract",
            notes=[
                f"Trace span taxonomy freezes {len(TRACE_SPAN_ENUM)} minimum span codes.",
                f"Sampling posture enumerates {', '.join(TRACE_SAMPLING_ENUM)}.",
            ],
            representative_span_codes=TRACE_SPAN_ENUM,
        ),
        record(
            record_type="SIGNAL_FAMILY",
            domain="OPS",
            canonical_name="METRICS",
            producer_or_owner="Runtime analytics, release governance, and privacy-safe aggregates",
            correlation_keys=CORE_KEYS + NIGHTLY_KEYS + FAILURE_KEYS + RETENTION_KEYS,
            visibility_boundary="Aggregated operator and release-governance surfaces only.",
            retention_boundary="Shorter-lived than audit evidence; no metric row becomes proof of record.",
            query_contract_or_projection="get_operator_morning_digest(tenant_id, coverage_date); ops dashboards",
            linked_failure_or_provenance_edges=["ED_CAUSED_BY_ERROR"],
            retry_or_resolution_posture="Metrics influence retries and alerts indirectly; they never mutate lineage by themselves.",
            closure_requirements=[
                "Critical decisions remain anchored in audit and typed failures rather than counters.",
                "Dimensions must stay privacy-safe and correlation-capable.",
            ],
            source_path=OBSERVABILITY_PATH,
            source_heading_or_logical_block="14.8 Metric contract",
            notes=[
                f"Metric taxonomy freezes {len(METRIC_FAMILY_ENUM)} families and {', '.join(METRIC_INSTRUMENT_ENUM)} instruments.",
            ],
            representative_metric_families=METRIC_FAMILY_ENUM[:8],
        ),
        record(
            record_type="SIGNAL_FAMILY",
            domain="OPS",
            canonical_name="LOGS",
            producer_or_owner="Structured runtime logging with secure access tiers",
            correlation_keys=CORE_KEYS + FAILURE_KEYS + AUTHORITY_KEYS + RETENTION_KEYS,
            visibility_boundary="Tiered by access_tier and never a substitute for audit truth.",
            retention_boundary="Operational logs may rotate quickly and are explicitly shorter-lived than append-only audit evidence.",
            query_contract_or_projection="get_run_timeline(manifest_id) as secondary explanation only",
            linked_failure_or_provenance_edges=["ED_CAUSED_BY_ERROR"],
            retry_or_resolution_posture="Log records can evidence runtime context but cannot close or reopen failure lineages.",
            closure_requirements=[
                "Do not reintroduce masked, secret, or authority-sensitive data.",
                "Do not reconstruct dashboard truth from logs alone.",
            ],
            source_path=OBSERVABILITY_PATH,
            source_heading_or_logical_block="14.9 Logging contract",
            notes=[
                f"Log families: {', '.join(LOG_FAMILY_ENUM)}.",
                f"Access tiers: {', '.join(LOG_ACCESS_TIER_ENUM)}.",
            ],
        ),
        record(
            record_type="SIGNAL_FAMILY",
            domain="SECURITY",
            canonical_name="SECURITY_TELEMETRY",
            producer_or_owner="Access control, session security, and authority-binding anomaly surfaces",
            correlation_keys=CORE_KEYS + AUTHORITY_KEYS + FAILURE_KEYS + ["access_binding_hash", "policy_snapshot_hash"],
            visibility_boundary="Security-restricted operational surfaces with explicit customer-safe redaction.",
            retention_boundary="Durable enough for investigation, but still distinct from append-only audit proof.",
            query_contract_or_projection="Correlated through get_audit_trail(root_ref, options) and security investigations",
            linked_failure_or_provenance_edges=["ED_AUDITED_BY", "ED_CAUSED_BY_ERROR"],
            retry_or_resolution_posture="Security anomalies may open investigations or block retries; they never silently auto-close.",
            closure_requirements=[
                "Keep exact blocked or mismatch reason codes visible.",
                "Preserve binding refs for step-up, delegation, and export anomalies.",
            ],
            source_path=OBSERVABILITY_PATH,
            source_heading_or_logical_block="14.2 Separation of concerns / C. Security telemetry",
            notes=["Security telemetry focuses on access decisions, privilege changes, step-up, export attempts, and session anomalies."],
        ),
        record(
            record_type="SIGNAL_FAMILY",
            domain="PRIVACY",
            canonical_name="PRIVACY_TELEMETRY",
            producer_or_owner="Retention and privacy control plane",
            correlation_keys=CORE_KEYS + RETENTION_KEYS + FAILURE_KEYS + AUTHORITY_KEYS,
            visibility_boundary="Privacy-restricted surfaces and dedicated customer-safe explanations only.",
            retention_boundary="Retention-limited but explicit; lawful absence must remain distinguishable from corruption.",
            query_contract_or_projection="get_privacy_action_ledger(client_id, options); get_retention_limitation_path(object_id)",
            linked_failure_or_provenance_edges=["ED_AUDITED_BY", "ED_LIMITED_BY_RETENTION", "ED_ERASED_UNDER"],
            retry_or_resolution_posture="Privacy issues open typed errors, remediation, or accepted-risk branches rather than quiet omission.",
            closure_requirements=[
                "Keep limitation posture explicit when data is minimized or erased.",
                "No erasure may destroy the proof that erasure happened.",
            ],
            source_path=OBSERVABILITY_PATH,
            source_heading_or_logical_block="14.2 Separation of concerns / D. Privacy telemetry and 14.10 Audit versus telemetry retention",
            notes=["Privacy telemetry focuses on masking, legal hold, erasure, and sensitive-view access."],
        ),
        record(
            record_type="FAILURE_OBJECT",
            domain="FAILURE",
            canonical_name="ErrorRecord",
            producer_or_owner="Structured failure boundary",
            correlation_keys=CORE_KEYS + LINEAGE_KEYS + FAILURE_KEYS + AUTHORITY_KEYS + RETENTION_KEYS,
            visibility_boundary="Operator-visible typed failure detail with customer and operator visibility classes.",
            retention_boundary="Governed by error retention class and companion artifact_retention_ref when retention/privacy is causal.",
            query_contract_or_projection="Failure lifecycle dashboard projection; get_run_timeline(manifest_id)",
            linked_failure_or_provenance_edges=["ED_CAUSED_BY_ERROR", "ED_AUDITED_BY"],
            retry_or_resolution_posture="Carries severity, blocking class, retry class, remediation class, and resolution state as closed sets.",
            closure_requirements=[
                "No open error without lawful owner, next path, or scheduled retry.",
                "No accepted-risk refs outside ACCEPTED_RISK state.",
            ],
            source_path=ERROR_MODEL_PATH,
            source_heading_or_logical_block="13.2 Canonical error object",
            notes=[
                f"Error families: {', '.join(ERROR_FAMILY_ENUM)}.",
                f"Resolution states: {', '.join(RESOLUTION_STATE_ENUM)}.",
            ],
        ),
        record(
            record_type="FAILURE_OBJECT",
            domain="REMEDIATION",
            canonical_name="RemediationTask",
            producer_or_owner="Tracked remediation and follow-up work boundary",
            correlation_keys=CORE_KEYS + LINEAGE_KEYS + FAILURE_KEYS + RETENTION_KEYS,
            visibility_boundary="Operator and workflow coordination surfaces only.",
            retention_boundary="Persists as a typed lifecycle child object until effect on the source error is closed.",
            query_contract_or_projection="Failure lifecycle dashboard projection",
            linked_failure_or_provenance_edges=["ED_TRIGGERED_WORKFLOW", "ED_AUDITED_BY"],
            retry_or_resolution_posture="Carries task type, state, priority, and explicit error_resolution_effect.",
            closure_requirements=[
                "Task closure must preserve evidence and effect on the source error.",
                "Task completion cannot silently claim source-error closure.",
            ],
            source_path=ERROR_MODEL_PATH,
            source_heading_or_logical_block="13.8 Remediation task object and 13.11 Resolution states",
            notes=[f"Task taxonomy includes {len(REMEDIATION_TASK_TYPE_ENUM)} minimum task types."],
        ),
        record(
            record_type="FAILURE_OBJECT",
            domain="REMEDIATION",
            canonical_name="FailureInvestigation",
            producer_or_owner="Durable forensic branch for unresolved ambiguity",
            correlation_keys=CORE_KEYS + LINEAGE_KEYS + FAILURE_KEYS + AUTHORITY_KEYS + RETENTION_KEYS,
            visibility_boundary="Restricted operator and investigation surfaces.",
            retention_boundary="Persists through ambiguity, accepted risk, or supersession resolution.",
            query_contract_or_projection="Failure lifecycle dashboard projection; get_provenance(object_type, object_id, options)",
            linked_failure_or_provenance_edges=["ED_CAUSED_BY_ERROR", "ED_AUDITED_BY"],
            retry_or_resolution_posture="Investigation stays open as a typed branch until a durable outcome exists.",
            closure_requirements=[
                "Outcome, evidence, and accepted-risk linkage remain durable.",
                "No investigation collapses into a UI-only note.",
            ],
            source_path=ERROR_MODEL_PATH,
            source_heading_or_logical_block="13.9 Investigation companion object",
            notes=[f"Investigation classes: {', '.join(INVESTIGATION_CLASS_ENUM)}."],
        ),
        record(
            record_type="FAILURE_OBJECT",
            domain="REMEDIATION",
            canonical_name="CompensationRecord",
            producer_or_owner="Settlement and compensation branch",
            correlation_keys=CORE_KEYS + LINEAGE_KEYS + FAILURE_KEYS + AUTHORITY_KEYS,
            visibility_boundary="Operator-visible settlement lineage, never customer-safe by default.",
            retention_boundary="Persists until compensation is verified, cancelled, superseded, or archived under policy.",
            query_contract_or_projection="Failure lifecycle dashboard projection",
            linked_failure_or_provenance_edges=["ED_COMPENSATED_BY", "ED_AUDITED_BY"],
            retry_or_resolution_posture="Compensation does not replace the underlying error chain; it alters settlement posture.",
            closure_requirements=[
                "Retain owner, verification basis, and closure evidence.",
                "Do not hide the underlying error lineage.",
            ],
            source_path=ERROR_MODEL_PATH,
            source_heading_or_logical_block="13.9 Compensation model",
            notes=[f"Compensation modes: {', '.join(COMPENSATION_MODE_ENUM)}."],
        ),
        record(
            record_type="FAILURE_OBJECT",
            domain="RISK",
            canonical_name="AcceptedRiskApproval",
            producer_or_owner="Bounded exception and approval boundary",
            correlation_keys=CORE_KEYS + LINEAGE_KEYS + FAILURE_KEYS + RETENTION_KEYS,
            visibility_boundary="Operator, approver, tenant-admin, or security-operator surfaces depending on scope.",
            retention_boundary="Retains approval lineage, scope, and expiry for the life of the exception.",
            query_contract_or_projection="Failure lifecycle dashboard projection",
            linked_failure_or_provenance_edges=["ED_AUDITED_BY"],
            retry_or_resolution_posture="Accepted risk does not close lineage silently; it creates an explicit risk posture with expiry review.",
            closure_requirements=[
                "Approval basis, bounded scope, and expiry are mandatory.",
                "Current accountable owner remains visible while active.",
            ],
            source_path=ERROR_MODEL_PATH,
            source_heading_or_logical_block="13.9 Accepted-risk approval companion object",
            notes=[
                f"Approval states: {', '.join(APPROVAL_STATE_ENUM)}.",
                f"Approver types: {', '.join(APPROVER_TYPE_ENUM)}.",
            ],
        ),
        record(
            record_type="READ_MODEL",
            domain="FAILURE",
            canonical_name="FailureLifecycleDashboard",
            producer_or_owner="Authoritative persisted read-side projection",
            correlation_keys=CORE_KEYS + LINEAGE_KEYS + FAILURE_KEYS + AUTHORITY_KEYS + RETENTION_KEYS,
            visibility_boundary="Operator-facing failure inspection and downstream surface projections only.",
            retention_boundary="Persists as the read-side truth for one governed lineage until archival policy says otherwise.",
            query_contract_or_projection="BUILD_FAILURE_LIFECYCLE_DASHBOARD(...)",
            linked_failure_or_provenance_edges=["ED_CAUSED_BY_ERROR", "ED_COMPENSATED_BY", "ED_AUDITED_BY"],
            retry_or_resolution_posture="Projects current lineage state, owner, next legal action, and compensation/investigation/risk posture from typed objects only.",
            closure_requirements=[
                "No log-only or free-text status reconstruction.",
                "Underlying error remains visible through compensation and accepted risk.",
            ],
            source_path=FAILURE_DASHBOARD_PATH,
            source_heading_or_logical_block="Governing Model and Construction Rule",
            notes=[
                f"Current lineage states: {', '.join(DASHBOARD_STATE_ENUM)}.",
                f"Source artifact types: {', '.join(DASHBOARD_SOURCE_ARTIFACT_ENUM)}.",
                f"Owner types: {', '.join(DASHBOARD_OWNER_ENUM)}.",
            ],
        ),
    ]
    assert_required_record_fields(rows)
    domain_counts: dict[str, int] = {}
    for row in rows:
        domain_counts[row["domain"]] = domain_counts.get(row["domain"], 0) + 1
    return {
        "summary": {
            "row_count": len(rows),
            "domain_counts": domain_counts,
            "signal_family_count": 6,
            "failure_object_count": 6,
        },
        "rows": rows,
    }


def build_audit_event_family_registry() -> dict[str, Any]:
    rows: list[dict[str, Any]] = []
    for group in AUDIT_EVENT_GROUPS:
        for event_name in group["events"]:
            rows.append(
                record(
                    record_type="AUDIT_EVENT_FAMILY",
                    domain="AUDIT",
                    canonical_name=event_name,
                    producer_or_owner=group["owner"],
                    correlation_keys=group["correlation_keys"],
                    visibility_boundary="Append-only audit visibility with explicit masking, role-based access, and retained-context limits when payload bodies expire.",
                    retention_boundary="Durable audit retention; event payloads may become hash-only, tombstoned, or erased while hashes, reason codes, and lineage survive.",
                    query_contract_or_projection=group["query"],
                    linked_failure_or_provenance_edges=["ED_AUDITED_BY"],
                    retry_or_resolution_posture="Evidence event; any retries or resolutions are driven by correlated typed failures and workflow objects rather than by the event itself.",
                    closure_requirements=[
                        "Preserve audit_stream_ref + stream_sequence ordering.",
                        "Keep reason_codes, object_refs, event_payload_hash, and lineage refs durable after payload expiry.",
                    ],
                    source_path=OBSERVABILITY_PATH,
                    source_heading_or_logical_block=group["heading"],
                    notes=group["notes"],
                    group_id=group["group_id"],
                    group_title=group["title"],
                )
            )
    assert_required_record_fields(rows)
    return {
        "summary": {
            "row_count": len(rows),
            "group_count": len(AUDIT_EVENT_GROUPS),
            "replay_event_count": len(AUDIT_EVENT_GROUPS[-1]["events"]),
        },
        "groups": [
            {
                "group_id": group["group_id"],
                "title": group["title"],
                "heading": group["heading"],
                "event_count": len(group["events"]),
            }
            for group in AUDIT_EVENT_GROUPS
        ],
        "rows": rows,
    }


def build_correlation_topology_and_queries() -> dict[str, Any]:
    query_rows = [
        record(
            record_type="QUERY_CONTRACT",
            domain=query["domain"],
            canonical_name=query["name"],
            producer_or_owner=query["owner"],
            correlation_keys=query["dependencies"],
            visibility_boundary="Query surface visibility follows the underlying signal domain and never widens beyond the most restrictive contributing record.",
            retention_boundary="Query results surface explicit limitation posture when underlying payloads are minimized, sampled, hash-only, tombstoned, or erased.",
            query_contract_or_projection=query["name"],
            linked_failure_or_provenance_edges=["ED_AUDITED_BY", "ED_CAUSED_BY_ERROR", "ED_COMPENSATED_BY"],
            retry_or_resolution_posture="Query surfaces explain current truth and lineage; they do not mutate or resolve the lifecycle by themselves.",
            closure_requirements=[
                "Ordering basis and integrity posture must remain explicit in the response contract.",
                "Logs and metrics may appear as supporting explanation only, never as sole proof of record.",
            ],
            source_path=query["source_path"],
            source_heading_or_logical_block=query["source_heading"],
            notes=[query["response_shape_notes"]],
            query_code=query["query_code"],
            ordering_basis=query["ordering_basis"],
            integrity_posture=query["integrity_posture"],
        )
        for query in QUERY_CONTRACTS
    ]
    assert_required_record_fields(query_rows)

    topology_edges = [
        {
            "edge_id": "signal-traces-to-audit",
            "from_record": "TRACES",
            "to_record": "AUDIT_EVENTS",
            "join_keys": ordered_unique(CORE_KEYS + LINEAGE_KEYS + FAILURE_KEYS),
            "lineage_basis": "Run timeline joins runtime spans to compliance-significant audit events without collapsing them into one stream.",
            "provenance_edges": ["ED_AUDITED_BY"],
        },
        {
            "edge_id": "metrics-to-audit",
            "from_record": "METRICS",
            "to_record": "AUDIT_EVENTS",
            "join_keys": ordered_unique(CORE_KEYS + NIGHTLY_KEYS + FAILURE_KEYS),
            "lineage_basis": "Operational aggregates remain explainers of runtime posture while audit events stay the legal record.",
            "provenance_edges": ["ED_AUDITED_BY"],
        },
        {
            "edge_id": "logs-to-errors",
            "from_record": "LOGS",
            "to_record": "ErrorRecord",
            "join_keys": ordered_unique(CORE_KEYS + FAILURE_KEYS + AUTHORITY_KEYS),
            "lineage_basis": "A log line may evidence runtime context, but typed ErrorRecord remains the canonical failure statement.",
            "provenance_edges": ["ED_CAUSED_BY_ERROR"],
        },
        {
            "edge_id": "audit-to-error",
            "from_record": "AUDIT_EVENTS",
            "to_record": "ErrorRecord",
            "join_keys": ordered_unique(CORE_KEYS + FAILURE_KEYS + RETENTION_KEYS),
            "lineage_basis": "Gate and lifecycle events must correlate to typed failure objects when blocking or remediation exists.",
            "provenance_edges": ["ED_AUDITED_BY", "ED_CAUSED_BY_ERROR"],
        },
        {
            "edge_id": "error-to-remediation",
            "from_record": "ErrorRecord",
            "to_record": "RemediationTask",
            "join_keys": ordered_unique(CORE_KEYS + FAILURE_KEYS + RETENTION_KEYS),
            "lineage_basis": "Source error links directly to remediation, investigation, compensation, or accepted-risk companions.",
            "provenance_edges": ["ED_TRIGGERED_WORKFLOW", "ED_CAUSED_BY_ERROR"],
        },
        {
            "edge_id": "error-to-compensation",
            "from_record": "ErrorRecord",
            "to_record": "CompensationRecord",
            "join_keys": ordered_unique(CORE_KEYS + FAILURE_KEYS + AUTHORITY_KEYS),
            "lineage_basis": "Settlement branches remain anchored to the underlying failure lineage.",
            "provenance_edges": ["ED_COMPENSATED_BY"],
        },
        {
            "edge_id": "retention-to-failure",
            "from_record": "PRIVACY_TELEMETRY",
            "to_record": "ErrorRecord",
            "join_keys": ordered_unique(CORE_KEYS + RETENTION_KEYS + FAILURE_KEYS + AUTHORITY_KEYS),
            "lineage_basis": "Retention- or privacy-driven limitations must materialize as typed failure objects or an explicit no-error statement.",
            "provenance_edges": ["ED_LIMITED_BY_RETENTION", "ED_ERASED_UNDER"],
        },
        {
            "edge_id": "dashboard-to-lineage",
            "from_record": "FailureLifecycleDashboard",
            "to_record": "ErrorRecord",
            "join_keys": ordered_unique(CORE_KEYS + LINEAGE_KEYS + FAILURE_KEYS),
            "lineage_basis": "The dashboard consumes persisted failure, workflow, audit, and provenance objects only.",
            "provenance_edges": ["ED_CAUSED_BY_ERROR", "ED_COMPENSATED_BY", "ED_AUDITED_BY"],
        },
        {
            "edge_id": "replay-to-attestation",
            "from_record": "AUDIT_EVENTS",
            "to_record": "FailureLifecycleDashboard",
            "join_keys": ordered_unique(CORE_KEYS + LINEAGE_KEYS + REPLAY_KEYS + FAILURE_KEYS),
            "lineage_basis": "Replay outcomes remain explainable through dedicated replay events and typed failure reasons.",
            "provenance_edges": ["ED_AUDITED_BY", "ED_CAUSED_BY_ERROR"],
        },
    ]

    return {
        "summary": {
            "query_contract_count": len(query_rows),
            "topology_edge_count": len(topology_edges),
            "mandatory_correlation_key_count": len(
                ordered_unique(CORE_KEYS + LINEAGE_KEYS + BRANCH_KEYS + AUTHORITY_KEYS + NIGHTLY_KEYS + FAILURE_KEYS + RETENTION_KEYS + REPLAY_KEYS)
            ),
        },
        "mandatory_correlation_keys": {
            "core": CORE_KEYS,
            "lineage": LINEAGE_KEYS,
            "branch_selection": BRANCH_KEYS,
            "authority": AUTHORITY_KEYS,
            "nightly": NIGHTLY_KEYS,
            "failure": FAILURE_KEYS,
            "retention": RETENTION_KEYS,
            "replay": REPLAY_KEYS,
            "allowed_enum_snapshots": {
                "run_kind": RUN_KIND_ENUM,
                "mode": MODE_ENUM,
                "selection_disposition": SELECTION_DISPOSITION_ENUM,
                "replay_class": REPLAY_CLASS_ENUM,
                "comparison_mode": COMPARISON_MODE_ENUM,
                "basis_validation_state": BASIS_VALIDATION_ENUM,
                "input_inheritance_mode": INPUT_INHERITANCE_ENUM,
                "config_inheritance_mode": CONFIG_INHERITANCE_ENUM,
            },
        },
        "query_contracts": query_rows,
        "topology_edges": topology_edges,
        "ordering_basis_enum": QUERY_ORDERING_ENUM,
        "integrity_posture_enum": INTEGRITY_POSTURE_ENUM,
    }


def build_error_matrix() -> dict[str, Any]:
    rows: list[dict[str, Any]] = []
    retry_formula = "next_retry_at = min(policy_deadline, opened_at + min(bmax, b0 * 2^n) + phase_offset_seconds)"
    for config in ERROR_FAMILY_CONFIG:
        rows.append(
            record(
                record_type="ERROR_FAMILY",
                domain="FAILURE" if config["error_family"] not in {"RETENTION_ERROR", "PRIVACY_ERROR"} else ("PRIVACY" if config["error_family"] == "PRIVACY_ERROR" else "FAILURE"),
                canonical_name=config["error_family"],
                producer_or_owner="Structured failure model",
                correlation_keys=CORE_KEYS + LINEAGE_KEYS + FAILURE_KEYS + AUTHORITY_KEYS + RETENTION_KEYS,
                visibility_boundary="Operator-visible typed failure detail; customer-safe projections must be explicitly narrowed by visibility class.",
                retention_boundary="Carries retention_class and artifact_retention_ref when retention/privacy control state is causal; otherwise follows governed failure retention policy.",
                query_contract_or_projection="Failure lifecycle dashboard projection; get_run_timeline(manifest_id)",
                linked_failure_or_provenance_edges=["ED_CAUSED_BY_ERROR", "ED_AUDITED_BY"],
                retry_or_resolution_posture=f"{config['retry_class']} / {config['retry_budget_class']} / {config['remediation_class']}",
                closure_requirements=config["closure_requirements"],
                source_path=ERROR_MODEL_PATH,
                source_heading_or_logical_block="13.3 Error families through 13.14 Invariants",
                notes=[config["focus"]],
                primary_severity=config["primary_severity"],
                dominant_blocking_class=config["blocking_class"],
                retry_class=config["retry_class"],
                retry_budget_class=config["retry_budget_class"],
                remediation_class=config["remediation_class"],
                remediation_owner_type=config["remediation_owner_type"],
                compensation_modes=config["compensation_modes"],
                accepted_risk_allowed=config["accepted_risk_allowed"],
                example_codes=config["example_codes"],
                retry_scheduling_formula=retry_formula if config["retry_class"] not in {"NO_RETRY", "MANUAL_INTERVENTION_REQUIRED"} else "NOT_APPLICABLE",
            )
        )
    assert_required_record_fields(rows)
    return {
        "summary": {
            "row_count": len(rows),
            "severity_enum": ERROR_SEVERITY_ENUM,
            "blocking_class_enum": BLOCKING_CLASS_ENUM,
            "retry_class_enum": RETRY_CLASS_ENUM,
            "retry_budget_class_enum": RETRY_BUDGET_ENUM,
            "remediation_class_enum": REMEDIATION_CLASS_ENUM,
            "remediation_owner_type_enum": REMEDIATION_OWNER_ENUM,
        },
        "rows": rows,
    }


def build_dashboard_rules() -> dict[str, Any]:
    rows = [
        record(
            record_type="DASHBOARD_PROJECTION_RULE",
            domain="FAILURE",
            canonical_name=rule["canonical_name"],
            producer_or_owner="Authoritative failure lifecycle dashboard builder",
            correlation_keys=CORE_KEYS + LINEAGE_KEYS + FAILURE_KEYS + RETENTION_KEYS,
            visibility_boundary="Operator-facing lineage inspection only; downstream surfaces derive from the persisted projection and explicit visibility classes.",
            retention_boundary="Persists until the governed lineage ages out under policy; never reconstructed from log history.",
            query_contract_or_projection="BUILD_FAILURE_LIFECYCLE_DASHBOARD(...)",
            linked_failure_or_provenance_edges=["ED_CAUSED_BY_ERROR", "ED_COMPENSATED_BY", "ED_AUDITED_BY"],
            retry_or_resolution_posture="Projection reads typed lifecycle state; it does not infer resolution from logs, notes, or message copy.",
            closure_requirements=rule["required_projection_fields"],
            source_path=FAILURE_DASHBOARD_PATH,
            source_heading_or_logical_block="Governing Model, Read-Model Rules, and Construction Rule",
            notes=rule["notes"],
        )
        for rule in FAILURE_DASHBOARD_RULES
    ]
    assert_required_record_fields(rows)
    return {
        "summary": {
            "row_count": len(rows),
            "lineage_state_enum": DASHBOARD_STATE_ENUM,
            "source_artifact_type_enum": DASHBOARD_SOURCE_ARTIFACT_ENUM,
        },
        "rows": rows,
        "forbidden_inputs": [
            "operational log text",
            "operator notes",
            "message copy",
            "UI-local joins",
            "unordered raw table scans with no typed lineage basis",
        ],
    }


def build_owner_closure_matrix() -> dict[str, Any]:
    rows = [
        record(
            record_type="FAILURE_ROLE_RULE",
            domain=item["domain"],
            canonical_name=item["role"],
            producer_or_owner="Failure resolution ownership and closure contract",
            correlation_keys=CORE_KEYS + LINEAGE_KEYS + FAILURE_KEYS + RETENTION_KEYS,
            visibility_boundary="Operator-facing lifecycle law; customer-safe surfaces use derived messages only.",
            retention_boundary="Owner and closure rules persist as typed lifecycle basis until the lineage is terminal and archived.",
            query_contract_or_projection="Failure lifecycle dashboard projection",
            linked_failure_or_provenance_edges=["ED_CAUSED_BY_ERROR", "ED_COMPENSATED_BY", "ED_AUDITED_BY"],
            retry_or_resolution_posture=item["risk_requirement"],
            closure_requirements=[item["owner_requirement"], item["closure_requirement"]],
            source_path=FAILURE_OWNERSHIP_PATH,
            source_heading_or_logical_block="Governing Model, Required Outcomes, and Surface Rules",
            notes=[item["risk_requirement"]],
            owner_requirement=item["owner_requirement"],
            risk_requirement=item["risk_requirement"],
            closure_requirement=item["closure_requirement"],
        )
        for item in OWNER_CLOSURE_RULES
    ]
    assert_required_record_fields(rows)
    return {
        "summary": {
            "row_count": len(rows),
            "lifecycle_roles": schema_enum(FAILURE_RESOLUTION_SCHEMA_PATH, "properties", "lifecycle_role", "enum"),
            "binding_policies": schema_enum(
                FAILURE_RESOLUTION_SCHEMA_PATH, "properties", "role_specific_binding_policy", "enum"
            ),
        },
        "rows": rows,
    }


def build_retention_visibility_matrix() -> dict[str, Any]:
    rows = [
        record(
            record_type="RETENTION_VISIBILITY_RULE",
            domain=item["domain"],
            canonical_name=item["canonical_name"],
            producer_or_owner="Observability, privacy, and failure integration boundary",
            correlation_keys=CORE_KEYS + LINEAGE_KEYS + FAILURE_KEYS + AUTHORITY_KEYS + RETENTION_KEYS,
            visibility_boundary=item["visibility_boundary"],
            retention_boundary=item["retention_boundary"],
            query_contract_or_projection=item["query"],
            linked_failure_or_provenance_edges=["ED_AUDITED_BY", "ED_LIMITED_BY_RETENTION", "ED_CAUSED_BY_ERROR"],
            retry_or_resolution_posture="Visibility and limitation posture stay explicit; missing rows never imply safe closure or lawful deletion.",
            closure_requirements=[
                "State limitation posture explicitly rather than inferring from missing payload.",
                "Keep customer-safe and internal-only boundaries distinct.",
            ],
            source_path=RETENTION_OBSERVABILITY_PATH,
            source_heading_or_logical_block="15.4 Correlation, visibility, and signal separation",
            notes=item["notes"],
        )
        for item in RETENTION_VISIBILITY_ROWS
    ]
    assert_required_record_fields(rows)
    return {
        "summary": {
            "row_count": len(rows),
            "domains": sorted({row["domain"] for row in rows}),
        },
        "rows": rows,
        "payload_availability_states": schema_enum(
            AUDIT_EVENT_SCHEMA_PATH, "properties", "retained_context", "properties", "payload_availability_state", "enum"
        ),
        "audit_sufficiency_states": schema_enum(
            AUDIT_EVENT_SCHEMA_PATH, "properties", "retained_context", "properties", "audit_sufficiency_state", "enum"
        ),
    }


def build_mermaid() -> str:
    return dedent(
        """
        flowchart LR
          subgraph Signals["Signal braid"]
            AUD["Audit events"]
            TR["Traces"]
            ME["Metrics"]
            LO["Structured logs"]
            SE["Security telemetry"]
            PR["Privacy telemetry"]
          end

          subgraph Failure["Failure lineage"]
            ER["ErrorRecord"]
            RT["RemediationTask"]
            IN["FailureInvestigation"]
            CO["CompensationRecord"]
            AR["AcceptedRiskApproval"]
            FD["FailureLifecycleDashboard"]
          end

          subgraph Provenance["Provenance graph"]
            AE["EN_AUDIT_EVENT"]
            EE["EN_ERROR_RECORD"]
            CE["EN_COMPENSATION_RECORD"]
            PB["PATH_REMEDIATION_CHAIN"]
          end

          TR -->|"manifest_id, trace_id, error_id"| ER
          ME -->|"nightly_batch_run_ref, manifest_id"| AUD
          LO -->|"error_id, authority_operation_id"| ER
          SE -->|"access_binding_hash, policy_snapshot_hash"| AUD
          PR -->|"retention_class, artifact lineage"| ER
          AUD -->|"ED_AUDITED_BY"| AE
          ER -->|"ED_CAUSED_BY_ERROR"| EE
          CO -->|"ED_COMPENSATED_BY"| CE
          ER --> RT
          ER --> IN
          ER --> CO
          ER --> AR
          RT --> FD
          IN --> FD
          CO --> FD
          AR --> FD
          ER --> FD
          FD -->|"root_error_ref -> current_error_ref"| PB
          AE --> PB
          EE --> PB
          CE --> PB
        """
    ).strip()


def render_overview_doc(
    signal_catalog: dict[str, Any],
    audit_registry: dict[str, Any],
    correlation_pack: dict[str, Any],
    error_matrix: dict[str, Any],
    dashboard_rules: dict[str, Any],
    owner_closure: dict[str, Any],
    retention_visibility: dict[str, Any],
) -> str:
    signal_rows = signal_catalog["rows"]
    overview_rows = [
        {
            "artifact": "Signal rows",
            "count": signal_catalog["summary"]["row_count"],
            "notes": "Audit, telemetry, failure objects, and dashboard truth remain separated by design.",
        },
        {
            "artifact": "Mandatory audit events",
            "count": audit_registry["summary"]["row_count"],
            "notes": "All audit event families from the schema-backed corpus are normalized into one registry.",
        },
        {
            "artifact": "Query contracts",
            "count": correlation_pack["summary"]["query_contract_count"],
            "notes": "Includes audit, run, filing, privacy, replay, and provenance investigation surfaces.",
        },
        {
            "artifact": "Error families",
            "count": error_matrix["summary"]["row_count"],
            "notes": "Retry, remediation, ownership, compensation, and accepted-risk posture are closed sets.",
        },
        {
            "artifact": "Dashboard projection rules",
            "count": dashboard_rules["summary"]["row_count"],
            "notes": "Projection truth is persisted and explicitly rejects log-only reconstruction.",
        },
        {
            "artifact": "Retention and visibility rules",
            "count": retention_visibility["summary"]["row_count"],
            "notes": "Visibility fences and lawful limitation remain explicit per domain.",
        },
    ]
    signal_snapshot = [
        {
            "canonical_name": row["canonical_name"],
            "domain": row["domain"],
            "producer_or_owner": row["producer_or_owner"],
            "query_contract_or_projection": row["query_contract_or_projection"],
        }
        for row in signal_rows
    ]
    return normalize_markdown(
        f"""
        # Observability, Audit, and Failure Management

        This pack turns the Taxat observability, audit, failure-lineage, remediation, and closure corpus
        into one implementation-grade boundary. The governing rule is simple: audit evidence proves what
        happened; telemetry explains runtime; typed failure objects control resolution; and the
        `FailureLifecycleDashboard` is the only lawful dashboard truth for a governed lineage.

        ## Coverage Snapshot

        {render_table(["artifact", "count", "notes"], overview_rows)}

        ## Signal and Failure Surfaces

        {render_table(["canonical_name", "domain", "producer_or_owner", "query_contract_or_projection"], signal_snapshot)}

        ## Contract Laws

        - Audit evidence, operational telemetry, security telemetry, and privacy telemetry remain distinct even when implemented on one backend stack.
        - Typed failures, remediation, compensation, investigations, and accepted-risk approvals are first-class lifecycle objects, not log-derived summaries.
        - The failure dashboard is a persisted read model that may consume only typed lifecycle objects, workflow state, audit refs, and provenance refs.
        - Retention-limited visibility must remain explicit. A missing payload is not allowed to masquerade as lawful closure, lawful erasure, or lack of evidence.
        - Replay comparison and attestation keep their own query surface, audit events, hashes, and failure codes.

        ## Gap Closure

        - Closed the signal-separation gap by normalizing audit, ops, security, privacy, and failure objects into `signal_catalog.json`.
        - Closed the correlation gap by publishing explicit topology edges, closed-set correlation keys, and query contracts in `correlation_topology_and_query_contracts.json`.
        - Closed the failure-dashboard gap by extracting the persisted projection rules and the forbidden log-only reconstruction inputs into `failure_lifecycle_dashboard_projection_rules.json`.
        - Closed the owner, closure, compensation, and accepted-risk scattering gap by consolidating them into `failure_owner_closure_and_risk_matrix.json`.

        ## Source Grounding

        - `Algorithm/observability_and_audit_contract.md`
        - `Algorithm/retention_error_and_observability_contract.md`
        - `Algorithm/error_model_and_remediation_model.md`
        - `Algorithm/failure_lifecycle_dashboard_and_lineage_contract.md`
        - `Algorithm/failure_resolution_ownership_and_closure_contract.md`
        - `Algorithm/provenance_graph_semantics.md`
        - `Algorithm/frontend_shell_and_interaction_law.md`
        - `Algorithm/admin_governance_console_architecture.md`
        - `Algorithm/empty_state_limitation_and_recovery_taxonomy_contract.md`
        """
    )


def render_signal_doc(signal_catalog: dict[str, Any], correlation_pack: dict[str, Any], retention_visibility: dict[str, Any]) -> str:
    signal_rows = signal_catalog["rows"]
    query_rows = correlation_pack["query_contracts"]
    retention_rows = retention_visibility["rows"]
    signal_table = [
        {
            "canonical_name": row["canonical_name"],
            "domain": row["domain"],
            "retention_boundary": row["retention_boundary"],
            "visibility_boundary": row["visibility_boundary"],
        }
        for row in signal_rows
    ]
    query_table = [
        {
            "query_code": row["query_code"],
            "canonical_name": row["canonical_name"],
            "domain": row["domain"],
            "ordering_basis": row["ordering_basis"],
        }
        for row in query_rows
    ]
    retention_table = [
        {
            "canonical_name": row["canonical_name"],
            "domain": row["domain"],
            "query_contract_or_projection": row["query_contract_or_projection"],
            "notes": row["notes"],
        }
        for row in retention_rows
    ]
    key_buckets = correlation_pack["mandatory_correlation_keys"]
    return normalize_markdown(
        f"""
        # Signal Model, Correlation, and Retention Specification

        The signal model keeps four observability lanes and a typed failure lane:
        audit evidence, operational telemetry, security telemetry, privacy telemetry, and structured
        failure/remediation objects. They are allowed to share identifiers, not identity.

        ## Mandatory Correlation Keys

        - Core: {", ".join(key_buckets["core"])}
        - Lineage: {", ".join(key_buckets["lineage"])}
        - Branch selection: {", ".join(key_buckets["branch_selection"])}
        - Authority: {", ".join(key_buckets["authority"])}
        - Nightly: {", ".join(key_buckets["nightly"])}
        - Failure: {", ".join(key_buckets["failure"])}
        - Retention: {", ".join(key_buckets["retention"])}
        - Replay: {", ".join(key_buckets["replay"])}

        ## Signal Catalog

        {render_table(["canonical_name", "domain", "retention_boundary", "visibility_boundary"], signal_table)}

        ## Query Contract Catalog

        {render_table(["query_code", "canonical_name", "domain", "ordering_basis"], query_table)}

        ## Retention and Visibility Binding

        {render_table(["canonical_name", "domain", "query_contract_or_projection", "notes"], retention_table)}

        ## Invariants

        - No compliance-significant event may exist without a path back to a manifest, submission record, authority operation, or frozen nightly batch identity.
        - No sampled telemetry decision may remove mandatory audit history.
        - Privacy and retention query slices keep deterministic audit order and only use logs or traces as secondary explanation.
        - Replay-specific comparison outcomes require durable replay attestation or a typed failure reason.
        """
    )


def render_dashboard_doc(error_matrix: dict[str, Any], dashboard_rules: dict[str, Any], owner_closure: dict[str, Any]) -> str:
    error_rows = error_matrix["rows"]
    dashboard_rows = dashboard_rules["rows"]
    owner_rows = owner_closure["rows"]
    error_table = [
        {
            "canonical_name": row["canonical_name"],
            "primary_severity": row["primary_severity"],
            "dominant_blocking_class": row["dominant_blocking_class"],
            "retry_class": row["retry_class"],
            "remediation_class": row["remediation_class"],
        }
        for row in error_rows
    ]
    rule_table = [
        {
            "canonical_name": row["canonical_name"],
            "closure_requirements": row["closure_requirements"],
            "notes": row["notes"],
        }
        for row in dashboard_rows
    ]
    owner_table = [
        {
            "canonical_name": row["canonical_name"],
            "owner_requirement": row["owner_requirement"],
            "risk_requirement": row["risk_requirement"],
            "closure_requirement": row["closure_requirement"],
        }
        for row in owner_rows
    ]
    return normalize_markdown(
        f"""
        # Failure Lifecycle Dashboard Specification

        `FailureLifecycleDashboard` is the authoritative inspection surface for one governed failure
        lineage. It summarizes typed failure objects only and rejects log-only or note-only status
        reconstruction.

        ## Error Family Matrix

        {render_table(["canonical_name", "primary_severity", "dominant_blocking_class", "retry_class", "remediation_class"], error_table)}

        ## Dashboard Projection Rules

        {render_table(["canonical_name", "closure_requirements", "notes"], rule_table)}

        ## Owner, Closure, and Risk Rules

        {render_table(["canonical_name", "owner_requirement", "risk_requirement", "closure_requirement"], owner_table)}

        ## Non-Negotiable Laws

        - The root-to-current lineage spine remains visible through retry, remediation, investigation, compensation, supersession, and accepted risk.
        - Accepted risk requires explicit approval lineage, bounded scope, expiry, and a current accountable owner.
        - Compensation posture never replaces the underlying error chain.
        - Closure evidence, audit refs, and provenance refs remain visible after settlement branches appear.
        - The dashboard may consume persisted lifecycle objects, workflow state, audit refs, and provenance refs only.
        """
    )


def build_atlas_data(
    signal_catalog: dict[str, Any],
    audit_registry: dict[str, Any],
    correlation_pack: dict[str, Any],
    error_matrix: dict[str, Any],
    dashboard_rules: dict[str, Any],
    retention_visibility: dict[str, Any],
) -> dict[str, Any]:
    audit_groups = []
    rows_by_group: dict[str, list[dict[str, Any]]] = {}
    for row in audit_registry["rows"]:
        rows_by_group.setdefault(row["group_id"], []).append(row)
    for group in AUDIT_EVENT_GROUPS:
        audit_groups.append(
            {
                "group_id": group["group_id"],
                "title": group["title"],
                "heading": group["heading"],
                "event_count": len(group["events"]),
                "events": [
                    {
                        "canonical_name": row["canonical_name"],
                        "notes": row["notes"],
                        "closure_requirements": row["closure_requirements"],
                    }
                    for row in rows_by_group[group["group_id"]]
                ],
            }
        )

    lineage_states = [
        {
            "state_id": "open_failure",
            "label": "Open failure",
            "lineage_state": "OPEN_FAILURE",
            "owner": "SERVICE_OPERATOR",
            "next_action": "Open remediation and verify dominant blocking scope",
            "blocking_scope": "BLOCKS_FILING",
            "retry_posture": "RECONCILE_THEN_RETRY / RECONCILIATION_GATED",
            "compensation_posture": "NONE",
            "accepted_risk_posture": "NONE",
            "closure_checks": [
                "Underlying error remains visible",
                "Typed next action is present",
                "Audit refs exist",
            ],
            "inspector_title": "Current lineage: open failure",
            "inspector_copy": "The failure remains active. The dashboard exposes the root chain, current owner, and next legal action from typed objects only.",
            "lineage_nodes": ["Root Error", "Current Error"],
        },
        {
            "state_id": "remediation_active",
            "label": "Remediation active",
            "lineage_state": "REMEDIATION_ACTIVE",
            "owner": "REVIEWER",
            "next_action": "Complete remediation task and declare error_resolution_effect",
            "blocking_scope": "BLOCKS_REVIEW_PROGRESS",
            "retry_posture": "HUMAN_REVIEW_THEN_RETRY / HUMAN_GATED",
            "compensation_posture": "NONE",
            "accepted_risk_posture": "NONE",
            "closure_checks": [
                "Task closure declares effect on source error",
                "Closure evidence refs remain attached",
                "Workflow coordination is visible",
            ],
            "inspector_title": "Current lineage: remediation active",
            "inspector_copy": "The remediation task is now the current_state_source, but the root error is still visible in the lineage ribbon.",
            "lineage_nodes": ["Root Error", "Remediation Task", "Current Error"],
        },
        {
            "state_id": "accepted_risk",
            "label": "Accepted risk",
            "lineage_state": "ACCEPTED_RISK_ACTIVE",
            "owner": "APPROVER",
            "next_action": "Monitor approval expiry and accountable owner review date",
            "blocking_scope": "BLOCKS_FILING",
            "retry_posture": "NO_RETRY / bounded exception path",
            "compensation_posture": "PLANNED",
            "accepted_risk_posture": "ACTIVE",
            "closure_checks": [
                "Approval basis, scope, and expiry remain visible",
                "Current accountable owner remains visible",
                "Underlying error does not disappear",
            ],
            "inspector_title": "Current lineage: accepted risk",
            "inspector_copy": "Accepted risk is explicit, bounded, and reviewable. It is never a silent terminal state.",
            "lineage_nodes": ["Root Error", "Accepted Risk Approval", "Current Error"],
        },
        {
            "state_id": "resolved",
            "label": "Resolved",
            "lineage_state": "RESOLVED",
            "owner": "SYSTEM",
            "next_action": "NO_FURTHER_ACTION",
            "blocking_scope": "NON_BLOCKING",
            "retry_posture": "No active retry",
            "compensation_posture": "VERIFIED",
            "accepted_risk_posture": "NONE",
            "closure_checks": [
                "Closure evidence and resolution_basis_ref remain queryable",
                "Audit refs and provenance refs remain attached",
                "Terminal posture came from typed state, not logs",
            ],
            "inspector_title": "Current lineage: resolved",
            "inspector_copy": "Resolution is terminal only because typed artifacts say it is. The inspector still keeps the evidence spine visible.",
            "lineage_nodes": ["Root Error", "Compensation Verified", "Resolved Error"],
        },
    ]

    domain_pages = [
        {"page_id": "signal-model", "title": "Signal Model", "accent": "audit"},
        {"page_id": "audit-families", "title": "Audit Families", "accent": "audit"},
        {"page_id": "failure-lifecycle", "title": "Failure Lifecycle", "accent": "failure"},
        {"page_id": "query-contracts", "title": "Query Contracts", "accent": "lineage"},
        {"page_id": "retention-visibility", "title": "Retention & Visibility", "accent": "risk"},
    ]

    signal_lanes = [
        {
            "lane_id": "audit",
            "label": "Audit",
            "accent": "audit",
            "description": "Append-only, legally or operationally significant, minimally editable, durable, explainability-oriented.",
            "records": ["AUDIT_EVENTS"],
        },
        {
            "lane_id": "ops",
            "label": "Ops",
            "accent": "ops",
            "description": "Runtime-oriented, high-volume, potentially sampled, performance and reliability-oriented, correlation-capable.",
            "records": ["TRACES", "METRICS", "LOGS"],
        },
        {
            "lane_id": "security",
            "label": "Security",
            "accent": "failure",
            "description": "Access decisions, privilege changes, step-up events, binding mismatches, export attempts, and session anomalies.",
            "records": ["SECURITY_TELEMETRY"],
        },
        {
            "lane_id": "privacy",
            "label": "Privacy",
            "accent": "risk",
            "description": "Sensitive-view access, masking actions, erasure requests, legal-hold transitions, and export or delete operations.",
            "records": ["PRIVACY_TELEMETRY"],
        },
    ]

    return {
        "summary": {
            "signal_rows": signal_catalog["summary"]["row_count"],
            "audit_families": audit_registry["summary"]["row_count"],
            "query_contracts": correlation_pack["summary"]["query_contract_count"],
            "error_families": error_matrix["summary"]["row_count"],
            "retention_rules": retention_visibility["summary"]["row_count"],
        },
        "pages": domain_pages,
        "signal_lanes": signal_lanes,
        "shared_correlation_ribbon": ordered_unique(CORE_KEYS + ["root_manifest_id", "authority_operation_id", "error_id", "retention_class", "code_build_id"]),
        "signal_laws": [
            "Audit exists to prove what happened.",
            "Telemetry exists to explain runtime behavior.",
            "Security and privacy signals may share infrastructure, not semantics.",
            "Failure dashboards may not be reconstructed from logs.",
        ],
        "audit_groups": audit_groups,
        "failure_lifecycle": {
            "states": lineage_states,
            "dashboard_fields": FAILURE_DASHBOARD_RULES[0]["required_projection_fields"],
            "forbidden_inputs": dashboard_rules["forbidden_inputs"],
        },
        "query_contracts": [
            {
                "query_code": row["query_code"],
                "canonical_name": row["canonical_name"],
                "domain": row["domain"],
                "ordering_basis": row["ordering_basis"],
                "integrity_posture": row["integrity_posture"],
                "notes": row["notes"][0],
                "correlation_keys": row["correlation_keys"],
            }
            for row in correlation_pack["query_contracts"]
        ],
        "retention_visibility_rows": [
            {
                "canonical_name": row["canonical_name"],
                "domain": row["domain"],
                "visibility_boundary": row["visibility_boundary"],
                "retention_boundary": row["retention_boundary"],
                "notes": row["notes"],
            }
            for row in retention_visibility["rows"]
        ],
        "design_influences": [
            {
                "source": "Linear",
                "insight": "Dimmed navigation, softer separators, and compact top controls inform the quieter domain rail and low-noise panels.",
            },
            {
                "source": "Raycast",
                "insight": "A dedicated metadata side area informed the right evidence inspector and grouped separators.",
            },
            {
                "source": "Vercel",
                "insight": "Systemized spacing and careful craft informed the restrained panel geometry and type rhythm.",
            },
        ],
    }


def render_index_html() -> str:
    return dedent(
        """
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Taxat Failure Ops Contract Atlas</title>
            <link rel="stylesheet" href="./styles.css" />
          </head>
          <body>
            <div class="atlas-shell" data-testid="failure-ops-contract-atlas">
              <header class="hero">
                <div class="hero-copy">
                  <p class="eyebrow">Taxat incident and evidence field guide</p>
                  <div class="hero-row">
                    <div class="signal-glyph" aria-hidden="true">
                      <span class="signal-thread"></span>
                      <span class="signal-thread"></span>
                      <span class="signal-thread"></span>
                      <span class="signal-thread"></span>
                      <span class="signal-node signal-node-accent"></span>
                      <span class="signal-node"></span>
                      <span class="signal-node"></span>
                    </div>
                    <div>
                      <h1>Failure Ops Contract Atlas</h1>
                      <p class="hero-text">
                        An inspectable atlas for signal separation, audit event law, failure lineage,
                        query contracts, and retention visibility. This is a requirement atlas, not a
                        production dashboard.
                      </p>
                    </div>
                  </div>
                </div>
                <div class="hero-summary" id="hero-summary" aria-label="Atlas summary"></div>
              </header>

              <div class="layout-status">
                <span>Motion <strong data-testid="motion-mode" id="motion-mode">standard</strong></span>
                <span>Inspector <strong data-testid="inspector-layout" id="inspector-layout">rail</strong></span>
                <span>Layout <strong data-testid="stack-layout" id="stack-layout">wide</strong></span>
              </div>

              <main class="atlas-grid">
                <aside
                  class="domain-rail"
                  id="signal-domain-rail"
                  data-testid="signal-domain-rail"
                  role="tablist"
                  aria-label="Atlas pages"
                  aria-orientation="vertical"
                ></aside>
                <section class="canvas" id="canvas" tabindex="-1"></section>
                <aside
                  class="evidence-inspector"
                  id="failure-evidence-inspector"
                  data-testid="failure-evidence-inspector"
                  role="complementary"
                  aria-label="Evidence inspector"
                ></aside>
              </main>
            </div>

            <script type="module" src="./app.js"></script>
          </body>
        </html>
        """
    ).strip()


def render_styles_css() -> str:
    return dedent(
        """
        :root {
          --bg: #080b10;
          --surface-1: #10161d;
          --surface-2: #151c25;
          --surface-3: #1b2430;
          --border: rgba(255, 255, 255, 0.08);
          --text-1: #f4f7fb;
          --text-2: #9ba6b6;
          --audit: #7cc7ff;
          --ops: #87d7c6;
          --risk: #f0c66e;
          --failure: #ff8d84;
          --lineage: #b9a6ff;
          --radius-outer: 22px;
          --radius-panel: 18px;
          --radius-pill: 999px;
          --shadow: 0 26px 64px rgba(0, 0, 0, 0.34);
          --t-fast: 140ms ease;
          --t-panel: 190ms ease;
          color-scheme: dark;
          font-family: Inter, "Inter Variable", system-ui, sans-serif;
          background:
            radial-gradient(circle at top left, rgba(124, 199, 255, 0.16), transparent 28%),
            radial-gradient(circle at top right, rgba(185, 166, 255, 0.12), transparent 24%),
            linear-gradient(180deg, #0c1016 0%, #080b10 48%, #06080c 100%);
        }

        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          min-height: 100%;
          background: var(--bg);
          color: var(--text-1);
        }

        body {
          padding: 24px;
        }

        button,
        input,
        textarea,
        select {
          font: inherit;
          color: inherit;
        }

        button {
          cursor: pointer;
        }

        button:focus-visible,
        [tabindex]:focus-visible,
        a:focus-visible {
          outline: 2px solid var(--audit);
          outline-offset: 3px;
        }

        .atlas-shell {
          max-width: 1480px;
          margin: 0 auto;
        }

        .hero,
        .domain-rail,
        .panel,
        .evidence-inspector,
        .layout-status {
          border: 1px solid var(--border);
          background: rgba(16, 22, 29, 0.92);
          box-shadow: var(--shadow);
        }

        .hero {
          border-radius: var(--radius-outer);
          padding: 32px;
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(320px, 1fr);
          gap: 24px;
        }

        .eyebrow,
        .micro {
          margin: 0;
          font-size: 12px;
          line-height: 16px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--text-2);
        }

        .hero-row {
          display: grid;
          grid-template-columns: 96px minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }

        h1 {
          margin: 0;
          font-size: 38px;
          line-height: 44px;
          font-weight: 650;
          letter-spacing: -0.04em;
        }

        .hero-text {
          margin: 16px 0 0;
          font-size: 15px;
          line-height: 24px;
          color: var(--text-2);
          max-width: 62ch;
        }

        .signal-glyph {
          position: relative;
          width: 96px;
          height: 76px;
          border-radius: 24px;
          border: 1px solid var(--border);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0));
          overflow: hidden;
        }

        .signal-thread {
          position: absolute;
          left: 18px;
          right: 18px;
          height: 1px;
          background: rgba(255, 255, 255, 0.18);
        }

        .signal-thread:nth-child(1) { top: 18px; }
        .signal-thread:nth-child(2) { top: 30px; }
        .signal-thread:nth-child(3) { top: 44px; }
        .signal-thread:nth-child(4) { top: 58px; }

        .signal-node {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: #0f151c;
        }

        .signal-node:nth-child(5) { left: 24px; top: 25px; }
        .signal-node:nth-child(6) { left: 48px; top: 39px; }
        .signal-node:nth-child(7) { left: 68px; top: 15px; }

        .signal-node-accent {
          border-color: rgba(124, 199, 255, 0.8);
          background: var(--audit);
          box-shadow: 0 0 0 6px rgba(124, 199, 255, 0.12);
        }

        .hero-summary {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .summary-card {
          border-radius: var(--radius-panel);
          padding: 18px;
          border: 1px solid var(--border);
          background: rgba(21, 28, 37, 0.9);
        }

        .summary-label {
          margin: 0;
          color: var(--text-2);
          font-size: 12px;
          line-height: 16px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .summary-value {
          margin: 10px 0 0;
          font-size: 28px;
          line-height: 32px;
          font-weight: 650;
        }

        .layout-status {
          margin-top: 18px;
          border-radius: var(--radius-pill);
          padding: 10px 16px;
          display: flex;
          gap: 18px;
          align-items: center;
          flex-wrap: wrap;
        }

        .layout-status span {
          font-size: 12px;
          line-height: 16px;
          color: var(--text-2);
        }

        .layout-status strong {
          color: var(--text-1);
        }

        .atlas-grid {
          display: grid;
          grid-template-columns: 248px minmax(0, 1fr) 352px;
          gap: 20px;
          margin-top: 20px;
          align-items: start;
        }

        .domain-rail {
          border-radius: var(--radius-outer);
          padding: 16px;
          display: grid;
          gap: 10px;
          position: sticky;
          top: 18px;
        }

        .rail-button {
          border: 1px solid transparent;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 16px;
          padding: 14px 14px 14px 16px;
          text-align: left;
          transition: border-color var(--t-fast), transform var(--t-fast), background-color var(--t-fast);
        }

        .rail-button:hover {
          transform: translateX(1px);
          border-color: rgba(255, 255, 255, 0.08);
        }

        .rail-button[aria-selected="true"] {
          background: linear-gradient(180deg, rgba(124, 199, 255, 0.12), rgba(255, 255, 255, 0.04));
          border-color: rgba(124, 199, 255, 0.28);
        }

        .rail-title {
          display: block;
          font-size: 15px;
          line-height: 24px;
          font-weight: 600;
          color: var(--text-1);
        }

        .rail-subtitle {
          display: block;
          margin-top: 4px;
          font-size: 12px;
          line-height: 18px;
          color: var(--text-2);
        }

        .canvas {
          display: grid;
          gap: 18px;
        }

        .panel,
        .evidence-inspector {
          border-radius: var(--radius-outer);
          padding: 24px;
        }

        .evidence-inspector {
          position: sticky;
          top: 18px;
          display: grid;
          gap: 16px;
        }

        .panel-title {
          margin: 0;
          font-size: 24px;
          line-height: 30px;
          font-weight: 600;
          letter-spacing: -0.03em;
        }

        .panel-subtitle,
        .body,
        .panel p,
        .panel li {
          color: var(--text-2);
          font-size: 15px;
          line-height: 24px;
          margin: 0;
        }

        .panel-grid {
          display: grid;
          gap: 18px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .lane-grid {
          display: grid;
          gap: 14px;
        }

        .lane-card,
        .ledger-group,
        .query-card,
        .matrix-row,
        .field-chip,
        .state-card {
          border-radius: var(--radius-panel);
          border: 1px solid var(--border);
          background: rgba(27, 36, 48, 0.75);
        }

        .lane-card,
        .query-card,
        .state-card {
          padding: 18px;
        }

        .accent-audit { color: var(--audit); }
        .accent-ops { color: var(--ops); }
        .accent-risk { color: var(--risk); }
        .accent-failure { color: var(--failure); }
        .accent-lineage { color: var(--lineage); }

        .pill-row,
        .field-chip-row,
        .lineage-jumps {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
        }

        .pill,
        .field-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: var(--radius-pill);
          border: 1px solid var(--border);
          padding: 8px 12px;
          font-size: 12px;
          line-height: 16px;
          font-weight: 600;
          color: var(--text-1);
          background: rgba(255, 255, 255, 0.02);
        }

        .signal-diagram {
          display: grid;
          gap: 14px;
        }

        .ribbon {
          padding: 14px 16px;
          border-radius: 16px;
          border: 1px solid rgba(124, 199, 255, 0.18);
          background: rgba(124, 199, 255, 0.08);
          font-size: 12px;
          line-height: 18px;
          color: var(--text-1);
        }

        .ledger-group {
          overflow: hidden;
        }

        .ledger-button {
          width: 100%;
          border: 0;
          background: transparent;
          padding: 18px;
          text-align: left;
          display: flex;
          justify-content: space-between;
          gap: 16px;
        }

        .ledger-body {
          padding: 0 18px 18px;
          display: grid;
          gap: 12px;
        }

        .ledger-body[hidden] {
          display: none;
        }

        .event-item {
          padding: 14px 16px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: rgba(16, 22, 29, 0.72);
        }

        .event-title,
        .query-title,
        .state-title,
        .matrix-title {
          margin: 0;
          font-size: 18px;
          line-height: 24px;
          font-weight: 600;
        }

        .lineage-ribbon {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 14px;
        }

        .lineage-node {
          border-radius: var(--radius-pill);
          padding: 10px 14px;
          border: 1px solid rgba(185, 166, 255, 0.24);
          background: rgba(185, 166, 255, 0.1);
          font-size: 12px;
          line-height: 16px;
          font-weight: 600;
        }

        .lineage-jump {
          border-radius: var(--radius-pill);
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.03);
          padding: 10px 12px;
        }

        .lineage-jump[aria-pressed="true"] {
          border-color: rgba(255, 141, 132, 0.32);
          background: rgba(255, 141, 132, 0.12);
        }

        .dashboard-grid {
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          margin-top: 16px;
        }

        .dashboard-card {
          border-radius: 16px;
          border: 1px solid var(--border);
          padding: 16px;
          background: rgba(16, 22, 29, 0.7);
        }

        .query-grid,
        .matrix-grid {
          display: grid;
          gap: 12px;
        }

        .query-card,
        .matrix-row {
          padding: 16px;
        }

        .mono {
          font-family: "SFMono-Regular", SFMono-Regular, ui-monospace, Menlo, monospace;
          font-size: 12px;
          line-height: 18px;
        }

        .inspector-card {
          border-radius: 16px;
          border: 1px solid var(--border);
          padding: 16px;
          background: rgba(27, 36, 48, 0.76);
        }

        .inspector-list {
          margin: 0;
          padding-left: 18px;
          display: grid;
          gap: 8px;
          color: var(--text-2);
          font-size: 14px;
          line-height: 20px;
        }

        [data-motion="reduce"] * {
          transition-duration: 0ms !important;
          animation-duration: 0ms !important;
          scroll-behavior: auto !important;
        }

        @media (max-width: 1159px) {
          .atlas-grid {
            grid-template-columns: 248px minmax(0, 1fr);
          }

          .evidence-inspector {
            position: static;
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 859px) {
          body {
            padding: 16px;
          }

          .hero {
            grid-template-columns: 1fr;
          }

          .hero-row {
            grid-template-columns: 1fr;
          }

          .atlas-grid {
            grid-template-columns: 1fr;
          }

          .domain-rail {
            position: static;
            grid-auto-flow: row;
          }

          .panel-grid,
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }
        """
    ).strip()


def render_app_js() -> str:
    return dedent(
        """
        const summaryRoot = document.getElementById("hero-summary");
        const railRoot = document.getElementById("signal-domain-rail");
        const canvasRoot = document.getElementById("canvas");
        const inspectorRoot = document.getElementById("failure-evidence-inspector");
        const motionMode = document.getElementById("motion-mode");
        const inspectorLayout = document.getElementById("inspector-layout");
        const stackLayout = document.getElementById("stack-layout");

        const DEFAULT_PAGE = "signal-model";
        let atlasData = null;
        let state = {
          pageId: DEFAULT_PAGE,
          auditGroupId: "identity_authority",
          lineageStateId: "open_failure",
        };

        function createElement(tag, className, text) {
          const node = document.createElement(tag);
          if (className) node.className = className;
          if (text !== undefined) node.textContent = text;
          return node;
        }

        function getPage(pageId) {
          return atlasData.pages.find((page) => page.page_id === pageId);
        }

        function getAuditGroup(groupId) {
          return atlasData.audit_groups.find((group) => group.group_id === groupId);
        }

        function getLineageState(stateId) {
          return atlasData.failure_lifecycle.states.find((item) => item.state_id === stateId);
        }

        function parseHash() {
          const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
          return {
            pageId: params.get("page") || DEFAULT_PAGE,
            auditGroupId: params.get("group") || "identity_authority",
            lineageStateId: params.get("lineage") || "open_failure",
          };
        }

        function updateHash(replace = false) {
          const params = new URLSearchParams();
          params.set("page", state.pageId);
          if (state.pageId === "audit-families") {
            params.set("group", state.auditGroupId);
          }
          if (state.pageId === "failure-lifecycle") {
            params.set("lineage", state.lineageStateId);
          }
          const hash = `#${params.toString()}`;
          if (replace) {
            window.history.replaceState({}, "", hash);
          } else {
            window.history.pushState({}, "", hash);
          }
        }

        function syncStateFromHash() {
          const next = parseHash();
          state.pageId = atlasData.pages.some((page) => page.page_id === next.pageId) ? next.pageId : DEFAULT_PAGE;
          state.auditGroupId = atlasData.audit_groups.some((group) => group.group_id === next.auditGroupId)
            ? next.auditGroupId
            : "identity_authority";
          state.lineageStateId = atlasData.failure_lifecycle.states.some((item) => item.state_id === next.lineageStateId)
            ? next.lineageStateId
            : "open_failure";
          render();
        }

        function setMotionMode() {
          const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          document.documentElement.dataset.motion = reduced ? "reduce" : "standard";
          motionMode.textContent = reduced ? "reduce" : "standard";
        }

        function setLayoutMode() {
          const inspectorCollapsed = window.matchMedia("(max-width: 1159px)").matches;
          const stacked = window.matchMedia("(max-width: 859px)").matches;
          document.documentElement.dataset.inspectorLayout = inspectorCollapsed ? "stacked" : "rail";
          document.documentElement.dataset.stackLayout = stacked ? "stacked" : "wide";
          inspectorLayout.textContent = inspectorCollapsed ? "stacked" : "rail";
          stackLayout.textContent = stacked ? "stacked" : "wide";
        }

        function renderSummary() {
          summaryRoot.replaceChildren();
          const cards = [
            ["Signal rows", atlasData.summary.signal_rows],
            ["Audit families", atlasData.summary.audit_families],
            ["Query contracts", atlasData.summary.query_contracts],
            ["Error families", atlasData.summary.error_families],
          ];
          cards.forEach(([label, value]) => {
            const card = createElement("section", "summary-card");
            card.append(
              createElement("p", "summary-label", label),
              createElement("p", "summary-value", String(value)),
            );
            summaryRoot.append(card);
          });
        }

        function handleRailKeydown(event) {
          const buttons = [...railRoot.querySelectorAll(".rail-button")];
          const currentIndex = buttons.findIndex((button) => button.dataset.pageId === state.pageId);
          if (currentIndex === -1) return;
          let nextIndex = null;
          if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % buttons.length;
          if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
          if (event.key === "Home") nextIndex = 0;
          if (event.key === "End") nextIndex = buttons.length - 1;
          if (nextIndex === null) return;
          event.preventDefault();
          const target = buttons[nextIndex];
          state.pageId = target.dataset.pageId;
          updateHash();
          render();
          requestAnimationFrame(() => {
            const next = railRoot.querySelector(`[data-page-id="${target.dataset.pageId}"]`);
            if (next) next.focus();
          });
        }

        function renderRail() {
          railRoot.replaceChildren();
          atlasData.pages.forEach((page) => {
            const button = createElement("button", "rail-button");
            button.type = "button";
            button.setAttribute("role", "tab");
            button.id = `rail-${page.page_id}`;
            button.dataset.pageId = page.page_id;
            button.setAttribute("aria-controls", "atlas-panel");
            button.setAttribute("aria-selected", String(page.page_id === state.pageId));
            button.tabIndex = page.page_id === state.pageId ? 0 : -1;
            button.addEventListener("click", () => {
              state.pageId = page.page_id;
              updateHash();
              render();
            });
            button.addEventListener("keydown", handleRailKeydown);
            button.append(
              createElement("span", "rail-title", page.title),
              createElement("span", "rail-subtitle", `${page.accent} field guide`),
            );
            railRoot.append(button);
          });
        }

        function makeHeader(title, subtitle, testId = "") {
          const panel = createElement("section", "panel");
          panel.id = "atlas-panel";
          panel.setAttribute("role", "tabpanel");
          if (testId) panel.dataset.testid = testId;
          panel.append(
            createElement("p", "micro", "Atlas page"),
            createElement("h2", "panel-title", title),
            createElement("p", "panel-subtitle", subtitle),
          );
          return panel;
        }

        function renderSignalModel() {
          const fragment = document.createDocumentFragment();
          const header = makeHeader(
            "Signal Model",
            "Audit, ops, security, privacy, and failure truth stay distinct while sharing a correlation ribbon.",
          );
          fragment.append(header);

          const diagram = createElement("section", "panel");
          diagram.dataset.testid = "signal-separation-diagram";
          diagram.append(
            createElement("p", "micro", "Separation diagram"),
            createElement("h3", "panel-title", "Signal braid"),
          );
          const ribbon = createElement("div", "ribbon mono");
          ribbon.textContent = atlasData.shared_correlation_ribbon.join(" • ");
          diagram.append(ribbon);
          const laneGrid = createElement("div", "lane-grid");
          atlasData.signal_lanes.forEach((lane) => {
            const card = createElement("article", "lane-card");
            card.append(
              createElement("p", `micro accent-${lane.accent}`, lane.label),
              createElement("p", "body", lane.description),
            );
            const pills = createElement("div", "pill-row");
            lane.records.forEach((item) => {
              const pill = createElement("span", "pill mono", item);
              pills.append(pill);
            });
            card.append(pills);
            laneGrid.append(card);
          });
          diagram.append(laneGrid);
          fragment.append(diagram);

          const laws = createElement("section", "panel");
          laws.append(createElement("p", "micro", "Separation laws"), createElement("h3", "panel-title", "What must never be conflated"));
          const list = document.createElement("ul");
          list.className = "inspector-list";
          atlasData.signal_laws.forEach((law) => {
            const item = document.createElement("li");
            item.textContent = law;
            list.append(item);
          });
          laws.append(list);
          fragment.append(laws);
          return fragment;
        }

        function renderAuditFamilies() {
          const fragment = document.createDocumentFragment();
          fragment.append(
            makeHeader(
              "Audit Families",
              "Grouped mandatory audit event families rendered as a layered ledger instead of KPI cards.",
              "audit-family-ledger",
            ),
          );
          atlasData.audit_groups.forEach((group) => {
            const wrapper = createElement("section", "ledger-group");
            const button = createElement("button", "ledger-button");
            button.type = "button";
            button.dataset.groupId = group.group_id;
            button.setAttribute("aria-expanded", String(group.group_id === state.auditGroupId));
            button.addEventListener("click", () => {
              state.auditGroupId = group.group_id;
              updateHash();
              render();
            });
            const left = createElement("div");
            left.append(
              createElement("p", "micro", group.title),
              createElement("p", "body", `${group.event_count} required event families`),
            );
            const right = createElement("span", "pill mono", group.group_id);
            button.append(left, right);
            wrapper.append(button);

            const body = createElement("div", "ledger-body");
            if (group.group_id !== state.auditGroupId) {
              body.hidden = true;
            }
            group.events.forEach((eventItem) => {
              const item = createElement("article", "event-item");
              item.append(
                createElement("h4", "event-title", eventItem.canonical_name),
                createElement("p", "body", eventItem.notes[0] || "Mandatory append-only audit event."),
              );
              const pills = createElement("div", "pill-row");
              eventItem.closure_requirements.slice(0, 2).forEach((requirement) => {
                pills.append(createElement("span", "pill", requirement));
              });
              item.append(pills);
              body.append(item);
            });
            wrapper.append(body);
            fragment.append(wrapper);
          });
          return fragment;
        }

        function renderFailureLifecycle() {
          const item = getLineageState(state.lineageStateId);
          const fragment = document.createDocumentFragment();
          fragment.append(
            makeHeader(
              "Failure Lifecycle",
              "The lineage ribbon, dashboard projection, and closure law remain visible together.",
            ),
          );

          const ribbonPanel = createElement("section", "panel");
          ribbonPanel.dataset.testid = "failure-lineage-ribbon";
          ribbonPanel.append(
            createElement("p", "micro", "Current lineage"),
            createElement("h3", "panel-title", item.inspector_title),
            createElement("p", "panel-subtitle", item.inspector_copy),
          );
          const ribbon = createElement("div", "lineage-ribbon");
          item.lineage_nodes.forEach((node) => {
            ribbon.append(createElement("span", "lineage-node", node));
          });
          ribbonPanel.append(ribbon);
          const jumps = createElement("div", "lineage-jumps");
          atlasData.failure_lifecycle.states.forEach((stateItem) => {
            const button = createElement("button", "lineage-jump", stateItem.label);
            button.type = "button";
            button.dataset.stateId = stateItem.state_id;
            button.setAttribute("aria-pressed", String(stateItem.state_id === state.lineageStateId));
            button.addEventListener("click", () => {
              state.lineageStateId = stateItem.state_id;
              updateHash();
              render();
            });
            jumps.append(button);
          });
          ribbonPanel.append(jumps);
          fragment.append(ribbonPanel);

          const dashboard = createElement("section", "panel");
          dashboard.dataset.testid = "failure-dashboard-projection";
          dashboard.append(
            createElement("p", "micro", "Projection truth"),
            createElement("h3", "panel-title", "Persisted dashboard fields"),
          );
          const fieldChips = createElement("div", "field-chip-row");
          atlasData.failure_lifecycle.dashboard_fields.forEach((field) => {
            fieldChips.append(createElement("span", "field-chip mono", field));
          });
          dashboard.append(fieldChips);
          const grid = createElement("div", "dashboard-grid");
          [
            ["Lineage state", item.lineage_state],
            ["Current owner", item.owner],
            ["Next legal action", item.next_action],
            ["Blocking scope", item.blocking_scope],
            ["Retry posture", item.retry_posture],
            ["Compensation posture", item.compensation_posture],
            ["Accepted risk posture", item.accepted_risk_posture],
          ].forEach(([label, value]) => {
            const card = createElement("div", "dashboard-card");
            card.append(createElement("p", "micro", label), createElement("p", "body", value));
            grid.append(card);
          });
          dashboard.append(grid);
          const checks = document.createElement("ul");
          checks.className = "inspector-list";
          item.closure_checks.forEach((check) => {
            const li = document.createElement("li");
            li.textContent = check;
            checks.append(li);
          });
          dashboard.append(checks);
          fragment.append(dashboard);
          return fragment;
        }

        function renderQueryContracts() {
          const fragment = document.createDocumentFragment();
          fragment.append(
            makeHeader(
              "Query Contracts",
              "Explicit query surfaces, ordering basis, and correlation dependencies across audit, replay, filing, privacy, and provenance.",
              "query-contract-catalog",
            ),
          );
          const grid = createElement("section", "query-grid");
          atlasData.query_contracts.forEach((query) => {
            const card = createElement("article", "query-card");
            card.append(
              createElement("p", "micro", query.query_code),
              createElement("h3", "query-title", query.canonical_name),
              createElement("p", "body", query.notes),
            );
            const pills = createElement("div", "pill-row");
            pills.append(createElement("span", "pill", query.domain), createElement("span", "pill mono", query.ordering_basis));
            card.append(pills);
            const deps = createElement("p", "body mono", query.correlation_keys.slice(0, 8).join(" • "));
            card.append(deps);
            grid.append(card);
          });
          fragment.append(grid);
          return fragment;
        }

        function renderRetentionVisibility() {
          const fragment = document.createDocumentFragment();
          fragment.append(
            makeHeader(
              "Retention & Visibility",
              "Visibility fences, retention boundaries, and lawful limitation posture remain explicit per signal domain.",
              "retention-visibility-matrix",
            ),
          );
          const grid = createElement("section", "matrix-grid");
          atlasData.retention_visibility_rows.forEach((row) => {
            const card = createElement("article", "matrix-row");
            card.append(
              createElement("p", "micro", `${row.domain} domain`),
              createElement("h3", "matrix-title", row.canonical_name),
              createElement("p", "body", row.visibility_boundary),
              createElement("p", "body", row.retention_boundary),
            );
            const pills = createElement("div", "pill-row");
            row.notes.forEach((note) => pills.append(createElement("span", "pill", note)));
            card.append(pills);
            grid.append(card);
          });
          fragment.append(grid);
          return fragment;
        }

        function renderCanvas() {
          canvasRoot.replaceChildren();
          const pageId = state.pageId;
          if (pageId === "signal-model") canvasRoot.append(renderSignalModel());
          if (pageId === "audit-families") canvasRoot.append(renderAuditFamilies());
          if (pageId === "failure-lifecycle") canvasRoot.append(renderFailureLifecycle());
          if (pageId === "query-contracts") canvasRoot.append(renderQueryContracts());
          if (pageId === "retention-visibility") canvasRoot.append(renderRetentionVisibility());
        }

        function renderInspector() {
          inspectorRoot.replaceChildren();
          const page = getPage(state.pageId);
          const top = createElement("section", "inspector-card");
          top.append(
            createElement("p", "micro", "Selected page"),
            createElement("h3", "query-title", page.title),
            createElement("p", "body", "The inspector summarizes the currently selected domain, ledger, or lineage state without becoming a second dashboard."),
          );
          inspectorRoot.append(top);

          if (state.pageId === "signal-model") {
            const card = createElement("section", "inspector-card");
            card.append(
              createElement("p", "micro", "Signal laws"),
              createElement("p", "body", atlasData.design_influences.map((item) => `${item.source}: ${item.insight}`).join(" ")),
            );
            inspectorRoot.append(card);
          }

          if (state.pageId === "audit-families") {
            const group = getAuditGroup(state.auditGroupId);
            const card = createElement("section", "inspector-card");
            card.append(
              createElement("p", "micro", "Active audit ledger"),
              createElement("h3", "query-title", group.title),
              createElement("p", "body", group.heading),
            );
            const list = document.createElement("ul");
            list.className = "inspector-list";
            group.events.slice(0, 6).forEach((eventItem) => {
              const li = document.createElement("li");
              li.textContent = eventItem.canonical_name;
              list.append(li);
            });
            card.append(list);
            inspectorRoot.append(card);
          }

          if (state.pageId === "failure-lifecycle") {
            const item = getLineageState(state.lineageStateId);
            const card = createElement("section", "inspector-card");
            card.append(
              createElement("p", "micro", "Closure checks"),
              createElement("h3", "query-title", item.inspector_title),
              createElement("p", "body", item.inspector_copy),
            );
            const list = document.createElement("ul");
            list.className = "inspector-list";
            item.closure_checks.forEach((check) => {
              const li = document.createElement("li");
              li.textContent = check;
              list.append(li);
            });
            card.append(list);
            inspectorRoot.append(card);
          }

          if (state.pageId === "query-contracts") {
            const card = createElement("section", "inspector-card");
            card.append(
              createElement("p", "micro", "Catalog law"),
              createElement("p", "body", "Every query contract states its ordering basis and integrity posture explicitly; no query widens visibility beyond the tightest contributing surface."),
            );
            inspectorRoot.append(card);
          }

          if (state.pageId === "retention-visibility") {
            const card = createElement("section", "inspector-card");
            card.append(
              createElement("p", "micro", "Limitation posture"),
              createElement("p", "body", "Retention-limited visibility stays explicit. Audit proof, typed failures, and lawful absence remain distinguishable even when payloads age out."),
            );
            inspectorRoot.append(card);
          }
        }

        function render() {
          renderSummary();
          renderRail();
          renderCanvas();
          renderInspector();
          setMotionMode();
          setLayoutMode();
        }

        async function main() {
          const response = await fetch("./atlas_data.json");
          atlasData = await response.json();
          syncStateFromHash();

          window.addEventListener("hashchange", syncStateFromHash);
          window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", () => {
            setMotionMode();
          });
          window.matchMedia("(max-width: 1159px)").addEventListener("change", () => {
            setLayoutMode();
          });
          window.matchMedia("(max-width: 859px)").addEventListener("change", () => {
            setLayoutMode();
          });
        }

        main();
        """
    ).strip()


def build_outputs() -> dict[str, Any]:
    assert_source_grounding()

    signal_catalog = build_signal_catalog()
    audit_registry = build_audit_event_family_registry()
    correlation_pack = build_correlation_topology_and_queries()
    error_matrix = build_error_matrix()
    dashboard_rules = build_dashboard_rules()
    owner_closure = build_owner_closure_matrix()
    retention_visibility = build_retention_visibility_matrix()
    mermaid = build_mermaid()
    atlas_data = build_atlas_data(
        signal_catalog,
        audit_registry,
        correlation_pack,
        error_matrix,
        dashboard_rules,
        retention_visibility,
    )
    docs = [
        render_overview_doc(
            signal_catalog,
            audit_registry,
            correlation_pack,
            error_matrix,
            dashboard_rules,
            owner_closure,
            retention_visibility,
        ),
        render_signal_doc(signal_catalog, correlation_pack, retention_visibility),
        render_dashboard_doc(error_matrix, dashboard_rules, owner_closure),
    ]
    prototype_files = {
        "index.html": render_index_html(),
        "styles.css": render_styles_css(),
        "app.js": render_app_js(),
    }
    return {
        "signal_catalog": signal_catalog,
        "audit_registry": audit_registry,
        "correlation_pack": correlation_pack,
        "error_matrix": error_matrix,
        "dashboard_rules": dashboard_rules,
        "owner_closure": owner_closure,
        "retention_visibility": retention_visibility,
        "mermaid": mermaid,
        "docs": docs,
        "atlas_data": atlas_data,
        "prototype_files": prototype_files,
    }


def write_outputs(outputs: dict[str, Any]) -> None:
    json_write(SIGNAL_CATALOG_PATH, outputs["signal_catalog"])
    json_write(AUDIT_REGISTRY_PATH, outputs["audit_registry"])
    json_write(CORRELATION_TOPOLOGY_PATH, outputs["correlation_pack"])
    json_write(ERROR_MATRIX_PATH, outputs["error_matrix"])
    json_write(DASHBOARD_RULES_PATH, outputs["dashboard_rules"])
    json_write(OWNER_CLOSURE_PATH, outputs["owner_closure"])
    json_write(RETENTION_VISIBILITY_PATH, outputs["retention_visibility"])

    text_write(OBSERVABILITY_DOC_PATH, outputs["docs"][0])
    text_write(SIGNAL_DOC_PATH, outputs["docs"][1])
    text_write(DASHBOARD_DOC_PATH, outputs["docs"][2])
    text_write(MERMAID_PATH, outputs["mermaid"])

    for filename, content in outputs["prototype_files"].items():
        text_write(PROTOTYPE_DIR / filename, content)
    json_write(ATLAS_DATA_PATH, outputs["atlas_data"])


def main() -> int:
    outputs = build_outputs()
    write_outputs(outputs)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
