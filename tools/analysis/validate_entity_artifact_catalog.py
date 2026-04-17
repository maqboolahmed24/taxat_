#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

import build_entity_artifact_catalog as builder


REQUIRED_OUTPUTS = [
    builder.ENTITY_CATALOG_PATH,
    builder.ARTIFACT_CATALOG_PATH,
    builder.SCHEMA_OWNERSHIP_MATRIX_PATH,
    builder.READ_MODEL_PROJECTION_INDEX_PATH,
    builder.TRUTH_PROJECTION_BOUNDARY_MAP_PATH,
    builder.OBJECT_LIFECYCLE_COVERAGE_PATH,
    builder.AMBIGUOUS_SCHEMA_RECORDS_PATH,
    builder.ENTITY_DOC_PATH,
    builder.BOUNDARY_DOC_PATH,
    builder.LIFECYCLE_DOC_PATH,
    builder.RELATIONSHIP_DIAGRAM_PATH,
]
SCHEMA_MATRIX_FIELDS = [
    "schema_path",
    "schema_title",
    "catalog_object_id_or_null",
    "catalog_object_name_or_null",
    "ownership_class",
    "object_kind_or_null",
    "truth_class_or_null",
    "authoritative_prose_source_ref_or_null",
    "source_file",
    "source_heading_or_logical_block",
    "rationale",
]
ENTITY_FIELDS = [
    "object_id",
    "object_name",
    "object_kind",
    "authoritative_source_refs",
    "schema_path_or_paths",
    "primary_state_field_or_null",
    "truth_class",
    "write_authority_class",
    "visibility_classes",
    "retention_class_or_policy",
    "lineage_anchor_fields",
    "key_identity_fields",
    "produced_by_modules",
    "consumed_by_modules",
    "related_object_ids",
    "notes",
    "source_file",
    "source_heading_or_logical_block",
    "rationale",
]
PROJECTION_FIELDS = [
    "object_name",
    "object_id_or_null",
    "object_kind",
    "projection_role",
    "audience_classes",
    "shell_families",
    "truth_class",
    "schema_path_or_paths",
    "authoritative_source_refs",
    "source_status",
    "notes",
]
LIFECYCLE_FIELDS = [
    "object_id",
    "object_name",
    "coverage_class",
    "primary_state_field_or_null",
    "state_fields",
    "state_machine_refs",
    "source_heading_or_logical_block",
    "rationale",
]
BOUNDARY_FIELDS = [
    "object_id",
    "object_name",
    "object_kind",
    "truth_class",
    "write_authority_class",
    "boundary_family",
    "visibility_classes",
    "related_object_ids",
    "source_heading_or_logical_block",
    "rationale",
]
KNOWN_AUDIENCES = {
    builder.PORTAL_AUDIENCE,
    builder.WORKSPACE_AUDIENCE,
    builder.GOVERNANCE_AUDIENCE,
    builder.AUTHORITY_AUDIENCE,
    builder.INTERNAL_AUDIENCE,
    builder.AUDIT_AUDIENCE,
}


def fail(message: str) -> None:
    raise SystemExit(message)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def csv_row_string_map(row: dict[str, Any]) -> dict[str, str]:
    return {
        field: "" if row.get(field) is None else str(row.get(field))
        for field in SCHEMA_MATRIX_FIELDS
    }


def render_docs(outputs: dict[str, Any]) -> tuple[str, str, str]:
    entity_summary = outputs["entity_catalog"]["summary"]
    schema_rows = outputs["schema_matrix_rows"]
    projection_summary = outputs["read_model_projection_index"]["summary"]
    lifecycle_summary = outputs["object_lifecycle_coverage"]["summary"]
    ambiguous_summary = outputs["ambiguous_payload"]["summary"]

    entity_lines = [
        "# Entity, Artifact, and Schema Ownership",
        "",
        "## Summary",
        "",
        f"- Cataloged objects: `{entity_summary['object_count']}`",
        f"- Data-model object families: `{entity_summary['data_model_object_count']}`",
        f"- Doc-only supplemental objects: `{entity_summary['doc_only_object_count']}`",
        f"- Objects with direct schema bindings: `{entity_summary['schema_mapped_object_count']}`",
        f"- Classified schemas: `{len(schema_rows)}`",
        "",
        "## Object Kind Counts",
        "",
        "| Object Kind | Count |",
        "| --- | ---: |",
    ]
    for kind, count in entity_summary["object_kind_counts"].items():
        entity_lines.append(f"| `{kind}` | {count} |")
    entity_lines.extend(
        [
            "",
            "## Truth Classes",
            "",
            "| Truth Class | Count |",
            "| --- | ---: |",
        ]
    )
    for truth_class, count in entity_summary["truth_class_counts"].items():
        entity_lines.append(f"| `{truth_class}` | {count} |")

    boundary_lines = [
        "# Truth, Projection, and Control Boundary Matrix",
        "",
        f"- Projection rows: `{projection_summary['projection_row_count']}`",
        f"- Ambiguity rows: `{ambiguous_summary['row_count']}`",
        "",
        "## Projection Audiences",
        "",
        "| Audience | Count |",
        "| --- | ---: |",
    ]
    for audience, count in projection_summary["audience_counts"].items():
        boundary_lines.append(f"| `{audience}` | {count} |")
    boundary_lines.extend(
        [
            "",
            "## Shell Families",
            "",
            "| Shell Family | Count |",
            "| --- | ---: |",
        ]
    )
    for shell_family, count in projection_summary["shell_family_counts"].items():
        boundary_lines.append(f"| `{shell_family}` | {count} |")

    lifecycle_lines = [
        "# Mutability and Lifecycle Ownership Notes",
        "",
        f"- Lifecycle rows: `{lifecycle_summary['row_count']}`",
        "",
        "## Lifecycle Coverage",
        "",
        "| Coverage | Count |",
        "| --- | ---: |",
    ]
    for coverage_class, count in lifecycle_summary["coverage_counts"].items():
        lifecycle_lines.append(f"| `{coverage_class}` | {count} |")
    lifecycle_lines.extend(
        [
            "",
            "## Ambiguous Ownership Record Types",
            "",
            "| Record Type | Count |",
            "| --- | ---: |",
        ]
    )
    for record_type, count in ambiguous_summary["record_type_counts"].items():
        lifecycle_lines.append(f"| `{record_type}` | {count} |")

    return (
        "\n".join(entity_lines) + "\n",
        "\n".join(boundary_lines) + "\n",
        "\n".join(lifecycle_lines) + "\n",
    )


def render_mermaid(object_rows: list[dict[str, Any]]) -> str:
    lines = [
        "flowchart LR",
        "  classDef mutable fill:#121721,stroke:#5AA9FF,color:#F5F7FA;",
        "  classDef artifact fill:#181E29,stroke:#52C18C,color:#F5F7FA;",
        "  classDef control fill:#181E29,stroke:#E7B04B,color:#F5F7FA;",
        "  classDef projection fill:#181E29,stroke:#A7B1BF,color:#F5F7FA;",
        "",
    ]
    by_kind: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in object_rows:
        by_kind[row["object_kind"]].append(row)
    for object_kind in sorted(builder.OBJECT_KINDS):
        rows = sorted(by_kind.get(object_kind, []), key=lambda row: row["object_name"])
        if not rows:
            continue
        lines.append(f'  subgraph {builder.snake_case(object_kind)}["{object_kind}"]')
        for row in rows:
            lines.append(f'    {row["object_id"]}["{row["object_name"]}"]')
        lines.append("  end")
        lines.append("")
    for row in sorted(object_rows, key=lambda item: item["object_name"]):
        for related_object_id in row["related_object_ids"][:12]:
            lines.append(f'  {row["object_id"]} --> {related_object_id}')
    return "\n".join(lines) + "\n"


def main() -> int:
    for path in REQUIRED_OUTPUTS:
        if not path.exists():
            fail(f"Missing required artifact: {path}")

    outputs = builder.build_outputs()

    expected_entity_catalog = outputs["entity_catalog"]
    expected_artifact_catalog = outputs["artifact_catalog"]
    expected_read_model_projection_index = outputs["read_model_projection_index"]
    expected_truth_projection_boundary_map = outputs["truth_projection_boundary_map"]
    expected_object_lifecycle_coverage = outputs["object_lifecycle_coverage"]
    expected_ambiguous_payload = outputs["ambiguous_payload"]
    expected_schema_rows = [csv_row_string_map(row) for row in outputs["schema_matrix_rows"]]
    expected_entity_doc, expected_boundary_doc, expected_lifecycle_doc = render_docs(outputs)
    expected_mermaid = render_mermaid(outputs["entity_catalog"]["objects"])

    actual_entity_catalog = load_json(builder.ENTITY_CATALOG_PATH)
    if actual_entity_catalog != expected_entity_catalog:
        fail("entity_catalog.json drifted from the canonical builder output.")

    actual_artifact_catalog = load_json(builder.ARTIFACT_CATALOG_PATH)
    if actual_artifact_catalog != expected_artifact_catalog:
        fail("artifact_catalog.json drifted from the canonical builder output.")

    actual_schema_rows = list(csv.DictReader(builder.SCHEMA_OWNERSHIP_MATRIX_PATH.open()))
    if actual_schema_rows != expected_schema_rows:
        fail("schema_ownership_matrix.csv drifted from the canonical builder output.")

    actual_read_model_projection_index = load_json(builder.READ_MODEL_PROJECTION_INDEX_PATH)
    if actual_read_model_projection_index != expected_read_model_projection_index:
        fail("read_model_projection_index.json drifted from the canonical builder output.")

    actual_truth_projection_boundary_map = load_json(builder.TRUTH_PROJECTION_BOUNDARY_MAP_PATH)
    if actual_truth_projection_boundary_map != expected_truth_projection_boundary_map:
        fail("truth_vs_projection_boundary_map.json drifted from the canonical builder output.")

    actual_object_lifecycle_coverage = load_json(builder.OBJECT_LIFECYCLE_COVERAGE_PATH)
    if actual_object_lifecycle_coverage != expected_object_lifecycle_coverage:
        fail("object_lifecycle_coverage.json drifted from the canonical builder output.")

    actual_ambiguous_payload = load_json(builder.AMBIGUOUS_SCHEMA_RECORDS_PATH)
    if actual_ambiguous_payload != expected_ambiguous_payload:
        fail("unowned_or_ambiguous_schema_records.json drifted from the canonical builder output.")

    if builder.ENTITY_DOC_PATH.read_text() != expected_entity_doc:
        fail("08_entity_artifact_and_schema_ownership.md drifted from the canonical builder render.")
    if builder.BOUNDARY_DOC_PATH.read_text() != expected_boundary_doc:
        fail("08_truth_projection_control_boundary_matrix.md drifted from the canonical builder render.")
    if builder.LIFECYCLE_DOC_PATH.read_text() != expected_lifecycle_doc:
        fail("08_mutability_and_lifecycle_ownership_notes.md drifted from the canonical builder render.")
    if builder.RELATIONSHIP_DIAGRAM_PATH.read_text() != expected_mermaid:
        fail("08_entity_artifact_relationships.mmd drifted from the canonical builder render.")

    entity_rows = actual_entity_catalog["objects"]
    object_names = [row["object_name"] for row in entity_rows]
    object_ids = [row["object_id"] for row in entity_rows]
    if object_names != sorted(object_names):
        fail("entity_catalog.json objects are not sorted deterministically by object_name.")
    if len(object_names) != len(set(object_names)):
        fail("Duplicate object_name values detected in entity_catalog.json.")
    if len(object_ids) != len(set(object_ids)):
        fail("Duplicate object_id values detected in entity_catalog.json.")

    object_map = {row["object_name"]: row for row in entity_rows}
    for row in entity_rows:
        for field_name in ENTITY_FIELDS:
            if field_name not in row:
                fail(f"Entity `{row.get('object_name')}` is missing required field `{field_name}`.")
        if row["object_kind"] not in builder.OBJECT_KINDS:
            fail(f"Entity `{row['object_name']}` has invalid object_kind `{row['object_kind']}`.")
        if row["truth_class"] not in builder.TRUTH_CLASSES:
            fail(f"Entity `{row['object_name']}` has invalid truth_class `{row['truth_class']}`.")
        if row["write_authority_class"] not in builder.WRITE_AUTHORITY_CLASSES:
            fail(
                f"Entity `{row['object_name']}` has invalid write_authority_class "
                f"`{row['write_authority_class']}`."
            )
        if not row["authoritative_source_refs"]:
            fail(f"Entity `{row['object_name']}` has no authoritative_source_refs.")
        unexpected_visibility = sorted(set(row["visibility_classes"]) - KNOWN_AUDIENCES)
        if unexpected_visibility:
            fail(
                f"Entity `{row['object_name']}` has invalid visibility classes: {unexpected_visibility}"
            )

    expected_data_model_names = sorted(entry.object_name for entry in builder.parse_data_model_entries()[0])
    missing_data_model_names = sorted(set(expected_data_model_names) - set(object_names))
    if missing_data_model_names:
        fail(
            "Named object families from data_model.md are missing from entity_catalog.json: "
            f"{missing_data_model_names}"
        )

    schema_index = builder.parse_schema_index()
    actual_schema_titles = [row["schema_title"] for row in actual_schema_rows]
    if actual_schema_titles != sorted(schema_index):
        fail("schema_ownership_matrix.csv schema_title coverage drifted from the schema directory.")
    if len(actual_schema_titles) != len(set(actual_schema_titles)):
        fail("Duplicate schema_title values detected in schema_ownership_matrix.csv.")

    for row in actual_schema_rows:
        if row["ownership_class"] not in builder.SCHEMA_OWNERSHIP_CLASSES:
            fail(
                f"Schema `{row['schema_title']}` has invalid ownership_class `{row['ownership_class']}`."
            )
        if row["catalog_object_name_or_null"]:
            object_row = object_map[row["catalog_object_name_or_null"]]
            if object_row["object_id"] != row["catalog_object_id_or_null"]:
                fail(
                    f"Schema `{row['schema_title']}` points to mismatched object id "
                    f"`{row['catalog_object_id_or_null']}`."
                )

    ambiguous_rows = actual_ambiguous_payload["rows"]
    manual_owner_gaps = sorted(
        row["schema_title"]
        for row in ambiguous_rows
        if row["record_type"] == "schema_without_clear_prose_owner"
        and row["schema_title"] in builder.MANUAL_PROSE_OWNER_MAP
    )
    if manual_owner_gaps:
        fail(
            "Manual prose-owner schemas still appear as unresolved in the ambiguity register: "
            f"{manual_owner_gaps}"
        )

    actual_projection_rows = actual_read_model_projection_index["rows"]
    projection_names = [row["object_name"] for row in actual_projection_rows]
    if projection_names != sorted(projection_names):
        fail("read_model_projection_index.json rows are not sorted deterministically by object_name.")
    for row in actual_projection_rows:
        for field_name in PROJECTION_FIELDS:
            if field_name not in row:
                fail(f"Projection row `{row.get('object_name')}` is missing `{field_name}`.")
        if row["object_kind"] not in {"read_model", "projection"}:
            fail(
                f"Projection row `{row['object_name']}` has invalid object_kind `{row['object_kind']}`."
            )
        if row["truth_class"] != "projection_only":
            fail(f"Projection row `{row['object_name']}` must be projection_only.")

    required_projection_names: set[str] = set()
    for names in builder.DOC_OBJECTS.values():
        for name in names:
            if object_map.get(name, {}).get("object_kind") in {"read_model", "projection"}:
                required_projection_names.add(name)
    for name, meta in builder.MANUAL_DOC_ONLY_OBJECTS.items():
        if meta["object_kind"] in {"read_model", "projection"}:
            required_projection_names.add(name)
    missing_projection_names = sorted(required_projection_names - set(projection_names))
    if missing_projection_names:
        fail(
            "Read-model or projection names from the surface contracts are missing from "
            f"read_model_projection_index.json: {missing_projection_names}"
        )

    actual_lifecycle_rows = actual_object_lifecycle_coverage["rows"]
    lifecycle_names = {row["object_name"] for row in actual_lifecycle_rows}
    for row in actual_lifecycle_rows:
        for field_name in LIFECYCLE_FIELDS:
            if field_name not in row:
                fail(f"Lifecycle row `{row.get('object_name')}` is missing `{field_name}`.")
        if row["coverage_class"] not in builder.LIFECYCLE_COVERAGE_CLASSES:
            fail(
                f"Lifecycle row `{row['object_name']}` has invalid coverage_class `{row['coverage_class']}`."
            )

    state_machine_map = builder.parse_state_machine_map()
    missing_lifecycle_objects = sorted(set(state_machine_map) - lifecycle_names)
    if missing_lifecycle_objects:
        fail(
            "Objects with explicit state machines are missing from object_lifecycle_coverage.json: "
            f"{missing_lifecycle_objects}"
        )
    for object_name in sorted(state_machine_map):
        row = next(item for item in actual_lifecycle_rows if item["object_name"] == object_name)
        if row["coverage_class"] != "explicit":
            fail(f"State-machine object `{object_name}` is not marked explicit in lifecycle coverage.")
        if not row["state_machine_refs"]:
            fail(f"State-machine object `{object_name}` has no state_machine_refs.")

    actual_boundary_rows = actual_truth_projection_boundary_map["rows"]
    boundary_names = [row["object_name"] for row in actual_boundary_rows]
    if boundary_names != sorted(boundary_names):
        fail("truth_vs_projection_boundary_map.json rows are not sorted by object_name.")
    for row in actual_boundary_rows:
        for field_name in BOUNDARY_FIELDS:
            if field_name not in row:
                fail(f"Boundary row `{row.get('object_name')}` is missing `{field_name}`.")
        if row["object_kind"] not in builder.OBJECT_KINDS:
            fail(f"Boundary row `{row['object_name']}` has invalid object_kind `{row['object_kind']}`.")
        if row["truth_class"] not in builder.TRUTH_CLASSES:
            fail(f"Boundary row `{row['object_name']}` has invalid truth_class `{row['truth_class']}`.")

    artifact_rows = actual_artifact_catalog["rows"]
    if any(row["object_kind"] == "mutable_entity" for row in artifact_rows):
        fail("artifact_catalog.json includes mutable_entity rows.")

    summary = {
        "status": "PASS",
        "object_count": len(entity_rows),
        "schema_count": len(actual_schema_rows),
        "projection_row_count": len(actual_projection_rows),
        "lifecycle_explicit_count": Counter(
            row["coverage_class"] for row in actual_lifecycle_rows
        )["explicit"],
        "ambiguity_row_count": len(ambiguous_rows),
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
