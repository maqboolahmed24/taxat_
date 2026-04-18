#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import build_retention_security_pack as builder


REQUIRED_OUTPUTS = [
    builder.ARTIFACT_MATRIX_PATH,
    builder.PRIVACY_THRESHOLD_PATH,
    builder.THREAT_CONTROL_PATH,
    builder.CONTROL_REGISTER_PATH,
    builder.CACHE_MATRIX_PATH,
    builder.SESSION_STORAGE_PATH,
    builder.RESTORE_MATRIX_PATH,
    builder.RELEASE_GATE_PATH,
    builder.RETENTION_DOC_PATH,
    builder.ARTIFACT_DOC_PATH,
    builder.CACHE_DOC_PATH,
    builder.MERMAID_PATH,
]


def fail(message: str) -> None:
    raise SystemExit(message)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def compare_json(path: Path, expected: Any, label: str) -> None:
    actual = load_json(path)
    if actual != expected:
        fail(f"{label} drifted from the canonical builder output.")


def compare_text(path: Path, expected: str, label: str) -> None:
    actual = path.read_text()
    if actual != expected:
        fail(f"{label} drifted from the canonical builder render.")


def rows_by_id(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {row["artifact_or_control_id"]: row for row in rows}


def unique_values(rows: list[dict[str, Any]], key: str) -> set[Any]:
    return {row[key] for row in rows}


def main() -> int:
    for path in REQUIRED_OUTPUTS:
        if not path.exists():
            fail(f"Missing required artifact: {path}")

    outputs = builder.build_outputs()

    compare_json(builder.ARTIFACT_MATRIX_PATH, outputs["artifact_matrix"], "artifact_retention_matrix.json")
    compare_json(
        builder.PRIVACY_THRESHOLD_PATH,
        outputs["privacy_thresholds"],
        "privacy_projection_and_survivability_thresholds.json",
    )
    compare_json(builder.THREAT_CONTROL_PATH, outputs["threat_control_map"], "threat_class_to_control_map.json")
    compare_json(
        builder.CONTROL_REGISTER_PATH,
        outputs["control_register"],
        "security_control_boundary_register.json",
    )
    compare_json(builder.CACHE_MATRIX_PATH, outputs["cache_matrix"], "cache_partition_and_purge_matrix.json")
    compare_json(
        builder.SESSION_STORAGE_PATH,
        outputs["session_storage"],
        "session_secret_token_storage_matrix.json",
    )
    compare_json(
        builder.RESTORE_MATRIX_PATH,
        outputs["restore_matrix"],
        "restore_privacy_reconciliation_matrix.json",
    )
    compare_json(
        builder.RELEASE_GATE_PATH,
        outputs["release_gate_matrix"],
        "security_release_gate_matrix.json",
    )

    docs = outputs["docs"]
    compare_text(builder.RETENTION_DOC_PATH, docs[0] + "\n", "16_retention_privacy_security_runtime_hardening.md")
    compare_text(
        builder.ARTIFACT_DOC_PATH,
        docs[1] + "\n",
        "16_artifact_retention_erasure_and_limitations_matrix.md",
    )
    compare_text(builder.CACHE_DOC_PATH, docs[2] + "\n", "16_cache_session_and_secret_boundary_map.md")
    compare_text(builder.MERMAID_PATH, outputs["mermaid"], "16_security_privacy_runtime_boundary.mmd")

    payloads = [
        outputs["artifact_matrix"],
        outputs["privacy_thresholds"],
        outputs["threat_control_map"],
        outputs["control_register"],
        outputs["cache_matrix"],
        outputs["session_storage"],
        outputs["restore_matrix"],
        outputs["release_gate_matrix"],
    ]
    for payload in payloads:
        builder.assert_required_row_fields(payload["rows"])

    artifact_rows = outputs["artifact_matrix"]["rows"]
    artifact_index = rows_by_id(artifact_rows)
    required_artifacts = {
        "RunManifest",
        "ConfigFreeze",
        "InputFreeze",
        "HashSetExecutionBasis",
        "GateDecisionRecordLineage",
        "DecisionBundle",
        "ProofBundle",
        "EvidenceGraph",
        "EnquiryPack",
        "AuditEvent",
        "RetentionTag",
        "ArtifactRetention",
        "ErasureProof",
        "ReplayAttestation",
        "AuthorityIngressReceipt",
        "AuthorityInteractionRecord",
        "SubmissionRecord",
        "ClientUploadSession",
        "UploadRequestBindingContract",
        "CollaborationAttachment",
        "MaskedExportArtifact",
        "TelemetryLogTrace",
        "WorkInboxSnapshot",
        "WorkspaceSnapshot",
        "ClientPortalWorkspace",
        "CacheIsolationContract",
        "NativeCacheHydrationContract",
        "ActorSession",
        "SecretVersion",
        "NativeLocalArtifactSet",
        "RestorePrivacyReconciliationContract",
        "ApiCommandReceipt",
    }
    missing_artifacts = required_artifacts - set(artifact_index)
    if missing_artifacts:
        fail(f"Artifact retention matrix is missing required artifact classes: {sorted(missing_artifacts)}")

    privacy_rows = outputs["privacy_thresholds"]["rows"]
    privacy_index = rows_by_id(privacy_rows)
    required_formula_rows = {
        "FORMULA_DECISION_INFORMATION_RATIO",
        "FORMULA_PROJECTION_INFORMATION_RATIO",
        "FORMULA_LIMITATION_EXPLICITNESS",
        "FORMULA_SILENT_AMBIGUITY",
        "FORMULA_SURVIVABILITY",
        "FORMULA_PROJECTION_FIDELITY",
    }
    missing_formulas = required_formula_rows - set(privacy_index)
    if missing_formulas:
        fail(f"Quantitative privacy model is missing formulas: {sorted(missing_formulas)}")

    threshold_expectations = {
        "THRESHOLD_SUBMIT": ("τ_submit", 0.80),
        "THRESHOLD_REVIEW": ("τ_review", 0.45),
        "THRESHOLD_AUDIT": ("τ_audit", 0.15),
    }
    for row_id, (symbol, value) in threshold_expectations.items():
        row = privacy_index.get(row_id)
        if row is None:
            fail(f"Missing threshold row {row_id}.")
        if row.get("symbol") != symbol or row.get("threshold_value") != value:
            fail(f"Threshold row {row_id} drifted from the canonical symbol/value pair.")

    explainability_scopes = {
        row["boundary_scope"] for row in privacy_rows if row["category"] == "RETENTION_LIMITED_EXPLAINABILITY"
    }
    if explainability_scopes != set(builder.EXPLAINABILITY_BOUNDARY_SCOPE_ENUM):
        fail(
            "Retention-limited explainability scope coverage drifted. "
            f"Expected {sorted(builder.EXPLAINABILITY_BOUNDARY_SCOPE_ENUM)}, got {sorted(explainability_scopes)}"
        )

    threat_rows = outputs["threat_control_map"]["rows"]
    threat_classes = {row["threat_class"] for row in threat_rows}
    if threat_classes != set(builder.THREAT_CLASS_ENUM):
        fail(f"Threat-class coverage drifted. Expected {sorted(builder.THREAT_CLASS_ENUM)}, got {sorted(threat_classes)}")
    for row in threat_rows:
        mapped = row.get("mapped_control_ids", [])
        if not mapped:
            fail(f"Threat row {row['artifact_or_control_id']} does not map to any controls.")
        if any(control_id not in builder.CONTROL_ID_ENUM for control_id in mapped):
            fail(f"Threat row {row['artifact_or_control_id']} references an unknown control id.")

    control_rows = outputs["control_register"]["rows"]
    control_ids = unique_values(control_rows, "artifact_or_control_id")
    if control_ids != set(builder.CONTROL_ID_ENUM):
        fail(f"Security control coverage drifted. Expected {sorted(builder.CONTROL_ID_ENUM)}, got {sorted(control_ids)}")

    cache_rows = outputs["cache_matrix"]["rows"]
    cache_scope_rows = {
        row["cache_scope"][0]
        for row in cache_rows
        if row.get("scope_family") == "CACHE_ISOLATION_SCOPE" and row["cache_scope"] != builder.NOT_APPLICABLE
    }
    if cache_scope_rows != set(builder.CACHE_SCOPE_ENUM):
        fail(
            "Cache-isolation scope coverage drifted. "
            f"Expected {sorted(builder.CACHE_SCOPE_ENUM)}, got {sorted(cache_scope_rows)}"
        )
    hydration_scope_rows = {
        row["cache_scope"][0]
        for row in cache_rows
        if row.get("scope_family") == "NATIVE_HYDRATION_SCOPE" and row["cache_scope"] != builder.NOT_APPLICABLE
    }
    if hydration_scope_rows != set(builder.HYDRATION_SCOPE_ENUM):
        fail(
            "Native hydration scope coverage drifted. "
            f"Expected {sorted(builder.HYDRATION_SCOPE_ENUM)}, got {sorted(hydration_scope_rows)}"
        )
    purge_trigger_union = {
        trigger
        for row in cache_rows + outputs["session_storage"]["rows"]
        for trigger in row["purge_trigger"]
        if trigger != "NOT_APPLICABLE"
    }
    required_purge_triggers = set(builder.HYDRATION_PURGE_TRIGGER_ENUM) | {
        "STEP_UP_COMPLETED",
        "AUTHORITY_REBINDING",
        "TOKEN_ROTATION",
    }
    missing_purge_triggers = required_purge_triggers - purge_trigger_union
    if missing_purge_triggers:
        fail(f"Required purge triggers are missing from cache/session coverage: {sorted(missing_purge_triggers)}")

    session_rows = outputs["session_storage"]["rows"]
    credential_types = unique_values(session_rows, "credential_type")
    expected_credential_types = {
        "BROWSER_SESSION_COOKIE",
        "BROWSER_CSRF_REF",
        "NATIVE_PRODUCT_SESSION_MATERIAL",
        "AUTHORITY_ACCESS_REFRESH_TOKEN",
        "SERVICE_IDENTITY_MACHINE_CREDENTIAL",
        "SECRET_VERSION_KEY_MATERIAL",
        "RESUME_TOKEN",
        "AUTHORITY_LOGIN_CREDENTIALS",
    }
    if credential_types != expected_credential_types:
        fail(
            "Credential storage coverage drifted. "
            f"Expected {sorted(expected_credential_types)}, got {sorted(credential_types)}"
        )
    for row in session_rows:
        allowed = row.get("allowed_storage_boundary")
        forbidden = row.get("forbidden_boundaries", [])
        if not isinstance(allowed, str) or not allowed:
            fail(f"Credential row {row['artifact_or_control_id']} is missing a single allowed storage boundary.")
        if not isinstance(forbidden, list) or not forbidden:
            fail(f"Credential row {row['artifact_or_control_id']} must declare explicit forbidden boundaries.")

    restore_rows = outputs["restore_matrix"]["rows"]
    restore_states = unique_values(restore_rows, "privacy_reconciliation_state")
    if restore_states != set(builder.RESTORE_PRIVACY_STATE_ENUM):
        fail(
            "Restore privacy reconciliation state coverage drifted. "
            f"Expected {sorted(builder.RESTORE_PRIVACY_STATE_ENUM)}, got {sorted(restore_states)}"
        )
    reopen_states = unique_values(restore_rows, "reopen_access_state")
    if not reopen_states.issubset(set(builder.RESTORE_REOPEN_ACCESS_ENUM)):
        fail("Restore rows contain reopen_access_state values outside the schema enum.")
    if "READY_FOR_REOPEN" not in reopen_states or "BLOCKED" not in reopen_states:
        fail("Restore reopen coverage must include both READY_FOR_REOPEN and BLOCKED postures.")

    release_rows = outputs["release_gate_matrix"]["rows"]
    release_gate_ids = unique_values(release_rows, "gate_id")
    if release_gate_ids != set(builder.RELEASE_GATE_ID_ENUM):
        fail(
            "Security release-gate coverage drifted. "
            f"Expected {sorted(builder.RELEASE_GATE_ID_ENUM)}, got {sorted(release_gate_ids)}"
        )

    if outputs["artifact_matrix"]["summary"]["explicit_gap_count"] != len(builder.explicit_gaps()):
        fail("Explicit gap count drifted from the canonical builder definition.")

    summary = {
        "status": "PASS",
        "artifact_count": outputs["artifact_matrix"]["summary"]["artifact_count"],
        "formula_count": outputs["privacy_thresholds"]["summary"]["formula_count"],
        "threshold_count": outputs["privacy_thresholds"]["summary"]["threshold_count"],
        "threat_count": outputs["threat_control_map"]["summary"]["threat_class_count"],
        "control_count": outputs["control_register"]["summary"]["control_count"],
        "cache_scope_count": outputs["cache_matrix"]["summary"]["cache_scope_count"],
        "hydration_scope_count": outputs["cache_matrix"]["summary"]["hydration_scope_count"],
        "credential_type_count": outputs["session_storage"]["summary"]["credential_type_count"],
        "restore_state_count": outputs["restore_matrix"]["summary"]["restore_state_count"],
        "release_gate_count": outputs["release_gate_matrix"]["summary"]["release_gate_count"],
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
