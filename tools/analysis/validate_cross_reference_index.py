#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path

import build_cross_reference_index as builder


ROOT = Path(__file__).resolve().parents[2]

REQUIRED_OUTPUTS = [
    builder.CROSS_REFERENCE_JSON_PATH,
    builder.CROSS_REFERENCE_CSV_PATH,
    builder.OBJECT_ENFORCEMENT_MAP_PATH,
    builder.ENFORCEMENT_GAP_REGISTER_PATH,
    builder.INDEX_DOC_PATH,
    builder.COVERAGE_DOC_PATH,
    builder.GRAPH_DOC_PATH,
]
ALLOWED_FAMILY_KINDS = {
    "object_family",
    "contract_family",
    "state_machine_family",
    "validator_family",
    "forensic_guard_family",
    "constraint_family",
}
ALLOWED_COVERAGE_STATUS = {
    "fully_mapped",
    "partially_mapped",
    "doc_only",
    "schema_only",
    "validator_only",
    "gap",
}


def fail(message: str) -> None:
    raise SystemExit(message)


def load_json(path: Path):
    return json.loads(path.read_text())


def path_from_ref(ref: str) -> str:
    return re.split(r"::|#", ref, maxsplit=1)[0]


def extract_graph_row_ids(graph_text: str) -> set[str]:
    row_ids: set[str] = set()
    for line in graph_text.splitlines():
        match = re.match(r'^\s*([A-Z0-9_]+)\["', line)
        if not match:
            continue
        node_id = match.group(1)
        if node_id in {"PROSE", "SCHEMA", "SAMPLE", "VALIDATOR", "GUARD", "CONSTRAINT", "HISTORY"}:
            continue
        row_ids.add(node_id)
    return row_ids


def main() -> int:
    for path in REQUIRED_OUTPUTS:
        if not path.exists():
            fail(f"Missing required artifact: {path}")

    index_payload = load_json(builder.CROSS_REFERENCE_JSON_PATH)
    rows = index_payload["rows"]
    csv_rows = list(csv.DictReader(builder.CROSS_REFERENCE_CSV_PATH.open()))
    object_payload = load_json(builder.OBJECT_ENFORCEMENT_MAP_PATH)
    gap_payload = load_json(builder.ENFORCEMENT_GAP_REGISTER_PATH)
    graph_text = builder.GRAPH_DOC_PATH.read_text()

    if len(csv_rows) != len(rows):
        fail("CSV row count does not match JSON row count.")

    row_ids = [row["logical_family_id"] for row in rows]
    if row_ids != sorted(row_ids):
        fail("Cross-reference rows are not sorted deterministically by logical_family_id.")
    if len(row_ids) != len(set(row_ids)):
        fail("Cross-reference index contains duplicate logical_family_id values.")

    for row in rows:
        if row["family_kind"] not in ALLOWED_FAMILY_KINDS:
            fail(f"Unexpected family_kind for {row['logical_family_id']}: {row['family_kind']}")
        if row["coverage_status"] not in ALLOWED_COVERAGE_STATUS:
            fail(f"Unexpected coverage_status for {row['logical_family_id']}: {row['coverage_status']}")
        if any(path_from_ref(ref) in builder.HISTORICAL_CONTEXT_PATHS for ref in row["authoritative_prose_refs"]):
            fail(f"Historical closure doc leaked into authoritative_prose_refs for {row['logical_family_id']}.")
        if any(path_from_ref(ref) not in builder.HISTORICAL_CONTEXT_PATHS for ref in row["historical_closure_refs"]):
            fail(f"Non-historical path leaked into historical_closure_refs for {row['logical_family_id']}.")

    graph_row_ids = extract_graph_row_ids(graph_text)
    missing_graph_ids = sorted(builder.sanitize_id(row_id) for row_id in row_ids if builder.sanitize_id(row_id) not in graph_row_ids)
    if missing_graph_ids:
        fail(f"Mermaid graph is missing logical family nodes: {missing_graph_ids[:10]}")

    schema_inventory = load_json(builder.SCHEMA_SAMPLE_INVENTORY_PATH)["schemas"]
    schema_paths = sorted(entry["schema_path"] for entry in schema_inventory)
    mapped_schema_paths = sorted({path_from_ref(ref) for row in rows for ref in row["schema_refs"]})
    if schema_paths != mapped_schema_paths:
        missing_schema_paths = sorted(set(schema_paths) - set(mapped_schema_paths))
        extra_schema_paths = sorted(set(mapped_schema_paths) - set(schema_paths))
        fail(
            "Schema coverage mismatch. "
            f"Missing: {missing_schema_paths[:10]}; extra: {extra_schema_paths[:10]}"
        )

    constraints = builder.load_constraints()
    expected_constraint_ids = sorted(entry["constraint_id"] for entry in constraints)
    constraint_row_ids = sorted(
        row["logical_family_id"].removeprefix("CONSTRAINT_").replace("_", "-")
        for row in rows
        if row["family_kind"] == "constraint_family"
    )
    if expected_constraint_ids != constraint_row_ids:
        fail(
            "Constraint-family rows do not match the live constraint register. "
            f"Expected {expected_constraint_ids}, got {constraint_row_ids}"
        )

    custom_validators, duplicate_validators, _function_symbols = builder.parse_validator_symbols()
    expected_validator_ids = {"VAL_" + builder.sanitize_id(kind) for kind in custom_validators}
    actual_validator_ids = {row["logical_family_id"] for row in rows if row["family_kind"] == "validator_family"}
    missing_validator_ids = sorted(expected_validator_ids - actual_validator_ids)
    if missing_validator_ids:
        fail(f"Custom-validator rows missing from the index: {missing_validator_ids[:10]}")

    guard_symbols, _guard_function_symbols = builder.parse_guard_symbols()
    expected_guard_ids = {"GRD_" + builder.sanitize_id(symbol.name.removeprefix("check_")) for symbol in guard_symbols}
    actual_guard_ids = {row["logical_family_id"] for row in rows if row["family_kind"] == "forensic_guard_family"}
    missing_guard_ids = sorted(expected_guard_ids - actual_guard_ids)
    if missing_guard_ids:
        fail(f"Forensic-guard rows missing from the index: {missing_guard_ids[:10]}")

    for row in rows:
        if row["family_kind"] == "validator_family" and row["logical_family_id"] in expected_validator_ids:
            if not row["authoritative_prose_refs"] and not row["gap_notes"]:
                fail(f"Custom validator lacks both prose ownership and explicit gap notes: {row['logical_family_id']}")
        if row["family_kind"] == "forensic_guard_family":
            if row["logical_family_id"] in expected_guard_ids and not row["authoritative_prose_refs"] and not row["gap_notes"]:
                fail(f"Forensic guard lacks both prose ownership and explicit gap notes: {row['logical_family_id']}")

    object_rows = [row for row in rows if row["family_kind"] == "object_family"]
    if len(object_payload["object_families"]) != len(object_rows):
        fail("Object enforcement map row count does not match object-family rows in the main index.")

    if gap_payload["duplicate_custom_validator_keys"] != duplicate_validators:
        fail("Gap register duplicate_custom_validator_keys drifted from live CUSTOM_VALIDATORS parsing.")

    validator_anchor_ids = set(gap_payload["validator_families_without_prose_anchor"])
    for row in rows:
        if row["logical_family_id"] in validator_anchor_ids and row["authoritative_prose_refs"]:
            fail(f"Gap register still marks a validator as anchorless after it gained prose refs: {row['logical_family_id']}")

    guard_anchor_ids = set(gap_payload["forensic_guard_families_without_prose_anchor"])
    for row in rows:
        if row["logical_family_id"] in guard_anchor_ids and row["authoritative_prose_refs"]:
            fail(f"Gap register still marks a guard as anchorless after it gained prose refs: {row['logical_family_id']}")

    summary = {
        "status": "PASS",
        "logical_family_count": len(rows),
        "schema_count": len(schema_paths),
        "constraint_count": len(expected_constraint_ids),
        "custom_validator_count": len(custom_validators),
        "forensic_guard_count": len(guard_symbols),
        "graph_node_count": len(graph_row_ids),
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
