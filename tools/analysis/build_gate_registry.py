#!/usr/bin/env python3
from __future__ import annotations

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
DIAGRAMS_ANALYSIS_DIR = ROOT / "diagrams" / "analysis"

EXACT_GATE_PATH = ALGORITHM_DIR / "exact_gate_logic_and_decision_tables.md"
INVARIANTS_PATH = ALGORITHM_DIR / "invariants_and_gates.md"
EXPLAINABILITY_PATH = ALGORITHM_DIR / "gate_decision_explainability_and_reason_code_compression_contract.md"
ACTOR_AUTHORITY_PATH = ALGORITHM_DIR / "actor_and_authority_model.md"
MODULES_PATH = ALGORITHM_DIR / "modules.md"
GATE_DECISION_SCHEMA_PATH = ALGORITHM_DIR / "schemas" / "gate_decision_record.schema.json"
GATE_SEMANTICS_SCHEMA_PATH = ALGORITHM_DIR / "schemas" / "gate_semantics_contract.schema.json"
PRESEAL_SCHEMA_PATH = ALGORITHM_DIR / "schemas" / "preseal_gate_evaluation_contract.schema.json"

RUN_ENGINE_PHASE_INDEX_PATH = DATA_ANALYSIS_DIR / "run_engine_phase_index.json"
RUN_ENGINE_STEP_LEDGER_PATH = DATA_ANALYSIS_DIR / "run_engine_step_ledger.jsonl"
MODULE_CATALOG_PATH = DATA_ANALYSIS_DIR / "module_catalog.json"

GATE_DOC_PATH = DOCS_ANALYSIS_DIR / "10_gate_order_reason_codes_and_override_rules.md"
PROGRESSION_DOC_PATH = DOCS_ANALYSIS_DIR / "10_gate_progression_and_terminalization_matrix.md"
EXPLAINABILITY_DOC_PATH = DOCS_ANALYSIS_DIR / "10_gate_explainability_and_reason_code_usage.md"
MERMAID_PATH = DIAGRAMS_ANALYSIS_DIR / "10_gate_chain.mmd"

REGISTRY_PATH = DATA_ANALYSIS_DIR / "gate_registry.json"
GATE_ORDER_PATH = DATA_ANALYSIS_DIR / "gate_order.csv"
REASON_CODE_PATH = DATA_ANALYSIS_DIR / "gate_reason_code_registry.jsonl"
OVERRIDE_MATRIX_PATH = DATA_ANALYSIS_DIR / "override_resolution_matrix.json"
PHASE_BINDING_PATH = DATA_ANALYSIS_DIR / "gate_to_phase_binding.json"
TERMINALIZATION_PATH = DATA_ANALYSIS_DIR / "gate_terminalization_paths.json"

HEADING_RE = re.compile(r"^(#{2,4})\s+(.*)$")
SECTION_ID_RE = re.compile(r"^(7\.[0-9]+[A-Z]?)\s+(.*)$")
DECISION_HEADER_RE = re.compile(r"^Return `?([A-Z_]+)`?(?:\s+.*)?$")
CODE_SPAN_RE = re.compile(r"`([^`]+)`")

ACCESS_DECISIONS = ["ALLOW", "ALLOW_MASKED", "REQUIRE_STEP_UP", "REQUIRE_APPROVAL", "DENY"]
NON_ACCESS_DECISIONS = ["PASS", "PASS_WITH_NOTICE", "MANUAL_REVIEW", "OVERRIDABLE_BLOCK", "HARD_BLOCK"]
NON_ACCESS_SEVERITY_ENUM = ["INFO", "NOTICE", "WARNING", "ERROR", "CRITICAL"]
OVERRIDEABILITY_ENUM = ["NONE", "SCOPED_OVERRIDE_ALLOWED", "SCOPED_OVERRIDE_REQUIRED", "NON_OVERRIDEABLE"]

NON_ACCESS_SEVERITY_MAPPING = {
    "PASS": "INFO",
    "PASS_WITH_NOTICE": "NOTICE",
    "MANUAL_REVIEW": "WARNING",
    "OVERRIDABLE_BLOCK": "ERROR",
    "HARD_BLOCK": "CRITICAL",
}
DECISION_RANK_MAPPING = {
    "PASS": 0,
    "PASS_WITH_NOTICE": 1,
    "MANUAL_REVIEW": 2,
    "OVERRIDABLE_BLOCK": 3,
    "HARD_BLOCK": 4,
}
PROGRESSION_RANK_MAPPING = {
    "PASS": 2,
    "PASS_WITH_NOTICE": 2,
    "MANUAL_REVIEW": 1,
    "OVERRIDABLE_BLOCK": 0,
    "HARD_BLOCK": 0,
}
READINESS_RANK_MAPPING = {
    "READY_TO_SUBMIT": 2,
    "READY_REVIEW": 1,
    "NOT_READY": 0,
}
REASON_CODE_FAMILY_PREFIXES = {
    "ACCESS_GATE": "ACCESS",
    "MANIFEST_GATE": "MANIFEST",
    "ARTIFACT_CONTRACT_GATE": "ARTIFACT",
    "INPUT_BOUNDARY_GATE": "INPUT",
    "DATA_QUALITY_GATE": "DQ",
    "RETENTION_EVIDENCE_GATE": "RETENTION",
    "PARITY_GATE": "PARITY",
    "TRUST_GATE": "TRUST",
    "FILING_GATE": "FILING",
    "SUBMISSION_GATE": "SUBMISSION",
    "AMENDMENT_GATE": "AMENDMENT",
}


@dataclass(frozen=True)
class GateSpec:
    gate_code: str
    section_id: str
    gate_family: str
    gate_class: str
    evaluation_order_index: int
    non_access_stage_index: int | None
    evaluation_scope_condition: str
    conditional_runtime_scope_tokens: tuple[str, ...]
    overrideability: str
    upstream_gate_dependencies: tuple[str, ...]
    downstream_consumers: tuple[str, ...]
    notes: tuple[str, ...] = ()


@dataclass
class Block:
    key: str
    title: str
    level: int
    start_line: int
    end_line: int
    lines: list[str]
    children: list["Block"] = field(default_factory=list)


GATE_SPECS = [
    GateSpec(
        gate_code="ACCESS_GATE",
        section_id="7.3",
        gate_family="access_control",
        gate_class="access",
        evaluation_order_index=1,
        non_access_stage_index=None,
        evaluation_scope_condition="Always first, before manifest allocation and before any non-access gate.",
        conditional_runtime_scope_tokens=(),
        overrideability="NON_OVERRIDEABLE",
        upstream_gate_dependencies=(),
        downstream_consumers=(
            "AUTHORIZE",
            "ACCESS_BLOCKED_RESPONSE",
            "ENFORCE_ACCESS_SCOPE_AND_MASKING",
            "MATERIALIZE_SCOPE_EXECUTION_BINDING",
            "VALIDATE_EFFECTIVE_SCOPE_BINDING",
            "FILING_GATE",
            "SUBMISSION_GATE",
        ),
        notes=(
            "ACCESS_GATE uses the distinct authorization enum rather than GateDecisionRecord.",
            "Pre-manifest access exits may terminate before RunManifest allocation.",
            "GAP_ACCESS_REASON_CODES_NOT_ENUMERATED_IN_PRIMARY_GATE_SOURCE",
        ),
    ),
    GateSpec(
        gate_code="MANIFEST_GATE",
        section_id="7.4",
        gate_family="preseal_manifest_integrity",
        gate_class="non_access",
        evaluation_order_index=2,
        non_access_stage_index=1,
        evaluation_scope_condition="Ordered pre-seal gate; runs on the frozen manifest before seal.",
        conditional_runtime_scope_tokens=(),
        overrideability="SCOPED_OVERRIDE_ALLOWED",
        upstream_gate_dependencies=(),
        downstream_consumers=("EMIT_ORDERED_GATES", "BUILD_PRESEAL_GATE_EVALUATION", "SEAL_MANIFEST", "TRUST_GATE", "FILING_GATE"),
        notes=(
            "Same-manifest retry reuses persisted pre-seal gate records after seal.",
            "Pre-seal PASS_WITH_NOTICE posture remains binding after seal.",
        ),
    ),
    GateSpec(
        gate_code="ARTIFACT_CONTRACT_GATE",
        section_id="7.4A",
        gate_family="artifact_contract_safety",
        gate_class="non_access",
        evaluation_order_index=3,
        non_access_stage_index=2,
        evaluation_scope_condition="Ordered pre-seal gate; runs after MANIFEST_GATE and before seal.",
        conditional_runtime_scope_tokens=(),
        overrideability="NON_OVERRIDEABLE",
        upstream_gate_dependencies=("MANIFEST_GATE",),
        downstream_consumers=("EMIT_ORDERED_GATES", "BUILD_PRESEAL_GATE_EVALUATION", "SEAL_MANIFEST", "TRUST_GATE", "FILING_GATE"),
        notes=("Pre-seal PASS_WITH_NOTICE posture remains binding after seal.",),
    ),
    GateSpec(
        gate_code="INPUT_BOUNDARY_GATE",
        section_id="7.5",
        gate_family="input_boundary",
        gate_class="non_access",
        evaluation_order_index=4,
        non_access_stage_index=3,
        evaluation_scope_condition="Ordered pre-seal gate; runs after artifact-contract validation and before seal.",
        conditional_runtime_scope_tokens=(),
        overrideability="NON_OVERRIDEABLE",
        upstream_gate_dependencies=("MANIFEST_GATE", "ARTIFACT_CONTRACT_GATE"),
        downstream_consumers=("EMIT_ORDERED_GATES", "BUILD_PRESEAL_GATE_EVALUATION", "SEAL_MANIFEST", "TRUST_GATE", "FILING_GATE"),
        notes=(
            "Post-seal late data is judged by FILING_GATE via LateDataMonitorResult, not re-evaluated here.",
            "Pre-seal MANUAL_REVIEW or PASS_WITH_NOTICE posture remains binding after seal.",
        ),
    ),
    GateSpec(
        gate_code="DATA_QUALITY_GATE",
        section_id="7.6",
        gate_family="data_quality",
        gate_class="non_access",
        evaluation_order_index=5,
        non_access_stage_index=4,
        evaluation_scope_condition="Ordered pre-seal gate; runs last in the canonical pre-seal tape before seal.",
        conditional_runtime_scope_tokens=(),
        overrideability="SCOPED_OVERRIDE_ALLOWED",
        upstream_gate_dependencies=("MANIFEST_GATE", "ARTIFACT_CONTRACT_GATE", "INPUT_BOUNDARY_GATE"),
        downstream_consumers=("EMIT_ORDERED_GATES", "BUILD_PRESEAL_GATE_EVALUATION", "SEAL_MANIFEST", "TRUST_GATE", "FILING_GATE"),
        notes=(
            "Pre-seal MANUAL_REVIEW or PASS_WITH_NOTICE posture remains binding after seal.",
            "OVERRIDABLE_BLOCK is explicitly available for bounded low-quality or stale-critical posture.",
        ),
    ),
    GateSpec(
        gate_code="RETENTION_EVIDENCE_GATE",
        section_id="7.7",
        gate_family="retention_evidence",
        gate_class="non_access",
        evaluation_order_index=6,
        non_access_stage_index=5,
        evaluation_scope_condition="Runs once proof and graph evidence exist; appends post-seal without rewriting the frozen pre-seal tape.",
        conditional_runtime_scope_tokens=(),
        overrideability="SCOPED_OVERRIDE_ALLOWED",
        upstream_gate_dependencies=("DATA_QUALITY_GATE",),
        downstream_consumers=("APPEND_MANIFEST_GATES", "TRUST_GATE", "FILING_GATE", "DecisionBundle"),
        notes=("Retention limitations remain explicit reason-coded posture rather than hidden score discounting.",),
    ),
    GateSpec(
        gate_code="PARITY_GATE",
        section_id="7.8",
        gate_family="authority_parity",
        gate_class="non_access",
        evaluation_order_index=7,
        non_access_stage_index=6,
        evaluation_scope_condition="Runs after retention evidence once comparison artifacts exist.",
        conditional_runtime_scope_tokens=(),
        overrideability="SCOPED_OVERRIDE_ALLOWED",
        upstream_gate_dependencies=("RETENTION_EVIDENCE_GATE",),
        downstream_consumers=("APPEND_MANIFEST_GATES", "TRUST_GATE", "FILING_GATE", "SYNC_LIVE_EXPERIENCE_FROM_GATES"),
        notes=("Comparison-set invalidity must remain fail-closed as NOT_COMPARABLE.",),
    ),
    GateSpec(
        gate_code="TRUST_GATE",
        section_id="7.9",
        gate_family="trust_synthesis",
        gate_class="non_access",
        evaluation_order_index=8,
        non_access_stage_index=7,
        evaluation_scope_condition="Runs after parity and upstream non-access gate posture are available.",
        conditional_runtime_scope_tokens=(),
        overrideability="SCOPED_OVERRIDE_REQUIRED",
        upstream_gate_dependencies=("PARITY_GATE", "RETENTION_EVIDENCE_GATE", "DATA_QUALITY_GATE", "INPUT_BOUNDARY_GATE", "ARTIFACT_CONTRACT_GATE", "MANIFEST_GATE"),
        downstream_consumers=("APPEND_MANIFEST_GATES", "AMENDMENT_GATE", "FILING_GATE", "DecisionBundle", "SYNC_LIVE_EXPERIENCE_FROM_GATES"),
        notes=(
            "TRUST_GATE may surface override-missing posture only when an already-documented upstream gate remains unresolved.",
            "Trust-derived red posture is not a new discretionary override family.",
        ),
    ),
    GateSpec(
        gate_code="AMENDMENT_GATE",
        section_id="7.12",
        gate_family="amendment_progression",
        gate_class="non_access",
        evaluation_order_index=9,
        non_access_stage_index=8,
        evaluation_scope_condition="Runs only when runtime_scope[] includes amendment_intent or amendment_submit; a narrow early-failure amendment-basis branch may emit before parity/trust.",
        conditional_runtime_scope_tokens=("amendment_intent", "amendment_submit"),
        overrideability="SCOPED_OVERRIDE_REQUIRED",
        upstream_gate_dependencies=("TRUST_GATE",),
        downstream_consumers=("APPEND_MANIFEST_GATES", "FILING_GATE", "DecisionBundle", "SYNC_LIVE_EXPERIENCE_FROM_GATES"),
        notes=(
            "AMENDMENT_GATE is deliberately not evaluated during drift preparation.",
            "The gate is the only family allowed to speak for intent-to-amend readiness failure.",
        ),
    ),
    GateSpec(
        gate_code="FILING_GATE",
        section_id="7.10",
        gate_family="filing_progression",
        gate_class="non_access",
        evaluation_order_index=10,
        non_access_stage_index=9,
        evaluation_scope_condition="Runs when runtime_scope[] includes prepare_submission, submit, or amendment_submit; early pre-trust or pre-packet branches still require an explicit filing gate record.",
        conditional_runtime_scope_tokens=("prepare_submission", "submit", "amendment_submit"),
        overrideability="SCOPED_OVERRIDE_REQUIRED",
        upstream_gate_dependencies=("TRUST_GATE", "PARITY_GATE", "AMENDMENT_GATE"),
        downstream_consumers=("APPEND_MANIFEST_GATES", "SUBMISSION_GATE", "DecisionBundle", "SYNC_LIVE_EXPERIENCE_FROM_GATES"),
        notes=(
            "FILING_GATE is monotone narrowing and SHALL NOT upgrade inherited legal progression.",
            "A valid approved override may unblock a scoped prerequisite but SHALL NOT upgrade the filing decision above PASS_WITH_NOTICE.",
        ),
    ),
    GateSpec(
        gate_code="SUBMISSION_GATE",
        section_id="7.11",
        gate_family="submission_preflight",
        gate_class="non_access",
        evaluation_order_index=11,
        non_access_stage_index=10,
        evaluation_scope_condition="Runs immediately before transmit when live submission is actually attempted.",
        conditional_runtime_scope_tokens=("submit", "amendment_submit"),
        overrideability="NON_OVERRIDEABLE",
        upstream_gate_dependencies=("FILING_GATE",),
        downstream_consumers=("APPEND_MANIFEST_GATES", "DecisionBundle", "SYNC_LIVE_EXPERIENCE_FROM_GATES"),
        notes=("Submission preflight re-runs authorization and authority-binding validity immediately before transmit.",),
    ),
]


def repo_rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def safe_label(label: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", label).strip("_") or "line"


def line_ref(path: str, line_number: int, label: str) -> str:
    return f"{path}::L{line_number}[{safe_label(label)}]"


def ordered_unique(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if not value or value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def json_write(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")


def jsonl_write(path: Path, rows: Iterable[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as handle:
        for row in rows:
            handle.write(json.dumps(row, sort_keys=True) + "\n")


def parse_document_blocks(path: Path) -> dict[str, Block]:
    lines = path.read_text().splitlines()
    stack: list[tuple[int, Block]] = []
    h2_blocks: dict[str, Block] = {}

    for index, line in enumerate(lines, start=1):
        match = HEADING_RE.match(line)
        if not match:
            continue
        level = len(match.group(1))
        title = match.group(2).strip()
        if level == 2:
            section_match = SECTION_ID_RE.match(title)
            key = section_match.group(1) if section_match else title
        else:
            key = title
        block = Block(key=key, title=title, level=level, start_line=index, end_line=index, lines=[line])
        while stack and stack[-1][0] >= level:
            _, finished = stack.pop()
            finished.end_line = index - 1
        if stack:
            stack[-1][1].children.append(block)
        else:
            if level == 2:
                h2_blocks[key] = block
        stack.append((level, block))

    last_line = len(lines)
    while stack:
        _, finished = stack.pop()
        finished.end_line = last_line

    for block in h2_blocks.values():
        block.lines = lines[block.start_line - 1:block.end_line]
        populate_child_lines(block, lines)
    return h2_blocks


def populate_child_lines(block: Block, all_lines: list[str]) -> None:
    for child in block.children:
        child.lines = all_lines[child.start_line - 1:child.end_line]
        populate_child_lines(child, all_lines)


def get_child_block(block: Block, title: str) -> Block:
    for child in block.children:
        if child.title == title:
            return child
    raise KeyError(f"Missing child block `{title}` under `{block.title}`")


def block_text_without_children(block: Block) -> list[dict[str, Any]]:
    child_lines: set[int] = set()
    for child in block.children:
        child_lines.update(range(child.start_line, child.end_line + 1))
    rows: list[dict[str, Any]] = []
    current_lines: list[str] = []
    current_start = block.start_line + 1
    for offset, line in enumerate(block.lines[1:], start=block.start_line + 1):
        if offset in child_lines:
            if current_lines:
                rows.append(
                    {
                        "line_number": current_start,
                        "text": re.sub(r"\s+", " ", " ".join(current_lines)).strip(),
                    }
                )
                current_lines = []
            current_start = offset + 1
            continue
        stripped = line.strip()
        if not stripped:
            if current_lines:
                rows.append(
                    {
                        "line_number": current_start,
                        "text": re.sub(r"\s+", " ", " ".join(current_lines)).strip(),
                    }
                )
                current_lines = []
            current_start = offset + 1
            continue
        current_lines.append(stripped)
    if current_lines:
        rows.append(
            {
                "line_number": current_start,
                "text": re.sub(r"\s+", " ", " ".join(current_lines)).strip(),
            }
        )
    return rows


def collect_list_items(block: Block) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    for index, line in enumerate(block.lines[1:], start=block.start_line + 1):
        stripped = line.strip()
        if not stripped:
            if current is not None:
                current["text"] = re.sub(r"\s+", " ", current["text"]).strip()
                items.append(current)
                current = None
            continue
        match = re.match(r"^(-|\d+\.)\s+(.*)$", stripped)
        if match:
            if current is not None:
                current["text"] = re.sub(r"\s+", " ", current["text"]).strip()
                items.append(current)
            current = {"line_number": index, "text": match.group(2).strip()}
            continue
        if current is not None:
            current["text"] += " " + stripped
    if current is not None:
        current["text"] = re.sub(r"\s+", " ", current["text"]).strip()
        items.append(current)
    return items


def extract_code_spans(text: str) -> list[str]:
    return CODE_SPAN_RE.findall(text)


def parse_gate_order(section_7_2: Block) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for item in collect_list_items(section_7_2):
        codes = extract_code_spans(item["text"])
        if not codes:
            continue
        gate_code = codes[0]
        if not gate_code.endswith("_GATE"):
            continue
        rows.append(
            {
                "evaluation_order_index": len(rows) + 1,
                "gate_code": gate_code,
                "line_number": item["line_number"],
                "text": item["text"],
            }
        )
    return rows


def parse_field_list_from_section_preamble(block: Block) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for item in collect_list_items(block):
        if item["line_number"] >= block.children[0].start_line:
            break
        codes = extract_code_spans(item["text"])
        if codes:
            rows.append({"line_number": item["line_number"], "field_name": codes[0]})
    return rows


def parse_mapping_block(block: Block, pattern: str) -> dict[str, Any]:
    compiled = re.compile(pattern)
    rows: dict[str, Any] = {}
    for item in collect_list_items(block):
        match = compiled.match(item["text"])
        if match:
            rows[match.group(1)] = int(match.group(2)) if match.group(2).isdigit() else match.group(2)
    return rows


def parse_decision_table(block: Block) -> dict[str, Any]:
    decision_rows: list[dict[str, Any]] = []
    prelude: list[dict[str, Any]] = []
    notes: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    in_notes = False

    for index, raw_line in enumerate(block.lines[1:], start=block.start_line + 1):
        stripped = raw_line.strip()
        if not stripped:
            continue
        if stripped == "Notes:":
            if current is not None:
                decision_rows.append(current)
                current = None
            in_notes = True
            continue
        header_match = DECISION_HEADER_RE.match(stripped)
        if not in_notes and header_match:
            if current is not None:
                decision_rows.append(current)
            current = {
                "decision": header_match.group(1),
                "header": stripped,
                "line_number": index,
                "conditions": [],
            }
            continue
        bullet_match = re.match(r"^-\s+(.*)$", stripped)
        if bullet_match:
            target = notes if in_notes else (current["conditions"] if current is not None else prelude)
            target.append({"line_number": index, "text": bullet_match.group(1).strip()})
            continue
        target = notes if in_notes else (current["conditions"] if current is not None else prelude)
        if target:
            target[-1]["text"] += " " + stripped
            target[-1]["text"] = re.sub(r"\s+", " ", target[-1]["text"]).strip()
        else:
            prelude.append({"line_number": index, "text": stripped})

    if current is not None:
        decision_rows.append(current)

    for row in decision_rows:
        row["conditions"] = [
            {
                "line_number": condition["line_number"],
                "text": re.sub(r"\s+", " ", condition["text"]).strip(),
            }
            for condition in row["conditions"]
        ]
    return {
        "prelude": prelude,
        "branches": decision_rows,
        "notes": notes,
    }


def parse_reason_codes(block: Block) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for item in collect_list_items(block):
        codes = extract_code_spans(item["text"])
        if codes:
            rows.append({"line_number": item["line_number"], "reason_code": codes[0]})
    return rows


def parse_shared_contract(section_7_1: Block, explainability_sections: dict[str, Block], schemas: dict[str, Any]) -> dict[str, Any]:
    field_rows = parse_field_list_from_section_preamble(section_7_1)
    invariants = [item["text"] for item in collect_list_items(get_child_block(section_7_1, "Gate-record invariants"))]
    non_access_decisions = [codes[0] for item in collect_list_items(get_child_block(section_7_1, "Decision enum")) if (codes := extract_code_spans(item["text"]))]
    severity_enum = [codes[0] for item in collect_list_items(get_child_block(section_7_1, "Severity enum")) if (codes := extract_code_spans(item["text"]))]
    overrideability_enum = [codes[0] for item in collect_list_items(get_child_block(section_7_1, "Overrideability enum")) if (codes := extract_code_spans(item["text"]))]
    severity_mapping = parse_mapping_block(
        get_child_block(section_7_1, "Severity mapping rule"),
        r"^`([A-Z_]+) -> ([A-Z]+)`$",
    )
    decision_rank_mapping = parse_mapping_block(
        get_child_block(section_7_1, "Deterministic evaluation rule"),
        r"^`rank\(([A-Z_]+)\) = ([0-9]+)`$",
    )
    progression_rank_mapping = parse_mapping_block(
        get_child_block(section_7_1, "Monotone legal-progression rank"),
        r"^`gate_progress_rank\(([A-Z_]+)\) = ([0-9]+)`$",
    )
    readiness_rank_mapping = parse_mapping_block(
        get_child_block(section_7_1, "Monotone legal-progression rank"),
        r"^`readiness_rank\(([A-Z_]+)\) = ([0-9]+)`$",
    )
    monotone_lines = block_text_without_children(get_child_block(section_7_1, "Monotone legal-progression rank"))
    monotone_formula = next((row["text"] for row in monotone_lines if row["text"].startswith("`final_legal_progression_rank =")), "")

    explainability_policy_items = collect_list_items(explainability_sections["1. Governing explainability model"])
    compression_items = collect_list_items(explainability_sections["2. Compression boundary"])
    reason_policy_row = next(item["text"] for item in explainability_policy_items if "reason_order_policy" in item["text"])
    compression_cap_row = next(item["text"] for item in compression_items if "compression_reason_cap = 3" in item["text"])
    qualifier_rows = ordered_unique(
        [
        codes[0]
        for item in collect_list_items(explainability_sections["3. Semantic qualifier disclosure"])
        if (codes := extract_code_spans(item["text"]))
        ]
    )

    return {
        "gate_decision_record_required_fields": [row["field_name"] for row in field_rows],
        "gate_record_invariants": invariants,
        "non_access_decision_enum": non_access_decisions,
        "severity_enum": severity_enum,
        "severity_mapping": severity_mapping,
        "decision_rank_mapping": decision_rank_mapping,
        "progression_rank_mapping": progression_rank_mapping,
        "readiness_rank_mapping": readiness_rank_mapping,
        "overrideability_enum": overrideability_enum,
        "override_resolution_rule": block_text_without_children(get_child_block(section_7_1, "Override resolution rule")),
        "monotone_progression_formula": monotone_formula,
        "explainability_contract": {
            "reason_order_policy_summary": reason_policy_row,
            "compression_summary": compression_cap_row,
            "semantic_qualifier_order": qualifier_rows,
        },
        "schema_contract_refs": {
            "gate_decision_record_schema": repo_rel(GATE_DECISION_SCHEMA_PATH),
            "gate_semantics_contract_schema": repo_rel(GATE_SEMANTICS_SCHEMA_PATH),
            "preseal_gate_evaluation_schema": repo_rel(PRESEAL_SCHEMA_PATH),
        },
        "schema_gate_code_enum": schemas["gate_decision_record"]["properties"]["gate_code"]["enum"],
    }


def parse_reason_code_families(section_7_13: Block) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for item in collect_list_items(section_7_13):
        codes = extract_code_spans(item["text"])
        if codes:
            rows.append({"line_number": item["line_number"], "reason_code_family": codes[0]})
    return rows


def load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def classify_reason_code_family(gate_code: str, reason_code: str) -> str:
    prefix = REASON_CODE_FAMILY_PREFIXES[gate_code]
    if not reason_code.startswith(f"{prefix}_"):
        raise ValueError(f"Reason code `{reason_code}` does not match expected family prefix `{prefix}_`.")
    return f"{prefix}_*"


def infer_reason_decision_applicability(reason_code: str) -> list[str]:
    if reason_code.endswith("_OVERRIDE_REQUIRED"):
        return ["OVERRIDABLE_BLOCK"]
    if reason_code.endswith("_OVERRIDE_ACTIVE") or reason_code.endswith("_OVERRIDE_ACTIVE_NOTICE"):
        return ["PASS_WITH_NOTICE"]
    if "NOTICE" in reason_code or "NONCRITICAL" in reason_code:
        return ["PASS_WITH_NOTICE"]
    if "REVIEW" in reason_code or "REQUIRED_HUMAN_STEPS" in reason_code:
        return ["MANUAL_REVIEW"]
    if "UNSATISFIABLE" in reason_code or "MISSING" in reason_code or "BLOCK" in reason_code:
        return ["HARD_BLOCK", "OVERRIDABLE_BLOCK"]
    if reason_code.endswith("_MATCH") or reason_code.endswith("_GREEN") or reason_code.endswith("_ELIGIBLE"):
        return ["PASS"]
    return []


def build_phase_binding_rows(
    gate_code: str,
    spec: GateSpec,
    module_catalog: dict[str, Any],
    step_ledger: list[dict[str, Any]],
) -> dict[str, Any]:
    evaluation_refs: list[dict[str, Any]] = []
    consumer_refs: list[dict[str, Any]] = []
    gate_pattern = re.compile(rf"(?<![A-Z0-9_]){re.escape(gate_code)}(?![A-Z0-9_])")

    if gate_code == "ACCESS_GATE":
        for row in step_ledger:
            if row["phase_id"] != "P01":
                continue
            if "AUTHORIZE" in row.get("module_calls", []):
                evaluation_refs.append(
                    {
                        "phase_id": row["phase_id"],
                        "phase_name": row["phase_name"],
                        "row_id": row["row_id"],
                        "binding_class": "evaluation",
                        "module_name": "AUTHORIZE",
                        "source_ref": line_ref(repo_rel(ALGORITHM_DIR / "core_engine.md"), row["source_line_start"], gate_code),
                        "statement": row["statement"],
                    }
                )
            elif "ACCESS_BLOCKED_RESPONSE" in row.get("module_calls", []) or "ALLOW_MASKED" in row["statement"]:
                consumer_refs.append(
                    {
                        "phase_id": row["phase_id"],
                        "phase_name": row["phase_name"],
                        "row_id": row["row_id"],
                        "binding_class": "consumer",
                        "module_name": "ACCESS_BLOCKED_RESPONSE" if "ACCESS_BLOCKED_RESPONSE" in row.get("module_calls", []) else "ENFORCE_ACCESS_SCOPE_AND_MASKING",
                        "source_ref": line_ref(repo_rel(ALGORITHM_DIR / "core_engine.md"), row["source_line_start"], gate_code),
                        "statement": row["statement"],
                    }
                )
        return {
            "gate_code": gate_code,
            "evaluation_phase_refs": evaluation_refs,
            "consumer_phase_refs": consumer_refs,
            "module_bindings": ordered_unique(ref["module_name"] for ref in evaluation_refs + consumer_refs),
        }

    module_row = next((row for row in module_catalog["modules"] if row["module_name"] == gate_code), None)
    if module_row is not None:
        for binding in module_row.get("run_phase_bindings", []):
            evaluation_refs.append(
                {
                    "phase_id": binding["phase_id"],
                    "phase_name": binding["phase_name"],
                    "row_id": binding["step_id"],
                    "binding_class": "evaluation",
                    "module_name": gate_code,
                    "source_ref": line_ref(repo_rel(ALGORITHM_DIR / "core_engine.md"), binding["source_line_start"], gate_code),
                    "statement": next(
                        (
                            row["statement"]
                            for row in step_ledger
                            if row["row_id"] == binding["step_id"]
                        ),
                        "",
                    ),
                }
            )

    for row in step_ledger:
        if not gate_pattern.search(row["statement"]):
            continue
        if gate_code in row.get("gate_evaluations", []):
            continue
        consumer_refs.append(
            {
                "phase_id": row["phase_id"],
                "phase_name": row["phase_name"],
                "row_id": row["row_id"],
                "binding_class": "consumer",
                "module_name": row["module_calls"][0] if row.get("module_calls") else "inline_consumer",
                "source_ref": line_ref(repo_rel(ALGORITHM_DIR / "core_engine.md"), row["source_line_start"], gate_code),
                "statement": row["statement"],
            }
        )

    consumer_refs = sorted(
        consumer_refs,
        key=lambda row: (row["phase_id"], row["row_id"]),
    )
    return {
        "gate_code": gate_code,
        "evaluation_phase_refs": evaluation_refs,
        "consumer_phase_refs": consumer_refs,
        "module_bindings": ordered_unique(ref["module_name"] for ref in evaluation_refs + consumer_refs),
    }


def gate_stage_index(spec: GateSpec) -> int | None:
    return spec.non_access_stage_index


def gate_decision_effect_rows(spec: GateSpec, emitted_decisions: list[str]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for decision in emitted_decisions:
        if spec.gate_code == "ACCESS_GATE":
            effect = {
                "ALLOW": {
                    "blocks_seal": False,
                    "survives_seal": False,
                    "forces_review_workflow": False,
                    "allows_progress_with_notice": False,
                    "terminates_current_run": False,
                    "requires_child_manifest_for_legal_progress": False,
                    "effect_summary": "Proceed into manifest allocation and non-access gate planning.",
                },
                "ALLOW_MASKED": {
                    "blocks_seal": False,
                    "survives_seal": False,
                    "forces_review_workflow": False,
                    "allows_progress_with_notice": True,
                    "terminates_current_run": False,
                    "requires_child_manifest_for_legal_progress": False,
                    "effect_summary": "Continue, but masking binds only downstream projection and export surfaces.",
                },
                "REQUIRE_STEP_UP": {
                    "blocks_seal": True,
                    "survives_seal": False,
                    "forces_review_workflow": False,
                    "allows_progress_with_notice": False,
                    "terminates_current_run": True,
                    "requires_child_manifest_for_legal_progress": False,
                    "effect_summary": "Pre-manifest access exit; runtime cannot allocate a manifest until stronger authentication succeeds.",
                },
                "REQUIRE_APPROVAL": {
                    "blocks_seal": True,
                    "survives_seal": False,
                    "forces_review_workflow": True,
                    "allows_progress_with_notice": False,
                    "terminates_current_run": True,
                    "requires_child_manifest_for_legal_progress": False,
                    "effect_summary": "Pre-manifest access exit; approval flow must complete before execution can start.",
                },
                "DENY": {
                    "blocks_seal": True,
                    "survives_seal": False,
                    "forces_review_workflow": False,
                    "allows_progress_with_notice": False,
                    "terminates_current_run": True,
                    "requires_child_manifest_for_legal_progress": False,
                    "effect_summary": "Pre-manifest hard denial; execution stops before any manifest allocation.",
                },
            }[decision]
        elif spec.gate_code in {"MANIFEST_GATE", "ARTIFACT_CONTRACT_GATE", "INPUT_BOUNDARY_GATE", "DATA_QUALITY_GATE"}:
            effect = {
                "HARD_BLOCK": {
                    "blocks_seal": True,
                    "survives_seal": False,
                    "forces_review_workflow": False,
                    "allows_progress_with_notice": False,
                    "terminates_current_run": True,
                    "requires_child_manifest_for_legal_progress": True,
                    "effect_summary": "Blocks seal and terminalizes the pre-start path; legal continuation requires remediation or a child/replay lineage.",
                },
                "OVERRIDABLE_BLOCK": {
                    "blocks_seal": True,
                    "survives_seal": False,
                    "forces_review_workflow": True,
                    "allows_progress_with_notice": False,
                    "terminates_current_run": False,
                    "requires_child_manifest_for_legal_progress": False,
                    "effect_summary": "Blocks seal until a valid in-scope override is active for this gate.",
                },
                "MANUAL_REVIEW": {
                    "blocks_seal": False,
                    "survives_seal": True,
                    "forces_review_workflow": True,
                    "allows_progress_with_notice": False,
                    "terminates_current_run": False,
                    "requires_child_manifest_for_legal_progress": False,
                    "effect_summary": "Allows seal, but the unresolved review posture remains binding after seal and caps later automation.",
                },
                "PASS_WITH_NOTICE": {
                    "blocks_seal": False,
                    "survives_seal": True,
                    "forces_review_workflow": False,
                    "allows_progress_with_notice": True,
                    "terminates_current_run": False,
                    "requires_child_manifest_for_legal_progress": False,
                    "effect_summary": "Allows seal while preserving auditable notice posture for later TRUST_GATE and FILING_GATE consumption.",
                },
                "PASS": {
                    "blocks_seal": False,
                    "survives_seal": False,
                    "forces_review_workflow": False,
                    "allows_progress_with_notice": False,
                    "terminates_current_run": False,
                    "requires_child_manifest_for_legal_progress": False,
                    "effect_summary": "Allows the pre-seal chain to continue toward a complete ready-to-seal tape.",
                },
            }[decision]
        else:
            effect = {
                "HARD_BLOCK": {
                    "blocks_seal": False,
                    "survives_seal": True,
                    "forces_review_workflow": False,
                    "allows_progress_with_notice": False,
                    "terminates_current_run": True,
                    "requires_child_manifest_for_legal_progress": True,
                    "effect_summary": "Terminalizes the current progression path; legal continuation requires remediation or a new child lineage.",
                },
                "OVERRIDABLE_BLOCK": {
                    "blocks_seal": False,
                    "survives_seal": True,
                    "forces_review_workflow": True,
                    "allows_progress_with_notice": False,
                    "terminates_current_run": False,
                    "requires_child_manifest_for_legal_progress": False,
                    "effect_summary": "Blocks progression until a valid in-scope override is active for the unresolved prerequisite.",
                },
                "MANUAL_REVIEW": {
                    "blocks_seal": False,
                    "survives_seal": True,
                    "forces_review_workflow": True,
                    "allows_progress_with_notice": False,
                    "terminates_current_run": False,
                    "requires_child_manifest_for_legal_progress": False,
                    "effect_summary": "Routes into reviewer-facing progression without allowing straight-through automation.",
                },
                "PASS_WITH_NOTICE": {
                    "blocks_seal": False,
                    "survives_seal": True,
                    "forces_review_workflow": False,
                    "allows_progress_with_notice": True,
                    "terminates_current_run": False,
                    "requires_child_manifest_for_legal_progress": False,
                    "effect_summary": "Allows progress, but notice posture remains explicit and auditable downstream.",
                },
                "PASS": {
                    "blocks_seal": False,
                    "survives_seal": False,
                    "forces_review_workflow": False,
                    "allows_progress_with_notice": False,
                    "terminates_current_run": False,
                    "requires_child_manifest_for_legal_progress": False,
                    "effect_summary": "Allows the next ordered gate or live authority progression to continue automatically.",
                },
            }[decision]
        rows.append(
            {
                "gate_code": spec.gate_code,
                "decision": decision,
                **effect,
            }
        )
    return rows


def build_outputs() -> dict[str, Any]:
    exact_sections = parse_document_blocks(EXACT_GATE_PATH)
    explainability_sections = parse_document_blocks(EXPLAINABILITY_PATH)
    invariants_sections = parse_document_blocks(INVARIANTS_PATH)
    module_catalog = load_json(MODULE_CATALOG_PATH)
    phase_index = load_json(RUN_ENGINE_PHASE_INDEX_PATH)
    step_ledger = load_jsonl(RUN_ENGINE_STEP_LEDGER_PATH)
    schemas = {
        "gate_decision_record": load_json(GATE_DECISION_SCHEMA_PATH),
        "gate_semantics_contract": load_json(GATE_SEMANTICS_SCHEMA_PATH),
        "preseal_gate_evaluation": load_json(PRESEAL_SCHEMA_PATH),
    }

    order_rows = parse_gate_order(exact_sections["7.2"])
    order_map = {row["gate_code"]: row["evaluation_order_index"] for row in order_rows}
    shared_contract = parse_shared_contract(
        exact_sections["7.1"],
        explainability_sections,
        schemas,
    )
    reason_code_families = parse_reason_code_families(exact_sections["7.13"])

    registry_rows: list[dict[str, Any]] = []
    reason_code_rows: list[dict[str, Any]] = []
    override_rows: list[dict[str, Any]] = []
    phase_binding_rows: list[dict[str, Any]] = []
    terminalization_rows: list[dict[str, Any]] = []

    for spec in GATE_SPECS:
        if order_map[spec.gate_code] != spec.evaluation_order_index:
            raise ValueError(f"Gate order drift for `{spec.gate_code}`.")
        section = exact_sections[spec.section_id]
        intro_rows = block_text_without_children(section)
        purpose_rows = (
            block_text_without_children(get_child_block(section, "Purpose"))
            if any(child.title == "Purpose" for child in section.children)
            else []
        )
        inputs = [item["text"] for item in collect_list_items(get_child_block(section, "Inputs"))]
        decision_payload = parse_decision_table(get_child_block(section, "Decision table"))
        reason_code_items: list[dict[str, Any]] = []
        if any(child.title == "Reason codes" for child in section.children):
            reason_code_items = parse_reason_codes(get_child_block(section, "Reason codes"))
        reason_codes = [row["reason_code"] for row in reason_code_items]

        if spec.gate_class == "access":
            decision_enum = [codes[0] for item in collect_list_items(get_child_block(section, "Output enum")) if (codes := extract_code_spans(item["text"]))]
            severity_model = {
                "profile_code": "ACCESS_GATE_SPECIAL_DECISION_ENUM",
                "severity_enum": [],
                "decision_to_severity": {},
                "notes": [
                    "ACCESS_GATE is not serialized as GateDecisionRecord and therefore does not use the non-access severity enum.",
                ],
            }
        else:
            decision_enum = shared_contract["non_access_decision_enum"]
            severity_model = {
                "profile_code": "NON_ACCESS_GATE_SEVERITY_V1",
                "severity_enum": shared_contract["severity_enum"],
                "decision_to_severity": shared_contract["severity_mapping"],
                "decision_rank": shared_contract["decision_rank_mapping"],
                "progression_rank": shared_contract["progression_rank_mapping"],
            }

        gate_reason_families = ordered_unique(
            classify_reason_code_family(spec.gate_code, code) for code in reason_codes
        )
        phase_binding = build_phase_binding_rows(spec.gate_code, spec, module_catalog, step_ledger)
        phase_binding_rows.append(
            {
                **phase_binding,
                "source_file": repo_rel(EXACT_GATE_PATH),
                "source_heading_or_logical_block": line_ref(repo_rel(EXACT_GATE_PATH), section.start_line, spec.gate_code),
                "rationale": f"Phase and module bindings for `{spec.gate_code}` normalized from the run-engine step ledger and module catalog.",
            }
        )

        decision_rows = [branch["decision"] for branch in decision_payload["branches"]]
        terminalization_rows.extend(gate_decision_effect_rows(spec, decision_rows))

        source_refs = ordered_unique(
            [
                line_ref(repo_rel(EXACT_GATE_PATH), section.start_line, spec.gate_code),
                line_ref(repo_rel(EXACT_GATE_PATH), get_child_block(section, "Inputs").start_line, f"{spec.gate_code}.inputs"),
                line_ref(repo_rel(EXACT_GATE_PATH), get_child_block(section, "Decision table").start_line, f"{spec.gate_code}.decision_table"),
            ]
            + (
                [line_ref(repo_rel(EXACT_GATE_PATH), get_child_block(section, "Reason codes").start_line, f"{spec.gate_code}.reason_codes")]
                if reason_code_items
                else []
            )
        )

        notes = list(spec.notes)
        if spec.gate_code == "TRUST_GATE":
            notes.append("TRUST_GATE may only mirror unresolved upstream override posture, never invent a synthetic trust override family.")
        if spec.gate_code == "FILING_GATE":
            notes.append("FILING_GATE may appear on early filing-readiness failure branches before full trust synthesis completes.")
        if spec.gate_code == "AMENDMENT_GATE":
            notes.append("A narrow early-failure amendment-basis exception may emit AMENDMENT_GATE before the ordinary parity/trust sequence.")

        registry_rows.append(
            {
                "gate_code": spec.gate_code,
                "evaluation_order_index": spec.evaluation_order_index,
                "non_access_stage_index_or_null": gate_stage_index(spec),
                "gate_family": spec.gate_family,
                "gate_class": spec.gate_class,
                "evaluation_scope_condition": spec.evaluation_scope_condition,
                "conditional_runtime_scope_tokens": list(spec.conditional_runtime_scope_tokens),
                "canonical_inputs": inputs,
                "decision_enum": decision_enum,
                "severity_model": severity_model,
                "overrideability": spec.overrideability,
                "reason_codes": reason_codes,
                "reason_code_families": gate_reason_families,
                "monotone_progression_rank_behavior": (
                    "ACCESS_GATE is outside the non-access monotone progression-rank contract."
                    if spec.gate_class == "access"
                    else (
                        "Inherited non-access monotone-min contract from section 7.1; later gates may narrow but never raise legal progression."
                        if spec.gate_code not in {"FILING_GATE", "TRUST_GATE"}
                        else (
                            "FILING_GATE is an explicit monotone narrowing stage that may reduce inherited progression rank but may not upgrade it."
                            if spec.gate_code == "FILING_GATE"
                            else "TRUST_GATE freezes the current upstream gate cap and may not exceed that persisted progression ceiling."
                        )
                    )
                ),
                "phase_bindings": phase_binding["evaluation_phase_refs"],
                "upstream_gate_dependencies": list(spec.upstream_gate_dependencies),
                "downstream_consumers": list(spec.downstream_consumers),
                "terminalization_effects": [
                    row["effect_summary"]
                    for row in terminalization_rows
                    if row["gate_code"] == spec.gate_code
                ],
                "decision_table": decision_payload,
                "purpose_or_intro": intro_rows[0]["text"] if intro_rows else (purpose_rows[0]["text"] if purpose_rows else ""),
                "source_refs": source_refs,
                "notes": ordered_unique(notes),
                "source_file": repo_rel(EXACT_GATE_PATH),
                "source_heading_or_logical_block": source_refs[0],
                "rationale": f"`{spec.gate_code}` is normalized from the canonical gate tables into one implementation-grade registry row.",
            }
        )

        override_rows.append(
            {
                "gate_code": spec.gate_code,
                "overrideability": spec.overrideability,
                "may_emit_overridable_block": "OVERRIDABLE_BLOCK" in decision_rows,
                "override_scope_source": (
                    "Distinct access escalation is not modeled as gate override."
                    if spec.gate_code == "ACCESS_GATE"
                    else (
                        "Gate-local override family documented in this gate section."
                        if spec.overrideability == "SCOPED_OVERRIDE_ALLOWED"
                        else (
                            "Downstream gate may only mirror already-documented upstream override dependency."
                            if spec.overrideability == "SCOPED_OVERRIDE_REQUIRED"
                            else "No override path is defined for this gate."
                        )
                    )
                ),
                "override_prerequisites": list(spec.upstream_gate_dependencies),
                "max_progression_with_valid_override": (
                    None
                    if spec.gate_code == "ACCESS_GATE" or spec.overrideability in {"NONE", "NON_OVERRIDEABLE"}
                    else ("PASS_WITH_NOTICE" if spec.gate_code == "FILING_GATE" else "PASS_WITH_NOTICE_OR_PASS")
                ),
                "override_forbidden_effects": [
                    "May not legalize missing prerequisites.",
                    "May not bypass required later gates.",
                    "May not convert HARD_BLOCK into progress.",
                    "May not fabricate authority truth.",
                    "May not widen runtime scope.",
                ] if spec.gate_code != "ACCESS_GATE" else [
                    "Access escalation is distinct from exceptional override and cannot be treated as a filing override.",
                ],
                "source_refs": source_refs,
                "source_file": repo_rel(EXACT_GATE_PATH),
                "source_heading_or_logical_block": source_refs[0],
                "rationale": f"Override resolution posture for `{spec.gate_code}` normalized from gate semantics and the override-governance invariants.",
            }
        )

        for row in reason_code_items:
            reason_code_rows.append(
                {
                    "reason_code_id": f"{spec.gate_code}::{row['reason_code']}",
                    "reason_code": row["reason_code"],
                    "gate_code": spec.gate_code,
                    "reason_code_family": classify_reason_code_family(spec.gate_code, row["reason_code"]),
                    "decision_applicability": infer_reason_decision_applicability(row["reason_code"]),
                    "is_override_related": "OVERRIDE" in row["reason_code"],
                    "source_file": repo_rel(EXACT_GATE_PATH),
                    "source_heading_or_logical_block": line_ref(repo_rel(EXACT_GATE_PATH), row["line_number"], row["reason_code"]),
                    "rationale": f"`{row['reason_code']}` is an explicitly enumerated reason code for `{spec.gate_code}`.",
                }
            )

    registry_rows.sort(key=lambda row: row["evaluation_order_index"])
    override_rows.sort(key=lambda row: next(spec.evaluation_order_index for spec in GATE_SPECS if spec.gate_code == row["gate_code"]))
    phase_binding_rows.sort(key=lambda row: next(spec.evaluation_order_index for spec in GATE_SPECS if spec.gate_code == row["gate_code"]))
    terminalization_rows.sort(key=lambda row: (next(spec.evaluation_order_index for spec in GATE_SPECS if spec.gate_code == row["gate_code"]), row["decision"]))

    declared_reason_families = [row["reason_code_family"] for row in reason_code_families]
    instantiated_reason_families = ordered_unique(row["reason_code_family"] for row in reason_code_rows)
    missing_reason_families = [family for family in declared_reason_families if family not in instantiated_reason_families]

    gate_order_rows = []
    for row in registry_rows:
        gate_order_rows.append(
            {
                "evaluation_order_index": row["evaluation_order_index"],
                "gate_code": row["gate_code"],
                "gate_class": row["gate_class"],
                "non_access_stage_index_or_null": "" if row["non_access_stage_index_or_null"] is None else row["non_access_stage_index_or_null"],
                "gate_family": row["gate_family"],
                "evaluation_scope_condition": row["evaluation_scope_condition"],
                "conditional_runtime_scope_tokens": "; ".join(row["conditional_runtime_scope_tokens"]),
                "upstream_gate_dependencies": "; ".join(row["upstream_gate_dependencies"]),
                "source_file": row["source_file"],
                "source_heading_or_logical_block": row["source_heading_or_logical_block"],
            }
        )

    registry_payload = {
        "summary": {
            "gate_count": len(registry_rows),
            "access_gate_count": len([row for row in registry_rows if row["gate_class"] == "access"]),
            "non_access_gate_count": len([row for row in registry_rows if row["gate_class"] == "non_access"]),
            "reason_code_count": len(reason_code_rows),
            "declared_reason_code_family_count": len(declared_reason_families),
            "instantiated_reason_code_family_count": len(instantiated_reason_families),
            "missing_reason_code_families": missing_reason_families,
            "gate_family_counts": dict(sorted(Counter(row["gate_family"] for row in registry_rows).items())),
        },
        "shared_contract": shared_contract,
        "reason_code_family_declarations": declared_reason_families,
        "gates": registry_rows,
    }

    override_payload = {
        "summary": {
            "row_count": len(override_rows),
            "overrideability_counts": dict(sorted(Counter(row["overrideability"] for row in override_rows).items())),
        },
        "rows": override_rows,
    }
    phase_binding_payload = {
        "summary": {
            "row_count": len(phase_binding_rows),
            "evaluation_ref_count": sum(len(row["evaluation_phase_refs"]) for row in phase_binding_rows),
            "consumer_ref_count": sum(len(row["consumer_phase_refs"]) for row in phase_binding_rows),
        },
        "rows": phase_binding_rows,
    }
    terminalization_payload = {
        "summary": {
            "row_count": len(terminalization_rows),
            "decision_counts": dict(sorted(Counter(row["decision"] for row in terminalization_rows).items())),
        },
        "rows": terminalization_rows,
    }

    return {
        "registry": registry_payload,
        "gate_order": gate_order_rows,
        "reason_codes": reason_code_rows,
        "override_matrix": override_payload,
        "phase_bindings": phase_binding_payload,
        "terminalization": terminalization_payload,
    }


def write_gate_order_csv(rows: list[dict[str, Any]]) -> None:
    GATE_ORDER_PATH.parent.mkdir(parents=True, exist_ok=True)
    with GATE_ORDER_PATH.open("w", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "evaluation_order_index",
                "gate_code",
                "gate_class",
                "non_access_stage_index_or_null",
                "gate_family",
                "evaluation_scope_condition",
                "conditional_runtime_scope_tokens",
                "upstream_gate_dependencies",
                "source_file",
                "source_heading_or_logical_block",
            ],
        )
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def render_mermaid(rows: list[dict[str, Any]]) -> str:
    lines = ["flowchart LR", '    A1["1. ACCESS_GATE"]']
    previous = "A1"
    node_ids = {"ACCESS_GATE": "A1"}
    for index, row in enumerate(rows[1:], start=2):
        node_id = f"A{index}"
        node_ids[row["gate_code"]] = node_id
        label = f"{row['evaluation_order_index']}. {row['gate_code']}"
        if row["conditional_runtime_scope_tokens"]:
            label += "\\n(" + ", ".join(row["conditional_runtime_scope_tokens"]) + ")"
        lines.append(f'    {node_id}["{label}"]')
        lines.append(f"    {previous} --> {node_id}")
        previous = node_id
    lines.append('    note1["Pre-seal prefix: MANIFEST, ARTIFACT_CONTRACT, INPUT_BOUNDARY, DATA_QUALITY"]')
    lines.append("    A2 -.-> note1")
    lines.append('    note2["Late gates append post-seal without rewriting earlier records"]')
    lines.append("    A6 -.-> note2")
    return "\n".join(lines) + "\n"


def render_docs(outputs: dict[str, Any]) -> tuple[str, str, str]:
    registry = outputs["registry"]
    override_rows = outputs["override_matrix"]["rows"]
    terminal_rows = outputs["terminalization"]["rows"]
    phase_rows = {row["gate_code"]: row for row in outputs["phase_bindings"]["rows"]}
    reason_rows_by_gate: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in outputs["reason_codes"]:
        reason_rows_by_gate[row["gate_code"]].append(row)

    main_lines = [
        "# Gate Order, Reason Codes, and Override Rules",
        "",
        "## Shared Contract",
        "",
        f"- Gate count: `{registry['summary']['gate_count']}`",
        f"- Non-access gates: `{registry['summary']['non_access_gate_count']}`",
        f"- Declared reason-code families: `{registry['summary']['declared_reason_code_family_count']}`",
        f"- Instantiated reason-code families: `{registry['summary']['instantiated_reason_code_family_count']}`",
        f"- Missing declared families: `{', '.join(registry['summary']['missing_reason_code_families']) or 'none'}`",
        "",
        "| Profile | Value |",
        "| --- | --- |",
        f"| Non-access decision enum | `{', '.join(registry['shared_contract']['non_access_decision_enum'])}` |",
        f"| Severity mapping | `{', '.join(f'{k}->{v}' for k, v in registry['shared_contract']['severity_mapping'].items())}` |",
        f"| Progression ranks | `{', '.join(f'{k}->{v}' for k, v in registry['shared_contract']['progression_rank_mapping'].items())}` |",
        f"| Readiness ranks | `{', '.join(f'{k}->{v}' for k, v in registry['shared_contract']['readiness_rank_mapping'].items())}` |",
        f"| Overrideability enum | `{', '.join(registry['shared_contract']['overrideability_enum'])}` |",
        "",
        "## Canonical Gate Order",
        "",
        "| Order | Gate | Class | Scope Condition |",
        "| --- | --- | --- | --- |",
    ]
    for row in registry["gates"]:
        main_lines.append(
            f"| {row['evaluation_order_index']} | `{row['gate_code']}` | `{row['gate_class']}` | {row['evaluation_scope_condition']} |"
        )

    for row in registry["gates"]:
        phase_binding = phase_rows[row["gate_code"]]
        main_lines.extend(
            [
                "",
                f"## {row['gate_code']}",
                "",
                f"- Family: `{row['gate_family']}`",
                f"- Overrideability: `{row['overrideability']}`",
                f"- Inputs: `{len(row['canonical_inputs'])}`",
                f"- Reason codes: `{len(row['reason_codes'])}`",
                f"- Evaluation phase refs: `{len(phase_binding['evaluation_phase_refs'])}`",
                f"- Consumer phase refs: `{len(phase_binding['consumer_phase_refs'])}`",
                "",
                row["purpose_or_intro"],
                "",
                "### Decision Table",
                "",
            ]
        )
        for branch in row["decision_table"]["branches"]:
            main_lines.append(f"- `{branch['decision']}`: " + ("; ".join(item["text"] for item in branch["conditions"]) or "no extra branch bullets"))
        if row["decision_table"]["notes"]:
            main_lines.extend(["", "### Section Notes", ""])
            for note in row["decision_table"]["notes"]:
                main_lines.append(f"- {note['text']}")
        if row["reason_codes"]:
            main_lines.extend(["", "### Reason Codes", ""])
            main_lines.append("- " + ", ".join(f"`{code}`" for code in row["reason_codes"]))
        if row["notes"]:
            main_lines.extend(["", "### Normalization Notes", ""])
            for note in row["notes"]:
                main_lines.append(f"- {note}")

    progression_lines = [
        "# Gate Progression and Terminalization Matrix",
        "",
        "| Gate | Decision | Blocks Seal | Survives Seal | Review Only | Notice | Terminates Run | Child Manifest Required |",
        "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for row in terminal_rows:
        progression_lines.append(
            f"| `{row['gate_code']}` | `{row['decision']}` | `{str(row['blocks_seal']).lower()}` | `{str(row['survives_seal']).lower()}` | `{str(row['forces_review_workflow']).lower()}` | `{str(row['allows_progress_with_notice']).lower()}` | `{str(row['terminates_current_run']).lower()}` | `{str(row['requires_child_manifest_for_legal_progress']).lower()}` |"
        )
    progression_lines.extend(["", "## Effect Summaries", ""])
    for row in terminal_rows:
        progression_lines.append(f"- `{row['gate_code']}` / `{row['decision']}`: {row['effect_summary']}")

    explain_lines = [
        "# Gate Explainability and Reason-Code Usage",
        "",
        "## Shared Explainability Contract",
        "",
        f"- {registry['shared_contract']['explainability_contract']['reason_order_policy_summary']}",
        f"- {registry['shared_contract']['explainability_contract']['compression_summary']}",
        f"- Semantic qualifier order: `{', '.join(registry['shared_contract']['explainability_contract']['semantic_qualifier_order'])}`",
        "",
        "## Reason-Code Families",
        "",
        "| Family | Registered Count | Notes |",
        "| --- | --- | --- |",
    ]
    family_counts = Counter(row["reason_code_family"] for row in outputs["reason_codes"])
    declared_families = registry["reason_code_family_declarations"]
    for family in declared_families:
        note = "No explicit gate-level codes were enumerated in the primary source." if family not in family_counts else "Explicitly enumerated."
        explain_lines.append(f"| `{family}` | `{family_counts.get(family, 0)}` | {note} |")

    explain_lines.extend(["", "## Per-Gate Reason Codes", ""])
    for gate in registry["gates"]:
        explain_lines.append(f"### {gate['gate_code']}")
        if not reason_rows_by_gate[gate["gate_code"]]:
            explain_lines.append("")
            explain_lines.append("- No explicit reason-code list was enumerated in the gate section.")
            explain_lines.append("")
            continue
        explain_lines.append("")
        for row in reason_rows_by_gate[gate["gate_code"]]:
            applicability = ", ".join(row["decision_applicability"]) if row["decision_applicability"] else "context-dependent"
            explain_lines.append(f"- `{row['reason_code']}`: family `{row['reason_code_family']}`, decision applicability `{applicability}`")
        explain_lines.append("")

    return (
        "\n".join(main_lines).rstrip() + "\n",
        "\n".join(progression_lines).rstrip() + "\n",
        "\n".join(explain_lines).rstrip() + "\n",
    )


def main() -> int:
    outputs = build_outputs()
    json_write(REGISTRY_PATH, outputs["registry"])
    write_gate_order_csv(outputs["gate_order"])
    jsonl_write(REASON_CODE_PATH, outputs["reason_codes"])
    json_write(OVERRIDE_MATRIX_PATH, outputs["override_matrix"])
    json_write(PHASE_BINDING_PATH, outputs["phase_bindings"])
    json_write(TERMINALIZATION_PATH, outputs["terminalization"])
    main_doc, progression_doc, explain_doc = render_docs(outputs)
    GATE_DOC_PATH.write_text(main_doc)
    PROGRESSION_DOC_PATH.write_text(progression_doc)
    EXPLAINABILITY_DOC_PATH.write_text(explain_doc)
    MERMAID_PATH.write_text(render_mermaid(outputs["registry"]["gates"]))

    summary = {
        "status": "PASS",
        "gate_count": outputs["registry"]["summary"]["gate_count"],
        "reason_code_count": outputs["registry"]["summary"]["reason_code_count"],
        "phase_binding_row_count": outputs["phase_bindings"]["summary"]["row_count"],
        "terminalization_row_count": outputs["terminalization"]["summary"]["row_count"],
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
