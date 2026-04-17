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

STATE_MACHINE_DOC_PATH = DOCS_ANALYSIS_DIR / "09_state_machine_definitions_and_transition_invariants.md"
TERMINAL_DOC_PATH = DOCS_ANALYSIS_DIR / "09_terminal_recovery_and_supersession_matrix.md"
INVARIANT_DOC_PATH = DOCS_ANALYSIS_DIR / "09_cross_state_invariant_index.md"
MERMAID_PATH = DIAGRAMS_ANALYSIS_DIR / "09_state_machine_overview.mmd"

REGISTRY_PATH = DATA_ANALYSIS_DIR / "state_machine_registry.json"
EDGE_CSV_PATH = DATA_ANALYSIS_DIR / "state_transition_edges.csv"
INVARIANTS_PATH = DATA_ANALYSIS_DIR / "state_machine_invariants.jsonl"
SCHEMA_COVERAGE_PATH = DATA_ANALYSIS_DIR / "state_machine_schema_coverage.json"
COMPOUND_AXES_PATH = DATA_ANALYSIS_DIR / "compound_state_axes.json"
AMBIGUITY_PATH = DATA_ANALYSIS_DIR / "unmodeled_or_ambiguous_state_postures.json"

STATE_MACHINES_PATH = ALGORITHM_DIR / "state_machines.md"
SCHEMAS_DIR = ALGORITHM_DIR / "schemas"
ENTITY_CATALOG_PATH = DATA_ANALYSIS_DIR / "entity_catalog.json"
MODULE_CATALOG_PATH = DATA_ANALYSIS_DIR / "module_catalog.json"
RUN_ENGINE_PHASE_INDEX_PATH = DATA_ANALYSIS_DIR / "run_engine_phase_index.json"

SECTION_ID_RE = re.compile(r"^##\s+(6\.[0-9]+[A-Z]?)\s+(.*)$")
H3_MACHINE_RE = re.compile(r"^###\s+([A-H])\.\s+(.*)$")
HEADING_RE = re.compile(r"^(#{2,4})\s+(.*)$")
STATEFUL_FIELD_NAME_RE = re.compile(
    r"(?:^|_)(?:lifecycle|cursor|promotion|bundle|acceptance|rollout|phase|decision|rotation|"
    r"checkpoint|state|band|level|posture|readiness)(?:$|_)",
)
EXPLICIT_TRANSITION_RE = re.compile(
    r"^(?P<source>[^`]+?)\s+--(?P<event>[^-][^-]*?)-->\s+(?P<target>.+)$"
)
FIELD_REF_RE = re.compile(r"`([A-Z][A-Za-z0-9_]+)\.([A-Za-z_][A-Za-z0-9_]*)`")
CODE_SPAN_RE = re.compile(r"`([^`]+)`")
OBJECT_TOKEN_RE = re.compile(r"\b([A-Z][A-Za-z0-9_]+)\b")

STATE_MACHINE_CLASSES = {
    "lifecycle",
    "cursor",
    "classification_axis",
    "compound_axis",
    "release_control",
}
TRANSITION_KINDS = {"explicit_event_edge", "prose_rule"}
SCHEMA_COVERAGE_STATUSES = {
    "exact_match",
    "schema_superset",
    "schema_subset",
    "field_missing",
    "schema_missing",
    "no_enum",
    "non_enumerated_counter_field",
}

EXCLUDED_AMBIGUOUS_FIELDS = {
    "state_changed_at",
    "abandoned_at",
    "legal_state_rules",
    "budget_state_counts",
    "original_acceptance_state",
    "non_confirming_state_policy",
    "window_state_or_null",
    "publication_generation",
    "guard_vector_hash",
    "frame_epoch",
    "shell_stability_token",
}


@dataclass(frozen=True)
class MachineSpec:
    object_family: str
    state_field: str
    machine_class: str
    state_sources: tuple[tuple[str, str | None], ...] = ()
    explicit_transition_sources: tuple[tuple[str, str | None], ...] = ()
    prose_transition_sources: tuple[tuple[str, str | None], ...] = ()
    rule_sources: tuple[tuple[str, str | None], ...] = ()
    schema_title: str | None = None
    notes: tuple[str, ...] = ()

    @property
    def machine_id(self) -> str:
        return f"machine_{snake_case(self.object_family)}_{self.state_field}"


@dataclass
class Block:
    key: str
    title: str
    level: int
    start_index: int
    end_index: int
    start_line: int
    end_line: int
    lines: list[str]
    children: list["Block"] = field(default_factory=list)


def snake_case(text: str) -> str:
    text = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", text)
    text = re.sub(r"[^A-Za-z0-9]+", "_", text)
    return text.strip("_").lower()


def repo_rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def line_ref(path: str, line_number: int, label: str) -> str:
    safe_label = re.sub(r"[^A-Za-z0-9_.-]+", "_", label).strip("_") or "line"
    return f"{path}::L{line_number}[{safe_label}]"


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


def normalize_schema_path(raw_path: str) -> str:
    if raw_path.startswith("Algorithm/"):
        return raw_path
    return f"Algorithm/{raw_path.lstrip('/')}"


def spec(
    object_family: str,
    state_field: str,
    machine_class: str,
    *,
    states: tuple[tuple[str, str | None], ...] = (),
    transitions: tuple[tuple[str, str | None], ...] = (),
    prose_transitions: tuple[tuple[str, str | None], ...] = (),
    rules: tuple[tuple[str, str | None], ...] = (),
    schema_title: str | None = None,
    notes: tuple[str, ...] = (),
) -> MachineSpec:
    return MachineSpec(
        object_family=object_family,
        state_field=state_field,
        machine_class=machine_class,
        state_sources=states,
        explicit_transition_sources=transitions,
        prose_transition_sources=prose_transitions,
        rule_sources=rules,
        schema_title=schema_title,
        notes=notes,
    )


MACHINE_SPECS = [
    spec(
        "RunManifest",
        "lifecycle_state",
        "lifecycle",
        states=(("6.2", "States"),),
        transitions=(("6.2", "Allowed transitions"),),
        rules=(("6.2", "Rules"),),
    ),
    spec(
        "NightlyBatchRun",
        "lifecycle_state",
        "lifecycle",
        states=(("6.2A", "States"),),
        transitions=(("6.2A", "Allowed transitions"),),
        rules=(("6.2A", "Rules"),),
    ),
    spec(
        "ExperienceCursor",
        "cursor_state",
        "cursor",
        states=(("6.2B", "States"), ("6.25B", "States")),
        transitions=(("6.2B", "Allowed transitions"), ("6.25B", "Allowed transitions")),
        rules=(("6.2B", "Rules"), ("6.25B", "Rules")),
        notes=(
            "ASSUMPTION_MERGED_SHARED_CURSOR_AND_OPERATIONAL_CURSOR_RULES",
            "CONFLICT_REBASED_TERMINALITY_OVERLAY_REQUIRES_IMPLEMENTATION_DECISION",
        ),
    ),
    spec(
        "WorkspaceCursor",
        "cursor_state",
        "cursor",
        states=(("6.2B", "States"),),
        transitions=(("6.2B", "Allowed transitions"),),
        rules=(("6.2B", "Rules"),),
    ),
    spec(
        "ConfigVersion",
        "lifecycle_state",
        "lifecycle",
        states=(("6.3", "States"),),
        transitions=(("6.3", "Allowed transitions"),),
        rules=(("6.3", "Rules"),),
    ),
    spec(
        "ConfigChangeRequest",
        "lifecycle_state",
        "lifecycle",
        states=(("6.4", "States"),),
        transitions=(("6.4", "Allowed transitions"),),
        rules=(("6.4", "Rules"),),
    ),
    spec(
        "SourceCollectionRun",
        "lifecycle_state",
        "lifecycle",
        states=(("6.5", "States"),),
        transitions=(("6.5", "Allowed transitions"),),
        rules=(("6.5", "Rules"),),
    ),
    spec(
        "Snapshot",
        "lifecycle_state",
        "lifecycle",
        states=(("6.6", "States"),),
        transitions=(("6.6", "Allowed transitions"),),
        rules=(("6.6", "Rules"),),
    ),
    spec(
        "EvidenceItem",
        "lifecycle_state",
        "lifecycle",
        states=(("6.7", "States"),),
        transitions=(("6.7", "Allowed transitions"),),
        rules=(("6.7", "Rules"),),
    ),
    spec(
        "CanonicalFact",
        "promotion_state",
        "lifecycle",
        states=(("6.8", "States"),),
        transitions=(("6.8", "Allowed transitions"),),
        rules=(("6.8", "Rules"),),
    ),
    spec(
        "ComputeResult",
        "lifecycle_state",
        "lifecycle",
        states=(("6.9", "States"),),
        transitions=(("6.9", "Allowed transitions"),),
        rules=(("6.9", "Rules"),),
    ),
    spec(
        "ParityResult",
        "lifecycle_state",
        "lifecycle",
        states=(("6.10", "Lifecycle states"),),
        transitions=(("6.10", "Allowed transitions"),),
        rules=(("6.10", "Rules"),),
    ),
    spec(
        "ParityResult",
        "parity_classification",
        "classification_axis",
        states=(("6.10", "Required semantic classifications"),),
        rules=(("6.10", "Rules"),),
    ),
    spec(
        "TrustSummary",
        "lifecycle_state",
        "lifecycle",
        states=(("6.11", "Lifecycle states"),),
        transitions=(("6.11", "Allowed transitions"),),
        rules=(("6.11", "Rules"),),
    ),
    spec(
        "TrustSummary",
        "trust_input_state",
        "classification_axis",
        states=(("6.11", "Trust-input states"),),
        rules=(("6.11", "Rules"),),
    ),
    spec(
        "TrustSummary",
        "trust_band",
        "classification_axis",
        states=(("6.11", "Trust bands"),),
        rules=(("6.11", "Rules"),),
    ),
    spec(
        "TrustSummary",
        "score_band",
        "classification_axis",
        states=(("6.11", "Score bands"),),
        rules=(("6.11", "Rules"),),
    ),
    spec(
        "TrustSummary",
        "cap_band",
        "classification_axis",
        states=(("6.11", "Trust bands"),),
        rules=(("6.11", "Rules"),),
        notes=("ASSUMPTION_CAP_BAND_REUSES_TRUST_BAND_VOCABULARY_FROM_SECTION_6_11",),
    ),
    spec(
        "TrustSummary",
        "upstream_gate_cap",
        "classification_axis",
        states=(("6.11", "Upstream gate cap"),),
        rules=(("6.11", "Rules"),),
    ),
    spec(
        "TrustSummary",
        "trust_level",
        "classification_axis",
        states=(("6.11", "Projected trust levels"),),
        rules=(("6.11", "Rules"),),
    ),
    spec(
        "TrustSummary",
        "automation_level",
        "classification_axis",
        states=(("6.11", "Automation levels"),),
        rules=(("6.11", "Rules"),),
    ),
    spec(
        "TrustSummary",
        "threshold_stability_state",
        "classification_axis",
        states=(("6.11", "Threshold stability states"),),
        rules=(("6.11", "Rules"),),
    ),
    spec(
        "TrustSummary",
        "filing_readiness",
        "classification_axis",
        states=(("6.11", "Filing readiness"),),
        rules=(("6.11", "Rules"),),
    ),
    spec(
        "EvidenceGraph",
        "lifecycle_state",
        "lifecycle",
        states=(("6.12", "States"), ("6.30", "EvidenceGraph states")),
        transitions=(("6.12", "Allowed transitions"),),
        prose_transitions=(("6.30", "EvidenceGraph transition rules"),),
        rules=(("6.12", "Rules"), ("6.30", "EvidenceGraph transition rules")),
        notes=("ASSUMPTION_MERGED_EVIDENCE_GRAPH_BASE_AND_FILING_PROOF_OVERLAY",),
    ),
    spec(
        "TwinView",
        "lifecycle_state",
        "lifecycle",
        states=(("6.13", "States"),),
        transitions=(("6.13", "Allowed transitions"),),
        rules=(("6.13", "Rules"),),
    ),
    spec(
        "TwinStateSnapshot",
        "assembly_state",
        "lifecycle",
        states=(("6.13A", "States"),),
        transitions=(("6.13A", "Allowed transitions"),),
        rules=(("6.13A", "Rules"),),
    ),
    spec(
        "TwinReconciliationState",
        "lifecycle_state",
        "lifecycle",
        states=(("6.13B", "States"),),
        transitions=(("6.13B", "Allowed transitions"),),
        rules=(("6.13B", "Rules"),),
    ),
    spec(
        "WorkflowItem",
        "lifecycle_state",
        "lifecycle",
        states=(("6.14", "States"),),
        transitions=(("6.14", "Allowed transitions"),),
        rules=(("6.14", "Rules"),),
    ),
    spec(
        "Override",
        "lifecycle_state",
        "lifecycle",
        states=(("6.15", "States"),),
        transitions=(("6.15", "Allowed transitions"),),
        rules=(("6.15", "Rules"),),
    ),
    spec(
        "AuthorityLink",
        "lifecycle_state",
        "lifecycle",
        states=(("6.16", "States"),),
        transitions=(("6.16", "Allowed transitions"),),
        rules=(("6.16", "Rules"),),
    ),
    spec(
        "ObligationMirror",
        "lifecycle_state",
        "lifecycle",
        states=(("6.17", "States"),),
        transitions=(("6.17", "Allowed transitions"),),
        rules=(("6.17", "Rules"),),
    ),
    spec(
        "FilingPacket",
        "lifecycle_state",
        "lifecycle",
        states=(("6.18", "States"),),
        transitions=(("6.18", "Allowed transitions"),),
        rules=(("6.18", "Rules"),),
    ),
    spec(
        "SubmissionRecord",
        "lifecycle_state",
        "lifecycle",
        states=(("6.19", "States"),),
        transitions=(("6.19", "Allowed transitions"),),
        rules=(("6.19", "Rules"),),
    ),
    spec(
        "AuthorityInteractionRecord",
        "lifecycle_state",
        "lifecycle",
        states=(("6.19A", "States"),),
        transitions=(("6.19A", "Allowed transitions"),),
        rules=(("6.19A", "Rules"),),
    ),
    spec(
        "FilingCase",
        "lifecycle_state",
        "lifecycle",
        states=(("6.20", "States"),),
        transitions=(("6.20", "Allowed transitions"),),
        rules=(("6.20", "Rules"),),
    ),
    spec(
        "DriftRecord",
        "lifecycle_state",
        "lifecycle",
        states=(("6.21", "States"),),
        transitions=(("6.21", "Allowed transitions"),),
        rules=(("6.21", "Rules"),),
    ),
    spec(
        "AmendmentCase",
        "lifecycle_state",
        "lifecycle",
        states=(("6.22", "States"),),
        transitions=(("6.22", "Allowed transitions"),),
        rules=(("6.22", "Rules"),),
    ),
    spec(
        "AmendmentBundle",
        "bundle_state",
        "lifecycle",
        states=(("6.22A", "States"),),
        transitions=(("6.22A", "Allowed transitions"),),
        rules=(("6.22A", "Rules"),),
    ),
    spec(
        "ArtifactRetention",
        "lifecycle_state",
        "lifecycle",
        states=(("6.23", "States"),),
        transitions=(("6.23", "Allowed transitions"),),
        rules=(("6.23", "Rules"),),
    ),
    spec(
        "LowNoiseExperienceFrame",
        "attention_state",
        "classification_axis",
        states=(("6.24", "Attention states"),),
        transitions=(("6.24", "Allowed transitions"),),
        rules=(("6.24", "Rules"),),
    ),
    spec(
        "LowNoiseExperienceFrame",
        "presentation_state",
        "classification_axis",
        states=(("6.24", "Presentation states"),),
        transitions=(("6.24", "Allowed transitions"),),
        rules=(("6.24", "Rules"),),
    ),
    spec(
        "LowNoiseExperienceFrame",
        "recovery_posture",
        "classification_axis",
        states=(("6.24A", "Recovery postures"),),
        rules=(("6.24A", "Rules"),),
    ),
    spec(
        "ApiCommandReceipt",
        "acceptance_state",
        "release_control",
        states=(("6.25A", "States"),),
        transitions=(("6.25A", "Allowed transitions"),),
        rules=(("6.25A", "Rules"),),
    ),
    spec(
        "RouteStabilityContract",
        "publication_generation",
        "compound_axis",
        rules=(("6.25C", None),),
        schema_title="RouteStabilityContract",
        notes=("GAP_NO_FINITE_ENUMERATED_STATES_IN_SOURCE_SECTION",),
    ),
    spec(
        "DeploymentRelease",
        "rollout_state",
        "release_control",
        states=(("6.25D", "States"),),
        transitions=(("6.25D", "Allowed transitions"),),
        rules=(("6.25D", "Rules"),),
    ),
    spec(
        "SchemaMigrationLedger",
        "phase_state",
        "release_control",
        states=(("6.25E", "States"),),
        transitions=(("6.25E", "Allowed transitions"),),
        rules=(("6.25E", "Rules"),),
    ),
    spec(
        "RecoveryCheckpoint",
        "checkpoint_state",
        "release_control",
        states=(("6.25F", "States"),),
        transitions=(("6.25F", "Allowed transitions"),),
        rules=(("6.25F", "Rules"),),
    ),
    spec(
        "ReleaseVerificationManifest",
        "decision_state",
        "release_control",
        states=(("6.25G", "States"),),
        transitions=(("6.25G", "Allowed transitions"),),
        rules=(("6.25G", "Rules"),),
    ),
    spec(
        "SecretVersion",
        "rotation_state",
        "release_control",
        states=(("6.25H", "States"),),
        transitions=(("6.25H", "Allowed transitions"),),
        rules=(("6.25H", "Rules"),),
    ),
    spec(
        "ClientOnboardingJourney",
        "lifecycle_state",
        "lifecycle",
        states=(("6.26", "States"),),
        transitions=(("6.26", "Allowed transitions"),),
        rules=(("6.26", "Rules"),),
    ),
    spec(
        "ClientDocumentRequest",
        "lifecycle_state",
        "lifecycle",
        states=(("6.27", "States"),),
        transitions=(("6.27", "Allowed transitions"),),
        rules=(("6.27", "Rules"),),
    ),
    spec(
        "ClientApprovalPack",
        "lifecycle_state",
        "lifecycle",
        states=(("6.28", "States"),),
        transitions=(("6.28", "Allowed transitions"),),
        rules=(("6.28", "Rules"),),
    ),
    spec(
        "ProofBundle",
        "lifecycle_state",
        "lifecycle",
        states=(("6.30", "ProofBundle states"),),
        prose_transitions=(("6.30", "ProofBundle transition rules"),),
        rules=(("6.30", "ProofBundle transition rules"),),
        notes=("GAP_NO_EXPLICIT_EVENT_EDGES_IN_SOURCE_SECTION",),
    ),
]


COMPOUND_GROUPS = [
    {
        "compound_axis_id": "compound_parity_result_axes",
        "label": "Parity result lifecycle and classification axes",
        "machine_ids": [
            "machine_parity_result_lifecycle_state",
            "machine_parity_result_parity_classification",
        ],
        "source_sections": ["6.10"],
        "coordination_rules": [
            "lifecycle state tells whether parity exists",
            "classification tells what parity means",
            "classification must never be overwritten silently; a new parity result supersedes the old one",
        ],
    },
    {
        "compound_axis_id": "compound_trust_summary_axes",
        "label": "TrustSummary coordinated trust and filing posture axes",
        "machine_ids": [
            "machine_trust_summary_lifecycle_state",
            "machine_trust_summary_trust_input_state",
            "machine_trust_summary_trust_band",
            "machine_trust_summary_score_band",
            "machine_trust_summary_cap_band",
            "machine_trust_summary_upstream_gate_cap",
            "machine_trust_summary_trust_level",
            "machine_trust_summary_automation_level",
            "machine_trust_summary_threshold_stability_state",
            "machine_trust_summary_filing_readiness",
        ],
        "source_sections": ["6.11"],
        "coordination_rules": [
            "trust band is machine-facing; trust level is the projected human-facing posture",
            "score_band is the numeric score-only classification; cap_band is the non-score legal ceiling; trust_band is the persisted most-restrictive result of those two bands",
            "TrustSummary.filing_readiness is a trust-stage upper bound on legal progression; later gates may only reduce that posture, never raise it",
        ],
    },
    {
        "compound_axis_id": "compound_cursor_family",
        "label": "Cursor lifecycle and successor allocation overlays",
        "machine_ids": [
            "machine_experience_cursor_cursor_state",
            "machine_workspace_cursor_cursor_state",
        ],
        "source_sections": ["6.2B", "6.25B"],
        "coordination_rules": [
            "recovery allocates or returns a successor cursor rather than reopening the old one",
            "a REBASED cursor shall not continue consuming deltas from the prior frame epoch",
        ],
    },
    {
        "compound_axis_id": "compound_low_noise_frame_axes",
        "label": "Low-noise attention, presentation, and recovery posture axes",
        "machine_ids": [
            "machine_low_noise_experience_frame_attention_state",
            "machine_low_noise_experience_frame_presentation_state",
            "machine_low_noise_experience_frame_recovery_posture",
        ],
        "source_sections": ["6.24", "6.24A"],
        "coordination_rules": [
            "LIMITED decorates the underlying posture; it does not erase whether the system is otherwise calm, waiting, in review, or blocked",
            "recovery_posture decorates the mounted shell; it shall not silently remount the same routed object into a different shell grammar",
        ],
    },
]

MANUAL_NON_TERMINAL_STATES = {
    "machine_evidence_graph_lifecycle_state": {"STALE", "REBUILD_REQUIRED"},
    "machine_proof_bundle_lifecycle_state": {"GENERATED"},
}
MANUAL_TERMINAL_STATES = {
    "machine_proof_bundle_lifecycle_state": {"LIMITED", "STALE", "SUPERSEDED"},
}


def parse_children(lines: list[str], start_index: int, end_index: int, level: int, key_prefix: str) -> list[Block]:
    marker = "#" * level + " "
    positions: list[tuple[int, str]] = []
    for index in range(start_index, end_index):
        line = lines[index]
        if line.startswith(marker):
            positions.append((index, line[len(marker) :].strip()))
    blocks: list[Block] = []
    for offset, (index, title) in enumerate(positions):
        next_index = positions[offset + 1][0] if offset + 1 < len(positions) else end_index
        child_key = f"{key_prefix}:{title}"
        block = Block(
            key=child_key,
            title=title,
            level=level,
            start_index=index,
            end_index=next_index,
            start_line=index + 1,
            end_line=next_index,
            lines=lines[index:next_index],
        )
        block.children = parse_children(lines, index + 1, next_index, level + 1, child_key) if level < 4 else []
        blocks.append(block)
    return blocks


def parse_section_blocks() -> dict[str, Block]:
    lines = STATE_MACHINES_PATH.read_text().splitlines()
    h2_positions: list[tuple[str, str, int]] = []
    for index, line in enumerate(lines):
        match = SECTION_ID_RE.match(line)
        if match:
            h2_positions.append((match.group(1), match.group(2).strip(), index))

    section_blocks: dict[str, Block] = {}
    for offset, (section_id, title, index) in enumerate(h2_positions):
        next_index = h2_positions[offset + 1][2] if offset + 1 < len(h2_positions) else len(lines)
        block = Block(
            key=section_id,
            title=title,
            level=2,
            start_index=index,
            end_index=next_index,
            start_line=index + 1,
            end_line=next_index,
            lines=lines[index:next_index],
        )
        block.children = parse_children(lines, index + 1, next_index, 3, section_id)
        section_blocks[section_id] = block

        if section_id == "6.25":
            for child in block.children:
                match = H3_MACHINE_RE.match("### " + child.title)
                if match:
                    section_blocks[f"6.25{match.group(1)}"] = child
                elif child.title == "`RouteStabilityContract` publication rules":
                    section_blocks["6.25C"] = child

    return section_blocks


def get_child_block(parent: Block, title: str | None) -> Block:
    if title is None:
        return parent
    for child in parent.children:
        if child.title == title:
            return child
    raise KeyError(f"Missing child block `{title}` under section `{parent.key}`.")


def collect_list_items(block: Block, *, stop_before_children: bool = False) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    max_line = block.end_line
    if stop_before_children and block.children:
        max_line = min(child.start_line for child in block.children)
    for index, line in enumerate(block.lines[1:], start=block.start_line + 1):
        if index >= max_line:
            break
        stripped = line.strip()
        if not stripped:
            continue
        bullet_match = re.match(r"^(-|\d+\.)\s+(.*)$", stripped)
        if bullet_match:
            if current is not None:
                current["text"] = re.sub(r"\s+", " ", current["text"]).strip()
                items.append(current)
            current = {"line_number": index, "text": bullet_match.group(2).strip()}
            continue
        if current is not None and not stripped.startswith("#"):
            current["text"] += " " + stripped
    if current is not None:
        current["text"] = re.sub(r"\s+", " ", current["text"]).strip()
        items.append(current)
    return items


def code_bullets(block: Block) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for item in collect_list_items(block):
        code_spans = CODE_SPAN_RE.findall(item["text"])
        if code_spans:
            rows.append({"line_number": item["line_number"], "text": code_spans[0]})
    return rows


def parse_coverage_map(section_6_1: Block) -> dict[tuple[str, str], dict[str, str]]:
    coverage_block = get_child_block(section_6_1, "Persisted coverage map")
    rows: dict[tuple[str, str], dict[str, str]] = {}
    for line_number, line in enumerate(coverage_block.lines[1:], start=coverage_block.start_line + 1):
        if not line.startswith("|") or line.startswith("| ---"):
            continue
        parts = [part.strip() for part in line.strip().strip("|").split("|")]
        if len(parts) != 4:
            continue
        object_family = parts[0].strip("`")
        schema_path = parts[1].strip("`")
        state_field = parts[2].strip("`")
        contract_name = parts[3].strip("`")
        if object_family == "Object family":
            continue
        rows[(object_family, state_field)] = {
            "schema_path": schema_path,
            "shared_transition_contract": contract_name,
            "source_ref": line_ref(repo_rel(STATE_MACHINES_PATH), line_number, f"{object_family}.{state_field}"),
        }
    return rows


def parse_explicit_transitions(
    machine_id: str,
    block: Block,
    states: list[str],
    object_family: str,
    state_field: str,
    machine_class: str,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for index, item in enumerate(collect_list_items(block), start=1):
        raw_text = CODE_SPAN_RE.findall(item["text"])
        raw = raw_text[0] if raw_text else item["text"]
        match = EXPLICIT_TRANSITION_RE.match(raw)
        if not match:
            continue
        source = match.group("source").strip()
        event = match.group("event").strip()
        target = match.group("target").strip()
        if source not in states and target not in states and not any(f"`{state}`" in raw for state in states):
            continue
        rows.append(
            {
                "transition_id": f"{machine_id}_edge_{index:03d}",
                "machine_id": machine_id,
                "object_family": object_family,
                "state_field": state_field,
                "machine_class": machine_class,
                "transition_kind": "explicit_event_edge",
                "raw_transition": raw,
                "source_state_or_selector": source,
                "source_ref_kind": "state" if source in states else "selector_alias",
                "event_code_or_null": event,
                "target_state_or_selector": target,
                "target_ref_kind": "state" if target in states else "selector_alias",
                "source_file": repo_rel(STATE_MACHINES_PATH),
                "source_heading_or_logical_block": line_ref(
                    repo_rel(STATE_MACHINES_PATH), item["line_number"], f"{object_family}.{state_field}"
                ),
                "rationale": "Explicit event-driven transition extracted from the canonical state-machine source.",
            }
        )
    return rows


def parse_prose_transitions(
    machine_id: str,
    block: Block,
    states: list[str],
    object_family: str,
    state_field: str,
    machine_class: str,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for index, item in enumerate(collect_list_items(block), start=1):
        raw = item["text"]
        target_hits = ordered_unique(state for state in states if f"`{state}`" in raw)
        rows.append(
            {
                "transition_id": f"{machine_id}_prose_{index:03d}",
                "machine_id": machine_id,
                "object_family": object_family,
                "state_field": state_field,
                "machine_class": machine_class,
                "transition_kind": "prose_rule",
                "raw_transition": raw,
                "source_state_or_selector": "",
                "source_ref_kind": "implicit_rule_context",
                "event_code_or_null": None,
                "target_state_or_selector": "; ".join(target_hits),
                "target_ref_kind": "state" if target_hits else "implicit_rule_context",
                "source_file": repo_rel(STATE_MACHINES_PATH),
                "source_heading_or_logical_block": line_ref(
                    repo_rel(STATE_MACHINES_PATH), item["line_number"], f"{object_family}.{state_field}"
                ),
                "rationale": "Prose transition rule retained verbatim because the source section did not use explicit event-edge syntax.",
            }
        )
    return rows


def parse_schema_index() -> dict[str, Path]:
    rows: dict[str, Path] = {}
    for path in sorted(SCHEMAS_DIR.glob("*.schema.json")):
        payload = json.loads(path.read_text())
        title = payload.get("title") or path.stem.replace(".schema", "")
        rows[title] = path
    return rows


def recursive_find_property_paths(payload: Any, field_name: str, path_parts: list[str] | None = None) -> list[list[str]]:
    path_parts = path_parts or []
    rows: list[list[str]] = []
    if isinstance(payload, dict):
        properties = payload.get("properties")
        if isinstance(properties, dict):
            for key, value in properties.items():
                next_path = path_parts + ["properties", key]
                if key == field_name:
                    rows.append(next_path)
                rows.extend(recursive_find_property_paths(value, field_name, next_path))
        for key, value in payload.items():
            if key == "properties":
                continue
            rows.extend(recursive_find_property_paths(value, field_name, path_parts + [key]))
    elif isinstance(payload, list):
        for index, value in enumerate(payload):
            rows.extend(recursive_find_property_paths(value, field_name, path_parts + [str(index)]))
    return rows


def follow_path(payload: Any, path_parts: list[str]) -> Any:
    cursor = payload
    for part in path_parts:
        if isinstance(cursor, dict):
            cursor = cursor[part]
        else:
            cursor = cursor[int(part)]
    return cursor


def load_json_if_exists(path: Path) -> Any:
    if not path.exists():
        return None
    return json.loads(path.read_text())


def parse_text_machine_refs(text: str, direct_map: dict[tuple[str, str], str], primary_map: dict[str, str]) -> list[str]:
    refs: list[str] = []
    for object_name, field_name in FIELD_REF_RE.findall(text):
        machine_id = direct_map.get((object_name, field_name))
        if machine_id:
            refs.append(machine_id)
    for span in CODE_SPAN_RE.findall(text):
        if "." in span:
            object_name, suffix = span.split(".", 1)
            if object_name in primary_map and suffix.isupper():
                refs.append(primary_map[object_name])
        elif span in primary_map:
            refs.append(primary_map[span])
    for token in OBJECT_TOKEN_RE.findall(text):
        if token in primary_map:
            refs.append(primary_map[token])
    return ordered_unique(refs)


def extract_policy_line(rule_items: list[dict[str, Any]], keywords: tuple[str, ...], fallback: str) -> str:
    for item in rule_items:
        lowered = item["text"].lower()
        if all(keyword in lowered for keyword in keywords):
            return item["text"]
    for item in rule_items:
        lowered = item["text"].lower()
        if any(keyword in lowered for keyword in keywords):
            return item["text"]
    return fallback


def declared_terminal_states(states: list[str], rule_items: list[dict[str, Any]]) -> set[str]:
    rows: set[str] = set()
    for item in rule_items:
        lowered = item["text"].lower()
        if not (
            " is terminal" in lowered
            or " are terminal" in lowered
            or "terminal posture records" in lowered
            or "terminal projection" in lowered
        ):
            continue
        for state in states:
            if f"`{state}`" in item["text"]:
                rows.add(state)
    return rows


def build_outputs() -> dict[str, Any]:
    section_blocks = parse_section_blocks()
    coverage_map = parse_coverage_map(section_blocks["6.1"])
    schema_index = parse_schema_index()
    module_catalog = load_json_if_exists(MODULE_CATALOG_PATH) or {"modules": []}
    phase_index = load_json_if_exists(RUN_ENGINE_PHASE_INDEX_PATH) or {"phases": []}
    entity_catalog = load_json_if_exists(ENTITY_CATALOG_PATH) or {"objects": []}

    machine_ids_by_field: dict[tuple[str, str], str] = {}
    primary_machine_by_object: dict[str, str] = {}
    for entry in MACHINE_SPECS:
        machine_ids_by_field[(entry.object_family, entry.state_field)] = entry.machine_id
        if entry.object_family not in primary_machine_by_object or entry.machine_class in {"lifecycle", "cursor", "release_control"}:
            primary_machine_by_object[entry.object_family] = entry.machine_id

    invariants_rows: list[dict[str, Any]] = []
    for index, item in enumerate(collect_list_items(section_blocks["6.1"], stop_before_children=True), start=1):
        invariants_rows.append(
            {
                "invariant_id": f"inv_global_{index:03d}",
                "invariant_class": "global_state_machine_rule",
                "machine_id_or_null": None,
                "scope": "global",
                "raw_invariant": item["text"],
                "authoritative_source_refs": [
                    line_ref(repo_rel(STATE_MACHINES_PATH), item["line_number"], f"global_rule_{index:03d}")
                ],
                "related_machine_ids": parse_text_machine_refs(item["text"], machine_ids_by_field, primary_machine_by_object),
                "source_file": repo_rel(STATE_MACHINES_PATH),
                "source_heading_or_logical_block": line_ref(
                    repo_rel(STATE_MACHINES_PATH), item["line_number"], f"global_rule_{index:03d}"
                ),
                "rationale": "Global invariant or transition law extracted from section 6.1.",
            }
        )
    for index, item in enumerate(collect_list_items(section_blocks["6.29"]), start=1):
        invariants_rows.append(
            {
                "invariant_id": f"inv_cross_{index:03d}",
                "invariant_class": "cross_state_invariant",
                "machine_id_or_null": None,
                "scope": "cross_state",
                "raw_invariant": item["text"],
                "authoritative_source_refs": [
                    line_ref(repo_rel(STATE_MACHINES_PATH), item["line_number"], f"cross_state_{index:03d}")
                ],
                "related_machine_ids": parse_text_machine_refs(item["text"], machine_ids_by_field, primary_machine_by_object),
                "source_file": repo_rel(STATE_MACHINES_PATH),
                "source_heading_or_logical_block": line_ref(
                    repo_rel(STATE_MACHINES_PATH), item["line_number"], f"cross_state_{index:03d}"
                ),
                "rationale": "Cross-state invariant extracted from section 6.29.",
            }
        )

    phase_hints: dict[str, set[str]] = defaultdict(set)
    for phase in phase_index.get("phases", []):
        phase_id = phase["phase_id"]
        state_text = " ".join(phase.get("state_transitions", []))
        for object_name, machine_id in primary_machine_by_object.items():
            if object_name in state_text or f"`{object_name}." in state_text:
                phase_hints[machine_id].add(phase_id)

    module_hints: dict[str, set[str]] = defaultdict(set)
    for module in module_catalog.get("modules", []):
        run_bound = bool(module.get("run_phase_bindings"))
        if not run_bound:
            continue
        for artifact in module.get("related_artifacts", []):
            machine_id = primary_machine_by_object.get(artifact)
            if machine_id:
                module_hints[machine_id].add(module["module_name"])

    registry_rows: list[dict[str, Any]] = []
    edge_rows: list[dict[str, Any]] = []
    coverage_rows: list[dict[str, Any]] = []
    ambiguity_rows: list[dict[str, Any]] = []
    represented_sections: set[str] = {"6.1", "6.29"}

    for spec_entry in MACHINE_SPECS:
        all_state_rows: list[dict[str, Any]] = []
        explicit_edges: list[dict[str, Any]] = []
        prose_edges: list[dict[str, Any]] = []
        rule_items: list[dict[str, Any]] = []
        source_refs: list[str] = []
        section_ids: list[str] = []

        for section_id, block_title in spec_entry.state_sources:
            represented_sections.add(section_id)
            section_ids.append(section_id)
            source_block = get_child_block(section_blocks[section_id], block_title)
            source_refs.append(
                line_ref(repo_rel(STATE_MACHINES_PATH), source_block.start_line, f"{spec_entry.object_family}.{spec_entry.state_field}")
            )
            all_state_rows.extend(code_bullets(source_block))

        states = ordered_unique(row["text"] for row in all_state_rows)
        states_set = set(states)

        for section_id, block_title in spec_entry.explicit_transition_sources:
            represented_sections.add(section_id)
            section_ids.append(section_id)
            source_block = get_child_block(section_blocks[section_id], block_title)
            explicit_edges.extend(
                parse_explicit_transitions(
                    spec_entry.machine_id,
                    source_block,
                    states,
                    spec_entry.object_family,
                    spec_entry.state_field,
                    spec_entry.machine_class,
                )
            )

        for section_id, block_title in spec_entry.prose_transition_sources:
            represented_sections.add(section_id)
            section_ids.append(section_id)
            source_block = get_child_block(section_blocks[section_id], block_title)
            prose_edges.extend(
                parse_prose_transitions(
                    spec_entry.machine_id,
                    source_block,
                    states,
                    spec_entry.object_family,
                    spec_entry.state_field,
                    spec_entry.machine_class,
                )
            )

        deduped_edges: list[dict[str, Any]] = []
        seen_edge_keys: set[tuple[str, str]] = set()
        for row in explicit_edges + prose_edges:
            edge_key = (row["transition_kind"], row["raw_transition"])
            if edge_key in seen_edge_keys:
                note_set.add("ASSUMPTION_DUPLICATE_TRANSITION_STRING_COLLAPSED_ACROSS_SECTION_OVERLAY")
                continue
            seen_edge_keys.add(edge_key)
            deduped_edges.append(row)
        explicit_edges = [row for row in deduped_edges if row["transition_kind"] == "explicit_event_edge"]
        prose_edges = [row for row in deduped_edges if row["transition_kind"] == "prose_rule"]
        for index, row in enumerate(explicit_edges, start=1):
            row["transition_id"] = f"{spec_entry.machine_id}_edge_{index:03d}"
        for index, row in enumerate(prose_edges, start=1):
            row["transition_id"] = f"{spec_entry.machine_id}_prose_{index:03d}"

        for section_id, block_title in spec_entry.rule_sources:
            represented_sections.add(section_id)
            section_ids.append(section_id)
            source_block = get_child_block(section_blocks[section_id], block_title)
            source_refs.append(
                line_ref(repo_rel(STATE_MACHINES_PATH), source_block.start_line, f"{spec_entry.object_family}.{spec_entry.state_field}")
            )
            rule_items.extend(collect_list_items(source_block))

        source_refs = ordered_unique(source_refs)
        note_set = set(spec_entry.notes)

        if spec_entry.machine_class in {"lifecycle", "cursor", "release_control"} and not explicit_edges and not prose_edges:
            note_set.add("GAP_NO_TRANSITION_RULES_CAPTURED")

        for row in explicit_edges:
            if row["source_ref_kind"] != "state":
                note_set.add(f"ASSUMPTION_SELECTOR_SOURCE_{row['source_state_or_selector']}")
            if row["target_ref_kind"] != "state":
                note_set.add(f"ASSUMPTION_SELECTOR_TARGET_{row['target_state_or_selector']}")

        outgoing_states = {
            row["source_state_or_selector"]
            for row in explicit_edges
            if row["source_ref_kind"] == "state"
        }
        terminal_states = set()
        if spec_entry.machine_class in {"lifecycle", "cursor", "release_control"}:
            terminal_states |= set(state for state in states if state not in outgoing_states)
            terminal_states |= declared_terminal_states(states, rule_items)
            terminal_states -= MANUAL_NON_TERMINAL_STATES.get(spec_entry.machine_id, set())
            terminal_states |= MANUAL_TERMINAL_STATES.get(spec_entry.machine_id, set())
            if any(state in outgoing_states for state in terminal_states):
                note_set.add("CONFLICT_TERMINAL_STATE_HAS_EXPLICIT_OUTGOING_EDGE")

        schema_path: str | None = None
        coverage_row = coverage_map.get((spec_entry.object_family, spec_entry.state_field))
        if coverage_row:
            schema_path = normalize_schema_path(coverage_row["schema_path"])
        elif spec_entry.schema_title and spec_entry.schema_title in schema_index:
            schema_path = repo_rel(schema_index[spec_entry.schema_title])
        elif spec_entry.object_family in schema_index:
            schema_path = repo_rel(schema_index[spec_entry.object_family])
        elif spec_entry.object_family in {row["object_name"] for row in entity_catalog.get("objects", [])}:
            entity_row = next(
                row for row in entity_catalog["objects"] if row["object_name"] == spec_entry.object_family
            )
            schema_path = entity_row["schema_path_or_paths"][0] if entity_row["schema_path_or_paths"] else None

        schema_field_paths: list[str] = []
        schema_enum: list[str] = []
        coverage_status = "schema_missing"
        missing_source_states: list[str] = []
        extra_schema_states: list[str] = []
        if schema_path:
            schema_payload = json.loads((ROOT / schema_path).read_text())
            raw_paths = recursive_find_property_paths(schema_payload, spec_entry.state_field)
            if raw_paths:
                schema_field_paths = [".".join(path) for path in sorted(raw_paths, key=len)]
                field_payload = follow_path(schema_payload, sorted(raw_paths, key=len)[0])
                raw_enum = field_payload.get("enum")
                if raw_enum is None:
                    coverage_status = "no_enum" if spec_entry.machine_class != "compound_axis" else "non_enumerated_counter_field"
                else:
                    schema_enum = [value for value in raw_enum if isinstance(value, str)]
                    source_state_set = set(states)
                    schema_state_set = set(schema_enum)
                    if not source_state_set and spec_entry.machine_class == "compound_axis":
                        coverage_status = "non_enumerated_counter_field"
                    elif source_state_set == schema_state_set:
                        coverage_status = "exact_match"
                    elif source_state_set and source_state_set <= schema_state_set:
                        coverage_status = "schema_superset"
                    elif source_state_set and schema_state_set < source_state_set:
                        coverage_status = "schema_subset"
                    else:
                        coverage_status = "schema_subset"
                    missing_source_states = sorted(source_state_set - schema_state_set)
                    extra_schema_states = sorted(schema_state_set - source_state_set)
            else:
                coverage_status = "field_missing"
                note_set.add("GAP_SCHEMA_FIELD_NOT_FOUND")
        else:
            note_set.add("GAP_SCHEMA_NOT_FOUND")

        related_machine_ids = ordered_unique(
            ref
            for item in rule_items
            for ref in parse_text_machine_refs(item["text"], machine_ids_by_field, primary_machine_by_object)
            if ref != spec_entry.machine_id
        )

        related_invariant_machine_ids = ordered_unique(
            ref
            for invariant in invariants_rows
            if spec_entry.machine_id in invariant["related_machine_ids"]
            for ref in invariant["related_machine_ids"]
            if ref != spec_entry.machine_id
        )

        compound_peer_ids = ordered_unique(
            peer_id
            for group in COMPOUND_GROUPS
            if spec_entry.machine_id in group["machine_ids"]
            for peer_id in group["machine_ids"]
            if peer_id != spec_entry.machine_id
        )

        authority_rules = ordered_unique(
            [item["text"] for item in rule_items if "authority" in item["text"].lower()]
        )
        mode_rules = ordered_unique(
            [item["text"] for item in rule_items if "analysis" in item["text"].lower() or "compliance" in item["text"].lower()]
        )

        if spec_entry.machine_class in {"lifecycle", "release_control"} and (
            authority_rules or spec_entry.object_family in {"SubmissionRecord", "FilingCase", "ObligationMirror", "AuthorityInteractionRecord", "AuthorityLink"}
        ):
            authority_rules = ordered_unique(
                ["authority-originated transitions outrank tenant-originated assumptions where legal state is involved;"]
                + authority_rules
            )
        if mode_rules:
            mode_rules = ordered_unique(
                ["compliance-mode objects may not inherit analysis-mode states;"] + mode_rules
            )

        recovery_policy = extract_policy_line(
            rule_items,
            ("successor",),
            "No explicit successor-allocation rule was named in the source section.",
        )
        if recovery_policy.startswith("No explicit"):
            recovery_policy = extract_policy_line(
                rule_items,
                ("recover",),
                recovery_policy,
            )
        supersession_policy = extract_policy_line(
            rule_items,
            ("supersed",),
            "No explicit supersession policy was named in the source section.",
        )

        machine_phase_ids = set(phase_hints.get(spec_entry.machine_id, set()))
        machine_phase_ids.update(
            phase["phase_id"]
            for module in module_catalog.get("modules", [])
            if module["module_name"] in module_hints.get(spec_entry.machine_id, set())
            for phase in module.get("run_phase_bindings", [])
        )
        machine_modules = sorted(module_hints.get(spec_entry.machine_id, set()))

        machine_edges = explicit_edges + prose_edges
        edge_rows.extend(machine_edges)

        registry_rows.append(
            {
                "machine_id": spec_entry.machine_id,
                "object_family": spec_entry.object_family,
                "schema_path": schema_path,
                "state_field": spec_entry.state_field,
                "machine_class": spec_entry.machine_class,
                "states": states,
                "events": ordered_unique(
                    row["event_code_or_null"] for row in explicit_edges if row["event_code_or_null"]
                ),
                "allowed_transitions": [row["raw_transition"] for row in machine_edges],
                "terminal_states": sorted(terminal_states),
                "recovery_or_successor_policy": recovery_policy,
                "supersession_policy": supersession_policy,
                "authority_precedence_rules": authority_rules,
                "mode_isolation_rules": mode_rules,
                "cross_machine_dependencies": ordered_unique(
                    related_machine_ids + related_invariant_machine_ids + compound_peer_ids
                ),
                "authoritative_source_refs": source_refs,
                "engine_phase_bindings": sorted(machine_phase_ids),
                "trigger_modules": machine_modules,
                "source_section_ids": ordered_unique(section_ids),
                "notes": sorted(note_set),
                "source_file": repo_rel(STATE_MACHINES_PATH),
                "source_heading_or_logical_block": source_refs[0] if source_refs else "",
                "rationale": (
                    f"`{spec_entry.object_family}.{spec_entry.state_field}` is modeled from the canonical state-machine section(s) "
                    "and normalized into one machine registry row."
                ),
            }
        )

        coverage_rows.append(
            {
                "machine_id": spec_entry.machine_id,
                "object_family": spec_entry.object_family,
                "state_field": spec_entry.state_field,
                "schema_path": schema_path,
                "schema_field_present": bool(schema_field_paths),
                "schema_field_paths": schema_field_paths,
                "shared_transition_contract_or_null": coverage_row["shared_transition_contract"] if coverage_row else None,
                "source_state_count": len(states),
                "schema_enum_state_count": len(schema_enum),
                "schema_enum_states": schema_enum,
                "coverage_status": coverage_status,
                "missing_source_states": missing_source_states,
                "extra_schema_states": extra_schema_states,
                "authoritative_source_refs": source_refs,
                "notes": sorted(note_set),
                "source_file": repo_rel(STATE_MACHINES_PATH),
                "source_heading_or_logical_block": source_refs[0] if source_refs else "",
                "rationale": f"Schema coverage for `{spec_entry.object_family}.{spec_entry.state_field}` against the canonical machine registry.",
            }
        )

        if "CONFLICT_TERMINAL_STATE_HAS_EXPLICIT_OUTGOING_EDGE" in note_set:
            ambiguity_rows.append(
                {
                    "record_type": "conflicting_terminality_overlay",
                    "machine_id": spec_entry.machine_id,
                    "object_family": spec_entry.object_family,
                    "state_field": spec_entry.state_field,
                    "rationale": "The source declares at least one terminal state that also has explicit outgoing transitions in a later overlay.",
                    "source_refs": source_refs,
                }
            )

    schema_titles = parse_schema_index()
    registry_fields = {(row["object_family"], row["state_field"]) for row in registry_rows}
    formal_object_families = {row["object_family"] for row in registry_rows}
    entity_rows = entity_catalog.get("objects", [])
    entity_source_map = {row["object_name"]: row for row in entity_rows}
    stateful_entity_objects = {
        row["object_name"] for row in entity_rows if row.get("primary_state_field_or_null")
    }
    ambiguity_scope_objects = formal_object_families | stateful_entity_objects
    schema_ambiguity_keys: set[tuple[str, str]] = set()

    for title, path in schema_titles.items():
        if title not in ambiguity_scope_objects:
            continue
        payload = json.loads(path.read_text())
        for field_name, prop in payload.get("properties", {}).items():
            if field_name in EXCLUDED_AMBIGUOUS_FIELDS:
                continue
            if not STATEFUL_FIELD_NAME_RE.search(field_name):
                continue
            if not isinstance(prop, dict) or "enum" not in prop:
                continue
            if (title, field_name) in registry_fields:
                continue
            schema_ambiguity_keys.add((title, field_name))
            source_refs = entity_source_map.get(title, {}).get("authoritative_source_refs", [])
            ambiguity_rows.append(
                {
                    "record_type": "schema_state_field_without_formal_machine",
                    "object_family": title,
                    "state_field": field_name,
                    "schema_path": repo_rel(path),
                    "rationale": "The schema exposes a state-like enumerated field, but no formal state-machine section was registered for it.",
                    "source_refs": source_refs,
                }
            )

    for row in entity_rows:
        object_name = row["object_name"]
        primary_state_field = row.get("primary_state_field_or_null")
        if not primary_state_field or object_name not in ambiguity_scope_objects:
            continue
        if (object_name, primary_state_field) in registry_fields:
            continue
        if (object_name, primary_state_field) in schema_ambiguity_keys:
            continue
        ambiguity_rows.append(
            {
                "record_type": "entity_catalog_primary_state_without_formal_machine",
                "object_family": object_name,
                "state_field": primary_state_field,
                "schema_path": row["schema_path_or_paths"][0] if row["schema_path_or_paths"] else "",
                "rationale": "The entity catalog exposes a primary persisted state field, but no formal state-machine section was registered for it.",
                "source_refs": row["authoritative_source_refs"],
            }
        )

    registry_rows.sort(key=lambda row: row["machine_id"])
    edge_rows.sort(key=lambda row: row["transition_id"])
    invariants_rows.sort(key=lambda row: row["invariant_id"])
    coverage_rows.sort(key=lambda row: row["machine_id"])
    ambiguity_rows = sorted(
        ambiguity_rows,
        key=lambda row: (
            row["record_type"],
            row.get("machine_id") or row.get("object_family") or "",
            row.get("state_field") or "",
        ),
    )

    compound_rows = []
    for group in COMPOUND_GROUPS:
        source_refs = [
            line_ref(repo_rel(STATE_MACHINES_PATH), section_blocks[section_id].start_line, group["compound_axis_id"])
            for section_id in group["source_sections"]
        ]
        compound_rows.append(
            {
                **group,
                "authoritative_source_refs": source_refs,
                "source_file": repo_rel(STATE_MACHINES_PATH),
                "source_heading_or_logical_block": source_refs[0],
                "rationale": "Compound axis group extracted from a section that coordinates multiple persisted state fields together.",
            }
        )
    compound_rows.sort(key=lambda row: row["compound_axis_id"])

    machine_class_counts = dict(sorted(Counter(row["machine_class"] for row in registry_rows).items()))
    transition_kind_counts = dict(sorted(Counter(row["transition_kind"] for row in edge_rows).items()))
    coverage_status_counts = dict(sorted(Counter(row["coverage_status"] for row in coverage_rows).items()))

    registry_payload = {
        "summary": {
            "machine_count": len(registry_rows),
            "machine_class_counts": machine_class_counts,
            "represented_section_ids": sorted(represented_sections),
            "transition_count": len(edge_rows),
            "transition_kind_counts": transition_kind_counts,
        },
        "machines": registry_rows,
    }
    coverage_payload = {
        "summary": {
            "row_count": len(coverage_rows),
            "coverage_status_counts": coverage_status_counts,
        },
        "rows": coverage_rows,
    }
    compound_payload = {
        "summary": {
            "group_count": len(compound_rows),
        },
        "groups": compound_rows,
    }
    ambiguity_payload = {
        "summary": {
            "row_count": len(ambiguity_rows),
            "record_type_counts": dict(sorted(Counter(row["record_type"] for row in ambiguity_rows).items())),
        },
        "rows": ambiguity_rows,
    }

    return {
        "registry": registry_payload,
        "edges": edge_rows,
        "invariants": invariants_rows,
        "schema_coverage": coverage_payload,
        "compound_axes": compound_payload,
        "ambiguities": ambiguity_payload,
    }


def edge_csv_rows(rows: list[dict[str, Any]]) -> list[dict[str, str]]:
    csv_rows: list[dict[str, str]] = []
    for row in rows:
        csv_rows.append(
            {
                "transition_id": row["transition_id"],
                "machine_id": row["machine_id"],
                "object_family": row["object_family"],
                "state_field": row["state_field"],
                "machine_class": row["machine_class"],
                "transition_kind": row["transition_kind"],
                "raw_transition": row["raw_transition"],
                "source_state_or_selector": row["source_state_or_selector"],
                "source_ref_kind": row["source_ref_kind"],
                "event_code_or_null": "" if row["event_code_or_null"] is None else row["event_code_or_null"],
                "target_state_or_selector": row["target_state_or_selector"],
                "target_ref_kind": row["target_ref_kind"],
                "source_file": row["source_file"],
                "source_heading_or_logical_block": row["source_heading_or_logical_block"],
                "rationale": row["rationale"],
            }
        )
    return csv_rows


def write_edge_csv(rows: list[dict[str, Any]]) -> None:
    EDGE_CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    with EDGE_CSV_PATH.open("w", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
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
            ],
        )
        writer.writeheader()
        for row in edge_csv_rows(rows):
            writer.writerow(row)


def render_docs(outputs: dict[str, Any]) -> tuple[str, str, str]:
    registry_summary = outputs["registry"]["summary"]
    coverage_summary = outputs["schema_coverage"]["summary"]
    ambiguity_summary = outputs["ambiguities"]["summary"]

    machine_lines = [
        "# State Machine Definitions and Transition Invariants",
        "",
        f"- Machine rows: `{registry_summary['machine_count']}`",
        f"- Transition rows: `{registry_summary['transition_count']}`",
        "",
        "## Machine Classes",
        "",
        "| Machine Class | Count |",
        "| --- | ---: |",
    ]
    for machine_class, count in registry_summary["machine_class_counts"].items():
        machine_lines.append(f"| `{machine_class}` | {count} |")
    machine_lines.extend(
        [
            "",
            "## Transition Kinds",
            "",
            "| Transition Kind | Count |",
            "| --- | ---: |",
        ]
    )
    for transition_kind, count in registry_summary["transition_kind_counts"].items():
        machine_lines.append(f"| `{transition_kind}` | {count} |")

    terminal_lines = [
        "# Terminal, Recovery, and Supersession Matrix",
        "",
        f"- Schema coverage rows: `{coverage_summary['row_count']}`",
        f"- Ambiguity rows: `{ambiguity_summary['row_count']}`",
        "",
        "## Schema Coverage Status",
        "",
        "| Coverage Status | Count |",
        "| --- | ---: |",
    ]
    for status, count in coverage_summary["coverage_status_counts"].items():
        terminal_lines.append(f"| `{status}` | {count} |")
    terminal_lines.extend(
        [
            "",
            "## Ambiguity Types",
            "",
            "| Record Type | Count |",
            "| --- | ---: |",
        ]
    )
    for record_type, count in ambiguity_summary["record_type_counts"].items():
        terminal_lines.append(f"| `{record_type}` | {count} |")

    invariant_rows = outputs["invariants"]
    invariant_lines = [
        "# Cross-State Invariant Index",
        "",
        f"- Indexed invariants: `{len(invariant_rows)}`",
        "",
        "## Invariant Classes",
        "",
        "| Invariant Class | Count |",
        "| --- | ---: |",
    ]
    for invariant_class, count in sorted(Counter(row["invariant_class"] for row in invariant_rows).items()):
        invariant_lines.append(f"| `{invariant_class}` | {count} |")

    return (
        "\n".join(machine_lines) + "\n",
        "\n".join(terminal_lines) + "\n",
        "\n".join(invariant_lines) + "\n",
    )


def render_mermaid(registry_rows: list[dict[str, Any]]) -> str:
    lines = [
        "flowchart LR",
        "  classDef lifecycle fill:#121721,stroke:#5AA9FF,color:#F5F7FA;",
        "  classDef cursor fill:#181E29,stroke:#52C18C,color:#F5F7FA;",
        "  classDef axis fill:#181E29,stroke:#E7B04B,color:#F5F7FA;",
        "  classDef release fill:#181E29,stroke:#A7B1BF,color:#F5F7FA;",
        "",
    ]
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in registry_rows:
        groups[row["machine_class"]].append(row)
    for machine_class in sorted(groups):
        class_rows = sorted(groups[machine_class], key=lambda row: row["machine_id"])
        lines.append(f'  subgraph {snake_case(machine_class)}["{machine_class}"]')
        for row in class_rows:
            label = f"{row['object_family']}.{row['state_field']}"
            lines.append(f'    {row["machine_id"]}["{label}"]')
        lines.append("  end")
        lines.append("")
    for row in sorted(registry_rows, key=lambda item: item["machine_id"]):
        for dependency in row["cross_machine_dependencies"][:8]:
            lines.append(f"  {row['machine_id']} --> {dependency}")
    return "\n".join(lines) + "\n"


def main() -> int:
    outputs = build_outputs()
    DATA_ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    DOCS_ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    DIAGRAMS_ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    json_write(REGISTRY_PATH, outputs["registry"])
    write_edge_csv(outputs["edges"])
    jsonl_write(INVARIANTS_PATH, outputs["invariants"])
    json_write(SCHEMA_COVERAGE_PATH, outputs["schema_coverage"])
    json_write(COMPOUND_AXES_PATH, outputs["compound_axes"])
    json_write(AMBIGUITY_PATH, outputs["ambiguities"])
    machine_doc, terminal_doc, invariant_doc = render_docs(outputs)
    STATE_MACHINE_DOC_PATH.write_text(machine_doc)
    TERMINAL_DOC_PATH.write_text(terminal_doc)
    INVARIANT_DOC_PATH.write_text(invariant_doc)
    MERMAID_PATH.write_text(render_mermaid(outputs["registry"]["machines"]))
    summary = {
        "status": "PASS",
        "machine_count": outputs["registry"]["summary"]["machine_count"],
        "transition_count": outputs["registry"]["summary"]["transition_count"],
        "invariant_count": len(outputs["invariants"]),
        "coverage_row_count": outputs["schema_coverage"]["summary"]["row_count"],
        "ambiguity_row_count": outputs["ambiguities"]["summary"]["row_count"],
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
