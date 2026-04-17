#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any
from collections import Counter

import build_state_machine_registry as builder


REQUIRED_OUTPUTS = [
    builder.REGISTRY_PATH,
    builder.EDGE_CSV_PATH,
    builder.INVARIANTS_PATH,
    builder.SCHEMA_COVERAGE_PATH,
    builder.COMPOUND_AXES_PATH,
    builder.AMBIGUITY_PATH,
    builder.STATE_MACHINE_DOC_PATH,
    builder.TERMINAL_DOC_PATH,
    builder.INVARIANT_DOC_PATH,
    builder.MERMAID_PATH,
]
EDGE_FIELDS = [
    "transition_id",
    "machine_id",
    "object_family",
    "state_field",
    "machine_class",
    "transition_kind",
    "raw_transition",
    "source_state_or_selector",
    "source_ref_kind",
    "event_code_or_null",
    "target_state_or_selector",
    "target_ref_kind",
    "source_file",
    "source_heading_or_logical_block",
    "rationale",
]


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

    outputs = builder.build_outputs()
    expected_registry = outputs["registry"]
    expected_edges = builder.edge_csv_rows(outputs["edges"])
    expected_invariants = outputs["invariants"]
    expected_schema_coverage = outputs["schema_coverage"]
    expected_compound_axes = outputs["compound_axes"]
    expected_ambiguities = outputs["ambiguities"]
    expected_machine_doc, expected_terminal_doc, expected_invariant_doc = builder.render_docs(outputs)
    expected_mermaid = builder.render_mermaid(outputs["registry"]["machines"])

    actual_registry = load_json(builder.REGISTRY_PATH)
    if actual_registry != expected_registry:
        fail("state_machine_registry.json drifted from the canonical builder output.")

    actual_edge_rows = list(csv.DictReader(builder.EDGE_CSV_PATH.open()))
    actual_edge_ids = [row["transition_id"] for row in actual_edge_rows]
    duplicate_edge_ids = sorted(
        transition_id for transition_id, count in Counter(actual_edge_ids).items() if count > 1
    )
    if duplicate_edge_ids:
        fail(f"Duplicate transition_id values detected in state_transition_edges.csv: {duplicate_edge_ids[:10]}")
    actual_edges = {row["transition_id"]: row for row in actual_edge_rows}
    expected_edges_by_id = {row["transition_id"]: row for row in expected_edges}
    if actual_edges != expected_edges_by_id:
        fail("state_transition_edges.csv drifted from the canonical builder output.")

    actual_invariants = load_jsonl(builder.INVARIANTS_PATH)
    diff = first_diff(expected_invariants, actual_invariants)
    if diff is not None:
        index, expected, actual = diff
        fail(f"state_machine_invariants.jsonl drifted at row {index}. Expected {expected}, got {actual}")

    actual_schema_coverage = load_json(builder.SCHEMA_COVERAGE_PATH)
    if actual_schema_coverage != expected_schema_coverage:
        fail("state_machine_schema_coverage.json drifted from the canonical builder output.")

    actual_compound_axes = load_json(builder.COMPOUND_AXES_PATH)
    if actual_compound_axes != expected_compound_axes:
        fail("compound_state_axes.json drifted from the canonical builder output.")

    actual_ambiguities = load_json(builder.AMBIGUITY_PATH)
    if actual_ambiguities != expected_ambiguities:
        fail("unmodeled_or_ambiguous_state_postures.json drifted from the canonical builder output.")

    if builder.STATE_MACHINE_DOC_PATH.read_text() != expected_machine_doc:
        fail("09_state_machine_definitions_and_transition_invariants.md drifted from the canonical builder render.")
    if builder.TERMINAL_DOC_PATH.read_text() != expected_terminal_doc:
        fail("09_terminal_recovery_and_supersession_matrix.md drifted from the canonical builder render.")
    if builder.INVARIANT_DOC_PATH.read_text() != expected_invariant_doc:
        fail("09_cross_state_invariant_index.md drifted from the canonical builder render.")
    if builder.MERMAID_PATH.read_text() != expected_mermaid:
        fail("09_state_machine_overview.mmd drifted from the canonical builder render.")

    registry_rows = actual_registry["machines"]
    machine_ids = [row["machine_id"] for row in registry_rows]
    if machine_ids != sorted(machine_ids):
        fail("Machine registry rows are not sorted deterministically by machine_id.")
    if len(machine_ids) != len(set(machine_ids)):
        fail("Duplicate machine_id values detected in the machine registry.")

    for row in registry_rows:
        if row["machine_class"] not in builder.STATE_MACHINE_CLASSES:
            fail(f"Machine `{row['machine_id']}` has invalid machine_class `{row['machine_class']}`.")
        if not row["authoritative_source_refs"]:
            fail(f"Machine `{row['machine_id']}` has no authoritative_source_refs.")

    expected_sections = sorted(
        {"6.1", "6.29"} | {section_id for spec in builder.MACHINE_SPECS for section_id, _ in (
            spec.state_sources + spec.explicit_transition_sources + spec.prose_transition_sources + spec.rule_sources
        )}
    )
    actual_sections = actual_registry["summary"]["represented_section_ids"]
    if actual_sections != expected_sections:
        fail(
            "Represented source sections drifted. "
            f"Expected {expected_sections}, got {actual_sections}"
        )

    explicit_edges_by_machine: dict[str, list[dict[str, str]]] = {}
    for row in actual_edges.values():
        if row["machine_class"] not in builder.STATE_MACHINE_CLASSES:
            fail(f"Edge `{row['transition_id']}` has invalid machine_class `{row['machine_class']}`.")
        if row["transition_kind"] not in builder.TRANSITION_KINDS:
            fail(f"Edge `{row['transition_id']}` has invalid transition_kind `{row['transition_kind']}`.")
        explicit_edges_by_machine.setdefault(row["machine_id"], []).append(row)

    for machine_id, rows in explicit_edges_by_machine.items():
        seen_explicit: set[str] = set()
        for row in rows:
            if row["transition_kind"] != "explicit_event_edge":
                continue
            if not row["event_code_or_null"].strip():
                fail(f"Explicit transition `{row['transition_id']}` is missing an event_code_or_null.")
            if row["raw_transition"] in seen_explicit:
                fail(f"Duplicate explicit raw transition detected for `{machine_id}`: {row['raw_transition']}")
            seen_explicit.add(row["raw_transition"])

    expected_explicit_transition_count = len(
        [row for row in outputs["edges"] if row["transition_kind"] == "explicit_event_edge"]
    )
    actual_explicit_transition_count = len(
        [row for row in actual_edges.values() if row["transition_kind"] == "explicit_event_edge"]
    )
    if actual_explicit_transition_count != expected_explicit_transition_count:
        fail(
            "Explicit transition count drifted from the source parser. "
            f"Expected {expected_explicit_transition_count}, got {actual_explicit_transition_count}"
        )

    invariants = actual_invariants
    invariant_ids = [row["invariant_id"] for row in invariants]
    if invariant_ids != sorted(invariant_ids):
        fail("Invariant rows are not sorted deterministically by invariant_id.")
    if len(invariant_ids) != len(set(invariant_ids)):
        fail("Duplicate invariant_id values detected.")
    invariant_classes = {row["invariant_class"] for row in invariants}
    if invariant_classes != {"global_state_machine_rule", "cross_state_invariant"}:
        fail(f"Unexpected invariant classes detected: {sorted(invariant_classes)}")

    cross_state_rows = [row for row in invariants if row["invariant_class"] == "cross_state_invariant"]
    global_rows = [row for row in invariants if row["invariant_class"] == "global_state_machine_rule"]
    if len(global_rows) != 9:
        fail(f"Expected 9 global state-machine rules, found {len(global_rows)}.")
    if len(cross_state_rows) != 20:
        fail(f"Expected 20 cross-state invariants, found {len(cross_state_rows)}.")

    coverage_rows = actual_schema_coverage["rows"]
    if len(coverage_rows) != len(registry_rows):
        fail("Schema coverage row count does not match machine registry row count.")
    coverage_by_machine = {row["machine_id"]: row for row in coverage_rows}
    for row in registry_rows:
        if row["machine_id"] not in coverage_by_machine:
            fail(f"Machine `{row['machine_id']}` is missing schema coverage.")
    for row in coverage_rows:
        if row["coverage_status"] not in builder.SCHEMA_COVERAGE_STATUSES:
            fail(f"Coverage row `{row['machine_id']}` has invalid coverage_status `{row['coverage_status']}`.")
        if row["schema_path"] and row["schema_path"] != coverage_by_machine[row["machine_id"]]["schema_path"]:
            fail(f"Coverage row `{row['machine_id']}` has inconsistent schema_path.")

    compound_group_ids = [row["compound_axis_id"] for row in actual_compound_axes["groups"]]
    if compound_group_ids != sorted(compound_group_ids):
        fail("Compound axis groups are not sorted deterministically by compound_axis_id.")
    if len(compound_group_ids) != len(set(compound_group_ids)):
        fail("Duplicate compound_axis_id values detected.")
    for row in actual_compound_axes["groups"]:
        for machine_id in row["machine_ids"]:
            if machine_id not in set(machine_ids):
                fail(f"Compound group `{row['compound_axis_id']}` references unknown machine `{machine_id}`.")

    ambiguity_rows = actual_ambiguities["rows"]
    ambiguity_ids = {
        (row["record_type"], row.get("object_family") or row.get("machine_id"), row.get("state_field") or "")
        for row in ambiguity_rows
    }
    if len(ambiguity_ids) != len(ambiguity_rows):
        fail("Duplicate ambiguity rows detected.")
    if not any(row["record_type"] == "conflicting_terminality_overlay" for row in ambiguity_rows):
        fail("The ambiguity register is missing the expected ExperienceCursor terminality conflict.")

    if "# State Machine Definitions and Transition Invariants" not in expected_machine_doc:
        fail("State machine doc title is missing.")
    if "# Terminal, Recovery, and Supersession Matrix" not in expected_terminal_doc:
        fail("Terminal/recovery doc title is missing.")
    if "# Cross-State Invariant Index" not in expected_invariant_doc:
        fail("Invariant doc title is missing.")

    summary = {
        "status": "PASS",
        "machine_count": len(registry_rows),
        "transition_count": len(actual_edges),
        "invariant_count": len(invariants),
        "schema_coverage_row_count": len(coverage_rows),
        "compound_group_count": len(actual_compound_axes["groups"]),
        "ambiguity_row_count": len(ambiguity_rows),
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
