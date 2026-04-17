#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
from dataclasses import fields
from pathlib import Path
from typing import Any

import extract_boundary_requirements as builder


REQUIRED_OUTPUTS = [
    builder.SYSTEM_BOUNDARY_JSONL_PATH,
    builder.BOUNDARY_CAPABILITY_MATRIX_CSV_PATH,
    builder.OUT_OF_SCOPE_REGISTER_PATH,
    builder.REQUIREMENTS_DOC_PATH,
    builder.MATRIX_DOC_PATH,
    builder.CONTEXT_DIAGRAM_PATH,
]
REQUIRED_FIELDS = [field.name for field in fields(builder.BoundaryRequirement)]
MUST_NOT_BE_CORE = {
    builder.CAP_AUTH_GATEWAY,
    builder.CAP_CONNECTOR_RUNTIME,
    builder.CAP_OCR_RUNTIME,
    builder.CAP_INGRESS_CHECKPOINT,
    builder.CAP_FETCH_TRANSPORT,
    builder.CAP_UI_RENDERING,
    builder.CAP_CONSOLES,
    builder.CAP_NORTHBOUND,
    builder.CAP_ROUTING,
    builder.CAP_SESSION_HARDENING,
    builder.CAP_SECRET_CUSTODY,
    builder.CAP_NOTIFICATIONS,
    builder.CAP_RUNTIME_TOPOLOGY,
    builder.CAP_RELEASE_CONTROL,
    builder.CAP_STANDALONE_FORECASTING,
    builder.CAP_IDENTITY_ISSUANCE,
    builder.CAP_HMRC_ONLY_TASKS,
    builder.CAP_AUTHORITY_TRUTH,
    builder.CAP_AUTHORITY_CALC,
    builder.CAP_HUMAN_JUDGMENT,
    builder.CAP_LEGAL_CONSENT,
    builder.CAP_EXTERNAL_SOURCE_ORIGINS,
    builder.CAP_AUTHORITY_PROCESSING,
}


def fail(message: str) -> None:
    raise SystemExit(message)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for line in path.read_text().splitlines():
        if not line.strip():
            continue
        rows.append(json.loads(line))
    return rows


def first_diff(
    expected_rows: list[dict[str, Any]], actual_rows: list[dict[str, Any]]
) -> tuple[int, dict[str, Any] | None, dict[str, Any] | None] | None:
    max_len = max(len(expected_rows), len(actual_rows))
    for index in range(max_len):
        expected = expected_rows[index] if index < len(expected_rows) else None
        actual = actual_rows[index] if index < len(actual_rows) else None
        if expected != actual:
            return index, expected, actual
    return None


def main() -> int:
    for path in REQUIRED_OUTPUTS:
        if not path.exists():
            fail(f"Missing required artifact: {path}")

    expected_builder_rows = builder.build_rows()
    expected_rows = [row.to_dict() for row in expected_builder_rows]
    actual_rows = load_jsonl(builder.SYSTEM_BOUNDARY_JSONL_PATH)
    diff = first_diff(expected_rows, actual_rows)
    if diff is not None:
        index, expected, actual = diff
        fail(
            "system_boundary_requirements.jsonl drifted from the extractor's canonical row set at "
            f"row index {index}. Expected {expected}, got {actual}"
        )

    row_ids = [row["boundary_requirement_id"] for row in actual_rows]
    if row_ids != sorted(row_ids):
        fail("Boundary requirement rows are not sorted deterministically by boundary_requirement_id.")
    if len(row_ids) != len(set(row_ids)):
        fail("Duplicate boundary_requirement_id values detected.")

    capability_names = [row["capability_name"] for row in actual_rows]
    if len(capability_names) != len(set(capability_names)):
        fail("Duplicate capability_name values detected.")

    expected_inside = {row.capability_name for row in expected_builder_rows if row.zone == "inside_core_engine"}
    actual_inside = {row["capability_name"] for row in actual_rows if row["zone"] == "inside_core_engine"}
    if actual_inside != expected_inside:
        fail(
            "Inside-core capability coverage drifted. "
            f"Missing: {sorted(expected_inside - actual_inside)}; extra: {sorted(actual_inside - expected_inside)}"
        )

    expected_outside = {
        row.capability_name for row in expected_builder_rows if row.zone != "inside_core_engine"
    }
    actual_outside = {row["capability_name"] for row in actual_rows if row["zone"] != "inside_core_engine"}
    if actual_outside != expected_outside:
        fail(
            "Outside-core capability coverage drifted. "
            f"Missing: {sorted(expected_outside - actual_outside)}; extra: {sorted(actual_outside - expected_outside)}"
        )

    actual_families = {row["boundary_rule_family"] for row in actual_rows}
    missing_explicit_families = sorted(builder.EXPLICIT_BOUNDARY_RULE_FAMILIES - actual_families)
    if missing_explicit_families:
        fail(f"Explicit boundary rules are not fully covered: {missing_explicit_families}")

    for row in actual_rows:
        for field_name in REQUIRED_FIELDS:
            if field_name not in row:
                fail(f"Row {row.get('boundary_requirement_id')} is missing required field `{field_name}`.")
        if row["zone"] not in builder.VALID_ZONES:
            fail(f"Unexpected zone `{row['zone']}` for {row['boundary_requirement_id']}.")
        if not row["authoritative_source_refs"]:
            fail(f"{row['boundary_requirement_id']} has no authoritative_source_refs.")
        if not row["owning_objects_or_contracts"]:
            fail(f"{row['boundary_requirement_id']} has no owning_objects_or_contracts.")
        if not row["triggering_actors"]:
            fail(f"{row['boundary_requirement_id']} has no triggering_actors.")
        if not row["required_inputs"]:
            fail(f"{row['boundary_requirement_id']} has no required_inputs.")
        if not row["produced_outputs_or_artifacts"]:
            fail(f"{row['boundary_requirement_id']} has no produced_outputs_or_artifacts.")
        if not row["forbidden_shortcuts_or_false_equivalences"]:
            fail(f"{row['boundary_requirement_id']} has no forbidden_shortcuts_or_false_equivalences.")
        if not row["downstream_phase_implications"]:
            fail(f"{row['boundary_requirement_id']} has no downstream_phase_implications.")
        if len(row["lawful_engine_relationship"].strip()) < 24:
            fail(f"{row['boundary_requirement_id']} has an underspecified lawful_engine_relationship.")
        if row["capability_name"] in MUST_NOT_BE_CORE and row["zone"] == "inside_core_engine":
            fail(
                f"{row['boundary_requirement_id']} misclassified `{row['capability_name']}` as inside_core_engine."
            )

    csv_rows = list(csv.DictReader(builder.BOUNDARY_CAPABILITY_MATRIX_CSV_PATH.open()))
    if len(csv_rows) != len(actual_rows):
        fail("boundary_capability_matrix.csv row count does not match system_boundary_requirements.jsonl.")

    csv_ids = [row["boundary_requirement_id"] for row in csv_rows]
    if csv_ids != row_ids:
        fail("CSV row ids do not match JSONL row ids.")

    expected_register = builder.build_out_of_scope_register(expected_builder_rows)
    actual_register = load_json(builder.OUT_OF_SCOPE_REGISTER_PATH)
    if actual_register != expected_register:
        fail("out_of_scope_but_adjacent_functions.json drifted from the canonical non-core register.")

    non_core_rows = [row for row in actual_rows if row["zone"] != "inside_core_engine"]
    if len(actual_register["rows"]) != len(non_core_rows):
        fail("Out-of-scope register does not cover every non-core capability.")

    register_ids = [row["boundary_requirement_id"] for row in actual_register["rows"]]
    if register_ids != [row["boundary_requirement_id"] for row in non_core_rows]:
        fail("Out-of-scope register row order does not match non-core capability order.")

    requirements_doc = builder.REQUIREMENTS_DOC_PATH.read_text()
    matrix_doc = builder.MATRIX_DOC_PATH.read_text()
    mermaid_doc = builder.CONTEXT_DIAGRAM_PATH.read_text()

    if "# Invention and System Boundary Requirements" not in requirements_doc:
        fail("Requirements doc title is missing.")
    if "# Boundary Capability Matrix" not in matrix_doc:
        fail("Matrix doc title is missing.")

    for zone in builder.ZONE_ORDER:
        if f"`{zone}`" not in matrix_doc:
            fail(f"Matrix doc is missing zone section for `{zone}`.")

    for label in [
        "External Authority / External Actor",
        "Broader Product Outside Core",
        "Controlled Edge",
        "Core Engine",
    ]:
        if label not in mermaid_doc:
            fail(f"Context diagram is missing `{label}`.")

    summary = {
        "status": "PASS",
        "requirement_count": len(actual_rows),
        "inside_core_count": len(actual_inside),
        "non_core_count": len(non_core_rows),
        "explicit_rule_family_count": len(actual_families),
        "out_of_scope_register_count": len(actual_register["rows"]),
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
