#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[2]
ALGORITHM_DIR = ROOT / "Algorithm"
PROMPT_DIR = ROOT / "PROMPT"
DATA_ANALYSIS_DIR = ROOT / "data" / "analysis"
DOCS_ARCH_DIR = ROOT / "docs" / "architecture"
DIAGRAMS_ANALYSIS_DIR = ROOT / "diagrams" / "analysis"

README_PATH = ALGORITHM_DIR / "README.md"
MODULES_PATH = ALGORITHM_DIR / "modules.md"
COHERENCE_PATH = ALGORITHM_DIR / "architecture_coherence_guardrails.md"
CONTRACT_INTEGRITY_PATH = ALGORITHM_DIR / "contract_integrity_requirements.md"
FRONTEND_SHELL_PATH = ALGORITHM_DIR / "frontend_shell_and_interaction_law.md"
PORTAL_PATH = ALGORITHM_DIR / "customer_client_portal_experience_contract.md"
COLLABORATION_PATH = ALGORITHM_DIR / "collaboration_workspace_contract.md"
GOVERNANCE_PATH = ALGORITHM_DIR / "admin_governance_console_architecture.md"
MACOS_BLUEPRINT_PATH = ALGORITHM_DIR / "macos_native_operator_workspace_blueprint.md"
AUTHORITY_PATH = ALGORITHM_DIR / "authority_interaction_protocol.md"
NORTHBOUND_PATH = ALGORITHM_DIR / "northbound_api_and_session_contract.md"
REPLAY_PATH = ALGORITHM_DIR / "replay_and_reproducibility_contract.md"
MANIFEST_PATH = ALGORITHM_DIR / "manifest_and_config_freeze_contract.md"
OBSERVABILITY_PATH = ALGORITHM_DIR / "observability_and_audit_contract.md"
SECURITY_PATH = ALGORITHM_DIR / "security_and_runtime_hardening_contract.md"
DEPLOYMENT_PATH = ALGORITHM_DIR / "deployment_and_resilience_contract.md"
CHECKLIST_PATH = PROMPT_DIR / "Checklist.md"

MODULE_CATALOG_PATH = DATA_ANALYSIS_DIR / "module_catalog.json"
READ_MODEL_CATALOG_PATH = DATA_ANALYSIS_DIR / "read_model_catalog_and_owner_map.json"
AUTHORITY_CATALOG_PATH = DATA_ANALYSIS_DIR / "authority_operation_catalog.json"
TEST_FAMILY_MATRIX_PATH = DATA_ANALYSIS_DIR / "test_family_to_constraint_matrix.json"
WEB_TOPOLOGY_PATH = DATA_ANALYSIS_DIR / "web_surface_topology_and_deployable_map.json"
NATIVE_TOPOLOGY_PATH = DATA_ANALYSIS_DIR / "native_scene_and_window_topology.json"
RELEASE_MATRIX_PATH = DATA_ANALYSIS_DIR / "release_evidence_artifact_matrix.json"

DOC_PATH = DOCS_ARCH_DIR / "monorepo-package-boundaries-and-team-ownership-map.md"
COMPARISON_PATH = (
    DOCS_ARCH_DIR / "monorepo-package-boundaries-and-team-ownership-map-comparison.md"
)
PACKAGE_BOUNDARY_MATRIX_PATH = DATA_ANALYSIS_DIR / "package_boundary_matrix.json"
PACKAGE_DEPENDENCY_RULES_PATH = DATA_ANALYSIS_DIR / "package_dependency_rules.json"
TEAM_OWNERSHIP_MAP_PATH = DATA_ANALYSIS_DIR / "team_ownership_map.json"
CODEOWNERS_DRAFT_PATH = DATA_ANALYSIS_DIR / "codeowners_draft.json"
TASK_TO_PACKAGE_MAP_PATH = DATA_ANALYSIS_DIR / "later_task_to_package_map.json"
MERMAID_PATH = DIAGRAMS_ANALYSIS_DIR / "monorepo-package-boundaries.mmd"

HEADING_RE = re.compile(r"^(#{2,4})\s+(.*)$")
TASK_RE = re.compile(r"- \[[ X-]\] `(pc_\d+)` ([^ ]+) ")
TODAY = "2026-04-18"
SELECTED_TOPOLOGY_ID = "domain_oriented_monorepo_with_restrained_shared_packages"


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


def json_write(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")


def text_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def find_heading_line(path: Path, heading_text: str) -> int:
    normalized_heading = re.sub(r"^#+\s*", "", heading_text).strip()
    for line_number, line in enumerate(path.read_text().splitlines(), 1):
        match = HEADING_RE.match(line)
        if match and match.group(2).strip() == normalized_heading:
            return line_number
    raise ValueError(f"Heading `{heading_text}` not found in {path}")


def line_ref(path: Path, line_number: int, label: str) -> str:
    safe_label = re.sub(r"[^A-Za-z0-9_.-]+", "_", label).strip("_") or "line"
    return f"{repo_rel(path)}::L{line_number}[{safe_label}]"


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


def build_supporting_context() -> dict[str, Any]:
    module_catalog = load_json(MODULE_CATALOG_PATH)
    read_models = load_json(READ_MODEL_CATALOG_PATH)
    authority_catalog = load_json(AUTHORITY_CATALOG_PATH)
    test_matrix = load_json(TEST_FAMILY_MATRIX_PATH)
    web_topology = load_json(WEB_TOPOLOGY_PATH)
    native_topology = load_json(NATIVE_TOPOLOGY_PATH)
    release_matrix = load_json(RELEASE_MATRIX_PATH)
    later_tasks = parse_later_tasks()
    phase_counts = Counter(task["phase"] for task in later_tasks)
    return {
        "canonical_module_count": module_catalog["summary"]["canonical_module_count"],
        "dependency_edge_count": module_catalog["summary"]["dependency_edge_count"],
        "read_model_count": read_models["summary"]["read_model_count"],
        "route_bound_read_model_count": read_models["summary"][
            "route_bound_read_model_count"
        ],
        "authority_operation_family_count": authority_catalog["summary"][
            "operation_family_count"
        ],
        "browser_route_count": web_topology["summary"]["browser_route_count"],
        "web_shared_package_count": web_topology["summary"]["shared_package_count"],
        "native_scene_count": native_topology["summary"]["scene_count"],
        "native_package_count": native_topology["summary"]["package_count"],
        "release_artifact_count": release_matrix["summary"]["artifact_count"],
        "test_family_count": test_matrix["summary"]["family_count"],
        "later_task_count": len(later_tasks),
        "later_phase_counts": {f"phase_{phase:02d}": phase_counts[phase] for phase in sorted(phase_counts)},
    }


def build_criteria() -> list[dict[str, Any]]:
    return [
        {
            "criterion_id": "contract_source_of_truth_clarity",
            "label": "Contract source-of-truth clarity",
            "weight": 14,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Schemas, generated types, and validator-owned artifacts need one explicit authoritative home rather than being scattered across app folders.",
            "source_refs": [
                heading_ref(README_PATH, "Shared Spine Vocabulary"),
                heading_ref(COHERENCE_PATH, "4. Schema, documentation, and example parity"),
                heading_ref(CONTRACT_INTEGRITY_PATH, "Foundation spine integrity"),
            ],
        },
        {
            "criterion_id": "cohesion_against_later_track_clusters",
            "label": "Cohesion against later roadmap track clusters",
            "weight": 14,
            "priority": "HARD_REQUIREMENT",
            "rationale": "The package map should absorb the already-planned phase 02-06 tracks without forcing every implementation task to renegotiate repo structure.",
            "source_refs": [
                heading_ref(README_PATH, "Blueprint Coverage And Acceptance Map"),
                heading_ref(MODULES_PATH, "## AUTHORIZE(...)", "AUTHORIZE"),
                heading_ref(MODULES_PATH, "## ASSEMBLE_RELEASE_VERIFICATION_MANIFEST(...)", "ASSEMBLE_RELEASE_VERIFICATION_MANIFEST"),
            ],
        },
        {
            "criterion_id": "dependency_direction_and_acyclicity",
            "label": "Dependency direction and acyclicity",
            "weight": 12,
            "priority": "HARD_REQUIREMENT",
            "rationale": "UI, transport, release tooling, and authority code need explicit import boundaries so legal/business rules do not leak across layers or form cycles.",
            "source_refs": [
                heading_ref(COHERENCE_PATH, "0. Foundation spine coherence"),
                heading_ref(COHERENCE_PATH, "5. Frontend shell and interaction coherence"),
                heading_ref(CONTRACT_INTEGRITY_PATH, "Experience and presentation contract integrity"),
            ],
        },
        {
            "criterion_id": "cross_surface_reuse_without_runtime_leakage",
            "label": "Cross-surface reuse without runtime leakage",
            "weight": 10,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Web and native surfaces should share contracts, selectors, and route/runtime semantics without importing each other's UI runtimes or backend legality modules.",
            "source_refs": [
                heading_ref(FRONTEND_SHELL_PATH, "1. Shell families and object ownership"),
                heading_ref(MACOS_BLUEPRINT_PATH, "4. Platform translation map"),
                heading_ref(README_PATH, "Shared Spine Vocabulary"),
            ],
        },
        {
            "criterion_id": "native_and_web_coexistence_fit",
            "label": "Native and web coexistence fit",
            "weight": 10,
            "priority": "HARD_REQUIREMENT",
            "rationale": "The topology must respect the separate operator web, portal web, and native macOS embodiments already chosen in prior ADRs.",
            "source_refs": [
                heading_ref(FRONTEND_SHELL_PATH, "2. Route continuity and shell stability"),
                heading_ref(MACOS_BLUEPRINT_PATH, "3. Recommended Xcode workspace topology"),
                heading_ref(MACOS_BLUEPRINT_PATH, "13. Delivery sequencing"),
            ],
        },
        {
            "criterion_id": "testing_and_release_harness_fit",
            "label": "Testing and release harness fit",
            "weight": 10,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Testing fixtures, release evidence assembly, migration tooling, and contract guards need stable homes outside feature UI packages.",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "2. Promotion pipeline"),
                heading_ref(SECURITY_PATH, "8. Operational security release gates"),
                heading_ref(README_PATH, "Validation"),
            ],
        },
        {
            "criterion_id": "team_ownership_and_review_boundary_clarity",
            "label": "Team ownership and review boundary clarity",
            "weight": 10,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Package seams should imply review and ownership streams cleanly enough to support CODEOWNERS and later autonomous agent routing.",
            "source_refs": [
                heading_ref(README_PATH, "Blueprint Coverage And Acceptance Map"),
                heading_ref(COHERENCE_PATH, "7. One-sentence summary"),
                heading_ref(CONTRACT_INTEGRITY_PATH, "Manifest, lineage, and gate integrity"),
            ],
        },
        {
            "criterion_id": "autonomous_destination_clarity",
            "label": "Autonomous implementation destination clarity",
            "weight": 10,
            "priority": "HARD_REQUIREMENT",
            "rationale": "A later implementation agent should be able to pick a destination package from the task wording alone, without re-arguing structure.",
            "source_refs": [
                heading_ref(README_PATH, "Blueprint Coverage And Acceptance Map"),
                heading_ref(MODULES_PATH, "## BUILD_PRESEAL_GATE_EVALUATION(...)", "BUILD_PRESEAL_GATE_EVALUATION"),
                heading_ref(NORTHBOUND_PATH, "2. Required northbound surfaces"),
            ],
        },
        {
            "criterion_id": "onboarding_and_cognitive_load",
            "label": "Onboarding and cognitive load",
            "weight": 5,
            "priority": "TRADEOFF",
            "rationale": "The layout should be legible to humans and agents without collapsing into a giant app or exploding into an unreadable micro-package mesh.",
            "source_refs": [
                heading_ref(README_PATH, "What you get"),
                heading_ref(COHERENCE_PATH, "1. Lineage and continuation coherence"),
            ],
        },
        {
            "criterion_id": "build_graph_and_sprawl_manageability",
            "label": "Build graph and sprawl manageability",
            "weight": 5,
            "priority": "TRADEOFF",
            "rationale": "The package graph should stay strong enough to protect boundaries, but restrained enough that versioning, codegen, and review do not become an architecture tax.",
            "source_refs": [
                heading_ref(MACOS_BLUEPRINT_PATH, "3. Recommended Xcode workspace topology"),
                heading_ref(DEPLOYMENT_PATH, "7. Minimum operational runbooks"),
            ],
        },
    ]


def build_alternatives() -> list[dict[str, Any]]:
    return [
        {
            "alternative_id": SELECTED_TOPOLOGY_ID,
            "label": "Domain-oriented monorepo with restrained shared packages and edge apps",
            "summary": "Use a small number of strong domain and platform packages with four edge apps: control-plane API, operator web, client portal web, and native macOS.",
            "strengths": [
                "Aligns directly with the backlog's backend domain tracks, shared frontend platform work, native workspace split, and release/testing packs.",
                "Keeps schemas/generated types authoritative while still separating runtime domains, projectors, apps, and tooling.",
                "Makes ownership and CODEOWNERS boundaries practical without degenerating into one team per file.",
            ],
            "risks": [
                "Requires discipline to keep app-specific code in apps and not backfill it into shared packages.",
                "Package count is higher than an apps-only repo, so weak governance would still allow drift if not enforced.",
            ],
            "criterion_scores": {
                "contract_source_of_truth_clarity": {
                    "raw_score": 4.85,
                    "note": "A dedicated contracts source package plus one-way generated-model flow gives the clearest authority boundary.",
                },
                "cohesion_against_later_track_clusters": {
                    "raw_score": 4.75,
                    "note": "The phase 02-06 tracks map naturally into domain, projector, app, release, and test packages with little ambiguity.",
                },
                "dependency_direction_and_acyclicity": {
                    "raw_score": 4.7,
                    "note": "The layout supports a clean layered graph: contracts -> foundations -> domains -> projectors/runtime -> apps, with test/devx as controlled exceptions.",
                },
                "cross_surface_reuse_without_runtime_leakage": {
                    "raw_score": 4.65,
                    "note": "Web and native reuse shared contracts and runtime semantics, but their UI runtimes stay separate.",
                },
                "native_and_web_coexistence_fit": {
                    "raw_score": 4.75,
                    "note": "This matches ADR-006 and ADR-007 directly by keeping two web apps and one native app at the edges.",
                },
                "testing_and_release_harness_fit": {
                    "raw_score": 4.8,
                    "note": "Testing and release tooling get explicit homes instead of being stuffed into feature apps or backend runtime packages.",
                },
                "team_ownership_and_review_boundary_clarity": {
                    "raw_score": 4.6,
                    "note": "Ownership streams stay coherent: foundations, engine core, authority/workflow, control-plane runtime, web, native, and reliability/release.",
                },
                "autonomous_destination_clarity": {
                    "raw_score": 4.9,
                    "note": "Most later task slugs point to one obvious package family immediately.",
                },
                "onboarding_and_cognitive_load": {
                    "raw_score": 3.9,
                    "note": "There are enough packages to express the seams, but still far fewer than the number of domain tracks and surface variants in the roadmap.",
                },
                "build_graph_and_sprawl_manageability": {
                    "raw_score": 4.0,
                    "note": "The graph is larger than an apps-only repo, but manageable because the shared packages are broad and deliberate rather than tiny.",
                },
            },
        },
        {
            "alternative_id": "coarse_apps_only_monorepo",
            "label": "Coarse apps-only or thin-package monorepo",
            "summary": "Keep most logic inside app folders with only a very small contracts/utilities layer, leaving backend, web, native, testing, and release concerns largely app-local.",
            "strengths": [
                "Lower visible package count and simpler initial workspace mechanics.",
                "Can feel faster to start because teams change fewer folders and dependency rules are looser.",
            ],
            "risks": [
                "Backend legality, release tooling, and feature UI logic blur together quickly, especially for northbound, projector, and release tasks.",
                "Autonomous task routing becomes weak because many unrelated concerns land in the same app tree.",
            ],
            "criterion_scores": {
                "contract_source_of_truth_clarity": {
                    "raw_score": 2.45,
                    "note": "Thin shared layers tend to push schema consumers and generated code into app-local copies or convenience wrappers.",
                },
                "cohesion_against_later_track_clusters": {
                    "raw_score": 2.4,
                    "note": "The backlog's domain tracks are much more granular than an apps-only layout, so many tasks lose obvious destinations.",
                },
                "dependency_direction_and_acyclicity": {
                    "raw_score": 2.1,
                    "note": "App-local logic encourages import leakage across frontend, transport, and domain concerns.",
                },
                "cross_surface_reuse_without_runtime_leakage": {
                    "raw_score": 2.6,
                    "note": "Reuse often happens through direct app-to-app borrowing or informal shared folders rather than protected interfaces.",
                },
                "native_and_web_coexistence_fit": {
                    "raw_score": 2.55,
                    "note": "Separate web and native embodiments exist, but shared semantics are harder to stabilize when most logic is app-local.",
                },
                "testing_and_release_harness_fit": {
                    "raw_score": 2.35,
                    "note": "Testing and release code tend to end up scattered through apps and scripts rather than controlled packages.",
                },
                "team_ownership_and_review_boundary_clarity": {
                    "raw_score": 2.8,
                    "note": "CODEOWNERS can protect app folders, but cross-cutting backend/runtime ownership stays blurry.",
                },
                "autonomous_destination_clarity": {
                    "raw_score": 2.25,
                    "note": "Task wording like schema compatibility, projectors, or authority ingress does not map cleanly to one app folder.",
                },
                "onboarding_and_cognitive_load": {
                    "raw_score": 4.25,
                    "note": "The low package count is initially easy to explain.",
                },
                "build_graph_and_sprawl_manageability": {
                    "raw_score": 4.1,
                    "note": "Build graph management is easy because there are fewer packages, though the simplicity hides growing architectural drift.",
                },
            },
        },
        {
            "alternative_id": "highly_granular_micro_package_topology",
            "label": "Highly granular micro-package topology",
            "summary": "Create many narrow libraries, often one per subdomain, contract family, or frontend subsystem, with aggressive isolation and many tiny package boundaries.",
            "strengths": [
                "Can express fine-grained ownership and strict import control where the team has the appetite to manage it.",
                "Supports precise publication and change detection for narrow components.",
            ],
            "risks": [
                "Creates too much indirection for a repo that already has strong conceptual complexity in the algorithm corpus itself.",
                "Raises build, codegen, versioning, and review overhead without giving proportionate clarity for later agents.",
            ],
            "criterion_scores": {
                "contract_source_of_truth_clarity": {
                    "raw_score": 4.2,
                    "note": "It can preserve strong source-of-truth boundaries, but often splits the contracts layer more than the repo needs.",
                },
                "cohesion_against_later_track_clusters": {
                    "raw_score": 3.15,
                    "note": "The roadmap clusters are bigger than one-file or one-concept packages, so tasks would still need secondary routing logic.",
                },
                "dependency_direction_and_acyclicity": {
                    "raw_score": 3.4,
                    "note": "Strict import control is possible, but only at the cost of a much more complex graph.",
                },
                "cross_surface_reuse_without_runtime_leakage": {
                    "raw_score": 4.0,
                    "note": "Runtime leakage is controllable, though many boundaries become ceremony instead of meaningful seams.",
                },
                "native_and_web_coexistence_fit": {
                    "raw_score": 3.45,
                    "note": "It can model web/native splits, but the number of tiny platform packages becomes hard to keep coherent.",
                },
                "testing_and_release_harness_fit": {
                    "raw_score": 3.55,
                    "note": "Test and release tooling can be isolated, but coordinating them across many packages becomes expensive.",
                },
                "team_ownership_and_review_boundary_clarity": {
                    "raw_score": 3.1,
                    "note": "Ownership becomes precise but also fragmented, which weakens stream-level accountability.",
                },
                "autonomous_destination_clarity": {
                    "raw_score": 2.7,
                    "note": "Agents still need to decide among many near-neighbor packages, which reintroduces structural argument at implementation time.",
                },
                "onboarding_and_cognitive_load": {
                    "raw_score": 1.8,
                    "note": "The package count and indirection tax are too high for a repo that is already conceptually dense.",
                },
                "build_graph_and_sprawl_manageability": {
                    "raw_score": 1.6,
                    "note": "This is the worst option for workspace sprawl, codegen fanout, and CI graph complexity.",
                },
            },
        },
    ]


def build_scorecard(
    criteria: list[dict[str, Any]], alternatives: list[dict[str, Any]]
) -> dict[str, Any]:
    scored: list[dict[str, Any]] = []
    for alternative in alternatives:
        total = 0.0
        breakdown: list[dict[str, Any]] = []
        for criterion in criteria:
            score_entry = alternative["criterion_scores"][criterion["criterion_id"]]
            weighted = round(score_entry["raw_score"] * criterion["weight"] / 5, 2)
            total = round(total + weighted, 2)
            breakdown.append(
                {
                    "criterion_id": criterion["criterion_id"],
                    "label": criterion["label"],
                    "priority": criterion["priority"],
                    "weight": criterion["weight"],
                    "raw_score": score_entry["raw_score"],
                    "weighted_score": weighted,
                    "note": score_entry["note"],
                }
            )
        scored.append(
            {
                "alternative_id": alternative["alternative_id"],
                "label": alternative["label"],
                "summary": alternative["summary"],
                "strengths": alternative["strengths"],
                "risks": alternative["risks"],
                "criterion_breakdown": breakdown,
                "weighted_total": total,
            }
        )
    scored.sort(key=lambda item: (-item["weighted_total"], item["label"]))
    for rank, item in enumerate(scored, 1):
        item["rank"] = rank
    return {
        "generated_at": TODAY,
        "criteria": criteria,
        "alternatives": scored,
        "decision": {
            "selected_alternative_id": scored[0]["alternative_id"],
            "selected_label": scored[0]["label"],
            "selected_weighted_total": scored[0]["weighted_total"],
            "runner_up_alternative_id": scored[1]["alternative_id"],
            "runner_up_label": scored[1]["label"],
            "runner_up_weighted_total": scored[1]["weighted_total"],
        },
    }


def build_teams() -> list[dict[str, Any]]:
    return [
        {
            "team_id": "team_foundations_contracts",
            "handle": "@taxat/foundations-contracts",
            "label": "Foundations and Contracts",
            "mission": "Own canonical contract sources, generated-model flow, runtime primitives, and workspace developer tooling.",
        },
        {
            "team_id": "team_engine_core",
            "handle": "@taxat/engine-core",
            "label": "Engine Core",
            "mission": "Own core domain legality, access/session, manifest lineage, collection, and compute semantics.",
        },
        {
            "team_id": "team_authority_workflow",
            "handle": "@taxat/authority-workflow",
            "label": "Authority and Workflow",
            "mission": "Own authority gateway integration and workflow/collaboration coordination domains.",
        },
        {
            "team_id": "team_control_plane_runtime",
            "handle": "@taxat/control-plane-runtime",
            "label": "Control-Plane Runtime",
            "mission": "Own read-side projectors, northbound runtime, and the backend app composition surface.",
        },
        {
            "team_id": "team_web_experience",
            "handle": "@taxat/web-experience",
            "label": "Web Experience",
            "mission": "Own the shared web platform plus operator and portal browser apps.",
        },
        {
            "team_id": "team_native_experience",
            "handle": "@taxat/native-experience",
            "label": "Native Experience",
            "mission": "Own native shared platform packages and the signed macOS operator app.",
        },
        {
            "team_id": "team_reliability_release",
            "handle": "@taxat/reliability-release",
            "label": "Reliability and Release",
            "mission": "Own observability, release tooling, migration safety, and test harness infrastructure.",
        },
    ]


def build_packages() -> list[dict[str, Any]]:
    return [
        {
            "package_id": "contracts-core",
            "path": "packages/contracts-core",
            "package_type": "shared_foundation",
            "layer": 0,
            "owner_team_id": "team_foundations_contracts",
            "label": "Contracts Core",
            "responsibilities": [
                "Canonical JSON schemas, sample payloads, validator-owned source artifacts, and traceability metadata.",
                "Single source of truth for schema evolution and closed-world contract authority.",
            ],
            "generated_boundary_policy": "Authoritative source only; generated outputs are published outward but never edited here by consumers.",
            "source_refs": [
                heading_ref(README_PATH, "What you get"),
                heading_ref(README_PATH, "Validation"),
                heading_ref(CONTRACT_INTEGRITY_PATH, "Foundation spine integrity"),
            ],
            "allowed_dependencies": [],
            "forbidden_dependency_classes": [
                "all_app_packages",
                "all_ui_packages",
                "all_runtime_domain_packages",
            ],
            "future_task_clusters": ["phase_02_seq_060", "testing_schema_contract"],
        },
        {
            "package_id": "generated-models",
            "path": "packages/generated-models",
            "package_type": "shared_foundation",
            "layer": 1,
            "owner_team_id": "team_foundations_contracts",
            "label": "Generated Models",
            "responsibilities": [
                "Generated TypeScript-facing model bindings, schema version tags, and decode helpers.",
                "One-way output boundary from contracts-core into product/runtime consumers.",
            ],
            "generated_boundary_policy": "Generated from contracts-core; manual edits are prohibited.",
            "source_refs": [
                heading_ref(README_PATH, "What you get"),
                heading_ref(COHERENCE_PATH, "4. Schema, documentation, and example parity"),
                heading_ref(DEPLOYMENT_PATH, "3. Schema and datastore migration rules"),
            ],
            "allowed_dependencies": ["contracts-core"],
            "forbidden_dependency_classes": ["all_app_packages", "all_ui_packages"],
            "future_task_clusters": ["phase_02_seq_061", "phase_02_seq_081"],
        },
        {
            "package_id": "runtime-foundation",
            "path": "packages/runtime-foundation",
            "package_type": "shared_foundation",
            "layer": 2,
            "owner_team_id": "team_foundations_contracts",
            "label": "Runtime Foundation",
            "responsibilities": [
                "Environment/config loading, canonical identifiers, hashes, decimals, time, reference keys, and shared runtime primitives.",
                "Cross-runtime envelope, queue, object-store, stream, upload, cache-isolation, and feature-flag foundations.",
            ],
            "generated_boundary_policy": "May consume generated-model contracts but may not redefine business semantics from app or domain packages.",
            "source_refs": [
                heading_ref(README_PATH, "Shared Spine Vocabulary"),
                heading_ref(SECURITY_PATH, "6. Data protection, privacy, and cache safety"),
                heading_ref(NORTHBOUND_PATH, "3. Command envelope"),
            ],
            "allowed_dependencies": ["contracts-core", "generated-models"],
            "forbidden_dependency_classes": ["all_app_packages", "all_ui_packages", "projectors_and_apps"],
            "future_task_clusters": [
                "phase_02_seq_063",
                "phase_02_seq_064",
                "phase_02_seq_067",
                "phase_02_seq_069",
                "phase_02_seq_070",
                "phase_02_seq_071",
                "phase_02_seq_072",
                "phase_02_seq_073",
                "phase_02_seq_074",
            ],
        },
        {
            "package_id": "observability-audit",
            "path": "packages/observability-audit",
            "package_type": "shared_support",
            "layer": 2,
            "owner_team_id": "team_reliability_release",
            "label": "Observability and Audit",
            "responsibilities": [
                "Audit events, telemetry resource, traces, metrics, logs, query contracts, and failure/diagnostic scaffolds.",
                "Shared publication and correlation surfaces used by runtime domains without leaking app-specific UI.",
            ],
            "generated_boundary_policy": "May wrap generated observability contracts; may not depend on apps or feature UI code.",
            "source_refs": [
                heading_ref(OBSERVABILITY_PATH, "14.4 Mandatory correlation keys"),
                heading_ref(OBSERVABILITY_PATH, "14.5 Audit event contract"),
                heading_ref(OBSERVABILITY_PATH, "14.11 Query contracts"),
            ],
            "allowed_dependencies": ["contracts-core", "generated-models", "runtime-foundation"],
            "forbidden_dependency_classes": ["all_app_packages", "all_ui_packages"],
            "future_task_clusters": [
                "phase_02_seq_075",
                "phase_02_seq_076",
                "backend_retention_security_observability",
            ],
        },
        {
            "package_id": "domain-kernel",
            "path": "packages/domain-kernel",
            "package_type": "domain_core",
            "layer": 3,
            "owner_team_id": "team_engine_core",
            "label": "Domain Kernel",
            "responsibilities": [
                "Shared value objects, reason-code vocabularies, state helpers, invariants, and pure engine semantics reused across backend domains.",
                "The home for business rules too cross-cutting for one domain package but too important to leave in app or transport layers.",
            ],
            "generated_boundary_policy": "Consumes generated-model authority types but must stay renderer-free and transport-agnostic.",
            "source_refs": [
                heading_ref(MODULES_PATH, "## EVALUATE_GATE_CHAIN(...)", "EVALUATE_GATE_CHAIN"),
                heading_ref(CONTRACT_INTEGRITY_PATH, "Compute, trust, and amendment logic integrity"),
                heading_ref(COHERENCE_PATH, "0. Foundation spine coherence"),
            ],
            "allowed_dependencies": ["generated-models", "runtime-foundation"],
            "forbidden_dependency_classes": ["all_app_packages", "all_ui_packages", "transport_edges"],
            "future_task_clusters": ["phase_02_seq_064", "phase_02_seq_065"],
        },
        {
            "package_id": "access-session",
            "path": "packages/access-session",
            "package_type": "domain_runtime",
            "layer": 4,
            "owner_team_id": "team_engine_core",
            "label": "Access and Session",
            "responsibilities": [
                "Actor sessions, principal context, authorization, delegation, authority links, step-up, revocation, and access-view projection helpers.",
                "The only runtime domain package allowed to own access and identity legality.",
            ],
            "generated_boundary_policy": "May consume generated security/session contracts; must not import web or native UI runtimes.",
            "source_refs": [
                heading_ref(MODULES_PATH, "## AUTHORIZE(...)", "AUTHORIZE"),
                heading_ref(MODULES_PATH, "## VALIDATE_EFFECTIVE_SCOPE_BINDING(...)", "VALIDATE_EFFECTIVE_SCOPE_BINDING"),
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
            ],
            "allowed_dependencies": [
                "generated-models",
                "runtime-foundation",
                "observability-audit",
                "domain-kernel",
            ],
            "forbidden_dependency_classes": ["all_app_packages", "all_ui_packages", "authority_transport_through_browser"],
            "future_task_clusters": ["phase_02_seq_083", "backend_access"],
        },
        {
            "package_id": "manifest-replay",
            "path": "packages/manifest-replay",
            "package_type": "domain_runtime",
            "layer": 4,
            "owner_team_id": "team_engine_core",
            "label": "Manifest, Lineage, and Replay",
            "responsibilities": [
                "Run manifests, config freeze, lineage, replay, continuation, nightly batch identity, checkpoints, and recovery basis logic.",
                "Shared home for durable manifest/replay legality separate from UI and release orchestration shells.",
            ],
            "generated_boundary_policy": "May consume generated manifest/replay contracts; must not depend on apps or client rendering code.",
            "source_refs": [
                heading_ref(MODULES_PATH, "## BEGIN_MANIFEST(...)", "BEGIN_MANIFEST"),
                heading_ref(REPLAY_PATH, "Execution-basis freeze contract"),
                heading_ref(MANIFEST_PATH, "5.3 `RunManifest` required field groups"),
            ],
            "allowed_dependencies": [
                "generated-models",
                "runtime-foundation",
                "observability-audit",
                "domain-kernel",
            ],
            "forbidden_dependency_classes": ["all_app_packages", "all_ui_packages", "read_side_only_packages"],
            "future_task_clusters": ["backend_manifest", "backend_recovery"],
        },
        {
            "package_id": "collection-intake",
            "path": "packages/collection-intake",
            "package_type": "domain_runtime",
            "layer": 4,
            "owner_team_id": "team_engine_core",
            "label": "Collection and Intake",
            "responsibilities": [
                "Source plans, collection runs, evidence items, fact extraction, conflict handling, canonical promotion, and late-data logic.",
                "Durable intake and artifact-contract boundary separate from compute and UI.",
            ],
            "generated_boundary_policy": "Consumes generated source/evidence contracts; must not import projectors or UI runtimes.",
            "source_refs": [
                heading_ref(MODULES_PATH, "## PLAN_SOURCE_COLLECTION(...)", "PLAN_SOURCE_COLLECTION"),
                heading_ref(MODULES_PATH, "## EXTRACT_CANDIDATE_FACTS(...)", "EXTRACT_CANDIDATE_FACTS"),
                heading_ref(CONTRACT_INTEGRITY_PATH, "Decision artifacts, evidence, and data-model integrity"),
            ],
            "allowed_dependencies": [
                "generated-models",
                "runtime-foundation",
                "observability-audit",
                "domain-kernel",
                "manifest-replay",
            ],
            "forbidden_dependency_classes": ["all_app_packages", "all_ui_packages", "read_side_only_packages"],
            "future_task_clusters": ["backend_collection"],
        },
        {
            "package_id": "compute-engine",
            "path": "packages/compute-engine",
            "package_type": "domain_runtime",
            "layer": 4,
            "owner_team_id": "team_engine_core",
            "label": "Compute Engine",
            "responsibilities": [
                "Formula engine, parity, trust, decision bundles, provenance graph, proof bundles, enquiry packs, and twin-view semantics.",
                "Pure and semi-pure compute paths kept out of transport and UI packages.",
            ],
            "generated_boundary_policy": "Consumes generated compute and proof contracts; must not import apps or renderer-specific concerns.",
            "source_refs": [
                heading_ref(MODULES_PATH, "## EVALUATE_GATE_CHAIN(...)", "EVALUATE_GATE_CHAIN"),
                heading_ref(MODULES_PATH, "## PERSIST_DECISION_BUNDLE(...)", "PERSIST_DECISION_BUNDLE"),
                heading_ref(CONTRACT_INTEGRITY_PATH, "Compute, trust, and amendment logic integrity"),
            ],
            "allowed_dependencies": [
                "generated-models",
                "runtime-foundation",
                "observability-audit",
                "domain-kernel",
                "manifest-replay",
                "collection-intake",
            ],
            "forbidden_dependency_classes": ["all_app_packages", "all_ui_packages", "transport_edges"],
            "future_task_clusters": ["backend_compute"],
        },
        {
            "package_id": "authority-gateway",
            "path": "packages/authority-gateway",
            "package_type": "domain_runtime",
            "layer": 4,
            "owner_team_id": "team_authority_workflow",
            "label": "Authority Gateway",
            "responsibilities": [
                "Authority bindings, request/response envelopes, token/client validation, fraud headers, ingress receipts, and reconciliation control.",
                "The only package family allowed to own provider transport behavior.",
            ],
            "generated_boundary_policy": "May consume generated authority contracts; must never depend on browser/native UI or read-side-only packages.",
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.3 Core protocol objects"),
                heading_ref(AUTHORITY_PATH, "9.6 Token and client binding rule"),
                heading_ref(AUTHORITY_PATH, "9.9A Inbound authority ingress protocol"),
            ],
            "allowed_dependencies": [
                "generated-models",
                "runtime-foundation",
                "observability-audit",
                "domain-kernel",
                "access-session",
                "manifest-replay",
            ],
            "forbidden_dependency_classes": ["all_app_packages", "all_ui_packages", "read_side_only_packages"],
            "future_task_clusters": ["backend_authority"],
        },
        {
            "package_id": "workflow-collaboration",
            "path": "packages/workflow-collaboration",
            "package_type": "domain_runtime",
            "layer": 4,
            "owner_team_id": "team_authority_workflow",
            "label": "Workflow and Collaboration",
            "responsibilities": [
                "Workflow items, collaboration threads, attachments, notifications, queue health, remediation, and accepted-risk/failure closure records.",
                "Customer-visible workflow semantics stay separate from transport, apps, and authority transport internals.",
            ],
            "generated_boundary_policy": "Consumes generated workflow/collaboration contracts; must not import read-side rendering or app shells.",
            "source_refs": [
                heading_ref(COLLABORATION_PATH, "7. Data model and schema additions"),
                heading_ref(COLLABORATION_PATH, "8. Command and read API additions"),
                heading_ref(COLLABORATION_PATH, "10. Audit event model"),
            ],
            "allowed_dependencies": [
                "generated-models",
                "runtime-foundation",
                "observability-audit",
                "domain-kernel",
                "access-session",
                "manifest-replay",
                "authority-gateway",
            ],
            "forbidden_dependency_classes": ["all_app_packages", "all_ui_packages", "read_side_only_packages"],
            "future_task_clusters": ["backend_workflow"],
        },
        {
            "package_id": "read-model-projectors",
            "path": "packages/read-model-projectors",
            "package_type": "projection_runtime",
            "layer": 5,
            "owner_team_id": "team_control_plane_runtime",
            "label": "Read-Model Projectors",
            "responsibilities": [
                "Server-authored route/scene read models, customer-safe projection fences, low-noise frames, portal/governance projections, and native mirrors.",
                "The only shared package family allowed to translate backend truth into route-facing read models.",
            ],
            "generated_boundary_policy": "Consumes generated read-model contracts; must not import web or native renderer code.",
            "source_refs": [
                heading_ref(FRONTEND_SHELL_PATH, "2. Route continuity and shell stability"),
                heading_ref(PORTAL_PATH, "479:## Read-model and API translation requirements".split(":",1)[1], "Read-model and API translation requirements"),
                heading_ref(GOVERNANCE_PATH, "7. Frontend systems architecture"),
            ],
            "allowed_dependencies": [
                "generated-models",
                "runtime-foundation",
                "observability-audit",
                "domain-kernel",
                "access-session",
                "manifest-replay",
                "collection-intake",
                "compute-engine",
                "authority-gateway",
                "workflow-collaboration",
            ],
            "forbidden_dependency_classes": ["all_app_packages", "all_ui_packages", "authority_transport_edges"],
            "future_task_clusters": [
                "backend_low_noise",
                "backend_portal",
                "backend_governance",
            ],
        },
        {
            "package_id": "northbound-runtime",
            "path": "packages/northbound-runtime",
            "package_type": "transport_runtime",
            "layer": 6,
            "owner_team_id": "team_control_plane_runtime",
            "label": "Northbound Runtime",
            "responsibilities": [
                "Commands, receipts, snapshots, SSE/resume/rebase, stale-view protection, upload-session APIs, and session-aware transport runtime.",
                "Transport and orchestration boundary between apps/clients and domain/projector packages.",
            ],
            "generated_boundary_policy": "Consumes generated API/session contracts; must not import app shell code.",
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "2. Required northbound surfaces"),
                heading_ref(NORTHBOUND_PATH, "3. Command envelope"),
                heading_ref(NORTHBOUND_PATH, "7. Stream and reconnect rules"),
            ],
            "allowed_dependencies": [
                "generated-models",
                "runtime-foundation",
                "observability-audit",
                "domain-kernel",
                "access-session",
                "manifest-replay",
                "collection-intake",
                "compute-engine",
                "authority-gateway",
                "workflow-collaboration",
                "read-model-projectors",
            ],
            "forbidden_dependency_classes": ["all_app_packages", "all_ui_packages", "testing_as_runtime"],
            "future_task_clusters": ["backend_northbound"],
        },
        {
            "package_id": "web-platform",
            "path": "packages/web-platform",
            "package_type": "experience_platform",
            "layer": 6,
            "owner_team_id": "team_web_experience",
            "label": "Web Platform",
            "responsibilities": [
                "Shared design tokens, selector grammar, interaction-layer foundation, route/runtime helpers, browser state containers, command clients, and accessibility/runtime primitives.",
                "Cross-shell web platform reused by operator-web and client-portal-web without importing backend domain code.",
            ],
            "generated_boundary_policy": "Consumes generated models and route/selector contracts; may not import backend domain, projector, or authority packages.",
            "source_refs": [
                heading_ref(FRONTEND_SHELL_PATH, "10. Automation anchors and UI observability fencing"),
                heading_ref(FRONTEND_SHELL_PATH, "8. Accessibility, focus, and motion"),
                heading_ref(README_PATH, "Shared Spine Vocabulary"),
            ],
            "allowed_dependencies": ["contracts-core", "generated-models", "runtime-foundation"],
            "forbidden_dependency_classes": ["all_backend_domain_packages", "apps_control_plane_api", "native_platform"],
            "future_task_clusters": ["frontend_shared"],
        },
        {
            "package_id": "native-platform",
            "path": "packages/native-platform",
            "package_type": "experience_platform",
            "layer": 6,
            "owner_team_id": "team_native_experience",
            "label": "Native Platform",
            "responsibilities": [
                "Swift package layer for OperatorDomain, PlatformSDK, Persistence, UI, DesktopKit, Diagnostics, and FeatureFlags.",
                "Native session, cache hydration, SSE consumption, window/scene law, and desktop-specific adapters separate from web runtimes.",
            ],
            "generated_boundary_policy": "Consumes generated contracts and shared runtime semantics; may not import web-platform or backend runtime packages directly.",
            "source_refs": [
                heading_ref(MACOS_BLUEPRINT_PATH, "3. Recommended Xcode workspace topology"),
                heading_ref(MACOS_BLUEPRINT_PATH, "6. Data flow and synchronization model"),
                heading_ref(MACOS_BLUEPRINT_PATH, "8. Persistence model"),
            ],
            "allowed_dependencies": ["contracts-core", "generated-models", "runtime-foundation"],
            "forbidden_dependency_classes": ["all_backend_domain_packages", "web_platform", "browser_ui_packages"],
            "future_task_clusters": ["frontend_native"],
        },
        {
            "package_id": "release-tooling",
            "path": "packages/release-tooling",
            "package_type": "support_runtime",
            "layer": 6,
            "owner_team_id": "team_reliability_release",
            "label": "Release and Migration Tooling",
            "responsibilities": [
                "Schema migration ledgers, compatibility gate evaluation, verification manifest assembly, client compatibility matrix generation, release candidate evidence, and deployment governance automation.",
                "Release-time and migration-time tooling kept separate from feature UI packages and ordinary domain apps.",
            ],
            "generated_boundary_policy": "Consumes generated release/migration contracts; may depend on backend domain outputs but not on app shell code.",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "2. Promotion pipeline"),
                heading_ref(DEPLOYMENT_PATH, "3. Schema and datastore migration rules"),
                heading_ref(SECURITY_PATH, "8. Operational security release gates"),
            ],
            "allowed_dependencies": [
                "contracts-core",
                "generated-models",
                "runtime-foundation",
                "observability-audit",
                "manifest-replay",
                "authority-gateway",
                "northbound-runtime",
            ],
            "forbidden_dependency_classes": ["all_app_packages", "all_ui_packages", "testing_as_runtime"],
            "future_task_clusters": ["backend_release_resilience", "phase_02_seq_066", "phase_02_seq_080", "phase_02_seq_084"],
        },
        {
            "package_id": "testing-harnesses",
            "path": "packages/testing-harnesses",
            "package_type": "support_runtime",
            "layer": 7,
            "owner_team_id": "team_reliability_release",
            "label": "Testing Harnesses",
            "responsibilities": [
                "Deterministic fixtures, Playwright helpers, native automation packs, schema regression packs, integration sandboxes, and acceptance orchestration.",
                "The only package family allowed to span multiple layers for test-only composition.",
            ],
            "generated_boundary_policy": "May consume generated contracts and exported public APIs from any package or app; production packages may never depend on it.",
            "source_refs": [
                heading_ref(README_PATH, "Validation"),
                heading_ref(FRONTEND_SHELL_PATH, "10. Automation anchors and UI observability fencing"),
                heading_ref(DEPLOYMENT_PATH, "2. Promotion pipeline"),
            ],
            "allowed_dependencies": [
                "contracts-core",
                "generated-models",
                "runtime-foundation",
                "observability-audit",
                "domain-kernel",
                "access-session",
                "manifest-replay",
                "collection-intake",
                "compute-engine",
                "authority-gateway",
                "workflow-collaboration",
                "read-model-projectors",
                "northbound-runtime",
                "web-platform",
                "native-platform",
                "apps/control-plane-api",
                "apps/operator-web",
                "apps/client-portal-web",
                "apps/internal-operator-macos",
                "release-tooling",
            ],
            "forbidden_dependency_classes": ["no_production_importers"],
            "future_task_clusters": ["testing_schema_contract", "testing_engine_modules", "testing_state_machine_model", "testing_api_northbound", "testing_authority_integration", "testing_frontend_regression", "testing_performance_failure_security", "testing_release_acceptance"],
        },
        {
            "package_id": "workspace-devx",
            "path": "tools/workspace-devx",
            "package_type": "support_runtime",
            "layer": 7,
            "owner_team_id": "team_foundations_contracts",
            "label": "Workspace DevX",
            "responsibilities": [
                "Task runners, codegen orchestration, lint/format hooks, docs generation, local-dev bootstrap, and ephemeral environment utilities.",
                "Root-level workspace mechanics kept out of production packages.",
            ],
            "generated_boundary_policy": "May consume any package for build/test/codegen orchestration; nothing in production runtime imports it.",
            "source_refs": [
                heading_ref(README_PATH, "Validation"),
                heading_ref(DEPLOYMENT_PATH, "7. Minimum operational runbooks"),
                heading_ref(COHERENCE_PATH, "4. Schema, documentation, and example parity"),
            ],
            "allowed_dependencies": [
                "contracts-core",
                "generated-models",
                "runtime-foundation",
                "observability-audit",
                "domain-kernel",
                "access-session",
                "manifest-replay",
                "collection-intake",
                "compute-engine",
                "authority-gateway",
                "workflow-collaboration",
                "read-model-projectors",
                "northbound-runtime",
                "web-platform",
                "native-platform",
                "testing-harnesses",
                "release-tooling",
                "apps/control-plane-api",
                "apps/operator-web",
                "apps/client-portal-web",
                "apps/internal-operator-macos",
            ],
            "forbidden_dependency_classes": ["no_production_importers"],
            "future_task_clusters": ["phase_02_seq_059", "phase_02_seq_062", "phase_02_seq_078", "phase_02_seq_079", "phase_02_seq_082"],
        },
        {
            "package_id": "apps/control-plane-api",
            "path": "apps/control-plane-api",
            "package_type": "app",
            "layer": 8,
            "owner_team_id": "team_control_plane_runtime",
            "label": "Control-Plane API App",
            "responsibilities": [
                "Compose backend runtime packages into the deployable API, worker, scheduler, and controlled runtime entrypoints.",
                "Leaf app for backend deployment; no reusable business logic should be authored here when it belongs in packages.",
            ],
            "generated_boundary_policy": "Consumes generated contracts only through packages; app-specific wiring stays here.",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "1. Reference runtime topology"),
                heading_ref(NORTHBOUND_PATH, "2. Required northbound surfaces"),
                heading_ref(DEPLOYMENT_PATH, "7. Minimum operational runbooks"),
            ],
            "allowed_dependencies": [
                "generated-models",
                "runtime-foundation",
                "observability-audit",
                "domain-kernel",
                "access-session",
                "manifest-replay",
                "collection-intake",
                "compute-engine",
                "authority-gateway",
                "workflow-collaboration",
                "read-model-projectors",
                "northbound-runtime",
                "release-tooling",
            ],
            "forbidden_dependency_classes": ["other_apps", "web_platform", "native_platform", "testing_as_runtime"],
            "future_task_clusters": ["backend_northbound", "backend_release_resilience"],
        },
        {
            "package_id": "apps/operator-web",
            "path": "apps/operator-web",
            "package_type": "app",
            "layer": 8,
            "owner_team_id": "team_web_experience",
            "label": "Operator Web App",
            "responsibilities": [
                "Own CALM_SHELL and GOVERNANCE_DENSITY_SHELL browser composition, route modules, and app-local operator/governance UI.",
                "Leaf browser app that depends on the shared web platform but does not redefine backend legality.",
            ],
            "generated_boundary_policy": "Consumes generated models and web-platform exports only; route business rules remain server-authored.",
            "source_refs": [
                heading_ref(FRONTEND_SHELL_PATH, "1. Shell families and object ownership"),
                heading_ref(GOVERNANCE_PATH, "4. Information architecture and route map"),
                heading_ref(COLLABORATION_PATH, "2. Screen map"),
            ],
            "allowed_dependencies": ["generated-models", "web-platform"],
            "forbidden_dependency_classes": ["all_backend_domain_packages", "control_plane_app", "client_portal_app", "native_platform"],
            "future_task_clusters": ["frontend_low_noise", "frontend_collaboration", "frontend_governance"],
        },
        {
            "package_id": "apps/client-portal-web",
            "path": "apps/client-portal-web",
            "package_type": "app",
            "layer": 8,
            "owner_team_id": "team_web_experience",
            "label": "Client Portal Web App",
            "responsibilities": [
                "Own CLIENT_PORTAL_SHELL browser composition, route modules, customer-safe copy, and app-local portal UI.",
                "Leaf browser app that must stay customer-safe and separate from operator/governance internals.",
            ],
            "generated_boundary_policy": "Consumes generated models and web-platform exports only; customer-safe semantics remain server-authored.",
            "source_refs": [
                heading_ref(PORTAL_PATH, "Navigation contract"),
                heading_ref(PORTAL_PATH, "Route architecture"),
                heading_ref(PORTAL_PATH, "Read-model and API translation requirements"),
            ],
            "allowed_dependencies": ["generated-models", "web-platform"],
            "forbidden_dependency_classes": ["all_backend_domain_packages", "control_plane_app", "operator_web_app", "native_platform"],
            "future_task_clusters": ["frontend_portal"],
        },
        {
            "package_id": "apps/internal-operator-macos",
            "path": "apps/internal-operator-macos",
            "package_type": "app",
            "layer": 8,
            "owner_team_id": "team_native_experience",
            "label": "Internal Operator macOS App",
            "responsibilities": [
                "Own the signed/notarized Xcode workspace target and app-specific scene composition for the native operator workspace.",
                "Leaf native app that depends on native-platform packages but not on web UI packages or backend domain runtimes directly.",
            ],
            "generated_boundary_policy": "Consumes generated contracts and native-platform exports only.",
            "source_refs": [
                heading_ref(MACOS_BLUEPRINT_PATH, "3. Recommended Xcode workspace topology"),
                heading_ref(MACOS_BLUEPRINT_PATH, "5. Preferred window and scene architecture"),
                heading_ref(MACOS_BLUEPRINT_PATH, "13. Delivery sequencing"),
            ],
            "allowed_dependencies": ["generated-models", "native-platform"],
            "forbidden_dependency_classes": ["all_backend_domain_packages", "web_platform", "other_apps", "testing_as_runtime"],
            "future_task_clusters": ["frontend_native"],
        },
    ]


def parse_later_tasks() -> list[dict[str, Any]]:
    tasks: list[dict[str, Any]] = []
    for line in CHECKLIST_PATH.read_text().splitlines():
        match = TASK_RE.search(line)
        if not match:
            continue
        task_id, slug = match.groups()
        phase_match = re.search(r"phase_(\d{2})_", slug)
        if phase_match is None:
            continue
        phase = int(phase_match.group(1))
        if phase < 2 or phase > 6:
            continue
        tasks.append(
            {
                "task_id": task_id,
                "slug": slug,
                "phase": phase,
                "title_slug": slug.split("_", 4)[-1],
            }
        )
    return tasks


PHASE02_TASK_MAP: dict[str, list[str]] = {
    "pc_0059": ["workspace-devx"],
    "pc_0060": ["contracts-core"],
    "pc_0061": ["generated-models"],
    "pc_0062": ["workspace-devx"],
    "pc_0063": ["runtime-foundation"],
    "pc_0064": ["runtime-foundation", "domain-kernel"],
    "pc_0065": ["runtime-foundation"],
    "pc_0066": ["release-tooling", "contracts-core"],
    "pc_0067": ["runtime-foundation"],
    "pc_0068": ["northbound-runtime", "runtime-foundation"],
    "pc_0069": ["runtime-foundation"],
    "pc_0070": ["runtime-foundation"],
    "pc_0071": ["runtime-foundation"],
    "pc_0072": ["runtime-foundation"],
    "pc_0073": ["runtime-foundation"],
    "pc_0074": ["runtime-foundation"],
    "pc_0075": ["observability-audit"],
    "pc_0076": ["observability-audit"],
    "pc_0077": ["testing-harnesses"],
    "pc_0078": ["workspace-devx"],
    "pc_0079": ["workspace-devx", "testing-harnesses"],
    "pc_0080": ["release-tooling", "contracts-core"],
    "pc_0081": ["contracts-core", "workspace-devx"],
    "pc_0082": ["workspace-devx"],
    "pc_0083": ["access-session"],
    "pc_0084": ["release-tooling"],
}


TRACK_PACKAGE_RULES: list[tuple[str, list[str]]] = [
    ("_track_backend_access_", ["access-session"]),
    ("_track_backend_manifest_", ["manifest-replay"]),
    ("_track_backend_collection_", ["collection-intake"]),
    ("_track_backend_compute_", ["compute-engine"]),
    ("_track_backend_authority_", ["authority-gateway"]),
    ("_track_backend_workflow_", ["workflow-collaboration"]),
    ("_track_backend_northbound_", ["northbound-runtime"]),
    ("_track_backend_low_noise_", ["read-model-projectors"]),
    ("_track_backend_portal_", ["read-model-projectors"]),
    ("_track_backend_governance_", ["read-model-projectors"]),
    ("_track_backend_recovery_", ["manifest-replay"]),
    ("_track_backend_retention_security_observability_", ["observability-audit"]),
    ("_track_backend_release_resilience_", ["release-tooling"]),
    ("_track_frontend_shared_", ["web-platform"]),
    ("_track_frontend_low_noise_", ["apps/operator-web", "web-platform"]),
    ("_track_frontend_portal_", ["apps/client-portal-web", "web-platform"]),
    ("_track_frontend_collaboration_", ["apps/operator-web", "web-platform"]),
    ("_track_frontend_governance_", ["apps/operator-web", "web-platform"]),
    ("_track_frontend_native_", ["apps/internal-operator-macos", "native-platform"]),
    ("_track_testing_schema_contract_", ["testing-harnesses", "contracts-core"]),
    ("_track_testing_engine_modules_", ["testing-harnesses"]),
    ("_track_testing_state_machine_model_", ["testing-harnesses"]),
    ("_track_testing_api_northbound_", ["testing-harnesses", "northbound-runtime"]),
    ("_track_testing_authority_integration_", ["testing-harnesses", "authority-gateway"]),
    ("_track_testing_frontend_regression_", ["testing-harnesses", "web-platform"]),
    ("_track_testing_performance_failure_security_", ["testing-harnesses"]),
    ("_track_testing_release_acceptance_", ["testing-harnesses", "apps/control-plane-api"]),
]


def infer_packages_for_task(task: dict[str, Any]) -> list[str]:
    if task["phase"] == 2:
        packages = PHASE02_TASK_MAP.get(task["task_id"])
        if packages is None:
            raise ValueError(f"Missing phase 02 package map for {task['task_id']}")
        return packages
    packages: list[str] = []
    slug = task["slug"]
    for needle, package_ids in TRACK_PACKAGE_RULES:
        if needle in slug:
            packages.extend(package_ids)
            break
    if not packages:
        raise ValueError(f"No package rule matched task {task['task_id']} ({slug})")

    # Keyword-based secondaries keep track-level mapping deterministic without exploding package count.
    keyword_rules = [
        (["release_candidate", "deployment_release", "restore_drill", "client_compatibility_matrix", "schema_bundle_compatibility", "release_verification_manifest"], ["release-tooling"]),
        (["audit_", "trace_", "metric_", "failure_", "operator_morning_digest", "erasure", "secret_version", "security_"], ["observability-audit"]),
        (["cache_isolation", "native_cache_hydration", "cross_device_continuity", "shell_continuity", "semantic_accessibility", "focus_restore", "upload_session_recovery"], ["testing-harnesses"]),
        (["workflow", "collaboration", "customer_safe_projection", "request_info", "work_item", "queue_health"], ["workflow-collaboration"]),
        (["authority_", "hmrc_", "fraud_prevention", "reconciliation", "submission_truth"], ["authority-gateway"]),
        (["manifest_", "replay", "nightly_", "continuity", "checkpoint", "schema_reader_window"], ["manifest-replay"]),
        (["compute_", "parity", "trust_", "provenance", "proof_bundle", "twin_"], ["compute-engine"]),
        (["portal_", "customer_request", "approval_pack", "onboarding", "help_handoff"], ["apps/client-portal-web"]),
        (["governance_", "role_template", "principal_access", "authority_links", "retention_route", "audit_investigation"], ["apps/operator-web"]),
        (["native_", "swiftui", "appkit", "xcode_workspace", "system_browser_authentication"], ["native-platform", "apps/internal-operator-macos"]),
        (["command_receipt", "snapshot_endpoint", "stream_", "sse_", "problem_envelope", "post_commands", "upload_session_allocate"], ["northbound-runtime"]),
        (["low_noise", "interaction_layer", "selector", "reduced_motion", "focus_", "same_object"], ["web-platform"]),
    ]
    for needles, package_ids in keyword_rules:
        if any(needle in slug for needle in needles):
            packages.extend(package_ids)

    return ordered_unique(packages)


def build_later_task_to_package_map(
    packages: list[dict[str, Any]], teams: list[dict[str, Any]]
) -> dict[str, Any]:
    package_lookup = {package["package_id"]: package for package in packages}
    team_lookup = {team["team_id"]: team for team in teams}
    tasks = parse_later_tasks()
    rows: list[dict[str, Any]] = []
    for task in tasks:
        package_ids = infer_packages_for_task(task)
        primary_package_id = package_ids[0]
        owner_team_id = package_lookup[primary_package_id]["owner_team_id"]
        rows.append(
            {
                "task_id": task["task_id"],
                "slug": task["slug"],
                "phase": f"phase_{task['phase']:02d}",
                "primary_package_id": primary_package_id,
                "secondary_package_ids": package_ids[1:],
                "owner_team_id": owner_team_id,
                "owner_team_handle": team_lookup[owner_team_id]["handle"],
            }
        )
    if len(rows) != 333:
        raise ValueError(f"Expected 333 later tasks, found {len(rows)}")
    package_counts = Counter(row["primary_package_id"] for row in rows)
    team_counts = Counter(row["owner_team_id"] for row in rows)
    phase_counts = Counter(row["phase"] for row in rows)
    return {
        "contract_version": TODAY,
        "selected_topology_id": SELECTED_TOPOLOGY_ID,
        "summary": {
            "later_task_count": len(rows),
            "phase_counts": dict(sorted(phase_counts.items())),
            "package_coverage_count": len(package_counts),
            "team_coverage_count": len(team_counts),
            "unmapped_task_count": 0,
        },
        "package_primary_task_counts": dict(sorted(package_counts.items())),
        "team_primary_task_counts": dict(sorted(team_counts.items())),
        "rows": rows,
    }


def build_package_boundary_matrix(
    packages: list[dict[str, Any]],
    task_map: dict[str, Any],
) -> dict[str, Any]:
    task_rows = task_map["rows"]
    primary_counts = Counter(row["primary_package_id"] for row in task_rows)
    secondary_counts = Counter(
        package_id for row in task_rows for package_id in row["secondary_package_ids"]
    )
    rows = []
    for package in packages:
        rows.append(
            {
                "package_id": package["package_id"],
                "path": package["path"],
                "package_type": package["package_type"],
                "layer": package["layer"],
                "owner_team_id": package["owner_team_id"],
                "label": package["label"],
                "responsibilities": package["responsibilities"],
                "generated_boundary_policy": package["generated_boundary_policy"],
                "source_refs": package["source_refs"],
                "allowed_dependencies": package["allowed_dependencies"],
                "forbidden_dependency_classes": package["forbidden_dependency_classes"],
                "future_task_clusters": package["future_task_clusters"],
                "primary_task_count": primary_counts[package["package_id"]],
                "secondary_task_count": secondary_counts[package["package_id"]],
            }
        )
    return {
        "contract_version": TODAY,
        "selected_topology_id": SELECTED_TOPOLOGY_ID,
        "summary": {
            "package_count": len(rows),
            "app_count": len([row for row in rows if row["package_type"] == "app"]),
            "shared_package_count": len([row for row in rows if row["package_type"] != "app"]),
            "owner_team_count": len(ordered_unique(row["owner_team_id"] for row in rows)),
            "task_coverage_count": task_map["summary"]["later_task_count"],
        },
        "rows": rows,
        "typed_gaps_or_deferred_decisions": [
            {
                "id": "workspace_manager_tool_choice_deferred",
                "type": "DEFERRED_DECISION",
                "summary": "The package boundary map fixes the workspace shape and ownership seams, but not the final package manager, task graph tool, or remote cache product.",
            },
            {
                "id": "shared_operating_contract_0022_0029_missing",
                "type": "SOURCE_GAP",
                "summary": "The referenced shared operating contract for cards 0022 through 0029 is absent, so this package map is grounded directly in named algorithm contracts, the checklist, and prior ADR outputs.",
            },
        ],
    }


def build_package_dependency_rules(packages: list[dict[str, Any]]) -> dict[str, Any]:
    package_lookup = {package["package_id"]: package for package in packages}
    production_packages = [
        package["package_id"]
        for package in packages
        if package["package_id"] not in {"testing-harnesses", "workspace-devx"}
    ]
    production_edges: dict[str, list[str]] = {
        package["package_id"]: [
            dep for dep in package["allowed_dependencies"] if dep in production_packages
        ]
        for package in packages
        if package["package_id"] in production_packages
    }

    visiting: set[str] = set()
    visited: set[str] = set()
    cycles: list[list[str]] = []

    def dfs(node: str, stack: list[str]) -> None:
        if node in visiting:
            cycle_start = stack.index(node)
            cycles.append(stack[cycle_start:] + [node])
            return
        if node in visited:
            return
        visiting.add(node)
        for dep in production_edges.get(node, []):
            dfs(dep, stack + [dep])
        visiting.remove(node)
        visited.add(node)

    for node in production_edges:
        dfs(node, [node])
    if cycles:
        raise ValueError(f"Production dependency graph has cycles: {cycles}")

    layers: dict[int, list[str]] = defaultdict(list)
    for package in packages:
        layers[package["layer"]].append(package["package_id"])
    topological_layers = [
        {"layer": layer, "package_ids": sorted(package_ids)}
        for layer, package_ids in sorted(layers.items())
    ]

    rules = []
    for package in packages:
        rules.append(
            {
                "package_id": package["package_id"],
                "package_type": package["package_type"],
                "layer": package["layer"],
                "allowed_dependencies": package["allowed_dependencies"],
                "forbidden_dependency_classes": package["forbidden_dependency_classes"],
                "is_leaf_app": package["package_type"] == "app",
            }
        )

    return {
        "contract_version": TODAY,
        "selected_topology_id": SELECTED_TOPOLOGY_ID,
        "summary": {
            "package_count": len(packages),
            "production_package_count": len(production_packages),
            "production_edge_count": sum(len(edges) for edges in production_edges.values()),
            "production_cycle_count": len(cycles),
            "topological_layer_count": len(topological_layers),
        },
        "topological_layers": topological_layers,
        "production_dependency_rules": rules,
        "special_span_rules": [
            {
                "package_id": "testing-harnesses",
                "rule": "Testing harnesses may depend on exported public APIs from any package or app, but no production package may depend on testing-harnesses.",
            },
            {
                "package_id": "workspace-devx",
                "rule": "Workspace DevX may orchestrate any package for build, codegen, docs, lint, and local-dev flows, but production runtime packages may not import it.",
            },
        ],
        "global_guardrails": [
            "contracts-core is the single source of truth for schemas and validator-owned payloads",
            "generated-models is a one-way generated output boundary from contracts-core",
            "web-platform and native-platform may share contracts and semantic grammars, but not each other's runtime UI code",
            "authority-gateway may not depend on browser/native UI packages or read-side-only packages",
            "release-tooling may not depend on app shells",
            "apps are leaf composition surfaces; reusable logic belongs in packages",
        ],
    }


def build_team_ownership_map(
    teams: list[dict[str, Any]],
    packages: list[dict[str, Any]],
    task_map: dict[str, Any],
) -> dict[str, Any]:
    package_lookup = {package["package_id"]: package for package in packages}
    task_rows = task_map["rows"]
    primary_by_team = Counter(row["owner_team_id"] for row in task_rows)
    rows = []
    for team in teams:
        owned_packages = [
            package["package_id"]
            for package in packages
            if package["owner_team_id"] == team["team_id"]
        ]
        rows.append(
            {
                "team_id": team["team_id"],
                "handle": team["handle"],
                "label": team["label"],
                "mission": team["mission"],
                "owned_packages": owned_packages,
                "primary_task_count": primary_by_team[team["team_id"]],
                "required_review_packages": owned_packages,
                "collaboration_packages": [
                    package_id
                    for package_id in owned_packages
                    if package_lookup[package_id]["package_type"] != "app"
                ],
            }
        )
    return {
        "contract_version": TODAY,
        "selected_topology_id": SELECTED_TOPOLOGY_ID,
        "summary": {
            "team_count": len(rows),
            "owned_package_count": len(packages),
            "later_task_count": task_map["summary"]["later_task_count"],
        },
        "rows": rows,
    }


def build_codeowners_draft(
    teams: list[dict[str, Any]], packages: list[dict[str, Any]]
) -> dict[str, Any]:
    team_lookup = {team["team_id"]: team for team in teams}
    rules = []
    for package in packages:
        owners = [team_lookup[package["owner_team_id"]]["handle"]]
        secondary_reviewers: list[str] = []
        if package["package_id"] in {"contracts-core", "generated-models"}:
            secondary_reviewers.append("@taxat/reliability-release")
        if package["package_id"] in {"release-tooling", "testing-harnesses"}:
            secondary_reviewers.append("@taxat/foundations-contracts")
        if package["package_id"] in {"apps/operator-web", "apps/client-portal-web"}:
            secondary_reviewers.append("@taxat/control-plane-runtime")
        if package["package_id"] == "apps/internal-operator-macos":
            secondary_reviewers.append("@taxat/control-plane-runtime")
        rules.append(
            {
                "path_glob": f"/{package['path']}/**",
                "owners": owners,
                "secondary_reviewers": secondary_reviewers,
                "required_review_count": 1 if not secondary_reviewers else 2,
            }
        )
    rules.extend(
        [
            {
                "path_glob": "/PROMPT/**",
                "owners": ["@taxat/foundations-contracts"],
                "secondary_reviewers": [],
                "required_review_count": 1,
            },
            {
                "path_glob": "/docs/architecture/**",
                "owners": ["@taxat/foundations-contracts", "@taxat/reliability-release"],
                "secondary_reviewers": [],
                "required_review_count": 2,
            },
            {
                "path_glob": "/Algorithm/**",
                "owners": ["@taxat/foundations-contracts", "@taxat/engine-core"],
                "secondary_reviewers": [],
                "required_review_count": 2,
            },
        ]
    )
    return {
        "contract_version": TODAY,
        "selected_topology_id": SELECTED_TOPOLOGY_ID,
        "summary": {
            "rule_count": len(rules),
            "team_count": len(teams),
        },
        "rules": rules,
    }


def build_mermaid(packages: list[dict[str, Any]]) -> str:
    package_lookup = {package["package_id"]: package for package in packages}
    lines = [
        "flowchart LR",
        '  subgraph L0["Layer 0-2: Contracts and Foundations"]',
        '    contracts["contracts-core"]',
        '    generated["generated-models"]',
        '    foundation["runtime-foundation"]',
        '    observe["observability-audit"]',
        "  end",
        '  subgraph L1["Layer 3-4: Domain Runtime"]',
        '    kernel["domain-kernel"]',
        '    access["access-session"]',
        '    manifest["manifest-replay"]',
        '    collection["collection-intake"]',
        '    compute["compute-engine"]',
        '    authority["authority-gateway"]',
        '    workflow["workflow-collaboration"]',
        "  end",
        '  subgraph L2["Layer 5-6: Projection, Transport, and Experience Platforms"]',
        '    projectors["read-model-projectors"]',
        '    northbound["northbound-runtime"]',
        '    web["web-platform"]',
        '    native["native-platform"]',
        '    release["release-tooling"]',
        "  end",
        '  subgraph L3["Layer 7-8: Support and Apps"]',
        '    tests["testing-harnesses"]',
        '    devx["workspace-devx"]',
        '    api["apps/control-plane-api"]',
        '    operator["apps/operator-web"]',
        '    portal["apps/client-portal-web"]',
        '    mac["apps/internal-operator-macos"]',
        "  end",
        "  contracts --> generated",
        "  contracts --> foundation",
        "  generated --> kernel",
        "  foundation --> kernel",
        "  generated --> access",
        "  generated --> manifest",
        "  generated --> collection",
        "  generated --> compute",
        "  generated --> authority",
        "  generated --> workflow",
        "  foundation --> access",
        "  foundation --> manifest",
        "  foundation --> collection",
        "  foundation --> compute",
        "  foundation --> authority",
        "  foundation --> workflow",
        "  observe --> access",
        "  observe --> manifest",
        "  observe --> collection",
        "  observe --> compute",
        "  observe --> authority",
        "  observe --> workflow",
        "  kernel --> access",
        "  kernel --> manifest",
        "  kernel --> collection",
        "  kernel --> compute",
        "  kernel --> authority",
        "  kernel --> workflow",
        "  manifest --> collection",
        "  manifest --> compute",
        "  manifest --> authority",
        "  manifest --> workflow",
        "  collection --> compute",
        "  access --> authority",
        "  access --> workflow",
        "  authority --> workflow",
        "  access --> projectors",
        "  manifest --> projectors",
        "  collection --> projectors",
        "  compute --> projectors",
        "  authority --> projectors",
        "  workflow --> projectors",
        "  access --> northbound",
        "  manifest --> northbound",
        "  collection --> northbound",
        "  compute --> northbound",
        "  authority --> northbound",
        "  workflow --> northbound",
        "  projectors --> northbound",
        "  contracts --> web",
        "  generated --> web",
        "  foundation --> web",
        "  contracts --> native",
        "  generated --> native",
        "  foundation --> native",
        "  manifest --> release",
        "  authority --> release",
        "  northbound --> release",
        "  api --> northbound",
        "  api --> release",
        "  operator --> web",
        "  portal --> web",
        "  mac --> native",
        "  tests --> api",
        "  tests --> operator",
        "  tests --> portal",
        "  tests --> mac",
        "  devx --> contracts",
        "  devx --> tests",
    ]
    return "\n".join(lines) + "\n"


def build_main_doc(
    context: dict[str, Any],
    scorecard: dict[str, Any],
    package_matrix: dict[str, Any],
    dependency_rules: dict[str, Any],
    team_map: dict[str, Any],
    task_map: dict[str, Any],
    codeowners_draft: dict[str, Any],
) -> str:
    winner = scorecard["decision"]
    package_rows = [
        [
            row["label"],
            row["path"],
            row["owner_team_id"].replace("team_", ""),
            row["package_type"],
            row["primary_task_count"],
        ]
        for row in package_matrix["rows"]
    ]
    layer_rows = [
        [layer["layer"], ", ".join(layer["package_ids"])]
        for layer in dependency_rules["topological_layers"]
    ]
    team_rows = [
        [row["label"], row["handle"], ", ".join(row["owned_packages"]), row["primary_task_count"]]
        for row in team_map["rows"]
    ]
    top_packages = sorted(
        package_matrix["rows"],
        key=lambda row: (-row["primary_task_count"], row["package_id"]),
    )[:8]
    top_package_rows = [
        [row["package_id"], row["primary_task_count"], row["secondary_task_count"], ", ".join(row["future_task_clusters"][:3])]
        for row in top_packages
    ]
    ranking_rows = [
        [item["rank"], item["label"], item["weighted_total"]]
        for item in scorecard["alternatives"]
    ]
    deferred_rows = [
        f"- `{row['id']}` ({row['type']}): {row['summary']}"
        for row in package_matrix["typed_gaps_or_deferred_decisions"]
    ]
    return f"""# Monorepo Package Boundaries and Team Ownership Map

- Status: Accepted
- Date: {TODAY}
- Decision: {winner["selected_label"]}
- Score: {winner["selected_weighted_total"]}

## Context

Taxat now has enough architectural law to freeze the repo shape before implementation begins. Earlier phase-00 outputs already normalized `{context["canonical_module_count"]}` named modules with `{context["dependency_edge_count"]}` dependency edges, `{context["read_model_count"]}` read models, `{context["authority_operation_family_count"]}` authority operation families, `{context["browser_route_count"]}` browser routes across two deployables, `{context["native_scene_count"]}` native scenes across `{context["native_package_count"]}` native package roles, `{context["release_artifact_count"]}` release-evidence artifacts, and `{context["test_family_count"]}` mandatory test families. The remaining gap is structural: there is still no official package map telling later implementation tasks where code belongs.

That gap matters because phases 02 through 06 already define `{context["later_task_count"]}` implementation tasks. The repo cannot wait until phase 03 to decide whether schema authority, manifest legality, authority transport, projectors, app shells, release tooling, and test harnesses live in packages, in apps, or in a pile of ad hoc folders.

## Decision

Adopt a **domain-oriented monorepo with restrained shared packages and edge apps**:

- Four edge apps:
  - `apps/control-plane-api`
  - `apps/operator-web`
  - `apps/client-portal-web`
  - `apps/internal-operator-macos`
- Strong shared packages for:
  - contract sources and generated models
  - runtime foundations
  - domain legality seams
  - read-model projectors and northbound runtime
  - web and native shared platform layers
  - observability, release tooling, and test harnesses
- One workspace tooling package under `tools/` for codegen, linting, local-dev, and task orchestration.

This is intentionally not an apps-only repo and not a micro-package mesh. The chosen layout follows the backlog's real domain seams while keeping route-specific UI composition inside apps and keeping backend legality out of UI packages.

## Package Topology

{markdown_table(["Package", "Path", "Owner", "Type", "Primary Tasks"], package_rows)}

The package count is deliberate: `{package_matrix["summary"]["package_count"]}` total units covering `{task_map["summary"]["later_task_count"]}` later tasks. That is enough resolution to express the corpus seams without creating one package per module or one package per route.

## Dependency Layers

{markdown_table(["Layer", "Packages"], layer_rows)}

Production dependencies are acyclic by construction. The only sanctioned span exceptions are `testing-harnesses` and `workspace-devx`, and both are one-way support packages that production runtime may not import.

## Ownership Streams

{markdown_table(["Team", "Handle", "Owned Packages", "Primary Tasks"], team_rows)}

The package map creates `7` ownership streams rather than one team per folder. That is the right granularity for review and delivery: enough separation to protect contracts, engine core, runtime, web, native, and reliability concerns, but still broad enough to keep accountability at the stream level.

## Later Task Coverage

{markdown_table(["Package", "Primary Tasks", "Secondary Tasks", "Representative Clusters"], top_package_rows)}

Every phase 02-06 task maps to at least one owning package and one owning team. The full deterministic routing table lives in [later_task_to_package_map.json](/Users/test/Code/taxat_/data/analysis/later_task_to_package_map.json), with `{task_map["summary"]["later_task_count"]}` mapped rows and `0` unmapped tasks.

## CODEOWNERS Draft

The draft ownership surface is intentionally package-first:

- package-specific globs: `{len([rule for rule in codeowners_draft["rules"] if "/packages/" in rule["path_glob"] or "/apps/" in rule["path_glob"] or "/tools/" in rule["path_glob"]])}`
- repo-level globs: `{len([rule for rule in codeowners_draft["rules"] if rule["path_glob"].startswith('/PROMPT') or rule["path_glob"].startswith('/docs') or rule["path_glob"].startswith('/Algorithm')])}`

This keeps review boundaries aligned with the package map instead of relying on ad hoc team memory.

## Alternatives Considered

{markdown_table(["Rank", "Alternative", "Weighted Score"], ranking_rows)}

The winning option is **{winner["selected_label"]}** with a weighted score of `{winner["selected_weighted_total"]}`.

## Why This Option Wins

- It is the only option that matches the real roadmap cluster shape: foundations in phase 02, backend domains in phase 03, read-side and recovery in phase 04, web/native apps in phase 05, and test/release harnesses in phase 06.
- It gives contracts and generated models a single source-of-truth boundary, which directly closes the schema/type ownership gap.
- It keeps browser and native shared semantics reusable without letting web UI code, native UI code, or backend legality leak across runtime boundaries.
- It makes autonomous routing practical: later task slugs like `backend_manifest`, `frontend_portal`, or `testing_authority_integration` now have obvious package destinations.
- It protects release and migration tooling from feature UI sprawl and keeps authority transport out of browser packages.

## Guardrails On The Decision

- `contracts-core` is the only source-of-truth package for schemas, sample payloads, and validator-owned contract artifacts.
- `generated-models` is a one-way generated output from `contracts-core`; consumers do not hand-edit generated types.
- Apps are leaf composition surfaces. Reusable logic belongs in packages.
- `web-platform` and `native-platform` may share contracts and semantic grammars, but not each other's runtime UI code.
- `authority-gateway` may not depend on browser/native UI packages or read-side-only packages.
- `release-tooling` and `testing-harnesses` stay separate from feature UI packages.
- Production packages may not depend on `testing-harnesses` or `workspace-devx`.

## Consequences

Positive consequences:

- later implementation tasks now have deterministic destinations
- CODEOWNERS and review boundaries can be drafted immediately
- backend legality, read-side projection, UI shells, native delivery, testing, and release concerns stop competing for the same folders

Negative consequences and tradeoffs:

- package governance matters; weak ownership would still let logic drift back into apps
- the shared package count is higher than an apps-only repo
- teams must keep route-specific and app-specific UI composition inside apps instead of promoting it prematurely into shared packages

## Deferred Decisions and Typed Gaps

{chr(10).join(deferred_rows)}

## References

- Package boundary matrix: [package_boundary_matrix.json](/Users/test/Code/taxat_/data/analysis/package_boundary_matrix.json)
- Dependency rules: [package_dependency_rules.json](/Users/test/Code/taxat_/data/analysis/package_dependency_rules.json)
- Team ownership map: [team_ownership_map.json](/Users/test/Code/taxat_/data/analysis/team_ownership_map.json)
- CODEOWNERS draft: [codeowners_draft.json](/Users/test/Code/taxat_/data/analysis/codeowners_draft.json)
- Later task routing: [later_task_to_package_map.json](/Users/test/Code/taxat_/data/analysis/later_task_to_package_map.json)
- Comparison notes: [monorepo-package-boundaries-and-team-ownership-map-comparison.md](/Users/test/Code/taxat_/docs/architecture/monorepo-package-boundaries-and-team-ownership-map-comparison.md)
- Diagram: [monorepo-package-boundaries.mmd](/Users/test/Code/taxat_/diagrams/analysis/monorepo-package-boundaries.mmd)
"""


def build_comparison_doc(scorecard: dict[str, Any], task_map: dict[str, Any]) -> str:
    criteria_rows = [
        [item["label"], item["weight"], item["priority"], item["rationale"]]
        for item in scorecard["criteria"]
    ]
    alt_rows = [
        [item["rank"], item["label"], item["weighted_total"], item["summary"]]
        for item in scorecard["alternatives"]
    ]
    sections = [
        "# Monorepo Package Boundary Comparison",
        "",
        "## Weighted Criteria",
        "",
        markdown_table(["Criterion", "Weight", "Priority", "Rationale"], criteria_rows),
        "",
        "## Alternative Totals",
        "",
        markdown_table(["Rank", "Alternative", "Weighted Total", "Summary"], alt_rows),
        "",
        "## Coverage Context",
        "",
        f"- Later tasks mapped: `{task_map['summary']['later_task_count']}`",
        f"- Phase counts: `{json.dumps(task_map['summary']['phase_counts'], sort_keys=True)}`",
        f"- Package coverage count: `{task_map['summary']['package_coverage_count']}`",
        f"- Team coverage count: `{task_map['summary']['team_coverage_count']}`",
        "",
    ]
    for criterion in scorecard["criteria"]:
        rows = []
        for alternative in scorecard["alternatives"]:
            breakdown = next(
                item
                for item in alternative["criterion_breakdown"]
                if item["criterion_id"] == criterion["criterion_id"]
            )
            rows.append(
                [
                    alternative["label"],
                    breakdown["raw_score"],
                    breakdown["weighted_score"],
                    breakdown["note"],
                ]
            )
        sections.extend(
            [
                f"## {criterion['label']}",
                "",
                f"- Priority: `{criterion['priority']}`",
                f"- Weight: `{criterion['weight']}`",
                f"- Rationale: {criterion['rationale']}",
                "",
                markdown_table(["Alternative", "Raw", "Weighted", "Reason"], rows),
                "",
            ]
        )
    sections.extend(
        [
            "## Why The Runner-Ups Lost",
            "",
            *[
                f"- `{alternative['label']}` lost because {alternative['risks'][0][0].lower() + alternative['risks'][0][1:]}"
                for alternative in scorecard["alternatives"][1:]
            ],
            "",
        ]
    )
    return "\n".join(sections)


def main() -> None:
    context = build_supporting_context()
    criteria = build_criteria()
    alternatives = build_alternatives()
    scorecard = build_scorecard(criteria, alternatives)
    teams = build_teams()
    packages = build_packages()
    task_map = build_later_task_to_package_map(packages, teams)
    package_matrix = build_package_boundary_matrix(packages, task_map)
    dependency_rules = build_package_dependency_rules(packages)
    team_map = build_team_ownership_map(teams, packages, task_map)
    codeowners_draft = build_codeowners_draft(teams, packages)
    mermaid = build_mermaid(packages)
    main_doc = build_main_doc(
        context,
        scorecard,
        package_matrix,
        dependency_rules,
        team_map,
        task_map,
        codeowners_draft,
    )
    comparison_doc = build_comparison_doc(scorecard, task_map)

    text_write(DOC_PATH, main_doc)
    text_write(COMPARISON_PATH, comparison_doc)
    json_write(PACKAGE_BOUNDARY_MATRIX_PATH, package_matrix)
    json_write(PACKAGE_DEPENDENCY_RULES_PATH, dependency_rules)
    json_write(TEAM_OWNERSHIP_MAP_PATH, team_map)
    json_write(CODEOWNERS_DRAFT_PATH, codeowners_draft)
    json_write(TASK_TO_PACKAGE_MAP_PATH, task_map)
    text_write(MERMAID_PATH, mermaid)


if __name__ == "__main__":
    main()
