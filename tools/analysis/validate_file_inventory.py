#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
ALGORITHM_DIR = ROOT / "Algorithm"
PROMPT_DIR = ROOT / "PROMPT"
DATA_ANALYSIS_DIR = ROOT / "data" / "analysis"

FILE_INVENTORY_JSON_PATH = DATA_ANALYSIS_DIR / "file_inventory_manifest.json"
FILE_INVENTORY_CSV_PATH = DATA_ANALYSIS_DIR / "file_inventory_manifest.csv"
HEADING_INVENTORY_PATH = DATA_ANALYSIS_DIR / "heading_inventory.jsonl"
SCHEMA_SAMPLE_INVENTORY_PATH = DATA_ANALYSIS_DIR / "schema_sample_inventory.json"
ORPHANED_FILES_PATH = DATA_ANALYSIS_DIR / "orphaned_or_unclassified_files.json"
FILE_ROLE_TAXONOMY_PATH = DATA_ANALYSIS_DIR / "file_role_taxonomy.json"

ALLOWED_PATH_KINDS = {
    "canonical_source",
    "prompt_scaffold",
    "archive_residue",
    "generated_output",
    "unknown",
}
ALLOWED_AUTHORITY_LEVELS = {
    "core_algorithm",
    "canonical_contract",
    "specialized_contract",
    "enforcement",
    "support_coherence",
    "historical_closure",
    "prompt_scaffold",
    "noncanonical_residue",
}


def load_json(path: Path):
    return json.loads(path.read_text())


def fail(message: str) -> None:
    raise SystemExit(message)


def main() -> int:
    required_paths = [
        FILE_INVENTORY_JSON_PATH,
        FILE_INVENTORY_CSV_PATH,
        HEADING_INVENTORY_PATH,
        SCHEMA_SAMPLE_INVENTORY_PATH,
        ORPHANED_FILES_PATH,
        FILE_ROLE_TAXONOMY_PATH,
    ]
    for path in required_paths:
        if not path.exists():
            fail(f"Missing required inventory artifact: {path}")

    inventory_manifest = load_json(FILE_INVENTORY_JSON_PATH)
    schema_sample_inventory = load_json(SCHEMA_SAMPLE_INVENTORY_PATH)
    _orphan_payload = load_json(ORPHANED_FILES_PATH)
    _taxonomy = load_json(FILE_ROLE_TAXONOMY_PATH)

    rows = inventory_manifest["rows"]
    paths = [row["path"] for row in rows]
    if paths != sorted(paths):
        fail("Inventory rows are not sorted deterministically by path.")
    if len(paths) != len(set(paths)):
        fail("Inventory contains duplicate paths.")

    csv_rows = list(csv.DictReader(FILE_INVENTORY_CSV_PATH.open()))
    if len(csv_rows) != len(rows):
        fail("CSV row count does not match JSON manifest row count.")

    heading_rows = [json.loads(line) for line in HEADING_INVENTORY_PATH.read_text().splitlines() if line.strip()]
    heading_paths = {row["path"] for row in heading_rows}
    markdown_paths = {
        row["path"]
        for row in rows
        if row["path"].endswith(".md") and row["path_kind"] in {"canonical_source", "prompt_scaffold"}
    }
    missing_heading_paths = sorted(markdown_paths - heading_paths)
    if missing_heading_paths:
        fail(f"Canonical markdown files missing heading inventory rows: {missing_heading_paths[:10]}")

    for row in rows:
        if row["path_kind"] not in ALLOWED_PATH_KINDS:
            fail(f"Unexpected path_kind for {row['path']}: {row['path_kind']}")
        if row["authority_level"] not in ALLOWED_AUTHORITY_LEVELS:
            fail(f"Unexpected authority_level for {row['path']}: {row['authority_level']}")
        if not row["sha256"]:
            fail(f"Missing checksum for {row['path']}")
        if row["path_kind"] in {"canonical_source", "prompt_scaffold"} and not row["authority_level"]:
            fail(f"Canonical row missing authority level: {row['path']}")

    canonical_rows = [row for row in rows if row["path_kind"] in {"canonical_source", "prompt_scaffold"}]
    unclassified_canonical_rows = [
        row["path"]
        for row in canonical_rows
        if row["authority_level"] == "noncanonical_residue" or not row["domain_family"]
    ]
    if unclassified_canonical_rows:
        fail(f"Canonical rows remain unclassified: {unclassified_canonical_rows[:10]}")

    schema_rows = [row for row in rows if row["path"].endswith(".schema.json")]
    schema_inventory_by_path = {
        entry["schema_path"]: entry for entry in schema_sample_inventory["schemas"]
    }
    for row in schema_rows:
        schema_inventory = schema_inventory_by_path.get(row["path"])
        if schema_inventory is None:
            fail(f"Schema missing from schema/sample inventory: {row['path']}")
        if not schema_inventory["related_sample_files"] and schema_inventory["sample_status"] != "no_sample_discovered":
            fail(f"Schema sample status mismatch for {row['path']}")

    live_inventory_paths = sorted(
        str(path.relative_to(ROOT))
        for root in (ALGORITHM_DIR, PROMPT_DIR)
        for path in root.rglob("*")
        if path.is_file()
    )
    manifest_paths = sorted(paths)
    if live_inventory_paths != manifest_paths:
        fail("Inventory manifest paths do not match the live Algorithm/ and PROMPT/ file set.")

    summary = {
        "status": "PASS",
        "row_count": len(rows),
        "heading_row_count": len(heading_rows),
        "schema_count": len(schema_rows),
        "markdown_count": len(markdown_paths),
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
