#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any

import build_authority_protocol_registry as builder


REQUIRED_OUTPUTS = [
    builder.OPERATION_CATALOG_PATH,
    builder.SEQUENCE_STEPS_PATH,
    builder.REQUEST_IDENTITY_PATH,
    builder.RECONCILIATION_MATRIX_PATH,
    builder.TRUTH_PROJECTION_PATH,
    builder.RESPONSE_CLASS_PATH,
    builder.GAPS_PATH,
    builder.REQUIREMENTS_DOC_PATH,
    builder.SEQUENCE_DOC_PATH,
    builder.EDGE_CASE_DOC_PATH,
    builder.MERMAID_PATH,
]
REQUIRED_CORE_OBJECTS = {
    "AuthorityOperation",
    "AuthorityBinding",
    "AuthorityRequestEnvelope",
    "AuthorityResponseEnvelope",
    "AuthorityInteractionRecord",
}
REQUIRED_RECONCILIATION_SCENARIOS = {
    "direct_confirmed_success",
    "accepted_pending_or_retryable_follow_up",
    "timeout_or_no_resolution_unknown",
    "duplicate_or_pending_bucket_blocks_resend",
    "ambiguous_callback_or_reference_only_ingress",
    "out_of_band_or_authority_correction_discovered",
    "conflicting_authority_evidence_requires_quantitative_reconciliation",
    "budget_exhausted_or_deadline_elapsed",
}
EXPECTED_WRITE_STATES = {
    "INTENT_RECORDED",
    "TRANSMIT_PENDING",
    "TRANSMITTED",
    "PENDING_ACK",
    "CONFIRMED",
    "REJECTED",
    "UNKNOWN",
    "OUT_OF_BAND",
}
REQUIRED_SEQUENCE_MODULES = {
    "AUTHORITY_PREFLIGHT",
    "RESOLVE_AUTHORITY_OPERATION",
    "RESOLVE_AUTHORITY_BINDING",
    "CANONICALIZE_AUTHORITY_REQUEST",
    "DERIVE_AUTHORITY_REQUEST_HASHES",
    "BUILD_AUTHORITY_REQUEST_ENVELOPE",
    "SUBMIT_TO_AUTHORITY",
    "CHECKPOINT_AUTHORITY_INGRESS",
    "NORMALIZE_AUTHORITY_RESPONSE",
    "RECORD_AUTHORITY_INTERACTION",
    "RECONCILE_AUTHORITY_STATE",
    "EMIT_AUTHORITY_RECONCILIATION_ANALYTICS",
}


def fail(message: str) -> None:
    raise SystemExit(message)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for line in path.read_text().splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows


def load_csv(path: Path) -> list[dict[str, str]]:
    return list(csv.DictReader(path.open()))


def main() -> int:
    for path in REQUIRED_OUTPUTS:
        if not path.exists():
            fail(f"Missing required artifact: {path}")

    outputs = builder.build_outputs()

    actual_operation_catalog = load_json(builder.OPERATION_CATALOG_PATH)
    if actual_operation_catalog != outputs["operation_catalog"]:
        fail("authority_operation_catalog.json drifted from the canonical builder output.")

    actual_sequence_steps = load_jsonl(builder.SEQUENCE_STEPS_PATH)
    if actual_sequence_steps != outputs["sequence_steps"]:
        fail("authority_sequence_steps.jsonl drifted from the canonical builder output.")

    actual_request_identity = load_json(builder.REQUEST_IDENTITY_PATH)
    if actual_request_identity != outputs["request_identity"]:
        fail("request_identity_and_idempotency_rules.json drifted from the canonical builder output.")

    actual_reconciliation_rows = load_csv(builder.RECONCILIATION_MATRIX_PATH)
    expected_reconciliation_rows = [
        {key: str(value) for key, value in row.items()} for row in outputs["reconciliation_rows"]
    ]
    if actual_reconciliation_rows != expected_reconciliation_rows:
        fail("reconciliation_decision_matrix.csv drifted from the canonical builder output.")

    actual_truth_projection = load_json(builder.TRUTH_PROJECTION_PATH)
    if actual_truth_projection != outputs["truth_projection"]:
        fail("authority_truth_vs_internal_projection_map.json drifted from the canonical builder output.")

    actual_response_registry = load_json(builder.RESPONSE_CLASS_PATH)
    if actual_response_registry != outputs["response_registry"]:
        fail("response_class_registry.json drifted from the canonical builder output.")

    actual_gaps = load_json(builder.GAPS_PATH)
    if actual_gaps != outputs["gaps"]:
        fail("unresolved_protocol_gaps.json drifted from the canonical builder output.")

    expected_docs = outputs["docs"]
    if builder.REQUIREMENTS_DOC_PATH.read_text() != expected_docs[0] + "\n":
        fail("12_authority_interaction_and_reconciliation_requirements.md drifted from the canonical builder render.")
    if builder.SEQUENCE_DOC_PATH.read_text() != expected_docs[1] + "\n":
        fail("12_authority_sequence_and_boundary_matrix.md drifted from the canonical builder render.")
    if builder.EDGE_CASE_DOC_PATH.read_text() != expected_docs[2] + "\n":
        fail("12_pending_duplicate_and_out_of_band_handling.md drifted from the canonical builder render.")
    if builder.MERMAID_PATH.read_text() != outputs["mermaid"]:
        fail("12_authority_handshake_sequence.mmd drifted from the canonical builder render.")

    schema_operation_families = set(builder.schema_enum(builder.AUTHORITY_OPERATION_SCHEMA_PATH, "operation_family"))
    actual_operation_families = {
        row["operation_family"] for row in actual_operation_catalog["operation_records"]
    }
    if actual_operation_families != schema_operation_families:
        fail(
            "Operation family coverage drifted. "
            f"Expected {sorted(schema_operation_families)}, got {sorted(actual_operation_families)}"
        )

    actual_core_objects = {
        row["object_name"] for row in actual_operation_catalog["core_protocol_objects"]
    }
    missing_core_objects = REQUIRED_CORE_OBJECTS - actual_core_objects
    if missing_core_objects:
        fail(f"Missing required core protocol objects: {sorted(missing_core_objects)}")
    for row in actual_operation_catalog["core_protocol_objects"]:
        if row["object_name"] in REQUIRED_CORE_OBJECTS:
            if not row["schema_path"] or not row["prose_owner_ref"]:
                fail(f"Core protocol object is missing schema or prose owner mapping: {row['object_name']}")

    schema_response_classes = set(builder.schema_enum(builder.AUTHORITY_RESPONSE_ENVELOPE_SCHEMA_PATH, "response_class"))
    actual_response_classes = {
        row["response_class"] for row in actual_response_registry["response_classes"]
    }
    if actual_response_classes != schema_response_classes:
        fail(
            "Response class coverage drifted. "
            f"Expected {sorted(schema_response_classes)}, got {sorted(actual_response_classes)}"
        )

    write_state_union = {
        state
        for row in actual_response_registry["submission_state_write_rules"]
        for state in row["allowed_states"]
    }
    if write_state_union != EXPECTED_WRITE_STATES:
        fail(
            "Submission-state write coverage drifted. "
            f"Expected {sorted(EXPECTED_WRITE_STATES)}, got {sorted(write_state_union)}"
        )

    request_identity = actual_request_identity
    if request_identity["identity_profile_version"] != "AUTHORITY_REQUEST_IDENTITY_V2":
        fail("identity_profile_version must remain AUTHORITY_REQUEST_IDENTITY_V2.")
    if request_identity["sealed_identity_exclusions"] != ["token_version_ref"]:
        fail("Sealed request identity must exclude only token_version_ref.")
    collision_codes = {row["rule_code"] for row in request_identity["collision_rules"]}
    if collision_codes != {"BODY_COLLISION", "IDENTITY_NAMESPACE_COLLISION"}:
        fail(f"Collision rules drifted: {sorted(collision_codes)}")
    for required_retry_block in {
        "binding_lineage_ref changed",
        "BODY_COLLISION open",
        "IDENTITY_NAMESPACE_COLLISION open",
        "reconciliation_budget_state in {EXHAUSTED, ESCALATED}",
    }:
        if required_retry_block not in request_identity["unsafe_retry_conditions"]:
            fail(f"Unsafe retry conditions are missing required blocker: {required_retry_block}")

    sequence_modules = {row["module_name"] for row in actual_sequence_steps}
    missing_sequence_modules = REQUIRED_SEQUENCE_MODULES - sequence_modules
    if missing_sequence_modules:
        fail(f"Sequence ledger is missing required module seams: {sorted(missing_sequence_modules)}")

    scenario_names = {row["scenario_name"] for row in actual_reconciliation_rows}
    missing_scenarios = REQUIRED_RECONCILIATION_SCENARIOS - scenario_names
    if missing_scenarios:
        fail(f"Reconciliation matrix is missing required scenarios: {sorted(missing_scenarios)}")

    truth_projection = actual_truth_projection
    schema_truth_roles = set(builder.schema_enum(builder.AUTHORITY_TRUTH_SCHEMA_PATH, "truth_surface_role"))
    actual_truth_roles = {row["truth_surface_role"] for row in truth_projection["surfaces"]}
    if actual_truth_roles != schema_truth_roles:
        fail(
            "Truth surface coverage drifted. "
            f"Expected {sorted(schema_truth_roles)}, got {sorted(actual_truth_roles)}"
        )
    schema_boundary_scopes = set(builder.schema_enum(builder.AUTHORITY_TRUTH_SCHEMA_PATH, "boundary_scope"))
    actual_boundary_scopes = {row["boundary_scope"] for row in truth_projection["surfaces"]}
    if actual_boundary_scopes != schema_boundary_scopes:
        fail(
            "Boundary scope coverage drifted. "
            f"Expected {sorted(schema_boundary_scopes)}, got {sorted(actual_boundary_scopes)}"
        )

    if actual_operation_catalog["shared_requirements"]["reconciliation_inputs"] != builder.RECONCILIATION_INPUTS:
        fail("Reconciliation inputs drifted from the canonical protocol list.")
    if actual_operation_catalog["shared_requirements"]["reconciliation_outputs"] != builder.RECONCILIATION_OUTPUTS:
        fail("Reconciliation outputs drifted from the canonical protocol list.")

    gap_ids = {row["gap_id"] for row in actual_gaps["gaps"]}
    if len(gap_ids) != actual_gaps["summary"]["gap_count"]:
        fail("Gap summary count does not match the number of unique gap ids.")

    summary = {
        "status": "PASS",
        "operation_family_count": len(actual_operation_families),
        "sequence_step_count": len(actual_sequence_steps),
        "response_class_count": len(actual_response_classes),
        "reconciliation_scenario_count": len(actual_reconciliation_rows),
        "truth_surface_count": len(actual_truth_roles),
        "gap_count": actual_gaps["summary"]["gap_count"],
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
