#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[2]
ALGORITHM_DIR = ROOT / "Algorithm"
PROMPT_DIR = ROOT / "PROMPT"
CARDS_DIR = PROMPT_DIR / "CARDS"
DATA_ANALYSIS_DIR = ROOT / "data" / "analysis"
DOCS_ANALYSIS_DIR = ROOT / "docs" / "analysis"
DIAGRAMS_ANALYSIS_DIR = ROOT / "diagrams" / "analysis"
PROTOTYPE_DIR = ROOT / "prototypes" / "analysis" / "acceptance-atlas"

CHECKLIST_PATH = PROMPT_DIR / "Checklist.md"
AGENT_PATH = PROMPT_DIR / "AGENT.md"

README_PATH = ALGORITHM_DIR / "README.md"
IMPLEMENTATION_CONVENTIONS_PATH = ALGORITHM_DIR / "implementation_conventions.md"
TEST_VECTORS_PATH = ALGORITHM_DIR / "test_vectors.md"
CONSTRAINT_REGISTER_PATH = ALGORITHM_DIR / "constraint_traceability_register.json"
RELEASE_GATES_PATH = ALGORITHM_DIR / "verification_and_release_gates.md"

DAG_PATH = DATA_ANALYSIS_DIR / "agent_execution_dag.json"
PACKAGE_MAP_PATH = DATA_ANALYSIS_DIR / "later_task_to_package_map.json"
TEST_FAMILY_MATRIX_PATH = DATA_ANALYSIS_DIR / "test_family_to_constraint_matrix.json"
RELEASE_ARTIFACT_MATRIX_PATH = DATA_ANALYSIS_DIR / "release_evidence_artifact_matrix.json"

DOC_MAIN_PATH = DOCS_ANALYSIS_DIR / "30_definition_of_done_acceptance_map_and_wave_plan.md"
DOC_GUIDE_PATH = DOCS_ANALYSIS_DIR / "30_acceptance_evidence_assembly_guide.md"
MATRIX_PATH = DATA_ANALYSIS_DIR / "task_definition_of_done_matrix.json"
BLUEPRINT_MAP_PATH = DATA_ANALYSIS_DIR / "task_to_blueprint_coverage_map.json"
TEST_VECTOR_MAP_PATH = DATA_ANALYSIS_DIR / "task_to_test_vector_map.json"
VALIDATOR_GATE_MAP_PATH = DATA_ANALYSIS_DIR / "task_to_validator_and_gate_map.json"
PHASE_EXIT_PATH = DATA_ANALYSIS_DIR / "phase_and_wave_exit_criteria.json"
WAVE_PLAN_PATH = DATA_ANALYSIS_DIR / "parallel_wave_execution_plan.json"
BUNDLE_INVENTORY_PATH = DATA_ANALYSIS_DIR / "acceptance_evidence_bundle_inventory.json"
MERMAID_PATH = DIAGRAMS_ANALYSIS_DIR / "30_definition_of_done_wave_plan.mmd"
ATLAS_DATA_PATH = PROTOTYPE_DIR / "atlas_data.json"

TODAY = "2026-04-18"
CONTRACT_VERSION = "1.0"

TASK_RE = re.compile(r"- \[([ X-])\] `(pc_\d+)` ([^ ]+) ")
PARALLEL_RE = re.compile(
    r"phase_(\d{2})_parallel_wave_(\d{2})_track_(.+?)_(\d{3})_(.+)"
)
SEQUENTIAL_RE = re.compile(r"phase_(\d{2})_seq_(\d{3})_(.+)")
HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
SHARED_CONTRACT_RE = re.compile(r"\.\./(shared_operating_contract_[^)\]]+\.md)")
TV_RANGE_RE = re.compile(r"tv_(\d{2}[a-z]?)_through_tv_(\d{2}[a-z]?)")
TV_SERIES_RE = re.compile(r"tv_(\d{2}[a-z]?)_series")
TV_VARIANTS_RE = re.compile(r"tv_(\d{2}[a-z]?)_and_related_variants")
TV_SINGLE_RE = re.compile(r"tv_(\d{2}[a-z]?)")

PHASE_LABELS = {
    "phase_00": "Corpus Law And Acceptance Doctrine",
    "phase_01": "Environment, Authority, And Provisioning",
    "phase_02": "Monorepo And Platform Foundations",
    "phase_03": "Backend And Shared Surface Construction",
    "phase_04": "Workflow, Governance, Portal, And Recovery Construction",
    "phase_05": "Frontend Experience Construction",
    "phase_06": "Verification, Regression, And Release Evidence",
    "phase_07": "Integration, Rollout, And Steady-State Operations",
}

TRACK_BLUEPRINT_GROUPS = {
    "backend_access": ["collaboration", "governance", "operator"],
    "backend_manifest": ["execution_core"],
    "backend_collection": ["portal", "collaboration", "execution_core"],
    "backend_compute": ["execution_core"],
    "backend_authority": ["execution_core", "collaboration", "governance", "operator"],
    "backend_workflow": ["collaboration", "governance", "operator", "execution_core"],
    "backend_northbound": ["portal", "collaboration", "governance", "operator", "execution_core"],
    "backend_low_noise": ["operator"],
    "backend_portal": ["portal"],
    "backend_governance": ["governance"],
    "backend_recovery": ["execution_core"],
    "backend_retention_security_observability": ["execution_core", "system_pass_chain"],
    "backend_release_resilience": ["execution_core", "system_pass_chain"],
    "frontend_shared": ["portal", "collaboration", "governance", "operator"],
    "frontend_portal": ["portal"],
    "frontend_low_noise": ["operator"],
    "frontend_collaboration": ["collaboration"],
    "frontend_governance": ["governance"],
    "frontend_native": ["operator"],
    "testing_schema_contract": ["execution_core", "system_pass_chain"],
    "testing_engine_modules": ["execution_core"],
    "testing_state_machine_model": ["execution_core"],
    "testing_api_northbound": ["portal", "collaboration", "governance", "operator", "execution_core"],
    "testing_authority_integration": ["execution_core", "collaboration", "governance", "operator"],
    "testing_frontend_regression": ["portal", "collaboration", "governance", "operator"],
    "testing_performance_failure_security": ["execution_core", "system_pass_chain"],
    "testing_release_acceptance": [
        "portal",
        "collaboration",
        "governance",
        "operator",
        "execution_core",
        "system_pass_chain",
    ],
}

GATE_TO_SUITE_FAMILIES = {
    "SCHEMA_COMPATIBILITY": ["schema_contract_validation"],
    "DETERMINISTIC_AND_STATE_MACHINE": [
        "deterministic_formula_and_module",
        "state_machine_and_model_based",
    ],
    "NORTHBOUND_API": ["northbound_api_and_operator_contracts"],
    "AUTHORITY_SANDBOX": ["authority_sandbox_and_controlled_edge"],
    "OPERATOR_CLIENT": ["browser_surface_acceptance", "native_surface_automation"],
    "SECURITY": ["security_verification"],
    "PERFORMANCE_CANARY": ["performance_canary_and_failure_mode"],
    "RESTORE_DRILL": ["replay_recovery_and_restore"],
    "MIGRATION_VERIFICATION": [
        "schema_contract_validation",
        "replay_recovery_and_restore",
    ],
}

GATE_DEFINITIONS = [
    {
        "gate_id": "SCHEMA_COMPATIBILITY",
        "label": "Schema compatibility",
        "line_substring": "1. schema compatibility green",
        "description": "Bundle compatibility, reader windows, and migration chronology stay candidate-bound.",
    },
    {
        "gate_id": "DETERMINISTIC_AND_STATE_MACHINE",
        "label": "Deterministic and state-machine",
        "line_substring": "2. deterministic/module/state-machine suites green",
        "description": "Deterministic helpers, formulas, and lifecycle transitions remain replay-safe.",
    },
    {
        "gate_id": "NORTHBOUND_API",
        "label": "Northbound API",
        "line_substring": "3. northbound API stale-view/idempotency suites green",
        "description": "Receipts, stale-view rejection, stream replay, and API contract behavior stay stable.",
    },
    {
        "gate_id": "AUTHORITY_SANDBOX",
        "label": "Authority sandbox",
        "line_substring": "4. authority sandbox suites green for enabled profiles",
        "description": "Enabled provider profiles and controlled-edge cases are proven against sandbox truth.",
    },
    {
        "gate_id": "OPERATOR_CLIENT",
        "label": "Operator client",
        "line_substring": "5. Playwright and/or XCUITest production-profile suites green for every shipped operator client",
        "description": "Shipped browser and native clients preserve shell continuity, focus, and compatibility posture.",
    },
    {
        "gate_id": "SECURITY",
        "label": "Security",
        "line_substring": "6. security suite green with no unresolved critical findings",
        "description": "Security, session, masking, and provenance controls are verified without critical unresolved gaps.",
    },
    {
        "gate_id": "PERFORMANCE_CANARY",
        "label": "Performance and canary",
        "line_substring": "7. performance/canary baseline within SLO and error-budget limits",
        "description": "Load, queue, stream, and failure-mode evidence remain inside governed operational envelopes.",
    },
    {
        "gate_id": "RESTORE_DRILL",
        "label": "Restore drill",
        "line_substring": "8. latest restore drill within the allowed recency window and successful",
        "description": "Recovery checkpoints and restore evidence preserve privacy, audit, and authority closure.",
    },
    {
        "gate_id": "MIGRATION_VERIFICATION",
        "label": "Migration verification",
        "line_substring": "9. migration verification green for any datastore/schema changes in the release",
        "description": "Expand, backfill, verify, and contract chronology stays compatible with reader windows.",
    },
    {
        "gate_id": "ARTIFACT_INTEGRITY_AND_NOTARIZATION",
        "label": "Artifact integrity and notarization",
        "line_substring": "10. release artifact signature, digest, SBOM, provenance attestation, and macOS notarization",
        "description": "Build digests, provenance, signatures, and notarization remain candidate-bound.",
    },
    {
        "gate_id": "SUITE_ADMISSIBILITY",
        "label": "Suite admissibility",
        "line_substring": "11. suite admissibility checks green for every blocking result used in the promotion decision",
        "description": "Every blocking suite result is same-candidate, same-scope, unwaived, and unquarantined.",
    },
]


@dataclass(frozen=True)
class Task:
    task_id: str
    task_slug: str
    status: str
    checklist_order: int
    checklist_line: int
    phase: str
    protocol_mode: str
    wave_id: str | None
    track: str | None
    block_id: str
    card_path: Path


def repo_rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def json_write(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")


def text_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)


def ordered_unique(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        if not value or value in seen:
            continue
        seen.add(value)
        ordered.append(value)
    return ordered


def md_escape(value: Any) -> str:
    if isinstance(value, list):
        value = ", ".join(str(item) for item in value)
    if isinstance(value, dict):
        value = json.dumps(value, sort_keys=True)
    return str(value).replace("|", "\\|").replace("\n", " ").strip()


def markdown_table(headers: list[str], rows: list[list[Any]]) -> str:
    head = "| " + " | ".join(headers) + " |"
    div = "| " + " | ".join("---" for _ in headers) + " |"
    body = [
        "| " + " | ".join(md_escape(cell) for cell in row) + " |" for row in rows
    ]
    return "\n".join([head, div, *body])


def line_ref(path: Path, line_number: int, label: str) -> str:
    safe_label = re.sub(r"[^A-Za-z0-9_.-]+", "_", label).strip("_") or "line"
    return f"{repo_rel(path)}::L{line_number}[{safe_label}]"


def find_heading_line(path: Path, heading_text: str) -> int:
    needle = re.sub(r"^#+\s*", "", heading_text).strip()
    for line_number, line in enumerate(path.read_text().splitlines(), 1):
        match = HEADING_RE.match(line)
        if match and match.group(2).strip() == needle:
            return line_number
    raise ValueError(f"Heading `{heading_text}` not found in {path}")


def heading_ref(path: Path, heading_text: str, label: str | None = None) -> str:
    return line_ref(path, find_heading_line(path, heading_text), label or heading_text)


def find_line_contains(path: Path, substring: str) -> int:
    for line_number, line in enumerate(path.read_text().splitlines(), 1):
        if substring in line:
            return line_number
    raise ValueError(f"Substring `{substring}` not found in {path}")


def contains_ref(path: Path, substring: str, label: str) -> str:
    return line_ref(path, find_line_contains(path, substring), label)


def parse_tasks() -> list[Task]:
    tasks: list[Task] = []
    for line_number, line in enumerate(CHECKLIST_PATH.read_text().splitlines(), 1):
        match = TASK_RE.search(line)
        if not match:
            continue
        status, task_id, slug = match.groups()
        sequential = SEQUENTIAL_RE.match(slug)
        parallel = PARALLEL_RE.match(slug)
        if sequential:
            phase = f"phase_{sequential.group(1)}"
            protocol_mode = "sequential"
            wave_id = None
            track = None
            block_id = task_id
        elif parallel:
            phase = f"phase_{parallel.group(1)}"
            wave_id = f"phase_{parallel.group(1)}_parallel_wave_{parallel.group(2)}"
            protocol_mode = "parallel"
            track = parallel.group(3)
            block_id = wave_id
        else:
            raise ValueError(f"Unable to parse checklist slug `{slug}`")
        tasks.append(
            Task(
                task_id=task_id,
                task_slug=slug,
                status=status,
                checklist_order=len(tasks),
                checklist_line=line_number,
                phase=phase,
                protocol_mode=protocol_mode,
                wave_id=wave_id,
                track=track,
                block_id=block_id,
                card_path=CARDS_DIR / f"{task_id}.md",
            )
        )
    if len(tasks) != 428:
        raise ValueError(f"Expected 428 tasks, found {len(tasks)}")
    return tasks


def compute_protocol_snapshot(tasks: list[Task]) -> dict[str, Any]:
    first_incomplete: Task | None = next((task for task in tasks if task.status != "X"), None)
    active_claimed = [task.task_id for task in tasks if task.status == "-"]
    if first_incomplete is None:
        return {
            "first_incomplete_task_id": None,
            "claimable_task_ids": [],
            "blocked_boundary_task_id": None,
            "active_claimed_task_ids": active_claimed,
        }
    if first_incomplete.protocol_mode == "sequential":
        blocked_boundary = next(
            (
                task.task_id
                for task in tasks[first_incomplete.checklist_order + 1 :]
                if task.status != "X"
            ),
            None,
        )
        return {
            "first_incomplete_task_id": first_incomplete.task_id,
            "claimable_task_ids": [first_incomplete.task_id],
            "blocked_boundary_task_id": blocked_boundary,
            "active_claimed_task_ids": active_claimed,
        }
    claimable: list[str] = []
    blocked_boundary: str | None = None
    for task in tasks[first_incomplete.checklist_order :]:
        if task.block_id != first_incomplete.block_id:
            if task.status != "X":
                blocked_boundary = task.task_id
            break
        if task.status != "X":
            claimable.append(task.task_id)
    return {
        "first_incomplete_task_id": first_incomplete.task_id,
        "claimable_task_ids": claimable,
        "blocked_boundary_task_id": blocked_boundary,
        "active_claimed_task_ids": active_claimed,
    }


def expand_blueprint_range(spec: str) -> list[str]:
    parts = [part.strip() for part in spec.split(",") if part.strip()]
    refs: list[str] = []
    for part in parts:
        if ".." not in part:
            refs.append(part)
            continue
        left, right = part.split("..", 1)
        prefix = left.split("-")[0]
        start = int(left.split("-")[1])
        end = int(right.split("-")[1])
        refs.extend(f"{prefix}-{number:02d}" for number in range(start, end + 1))
    return refs


def normalize_tv_token(token: str) -> str:
    match = re.fullmatch(r"(\d{2})([a-z]?)", token)
    if not match:
        return f"TV-{token.upper()}"
    number, suffix = match.groups()
    return f"TV-{number}{suffix.upper()}"


def parse_explicit_test_vector_refs(slug: str) -> list[str]:
    refs: list[str] = []
    consumed: list[tuple[int, int]] = []
    for match in TV_RANGE_RE.finditer(slug):
        refs.append(
            f"{normalize_tv_token(match.group(1))}..{normalize_tv_token(match.group(2))}"
        )
        consumed.append(match.span())
    for match in TV_SERIES_RE.finditer(slug):
        refs.append(f"{normalize_tv_token(match.group(1))}_SERIES")
        consumed.append(match.span())
    for match in TV_VARIANTS_RE.finditer(slug):
        refs.append(f"{normalize_tv_token(match.group(1))}_RELATED_VARIANTS")
        consumed.append(match.span())

    def covered(index: int) -> bool:
        return any(start <= index < end for start, end in consumed)

    for match in TV_SINGLE_RE.finditer(slug):
        if covered(match.start()):
            continue
        refs.append(normalize_tv_token(match.group(1)))
    return ordered_unique(refs)


def humanize_slug(task: Task) -> str:
    slug = task.task_slug
    if task.protocol_mode == "sequential":
        slug = re.sub(r"^phase_\d{2}_seq_\d{3}_", "", slug)
    else:
        slug = re.sub(
            r"^phase_\d{2}_parallel_wave_\d{2}_track_[^_]+(?:_[^_]+)*_\d{3}_", "", slug
        )
    return slug.replace("_", " ").strip()


def build_blueprint_groups() -> dict[str, dict[str, Any]]:
    return {
        "system_pass_chain": {
            "label": "System-pass chain",
            "refs": ["SYS-00", "SYS-01", "SYS-02", "SYS-03", "SYS-04"],
            "test_vector_refs": [],
            "source_refs": [
                contains_ref(
                    README_PATH,
                    "System-pass coverage:",
                    "system_pass_coverage_chain",
                ),
                heading_ref(
                    IMPLEMENTATION_CONVENTIONS_PATH,
                    "## 1. Corpus authoring conventions",
                    "corpus_authoring_conventions",
                ),
            ],
        },
        "portal": {
            "label": "Client portal",
            "refs": expand_blueprint_range(
                "FE-01..FE-10, FE-30, FE-33, BE-01..BE-05, BE-21, BE-23, BE-25, SYS-01, SYS-04"
            ),
            "test_vector_refs": ["TV-26..TV-31", "TV-34", "TV-36"],
            "source_refs": [
                contains_ref(
                    README_PATH,
                    "Client portal shell, navigation, uploads, approvals, onboarding, and contextual recovery",
                    "portal_blueprint_family",
                ),
                contains_ref(
                    TEST_VECTORS_PATH,
                    "`TV-26..TV-31` are primarily closed by",
                    "portal_prompt_stage_ownership",
                ),
            ],
        },
        "collaboration": {
            "label": "Collaboration",
            "refs": expand_blueprint_range(
                "FE-22..FE-24, FE-32, FE-33, BE-05, BE-11, BE-17, BE-21, BE-23, BE-25, SYS-01, SYS-04"
            ),
            "test_vector_refs": ["TV-32..TV-39A"],
            "source_refs": [
                contains_ref(
                    README_PATH,
                    "Collaboration, work inbox, customer request list, and customer-safe workspace behavior",
                    "collaboration_blueprint_family",
                ),
                contains_ref(
                    TEST_VECTORS_PATH,
                    "`TV-32..TV-39A` are primarily closed by",
                    "collaboration_prompt_stage_ownership",
                ),
            ],
        },
        "governance": {
            "label": "Governance",
            "refs": expand_blueprint_range(
                "FE-11..FE-18, FE-31, FE-33, BE-01, BE-05, BE-15, BE-17, BE-19, BE-20, BE-21, BE-23, BE-24, BE-25, SYS-01, SYS-04"
            ),
            "test_vector_refs": ["TV-37..TV-39A"],
            "source_refs": [
                contains_ref(
                    README_PATH,
                    "Governance routes and governance interaction continuity",
                    "governance_blueprint_family",
                ),
                contains_ref(
                    TEST_VECTORS_PATH,
                    "`TV-32..TV-39A` are primarily closed by",
                    "governance_prompt_stage_ownership",
                ),
            ],
        },
        "operator": {
            "label": "Staff and operator",
            "refs": expand_blueprint_range(
                "FE-19..FE-29, FE-32, FE-33, BE-03, BE-05, BE-09, BE-10, BE-11, BE-14, BE-17, BE-18, BE-19, BE-22, BE-23, BE-24, BE-25, SYS-01, SYS-04"
            ),
            "test_vector_refs": ["TV-13..TV-25", "TV-33", "TV-35"],
            "source_refs": [
                contains_ref(
                    README_PATH,
                    "Staff/operator calm-shell, native windows, live updates, and investigation modules",
                    "operator_blueprint_family",
                ),
                contains_ref(
                    TEST_VECTORS_PATH,
                    "`TV-13..TV-25` are primarily closed by",
                    "operator_prompt_stage_ownership",
                ),
            ],
        },
        "execution_core": {
            "label": "Execution core, replay, release, and recovery",
            "refs": expand_blueprint_range(
                "BE-06..BE-20, BE-22..BE-25, BE-48, BE-49, FE-25, FE-26, FE-29, FE-32, SYS-01, SYS-02, SYS-04"
            ),
            "test_vector_refs": [
                "TV-40..TV-70",
                "TV-71..TV-78",
                "TV-79..TV-79D",
                "TV-80..TV-80C",
                "TV-81..TV-81D",
            ],
            "source_refs": [
                contains_ref(
                    README_PATH,
                    "Execution-core, replay, twin-view, proof, nightly, amendment, trust, authority workflow closure",
                    "execution_core_blueprint_family",
                ),
                contains_ref(
                    TEST_VECTORS_PATH,
                    "`TV-40..TV-70` are primarily closed by",
                    "execution_core_prompt_stage_ownership",
                ),
            ],
        },
    }


def infer_blueprint_group_ids(task: Task) -> list[str]:
    if task.track and task.track in TRACK_BLUEPRINT_GROUPS:
        return TRACK_BLUEPRINT_GROUPS[task.track]

    slug = task.task_slug
    groups: list[str] = []

    if task.phase == "phase_00":
        if task.task_id in {"pc_0001", "pc_0002", "pc_0003", "pc_0004", "pc_0019", "pc_0028", "pc_0029", "pc_0030"}:
            groups.append("system_pass_chain")
        if any(token in slug for token in ["frontend", "surface", "route", "shell", "web_frontend"]):
            groups.extend(["portal", "collaboration", "governance", "operator"])
        if "native" in slug:
            groups.append("operator")
        if any(token in slug for token in ["authority", "run_engine", "gate", "formula", "replay", "release", "retention", "security", "observability", "state_machine", "module", "entity", "dependency", "projection"]):
            groups.append("execution_core")
        if "portal" in slug:
            groups.append("portal")
        if "collaboration" in slug:
            groups.append("collaboration")
        if "governance" in slug:
            groups.append("governance")
        if "macos" in slug:
            groups.append("operator")
    elif task.phase == "phase_01":
        if any(token in slug for token in ["hmrc", "authority", "fraud_prevention", "provider_profile"]):
            groups.append("execution_core")
        if any(token in slug for token in ["oidc", "identity", "roles_scopes", "mfa", "session"]):
            groups.extend(["portal", "collaboration", "governance", "operator"])
        if any(token in slug for token in ["email", "push", "notification", "helpdesk"]):
            groups.extend(["portal", "collaboration", "governance", "operator"])
        if any(token in slug for token in ["ocr", "document_extraction", "malware", "upload"]):
            groups.extend(["portal", "collaboration", "execution_core"])
        if any(token in slug for token in ["secrets_manager", "postgresql", "object_storage", "queue", "cache", "telemetry", "container_registry", "dns", "ci_cd", "credential", "environment"]):
            groups.extend(["execution_core", "system_pass_chain"])
        if "smoke_validation" in slug:
            groups.extend(
                ["portal", "collaboration", "governance", "operator", "execution_core"]
            )
    elif task.phase == "phase_02":
        groups.extend(["execution_core", "system_pass_chain"])
        if any(token in slug for token in ["northbound", "upload", "streaming", "cache", "access_control"]):
            groups.extend(["portal", "collaboration", "governance", "operator"])
    elif task.phase == "phase_07":
        if any(token in slug for token in ["web_frontends", "client_portal", "onboarding_copy", "help_content"]):
            groups.extend(["portal", "collaboration", "governance", "operator"])
        if "native_macos" in slug or "native_distribution" in slug:
            groups.append("operator")
        if any(token in slug for token in ["notification", "email", "push", "helpdesk"]):
            groups.extend(["portal", "collaboration", "governance", "operator"])
        if any(token in slug for token in ["ocr", "malware", "quarantine"]):
            groups.extend(["portal", "collaboration", "execution_core"])
        if any(token in slug for token in ["release_candidate", "rollout", "migrations", "restore", "disaster_recovery", "security", "retention", "observability", "queue_rebuild", "reader_windows", "pilot", "launch"]):
            groups.extend(
                ["portal", "collaboration", "governance", "operator", "execution_core", "system_pass_chain"]
            )
        if any(token in slug for token in ["config", "secrets", "schema", "projection", "build_pipeline", "compatibility_matrix"]):
            groups.extend(["execution_core", "system_pass_chain"])

    if not groups:
        groups.append("system_pass_chain")
    return ordered_unique(groups)


def infer_primary_deliverable_class(task: Task) -> str:
    slug = task.task_slug
    if "author_architecture_decision_record" in slug or slug.startswith("phase_00_seq_02"):
        return "architecture_decision_record"
    if "acceptance_map" in slug or "definition_of_done" in slug:
        return "acceptance_map"
    if "browser_automation" in slug:
        return "browser_automation_evidence"
    if "provision_" in slug:
        return "infrastructure_provisioning"
    if task.phase == "phase_00":
        return "analysis_pack"
    if task.phase == "phase_01":
        return "environment_and_provisioning_evidence"
    if task.phase == "phase_02":
        return "platform_foundation"
    if task.phase in {"phase_03", "phase_04", "phase_05"}:
        return "feature_implementation"
    if task.phase == "phase_06":
        return "verification_suite"
    return "integration_and_launch_readiness"


def infer_release_gate_refs(task: Task) -> list[str]:
    slug = task.task_slug
    gates: list[str] = []
    full_release_gate_stack = [
        "SCHEMA_COMPATIBILITY",
        "DETERMINISTIC_AND_STATE_MACHINE",
        "NORTHBOUND_API",
        "AUTHORITY_SANDBOX",
        "OPERATOR_CLIENT",
        "SECURITY",
        "PERFORMANCE_CANARY",
        "RESTORE_DRILL",
        "MIGRATION_VERIFICATION",
        "ARTIFACT_INTEGRITY_AND_NOTARIZATION",
        "SUITE_ADMISSIBILITY",
    ]
    if any(token in slug for token in ["schema", "contract", "reader_window", "compatibility", "migration"]):
        gates.extend(["SCHEMA_COMPATIBILITY", "MIGRATION_VERIFICATION"])
    if any(token in slug for token in ["deterministic", "formula", "compute", "parity", "trust", "state_machine", "module", "run_engine", "gate_logic"]):
        gates.append("DETERMINISTIC_AND_STATE_MACHINE")
    if any(token in slug for token in ["northbound", "api", "receipt", "snapshot", "stream", "session", "focus_restoration", "selector", "shell", "frontend", "web_frontends"]):
        gates.extend(["NORTHBOUND_API", "OPERATOR_CLIENT"])
    if any(token in slug for token in ["authority", "hmrc", "fraud_prevention", "provider_profile", "reconciliation"]):
        gates.append("AUTHORITY_SANDBOX")
    if any(token in slug for token in ["security", "secret", "step_up", "csrf", "waf", "scope_widening", "redaction"]):
        gates.append("SECURITY")
    if any(token in slug for token in ["performance", "canary", "load_test", "soak", "chaos", "queue_backlog", "burst", "failover", "failback"]):
        gates.append("PERFORMANCE_CANARY")
    if any(token in slug for token in ["restore", "recovery", "checkpoint", "drill", "rebuild", "disaster_recovery"]):
        gates.append("RESTORE_DRILL")
    if any(token in slug for token in ["release_candidate", "release_verification_manifest", "promotion", "signoff", "admissibility", "definition_of_done"]):
        gates.append("SUITE_ADMISSIBILITY")
    if any(token in slug for token in ["signed", "notarized", "distribution_artifacts", "artifact_attestation", "build_pipeline"]):
        gates.append("ARTIFACT_INTEGRITY_AND_NOTARIZATION")
    if task.phase == "phase_06" and "testing_release_acceptance" in slug:
        gates.append("SUITE_ADMISSIBILITY")
    if any(
        token in slug
        for token in [
            "definition_of_done_acceptance_map",
            "full_release_gate_evidence_assembly",
            "release_verification_manifest",
            "promotion_evidence",
            "release_candidate_identity",
        ]
    ):
        gates.extend(full_release_gate_stack)
    if task.phase == "phase_07" and any(token in slug for token in ["rollout", "promotion", "launch", "release"]):
        gates.extend(full_release_gate_stack)
    return ordered_unique(gates)


def shared_contract_gap_for_task(task: Task) -> str | None:
    if not task.card_path.exists():
        return None
    match = SHARED_CONTRACT_RE.search(task.card_path.read_text())
    if not match:
        return None
    shared_name = match.group(1)
    shared_path = PROMPT_DIR / shared_name
    if shared_path.exists():
        return None
    return f"{shared_path.stem}_missing"


def build_typed_findings(tasks: list[Task], dag_typed_findings: list[dict[str, Any]]) -> tuple[dict[str, dict[str, Any]], dict[str, list[str]]]:
    finding_by_id: dict[str, dict[str, Any]] = {
        finding["finding_id"]: finding for finding in dag_typed_findings
    }
    task_to_findings: dict[str, list[str]] = defaultdict(list)

    for finding in dag_typed_findings:
        cited_ids = ordered_unique(
            re.findall(r"pc_\d{4}", json.dumps(finding.get("source_citations", [])))
            + re.findall(r"pc_\d{4}", finding.get("summary", ""))
        )
        for task_id in cited_ids:
            task_to_findings[task_id].append(finding["finding_id"])

    for task in tasks:
        gap_id = shared_contract_gap_for_task(task)
        if not gap_id:
            continue
        if gap_id not in finding_by_id:
            finding_by_id[gap_id] = {
                "finding_id": gap_id,
                "type": "SOURCE_GAP",
                "summary": f"{task.task_id} references `{gap_id.removesuffix('_missing')}.md`, but that shared operating contract file is absent from the repository.",
                "source_citations": [
                    {
                        "ref": line_ref(task.card_path, 1, f"{task.task_id}_card"),
                        "source_file": repo_rel(task.card_path),
                        "source_heading_or_logical_block": "Task card root",
                        "rationale": f"{task.task_id} defines its execution intent through the task card and names the missing shared operating contract.",
                    }
                ],
            }
        task_to_findings[task.task_id].append(gap_id)

    for finding_ids in task_to_findings.values():
        finding_ids[:] = ordered_unique(finding_ids)

    return finding_by_id, task_to_findings


def build_validator_catalog() -> list[dict[str, Any]]:
    return [
        {
            "validator_id": "contract_self_test",
            "label": "Contract self-test",
            "command": "python3 Algorithm/scripts/validate_contracts.py --self-test",
            "source_refs": [
                contains_ref(README_PATH, "`python3 Algorithm/scripts/validate_contracts.py --self-test`", "readme_contract_self_test"),
                contains_ref(
                    IMPLEMENTATION_CONVENTIONS_PATH,
                    "Algorithm/scripts/validate_contracts.py --self-test",
                    "implementation_conventions_contract_self_test",
                ),
            ],
        },
        {
            "validator_id": "forensic_contract_guard",
            "label": "Forensic contract guard",
            "command": "python3 Algorithm/tools/forensic_contract_guard.py",
            "source_refs": [
                contains_ref(README_PATH, "`python3 Algorithm/tools/forensic_contract_guard.py`", "readme_forensic_guard"),
            ],
        },
        {
            "validator_id": "build_definition_of_done_map",
            "label": "Definition-of-done builder",
            "command": "python3 tools/analysis/build_definition_of_done_map.py",
            "source_refs": [
                line_ref(CARDS_DIR / "pc_0030.md", 1, "pc_0030_card"),
            ],
        },
        {
            "validator_id": "acceptance_atlas_playwright",
            "label": "Acceptance atlas Playwright contract",
            "command": "npm exec --workspaces=false -- playwright test tests/playwright/analysis/acceptance-atlas.spec.ts",
            "source_refs": [
                line_ref(CARDS_DIR / "pc_0030.md", 1, "pc_0030_card"),
            ],
        },
    ]


def infer_validator_ids(task: Task) -> list[str]:
    validators = ["contract_self_test", "forensic_contract_guard"]
    if task.task_id == "pc_0030":
        validators.extend(["build_definition_of_done_map", "acceptance_atlas_playwright"])
    return ordered_unique(validators)


def build_gate_catalog() -> list[dict[str, Any]]:
    gates: list[dict[str, Any]] = []
    for definition in GATE_DEFINITIONS:
        gates.append(
            {
                **definition,
                "source_refs": [
                    contains_ref(
                        RELEASE_GATES_PATH,
                        definition["line_substring"],
                        definition["gate_id"].lower(),
                    )
                ],
            }
        )
    return gates


def build_task_rows() -> dict[str, Any]:
    tasks = parse_tasks()
    protocol_snapshot = compute_protocol_snapshot(tasks)
    dag = load_json(DAG_PATH)
    dag_nodes = {node["task_id"]: node for node in dag["nodes"]}
    package_rows = {
        row["task_id"]: row for row in load_json(PACKAGE_MAP_PATH)["rows"]
    }
    constraints = load_json(CONSTRAINT_REGISTER_PATH)["entries"]
    test_families = {
        row["family_id"]: row for row in load_json(TEST_FAMILY_MATRIX_PATH)["test_families"]
    }
    release_artifact_rows = load_json(RELEASE_ARTIFACT_MATRIX_PATH)["rows"]
    artifacts_by_gate: dict[str, list[str]] = defaultdict(list)
    for row in release_artifact_rows:
        for gate_id in row["blocking_gates"]:
            artifacts_by_gate[gate_id].append(row["artifact_id"])

    blueprint_groups = build_blueprint_groups()
    validator_catalog = build_validator_catalog()
    gate_catalog = build_gate_catalog()
    gate_source_map = {row["gate_id"]: row["source_refs"] for row in gate_catalog}

    finding_by_id, task_to_findings = build_typed_findings(
        tasks,
        dag.get("typed_findings", []),
    )

    task_rows: list[dict[str, Any]] = []
    for task in tasks:
        dag_node = dag_nodes[task.task_id]
        package_row = package_rows.get(task.task_id, {})
        group_ids = infer_blueprint_group_ids(task)
        blueprint_refs = ordered_unique(
            ref for group_id in group_ids for ref in blueprint_groups[group_id]["refs"]
        )

        explicit_test_vectors = parse_explicit_test_vector_refs(task.task_slug)
        derived_test_vectors = ordered_unique(
            ref
            for group_id in group_ids
            for ref in blueprint_groups[group_id]["test_vector_refs"]
        )
        test_vector_refs = explicit_test_vectors or derived_test_vectors
        if any(token in task.task_slug for token in ["hmrc", "authority_sandbox", "provider_profile"]):
            test_vector_refs = ordered_unique(test_vector_refs + ["TV-91", "TV-91A"])

        constraint_refs = ordered_unique(
            constraint["constraint_id"]
            for constraint in constraints
            if set(constraint["prompt_stage_refs"]) & set(blueprint_refs)
        )
        validator_ids = infer_validator_ids(task)
        release_gate_refs = infer_release_gate_refs(task)
        suite_family_refs = ordered_unique(
            family_id
            for gate_id in release_gate_refs
            for family_id in GATE_TO_SUITE_FAMILIES.get(gate_id, [])
        )
        evidence_artifact_refs = ordered_unique(
            artifact_id
            for gate_id in release_gate_refs
            for artifact_id in artifacts_by_gate.get(gate_id, [])
        )
        if task.phase == "phase_07" and any(
            token in task.task_slug for token in ["release", "rollout", "launch", "promotion"]
        ):
            evidence_artifact_refs = ordered_unique(
                evidence_artifact_refs + ["ReleaseVerificationManifest", "DeploymentRelease"]
            )

        blocking_gap_refs = ordered_unique(task_to_findings.get(task.task_id, []))
        primary_deliverable_class = infer_primary_deliverable_class(task)
        wave_candidate = task.wave_id or f"sequential_gate::{task.task_id}"
        task_label = humanize_slug(task)
        card_source_ref = line_ref(task.card_path, 1, f"{task.task_id}_card")
        checklist_ref = line_ref(CHECKLIST_PATH, task.checklist_line, task.task_id)

        source_refs = ordered_unique(
            [card_source_ref, checklist_ref]
            + [ref for group_id in group_ids for ref in blueprint_groups[group_id]["source_refs"]]
            + [ref for gate_id in release_gate_refs for ref in gate_source_map.get(gate_id, [])]
            + [
                line_ref(CONSTRAINT_REGISTER_PATH, 1, "constraint_traceability_register")
                if constraint_refs
                else ""
            ]
        )

        group_labels = [blueprint_groups[group_id]["label"] for group_id in group_ids]
        gate_label_summary = ", ".join(release_gate_refs[:3]) if release_gate_refs else "no direct release gate"
        definition_of_done_summary = (
            f"Deliver `{primary_deliverable_class}` evidence for {task.task_id}, "
            f"advance {', '.join(group_labels[:3])}, and bind acceptance proof through {gate_label_summary}."
        )
        rationale = (
            f"Mapped from checklist slug `{task.task_slug}`, "
            f"phase `{task.phase}` {task.protocol_mode} protocol law, "
            f"{'track `' + task.track + '` semantics, ' if task.track else ''}"
            f"README blueprint coverage families, `test_vectors.md` prompt-stage ownership, "
            f"and release-gate bindings in `verification_and_release_gates.md`."
        )

        task_rows.append(
            {
                "task_id": task.task_id,
                "task_slug": task.task_slug,
                "task_label": task_label,
                "phase": task.phase,
                "phase_label": PHASE_LABELS[task.phase],
                "protocol_mode": task.protocol_mode,
                "wave_id": task.wave_id,
                "track": task.track,
                "hard_dependency_refs": dag_node["hard_predecessor_task_ids"],
                "soft_dependency_refs": dag_node["soft_context_predecessor_task_ids"],
                "primary_deliverable_class": primary_deliverable_class,
                "blueprint_group_ids": group_ids,
                "blueprint_family_refs": blueprint_refs,
                "test_vector_refs": test_vector_refs,
                "constraint_refs": constraint_refs,
                "validator_refs": validator_ids,
                "suite_family_refs": suite_family_refs,
                "release_gate_refs": release_gate_refs,
                "evidence_artifact_refs": evidence_artifact_refs,
                "definition_of_done_summary": definition_of_done_summary,
                "blocking_gap_refs": blocking_gap_refs,
                "wave_candidate": wave_candidate,
                "checklist_status": task.status,
                "level": dag_node["level"],
                "primary_package_id": package_row.get("primary_package_id")
                or dag_node.get("primary_package_id"),
                "secondary_package_ids": package_row.get("secondary_package_ids", []),
                "owner_team_id": package_row.get("owner_team_id") or dag_node.get("owner_team_id"),
                "owner_team_handle": package_row.get("owner_team_handle")
                or dag_node.get("owner_team_handle"),
                "source_file": repo_rel(task.card_path),
                "source_heading_or_logical_block": "Task card root",
                "source_refs": source_refs,
                "rationale": rationale,
                "acceptance_layers": {
                    "roadmap_task_completion": {
                        "proof": [
                            checklist_ref,
                            card_source_ref,
                        ],
                        "summary": "Checklist state, card evidence, and declared deliverables exist together.",
                    },
                    "blueprint_coverage_closure": {
                        "blueprint_group_ids": group_ids,
                        "blueprint_family_refs": blueprint_refs,
                        "test_vector_refs": test_vector_refs,
                        "constraint_refs": constraint_refs,
                    },
                    "release_admissibility": {
                        "validator_refs": validator_ids,
                        "suite_family_refs": suite_family_refs,
                        "release_gate_refs": release_gate_refs,
                        "evidence_artifact_refs": evidence_artifact_refs,
                    },
                },
            }
        )

    if len(task_rows) != len(tasks):
        raise ValueError("Task matrix row count drifted from checklist task count.")

    return {
        "tasks": task_rows,
        "protocol_snapshot": protocol_snapshot,
        "validator_catalog": validator_catalog,
        "gate_catalog": gate_catalog,
        "test_families": test_families,
        "artifact_rows": release_artifact_rows,
        "typed_findings": finding_by_id,
        "blueprint_groups": blueprint_groups,
    }


def build_phase_exit_rows(task_rows: list[dict[str, Any]], protocol_snapshot: dict[str, Any]) -> dict[str, Any]:
    phase_to_tasks: dict[str, list[dict[str, Any]]] = defaultdict(list)
    wave_to_tasks: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in task_rows:
        phase_to_tasks[row["phase"]].append(row)
        if row["wave_id"]:
            wave_to_tasks[row["wave_id"]].append(row)

    phase_rows: list[dict[str, Any]] = []
    for phase_id, rows in sorted(phase_to_tasks.items()):
        phase_rows.append(
            {
                "phase_id": phase_id,
                "phase_label": PHASE_LABELS[phase_id],
                "task_count": len(rows),
                "task_ids": [row["task_id"] for row in rows],
                "protocol_mode": rows[0]["protocol_mode"] if len({row["protocol_mode"] for row in rows}) == 1 else "mixed",
                "roadmap_exit_rule": (
                    "Every task in the phase is `[X]`, and AGENT first-incomplete law exposes the next boundary."
                ),
                "blueprint_exit_rule": (
                    "The phase-owned FE/BE/SYS families, test vectors, and constraint refs are all represented in task evidence."
                ),
                "release_exit_rule": (
                    "Any gates touched by the phase have candidate-bound evidence artifacts, plus the two authoritative validator commands remain green."
                ),
                "blueprint_family_refs": ordered_unique(
                    ref for row in rows for ref in row["blueprint_family_refs"]
                ),
                "test_vector_refs": ordered_unique(
                    ref for row in rows for ref in row["test_vector_refs"]
                ),
                "release_gate_refs": ordered_unique(
                    ref for row in rows for ref in row["release_gate_refs"]
                ),
                "evidence_artifact_refs": ordered_unique(
                    ref for row in rows for ref in row["evidence_artifact_refs"]
                ),
                "blocking_gap_refs": ordered_unique(
                    ref for row in rows for ref in row["blocking_gap_refs"]
                ),
                "current_open_task_id": next(
                    (row["task_id"] for row in rows if row["task_id"] == protocol_snapshot["first_incomplete_task_id"]),
                    None,
                ),
                "source_refs": [
                    heading_ref(AGENT_PATH, "## Eligibility Rules", "agent_eligibility_rules"),
                    heading_ref(README_PATH, "## Blueprint Coverage And Acceptance Map", "blueprint_coverage_and_acceptance_map"),
                    heading_ref(RELEASE_GATES_PATH, "## 2. Release gate", "release_gate"),
                ],
            }
        )

    wave_rows: list[dict[str, Any]] = []
    for wave_id, rows in sorted(wave_to_tasks.items()):
        phase_id = rows[0]["phase"]
        tracks = ordered_unique(row["track"] for row in rows)
        first_task_id = min(rows, key=lambda row: row["task_id"])["task_id"]
        last_task_id = max(rows, key=lambda row: row["task_id"])["task_id"]
        current_state = "blocked"
        if protocol_snapshot["first_incomplete_task_id"] in {row["task_id"] for row in rows}:
            current_state = "active"
        elif all(row["checklist_status"] == "X" for row in rows):
            current_state = "complete"
        wave_rows.append(
            {
                "wave_id": wave_id,
                "phase_id": phase_id,
                "phase_label": PHASE_LABELS[phase_id],
                "task_count": len(rows),
                "first_task_id": first_task_id,
                "last_task_id": last_task_id,
                "track_ids": tracks,
                "current_state": current_state,
                "roadmap_exit_rule": (
                    "Every task in the contiguous parallel block is `[X]`; no later wave or sequential gate is claimable before that."
                ),
                "blueprint_exit_rule": (
                    "Each track emits its owned FE/BE/SYS families, and the wave-level union closes the intended phase surface."
                ),
                "release_exit_rule": (
                    "Every suite family bound to the wave has result, admissibility, and artifact evidence with exact candidate scope."
                ),
                "blueprint_family_refs": ordered_unique(
                    ref for row in rows for ref in row["blueprint_family_refs"]
                ),
                "test_vector_refs": ordered_unique(
                    ref for row in rows for ref in row["test_vector_refs"]
                ),
                "release_gate_refs": ordered_unique(
                    ref for row in rows for ref in row["release_gate_refs"]
                ),
                "source_refs": [
                    heading_ref(AGENT_PATH, "## Parallel Wave Protocol", "parallel_wave_protocol"),
                    heading_ref(AGENT_PATH, "## Eligibility Rules", "eligibility_rules"),
                ],
            }
        )

    return {"phase_rows": phase_rows, "wave_rows": wave_rows}


def build_execution_plan(task_rows: list[dict[str, Any]], protocol_snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    units: list[dict[str, Any]] = []
    grouped: list[tuple[str, list[dict[str, Any]]]] = []
    current_key: str | None = None
    current_rows: list[dict[str, Any]] = []
    for row in task_rows:
        key = row["wave_id"] or row["phase"]
        if row["protocol_mode"] == "sequential":
            key = row["task_id"]
        if key != current_key:
            if current_rows:
                grouped.append((current_key or "", current_rows))
            current_key = key
            current_rows = [row]
        else:
            current_rows.append(row)
    if current_rows:
        grouped.append((current_key or "", current_rows))

    for order_index, (unit_id, rows) in enumerate(grouped):
        first = rows[0]
        last = rows[-1]
        current_state = "blocked"
        claimable_count = 0
        row_task_ids = [row["task_id"] for row in rows]
        if protocol_snapshot["first_incomplete_task_id"] in row_task_ids:
            current_state = "active"
            claimable_count = len(protocol_snapshot["claimable_task_ids"])
        elif all(row["checklist_status"] == "X" for row in rows):
            current_state = "complete"
        units.append(
            {
                "execution_unit_id": unit_id,
                "order_index": order_index,
                "phase_id": first["phase"],
                "phase_label": first["phase_label"],
                "protocol_mode": first["protocol_mode"],
                "wave_id": first["wave_id"],
                "task_count": len(rows),
                "task_ids": row_task_ids,
                "first_task_id": first["task_id"],
                "last_task_id": last["task_id"],
                "track_ids": ordered_unique(row["track"] for row in rows if row["track"]),
                "current_state": current_state,
                "current_claimable_task_ids": [
                    task_id
                    for task_id in protocol_snapshot["claimable_task_ids"]
                    if task_id in row_task_ids
                ],
                "max_claimable_parallelism": claimable_count,
                "blocked_until": (
                    protocol_snapshot["first_incomplete_task_id"]
                    if current_state == "blocked"
                    else None
                ),
                "gating_rule": (
                    "Only the first incomplete sequential task is claimable."
                    if first["protocol_mode"] == "sequential"
                    else "Only the current contiguous parallel wave block is claimable until every task in the block is `[X]`."
                ),
                "blocking_gap_refs": ordered_unique(
                    ref for row in rows for ref in row["blocking_gap_refs"]
                ),
                "source_refs": [
                    heading_ref(AGENT_PATH, "## Sequential Protocol", "sequential_protocol")
                    if first["protocol_mode"] == "sequential"
                    else heading_ref(AGENT_PATH, "## Parallel Wave Protocol", "parallel_wave_protocol"),
                    heading_ref(AGENT_PATH, "## Eligibility Rules", "eligibility_rules"),
                ],
            }
        )
    return units


def build_bundle_inventory(
    task_rows: list[dict[str, Any]],
    artifact_rows: list[dict[str, Any]],
    validator_catalog: list[dict[str, Any]],
) -> dict[str, Any]:
    roadmap_task_ids = [row["task_id"] for row in task_rows]
    release_bundles: list[dict[str, Any]] = []
    for row in artifact_rows:
        release_bundles.append(
            {
                "bundle_id": row["artifact_id"],
                "acceptance_layer": "release_admissibility",
                "blocking_gates": row["blocking_gates"],
                "advanced_by_task_ids": [
                    task["task_id"]
                    for task in task_rows
                    if row["artifact_id"] in task["evidence_artifact_refs"]
                ],
                "produced_from": row["produced_from"],
                "promotion_required": row["promotion_required"],
                "candidate_binding": row["candidate_binding"],
                "compatibility_binding": row["compatibility_binding"],
                "source_refs": row["source_refs"],
            }
        )

    bundles = [
        {
            "bundle_id": "roadmap_task_completion",
            "acceptance_layer": "roadmap_task_completion",
            "required_components": [
                repo_rel(CHECKLIST_PATH),
                "PROMPT/CARDS/pc_####.md",
                "declared deliverables exist and match task intent",
            ],
            "advanced_by_task_ids": roadmap_task_ids,
            "validator_commands": [row["command"] for row in validator_catalog[:2]],
            "source_refs": [
                heading_ref(AGENT_PATH, "## Claim Workflow", "claim_workflow"),
                heading_ref(AGENT_PATH, "## Card File Rules", "card_file_rules"),
            ],
        },
        {
            "bundle_id": "blueprint_coverage_closure",
            "acceptance_layer": "blueprint_coverage_closure",
            "required_components": [
                "FE/BE/SYS coverage refs",
                "test vector refs",
                "constraint refs",
                "rationale and source refs",
            ],
            "advanced_by_task_ids": roadmap_task_ids,
            "validator_commands": [row["command"] for row in validator_catalog[:2]],
            "source_refs": [
                heading_ref(README_PATH, "## Blueprint Coverage And Acceptance Map", "blueprint_coverage_and_acceptance_map"),
                heading_ref(TEST_VECTORS_PATH, "## Prompt-stage ownership by range", "prompt_stage_ownership_by_range"),
                line_ref(CONSTRAINT_REGISTER_PATH, 1, "constraint_traceability_register"),
            ],
        },
        *release_bundles,
    ]
    return {
        "contract_version": CONTRACT_VERSION,
        "generated_at": TODAY,
        "summary": {
            "bundle_count": len(bundles),
            "release_bundle_count": len(release_bundles),
            "roadmap_task_count": len(roadmap_task_ids),
        },
        "bundles": bundles,
    }


def build_main_doc(
    task_rows: list[dict[str, Any]],
    protocol_snapshot: dict[str, Any],
    phase_rows: list[dict[str, Any]],
    wave_rows: list[dict[str, Any]],
    bundle_inventory: dict[str, Any],
    typed_findings: dict[str, dict[str, Any]],
) -> str:
    summary = {
        "task_count": len(task_rows),
        "phase_count": len(phase_rows),
        "wave_block_count": len(wave_rows),
        "gapped_task_count": sum(1 for row in task_rows if row["blocking_gap_refs"]),
        "release_bound_task_count": sum(1 for row in task_rows if row["release_gate_refs"]),
    }

    phase_table_rows = [
        [
            phase["phase_id"],
            phase["task_count"],
            len(phase["blueprint_family_refs"]),
            len(phase["release_gate_refs"]),
            phase["current_open_task_id"] or "closed",
        ]
        for phase in phase_rows
    ]
    wave_table_rows = [
        [
            wave["wave_id"],
            wave["task_count"],
            len(wave["track_ids"]),
            wave["current_state"],
            ", ".join(wave["release_gate_refs"][:4]) or "n/a",
        ]
        for wave in wave_rows
    ]
    sample_rows = [
        [
            row["task_id"],
            row["phase"],
            row["primary_deliverable_class"],
            ", ".join(row["blueprint_group_ids"]),
            ", ".join(row["test_vector_refs"][:3]) or "n/a",
            ", ".join(row["release_gate_refs"][:3]) or "n/a",
        ]
        for row in task_rows[:8]
    ]
    findings_rows = [
        [
            finding["finding_id"],
            finding["type"],
            finding["summary"],
        ]
        for finding in sorted(typed_findings.values(), key=lambda item: item["finding_id"])
    ]

    return f"""# Definition Of Done Acceptance Map And Wave Plan

Generated on `{TODAY}` from the live checklist, the execution DAG, the acceptance-law corpus, and the release evidence contracts.

## Summary

- Checklist tasks normalized: `{summary["task_count"]}`
- Phase records: `{summary["phase_count"]}`
- Parallel wave blocks: `{summary["wave_block_count"]}`
- Tasks with explicit typed gaps: `{summary["gapped_task_count"]}`
- Tasks touching at least one release gate: `{summary["release_bound_task_count"]}`
- Current first incomplete task under AGENT law: `{protocol_snapshot["first_incomplete_task_id"]}`
- Current claimable set: `{", ".join(protocol_snapshot["claimable_task_ids"]) or "none"}`
- Next blocked boundary: `{protocol_snapshot["blocked_boundary_task_id"] or "none"}`

## Acceptance Layers

1. `roadmap_task_completion`
   A task is locally done only when the checklist state, the card evidence, and the declared deliverables all line up.
2. `blueprint_coverage_closure`
   The task must advance named `FE-*`, `BE-*`, and `SYS-*` coverage together with linked test vectors and constraint refs.
3. `release_admissibility`
   Release truth is separate from task completion. Where a task affects a blocking gate, the map points to the exact gate families and evidence artifact classes instead of implying readiness by adjacency.

## Phase Exit Overview

{markdown_table(
    ["Phase", "Tasks", "Blueprint Refs", "Gate Families", "Current Open"],
    phase_table_rows,
)}

## Parallel Wave Overview

{markdown_table(
    ["Wave", "Tasks", "Tracks", "State", "Gate Sample"],
    wave_table_rows,
)}

## Task Matrix Sample

{markdown_table(
    ["Task", "Phase", "Deliverable", "Blueprint Groups", "Vector Sample", "Gate Sample"],
    sample_rows,
)}

## Bundle Inventory

- Acceptance bundles: `{bundle_inventory["summary"]["bundle_count"]}`
- Release-evidence bundles: `{bundle_inventory["summary"]["release_bundle_count"]}`
- Cross-cutting roadmap validators remain the canonical exact commands:
  - `python3 Algorithm/scripts/validate_contracts.py --self-test`
  - `python3 Algorithm/tools/forensic_contract_guard.py`

## Typed Findings

{markdown_table(["Finding", "Type", "Summary"], findings_rows)}
"""


def build_guide_doc(
    validator_catalog: list[dict[str, Any]],
    gate_catalog: list[dict[str, Any]],
    bundle_inventory: dict[str, Any],
) -> str:
    validator_rows = [
        [row["validator_id"], row["label"], row["command"]] for row in validator_catalog
    ]
    gate_rows = [
        [row["gate_id"], row["label"], row["description"]] for row in gate_catalog
    ]
    bundle_rows = [
        [
            row["bundle_id"],
            row["acceptance_layer"],
            ", ".join(row.get("blocking_gates", [])) or "n/a",
        ]
        for row in bundle_inventory["bundles"][:10]
    ]
    return f"""# Acceptance Evidence Assembly Guide

Use this guide when an agent needs to decide what "done" means for a task without rereading the entire corpus.

## Procedure

1. Open `data/analysis/task_definition_of_done_matrix.json` and locate the `task_id`.
2. Confirm `roadmap_task_completion` by checking the checklist state, the card evidence, and the declared outputs.
3. Confirm `blueprint_coverage_closure` by reading the task's `blueprint_family_refs`, `test_vector_refs`, and `constraint_refs`.
4. Confirm `release_admissibility` only when the task has non-empty `release_gate_refs`. Use the bound suite families, exact validator commands, and evidence artifact refs instead of assuming that local completion equals release readiness.
5. If `blocking_gap_refs` is non-empty, treat the task as locally complete at most; never infer missing corpus proof.

## Exact Validator Commands

{markdown_table(["Validator", "Label", "Command"], validator_rows)}

## Blocking Gate Vocabulary

{markdown_table(["Gate", "Label", "Meaning"], gate_rows)}

## Evidence Bundle Inventory Sample

{markdown_table(["Bundle", "Layer", "Blocking Gates"], bundle_rows)}
"""


def build_mermaid(execution_units: list[dict[str, Any]], protocol_snapshot: dict[str, Any]) -> str:
    lines = ["flowchart LR"]
    for unit in execution_units:
        label = f"{unit['phase_id']}\\n{unit['first_task_id']}..{unit['last_task_id']}\\n{unit['task_count']} tasks"
        lines.append(f'  {unit["execution_unit_id"].replace("::", "_")}["{label}"]')
    for index in range(len(execution_units) - 1):
        left = execution_units[index]["execution_unit_id"].replace("::", "_")
        right = execution_units[index + 1]["execution_unit_id"].replace("::", "_")
        lines.append(f"  {left} --> {right}")
    if protocol_snapshot["first_incomplete_task_id"]:
        lines.append(
            f'  active["Active gate\\n{protocol_snapshot["first_incomplete_task_id"]}"]'
        )
        lines.append(
            f'  {execution_units[0]["execution_unit_id"].replace("::", "_")} -.-> active'
        )
    return "\n".join(lines) + "\n"


def build_outputs() -> dict[str, Any]:
    context = build_task_rows()
    task_rows = context["tasks"]
    protocol_snapshot = context["protocol_snapshot"]
    validator_catalog = context["validator_catalog"]
    gate_catalog = context["gate_catalog"]
    typed_findings = context["typed_findings"]
    phase_exit = build_phase_exit_rows(task_rows, protocol_snapshot)
    execution_units = build_execution_plan(task_rows, protocol_snapshot)
    bundle_inventory = build_bundle_inventory(
        task_rows,
        context["artifact_rows"],
        validator_catalog,
    )

    matrix_payload = {
        "contract_version": CONTRACT_VERSION,
        "generated_at": TODAY,
        "summary": {
            "task_count": len(task_rows),
            "phase_count": len({row["phase"] for row in task_rows}),
            "parallel_wave_block_count": len({row["wave_id"] for row in task_rows if row["wave_id"]}),
            "gapped_task_count": sum(1 for row in task_rows if row["blocking_gap_refs"]),
            "release_bound_task_count": sum(1 for row in task_rows if row["release_gate_refs"]),
        },
        "protocol_snapshot": protocol_snapshot,
        "rows": task_rows,
    }

    blueprint_map_payload = {
        "contract_version": CONTRACT_VERSION,
        "generated_at": TODAY,
        "rows": [
            {
                "task_id": row["task_id"],
                "task_slug": row["task_slug"],
                "phase": row["phase"],
                "protocol_mode": row["protocol_mode"],
                "blueprint_group_ids": row["blueprint_group_ids"],
                "blueprint_family_refs": row["blueprint_family_refs"],
                "constraint_refs": row["constraint_refs"],
                "definition_of_done_summary": row["definition_of_done_summary"],
                "blocking_gap_refs": row["blocking_gap_refs"],
                "source_file": row["source_file"],
                "source_heading_or_logical_block": row["source_heading_or_logical_block"],
                "rationale": row["rationale"],
            }
            for row in task_rows
        ],
    }

    test_vector_map_payload = {
        "contract_version": CONTRACT_VERSION,
        "generated_at": TODAY,
        "rows": [
            {
                "task_id": row["task_id"],
                "task_slug": row["task_slug"],
                "phase": row["phase"],
                "protocol_mode": row["protocol_mode"],
                "test_vector_refs": row["test_vector_refs"],
                "blueprint_family_refs": row["blueprint_family_refs"],
                "constraint_refs": row["constraint_refs"],
                "source_refs": row["source_refs"],
                "rationale": row["rationale"],
            }
            for row in task_rows
        ],
    }

    validator_gate_map_payload = {
        "contract_version": CONTRACT_VERSION,
        "generated_at": TODAY,
        "validator_catalog": validator_catalog,
        "gate_catalog": gate_catalog,
        "rows": [
            {
                "task_id": row["task_id"],
                "task_slug": row["task_slug"],
                "phase": row["phase"],
                "protocol_mode": row["protocol_mode"],
                "validator_refs": row["validator_refs"],
                "suite_family_refs": row["suite_family_refs"],
                "release_gate_refs": row["release_gate_refs"],
                "evidence_artifact_refs": row["evidence_artifact_refs"],
                "blocking_gap_refs": row["blocking_gap_refs"],
                "source_refs": row["source_refs"],
                "rationale": row["rationale"],
            }
            for row in task_rows
        ],
    }

    phase_exit_payload = {
        "contract_version": CONTRACT_VERSION,
        "generated_at": TODAY,
        "phase_rows": phase_exit["phase_rows"],
        "wave_rows": phase_exit["wave_rows"],
    }

    wave_plan_payload = {
        "contract_version": CONTRACT_VERSION,
        "generated_at": TODAY,
        "protocol_snapshot": protocol_snapshot,
        "execution_units": execution_units,
    }

    typed_finding_rows = []
    for finding in sorted(typed_findings.values(), key=lambda item: item["finding_id"]):
        affected_task_ids = ordered_unique(
            re.findall(r"pc_\d{4}", json.dumps(finding.get("source_citations", [])))
            + re.findall(r"pc_\d{4}", finding.get("summary", ""))
        )
        typed_finding_rows.append(
            {
                "finding_id": finding["finding_id"],
                "type": finding["type"],
                "summary": finding["summary"],
                "affected_task_ids": affected_task_ids,
                "source_citations": finding.get("source_citations", []),
            }
        )

    atlas_payload = {
        "contract_version": CONTRACT_VERSION,
        "generated_at": TODAY,
        "summary": matrix_payload["summary"],
        "manifest_status": {
            "active_task_id": protocol_snapshot["first_incomplete_task_id"],
            "claimable_task_ids": protocol_snapshot["claimable_task_ids"],
            "blocked_boundary_task_id": protocol_snapshot["blocked_boundary_task_id"],
            "status_chip": (
                f"Sequential gate active · {protocol_snapshot['first_incomplete_task_id']}"
                if protocol_snapshot["first_incomplete_task_id"]
                else "Checklist closed"
            ),
        },
        "phase_spine": execution_units,
        "tasks": task_rows,
        "typed_gaps": typed_finding_rows,
        "validator_catalog": validator_catalog,
        "gate_catalog": gate_catalog,
        "bundle_catalog": bundle_inventory["bundles"],
    }

    return {
        "matrix_payload": matrix_payload,
        "blueprint_map_payload": blueprint_map_payload,
        "test_vector_map_payload": test_vector_map_payload,
        "validator_gate_map_payload": validator_gate_map_payload,
        "phase_exit_payload": phase_exit_payload,
        "wave_plan_payload": wave_plan_payload,
        "bundle_inventory": bundle_inventory,
        "atlas_payload": atlas_payload,
        "validator_catalog": validator_catalog,
        "gate_catalog": gate_catalog,
        "task_rows": task_rows,
        "protocol_snapshot": protocol_snapshot,
        "phase_rows": phase_exit["phase_rows"],
        "wave_rows": phase_exit["wave_rows"],
        "typed_findings": typed_findings,
        "execution_units": execution_units,
    }


def main() -> None:
    outputs = build_outputs()

    json_write(MATRIX_PATH, outputs["matrix_payload"])
    json_write(BLUEPRINT_MAP_PATH, outputs["blueprint_map_payload"])
    json_write(TEST_VECTOR_MAP_PATH, outputs["test_vector_map_payload"])
    json_write(VALIDATOR_GATE_MAP_PATH, outputs["validator_gate_map_payload"])
    json_write(PHASE_EXIT_PATH, outputs["phase_exit_payload"])
    json_write(WAVE_PLAN_PATH, outputs["wave_plan_payload"])
    json_write(BUNDLE_INVENTORY_PATH, outputs["bundle_inventory"])
    json_write(ATLAS_DATA_PATH, outputs["atlas_payload"])

    text_write(
        DOC_MAIN_PATH,
        build_main_doc(
            outputs["task_rows"],
            outputs["protocol_snapshot"],
            outputs["phase_rows"],
            outputs["wave_rows"],
            outputs["bundle_inventory"],
            outputs["typed_findings"],
        ),
    )
    text_write(
        DOC_GUIDE_PATH,
        build_guide_doc(
            outputs["validator_catalog"],
            outputs["gate_catalog"],
            outputs["bundle_inventory"],
        ),
    )
    text_write(
        MERMAID_PATH,
        build_mermaid(outputs["execution_units"], outputs["protocol_snapshot"]),
    )


if __name__ == "__main__":
    main()
