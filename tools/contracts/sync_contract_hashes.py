#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_SOURCE_MAP = REPO_ROOT / "packages" / "contracts-core" / "data" / "schema_source_map.json"
SAMPLE_BINDING_MAP = REPO_ROOT / "packages" / "contracts-core" / "data" / "sample_binding_map.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_json(path: Path) -> dict:
    return json.loads(path.read_text())


def validate_hash(path: Path, expected: str, issues: list[str], label: str) -> None:
    if not path.exists():
        issues.append(f"Missing {label}: {path.relative_to(REPO_ROOT)}")
        return
    actual = sha256(path)
    if actual != expected:
        issues.append(
            f"Hash drift in {label}: {path.relative_to(REPO_ROOT)} expected {expected} but found {actual}"
        )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Verify imported contracts-core hashes still match the authoritative Algorithm bundle."
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Check the current source and destination hashes against the generated maps.",
    )
    args = parser.parse_args()

    if not args.check:
        print("Use --check to validate the stored import lineage hashes.", file=sys.stderr)
        return 2

    schema_source_map = load_json(SCHEMA_SOURCE_MAP)
    sample_binding_map = load_json(SAMPLE_BINDING_MAP)

    issues: list[str] = []
    schema_ids: set[str] = set()

    for validator in schema_source_map.get("validators", []):
        source_path = REPO_ROOT / validator["sourcePath"]
        destination_path = REPO_ROOT / validator["destinationPath"]
        validate_hash(source_path, validator["sourceHash"], issues, "validator source")
        validate_hash(
            destination_path, validator["destinationHash"], issues, "validator destination"
        )

    for schema in schema_source_map.get("schemas", []):
        source_path = REPO_ROOT / schema["sourcePath"]
        destination_path = REPO_ROOT / schema["destinationPath"]
        validate_hash(source_path, schema["sourceHash"], issues, "schema source")
        validate_hash(destination_path, schema["destinationHash"], issues, "schema destination")
        schema_id = schema["schemaId"]
        if schema_id in schema_ids:
            issues.append(f"Duplicate schema id recorded in schema_source_map.json: {schema_id}")
        schema_ids.add(schema_id)

    for sample in sample_binding_map.get("samples", []):
        source_path = REPO_ROOT / sample["sourcePath"]
        destination_path = REPO_ROOT / sample["destinationPath"]
        validate_hash(source_path, sample["sourceHash"], issues, "sample source")
        validate_hash(destination_path, sample["destinationHash"], issues, "sample destination")

    if issues:
        for issue in issues:
            print(issue)
        print(f"FAIL: {len(issues)} contract import drift issue(s) detected.")
        return 1

    print("PASS: imported contract hashes match the authoritative Algorithm bundle.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
