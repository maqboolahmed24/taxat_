#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[2]
ALGORITHM_DIR = ROOT / "Algorithm"
SCHEMAS_DIR = ALGORITHM_DIR / "schemas"
DATA_ANALYSIS_DIR = ROOT / "data" / "analysis"
DOCS_ANALYSIS_DIR = ROOT / "docs" / "analysis"
DIAGRAMS_ANALYSIS_DIR = ROOT / "diagrams" / "analysis"

RETENTION_PRIVACY_PATH = ALGORITHM_DIR / "retention_and_privacy.md"
RETENTION_LIMITED_PATH = ALGORITHM_DIR / "retention_limited_explainability_and_audit_sufficiency_contract.md"
RETENTION_OBSERVABILITY_PATH = ALGORITHM_DIR / "retention_error_and_observability_contract.md"
SECURITY_HARDENING_PATH = ALGORITHM_DIR / "security_and_runtime_hardening_contract.md"
CACHE_ISOLATION_PATH = ALGORITHM_DIR / "cache_isolation_and_secure_reuse_contract.md"
NATIVE_CACHE_PATH = ALGORITHM_DIR / "native_cache_hydration_purge_and_rebase_contract.md"
NORTHBOUND_API_PATH = ALGORITHM_DIR / "northbound_api_and_session_contract.md"
MACOS_BLUEPRINT_PATH = ALGORITHM_DIR / "macos_native_operator_workspace_blueprint.md"
PORTAL_EXPERIENCE_PATH = ALGORITHM_DIR / "customer_client_portal_experience_contract.md"
COLLABORATION_PATH = ALGORITHM_DIR / "collaboration_workspace_contract.md"
DEPLOYMENT_PATH = ALGORITHM_DIR / "deployment_and_resilience_contract.md"
RECOVERY_GOVERNANCE_PATH = ALGORITHM_DIR / "recovery_tier_checkpoint_and_fail_forward_governance_contract.md"
RELEASE_IDENTITY_PATH = ALGORITHM_DIR / "release_candidate_identity_and_promotion_evidence_contract.md"

RETENTION_TAG_SCHEMA_PATH = SCHEMAS_DIR / "retention_tag.schema.json"
ARTIFACT_RETENTION_SCHEMA_PATH = SCHEMAS_DIR / "artifact_retention.schema.json"
RETENTION_EXPLAINABILITY_SCHEMA_PATH = SCHEMAS_DIR / "retention_limited_explainability_contract.schema.json"
CACHE_ISOLATION_SCHEMA_PATH = SCHEMAS_DIR / "cache_isolation_contract.schema.json"
NATIVE_CACHE_SCHEMA_PATH = SCHEMAS_DIR / "native_cache_hydration_contract.schema.json"
ACTOR_SESSION_SCHEMA_PATH = SCHEMAS_DIR / "actor_session.schema.json"
SECRET_VERSION_SCHEMA_PATH = SCHEMAS_DIR / "secret_version.schema.json"
UPLOAD_BINDING_SCHEMA_PATH = SCHEMAS_DIR / "upload_request_binding_contract.schema.json"
RESTORE_PRIVACY_SCHEMA_PATH = SCHEMAS_DIR / "restore_privacy_reconciliation_contract.schema.json"

RETENTION_DOC_PATH = DOCS_ANALYSIS_DIR / "16_retention_privacy_security_runtime_hardening.md"
ARTIFACT_DOC_PATH = DOCS_ANALYSIS_DIR / "16_artifact_retention_erasure_and_limitations_matrix.md"
CACHE_DOC_PATH = DOCS_ANALYSIS_DIR / "16_cache_session_and_secret_boundary_map.md"

ARTIFACT_MATRIX_PATH = DATA_ANALYSIS_DIR / "artifact_retention_matrix.json"
PRIVACY_THRESHOLD_PATH = DATA_ANALYSIS_DIR / "privacy_projection_and_survivability_thresholds.json"
THREAT_CONTROL_PATH = DATA_ANALYSIS_DIR / "threat_class_to_control_map.json"
CONTROL_REGISTER_PATH = DATA_ANALYSIS_DIR / "security_control_boundary_register.json"
CACHE_MATRIX_PATH = DATA_ANALYSIS_DIR / "cache_partition_and_purge_matrix.json"
SESSION_STORAGE_PATH = DATA_ANALYSIS_DIR / "session_secret_token_storage_matrix.json"
RESTORE_MATRIX_PATH = DATA_ANALYSIS_DIR / "restore_privacy_reconciliation_matrix.json"
RELEASE_GATE_PATH = DATA_ANALYSIS_DIR / "security_release_gate_matrix.json"

MERMAID_PATH = DIAGRAMS_ANALYSIS_DIR / "16_security_privacy_runtime_boundary.mmd"

HEADING_RE = re.compile(r"^(#{2,4})\s+(.*)$")

REQUIRED_ROW_FIELDS = [
    "artifact_or_control_id",
    "category",
    "contains_personal_or_sensitive_data",
    "retention_tag",
    "retention_basis",
    "legal_hold_behavior",
    "erasure_behavior",
    "projection_allowed",
    "survivability_or_fidelity_formula",
    "canonical_store_or_boundary",
    "encryption_or_protection_control",
    "cache_scope",
    "purge_trigger",
    "replay_preservation_required",
    "restore_reconciliation_required",
    "release_gate_dependency",
    "source_file",
    "source_heading_or_logical_block",
    "notes",
]
LIST_FIELDS = ["cache_scope", "purge_trigger", "release_gate_dependency", "notes"]

NOT_APPLICABLE = ["NOT_APPLICABLE"]


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


def schema_prefix_consts(path: Path, *keys: str) -> list[str]:
    values = schema_value(path, *keys)
    result: list[str] = []
    for item in values:
        if not isinstance(item, dict) or "const" not in item:
            raise ValueError(f"Expected const prefixItems at {path} {'/'.join(keys)}")
        result.append(str(item["const"]))
    return result


def row(
    *,
    artifact_or_control_id: str,
    category: str,
    contains_personal_or_sensitive_data: bool,
    retention_tag: str,
    retention_basis: str,
    legal_hold_behavior: str,
    erasure_behavior: str,
    projection_allowed: str,
    survivability_or_fidelity_formula: str,
    canonical_store_or_boundary: str,
    encryption_or_protection_control: str,
    cache_scope: list[str],
    purge_trigger: list[str],
    replay_preservation_required: bool,
    restore_reconciliation_required: bool,
    release_gate_dependency: list[str],
    source_path: Path,
    source_heading_or_logical_block: str,
    source_ref: str,
    notes: Iterable[str] = (),
    **extra: Any,
) -> dict[str, Any]:
    payload = {
        "artifact_or_control_id": artifact_or_control_id,
        "category": category,
        "contains_personal_or_sensitive_data": contains_personal_or_sensitive_data,
        "retention_tag": retention_tag,
        "retention_basis": retention_basis,
        "legal_hold_behavior": legal_hold_behavior,
        "erasure_behavior": erasure_behavior,
        "projection_allowed": projection_allowed,
        "survivability_or_fidelity_formula": survivability_or_fidelity_formula,
        "canonical_store_or_boundary": canonical_store_or_boundary,
        "encryption_or_protection_control": encryption_or_protection_control,
        "cache_scope": cache_scope,
        "purge_trigger": purge_trigger,
        "replay_preservation_required": replay_preservation_required,
        "restore_reconciliation_required": restore_reconciliation_required,
        "release_gate_dependency": release_gate_dependency,
        "source_file": repo_rel(source_path),
        "source_heading_or_logical_block": source_heading_or_logical_block,
        "source_ref": source_ref,
        "notes": list(notes),
    }
    payload.update(extra)
    return payload


def assert_required_row_fields(rows: Iterable[dict[str, Any]]) -> None:
    for row_data in rows:
        missing = [field for field in REQUIRED_ROW_FIELDS if field not in row_data]
        if missing:
            raise ValueError(f"Row {row_data.get('artifact_or_control_id')} missing required fields: {missing}")
        for field in LIST_FIELDS:
            if not isinstance(row_data[field], list):
                raise ValueError(f"Row {row_data['artifact_or_control_id']} field `{field}` must be a list.")


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
    for row_data in rows:
        values = [format_value(row_data.get(header, "")) for header in headers]
        values = [value.replace("|", "\\|") for value in values]
        lines.append("| " + " | ".join(values) + " |")
    return lines


def make_summary(rows: list[dict[str, Any]], **extra: Any) -> dict[str, Any]:
    summary = {"row_count": len(rows)}
    summary.update(extra)
    return summary


RETENTION_CLASS_ENUM = schema_enum(RETENTION_TAG_SCHEMA_PATH, "properties", "retention_class", "enum")
LEGAL_HOLD_STATE_ENUM = schema_enum(RETENTION_TAG_SCHEMA_PATH, "properties", "legal_hold_state", "enum")
ERASURE_ELIGIBILITY_ENUM = schema_enum(RETENTION_TAG_SCHEMA_PATH, "properties", "erasure_eligibility", "enum")
LIMITATION_BEHAVIOR_ENUM = schema_enum(RETENTION_TAG_SCHEMA_PATH, "properties", "limitation_behavior", "enum")
ARTIFACT_LIFECYCLE_ENUM = schema_enum(ARTIFACT_RETENTION_SCHEMA_PATH, "properties", "lifecycle_state", "enum")
EXPLAINABILITY_BOUNDARY_SCOPE_ENUM = schema_enum(
    RETENTION_EXPLAINABILITY_SCHEMA_PATH, "properties", "boundary_scope", "enum"
)
EXPLAINABILITY_SURFACE_ROLE_ENUM = schema_enum(
    RETENTION_EXPLAINABILITY_SCHEMA_PATH, "properties", "surface_role", "enum"
)
CACHE_SCOPE_ENUM = schema_enum(CACHE_ISOLATION_SCHEMA_PATH, "properties", "cache_scope_class", "enum")
HYDRATION_SCOPE_ENUM = schema_enum(NATIVE_CACHE_SCHEMA_PATH, "properties", "hydration_scope_class", "enum")
HYDRATION_COMPATIBILITY_ENUM = schema_prefix_consts(
    NATIVE_CACHE_SCHEMA_PATH, "properties", "compatibility_dimensions", "prefixItems"
)
HYDRATION_PURGE_TRIGGER_ENUM = schema_prefix_consts(
    NATIVE_CACHE_SCHEMA_PATH, "properties", "purge_trigger_reason_codes", "prefixItems"
)
LOCAL_ARTIFACT_CLASS_ENUM = schema_prefix_consts(
    NATIVE_CACHE_SCHEMA_PATH, "properties", "regulated_local_artifact_classes", "prefixItems"
)
SESSION_CLIENT_CLASS_ENUM = schema_enum(ACTOR_SESSION_SCHEMA_PATH, "properties", "session_client_class", "enum")
AUTHN_LEVEL_ENUM = schema_enum(ACTOR_SESSION_SCHEMA_PATH, "properties", "authn_level", "enum")
STEP_UP_STATE_ENUM = schema_enum(ACTOR_SESSION_SCHEMA_PATH, "properties", "step_up_state", "enum")
DEVICE_BINDING_STATE_ENUM = schema_enum(ACTOR_SESSION_SCHEMA_PATH, "properties", "device_binding_state", "enum")
SECRET_ROTATION_STATE_ENUM = schema_enum(SECRET_VERSION_SCHEMA_PATH, "properties", "rotation_state", "enum")
UPLOAD_BINDING_STATE_ENUM = schema_enum(UPLOAD_BINDING_SCHEMA_PATH, "properties", "request_binding_state", "enum")
RESTORE_PRIVACY_STATE_ENUM = schema_enum(
    RESTORE_PRIVACY_SCHEMA_PATH, "properties", "privacy_reconciliation_state", "enum"
)
RESTORE_REOPEN_ACCESS_ENUM = schema_enum(RESTORE_PRIVACY_SCHEMA_PATH, "properties", "reopen_access_state", "enum")
RESTORE_REPLAY_LIMITATION_ENUM = schema_enum(
    RESTORE_PRIVACY_SCHEMA_PATH, "properties", "replay_limitation_state", "enum"
)

THREAT_CLASS_ENUM = [
    "CROSS_TENANT_OR_CROSS_CLIENT_DATA_EXPOSURE",
    "STALE_OR_REPLAYED_USER_COMMANDS",
    "AUTHORITY_TOKEN_MISUSE_OR_WRONG_CLIENT_TOKEN_BINDING",
    "QUEUE_CALLBACK_OR_WORKER_RESULT_INJECTION",
    "UNSAFE_LOG_EXPORT_CACHE_OR_ANALYTICS_LEAKAGE",
    "BROWSER_ORIGIN_ATTACKS",
    "SSRF_OR_UNCONTROLLED_CONNECTOR_EGRESS",
    "COMPROMISED_BUILD_DEPENDENCY_OR_RELEASE_ARTIFACT",
    "RESTORE_TIME_RESURRECTION_OF_ERASED_OR_MASKED_DATA",
    "PRIVILEGED_OPERATOR_OVERREACH_WITHOUT_STEP_UP_APPROVAL_OR_AUDIT",
    "DESKTOP_CLIENT_COMPROMISE_OR_UNSAFE_LOCAL_CACHE_EXPOSURE",
]

CONTROL_ID_ENUM = [
    "RETENTION_TAG_AND_ARTIFACT_RETENTION",
    "RETENTION_LIMITED_EXPLAINABILITY",
    "RETENTION_ERROR_AND_GATE_COUPLING",
    "SESSION_BOUND_COMMAND_VALIDATION",
    "ANTI_CSRF_AND_SECURE_COOKIE_POSTURE",
    "STEP_UP_AND_SESSION_ROTATION",
    "TOKEN_VAULT_AND_BINDING_LINEAGE_REVALIDATION",
    "PER_TENANT_ENVELOPE_ENCRYPTION",
    "AUTHORITY_INGRESS_QUARANTINE_AND_DEDUPE",
    "CACHE_ISOLATION_CONTRACT_ENFORCEMENT",
    "NATIVE_CACHE_HYDRATION_PURGE_AND_REBASE",
    "RESTORE_PRIVACY_RECONCILIATION",
    "LOG_REDACTION_AND_MASKED_EXPORT_POLICY",
    "SSRF_ALLOWLIST_AND_LEAST_PRIVILEGE_EGRESS",
    "SIGNED_BUILD_SBOM_AND_PROVENANCE",
    "SECRET_VERSION_ROTATION_AND_ATTESTATION",
    "NATIVE_SIGNATURE_NOTARIZATION_AND_HARDENED_RUNTIME",
]

RELEASE_GATE_ID_ENUM = [
    "BUILD_SIGNATURE_AND_PROVENANCE_GATE",
    "CRITICAL_VULNERABILITY_CLEARANCE_GATE",
    "SESSION_AND_ANTI_CSRF_GATE",
    "STALE_VIEW_AND_IDEMPOTENCY_GATE",
    "NATIVE_DESKTOP_HARDENING_GATE",
    "CROSS_TENANT_CACHE_ISOLATION_GATE",
    "SECRET_ROTATION_ATTESTATION_GATE",
    "AUTHORITY_SANDBOX_BINDING_GATE",
    "SCHEMA_COMPATIBILITY_AND_RESTORE_GATE",
]


def source_assertions() -> None:
    required_refs = [
        heading_ref(RETENTION_PRIVACY_PATH, "Retention tag contract"),
        heading_ref(RETENTION_PRIVACY_PATH, "Artifact retention contract"),
        heading_ref(RETENTION_PRIVACY_PATH, "Quantitative survivability and privacy-preserving projection"),
        heading_ref(RETENTION_PRIVACY_PATH, "Erasure and legal-hold workflow"),
        heading_ref(RETENTION_LIMITED_PATH, "Governing Model"),
        heading_ref(RETENTION_OBSERVABILITY_PATH, "15.3 Gate and progression coupling"),
        heading_ref(SECURITY_HARDENING_PATH, "1. Threat classes"),
        heading_ref(CACHE_ISOLATION_PATH, "Reuse Law"),
        heading_ref(NATIVE_CACHE_PATH, "Required rules"),
        heading_ref(RECOVERY_GOVERNANCE_PATH, "Restore privacy reconciliation law"),
    ]
    if len(required_refs) < 10:
        raise ValueError("Source assertions failed to resolve required references.")


def artifact_retention_rows() -> list[dict[str, Any]]:
    retention_basis_heading = "Basis-preserving retention for replay"
    quant_heading = "Quantitative survivability and privacy-preserving projection"
    hold_heading = "Erasure and legal-hold workflow"
    privacy_heading = "Privacy and minimization defaults"
    explain_heading = "Artifact Rules"
    source_rows = [
        row(
            artifact_or_control_id="RunManifest",
            category="AUTHORITATIVE_TRUTH",
            contains_personal_or_sensitive_data=True,
            retention_tag="regulated_record",
            retention_basis="minimum_replay_and_audit_basis",
            legal_hold_behavior="Legal hold may block erasure and must remain visibly queryable via the canonical retention tag.",
            erasure_behavior="Payload minimization may remove direct content, but manifest lineage and RETENTION_LIMITED placeholders must survive without rewriting basis hashes.",
            projection_allowed="LIMITED_EXPLICIT_ONLY",
            survivability_or_fidelity_formula="survivability(o) >= τ_audit for tombstone continuity; controlling proof requires survivability(o) >= τ_submit and silent_ambiguity(o) = 0.",
            canonical_store_or_boundary="sealed manifest control store",
            encryption_or_protection_control="per-tenant envelope encryption plus append-only manifest sealing",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=True,
            restore_reconciliation_required=True,
            release_gate_dependency=["SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=RETENTION_PRIVACY_PATH,
            source_heading_or_logical_block=retention_basis_heading,
            source_ref=heading_ref(RETENTION_PRIVACY_PATH, retention_basis_heading, "RunManifest"),
            notes=[
                "RunManifest is part of the minimum lawful replay basis.",
                "Retained history must never silently collapse into not applicable.",
            ],
        ),
        row(
            artifact_or_control_id="ConfigFreeze",
            category="AUTHORITATIVE_TRUTH",
            contains_personal_or_sensitive_data=False,
            retention_tag="regulated_record",
            retention_basis="minimum_replay_and_audit_basis",
            legal_hold_behavior="Legal hold blocks erasure when the config freeze remains necessary for proof preservation.",
            erasure_behavior="If direct payload retention narrows, explicit limitation placeholders must preserve the frozen execution basis.",
            projection_allowed="OPERATOR_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="Replay-safe basis retention; if unavailable, surface RETENTION_LIMITED rather than silently swapping newer configuration.",
            canonical_store_or_boundary="sealed config freeze store",
            encryption_or_protection_control="integrity-sealed frozen config with durable hash lineage",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=True,
            restore_reconciliation_required=True,
            release_gate_dependency=["SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=RETENTION_PRIVACY_PATH,
            source_heading_or_logical_block=retention_basis_heading,
            source_ref=heading_ref(RETENTION_PRIVACY_PATH, retention_basis_heading, "ConfigFreeze"),
            notes=["ConfigFreeze belongs to the preserved basis set for historical replay."],
        ),
        row(
            artifact_or_control_id="InputFreeze",
            category="AUTHORITATIVE_TRUTH",
            contains_personal_or_sensitive_data=True,
            retention_tag="regulated_record",
            retention_basis="minimum_replay_and_audit_basis",
            legal_hold_behavior="Legal hold preserves auditable input lineage while keeping any erasure blocker explicit.",
            erasure_behavior="Eligible content may be minimized or pseudonymised, but the engine must preserve hashes, lineage, and limitation notes.",
            projection_allowed="LIMITED_EXPLICIT_ONLY",
            survivability_or_fidelity_formula="survivability(o) and limitation_explicitness(o) govern whether the frozen input remains filing-capable, review-only, or tombstoned.",
            canonical_store_or_boundary="frozen input object store",
            encryption_or_protection_control="per-tenant envelope encryption and explicit limitation/tombstone semantics",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=True,
            restore_reconciliation_required=True,
            release_gate_dependency=["SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=RETENTION_PRIVACY_PATH,
            source_heading_or_logical_block=retention_basis_heading,
            source_ref=heading_ref(RETENTION_PRIVACY_PATH, retention_basis_heading, "InputFreeze"),
            notes=["Authoritative intake basis hashes must remain queryable even when payload content is minimized."],
        ),
        row(
            artifact_or_control_id="HashSetExecutionBasis",
            category="AUTHORITATIVE_TRUTH",
            contains_personal_or_sensitive_data=False,
            retention_tag="regulated_record",
            retention_basis="execution_basis_hash_is_replay_critical",
            legal_hold_behavior="Any hold preserving replay basis must preserve execution-basis hash lineage.",
            erasure_behavior="Hashes survive payload minimization and may outlive direct content as the lawful replay placeholder.",
            projection_allowed="OPERATOR_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="execution_basis hash continuity is mandatory even when payload artifacts degrade to RETENTION_LIMITED posture.",
            canonical_store_or_boundary="hash set and basis lineage store",
            encryption_or_protection_control="sealed hash lineage with append-only provenance",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=True,
            restore_reconciliation_required=True,
            release_gate_dependency=["SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=RETENTION_PRIVACY_PATH,
            source_heading_or_logical_block=retention_basis_heading,
            source_ref=text_ref(RETENTION_PRIVACY_PATH, "hash_set.execution_basis_hash", "execution_basis_hash"),
            notes=["Hash lineage is preserved even when human-readable payload detail is no longer retained."],
        ),
        row(
            artifact_or_control_id="GateDecisionRecordLineage",
            category="AUTHORITATIVE_TRUTH",
            contains_personal_or_sensitive_data=False,
            retention_tag="regulated_record",
            retention_basis="ordered_gate_history_required_for_explainability_and_replay",
            legal_hold_behavior="Gate lineage remains on hold when needed to preserve decisive-path audibility.",
            erasure_behavior="Derived gate lineage may survive with explicit limitation notes even when underlying support narrows.",
            projection_allowed="OPERATOR_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="Decisive path continuity must keep silent_ambiguity(o) = 0 or progression blocks.",
            canonical_store_or_boundary="append-only gate record ledger",
            encryption_or_protection_control="sealed ordered gate tape and audit lineage",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=True,
            restore_reconciliation_required=True,
            release_gate_dependency=["SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=RETENTION_PRIVACY_PATH,
            source_heading_or_logical_block=retention_basis_heading,
            source_ref=text_ref(RETENTION_PRIVACY_PATH, "ordered `GateDecisionRecord` lineage", "gate_lineage"),
            notes=["Retention-driven gate changes must also emit correlated error and audit objects."],
        ),
        row(
            artifact_or_control_id="DecisionBundle",
            category="READ_PROJECTION",
            contains_personal_or_sensitive_data=True,
            retention_tag="derived_artifact",
            retention_basis="decision_projection_with_retention_sensitive_confidence",
            legal_hold_behavior="Underlying legal hold preserves the truth basis that informs the bundle's visible limitation posture.",
            erasure_behavior="Visible confidence and explainability must degrade rather than overclaim when retained support narrows.",
            projection_allowed="MASKED_OR_LIMITED_ONLY",
            survivability_or_fidelity_formula="projection_fidelity(o) degrades user-visible certainty relative to retained decision-side confidence; masking must never overstate certainty.",
            canonical_store_or_boundary="materialized decision projection store",
            encryption_or_protection_control="masked projection policy plus stable ref/hash lineage",
            cache_scope=["LOW_NOISE_FRAME", "NATIVE_OPERATOR_WORKSPACE_SCENE"],
            purge_trigger=["ACCESS_BINDING_CHANGE", "MASKING_CHANGE", "SCHEMA_INCOMPATIBLE"],
            replay_preservation_required=False,
            restore_reconciliation_required=True,
            release_gate_dependency=["CROSS_TENANT_CACHE_ISOLATION_GATE", "SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=RETENTION_PRIVACY_PATH,
            source_heading_or_logical_block=quant_heading,
            source_ref=text_ref(RETENTION_PRIVACY_PATH, "Any user-visible confidence or explanation-strength cue", "DecisionBundle"),
            notes=["DecisionBundle is a disposable read model and cannot replace authoritative truth after restore or replay."],
        ),
        row(
            artifact_or_control_id="ProofBundle",
            category="EXPLAINABILITY_ARTIFACT",
            contains_personal_or_sensitive_data=True,
            retention_tag="regulated_record",
            retention_basis="retained_explainability_and_filing_proof_boundary",
            legal_hold_behavior="Hold may preserve proof-path support while keeping hold lineage explicit on the retained bundle.",
            erasure_behavior="A filing-capable bundle must downgrade when decisive support falls below τ_submit or any decisive limitation is silent.",
            projection_allowed="LIMITED_EXPLICIT_ONLY",
            survivability_or_fidelity_formula="controlling proof only when survivability(o) >= τ_submit and silent_ambiguity(o) = 0; otherwise downgrade to review/audit posture with limitation notes.",
            canonical_store_or_boundary="proof bundle store",
            encryption_or_protection_control="retention_binding plus limitation_notes and explicit support posture",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=True,
            restore_reconciliation_required=True,
            release_gate_dependency=["SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=RETENTION_PRIVACY_PATH,
            source_heading_or_logical_block="Proof-bundle retention semantics",
            source_ref=heading_ref(RETENTION_PRIVACY_PATH, "Proof-bundle retention semantics", "ProofBundle"),
            notes=[
                "ProofBundle is retained explainability, not a viewer cache.",
                "Silent proof degradation is forbidden.",
            ],
        ),
        row(
            artifact_or_control_id="EvidenceGraph",
            category="EXPLAINABILITY_ARTIFACT",
            contains_personal_or_sensitive_data=True,
            retention_tag="derived_artifact",
            retention_basis="present_limited_truth_not_missing_edges",
            legal_hold_behavior="If legal hold blocks erasure, the graph must show the retained-limited posture rather than hiding it.",
            erasure_behavior="Expired or erased edges must remain explicit present-but-limited evidence, not broken graph absence.",
            projection_allowed="LIMITED_EXPLICIT_ONLY",
            survivability_or_fidelity_formula="limitation_explicitness(o) must remain typed and non-zero wherever support narrows.",
            canonical_store_or_boundary="evidence graph store",
            encryption_or_protection_control="retention-limited explainability contract with typed omission semantics",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=True,
            restore_reconciliation_required=True,
            release_gate_dependency=["SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=RETENTION_LIMITED_PATH,
            source_heading_or_logical_block=explain_heading,
            source_ref=text_ref(RETENTION_LIMITED_PATH, "`EvidenceGraph` SHALL treat retention limitation", "EvidenceGraph"),
            notes=["EvidenceGraph cannot render retention limitation as a missing edge."],
        ),
        row(
            artifact_or_control_id="EnquiryPack",
            category="EXPLAINABILITY_ARTIFACT",
            contains_personal_or_sensitive_data=True,
            retention_tag="regulated_record",
            retention_basis="scrutiny_export_with_retention_disclosure",
            legal_hold_behavior="Legal hold and omission posture must travel with the export when relevant.",
            erasure_behavior="Exports must keep retention binding, omission entries, and limitation notes under retention pressure.",
            projection_allowed="MASKED_OR_LIMITED_ONLY",
            survivability_or_fidelity_formula="projection_fidelity(o) may narrow exported visibility, but omission and limitation disclosure must remain explicit.",
            canonical_store_or_boundary="enquiry export pack store",
            encryption_or_protection_control="masked export policy with explicit omission_entries[]",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=True,
            restore_reconciliation_required=True,
            release_gate_dependency=["SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=RETENTION_LIMITED_PATH,
            source_heading_or_logical_block=explain_heading,
            source_ref=text_ref(RETENTION_LIMITED_PATH, "`EnquiryPack` SHALL retain `retention_binding", "EnquiryPack"),
            notes=["An enquiry export must remain honest about lawful omissions."],
        ),
        row(
            artifact_or_control_id="AuditEvent",
            category="AUDIT_AND_OBSERVABILITY",
            contains_personal_or_sensitive_data=True,
            retention_tag="operational_log",
            retention_basis="post_expiry_audit_reconstruction_minimum",
            legal_hold_behavior="Audit evidence remains durably queryable during legal hold and release transitions.",
            erasure_behavior="Payload bodies may expire, but object, reason, lineage, and audit-family minimums must survive.",
            projection_allowed="OPERATOR_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="audit-sufficiency policy requires object, reason, and lineage minimum after payload expiry.",
            canonical_store_or_boundary="append-only audit store",
            encryption_or_protection_control="append-only audit evidence with minimized sensitive payloads",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=True,
            restore_reconciliation_required=True,
            release_gate_dependency=["SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=RETENTION_LIMITED_PATH,
            source_heading_or_logical_block="Required Outcomes",
            source_ref=text_ref(RETENTION_LIMITED_PATH, "audit events whose payload bodies expire", "AuditEvent"),
            notes=["Audit events survive payload expiry as the proof-of-record boundary."],
        ),
        row(
            artifact_or_control_id="RetentionTag",
            category="RETENTION_CONTROL_OBJECT",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="canonical_retention_decision_boundary",
            legal_hold_behavior="Canonical legal-hold state, hold ref, and change chronology live here.",
            erasure_behavior="Carries erasure_eligibility, erasure_reason_codes, limitation behavior, proof preservation basis, and authority ambiguity blockers.",
            projection_allowed="OPERATOR_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="tag drives downstream retention_evidence gate and fail-closed erasure posture.",
            canonical_store_or_boundary="retention control store",
            encryption_or_protection_control="schema-validated control object with durable basis refs",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=False,
            restore_reconciliation_required=True,
            release_gate_dependency=["SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=RETENTION_PRIVACY_PATH,
            source_heading_or_logical_block="Retention tag contract",
            source_ref=heading_ref(RETENTION_PRIVACY_PATH, "Retention tag contract", "RetentionTag"),
            notes=["The tag carries effective expiry and blocker refs rather than delegating recomputation downstream."],
            schema_required_fields=schema_value(RETENTION_TAG_SCHEMA_PATH, "required"),
        ),
        row(
            artifact_or_control_id="ArtifactRetention",
            category="RETENTION_CONTROL_OBJECT",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="canonical_artifact_lifecycle_control",
            legal_hold_behavior="LEGAL_HOLD and ERASURE_PENDING states require concrete follow-up workflow refs and next checkpoints.",
            erasure_behavior="PSEUDONYMISED and ERASED states require durable request/action/proof linkage.",
            projection_allowed="OPERATOR_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="lifecycle posture participates directly in RETENTION_EVIDENCE_GATE and downstream blocking effects.",
            canonical_store_or_boundary="artifact retention lifecycle store",
            encryption_or_protection_control="schema-validated lifecycle state plus canonical retention-tag alignment",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=False,
            restore_reconciliation_required=True,
            release_gate_dependency=["SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=RETENTION_PRIVACY_PATH,
            source_heading_or_logical_block="Artifact retention contract",
            source_ref=heading_ref(RETENTION_PRIVACY_PATH, "Artifact retention contract", "ArtifactRetention"),
            notes=["Lifecycle-owned follow-up refs must not leak into terminal-only states."],
            schema_required_fields=schema_value(ARTIFACT_RETENTION_SCHEMA_PATH, "required"),
        ),
        row(
            artifact_or_control_id="ErasureProof",
            category="RETENTION_CONTROL_OBJECT",
            contains_personal_or_sensitive_data=False,
            retention_tag="operational_log",
            retention_basis="erasure_request_decision_and_execution_proof",
            legal_hold_behavior="Erasure proof must show when legal hold blocked or released the workflow.",
            erasure_behavior="Erasure can never destroy the append-only proof that request, decision basis, and execution outcome occurred.",
            projection_allowed="OPERATOR_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="not_formula_based__proof_of_erasure_must_remain_durable",
            canonical_store_or_boundary="erasure workflow and proof store",
            encryption_or_protection_control="append-only proof lineage with workflow and audit refs",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=False,
            restore_reconciliation_required=True,
            release_gate_dependency=["SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=RETENTION_PRIVACY_PATH,
            source_heading_or_logical_block=hold_heading,
            source_ref=text_ref(RETENTION_PRIVACY_PATH, "preserve an erasure-proof trail", "ErasureProof"),
            notes=["Erasure proof is durable even when the erased content is not."],
        ),
        row(
            artifact_or_control_id="ReplayAttestation",
            category="AUTHORITATIVE_TRUTH",
            contains_personal_or_sensitive_data=False,
            retention_tag="regulated_record",
            retention_basis="historical_comparison_basis",
            legal_hold_behavior="Replay attestation persists when required to prove historical comparison outcome.",
            erasure_behavior="If supporting payload narrows, replay must surface RETENTION_LIMITED explicitly instead of synthesizing a newer basis.",
            projection_allowed="OPERATOR_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="Replay basis remains lawful only when preserved artifacts or placeholders keep deterministic comparison honest.",
            canonical_store_or_boundary="replay attestation store",
            encryption_or_protection_control="candidate-bound comparison evidence and basis hash lineage",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=True,
            restore_reconciliation_required=True,
            release_gate_dependency=["SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=RETENTION_PRIVACY_PATH,
            source_heading_or_logical_block=retention_basis_heading,
            source_ref=text_ref(RETENTION_PRIVACY_PATH, "`ReplayAttestation`", "ReplayAttestation"),
            notes=["Replay attestation is part of the preserved historical comparison trail."],
        ),
        row(
            artifact_or_control_id="AuthorityIngressReceipt",
            category="AUTHORITY_TRANSPORT",
            contains_personal_or_sensitive_data=True,
            retention_tag="regulated_record",
            retention_basis="authenticated_ingress_checkpoint",
            legal_hold_behavior="Authority ingress proof survives legal hold because it anchors request-lineage and duplicate suppression.",
            erasure_behavior="Ingress authentication and lineage proof may be minimized, but cannot be reconstructed from transient transport memory.",
            projection_allowed="OPERATOR_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="not_formula_based__authority_ingress_authentication_and_lineage_proof_must_survive_transport_retries",
            canonical_store_or_boundary="authenticated authority ingress checkpoint and inbox",
            encryption_or_protection_control="authenticated provider channel, dedupe key, and request-lineage binding",
            cache_scope=["PRINCIPAL_ACCESS_VIEW"],
            purge_trigger=["AUTHORITY_REBINDING", "SESSION_REVOKED"],
            replay_preservation_required=True,
            restore_reconciliation_required=True,
            release_gate_dependency=["AUTHORITY_SANDBOX_BINDING_GATE", "SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=SECURITY_HARDENING_PATH,
            source_heading_or_logical_block="5. Service-to-service and network hardening",
            source_ref=text_ref(SECURITY_HARDENING_PATH, "AuthorityIngressReceipt", "AuthorityIngressReceipt"),
            notes=["Legal-state mutation is blocked until authenticated ingress, dedupe, and request-lineage correlation complete."],
        ),
        row(
            artifact_or_control_id="AuthorityInteractionRecord",
            category="AUTHORITY_TRANSPORT",
            contains_personal_or_sensitive_data=True,
            retention_tag="regulated_record",
            retention_basis="authority_request_response_lineage",
            legal_hold_behavior="Authority-facing history ambiguity cannot be resolved by deletion and must remain explicit.",
            erasure_behavior="Deletion is blocked where it would obscure already observed authority history.",
            projection_allowed="OPERATOR_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="authority-state reconciliation outranks any attempt to erase or silently rewind already observed legal state.",
            canonical_store_or_boundary="authority interaction ledger",
            encryption_or_protection_control="binding-lineage refs plus request hash and idempotency lineage",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=True,
            restore_reconciliation_required=True,
            release_gate_dependency=["AUTHORITY_SANDBOX_BINDING_GATE", "SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=RETENTION_OBSERVABILITY_PATH,
            source_heading_or_logical_block="15.1 Contract composition and precedence",
            source_ref=text_ref(RETENTION_OBSERVABILITY_PATH, "authority-state reconciliation outranks", "AuthorityInteractionRecord"),
            notes=["Authority history ambiguity is reconciled, never erased."],
        ),
        row(
            artifact_or_control_id="SubmissionRecord",
            category="AUTHORITY_TRANSPORT",
            contains_personal_or_sensitive_data=True,
            retention_tag="regulated_record",
            retention_basis="authority_mutation_and_reconciliation_history",
            legal_hold_behavior="Submission history remains preserved when required for legal-state audit and replay-safe recovery.",
            erasure_behavior="Restore or queue recovery cannot blindly replay mutations from transport artifacts alone.",
            projection_allowed="OPERATOR_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="authority mutations require lineage and binding revalidation before resend or reopen.",
            canonical_store_or_boundary="submission and reconciliation ledger",
            encryption_or_protection_control="request-lineage, token-binding, and reconciliation proof",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=True,
            restore_reconciliation_required=True,
            release_gate_dependency=["AUTHORITY_SANDBOX_BINDING_GATE", "SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=RECOVERY_GOVERNANCE_PATH,
            source_heading_or_logical_block="Queue and authority recovery law",
            source_ref=heading_ref(RECOVERY_GOVERNANCE_PATH, "Queue and authority recovery law", "SubmissionRecord"),
            notes=["Queue recovery is transport rebuild, not truth replay."],
        ),
        row(
            artifact_or_control_id="ClientUploadSession",
            category="UPLOAD_AND_COLLABORATION",
            contains_personal_or_sensitive_data=True,
            retention_tag="derived_artifact",
            retention_basis="governed_upload_staging",
            legal_hold_behavior="Follow-on hold or erasure decisions must preserve staged lineage and publish posture explicitly.",
            erasure_behavior="Staged bytes remain non-downloadable and cannot satisfy a rebased request silently.",
            projection_allowed="LIMITED_EXPLICIT_ONLY",
            survivability_or_fidelity_formula="not_formula_based__stale_bytes_never_satisfy_current_request",
            canonical_store_or_boundary="governed upload session and staging store",
            encryption_or_protection_control="frozen request identity plus checksum/scanner and binding posture",
            cache_scope=["CLIENT_PORTAL_WORKSPACE", "CUSTOMER_REQUEST_LIST"],
            purge_trigger=["ACCESS_BINDING_CHANGE", "TENANT_SWITCH", "SESSION_REVOKED"],
            replay_preservation_required=False,
            restore_reconciliation_required=True,
            release_gate_dependency=["SESSION_AND_ANTI_CSRF_GATE", "SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=NORTHBOUND_API_PATH,
            source_heading_or_logical_block="2.2 Customer/Client portal and upload-session surfaces",
            source_ref=text_ref(NORTHBOUND_API_PATH, "`POST /v1/uploads/sessions`", "ClientUploadSession"),
            notes=["Binary transfer is the governed exception to the general command surface."],
        ),
        row(
            artifact_or_control_id="UploadRequestBindingContract",
            category="UPLOAD_AND_COLLABORATION",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="request_identity_and_rebind_posture",
            legal_hold_behavior="Binding posture survives so upload rebase decisions remain auditable during legal or retention review.",
            erasure_behavior="Rebases and supersession surface as typed states rather than silent rebinding.",
            projection_allowed="OPERATOR_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="resume existing session only; stale bytes never satisfy current request.",
            canonical_store_or_boundary="upload binding control object",
            encryption_or_protection_control="frozen binding scope hash and typed rebinding state",
            cache_scope=["CLIENT_PORTAL_WORKSPACE", "CUSTOMER_REQUEST_LIST"],
            purge_trigger=["TENANT_SWITCH", "ACCESS_BINDING_CHANGE", "SESSION_REVOKED"],
            replay_preservation_required=False,
            restore_reconciliation_required=True,
            release_gate_dependency=["SESSION_AND_ANTI_CSRF_GATE", "SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=NORTHBOUND_API_PATH,
            source_heading_or_logical_block="2.2 Customer/Client portal and upload-session surfaces",
            source_ref=text_ref(NORTHBOUND_API_PATH, "upload_request_binding_contract", "UploadRequestBindingContract"),
            notes=["Upload rebinding is explicit and machine-readable."],
        ),
        row(
            artifact_or_control_id="CollaborationAttachment",
            category="UPLOAD_AND_COLLABORATION",
            contains_personal_or_sensitive_data=True,
            retention_tag="regulated_record",
            retention_basis="published_attachment_with_scan_and_visibility_posture",
            legal_hold_behavior="Published attachment lineage and unavailable reasons remain visible during hold or quarantine review.",
            erasure_behavior="Quarantined or policy-limited files render as typed unavailable state rather than disappearing silently.",
            projection_allowed="MASKED_OR_LIMITED_ONLY",
            survivability_or_fidelity_formula="not_formula_based__customer-visible_downloadability_requires_clean_scan_and_available_publication_state",
            canonical_store_or_boundary="collaboration attachment store",
            encryption_or_protection_control="upload session lineage, visibility binding, and malware-scan gated publication",
            cache_scope=["WORKSPACE_SNAPSHOT", "CLIENT_PORTAL_WORKSPACE"],
            purge_trigger=["MASKING_CHANGE", "ACCESS_BINDING_CHANGE", "TENANT_SWITCH"],
            replay_preservation_required=False,
            restore_reconciliation_required=True,
            release_gate_dependency=["CROSS_TENANT_CACHE_ISOLATION_GATE", "SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=COLLABORATION_PATH,
            source_heading_or_logical_block="7.2 New append-only collaboration artifacts",
            source_ref=text_ref(COLLABORATION_PATH, "#### `CollaborationAttachment`", "CollaborationAttachment"),
            notes=["A customer-visible attachment may appear as pending placeholder but not as downloadable content before scan clearance."],
        ),
        row(
            artifact_or_control_id="MaskedExportArtifact",
            category="EXPORT_AND_VIEW",
            contains_personal_or_sensitive_data=True,
            retention_tag="derived_artifact",
            retention_basis="sensitive_view_and_export_minimization",
            legal_hold_behavior="Export limitation posture stays explicit if hold or minimization narrows the delivered slice.",
            erasure_behavior="Exports inherit masking/export policy and may not bypass it through direct object-store URLs.",
            projection_allowed="MASKED_ONLY",
            survivability_or_fidelity_formula="projection_information_ratio(o) must never exceed decision_information_ratio(o).",
            canonical_store_or_boundary="governed export and delivery boundary",
            encryption_or_protection_control="delivery_binding_hash plus masked export policy and typed omission entries",
            cache_scope=["CLIENT_PORTAL_WORKSPACE", "NATIVE_OPERATOR_SECONDARY_WINDOW_SCENE"],
            purge_trigger=["MASKING_CHANGE", "ROUTE_OR_OBJECT_DRIFT", "AUTHORITY_REBINDING"],
            replay_preservation_required=False,
            restore_reconciliation_required=True,
            release_gate_dependency=["CROSS_TENANT_CACHE_ISOLATION_GATE"],
            source_path=RETENTION_PRIVACY_PATH,
            source_heading_or_logical_block=privacy_heading,
            source_ref=text_ref(RETENTION_PRIVACY_PATH, "`MaskedExportProduced`", "MaskedExportArtifact"),
            notes=["Masked exports prefer summaries, masked fields, and lawful omission rather than raw payload copies."],
        ),
        row(
            artifact_or_control_id="TelemetryLogTrace",
            category="AUDIT_AND_OBSERVABILITY",
            contains_personal_or_sensitive_data=True,
            retention_tag="operational_log",
            retention_basis="runtime_observability_with_minimization",
            legal_hold_behavior="Logs and traces preserve correlation lineage but remain subordinate to audit proof.",
            erasure_behavior="Diagnostic logging must not reintroduce personal or authority-secret data that policy would otherwise hide.",
            projection_allowed="OPERATOR_ONLY_MINIMIZED",
            survivability_or_fidelity_formula="not_formula_based__telemetry_never_becomes_proof_of_record_for_erasure_or_hold",
            canonical_store_or_boundary="observability pipeline and audit-adjacent log store",
            encryption_or_protection_control="redaction, masked values, stable refs, and audit-vs-telemetry separation",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=False,
            restore_reconciliation_required=True,
            release_gate_dependency=["SESSION_AND_ANTI_CSRF_GATE", "SECRET_ROTATION_ATTESTATION_GATE"],
            source_path=RETENTION_OBSERVABILITY_PATH,
            source_heading_or_logical_block="15.4 Correlation, visibility, and signal separation",
            source_ref=heading_ref(RETENTION_OBSERVABILITY_PATH, "15.4 Correlation, visibility, and signal separation", "TelemetryLogTrace"),
            notes=["Telemetry omits high-volume detail when needed, but cannot remove mandatory audit history."],
        ),
        row(
            artifact_or_control_id="WorkInboxSnapshot",
            category="CACHE_AND_PROJECTION",
            contains_personal_or_sensitive_data=True,
            retention_tag="analytics_projection",
            retention_basis="disposable_read_model_rebuildable_from_truth",
            legal_hold_behavior="Snapshot visibility remains subordinate to upstream truth and retention posture.",
            erasure_behavior="Caches rebuild from durable truth; broader variants purge immediately on visibility or masking narrowing.",
            projection_allowed="MASKED_OR_LIMITED_ONLY",
            survivability_or_fidelity_formula="projection_fidelity(o) and visibility partition constrain what may be reused.",
            canonical_store_or_boundary="read model store plus cache partition",
            encryption_or_protection_control="cache_isolation_contract and visibility cache partition key",
            cache_scope=["WORK_INBOX_SNAPSHOT"],
            purge_trigger=["TENANT_SWITCH", "ACCESS_BINDING_CHANGE", "MASKING_CHANGE", "ROUTE_OR_OBJECT_DRIFT"],
            replay_preservation_required=False,
            restore_reconciliation_required=False,
            release_gate_dependency=["CROSS_TENANT_CACHE_ISOLATION_GATE"],
            source_path=COLLABORATION_PATH,
            source_heading_or_logical_block="FE-25 Cache Isolation",
            source_ref=heading_ref(COLLABORATION_PATH, "FE-25 Cache Isolation", "WorkInboxSnapshot"),
            notes=["Inbox caches must remain visibility-scoped and never widen across staff/customer boundaries."],
        ),
        row(
            artifact_or_control_id="WorkspaceSnapshot",
            category="CACHE_AND_PROJECTION",
            contains_personal_or_sensitive_data=True,
            retention_tag="analytics_projection",
            retention_basis="disposable_workspace_projection",
            legal_hold_behavior="Workspace reads surface retention-limited or quarantined state explicitly rather than masking it as absence.",
            erasure_behavior="Cached workspace posture is rebuildable from durable truth and must rebase rather than infer missed transitions.",
            projection_allowed="MASKED_OR_LIMITED_ONLY",
            survivability_or_fidelity_formula="projection_fidelity(o) narrows visible certainty; stream_recovery_contract governs replay-safe continuity.",
            canonical_store_or_boundary="workspace snapshot store and route-stable stream spine",
            encryption_or_protection_control="shell stability token, access binding, masking fingerprint, cache partition key",
            cache_scope=["WORKSPACE_SNAPSHOT", "LOW_NOISE_FRAME"],
            purge_trigger=["TENANT_SWITCH", "ACCESS_BINDING_CHANGE", "MASKING_CHANGE", "SESSION_REVOKED", "SCHEMA_INCOMPATIBLE"],
            replay_preservation_required=False,
            restore_reconciliation_required=False,
            release_gate_dependency=["CROSS_TENANT_CACHE_ISOLATION_GATE", "STALE_VIEW_AND_IDEMPOTENCY_GATE"],
            source_path=NORTHBOUND_API_PATH,
            source_heading_or_logical_block="2. Required northbound surfaces",
            source_ref=text_ref(NORTHBOUND_API_PATH, "`GET /v1/manifests/{manifest_id}/experience/snapshot`", "WorkspaceSnapshot"),
            notes=["Clients recover through resume or rebase, never by recreating hidden transitions locally."],
        ),
        row(
            artifact_or_control_id="ClientPortalWorkspace",
            category="CACHE_AND_PROJECTION",
            contains_personal_or_sensitive_data=True,
            retention_tag="analytics_projection",
            retention_basis="customer_safe_projection_boundary",
            legal_hold_behavior="Portal reuse remains bound to customer-safe projection and visibility posture even under retention limitation.",
            erasure_behavior="Background refresh, stale tabs, or direct URLs cannot widen the reviewed slice once masking or route context drifts.",
            projection_allowed="CUSTOMER_SAFE_ONLY",
            survivability_or_fidelity_formula="projection_information_ratio(o) and delivery_binding_hash bound the customer-safe slice.",
            canonical_store_or_boundary="client portal read model and visibility cache boundary",
            encryption_or_protection_control="cache_isolation_contract plus externalization_governance_contract.delivery_binding_hash",
            cache_scope=["CLIENT_PORTAL_WORKSPACE", "CUSTOMER_REQUEST_LIST"],
            purge_trigger=["TENANT_SWITCH", "ACCESS_BINDING_CHANGE", "MASKING_CHANGE", "ROUTE_OR_OBJECT_DRIFT"],
            replay_preservation_required=False,
            restore_reconciliation_required=False,
            release_gate_dependency=["CROSS_TENANT_CACHE_ISOLATION_GATE", "SESSION_AND_ANTI_CSRF_GATE"],
            source_path=PORTAL_EXPERIENCE_PATH,
            source_heading_or_logical_block="FE-25 Cache Isolation",
            source_ref=heading_ref(PORTAL_EXPERIENCE_PATH, "FE-25 Cache Isolation", "ClientPortalWorkspace"),
            notes=["Portal caches are always customer-safe and must stay exact to client, route, and visibility partition."],
        ),
        row(
            artifact_or_control_id="CacheIsolationContract",
            category="CACHE_CONTROL_OBJECT",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="exact_cache_identity_envelope",
            legal_hold_behavior="Hold does not widen cache reuse; the contract only controls lawful reuse and purge semantics.",
            erasure_behavior="Broader variants purge immediately on access or masking narrowing and must not silently survive.",
            projection_allowed="OPERATOR_AND_RUNTIME_ONLY",
            survivability_or_fidelity_formula="reject reuse on context, route, projection-version, or preview mismatch.",
            canonical_store_or_boundary="shared cache identity contract serialized on read models and native scenes",
            encryption_or_protection_control="exact security-context match, delivery revalidation, and temporary artifact purge policy",
            cache_scope=CACHE_SCOPE_ENUM,
            purge_trigger=["TENANT_SWITCH", "PRINCIPAL_CLASS_CHANGE", "SESSION_BINDING_CHANGE", "ACCESS_BINDING_CHANGE", "MASKING_CHANGE", "ROUTE_OR_OBJECT_DRIFT"],
            replay_preservation_required=False,
            restore_reconciliation_required=False,
            release_gate_dependency=["CROSS_TENANT_CACHE_ISOLATION_GATE"],
            source_path=CACHE_ISOLATION_PATH,
            source_heading_or_logical_block="Contract Fields",
            source_ref=heading_ref(CACHE_ISOLATION_PATH, "Contract Fields", "CacheIsolationContract"),
            notes=["Cache identity is a security boundary rather than a performance-only concern."],
            schema_required_fields=schema_value(CACHE_ISOLATION_SCHEMA_PATH, "required"),
        ),
        row(
            artifact_or_control_id="NativeCacheHydrationContract",
            category="CACHE_CONTROL_OBJECT",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="native_restore_legality_envelope",
            legal_hold_behavior="Hold does not bypass first-paint legality or live rebase requirements.",
            erasure_behavior="Purges regulated local artifacts on tenant, session, masking, route, preview, or schema drift.",
            projection_allowed="NATIVE_RESTORE_ONLY_WHEN_FULL_MATCH",
            survivability_or_fidelity_formula="verify compatibility before render or restore; no mutation after cache-only restore until live legality returns.",
            canonical_store_or_boundary="native hydration legality envelope on cursors and scenes",
            encryption_or_protection_control="schema compatibility, projection guard, session lineage, and purge inventory",
            cache_scope=HYDRATION_SCOPE_ENUM,
            purge_trigger=HYDRATION_PURGE_TRIGGER_ENUM,
            replay_preservation_required=False,
            restore_reconciliation_required=False,
            release_gate_dependency=["CROSS_TENANT_CACHE_ISOLATION_GATE", "NATIVE_DESKTOP_HARDENING_GATE"],
            source_path=NATIVE_CACHE_PATH,
            source_heading_or_logical_block="Authoritative artifacts",
            source_ref=heading_ref(NATIVE_CACHE_PATH, "Authoritative artifacts", "NativeCacheHydrationContract"),
            notes=["Native speed may reuse compatible state but may not outrun legality."],
            schema_required_fields=schema_value(NATIVE_CACHE_SCHEMA_PATH, "required"),
        ),
        row(
            artifact_or_control_id="ActorSession",
            category="SESSION_CONTROL_OBJECT",
            contains_personal_or_sensitive_data=True,
            retention_tag="policy_governed_other",
            retention_basis="short_lived_session_with_revocation_and_step_up_posture",
            legal_hold_behavior="Session audit lineage survives logout, compromise response, or administrator invalidation.",
            erasure_behavior="Session invalidation rotates or revokes challenge state and blocks replay of stale commands.",
            projection_allowed="RUNTIME_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="not_formula_based__every_command_validated_against_current_actor_session_state",
            canonical_store_or_boundary="session control store",
            encryption_or_protection_control="server-side validation, anti-CSRF or device binding, and explicit revocation audit",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=["SESSION_REVOKED", "STEP_UP_COMPLETED", "PRIVILEGE_DOWNGRADE"],
            replay_preservation_required=False,
            restore_reconciliation_required=False,
            release_gate_dependency=["SESSION_AND_ANTI_CSRF_GATE"],
            source_path=SECURITY_HARDENING_PATH,
            source_heading_or_logical_block="2. Identity, session, and command trust",
            source_ref=text_ref(SECURITY_HARDENING_PATH, "short-lived `ActorSession` records", "ActorSession"),
            notes=["Browser, native, and automation sessions share one machine-readable contract."],
            schema_required_fields=schema_value(ACTOR_SESSION_SCHEMA_PATH, "required"),
        ),
        row(
            artifact_or_control_id="SecretVersion",
            category="SECRET_CONTROL_OBJECT",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="versioned_secret_rotation_attestation",
            legal_hold_behavior="Secret rotation chronology remains auditable even across retirement or revocation.",
            erasure_behavior="Rotation fails closed if attestation or version binding is unknown; retired and revoked chronology remains serialized.",
            projection_allowed="RUNTIME_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="not_formula_based__attested_rotation_cutover_and_historical_read_window_must_remain_monotonic",
            canonical_store_or_boundary="token vault / secret store metadata boundary",
            encryption_or_protection_control="versioned secret lineage, KMS/HSM rooted master keys, and attestation refs",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=["SECRET_ROTATION", "REVOCATION_REASON_CHANGED"],
            replay_preservation_required=False,
            restore_reconciliation_required=True,
            release_gate_dependency=["SECRET_ROTATION_ATTESTATION_GATE"],
            source_path=SECURITY_HARDENING_PATH,
            source_heading_or_logical_block="3. Secret, key, and token handling",
            source_ref=text_ref(SECURITY_HARDENING_PATH, "`SecretVersion` SHALL be versioned", "SecretVersion"),
            notes=["No secret lineage may self-supersede or invert attestation chronology."],
            schema_required_fields=schema_value(SECRET_VERSION_SCHEMA_PATH, "required"),
        ),
        row(
            artifact_or_control_id="NativeLocalArtifactSet",
            category="CACHE_AND_EXPORT",
            contains_personal_or_sensitive_data=True,
            retention_tag="analytics_projection",
            retention_basis="regulated_device_local_derivatives",
            legal_hold_behavior="Local derivatives purge with the same revocation and masking boundaries as structured cache.",
            erasure_behavior="NSUserActivity, preview caches, temporary exports, and search indices are purged or invalidated with cache state.",
            projection_allowed="NATIVE_LOCAL_ONLY_WITH_FULL_BINDING",
            survivability_or_fidelity_formula="local_artifact_purge_policy requires purge with cache state on revocation, masking change, or schema incompatibility.",
            canonical_store_or_boundary="device-local structured cache, resume metadata, preview cache, temp export, local search index",
            encryption_or_protection_control="OS-protected storage plus shared purge policy and route/object binding",
            cache_scope=["NATIVE_OPERATOR_WORKSPACE_SCENE", "NATIVE_OPERATOR_SECONDARY_WINDOW_SCENE"],
            purge_trigger=["TENANT_SWITCH", "PRIVILEGE_DOWNGRADE", "SESSION_REVOKED", "MASKING_CHANGE", "SCHEMA_INCOMPATIBLE"],
            replay_preservation_required=False,
            restore_reconciliation_required=False,
            release_gate_dependency=["NATIVE_DESKTOP_HARDENING_GATE", "CROSS_TENANT_CACHE_ISOLATION_GATE"],
            source_path=MACOS_BLUEPRINT_PATH,
            source_heading_or_logical_block="11. Security and runtime posture for the desktop client",
            source_ref=text_ref(MACOS_BLUEPRINT_PATH, "scene-restoration payloads, `NSUserActivity`, preview caches, and temporary export files", "NativeLocalArtifactSet"),
            notes=["Desktop-local derivatives inherit the same masking/export posture as the underlying server object."],
        ),
        row(
            artifact_or_control_id="RestorePrivacyReconciliationContract",
            category="RESTORE_CONTROL_OBJECT",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="post_restore_privacy_and_reopen_boundary",
            legal_hold_behavior="Blocked legal hold, proof preservation, and authority ambiguity states remain explicit legal posture, not notes.",
            erasure_behavior="Restore-time resurrected erased data opens compensating re-erasure workflow before reopen.",
            projection_allowed="RUNTIME_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="reopen_access_state remains BLOCKED or LIMITED until privacy reconciliation reaches a reconciled state.",
            canonical_store_or_boundary="restore privacy reconciliation boundary",
            encryption_or_protection_control="checkpoint, restore drill, audit continuity, replay limitation, and compensating re-erasure lineage",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=True,
            restore_reconciliation_required=True,
            release_gate_dependency=["SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=RECOVERY_GOVERNANCE_PATH,
            source_heading_or_logical_block="Restore privacy reconciliation law",
            source_ref=heading_ref(RECOVERY_GOVERNANCE_PATH, "Restore privacy reconciliation law", "RestorePrivacyReconciliationContract"),
            notes=["Restore evidence is not lawful production evidence until privacy reconciliation reaches a reconciled state."],
            schema_required_fields=schema_value(RESTORE_PRIVACY_SCHEMA_PATH, "required"),
        ),
        row(
            artifact_or_control_id="ApiCommandReceipt",
            category="READ_PROJECTION",
            contains_personal_or_sensitive_data=True,
            retention_tag="derived_artifact",
            retention_basis="idempotent_command_recovery_anchor",
            legal_hold_behavior="Receipts preserve command recovery anchors and session lineage during investigations or incident review.",
            erasure_behavior="Expired success projections keep the same recovery-anchor family instead of degrading into transport-only timeout markers.",
            projection_allowed="OPERATOR_AND_RUNTIME_ONLY",
            survivability_or_fidelity_formula="duplicate submits collapse onto one durable receipt and one legal state transition.",
            canonical_store_or_boundary="command receipt store",
            encryption_or_protection_control="durable command_id, request_hash, idempotency_key, and authoritative object refs",
            cache_scope=["LOW_NOISE_FRAME", "NATIVE_OPERATOR_WORKSPACE_SCENE"],
            purge_trigger=["SESSION_REVOKED", "SCHEMA_INCOMPATIBLE"],
            replay_preservation_required=False,
            restore_reconciliation_required=False,
            release_gate_dependency=["STALE_VIEW_AND_IDEMPOTENCY_GATE"],
            source_path=NORTHBOUND_API_PATH,
            source_heading_or_logical_block="2. Required northbound surfaces",
            source_ref=text_ref(NORTHBOUND_API_PATH, "`GET /v1/commands/{command_id}`", "ApiCommandReceipt"),
            notes=["Durable receipts are the northbound recovery anchor after lost POST responses or app relaunch."],
        ),
    ]
    assert_required_row_fields(source_rows)
    return sorted(source_rows, key=lambda item: item["artifact_or_control_id"])


def privacy_threshold_rows() -> list[dict[str, Any]]:
    quant_heading = "Quantitative survivability and privacy-preserving projection"
    explain_heading = "Governing Model"
    rules: list[dict[str, Any]] = [
        row(
            artifact_or_control_id="FORMULA_DECISION_INFORMATION_RATIO",
            category="QUANTITATIVE_PRIVACY_FORMULA",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="retained_decision_side_information_measure",
            legal_hold_behavior="Legal hold can preserve inputs but does not change the formula definition.",
            erasure_behavior="Measures retained lawful decision-side information after expiry, minimization, pseudonymisation, or erasure.",
            projection_allowed="RUNTIME_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="decision_information_ratio(o) in [0,1]",
            canonical_store_or_boundary="retention quantitative policy surface",
            encryption_or_protection_control="typed formula basis and deterministic evaluation",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=True,
            restore_reconciliation_required=False,
            release_gate_dependency=NOT_APPLICABLE,
            source_path=RETENTION_PRIVACY_PATH,
            source_heading_or_logical_block=quant_heading,
            source_ref=text_ref(RETENTION_PRIVACY_PATH, "`decision_information_ratio(o) in [0,1]`", "decision_information_ratio"),
            notes=["This is the retained fraction of original decision-relevant information."],
            symbol="decision_information_ratio(o)",
            ascii_symbol="decision_information_ratio(o)",
            formula_class="RATIO",
        ),
        row(
            artifact_or_control_id="FORMULA_PROJECTION_INFORMATION_RATIO",
            category="QUANTITATIVE_PRIVACY_FORMULA",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="authorized_projection_visibility_measure",
            legal_hold_behavior="Legal hold does not widen projection visibility.",
            erasure_behavior="Measures visible decision-relevant information under masking or export policy.",
            projection_allowed="RUNTIME_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="projection_information_ratio(o) in [0,1] and projection_information_ratio(o) <= decision_information_ratio(o)",
            canonical_store_or_boundary="retention quantitative policy surface",
            encryption_or_protection_control="typed formula basis and projection invalidity reason code",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=False,
            restore_reconciliation_required=False,
            release_gate_dependency=NOT_APPLICABLE,
            source_path=RETENTION_PRIVACY_PATH,
            source_heading_or_logical_block=quant_heading,
            source_ref=text_ref(RETENTION_PRIVACY_PATH, "`projection_information_ratio(o) in [0,1]`", "projection_information_ratio"),
            notes=["Emit PRIVACY_PROJECTION_RATIO_INVALID when the projection ratio exceeds retained decision-side information."],
            symbol="projection_information_ratio(o)",
            ascii_symbol="projection_information_ratio(o)",
            formula_class="RATIO",
        ),
        row(
            artifact_or_control_id="FORMULA_LIMITATION_EXPLICITNESS",
            category="QUANTITATIVE_PRIVACY_FORMULA",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="typed_limitation_coverage_measure",
            legal_hold_behavior="Legal hold blockers must still be explicit and reason-coded.",
            erasure_behavior="Lost or limited state must carry typed limitation, omission, or tombstone semantics with reason codes.",
            projection_allowed="RUNTIME_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="limitation_explicitness(o) in [0,1]",
            canonical_store_or_boundary="retention quantitative policy surface",
            encryption_or_protection_control="typed limitation and omission semantics",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=True,
            restore_reconciliation_required=False,
            release_gate_dependency=NOT_APPLICABLE,
            source_path=RETENTION_PRIVACY_PATH,
            source_heading_or_logical_block=quant_heading,
            source_ref=text_ref(RETENTION_PRIVACY_PATH, "`limitation_explicitness(o) in [0,1]`", "limitation_explicitness"),
            notes=["Silent ambiguity is measured as the inverse of limitation explicitness."],
            symbol="limitation_explicitness(o)",
            ascii_symbol="limitation_explicitness(o)",
            formula_class="RATIO",
        ),
        row(
            artifact_or_control_id="FORMULA_SILENT_AMBIGUITY",
            category="QUANTITATIVE_PRIVACY_FORMULA",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="structural_ambiguity_measure",
            legal_hold_behavior="Hold blockers must stay visible; hidden blockers raise ambiguity rather than resolve it.",
            erasure_behavior="A limited or erased object with no typed limitation semantics opens a retention/privacy error and blocks filing-capable progression.",
            projection_allowed="RUNTIME_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="silent_ambiguity(o) = 1 - limitation_explicitness(o)",
            canonical_store_or_boundary="retention quantitative policy surface",
            encryption_or_protection_control="typed retention error and fail-closed gate coupling",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=True,
            restore_reconciliation_required=False,
            release_gate_dependency=["STALE_VIEW_AND_IDEMPOTENCY_GATE"],
            source_path=RETENTION_PRIVACY_PATH,
            source_heading_or_logical_block=quant_heading,
            source_ref=text_ref(RETENTION_PRIVACY_PATH, "`silent_ambiguity(o) = 1 - limitation_explicitness(o)`", "silent_ambiguity"),
            notes=["Silent ambiguity is a structural defect, not a soft warning."],
            symbol="silent_ambiguity(o)",
            ascii_symbol="silent_ambiguity(o)",
            formula_class="DERIVED_RATIO",
        ),
        row(
            artifact_or_control_id="FORMULA_SURVIVABILITY",
            category="QUANTITATIVE_PRIVACY_FORMULA",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="decisive_support_survival_measure",
            legal_hold_behavior="Legal hold preserves support but does not waive the survivability threshold rules.",
            erasure_behavior="Below τ_audit, only lawful tombstones, erasure-proof lineage, and bounded audit metadata may survive.",
            projection_allowed="RUNTIME_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="survivability(o) = clamp01(decision_information_ratio(o) * limitation_explicitness(o))",
            canonical_store_or_boundary="retention quantitative policy surface",
            encryption_or_protection_control="deterministic threshold logic for filing, review, and audit posture",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=True,
            restore_reconciliation_required=False,
            release_gate_dependency=["SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=RETENTION_PRIVACY_PATH,
            source_heading_or_logical_block=quant_heading,
            source_ref=text_ref(RETENTION_PRIVACY_PATH, "`survivability(o) = clamp01(decision_information_ratio(o) * limitation_explicitness(o))`", "survivability"),
            notes=["Survivability governs controlling proof, review-only, and audit-only posture."],
            symbol="survivability(o)",
            ascii_symbol="survivability(o)",
            formula_class="DERIVED_RATIO",
        ),
        row(
            artifact_or_control_id="FORMULA_PROJECTION_FIDELITY",
            category="QUANTITATIVE_PRIVACY_FORMULA",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="projection_confidence_degradation_measure",
            legal_hold_behavior="Hold does not widen projected content or confidence.",
            erasure_behavior="Masking is a projection transform, not evidence destruction; hidden values must not serialize as false absence.",
            projection_allowed="RUNTIME_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="projection_fidelity(o) = 0 if decision_information_ratio(o) = 0 else clamp01(projection_information_ratio(o) / decision_information_ratio(o))",
            canonical_store_or_boundary="retention quantitative policy surface",
            encryption_or_protection_control="typed omission entries and confidence degradation",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=False,
            restore_reconciliation_required=False,
            release_gate_dependency=NOT_APPLICABLE,
            source_path=RETENTION_PRIVACY_PATH,
            source_heading_or_logical_block=quant_heading,
            source_ref=text_ref(RETENTION_PRIVACY_PATH, "`projection_fidelity(o) = 0 if decision_information_ratio(o) = 0 else clamp01(projection_information_ratio(o) / decision_information_ratio(o))`", "projection_fidelity"),
            notes=["User-visible confidence cues degrade by projection_fidelity(o)."],
            symbol="projection_fidelity(o)",
            ascii_symbol="projection_fidelity(o)",
            formula_class="DERIVED_RATIO",
        ),
        row(
            artifact_or_control_id="THRESHOLD_SUBMIT",
            category="QUANTITATIVE_PRIVACY_THRESHOLD",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="controlling_filing_threshold",
            legal_hold_behavior="Hold does not relax the filing-capable threshold.",
            erasure_behavior="If decisive support drops below this threshold, the artifact cannot remain controlling proof.",
            projection_allowed="RUNTIME_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="τ_submit = 0.80",
            canonical_store_or_boundary="retention quantitative policy surface",
            encryption_or_protection_control="deterministic threshold constant",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=True,
            restore_reconciliation_required=False,
            release_gate_dependency=NOT_APPLICABLE,
            source_path=RETENTION_PRIVACY_PATH,
            source_heading_or_logical_block=quant_heading,
            source_ref=text_ref(RETENTION_PRIVACY_PATH, "`τ_submit = 0.80`", "tau_submit"),
            notes=["Controls filing-capable and authority-facing proof posture."],
            symbol="τ_submit",
            ascii_symbol="tau_submit",
            threshold_value=0.80,
            threshold_role="CONTROLLING_PROOF",
        ),
        row(
            artifact_or_control_id="THRESHOLD_REVIEW",
            category="QUANTITATIVE_PRIVACY_THRESHOLD",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="review_only_threshold",
            legal_hold_behavior="Hold does not bypass the review-only threshold.",
            erasure_behavior="Below τ_review, an artifact cannot remain review-capable without downgrade.",
            projection_allowed="RUNTIME_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="τ_review = 0.45",
            canonical_store_or_boundary="retention quantitative policy surface",
            encryption_or_protection_control="deterministic threshold constant",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=True,
            restore_reconciliation_required=False,
            release_gate_dependency=NOT_APPLICABLE,
            source_path=RETENTION_PRIVACY_PATH,
            source_heading_or_logical_block=quant_heading,
            source_ref=text_ref(RETENTION_PRIVACY_PATH, "`τ_review = 0.45`", "tau_review"),
            notes=["Separates review-capable non-automating posture from audit-only posture."],
            symbol="τ_review",
            ascii_symbol="tau_review",
            threshold_value=0.45,
            threshold_role="REVIEW_ONLY",
        ),
        row(
            artifact_or_control_id="THRESHOLD_AUDIT",
            category="QUANTITATIVE_PRIVACY_THRESHOLD",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="audit_or_tombstone_threshold",
            legal_hold_behavior="Hold preserves audit/tombstone posture but does not change the threshold.",
            erasure_behavior="Below τ_audit, only erasure-proof lineage, lawful tombstones, and bounded audit metadata may survive.",
            projection_allowed="RUNTIME_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="τ_audit = 0.15",
            canonical_store_or_boundary="retention quantitative policy surface",
            encryption_or_protection_control="deterministic threshold constant",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=True,
            restore_reconciliation_required=False,
            release_gate_dependency=NOT_APPLICABLE,
            source_path=RETENTION_PRIVACY_PATH,
            source_heading_or_logical_block=quant_heading,
            source_ref=text_ref(RETENTION_PRIVACY_PATH, "`τ_audit = 0.15`", "tau_audit"),
            notes=["Defines the final audit/tombstone survival floor."],
            symbol="τ_audit",
            ascii_symbol="tau_audit",
            threshold_value=0.15,
            threshold_role="AUDIT_OR_TOMBSTONE",
        ),
        row(
            artifact_or_control_id="EXPLAINABILITY_SCOPE_PROOF_BUNDLE",
            category="RETENTION_LIMITED_EXPLAINABILITY",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="surface_specific_retention_binding_policy",
            legal_hold_behavior="Retained decisive limitation and retention binding remain explicit under hold.",
            erasure_behavior="AVAILABLE explanation is forbidden when decisive retained support is limited, tombstoned, pseudonymised, or erased.",
            projection_allowed="RUNTIME_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="AVAILABLE_ONLY_WHEN_FULL_DECISIVE_RENDERABILITY_SURVIVES",
            canonical_store_or_boundary="retention_limited_explainability_contract",
            encryption_or_protection_control="surface-specific binding policy for proof artifacts",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=True,
            restore_reconciliation_required=True,
            release_gate_dependency=["SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=RETENTION_LIMITED_PATH,
            source_heading_or_logical_block=explain_heading,
            source_ref=heading_ref(RETENTION_LIMITED_PATH, explain_heading, "PROOF_BUNDLE"),
            notes=["ProofBundle retains decisive limitation and retention binding."],
            boundary_scope="PROOF_BUNDLE",
            surface_role="FILING_PROOF_ARTIFACT",
        ),
        row(
            artifact_or_control_id="EXPLAINABILITY_SCOPE_EVIDENCE_GRAPH",
            category="RETENTION_LIMITED_EXPLAINABILITY",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="surface_specific_retention_binding_policy",
            legal_hold_behavior="Current graph posture remains explicit under hold.",
            erasure_behavior="Retention-limited truth remains present but limited, not negatively absent.",
            projection_allowed="RUNTIME_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="LIMITATIONS_AND_OMISSIONS_MUST_BE_EXPLICIT_NOT_NEGATIVE_ABSENCE",
            canonical_store_or_boundary="retention_limited_explainability_contract",
            encryption_or_protection_control="surface-specific limitation notes and target explanation posture",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=True,
            restore_reconciliation_required=True,
            release_gate_dependency=["SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=RETENTION_LIMITED_PATH,
            source_heading_or_logical_block=explain_heading,
            source_ref=heading_ref(RETENTION_LIMITED_PATH, explain_heading, "EVIDENCE_GRAPH"),
            notes=["EvidenceGraph keeps limitation notes and target explanation posture."],
            boundary_scope="EVIDENCE_GRAPH",
            surface_role="GRAPH_EXPLANATION_INDEX",
        ),
        row(
            artifact_or_control_id="EXPLAINABILITY_SCOPE_ENQUIRY_PACK",
            category="RETENTION_LIMITED_EXPLAINABILITY",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="surface_specific_retention_binding_policy",
            legal_hold_behavior="Omission entries remain explicit under hold.",
            erasure_behavior="Enquiry exports may not omit retention binding or omission entries under retention pressure.",
            projection_allowed="RUNTIME_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="RETENTION_LIMITED_TRUTH_REMAINS_PRESENT_BUT_LIMITED",
            canonical_store_or_boundary="retention_limited_explainability_contract",
            encryption_or_protection_control="surface-specific retention binding, limitation notes, and omission entries",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=True,
            restore_reconciliation_required=True,
            release_gate_dependency=["SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=RETENTION_LIMITED_PATH,
            source_heading_or_logical_block=explain_heading,
            source_ref=heading_ref(RETENTION_LIMITED_PATH, explain_heading, "ENQUIRY_PACK"),
            notes=["Scrutiny exports must remain explicit about what was lawfully withheld."],
            boundary_scope="ENQUIRY_PACK",
            surface_role="SCRUTINY_EXPORT_PACK",
        ),
        row(
            artifact_or_control_id="EXPLAINABILITY_SCOPE_AUDIT_EVENT",
            category="RETENTION_LIMITED_EXPLAINABILITY",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="surface_specific_retention_binding_policy",
            legal_hold_behavior="Audit reconstruction minimum survives hold and expiry.",
            erasure_behavior="Audit payload expiry cannot erase object, reason, and lineage minimum.",
            projection_allowed="RUNTIME_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="POST_EXPIRY_AUDIT_MUST_RETAIN_OBJECT_REASON_AND_LINEAGE_MINIMUM",
            canonical_store_or_boundary="retention_limited_explainability_contract",
            encryption_or_protection_control="audit-sufficiency minimum with present-limited truth policy",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=True,
            restore_reconciliation_required=True,
            release_gate_dependency=["SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=RETENTION_LIMITED_PATH,
            source_heading_or_logical_block=explain_heading,
            source_ref=heading_ref(RETENTION_LIMITED_PATH, explain_heading, "AUDIT_EVENT"),
            notes=["Audit reconstruction evidence survives payload expiry."],
            boundary_scope="AUDIT_EVENT",
            surface_role="AUDIT_RECONSTRUCTION_EVIDENCE",
        ),
    ]
    assert_required_row_fields(rules)
    return rules


def security_control_rows() -> list[dict[str, Any]]:
    rows = [
        row(
            artifact_or_control_id="RETENTION_TAG_AND_ARTIFACT_RETENTION",
            category="SECURITY_CONTROL",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="canonical_retention_and_expiry_control_plane",
            legal_hold_behavior="Hold state, refs, and chronology are serialized on canonical retention objects.",
            erasure_behavior="Fail closed on unresolved hold, statutory minimum, proof-preservation, or authority ambiguity blockers.",
            projection_allowed="OPERATOR_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="RetentionTag and ArtifactRetention serialize the lifecycle basis that later gates consume.",
            canonical_store_or_boundary="retention control store",
            encryption_or_protection_control="schema-validated retention tag and artifact lifecycle objects",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=True,
            restore_reconciliation_required=True,
            release_gate_dependency=["SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=RETENTION_PRIVACY_PATH,
            source_heading_or_logical_block="Retention tag contract",
            source_ref=heading_ref(RETENTION_PRIVACY_PATH, "Retention tag contract", "RETENTION_TAG_AND_ARTIFACT_RETENTION"),
            notes=["Retention state changes remain typed state, not passive prose."],
            control_layer="retention_control_plane",
        ),
        row(
            artifact_or_control_id="RETENTION_LIMITED_EXPLAINABILITY",
            category="SECURITY_CONTROL",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="honest_limited_truth_rendering",
            legal_hold_behavior="Hold does not permit silent absence; limitations remain explicit.",
            erasure_behavior="Explanation AVAILABLE posture is forbidden when decisive support no longer fully survives.",
            projection_allowed="RUNTIME_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="silent_ambiguity(o) must remain zero for decisive support.",
            canonical_store_or_boundary="retention-limited explainability contract boundary",
            encryption_or_protection_control="typed limitation notes, omission entries, and present-limited truth",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=True,
            restore_reconciliation_required=True,
            release_gate_dependency=["SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=RETENTION_LIMITED_PATH,
            source_heading_or_logical_block="Required Outcomes",
            source_ref=heading_ref(RETENTION_LIMITED_PATH, "Required Outcomes", "RETENTION_LIMITED_EXPLAINABILITY"),
            notes=["Lawful minimization is not permission for silent ambiguity."],
            control_layer="explainability_boundary",
        ),
        row(
            artifact_or_control_id="RETENTION_ERROR_AND_GATE_COUPLING",
            category="SECURITY_CONTROL",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="retention_state_to_error_and_gate_binding",
            legal_hold_behavior="Legal hold preventing erasure surfaces as typed blocking effect such as BLOCKS_ERASURE.",
            erasure_behavior="Any material retention condition produces correlated gate, error, and audit evidence.",
            projection_allowed="OPERATOR_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="RETENTION_EVIDENCE_GATE consumes evidence availability, limitation, and erased-path posture directly.",
            canonical_store_or_boundary="error, remediation, and gate integration boundary",
            encryption_or_protection_control="typed ErrorRecord / RemediationTask / CompensationRecord linkage",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=False,
            restore_reconciliation_required=True,
            release_gate_dependency=["SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=RETENTION_OBSERVABILITY_PATH,
            source_heading_or_logical_block="15.3 Gate and progression coupling",
            source_ref=heading_ref(RETENTION_OBSERVABILITY_PATH, "15.3 Gate and progression coupling", "RETENTION_ERROR_AND_GATE_COUPLING"),
            notes=["Retention posture is a gate input, not a UI warning."],
            control_layer="gate_and_failure_control_plane",
        ),
        row(
            artifact_or_control_id="SESSION_BOUND_COMMAND_VALIDATION",
            category="SECURITY_CONTROL",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="current_actor_session_validation",
            legal_hold_behavior="Session audit lineage remains queryable for incident and compliance review.",
            erasure_behavior="Revocation blocks future command acceptance until re-authentication rather than relying on client-held tokens.",
            projection_allowed="RUNTIME_ONLY",
            survivability_or_fidelity_formula="Every command validates against current actor/session state; stale commands are rejected.",
            canonical_store_or_boundary="northbound session and command control plane",
            encryption_or_protection_control="short-lived ActorSession records and server-side validation",
            cache_scope=["LOW_NOISE_FRAME", "WORKSPACE_SNAPSHOT"],
            purge_trigger=["SESSION_REVOKED", "STEP_UP_COMPLETED", "PRIVILEGE_DOWNGRADE"],
            replay_preservation_required=False,
            restore_reconciliation_required=False,
            release_gate_dependency=["SESSION_AND_ANTI_CSRF_GATE", "STALE_VIEW_AND_IDEMPOTENCY_GATE"],
            source_path=SECURITY_HARDENING_PATH,
            source_heading_or_logical_block="2. Identity, session, and command trust",
            source_ref=heading_ref(SECURITY_HARDENING_PATH, "2. Identity, session, and command trust", "SESSION_BOUND_COMMAND_VALIDATION"),
            notes=["No write action relies only on a client-held token."],
            control_layer="identity_and_command_trust",
        ),
        row(
            artifact_or_control_id="ANTI_CSRF_AND_SECURE_COOKIE_POSTURE",
            category="SECURITY_CONTROL",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="browser_origin_defense",
            legal_hold_behavior="Not stateful beyond audit evidence of revocation and challenge changes.",
            erasure_behavior="Not applicable to payload erasure; applies to browser-origin request validity.",
            projection_allowed="RUNTIME_ONLY",
            survivability_or_fidelity_formula="cookie-based browser sessions require anti-CSRF protection and secure cookie flags.",
            canonical_store_or_boundary="browser session boundary",
            encryption_or_protection_control="anti-CSRF token, secure cookie flags, CSP, clickjacking defenses",
            cache_scope=["CLIENT_PORTAL_WORKSPACE", "CUSTOMER_REQUEST_LIST", "LOW_NOISE_FRAME"],
            purge_trigger=["SESSION_REVOKED", "STEP_UP_COMPLETED"],
            replay_preservation_required=False,
            restore_reconciliation_required=False,
            release_gate_dependency=["SESSION_AND_ANTI_CSRF_GATE"],
            source_path=SECURITY_HARDENING_PATH,
            source_heading_or_logical_block="4. Browser, native-client, API, and transport hardening",
            source_ref=text_ref(SECURITY_HARDENING_PATH, "anti-CSRF protection for cookie-based browser sessions", "ANTI_CSRF_AND_SECURE_COOKIE_POSTURE"),
            notes=["Browser-origin write actions require authenticated session plus anti-CSRF posture."],
            control_layer="browser_security_boundary",
        ),
        row(
            artifact_or_control_id="STEP_UP_AND_SESSION_ROTATION",
            category="SECURITY_CONTROL",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="privileged_action_escalation_control",
            legal_hold_behavior="Step-up completion and revocation remain auditable.",
            erasure_behavior="Pre-step-up commands and cursors cannot replay blindly after step-up completion.",
            projection_allowed="RUNTIME_ONLY",
            survivability_or_fidelity_formula="session rotation after privilege elevation or step-up completion",
            canonical_store_or_boundary="session challenge state and approval boundary",
            encryption_or_protection_control="MFA/step-up, session rotation, revocation audit, and bound cursor invalidation",
            cache_scope=["LOW_NOISE_FRAME", "NATIVE_OPERATOR_WORKSPACE_SCENE", "EXPERIENCE_CURSOR", "WORKSPACE_CURSOR"],
            purge_trigger=["STEP_UP_COMPLETED", "SESSION_REVOKED", "PRIVILEGE_DOWNGRADE"],
            replay_preservation_required=False,
            restore_reconciliation_required=False,
            release_gate_dependency=["SESSION_AND_ANTI_CSRF_GATE", "STALE_VIEW_AND_IDEMPOTENCY_GATE"],
            source_path=MACOS_BLUEPRINT_PATH,
            source_heading_or_logical_block="7. Authentication and session strategy",
            source_ref=text_ref(MACOS_BLUEPRINT_PATH, "step-up completion SHALL rotate the effective session challenge state", "STEP_UP_AND_SESSION_ROTATION"),
            notes=["Applies to browser, native, and authority-sensitive flows."],
            control_layer="authn_escalation_boundary",
        ),
        row(
            artifact_or_control_id="TOKEN_VAULT_AND_BINDING_LINEAGE_REVALIDATION",
            category="SECURITY_CONTROL",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="vault_only_raw_tokens_and_pre_send_revalidation",
            legal_hold_behavior="Token lineage and rotation evidence remain auditable; hold does not justify broader token exposure.",
            erasure_behavior="Raw tokens never persist in queues, read models, or general logs; only opaque refs survive.",
            projection_allowed="RUNTIME_ONLY",
            survivability_or_fidelity_formula="queued authority mutation revalidates usable token version against persisted binding_lineage_ref immediately before send.",
            canonical_store_or_boundary="governed token vault or secret store",
            encryption_or_protection_control="vault isolation, token_binding_ref, binding_lineage_ref, access_binding_hash, policy_snapshot_hash",
            cache_scope=["PRINCIPAL_ACCESS_VIEW"],
            purge_trigger=["AUTHORITY_REBINDING", "TOKEN_ROTATION", "SESSION_REVOKED"],
            replay_preservation_required=False,
            restore_reconciliation_required=True,
            release_gate_dependency=["SECRET_ROTATION_ATTESTATION_GATE", "AUTHORITY_SANDBOX_BINDING_GATE"],
            source_path=SECURITY_HARDENING_PATH,
            source_heading_or_logical_block="3. Secret, key, and token handling",
            source_ref=heading_ref(SECURITY_HARDENING_PATH, "3. Secret, key, and token handling", "TOKEN_VAULT_AND_BINDING_LINEAGE_REVALIDATION"),
            notes=["No raw authority token exists outside the vault boundary."],
            control_layer="secret_and_token_boundary",
        ),
        row(
            artifact_or_control_id="PER_TENANT_ENVELOPE_ENCRYPTION",
            category="SECURITY_CONTROL",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="per_tenant_or_per_sensitivity_data_encryption",
            legal_hold_behavior="Hold preserves encrypted artifacts without downgrading the encryption boundary.",
            erasure_behavior="Erased or minimized artifacts may retain lawful encrypted refs or hashes, not raw content.",
            projection_allowed="RUNTIME_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="object payload encryption uses per-tenant or per-sensitivity envelope keys rooted in KMS/HSM master keys.",
            canonical_store_or_boundary="object store and regulated payload boundary",
            encryption_or_protection_control="envelope encryption rooted in KMS/HSM",
            cache_scope=["CLIENT_PORTAL_WORKSPACE", "WORKSPACE_SNAPSHOT", "NATIVE_OPERATOR_WORKSPACE_SCENE"],
            purge_trigger=["TENANT_SWITCH", "MASKING_CHANGE", "SCHEMA_INCOMPATIBLE"],
            replay_preservation_required=True,
            restore_reconciliation_required=True,
            release_gate_dependency=["SECRET_ROTATION_ATTESTATION_GATE"],
            source_path=SECURITY_HARDENING_PATH,
            source_heading_or_logical_block="3. Secret, key, and token handling",
            source_ref=text_ref(SECURITY_HARDENING_PATH, "object payload encryption SHALL use per-tenant", "PER_TENANT_ENVELOPE_ENCRYPTION"),
            notes=["Applies to sensitive client and authority data."],
            control_layer="data_protection_boundary",
        ),
        row(
            artifact_or_control_id="AUTHORITY_INGRESS_QUARANTINE_AND_DEDUPE",
            category="SECURITY_CONTROL",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="authenticated_authority_ingress_checkpoint",
            legal_hold_behavior="Quarantine, dedupe, and reconciliation ownership remain explicit under hold.",
            erasure_behavior="Ingress lineage survives retries and recovery; it is not reconstructed from transport memory.",
            projection_allowed="RUNTIME_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="No authority callback or recovery payload mutates legal state before authenticated ingress, dedupe, and request-lineage correlation complete.",
            canonical_store_or_boundary="authority inbox and ingress checkpoint",
            encryption_or_protection_control="provider-channel authentication, dedupe key, authority_ingress_proof_contract",
            cache_scope=["PRINCIPAL_ACCESS_VIEW"],
            purge_trigger=["AUTHORITY_REBINDING", "SESSION_REVOKED"],
            replay_preservation_required=True,
            restore_reconciliation_required=True,
            release_gate_dependency=["AUTHORITY_SANDBOX_BINDING_GATE"],
            source_path=SECURITY_HARDENING_PATH,
            source_heading_or_logical_block="5. Service-to-service and network hardening",
            source_ref=heading_ref(SECURITY_HARDENING_PATH, "5. Service-to-service and network hardening", "AUTHORITY_INGRESS_QUARANTINE_AND_DEDUPE"),
            notes=["A lone authority_reference match remains quarantined, not trusted as legal correlation."],
            control_layer="authority_edge_boundary",
        ),
        row(
            artifact_or_control_id="CACHE_ISOLATION_CONTRACT_ENFORCEMENT",
            category="SECURITY_CONTROL",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="exact_cache_context_matching",
            legal_hold_behavior="Hold does not permit reuse across tenants, masking posture, or route drift.",
            erasure_behavior="Broader variants purge immediately on access or masking narrowing.",
            projection_allowed="RUNTIME_ONLY",
            survivability_or_fidelity_formula="exact security-context match only; purge-or-reject on tenant, principal, session, access, masking, route, projection-version, or preview drift.",
            canonical_store_or_boundary="shared cache identity contract",
            encryption_or_protection_control="cache_isolation_contract, delivery binding hash, temp artifact purge policy",
            cache_scope=CACHE_SCOPE_ENUM,
            purge_trigger=["TENANT_SWITCH", "PRINCIPAL_CLASS_CHANGE", "SESSION_BINDING_CHANGE", "ACCESS_BINDING_CHANGE", "MASKING_CHANGE", "ROUTE_OR_OBJECT_DRIFT", "SCHEMA_INCOMPATIBLE"],
            replay_preservation_required=False,
            restore_reconciliation_required=False,
            release_gate_dependency=["CROSS_TENANT_CACHE_ISOLATION_GATE"],
            source_path=SECURITY_HARDENING_PATH,
            source_heading_or_logical_block="FE-25 Cache Isolation",
            source_ref=heading_ref(SECURITY_HARDENING_PATH, "FE-25 Cache Isolation", "CACHE_ISOLATION_CONTRACT_ENFORCEMENT"),
            notes=["Cache identity is a security boundary across browser, portal, governance, and native surfaces."],
            control_layer="cache_reuse_boundary",
        ),
        row(
            artifact_or_control_id="NATIVE_CACHE_HYDRATION_PURGE_AND_REBASE",
            category="SECURITY_CONTROL",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="native_speed_must_not_outrun_legality",
            legal_hold_behavior="Hold does not bypass first-paint legality or mutation gate after cache-only restore.",
            erasure_behavior="Purge clears structured cache, resume metadata, scene-restoration payloads, NSUserActivity, preview caches, temp exports, and local search indices.",
            projection_allowed="NATIVE_ONLY_AFTER_FULL_MATCH",
            survivability_or_fidelity_formula="VERIFY_COMPATIBILITY_BEFORE_RENDER_OR_RESTORE and NO_MUTATION_OR_FILING_AFTER_CACHE_ONLY_RESTORE_OR_CONTEXT_DRIFT",
            canonical_store_or_boundary="native scene and cursor hydration boundary",
            encryption_or_protection_control="native_cache_hydration_contract and automation pack coverage",
            cache_scope=HYDRATION_SCOPE_ENUM,
            purge_trigger=HYDRATION_PURGE_TRIGGER_ENUM,
            replay_preservation_required=False,
            restore_reconciliation_required=False,
            release_gate_dependency=["NATIVE_DESKTOP_HARDENING_GATE", "CROSS_TENANT_CACHE_ISOLATION_GATE"],
            source_path=NATIVE_CACHE_PATH,
            source_heading_or_logical_block="Required rules",
            source_ref=heading_ref(NATIVE_CACHE_PATH, "Required rules", "NATIVE_CACHE_HYDRATION_PURGE_AND_REBASE"),
            notes=["Native speed may reuse compatible state, but may not outrun legality."],
            control_layer="native_restore_boundary",
        ),
        row(
            artifact_or_control_id="RESTORE_PRIVACY_RECONCILIATION",
            category="SECURITY_CONTROL",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="restore_reopen_privacy_gate",
            legal_hold_behavior="Blocked legal hold, proof preservation, and authority ambiguity states keep reopened access limited.",
            erasure_behavior="Resurrected data opens compensating re-erasure before normal access reopens.",
            projection_allowed="RUNTIME_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="Restore evidence is not lawful production evidence until privacy_reconciliation_state is reconciled.",
            canonical_store_or_boundary="restore privacy reconciliation boundary",
            encryption_or_protection_control="checkpoint refs, restore drill refs, audit continuity, replay/enquiry limitation safety",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=True,
            restore_reconciliation_required=True,
            release_gate_dependency=["SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=RECOVERY_GOVERNANCE_PATH,
            source_heading_or_logical_block="Restore privacy reconciliation law",
            source_ref=heading_ref(RECOVERY_GOVERNANCE_PATH, "Restore privacy reconciliation law", "RESTORE_PRIVACY_RECONCILIATION"),
            notes=["Restore reopening is blocked until privacy reconciliation proves lawful access posture."],
            control_layer="restore_boundary",
        ),
        row(
            artifact_or_control_id="LOG_REDACTION_AND_MASKED_EXPORT_POLICY",
            category="SECURITY_CONTROL",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="runtime_leakage_prevention",
            legal_hold_behavior="Audit may preserve reason and lineage minimums without exposing unnecessary raw values.",
            erasure_behavior="Diagnostic tooling may not reintroduce data hidden by privacy or masking policy.",
            projection_allowed="RUNTIME_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="logs redact secrets, raw tokens, government identifiers, and full regulated payload bodies.",
            canonical_store_or_boundary="observability and export boundary",
            encryption_or_protection_control="redaction, masked values, summary-first telemetry, export policy inheritance",
            cache_scope=["CLIENT_PORTAL_WORKSPACE", "NATIVE_OPERATOR_SECONDARY_WINDOW_SCENE"],
            purge_trigger=["MASKING_CHANGE", "ROUTE_OR_OBJECT_DRIFT"],
            replay_preservation_required=False,
            restore_reconciliation_required=True,
            release_gate_dependency=["SESSION_AND_ANTI_CSRF_GATE", "SECRET_ROTATION_ATTESTATION_GATE"],
            source_path=SECURITY_HARDENING_PATH,
            source_heading_or_logical_block="6. Data protection, privacy, and cache safety",
            source_ref=heading_ref(SECURITY_HARDENING_PATH, "6. Data protection, privacy, and cache safety", "LOG_REDACTION_AND_MASKED_EXPORT_POLICY"),
            notes=["Exports inherit masking/export policy and cannot bypass it through direct object-store URLs."],
            control_layer="privacy_and_observability_boundary",
        ),
        row(
            artifact_or_control_id="SSRF_ALLOWLIST_AND_LEAST_PRIVILEGE_EGRESS",
            category="SECURITY_CONTROL",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="connector_and_document_pipeline_egress_restriction",
            legal_hold_behavior="Not retention-stateful; applies to transport reachability and external fetch control.",
            erasure_behavior="Not an erasure workflow control; prevents unsafe ingress/egress paths.",
            projection_allowed="RUNTIME_ONLY",
            survivability_or_fidelity_formula="external fetchers use explicit allowlists and SSRF-resistant URL validation.",
            canonical_store_or_boundary="connector, OCR, authority gateway network boundary",
            encryption_or_protection_control="least-privilege network egress policy and authenticated service identity",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=False,
            restore_reconciliation_required=False,
            release_gate_dependency=["AUTHORITY_SANDBOX_BINDING_GATE"],
            source_path=SECURITY_HARDENING_PATH,
            source_heading_or_logical_block="5. Service-to-service and network hardening",
            source_ref=text_ref(SECURITY_HARDENING_PATH, "explicit allowlists and SSRF-resistant URL validation", "SSRF_ALLOWLIST_AND_LEAST_PRIVILEGE_EGRESS"),
            notes=["Zero trust applies between service boundaries as well as to external connectors."],
            control_layer="network_egress_boundary",
        ),
        row(
            artifact_or_control_id="SIGNED_BUILD_SBOM_AND_PROVENANCE",
            category="SECURITY_CONTROL",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="release_provenance_required_before_promotion",
            legal_hold_behavior="Release evidence remains durable and candidate-bound for later scrutiny.",
            erasure_behavior="Promotion evidence is replayable from durable artifacts, not dashboards or operator memory.",
            projection_allowed="OPERATOR_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="signed BuildArtifact outputs, SBOM, vulnerability scanning, provenance attestation, and candidate-bound release evidence",
            canonical_store_or_boundary="release verification and provenance boundary",
            encryption_or_protection_control="signature, digest, provenance, candidate_identity_hash, compatibility_gate_hash",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=NOT_APPLICABLE,
            replay_preservation_required=True,
            restore_reconciliation_required=True,
            release_gate_dependency=["BUILD_SIGNATURE_AND_PROVENANCE_GATE", "CRITICAL_VULNERABILITY_CLEARANCE_GATE", "SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            source_path=RELEASE_IDENTITY_PATH,
            source_heading_or_logical_block="2. Contract boundary",
            source_ref=heading_ref(RELEASE_IDENTITY_PATH, "2. Contract boundary", "SIGNED_BUILD_SBOM_AND_PROVENANCE"),
            notes=["Promotion evidence cannot be assembled from stale green runs or mixed candidate tuples."],
            control_layer="release_provenance_boundary",
        ),
        row(
            artifact_or_control_id="SECRET_VERSION_ROTATION_AND_ATTESTATION",
            category="SECURITY_CONTROL",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="auditable_secret_cutover",
            legal_hold_behavior="Rotation history remains serialized even after retirement or revocation.",
            erasure_behavior="No key or secret rotation is legal when attestation or version binding is unknown.",
            projection_allowed="OPERATOR_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="key and secret rotation shall fail closed if attestation or version binding is unknown.",
            canonical_store_or_boundary="secret metadata boundary",
            encryption_or_protection_control="SecretVersion schema, attestation refs, historical read window, cutover chronology",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=["SECRET_ROTATION", "TOKEN_ROTATION"],
            replay_preservation_required=False,
            restore_reconciliation_required=True,
            release_gate_dependency=["SECRET_ROTATION_ATTESTATION_GATE"],
            source_path=SECURITY_HARDENING_PATH,
            source_heading_or_logical_block="3. Secret, key, and token handling",
            source_ref=text_ref(SECURITY_HARDENING_PATH, "key and secret rotation SHALL be auditable", "SECRET_VERSION_ROTATION_AND_ATTESTATION"),
            notes=["Newly promoted environments require secret-rotation attestation."],
            control_layer="secret_rotation_boundary",
        ),
        row(
            artifact_or_control_id="NATIVE_SIGNATURE_NOTARIZATION_AND_HARDENED_RUNTIME",
            category="SECURITY_CONTROL",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="production_desktop_binary_hardening",
            legal_hold_behavior="Release evidence preserves desktop hardening posture whenever the macOS target ships.",
            erasure_behavior="Desktop-only evidence clears when the desktop target is absent, preventing overclaiming.",
            projection_allowed="OPERATOR_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="no production desktop client without signature, notarization, and hardened-runtime policy compliance",
            canonical_store_or_boundary="native release and build boundary",
            encryption_or_protection_control="signed and notarized macOS build with hardened runtime and least-privilege entitlements",
            cache_scope=["NATIVE_OPERATOR_WORKSPACE_SCENE", "NATIVE_OPERATOR_SECONDARY_WINDOW_SCENE"],
            purge_trigger=["NATIVE_BUILD_SUPERSEDED"],
            replay_preservation_required=True,
            restore_reconciliation_required=False,
            release_gate_dependency=["NATIVE_DESKTOP_HARDENING_GATE", "BUILD_SIGNATURE_AND_PROVENANCE_GATE"],
            source_path=SECURITY_HARDENING_PATH,
            source_heading_or_logical_block="4. Browser, native-client, API, and transport hardening",
            source_ref=text_ref(SECURITY_HARDENING_PATH, "signed and notarized macOS desktop builds with hardened runtime", "NATIVE_SIGNATURE_NOTARIZATION_AND_HARDENED_RUNTIME"),
            notes=["The desktop client is blocked from production without hardening evidence."],
            control_layer="native_release_boundary",
        ),
    ]
    assert_required_row_fields(rows)
    return sorted(rows, key=lambda item: item["artifact_or_control_id"])


def threat_control_rows() -> list[dict[str, Any]]:
    mappings = [
        (
            "CROSS_TENANT_OR_CROSS_CLIENT_DATA_EXPOSURE",
            ["CACHE_ISOLATION_CONTRACT_ENFORCEMENT", "PER_TENANT_ENVELOPE_ENCRYPTION", "SESSION_BOUND_COMMAND_VALIDATION"],
            ["CROSS_TENANT_CACHE_ISOLATION_GATE"],
            CACHE_ISOLATION_PATH,
            "Eliminated Leakage Classes",
        ),
        (
            "STALE_OR_REPLAYED_USER_COMMANDS",
            ["SESSION_BOUND_COMMAND_VALIDATION", "STEP_UP_AND_SESSION_ROTATION", "RETENTION_ERROR_AND_GATE_COUPLING"],
            ["STALE_VIEW_AND_IDEMPOTENCY_GATE", "SESSION_AND_ANTI_CSRF_GATE"],
            NORTHBOUND_API_PATH,
            "1. Core principles",
        ),
        (
            "AUTHORITY_TOKEN_MISUSE_OR_WRONG_CLIENT_TOKEN_BINDING",
            ["TOKEN_VAULT_AND_BINDING_LINEAGE_REVALIDATION", "AUTHORITY_INGRESS_QUARANTINE_AND_DEDUPE"],
            ["AUTHORITY_SANDBOX_BINDING_GATE", "SECRET_ROTATION_ATTESTATION_GATE"],
            SECURITY_HARDENING_PATH,
            "3. Secret, key, and token handling",
        ),
        (
            "QUEUE_CALLBACK_OR_WORKER_RESULT_INJECTION",
            ["AUTHORITY_INGRESS_QUARANTINE_AND_DEDUPE", "SIGNED_BUILD_SBOM_AND_PROVENANCE"],
            ["AUTHORITY_SANDBOX_BINDING_GATE"],
            SECURITY_HARDENING_PATH,
            "5. Service-to-service and network hardening",
        ),
        (
            "UNSAFE_LOG_EXPORT_CACHE_OR_ANALYTICS_LEAKAGE",
            ["LOG_REDACTION_AND_MASKED_EXPORT_POLICY", "CACHE_ISOLATION_CONTRACT_ENFORCEMENT"],
            ["CROSS_TENANT_CACHE_ISOLATION_GATE"],
            SECURITY_HARDENING_PATH,
            "6. Data protection, privacy, and cache safety",
        ),
        (
            "BROWSER_ORIGIN_ATTACKS",
            ["ANTI_CSRF_AND_SECURE_COOKIE_POSTURE", "SESSION_BOUND_COMMAND_VALIDATION"],
            ["SESSION_AND_ANTI_CSRF_GATE"],
            SECURITY_HARDENING_PATH,
            "4. Browser, native-client, API, and transport hardening",
        ),
        (
            "SSRF_OR_UNCONTROLLED_CONNECTOR_EGRESS",
            ["SSRF_ALLOWLIST_AND_LEAST_PRIVILEGE_EGRESS", "AUTHORITY_INGRESS_QUARANTINE_AND_DEDUPE"],
            ["AUTHORITY_SANDBOX_BINDING_GATE"],
            SECURITY_HARDENING_PATH,
            "5. Service-to-service and network hardening",
        ),
        (
            "COMPROMISED_BUILD_DEPENDENCY_OR_RELEASE_ARTIFACT",
            ["SIGNED_BUILD_SBOM_AND_PROVENANCE", "NATIVE_SIGNATURE_NOTARIZATION_AND_HARDENED_RUNTIME"],
            ["BUILD_SIGNATURE_AND_PROVENANCE_GATE", "CRITICAL_VULNERABILITY_CLEARANCE_GATE", "NATIVE_DESKTOP_HARDENING_GATE"],
            SECURITY_HARDENING_PATH,
            "7. Supply-chain and build integrity",
        ),
        (
            "RESTORE_TIME_RESURRECTION_OF_ERASED_OR_MASKED_DATA",
            ["RESTORE_PRIVACY_RECONCILIATION", "RETENTION_LIMITED_EXPLAINABILITY"],
            ["SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
            RECOVERY_GOVERNANCE_PATH,
            "Restore privacy reconciliation law",
        ),
        (
            "PRIVILEGED_OPERATOR_OVERREACH_WITHOUT_STEP_UP_APPROVAL_OR_AUDIT",
            ["STEP_UP_AND_SESSION_ROTATION", "SESSION_BOUND_COMMAND_VALIDATION", "RETENTION_ERROR_AND_GATE_COUPLING"],
            ["SESSION_AND_ANTI_CSRF_GATE", "STALE_VIEW_AND_IDEMPOTENCY_GATE"],
            SECURITY_HARDENING_PATH,
            "2. Identity, session, and command trust",
        ),
        (
            "DESKTOP_CLIENT_COMPROMISE_OR_UNSAFE_LOCAL_CACHE_EXPOSURE",
            ["NATIVE_SIGNATURE_NOTARIZATION_AND_HARDENED_RUNTIME", "NATIVE_CACHE_HYDRATION_PURGE_AND_REBASE", "CACHE_ISOLATION_CONTRACT_ENFORCEMENT"],
            ["NATIVE_DESKTOP_HARDENING_GATE", "CROSS_TENANT_CACHE_ISOLATION_GATE"],
            SECURITY_HARDENING_PATH,
            "4. Browser, native-client, API, and transport hardening",
        ),
    ]
    rows: list[dict[str, Any]] = []
    for threat_id, control_ids, gate_ids, source_path, heading_text in mappings:
        rows.append(
            row(
                artifact_or_control_id=f"THREAT::{threat_id}",
                category="THREAT_CLASS",
                contains_personal_or_sensitive_data=False,
                retention_tag="policy_governed_other",
                retention_basis="runtime_threat_model",
                legal_hold_behavior="Threat categories remain descriptive; legal hold behavior is enforced through mapped controls where relevant.",
                erasure_behavior="Threat treatment is operational rather than an erasure workflow, but mapped controls prevent silent data loss or unsafe retention.",
                projection_allowed="RUNTIME_AND_AUDIT_ONLY",
                survivability_or_fidelity_formula="not_formula_based__threat_class_mapped_to_concrete_controls_and_release_gates",
                canonical_store_or_boundary="runtime hardening threat taxonomy",
                encryption_or_protection_control="mapped controls: " + ", ".join(control_ids),
                cache_scope=NOT_APPLICABLE,
                purge_trigger=NOT_APPLICABLE,
                replay_preservation_required=False,
                restore_reconciliation_required=threat_id == "RESTORE_TIME_RESURRECTION_OF_ERASED_OR_MASKED_DATA",
                release_gate_dependency=gate_ids,
                source_path=source_path,
                source_heading_or_logical_block=heading_text,
                source_ref=heading_ref(source_path, heading_text, threat_id),
                notes=[f"Mapped controls: {', '.join(control_ids)}"],
                threat_class=threat_id,
                mapped_control_ids=control_ids,
            )
        )
    assert_required_row_fields(rows)
    return rows


def cache_rows() -> list[dict[str, Any]]:
    source_map = {
        "LOW_NOISE_FRAME": (NORTHBOUND_API_PATH, "2. Required northbound surfaces"),
        "WORKSPACE_SNAPSHOT": (COLLABORATION_PATH, "FE-25 Cache Isolation"),
        "WORK_INBOX_SNAPSHOT": (COLLABORATION_PATH, "FE-25 Cache Isolation"),
        "CLIENT_PORTAL_WORKSPACE": (PORTAL_EXPERIENCE_PATH, "FE-25 Cache Isolation"),
        "CUSTOMER_REQUEST_LIST": (PORTAL_EXPERIENCE_PATH, "FE-25 Cache Isolation"),
        "TENANT_GOVERNANCE_SNAPSHOT": (NORTHBOUND_API_PATH, "2.1 Admin/Governance Console read and simulation surfaces"),
        "GOVERNANCE_POLICY_SNAPSHOT": (NORTHBOUND_API_PATH, "2.1 Admin/Governance Console read and simulation surfaces"),
        "PRINCIPAL_ACCESS_VIEW": (NORTHBOUND_API_PATH, "2.1 Admin/Governance Console read and simulation surfaces"),
        "ROLE_TEMPLATE_MATRIX": (NORTHBOUND_API_PATH, "2.1 Admin/Governance Console read and simulation surfaces"),
        "NATIVE_OPERATOR_WORKSPACE_SCENE": (MACOS_BLUEPRINT_PATH, "FE-25 Cache Isolation"),
        "NATIVE_OPERATOR_SECONDARY_WINDOW_SCENE": (MACOS_BLUEPRINT_PATH, "FE-25 Cache Isolation"),
        "EXPERIENCE_CURSOR": (MACOS_BLUEPRINT_PATH, "FE-75 Native Cache Hydration, Purge, and Rebase"),
        "WORKSPACE_CURSOR": (MACOS_BLUEPRINT_PATH, "FE-75 Native Cache Hydration, Purge, and Rebase"),
        "NATIVE_PRIMARY_SCENE": (NATIVE_CACHE_PATH, "Coverage requirements"),
        "NATIVE_SECONDARY_WINDOW": (NATIVE_CACHE_PATH, "Coverage requirements"),
    }
    rows: list[dict[str, Any]] = []
    for scope in CACHE_SCOPE_ENUM:
        source_path, heading_text = source_map[scope]
        rows.append(
            row(
                artifact_or_control_id=f"CACHE::{scope}",
                category="CACHE_SCOPE",
                contains_personal_or_sensitive_data=True,
                retention_tag="analytics_projection",
                retention_basis="exact_security_context_cache_reuse",
                legal_hold_behavior="Hold does not widen reuse; the cache identity must still match the mounted security context.",
                erasure_behavior="Broader or incompatible variants purge immediately on access or masking narrowing.",
                projection_allowed="SCOPE_BOUND_ONLY",
                survivability_or_fidelity_formula="EXACT_SECURITY_CONTEXT_ONLY and REJECT_ON_CONTEXT_ROUTE_VERSION_OR_PREVIEW_MISMATCH",
                canonical_store_or_boundary=f"cache_isolation_contract::{scope}",
                encryption_or_protection_control="cache_isolation_contract, delivery_binding_hash, route/object binding",
                cache_scope=[scope],
                purge_trigger=["TENANT_SWITCH", "PRINCIPAL_CLASS_CHANGE", "SESSION_BINDING_CHANGE", "ACCESS_BINDING_CHANGE", "MASKING_CHANGE", "ROUTE_OR_OBJECT_DRIFT", "SCHEMA_INCOMPATIBLE"],
                replay_preservation_required=False,
                restore_reconciliation_required=False,
                release_gate_dependency=["CROSS_TENANT_CACHE_ISOLATION_GATE"],
                source_path=source_path,
                source_heading_or_logical_block=heading_text,
                source_ref=heading_ref(source_path, heading_text, scope),
                notes=[
                    "Shared caches require exact context match only.",
                    "Preview and export reuse is current-route and selected-subject bound.",
                ],
                scope_family="CACHE_ISOLATION_SCOPE",
            )
        )
    for scope in HYDRATION_SCOPE_ENUM:
        source_path, heading_text = source_map[scope]
        rows.append(
            row(
                artifact_or_control_id=f"CACHE::{scope}",
                category="CACHE_SCOPE",
                contains_personal_or_sensitive_data=True,
                retention_tag="analytics_projection",
                retention_basis="native_hydration_legality_envelope",
                legal_hold_behavior="Hold does not waive first-paint compatibility or mutation blocking after cache-only restore.",
                erasure_behavior="Revoked, rebased, or incompatible lineage clears resume binding and purges regulated local derivatives.",
                projection_allowed="NATIVE_ONLY_AFTER_FULL_MATCH",
                survivability_or_fidelity_formula="VERIFY_COMPATIBILITY_BEFORE_RENDER_OR_RESTORE and NO_MUTATION_OR_FILING_AFTER_CACHE_ONLY_RESTORE_OR_CONTEXT_DRIFT",
                canonical_store_or_boundary=f"native_cache_hydration_contract::{scope}",
                encryption_or_protection_control="schema compatibility ref, projection guard ref, resume binding ref, restoration anchor",
                cache_scope=[scope],
                purge_trigger=HYDRATION_PURGE_TRIGGER_ENUM,
                replay_preservation_required=False,
                restore_reconciliation_required=False,
                release_gate_dependency=["CROSS_TENANT_CACHE_ISOLATION_GATE", "NATIVE_DESKTOP_HARDENING_GATE"],
                source_path=source_path,
                source_heading_or_logical_block=heading_text,
                source_ref=heading_ref(source_path, heading_text, scope),
                notes=[
                    "Native scenes reopen the same object in the same shell only when the full legality envelope still matches.",
                    "Resume tokens and cached deltas never cross invalidated cursor lineage.",
                ],
                scope_family="NATIVE_HYDRATION_SCOPE",
            )
        )
    assert_required_row_fields(rows)
    return sorted(rows, key=lambda item: item["artifact_or_control_id"])


def session_storage_rows() -> list[dict[str, Any]]:
    rows = [
        row(
            artifact_or_control_id="SESSION_STORAGE::BROWSER_SESSION_COOKIE",
            category="SESSION_SECRET_STORAGE",
            contains_personal_or_sensitive_data=True,
            retention_tag="policy_governed_other",
            retention_basis="browser_product_session",
            legal_hold_behavior="Session revocation audit survives, but the live browser session remains short-lived and revocable.",
            erasure_behavior="Logout or compromise response revokes the session and invalidates replay of stale commands.",
            projection_allowed="RUNTIME_ONLY",
            survivability_or_fidelity_formula="authenticated browser-origin write action requires live session and anti-CSRF protection.",
            canonical_store_or_boundary="http_only_secure_cookie__browser_session_boundary",
            encryption_or_protection_control="secure cookie flags, server-side session validation, anti-CSRF",
            cache_scope=["LOW_NOISE_FRAME", "CLIENT_PORTAL_WORKSPACE"],
            purge_trigger=["SESSION_REVOKED", "STEP_UP_COMPLETED", "PRIVILEGE_DOWNGRADE"],
            replay_preservation_required=False,
            restore_reconciliation_required=False,
            release_gate_dependency=["SESSION_AND_ANTI_CSRF_GATE"],
            source_path=SECURITY_HARDENING_PATH,
            source_heading_or_logical_block="2. Identity, session, and command trust",
            source_ref=text_ref(SECURITY_HARDENING_PATH, "anti-CSRF protection for cookie-based browser sessions", "BROWSER_SESSION_COOKIE"),
            notes=["Forbidden boundaries: localStorage, queue payloads, caches, logs, native local cache."],
            credential_type="BROWSER_SESSION_COOKIE",
            allowed_storage_boundary="http_only_secure_cookie__browser_session_boundary",
            forbidden_boundaries=["localStorage", "sessionStorage", "queue_payload", "cache_artifact", "general_log", "native_local_cache"],
        ),
        row(
            artifact_or_control_id="SESSION_STORAGE::BROWSER_CSRF_REF",
            category="SESSION_SECRET_STORAGE",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="browser_csrf_binding",
            legal_hold_behavior="Audit may preserve csrf_ref lineage on the session object; it is not a long-term retained secret.",
            erasure_behavior="Invalidated with the browser session and never reused across revoked session state.",
            projection_allowed="RUNTIME_ONLY",
            survivability_or_fidelity_formula="cookie-based browser sessions require anti-CSRF posture.",
            canonical_store_or_boundary="server_session_plus_csrf_binding_boundary",
            encryption_or_protection_control="csrf_ref on ActorSession plus secure browser cookie posture",
            cache_scope=["LOW_NOISE_FRAME", "CLIENT_PORTAL_WORKSPACE"],
            purge_trigger=["SESSION_REVOKED", "STEP_UP_COMPLETED"],
            replay_preservation_required=False,
            restore_reconciliation_required=False,
            release_gate_dependency=["SESSION_AND_ANTI_CSRF_GATE"],
            source_path=ACTOR_SESSION_SCHEMA_PATH,
            source_heading_or_logical_block="properties.csrf_ref",
            source_ref=text_ref(ACTOR_SESSION_SCHEMA_PATH, "\"csrf_ref\"", "BROWSER_CSRF_REF"),
            notes=["Forbidden boundaries: localStorage, general logs, queue payloads, export artifacts."],
            credential_type="BROWSER_CSRF_REF",
            allowed_storage_boundary="server_session_plus_csrf_binding_boundary",
            forbidden_boundaries=["localStorage", "sessionStorage", "queue_payload", "general_log", "export_artifact"],
        ),
        row(
            artifact_or_control_id="SESSION_STORAGE::NATIVE_PRODUCT_SESSION_MATERIAL",
            category="SESSION_SECRET_STORAGE",
            contains_personal_or_sensitive_data=True,
            retention_tag="policy_governed_other",
            retention_basis="native_product_session_material",
            legal_hold_behavior="Session lineage remains auditable, but live native session material remains device-local and revocable.",
            erasure_behavior="Tenant/account switch, revocation, or binding invalidation purges incompatible local caches and blocks command acceptance until re-authentication.",
            projection_allowed="RUNTIME_ONLY",
            survivability_or_fidelity_formula="Keychain-backed storage for native product-session material plus revocation-aware local cache purge.",
            canonical_store_or_boundary="os_keychain__native_session_boundary",
            encryption_or_protection_control="Keychain-backed storage and ASWebAuthenticationSession/system-browser sign-in",
            cache_scope=["NATIVE_OPERATOR_WORKSPACE_SCENE", "NATIVE_OPERATOR_SECONDARY_WINDOW_SCENE"],
            purge_trigger=["TENANT_SWITCH", "SESSION_REVOKED", "STEP_UP_COMPLETED", "PRIVILEGE_DOWNGRADE", "SCHEMA_INCOMPATIBLE"],
            replay_preservation_required=False,
            restore_reconciliation_required=False,
            release_gate_dependency=["NATIVE_DESKTOP_HARDENING_GATE", "SESSION_AND_ANTI_CSRF_GATE"],
            source_path=MACOS_BLUEPRINT_PATH,
            source_heading_or_logical_block="7. Authentication and session strategy",
            source_ref=text_ref(MACOS_BLUEPRINT_PATH, "Keychain-backed storage for product session material", "NATIVE_PRODUCT_SESSION_MATERIAL"),
            notes=["Forbidden boundaries: browser localStorage, structured cache rows, temp exports, preview caches, logs."],
            credential_type="NATIVE_PRODUCT_SESSION_MATERIAL",
            allowed_storage_boundary="os_keychain__native_session_boundary",
            forbidden_boundaries=["structured_cache", "preview_cache", "temp_export_file", "general_log", "browser_localStorage"],
        ),
        row(
            artifact_or_control_id="SESSION_STORAGE::AUTHORITY_ACCESS_REFRESH_TOKEN",
            category="SESSION_SECRET_STORAGE",
            contains_personal_or_sensitive_data=True,
            retention_tag="policy_governed_other",
            retention_basis="minimum_authority_token_material_for_lawful_operation",
            legal_hold_behavior="Token lineage and version binding remain auditable without exposing raw token material.",
            erasure_behavior="Raw tokens never persist in queues, read models, or analysis artifacts outside the vault boundary.",
            projection_allowed="RUNTIME_ONLY",
            survivability_or_fidelity_formula="raw authority access/refresh tokens SHALL live only in a governed token vault or secret store.",
            canonical_store_or_boundary="token_vault_or_secret_store_only",
            encryption_or_protection_control="vault isolation, token_binding_ref, binding_lineage_ref, pre-send revalidation",
            cache_scope=["PRINCIPAL_ACCESS_VIEW"],
            purge_trigger=["AUTHORITY_REBINDING", "TOKEN_ROTATION", "SESSION_REVOKED"],
            replay_preservation_required=False,
            restore_reconciliation_required=True,
            release_gate_dependency=["AUTHORITY_SANDBOX_BINDING_GATE", "SECRET_ROTATION_ATTESTATION_GATE"],
            source_path=SECURITY_HARDENING_PATH,
            source_heading_or_logical_block="3. Secret, key, and token handling",
            source_ref=text_ref(SECURITY_HARDENING_PATH, "raw authority access/refresh tokens SHALL live only", "AUTHORITY_ACCESS_REFRESH_TOKEN"),
            notes=["Forbidden boundaries: browser state, native cache, queue payloads, read models, logs, analysis outputs."],
            credential_type="AUTHORITY_ACCESS_REFRESH_TOKEN",
            allowed_storage_boundary="token_vault_or_secret_store_only",
            forbidden_boundaries=["browser_state", "native_cache", "queue_payload", "read_model", "general_log", "analysis_artifact"],
        ),
        row(
            artifact_or_control_id="SESSION_STORAGE::SERVICE_IDENTITY_MACHINE_CREDENTIAL",
            category="SESSION_SECRET_STORAGE",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="authenticated_service_identity",
            legal_hold_behavior="Service identity and attestation lineage remain auditable for platform review.",
            erasure_behavior="Rotation and revocation are versioned; uncontrolled copies in app storage are forbidden.",
            projection_allowed="RUNTIME_ONLY",
            survivability_or_fidelity_formula="east-west traffic uses authenticated service identity and mutual TLS where the platform permits.",
            canonical_store_or_boundary="service_identity_secret_store",
            encryption_or_protection_control="mTLS-capable service identity, least-privilege egress, secret rotation attestation",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=["SECRET_ROTATION", "REVOCATION_REASON_CHANGED"],
            replay_preservation_required=False,
            restore_reconciliation_required=True,
            release_gate_dependency=["SECRET_ROTATION_ATTESTATION_GATE", "BUILD_SIGNATURE_AND_PROVENANCE_GATE"],
            source_path=SECURITY_HARDENING_PATH,
            source_heading_or_logical_block="5. Service-to-service and network hardening",
            source_ref=text_ref(SECURITY_HARDENING_PATH, "east-west traffic SHALL use authenticated service identity", "SERVICE_IDENTITY_MACHINE_CREDENTIAL"),
            notes=["Forbidden boundaries: general app storage, caches, queue payloads, logs."],
            credential_type="SERVICE_IDENTITY_MACHINE_CREDENTIAL",
            allowed_storage_boundary="service_identity_secret_store",
            forbidden_boundaries=["general_app_storage", "cache_artifact", "queue_payload", "general_log"],
        ),
        row(
            artifact_or_control_id="SESSION_STORAGE::SECRET_VERSION_KEY_MATERIAL",
            category="SESSION_SECRET_STORAGE",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="versioned_key_material_with_attestation",
            legal_hold_behavior="Historical read windows and revocation chronology remain queryable on SecretVersion.",
            erasure_behavior="Rotation cannot leave version binding ambiguous; historical metadata survives, raw uncontrolled copies do not.",
            projection_allowed="RUNTIME_AND_AUDIT_ONLY",
            survivability_or_fidelity_formula="SecretVersion shall be versioned, attestable, and rotatable without ambiguous cutover.",
            canonical_store_or_boundary="kms_hsm_rooted_secret_store",
            encryption_or_protection_control="SecretVersion schema, KMS/HSM root, attestation refs, historical read window",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=["SECRET_ROTATION", "TOKEN_ROTATION", "REVOCATION_REASON_CHANGED"],
            replay_preservation_required=False,
            restore_reconciliation_required=True,
            release_gate_dependency=["SECRET_ROTATION_ATTESTATION_GATE"],
            source_path=SECRET_VERSION_SCHEMA_PATH,
            source_heading_or_logical_block="title=SecretVersion",
            source_ref=text_ref(SECRET_VERSION_SCHEMA_PATH, "\"title\": \"SecretVersion\"", "SECRET_VERSION_KEY_MATERIAL"),
            notes=["Forbidden boundaries: browser state, native local cache, queue payloads, general logs."],
            credential_type="SECRET_VERSION_KEY_MATERIAL",
            allowed_storage_boundary="kms_hsm_rooted_secret_store",
            forbidden_boundaries=["browser_state", "native_local_cache", "queue_payload", "general_log"],
        ),
        row(
            artifact_or_control_id="SESSION_STORAGE::RESUME_TOKEN",
            category="SESSION_SECRET_STORAGE",
            contains_personal_or_sensitive_data=False,
            retention_tag="policy_governed_other",
            retention_basis="governed_cursor_material",
            legal_hold_behavior="Resume lineage is preserved as governed cursor material for reconstruction and audit.",
            erasure_behavior="Revoked or incompatible cursor lineage clears the binding and blocks reuse.",
            projection_allowed="RUNTIME_ONLY",
            survivability_or_fidelity_formula="resume_token is transport material only; stream_recovery_contract is authoritative for route, subject, session, access, masking, epoch, and frontier.",
            canonical_store_or_boundary="governed_snapshot_or_cursor_metadata_boundary",
            encryption_or_protection_control="stream_recovery_contract and native_cache_hydration_contract binding",
            cache_scope=["LOW_NOISE_FRAME", "WORKSPACE_SNAPSHOT", "EXPERIENCE_CURSOR", "WORKSPACE_CURSOR"],
            purge_trigger=["SESSION_REVOKED", "ACCESS_BINDING_CHANGE", "MASKING_CHANGE", "SCHEMA_INCOMPATIBLE", "TENANT_SWITCH", "STEP_UP_COMPLETED"],
            replay_preservation_required=False,
            restore_reconciliation_required=False,
            release_gate_dependency=["STALE_VIEW_AND_IDEMPOTENCY_GATE", "CROSS_TENANT_CACHE_ISOLATION_GATE"],
            source_path=MACOS_BLUEPRINT_PATH,
            source_heading_or_logical_block="6. Data flow and synchronization model",
            source_ref=text_ref(MACOS_BLUEPRINT_PATH, "Resume tokens SHALL be treated as governed cursor material", "RESUME_TOKEN"),
            notes=["Forbidden boundaries: general logs, download URLs, detached preview links, unbound local notes."],
            credential_type="RESUME_TOKEN",
            allowed_storage_boundary="governed_snapshot_or_cursor_metadata_boundary",
            forbidden_boundaries=["general_log", "download_url", "detached_preview_link", "unbound_local_note"],
        ),
        row(
            artifact_or_control_id="SESSION_STORAGE::AUTHORITY_LOGIN_CREDENTIALS",
            category="SESSION_SECRET_STORAGE",
            contains_personal_or_sensitive_data=True,
            retention_tag="policy_governed_other",
            retention_basis="non_persisted_authority_login_secret",
            legal_hold_behavior="No persisted authority login credential should exist to place on hold.",
            erasure_behavior="Authority login credentials are not stored; only minimum encrypted token/binding material may persist.",
            projection_allowed="RUNTIME_ONLY",
            survivability_or_fidelity_formula="authority login credentials SHALL NOT be stored",
            canonical_store_or_boundary="not_persisted__system_browser_or_provider_surface_only",
            encryption_or_protection_control="system-browser/provider-managed login surface and vault-only post-login token material",
            cache_scope=NOT_APPLICABLE,
            purge_trigger=["AUTHORITY_REBINDING", "SESSION_REVOKED"],
            replay_preservation_required=False,
            restore_reconciliation_required=False,
            release_gate_dependency=["AUTHORITY_SANDBOX_BINDING_GATE"],
            source_path=RETENTION_PRIVACY_PATH,
            source_heading_or_logical_block="Privacy and minimization defaults",
            source_ref=text_ref(RETENTION_PRIVACY_PATH, "authority login credentials SHALL NOT be stored", "AUTHORITY_LOGIN_CREDENTIALS"),
            notes=["Forbidden boundaries: browser storage, native storage, vault, queue payloads, logs, analysis outputs."],
            credential_type="AUTHORITY_LOGIN_CREDENTIALS",
            allowed_storage_boundary="not_persisted__system_browser_or_provider_surface_only",
            forbidden_boundaries=["browser_storage", "native_storage", "vault", "queue_payload", "general_log", "analysis_artifact"],
        ),
    ]
    assert_required_row_fields(rows)
    return rows


def restore_rows() -> list[dict[str, Any]]:
    state_data = {
        "PENDING_RECONCILIATION": ("UNKNOWN_UNTIL_RECONCILED", "NOT_REQUIRED", "BLOCKED"),
        "RECONCILED_NO_COMPENSATION_REQUIRED": ("NONE_DETECTED", "NOT_REQUIRED", "READY_FOR_REOPEN"),
        "COMPENSATING_RE_ERASURE_REQUIRED": ("ERASURE_OR_PSEUDONYMISATION_RESURRECTED", "REQUIRED_PENDING", "BLOCKED"),
        "COMPENSATING_RE_ERASURE_IN_PROGRESS": ("ERASURE_OR_PSEUDONYMISATION_RESURRECTED", "IN_PROGRESS", "LIMITED"),
        "RECONCILED_WITH_COMPENSATING_RE_ERASURE": ("ERASURE_OR_PSEUDONYMISATION_RESURRECTED", "COMPLETED", "READY_FOR_REOPEN"),
        "BLOCKED_LEGAL_HOLD": ("ERASURE_OR_PSEUDONYMISATION_RESURRECTED", "BLOCKED", "LIMITED"),
        "BLOCKED_PROOF_PRESERVATION": ("ERASURE_OR_PSEUDONYMISATION_RESURRECTED", "BLOCKED", "LIMITED"),
        "BLOCKED_AUTHORITY_AMBIGUITY": ("ERASURE_OR_PSEUDONYMISATION_RESURRECTED", "BLOCKED", "LIMITED"),
    }
    rows: list[dict[str, Any]] = []
    for state in RESTORE_PRIVACY_STATE_ENUM:
        resurrected_posture, re_erasure_state, reopen_state = state_data[state]
        rows.append(
            row(
                artifact_or_control_id=f"RESTORE::{state}",
                category="RESTORE_PRIVACY_STATE",
                contains_personal_or_sensitive_data=False,
                retention_tag="policy_governed_other",
                retention_basis="post_restore_privacy_reconciliation",
                legal_hold_behavior="Blocked states remain explicit legal posture rather than operator notes.",
                erasure_behavior="Reopened access remains blocked or limited until compensating re-erasure and blocker resolution complete where required.",
                projection_allowed="RUNTIME_AND_AUDIT_ONLY",
                survivability_or_fidelity_formula="reopen_access_state derives from privacy_reconciliation_state plus audit continuity and compensating re-erasure posture.",
                canonical_store_or_boundary="RestorePrivacyReconciliationContract",
                encryption_or_protection_control="checkpoint_ref, restore_drill_ref, privacy reconciliation outcome, audit chain continuity, replay/enquiry limitation state",
                cache_scope=NOT_APPLICABLE,
                purge_trigger=NOT_APPLICABLE,
                replay_preservation_required=True,
                restore_reconciliation_required=True,
                release_gate_dependency=["SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"],
                source_path=RECOVERY_GOVERNANCE_PATH,
                source_heading_or_logical_block="Restore privacy reconciliation law",
                source_ref=heading_ref(RECOVERY_GOVERNANCE_PATH, "Restore privacy reconciliation law", state),
                notes=["Restore evidence is not lawful production evidence until the contract reaches a reconciled state."],
                privacy_reconciliation_state=state,
                resurrected_data_posture=resurrected_posture,
                compensating_re_erasure_state=re_erasure_state,
                reopen_access_state=reopen_state,
            )
        )
    assert_required_row_fields(rows)
    return rows


def release_gate_rows() -> list[dict[str, Any]]:
    gate_specs = [
        (
            "BUILD_SIGNATURE_AND_PROVENANCE_GATE",
            "signed build or provenance unknown blocks promotion",
            RELEASE_IDENTITY_PATH,
            "3. Admissibility boundary",
            "signed BuildArtifact outputs, candidate_identity_hash, and compatibility-gate binding",
        ),
        (
            "CRITICAL_VULNERABILITY_CLEARANCE_GATE",
            "unresolved critical vulnerability in an internet-exposed component or token-handling path",
            SECURITY_HARDENING_PATH,
            "8. Operational security release gates",
            "dependency, image, and container vulnerability scanning with blocking posture",
        ),
        (
            "SESSION_AND_ANTI_CSRF_GATE",
            "failing anti-CSRF or session tests blocks promotion",
            SECURITY_HARDENING_PATH,
            "8. Operational security release gates",
            "browser and native session posture, anti-CSRF, revocation, and challenge rotation coverage",
        ),
        (
            "STALE_VIEW_AND_IDEMPOTENCY_GATE",
            "failing stale-view or duplicate-submit tests blocks promotion",
            SECURITY_HARDENING_PATH,
            "4. Browser, native-client, API, and transport hardening",
            "stale-view guards, idempotency replay windows, and duplicate suppression proof",
        ),
        (
            "NATIVE_DESKTOP_HARDENING_GATE",
            "failing signed/notarized desktop-build verification or hardened-runtime policy blocks promotion",
            SECURITY_HARDENING_PATH,
            "8. Operational security release gates",
            "signed and notarized macOS build, hardened runtime, and entitlement policy evidence",
        ),
        (
            "CROSS_TENANT_CACHE_ISOLATION_GATE",
            "failing cross-tenant cache isolation tests blocks promotion",
            SECURITY_HARDENING_PATH,
            "8. Operational security release gates",
            "browser, portal, governance, and native cache isolation proof with drift purge coverage",
        ),
        (
            "SECRET_ROTATION_ATTESTATION_GATE",
            "missing secret-rotation attestation for newly promoted environments blocks promotion",
            SECURITY_HARDENING_PATH,
            "8. Operational security release gates",
            "SecretVersion attestation, cutover chronology, and version-binding verification",
        ),
        (
            "AUTHORITY_SANDBOX_BINDING_GATE",
            "failing sandbox authority binding tests for the active provider profile blocks promotion",
            SECURITY_HARDENING_PATH,
            "8. Operational security release gates",
            "provider-profile exact coverage, fraud-header binding proof, token-rotation fail-closed proof, ambiguous-ingress quarantine proof",
        ),
        (
            "SCHEMA_COMPATIBILITY_AND_RESTORE_GATE",
            "restore-drill, reader-window, supported-client window, and privacy reconciliation evidence must remain candidate-bound and green",
            RELEASE_IDENTITY_PATH,
            "2. Contract boundary",
            "schema_bundle_compatibility_gate_contract, restore drill evidence, and post-restore privacy reconciliation",
        ),
    ]
    rows: list[dict[str, Any]] = []
    for gate_id, blocker, source_path, heading_text, evidence in gate_specs:
        rows.append(
            row(
                artifact_or_control_id=f"RELEASE_GATE::{gate_id}",
                category="SECURITY_RELEASE_GATE",
                contains_personal_or_sensitive_data=False,
                retention_tag="policy_governed_other",
                retention_basis="production_admission_control",
                legal_hold_behavior="Release evidence remains queryable and candidate-bound for later audit or incident review.",
                erasure_behavior="Promotion evidence is durable and cannot be reconstructed from dashboards or operator memory.",
                projection_allowed="OPERATOR_AND_AUDIT_ONLY",
                survivability_or_fidelity_formula="not_formula_based__blocking_gate_requires_exact_candidate_binding_and_admissible_evidence",
                canonical_store_or_boundary="release verification manifest and blocking gate boundary",
                encryption_or_protection_control=evidence,
                cache_scope=NOT_APPLICABLE,
                purge_trigger=NOT_APPLICABLE,
                replay_preservation_required=True,
                restore_reconciliation_required=(gate_id == "SCHEMA_COMPATIBILITY_AND_RESTORE_GATE"),
                release_gate_dependency=[gate_id],
                source_path=source_path,
                source_heading_or_logical_block=heading_text,
                source_ref=heading_ref(source_path, heading_text, gate_id),
                notes=[blocker],
                gate_id=gate_id,
                blocking_condition=blocker,
                required_evidence=evidence,
            )
        )
    assert_required_row_fields(rows)
    return rows


def explicit_gaps() -> list[dict[str, Any]]:
    return [
        {
            "gap_id": "artifact_specific_retention_windows_not_canonicalized",
            "severity": "medium",
            "description": "The corpus defines retention classes, expiry basis, and erasure blockers, but does not publish one canonical per-artifact duration matrix.",
            "source_ref": heading_ref(RETENTION_PRIVACY_PATH, "Retention and privacy"),
        },
        {
            "gap_id": "threat_class_enum_is_prose_only",
            "severity": "medium",
            "description": "Threat classes are normatively defined in prose in the runtime hardening contract, but no dedicated schema-backed enum exists in the current corpus.",
            "source_ref": heading_ref(SECURITY_HARDENING_PATH, "1. Threat classes"),
        },
        {
            "gap_id": "authority_login_credentials_have_no_schema_because_persistence_is_forbidden",
            "severity": "low",
            "description": "The corpus forbids stored authority login credentials by design, so there is no dedicated persisted schema artifact for that credential class.",
            "source_ref": text_ref(RETENTION_PRIVACY_PATH, "authority login credentials SHALL NOT be stored", "authority_login_credentials_forbidden"),
        },
        {
            "gap_id": "restore_reopen_surface_specific_matrix_not_expanded_in_source",
            "severity": "medium",
            "description": "Restore privacy reconciliation states are defined, but the corpus does not separately publish a per-surface reopen matrix for each operator and customer route family.",
            "source_ref": heading_ref(RECOVERY_GOVERNANCE_PATH, "Restore privacy reconciliation law"),
        },
    ]


def artifact_retention_payload() -> dict[str, Any]:
    rows = artifact_retention_rows()
    return {
        "summary": make_summary(rows, artifact_count=len(rows), explicit_gap_count=len(explicit_gaps())),
        "retention_class_enum": RETENTION_CLASS_ENUM,
        "legal_hold_state_enum": LEGAL_HOLD_STATE_ENUM,
        "erasure_eligibility_enum": ERASURE_ELIGIBILITY_ENUM,
        "limitation_behavior_enum": LIMITATION_BEHAVIOR_ENUM,
        "artifact_lifecycle_state_enum": ARTIFACT_LIFECYCLE_ENUM,
        "rows": rows,
        "explicit_gaps": explicit_gaps(),
    }


def privacy_threshold_payload() -> dict[str, Any]:
    rows = privacy_threshold_rows()
    return {
        "summary": make_summary(
            rows,
            formula_count=len([row for row in rows if row["category"] == "QUANTITATIVE_PRIVACY_FORMULA"]),
            threshold_count=len([row for row in rows if row["category"] == "QUANTITATIVE_PRIVACY_THRESHOLD"]),
            explainability_scope_count=len([row for row in rows if row["category"] == "RETENTION_LIMITED_EXPLAINABILITY"]),
        ),
        "explainability_boundary_scope_enum": EXPLAINABILITY_BOUNDARY_SCOPE_ENUM,
        "explainability_surface_role_enum": EXPLAINABILITY_SURFACE_ROLE_ENUM,
        "rows": rows,
    }


def threat_control_payload() -> dict[str, Any]:
    rows = threat_control_rows()
    return {
        "summary": make_summary(rows, threat_class_count=len(THREAT_CLASS_ENUM)),
        "threat_class_enum": THREAT_CLASS_ENUM,
        "control_id_enum": CONTROL_ID_ENUM,
        "rows": rows,
    }


def control_register_payload() -> dict[str, Any]:
    rows = security_control_rows()
    return {
        "summary": make_summary(rows, control_count=len(rows)),
        "control_id_enum": CONTROL_ID_ENUM,
        "rows": rows,
        "explicit_gaps": explicit_gaps(),
    }


def cache_payload() -> dict[str, Any]:
    rows = cache_rows()
    return {
        "summary": make_summary(rows, cache_scope_count=len(CACHE_SCOPE_ENUM), hydration_scope_count=len(HYDRATION_SCOPE_ENUM)),
        "cache_scope_enum": CACHE_SCOPE_ENUM,
        "hydration_scope_enum": HYDRATION_SCOPE_ENUM,
        "compatibility_dimension_enum": HYDRATION_COMPATIBILITY_ENUM,
        "purge_trigger_enum": HYDRATION_PURGE_TRIGGER_ENUM,
        "regulated_local_artifact_class_enum": LOCAL_ARTIFACT_CLASS_ENUM,
        "rows": rows,
    }


def session_storage_payload() -> dict[str, Any]:
    rows = session_storage_rows()
    return {
        "summary": make_summary(rows, credential_type_count=len(rows)),
        "session_client_class_enum": SESSION_CLIENT_CLASS_ENUM,
        "authn_level_enum": AUTHN_LEVEL_ENUM,
        "step_up_state_enum": STEP_UP_STATE_ENUM,
        "device_binding_state_enum": DEVICE_BINDING_STATE_ENUM,
        "secret_rotation_state_enum": SECRET_ROTATION_STATE_ENUM,
        "upload_binding_state_enum": UPLOAD_BINDING_STATE_ENUM,
        "rows": rows,
    }


def restore_payload() -> dict[str, Any]:
    rows = restore_rows()
    return {
        "summary": make_summary(rows, restore_state_count=len(RESTORE_PRIVACY_STATE_ENUM)),
        "privacy_reconciliation_state_enum": RESTORE_PRIVACY_STATE_ENUM,
        "reopen_access_state_enum": RESTORE_REOPEN_ACCESS_ENUM,
        "replay_limitation_state_enum": RESTORE_REPLAY_LIMITATION_ENUM,
        "rows": rows,
    }


def release_gate_payload() -> dict[str, Any]:
    rows = release_gate_rows()
    return {
        "summary": make_summary(rows, release_gate_count=len(RELEASE_GATE_ID_ENUM)),
        "release_gate_id_enum": RELEASE_GATE_ID_ENUM,
        "rows": rows,
    }


def render_docs(outputs: dict[str, Any]) -> tuple[str, str, str]:
    artifact_rows = outputs["artifact_matrix"]["rows"]
    formula_rows = outputs["privacy_thresholds"]["rows"]
    threat_rows = outputs["threat_control_map"]["rows"]
    control_rows = outputs["control_register"]["rows"]
    cache_rows_payload = outputs["cache_matrix"]["rows"]
    session_rows_payload = outputs["session_storage"]["rows"]
    restore_rows_payload = outputs["restore_matrix"]["rows"]
    release_rows = outputs["release_gate_matrix"]["rows"]

    overview_lines = [
        "# Retention, Privacy, Security, and Runtime Hardening",
        "",
        "## Pack Summary",
        "",
        f"- Governed artifact rows: {len(artifact_rows)}",
        f"- Quantitative privacy rows: {len(formula_rows)}",
        f"- Threat map rows: {len(threat_rows)}",
        f"- Security control rows: {len(control_rows)}",
        f"- Cache and purge rows: {len(cache_rows_payload)}",
        f"- Session, secret, and token storage rows: {len(session_rows_payload)}",
        f"- Restore privacy rows: {len(restore_rows_payload)}",
        f"- Security release-gate rows: {len(release_rows)}",
        "",
        "## Quantitative Privacy Model",
        "",
    ]
    overview_lines.extend(
        render_table(
            ["artifact_or_control_id", "survivability_or_fidelity_formula", "notes", "source_ref"],
            [
                row_data
                for row_data in formula_rows
                if row_data["category"] in {"QUANTITATIVE_PRIVACY_FORMULA", "QUANTITATIVE_PRIVACY_THRESHOLD"}
            ],
        )
    )
    overview_lines.extend(
        [
            "",
            "## Threat Classes to Concrete Controls",
            "",
        ]
    )
    overview_lines.extend(
        render_table(
            ["threat_class", "mapped_control_ids", "release_gate_dependency", "source_ref"],
            threat_rows,
        )
    )
    overview_lines.extend(
        [
            "",
            "## Core Security Controls",
            "",
        ]
    )
    overview_lines.extend(
        render_table(
            ["artifact_or_control_id", "canonical_store_or_boundary", "release_gate_dependency", "source_ref"],
            control_rows,
        )
    )
    overview_lines.extend(
        [
            "",
            "## Explicit Gaps",
            "",
        ]
    )
    for gap in outputs["artifact_matrix"]["explicit_gaps"]:
        overview_lines.append(f"- `{gap['gap_id']}` ({gap['severity']}): {gap['description']} [{gap['source_ref']}]")

    artifact_doc_lines = [
        "# Artifact Retention, Erasure, and Limitations Matrix",
        "",
        "## Governed Artifact Matrix",
        "",
    ]
    artifact_doc_lines.extend(
        render_table(
            [
                "artifact_or_control_id",
                "category",
                "retention_tag",
                "legal_hold_behavior",
                "erasure_behavior",
                "projection_allowed",
                "replay_preservation_required",
                "restore_reconciliation_required",
                "source_ref",
            ],
            artifact_rows,
        )
    )
    artifact_doc_lines.extend(
        [
            "",
            "## Retention-Limited Explainability",
            "",
        ]
    )
    artifact_doc_lines.extend(
        render_table(
            ["artifact_or_control_id", "boundary_scope", "surface_role", "survivability_or_fidelity_formula", "source_ref"],
            [row_data for row_data in formula_rows if row_data["category"] == "RETENTION_LIMITED_EXPLAINABILITY"],
        )
    )
    artifact_doc_lines.extend(
        [
            "",
            "## Restore Privacy Reconciliation States",
            "",
        ]
    )
    artifact_doc_lines.extend(
        render_table(
            ["privacy_reconciliation_state", "reopen_access_state", "compensating_re_erasure_state", "source_ref"],
            restore_rows_payload,
        )
    )

    cache_doc_lines = [
        "# Cache, Session, and Secret Boundary Map",
        "",
        "## Cache Partition and Purge Matrix",
        "",
    ]
    cache_doc_lines.extend(
        render_table(
            ["artifact_or_control_id", "cache_scope", "purge_trigger", "canonical_store_or_boundary", "source_ref"],
            cache_rows_payload,
        )
    )
    cache_doc_lines.extend(
        [
            "",
            "## Session, Secret, and Token Storage Matrix",
            "",
        ]
    )
    cache_doc_lines.extend(
        render_table(
            ["credential_type", "allowed_storage_boundary", "forbidden_boundaries", "release_gate_dependency", "source_ref"],
            session_rows_payload,
        )
    )
    cache_doc_lines.extend(
        [
            "",
            "## Security Release Gates",
            "",
        ]
    )
    cache_doc_lines.extend(
        render_table(
            ["gate_id", "blocking_condition", "required_evidence", "source_ref"],
            release_rows,
        )
    )

    return ("\n".join(overview_lines), "\n".join(artifact_doc_lines), "\n".join(cache_doc_lines))


def render_mermaid() -> str:
    return "\n".join(
        [
            "flowchart LR",
            '  A["RetentionTag / ArtifactRetention"] --> B["Survivability + Fidelity Formulas"]',
            '  B --> C["ProofBundle / EvidenceGraph / EnquiryPack"]',
            '  A --> D["ErasureProof + Hold / Limitation Visibility"]',
            '  E["ActorSession + Step-Up + Anti-CSRF"] --> F["Command Trust Boundary"]',
            '  G["Token Vault + SecretVersion"] --> F',
            '  H["CacheIsolationContract"] --> I["Browser / Portal / Governance Caches"]',
            '  J["NativeCacheHydrationContract"] --> K["Native Scene / Cursor / Local Artifact Purge"]',
            '  L["RestorePrivacyReconciliationContract"] --> M["Reopen Access State"]',
            '  N["Build Signature / SBOM / Provenance"] --> O["Security Release Gates"]',
            '  F --> O',
            '  H --> O',
            '  J --> O',
            '  L --> O',
            '  D --> M',
            '  C --> O',
            "",
        ]
    )


def build_outputs() -> dict[str, Any]:
    source_assertions()
    artifact_matrix = artifact_retention_payload()
    privacy_thresholds = privacy_threshold_payload()
    threat_control_map = threat_control_payload()
    control_register = control_register_payload()
    cache_matrix = cache_payload()
    session_storage = session_storage_payload()
    restore_matrix = restore_payload()
    release_gate_matrix = release_gate_payload()

    for payload in (
        artifact_matrix,
        privacy_thresholds,
        threat_control_map,
        control_register,
        cache_matrix,
        session_storage,
        restore_matrix,
        release_gate_matrix,
    ):
        assert_required_row_fields(payload["rows"])

    docs = render_docs(
        {
            "artifact_matrix": artifact_matrix,
            "privacy_thresholds": privacy_thresholds,
            "threat_control_map": threat_control_map,
            "control_register": control_register,
            "cache_matrix": cache_matrix,
            "session_storage": session_storage,
            "restore_matrix": restore_matrix,
            "release_gate_matrix": release_gate_matrix,
        }
    )

    return {
        "artifact_matrix": artifact_matrix,
        "privacy_thresholds": privacy_thresholds,
        "threat_control_map": threat_control_map,
        "control_register": control_register,
        "cache_matrix": cache_matrix,
        "session_storage": session_storage,
        "restore_matrix": restore_matrix,
        "release_gate_matrix": release_gate_matrix,
        "docs": docs,
        "mermaid": render_mermaid(),
    }


def write_outputs(outputs: dict[str, Any]) -> None:
    json_write(ARTIFACT_MATRIX_PATH, outputs["artifact_matrix"])
    json_write(PRIVACY_THRESHOLD_PATH, outputs["privacy_thresholds"])
    json_write(THREAT_CONTROL_PATH, outputs["threat_control_map"])
    json_write(CONTROL_REGISTER_PATH, outputs["control_register"])
    json_write(CACHE_MATRIX_PATH, outputs["cache_matrix"])
    json_write(SESSION_STORAGE_PATH, outputs["session_storage"])
    json_write(RESTORE_MATRIX_PATH, outputs["restore_matrix"])
    json_write(RELEASE_GATE_PATH, outputs["release_gate_matrix"])

    overview_doc, artifact_doc, cache_doc = outputs["docs"]
    text_write(RETENTION_DOC_PATH, overview_doc + "\n")
    text_write(ARTIFACT_DOC_PATH, artifact_doc + "\n")
    text_write(CACHE_DOC_PATH, cache_doc + "\n")
    text_write(MERMAID_PATH, outputs["mermaid"])


def main() -> int:
    outputs = build_outputs()
    write_outputs(outputs)
    summary = {
        "status": "PASS",
        "artifact_row_count": outputs["artifact_matrix"]["summary"]["artifact_count"],
        "formula_row_count": outputs["privacy_thresholds"]["summary"]["formula_count"],
        "threshold_row_count": outputs["privacy_thresholds"]["summary"]["threshold_count"],
        "explainability_scope_count": outputs["privacy_thresholds"]["summary"]["explainability_scope_count"],
        "threat_row_count": outputs["threat_control_map"]["summary"]["row_count"],
        "control_row_count": outputs["control_register"]["summary"]["row_count"],
        "cache_row_count": outputs["cache_matrix"]["summary"]["row_count"],
        "session_storage_row_count": outputs["session_storage"]["summary"]["row_count"],
        "restore_row_count": outputs["restore_matrix"]["summary"]["row_count"],
        "release_gate_row_count": outputs["release_gate_matrix"]["summary"]["row_count"],
        "explicit_gap_count": outputs["artifact_matrix"]["summary"]["explicit_gap_count"],
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
