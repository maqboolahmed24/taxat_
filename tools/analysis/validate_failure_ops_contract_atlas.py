#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import build_failure_ops_contract_atlas as builder


REQUIRED_OUTPUTS = [
    builder.SIGNAL_CATALOG_PATH,
    builder.AUDIT_REGISTRY_PATH,
    builder.CORRELATION_TOPOLOGY_PATH,
    builder.ERROR_MATRIX_PATH,
    builder.DASHBOARD_RULES_PATH,
    builder.OWNER_CLOSURE_PATH,
    builder.RETENTION_VISIBILITY_PATH,
    builder.OBSERVABILITY_DOC_PATH,
    builder.SIGNAL_DOC_PATH,
    builder.DASHBOARD_DOC_PATH,
    builder.MERMAID_PATH,
    builder.ATLAS_INDEX_PATH,
    builder.ATLAS_STYLES_PATH,
    builder.ATLAS_APP_PATH,
    builder.ATLAS_DATA_PATH,
]


def fail(message: str) -> None:
    raise SystemExit(message)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def compare_json(path: Path, expected: Any, label: str) -> None:
    actual = load_json(path)
    if actual != expected:
        fail(f"{label} drifted from the canonical builder output.")


def compare_text(path: Path, expected: str, label: str) -> None:
    actual = path.read_text(encoding="utf-8")
    if actual != expected:
        fail(f"{label} drifted from the canonical builder render.")


def rows_by_name(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {row["canonical_name"]: row for row in rows}


def main() -> int:
    for path in REQUIRED_OUTPUTS:
        if not path.exists():
            fail(f"Missing required artifact: {path}")

    outputs = builder.build_outputs()

    compare_json(builder.SIGNAL_CATALOG_PATH, outputs["signal_catalog"], "signal_catalog.json")
    compare_json(builder.AUDIT_REGISTRY_PATH, outputs["audit_registry"], "audit_event_family_registry.json")
    compare_json(
        builder.CORRELATION_TOPOLOGY_PATH,
        outputs["correlation_pack"],
        "correlation_topology_and_query_contracts.json",
    )
    compare_json(
        builder.ERROR_MATRIX_PATH,
        outputs["error_matrix"],
        "error_family_retry_remediation_matrix.json",
    )
    compare_json(
        builder.DASHBOARD_RULES_PATH,
        outputs["dashboard_rules"],
        "failure_lifecycle_dashboard_projection_rules.json",
    )
    compare_json(
        builder.OWNER_CLOSURE_PATH,
        outputs["owner_closure"],
        "failure_owner_closure_and_risk_matrix.json",
    )
    compare_json(
        builder.RETENTION_VISIBILITY_PATH,
        outputs["retention_visibility"],
        "retention_visibility_signal_binding_matrix.json",
    )
    compare_json(builder.ATLAS_DATA_PATH, outputs["atlas_data"], "atlas_data.json")

    compare_text(
        builder.OBSERVABILITY_DOC_PATH,
        outputs["docs"][0] + "\n",
        "17_observability_audit_and_failure_management.md",
    )
    compare_text(
        builder.SIGNAL_DOC_PATH,
        outputs["docs"][1] + "\n",
        "17_signal_model_correlation_and_retention_spec.md",
    )
    compare_text(
        builder.DASHBOARD_DOC_PATH,
        outputs["docs"][2] + "\n",
        "17_failure_lifecycle_dashboard_spec.md",
    )
    compare_text(builder.MERMAID_PATH, outputs["mermaid"] + "\n", "17_signal_and_failure_lineage.mmd")
    compare_text(builder.ATLAS_INDEX_PATH, outputs["prototype_files"]["index.html"] + "\n", "index.html")
    compare_text(builder.ATLAS_STYLES_PATH, outputs["prototype_files"]["styles.css"] + "\n", "styles.css")
    compare_text(builder.ATLAS_APP_PATH, outputs["prototype_files"]["app.js"] + "\n", "app.js")

    signal_rows = outputs["signal_catalog"]["rows"]
    builder.assert_required_record_fields(signal_rows)
    for row in signal_rows:
        if not row["correlation_keys"]:
            fail(f"Signal row {row['canonical_name']} must declare correlation keys.")
        if not row["visibility_boundary"] or not row["retention_boundary"]:
            fail(f"Signal row {row['canonical_name']} must declare visibility and retention boundaries.")

    audit_rows = outputs["audit_registry"]["rows"]
    builder.assert_required_record_fields(audit_rows)
    audit_names = {row["canonical_name"] for row in audit_rows}
    expected_audit = set(builder.AUDIT_EVENT_ENUM)
    if audit_names != expected_audit:
        fail(f"Audit registry coverage drifted. Expected {sorted(expected_audit)}, got {sorted(audit_names)}")

    error_rows = outputs["error_matrix"]["rows"]
    builder.assert_required_record_fields(error_rows)
    error_names = {row["canonical_name"] for row in error_rows}
    expected_errors = set(builder.ERROR_FAMILY_ENUM)
    if error_names != expected_errors:
        fail(f"Error family coverage drifted. Expected {sorted(expected_errors)}, got {sorted(error_names)}")
    for row in error_rows:
        if row["retry_class"] not in builder.RETRY_CLASS_ENUM:
            fail(f"Unknown retry class on {row['canonical_name']}.")
        if row["dominant_blocking_class"] not in builder.BLOCKING_CLASS_ENUM:
            fail(f"Unknown blocking class on {row['canonical_name']}.")
        if row["remediation_class"] not in builder.REMEDIATION_CLASS_ENUM:
            fail(f"Unknown remediation class on {row['canonical_name']}.")

    dashboard_rules = outputs["dashboard_rules"]
    dashboard_rows = rows_by_name(dashboard_rules["rows"])
    forbidden_inputs = set(dashboard_rules["forbidden_inputs"])
    required_forbidden = {
        "operational log text",
        "operator notes",
        "message copy",
        "UI-local joins",
        "unordered raw table scans with no typed lineage basis",
    }
    if not required_forbidden.issubset(forbidden_inputs):
        fail("Failure dashboard rules must explicitly reject log-only reconstruction inputs.")
    if "DataSourcePolicy" not in dashboard_rows:
        fail("Failure dashboard rules are missing the DataSourcePolicy row.")

    retention_rows = outputs["retention_visibility"]["rows"]
    builder.assert_required_record_fields(retention_rows)
    retention_domains = {row["domain"] for row in retention_rows}
    expected_domains = {"AUDIT", "OPS", "SECURITY", "PRIVACY", "FAILURE", "RISK"}
    if retention_domains != expected_domains:
        fail(f"Retention/visibility domains drifted. Expected {sorted(expected_domains)}, got {sorted(retention_domains)}")

    query_rows = outputs["correlation_pack"]["query_contracts"]
    query_names = {row["query_code"] for row in query_rows}
    required_queries = {
        "AUDIT_TRAIL",
        "RUN_TIMELINE",
        "NIGHTLY_BATCH_TIMELINE",
        "FILING_EVIDENCE_LEDGER",
        "PRIVACY_ACTION_LEDGER",
        "OPERATOR_MORNING_DIGEST",
        "REPLAY_ATTESTATION",
        "PROVENANCE_OBJECT",
        "DEFENCE_PATH",
        "AUTHORITY_STATE_PATH",
        "DRIFT_PATH",
        "RETENTION_LIMITATION_PATH",
    }
    if query_names != required_queries:
        fail(f"Query-contract coverage drifted. Expected {sorted(required_queries)}, got {sorted(query_names)}")

    atlas_data = outputs["atlas_data"]
    page_ids = [page["page_id"] for page in atlas_data["pages"]]
    if page_ids != ["signal-model", "audit-families", "failure-lifecycle", "query-contracts", "retention-visibility"]:
        fail(f"Atlas page order drifted: {page_ids}")
    if len(atlas_data["failure_lifecycle"]["states"]) < 4:
        fail("Atlas must expose at least one open, active, risk, and resolved lineage state.")
    if len(atlas_data["design_influences"]) != 3:
        fail("Atlas design influence notes drifted from the current research-derived set.")

    required_anchor_markers = [
        'data-testid="signal-domain-rail"',
        'data-testid="failure-evidence-inspector"',
        'signal-separation-diagram',
        'audit-family-ledger',
        'failure-lineage-ribbon',
        'failure-dashboard-projection',
        'query-contract-catalog',
        'retention-visibility-matrix',
    ]
    index_html = builder.ATLAS_INDEX_PATH.read_text(encoding="utf-8")
    app_js = builder.ATLAS_APP_PATH.read_text(encoding="utf-8")
    searchable = index_html + "\n" + app_js
    for marker in required_anchor_markers:
        if marker not in searchable:
            fail(f"Atlas is missing required semantic anchor marker: {marker}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
