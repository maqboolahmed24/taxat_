#!/usr/bin/env python3
from __future__ import annotations

import ast
import csv
import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[2]
ALGORITHM_DIR = ROOT / "Algorithm"
DATA_ANALYSIS_DIR = ROOT / "data" / "analysis"
DOCS_ANALYSIS_DIR = ROOT / "docs" / "analysis"

FILE_INVENTORY_JSON_PATH = DATA_ANALYSIS_DIR / "file_inventory_manifest.json"
HEADING_INVENTORY_PATH = DATA_ANALYSIS_DIR / "heading_inventory.jsonl"
SCHEMA_SAMPLE_INVENTORY_PATH = DATA_ANALYSIS_DIR / "schema_sample_inventory.json"
CROSS_REFERENCE_JSON_PATH = DATA_ANALYSIS_DIR / "contract_schema_script_index.json"
CROSS_REFERENCE_CSV_PATH = DATA_ANALYSIS_DIR / "contract_schema_script_index.csv"
OBJECT_ENFORCEMENT_MAP_PATH = DATA_ANALYSIS_DIR / "object_family_to_enforcement_map.json"
ENFORCEMENT_GAP_REGISTER_PATH = DATA_ANALYSIS_DIR / "enforcement_gap_register.json"
INDEX_DOC_PATH = DOCS_ANALYSIS_DIR / "03_contract_schema_script_cross_reference_index.md"
COVERAGE_DOC_PATH = DOCS_ANALYSIS_DIR / "03_enforcement_coverage_report.md"
GRAPH_DOC_PATH = DOCS_ANALYSIS_DIR / "03_contract_enforcement_graph.mmd"

VALIDATOR_PATH = "Algorithm/scripts/validate_contracts.py"
GUARD_PATH = "Algorithm/tools/forensic_contract_guard.py"
CONSTRAINT_REGISTER_PATH = "Algorithm/constraint_traceability_register.json"
CONSTRAINT_COVERAGE_PATH = "Algorithm/constraint_coverage_index.md"
DATA_MODEL_PATH = "Algorithm/data_model.md"
STATE_MACHINES_PATH = "Algorithm/state_machines.md"

SUPPORT_DOC_PATHS = {
    "Algorithm/README.md",
    "Algorithm/UIUX_DESIGN_SKILL.md",
    "Algorithm/glossary.md",
    "Algorithm/implementation_conventions.md",
    "Algorithm/architecture_coherence_guardrails.md",
    "Algorithm/constraint_coverage_index.md",
    "Algorithm/embodiments_and_examples.md",
    "Algorithm/audit_and_provenance.md",
    "Algorithm/retention_error_and_observability_contract.md",
    "Algorithm/test_vectors.md",
}
HISTORICAL_CONTEXT_PATHS = {
    "Algorithm/AUDIT_FINDINGS.md",
    "Algorithm/PATCH_RESOLUTION_INDEX.md",
    "Algorithm/contract_integrity_requirements.md",
}
SEMANTIC_AUTHORITY_LEVELS = {"core_algorithm", "canonical_contract", "specialized_contract"}
GENERIC_OBJECT_KEYS = {"tenant", "user", "client", "override"}
COMMON_SUFFIX_TOKENS = {
    "contract",
    "schema",
    "state",
    "snapshot",
    "summary",
    "record",
    "result",
    "pack",
    "basis",
    "dashboard",
    "frame",
    "layer",
    "model",
    "protocol",
}
SPECIAL_OBJECT_PROSE_PATHS_RAW = {
    "constraint_traceability_register": [
        "Algorithm/README.md",
        "Algorithm/implementation_conventions.md",
        "Algorithm/architecture_coherence_guardrails.md",
        CONSTRAINT_COVERAGE_PATH,
    ]
}


@dataclass(frozen=True)
class HeadingInfo:
    path: str
    heading_text: str
    heading_slug: str
    heading_level: int
    line_number: int


@dataclass(frozen=True)
class SchemaInfo:
    schema_path: str
    schema_stem: str
    schema_title: str
    schema_id: str | None
    related_sample_files: tuple[str, ...]
    sample_status: str


@dataclass(frozen=True)
class DocInfo:
    path: str
    stem: str
    authority_level: str
    domain_family: str
    text: str
    normalized_text: str
    headings: tuple[HeadingInfo, ...]


@dataclass(frozen=True)
class SymbolInfo:
    name: str
    ref: str
    line_number: int | None
    expression: str | None = None


@dataclass
class StateMachineFamily:
    row_id: str
    display_name: str
    object_keys: tuple[str, ...]
    heading_ref: str


@dataclass
class FamilyRow:
    logical_family_id: str
    logical_family_name: str
    family_kind: str
    normalized_key: str
    authoritative_prose_refs: set[str] = field(default_factory=set)
    schema_refs: set[str] = field(default_factory=set)
    sample_refs: set[str] = field(default_factory=set)
    validator_refs: set[str] = field(default_factory=set)
    forensic_guard_refs: set[str] = field(default_factory=set)
    constraint_register_refs: set[str] = field(default_factory=set)
    historical_closure_refs: set[str] = field(default_factory=set)
    gap_notes: set[str] = field(default_factory=set)
    aliases: set[str] = field(default_factory=set)
    source_paths: set[str] = field(default_factory=set)

    def coverage_signature(self) -> str:
        parts: list[str] = []
        if self.authoritative_prose_refs:
            parts.append("prose")
        if self.schema_refs:
            parts.append("schema")
        if self.sample_refs:
            parts.append("sample")
        if self.validator_refs:
            parts.append("validator")
        if self.forensic_guard_refs:
            parts.append("guard")
        if self.constraint_register_refs:
            parts.append("constraint")
        if self.historical_closure_refs:
            parts.append("history")
        return "+".join(parts) if parts else "none"

    def coverage_status(self) -> str:
        has_prose = bool(self.authoritative_prose_refs)
        has_schema = bool(self.schema_refs)
        has_validator = bool(self.validator_refs)
        has_guard = bool(self.forensic_guard_refs)

        if has_prose and has_schema and has_validator and has_guard:
            return "fully_mapped"
        if has_prose and not any([has_schema, has_validator, has_guard]):
            return "doc_only"
        if has_schema and not any([has_prose, has_validator, has_guard]):
            return "schema_only"
        if (has_validator or has_guard) and not any([has_prose, has_schema]):
            return "validator_only"
        if not any([has_prose, has_schema, has_validator, has_guard]):
            return "gap"
        if not has_prose and (has_schema or has_validator or has_guard):
            return "gap"
        return "partially_mapped"

    def to_dict(self) -> dict[str, Any]:
        return {
            "logical_family_id": self.logical_family_id,
            "logical_family_name": self.logical_family_name,
            "family_kind": self.family_kind,
            "normalized_key": self.normalized_key,
            "coverage_status": self.coverage_status(),
            "coverage_signature": self.coverage_signature(),
            "authoritative_prose_refs": sorted(self.authoritative_prose_refs),
            "schema_refs": sorted(self.schema_refs),
            "sample_refs": sorted(self.sample_refs),
            "validator_refs": sorted(self.validator_refs),
            "forensic_guard_refs": sorted(self.forensic_guard_refs),
            "constraint_register_refs": sorted(self.constraint_register_refs),
            "historical_closure_refs": sorted(self.historical_closure_refs),
            "gap_notes": sorted(self.gap_notes),
            "aliases": sorted(self.aliases),
            "source_paths": sorted(self.source_paths),
        }


def repo_rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def json_load(path: Path) -> Any:
    return json.loads(path.read_text())


def json_write(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")


def camel_to_words(text: str) -> str:
    return re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", text)


def normalize_phrase(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", camel_to_words(text).lower()).strip()


def normalize_key(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", normalize_phrase(text))


def snake_to_pascal(text: str) -> str:
    return "".join(part.capitalize() for part in text.split("_") if part)


def sanitize_id(text: str) -> str:
    return re.sub(r"[^A-Z0-9]+", "_", text.upper()).strip("_")


def symbol_ref(path: str, symbol: str) -> str:
    return f"{path}::{symbol}"


def line_ref(path: str, line_number: int, label: str) -> str:
    safe_label = re.sub(r"[^A-Za-z0-9_.-]+", "_", label).strip("_") or "line"
    return f"{path}::L{line_number}[{safe_label}]"


def heading_ref(path: str, slug: str) -> str:
    return f"{path}#{slug}"


def ref_path(ref: str) -> str:
    return re.split(r"::|#", ref, maxsplit=1)[0]


def dedupe_sorted(values: Iterable[str]) -> list[str]:
    return sorted({value for value in values if value})


def load_headings() -> dict[str, list[HeadingInfo]]:
    headings_by_path: dict[str, list[HeadingInfo]] = defaultdict(list)
    for line in HEADING_INVENTORY_PATH.read_text().splitlines():
        if not line.strip():
            continue
        payload = json.loads(line)
        headings_by_path[payload["path"]].append(
            HeadingInfo(
                path=payload["path"],
                heading_text=payload["heading_text"],
                heading_slug=payload["heading_slug"],
                heading_level=payload["heading_level"],
                line_number=payload["line_number"],
            )
        )
    return {path: rows for path, rows in sorted(headings_by_path.items())}


def load_inventory() -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]], dict[str, DocInfo], dict[str, DocInfo]]:
    manifest_rows = json_load(FILE_INVENTORY_JSON_PATH)["rows"]
    rows_by_path = {row["path"]: row for row in manifest_rows}
    headings_by_path = load_headings()

    semantic_docs: dict[str, DocInfo] = {}
    all_contract_docs: dict[str, DocInfo] = {}
    for row in manifest_rows:
        path = row["path"]
        if not path.startswith("Algorithm/") or path.count("/") != 1 or not path.endswith(".md"):
            continue
        text = (ROOT / path).read_text()
        doc = DocInfo(
            path=path,
            stem=Path(path).stem,
            authority_level=row["authority_level"],
            domain_family=row["domain_family"],
            text=text,
            normalized_text=normalize_phrase(text),
            headings=tuple(headings_by_path.get(path, [])),
        )
        all_contract_docs[path] = doc
        if row["authority_level"] in SEMANTIC_AUTHORITY_LEVELS:
            semantic_docs[path] = doc
    return manifest_rows, rows_by_path, semantic_docs, all_contract_docs


def load_schemas() -> tuple[dict[str, SchemaInfo], dict[str, list[SchemaInfo]]]:
    payload = json_load(SCHEMA_SAMPLE_INVENTORY_PATH)
    schemas_by_key: dict[str, list[SchemaInfo]] = defaultdict(list)
    schemas_by_path: dict[str, SchemaInfo] = {}
    for entry in payload["schemas"]:
        schema = SchemaInfo(
            schema_path=entry["schema_path"],
            schema_stem=entry["schema_stem"],
            schema_title=entry["schema_title"] or snake_to_pascal(entry["schema_stem"]),
            schema_id=entry["schema_id"],
            related_sample_files=tuple(entry["related_sample_files"]),
            sample_status=entry["sample_status"],
        )
        schemas_by_path[schema.schema_path] = schema
        schemas_by_key[normalize_key(schema.schema_title)].append(schema)
        if normalize_key(schema.schema_title) != normalize_key(schema.schema_stem):
            schemas_by_key[normalize_key(schema.schema_stem)].append(schema)
    for key in list(schemas_by_key):
        unique_by_path = {schema.schema_path: schema for schema in schemas_by_key[key]}
        schemas_by_key[key] = [unique_by_path[path] for path in sorted(unique_by_path)]
    return schemas_by_path, dict(sorted(schemas_by_key.items()))


def extract_data_model_objects() -> dict[str, dict[str, Any]]:
    lines = (ROOT / DATA_MODEL_PATH).read_text().splitlines()
    current_section = "Data Model"
    objects: dict[str, dict[str, Any]] = {}
    for line_number, line in enumerate(lines, start=1):
        section_match = re.match(r"^##\s+(.+)$", line)
        if section_match:
            current_section = section_match.group(1).strip()
            continue
        bullet_match = re.match(r"^- \*\*(.+?)\*\*:", line)
        if not bullet_match:
            bullet_match = re.match(r"^- `([^`]+)`$", line)
        if not bullet_match:
            continue
        object_name = bullet_match.group(1).strip()
        if not re.match(r"^[A-Z][A-Za-z0-9]+$", object_name):
            continue
        key = normalize_key(object_name)
        entry = objects.setdefault(
            key,
            {
                "display_name": object_name,
                "refs": [],
                "section_names": set(),
            },
        )
        entry["refs"].append(line_ref(DATA_MODEL_PATH, line_number, object_name))
        entry["section_names"].add(current_section)
    for entry in objects.values():
        entry["refs"] = dedupe_sorted(entry["refs"])
        entry["section_names"] = sorted(entry["section_names"])
    return dict(sorted(objects.items()))


def extract_state_machine_families(headings_by_path: dict[str, list[HeadingInfo]]) -> tuple[list[StateMachineFamily], dict[str, list[str]]]:
    families: list[StateMachineFamily] = []
    refs_by_object_key: dict[str, list[str]] = defaultdict(list)
    for heading in headings_by_path.get(STATE_MACHINES_PATH, []):
        if heading.heading_level != 2:
            continue
        raw_names = re.findall(r"`([^`]+)`", heading.heading_text)
        object_names: list[str] = []
        for raw_name in raw_names:
            object_name = raw_name.split(".", maxsplit=1)[0]
            if re.match(r"^[A-Z][A-Za-z0-9]+$", object_name):
                object_names.append(object_name)
        if not object_names:
            continue
        object_keys = tuple(dict.fromkeys(normalize_key(name) for name in object_names))
        row_id = "STM_" + "_".join(sanitize_id(name) for name in object_names)
        ref = heading_ref(heading.path, heading.heading_slug)
        families.append(
            StateMachineFamily(
                row_id=row_id,
                display_name=" / ".join(object_names),
                object_keys=object_keys,
                heading_ref=ref,
            )
        )
        for key in object_keys:
            refs_by_object_key[key].append(ref)
    return families, {key: dedupe_sorted(values) for key, values in sorted(refs_by_object_key.items())}


def parse_validator_symbols() -> tuple[dict[str, SymbolInfo], dict[str, list[str]], dict[str, SymbolInfo]]:
    path = ROOT / VALIDATOR_PATH
    text = path.read_text()
    module = ast.parse(text)

    function_symbols: dict[str, SymbolInfo] = {}
    for node in module.body:
        if isinstance(node, ast.FunctionDef):
            function_symbols[node.name] = SymbolInfo(
                name=node.name,
                ref=symbol_ref(VALIDATOR_PATH, node.name),
                line_number=node.lineno,
            )

    custom_validators: dict[str, SymbolInfo] = {}
    duplicates: dict[str, list[str]] = defaultdict(list)
    for node in module.body:
        dict_node: ast.Dict | None = None
        if isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name) and node.target.id == "CUSTOM_VALIDATORS":
            dict_node = node.value if isinstance(node.value, ast.Dict) else None
        elif isinstance(node, ast.Assign):
            if any(isinstance(target, ast.Name) and target.id == "CUSTOM_VALIDATORS" for target in node.targets):
                dict_node = node.value if isinstance(node.value, ast.Dict) else None
        if dict_node is None:
            continue
        for key_node, value_node in zip(dict_node.keys, dict_node.values):
            if not isinstance(key_node, ast.Constant) or not isinstance(key_node.value, str):
                continue
            key = key_node.value
            expression = ast.get_source_segment(text, value_node)
            callable_name = infer_callable_name(value_node)
            if callable_name and callable_name in function_symbols:
                symbol = function_symbols[callable_name]
                info = SymbolInfo(
                    name=callable_name,
                    ref=symbol.ref,
                    line_number=symbol.line_number,
                    expression=expression,
                )
            else:
                info = SymbolInfo(
                    name=callable_name or key,
                    ref=symbol_ref(VALIDATOR_PATH, f"CUSTOM_VALIDATORS[{key}]"),
                    line_number=getattr(value_node, "lineno", None),
                    expression=expression,
                )
            if key in custom_validators:
                duplicates[key].append(info.ref)
            custom_validators[key] = info
        break
    return custom_validators, {key: sorted(value) for key, value in sorted(duplicates.items())}, function_symbols


def infer_callable_name(node: ast.AST) -> str | None:
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Lambda):
        return infer_callable_name(node.body)
    if isinstance(node, ast.Call):
        if isinstance(node.func, ast.Name):
            return node.func.id
        if isinstance(node.func, ast.Attribute):
            return node.func.attr
    return None


def parse_guard_symbols() -> tuple[list[SymbolInfo], dict[str, SymbolInfo]]:
    path = ROOT / GUARD_PATH
    text = path.read_text()
    module = ast.parse(text)

    function_symbols: dict[str, SymbolInfo] = {}
    for node in module.body:
        if isinstance(node, ast.FunctionDef):
            function_symbols[node.name] = SymbolInfo(
                name=node.name,
                ref=symbol_ref(GUARD_PATH, node.name),
                line_number=node.lineno,
            )

    guard_order: list[SymbolInfo] = []
    for node in module.body:
        if not isinstance(node, ast.FunctionDef) or node.name != "run_guard_checks":
            continue
        for child in ast.walk(node):
            if not isinstance(child, ast.For) or not isinstance(child.iter, ast.Tuple):
                continue
            for element in child.iter.elts:
                if isinstance(element, ast.Name) and element.id in function_symbols:
                    guard_order.append(function_symbols[element.id])
            break
        break
    return guard_order, function_symbols


def load_constraints() -> list[dict[str, Any]]:
    payload = json_load(ROOT / CONSTRAINT_REGISTER_PATH)
    return payload["entries"]


def make_aliases(*values: str | None) -> list[str]:
    aliases: list[str] = []
    for value in values:
        if not value:
            continue
        cleaned = value.strip()
        if not cleaned:
            continue
        aliases.append(cleaned)
        normalized = normalize_phrase(cleaned)
        if normalized and normalized != cleaned.lower():
            aliases.append(normalized)
        snake = re.sub(r"\s+", "_", normalized).strip("_")
        if snake and snake != cleaned:
            aliases.append(snake)
        if "_" in cleaned:
            aliases.append(cleaned.replace("_", " "))
            aliases.append(snake_to_pascal(cleaned))
        tokens = normalized.split()
        while len(tokens) > 1 and tokens[-1] in COMMON_SUFFIX_TOKENS:
            tokens = tokens[:-1]
            aliases.append(" ".join(tokens))
    return dedupe_sorted(aliases)


def should_use_broad_doc_search(display_name: str, schema_refs: list[SchemaInfo]) -> bool:
    if schema_refs:
        return True
    normalized = normalize_phrase(display_name)
    tokens = normalized.split()
    if normalize_key(display_name) in GENERIC_OBJECT_KEYS:
        return False
    return len(tokens) > 1 or len(normalized) >= 12


def search_docs(
    docs: dict[str, DocInfo],
    aliases: Iterable[str],
    *,
    max_results: int = 4,
    minimum_score: int = 10,
) -> list[str]:
    alias_list = [alias for alias in aliases if alias]
    scored_refs: Counter[str] = Counter()
    doc_level_scores: Counter[str] = Counter()

    for alias in alias_list:
        normalized_alias = normalize_phrase(alias)
        if not normalized_alias:
            continue
        for doc in docs.values():
            stem_score = 0
            if normalize_phrase(doc.stem) == normalized_alias:
                stem_score += 20
            elif normalized_alias in normalize_phrase(doc.stem):
                stem_score += 10
            if normalized_alias in doc.normalized_text:
                stem_score += 4
            if stem_score:
                doc_level_scores[doc.path] += stem_score
            for heading in doc.headings:
                heading_normalized = normalize_phrase(heading.heading_text)
                if heading_normalized == normalized_alias:
                    scored_refs[heading_ref(doc.path, heading.heading_slug)] += 20
                elif normalized_alias in heading_normalized:
                    scored_refs[heading_ref(doc.path, heading.heading_slug)] += 10

    for path, score in doc_level_scores.items():
        scored_refs[path] += score

    ranked = [
        ref
        for ref, score in sorted(scored_refs.items(), key=lambda item: (-item[1], item[0]))
        if score >= minimum_score
    ]
    return ranked[:max_results]


def build_object_rows(
    data_model_objects: dict[str, dict[str, Any]],
    schemas_by_key: dict[str, list[SchemaInfo]],
    semantic_docs: dict[str, DocInfo],
    state_machine_refs_by_key: dict[str, list[str]],
    custom_validators: dict[str, SymbolInfo],
    guards: list[SymbolInfo],
    constraints: list[dict[str, Any]],
) -> dict[str, FamilyRow]:
    guard_refs_by_key: dict[str, list[str]] = defaultdict(list)
    for guard in guards:
        base_name = guard.name.removeprefix("check_")
        guard_refs_by_key[normalize_key(base_name)].append(guard.ref)

    rows: dict[str, FamilyRow] = {}
    all_keys = sorted(set(data_model_objects) | set(schemas_by_key) | set(state_machine_refs_by_key))
    for key in all_keys:
        schema_infos = schemas_by_key.get(key, [])
        data_model_info = data_model_objects.get(key)
        display_name = (
            (data_model_info or {}).get("display_name")
            or (schema_infos[0].schema_title if schema_infos else None)
            or snake_to_pascal(schema_infos[0].schema_stem if schema_infos else key)
        )
        row = FamilyRow(
            logical_family_id="OBJ_" + sanitize_id(display_name),
            logical_family_name=display_name,
            family_kind="object_family",
            normalized_key=key,
        )
        row.aliases.update(make_aliases(display_name, *(schema.schema_stem for schema in schema_infos), *(schema.schema_title for schema in schema_infos)))

        if data_model_info:
            row.authoritative_prose_refs.update(data_model_info["refs"])
            row.aliases.update(data_model_info["section_names"])
            row.source_paths.add(DATA_MODEL_PATH)

        if key in state_machine_refs_by_key:
            row.authoritative_prose_refs.update(state_machine_refs_by_key[key])
            row.source_paths.add(STATE_MACHINES_PATH)

        if key in {normalize_key(name) for name in SPECIAL_OBJECT_PROSE_PATHS_RAW}:
            for name, refs in SPECIAL_OBJECT_PROSE_PATHS_RAW.items():
                if normalize_key(name) == key:
                    row.authoritative_prose_refs.update(refs)

        for schema in schema_infos:
            row.schema_refs.add(schema.schema_path)
            row.sample_refs.update(schema.related_sample_files)
            row.source_paths.add(schema.schema_path)

        validator_symbol = custom_validators.get(schema_infos[0].schema_stem if schema_infos else "")
        if validator_symbol:
            row.validator_refs.add(validator_symbol.ref)
        elif key in {normalize_key(kind) for kind in custom_validators}:
            for kind, symbol in custom_validators.items():
                if normalize_key(kind) == key:
                    row.validator_refs.add(symbol.ref)

        row.forensic_guard_refs.update(guard_refs_by_key.get(key, []))

        if should_use_broad_doc_search(display_name, schema_infos):
            doc_aliases = make_aliases(display_name, *(schema.schema_stem for schema in schema_infos), *(schema.schema_title for schema in schema_infos))
            row.authoritative_prose_refs.update(search_docs(semantic_docs, doc_aliases))

        if not row.authoritative_prose_refs:
            row.gap_notes.add("No clear semantic prose anchor was found for this object family.")
        if not row.schema_refs:
            row.gap_notes.add("No schema artifact was found for this prose object family.")
        if not row.validator_refs and not row.forensic_guard_refs:
            row.gap_notes.add("No direct custom validator or forensic guard was found for this family.")

        linked_constraints = find_constraints_for_row(row, constraints)
        row.constraint_register_refs.update(linked_constraints)
        rows[key] = row
    return dict(sorted(rows.items()))


def find_constraints_for_row(row: FamilyRow, constraints: list[dict[str, Any]]) -> list[str]:
    schema_paths = {ref_path(ref) for ref in row.schema_refs}
    prose_paths = {ref_path(ref) for ref in row.authoritative_prose_refs}
    linked: list[str] = []
    for entry in constraints:
        entry_paths = {
            *[qualify_algorithm_ref(value) for value in extract_ref_paths(entry.get("authoritative_refs", []))],
            *[qualify_algorithm_ref(value) for value in extract_ref_paths(entry.get("downstream_refs", []))],
        }
        if schema_paths & entry_paths or prose_paths & entry_paths:
            linked.append(f"{CONSTRAINT_REGISTER_PATH}#{entry['constraint_id']}")
    return dedupe_sorted(linked)


def extract_ref_paths(refs: Iterable[Any]) -> list[str]:
    paths: list[str] = []
    for ref in refs:
        if isinstance(ref, str):
            paths.append(ref)
        elif isinstance(ref, dict) and isinstance(ref.get("path"), str):
            paths.append(ref["path"])
    return paths


def qualify_algorithm_ref(value: str) -> str:
    stripped = value.strip()
    if not stripped:
        return stripped
    if stripped.startswith("Algorithm/"):
        return stripped
    return f"Algorithm/{stripped}"


def historical_refs_for_aliases(historical_docs: dict[str, DocInfo], aliases: Iterable[str], *, minimum_score: int = 10) -> list[str]:
    return search_docs(historical_docs, aliases, max_results=3, minimum_score=minimum_score)


def build_constraint_rows(
    constraints: list[dict[str, Any]],
    historical_docs: dict[str, DocInfo],
    object_rows: dict[str, FamilyRow],
) -> list[FamilyRow]:
    rows: list[FamilyRow] = []
    live_constraint_validator_refs = [
        symbol_ref(VALIDATOR_PATH, "validate_live_constraint_traceability_register"),
        symbol_ref(VALIDATOR_PATH, "validate_constraint_traceability_register_payload_shape"),
        symbol_ref(VALIDATOR_PATH, "validate_constraint_traceability_register_payload"),
    ]
    live_constraint_guard_refs = [symbol_ref(GUARD_PATH, "check_constraint_traceability_register")]

    object_rows_by_schema_path: dict[str, FamilyRow] = {}
    for row in object_rows.values():
        for schema_ref in row.schema_refs:
            object_rows_by_schema_path[ref_path(schema_ref)] = row

    for entry in constraints:
        row = FamilyRow(
            logical_family_id="CONSTRAINT_" + sanitize_id(entry["constraint_id"]),
            logical_family_name=entry["constraint_name"],
            family_kind="constraint_family",
            normalized_key=normalize_key(entry["constraint_id"]),
        )
        row.authoritative_prose_refs.update(qualify_algorithm_ref(value) for value in extract_ref_paths(entry.get("authoritative_refs", [])))
        downstream_paths = [qualify_algorithm_ref(value) for value in extract_ref_paths(entry.get("downstream_refs", []))]
        row.schema_refs.update(path for path in downstream_paths if path.endswith(".schema.json"))
        row.sample_refs.update(qualify_algorithm_ref(value) for value in extract_ref_paths(entry.get("example_refs", [])))
        row.validator_refs.update(live_constraint_validator_refs)
        row.validator_refs.add(symbol_ref(VALIDATOR_PATH, "run_repo_coherence_checks"))
        row.forensic_guard_refs.update(live_constraint_guard_refs)
        row.constraint_register_refs.add(f"{CONSTRAINT_REGISTER_PATH}#{entry['constraint_id']}")
        row.constraint_register_refs.add(f"{CONSTRAINT_COVERAGE_PATH}#active-named-constraint-register")

        aliases = make_aliases(
            entry["constraint_id"],
            entry["constraint_name"],
            entry.get("constraint_family"),
            entry.get("architectural_rationale"),
            *(Path(path).stem for path in row.authoritative_prose_refs),
            *(Path(path).stem for path in row.schema_refs),
        )
        row.aliases.update(aliases)
        row.historical_closure_refs.update(historical_refs_for_aliases(historical_docs, aliases, minimum_score=6))

        for schema_path in row.schema_refs:
            object_row = object_rows_by_schema_path.get(ref_path(schema_path))
            if object_row is None:
                continue
            row.validator_refs.update(object_row.validator_refs)
            row.forensic_guard_refs.update(object_row.forensic_guard_refs)
        if not row.historical_closure_refs:
            row.gap_notes.add("No historical closure document matched this live constraint family directly.")
        rows.append(row)
    return sorted(rows, key=lambda row: row.logical_family_id)


def build_validator_rows(
    custom_validators: dict[str, SymbolInfo],
    duplicate_validators: dict[str, list[str]],
    function_symbols: dict[str, SymbolInfo],
    object_rows: dict[str, FamilyRow],
    constraints: list[dict[str, Any]],
    historical_docs: dict[str, DocInfo],
) -> list[FamilyRow]:
    rows: list[FamilyRow] = []
    object_rows_by_key = object_rows

    for kind, symbol in sorted(custom_validators.items()):
        key = normalize_key(kind)
        object_row = object_rows_by_key.get(key)
        display_name = object_row.logical_family_name if object_row else snake_to_pascal(kind)
        row = FamilyRow(
            logical_family_id="VAL_" + sanitize_id(kind),
            logical_family_name=display_name,
            family_kind="validator_family",
            normalized_key=key,
        )
        row.aliases.update(make_aliases(kind, display_name))
        row.validator_refs.add(symbol_ref(VALIDATOR_PATH, f"CUSTOM_VALIDATORS[{kind}]"))
        row.validator_refs.add(symbol.ref)
        if object_row:
            row.authoritative_prose_refs.update(object_row.authoritative_prose_refs)
            row.schema_refs.update(object_row.schema_refs)
            row.sample_refs.update(object_row.sample_refs)
            row.forensic_guard_refs.update(object_row.forensic_guard_refs)
            row.constraint_register_refs.update(object_row.constraint_register_refs)
            row.historical_closure_refs.update(object_row.historical_closure_refs)
        else:
            row.gap_notes.add("No object-family bridge was found for this custom validator.")

        if kind in duplicate_validators:
            row.gap_notes.add("CUSTOM_VALIDATORS contains duplicate key definitions; the last mapping wins at runtime.")
        if not row.authoritative_prose_refs:
            row.gap_notes.add("No clear prose anchor was found for this custom validator.")
            row.historical_closure_refs.update(historical_refs_for_aliases(historical_docs, row.aliases, minimum_score=8))
        rows.append(row)

    pipeline_rows: list[tuple[str, str, list[str], list[str], list[str]]] = [
        (
            "run_schema_validation",
            "Schema validation pipeline",
            [],
            [],
            ["Generic orchestration stage; it validates every schema but is not itself a domain-semantic owner."],
        ),
        (
            "run_schema_shape_validation",
            "Schema shape validation pipeline",
            [],
            [],
            ["Generic schema-shape guard stage; it checks validator assumptions across the corpus."],
        ),
        (
            "run_repo_coherence_checks",
            "Repository coherence validation",
            [
                "Algorithm/README.md",
                "Algorithm/implementation_conventions.md",
                "Algorithm/architecture_coherence_guardrails.md",
                "Algorithm/constraint_coverage_index.md",
            ],
            [symbol_ref(GUARD_PATH, "check_constraint_traceability_register"), symbol_ref(GUARD_PATH, "check_corpus_reference_docs")],
            [],
        ),
        (
            "run_sample_validation",
            "Sample payload validation",
            ["Algorithm/test_vectors.md"],
            [],
            [],
        ),
        (
            "run_guard_validation",
            "Forensic guard execution",
            ["Algorithm/README.md", "Algorithm/architecture_coherence_guardrails.md"],
            [symbol_ref(GUARD_PATH, "run_guard_checks")],
            [],
        ),
        (
            "run_custom_regression_tests",
            "Custom regression self-tests",
            ["Algorithm/test_vectors.md", "Algorithm/verification_and_release_gates.md"],
            [],
            [],
        ),
    ]
    for function_name, display_name, prose_refs, guard_refs, extra_gap_notes in pipeline_rows:
        symbol = function_symbols.get(function_name)
        if symbol is None:
            continue
        row = FamilyRow(
            logical_family_id="VAL_" + sanitize_id(function_name),
            logical_family_name=display_name,
            family_kind="validator_family",
            normalized_key=normalize_key(function_name),
        )
        row.authoritative_prose_refs.update(prose_refs)
        row.validator_refs.add(symbol.ref)
        row.forensic_guard_refs.update(guard_refs)
        row.gap_notes.update(extra_gap_notes)
        rows.append(row)
    return sorted(rows, key=lambda row: row.logical_family_id)


def build_guard_rows(
    guards: list[SymbolInfo],
    object_rows: dict[str, FamilyRow],
    semantic_docs: dict[str, DocInfo],
    historical_docs: dict[str, DocInfo],
) -> list[FamilyRow]:
    rows: list[FamilyRow] = []
    special_guard_prose: dict[str, list[str]] = {
        "check_forensic_findings_closure_register": [
            "Algorithm/README.md",
            "Algorithm/architecture_coherence_guardrails.md",
        ],
        "check_constraint_traceability_register": [
            CONSTRAINT_REGISTER_PATH,
            CONSTRAINT_COVERAGE_PATH,
            "Algorithm/README.md",
        ],
        "check_corpus_reference_docs": [
            "Algorithm/README.md",
            "Algorithm/implementation_conventions.md",
            "Algorithm/architecture_coherence_guardrails.md",
            "Algorithm/constraint_coverage_index.md",
        ],
    }
    special_guard_historical: dict[str, list[str]] = {
        "check_forensic_findings_closure_register": sorted(HISTORICAL_CONTEXT_PATHS),
        "check_constraint_traceability_register": ["Algorithm/contract_integrity_requirements.md"],
        "check_corpus_reference_docs": ["Algorithm/contract_integrity_requirements.md"],
    }

    for guard in guards:
        base_name = guard.name.removeprefix("check_")
        key = normalize_key(base_name)
        object_row = object_rows.get(key)
        display_name = object_row.logical_family_name if object_row else base_name.replace("_", " ")
        row = FamilyRow(
            logical_family_id="GRD_" + sanitize_id(base_name),
            logical_family_name=display_name,
            family_kind="forensic_guard_family",
            normalized_key=key,
        )
        row.aliases.update(make_aliases(base_name, display_name))
        row.forensic_guard_refs.add(guard.ref)
        if object_row:
            row.authoritative_prose_refs.update(object_row.authoritative_prose_refs)
            row.schema_refs.update(object_row.schema_refs)
            row.sample_refs.update(object_row.sample_refs)
            row.validator_refs.update(object_row.validator_refs)
            row.constraint_register_refs.update(object_row.constraint_register_refs)
            row.historical_closure_refs.update(object_row.historical_closure_refs)
        if guard.name in special_guard_prose:
            row.authoritative_prose_refs.update(special_guard_prose[guard.name])
        if guard.name in special_guard_historical:
            row.historical_closure_refs.update(special_guard_historical[guard.name])
        if not row.authoritative_prose_refs:
            row.authoritative_prose_refs.update(search_docs(semantic_docs, row.aliases, minimum_score=10))
        if not row.authoritative_prose_refs:
            row.gap_notes.add("No clear prose anchor was found for this forensic guard theme.")
        row.historical_closure_refs.update(historical_refs_for_aliases(historical_docs, row.aliases, minimum_score=10))
        rows.append(row)
    return sorted(rows, key=lambda row: row.logical_family_id)


def build_state_machine_rows(
    families: list[StateMachineFamily],
    object_rows: dict[str, FamilyRow],
) -> list[FamilyRow]:
    rows: list[FamilyRow] = []
    for family in families:
        row = FamilyRow(
            logical_family_id=family.row_id,
            logical_family_name=family.display_name,
            family_kind="state_machine_family",
            normalized_key=normalize_key(family.display_name),
        )
        row.authoritative_prose_refs.add(family.heading_ref)
        row.source_paths.add(STATE_MACHINES_PATH)
        for key in family.object_keys:
            object_row = object_rows.get(key)
            if object_row is None:
                row.gap_notes.add(f"Object family `{key}` is referenced by state machines but missing from the object map.")
                continue
            row.authoritative_prose_refs.update(object_row.authoritative_prose_refs)
            row.schema_refs.update(object_row.schema_refs)
            row.sample_refs.update(object_row.sample_refs)
            row.validator_refs.update(object_row.validator_refs)
            row.forensic_guard_refs.update(object_row.forensic_guard_refs)
            row.constraint_register_refs.update(object_row.constraint_register_refs)
            row.historical_closure_refs.update(object_row.historical_closure_refs)
        rows.append(row)
    return sorted(rows, key=lambda row: row.logical_family_id)


def build_contract_rows(
    contract_docs: dict[str, DocInfo],
    object_rows: dict[str, FamilyRow],
    constraint_rows: list[FamilyRow],
    validator_rows: list[FamilyRow],
    guard_rows: list[FamilyRow],
    historical_docs: dict[str, DocInfo],
) -> list[FamilyRow]:
    object_rows_by_doc_path: dict[str, list[FamilyRow]] = defaultdict(list)
    for row in object_rows.values():
        for prose_ref in row.authoritative_prose_refs:
            prose_path = ref_path(prose_ref)
            object_rows_by_doc_path[prose_path].append(row)

    constraint_rows_by_doc_path: dict[str, list[FamilyRow]] = defaultdict(list)
    for row in constraint_rows:
        for prose_ref in row.authoritative_prose_refs:
            constraint_rows_by_doc_path[ref_path(prose_ref)].append(row)

    special_doc_links: dict[str, dict[str, list[str]]] = {
        "Algorithm/README.md": {
            "validator_refs": [symbol_ref(VALIDATOR_PATH, "run_repo_coherence_checks")],
            "forensic_guard_refs": [symbol_ref(GUARD_PATH, "check_corpus_reference_docs"), symbol_ref(GUARD_PATH, "check_constraint_traceability_register")],
        },
        "Algorithm/implementation_conventions.md": {
            "validator_refs": [symbol_ref(VALIDATOR_PATH, "run_repo_coherence_checks")],
            "forensic_guard_refs": [symbol_ref(GUARD_PATH, "check_corpus_reference_docs")],
        },
        "Algorithm/architecture_coherence_guardrails.md": {
            "validator_refs": [symbol_ref(VALIDATOR_PATH, "run_repo_coherence_checks")],
            "forensic_guard_refs": [symbol_ref(GUARD_PATH, "check_corpus_reference_docs"), symbol_ref(GUARD_PATH, "check_constraint_traceability_register")],
        },
        "Algorithm/constraint_coverage_index.md": {
            "validator_refs": [symbol_ref(VALIDATOR_PATH, "validate_live_constraint_traceability_register")],
            "forensic_guard_refs": [symbol_ref(GUARD_PATH, "check_constraint_traceability_register")],
        },
    }

    rows: list[FamilyRow] = []
    for path, doc in sorted(contract_docs.items()):
        if path in HISTORICAL_CONTEXT_PATHS:
            continue
        row = FamilyRow(
            logical_family_id="DOC_" + sanitize_id(doc.stem),
            logical_family_name=doc.stem.replace("_", " "),
            family_kind="contract_family",
            normalized_key=normalize_key(doc.stem),
        )
        row.authoritative_prose_refs.add(path)
        row.aliases.update(make_aliases(doc.stem, doc.path))
        row.source_paths.add(path)

        for object_row in object_rows_by_doc_path.get(path, []):
            row.schema_refs.update(object_row.schema_refs)
            row.sample_refs.update(object_row.sample_refs)
            row.validator_refs.update(object_row.validator_refs)
            row.forensic_guard_refs.update(object_row.forensic_guard_refs)
            row.constraint_register_refs.update(object_row.constraint_register_refs)
            row.historical_closure_refs.update(object_row.historical_closure_refs)

        for constraint_row in constraint_rows_by_doc_path.get(path, []):
            row.constraint_register_refs.update(constraint_row.constraint_register_refs)
            row.historical_closure_refs.update(constraint_row.historical_closure_refs)

        if path in special_doc_links:
            row.validator_refs.update(special_doc_links[path].get("validator_refs", []))
            row.forensic_guard_refs.update(special_doc_links[path].get("forensic_guard_refs", []))

        row.historical_closure_refs.update(historical_refs_for_aliases(historical_docs, [doc.stem], minimum_score=10))
        rows.append(row)
    return sorted(rows, key=lambda row: row.logical_family_id)


def inherit_constraint_prose(rows: Iterable[FamilyRow], constraint_rows: list[FamilyRow]) -> None:
    constraint_rows_by_ref = {
        next(
            (constraint_ref for constraint_ref in row.constraint_register_refs if constraint_ref.startswith(f"{CONSTRAINT_REGISTER_PATH}#")),
            row.logical_family_id,
        ): row
        for row in constraint_rows
    }
    for row in rows:
        if row.authoritative_prose_refs:
            continue
        inherited_refs: set[str] = set()
        for constraint_ref in row.constraint_register_refs:
            constraint_row = constraint_rows_by_ref.get(constraint_ref)
            if constraint_row is None:
                continue
            inherited_refs.update(
                ref
                for ref in constraint_row.authoritative_prose_refs
                if ref_path(ref) != CONSTRAINT_REGISTER_PATH
            )
        if inherited_refs:
            row.authoritative_prose_refs.update(inherited_refs)
            row.gap_notes.discard("No clear semantic prose anchor was found for this object family.")


def enrich_rows_with_historical_context(rows: Iterable[FamilyRow], historical_docs: dict[str, DocInfo]) -> None:
    for row in rows:
        aliases = row.aliases or {row.logical_family_name}
        row.historical_closure_refs.update(historical_refs_for_aliases(historical_docs, aliases, minimum_score=10))


def mermaid_node_id(row_id: str) -> str:
    return sanitize_id(row_id)


def build_mermaid_graph(rows: list[FamilyRow]) -> str:
    lines = [
        "flowchart LR",
        '  PROSE["Prose Contract"] --> SCHEMA["Schema"]',
        '  SCHEMA --> SAMPLE["Sample / Example"]',
        '  SAMPLE --> VALIDATOR["Validator Logic"]',
        '  VALIDATOR --> GUARD["Forensic Guard"]',
        '  GUARD --> CONSTRAINT["Constraint Register"]',
        '  CONSTRAINT --> HISTORY["Historical Closure"]',
        '  classDef obj fill:#e8f1fb,stroke:#315d8a,color:#10263f;',
        '  classDef doc fill:#f7ead9,stroke:#8f6220,color:#3b2608;',
        '  classDef stm fill:#efe7fb,stroke:#6c4aa4,color:#2d1454;',
        '  classDef val fill:#e6f8ea,stroke:#2d7d46,color:#12341c;',
        '  classDef grd fill:#ffe9ef,stroke:#a24563,color:#4f1023;',
        '  classDef cst fill:#fcefc6,stroke:#85640a,color:#443202;',
    ]

    class_names = {
        "object_family": "obj",
        "contract_family": "doc",
        "state_machine_family": "stm",
        "validator_family": "val",
        "forensic_guard_family": "grd",
        "constraint_family": "cst",
    }
    deepest_stage = {
        "none": "PROSE",
        "prose": "PROSE",
        "prose+schema": "SCHEMA",
        "prose+schema+sample": "SAMPLE",
        "prose+schema+sample+validator": "VALIDATOR",
        "prose+schema+sample+validator+guard": "GUARD",
    }

    for family_kind in [
        "object_family",
        "contract_family",
        "state_machine_family",
        "validator_family",
        "forensic_guard_family",
        "constraint_family",
    ]:
        lines.append(f'  subgraph {sanitize_id(family_kind)}["{family_kind}"]')
        for row in [candidate for candidate in rows if candidate.family_kind == family_kind]:
            node_id = mermaid_node_id(row.logical_family_id)
            label = (
                f"{row.logical_family_id}\\n"
                f"{row.logical_family_name}\\n"
                f"{row.coverage_status()}\\n"
                f"P{len(row.authoritative_prose_refs)} S{len(row.schema_refs)} A{len(row.sample_refs)} "
                f"V{len(row.validator_refs)} G{len(row.forensic_guard_refs)} "
                f"C{len(row.constraint_register_refs)} H{len(row.historical_closure_refs)}"
            )
            lines.append(f'    {node_id}["{label}"]')
            stage = (
                "HISTORY"
                if row.historical_closure_refs
                else "CONSTRAINT"
                if row.constraint_register_refs
                else "GUARD"
                if row.forensic_guard_refs
                else "VALIDATOR"
                if row.validator_refs
                else "SAMPLE"
                if row.sample_refs
                else "SCHEMA"
                if row.schema_refs
                else "PROSE"
            )
            lines.append(f'    {node_id} -. "{row.coverage_signature()}" .-> {stage}')
            lines.append(f"    class {node_id} {class_names[family_kind]};")
        lines.append("  end")
    return "\n".join(lines) + "\n"


def build_gap_register(rows: list[FamilyRow], duplicate_validators: dict[str, list[str]]) -> dict[str, Any]:
    schema_owned_paths = {ref_path(schema_ref) for row in rows for schema_ref in row.schema_refs}
    schemas_by_path, _ = load_schemas()
    schema_without_prose = sorted(
        ref_path(schema_ref)
        for row in rows
        if row.family_kind == "object_family" and row.schema_refs and not row.authoritative_prose_refs
        for schema_ref in row.schema_refs
    )
    data_model_without_schema = sorted(
        row.logical_family_id
        for row in rows
        if row.family_kind == "object_family"
        and any(ref_path(ref) == DATA_MODEL_PATH for ref in row.authoritative_prose_refs)
        and not row.schema_refs
    )
    validators_without_anchor = sorted(
        row.logical_family_id
        for row in rows
        if row.family_kind == "validator_family" and not row.authoritative_prose_refs
    )
    guards_without_anchor = sorted(
        row.logical_family_id
        for row in rows
        if row.family_kind == "forensic_guard_family" and not row.authoritative_prose_refs
    )
    partially_or_unmapped = [
        row.to_dict()
        for row in rows
        if row.coverage_status() != "fully_mapped"
    ]
    return {
        "generated_from_task": "pc_0003",
        "row_count": len(rows),
        "schema_count": len(schemas_by_path),
        "schema_paths_covered_by_rows": len(schema_owned_paths),
        "duplicate_custom_validator_keys": duplicate_validators,
        "schemas_without_clear_prose_anchor": dedupe_sorted(schema_without_prose),
        "data_model_families_without_schema": data_model_without_schema,
        "validator_families_without_prose_anchor": validators_without_anchor,
        "forensic_guard_families_without_prose_anchor": guards_without_anchor,
        "families_with_non_full_coverage": partially_or_unmapped,
    }


def build_index_doc(summary: dict[str, Any], rows: list[FamilyRow], gap_register: dict[str, Any]) -> str:
    counts_by_kind = Counter(row.family_kind for row in rows)
    counts_by_status = Counter(row.coverage_status() for row in rows)
    top_gap_rows = [
        row for row in rows if row.coverage_status() != "fully_mapped"
    ][:12]

    lines = [
        "# Contract, Schema, Script Cross-Reference Index",
        "",
        "This report is the machine-generated bridge between the Taxat algorithm corpus and the repository enforcement surfaces.",
        "It unifies prose contracts, schema artifacts, sample payloads, validator symbols, forensic guard themes, live constraint coverage, and historical closure context into one deterministic map.",
        "",
        "## Corpus Summary",
        "",
        f"- Total logical families indexed: `{len(rows)}`.",
        f"- Object families: `{counts_by_kind['object_family']}`.",
        f"- Contract families: `{counts_by_kind['contract_family']}`.",
        f"- State-machine families: `{counts_by_kind['state_machine_family']}`.",
        f"- Validator families: `{counts_by_kind['validator_family']}`.",
        f"- Forensic guard families: `{counts_by_kind['forensic_guard_family']}`.",
        f"- Live constraint families: `{counts_by_kind['constraint_family']}`.",
        "",
        "## Coverage Status",
        "",
        f"- `fully_mapped`: `{counts_by_status['fully_mapped']}`.",
        f"- `partially_mapped`: `{counts_by_status['partially_mapped']}`.",
        f"- `doc_only`: `{counts_by_status['doc_only']}`.",
        f"- `schema_only`: `{counts_by_status['schema_only']}`.",
        f"- `validator_only`: `{counts_by_status['validator_only']}`.",
        f"- `gap`: `{counts_by_status['gap']}`.",
        "",
        "## Outputs",
        "",
        "- Canonical JSON index: `data/analysis/contract_schema_script_index.json`.",
        "- Flat CSV export: `data/analysis/contract_schema_script_index.csv`.",
        "- Object-family enforcement view: `data/analysis/object_family_to_enforcement_map.json`.",
        "- Gap register: `data/analysis/enforcement_gap_register.json`.",
        "- Graph projection: `docs/analysis/03_contract_enforcement_graph.mmd`.",
        "",
        "## High-Signal Gaps",
        "",
        f"- Schemas without a clear prose anchor: `{len(gap_register['schemas_without_clear_prose_anchor'])}`.",
        f"- Data-model families without a schema artifact: `{len(gap_register['data_model_families_without_schema'])}`.",
        f"- Validator families without a prose anchor: `{len(gap_register['validator_families_without_prose_anchor'])}`.",
        f"- Forensic guard families without a prose anchor: `{len(gap_register['forensic_guard_families_without_prose_anchor'])}`.",
        f"- Duplicate `CUSTOM_VALIDATORS` keys surfaced: `{len(gap_register['duplicate_custom_validator_keys'])}`.",
        "",
        "## Representative Non-Full Rows",
        "",
        "| ID | Kind | Status | Coverage | Gap notes |",
        "| --- | --- | --- | --- | --- |",
    ]
    for row in top_gap_rows:
        lines.append(
            f"| `{row.logical_family_id}` | `{row.family_kind}` | `{row.coverage_status()}` | `{row.coverage_signature()}` | {'; '.join(sorted(row.gap_notes)) or 'n/a'} |"
        )

    lines.extend(
        [
            "",
            "## Method Notes",
            "",
            f"- Object-family extraction starts from `{DATA_MODEL_PATH}` and unions in schema-backed families from `schemas/` plus state-machine families from `{STATE_MACHINES_PATH}`.",
            f"- Validator extraction uses AST parsing of `{VALIDATOR_PATH}` to read `CUSTOM_VALIDATORS` and the live pipeline stage functions.",
            f"- Forensic guard extraction uses AST parsing of `{GUARD_PATH}` to read the ordered `run_guard_checks()` execution list.",
            f"- Constraint rows are sourced directly from `{CONSTRAINT_REGISTER_PATH}` and cross-linked back into schema, validator, and guard families.",
        ]
    )
    return "\n".join(lines) + "\n"


def build_coverage_doc(rows: list[FamilyRow], constraints: list[dict[str, Any]], gap_register: dict[str, Any]) -> str:
    counts_by_signature = Counter(row.coverage_signature() for row in rows)
    counts_by_kind_and_status: Counter[tuple[str, str]] = Counter((row.family_kind, row.coverage_status()) for row in rows)

    lines = [
        "# Enforcement Coverage Report",
        "",
        "This report summarizes how deeply each logical family is covered across prose, schema, samples, validator logic, forensic guards, live constraints, and historical closure context.",
        "",
        "## Coverage Signatures",
        "",
        "| Coverage signature | Row count |",
        "| --- | ---: |",
    ]
    for signature, count in sorted(counts_by_signature.items(), key=lambda item: (-item[1], item[0])):
        lines.append(f"| `{signature}` | `{count}` |")

    lines.extend(
        [
            "",
            "## Coverage By Family Kind",
            "",
            "| Family kind | Fully mapped | Partial | Doc only | Schema only | Validator only | Gap |",
            "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
        ]
    )
    for family_kind in [
        "object_family",
        "contract_family",
        "state_machine_family",
        "validator_family",
        "forensic_guard_family",
        "constraint_family",
    ]:
        lines.append(
            "| `{}` | `{}` | `{}` | `{}` | `{}` | `{}` | `{}` |".format(
                family_kind,
                counts_by_kind_and_status[(family_kind, "fully_mapped")],
                counts_by_kind_and_status[(family_kind, "partially_mapped")],
                counts_by_kind_and_status[(family_kind, "doc_only")],
                counts_by_kind_and_status[(family_kind, "schema_only")],
                counts_by_kind_and_status[(family_kind, "validator_only")],
                counts_by_kind_and_status[(family_kind, "gap")],
            )
        )

    lines.extend(
        [
            "",
            "## Live Constraint Register Coverage",
            "",
            "| Constraint ID | Constraint family | Authoritative refs | Enforcement refs | Downstream refs | Example refs |",
            "| --- | --- | ---: | ---: | ---: | ---: |",
        ]
    )
    for entry in constraints:
        lines.append(
            f"| `{entry['constraint_id']}` | {entry['constraint_name']} | `{len(entry.get('authoritative_refs', []))}` | `{len(entry.get('enforcement_refs', []))}` | `{len(entry.get('downstream_refs', []))}` | `{len(entry.get('example_refs', []))}` |"
        )

    lines.extend(
        [
            "",
            "## Explicit Gap Registers",
            "",
            f"- Schemas without clear prose anchors: `{len(gap_register['schemas_without_clear_prose_anchor'])}`.",
            f"- Data-model families without schemas: `{len(gap_register['data_model_families_without_schema'])}`.",
            f"- Validators without prose anchors: `{len(gap_register['validator_families_without_prose_anchor'])}`.",
            f"- Guards without prose anchors: `{len(gap_register['forensic_guard_families_without_prose_anchor'])}`.",
            f"- Duplicate custom-validator keys: `{len(gap_register['duplicate_custom_validator_keys'])}`.",
        ]
    )
    return "\n".join(lines) + "\n"


def write_csv(rows: list[FamilyRow]) -> None:
    fieldnames = [
        "logical_family_id",
        "logical_family_name",
        "family_kind",
        "normalized_key",
        "coverage_status",
        "coverage_signature",
        "authoritative_prose_refs",
        "schema_refs",
        "sample_refs",
        "validator_refs",
        "forensic_guard_refs",
        "constraint_register_refs",
        "historical_closure_refs",
        "gap_notes",
        "aliases",
        "source_paths",
    ]
    with CROSS_REFERENCE_CSV_PATH.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            payload = row.to_dict()
            writer.writerow(
                {
                    key: " | ".join(payload[key]) if isinstance(payload[key], list) else payload[key]
                    for key in fieldnames
                }
            )


def main() -> int:
    manifest_rows, _rows_by_path, semantic_docs, contract_docs = load_inventory()
    headings_by_path = load_headings()
    schemas_by_path, schemas_by_key = load_schemas()
    data_model_objects = extract_data_model_objects()
    state_machine_families, state_machine_refs_by_key = extract_state_machine_families(headings_by_path)
    custom_validators, duplicate_validators, function_symbols = parse_validator_symbols()
    guard_symbols, guard_function_symbols = parse_guard_symbols()
    constraints = load_constraints()

    historical_docs = {
        path: contract_docs[path]
        for path in sorted(HISTORICAL_CONTEXT_PATHS)
        if path in contract_docs
    }

    object_rows_by_key = build_object_rows(
        data_model_objects,
        schemas_by_key,
        semantic_docs,
        state_machine_refs_by_key,
        custom_validators,
        guard_symbols,
        constraints,
    )

    constraint_rows = build_constraint_rows(constraints, historical_docs, object_rows_by_key)
    inherit_constraint_prose(object_rows_by_key.values(), constraint_rows)
    enrich_rows_with_historical_context(object_rows_by_key.values(), historical_docs)
    validator_rows = build_validator_rows(custom_validators, duplicate_validators, function_symbols, object_rows_by_key, constraints, historical_docs)
    guard_rows = build_guard_rows(guard_symbols, object_rows_by_key, semantic_docs, historical_docs)
    state_machine_rows = build_state_machine_rows(state_machine_families, object_rows_by_key)
    contract_rows = build_contract_rows(contract_docs, object_rows_by_key, constraint_rows, validator_rows, guard_rows, historical_docs)

    all_rows = sorted(
        [*object_rows_by_key.values(), *contract_rows, *state_machine_rows, *validator_rows, *guard_rows, *constraint_rows],
        key=lambda row: row.logical_family_id,
    )

    summary = {
        "generated_from_task": "pc_0003",
        "inventory_row_count": len(manifest_rows),
        "logical_family_count": len(all_rows),
        "schema_family_count": len(object_rows_by_key),
        "custom_validator_count": len(custom_validators),
        "guard_theme_count": len(guard_symbols),
        "state_machine_family_count": len(state_machine_rows),
        "constraint_family_count": len(constraint_rows),
    }
    gap_register = build_gap_register(all_rows, duplicate_validators)

    json_write(
        CROSS_REFERENCE_JSON_PATH,
        {
            "summary": summary,
            "rows": [row.to_dict() for row in all_rows],
        },
    )
    write_csv(all_rows)
    json_write(
        OBJECT_ENFORCEMENT_MAP_PATH,
        {
            "generated_from_task": "pc_0003",
            "object_families": [row.to_dict() for row in all_rows if row.family_kind == "object_family"],
        },
    )
    json_write(ENFORCEMENT_GAP_REGISTER_PATH, gap_register)

    INDEX_DOC_PATH.write_text(build_index_doc(summary, all_rows, gap_register))
    COVERAGE_DOC_PATH.write_text(build_coverage_doc(all_rows, constraints, gap_register))
    GRAPH_DOC_PATH.write_text(build_mermaid_graph(all_rows))

    print(
        json.dumps(
            {
                "status": "PASS",
                "logical_family_count": len(all_rows),
                "object_family_count": len(object_rows_by_key),
                "validator_family_count": len(validator_rows),
                "forensic_guard_family_count": len(guard_rows),
                "constraint_family_count": len(constraint_rows),
                "gap_family_count": len([row for row in all_rows if row.coverage_status() == "gap"]),
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
