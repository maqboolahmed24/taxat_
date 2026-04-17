#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any

import build_module_dependency_graph as builder


REQUIRED_OUTPUTS = [
    builder.MODULE_CATALOG_PATH,
    builder.MODULE_EDGE_CSV_PATH,
    builder.MODULE_CALLSITE_INDEX_PATH,
    builder.SIDE_EFFECT_MATRIX_PATH,
    builder.SCHEMA_TOUCHPOINTS_PATH,
    builder.UNRESOLVED_CALLS_PATH,
    builder.MODULE_DOC_PATH,
    builder.PHASE_BINDING_DOC_PATH,
    builder.FAMILY_TAXONOMY_DOC_PATH,
    builder.MODULE_GRAPH_PATH,
]
REQUIRED_MODULE_FIELDS = [
    "module_name",
    "defined_in",
    "source_heading_or_logical_block",
    "module_family",
    "semantic_role",
    "inputs",
    "outputs",
    "stateful_side_effects",
    "artifact_writes",
    "audit_event_emissions",
    "state_transition_impacts",
    "external_boundary_crossing",
    "purity_class",
    "run_phase_bindings",
    "upstream_dependencies",
    "downstream_dependents",
    "related_schemas",
    "related_artifacts",
    "performance_notes",
    "security_notes",
    "notes",
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


def csv_rows_from_edges(edges: list[dict[str, Any]]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for row in edges:
        rows.append(
            {
                "edge_id": row["edge_id"],
                "upstream_module": row["upstream_module"],
                "downstream_module": row["downstream_module"],
                "dependency_type": row["dependency_type"],
                "rationale": row["rationale"],
                "source_refs": "; ".join(row["source_refs"]),
                "shared_artifacts": "; ".join(row["shared_artifacts"]),
                "run_phase_contexts": "; ".join(row["run_phase_contexts"]),
            }
        )
    return rows


def render_mermaid(records: list[dict[str, Any]], edges: list[dict[str, Any]]) -> str:
    lines = [
        "flowchart LR",
        "  classDef authorization fill:#121721,stroke:#5AA9FF,color:#F5F7FA;",
        "  classDef manifest fill:#181E29,stroke:#8AB4FF,color:#F5F7FA;",
        "  classDef compute fill:#181E29,stroke:#52C18C,color:#F5F7FA;",
        "  classDef authority fill:#181E29,stroke:#E7B04B,color:#F5F7FA;",
        "  classDef projection fill:#181E29,stroke:#A7B1BF,color:#F5F7FA;",
        "",
    ]
    records_by_family: dict[str, list[dict[str, Any]]] = {}
    for record in records:
        records_by_family.setdefault(record["module_family"], []).append(record)
    for family in builder.FAMILY_ORDER:
        family_records = sorted(records_by_family.get(family, []), key=lambda record: record["module_name"])
        if not family_records:
            continue
        lines.append(f'  subgraph {family}["{family}"]')
        for record in family_records:
            lines.append(f'    M_{record["module_name"]}["{record["module_name"]}"]')
        lines.append("  end")
        lines.append("")
    for edge in edges:
        lines.append(
            f'  M_{edge["upstream_module"]} -->|"{edge["dependency_type"]}"| M_{edge["downstream_module"]}'
        )
    return "\n".join(lines) + "\n"


def main() -> int:
    for path in REQUIRED_OUTPUTS:
        if not path.exists():
            fail(f"Missing required artifact: {path}")

    outputs = builder.build_outputs()
    expected_catalog = outputs["catalog"]
    expected_edges = outputs["edges"]
    expected_callsites = outputs["callsite_rows"]
    expected_side_effects = outputs["side_effects"]
    expected_touchpoints = outputs["schema_touchpoints"]
    expected_unresolved = outputs["unresolved"]

    actual_catalog = load_json(builder.MODULE_CATALOG_PATH)
    if actual_catalog != expected_catalog:
        fail("module_catalog.json drifted from the canonical builder output.")

    actual_edge_rows = list(csv.DictReader(builder.MODULE_EDGE_CSV_PATH.open()))
    expected_edge_rows = csv_rows_from_edges(expected_edges)
    if actual_edge_rows != expected_edge_rows:
        fail("module_dependency_edges.csv drifted from the canonical builder output.")

    actual_callsites = load_jsonl(builder.MODULE_CALLSITE_INDEX_PATH)
    diff = first_diff(expected_callsites, actual_callsites)
    if diff is not None:
        index, expected, actual = diff
        fail(f"module_callsite_index.jsonl drifted at row {index}. Expected {expected}, got {actual}")

    actual_side_effects = load_json(builder.SIDE_EFFECT_MATRIX_PATH)
    if actual_side_effects != expected_side_effects:
        fail("module_side_effect_matrix.json drifted from the canonical builder output.")

    actual_touchpoints = load_json(builder.SCHEMA_TOUCHPOINTS_PATH)
    if actual_touchpoints != expected_touchpoints:
        fail("module_schema_touchpoints.json drifted from the canonical builder output.")

    actual_unresolved = load_json(builder.UNRESOLVED_CALLS_PATH)
    if actual_unresolved != expected_unresolved:
        fail("unresolved_or_primitive_calls.json drifted from the canonical builder output.")

    raw_entries = builder.parse_module_headings()
    expected_module_names = sorted({name for entry in raw_entries for name in entry.module_names})
    actual_module_names = [row["module_name"] for row in actual_catalog["modules"]]
    if actual_module_names != expected_module_names:
        fail(
            "Canonical module name coverage drifted from `modules.md`. "
            f"Missing: {sorted(set(expected_module_names) - set(actual_module_names))}; "
            f"extra: {sorted(set(actual_module_names) - set(expected_module_names))}"
        )

    if len(actual_module_names) != len(set(actual_module_names)):
        fail("Duplicate module_name values detected in module_catalog.json.")

    for row in actual_catalog["modules"]:
        for field_name in REQUIRED_MODULE_FIELDS:
            if field_name not in row:
                fail(f"Module `{row.get('module_name')}` is missing required field `{field_name}`.")
        if row["module_family"] not in builder.FAMILY_ORDER:
            fail(f"Module `{row['module_name']}` has unexpected family `{row['module_family']}`.")
        if row["purity_class"] not in builder.PURITY_ORDER:
            fail(f"Module `{row['module_name']}` has unexpected purity `{row['purity_class']}`.")
        if row["external_boundary_crossing"] not in {"none", "authority", "browser_handoff", "notification", "storage"}:
            fail(
                f"Module `{row['module_name']}` has unexpected boundary `{row['external_boundary_crossing']}`."
            )
        if row["purity_class"] in {"state_mutator", "artifact_persister", "mixed"} and not (
            row["related_artifacts"] or row["related_schemas"]
        ):
            fail(
                f"State-changing module `{row['module_name']}` has no related artifacts or schema touchpoints."
            )

    catalog_name_set = set(actual_module_names)
    unresolved_name_set = {row["call_name"] for row in actual_unresolved["rows"]}
    step_rows = load_jsonl(builder.SWIMLANE_STEP_LEDGER_PATH)
    for step in step_rows:
        for call_name in step["call_names"]:
            if call_name not in catalog_name_set and call_name not in unresolved_name_set:
                fail(
                    f"RUN_ENGINE call `{call_name}` was neither cataloged in modules.md nor classified in the "
                    "unresolved helper register."
                )

    edge_keys: set[tuple[str, str, str]] = set()
    boundaries = {
        row["module_name"]: row["external_boundary_crossing"] for row in actual_catalog["modules"]
    }
    for row in actual_edge_rows:
        key = (row["upstream_module"], row["downstream_module"], row["dependency_type"])
        if key in edge_keys:
            fail(f"Duplicate dependency edge detected: {key}")
        edge_keys.add(key)
        if row["upstream_module"] not in catalog_name_set or row["downstream_module"] not in catalog_name_set:
            fail(f"Dependency edge references unknown modules: {key}")
        if row["dependency_type"] not in builder.DEPENDENCY_TYPES:
            fail(f"Dependency edge `{row['edge_id']}` has invalid dependency_type `{row['dependency_type']}`.")
        if len(row["rationale"].strip()) < 24:
            fail(f"Dependency edge `{row['edge_id']}` has underspecified rationale.")
        if row["dependency_type"] == "artifact_availability_dependency" and not row["shared_artifacts"].strip():
            fail(f"Artifact edge `{row['edge_id']}` is missing shared_artifacts.")
        if row["dependency_type"] == "external_boundary_dependency":
            if boundaries[row["upstream_module"]] == "none" and boundaries[row["downstream_module"]] == "none":
                fail(
                    f"External-boundary edge `{row['edge_id']}` has no authority/browser/notification boundary on "
                    "either endpoint."
                )

    touchpoint_modules = {row["module_name"] for row in actual_touchpoints["rows"]}
    for row in actual_catalog["modules"]:
        if row["related_schemas"] and row["module_name"] not in touchpoint_modules:
            fail(f"Module `{row['module_name']}` has related schemas but no schema touchpoint rows.")

    expected_mermaid = render_mermaid(actual_catalog["modules"], expected_edges)
    actual_mermaid = builder.MODULE_GRAPH_PATH.read_text()
    if actual_mermaid != expected_mermaid:
        fail("07_module_dependency_graph.mmd drifted from the canonical graph render.")

    module_doc = builder.MODULE_DOC_PATH.read_text()
    phase_doc = builder.PHASE_BINDING_DOC_PATH.read_text()
    family_doc = builder.FAMILY_TAXONOMY_DOC_PATH.read_text()
    if "# Module Catalog and Dependency Edges" not in module_doc:
        fail("Module catalog markdown doc title is missing.")
    if "# Phase-to-Module Binding" not in phase_doc:
        fail("Phase binding markdown doc title is missing.")
    if "# Module Families and Side-Effect Taxonomy" not in family_doc:
        fail("Family taxonomy markdown doc title is missing.")

    summary = {
        "status": "PASS",
        "canonical_module_count": len(actual_module_names),
        "dependency_edge_count": len(actual_edge_rows),
        "run_bound_module_count": actual_catalog["summary"]["run_bound_module_count"],
        "schema_touchpoint_row_count": actual_touchpoints["summary"]["touchpoint_row_count"],
        "unresolved_helper_count": actual_unresolved["summary"]["unresolved_or_primitive_call_count"],
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
