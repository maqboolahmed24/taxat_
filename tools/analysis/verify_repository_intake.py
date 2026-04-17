#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
ALGORITHM_DIR = ROOT / "Algorithm"
PROMPT_DIR = ROOT / "PROMPT"
DOCS_ANALYSIS_DIR = ROOT / "docs" / "analysis"
DATA_ANALYSIS_DIR = ROOT / "data" / "analysis"
TOOLS_ANALYSIS_DIR = ROOT / "tools" / "analysis"
CHECKLIST_PATH = PROMPT_DIR / "Checklist.md"
README_PATH = ALGORITHM_DIR / "README.md"
FIRST_FIVE_CARD_IDS = [f"pc_{index:04d}" for index in range(1, 6)]
PROMPT_ABSOLUTE_PATH_PATTERN = re.compile(re.escape(str(ROOT)) + r"/[A-Za-z0-9_./#-]+")
CHECKLIST_TASK_PATTERN = re.compile(
    r"^- \[(?P<status>[ X-])\] `(?P<card_id>pc_\d{4})` (?P<slug>[^ ]+) "
    r"\(\[card\]\((?P<card_path>[^)]+)\)\)$"
)
ROLE_MISMATCH_HEURISTIC = re.compile(r"\b(schema|json|validator|python script)\b", re.IGNORECASE)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def repo_rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def text_sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def is_residue(relative_path: Path) -> tuple[bool, str | None, str | None]:
    if "__MACOSX" in relative_path.parts:
        return True, "MACOSX_DIRECTORY", "Archive packaging residue"
    if "__pycache__" in relative_path.parts or relative_path.suffix == ".pyc":
        return True, "PYTHON_BYTECODE", "Interpreter bytecode cache artifact"
    if relative_path.name == ".DS_Store":
        return True, "DS_STORE", "Finder metadata residue"
    if relative_path.name.startswith("._"):
        return True, "APPLEDOUBLE", "AppleDouble archive residue"
    return False, None, None


def file_type_key(path: Path, classification: str) -> str:
    if classification == "noncanonical_archive_residue":
        return "archive_residue"
    if path.name.endswith(".schema.json"):
        return "schema_json"
    if path.parent.name == "schemas" and path.name.startswith("sample_") and path.suffix == ".json":
        return "sample_json"
    if path.suffix == ".md":
        return "md"
    if path.suffix == ".py":
        return "py"
    return path.suffix.lstrip(".") or "no_extension"


def classify_path(path: Path) -> tuple[str, str]:
    relative_path = path.relative_to(ROOT)
    residue, residue_kind, _ = is_residue(relative_path)
    if residue:
        return "noncanonical_archive_residue", residue_kind or "RESIDUE"

    top = relative_path.parts[0]
    if top == "Algorithm":
        if path.name.endswith(".schema.json"):
            return "canonical_algorithm_source", "schema_contract"
        if path.parent.name == "schemas" and path.name.startswith("sample_") and path.suffix == ".json":
            return "canonical_algorithm_source", "schema_sample_payload"
        if path.suffix == ".md":
            return "canonical_algorithm_source", "markdown_corpus_document"
        if path.suffix == ".py":
            return "canonical_algorithm_source", "validator_or_guard_script"
        if path.name == "requirements-dev.txt":
            return "canonical_algorithm_source", "validator_dependency_manifest"
        return "canonical_algorithm_source", "auxiliary_algorithm_artifact"

    if top == "PROMPT":
        if relative_path.parent.name == "CARDS":
            return "prompt_scaffold", "task_card"
        if path.name == "AGENT.md":
            return "prompt_scaffold", "agent_protocol"
        if path.name == "Checklist.md":
            return "prompt_scaffold", "task_board"
        if path.name.startswith("shared_operating_contract_"):
            return "prompt_scaffold", "shared_operating_contract"
        return "prompt_scaffold", "prompt_support_artifact"

    if top in {"docs", "data", "tools"}:
        return "derived_analysis_output", "generated_analysis_artifact"

    if path.name.endswith(".zip"):
        return "archive_payload", "archive_payload"

    return "workspace_support", "workspace_support_artifact"


def discover_top_level_entries() -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for path in sorted(ROOT.iterdir(), key=lambda item: item.name):
        classification, subtype = classify_path(path)
        entries.append(
            {
                "path": repo_rel(path),
                "name": path.name,
                "entry_type": "directory" if path.is_dir() else "file",
                "classification": classification,
                "subtype": subtype,
                "exists": path.exists(),
            }
        )
    return entries


def collect_source_files() -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, dict[str, int]]]:
    file_records: list[dict[str, Any]] = []
    residue_records: list[dict[str, Any]] = []
    counts: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

    scan_roots: list[Path] = [ALGORITHM_DIR, PROMPT_DIR]
    root_level_files: list[Path] = [path for path in sorted(ROOT.iterdir(), key=lambda item: item.name) if path.is_file()]

    for path in scan_roots:
        for file_path in sorted(candidate for candidate in path.rglob("*") if candidate.is_file()):
            relative_path = file_path.relative_to(ROOT)
            if "__pycache__" in relative_path.parts or relative_path.suffix == ".pyc":
                continue
            classification, subtype = classify_path(file_path)
            residue, residue_kind, residue_reason = is_residue(relative_path)
            record = {
                "path": repo_rel(file_path),
                "classification": classification,
                "subtype": subtype,
                "file_type": file_type_key(file_path, classification),
                "size_bytes": file_path.stat().st_size,
                "sha256": sha256_file(file_path) if classification in {"canonical_algorithm_source", "prompt_scaffold"} else None,
            }
            file_records.append(record)
            counts[classification][record["file_type"]] += 1
            if residue:
                residue_records.append(
                    {
                        "path": repo_rel(file_path),
                        "residue_kind": residue_kind,
                        "reason": residue_reason,
                        "size_bytes": file_path.stat().st_size,
                    }
                )

    for file_path in root_level_files:
        relative_path = file_path.relative_to(ROOT)
        if "__pycache__" in relative_path.parts or relative_path.suffix == ".pyc":
            continue
        classification, subtype = classify_path(file_path)
        residue, residue_kind, residue_reason = is_residue(relative_path)
        record = {
            "path": repo_rel(file_path),
            "classification": classification,
            "subtype": subtype,
            "file_type": file_type_key(file_path, classification),
            "size_bytes": file_path.stat().st_size,
            "sha256": sha256_file(file_path) if classification in {"canonical_algorithm_source", "prompt_scaffold", "archive_payload"} else None,
        }
        file_records.append(record)
        counts[classification][record["file_type"]] += 1
        if residue:
            residue_records.append(
                {
                    "path": repo_rel(file_path),
                    "residue_kind": residue_kind,
                    "reason": residue_reason,
                    "size_bytes": file_path.stat().st_size,
                }
            )

    normalized_counts = {
        classification: dict(sorted(type_counts.items()))
        for classification, type_counts in sorted(counts.items())
    }
    return sorted(file_records, key=lambda item: item["path"]), sorted(residue_records, key=lambda item: item["path"]), normalized_counts


def discover_archive_payloads() -> list[dict[str, Any]]:
    payloads: list[dict[str, Any]] = []
    live_payloads = sorted(path for path in ROOT.glob("*.zip") if path.is_file())
    for path in live_payloads:
        payloads.append(
            {
                "path": repo_rel(path),
                "exists": True,
                "size_bytes": path.stat().st_size,
                "sha256": sha256_file(path),
                "source": "live_worktree",
            }
        )

    tracked_archive = run_git_command(["git", "ls-files", "--stage", "--", "Algorithm.zip"])
    if tracked_archive["returncode"] == 0 and tracked_archive["stdout"].strip() and not (ROOT / "Algorithm.zip").exists():
        payloads.append(
            {
                "path": "Algorithm.zip",
                "exists": False,
                "size_bytes": None,
                "sha256": None,
                "source": "tracked_in_git_index_missing_from_worktree",
            }
        )

    return payloads


def extract_markdown_section(text: str, heading: str) -> str:
    pattern = re.compile(rf"(?ms)^## {re.escape(heading)}\n(.*?)(?=^## |\Z)")
    match = pattern.search(text)
    if match is None:
        raise ValueError(f"Missing `## {heading}` section.")
    return match.group(1)


def parse_inventory_bullets(section_text: str) -> list[dict[str, Any]]:
    bullets: list[str] = []
    current: list[str] = []
    for line in section_text.splitlines():
        if line.startswith("- "):
            if current:
                bullets.append("\n".join(current))
            current = [line]
        elif current:
            current.append(line)
    if current:
        bullets.append("\n".join(current))

    parsed: list[dict[str, Any]] = []
    for bullet in bullets:
        title_match = re.search(r"- \*\*(.+?)\*\*:", bullet)
        title = title_match.group(1).strip() if title_match else "Untitled inventory bullet"
        tokens = re.findall(r"`([^`]+\.md)`", bullet)
        parsed.append({"title": title, "markdown_tokens": tokens, "bullet_text": bullet})
    return parsed


def build_readme_inventory_result() -> dict[str, Any]:
    readme_text = README_PATH.read_text()
    section = extract_markdown_section(readme_text, "What you get")
    bullets = parse_inventory_bullets(section)
    token_to_bullets: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for bullet in bullets:
        for token in bullet["markdown_tokens"]:
            token_to_bullets[Path(token).name].append(
                {
                    "title": bullet["title"],
                    "bullet_text": bullet["bullet_text"].replace("\n", " ").strip(),
                }
            )

    live_markdown_docs = sorted(path.name for path in ALGORITHM_DIR.glob("*.md") if path.name != "README.md")
    missing = [name for name in live_markdown_docs if name not in token_to_bullets]
    duplicates = {
        name: refs for name, refs in sorted(token_to_bullets.items()) if len(refs) > 1 and name in live_markdown_docs
    }
    extras = [name for name in sorted(token_to_bullets) if name not in live_markdown_docs]
    obvious_role_mismatches = []
    for name, refs in sorted(token_to_bullets.items()):
        if name not in live_markdown_docs:
            continue
        for ref in refs:
            if ROLE_MISMATCH_HEURISTIC.search(ref["title"]):
                obvious_role_mismatches.append(
                    {
                        "file": name,
                        "inventory_title": ref["title"],
                        "reason": "Heuristic role mismatch: inventory title looks non-markdown-specific",
                    }
                )

    return {
        "status": "PASS" if not missing and not duplicates and not extras and not obvious_role_mismatches else "FAIL",
        "live_top_level_markdown_count": len(live_markdown_docs),
        "inventory_markdown_entry_count": sum(len(refs) for refs in token_to_bullets.values()),
        "missing": missing,
        "duplicates": duplicates,
        "extras": extras,
        "obvious_role_mismatches": obvious_role_mismatches,
        "inventory_map": {name: refs for name, refs in sorted(token_to_bullets.items()) if name in live_markdown_docs},
        "review_mode": (
            "Exact live-tree coverage and uniqueness check plus an obvious-title-mismatch heuristic. "
            "Semantic role intent remains a corpus-maintained prose responsibility."
        ),
    }


def parse_checklist_entries() -> list[dict[str, str]]:
    entries: list[dict[str, str]] = []
    for line_number, line in enumerate(CHECKLIST_PATH.read_text().splitlines(), start=1):
        match = CHECKLIST_TASK_PATTERN.match(line)
        if not match:
            continue
        entries.append(
            {
                "line_number": line_number,
                "status": match.group("status"),
                "card_id": match.group("card_id"),
                "slug": match.group("slug"),
                "card_path": match.group("card_path"),
            }
        )
    return entries


def parse_frontmatter(path: Path) -> dict[str, str] | None:
    text = path.read_text()
    match = re.match(r"(?s)^---\n(.*?)\n---\n", text)
    if match is None:
        return None
    data: dict[str, str] = {}
    for line in match.group(1).splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        data[key.strip()] = value.strip().strip('"')
    return data


def verify_first_five_cards(checklist_entries: list[dict[str, str]]) -> dict[str, Any]:
    first_five = [entry for entry in checklist_entries if entry["card_id"] in FIRST_FIVE_CARD_IDS]
    first_five.sort(key=lambda item: item["card_id"])
    results = []
    missing_cards = []
    for expected_card_id in FIRST_FIVE_CARD_IDS:
        checklist_entry = next((entry for entry in first_five if entry["card_id"] == expected_card_id), None)
        if checklist_entry is None:
            missing_cards.append(expected_card_id)
            continue
        card_path = (PROMPT_DIR / Path(checklist_entry["card_path"])).resolve()
        header = parse_frontmatter(card_path) if card_path.exists() else None
        header_exists = header is not None
        slug_matches = bool(header and header.get("slug") == checklist_entry["slug"])
        id_matches = bool(header and header.get("id") == expected_card_id)
        results.append(
            {
                "card_id": expected_card_id,
                "checklist_slug": checklist_entry["slug"],
                "card_path": repo_rel(card_path),
                "card_exists": card_path.exists(),
                "metadata_header_exists": header_exists,
                "metadata_id_matches": id_matches,
                "metadata_slug_matches": slug_matches,
                "metadata_header": header,
            }
        )

    failures = [
        record["card_id"]
        for record in results
        if not (
            record["card_exists"]
            and record["metadata_header_exists"]
            and record["metadata_id_matches"]
            and record["metadata_slug_matches"]
        )
    ]
    failures.extend(missing_cards)
    return {
        "status": "PASS" if not failures else "FAIL",
        "checked_card_ids": FIRST_FIVE_CARD_IDS,
        "results": results,
        "missing_cards": missing_cards,
        "failures": sorted(failures),
    }


def discover_prompt_cards() -> list[dict[str, Any]]:
    cards: list[dict[str, Any]] = []
    for path in sorted((PROMPT_DIR / "CARDS").glob("pc_*.md")):
        header = parse_frontmatter(path)
        cards.append(
            {
                "path": repo_rel(path),
                "id": header.get("id") if header else None,
                "slug": header.get("slug") if header else None,
                "mode": header.get("mode") if header else None,
                "phase": header.get("phase") if header else None,
                "wave": header.get("wave") if header else None,
                "track": header.get("track") if header else None,
                "task_number": header.get("task_number") if header else None,
                "checklist_path": header.get("checklist_path") if header else None,
                "agent_path": header.get("agent_path") if header else None,
            }
        )
    return cards


def build_prompt_path_normalization() -> dict[str, Any]:
    records = []
    files_with_matches: set[str] = set()
    for path in sorted(PROMPT_DIR.rglob("*.md")):
        for line_number, line in enumerate(path.read_text().splitlines(), start=1):
            for match in PROMPT_ABSOLUTE_PATH_PATTERN.finditer(line):
                absolute_path = match.group(0)
                normalized = absolute_path.removeprefix(f"{ROOT.as_posix()}/")
                is_placeholder = "..." in normalized or "#" in normalized
                exists = False if is_placeholder else (ROOT / normalized).exists()
                resolution_status = "placeholder_pattern" if is_placeholder else ("resolved" if exists else "missing_target")
                records.append(
                    {
                        "file": repo_rel(path),
                        "line_number": line_number,
                        "absolute_path": absolute_path,
                        "normalized_repo_relative_path": normalized,
                        "normalized_target_exists": exists,
                        "resolution_status": resolution_status,
                    }
                )
                files_with_matches.add(repo_rel(path))
    unresolved = [
        record for record in records if record["resolution_status"] not in {"resolved", "placeholder_pattern"}
    ]
    return {
        "repo_root": ".",
        "detected_absolute_prefix": ROOT.as_posix(),
        "normalizations": records,
        "summary": {
            "files_with_absolute_paths": len(files_with_matches),
            "occurrences": len(records),
            "unresolved_occurrences": len(unresolved),
            "placeholder_occurrences": sum(
                1 for record in records if record["resolution_status"] == "placeholder_pattern"
            ),
        },
        "unresolved": unresolved,
    }


def run_git_command(command: list[str]) -> dict[str, Any]:
    completed = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, check=False)
    return {
        "command": " ".join(command),
        "returncode": completed.returncode,
        "stdout": completed.stdout,
        "stderr": completed.stderr,
    }


def summarize_text(text: str) -> dict[str, Any]:
    lines = text.splitlines()
    return {
        "line_count": len(lines),
        "head": lines[:20],
        "tail": lines[-20:] if len(lines) > 20 else lines,
        "sha256": text_sha256(text),
    }


def preferred_python() -> tuple[list[str], str]:
    venv_python = ROOT / ".venv" / "bin" / "python3"
    if venv_python.exists():
        return [str(venv_python)], (
            "System `python3` in this workspace is missing `jsonschema` and `referencing`; "
            "the authoritative documented command form therefore requires the virtualenv to be active "
            "or equivalent dependencies installed."
        )
    return ["python3"], "Validators executed with the active shell interpreter."


def run_validator_commands() -> list[dict[str, Any]]:
    python_prefix, environment_note = preferred_python()
    validators = [
        {
            "name": "validate_contracts_self_test",
            "documented_command": "python3 Algorithm/scripts/validate_contracts.py --self-test",
            "actual_command": python_prefix + ["Algorithm/scripts/validate_contracts.py", "--self-test"],
        },
        {
            "name": "forensic_contract_guard",
            "documented_command": "python3 Algorithm/tools/forensic_contract_guard.py",
            "actual_command": python_prefix + ["Algorithm/tools/forensic_contract_guard.py"],
        },
    ]

    results: list[dict[str, Any]] = []
    for validator in validators:
        started_at = utc_now()
        completed = subprocess.run(
            validator["actual_command"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        finished_at = utc_now()
        results.append(
            {
                "name": validator["name"],
                "documented_command": validator["documented_command"],
                "actual_command": " ".join(validator["actual_command"]),
                "working_directory": ".",
                "environment_note": environment_note,
                "started_at": started_at,
                "finished_at": finished_at,
                "returncode": completed.returncode,
                "status": "PASS" if completed.returncode == 0 else "FAIL",
                "stdout_summary": summarize_text(completed.stdout),
                "stderr_summary": summarize_text(completed.stderr),
            }
        )
    return results


def collect_git_state() -> dict[str, Any]:
    status = run_git_command(["git", "status", "--short"])
    lines = [line for line in status["stdout"].splitlines() if line.strip()]
    tracked_deleted = []
    for line in lines:
        xy = line[:2]
        path = line[3:]
        if "D" in xy:
            tracked_deleted.append(path)
    return {
        "status_command_returncode": status["returncode"],
        "dirty": bool(lines),
        "status_lines": lines,
        "tracked_deleted_paths": sorted(tracked_deleted),
    }


def build_findings(
    git_state: dict[str, Any],
    archive_payloads: list[dict[str, Any]],
    readme_inventory_result: dict[str, Any],
    prompt_path_normalization: dict[str, Any],
) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = [
        {
            "id": "ASSUMPTION_001_PROMPT_ABSOLUTE_PATHS_ARE_ENVIRONMENT_LOCAL",
            "severity": "info",
            "kind": "ASSUMPTION",
            "message": "Absolute macOS-style prompt scaffold paths are treated as environment-local hints and normalized to repo-relative paths in derived artifacts rather than edited in place.",
            "source_file": "PROMPT/AGENT.md",
            "source_heading_or_logical_block": "AGENT.md -> Coordination Files / Source Of Truth",
            "rationale": "The execution scaffold uses absolute local paths for operator convenience, but the task explicitly requires portable normalization.",
        },
        {
            "id": "ASSUMPTION_002_VALIDATOR_COMMANDS_REQUIRE_DEPENDENCY_READY_PYTHON",
            "severity": "info",
            "kind": "ASSUMPTION",
            "message": "The authoritative validator command form remains `python3 ...`, but this checkout requires `.venv` activation or equivalent dependency installation for successful execution.",
            "source_file": "Algorithm/README.md",
            "source_heading_or_logical_block": "README.md -> Validation",
            "rationale": "System `python3` in this workspace lacks validator dependencies while `.venv/bin/python3` is dependency-complete.",
        },
    ]

    if git_state["dirty"]:
        findings.append(
            {
                "id": "RISK_001_DIRTY_WORKTREE_LIVE_TREE_ONLY_INTAKE",
                "severity": "medium",
                "kind": "RISK",
                "message": "The repository worktree is dirty, so intake artifacts describe the live filesystem rather than a clean git checkout.",
                "source_file": "PROMPT/CARDS/pc_0001.md",
                "source_heading_or_logical_block": "pc_0001 -> Working Notes -> Mandatory edge cases",
                "rationale": (
                    "Tracked deletions and many modified/untracked files mean the intake proof is authoritative for the current tree, "
                    "not for a pristine historical baseline."
                ),
            }
        )

    if any(not payload["exists"] for payload in archive_payloads):
        findings.append(
            {
                "id": "RISK_002_TRACKED_ARCHIVE_PAYLOAD_MISSING",
                "severity": "medium",
                "kind": "RISK",
                "message": "The tracked `Algorithm.zip` payload is absent from the live worktree, so payload-level checksum verification is incomplete even though the extracted corpus is present.",
                "source_file": "PROMPT/CARDS/pc_0001.md",
                "source_heading_or_logical_block": "pc_0001 -> Working Notes -> Deliverables to create",
                "rationale": "The task requests zip checksums if payloads are present; the extracted corpus can be verified, but the missing tracked archive remains a reproducibility warning.",
            }
        )

    if readme_inventory_result["status"] == "PASS":
        findings.append(
            {
                "id": "ASSUMPTION_003_README_ROLE_TEXT_HAS_NO_OBVIOUS_MISMATCH",
                "severity": "info",
                "kind": "ASSUMPTION",
                "message": "README inventory completeness and uniqueness are exact for the live corpus, and no obvious bullet-title role mismatches were detected.",
                "source_file": "Algorithm/README.md",
                "source_heading_or_logical_block": "README.md -> What you get",
                "rationale": "The inventory mechanically covers every live top-level markdown document exactly once; semantic role nuance remains prose-maintained rather than fully machine-verifiable.",
            }
        )

    if prompt_path_normalization["summary"]["placeholder_occurrences"]:
        findings.append(
            {
                "id": "GAP_001_PROMPT_PLACEHOLDER_ABSOLUTE_PATH_TOKEN",
                "severity": "low",
                "kind": "GAP",
                "message": "The shared operating contract contains a placeholder absolute path token ending in `PROMPT/...`; it is portable after normalization but not a resolvable file target.",
                "source_file": "PROMPT/shared_operating_contract_0001_to_0005.md",
                "source_heading_or_logical_block": "Shared Operating Contract 0001 To 0005 -> Non-negotiable interpretation rules",
                "rationale": "The placeholder is harmless for execution but should remain documented so later tooling does not treat it as a missing concrete path.",
            }
        )

    return findings


def build_validation_results(
    validator_results: list[dict[str, Any]],
    readme_inventory_result: dict[str, Any],
    first_five_cards_result: dict[str, Any],
    prompt_path_normalization: dict[str, Any],
    findings: list[dict[str, Any]],
) -> dict[str, Any]:
    validator_failures = [result["name"] for result in validator_results if result["status"] != "PASS"]
    readme_failure = readme_inventory_result["status"] != "PASS"
    card_failure = first_five_cards_result["status"] != "PASS"
    normalization_failure = prompt_path_normalization["summary"]["unresolved_occurrences"] > 0

    blocking_failures = []
    if validator_failures:
        blocking_failures.append({"check": "validator_entrypoints", "details": validator_failures})
    if readme_failure:
        blocking_failures.append({"check": "readme_inventory", "details": readme_inventory_result})
    if card_failure:
        blocking_failures.append({"check": "first_five_cards", "details": first_five_cards_result})
    if normalization_failure:
        blocking_failures.append(
            {
                "check": "prompt_path_normalization",
                "details": prompt_path_normalization["unresolved"],
            }
        )

    warning_ids = [finding["id"] for finding in findings if finding["kind"] in {"RISK", "GAP"}]
    if blocking_failures:
        overall_status = "FAIL"
    elif warning_ids:
        overall_status = "PASS_WITH_WARNINGS"
    else:
        overall_status = "PASS"

    return {
        "generated_at": utc_now(),
        "overall_status": overall_status,
        "blocking_failures": blocking_failures,
        "warning_ids": warning_ids,
        "checks": {
            "validator_entrypoints": validator_results,
            "readme_inventory": readme_inventory_result,
            "first_five_prompt_cards": first_five_cards_result,
            "prompt_path_normalization": prompt_path_normalization,
        },
    }


def build_intake_manifest(
    top_level_entries: list[dict[str, Any]],
    file_records: list[dict[str, Any]],
    file_counts: dict[str, dict[str, int]],
    archive_payloads: list[dict[str, Any]],
    prompt_cards: list[dict[str, Any]],
    readme_inventory_result: dict[str, Any],
    validator_results: list[dict[str, Any]],
    findings: list[dict[str, Any]],
    git_state: dict[str, Any],
) -> dict[str, Any]:
    canonical_files = [
        record
        for record in file_records
        if record["classification"] in {"canonical_algorithm_source", "prompt_scaffold"}
    ]
    return {
        "generated_at": utc_now(),
        "repo_root": ".",
        "canonical_roots": [
            {"path": "Algorithm", "classification": "canonical_algorithm_source_root"},
            {"path": "PROMPT", "classification": "prompt_scaffold_root"},
        ],
        "top_level_entries": top_level_entries,
        "file_counts": file_counts,
        "archive_payloads": archive_payloads,
        "canonical_file_count": len(canonical_files),
        "canonical_files": canonical_files,
        "validator_entrypoints_discovered": [
            {
                "name": result["name"],
                "documented_command": result["documented_command"],
                "working_directory": result["working_directory"],
                "status": result["status"],
            }
            for result in validator_results
        ],
        "prompt_scaffold_cards": prompt_cards,
        "readme_inventory_compliance": {
            "status": readme_inventory_result["status"],
            "live_top_level_markdown_count": readme_inventory_result["live_top_level_markdown_count"],
            "inventory_markdown_entry_count": readme_inventory_result["inventory_markdown_entry_count"],
        },
        "git_state": git_state,
        "findings": findings,
    }


def render_checksum_file(file_records: list[dict[str, Any]], archive_payloads: list[dict[str, Any]]) -> str:
    lines = []
    for record in sorted(file_records, key=lambda item: item["path"]):
        if record["classification"] not in {"canonical_algorithm_source", "prompt_scaffold"}:
            continue
        if not record["sha256"]:
            continue
        lines.append(f"{record['sha256']}  {record['path']}")
    for payload in sorted(archive_payloads, key=lambda item: item["path"]):
        if payload["exists"] and payload["sha256"]:
            lines.append(f"{payload['sha256']}  {payload['path']}")
    return "\n".join(lines) + ("\n" if lines else "")


def render_repository_intake_doc(
    manifest: dict[str, Any],
    validation_results: dict[str, Any],
    residue_records: list[dict[str, Any]],
    prompt_path_normalization: dict[str, Any],
) -> str:
    validator_rows = []
    for validator in validation_results["checks"]["validator_entrypoints"]:
        validator_rows.append(
            f"| `{validator['name']}` | `{validator['status']}` | `{validator['documented_command']}` | `{validator['actual_command']}` |"
        )

    findings_rows = []
    for finding in manifest["findings"]:
        findings_rows.append(
            f"| `{finding['id']}` | `{finding['kind']}` | `{finding['severity']}` | {finding['message']} |"
        )

    residue_rows = []
    for residue in residue_records:
        residue_rows.append(
            f"| `{residue['path']}` | `{residue['residue_kind']}` | {residue['reason']} | `{residue['size_bytes']}` |"
        )

    file_count_rows = []
    for classification, counts in manifest["file_counts"].items():
        summary = ", ".join(f"{file_type}={count}" for file_type, count in counts.items())
        file_count_rows.append(f"| `{classification}` | {summary} |")

    return "\n".join(
        [
            "# Repository Intake And Archive Verification",
            "",
            "## Verdict",
            "",
            f"- Overall validation status: `{validation_results['overall_status']}`",
            f"- Canonical file count: `{manifest['canonical_file_count']}`",
            f"- README inventory status: `{validation_results['checks']['readme_inventory']['status']}`",
            f"- First five prompt cards status: `{validation_results['checks']['first_five_prompt_cards']['status']}`",
            f"- Prompt absolute-path normalization unresolved count: `{prompt_path_normalization['summary']['unresolved_occurrences']}`",
            "",
            "## Canonical Roots",
            "",
            "- `Algorithm/`: canonical source corpus",
            "- `PROMPT/`: execution scaffold",
            "- `docs/analysis/`, `data/analysis/`, `tools/analysis/`: derived intake outputs from this task",
            "",
            "## File Counts",
            "",
            "| Classification | Counts |",
            "| --- | --- |",
            *file_count_rows,
            "",
            "## Validator Execution",
            "",
            "| Validator | Status | Documented command | Actual execution |",
            "| --- | --- | --- | --- |",
            *validator_rows,
            "",
            "## Residue Inventory",
            "",
            f"- Residue entries discovered: `{len(residue_records)}`",
            "",
            "| Path | Kind | Reason | Size bytes |",
            "| --- | --- | --- | --- |",
            *(residue_rows or ["| _none_ | _n/a_ | _n/a_ | _n/a_ |"]),
            "",
            "## Findings",
            "",
            "| ID | Kind | Severity | Message |",
            "| --- | --- | --- | --- |",
            *findings_rows,
            "",
            "## Evidence Files",
            "",
            "- `data/analysis/archive_intake_manifest.json`",
            "- `data/analysis/archive_checksums.sha256`",
            "- `data/analysis/repository_validation_results.json`",
            "- `data/analysis/noncanonical_archive_residue.json`",
            "- `data/analysis/prompt_scaffold_path_normalization.json`",
            "",
        ]
    )


def render_source_precedence_doc(prompt_path_normalization: dict[str, Any]) -> str:
    normalization_rows = []
    for record in prompt_path_normalization["normalizations"]:
        normalization_rows.append(
            f"| `{record['file']}` | `{record['line_number']}` | `{record['absolute_path']}` | "
            f"`{record['normalized_repo_relative_path']}` | `{record['resolution_status']}` |"
        )

    return "\n".join(
        [
            "# Source Precedence And Repo Normalization",
            "",
            "## Source Precedence",
            "",
            "| Order | Layer | Source files | Source heading or logical block | Rationale |",
            "| --- | --- | --- | --- | --- |",
            "| 1 | Core execution spine | `Algorithm/core_engine.md` | `PROMPT/shared_operating_contract_0001_to_0005.md -> Authoritative source order item 1` | Primary end-to-end execution, manifest lifecycle, decision bundle contract, and system boundary pointer. |",
            "| 2 | Named module decomposition | `Algorithm/modules.md` | `PROMPT/shared_operating_contract_0001_to_0005.md -> Authoritative source order item 2` | Canonical reusable procedure decomposition for implementation planning. |",
            "| 3 | Canonical object, state, formula, and protocol semantics | `Algorithm/data_model.md`, `Algorithm/state_machines.md`, `Algorithm/invariants_and_gates.md`, `Algorithm/exact_gate_logic_and_decision_tables.md`, `Algorithm/compute_parity_and_trust_formulas.md`, `Algorithm/canonical_source_and_evidence_taxonomy.md`, `Algorithm/authority_interaction_protocol.md`, `Algorithm/amendment_and_drift_semantics.md` | `PROMPT/shared_operating_contract_0001_to_0005.md -> Authoritative source order item 3` | Governs core domain entities, transitions, gates, trust/parity math, evidence precedence, authority envelopes, and amendment semantics. |",
            "| 4 | Specialized bounded-domain contracts | `Algorithm/frontend_shell_and_interaction_law.md`, `Algorithm/collaboration_workspace_contract.md`, `Algorithm/customer_client_portal_experience_contract.md`, `Algorithm/admin_governance_console_architecture.md`, `Algorithm/northbound_api_and_session_contract.md`, `Algorithm/retention_and_privacy.md`, `Algorithm/security_and_runtime_hardening_contract.md`, `Algorithm/deployment_and_resilience_contract.md`, `Algorithm/replay_and_reproducibility_contract.md`, `Algorithm/manifest_and_config_freeze_contract.md`, `Algorithm/observability_and_audit_contract.md` | `PROMPT/shared_operating_contract_0001_to_0005.md -> Authoritative source order item 4` | Adds bounded-domain behavior without overriding the core engine or canonical object contracts. |",
            "| 5 | Machine enforcement artifacts | `Algorithm/schemas/*.schema.json`, `Algorithm/scripts/validate_contracts.py`, `Algorithm/tools/forensic_contract_guard.py` | `PROMPT/shared_operating_contract_0001_to_0005.md -> Authoritative source order item 5`; `Algorithm/README.md -> Validation` | Enforcement mirrors and closure gates that prove schema/document/forensic coherence. |",
            "| 6 | Support and coherence docs | `Algorithm/README.md`, `Algorithm/glossary.md`, `Algorithm/implementation_conventions.md`, `Algorithm/architecture_coherence_guardrails.md`, `Algorithm/contract_integrity_requirements.md`, `Algorithm/constraint_traceability_register.json`, `Algorithm/constraint_coverage_index.md`, `Algorithm/test_vectors.md` | `PROMPT/shared_operating_contract_0001_to_0005.md -> Authoritative source order item 6` | Support docs must stay synchronized with authoritative contracts and validator coverage. |",
            "| 7 | Historical closure docs | `Algorithm/AUDIT_FINDINGS.md`, `Algorithm/PATCH_RESOLUTION_INDEX.md` | `PROMPT/shared_operating_contract_0001_to_0005.md -> Authoritative source order item 7`; `Algorithm/README.md -> Reference document roles` | Historical defect closure evidence; authoritative for forensic lineage, not for overriding live domain behavior. |",
            "| 8 | Prompt execution scaffold | `PROMPT/AGENT.md`, `PROMPT/Checklist.md`, `PROMPT/CARDS/*.md`, `PROMPT/shared_operating_contract_*.md` | `PROMPT/AGENT.md -> Source Of Truth`; `PROMPT/CARDS/pc_0001.md -> Agent Instructions` | Governs task claim protocol and execution order; it never overrides the Algorithm corpus on domain behavior. |",
            "",
            "## Command Working-Directory Assumptions",
            "",
            "- The README-documented validator commands are repo-root relative and assume the current working directory is the repository root.",
            "- In this checkout, dependency-ready execution requires `.venv` activation or direct use of `.venv/bin/python3`.",
            "",
            "## Prompt Path Normalization",
            "",
            f"- Absolute path occurrences discovered: `{prompt_path_normalization['summary']['occurrences']}`",
            f"- Files with absolute paths: `{prompt_path_normalization['summary']['files_with_absolute_paths']}`",
            f"- Placeholder occurrences: `{prompt_path_normalization['summary']['placeholder_occurrences']}`",
            f"- Unresolved occurrences: `{prompt_path_normalization['summary']['unresolved_occurrences']}`",
            "",
            "| File | Line | Absolute path | Normalized repo-relative path | Resolution |",
            "| --- | --- | --- | --- | --- |",
            *(normalization_rows or ["| _none_ | _n/a_ | _n/a_ | _n/a_ | _n/a_ |"]),
            "",
        ]
    )


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")


def build_outputs() -> dict[str, Any]:
    top_level_entries = discover_top_level_entries()
    file_records, residue_records, file_counts = collect_source_files()
    archive_payloads = discover_archive_payloads()
    checklist_entries = parse_checklist_entries()
    first_five_cards_result = verify_first_five_cards(checklist_entries)
    prompt_cards = discover_prompt_cards()
    prompt_path_normalization = build_prompt_path_normalization()
    readme_inventory_result = build_readme_inventory_result()
    validator_results = run_validator_commands()
    git_state = collect_git_state()
    findings = build_findings(
        git_state=git_state,
        archive_payloads=archive_payloads,
        readme_inventory_result=readme_inventory_result,
        prompt_path_normalization=prompt_path_normalization,
    )
    validation_results = build_validation_results(
        validator_results=validator_results,
        readme_inventory_result=readme_inventory_result,
        first_five_cards_result=first_five_cards_result,
        prompt_path_normalization=prompt_path_normalization,
        findings=findings,
    )
    manifest = build_intake_manifest(
        top_level_entries=top_level_entries,
        file_records=file_records,
        file_counts=file_counts,
        archive_payloads=archive_payloads,
        prompt_cards=prompt_cards,
        readme_inventory_result=readme_inventory_result,
        validator_results=validator_results,
        findings=findings,
        git_state=git_state,
    )
    residue_payload = {
        "generated_at": utc_now(),
        "entries": residue_records,
        "summary": {
            "count": len(residue_records),
            "kinds": dict(sorted(Counter(record["residue_kind"] for record in residue_records).items())),
        },
    }
    checksum_text = render_checksum_file(file_records=file_records, archive_payloads=archive_payloads)
    intake_doc = render_repository_intake_doc(
        manifest=manifest,
        validation_results=validation_results,
        residue_records=residue_records,
        prompt_path_normalization=prompt_path_normalization,
    )
    precedence_doc = render_source_precedence_doc(prompt_path_normalization=prompt_path_normalization)

    DOCS_ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    DATA_ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)

    write_json(DATA_ANALYSIS_DIR / "archive_intake_manifest.json", manifest)
    (DATA_ANALYSIS_DIR / "archive_checksums.sha256").write_text(checksum_text)
    write_json(DATA_ANALYSIS_DIR / "repository_validation_results.json", validation_results)
    write_json(DATA_ANALYSIS_DIR / "noncanonical_archive_residue.json", residue_payload)
    write_json(DATA_ANALYSIS_DIR / "prompt_scaffold_path_normalization.json", prompt_path_normalization)
    (DOCS_ANALYSIS_DIR / "01_repository_intake_and_archive_verification.md").write_text(intake_doc)
    (DOCS_ANALYSIS_DIR / "01_source_precedence_and_repo_normalization.md").write_text(precedence_doc)

    return {
        "manifest": manifest,
        "validation_results": validation_results,
        "residue_payload": residue_payload,
        "prompt_path_normalization": prompt_path_normalization,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate deterministic repository intake artifacts.")
    parser.parse_args()

    outputs = build_outputs()
    summary = {
        "overall_status": outputs["validation_results"]["overall_status"],
        "canonical_file_count": outputs["manifest"]["canonical_file_count"],
        "readme_inventory_status": outputs["validation_results"]["checks"]["readme_inventory"]["status"],
        "first_five_cards_status": outputs["validation_results"]["checks"]["first_five_prompt_cards"]["status"],
        "validator_statuses": {
            result["name"]: result["status"]
            for result in outputs["validation_results"]["checks"]["validator_entrypoints"]
        },
        "residue_count": outputs["residue_payload"]["summary"]["count"],
        "prompt_absolute_path_occurrences": outputs["prompt_path_normalization"]["summary"]["occurrences"],
    }
    json.dump(summary, sys.stdout, indent=2, sort_keys=True)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
