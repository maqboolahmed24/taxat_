#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Iterable


ROOT = Path(__file__).resolve().parents[2]
PROMPT_DIR = ROOT / "PROMPT"
CARDS_DIR = PROMPT_DIR / "CARDS"
DOCS_ANALYSIS_DIR = ROOT / "docs" / "analysis"
DOCS_ARCH_DIR = ROOT / "docs" / "architecture"
DOCS_ARCH_ADR_DIR = DOCS_ARCH_DIR / "adr"
DATA_ANALYSIS_DIR = ROOT / "data" / "analysis"
DIAGRAMS_ANALYSIS_DIR = ROOT / "diagrams" / "analysis"

AGENT_PATH = PROMPT_DIR / "AGENT.md"
CHECKLIST_PATH = PROMPT_DIR / "Checklist.md"

DEPENDENCY_REGISTER_DOC_PATH = (
    DOCS_ANALYSIS_DIR / "18_provisioning_feasibility_and_browser_automation_strategy.md"
)
PACKAGE_BOUNDARY_DOC_PATH = (
    DOCS_ARCH_DIR / "monorepo-package-boundaries-and-team-ownership-map.md"
)
PACKAGE_TASK_MAP_PATH = DATA_ANALYSIS_DIR / "later_task_to_package_map.json"

ADR_PRIMARY_STACK_PATH = DOCS_ARCH_ADR_DIR / "ADR-001-primary-implementation-stack.md"
ADR_STORAGE_EVENTING_PATH = (
    DOCS_ARCH_ADR_DIR / "ADR-002-storage-and-eventing-topology.md"
)
ADR_IDENTITY_PATH = (
    DOCS_ARCH_ADR_DIR / "ADR-003-identity-step-up-and-session-model.md"
)
ADR_AUTHORITY_PATH = (
    DOCS_ARCH_ADR_DIR / "ADR-004-authority-integration-boundary.md"
)
ADR_PROJECTION_PATH = (
    DOCS_ARCH_ADR_DIR / "ADR-005-read-model-projection-strategy.md"
)
ADR_WEB_PATH = DOCS_ARCH_ADR_DIR / "ADR-006-web-frontend-topology.md"
ADR_NATIVE_PATH = DOCS_ARCH_ADR_DIR / "ADR-007-native-macos-delivery-strategy.md"
ADR_TESTING_PATH = (
    DOCS_ARCH_ADR_DIR / "ADR-008-testing-determinism-and-replay-strategy.md"
)
ADR_RELEASE_PATH = (
    DOCS_ARCH_ADR_DIR / "ADR-009-release-evidence-and-migration-strategy.md"
)

DOC_PATH = DOCS_ANALYSIS_DIR / "agent_execution_dag.md"
DAG_PATH = DATA_ANALYSIS_DIR / "agent_execution_dag.json"
LEVELS_PATH = DATA_ANALYSIS_DIR / "agent_execution_levels.json"
EDGE_RATIONALES_PATH = DATA_ANALYSIS_DIR / "agent_execution_edge_rationales.json"
SOFT_CONTEXT_PATH = DATA_ANALYSIS_DIR / "agent_execution_soft_context_edges.json"
CRITICAL_PATH_PATH = DATA_ANALYSIS_DIR / "agent_execution_critical_path.json"
MERMAID_PATH = DIAGRAMS_ANALYSIS_DIR / "agent_execution_dag.mmd"

TODAY = "2026-04-18"
TASK_RE = re.compile(r"- \[([ X-])\] `(pc_\d+)` ([^ ]+) ")
PARALLEL_TRACK_RE = re.compile(
    r"phase_(\d{2})_parallel_wave_(\d{2})_track_(.+?)_(\d{3})_(.+)"
)
SEQUENTIAL_RE = re.compile(r"phase_(\d{2})_seq_(\d{3})_(.+)")
HEADING_RE = re.compile(r"^(#{2,4})\s+(.*)$")

HARD_EDGE_CLASSES = [
    "PROTOCOL_HARD",
    "ARTIFACT_HARD",
    "POLICY_HARD",
    "RESOURCE_HARD",
    "CONCURRENCY_HARD",
]


@dataclass(frozen=True)
class Task:
    task_id: str
    slug: str
    status: str
    order_index: int
    line_number: int
    phase: int
    protocol_mode: str
    wave_id: str | None
    track: str | None
    block_id: str
    card_path: str


@dataclass(frozen=True)
class Block:
    block_id: str
    protocol_mode: str
    phase: int
    wave_id: str | None
    task_ids: tuple[str, ...]
    first_task_id: str
    last_task_id: str


@dataclass(frozen=True)
class Edge:
    edge_id: str
    source_task_id: str
    target_task_id: str
    edge_class: str
    rule_id: str
    rationale: str
    source_citations: tuple[dict[str, str], ...]


def repo_rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def ordered_unique(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def json_write(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")


def text_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)


def line_ref(path: Path, line_number: int, label: str) -> str:
    safe_label = re.sub(r"[^A-Za-z0-9_.-]+", "_", label).strip("_") or "line"
    return f"{repo_rel(path)}::L{line_number}[{safe_label}]"


def file_ref(path: Path, label: str) -> str:
    return line_ref(path, 1, label)


def find_heading_line(path: Path, heading_text: str) -> int:
    normalized_heading = re.sub(r"^#+\s*", "", heading_text).strip()
    for line_number, line in enumerate(path.read_text().splitlines(), 1):
        match = HEADING_RE.match(line)
        if match and match.group(2).strip() == normalized_heading:
            return line_number
    raise ValueError(f"Heading `{heading_text}` not found in {path}")


def heading_ref(path: Path, heading_text: str, label: str | None = None) -> str:
    return line_ref(path, find_heading_line(path, heading_text), label or heading_text)


def md_escape(value: Any) -> str:
    if isinstance(value, list):
        value = ", ".join(str(item) for item in value)
    if isinstance(value, dict):
        value = json.dumps(value, sort_keys=True)
    return str(value).replace("|", "\\|").replace("\n", " ").strip()


def markdown_table(headers: list[str], rows: list[list[Any]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join("---" for _ in headers) + " |"
    body_lines = [
        "| " + " | ".join(md_escape(cell) for cell in row) + " |" for row in rows
    ]
    return "\n".join([header_line, divider_line, *body_lines])


def parse_tasks() -> list[Task]:
    tasks: list[Task] = []
    for line_number, line in enumerate(CHECKLIST_PATH.read_text().splitlines(), 1):
        match = TASK_RE.search(line)
        if not match:
            continue
        status_marker, task_id, slug = match.groups()
        sequential_match = SEQUENTIAL_RE.match(slug)
        parallel_match = PARALLEL_TRACK_RE.match(slug)
        if sequential_match:
            phase = int(sequential_match.group(1))
            protocol_mode = "sequential"
            wave_id = None
            track = None
            block_id = task_id
        elif parallel_match:
            phase = int(parallel_match.group(1))
            protocol_mode = "parallel"
            wave = int(parallel_match.group(2))
            wave_id = f"phase_{phase:02d}_parallel_wave_{wave:02d}"
            track = parallel_match.group(3)
            block_id = wave_id
        else:
            raise ValueError(f"Unable to parse task mode for `{slug}`")
        tasks.append(
            Task(
                task_id=task_id,
                slug=slug,
                status=status_marker,
                order_index=len(tasks),
                line_number=line_number,
                phase=phase,
                protocol_mode=protocol_mode,
                wave_id=wave_id,
                track=track,
                block_id=block_id,
                card_path=repo_rel(CARDS_DIR / f"{task_id}.md"),
            )
        )
    if len(tasks) != 428:
        raise ValueError(f"Expected 428 tasks, found {len(tasks)}")
    return tasks


def build_blocks(tasks: list[Task]) -> list[Block]:
    blocks: list[Block] = []
    current_block_id: str | None = None
    current_tasks: list[str] = []
    current_mode = ""
    current_phase = 0
    current_wave: str | None = None
    for task in tasks:
        if task.block_id != current_block_id:
            if current_block_id is not None:
                blocks.append(
                    Block(
                        block_id=current_block_id,
                        protocol_mode=current_mode,
                        phase=current_phase,
                        wave_id=current_wave,
                        task_ids=tuple(current_tasks),
                        first_task_id=current_tasks[0],
                        last_task_id=current_tasks[-1],
                    )
                )
            current_block_id = task.block_id
            current_tasks = [task.task_id]
            current_mode = task.protocol_mode
            current_phase = task.phase
            current_wave = task.wave_id
        else:
            current_tasks.append(task.task_id)
    if current_block_id is not None:
        blocks.append(
            Block(
                block_id=current_block_id,
                protocol_mode=current_mode,
                phase=current_phase,
                wave_id=current_wave,
                task_ids=tuple(current_tasks),
                first_task_id=current_tasks[0],
                last_task_id=current_tasks[-1],
            )
        )
    return blocks


def build_task_package_lookup() -> dict[str, dict[str, Any]]:
    if not PACKAGE_TASK_MAP_PATH.exists():
        return {}
    payload = load_json(PACKAGE_TASK_MAP_PATH)
    return {row["task_id"]: row for row in payload["rows"]}


def build_citation(ref: str, source_file: str, logical_block: str, rationale: str) -> dict[str, str]:
    return {
        "ref": ref,
        "source_file": source_file,
        "source_heading_or_logical_block": logical_block,
        "rationale": rationale,
    }


def card_ref(task_id: str, logical_block: str = "Task card root") -> dict[str, str]:
    path = CARDS_DIR / f"{task_id}.md"
    return build_citation(
        file_ref(path, f"{task_id}_card"),
        repo_rel(path),
        logical_block,
        f"{task_id} defines the roadmap deliverable class and execution intent.",
    )


def checklist_ref(task: Task) -> dict[str, str]:
    return build_citation(
        line_ref(CHECKLIST_PATH, task.line_number, task.task_id),
        repo_rel(CHECKLIST_PATH),
        f"Checklist line for {task.task_id}",
        f"{task.task_id} appears in canonical roadmap order in the checklist.",
    )


def make_selector(task_lookup: dict[str, Task]) -> dict[str, Callable[..., list[str]]]:
    ordered_ids = [task.task_id for task in sorted(task_lookup.values(), key=lambda item: item.order_index)]

    def by_task_ids(*task_ids: str) -> list[str]:
        return [task_id for task_id in ordered_ids if task_id in set(task_ids)]

    def by_id_range(start: int, end: int) -> list[str]:
        return [
            task.task_id
            for task in sorted(task_lookup.values(), key=lambda item: item.order_index)
            if start <= int(task.task_id.split("_")[1]) <= end
        ]

    def by_phase_range(start_phase: int, end_phase: int) -> list[str]:
        return [
            task.task_id
            for task in sorted(task_lookup.values(), key=lambda item: item.order_index)
            if start_phase <= task.phase <= end_phase
        ]

    def by_parallel_tasks() -> list[str]:
        return [
            task.task_id
            for task in sorted(task_lookup.values(), key=lambda item: item.order_index)
            if task.protocol_mode == "parallel"
        ]

    def by_tracks(*tracks: str) -> list[str]:
        track_set = set(tracks)
        return [
            task.task_id
            for task in sorted(task_lookup.values(), key=lambda item: item.order_index)
            if task.track in track_set
        ]

    def by_slug_contains_any(*needles: str) -> list[str]:
        return [
            task.task_id
            for task in sorted(task_lookup.values(), key=lambda item: item.order_index)
            if any(needle in task.slug for needle in needles)
        ]

    def by_phase_and_tracks(phase: int, tracks: tuple[str, ...]) -> list[str]:
        track_set = set(tracks)
        return [
            task.task_id
            for task in sorted(task_lookup.values(), key=lambda item: item.order_index)
            if task.phase == phase and task.track in track_set
        ]

    return {
        "by_task_ids": by_task_ids,
        "by_id_range": by_id_range,
        "by_phase_range": by_phase_range,
        "by_parallel_tasks": by_parallel_tasks,
        "by_tracks": by_tracks,
        "by_slug_contains_any": by_slug_contains_any,
        "by_phase_and_tracks": by_phase_and_tracks,
    }


def add_edge(
    edge_store: dict[str, Edge],
    source_task_id: str,
    target_task_id: str,
    edge_class: str,
    rule_id: str,
    rationale: str,
    source_citations: Iterable[dict[str, str]],
    task_lookup: dict[str, Task],
) -> None:
    if source_task_id == target_task_id:
        return
    source_task = task_lookup[source_task_id]
    target_task = task_lookup[target_task_id]
    if source_task.order_index >= target_task.order_index:
        raise ValueError(
            f"Non-forward edge detected for {edge_class} {source_task_id} -> {target_task_id}"
        )
    edge_id = f"{source_task_id}__{target_task_id}__{edge_class}__{rule_id}"
    edge_store[edge_id] = Edge(
        edge_id=edge_id,
        source_task_id=source_task_id,
        target_task_id=target_task_id,
        edge_class=edge_class,
        rule_id=rule_id,
        rationale=rationale,
        source_citations=tuple(source_citations),
    )


def build_protocol_edges(tasks: list[Task], blocks: list[Block]) -> dict[str, Edge]:
    task_lookup = {task.task_id: task for task in tasks}
    edges: dict[str, Edge] = {}
    sequential_ref = build_citation(
        heading_ref(AGENT_PATH, "Sequential Protocol", "Sequential_Protocol"),
        repo_rel(AGENT_PATH),
        "Sequential Protocol",
        "Sequential tasks gate all later work while incomplete.",
    )
    parallel_ref = build_citation(
        heading_ref(AGENT_PATH, "Parallel Wave Protocol", "Parallel_Wave_Protocol"),
        repo_rel(AGENT_PATH),
        "Parallel Wave Protocol",
        "Parallel waves remain blocked until the prior contiguous block is complete.",
    )
    eligibility_ref = build_citation(
        heading_ref(AGENT_PATH, "Eligibility Rules", "Eligibility_Rules"),
        repo_rel(AGENT_PATH),
        "Eligibility Rules",
        "The first incomplete block determines what is claimable and where the blocked boundary begins.",
    )
    for previous_block, next_block in zip(blocks, blocks[1:]):
        citations = [
            sequential_ref if next_block.protocol_mode == "sequential" else parallel_ref,
            eligibility_ref,
            build_citation(
                file_ref(CHECKLIST_PATH, f"{previous_block.block_id}_to_{next_block.block_id}"),
                repo_rel(CHECKLIST_PATH),
                "Checklist contiguous block boundary",
                f"{previous_block.block_id} immediately precedes {next_block.block_id} in checklist order.",
            ),
        ]
        rationale = (
            f"{next_block.block_id} cannot become claimable until {previous_block.block_id} is complete under AGENT protocol gating."
        )
        for source_task_id in previous_block.task_ids:
            for target_task_id in next_block.task_ids:
                add_edge(
                    edges,
                    source_task_id,
                    target_task_id,
                    "PROTOCOL_HARD",
                    f"protocol_boundary__{previous_block.block_id}__{next_block.block_id}",
                    rationale,
                    citations,
                    task_lookup,
                )
    return edges


def build_non_protocol_rules(
    tasks: list[Task],
) -> list[dict[str, Any]]:
    task_lookup = {task.task_id: task for task in tasks}
    select = make_selector(task_lookup)
    phase01_ids = select["by_id_range"](31, 58)
    phase03_to_phase06_ids = [
        task.task_id for task in tasks if 3 <= task.phase <= 6
    ]
    phase02_to_phase06_ids = [
        task.task_id for task in tasks if 2 <= task.phase <= 6
    ]
    phase07_ids = select["by_id_range"](392, 428)
    phase05_web_ids = select["by_phase_and_tracks"](
        5,
        (
            "frontend_shared",
            "frontend_low_noise",
            "frontend_portal",
            "frontend_collaboration",
            "frontend_governance",
        ),
    )
    phase05_web_app_ids = select["by_phase_and_tracks"](
        5,
        (
            "frontend_low_noise",
            "frontend_portal",
            "frontend_collaboration",
            "frontend_governance",
        ),
    )
    phase05_native_ids = select["by_tracks"]("frontend_native")
    phase06_frontend_regression_ids = select["by_tracks"]("testing_frontend_regression")
    phase06_all_ids = select["by_phase_and_tracks"](
        6,
        (
            "testing_schema_contract",
            "testing_engine_modules",
            "testing_state_machine_model",
            "testing_api_northbound",
            "testing_authority_integration",
            "testing_frontend_regression",
            "testing_performance_failure_security",
            "testing_release_acceptance",
        ),
    )
    rules: list[dict[str, Any]] = [
        {
            "rule_id": "dependency_register_precedes_phase01_provisioning",
            "source_task_id": "pc_0018",
            "target_ids": phase01_ids,
            "edge_class": "ARTIFACT_HARD",
            "rationale": "Phase-01 environment, account, and provider provisioning requires the normalized dependency register and provisioning strategy from pc_0018.",
            "citations": [
                build_citation(
                    file_ref(DEPENDENCY_REGISTER_DOC_PATH, "dependency_register"),
                    repo_rel(DEPENDENCY_REGISTER_DOC_PATH),
                    "Dependency register and provisioning strategy",
                    "pc_0018 records the prerequisite dependency topology, credential inventory, and provisioning order.",
                ),
                card_ref("pc_0018"),
            ],
        },
        {
            "rule_id": "package_policy_precedes_phase02_to_phase06_implementation",
            "source_task_id": "pc_0028",
            "target_ids": phase02_to_phase06_ids,
            "edge_class": "POLICY_HARD",
            "rationale": "Phase-02 through phase-06 implementation tasks need the package-boundary and ownership policy from pc_0028 so agents know where code belongs and what it may depend on.",
            "citations": [
                build_citation(
                    file_ref(PACKAGE_BOUNDARY_DOC_PATH, "package_boundary_map"),
                    repo_rel(PACKAGE_BOUNDARY_DOC_PATH),
                    "Monorepo package boundaries and team ownership map",
                    "pc_0028 fixes deterministic package destinations and ownership streams for later implementation tasks.",
                ),
                card_ref("pc_0028"),
            ],
        },
        {
            "rule_id": "dag_output_precedes_definition_of_done_map",
            "source_task_id": "pc_0029",
            "target_ids": ["pc_0030"],
            "edge_class": "ARTIFACT_HARD",
            "rationale": "pc_0030 explicitly consumes the execution DAG output from pc_0029 to derive wave candidates and exit criteria.",
            "citations": [
                card_ref("pc_0029"),
                card_ref("pc_0030"),
            ],
        },
        {
            "rule_id": "definition_of_done_precedes_parallel_wave_execution",
            "source_task_id": "pc_0030",
            "target_ids": phase03_to_phase06_ids,
            "edge_class": "POLICY_HARD",
            "rationale": "Wide parallel execution is gated on the definition-of-done and wave-plan map from pc_0030 so later agents know the acceptance rules and phase exit criteria they are working toward.",
            "citations": [
                card_ref("pc_0030"),
                card_ref("pc_0029", "Task card root"),
            ],
        },
        {
            "rule_id": "primary_stack_adr_precedes_workspace_scaffolds",
            "source_task_id": "pc_0019",
            "target_ids": ["pc_0059", "pc_0229", "pc_0289"],
            "edge_class": "POLICY_HARD",
            "rationale": "Workspace and app scaffolds must follow ADR-001 so the monorepo, browser, and native shells are created on the selected implementation stack rather than re-deciding runtimes mid-build.",
            "citations": [
                build_citation(
                    file_ref(ADR_PRIMARY_STACK_PATH, "adr_001_primary_stack"),
                    repo_rel(ADR_PRIMARY_STACK_PATH),
                    "ADR-001 primary implementation stack",
                    "ADR-001 selects the TypeScript-first product core and Swift-native operator client stack.",
                ),
                card_ref("pc_0019"),
            ],
        },
        {
            "rule_id": "storage_eventing_adr_precedes_storage_runtime_tracks",
            "source_task_id": "pc_0020",
            "target_ids": ordered_unique(
                select["by_task_ids"]("pc_0050", "pc_0051", "pc_0052", "pc_0053", "pc_0066", "pc_0067", "pc_0069", "pc_0070", "pc_0071")
                + select["by_tracks"](
                    "backend_manifest",
                    "backend_collection",
                    "backend_workflow",
                    "backend_northbound",
                    "backend_recovery",
                    "backend_release_resilience",
                )
            ),
            "edge_class": "POLICY_HARD",
            "rationale": "ADR-002 fixes the relational, object-store, broker, projection, and cache topology that storage-heavy provisioning and runtime tracks must implement.",
            "citations": [
                build_citation(
                    file_ref(ADR_STORAGE_EVENTING_PATH, "adr_002_storage_eventing"),
                    repo_rel(ADR_STORAGE_EVENTING_PATH),
                    "ADR-002 storage and eventing topology",
                    "ADR-002 defines the store and eventing topology for control, audit, object, broker, projection, and cache surfaces.",
                ),
                card_ref("pc_0020"),
            ],
        },
        {
            "rule_id": "identity_adr_precedes_identity_and_session_tracks",
            "source_task_id": "pc_0021",
            "target_ids": ordered_unique(
                select["by_task_ids"]("pc_0039", "pc_0040", "pc_0237", "pc_0291", "pc_0343", "pc_0378")
                + select["by_tracks"]("backend_access", "backend_northbound")
            ),
            "edge_class": "POLICY_HARD",
            "rationale": "ADR-003 fixes the human, step-up, session, browser, and native identity posture that identity-provider setup, access runtime, and session-aware clients must follow.",
            "citations": [
                build_citation(
                    file_ref(ADR_IDENTITY_PATH, "adr_003_identity_session"),
                    repo_rel(ADR_IDENTITY_PATH),
                    "ADR-003 identity step-up and session model",
                    "ADR-003 selects the standards-based identity, session, and step-up model for browser and native surfaces.",
                ),
                card_ref("pc_0021"),
            ],
        },
        {
            "rule_id": "authority_adr_precedes_authority_tracks",
            "source_task_id": "pc_0022",
            "target_ids": ordered_unique(
                select["by_task_ids"]("pc_0034", "pc_0035", "pc_0036", "pc_0037", "pc_0038", "pc_0087")
                + select["by_tracks"]("backend_authority", "testing_authority_integration")
            ),
            "edge_class": "POLICY_HARD",
            "rationale": "ADR-004 isolates the authority gateway, credential, callback, and reconciliation boundary that provider setup, authority runtime, and authority integration suites must implement.",
            "citations": [
                build_citation(
                    file_ref(ADR_AUTHORITY_PATH, "adr_004_authority_boundary"),
                    repo_rel(ADR_AUTHORITY_PATH),
                    "ADR-004 authority integration boundary",
                    "ADR-004 establishes the controlled authority gateway and credential isolation posture.",
                ),
                card_ref("pc_0022"),
            ],
        },
        {
            "rule_id": "projection_adr_precedes_projection_and_surface_tracks",
            "source_task_id": "pc_0023",
            "target_ids": ordered_unique(
                select["by_tracks"](
                    "backend_low_noise",
                    "backend_portal",
                    "backend_governance",
                    "frontend_low_noise",
                    "frontend_portal",
                    "frontend_collaboration",
                    "frontend_governance",
                )
                + select["by_task_ids"]("pc_0290", "pc_0292", "pc_0295")
            ),
            "edge_class": "POLICY_HARD",
            "rationale": "ADR-005 fixes server-authored typed projections as the read-model strategy, so projector tracks and projection-rendering surfaces must follow it before implementation spreads.",
            "citations": [
                build_citation(
                    file_ref(ADR_PROJECTION_PATH, "adr_005_projection_strategy"),
                    repo_rel(ADR_PROJECTION_PATH),
                    "ADR-005 read-model projection strategy",
                    "ADR-005 chooses server-authored per-surface typed projections as the read-side doctrine.",
                ),
                card_ref("pc_0023"),
            ],
        },
        {
            "rule_id": "web_topology_adr_precedes_web_tracks",
            "source_task_id": "pc_0024",
            "target_ids": ordered_unique(
                ["pc_0059"] + phase05_web_ids + phase06_frontend_regression_ids
            ),
            "edge_class": "POLICY_HARD",
            "rationale": "ADR-006 fixes the two browser deployables, shared web platform, and route-group ownership model that all wave-03 web work and browser regression suites must implement.",
            "citations": [
                build_citation(
                    file_ref(ADR_WEB_PATH, "adr_006_web_topology"),
                    repo_rel(ADR_WEB_PATH),
                    "ADR-006 web frontend topology",
                    "ADR-006 selects the shared TypeScript/React platform with operator and portal deployables at the edge.",
                ),
                card_ref("pc_0024"),
            ],
        },
        {
            "rule_id": "native_strategy_adr_precedes_native_tracks",
            "source_task_id": "pc_0025",
            "target_ids": ordered_unique(
                ["pc_0059", "pc_0364", "pc_0402", "pc_0403", "pc_0426"]
                + phase05_native_ids
            ),
            "edge_class": "POLICY_HARD",
            "rationale": "ADR-007 fixes the signed, notarized SwiftUI-first macOS operator strategy that native scaffolds, native regressions, and native release tasks must honor.",
            "citations": [
                build_citation(
                    file_ref(ADR_NATIVE_PATH, "adr_007_native_strategy"),
                    repo_rel(ADR_NATIVE_PATH),
                    "ADR-007 native macOS delivery strategy",
                    "ADR-007 selects the signed and notarized Xcode-native internal macOS delivery model.",
                ),
                card_ref("pc_0025"),
            ],
        },
        {
            "rule_id": "testing_adr_precedes_wave04_test_tracks",
            "source_task_id": "pc_0026",
            "target_ids": ordered_unique(["pc_0077", "pc_0079"] + phase06_all_ids),
            "edge_class": "POLICY_HARD",
            "rationale": "ADR-008 fixes the layered determinism and replay testing doctrine that fixture scaffolds and all phase-06 test tracks depend on.",
            "citations": [
                build_citation(
                    file_ref(ADR_TESTING_PATH, "adr_008_testing_strategy"),
                    repo_rel(ADR_TESTING_PATH),
                    "ADR-008 testing determinism and replay strategy",
                    "ADR-008 selects the contract-first deterministic testing portfolio and release-candidate evidence doctrine.",
                ),
                card_ref("pc_0026"),
            ],
        },
        {
            "rule_id": "release_adr_precedes_release_and_promotion_tracks",
            "source_task_id": "pc_0027",
            "target_ids": ordered_unique(
                ["pc_0055"]
                + select["by_tracks"]("backend_release_resilience", "testing_release_acceptance")
                + phase07_ids
            ),
            "edge_class": "POLICY_HARD",
            "rationale": "ADR-009 fixes the candidate-bound release evidence, migration, rollback, and fail-forward doctrine that release-resilience work, release acceptance suites, and phase-07 promotion tasks must follow.",
            "citations": [
                build_citation(
                    file_ref(ADR_RELEASE_PATH, "adr_009_release_strategy"),
                    repo_rel(ADR_RELEASE_PATH),
                    "ADR-009 release evidence and migration strategy",
                    "ADR-009 selects the manifest-centered, candidate-bound release and migration strategy.",
                ),
                card_ref("pc_0027"),
            ],
        },
        {
            "rule_id": "environment_inventory_precedes_phase01_resource_work",
            "source_task_id": "pc_0031",
            "target_ids": ordered_unique(
                select["by_id_range"](32, 58)
            ),
            "edge_class": "RESOURCE_HARD",
            "rationale": "Phase-01 provisioning tasks need the canonical environment, tenant, and authority-profile inventory from pc_0031 before they can target the right accounts and environments.",
            "citations": [card_ref("pc_0031")],
        },
        {
            "rule_id": "browser_automation_workspace_precedes_browser_automation_tasks",
            "source_task_id": "pc_0032",
            "target_ids": select["by_id_range"](34, 48),
            "edge_class": "RESOURCE_HARD",
            "rationale": "The browser automation workspace from pc_0032 is a hard execution substrate for the third-party provisioning tasks that follow.",
            "citations": [card_ref("pc_0032")],
        },
        {
            "rule_id": "credential_policy_precedes_secret_capture_and_injection_tasks",
            "source_task_id": "pc_0033",
            "target_ids": ordered_unique(
                select["by_id_range"](34, 49) + ["pc_0057", "pc_0063"]
            ),
            "edge_class": "POLICY_HARD",
            "rationale": "Credential capture, rotation, and secret-storage policy must exist before accounts, client secrets, CI secrets, and runtime secret-injection work proceed.",
            "citations": [card_ref("pc_0033")],
        },
        {
            "rule_id": "secrets_manager_precedes_runtime_secret_injection_and_rotation",
            "source_task_id": "pc_0049",
            "target_ids": ["pc_0057", "pc_0063", "pc_0211"],
            "edge_class": "RESOURCE_HARD",
            "rationale": "Runtime secret injection and later secret-rotation auditing depend on the secrets-manager and KMS/HSM root created in pc_0049.",
            "citations": [card_ref("pc_0049")],
        },
        {
            "rule_id": "build_signing_services_precede_release_artifact_and_distribution_tasks",
            "source_task_id": "pc_0055",
            "target_ids": ["pc_0219", "pc_0220", "pc_0222", "pc_0400", "pc_0401", "pc_0402", "pc_0424", "pc_0425", "pc_0426"],
            "edge_class": "RESOURCE_HARD",
            "rationale": "Release-candidate artifacts, signing, notarization, and rollout evidence cannot be assembled until build-signing and attestation services exist.",
            "citations": [card_ref("pc_0055")],
        },
        {
            "rule_id": "edge_delivery_precedes_live_rollout",
            "source_task_id": "pc_0056",
            "target_ids": ["pc_0426"],
            "edge_class": "RESOURCE_HARD",
            "rationale": "Live browser rollout depends on the DNS/TLS/WAF and edge-delivery configuration created in pc_0056.",
            "citations": [card_ref("pc_0056")],
        },
        {
            "rule_id": "cicd_and_preview_accounts_precede_test_and_release_execution",
            "source_task_id": "pc_0057",
            "target_ids": ["pc_0079", "pc_0301", "pc_0400", "pc_0424"],
            "edge_class": "RESOURCE_HARD",
            "rationale": "Ephemeral test environments, CI-gated validation, and rehearsed release execution depend on the CI/CD runners, environment secrets, and preview accounts provisioned in pc_0057.",
            "citations": [card_ref("pc_0057")],
        },
        {
            "rule_id": "external_credential_smoke_validation_precedes_authority_execution_and_pilot_use",
            "source_task_id": "pc_0058",
            "target_ids": ordered_unique(
                select["by_tracks"]("backend_authority", "testing_authority_integration")
                + ["pc_0422", "pc_0423"]
            ),
            "edge_class": "RESOURCE_HARD",
            "rationale": "Authority runtime work and later pilot validation should not proceed until the acquired external credentials have been smoke-validated in pc_0058.",
            "citations": [card_ref("pc_0058")],
        },
        {
            "rule_id": "monorepo_bootstrap_precedes_parallel_implementation_waves",
            "source_task_id": "pc_0059",
            "target_ids": phase03_to_phase06_ids,
            "edge_class": "ARTIFACT_HARD",
            "rationale": "The backend, web, native, and shared package scaffold from pc_0059 is a hard implementation substrate for all later parallel coding and testing waves.",
            "citations": [card_ref("pc_0059")],
        },
        {
            "rule_id": "schema_import_precedes_model_generation",
            "source_task_id": "pc_0060",
            "target_ids": ["pc_0061"],
            "edge_class": "ARTIFACT_HARD",
            "rationale": "Language-model generation in pc_0061 cannot run until the existing schemas, validators, and sample payloads are imported into the shared contracts package in pc_0060.",
            "citations": [card_ref("pc_0060"), card_ref("pc_0061")],
        },
        {
            "rule_id": "generated_models_precede_typed_implementation_tracks",
            "source_task_id": "pc_0061",
            "target_ids": ordered_unique(phase03_to_phase06_ids + ["pc_0415"]),
            "edge_class": "ARTIFACT_HARD",
            "rationale": "Typed backend, frontend, native, and test implementation depends on generated schema bindings from pc_0061 rather than re-deriving models ad hoc.",
            "citations": [card_ref("pc_0061")],
        },
        {
            "rule_id": "schema_bundle_baseline_precedes_schema_and_release_contract_work",
            "source_task_id": "pc_0066",
            "target_ids": [
                "pc_0100",
                "pc_0221",
                "pc_0222",
                "pc_0305",
                "pc_0306",
                "pc_0310",
                "pc_0374",
                "pc_0401",
                "pc_0414",
                "pc_0425",
            ],
            "edge_class": "ARTIFACT_HARD",
            "rationale": "Schema bundle versioning and migration baseline from pc_0066 is a direct prerequisite for later reader-window, compatibility, release-manifest, and schema-migration work.",
            "citations": [card_ref("pc_0066")],
        },
        {
            "rule_id": "command_runtime_scaffold_precedes_northbound_and_command_clients",
            "source_task_id": "pc_0068",
            "target_ids": ordered_unique(
                select["by_tracks"]("backend_northbound", "testing_api_northbound")
                + ["pc_0234", "pc_0235", "pc_0295"]
            ),
            "edge_class": "ARTIFACT_HARD",
            "rationale": "Later command, receipt, problem-envelope, and stream-facing work depends on the command/runtime scaffold from pc_0068.",
            "citations": [card_ref("pc_0068")],
        },
        {
            "rule_id": "object_storage_abstraction_precedes_upload_and_quarantine_work",
            "source_task_id": "pc_0069",
            "target_ids": [
                "pc_0112",
                "pc_0119",
                "pc_0120",
                "pc_0164",
                "pc_0180",
                "pc_0181",
                "pc_0182",
                "pc_0188",
                "pc_0236",
                "pc_0255",
                "pc_0256",
                "pc_0263",
                "pc_0271",
                "pc_0297",
                "pc_0338",
                "pc_0369",
                "pc_0373",
                "pc_0396",
            ],
            "edge_class": "ARTIFACT_HARD",
            "rationale": "Upload, artifact, object-storage, quarantine, and document-handling work depends on the shared abstraction introduced in pc_0069.",
            "citations": [card_ref("pc_0069")],
        },
        {
            "rule_id": "queue_abstraction_precedes_queue_and_worker_semantics",
            "source_task_id": "pc_0070",
            "target_ids": [
                "pc_0149",
                "pc_0156",
                "pc_0206",
                "pc_0207",
                "pc_0208",
                "pc_0217",
                "pc_0321",
                "pc_0372",
                "pc_0380",
                "pc_0411",
            ],
            "edge_class": "ARTIFACT_HARD",
            "rationale": "Queue-backed notifications, worker coordination, nightly scheduling, and queue-resilience work depend on the shared queue abstraction from pc_0070.",
            "citations": [card_ref("pc_0070")],
        },
        {
            "rule_id": "streaming_abstraction_precedes_stream_and_resume_work",
            "source_task_id": "pc_0071",
            "target_ids": ["pc_0161", "pc_0165", "pc_0235", "pc_0274", "pc_0295", "pc_0336", "pc_0339", "pc_0371", "pc_0394"],
            "edge_class": "ARTIFACT_HARD",
            "rationale": "SSE, live update, resume, rebase, and stream-broker testing work depends on the streaming abstraction introduced in pc_0071.",
            "citations": [card_ref("pc_0071")],
        },
        {
            "rule_id": "upload_transfer_service_precedes_upload_flows",
            "source_task_id": "pc_0072",
            "target_ids": ["pc_0164", "pc_0180", "pc_0181", "pc_0182", "pc_0255", "pc_0256", "pc_0263", "pc_0271", "pc_0297", "pc_0308", "pc_0338", "pc_0369", "pc_0396"],
            "edge_class": "ARTIFACT_HARD",
            "rationale": "Upload endpoint, portal upload, native upload, and upload recovery work depends on the blob-transfer scaffold from pc_0072.",
            "citations": [card_ref("pc_0072")],
        },
        {
            "rule_id": "cache_isolation_library_precedes_cache_and_recovery_work",
            "source_task_id": "pc_0073",
            "target_ids": ["pc_0203", "pc_0204", "pc_0238", "pc_0294", "pc_0309", "pc_0368", "pc_0376"],
            "edge_class": "ARTIFACT_HARD",
            "rationale": "Cache isolation, native cache hydration, and cache-corruption regression work depends on the shared cache-partitioning and masking library from pc_0073.",
            "citations": [card_ref("pc_0073")],
        },
        {
            "rule_id": "telemetry_bootstrap_precedes_observability_and_security_measurement",
            "source_task_id": "pc_0075",
            "target_ids": ordered_unique(select["by_id_range"](214, 218) + select["by_id_range"](370, 379) + ["pc_0409"]),
            "edge_class": "ARTIFACT_HARD",
            "rationale": "Observability queries, performance/security suites, and later service-level dashboards depend on the telemetry bootstrap introduced in pc_0075.",
            "citations": [card_ref("pc_0075")],
        },
        {
            "rule_id": "audit_pipeline_precedes_audit_and_investigation_work",
            "source_task_id": "pc_0076",
            "target_ids": ["pc_0166", "pc_0194", "pc_0214", "pc_0215", "pc_0216", "pc_0217", "pc_0218", "pc_0286", "pc_0341", "pc_0375", "pc_0409"],
            "edge_class": "ARTIFACT_HARD",
            "rationale": "Audit-trail endpoints, investigation views, failure dashboards, and restore-audit suites depend on the append-only audit pipeline created in pc_0076.",
            "citations": [card_ref("pc_0076")],
        },
        {
            "rule_id": "seed_fixture_pack_precedes_acceptance_and_pilot_tracks",
            "source_task_id": "pc_0077",
            "target_ids": ordered_unique(select["by_tracks"]("testing_release_acceptance") + ["pc_0397", "pc_0419", "pc_0420", "pc_0421", "pc_0422", "pc_0423"]),
            "edge_class": "ARTIFACT_HARD",
            "rationale": "Acceptance suites, synthetic demo fixtures, and pilot dry-run tasks depend on the canonical seed-data and domain example pack created in pc_0077.",
            "citations": [card_ref("pc_0077")],
        },
        {
            "rule_id": "schema_drift_automation_precedes_schema_compatibility_tracks",
            "source_task_id": "pc_0080",
            "target_ids": ["pc_0221", "pc_0222", "pc_0305", "pc_0374", "pc_0414", "pc_0425"],
            "edge_class": "ARTIFACT_HARD",
            "rationale": "Later schema compatibility and migration safety work depends on the drift and migration-readiness automation created in pc_0080.",
            "citations": [card_ref("pc_0080")],
        },
        {
            "rule_id": "api_schema_docs_site_precedes_internal_schema_publication",
            "source_task_id": "pc_0081",
            "target_ids": ["pc_0415"],
            "edge_class": "ARTIFACT_HARD",
            "rationale": "Publishing generated API schema and contract documentation in phase 07 depends on the baseline documentation site scaffold created in pc_0081.",
            "citations": [card_ref("pc_0081")],
        },
        {
            "rule_id": "access_control_matrix_precedes_access_and_governance_surfaces",
            "source_task_id": "pc_0083",
            "target_ids": ordered_unique(
                select["by_tracks"]("backend_access", "backend_governance", "frontend_governance")
            ),
            "edge_class": "POLICY_HARD",
            "rationale": "Access runtime and governance surfaces must follow the baseline access-control matrix seeded in pc_0083 instead of inventing their own authority vocabulary.",
            "citations": [card_ref("pc_0083")],
        },
        {
            "rule_id": "release_conventions_precede_release_tracks",
            "source_task_id": "pc_0084",
            "target_ids": ordered_unique(
                select["by_tracks"]("backend_release_resilience", "testing_release_acceptance")
                + phase07_ids
            ),
            "edge_class": "POLICY_HARD",
            "rationale": "Release, migration, and promotion work must inherit the branching, versioning, and artifact naming conventions established in pc_0084.",
            "citations": [card_ref("pc_0084")],
        },
        {
            "rule_id": "frontend_workspace_scaffold_serializes_wave03_web_work",
            "source_task_id": "pc_0229",
            "target_ids": [task_id for task_id in phase05_web_ids if task_id != "pc_0229"],
            "edge_class": "CONCURRENCY_HARD",
            "rationale": "Within phase-05 wave-03, the shared web workspace and route-contract scaffold from pc_0229 must land before the rest of the browser-platform and app work can safely branch.",
            "citations": [card_ref("pc_0229"), card_ref("pc_0024")],
        },
        {
            "rule_id": "design_tokens_serializes_wave03_web_apps",
            "source_task_id": "pc_0230",
            "target_ids": phase05_web_app_ids,
            "edge_class": "CONCURRENCY_HARD",
            "rationale": "Browser app tracks should not diverge before the cross-shell design tokens and theme runtime from pc_0230 exist.",
            "citations": [card_ref("pc_0230"), card_ref("pc_0024")],
        },
        {
            "rule_id": "interaction_layer_serializes_wave03_web_apps",
            "source_task_id": "pc_0231",
            "target_ids": phase05_web_app_ids,
            "edge_class": "CONCURRENCY_HARD",
            "rationale": "Browser app tracks should not diverge before the interaction-layer foundation and surface registry from pc_0231 exist.",
            "citations": [card_ref("pc_0231"), card_ref("pc_0024")],
        },
        {
            "rule_id": "selector_catalog_serializes_wave03_web_apps",
            "source_task_id": "pc_0232",
            "target_ids": ordered_unique(phase05_web_app_ids + phase06_frontend_regression_ids),
            "edge_class": "CONCURRENCY_HARD",
            "rationale": "Semantic selector and accessibility-anchor work from pc_0232 is a shared surface contract that should land before browser apps and their frontend regression suites branch further.",
            "citations": [card_ref("pc_0232"), card_ref("pc_0024")],
        },
        {
            "rule_id": "frontend_state_containers_serialize_wave03_web_apps",
            "source_task_id": "pc_0233",
            "target_ids": phase05_web_app_ids,
            "edge_class": "CONCURRENCY_HARD",
            "rationale": "Browser app tracks should not fork before the shared ETag, stale-view, and shell-token state containers from pc_0233 exist.",
            "citations": [card_ref("pc_0233"), card_ref("pc_0024")],
        },
        {
            "rule_id": "xcode_scaffold_serializes_wave03_native_work",
            "source_task_id": "pc_0289",
            "target_ids": [task_id for task_id in phase05_native_ids if task_id != "pc_0289"],
            "edge_class": "CONCURRENCY_HARD",
            "rationale": "Within phase-05 wave-03, the Xcode workspace and Swift-package scaffold from pc_0289 must land before the remaining native tasks can branch safely.",
            "citations": [card_ref("pc_0289"), card_ref("pc_0025")],
        },
    ]
    return rules


def build_hard_edges(tasks: list[Task], blocks: list[Block]) -> dict[str, Edge]:
    task_lookup = {task.task_id: task for task in tasks}
    edges = build_protocol_edges(tasks, blocks)
    for rule in build_non_protocol_rules(tasks):
        target_ids = ordered_unique(rule["target_ids"])
        for target_id in target_ids:
            add_edge(
                edges,
                rule["source_task_id"],
                target_id,
                rule["edge_class"],
                rule["rule_id"],
                rule["rationale"],
                rule["citations"],
                task_lookup,
            )
    return dict(
        sorted(
            edges.items(),
            key=lambda item: (
                task_lookup[item[1].target_task_id].order_index,
                task_lookup[item[1].source_task_id].order_index,
                item[1].edge_class,
                item[1].rule_id,
            ),
        )
    )


def build_soft_context_edges(tasks: list[Task], hard_edges: dict[str, Edge]) -> dict[str, Edge]:
    task_lookup = {task.task_id: task for task in tasks}
    hard_pairs = {(edge.source_task_id, edge.target_task_id) for edge in hard_edges.values()}
    edges: dict[str, Edge] = {}
    track_groups: dict[tuple[str, str], list[Task]] = defaultdict(list)
    for task in tasks:
        if task.protocol_mode == "parallel" and task.track is not None:
            track_groups[(task.block_id, task.track)].append(task)
    for (block_id, track), grouped_tasks in sorted(track_groups.items()):
        ordered_tasks = sorted(grouped_tasks, key=lambda item: item.order_index)
        for source_task, target_task in zip(ordered_tasks, ordered_tasks[1:]):
            if (source_task.task_id, target_task.task_id) in hard_pairs:
                continue
            rationale = (
                f"{source_task.task_id} and {target_task.task_id} are same-track neighbors in {track}; this is useful context and recommended reading order, but not promoted to a hard blocker."
            )
            citations = [
                checklist_ref(source_task),
                checklist_ref(target_task),
            ]
            add_edge(
                edges,
                source_task.task_id,
                target_task.task_id,
                "SOFT_CONTEXT",
                f"same_track_adjacency__{block_id}__{track}",
                rationale,
                citations,
                task_lookup,
            )
    return dict(
        sorted(
            edges.items(),
            key=lambda item: (
                task_lookup[item[1].target_task_id].order_index,
                task_lookup[item[1].source_task_id].order_index,
                item[1].rule_id,
            ),
        )
    )


def build_unique_hard_graph(
    tasks: list[Task], hard_edges: dict[str, Edge]
) -> tuple[dict[str, list[str]], dict[str, list[str]]]:
    task_ids = [task.task_id for task in tasks]
    successors: dict[str, list[str]] = {task_id: [] for task_id in task_ids}
    predecessors: dict[str, list[str]] = {task_id: [] for task_id in task_ids}
    for source_task_id, target_task_id in sorted(
        {
            (edge.source_task_id, edge.target_task_id)
            for edge in hard_edges.values()
        },
        key=lambda pair: (task_ids.index(pair[1]), task_ids.index(pair[0])),
    ):
        successors[source_task_id].append(target_task_id)
        predecessors[target_task_id].append(source_task_id)
    for task_id in task_ids:
        successors[task_id] = ordered_unique(successors[task_id])
        predecessors[task_id] = ordered_unique(predecessors[task_id])
    return successors, predecessors


def assert_acyclic(tasks: list[Task], predecessors: dict[str, list[str]], successors: dict[str, list[str]]) -> None:
    indegree = {task.task_id: len(predecessors[task.task_id]) for task in tasks}
    ready = [task.task_id for task in tasks if indegree[task.task_id] == 0]
    ordered: list[str] = []
    while ready:
        current = ready.pop(0)
        ordered.append(current)
        for follower in successors[current]:
            indegree[follower] -= 1
            if indegree[follower] == 0:
                ready.append(follower)
    if len(ordered) != len(tasks):
        blocked = sorted(task_id for task_id, degree in indegree.items() if degree > 0)
        raise ValueError(f"Hard-edge graph contains a cycle or contradiction involving {blocked}")


def build_levels(tasks: list[Task], predecessors: dict[str, list[str]]) -> dict[str, Any]:
    level_by_task: dict[str, int] = {}
    for task in sorted(tasks, key=lambda item: item.order_index):
        level_by_task[task.task_id] = (
            0
            if not predecessors[task.task_id]
            else max(level_by_task[predecessor] for predecessor in predecessors[task.task_id]) + 1
        )
    grouped: dict[int, list[Task]] = defaultdict(list)
    for task in tasks:
        grouped[level_by_task[task.task_id]].append(task)
    levels = [
        {
            "level": level,
            "task_ids": [task.task_id for task in sorted(grouped[level], key=lambda item: item.order_index)],
            "task_count": len(grouped[level]),
            "protocol_block_ids": ordered_unique(
                task.block_id for task in sorted(grouped[level], key=lambda item: item.order_index)
            ),
            "parallelism": len(grouped[level]),
        }
        for level in sorted(grouped)
    ]
    return {
        "level_by_task": level_by_task,
        "levels": levels,
        "summary": {
            "level_count": len(levels),
            "max_parallelism": max(level["parallelism"] for level in levels),
        },
    }


def build_block_levels(blocks: list[Block], level_by_task: dict[str, int]) -> list[dict[str, Any]]:
    rows = []
    for block in blocks:
        task_levels = [level_by_task[task_id] for task_id in block.task_ids]
        rows.append(
            {
                "block_id": block.block_id,
                "protocol_mode": block.protocol_mode,
                "phase": f"phase_{block.phase:02d}",
                "wave_id": block.wave_id,
                "task_ids": list(block.task_ids),
                "task_count": len(block.task_ids),
                "min_level": min(task_levels),
                "max_level": max(task_levels),
            }
        )
    return rows


def build_critical_path(
    tasks: list[Task],
    predecessors: dict[str, list[str]],
    level_by_task: dict[str, int],
) -> dict[str, Any]:
    distance: dict[str, int] = {}
    previous: dict[str, str | None] = {}
    for task in sorted(tasks, key=lambda item: item.order_index):
        preds = predecessors[task.task_id]
        if not preds:
            distance[task.task_id] = 1
            previous[task.task_id] = None
            continue
        best_pred = max(
            preds,
            key=lambda predecessor: (
                distance[predecessor],
                -level_by_task[predecessor],
                -int(predecessor.split("_")[1]),
            ),
        )
        distance[task.task_id] = distance[best_pred] + 1
        previous[task.task_id] = best_pred
    sink_task_id = max(
        distance,
        key=lambda task_id: (distance[task_id], level_by_task[task_id], int(task_id.split("_")[1])),
    )
    path: list[str] = []
    cursor: str | None = sink_task_id
    while cursor is not None:
        path.append(cursor)
        cursor = previous[cursor]
    path.reverse()
    task_lookup = {task.task_id: task for task in tasks}
    return {
        "summary": {
            "critical_path_task_count": len(path),
            "critical_path_edge_count": max(len(path) - 1, 0),
            "entry_task_id": path[0],
            "exit_task_id": path[-1],
        },
        "task_ids": path,
        "rows": [
            {
                "order": index + 1,
                "task_id": task_id,
                "slug": task_lookup[task_id].slug,
                "phase": f"phase_{task_lookup[task_id].phase:02d}",
                "protocol_mode": task_lookup[task_id].protocol_mode,
                "block_id": task_lookup[task_id].block_id,
                "level": level_by_task[task_id],
            }
            for index, task_id in enumerate(path)
        ],
    }


def build_eligibility_snapshot(tasks: list[Task]) -> dict[str, Any]:
    first_incomplete = next((task for task in tasks if task.status != "X"), None)
    if first_incomplete is None:
        return {
            "first_incomplete_task_id": None,
            "active_claimed_task_ids": [],
            "claimable_unclaimed_task_ids": [],
            "blocked_boundary_task_id": None,
        }
    if first_incomplete.protocol_mode == "sequential":
        active_claimed = [first_incomplete.task_id] if first_incomplete.status == "-" else []
        claimable_unclaimed = [first_incomplete.task_id] if first_incomplete.status == " " else []
        boundary_index = first_incomplete.order_index + 1
        blocked_boundary = (
            tasks[boundary_index].task_id if boundary_index < len(tasks) else None
        )
        return {
            "first_incomplete_task_id": first_incomplete.task_id,
            "active_claimed_task_ids": active_claimed,
            "claimable_unclaimed_task_ids": claimable_unclaimed,
            "blocked_boundary_task_id": blocked_boundary,
            "active_block_id": first_incomplete.block_id,
        }
    active_block_tasks = [task for task in tasks if task.block_id == first_incomplete.block_id]
    active_claimed = [task.task_id for task in active_block_tasks if task.status == "-"]
    claimable_unclaimed = [task.task_id for task in active_block_tasks if task.status == " "]
    last_task = active_block_tasks[-1]
    boundary_index = last_task.order_index + 1
    blocked_boundary = tasks[boundary_index].task_id if boundary_index < len(tasks) else None
    return {
        "first_incomplete_task_id": first_incomplete.task_id,
        "active_claimed_task_ids": active_claimed,
        "claimable_unclaimed_task_ids": claimable_unclaimed,
        "blocked_boundary_task_id": blocked_boundary,
        "active_block_id": first_incomplete.block_id,
    }


def build_node_rows(
    tasks: list[Task],
    predecessors: dict[str, list[str]],
    soft_edges: dict[str, Edge],
    level_by_task: dict[str, int],
    eligibility: dict[str, Any],
    package_lookup: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    soft_predecessors: dict[str, list[str]] = defaultdict(list)
    for edge in soft_edges.values():
        soft_predecessors[edge.target_task_id].append(edge.source_task_id)
    node_rows: list[dict[str, Any]] = []
    active_claimed = set(eligibility["active_claimed_task_ids"])
    claimable_unclaimed = set(eligibility["claimable_unclaimed_task_ids"])
    task_lookup = {task.task_id: task for task in tasks}
    for task in tasks:
        package_row = package_lookup.get(task.task_id, {})
        unresolved_hard_predecessors = [
            predecessor
            for predecessor in predecessors[task.task_id]
            if task_lookup[predecessor].status != "X"
        ]
        if task.status == "X":
            current_state = "completed"
        elif task.task_id in active_claimed:
            current_state = "active_claimed"
        elif task.task_id in claimable_unclaimed:
            current_state = "claimable_unclaimed"
        else:
            current_state = "blocked_by_hard_dependency"
        node_rows.append(
            {
                "task_id": task.task_id,
                "task_slug": task.slug,
                "status": task.status,
                "checklist_order": task.order_index + 1,
                "checklist_ref": line_ref(CHECKLIST_PATH, task.line_number, task.task_id),
                "phase": f"phase_{task.phase:02d}",
                "protocol_mode": task.protocol_mode,
                "wave_id": task.wave_id,
                "track": task.track,
                "block_id": task.block_id,
                "level": level_by_task[task.task_id],
                "card_path": task.card_path,
                "primary_package_id": package_row.get("primary_package_id"),
                "owner_team_id": package_row.get("owner_team_id"),
                "owner_team_handle": package_row.get("owner_team_handle"),
                "hard_predecessor_task_ids": predecessors[task.task_id],
                "soft_context_predecessor_task_ids": ordered_unique(soft_predecessors[task.task_id]),
                "current_state": current_state,
                "currently_unsatisfied_hard_predecessor_ids": unresolved_hard_predecessors,
            }
        )
    return node_rows


def build_typed_findings() -> list[dict[str, Any]]:
    return [
        {
            "finding_id": "shared_operating_contract_0022_to_0029_missing",
            "type": "SOURCE_GAP",
            "summary": "pc_0029 references shared_operating_contract_0022_to_0029.md, but that shared operating contract file is absent from the repository.",
            "source_citations": [
                card_ref("pc_0029"),
            ],
        },
        {
            "finding_id": "vault_export_precedes_secrets_manager_provisioning",
            "type": "ORDERING_TENSION",
            "summary": "pc_0038 exports HMRC client identifiers and secrets into vault records before pc_0049 provisions the secrets-manager/KMS root. The DAG preserves checklist protocol order and records the storage precondition as ambiguous instead of injecting a backward edge.",
            "source_citations": [
                card_ref("pc_0038"),
                card_ref("pc_0049"),
            ],
        },
    ]


def build_dag_payload(
    tasks: list[Task],
    blocks: list[Block],
    hard_edges: dict[str, Edge],
    soft_edges: dict[str, Edge],
    predecessors: dict[str, list[str]],
    levels_payload: dict[str, Any],
    critical_path: dict[str, Any],
    package_lookup: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    level_by_task = levels_payload["level_by_task"]
    eligibility = build_eligibility_snapshot(tasks)
    node_rows = build_node_rows(
        tasks,
        predecessors,
        soft_edges,
        level_by_task,
        eligibility,
        package_lookup,
    )
    hard_edge_counts = Counter(edge.edge_class for edge in hard_edges.values())
    return {
        "generated_at": TODAY,
        "summary": {
            "task_count": len(tasks),
            "block_count": len(blocks),
            "parallel_block_count": len([block for block in blocks if block.protocol_mode == "parallel"]),
            "hard_edge_count": len(hard_edges),
            "soft_context_edge_count": len(soft_edges),
            "hard_edge_class_counts": dict(sorted(hard_edge_counts.items())),
            "level_count": levels_payload["summary"]["level_count"],
            "max_parallelism": levels_payload["summary"]["max_parallelism"],
            "critical_path_task_count": critical_path["summary"]["critical_path_task_count"],
            "current_first_incomplete_task_id": eligibility["first_incomplete_task_id"],
            "current_active_claimed_task_ids": eligibility["active_claimed_task_ids"],
            "current_claimable_unclaimed_task_ids": eligibility["claimable_unclaimed_task_ids"],
            "current_blocked_boundary_task_id": eligibility["blocked_boundary_task_id"],
        },
        "protocol_blocks": [
            {
                "block_id": block.block_id,
                "protocol_mode": block.protocol_mode,
                "phase": f"phase_{block.phase:02d}",
                "wave_id": block.wave_id,
                "task_ids": list(block.task_ids),
                "task_count": len(block.task_ids),
            }
            for block in blocks
        ],
        "nodes": node_rows,
        "hard_edges": [
            {
                "edge_id": edge.edge_id,
                "source_task_id": edge.source_task_id,
                "target_task_id": edge.target_task_id,
                "edge_class": edge.edge_class,
                "rule_id": edge.rule_id,
            }
            for edge in hard_edges.values()
        ],
        "typed_findings": build_typed_findings(),
    }


def build_levels_payload(
    tasks: list[Task],
    blocks: list[Block],
    levels_payload: dict[str, Any],
) -> dict[str, Any]:
    block_levels = build_block_levels(blocks, levels_payload["level_by_task"])
    return {
        "generated_at": TODAY,
        "summary": {
            "level_count": levels_payload["summary"]["level_count"],
            "max_parallelism": levels_payload["summary"]["max_parallelism"],
            "parallel_block_count": len([block for block in blocks if block.protocol_mode == "parallel"]),
        },
        "levels": levels_payload["levels"],
        "block_levels": block_levels,
    }


def build_edge_payload(
    edges: dict[str, Edge], edge_class_filter: str | None = None
) -> dict[str, Any]:
    filtered_edges = [
        edge
        for edge in edges.values()
        if edge_class_filter is None or edge.edge_class == edge_class_filter
    ]
    counts = Counter(edge.edge_class for edge in filtered_edges)
    return {
        "generated_at": TODAY,
        "summary": {
            "edge_count": len(filtered_edges),
            "edge_class_counts": dict(sorted(counts.items())),
        },
        "rows": [
            {
                "edge_id": edge.edge_id,
                "source_task_id": edge.source_task_id,
                "target_task_id": edge.target_task_id,
                "edge_class": edge.edge_class,
                "rule_id": edge.rule_id,
                "rationale": edge.rationale,
                "source_citations": list(edge.source_citations),
            }
            for edge in filtered_edges
        ],
    }


def build_mermaid(tasks: list[Task], blocks: list[Block]) -> str:
    block_lookup = {block.block_id: block for block in blocks}
    lines = [
        "flowchart TD",
        '  phase00["Phase 00 sequential planning\\npc_0001..pc_0030"]',
        '  phase01["Phase 01 sequential provisioning\\npc_0031..pc_0058"]',
        '  phase02["Phase 02 sequential foundations\\npc_0059..pc_0084"]',
        '  wave03["Phase 03 parallel wave 01\\n84 tasks\\npc_0085..pc_0168"]',
        '  wave04["Phase 04 parallel wave 02\\n60 tasks\\npc_0169..pc_0228"]',
        '  wave05["Phase 05 parallel wave 03\\n72 tasks\\npc_0229..pc_0300"]',
        '  wave06["Phase 06 parallel wave 04\\n91 tasks\\npc_0301..pc_0391"]',
        '  phase07["Phase 07 sequential integration and release\\npc_0392..pc_0428"]',
        '  webShared["Wave 03 shared web gates\\npc_0229, pc_0230..pc_0233"]',
        '  nativeScaffold["Wave 03 native scaffold\\npc_0289"]',
        '  packageMap["pc_0028 package map"]',
        '  dagPlan["pc_0029 execution DAG"]',
        '  dodPlan["pc_0030 DoD and wave plan"]',
        '  modelGen["pc_0061 generated models"]',
        '  releaseAdr["pc_0027 release ADR"]',
        "",
        "  phase00 --> phase01 --> phase02 --> wave03 --> wave04 --> wave05 --> wave06 --> phase07",
        "  packageMap -.policy.-> phase02",
        "  packageMap -.policy.-> wave03",
        "  packageMap -.policy.-> wave04",
        "  packageMap -.policy.-> wave05",
        "  packageMap -.policy.-> wave06",
        "  dagPlan -.artifact.-> dodPlan",
        "  dodPlan -.policy.-> wave03",
        "  dodPlan -.policy.-> wave04",
        "  dodPlan -.policy.-> wave05",
        "  dodPlan -.policy.-> wave06",
        "  modelGen -.artifact.-> wave03",
        "  modelGen -.artifact.-> wave04",
        "  modelGen -.artifact.-> wave05",
        "  modelGen -.artifact.-> wave06",
        "  releaseAdr -.policy.-> wave04",
        "  releaseAdr -.policy.-> wave06",
        "  releaseAdr -.policy.-> phase07",
        "  wave05 --> webShared",
        "  wave05 --> nativeScaffold",
    ]
    if "phase_05_parallel_wave_03" not in block_lookup:
        raise ValueError("Expected phase_05_parallel_wave_03 block to exist")
    return "\n".join(lines) + "\n"


def build_doc(
    tasks: list[Task],
    blocks: list[Block],
    dag_payload: dict[str, Any],
    levels_output: dict[str, Any],
    hard_edges: dict[str, Edge],
    soft_edges: dict[str, Edge],
    critical_path: dict[str, Any],
) -> str:
    edge_class_rows = [
        [edge_class, count]
        for edge_class, count in sorted(
            dag_payload["summary"]["hard_edge_class_counts"].items()
        )
    ]
    rule_counts = Counter(edge.rule_id for edge in hard_edges.values())
    top_rule_rows = [
        [rule_id, count]
        for rule_id, count in sorted(
            rule_counts.items(), key=lambda item: (-item[1], item[0])
        )[:12]
    ]
    wave_rows = [
        [
            row["block_id"],
            row["protocol_mode"],
            row["task_count"],
            row["min_level"],
            row["max_level"],
        ]
        for row in levels_output["block_levels"]
        if row["protocol_mode"] == "parallel"
    ]
    critical_preview_rows = [
        [row["order"], row["task_id"], row["phase"], row["level"]]
        for row in (
            critical_path["rows"][:12]
            + ([{"order": "...", "task_id": "...", "phase": "...", "level": "..."}] if len(critical_path["rows"]) > 20 else [])
            + critical_path["rows"][-8:]
        )
    ]
    finding_rows = [
        [finding["finding_id"], finding["type"], finding["summary"]]
        for finding in dag_payload["typed_findings"]
    ]
    eligibility = dag_payload["summary"]
    return f"""# Agent Execution DAG

- Status: Accepted
- Date: {TODAY}

## Context

Taxat's roadmap contains `{len(tasks)}` tasks, but AGENT protocol claimability is defined by checklist order, sequential gates, and parallel-wave boundaries rather than by a ready-made machine DAG. This build closes that gap by separating protocol-hard execution edges from additional artifact, policy, resource, and concurrency edges, then recording softer same-track context separately.

The result is a deterministic executable graph over `{len(tasks)}` tasks and `{len(blocks)}` protocol blocks, including `{len([block for block in blocks if block.protocol_mode == "parallel"])}` parallel wave blocks. The hard-edge graph stays acyclic, produces `{dag_payload["summary"]["level_count"]}` topological levels, and yields a critical path of `{critical_path["summary"]["critical_path_task_count"]}` tasks.

## Current Eligibility Snapshot

- first incomplete task: `{eligibility["current_first_incomplete_task_id"]}`
- active claimed tasks: `{eligibility["current_active_claimed_task_ids"]}`
- claimable unclaimed tasks: `{eligibility["current_claimable_unclaimed_task_ids"]}`
- next blocked boundary: `{eligibility["current_blocked_boundary_task_id"]}`

Under the current checklist state, `pc_0029` is the active sequential gate, so no later task is claimable until it is completed.

## Hard Edge Classes

{markdown_table(["Edge Class", "Count"], edge_class_rows)}

The executable DAG contains `{dag_payload["summary"]["hard_edge_count"]}` hard edges. Soft context remains separate at `{dag_payload["summary"]["soft_context_edge_count"]}` edges and is never promoted into claimability without stronger evidence.

## Major Hard Rules

{markdown_table(["Rule", "Edge Count"], top_rule_rows)}

These counts show where claimability is driven by protocol block boundaries versus broad planning or scaffold prerequisites such as the package map, generated models, DoD wave planning, and wave-03 shared frontend or native scaffolds.

## Parallel Wave Levels

{markdown_table(["Block", "Mode", "Tasks", "Min Level", "Max Level"], wave_rows)}

Phase 03 and Phase 04 stay single-level parallel blocks under the current hard rules. Phase 05 spans multiple levels because shared web foundations (`pc_0229` through `pc_0233`) and the native scaffold (`pc_0289`) intentionally serialize part of the otherwise parallel wave.

## Critical Path

{markdown_table(["Order", "Task", "Phase", "Level"], critical_preview_rows)}

The full critical path is recorded in [agent_execution_critical_path.json](/Users/test/Code/taxat_/data/analysis/agent_execution_critical_path.json). The protocol skeleton dominates the early path, while the shared wave-03 browser and native scaffolds lengthen the middle of the path beyond a pure phase-by-phase chain.

## Typed Findings

{markdown_table(["Finding", "Type", "Summary"], finding_rows)}

## Generated Outputs

- DAG: [agent_execution_dag.json](/Users/test/Code/taxat_/data/analysis/agent_execution_dag.json)
- Levels: [agent_execution_levels.json](/Users/test/Code/taxat_/data/analysis/agent_execution_levels.json)
- Hard-edge rationales: [agent_execution_edge_rationales.json](/Users/test/Code/taxat_/data/analysis/agent_execution_edge_rationales.json)
- Soft-context edges: [agent_execution_soft_context_edges.json](/Users/test/Code/taxat_/data/analysis/agent_execution_soft_context_edges.json)
- Critical path: [agent_execution_critical_path.json](/Users/test/Code/taxat_/data/analysis/agent_execution_critical_path.json)
- Diagram: [agent_execution_dag.mmd](/Users/test/Code/taxat_/diagrams/analysis/agent_execution_dag.mmd)
"""


def main() -> None:
    tasks = parse_tasks()
    blocks = build_blocks(tasks)
    hard_edges = build_hard_edges(tasks, blocks)
    soft_edges = build_soft_context_edges(tasks, hard_edges)
    successors, predecessors = build_unique_hard_graph(tasks, hard_edges)
    assert_acyclic(tasks, predecessors, successors)
    levels_payload = build_levels(tasks, predecessors)
    critical_path = build_critical_path(tasks, predecessors, levels_payload["level_by_task"])
    package_lookup = build_task_package_lookup()
    dag_payload = build_dag_payload(
        tasks,
        blocks,
        hard_edges,
        soft_edges,
        predecessors,
        levels_payload,
        critical_path,
        package_lookup,
    )
    levels_output = build_levels_payload(tasks, blocks, levels_payload)
    hard_edge_output = build_edge_payload(hard_edges)
    soft_edge_output = build_edge_payload(soft_edges, edge_class_filter="SOFT_CONTEXT")
    mermaid = build_mermaid(tasks, blocks)
    doc = build_doc(
        tasks,
        blocks,
        dag_payload,
        levels_output,
        hard_edges,
        soft_edges,
        critical_path,
    )

    text_write(DOC_PATH, doc)
    json_write(DAG_PATH, dag_payload)
    json_write(LEVELS_PATH, levels_output)
    json_write(EDGE_RATIONALES_PATH, hard_edge_output)
    json_write(SOFT_CONTEXT_PATH, soft_edge_output)
    json_write(CRITICAL_PATH_PATH, {"generated_at": TODAY, **critical_path})
    text_write(MERMAID_PATH, mermaid)


if __name__ == "__main__":
    main()
