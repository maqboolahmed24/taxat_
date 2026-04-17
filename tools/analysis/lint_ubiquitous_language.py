#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
DATA_ANALYSIS_DIR = ROOT / "data" / "analysis"
GLOSSARY_JSON_PATH = DATA_ANALYSIS_DIR / "glossary_normalized.json"
ALIAS_CONFLICTS_PATH = DATA_ANALYSIS_DIR / "term_alias_conflicts.json"
FIELD_TO_TERM_MAP_PATH = DATA_ANALYSIS_DIR / "field_to_term_map.json"

DEFAULT_SCAN_SUFFIXES = {".md", ".txt", ".rst"}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def fail(message: str) -> None:
    raise SystemExit(message)


def validate_outputs() -> dict[str, Any]:
    required_paths = [GLOSSARY_JSON_PATH, ALIAS_CONFLICTS_PATH, FIELD_TO_TERM_MAP_PATH]
    for path in required_paths:
        if not path.exists():
            fail(f"Missing required ubiquitous-language artifact: {path}")

    glossary_payload = load_json(GLOSSARY_JSON_PATH)
    alias_payload = load_json(ALIAS_CONFLICTS_PATH)
    field_payload = load_json(FIELD_TO_TERM_MAP_PATH)

    summary = glossary_payload["summary"]
    if summary["shared_spine_missing_fields"]:
        fail(f"Shared-spine fields missing from glossary map: {summary['shared_spine_missing_fields']}")
    if summary["glossary_coverage_failures"]:
        fail(f"Glossary coverage failures remain: {summary['glossary_coverage_failures']}")

    term_ids = {term["term_id"] for term in glossary_payload["terms"]}
    if len(term_ids) != len(glossary_payload["terms"]):
        fail("Normalized glossary contains duplicate term_id values.")

    for term in glossary_payload["terms"]:
        for required_key in [
            "term_id",
            "canonical_term",
            "term_category",
            "definition",
            "authoritative_source_refs",
            "machine_field_names",
            "canonical_contract_names",
            "allowed_aliases",
            "prohibited_aliases",
            "related_terms",
            "visibility_or_audience_notes",
            "drift_risk_level",
            "notes",
            "traceability",
        ]:
            if required_key not in term:
                fail(f"Term record missing required key `{required_key}`: {term}")

    for rule in glossary_payload["prohibited_alias_rules"]:
        if not rule["alias"] or not rule["canonical_replacement"] or not rule["rationale"]:
            fail(f"Malformed prohibited alias rule: {rule}")

    for row in field_payload["field_rows"]:
        if row["term_id"] not in term_ids:
            fail(f"Field-to-term map references unknown term_id: {row}")

    return {
        "glossary_payload": glossary_payload,
        "alias_payload": alias_payload,
        "field_payload": field_payload,
    }


def compile_rule_regex(alias: str) -> re.Pattern[str]:
    parts = [part for part in re.split(r"\s+", alias.strip()) if part]
    body = r"\s+".join(re.escape(part) for part in parts)
    return re.compile(rf"(?<![A-Za-z0-9_]){body}(?![A-Za-z0-9_])", re.IGNORECASE)


def strip_markdown_code(text: str) -> str:
    # Remove fenced code blocks before line-oriented scanning.
    text = re.sub(r"```.*?```", lambda match: "\n" * match.group(0).count("\n"), text, flags=re.S)
    text = re.sub(r"`[^`]+`", "", text)
    return text


def iter_target_files(paths: list[Path], include_suffixes: set[str]) -> list[Path]:
    discovered: list[Path] = []
    for path in paths:
        if path.is_file():
            if path.suffix.lower() in include_suffixes:
                discovered.append(path)
            continue
        for child in sorted(path.rglob("*")):
            if child.is_file() and child.suffix.lower() in include_suffixes:
                discovered.append(child)
    return discovered


def scan_paths(payload: dict[str, Any], paths: list[Path], include_machine_readable: bool) -> list[dict[str, Any]]:
    include_suffixes = set(DEFAULT_SCAN_SUFFIXES)
    if include_machine_readable:
        include_suffixes.update({".json", ".yaml", ".yml", ".csv"})

    rules = payload["glossary_payload"]["prohibited_alias_rules"]
    compiled_rules = [(rule, compile_rule_regex(rule["alias"])) for rule in rules]
    findings: list[dict[str, Any]] = []

    for path in iter_target_files(paths, include_suffixes):
        try:
            text = path.read_text()
        except UnicodeDecodeError:
            continue
        scanned_text = strip_markdown_code(text) if path.suffix.lower() in DEFAULT_SCAN_SUFFIXES else text
        for line_number, line in enumerate(scanned_text.splitlines(), start=1):
            for rule, pattern in compiled_rules:
                if not pattern.search(line):
                    continue
                findings.append(
                    {
                        "kind": "unknown_high_risk_alias",
                        "alias": rule["alias"],
                        "canonical_replacement": rule["canonical_replacement"],
                        "file": str(path),
                        "line_number": line_number,
                        "line_excerpt": line.strip(),
                        "rationale": rule["rationale"],
                        "risk_level": rule["risk_level"],
                    }
                )
    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate and optionally lint the ubiquitous-language map.")
    parser.add_argument("paths", nargs="*", help="Optional file or directory paths to scan for prohibited aliases.")
    parser.add_argument(
        "--include-machine-readable",
        action="store_true",
        help="Also scan JSON/YAML/CSV files. Default scan is markdown/text only.",
    )
    args = parser.parse_args()

    payload = validate_outputs()

    findings: list[dict[str, Any]] = []
    if args.paths:
        scan_targets = [Path(path).resolve() if not Path(path).is_absolute() else Path(path) for path in args.paths]
        findings = scan_paths(payload, scan_targets, include_machine_readable=args.include_machine_readable)
        if findings:
            print(json.dumps({"status": "FAIL", "findings": findings}, indent=2, sort_keys=True))
            return 1

    summary = {
        "status": "PASS",
        "term_count": payload["glossary_payload"]["summary"]["term_count"],
        "shared_spine_field_count": payload["glossary_payload"]["summary"]["shared_spine_field_count"],
        "prohibited_alias_rule_count": len(payload["glossary_payload"]["prohibited_alias_rules"]),
        "alias_conflict_count": len(payload["alias_payload"]["alias_conflicts"]),
        "ambiguous_field_token_count": len(payload["field_payload"]["ambiguous_field_tokens"]),
        "findings": findings,
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
