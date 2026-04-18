#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[2]
ALGORITHM_DIR = ROOT / "Algorithm"
DATA_ANALYSIS_DIR = ROOT / "data" / "analysis"
DOCS_ARCH_ADR_DIR = ROOT / "docs" / "architecture" / "adr"
DIAGRAMS_ANALYSIS_DIR = ROOT / "diagrams" / "analysis"

VERIFY_GATES_PATH = ALGORITHM_DIR / "verification_and_release_gates.md"
REPLAY_PATH = ALGORITHM_DIR / "replay_and_reproducibility_contract.md"
MANIFEST_FREEZE_PATH = ALGORITHM_DIR / "manifest_and_config_freeze_contract.md"
MANIFEST_START_PATH = ALGORITHM_DIR / "manifest_start_claim_protocol.md"
MANIFEST_BRANCH_PATH = ALGORITHM_DIR / "manifest_branch_selection_contract.md"
STATE_MACHINE_PATH = ALGORITHM_DIR / "state_machines.md"
GATE_LOGIC_PATH = ALGORITHM_DIR / "exact_gate_logic_and_decision_tables.md"
TEST_VECTORS_PATH = ALGORITHM_DIR / "test_vectors.md"
RELEASE_EVIDENCE_PATH = (
    ALGORITHM_DIR / "release_candidate_identity_and_promotion_evidence_contract.md"
)
SEMANTIC_REGRESSION_PATH = (
    ALGORITHM_DIR / "semantic_selector_and_accessibility_regression_pack_contract.md"
)
SHELL_CONTINUITY_PATH = (
    ALGORITHM_DIR / "shell_continuity_fuzzing_and_recovery_contract.md"
)
FOCUS_RESTORE_PATH = (
    ALGORITHM_DIR / "focus_restoration_and_return_target_harness_contract.md"
)
UPLOAD_RECOVERY_PATH = ALGORITHM_DIR / "upload_session_recovery_harness_contract.md"
NATIVE_CACHE_PATH = ALGORITHM_DIR / "native_cache_hydration_purge_and_rebase_contract.md"
CACHE_ISOLATION_PATH = ALGORITHM_DIR / "cache_isolation_and_secure_reuse_contract.md"
AUTHORITY_PATH = ALGORITHM_DIR / "authority_interaction_protocol.md"
DEPLOYMENT_PATH = ALGORITHM_DIR / "deployment_and_resilience_contract.md"
OBSERVABILITY_PATH = ALGORITHM_DIR / "observability_and_audit_contract.md"
ERROR_MODEL_PATH = ALGORITHM_DIR / "error_model_and_remediation_model.md"
FAILURE_DASHBOARD_PATH = (
    ALGORITHM_DIR / "failure_lifecycle_dashboard_and_lineage_contract.md"
)

REPLAY_CLASS_MATRIX_PATH = DATA_ANALYSIS_DIR / "replay_class_and_precondition_matrix.json"
REPLAY_COMPARE_MATRIX_PATH = (
    DATA_ANALYSIS_DIR / "replay_comparison_and_attestation_matrix.json"
)
RELEASE_GATE_MATRIX_PATH = (
    DATA_ANALYSIS_DIR / "release_candidate_and_compatibility_gate_matrix.json"
)
SECURITY_GATE_MATRIX_PATH = DATA_ANALYSIS_DIR / "security_release_gate_matrix.json"
NATIVE_HANDOFF_PATH = DATA_ANALYSIS_DIR / "native_handoff_and_test_strategy.json"
AUTHORITY_OPERATION_CATALOG_PATH = DATA_ANALYSIS_DIR / "authority_operation_catalog.json"
AUTHORITY_FLOW_PATH = DATA_ANALYSIS_DIR / "authority_send_receive_reconciliation_flow.json"
WEB_PLAYWRIGHT_PATH = DATA_ANALYSIS_DIR / "web_playwright_strategy.json"

ADR_PATH = DOCS_ARCH_ADR_DIR / "ADR-008-testing-determinism-and-replay-strategy.md"
COMPARISON_PATH = (
    DOCS_ARCH_ADR_DIR / "ADR-008-testing-determinism-and-replay-strategy-comparison.md"
)
SCORECARD_PATH = (
    DOCS_ARCH_ADR_DIR / "ADR-008-testing-determinism-and-replay-strategy-scorecard.json"
)
TEST_FAMILY_MATRIX_PATH = DATA_ANALYSIS_DIR / "test_family_to_constraint_matrix.json"
FIXTURE_STRATEGY_PATH = (
    DATA_ANALYSIS_DIR / "deterministic_fixture_and_replay_basis_strategy.json"
)
EDGE_MATRIX_PATH = DATA_ANALYSIS_DIR / "browser_native_authority_test_matrix.json"
FLAKE_POLICY_PATH = DATA_ANALYSIS_DIR / "flakiness_budget_and_quarantine_rules.json"
RELEASE_BINDING_PATH = (
    DATA_ANALYSIS_DIR / "release_candidate_test_evidence_binding.json"
)
TASK_TRACK_MAP_PATH = DATA_ANALYSIS_DIR / "test_suite_to_task_track_map.json"
MERMAID_PATH = DIAGRAMS_ANALYSIS_DIR / "ADR-008-testing-determinism-replay-strategy.mmd"

HEADING_RE = re.compile(r"^(#{2,4})\s+(.*)$")
TODAY = "2026-04-18"


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
    for line_number, line in enumerate(path.read_text().splitlines(), 1):
        match = HEADING_RE.match(line)
        if match and match.group(2).strip() == heading_text:
            return line_number
    raise ValueError(f"Heading `{heading_text}` not found in {path}")


def find_line_containing(path: Path, needle: str) -> int:
    for line_number, line in enumerate(path.read_text().splitlines(), 1):
        if needle in line:
            return line_number
    raise ValueError(f"Text `{needle}` not found in {path}")


def line_ref(path: Path, line_number: int, label: str) -> str:
    safe_label = re.sub(r"[^A-Za-z0-9_.-]+", "_", label).strip("_") or "line"
    return f"{repo_rel(path)}::L{line_number}[{safe_label}]"


def heading_ref(path: Path, heading_text: str, label: str | None = None) -> str:
    return line_ref(path, find_heading_line(path, heading_text), label or heading_text)


def text_ref(path: Path, needle: str, label: str | None = None) -> str:
    return line_ref(path, find_line_containing(path, needle), label or needle)


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


def normalize_source_refs(source_refs: Iterable[str]) -> list[str]:
    return ordered_unique(str(ref) for ref in source_refs)


def build_supporting_context() -> dict[str, Any]:
    replay_matrix = load_json(REPLAY_CLASS_MATRIX_PATH)
    replay_compare = load_json(REPLAY_COMPARE_MATRIX_PATH)
    release_matrix = load_json(RELEASE_GATE_MATRIX_PATH)
    security_matrix = load_json(SECURITY_GATE_MATRIX_PATH)
    native_handoff = load_json(NATIVE_HANDOFF_PATH)
    authority_catalog = load_json(AUTHORITY_OPERATION_CATALOG_PATH)
    authority_flow = load_json(AUTHORITY_FLOW_PATH)
    web_playwright = load_json(WEB_PLAYWRIGHT_PATH)

    return {
        "replay_class_count": replay_matrix["summary"]["replay_class_count"],
        "replay_precondition_count": replay_matrix["summary"]["precondition_count"],
        "replay_comparison_mode_count": replay_compare["summary"]["comparison_mode_count"],
        "replay_outcome_class_count": replay_compare["summary"]["outcome_class_count"],
        "candidate_identity_field_count": release_matrix["summary"][
            "candidate_identity_field_count"
        ],
        "admissibility_requirement_count": release_matrix["summary"][
            "admissibility_requirement_count"
        ],
        "release_evidence_binding_count": release_matrix["summary"][
            "evidence_binding_count"
        ],
        "security_release_gate_count": security_matrix["summary"]["release_gate_count"],
        "native_automation_layer_count": native_handoff["summary"][
            "automation_layer_count"
        ],
        "native_scene_scenario_count": native_handoff["summary"][
            "native_scene_scenario_count"
        ],
        "authority_operation_family_count": authority_catalog["summary"][
            "operation_family_count"
        ],
        "authority_protocol_object_count": authority_catalog["summary"][
            "core_protocol_object_count"
        ],
        "authority_flow_count": authority_flow["flow_count"],
        "browser_continuity_case_count": len(
            web_playwright["coverage"]["continuity_scenarios"]
        ),
        "browser_handoff_rule_count": len(web_playwright["browser_handoff_plan"]["rules"]),
    }


def build_criteria() -> list[dict[str, Any]]:
    return [
        {
            "criterion_id": "determinism_and_replay_fidelity",
            "label": "Determinism and replay fidelity",
            "weight": 16,
            "priority": "HARD_REQUIREMENT",
            "rationale": "The winning doctrine must preserve exact-decimal outputs, stable basis hashes, deterministic outcome hashes, and explicit replay verdicts instead of tolerating broad pass/fail ambiguity.",
            "source_refs": [
                heading_ref(VERIFY_GATES_PATH, "4A. Replayability verification additions"),
                heading_ref(REPLAY_PATH, "Execution-basis freeze contract"),
                heading_ref(REPLAY_PATH, "Deterministic golden-fixture boundary"),
                heading_ref(MANIFEST_FREEZE_PATH, "5.9 Hash contract"),
            ],
        },
        {
            "criterion_id": "coverage_across_engine_api_browser_native_and_authority",
            "label": "Coverage across engine, API, browser, native, and authority edges",
            "weight": 14,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Coverage must stay balanced so deterministic engine confidence does not hide browser, native, or authority regressions, and rich UI coverage does not hide core-state blind spots.",
            "source_refs": [
                heading_ref(VERIFY_GATES_PATH, "1. Required test families"),
                heading_ref(SEMANTIC_REGRESSION_PATH, "Coverage requirements"),
                heading_ref(SHELL_CONTINUITY_PATH, "Coverage requirements"),
                heading_ref(NATIVE_CACHE_PATH, "Coverage requirements"),
                heading_ref(AUTHORITY_PATH, "9.12 Duplicate and pending-state rules"),
            ],
        },
        {
            "criterion_id": "candidate_bound_evidence_quality",
            "label": "Candidate-bound evidence quality",
            "weight": 13,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Promotion evidence must bind to one canonical candidate tuple, one compatibility boundary, and the exact suite artifacts or coverage contracts that actually proved the release safe.",
            "source_refs": [
                heading_ref(VERIFY_GATES_PATH, "2. Release gate"),
                heading_ref(VERIFY_GATES_PATH, "4. Evidence required for promotion"),
                heading_ref(RELEASE_EVIDENCE_PATH, "1. Governing candidate identity model"),
                heading_ref(RELEASE_EVIDENCE_PATH, "2. Contract boundary"),
                heading_ref(RELEASE_EVIDENCE_PATH, "3. Admissibility boundary"),
            ],
        },
        {
            "criterion_id": "flake_resistance_and_quarantine_manageability",
            "label": "Flake resistance and quarantine manageability",
            "weight": 10,
            "priority": "HARD_REQUIREMENT",
            "rationale": "The test strategy must keep blocking suites deterministic by default, permit only tightly-scoped reruns, and keep quarantine or waiver posture out of green promotion evidence.",
            "source_refs": [
                heading_ref(VERIFY_GATES_PATH, "Gate admissibility rules"),
                text_ref(
                    VERIFY_GATES_PATH,
                    "Manual override SHALL NOT bypass failures in schema compatibility",
                    "manual_override_cannot_bypass_critical_gates",
                ),
                heading_ref(ERROR_MODEL_PATH, "13.6 Retry model"),
                heading_ref(ERROR_MODEL_PATH, "13.13 Deduplication and escalation"),
            ],
        },
        {
            "criterion_id": "cost_and_runtime_of_the_suite_portfolio",
            "label": "Cost and runtime of the suite portfolio",
            "weight": 8,
            "priority": "TRADEOFF",
            "rationale": "The portfolio must be expensive in the right places only, with deterministic fast lanes below slower browser, native, and restore suites.",
            "source_refs": [
                heading_ref(VERIFY_GATES_PATH, "1. Required test families"),
                heading_ref(DEPLOYMENT_PATH, "2. Promotion pipeline"),
                heading_ref(DEPLOYMENT_PATH, "8. Release and resilience invariants"),
            ],
        },
        {
            "criterion_id": "local_developer_ergonomics",
            "label": "Local developer ergonomics",
            "weight": 7,
            "priority": "STRONG_PREFERENCE",
            "rationale": "Fast deterministic fixtures, stable seeds, and predictable acceptance harnesses need to be runnable in development without forcing full end-to-end sandboxes for every change.",
            "source_refs": [
                heading_ref(REPLAY_PATH, "Deterministic golden-fixture boundary"),
                heading_ref(TEST_VECTORS_PATH, "TV-44F: Deterministic golden pack freezes ordered null slots and exact-decimal strings"),
                heading_ref(TEST_VECTORS_PATH, "TV-39P: Semantic accessibility regression pack binds every governed shell to exact selector and announcement contracts"),
                heading_ref(NATIVE_CACHE_PATH, "Authoritative artifacts"),
            ],
        },
        {
            "criterion_id": "failure_diagnosability",
            "label": "Failure diagnosability",
            "weight": 10,
            "priority": "HARD_REQUIREMENT",
            "rationale": "When a suite fails, the evidence model must tell the team what drifted, where, which candidate was involved, and whether the failure was product, environment, or admissibility noise.",
            "source_refs": [
                heading_ref(OBSERVABILITY_PATH, "14.4 Mandatory correlation keys"),
                heading_ref(OBSERVABILITY_PATH, "14.11 Query contracts"),
                heading_ref(ERROR_MODEL_PATH, "13.2 Canonical error object"),
                heading_ref(FAILURE_DASHBOARD_PATH, "Required Outcomes"),
            ],
        },
        {
            "criterion_id": "coverage_of_recovery_restore_and_migration_risks",
            "label": "Coverage of recovery, restore, and migration risks",
            "weight": 9,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Testing cannot stop at green request flows; it must cover stale reclaim, restore privacy reconciliation, queue loss, broker loss, and compatibility-window safety during release and rollback decisions.",
            "source_refs": [
                heading_ref(VERIFY_GATES_PATH, "G. Performance and failure-mode tests"),
                heading_ref(VERIFY_GATES_PATH, "4A. Replayability verification additions"),
                heading_ref(DEPLOYMENT_PATH, "5. Backup, restore, and DR rules"),
                heading_ref(RELEASE_EVIDENCE_PATH, "4. Eliminated failure modes"),
            ],
        },
        {
            "criterion_id": "accessibility_and_shell_continuity_coverage",
            "label": "Accessibility and shell-continuity coverage",
            "weight": 7,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Browser and native acceptance are not complete unless keyboard paths, reduced motion, semantic anchors, same-object continuity, and focus return remain contractually stable.",
            "source_refs": [
                heading_ref(SEMANTIC_REGRESSION_PATH, "Required rules"),
                heading_ref(SHELL_CONTINUITY_PATH, "Required invariants"),
                heading_ref(FOCUS_RESTORE_PATH, "Required rules"),
                heading_ref(UPLOAD_RECOVERY_PATH, "Required rules"),
            ],
        },
        {
            "criterion_id": "ability_to_scale_with_later_roadmap_tasks",
            "label": "Ability to scale with later roadmap tasks",
            "weight": 6,
            "priority": "STRONG_PREFERENCE",
            "rationale": "The doctrine should give later release, migration, QA, surface, and platform tasks a stable vocabulary of suite families, artifacts, and boundaries rather than forcing each task to invent its own harness taxonomy.",
            "source_refs": [
                heading_ref(VERIFY_GATES_PATH, "1. Required test families"),
                heading_ref(OBSERVABILITY_PATH, "14.12 Conformance tests"),
                heading_ref(ERROR_MODEL_PATH, "13.14 Invariants"),
                heading_ref(FAILURE_DASHBOARD_PATH, "Construction Rule"),
            ],
        },
    ]


def build_alternatives() -> list[dict[str, Any]]:
    return [
        {
            "alternative_id": "layered_contract_first_candidate_bound",
            "label": "Layered, contract-first, candidate-bound portfolio",
            "summary": "Use validators and deterministic fixture packs as the foundation, then add model-based, API, browser, native, authority-sandbox, replay or restore, security, and canary layers, all bound to release-candidate evidence artifacts.",
            "strengths": [
                "Matches the corpus's explicit test-family law and release admissibility boundary.",
                "Keeps fast deterministic suites below slower UI and resilience suites.",
                "Produces machine-readable evidence that promotion and replay can reuse later.",
            ],
            "risks": [
                "Largest initial implementation surface because multiple harness families must exist together.",
                "Requires disciplined fixture maintenance to keep golden packs and replay packs trustworthy.",
            ],
        },
        {
            "alternative_id": "end_to_end_heavy_browser_and_system_level",
            "label": "End-to-end-heavy browser or system-level strategy",
            "summary": "Lean primarily on browser, native, or full-system sandboxes, using broad scenario tests as the main confidence signal and keeping unit or contract suites comparatively thin.",
            "strengths": [
                "Feels intuitive because it exercises wide slices of the system at once.",
                "Can expose some integration mismatches that narrower unit tests would miss.",
            ],
            "risks": [
                "High flake pressure, slow feedback, and weak replayability when a run spans many mutable services.",
                "Poor fit for exact candidate-bound evidence because root-cause isolation is weaker and reruns are noisier.",
            ],
        },
        {
            "alternative_id": "narrow_unit_and_property_heavy",
            "label": "Narrow unit-heavy or property-heavy strategy with limited acceptance coverage",
            "summary": "Invest heavily in deterministic unit, formula, and model-based suites, while keeping API, browser, native, authority, and restore coverage intentionally light.",
            "strengths": [
                "Fastest local loop and strongest raw determinism on compute-heavy paths.",
                "Lower infrastructure burden because fewer sandboxes and client harnesses are required.",
            ],
            "risks": [
                "Cannot prove browser, native, authority, or restore posture to the standard the corpus requires.",
                "Leaves candidate-bound promotion evidence too dependent on inferred coverage rather than explicit acceptance artifacts.",
            ],
        },
    ]


def build_score_map() -> dict[str, dict[str, tuple[float, str]]]:
    return {
        "layered_contract_first_candidate_bound": {
            "determinism_and_replay_fidelity": (
                4.75,
                "Frozen basis law, deterministic golden packs, replay attestations, and restore evidence all fit one doctrine cleanly.",
            ),
            "coverage_across_engine_api_browser_native_and_authority": (
                4.75,
                "Every mandated family has an explicit home, so browser, native, and authority edges cannot silently disappear.",
            ),
            "candidate_bound_evidence_quality": (
                4.75,
                "The strategy is built around candidate hashes, compatibility hashes, and first-class gate artifacts rather than dashboard snapshots.",
            ),
            "flake_resistance_and_quarantine_manageability": (
                4.5,
                "Fast deterministic suites catch most drift before slower harnesses run, and blocking green posture remains unquarantined by design.",
            ),
            "cost_and_runtime_of_the_suite_portfolio": (
                3.75,
                "It is not the cheapest portfolio, but layered sequencing contains cost better than making every question an end-to-end run.",
            ),
            "local_developer_ergonomics": (
                4.5,
                "Most changes can be validated in seed-backed deterministic packs before reaching sandboxes, browser, or native devices.",
            ),
            "failure_diagnosability": (
                4.75,
                "Each family emits typed artifacts, making candidate drift, admissibility failures, and product regressions easier to distinguish.",
            ),
            "coverage_of_recovery_restore_and_migration_risks": (
                4.75,
                "Replay, restore, migration, queue rebuild, and fail-forward concerns are first-class, not incidental afterthoughts.",
            ),
            "accessibility_and_shell_continuity_coverage": (
                4.75,
                "Browser and native UI coverage is explicit and anchored to semantic, continuity, focus, and reduced-motion contracts.",
            ),
            "ability_to_scale_with_later_roadmap_tasks": (
                4.5,
                "Later QA, platform, migration, and release tasks can extend named families without redefining the test vocabulary.",
            ),
        },
        "end_to_end_heavy_browser_and_system_level": {
            "determinism_and_replay_fidelity": (
                2.25,
                "Wide system tests are the least stable place to assert byte-identical basis hashes or replay classifications.",
            ),
            "coverage_across_engine_api_browser_native_and_authority": (
                3.75,
                "Broad flows can touch many edges, but they still blur where browser, native, or authority obligations actually live.",
            ),
            "candidate_bound_evidence_quality": (
                2.0,
                "A green scenario run is weaker promotion evidence than explicit suite-family artifacts with canonical hashes and scope.",
            ),
            "flake_resistance_and_quarantine_manageability": (
                1.75,
                "This is the noisiest option and would tempt quarantine-heavy release behavior the source law forbids.",
            ),
            "cost_and_runtime_of_the_suite_portfolio": (
                1.75,
                "Making wide sandboxes the main safety net is expensive and slow.",
            ),
            "local_developer_ergonomics": (
                2.25,
                "Routine development becomes dependent on running large environments or waiting on shared sandboxes.",
            ),
            "failure_diagnosability": (
                2.5,
                "When a broad journey fails, isolating product drift from environment noise or stale fixtures is harder.",
            ),
            "coverage_of_recovery_restore_and_migration_risks": (
                2.75,
                "Some resilience cases can be exercised, but exact replay, reader-window, and restore evidence remain awkward to prove.",
            ),
            "accessibility_and_shell_continuity_coverage": (
                3.0,
                "UI journeys can cover continuity, but without dedicated semantic packs they tend to under-specify accessibility invariants.",
            ),
            "ability_to_scale_with_later_roadmap_tasks": (
                2.5,
                "The portfolio scales poorly because each new capability tends to add more wide scenarios instead of reusable family doctrine.",
            ),
        },
        "narrow_unit_and_property_heavy": {
            "determinism_and_replay_fidelity": (
                4.5,
                "This option is strong on deterministic cores and property exploration for formulas, hashes, and state transitions.",
            ),
            "coverage_across_engine_api_browser_native_and_authority": (
                2.0,
                "It under-serves browser, native, authority, and restore obligations that the corpus marks as mandatory.",
            ),
            "candidate_bound_evidence_quality": (
                2.25,
                "Unit evidence alone cannot satisfy promotion needs for authority breadth, client compatibility, or restore drills.",
            ),
            "flake_resistance_and_quarantine_manageability": (
                3.5,
                "Fast deterministic suites are reliable, but the option dodges rather than solves flake pressure in later acceptance layers.",
            ),
            "cost_and_runtime_of_the_suite_portfolio": (
                4.0,
                "The cheapest and fastest option because it intentionally keeps expensive acceptance and resilience layers thin.",
            ),
            "local_developer_ergonomics": (
                4.5,
                "Developers get the fastest local loop of the three alternatives.",
            ),
            "failure_diagnosability": (
                4.0,
                "Core failures are well isolated, though cross-surface and cross-edge regressions are less visible.",
            ),
            "coverage_of_recovery_restore_and_migration_risks": (
                2.0,
                "Restore, replay, no-blind-resend, and client-window drift are too system-shaped to leave lightly tested.",
            ),
            "accessibility_and_shell_continuity_coverage": (
                1.5,
                "Accessibility, focus, continuity, and native restore guarantees cannot be proven sufficiently with mostly unit or property suites.",
            ),
            "ability_to_scale_with_later_roadmap_tasks": (
                3.5,
                "The core harnesses scale, but later product and platform tracks would need to bolt on missing acceptance doctrine anyway.",
            ),
        },
    }


def build_scorecard(
    criteria: list[dict[str, Any]], alternatives: list[dict[str, Any]]
) -> dict[str, Any]:
    score_map = build_score_map()
    scored_alternatives: list[dict[str, Any]] = []
    for alternative in alternatives:
        weighted_total = 0.0
        criterion_breakdown: list[dict[str, Any]] = []
        for criterion in criteria:
            raw_score, note = score_map[alternative["alternative_id"]][
                criterion["criterion_id"]
            ]
            weighted_score = round(criterion["weight"] * raw_score / 5, 2)
            weighted_total += weighted_score
            criterion_breakdown.append(
                {
                    "criterion_id": criterion["criterion_id"],
                    "label": criterion["label"],
                    "priority": criterion["priority"],
                    "weight": criterion["weight"],
                    "raw_score": raw_score,
                    "weighted_score": weighted_score,
                    "note": note,
                }
            )
        scored_alternatives.append(
            {
                "alternative_id": alternative["alternative_id"],
                "label": alternative["label"],
                "summary": alternative["summary"],
                "strengths": alternative["strengths"],
                "risks": alternative["risks"],
                "criterion_breakdown": criterion_breakdown,
                "weighted_total": round(weighted_total, 2),
            }
        )
    scored_alternatives.sort(key=lambda item: item["weighted_total"], reverse=True)
    winner = scored_alternatives[0]
    return {
        "decision_id": "ADR-008-testing-determinism-and-replay-strategy",
        "generated_at": TODAY,
        "criteria": criteria,
        "alternatives": scored_alternatives,
        "decision": {
            "selected_alternative_id": winner["alternative_id"],
            "selected_label": winner["label"],
            "selected_weighted_total": winner["weighted_total"],
            "runner_up_alternative_id": scored_alternatives[1]["alternative_id"],
            "runner_up_label": scored_alternatives[1]["label"],
            "runner_up_weighted_total": scored_alternatives[1]["weighted_total"],
            "rejected_alternative_ids": [
                item["alternative_id"] for item in scored_alternatives[1:]
            ],
        },
    }


def build_test_family_matrix(context: dict[str, Any]) -> dict[str, Any]:
    families = [
        {
            "family_id": "schema_contract_validation",
            "label": "Schema and contract validation",
            "corpus_family_anchors": ["A. Schema and contract validation"],
            "blocking": True,
            "proves": "Authoritative artifacts, negative shape closure, backward-compatible reader claims, and northbound contract envelopes remain structurally valid.",
            "required_inputs": [
                "all authoritative schemas",
                "representative positive samples",
                "negative fixtures for enum or nullability drift",
                "prior-version fixtures where reader compatibility is claimed",
            ],
            "evidence_emitted": [
                "VerificationSuiteResult for suite_family = SCHEMA_CONTRACT_VALIDATION",
                "negative-fixture failure ledger",
                "schema compatibility notes bound to compatibility_gate_hash",
            ],
            "release_gates": [
                "SCHEMA_COMPATIBILITY",
                "MIGRATION_VERIFICATION",
                "SUITE_ADMISSIBILITY",
            ],
            "candidate_binding": {
                "candidate_identity_hash": "required",
                "compatibility_gate_hash": "required when schema safety or client compatibility is judged",
                "authority_sandbox_coverage_hash": "not_applicable",
            },
            "primary_tooling": [
                "schema validators",
                "positive and negative fixture packs",
                "contract self-tests",
            ],
            "determinism_controls": [
                "canonical fixture ordering",
                "stable schema bundle selection",
                "no mixed candidate tuples",
            ],
            "mandatory_edge_cases": [
                "required-field omission rejection",
                "enum drift rejection",
                "reader-window compatibility proof",
                "mixed-candidate evidence rejection",
            ],
            "source_refs": normalize_source_refs(
                [
                    heading_ref(VERIFY_GATES_PATH, "A. Schema and contract validation"),
                    heading_ref(RELEASE_EVIDENCE_PATH, "2. Contract boundary"),
                    heading_ref(RELEASE_EVIDENCE_PATH, "3. Admissibility boundary"),
                    heading_ref(TEST_VECTORS_PATH, "TV-77: Schema evolution preserves historical-manifest continuity through expand, backfill, and contract"),
                    heading_ref(TEST_VECTORS_PATH, "TV-78: Mixed-candidate release evidence is rejected before promotion"),
                ]
            ),
        },
        {
            "family_id": "deterministic_formula_and_module",
            "label": "Deterministic module and formula packs",
            "corpus_family_anchors": ["B. Deterministic module and formula tests"],
            "blocking": True,
            "proves": "Core compute helpers, exact-decimal arithmetic, duplicate suppression, hash stability, and ordered ranking rules remain deterministic.",
            "required_inputs": [
                "DeterministicGoldenPack",
                "seed-backed module fixtures",
                "exact-decimal threshold vectors",
                "nightly priority and grouping fixtures",
            ],
            "evidence_emitted": [
                "VerificationSuiteResult for suite_family = DETERMINISTIC_AND_STATE_MACHINE",
                "DeterministicGoldenPack ref and hash",
                "module and formula fixture hashes",
            ],
            "release_gates": [
                "DETERMINISTIC_AND_STATE_MACHINE",
                "SUITE_ADMISSIBILITY",
            ],
            "candidate_binding": {
                "candidate_identity_hash": "required",
                "compatibility_gate_hash": "not_required",
                "authority_sandbox_coverage_hash": "not_applicable",
            },
            "primary_tooling": [
                "unit suites",
                "formula vector suites",
                "golden pack fixture review",
            ],
            "determinism_controls": [
                "exact decimal strings",
                "jitter_policy = NONE",
                "ordered null-slot coverage",
                "stable fixture serialization",
            ],
            "mandatory_edge_cases": [
                "ordered null-slot coverage",
                "exact-decimal string stability",
                "replay-hash fixture stability",
                "deterministic cadence without jitter",
            ],
            "source_refs": normalize_source_refs(
                [
                    heading_ref(VERIFY_GATES_PATH, "B. Deterministic module and formula tests"),
                    heading_ref(REPLAY_PATH, "Deterministic golden-fixture boundary"),
                    heading_ref(TEST_VECTORS_PATH, "TV-44F: Deterministic golden pack freezes ordered null slots and exact-decimal strings"),
                    heading_ref(TEST_VECTORS_PATH, "TV-44G: Deterministic golden pack freezes named lifecycle transitions"),
                    heading_ref(TEST_VECTORS_PATH, "TV-44H: Deterministic golden pack freezes replay hashes and cadence without jitter"),
                ]
            ),
        },
        {
            "family_id": "state_machine_and_model_based",
            "label": "State-machine and model-based suites",
            "corpus_family_anchors": ["C. State-machine and model-based tests"],
            "blocking": True,
            "proves": "Every legal and illegal transition remains typed, deterministic, and fail-closed across lifecycle, retry, recovery, and release-control machines.",
            "required_inputs": [
                "state-machine registry",
                "gate decision tables",
                "transition generator seeds",
                "illegal-transition fixtures",
            ],
            "evidence_emitted": [
                "VerificationSuiteResult for suite_family = DETERMINISTIC_AND_STATE_MACHINE",
                "transition coverage ledger",
                "illegal transition failure proofs",
            ],
            "release_gates": [
                "DETERMINISTIC_AND_STATE_MACHINE",
                "SUITE_ADMISSIBILITY",
            ],
            "candidate_binding": {
                "candidate_identity_hash": "required",
                "compatibility_gate_hash": "not_required",
                "authority_sandbox_coverage_hash": "not_applicable",
            },
            "primary_tooling": [
                "model-based generators",
                "explicit transition regression suites",
                "property-based transition exploration",
            ],
            "determinism_controls": [
                "seeded generation",
                "typed illegal-transition expectations",
                "stable reason-code assertions",
            ],
            "mandatory_edge_cases": [
                "NightlyBatchRun lifecycle transitions",
                "illegal transition tuples rejected across machine families",
                "monotone gate progression",
                "pre-start versus post-start invariant faults",
            ],
            "source_refs": normalize_source_refs(
                [
                    heading_ref(VERIFY_GATES_PATH, "C. State-machine and model-based tests"),
                    heading_ref(STATE_MACHINE_PATH, "6.1 Global state-machine rules"),
                    heading_ref(STATE_MACHINE_PATH, "6.2A `NightlyBatchRun.lifecycle_state`"),
                    heading_ref(STATE_MACHINE_PATH, "6.25 Operational release/control states"),
                    heading_ref(GATE_LOGIC_PATH, "7.1 Gate result contract"),
                    heading_ref(TEST_VECTORS_PATH, "TV-76E: Illegal transition tuples are rejected across every governed machine family"),
                ]
            ),
        },
        {
            "family_id": "northbound_api_and_operator_contracts",
            "label": "Northbound API and operator contract suites",
            "corpus_family_anchors": ["D. Northbound API and operator-workspace contract tests"],
            "blocking": True,
            "proves": "Command receipts, stale-view rules, stream ordering, rebase semantics, and client compatibility windows remain correct across supported clients.",
            "required_inputs": [
                "API contract fixtures",
                "supported client-window fixtures",
                "receipt replay cases",
                "stream ordering and resume fixtures",
            ],
            "evidence_emitted": [
                "VerificationSuiteResult for suite_family = NORTHBOUND_API",
                "ClientCompatibilityMatrix where compatibility is judged",
                "stale-view and idempotency evidence refs",
            ],
            "release_gates": [
                "NORTHBOUND_API",
                "OPERATOR_CLIENT",
                "SUITE_ADMISSIBILITY",
            ],
            "candidate_binding": {
                "candidate_identity_hash": "required",
                "compatibility_gate_hash": "required for supported client window and reader-window checks",
                "authority_sandbox_coverage_hash": "not_applicable",
            },
            "primary_tooling": [
                "API contract suites",
                "receipt replay tests",
                "supported-client compatibility matrix tests",
            ],
            "determinism_controls": [
                "stable contract fixtures",
                "frozen supported-client windows",
                "same-candidate reruns only",
            ],
            "mandatory_edge_cases": [
                "duplicate client command after timeout",
                "stale approval after frame rebase",
                "oldest supported client against current server contract window",
                "rollback-safe current client compatibility checks where promised",
            ],
            "source_refs": normalize_source_refs(
                [
                    heading_ref(VERIFY_GATES_PATH, "D. Northbound API and operator-workspace contract tests"),
                    heading_ref(RELEASE_EVIDENCE_PATH, "2. Contract boundary"),
                    heading_ref(TEST_VECTORS_PATH, "TV-18: Duplicate command retry returns one durable receipt"),
                    heading_ref(TEST_VECTORS_PATH, "TV-21: Experience stream rebase rejects stale-action approval"),
                    heading_ref(TEST_VECTORS_PATH, "TV-80B: Green client compatibility evidence cannot coexist with a blocked native client window"),
                ]
            ),
        },
        {
            "family_id": "browser_surface_acceptance",
            "label": "Browser Playwright acceptance and accessibility packs",
            "corpus_family_anchors": ["D. Northbound API and operator-workspace contract tests"],
            "blocking": True,
            "proves": "Shipped browser surfaces keep semantic anchors, keyboard flow, reduced-motion parity, stale rebase behavior, same-object continuity, and lawful handoff return.",
            "required_inputs": [
                "semantic selector contracts",
                "shell continuity harness fixtures",
                "focus restore harness fixtures",
                "browser route and shell inventories",
            ],
            "evidence_emitted": [
                "Playwright traces and screenshots",
                "semantic_accessibility_regression_pack",
                "shell_continuity_fuzz_harness",
                "focus_restore_return_target_harness",
            ],
            "release_gates": [
                "OPERATOR_CLIENT",
                "SUITE_ADMISSIBILITY",
            ],
            "candidate_binding": {
                "candidate_identity_hash": "required",
                "compatibility_gate_hash": "required where supported-client posture is asserted",
                "authority_sandbox_coverage_hash": "not_applicable",
            },
            "primary_tooling": [
                "Playwright",
                "semantic or role-based locators",
                "browser continuity and focus harnesses",
            ],
            "determinism_controls": [
                "semantic selectors over incidental CSS",
                "actionability-safe interactions",
                "reduced-motion and keyboard-first assertions",
            ],
            "mandatory_edge_cases": [
                "reduced-motion parity",
                "keyboard-only traversal",
                "stale-view rebase with same-object continuity",
                "serialized return-target restore after support-surface close or help handoff",
            ],
            "source_refs": normalize_source_refs(
                [
                    heading_ref(VERIFY_GATES_PATH, "D. Northbound API and operator-workspace contract tests"),
                    heading_ref(SEMANTIC_REGRESSION_PATH, "Authoritative artifact"),
                    heading_ref(SEMANTIC_REGRESSION_PATH, "Required rules"),
                    heading_ref(SHELL_CONTINUITY_PATH, "Required invariants"),
                    heading_ref(FOCUS_RESTORE_PATH, "Required rules"),
                    heading_ref(TEST_VECTORS_PATH, "TV-39P: Semantic accessibility regression pack binds every governed shell to exact selector and announcement contracts"),
                    heading_ref(TEST_VECTORS_PATH, "TV-39T: Reduced-motion regression cases preserve the same semantic recovery story"),
                ]
            ),
        },
        {
            "family_id": "native_surface_automation",
            "label": "Native automation, restoration, and persistence-fixture packs",
            "corpus_family_anchors": ["D. Northbound API and operator-workspace contract tests"],
            "blocking": True,
            "proves": "The native macOS shell preserves scene identity, lawful restoration, FE-75 hydration or purge rules, cache isolation, and browser-auth handoff return.",
            "required_inputs": [
                "native scene inventory",
                "native cache hydration contracts",
                "cache isolation envelopes",
                "supported desktop compatibility fixtures",
            ],
            "evidence_emitted": [
                "XCUITest results",
                "native preview or snapshot pack",
                "native_cache_hydration_automation_pack",
            ],
            "release_gates": [
                "OPERATOR_CLIENT",
                "SUITE_ADMISSIBILITY",
            ],
            "candidate_binding": {
                "candidate_identity_hash": "required",
                "compatibility_gate_hash": "required for supported-client and persistence-window claims",
                "authority_sandbox_coverage_hash": "not_applicable",
            },
            "primary_tooling": [
                "XCUITest",
                "native preview or snapshot checks",
                "persistence-fixture suites",
            ],
            "determinism_controls": [
                "fixed restoration fixtures",
                "cache legality envelope checks before render",
                "typed purge and rebase outcomes",
            ],
            "mandatory_edge_cases": [
                "cache hydration purge on schema drift or tenant switch",
                "cache-only restoration blocks mutation until live rebase",
                "secondary-window focus return",
                "browser-auth handoff return to the same object and focus anchor",
            ],
            "source_refs": normalize_source_refs(
                [
                    heading_ref(VERIFY_GATES_PATH, "D. Northbound API and operator-workspace contract tests"),
                    heading_ref(NATIVE_CACHE_PATH, "Authoritative artifacts"),
                    heading_ref(NATIVE_CACHE_PATH, "Required rules"),
                    heading_ref(NATIVE_CACHE_PATH, "Coverage requirements"),
                    heading_ref(CACHE_ISOLATION_PATH, "FE-75 Native Hydration Composition"),
                    heading_ref(TEST_VECTORS_PATH, "TV-39G: Native primary-scene restoration fuzz case keeps same-object continuity with typed recovery"),
                    heading_ref(TEST_VECTORS_PATH, "TV-39N: Native secondary-window close restores the parent scene anchor"),
                    heading_ref(TEST_VECTORS_PATH, "TV-39Q: Browser and native identifier mirrors cannot drift from semantic anchor refs"),
                ]
            ),
        },
        {
            "family_id": "authority_sandbox_and_controlled_edge",
            "label": "Authority sandbox and controlled-edge suites",
            "corpus_family_anchors": ["E. Authority and controlled-edge integration tests"],
            "blocking": True,
            "proves": "Exact provider-profile breadth, request-identity isolation, fraud-header binding, ingress quarantine, duplicate suppression, and no-blind-resend reconciliation posture remain correct.",
            "required_inputs": [
                "enabled provider-profile set",
                "sandbox request envelopes and bindings",
                "ingress receipts and correlation fixtures",
                "reconciliation budget and duplicate namespace fixtures",
            ],
            "evidence_emitted": [
                "VerificationSuiteResult for suite_family = AUTHORITY_SANDBOX",
                "authority_sandbox_coverage_contract",
                "ingress lineage and reconciliation evidence refs",
            ],
            "release_gates": [
                "AUTHORITY_SANDBOX",
                "SUITE_ADMISSIBILITY",
            ],
            "candidate_binding": {
                "candidate_identity_hash": "required",
                "compatibility_gate_hash": "not_required",
                "authority_sandbox_coverage_hash": "required",
            },
            "primary_tooling": [
                "provider sandbox integration suites",
                "controlled-edge simulation fixtures",
                "request-identity and ingress proof checks",
            ],
            "determinism_controls": [
                "fixed provider-profile matrix",
                "stable request-identity namespace hashes",
                "persisted duplicate bucket and ingress correlation keys",
            ],
            "mandatory_edge_cases": [
                "token rotation during pending authority action",
                "ambiguous ingress quarantine before legal mutation",
                "duplicate bucket isolation and suppression",
                "reconciliation budget exhaustion blocks blind resend",
            ],
            "source_refs": normalize_source_refs(
                [
                    heading_ref(VERIFY_GATES_PATH, "E. Authority and controlled-edge integration tests"),
                    heading_ref(AUTHORITY_PATH, "9.12 Duplicate and pending-state rules"),
                    heading_ref(AUTHORITY_PATH, "9.13A Reconciliation budget and escalation rule"),
                    text_ref(
                        AUTHORITY_PATH,
                        "Release-facing authority sandbox evidence SHALL prove that same namespace isolation",
                        "release_facing_authority_sandbox_evidence",
                    ),
                    heading_ref(RELEASE_EVIDENCE_PATH, "2. Contract boundary"),
                    heading_ref(TEST_VECTORS_PATH, "TV-22: Authority token rotation during pending transmit preserves subject binding"),
                    heading_ref(TEST_VECTORS_PATH, "TV-70: Ambiguous ingress is quarantined instead of mutating legal state"),
                    heading_ref(TEST_VECTORS_PATH, "TV-70G: Budget exhaustion blocks resend and opens explicit escalation ownership"),
                ]
            ),
        },
        {
            "family_id": "replay_recovery_and_restore",
            "label": "Replay, recovery, restore, and migration-resilience suites",
            "corpus_family_anchors": [
                "G. Performance and failure-mode tests",
                "4A. Replayability verification additions",
            ],
            "blocking": True,
            "proves": "Exact replay, exact same-attempt recovery, restore drills, queue rebuild, stale reclaim, privacy reconciliation, and reader-window continuity remain correct.",
            "required_inputs": [
                "RunManifest, ConfigFreeze, InputFreeze, and HashSet fixtures",
                "RecoveryCheckpoint and RestoreDrillResult fixtures",
                "privacy reconciliation and queue rebuild scenarios",
                "migration plan and reader-window fixtures",
            ],
            "evidence_emitted": [
                "ReplayAttestation",
                "RestoreDrillResult",
                "RecoveryCheckpoint refs",
                "migration verification suite result",
            ],
            "release_gates": [
                "RESTORE_DRILL",
                "MIGRATION_VERIFICATION",
                "SUITE_ADMISSIBILITY",
            ],
            "candidate_binding": {
                "candidate_identity_hash": "required",
                "compatibility_gate_hash": "required for reader-window and migration safety",
                "authority_sandbox_coverage_hash": "not_applicable",
            },
            "primary_tooling": [
                "replay harnesses",
                "restore drill environments",
                "queue or broker loss fault injection",
            ],
            "determinism_controls": [
                "byte-identical execution_basis_hash assertions",
                "deterministic_outcome_hash stability",
                "no fresh authority reads in exact recovery",
            ],
            "mandatory_edge_cases": [
                "missing or corrupt basis components fail closed",
                "queue loss and broker rebuild without blind resend",
                "restore privacy reconciliation before reopen",
                "retention-limited replay keeps limitation codes",
            ],
            "source_refs": normalize_source_refs(
                [
                    heading_ref(VERIFY_GATES_PATH, "G. Performance and failure-mode tests"),
                    heading_ref(VERIFY_GATES_PATH, "4A. Replayability verification additions"),
                    heading_ref(REPLAY_PATH, "Exact replay preconditions"),
                    heading_ref(REPLAY_PATH, "Recovery and continuation semantics"),
                    heading_ref(REPLAY_PATH, "Replay attestation artifact"),
                    heading_ref(MANIFEST_START_PATH, "4. Recovery and reclaim"),
                    heading_ref(DEPLOYMENT_PATH, "5. Backup, restore, and DR rules"),
                    heading_ref(TEST_VECTORS_PATH, "TV-79A: Broker loss rebuilds authority work from durable truth instead of blind replay"),
                    heading_ref(TEST_VECTORS_PATH, "TV-79B: Post-restore access stays blocked until privacy and audit continuity clear"),
                ]
            ),
        },
        {
            "family_id": "security_verification",
            "label": "Security and release-integrity suites",
            "corpus_family_anchors": ["F. Security verification"],
            "blocking": True,
            "proves": "Session, CSRF, cache isolation, key or secret hygiene, provenance, notarization, and egress controls remain intact for the promoted candidate.",
            "required_inputs": [
                "session and step-up fixtures",
                "cache isolation fixtures",
                "artifact provenance and notarization attestations",
                "security regression and redaction cases",
            ],
            "evidence_emitted": [
                "security suite VerificationSuiteResult",
                "artifact integrity and provenance refs",
                "distribution-target notarization evidence",
            ],
            "release_gates": [
                "SECURITY",
                "ARTIFACT_INTEGRITY_AND_NOTARIZATION",
                "SUITE_ADMISSIBILITY",
            ],
            "candidate_binding": {
                "candidate_identity_hash": "required",
                "compatibility_gate_hash": "required when supported-client or local persistence safety is asserted",
                "authority_sandbox_coverage_hash": "not_applicable",
            },
            "primary_tooling": [
                "security regression suites",
                "artifact provenance verification",
                "cache isolation and redaction harnesses",
            ],
            "determinism_controls": [
                "fixed security fixtures",
                "no secret-bearing snapshot drift",
                "stable provenance inputs per candidate",
            ],
            "mandatory_edge_cases": [
                "session fixation or step-up regression",
                "cross-tenant or cross-mask cache isolation",
                "secret redaction for logs, queues, and traces",
                "desktop signature, digest, SBOM, provenance, and notarization validation",
            ],
            "source_refs": normalize_source_refs(
                [
                    heading_ref(VERIFY_GATES_PATH, "F. Security verification"),
                    heading_ref(CACHE_ISOLATION_PATH, "Purpose"),
                    heading_ref(CACHE_ISOLATION_PATH, "Eliminated Leakage Classes"),
                    heading_ref(OBSERVABILITY_PATH, "14.9 Logging contract"),
                    heading_ref(TEST_VECTORS_PATH, "TV-25: Cross-tenant and cross-mask cache keys cannot bleed experience state"),
                ]
            ),
        },
        {
            "family_id": "performance_canary_and_failure_mode",
            "label": "Performance, canary, and failure-mode suites",
            "corpus_family_anchors": ["G. Performance and failure-mode tests"],
            "blocking": True,
            "proves": "Load, burst, backlog, backpressure, canary, and chaos cases stay within SLO and preserve safe recovery or fail-forward posture.",
            "required_inputs": [
                "load and soak fixtures",
                "queue backlog and fan-out scenarios",
                "worker crash, broker loss, and timeout injections",
                "observability and failure lineage expectations",
            ],
            "evidence_emitted": [
                "CanaryHealthSummary",
                "performance suite VerificationSuiteResult",
                "failure lineage and audit correlation refs",
            ],
            "release_gates": [
                "PERFORMANCE_CANARY",
                "SUITE_ADMISSIBILITY",
            ],
            "candidate_binding": {
                "candidate_identity_hash": "required",
                "compatibility_gate_hash": "not_required",
                "authority_sandbox_coverage_hash": "not_applicable",
            },
            "primary_tooling": [
                "load or soak harnesses",
                "fault injection",
                "canary analysis and SLO checks",
            ],
            "determinism_controls": [
                "typed fault profiles",
                "stable correlation keys",
                "same-candidate canary evidence",
            ],
            "mandatory_edge_cases": [
                "queue backlog and backpressure",
                "worker crash, broker loss, and provider timeout chaos",
                "stale nightly shard reclaim",
                "canary abort with explicit rollback or fail-forward posture",
            ],
            "source_refs": normalize_source_refs(
                [
                    heading_ref(VERIFY_GATES_PATH, "G. Performance and failure-mode tests"),
                    heading_ref(OBSERVABILITY_PATH, "14.4 Mandatory correlation keys"),
                    heading_ref(OBSERVABILITY_PATH, "14.8 Metric contract"),
                    heading_ref(ERROR_MODEL_PATH, "13.6 Retry model"),
                    heading_ref(FAILURE_DASHBOARD_PATH, "Required Outcomes"),
                    heading_ref(TEST_VECTORS_PATH, "TV-79C: Canary abort preserves rollback-safe posture before window closure"),
                ]
            ),
        },
    ]
    return {
        "contract_version": TODAY,
        "summary": {
            "family_count": len(families),
            "blocking_family_count": sum(1 for family in families if family["blocking"]),
            "corpus_required_family_count": 7,
            "release_gate_touch_count": len(
                ordered_unique(
                    gate for family in families for gate in family["release_gates"]
                )
            ),
            "replay_precondition_count_consumed": context["replay_precondition_count"],
        },
        "test_families": families,
        "typed_gaps_or_deferred_decisions": [
            {
                "id": "defer_ci_vendor_selection",
                "type": "DEFERRED_DECISION",
                "status": "intentional",
                "summary": "The strategy fixes suite families, evidence shape, and admissibility rules but intentionally does not pick a CI vendor or hosted device farm yet.",
                "source_refs": [
                    heading_ref(VERIFY_GATES_PATH, "Gate admissibility rules"),
                    heading_ref(DEPLOYMENT_PATH, "2. Promotion pipeline"),
                ],
            },
            {
                "id": "shared_operating_contract_0022_0029_missing",
                "type": "SOURCE_GAP",
                "status": "open",
                "summary": "The referenced shared operating contract for cards 0022 through 0029 is absent, so ADR-008 is grounded directly in named algorithm contracts and prior analysis outputs.",
                "source_refs": [
                    line_ref(ROOT / "PROMPT" / "CARDS" / "pc_0026.md", 61, "missing_shared_contract_reference")
                ],
            },
        ],
    }


def build_fixture_strategy(context: dict[str, Any]) -> dict[str, Any]:
    replay_classes = [
        {
            "replay_class": "STANDARD_REPLAY",
            "legal_effect_boundary": "historical_read_only",
            "what_changes": "nothing material may change; compare against exact historical basis and outcome",
            "evidence_required": ["ReplayAttestation", "execution_basis_hash", "deterministic_outcome_hash"],
            "source_refs": [
                heading_ref(REPLAY_PATH, "`STANDARD_REPLAY`"),
                heading_ref(REPLAY_PATH, "Replay attestation artifact"),
            ],
        },
        {
            "replay_class": "AUDIT_REPLAY",
            "legal_effect_boundary": "historical_read_only_audit_form",
            "what_changes": "same exact replay semantics as standard replay, but explanation posture is auditor-oriented",
            "evidence_required": ["ReplayAttestation", "auditor explanation form"],
            "source_refs": [
                heading_ref(REPLAY_PATH, "`AUDIT_REPLAY`"),
                heading_ref(REPLAY_PATH, "Operator and auditor explanation contract"),
            ],
        },
        {
            "replay_class": "COUNTERFACTUAL_ANALYSIS",
            "legal_effect_boundary": "analysis_only_no_authority_mutation",
            "what_changes": "declared basis drift is allowed only when labeled and compared under expected-equivalence or expected-difference posture",
            "evidence_required": ["ReplayAttestation", "declared variance taxonomy", "comparison verdict"],
            "source_refs": [
                heading_ref(REPLAY_PATH, "`COUNTERFACTUAL_ANALYSIS`"),
                heading_ref(REPLAY_PATH, "Replay comparison contract"),
            ],
        },
    ]

    frozen_basis_dimensions = [
        {
            "dimension_id": "identity_and_authority_context",
            "fields": [
                "client_id",
                "period",
                "authority_scope_ref",
                "principal_context_ref",
                "access_binding_hash",
                "authority_context_ref",
                "environment_ref",
                "provider_environment_refs[]",
            ],
            "why_it_is_frozen": "Exact replay and exact recovery cannot claim sameness if principal, authority scope, or environment changed.",
            "source_refs": [heading_ref(REPLAY_PATH, "Required frozen basis dimensions")],
        },
        {
            "dimension_id": "executable_basis",
            "fields": [
                "code_build_id",
                "code_commit_sha",
                "container_image_digest",
                "schema_bundle_hash",
                "feature_flag_snapshot_hash",
            ],
            "why_it_is_frozen": "Executable sameness is part of basis equality, not ambient runtime context.",
            "source_refs": [heading_ref(REPLAY_PATH, "Required frozen basis dimensions")],
        },
        {
            "dimension_id": "frozen_config_basis",
            "fields": [
                "config_freeze_ref",
                "config_freeze_hash",
                "config_surface_hash",
                "minimum_config_artifact identities",
            ],
            "why_it_is_frozen": "Formula or policy substitutions would invalidate exact replay and release evidence claims.",
            "source_refs": [
                heading_ref(REPLAY_PATH, "Required frozen basis dimensions"),
                heading_ref(MANIFEST_FREEZE_PATH, "5.4 `ConfigFreeze` contract"),
            ],
        },
        {
            "dimension_id": "frozen_input_basis",
            "fields": [
                "input_freeze_ref",
                "input_set_hash",
                "source-plan identities",
                "normalization context",
                "authoritative intake artifact identities",
            ],
            "why_it_is_frozen": "Exact replay fails closed when historical inputs or intake basis are missing or replaced.",
            "source_refs": [
                heading_ref(REPLAY_PATH, "Required frozen basis dimensions"),
                heading_ref(MANIFEST_FREEZE_PATH, "5.8 Input freeze contract"),
            ],
        },
        {
            "dimension_id": "determinism_controls",
            "fields": [
                "deterministic_seed",
                "non_deterministic_module_allowlist[]",
                "timezone",
                "locale",
                "decimal context",
                "path-prefix mapping",
            ],
            "why_it_is_frozen": "Runtime-visible perturbations must be part of the basis hash if they can change outcomes.",
            "source_refs": [
                heading_ref(REPLAY_PATH, "Canonical execution-basis hash"),
                heading_ref(MANIFEST_FREEZE_PATH, "G. Determinism controls"),
            ],
        },
        {
            "dimension_id": "persisted_post_seal_basis_when_material",
            "fields": [
                "append_only_outcome_projection.post_seal_basis",
                "authority-context result lineage",
                "late-data monitor result lineage",
            ],
            "why_it_is_frozen": "Post-seal material effects cannot be silently recomputed during exact replay.",
            "source_refs": [
                heading_ref(REPLAY_PATH, "Required frozen basis dimensions"),
                heading_ref(REPLAY_PATH, "Historical post-seal basis"),
            ],
        },
    ]

    fixture_artifacts = [
        {
            "artifact_name": "RunManifest",
            "role": "Root execution and lineage truth; carries the pre-seal, basis-hash, and lifecycle envelope later replayed or recovered.",
            "must_be_frozen_before": "post-seal execution and any candidate-bound deterministic suite",
            "source_refs": [
                heading_ref(MANIFEST_FREEZE_PATH, "5.3 `RunManifest` required field groups")
            ],
        },
        {
            "artifact_name": "ConfigFreeze",
            "role": "Captures the exact config surface and minimum config artifacts used by live, replay, nightly, and release flows.",
            "must_be_frozen_before": "decision, compute, submission, or replay",
            "source_refs": [
                heading_ref(MANIFEST_FREEZE_PATH, "5.4 `ConfigFreeze` contract"),
                heading_ref(MANIFEST_FREEZE_PATH, "5.5 Freeze timing rules"),
            ],
        },
        {
            "artifact_name": "InputFreeze",
            "role": "Captures exact input and intake lineage so replay cannot replace historical intake with fresh source reads.",
            "must_be_frozen_before": "compute and exact replay claims",
            "source_refs": [
                heading_ref(MANIFEST_FREEZE_PATH, "5.8 Input freeze contract")
            ],
        },
        {
            "artifact_name": "HashSet",
            "role": "Carries config, input, execution-basis, manifest, deterministic-outcome, and decision-bundle hashes.",
            "must_be_frozen_before": "any replay-safe evidence or deterministic gate claim",
            "source_refs": [heading_ref(MANIFEST_FREEZE_PATH, "5.9 Hash contract")],
        },
        {
            "artifact_name": "preseal_gate_evaluation",
            "role": "Freezes the canonical pre-start gate tape so replay and reuse do not recompute seal posture from ambient truth.",
            "must_be_frozen_before": "manifest seal and start claim",
            "source_refs": [
                heading_ref(MANIFEST_FREEZE_PATH, "Pre-seal gate evaluation contract")
            ],
        },
        {
            "artifact_name": "manifest_start_claim",
            "role": "Keeps same-attempt recovery distinct from fresh start and blocks duplicate execution on stale queue heuristics.",
            "must_be_frozen_before": "run_started",
            "source_refs": [
                heading_ref(MANIFEST_START_PATH, "1. Durable control object"),
                heading_ref(MANIFEST_START_PATH, "2. Legal claim outcomes"),
            ],
        },
        {
            "artifact_name": "ManifestBranchDecisionContract and ManifestLineageTrace",
            "role": "Freeze branch action, reason, lineage anchor, request identity hash, and recovery or replay semantics so continuation does not drift silently.",
            "must_be_frozen_before": "return, reuse, replay, recovery, or child allocation",
            "source_refs": [
                heading_ref(MANIFEST_BRANCH_PATH, "Contract Boundary"),
                heading_ref(MANIFEST_BRANCH_PATH, "Branch Actions"),
                heading_ref(MANIFEST_BRANCH_PATH, "Typed Branch Reasons"),
            ],
        },
        {
            "artifact_name": "DeterministicGoldenPack",
            "role": "Candidate-bound durable fixture boundary for blocking deterministic and state-machine suites.",
            "must_be_frozen_before": "green deterministic gate or release promotion",
            "source_refs": [
                heading_ref(REPLAY_PATH, "Deterministic golden-fixture boundary"),
                heading_ref(VERIFY_GATES_PATH, "B. Deterministic module and formula tests"),
            ],
        },
    ]

    golden_pack_contents = [
        "candidate identity, schema bundle, and config bundle binding",
        "byte-stable module payload hashes",
        "explicit ordered null-slot coverage",
        "exact-decimal expectations rendered as canonical decimal strings",
        "named state-machine tuples with previous state, current state, and transition event",
        "replay fixtures with expected execution_basis_hash and deterministic_outcome_hash",
        "deterministic retry and reconciliation cadence fixtures with jitter_policy = NONE",
    ]

    exact_replay_preconditions = [
        "continuation basis names the exact lineage edge being replayed or recovered",
        "config inheritance mode remains exact",
        "input inheritance mode remains exact",
        "source manifest is sealed and historically readable",
        "ConfigFreeze is available and schema-readable",
        "InputFreeze and authoritative intake artifacts are available and schema-readable",
        "reader window or exact historical bundle remains loadable",
        "pre-seal tape is available and internally consistent",
        "authority and late-data basis is present when it materially influenced the original run",
        "runtime can deserialize and decrypt retained artifacts",
        "requested replay scope carries no live mutation token",
    ]

    return {
        "contract_version": TODAY,
        "summary": {
            "replay_class_count": context["replay_class_count"],
            "replay_precondition_count": len(exact_replay_preconditions),
            "frozen_basis_dimension_count": len(frozen_basis_dimensions),
            "fixture_artifact_count": len(fixture_artifacts),
            "golden_pack_content_count": len(golden_pack_contents),
        },
        "replay_classes": replay_classes,
        "frozen_basis_dimensions": frozen_basis_dimensions,
        "fixture_artifacts": fixture_artifacts,
        "deterministic_golden_pack_strategy": {
            "artifact_name": "DeterministicGoldenPack",
            "review_policy": "Any green deterministic gate retains the reviewed DeterministicGoldenPack ref; broad pass summaries are insufficient.",
            "required_contents": golden_pack_contents,
            "source_refs": [
                heading_ref(REPLAY_PATH, "Deterministic golden-fixture boundary"),
                heading_ref(VERIFY_GATES_PATH, "2. Release gate"),
            ],
        },
        "exact_replay_preconditions": exact_replay_preconditions,
        "stable_hash_posture": {
            "execution_basis_hash_rule": "Ordered digest over normalized basis-dimension payloads; missing dimensions remain limited or invalid, not silently unequal.",
            "deterministic_outcome_hash_rule": "Persisted replay or deterministic suite outcomes require a durable deterministic_outcome_hash.",
            "source_refs": [
                heading_ref(REPLAY_PATH, "Canonical execution-basis hash"),
                heading_ref(REPLAY_PATH, "Deterministic outcome contract"),
                heading_ref(REPLAY_PATH, "Non-negotiable prohibitions"),
            ],
        },
        "counterfactual_and_corruption_policy": {
            "allowed_counterfactual_verdicts": [
                "EXPECTED_EQUIVALENCE",
                "EXPECTED_DIFFERENCE",
                "LIMITED_COMPARABLE",
                "UNEXPECTED_MISMATCH",
            ],
            "must_fail_closed_when": [
                "basis component missing",
                "artifact corrupt or hash mismatched",
                "schema reader incompatible",
                "payload retention limits exact comparison",
            ],
            "source_refs": [
                heading_ref(VERIFY_GATES_PATH, "4A. Replayability verification additions"),
                heading_ref(REPLAY_PATH, "Corruption and incomplete basis handling"),
            ],
        },
        "typed_gaps_or_deferred_decisions": [
            {
                "id": "fixture_materialization_tooling_deferred",
                "type": "DEFERRED_DECISION",
                "status": "intentional",
                "summary": "The strategy fixes what must be frozen and proven, but later implementation tasks may still choose the exact golden-pack materialization scripts or storage layout.",
                "source_refs": [
                    heading_ref(REPLAY_PATH, "Deterministic golden-fixture boundary"),
                    heading_ref(MANIFEST_FREEZE_PATH, "5.9 Hash contract"),
                ],
            }
        ],
    }


def build_edge_matrix(context: dict[str, Any]) -> dict[str, Any]:
    rows = [
        {
            "coverage_id": "browser_semantic_accessibility_pack",
            "domain": "BROWSER",
            "suite_family_id": "browser_surface_acceptance",
            "mandatory_tooling": ["Playwright"],
            "what_it_proves": "Every governed browser shell keeps semantic anchors, keyboard traversal, screen-reader traversal, and reduced-motion parity.",
            "required_cases": [
                "dominant question anchor remains first announced heading",
                "support surface remains keyboard reachable and dismissible",
                "live updates preserve polite versus assertive announcement law",
            ],
            "candidate_gate": "OPERATOR_CLIENT",
            "evidence_artifacts": ["semantic_accessibility_regression_pack"],
            "source_refs": [
                heading_ref(SEMANTIC_REGRESSION_PATH, "Authoritative artifact"),
                heading_ref(SEMANTIC_REGRESSION_PATH, "Required rules"),
            ],
        },
        {
            "coverage_id": "browser_shell_continuity_and_focus",
            "domain": "BROWSER",
            "suite_family_id": "browser_surface_acceptance",
            "mandatory_tooling": ["Playwright"],
            "what_it_proves": "The same object, shell, route identity, and focus return survive rebase, reconnect, resize, collapse, and help-return perturbations unless truth actually changed.",
            "required_cases": [
                "rebase or reconnect preserves same governed object",
                "support-region close returns to the serialized invoker",
                "help handoff returns to the serialized source anchor",
            ],
            "candidate_gate": "OPERATOR_CLIENT",
            "evidence_artifacts": [
                "shell_continuity_fuzz_harness",
                "focus_restore_return_target_harness",
            ],
            "source_refs": [
                heading_ref(SHELL_CONTINUITY_PATH, "Authoritative artifact"),
                heading_ref(SHELL_CONTINUITY_PATH, "Coverage requirements"),
                heading_ref(FOCUS_RESTORE_PATH, "Authoritative artifact"),
            ],
        },
        {
            "coverage_id": "browser_upload_session_recovery",
            "domain": "BROWSER",
            "suite_family_id": "browser_surface_acceptance",
            "mandatory_tooling": ["Playwright"],
            "what_it_proves": "Upload recovery stays bound to one governed upload identity across reconnect, reload, request rebase, and cross-device continuation.",
            "required_cases": [
                "mobile reconnect",
                "browser reload",
                "stale request rebase with explicit reconfirmation",
                "cross-device continuation without duplicate storage",
            ],
            "candidate_gate": "OPERATOR_CLIENT",
            "evidence_artifacts": ["upload_session_recovery_harness"],
            "source_refs": [
                heading_ref(UPLOAD_RECOVERY_PATH, "Contract boundary"),
                heading_ref(UPLOAD_RECOVERY_PATH, "Required case matrix"),
                heading_ref(UPLOAD_RECOVERY_PATH, "Required rules"),
            ],
        },
        {
            "coverage_id": "native_scene_restoration_and_focus",
            "domain": "NATIVE",
            "suite_family_id": "native_surface_automation",
            "mandatory_tooling": ["XCUITest"],
            "what_it_proves": "Primary scenes, work-item scenes, and secondary windows restore the same object, active module, and focus anchor when lawful.",
            "required_cases": [
                "primary-scene same-object restore",
                "secondary-window parent return",
                "live update does not steal focus from compare or picker controls",
            ],
            "candidate_gate": "OPERATOR_CLIENT",
            "evidence_artifacts": ["native scene automation suite"],
            "source_refs": [
                heading_ref(NATIVE_CACHE_PATH, "Coverage requirements"),
                heading_ref(TEST_VECTORS_PATH, "TV-39G: Native primary-scene restoration fuzz case keeps same-object continuity with typed recovery"),
                heading_ref(TEST_VECTORS_PATH, "TV-39N: Native secondary-window close restores the parent scene anchor"),
            ],
        },
        {
            "coverage_id": "native_cache_hydration_and_purge",
            "domain": "NATIVE",
            "suite_family_id": "native_surface_automation",
            "mandatory_tooling": ["XCUITest", "persistence fixture suites"],
            "what_it_proves": "Hydration does not outrun legality; incompatible tenant, session, masking, or contract-window envelopes purge before first paint.",
            "required_cases": [
                "schema-incompatible cold-start purge",
                "tenant-switch purge",
                "session-revocation purge",
                "cache-only restoration blocks mutation until live rebase",
            ],
            "candidate_gate": "OPERATOR_CLIENT",
            "evidence_artifacts": ["native_cache_hydration_automation_pack"],
            "source_refs": [
                heading_ref(NATIVE_CACHE_PATH, "Authoritative artifacts"),
                heading_ref(NATIVE_CACHE_PATH, "Required rules"),
                heading_ref(CACHE_ISOLATION_PATH, "FE-75 Native Hydration Composition"),
            ],
        },
        {
            "coverage_id": "native_browser_auth_handoff",
            "domain": "NATIVE",
            "suite_family_id": "native_surface_automation",
            "mandatory_tooling": ["XCUITest", "Playwright for browser-owned leg"],
            "what_it_proves": "System-browser auth or help handoff returns to the same governed object and focus anchor; return does not imply settlement.",
            "required_cases": [
                "system-browser auth return",
                "help handoff cancellation return",
                "pending settlement posture after external handoff",
            ],
            "candidate_gate": "OPERATOR_CLIENT",
            "evidence_artifacts": ["native handoff suite", "browser handoff suite"],
            "source_refs": [
                heading_ref(FOCUS_RESTORE_PATH, "Required rules"),
                heading_ref(TEST_VECTORS_PATH, "TV-39K: Help handoff return restores the source anchor instead of a generic support root"),
            ],
        },
        {
            "coverage_id": "authority_provider_profile_matrix",
            "domain": "AUTHORITY",
            "suite_family_id": "authority_sandbox_and_controlled_edge",
            "mandatory_tooling": ["sandbox integration suites"],
            "what_it_proves": "Every enabled AuthorityOperationProfile is exercised in the exact namespace and breadth required for promotion.",
            "required_cases": [
                "all enabled provider profiles exercised",
                "all required operation-family sets exercised",
                "request-identity namespace isolation remains stable",
            ],
            "candidate_gate": "AUTHORITY_SANDBOX",
            "evidence_artifacts": ["authority_sandbox_coverage_contract"],
            "source_refs": [
                heading_ref(VERIFY_GATES_PATH, "E. Authority and controlled-edge integration tests"),
                text_ref(
                    AUTHORITY_PATH,
                    "Release-facing authority sandbox evidence SHALL prove that same namespace isolation",
                    "release_facing_authority_sandbox_evidence",
                ),
            ],
        },
        {
            "coverage_id": "authority_token_binding_and_fraud_headers",
            "domain": "AUTHORITY",
            "suite_family_id": "authority_sandbox_and_controlled_edge",
            "mandatory_tooling": ["sandbox integration suites"],
            "what_it_proves": "Queued mutations fail closed on token rotation or binding drift, and fraud headers stay attached to the exercised request identity namespace.",
            "required_cases": [
                "token rotation during pending authority action",
                "send-time binding-lineage invalidation",
                "fraud-header validation",
            ],
            "candidate_gate": "AUTHORITY_SANDBOX",
            "evidence_artifacts": ["authority_sandbox_coverage_contract"],
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.6 Token and client binding rule"),
                heading_ref(AUTHORITY_PATH, "9.7 Fraud-prevention header rule"),
                heading_ref(TEST_VECTORS_PATH, "TV-22: Authority token rotation during pending transmit preserves subject binding"),
            ],
        },
        {
            "coverage_id": "authority_ingress_quarantine_and_duplicate_suppression",
            "domain": "AUTHORITY",
            "suite_family_id": "authority_sandbox_and_controlled_edge",
            "mandatory_tooling": ["sandbox integration suites", "controlled-edge simulations"],
            "what_it_proves": "Ambiguous or weakly bound callback, poll, or recovery payloads stay quarantined; duplicate suppressed receipts point to one canonical ingress proof.",
            "required_cases": [
                "ambiguous ingress quarantine",
                "authority-reference-only ingress quarantine",
                "callback or poll duplicate collapse",
                "timeout placeholder cannot be silently overwritten",
            ],
            "candidate_gate": "AUTHORITY_SANDBOX",
            "evidence_artifacts": [
                "authority_sandbox_coverage_contract",
                "AuthorityIngressReceipt lineage",
            ],
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.9A Inbound authority ingress protocol"),
                heading_ref(TEST_VECTORS_PATH, "TV-70: Ambiguous ingress is quarantined instead of mutating legal state"),
                heading_ref(TEST_VECTORS_PATH, "TV-70B: Callback, poll, and recovery duplicates collapse to one canonical ingress receipt"),
            ],
        },
        {
            "coverage_id": "authority_reconciliation_budget_and_no_blind_resend",
            "domain": "AUTHORITY",
            "suite_family_id": "authority_sandbox_and_controlled_edge",
            "mandatory_tooling": ["sandbox integration suites", "recovery simulations"],
            "what_it_proves": "Reconciliation budget state survives recovery and replay, and automatic resend stops once contradiction or exhaustion is reached.",
            "required_cases": [
                "budget exhaustion blocks resend",
                "contradictory evidence blocks resend",
                "recovery preserves open reconciliation budget",
                "restore and replay reuse grouped reconciliation control",
            ],
            "candidate_gate": "AUTHORITY_SANDBOX",
            "evidence_artifacts": [
                "authority_sandbox_coverage_contract",
                "AuthorityInteractionRecord lineage",
            ],
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.13A Reconciliation budget and escalation rule"),
                heading_ref(TEST_VECTORS_PATH, "TV-70F: Recovery and continuation preserve the open reconciliation budget instead of resetting it"),
                heading_ref(TEST_VECTORS_PATH, "TV-70G: Budget exhaustion blocks resend and opens explicit escalation ownership"),
                heading_ref(TEST_VECTORS_PATH, "TV-70T: Restore and replay reuse the grouped reconciliation control contract"),
            ],
        },
    ]
    return {
        "contract_version": TODAY,
        "summary": {
            "row_count": len(rows),
            "domain_count": len(ordered_unique(row["domain"] for row in rows)),
            "browser_row_count": sum(1 for row in rows if row["domain"] == "BROWSER"),
            "native_row_count": sum(1 for row in rows if row["domain"] == "NATIVE"),
            "authority_row_count": sum(1 for row in rows if row["domain"] == "AUTHORITY"),
            "authority_operation_family_count": context["authority_operation_family_count"],
            "native_scene_scenario_count_consumed": context["native_scene_scenario_count"],
            "browser_continuity_case_count_consumed": context[
                "browser_continuity_case_count"
            ],
        },
        "coverage_rows": rows,
        "typed_gaps_or_deferred_decisions": [
            {
                "id": "device_farm_vendor_deferred",
                "type": "DEFERRED_DECISION",
                "status": "intentional",
                "summary": "The doctrine requires Playwright and XCUITest, but does not yet choose a hosted browser or native device execution vendor.",
                "source_refs": [
                    heading_ref(VERIFY_GATES_PATH, "D. Northbound API and operator-workspace contract tests"),
                    heading_ref(NATIVE_CACHE_PATH, "Coverage requirements"),
                ],
            }
        ],
    }


def build_flakiness_policy() -> dict[str, Any]:
    family_rules = [
        {
            "family_id": "schema_contract_validation",
            "retry_policy": "no_retry_for_product_failures; one infrastructure rerun only if the original suite never reached test execution",
            "quarantine_allowed_for_blocking_green": False,
            "manual_waiver_allowed_for_blocking_green": False,
            "triage_metadata": [
                "candidate_identity_hash",
                "compatibility_gate_hash_or_null",
                "schema_bundle_hash",
                "fixture_ref",
            ],
            "reason": "Schema and contract failures are deterministic by nature and must not be normalized away.",
        },
        {
            "family_id": "deterministic_formula_and_module",
            "retry_policy": "no_retry unless the runner crashed before fixture execution began",
            "quarantine_allowed_for_blocking_green": False,
            "manual_waiver_allowed_for_blocking_green": False,
            "triage_metadata": [
                "candidate_identity_hash",
                "deterministic_golden_pack_ref",
                "deterministic_seed",
                "fixture_hash",
            ],
            "reason": "Deterministic suites are the anti-flake foundation and lose value if rerun until green.",
        },
        {
            "family_id": "state_machine_and_model_based",
            "retry_policy": "seed-preserving rerun only when infrastructure noise interrupted execution",
            "quarantine_allowed_for_blocking_green": False,
            "manual_waiver_allowed_for_blocking_green": False,
            "triage_metadata": [
                "candidate_identity_hash",
                "generator_seed",
                "transition_fixture_ref",
                "error_code_or_reason_code",
            ],
            "reason": "Illegal-transition posture must stay reproducible from the same seed and cannot depend on ad hoc reruns.",
        },
        {
            "family_id": "northbound_api_and_operator_contracts",
            "retry_policy": "same-candidate same-scope rerun permitted for confirmed environment noise",
            "quarantine_allowed_for_blocking_green": False,
            "manual_waiver_allowed_for_blocking_green": False,
            "triage_metadata": [
                "candidate_identity_hash",
                "compatibility_gate_hash_or_null",
                "supported_client_window_ref_or_null",
                "receipt_or_stream_fixture_ref",
            ],
            "reason": "API suites may experience infrastructure noise, but a blocking green result still must stay scope-identical and unquarantined.",
        },
        {
            "family_id": "browser_surface_acceptance",
            "retry_policy": "same-candidate same-route-profile rerun allowed for actionability-safe infra noise only; preserve failing traces and screenshots",
            "quarantine_allowed_for_blocking_green": False,
            "manual_waiver_allowed_for_blocking_green": False,
            "triage_metadata": [
                "candidate_identity_hash",
                "route_id",
                "selector_profile",
                "trace_ref",
                "screenshot_ref",
            ],
            "reason": "Browser suites are slower and noisier than deterministic packs, but release green posture still cannot depend on quarantine or silent retries.",
        },
        {
            "family_id": "native_surface_automation",
            "retry_policy": "same-candidate same-scene rerun allowed only when device or simulator instability is isolated",
            "quarantine_allowed_for_blocking_green": False,
            "manual_waiver_allowed_for_blocking_green": False,
            "triage_metadata": [
                "candidate_identity_hash",
                "compatibility_gate_hash_or_null",
                "scene_id",
                "restore_fixture_ref",
                "device_or_runtime_fingerprint",
            ],
            "reason": "Native suites may need occasional environmental reruns, but a blocking pass still must be admissible and current.",
        },
        {
            "family_id": "authority_sandbox_and_controlled_edge",
            "retry_policy": "rerun only with the identical enabled provider-profile set, identical namespace scope, and explicit preservation of exercised operation families",
            "quarantine_allowed_for_blocking_green": False,
            "manual_waiver_allowed_for_blocking_green": False,
            "triage_metadata": [
                "candidate_identity_hash",
                "enabled_provider_profile_refs",
                "authority_sandbox_coverage_hash_or_null",
                "identity_namespace_hash",
                "operation_family_set",
            ],
            "reason": "Authority breadth evidence loses promotion value if reruns drift across profiles, operation families, or namespace isolation.",
        },
        {
            "family_id": "replay_recovery_and_restore",
            "retry_policy": "same-candidate same-checkpoint rerun only when the drill environment failed before evidence completion; replay cases otherwise stay single-shot and deterministic",
            "quarantine_allowed_for_blocking_green": False,
            "manual_waiver_allowed_for_blocking_green": False,
            "triage_metadata": [
                "candidate_identity_hash",
                "compatibility_gate_hash_or_null",
                "restore_checkpoint_ref",
                "restore_drill_ref",
                "execution_basis_hash",
            ],
            "reason": "Restore or replay evidence is only meaningful if the claimed checkpoint and basis stay identical throughout rerun and admissibility.",
        },
        {
            "family_id": "security_verification",
            "retry_policy": "same-candidate rerun allowed only for infrastructure failures in the harness; security findings themselves are never retried to green",
            "quarantine_allowed_for_blocking_green": False,
            "manual_waiver_allowed_for_blocking_green": False,
            "triage_metadata": [
                "candidate_identity_hash",
                "artifact_digest",
                "distribution_target",
                "finding_or_rule_id",
            ],
            "reason": "Critical security or artifact integrity failures are not waiveable for blocking green posture.",
        },
        {
            "family_id": "performance_canary_and_failure_mode",
            "retry_policy": "bounded same-candidate rerun allowed for environment noise, but SLO or error-budget failures remain product-significant until disproven with equivalent scope",
            "quarantine_allowed_for_blocking_green": False,
            "manual_waiver_allowed_for_blocking_green": False,
            "triage_metadata": [
                "candidate_identity_hash",
                "load_profile_ref",
                "canary_summary_ref",
                "fault_profile_ref",
                "slo_window_ref",
            ],
            "reason": "Canary and failure-mode evidence can be noisy, but promotion still requires a current, admissible, unwaived result.",
        },
    ]
    global_rules = [
            {
                "rule_id": "blocking_green_requires_admissible_unquarantined_evidence",
                "policy": "A blocking suite result counts only when bound to the exact candidate, current, same-scope, and serialized with quarantine posture NONE and manual waiver posture NONE.",
                "source_refs": [
                    heading_ref(VERIFY_GATES_PATH, "Gate admissibility rules"),
                    heading_ref(RELEASE_EVIDENCE_PATH, "3. Admissibility boundary"),
                ],
            },
            {
                "rule_id": "reruns_must_preserve_candidate_and_scope",
                "policy": "Any rerun used to recover from environment noise must preserve candidate identity, scope, and supporting compatibility or sandbox breadth boundaries.",
                "source_refs": [
                    heading_ref(VERIFY_GATES_PATH, "Gate admissibility rules"),
                    heading_ref(RELEASE_EVIDENCE_PATH, "3. Admissibility boundary"),
                ],
            },
            {
                "rule_id": "critical_suites_cannot_be_manually_overridden",
                "policy": "Schema compatibility, authority mutation safety, restore or DR, signed build integrity, and critical security suites cannot be manually overridden into green release posture.",
                "source_refs": [
                    text_ref(
                        VERIFY_GATES_PATH,
                        "Manual override SHALL NOT bypass failures in schema compatibility",
                        "manual_override_cannot_bypass_critical_gates",
                    )
                ],
            },
            {
                "rule_id": "trace_and_failure_artifacts_must_survive_triage",
                "policy": "Flake triage keeps traces, screenshots, seeds, error objects, and correlation keys so diagnosability improves instead of being erased by reruns.",
                "source_refs": [
                    heading_ref(OBSERVABILITY_PATH, "14.4 Mandatory correlation keys"),
                    heading_ref(ERROR_MODEL_PATH, "13.2 Canonical error object"),
                ],
            },
        ]
    return {
        "contract_version": TODAY,
        "summary": {
            "family_rule_count": len(family_rules),
            "global_rule_count": len(global_rules),
            "blocking_green_quarantine_allowed_count": sum(
                1
                for row in family_rules
                if row["quarantine_allowed_for_blocking_green"]
            ),
            "blocking_green_manual_waiver_allowed_count": sum(
                1
                for row in family_rules
                if row["manual_waiver_allowed_for_blocking_green"]
            ),
        },
        "global_rules": global_rules,
        "family_rules": family_rules,
        "typed_gaps_or_deferred_decisions": [
            {
                "id": "non_blocking_quarantine_reclassification_process_deferred",
                "type": "DEFERRED_DECISION",
                "status": "intentional",
                "summary": "The governance process for reclassifying a family from blocking to non-blocking belongs to later platform or release operations work; ADR-008 only fixes the release-time constraint that the change cannot happen ad hoc during the judged release.",
                "source_refs": [
                    text_ref(
                        VERIFY_GATES_PATH,
                        "A temporarily quarantined test may stop blocking promotion only after the owning contract is explicitly reclassified",
                        "reclassification_required_before_quarantine_stops_blocking",
                    )
                ],
            }
        ],
    }


def build_release_candidate_binding(
    family_matrix: dict[str, Any], flake_policy: dict[str, Any]
) -> dict[str, Any]:
    candidate_identity_fields = [
        "contract_version",
        "candidate_identity_hash",
        "candidate_environment_ref",
        "build_artifact_ref",
        "artifact_digest",
        "schema_bundle_hash",
        "config_bundle_hash",
        "migration_plan_ref_or_null",
        "enabled_provider_profile_refs[]",
        "supported_client_window_ref_or_null",
        "array_canonicalization_policy",
        "suite_context_policy",
        "admissibility_binding_policy",
    ]
    admissibility_requirements = [
        "gate result bound to the exact candidate tuple",
        "freshness remains valid for the candidate being promoted",
        "rerun scope remains identical to the blocking suite scope",
        "quarantine posture is NONE",
        "manual waiver posture is NONE",
    ]
    blocking_gate_bindings = [
        {
            "gate_id": "SCHEMA_COMPATIBILITY",
            "expected_suite_families": ["schema_contract_validation"],
            "required_evidence": [
                "VerificationSuiteResult",
                "GateAdmissibilityRecord",
                "schema_bundle_compatibility_gate_contract",
            ],
            "required_hash_echoes": ["candidate_identity_hash", "compatibility_gate_hash"],
        },
        {
            "gate_id": "DETERMINISTIC_AND_STATE_MACHINE",
            "expected_suite_families": [
                "deterministic_formula_and_module",
                "state_machine_and_model_based",
            ],
            "required_evidence": [
                "VerificationSuiteResult",
                "GateAdmissibilityRecord",
                "DeterministicGoldenPack",
            ],
            "required_hash_echoes": ["candidate_identity_hash"],
        },
        {
            "gate_id": "NORTHBOUND_API",
            "expected_suite_families": ["northbound_api_and_operator_contracts"],
            "required_evidence": [
                "VerificationSuiteResult",
                "GateAdmissibilityRecord",
            ],
            "required_hash_echoes": ["candidate_identity_hash"],
        },
        {
            "gate_id": "AUTHORITY_SANDBOX",
            "expected_suite_families": ["authority_sandbox_and_controlled_edge"],
            "required_evidence": [
                "VerificationSuiteResult",
                "GateAdmissibilityRecord",
                "authority_sandbox_coverage_contract",
            ],
            "required_hash_echoes": [
                "candidate_identity_hash",
                "authority_sandbox_coverage_hash_or_null",
            ],
        },
        {
            "gate_id": "OPERATOR_CLIENT",
            "expected_suite_families": [
                "northbound_api_and_operator_contracts",
                "browser_surface_acceptance",
                "native_surface_automation",
            ],
            "required_evidence": [
                "VerificationSuiteResult",
                "GateAdmissibilityRecord",
                "ClientCompatibilityMatrix",
            ],
            "required_hash_echoes": ["candidate_identity_hash", "compatibility_gate_hash"],
        },
        {
            "gate_id": "SECURITY",
            "expected_suite_families": ["security_verification"],
            "required_evidence": [
                "VerificationSuiteResult",
                "GateAdmissibilityRecord",
            ],
            "required_hash_echoes": ["candidate_identity_hash"],
        },
        {
            "gate_id": "PERFORMANCE_CANARY",
            "expected_suite_families": ["performance_canary_and_failure_mode"],
            "required_evidence": [
                "VerificationSuiteResult",
                "GateAdmissibilityRecord",
                "CanaryHealthSummary",
            ],
            "required_hash_echoes": ["candidate_identity_hash"],
        },
        {
            "gate_id": "RESTORE_DRILL",
            "expected_suite_families": ["replay_recovery_and_restore"],
            "required_evidence": [
                "VerificationSuiteResult",
                "GateAdmissibilityRecord",
                "RestoreDrillResult",
                "RecoveryCheckpoint",
            ],
            "required_hash_echoes": ["candidate_identity_hash", "compatibility_gate_hash"],
        },
        {
            "gate_id": "MIGRATION_VERIFICATION",
            "expected_suite_families": ["schema_contract_validation", "replay_recovery_and_restore"],
            "required_evidence": [
                "VerificationSuiteResult",
                "GateAdmissibilityRecord",
                "migration ledger outcome",
            ],
            "required_hash_echoes": ["candidate_identity_hash", "compatibility_gate_hash"],
        },
        {
            "gate_id": "ARTIFACT_INTEGRITY_AND_NOTARIZATION",
            "expected_suite_families": ["security_verification"],
            "required_evidence": [
                "BuildArtifact digest",
                "SBOM",
                "provenance attestation",
                "macOS notarization evidence when shipped",
            ],
            "required_hash_echoes": ["candidate_identity_hash"],
        },
        {
            "gate_id": "SUITE_ADMISSIBILITY",
            "expected_suite_families": [family["family_id"] for family in family_matrix["test_families"]],
            "required_evidence": ["GateAdmissibilityRecord"],
            "required_hash_echoes": ["candidate_identity_hash", "compatibility_gate_hash_or_null"],
        },
    ]
    suite_bindings = []
    flake_lookup = {row["family_id"]: row for row in flake_policy["family_rules"]}
    for family in family_matrix["test_families"]:
        suite_bindings.append(
            {
                "family_id": family["family_id"],
                "label": family["label"],
                "release_gates": family["release_gates"],
                "primary_evidence": family["evidence_emitted"],
                "candidate_binding": family["candidate_binding"],
                "admissibility_policy": {
                    "retry_policy": flake_lookup[family["family_id"]]["retry_policy"],
                    "quarantine_allowed_for_blocking_green": flake_lookup[
                        family["family_id"]
                    ]["quarantine_allowed_for_blocking_green"],
                    "manual_waiver_allowed_for_blocking_green": flake_lookup[
                        family["family_id"]
                    ]["manual_waiver_allowed_for_blocking_green"],
                },
            }
        )
    return {
        "contract_version": TODAY,
        "summary": {
            "candidate_identity_field_count": len(candidate_identity_fields),
            "admissibility_requirement_count": len(admissibility_requirements),
            "blocking_gate_binding_count": len(blocking_gate_bindings),
            "suite_family_binding_count": len(suite_bindings),
        },
        "candidate_identity_fields": candidate_identity_fields,
        "admissibility_requirements": admissibility_requirements,
        "blocking_gate_bindings": blocking_gate_bindings,
        "suite_family_bindings": suite_bindings,
        "manifest_assembly_rules": {
            "must_bind": [
                "canonical blocking-gate order",
                "per-gate result_ref and admissibility_ref",
                "per-gate candidate_identity_hash echo",
                "per-gate compatibility_gate_hash_or_null echo where applicable",
                "authority_sandbox_coverage_hash_or_null where applicable",
                "executed test run identifiers",
                "migration-ledger set",
                "companion canary, restore, and client-matrix evidence refs",
            ],
            "must_fail_closed_on": [
                "mixed-candidate gate rows",
                "missing deterministic_golden_pack_ref on green deterministic gate",
                "authority sandbox row without authority_sandbox_coverage_hash_or_null",
                "restore row with mismatched restore checkpoint",
                "top-level manifest assembly rows diverging from blocking_gates{}",
            ],
            "source_refs": [
                heading_ref(VERIFY_GATES_PATH, "2. Release gate"),
                heading_ref(VERIFY_GATES_PATH, "4. Evidence required for promotion"),
                heading_ref(RELEASE_EVIDENCE_PATH, "2. Contract boundary"),
                heading_ref(RELEASE_EVIDENCE_PATH, "3. Admissibility boundary"),
            ],
        },
        "typed_gaps_or_deferred_decisions": [
            {
                "id": "release_dashboard_visualization_deferred",
                "type": "DEFERRED_DECISION",
                "status": "intentional",
                "summary": "ADR-008 fixes evidence structure and gate bindings, but not the final UI shape of release dashboards or evidence viewers.",
                "source_refs": [
                    heading_ref(RELEASE_EVIDENCE_PATH, "2. Contract boundary"),
                    heading_ref(OBSERVABILITY_PATH, "14.11 Query contracts"),
                ],
            }
        ],
    }


def build_task_track_map() -> dict[str, Any]:
    track_rows = [
        {
            "family_id": "schema_contract_validation",
            "primary_track": "contracts_and_schema_guardrails",
            "anchoring_cards": ["pc_0002", "pc_0003", "pc_0008", "pc_0010"],
            "outputs_consumed": [
                "data/analysis/file_inventory_manifest.json",
                "data/analysis/contract_schema_script_index.json",
                "data/analysis/entity_catalog.json",
                "data/analysis/gate_registry.json",
            ],
            "why_it_matters": "These earlier cards define the artifact inventory and enforcement map that schema suites verify.",
        },
        {
            "family_id": "deterministic_formula_and_module",
            "primary_track": "compute_formula_and_gate_core",
            "anchoring_cards": ["pc_0010", "pc_0011"],
            "outputs_consumed": [
                "data/analysis/gate_registry.json",
                "data/analysis/formula_registry.json",
            ],
            "why_it_matters": "Formula and gate registries define the deterministic fixtures and threshold vectors the core packs must freeze.",
        },
        {
            "family_id": "state_machine_and_model_based",
            "primary_track": "state_machine_and_transition_invariants",
            "anchoring_cards": ["pc_0009"],
            "outputs_consumed": [
                "data/analysis/state_machine_registry.json",
                "data/analysis/state_transition_edges.csv",
            ],
            "why_it_matters": "The state-machine registry is the canonical transition surface for seeded generators and illegal-transition regressions.",
        },
        {
            "family_id": "northbound_api_and_operator_contracts",
            "primary_track": "api_projection_and_session_contracts",
            "anchoring_cards": ["pc_0012", "pc_0021", "pc_0023"],
            "outputs_consumed": [
                "data/analysis/authority_operation_catalog.json",
                "data/analysis/session_flow_matrix.json",
                "data/analysis/read_model_catalog_and_owner_map.json",
            ],
            "why_it_matters": "API and client-window suites depend on northbound, authority, session, and projection doctrine staying explicit.",
        },
        {
            "family_id": "browser_surface_acceptance",
            "primary_track": "browser_surface_contract_atlases",
            "anchoring_cards": ["pc_0013", "pc_0014", "pc_0024"],
            "outputs_consumed": [
                "data/analysis/semantic_selector_registry.json",
                "data/analysis/continuity_recovery_matrix.json",
                "data/analysis/web_surface_topology_and_deployable_map.json",
            ],
            "why_it_matters": "Browser suites inherit selector, continuity, and route topology law from the surface atlas tasks.",
        },
        {
            "family_id": "native_surface_automation",
            "primary_track": "native_macos_surface_and_cache_contracts",
            "anchoring_cards": ["pc_0014", "pc_0025"],
            "outputs_consumed": [
                "data/analysis/native_scene_and_window_topology.json",
                "data/analysis/native_cache_session_and_security_boundary.json",
                "data/analysis/native_handoff_and_test_strategy.json",
            ],
            "why_it_matters": "Native suites reuse the scene atlas, FE-75 doctrine, and browser-handoff posture already normalized for macOS delivery.",
        },
        {
            "family_id": "authority_sandbox_and_controlled_edge",
            "primary_track": "authority_gateway_and_controlled_edge",
            "anchoring_cards": ["pc_0012", "pc_0022"],
            "outputs_consumed": [
                "data/analysis/authority_operation_catalog.json",
                "data/analysis/authority_send_receive_reconciliation_flow.json",
                "data/analysis/authority_boundary_responsibility_matrix.json",
            ],
            "why_it_matters": "Authority suites must stay distinct from UI suites so request-identity and ingress ambiguity remain debuggable.",
        },
        {
            "family_id": "replay_recovery_and_restore",
            "primary_track": "replay_recovery_and_release_governance",
            "anchoring_cards": ["pc_0015", "pc_0016", "pc_0020"],
            "outputs_consumed": [
                "data/analysis/replay_class_and_precondition_matrix.json",
                "data/analysis/replay_comparison_and_attestation_matrix.json",
                "data/analysis/rebuild_restore_and_replay_topology.json",
            ],
            "why_it_matters": "Replay and restore suites are grounded in the control-plane and storage topology packs, not inferred later from CI history.",
        },
        {
            "family_id": "security_verification",
            "primary_track": "security_runtime_identity_and_storage",
            "anchoring_cards": ["pc_0016", "pc_0021", "pc_0022"],
            "outputs_consumed": [
                "data/analysis/security_release_gate_matrix.json",
                "data/analysis/step_up_trigger_and_invalidation_matrix.json",
                "data/analysis/authority_credential_and_token_boundary.json",
            ],
            "why_it_matters": "Security suites inherit identity, token-boundary, and runtime hardening rules that later implementation tasks must preserve.",
        },
        {
            "family_id": "performance_canary_and_failure_mode",
            "primary_track": "observability_failure_and_control_plane_resilience",
            "anchoring_cards": ["pc_0015", "pc_0017", "pc_0020"],
            "outputs_consumed": [
                "data/analysis/control_plane_artifact_inventory.json",
                "data/analysis/failure_lifecycle_dashboard_projection_rules.json",
                "data/analysis/event_flow_and_delivery_contracts.json",
            ],
            "why_it_matters": "Canary and chaos suites rely on correlation, failure lineage, and control-plane topology being explicit before implementation.",
        },
    ]
    return {
        "contract_version": TODAY,
        "summary": {
            "mapping_count": len(track_rows),
            "track_count": len(
                ordered_unique(row["primary_track"] for row in track_rows)
            ),
            "anchoring_card_count": len(
                ordered_unique(card for row in track_rows for card in row["anchoring_cards"])
            ),
        },
        "suite_track_mappings": track_rows,
        "typed_gaps_or_deferred_decisions": [
            {
                "id": "pc_0027_release_strategy_dependency",
                "type": "FORWARD_DEPENDENCY",
                "status": "expected",
                "summary": "The next roadmap task should extend the release-evidence side of this doctrine rather than redefining suite families from scratch.",
                "source_refs": [
                    line_ref(ROOT / "PROMPT" / "Checklist.md", find_line_containing(ROOT / "PROMPT" / "Checklist.md", "pc_0027"), "pc_0027_checklist_anchor")
                ],
            }
        ],
    }


def build_mermaid(family_matrix: dict[str, Any]) -> str:
    family_lookup = {family["family_id"]: family["label"] for family in family_matrix["test_families"]}
    lines = [
        "flowchart LR",
        '    candidate["Release Candidate Identity + Compatibility Boundary"]',
        '    manifest["ReleaseVerificationManifest"]',
        '    admissibility["Gate Admissibility Records"]',
        '    golden["DeterministicGoldenPack"]',
        '    replay["ReplayAttestation / RestoreDrillResult"]',
        '    authority["AuthoritySandboxCoverageContract"]',
        '    browser["Semantic + Continuity + Focus Packs"]',
        '    native["XCUITest + Native Hydration Automation Pack"]',
    ]
    for family_id in [
        "schema_contract_validation",
        "deterministic_formula_and_module",
        "state_machine_and_model_based",
        "northbound_api_and_operator_contracts",
        "browser_surface_acceptance",
        "native_surface_automation",
        "authority_sandbox_and_controlled_edge",
        "replay_recovery_and_restore",
        "security_verification",
        "performance_canary_and_failure_mode",
    ]:
        lines.append(f'    {family_id}["{family_lookup[family_id]}"]')
        lines.append(f"    candidate --> {family_id}")
        lines.append(f"    {family_id} --> admissibility")
        lines.append(f"    {family_id} --> manifest")
    lines.extend(
        [
            "    deterministic_formula_and_module --> golden",
            "    state_machine_and_model_based --> golden",
            "    replay_recovery_and_restore --> replay",
            "    authority_sandbox_and_controlled_edge --> authority",
            "    browser_surface_acceptance --> browser",
            "    native_surface_automation --> native",
            "    golden --> manifest",
            "    replay --> manifest",
            "    authority --> manifest",
            "    browser --> manifest",
            "    native --> manifest",
        ]
    )
    return "\n".join(lines) + "\n"


def build_adr_markdown(
    context: dict[str, Any],
    family_matrix: dict[str, Any],
    fixture_strategy: dict[str, Any],
    edge_matrix: dict[str, Any],
    flake_policy: dict[str, Any],
    release_binding: dict[str, Any],
    scorecard: dict[str, Any],
) -> str:
    winner = scorecard["decision"]
    family_rows = [
        [
            family["label"],
            ", ".join(family["release_gates"]),
            ", ".join(family["primary_tooling"]),
            ", ".join(family["evidence_emitted"][:2]),
        ]
        for family in family_matrix["test_families"]
    ]
    flake_rows = [
        [
            row["family_id"],
            row["retry_policy"],
            "no" if not row["quarantine_allowed_for_blocking_green"] else "yes",
            "no" if not row["manual_waiver_allowed_for_blocking_green"] else "yes",
        ]
        for row in flake_policy["family_rules"]
    ]
    binding_rows = [
        [
            gate["gate_id"],
            ", ".join(gate["expected_suite_families"][:3]),
            ", ".join(gate["required_evidence"][:3]),
            ", ".join(gate["required_hash_echoes"]),
        ]
        for gate in release_binding["blocking_gate_bindings"]
    ]
    deferred_rows = [
        f"- `{item['id']}` ({item['type']}): {item['summary']}"
        for item in family_matrix["typed_gaps_or_deferred_decisions"]
        + fixture_strategy["typed_gaps_or_deferred_decisions"]
        + edge_matrix["typed_gaps_or_deferred_decisions"]
        + flake_policy["typed_gaps_or_deferred_decisions"]
        + release_binding["typed_gaps_or_deferred_decisions"]
    ]
    return f"""# ADR-008: Testing Determinism and Replay Strategy

- Status: Accepted
- Date: {TODAY}
- Decision: {winner["selected_label"]}
- Score: {winner["selected_weighted_total"]}

## Context

Taxat already specifies rich verification law, but the obligations were scattered across replay, release, surface, authority, and resilience contracts. The existing analysis packs already normalized `{context["replay_class_count"]}` replay classes, `{context["replay_precondition_count"]}` replay preconditions, `{context["candidate_identity_field_count"]}` release-candidate identity fields, `{context["authority_operation_family_count"]}` authority operation families, and `{context["native_scene_scenario_count"]}` native scene scenarios; ADR-008 turns those fragments into one test doctrine that later QA, release, and platform work can extend.

The governing constraint is that promotion evidence must stay candidate-bound, replay-safe, and admissible. The corpus explicitly requires a first-class `DeterministicGoldenPack`, exact replay with byte-identical basis hashes, explicit authority sandbox breadth evidence, Playwright for shipped web surfaces, XCUITest for native macOS scenes, restore drills for relevant releases, and blocking green posture that is neither quarantined nor manually waived.

## Decision

Adopt a layered, contract-first, candidate-bound testing portfolio:

1. Run schema and contract validation first.
2. Run deterministic module, formula, and model-based suites next, freezing one reviewed `DeterministicGoldenPack`.
3. Run northbound API and client-compatibility suites against the same candidate and reader-window boundary.
4. Run browser Playwright suites for semantic, continuity, focus-return, and upload-recovery obligations.
5. Run native automation and persistence-fixture suites for FE-75 hydration, restoration, and browser-handoff return.
6. Run authority sandbox and controlled-edge suites separately from UI suites, with one candidate-bound `authority_sandbox_coverage_contract`.
7. Run replay, restore, migration, security, performance, and canary suites as release-facing resilience families rather than optional postscript checks.
8. Assemble `ReleaseVerificationManifest` only from first-class suite artifacts and companion admissibility records.

This doctrine is intentionally layered rather than end-to-end-heavy. Deterministic suites answer the fastest and most replayable questions; browser, native, authority, and restore suites answer integration questions the core packs cannot prove. Each family keeps its own evidence boundary so later release tasks can bind green posture to machine-checkable artifacts instead of narratives.

## Family Portfolio

{markdown_table(["Family", "Release Gates", "Primary Tooling", "Primary Evidence"], family_rows)}

## Deterministic Fixture and Replay Basis

Exact replay and exact recovery depend on one frozen basis model rather than an ambient runtime:

- Frozen basis dimensions: `{fixture_strategy["summary"]["frozen_basis_dimension_count"]}`
- Replay classes: `{fixture_strategy["summary"]["replay_class_count"]}`
- Exact replay preconditions: `{fixture_strategy["summary"]["replay_precondition_count"]}`
- Fixture artifacts in the doctrine: `{fixture_strategy["summary"]["fixture_artifact_count"]}`

The durable fixture boundary is `DeterministicGoldenPack`. Green deterministic gates must retain that ref, together with candidate identity and deterministic hash lineage, so promotion and later refactors stay tied to one reviewed fixture pack instead of a generic test pass summary.

## Browser, Native, and Authority Edge Coverage

The doctrine keeps browser, native, and authority edges distinct on purpose:

- Browser rows: `{edge_matrix["summary"]["browser_row_count"]}`
- Native rows: `{edge_matrix["summary"]["native_row_count"]}`
- Authority rows: `{edge_matrix["summary"]["authority_row_count"]}`
- Authority operation families carried forward: `{edge_matrix["summary"]["authority_operation_family_count"]}`

Playwright is mandatory for browser acceptance and browser-owned handoffs. XCUITest plus persistence-fixture packs are mandatory for native scenes. Sandbox and controlled-edge suites are mandatory for authority breadth and ingress ambiguity because UI journeys cannot prove namespace isolation or no-blind-resend posture reliably.

## Flake and Quarantine Policy

{markdown_table(["Family", "Retry Policy", "Quarantine Green?", "Waiver Green?"], flake_rows)}

Blocking green posture is valid only when the result is candidate-bound, same-scope, current, unquarantined, and unwaived. Reruns exist only to recover from verified environment noise and must preserve the same candidate tuple plus any compatibility or sandbox breadth boundary that the family depends on.

## Release Evidence Binding

{markdown_table(["Gate", "Expected Families", "Required Evidence", "Required Hash Echoes"], binding_rows)}

Promotion evidence therefore binds:

- one shared candidate tuple and canonical `candidate_identity_hash`
- one shared compatibility boundary and `compatibility_gate_hash` whenever schema or client-window safety is judged
- one `DeterministicGoldenPack` ref for green deterministic gates
- one `authority_sandbox_coverage_contract` hash for the authority sandbox gate
- explicit `RestoreDrillResult`, `RecoveryCheckpoint`, `CanaryHealthSummary`, and `ClientCompatibilityMatrix` refs where those gates apply

## Consequences

- Positive: later release, QA, native, browser, and platform tasks get a stable suite taxonomy and evidence model.
- Positive: replay, restore, authority, and client-compatibility safety become promotion-time questions, not after-the-fact investigations.
- Negative: the portfolio is broader and requires disciplined fixture maintenance, especially for golden packs, replay packs, and sandbox breadth evidence.
- Negative: more first-class artifacts must be produced and stored, which raises implementation cost but improves auditability.

## Rejected Alternatives

- End-to-end-heavy browser or system-level testing scored lower because it is the noisiest, weakest fit for admissible candidate-bound evidence, and would create pressure to quarantine blocking suites.
- Narrow unit-heavy or property-heavy testing scored lower because it cannot prove browser, native, authority, restore, and supported-client obligations to the standard the corpus requires.

## Rollback Posture

Rollback of the strategy means reducing the portfolio to a narrower test subset, which would immediately weaken release admissibility, replay evidence quality, and edge coverage. That is only acceptable if the release policy itself changes in a reviewed contract update. Operational tuning, such as splitting suites across pipelines or changing runners, is allowed as long as the family boundaries, evidence artifacts, and admissibility rules do not change.

## Deferred Decisions and Typed Gaps

{chr(10).join(deferred_rows)}

## Generated Artifacts

- `{repo_rel(TEST_FAMILY_MATRIX_PATH)}`
- `{repo_rel(FIXTURE_STRATEGY_PATH)}`
- `{repo_rel(EDGE_MATRIX_PATH)}`
- `{repo_rel(FLAKE_POLICY_PATH)}`
- `{repo_rel(RELEASE_BINDING_PATH)}`
- `{repo_rel(TASK_TRACK_MAP_PATH)}`
- `{repo_rel(MERMAID_PATH)}`
"""


def build_comparison_markdown(
    scorecard: dict[str, Any], criteria: list[dict[str, Any]]
) -> str:
    alt_rows = [
        [
            alt["label"],
            alt["weighted_total"],
            len(alt["strengths"]),
            len(alt["risks"]),
            alt["summary"],
        ]
        for alt in scorecard["alternatives"]
    ]
    criterion_rows = [
        [criterion["label"], criterion["weight"], criterion["priority"], criterion["rationale"]]
        for criterion in criteria
    ]
    breakdown_sections: list[str] = []
    for alt in scorecard["alternatives"]:
        rows = [
            [
                item["label"],
                item["weight"],
                item["raw_score"],
                item["weighted_score"],
                item["note"],
            ]
            for item in alt["criterion_breakdown"]
        ]
        breakdown_sections.append(
            "\n".join(
                [
                    f"## {alt['label']}",
                    "",
                    f"- Weighted total: `{alt['weighted_total']}`",
                    f"- Summary: {alt['summary']}",
                    f"- Strengths: {', '.join(alt['strengths'])}",
                    f"- Risks: {', '.join(alt['risks'])}",
                    "",
                    markdown_table(
                        ["Criterion", "Weight", "Raw", "Weighted", "Why"],
                        rows,
                    ),
                ]
            )
        )
    return "\n".join(
        [
            "# ADR-008 Comparison",
            "",
            "## Weighted Criteria",
            "",
            markdown_table(
                ["Criterion", "Weight", "Priority", "Rationale"], criterion_rows
            ),
            "",
            "## Alternative Totals",
            "",
            markdown_table(
                ["Alternative", "Weighted Total", "Strength Count", "Risk Count", "Summary"],
                alt_rows,
            ),
            "",
            *breakdown_sections,
            "",
        ]
    )


def main() -> None:
    context = build_supporting_context()
    criteria = build_criteria()
    alternatives = build_alternatives()
    scorecard = build_scorecard(criteria, alternatives)
    family_matrix = build_test_family_matrix(context)
    fixture_strategy = build_fixture_strategy(context)
    edge_matrix = build_edge_matrix(context)
    flake_policy = build_flakiness_policy()
    release_binding = build_release_candidate_binding(family_matrix, flake_policy)
    task_track_map = build_task_track_map()
    mermaid = build_mermaid(family_matrix)

    adr_markdown = build_adr_markdown(
        context,
        family_matrix,
        fixture_strategy,
        edge_matrix,
        flake_policy,
        release_binding,
        scorecard,
    )
    comparison_markdown = build_comparison_markdown(scorecard, criteria)

    text_write(ADR_PATH, adr_markdown)
    text_write(COMPARISON_PATH, comparison_markdown)
    json_write(SCORECARD_PATH, scorecard)
    json_write(TEST_FAMILY_MATRIX_PATH, family_matrix)
    json_write(FIXTURE_STRATEGY_PATH, fixture_strategy)
    json_write(EDGE_MATRIX_PATH, edge_matrix)
    json_write(FLAKE_POLICY_PATH, flake_policy)
    json_write(RELEASE_BINDING_PATH, release_binding)
    json_write(TASK_TRACK_MAP_PATH, task_track_map)
    text_write(MERMAID_PATH, mermaid)


if __name__ == "__main__":
    main()
