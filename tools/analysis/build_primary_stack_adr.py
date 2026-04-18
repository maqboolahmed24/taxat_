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

IMPLEMENTATION_CONVENTIONS_PATH = ALGORITHM_DIR / "implementation_conventions.md"
FRONTEND_LAW_PATH = ALGORITHM_DIR / "frontend_shell_and_interaction_law.md"
PORTAL_PATH = ALGORITHM_DIR / "customer_client_portal_experience_contract.md"
COLLABORATION_PATH = ALGORITHM_DIR / "collaboration_workspace_contract.md"
ADMIN_GOVERNANCE_PATH = ALGORITHM_DIR / "admin_governance_console_architecture.md"
CROSS_SHELL_PATH = ALGORITHM_DIR / "cross_shell_design_token_and_interaction_layer_foundation_contract.md"
UIUX_SKILL_PATH = ALGORITHM_DIR / "UIUX_DESIGN_SKILL.md"
MACOS_BLUEPRINT_PATH = ALGORITHM_DIR / "macos_native_operator_workspace_blueprint.md"
NORTHBOUND_API_PATH = ALGORITHM_DIR / "northbound_api_and_session_contract.md"
SECURITY_PATH = ALGORITHM_DIR / "security_and_runtime_hardening_contract.md"
OBSERVABILITY_PATH = ALGORITHM_DIR / "observability_and_audit_contract.md"
REPLAY_PATH = ALGORITHM_DIR / "replay_and_reproducibility_contract.md"
MANIFEST_PATH = ALGORITHM_DIR / "manifest_and_config_freeze_contract.md"
AUTHORITY_PATH = ALGORITHM_DIR / "authority_interaction_protocol.md"
COMPUTE_FORMULAS_PATH = ALGORITHM_DIR / "compute_parity_and_trust_formulas.md"
README_PATH = ALGORITHM_DIR / "README.md"
VALIDATE_CONTRACTS_PATH = ALGORITHM_DIR / "scripts" / "validate_contracts.py"
FORENSIC_GUARD_PATH = ALGORITHM_DIR / "tools" / "forensic_contract_guard.py"
PACKAGE_JSON_PATH = ROOT / "package.json"

ADR_PATH = DOCS_ARCH_ADR_DIR / "ADR-001-primary-implementation-stack.md"
COMPARISON_PATH = DOCS_ARCH_ADR_DIR / "ADR-001-primary-implementation-stack-comparison.md"
SCORECARD_PATH = DOCS_ARCH_ADR_DIR / "ADR-001-primary-implementation-stack-scorecard.json"
CONSTRAINT_MATRIX_PATH = DATA_ANALYSIS_DIR / "primary_stack_constraint_matrix.json"
ROLE_ASSIGNMENT_PATH = DATA_ANALYSIS_DIR / "language_runtime_role_assignment.json"
CONSUMPTION_STRATEGY_PATH = DATA_ANALYSIS_DIR / "shared_contract_consumption_strategy.json"
MERMAID_PATH = DIAGRAMS_ANALYSIS_DIR / "ADR-001-primary-implementation-stack.mmd"

HEADING_RE = re.compile(r"^(#{2,4})\s+(.*)$")
TODAY = "2026-04-17"


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
    return str(value).replace("|", "\\|").replace("\n", " ").strip()


def markdown_table(headers: list[str], rows: list[list[Any]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join("---" for _ in headers) + " |"
    body_lines = [
        "| " + " | ".join(md_escape(cell) for cell in row) + " |"
        for row in rows
    ]
    return "\n".join([header_line, divider_line, *body_lines])


def build_criteria() -> list[dict[str, Any]]:
    return [
        {
            "criterion_id": "deterministic_serialization_and_hashing",
            "label": "Deterministic serialization and hashing",
            "weight": 12,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Replay, manifest sealing, and attestation depend on byte-stable serialization and hash equality across runtime boundaries.",
            "source_refs": [
                heading_ref(
                    IMPLEMENTATION_CONVENTIONS_PATH,
                    "3. Deterministic serialization and hashing conventions",
                ),
                heading_ref(MANIFEST_PATH, "5.9 Hash contract"),
                heading_ref(REPLAY_PATH, "Deterministic outcome contract"),
            ],
        },
        {
            "criterion_id": "exact_decimal_money_safe_compute",
            "label": "Exact-decimal and money-safe computation support",
            "weight": 10,
            "priority": "HARD_REQUIREMENT",
            "rationale": "The compute and parity contracts explicitly forbid binary floating-point for money-bearing values and require canonical decimal-string persistence.",
            "source_refs": [
                heading_ref(COMPUTE_FORMULAS_PATH, "8.2 Standard normalization rules"),
                text_ref(
                    COMPUTE_FORMULAS_PATH,
                    "binary floating-point SHALL NOT be used for money-bearing sums, deltas, threshold checks, or parity breach checks",
                    "binary_floating_forbidden",
                ),
                text_ref(
                    COMPUTE_FORMULAS_PATH,
                    "- `m` SHALL be serialized as a canonical decimal string, never as a JSON number",
                    "canonical_decimal_string",
                ),
            ],
        },
        {
            "criterion_id": "contract_and_schema_ergonomics",
            "label": "Contract and schema ergonomics",
            "weight": 8,
            "priority": "HARD_REQUIREMENT",
            "rationale": "The corpus is schema-heavy, closed by default, and expects route-visible artifacts, stream payloads, and state objects to stay machine-checkable across services and clients.",
            "source_refs": [
                heading_ref(IMPLEMENTATION_CONVENTIONS_PATH, "2. Schema conventions"),
                text_ref(
                    README_PATH,
                    "- JSON schemas + sample payloads in `schemas/`, including ",
                    "readme_schema_inventory",
                ),
                text_ref(
                    PORTAL_PATH,
                    "`ClientDocumentRequest`, `ClientUploadSession`, `ClientApprovalPack`, `ClientOnboardingJourney`,",
                    "portal_schema_requirements",
                ),
                text_ref(
                    ADMIN_GOVERNANCE_PATH,
                    "The following read models SHOULD back the primary routes.",
                    "governance_read_models",
                ),
            ],
        },
        {
            "criterion_id": "browser_product_and_design_system_productivity",
            "label": "Browser product and design-system productivity",
            "weight": 12,
            "priority": "HARD_REQUIREMENT",
            "rationale": "The product surface is route-heavy, design-token-rich, and selector-governed across portal, collaboration, and governance shells.",
            "source_refs": [
                heading_ref(FRONTEND_LAW_PATH, "3. Layout topology and support-region promotion"),
                heading_ref(PORTAL_PATH, "Route architecture"),
                heading_ref(ADMIN_GOVERNANCE_PATH, "7. Frontend systems architecture"),
                heading_ref(CROSS_SHELL_PATH, "Governing model"),
                heading_ref(UIUX_SKILL_PATH, "Core design language"),
            ],
        },
        {
            "criterion_id": "playwright_and_frontend_automation",
            "label": "Playwright and frontend automation ergonomics",
            "weight": 7,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Browser automation is a first-class delivery and validation requirement, not a testing afterthought.",
            "source_refs": [
                heading_ref(FRONTEND_LAW_PATH, "10. Automation anchors and UI observability fencing"),
                heading_ref(PORTAL_PATH, "Playwright validation minimum"),
                heading_ref(COLLABORATION_PATH, "12. Playwright scenarios"),
                heading_ref(UIUX_SKILL_PATH, "Playwright-first / XCUITest-first design expectation"),
                text_ref(PACKAGE_JSON_PATH, "@playwright/test", "playwright_dependency"),
            ],
        },
        {
            "criterion_id": "backend_api_streaming_and_concurrency_fit",
            "label": "Backend API, streaming, and concurrency fit",
            "weight": 10,
            "priority": "HARD_REQUIREMENT",
            "rationale": "The backend must support typed command receipts, reconnect-safe streams, idempotent retries, and authority callbacks without compromising deterministic semantics.",
            "source_refs": [
                heading_ref(NORTHBOUND_API_PATH, "3. Command envelope"),
                heading_ref(NORTHBOUND_API_PATH, "7. Stream and reconnect rules"),
                heading_ref(AUTHORITY_PATH, "9.9A Inbound authority ingress protocol"),
                heading_ref(AUTHORITY_PATH, "9.8 Request hashing and idempotency"),
            ],
        },
        {
            "criterion_id": "security_ecosystem_maturity",
            "label": "Security ecosystem maturity",
            "weight": 8,
            "priority": "HARD_REQUIREMENT",
            "rationale": "The runtime must credibly support short-lived sessions, secret isolation, supply-chain integrity, and fail-closed authority handling.",
            "source_refs": [
                heading_ref(SECURITY_PATH, "2. Identity, session, and command trust"),
                heading_ref(SECURITY_PATH, "3. Secret, key, and token handling"),
                heading_ref(SECURITY_PATH, "7. Supply-chain and build integrity"),
                heading_ref(SECURITY_PATH, "8. Operational security release gates"),
            ],
        },
        {
            "criterion_id": "observability_ecosystem_fit",
            "label": "Observability ecosystem fit",
            "weight": 6,
            "priority": "STRONG_PREFERENCE",
            "rationale": "The chosen runtime should work naturally with OpenTelemetry-style traces, metrics, logs, and correlation-aware audit overlays.",
            "source_refs": [
                heading_ref(OBSERVABILITY_PATH, "14.2 Separation of concerns"),
                heading_ref(OBSERVABILITY_PATH, "14.7 Trace contract"),
                heading_ref(OBSERVABILITY_PATH, "14.8 Metric contract"),
                heading_ref(OBSERVABILITY_PATH, "14.11 Query contracts"),
            ],
        },
        {
            "criterion_id": "macos_native_coexistence_strategy",
            "label": "macOS-native coexistence strategy",
            "weight": 7,
            "priority": "HARD_REQUIREMENT",
            "rationale": "The browser and backend runtime choice cannot erase the first-class Swift macOS client or force it into a browser wrapper posture.",
            "source_refs": [
                heading_ref(MACOS_BLUEPRINT_PATH, "3. Recommended Xcode workspace topology"),
                heading_ref(MACOS_BLUEPRINT_PATH, "7. Authentication and session strategy"),
                heading_ref(MACOS_BLUEPRINT_PATH, "9. SwiftUI versus AppKit decision matrix"),
                heading_ref(MACOS_BLUEPRINT_PATH, "11. Security and runtime posture for the desktop client"),
            ],
        },
        {
            "criterion_id": "shared_type_and_contract_reuse",
            "label": "Shared type and contract reuse across surfaces",
            "weight": 8,
            "priority": "HARD_REQUIREMENT",
            "rationale": "The same contract set must drive browser routes, backend envelopes, automation fixtures, Python validators, and Swift native models without semantic drift.",
            "source_refs": [
                heading_ref(IMPLEMENTATION_CONVENTIONS_PATH, "2. Schema conventions"),
                heading_ref(PORTAL_PATH, "Read-model and API translation requirements"),
                text_ref(
                    README_PATH,
                    "python3 Algorithm/scripts/validate_contracts.py --self-test",
                    "validator_entrypoint",
                ),
                text_ref(
                    README_PATH,
                    "The authoritative validator entrypoints are `python3 Algorithm/scripts/validate_contracts.py --self-test` and `python3 Algorithm/tools/forensic_contract_guard.py`",
                    "authoritative_python_entrypoints",
                ),
            ],
        },
        {
            "criterion_id": "hiring_maintainability_and_operability",
            "label": "Hiring, maintainability, and long-term operability",
            "weight": 5,
            "priority": "STRONG_PREFERENCE",
            "rationale": "The primary stack should minimize gratuitous language fragmentation while keeping the supporting Python and Swift estates credible and maintainable.",
            "source_refs": [
                text_ref(
                    README_PATH,
                    "The authoritative validator entrypoints are `python3 Algorithm/scripts/validate_contracts.py --self-test` and `python3 Algorithm/tools/forensic_contract_guard.py`",
                    "python_toolchain_evidence",
                ),
                text_ref(PACKAGE_JSON_PATH, "\"type\": \"module\"", "node_module_repo_evidence"),
            ],
        },
        {
            "criterion_id": "migration_complexity_from_repo_evidence",
            "label": "Migration complexity from current repo evidence",
            "weight": 4,
            "priority": "STRONG_PREFERENCE",
            "rationale": "Current repo evidence already shows Python analysis tooling and Node/Playwright browser automation, so the first product stack should preserve that leverage rather than restart from zero in every lane.",
            "source_refs": [
                text_ref(PACKAGE_JSON_PATH, "@playwright/test", "existing_playwright_footprint"),
                text_ref(
                    README_PATH,
                    "Run `python3 Algorithm/scripts/validate_contracts.py --self-test` to validate every schema",
                    "existing_python_validation_footprint",
                ),
            ],
        },
        {
            "criterion_id": "performance_profile_under_expected_workloads",
            "label": "Performance profile under expected workloads",
            "weight": 3,
            "priority": "DEFERRED_CONCERN",
            "rationale": "The product needs credible streaming, validation, and compute throughput, but there is not yet enough live workload evidence to let raw throughput dominate the phase-00 stack choice.",
            "source_refs": [
                heading_ref(MACOS_BLUEPRINT_PATH, "12. Performance strategy"),
                heading_ref(REPLAY_PATH, "Implementation shape"),
                heading_ref(NORTHBOUND_API_PATH, "7. Stream and reconnect rules"),
            ],
        },
    ]


def build_alternatives() -> list[dict[str, Any]]:
    return [
        {
            "alternative_id": "typescript_node_primary_with_python_and_swift",
            "label": "TypeScript/Node-centered product stack with Swift native and retained Python tooling",
            "summary": "Use TypeScript on the current active Node LTS line for browser product surfaces, backend command/stream services, and shared runtime contract packages. Retain Python for corpus validators and analysis tooling, and retain Swift/SwiftUI plus targeted AppKit for the macOS client.",
            "scores": {
                "deterministic_serialization_and_hashing": {
                    "score": 4.0,
                    "note": "Needs a deliberately centralized canonical serialization and hash library, but can share the same rules across browser, backend, and Playwright fixtures.",
                },
                "exact_decimal_money_safe_compute": {
                    "score": 4.0,
                    "note": "Requires strict domain-level decimal abstractions and explicit prohibition of JS `number` for money-bearing paths, but remains workable through canonical decimal strings and fixed-scale libraries.",
                },
                "contract_and_schema_ergonomics": {
                    "score": 4.5,
                    "note": "Strong JSON Schema tooling and shared type generation make the browser, backend, and tests align naturally.",
                },
                "browser_product_and_design_system_productivity": {
                    "score": 5.0,
                    "note": "Best fit for the route-heavy browser product, semantic selector model, and design-system iteration loop.",
                },
                "playwright_and_frontend_automation": {
                    "score": 5.0,
                    "note": "Matches the current Playwright footprint and keeps browser contracts, fixtures, and tests in one ecosystem.",
                },
                "backend_api_streaming_and_concurrency_fit": {
                    "score": 4.25,
                    "note": "A strong fit for northbound HTTP APIs, SSE-style streams, and I/O-bound authority integration, provided CPU-heavy deterministic math stays disciplined.",
                },
                "security_ecosystem_maturity": {
                    "score": 4.25,
                    "note": "Mature enough for OIDC, secret management, supply-chain controls, and OpenTelemetry instrumentation, though it depends on disciplined dependency and runtime governance.",
                },
                "observability_ecosystem_fit": {
                    "score": 4.5,
                    "note": "Strong OpenTelemetry support and good compatibility with the current Node/Playwright observability layer.",
                },
                "macos_native_coexistence_strategy": {
                    "score": 4.5,
                    "note": "Pairs cleanly with a server-authoritative Swift client because TypeScript can own web/backend surfaces without trying to replace native UX.",
                },
                "shared_type_and_contract_reuse": {
                    "score": 5.0,
                    "note": "Best cross-surface reuse story because browser, backend, and Playwright can consume one generated TypeScript model layer.",
                },
                "hiring_maintainability_and_operability": {
                    "score": 4.5,
                    "note": "Keeps the product core mostly in one runtime while still honoring the already-justified Python and Swift edges.",
                },
                "migration_complexity_from_repo_evidence": {
                    "score": 5.0,
                    "note": "Aligns directly with the current Node/Playwright footprint and preserves the Python tooling estate instead of displacing it.",
                },
                "performance_profile_under_expected_workloads": {
                    "score": 4.0,
                    "note": "Good enough for the expected I/O-heavy product surface, with room to isolate hot compute or stream fan-out paths later if profiling demands it.",
                },
            },
            "strengths": [
                "Best overall fit for the browser-first product surface and Playwright-first validation model.",
                "Strongest shared-contract reuse story between browser UI, backend APIs, and automated tests.",
                "Preserves the existing Python and Swift evidence without making either pretend to be the product-core runtime.",
            ],
            "risks": [
                "Exact-decimal discipline must be aggressively enforced because the default JS number model is unsafe for money-bearing logic.",
                "Deterministic serialization and hashing must live in one canonical library rather than being recreated in each service or client.",
            ],
        },
        {
            "alternative_id": "python_backend_with_typescript_web_and_swift_native",
            "label": "Python-centered backend with TypeScript web and Swift native",
            "summary": "Use Python for the backend and deterministic compute core, TypeScript for browser surfaces and Playwright, and Swift for the native macOS client.",
            "scores": {
                "deterministic_serialization_and_hashing": {
                    "score": 4.5,
                    "note": "Python can express deterministic serialization and replay loaders clearly, especially alongside the existing validator estate.",
                },
                "exact_decimal_money_safe_compute": {
                    "score": 5.0,
                    "note": "Python's decimal support is excellent for the exact-decimal contract.",
                },
                "contract_and_schema_ergonomics": {
                    "score": 3.5,
                    "note": "Schema handling is solid, but the web/backend type boundary remains more fragmented than a TS-centered product core.",
                },
                "browser_product_and_design_system_productivity": {
                    "score": 3.5,
                    "note": "Browser productivity remains strong on the frontend, but the primary product stack still splits between frontend and backend concerns.",
                },
                "playwright_and_frontend_automation": {
                    "score": 4.5,
                    "note": "Playwright remains strong because the web layer stays TypeScript, but contract drift risk across the backend seam increases.",
                },
                "backend_api_streaming_and_concurrency_fit": {
                    "score": 4.25,
                    "note": "Works well for typed APIs and orchestration, though stream fan-out and high-concurrency event handling often need more deliberate engineering choices.",
                },
                "security_ecosystem_maturity": {
                    "score": 4.25,
                    "note": "Security tooling is mature, especially around validators and data processing, but shared runtime parity with the browser layer is weaker.",
                },
                "observability_ecosystem_fit": {
                    "score": 4.25,
                    "note": "OpenTelemetry support is viable, though cross-language correlation and instrumentation discipline become more important.",
                },
                "macos_native_coexistence_strategy": {
                    "score": 4.25,
                    "note": "Still pairs fine with Swift because the native client is separate from backend language choice.",
                },
                "shared_type_and_contract_reuse": {
                    "score": 3.0,
                    "note": "The browser stack and backend stack stay separated by codegen and schema wrappers more often, increasing semantic-drift pressure.",
                },
                "hiring_maintainability_and_operability": {
                    "score": 4.25,
                    "note": "Python is widely operable, but the product core becomes more polyglot sooner than necessary.",
                },
                "migration_complexity_from_repo_evidence": {
                    "score": 4.5,
                    "note": "Preserves the current Python estate well, but does not capitalize as directly on the existing Node/Playwright browser and prototype footprint.",
                },
                "performance_profile_under_expected_workloads": {
                    "score": 3.75,
                    "note": "Adequate for expected workloads, but lower raw concurrency headroom than a well-tuned Node or JVM option for event-heavy product APIs.",
                },
            },
            "strengths": [
                "Strongest exact-decimal and validator continuity story with the current repo evidence.",
                "Low conceptual drift between offline analysis tooling and backend implementation.",
            ],
            "risks": [
                "Shared contract consumption across browser, backend, and tests becomes more fragmented.",
                "The product core splits earlier into Python plus TypeScript, which weakens the one-primary-stack goal of ADR-001.",
            ],
        },
        {
            "alternative_id": "kotlin_jvm_backend_with_typescript_web_and_swift_native",
            "label": "Kotlin/JVM backend with TypeScript web and Swift native",
            "summary": "Use Kotlin/JVM for the backend and deterministic compute core, TypeScript for browser surfaces and Playwright, and Swift for the macOS client.",
            "scores": {
                "deterministic_serialization_and_hashing": {
                    "score": 4.5,
                    "note": "The JVM offers a very strong deterministic and schema-disciplined backend foundation when canonical serialization is centralized.",
                },
                "exact_decimal_money_safe_compute": {
                    "score": 4.75,
                    "note": "BigDecimal-backed exact-decimal handling is strong and credible for money-safe logic.",
                },
                "contract_and_schema_ergonomics": {
                    "score": 4.0,
                    "note": "Good schema ergonomics, but the browser/backend type seam still requires a stronger generation strategy than the TS-centered option.",
                },
                "browser_product_and_design_system_productivity": {
                    "score": 4.0,
                    "note": "The browser remains TypeScript, but the primary stack still spans two product runtimes instead of one.",
                },
                "playwright_and_frontend_automation": {
                    "score": 4.5,
                    "note": "Playwright remains strong on the frontend side, with the same caveat about cross-runtime contract drift.",
                },
                "backend_api_streaming_and_concurrency_fit": {
                    "score": 4.75,
                    "note": "Excellent fit for high-concurrency APIs, typed streaming, and exact backend domain models.",
                },
                "security_ecosystem_maturity": {
                    "score": 4.5,
                    "note": "Strong ecosystem for OIDC, supply-chain controls, and service hardening.",
                },
                "observability_ecosystem_fit": {
                    "score": 4.5,
                    "note": "Excellent OpenTelemetry and JVM observability support.",
                },
                "macos_native_coexistence_strategy": {
                    "score": 4.25,
                    "note": "Still compatible with a Swift native client because the native seam remains contract-based.",
                },
                "shared_type_and_contract_reuse": {
                    "score": 3.5,
                    "note": "Better than Python for strongly typed backend models, but still weaker than TS end-to-end reuse for browser, backend, and tests.",
                },
                "hiring_maintainability_and_operability": {
                    "score": 3.5,
                    "note": "Operationally strong, but adds a new core runtime that the repo does not currently evidence.",
                },
                "migration_complexity_from_repo_evidence": {
                    "score": 2.75,
                    "note": "Requires introducing a completely new backend runtime while still retaining both TypeScript and Swift, increasing initial setup cost substantially.",
                },
                "performance_profile_under_expected_workloads": {
                    "score": 4.75,
                    "note": "Best raw backend headroom of the three alternatives, though that advantage is not yet the dominant phase-00 concern.",
                },
            },
            "strengths": [
                "Strongest backend-only story for exact-decimal rigor, concurrency, and raw performance headroom.",
                "Very credible for long-lived service operability once fully adopted.",
            ],
            "risks": [
                "Adds a third serious implementation runtime before the repo has any JVM evidence.",
                "Shared contract reuse with the browser layer is materially weaker than the TypeScript-centered option.",
            ],
        },
    ]


def validate_inputs(criteria: list[dict[str, Any]], alternatives: list[dict[str, Any]]) -> None:
    if len(alternatives) < 3:
        raise ValueError("ADR-001 requires at least three serious alternatives")
    total_weight = sum(int(item["weight"]) for item in criteria)
    if total_weight != 100:
        raise ValueError(f"Criteria weights must sum to 100, got {total_weight}")
    criterion_ids = {item["criterion_id"] for item in criteria}
    if len(criterion_ids) != len(criteria):
        raise ValueError("Duplicate criteria IDs detected")
    for criterion in criteria:
        if criterion["priority"] not in {"HARD_REQUIREMENT", "STRONG_PREFERENCE", "DEFERRED_CONCERN"}:
            raise ValueError(f"Invalid criterion priority: {criterion['priority']}")
    for alternative in alternatives:
        if set(alternative["scores"]) != criterion_ids:
            raise ValueError(f"{alternative['alternative_id']} does not cover every criterion")
        for score_data in alternative["scores"].values():
            score = float(score_data["score"])
            if score < 1 or score > 5:
                raise ValueError(f"Scores must be in the range 1..5, got {score}")


def calculate_results(
    criteria: list[dict[str, Any]], alternatives: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    criteria_by_id = {item["criterion_id"]: item for item in criteria}
    results: list[dict[str, Any]] = []
    for alternative in alternatives:
        weighted_total = 0.0
        criterion_breakdown: list[dict[str, Any]] = []
        for criterion_id, score_data in alternative["scores"].items():
            criterion = criteria_by_id[criterion_id]
            raw_score = float(score_data["score"])
            weighted_score = criterion["weight"] * raw_score / 5.0
            weighted_total += weighted_score
            criterion_breakdown.append(
                {
                    "criterion_id": criterion_id,
                    "label": criterion["label"],
                    "weight": criterion["weight"],
                    "priority": criterion["priority"],
                    "raw_score": raw_score,
                    "weighted_score": round(weighted_score, 2),
                    "note": score_data["note"],
                }
            )
        results.append(
            {
                "alternative_id": alternative["alternative_id"],
                "label": alternative["label"],
                "summary": alternative["summary"],
                "weighted_total": round(weighted_total, 2),
                "criterion_breakdown": sorted(
                    criterion_breakdown,
                    key=lambda item: (-criteria_by_id[item["criterion_id"]]["weight"], item["criterion_id"]),
                ),
                "strengths": alternative["strengths"],
                "risks": alternative["risks"],
            }
        )
    results.sort(key=lambda item: (-item["weighted_total"], item["alternative_id"]))
    for rank, result in enumerate(results, 1):
        result["rank"] = rank
    return results


def build_constraint_matrix(criteria: list[dict[str, Any]]) -> dict[str, Any]:
    summary = {
        "constraint_count": len(criteria),
        "hard_requirement_count": sum(1 for item in criteria if item["priority"] == "HARD_REQUIREMENT"),
        "strong_preference_count": sum(1 for item in criteria if item["priority"] == "STRONG_PREFERENCE"),
        "deferred_concern_count": sum(1 for item in criteria if item["priority"] == "DEFERRED_CONCERN"),
    }
    return {
        "decision_id": "ADR-001",
        "decision_name": "primary_implementation_stack",
        "summary": summary,
        "constraints": [
            {
                "constraint_id": item["criterion_id"],
                "label": item["label"],
                "classification": item["priority"],
                "weight": item["weight"],
                "rationale": item["rationale"],
                "source_refs": item["source_refs"],
            }
            for item in criteria
        ],
    }


def build_role_assignment() -> dict[str, Any]:
    return {
        "decision_id": "ADR-001",
        "chosen_primary_stack": "TypeScript-first product stack on the current active Node LTS line, with Python retained for validators/tooling and Swift retained for the native macOS client.",
        "runtime_roles": [
            {
                "role": "browser_frontend",
                "primary_runtime": "TypeScript",
                "host_runtime": "browser + Node-based build tooling",
                "secondary_runtimes": [],
                "ownership_reason": "Portal, collaboration, and governance surfaces are selector-heavy, route-rich, and Playwright-first.",
                "hard_rules": [
                    "semantic selectors remain first-class",
                    "route and shell continuity stays contract-authored",
                    "browser layout and design-token iteration remain rapid",
                ],
                "source_refs": [
                    heading_ref(FRONTEND_LAW_PATH, "10. Automation anchors and UI observability fencing"),
                    heading_ref(PORTAL_PATH, "Playwright validation minimum"),
                    heading_ref(ADMIN_GOVERNANCE_PATH, "7. Frontend systems architecture"),
                ],
            },
            {
                "role": "backend_northbound_apis_and_runtime_services",
                "primary_runtime": "TypeScript on current active Node LTS",
                "host_runtime": "Node.js",
                "secondary_runtimes": ["Python (offline validation only)"],
                "ownership_reason": "Northbound command, snapshot, stream, and authority-adapter services benefit from sharing contract types and test fixtures with the browser layer.",
                "hard_rules": [
                    "money-bearing logic must use exact-decimal abstractions only",
                    "canonical hashing must be centralized",
                    "stream resume and command idempotency remain contract-shaped",
                ],
                "source_refs": [
                    heading_ref(NORTHBOUND_API_PATH, "3. Command envelope"),
                    heading_ref(NORTHBOUND_API_PATH, "7. Stream and reconnect rules"),
                    heading_ref(AUTHORITY_PATH, "9.8 Request hashing and idempotency"),
                ],
            },
            {
                "role": "shared_contract_and_model_packages",
                "primary_runtime": "JSON Schema as source, TypeScript as primary product-consumption target",
                "host_runtime": "schema generation pipeline",
                "secondary_runtimes": ["Python validation wrappers", "Swift Codable/Decodable models"],
                "ownership_reason": "The product core should consume generated or tightly aligned TypeScript models while Python and Swift consume the same schema source through dedicated adapters.",
                "hard_rules": [
                    "closed schemas stay authoritative",
                    "canonical decimal strings stay cross-runtime stable",
                    "no handwritten DTO drift without an explicit adapter boundary",
                ],
                "source_refs": [
                    heading_ref(IMPLEMENTATION_CONVENTIONS_PATH, "2. Schema conventions"),
                    text_ref(
                        README_PATH,
                        "- JSON schemas + sample payloads in `schemas/`, including ",
                        "schema_inventory",
                    ),
                ],
            },
            {
                "role": "cli_analysis_and_forensic_tooling",
                "primary_runtime": "Python",
                "host_runtime": "Python 3",
                "secondary_runtimes": [],
                "ownership_reason": "The repository already has a substantial Python validator, analysis, and forensic toolchain that should remain first-class rather than being rewritten prematurely.",
                "hard_rules": [
                    "Python remains the authoritative offline contract-validation toolchain for the corpus",
                    "tooling consumes schemas and golden fixtures rather than inventing parallel models",
                ],
                "source_refs": [
                    text_ref(
                        README_PATH,
                        "The authoritative validator entrypoints are `python3 Algorithm/scripts/validate_contracts.py --self-test` and `python3 Algorithm/tools/forensic_contract_guard.py`",
                        "authoritative_validator_entrypoints",
                    ),
                    text_ref(
                        README_PATH,
                        "Run `python3 Algorithm/scripts/validate_contracts.py --self-test` to validate every schema",
                        "validator_command",
                    ),
                ],
            },
            {
                "role": "browser_test_automation",
                "primary_runtime": "TypeScript",
                "host_runtime": "Playwright on Node.js",
                "secondary_runtimes": [],
                "ownership_reason": "Playwright is already present in the repo and is explicitly required by the UI/UX and browser-surface contracts.",
                "hard_rules": [
                    "tests reuse semantic selectors",
                    "fixtures stay contract-driven",
                    "browser automation remains mandatory regardless of backend runtime",
                ],
                "source_refs": [
                    heading_ref(UIUX_SKILL_PATH, "Playwright-first / XCUITest-first design expectation"),
                    text_ref(PACKAGE_JSON_PATH, "@playwright/test", "playwright_dependency"),
                ],
            },
            {
                "role": "native_desktop_client",
                "primary_runtime": "Swift",
                "host_runtime": "SwiftUI with targeted AppKit",
                "secondary_runtimes": [],
                "ownership_reason": "The macOS operator workspace is a first-class native embodiment and must not be reduced to a browser wrapper.",
                "hard_rules": [
                    "server remains source of legal truth",
                    "native client stays projection-and-command only",
                    "SwiftUI default with AppKit for dense evidence surfaces",
                ],
                "source_refs": [
                    heading_ref(MACOS_BLUEPRINT_PATH, "1. Architectural thesis"),
                    heading_ref(MACOS_BLUEPRINT_PATH, "9. SwiftUI versus AppKit decision matrix"),
                ],
            },
            {
                "role": "native_ui_automation",
                "primary_runtime": "Swift",
                "host_runtime": "XCUITest",
                "secondary_runtimes": [],
                "ownership_reason": "Native executable validation belongs in the design loop alongside Playwright for browser surfaces.",
                "hard_rules": [
                    "native semantic identifiers mirror browser semantic selectors where the contract says so",
                ],
                "source_refs": [
                    heading_ref(UIUX_SKILL_PATH, "Playwright-first / XCUITest-first design expectation"),
                    heading_ref(UIUX_SKILL_PATH, "Selector strategy"),
                ],
            },
            {
                "role": "product_adjacent_glue_and_ops_scripts",
                "primary_runtime": "TypeScript for product-adjacent automation, Python where existing validator/analysis scripts already own the job",
                "host_runtime": "Node.js or Python",
                "secondary_runtimes": [],
                "ownership_reason": "Avoid inventing a fourth first-class runtime for ordinary glue. Prefer the existing product-core runtime unless Python already owns the tool surface.",
                "hard_rules": [
                    "no gratuitous runtime proliferation",
                    "glue scripts should consume shared contracts rather than hard-coded ad hoc payloads",
                ],
                "source_refs": [
                    text_ref(
                        README_PATH,
                        "The authoritative validator entrypoints are `python3 Algorithm/scripts/validate_contracts.py --self-test` and `python3 Algorithm/tools/forensic_contract_guard.py`",
                        "python_tooling_is_real",
                    ),
                    text_ref(PACKAGE_JSON_PATH, "\"type\": \"module\"", "node_tooling_is_real"),
                ],
            },
        ],
        "seam_rules": [
            {
                "boundary": "TypeScript product core <-> Python tooling",
                "rule": "Share schemas, canonical fixtures, and generated metadata; do not duplicate product business logic in Python except for offline verification and analysis packs.",
            },
            {
                "boundary": "TypeScript product core <-> Swift macOS client",
                "rule": "Share northbound contracts and generated models; keep legal truth, gate logic, and authority mutation semantics on the server.",
            },
            {
                "boundary": "TypeScript browser frontend <-> TypeScript backend",
                "rule": "Share contract-shaped DTOs and validation helpers, but keep UI state and server truth concerns separated.",
            },
        ],
    }


def build_consumption_strategy() -> dict[str, Any]:
    return {
        "decision_id": "ADR-001",
        "canonical_sources": [
            {
                "source": "Algorithm prose contracts",
                "role": "human-authoritative semantics and invariants",
            },
            {
                "source": "JSON schemas in Algorithm/schemas/",
                "role": "machine-authoritative shape, version, and contract boundary",
            },
            {
                "source": "deterministic fixtures, sample payloads, and validator self-tests",
                "role": "cross-runtime drift detection",
            },
        ],
        "runtime_consumers": {
            "typescript_node": {
                "responsibility": "primary product consumption for browser surfaces, backend APIs, streams, and orchestration",
                "consumes": [
                    "generated types from schemas",
                    "runtime validators or schema-derived guards",
                    "canonical decimal-string and hash helpers",
                ],
                "must_not": [
                    "use binary floating-point for money-bearing logic",
                    "invent alternate DTOs for the same persisted contract without a documented adapter",
                ],
            },
            "python": {
                "responsibility": "offline schema validation, forensic guards, analysis packs, and deterministic verification tooling",
                "consumes": [
                    "schemas",
                    "sample payloads",
                    "golden fixtures",
                    "derived analysis packs",
                ],
                "must_not": [
                    "quietly become a second live product-core implementation of the same business logic",
                ],
            },
            "swift": {
                "responsibility": "native projection, command-client, and view-state consumption for the macOS workspace",
                "consumes": [
                    "generated Codable/Decodable models",
                    "northbound snapshot and stream contracts",
                    "semantic selector and continuity contracts mapped to accessibility identifiers",
                ],
                "must_not": [
                    "re-implement legal truth, gate logic, or authority rules on-device",
                ],
            },
        },
        "semantic_drift_guards": [
            "keep schemas closed and versioned by default",
            "treat canonical decimal strings and canonical hashing as one shared cross-runtime law",
            "run Python contract self-test and forensic guard as baseline CI gates",
            "add TypeScript contract tests against the same sample payloads and deterministic fixtures",
            "treat Swift decode smoke tests and native selector parity checks as contract consumers, not manual interpretation layers",
        ],
        "generation_flow": [
            "author or update Algorithm prose and schemas",
            "run corpus validators and derived-analysis builders",
            "generate or refresh TypeScript product types and runtime validators",
            "refresh Python analysis/fixture consumers where schema changes require it",
            "refresh Swift models and compatibility tests for native surfaces",
        ],
        "deferred_tool_choices": [
            "exact code generator selection for TypeScript and Swift",
            "package names and monorepo boundaries for shared contracts",
            "the exact Node web framework or transport library",
            "the exact decimal library or implementation detail used inside the TypeScript runtime",
        ],
    }


def build_scorecard_payload(
    criteria: list[dict[str, Any]], results: list[dict[str, Any]]
) -> dict[str, Any]:
    winner = results[0]
    return {
        "decision_id": "ADR-001",
        "decision_name": "primary_implementation_stack",
        "scoring_scale": {
            "minimum": 1,
            "maximum": 5,
            "interpretation": "5 = best fit against the corpus constraint, 1 = weak fit or high risk",
        },
        "criteria": criteria,
        "alternatives": results,
        "winner": {
            "alternative_id": winner["alternative_id"],
            "label": winner["label"],
            "weighted_total": winner["weighted_total"],
        },
    }


def build_mermaid() -> str:
    return "\n".join(
        [
            "flowchart TD",
            '  prose["Algorithm prose contracts"]',
            '  schemas["JSON schemas and sample payloads"]',
            '  fixtures["Deterministic fixtures and validator self-tests"]',
            '  canon["Canonical serialization, decimal, and hash law"]',
            '  tscontracts["TypeScript generated and hand-authored contract package"]',
            '  nodecore["Node.js product core"]',
            '  browser["Browser product surfaces"]',
            '  playwright["Playwright browser automation"]',
            '  pytools["Python validators and analysis tooling"]',
            '  swiftmodels["Swift generated models and adapters"]',
            '  macos["SwiftUI/AppKit macOS client"]',
            "  prose --> schemas",
            "  schemas --> fixtures",
            "  prose --> canon",
            "  schemas --> tscontracts",
            "  canon --> tscontracts",
            "  fixtures --> tscontracts",
            "  tscontracts --> nodecore",
            "  tscontracts --> browser",
            "  tscontracts --> playwright",
            "  schemas --> pytools",
            "  fixtures --> pytools",
            "  canon --> pytools",
            "  schemas --> swiftmodels",
            "  canon --> swiftmodels",
            "  swiftmodels --> macos",
            "  nodecore --> browser",
            "  nodecore --> macos",
            "  classDef primary fill:#E6FFFA,stroke:#2C7A7B,color:#234E52;",
            "  classDef support fill:#EBF8FF,stroke:#3182CE,color:#2A4365;",
            "  classDef source fill:#F7FAFC,stroke:#4A5568,color:#2D3748;",
            "  class nodecore,browser,playwright,tscontracts primary;",
            "  class pytools,swiftmodels,macos support;",
            "  class prose,schemas,fixtures,canon source;",
        ]
    ) + "\n"


def write_adr_markdown(
    criteria: list[dict[str, Any]],
    results: list[dict[str, Any]],
    role_assignment: dict[str, Any],
    consumption_strategy: dict[str, Any],
) -> None:
    winner = results[0]
    comparison_rows = [
        [result["label"], result["weighted_total"], result["rank"]]
        for result in results
    ]
    driver_rows = [
        [item["label"], item["priority"], item["weight"], item["rationale"]]
        for item in criteria
    ]
    role_rows = [
        [item["role"], item["primary_runtime"], item["host_runtime"], item["ownership_reason"]]
        for item in role_assignment["runtime_roles"]
    ]
    sections = [
        "# ADR-001: Primary Implementation Stack",
        "",
        "- Status: Accepted",
        f"- Date: {TODAY}",
        "- Deciders: Phase 00 architecture analysis pack",
        "",
        "## Context",
        "",
        "Taxat needs one declared product-core stack before later ADRs choose storage, identity/session details, authority-boundary implementation specifics, frontend topology, and testing/release strategies. The algorithm corpus is unusually demanding: canonical hashing, replay-safe execution, exact-decimal money rules, contract-heavy schemas, rich browser shells, Playwright-first validation, append-only auditability, and a first-class native macOS workspace all need to coexist without semantic drift.",
        "",
        "The repository already shows two concrete implementation signals:",
        "",
        "- Python is the live corpus-validation and analysis runtime through `Algorithm/scripts/validate_contracts.py`, `Algorithm/tools/forensic_contract_guard.py`, and the growing `tools/analysis/*.py` estate.",
        "- Node/TypeScript is already present for Playwright and the browser-viewable analysis atlases, which matches the browser-product and selector-heavy obligations in the frontend contracts.",
        "",
        "ADR-001 therefore has to pick a primary product stack while still preserving justified secondary runtimes that the corpus already implies.",
        "",
        "## Decision",
        "",
        "Adopt a **TypeScript-first product stack on the current active Node LTS line** for:",
        "",
        "- browser product surfaces",
        "- northbound APIs and stream/reconnect services",
        "- authority-facing orchestration and gateway adapters",
        "- shared product-runtime contract packages",
        "- Playwright browser automation and browser-facing fixtures",
        "",
        "Retain **Python** as a first-class supporting runtime for:",
        "",
        "- corpus validators and forensic guards",
        "- offline analysis builders",
        "- deterministic fixture generation and verification",
        "- contract-consumption smoke tests that validate cross-runtime drift",
        "",
        "Retain **Swift** with **SwiftUI by default and targeted AppKit where the blueprint requires it** for:",
        "",
        "- the native macOS operator workspace",
        "- native UI automation via XCUITest",
        "- native projection, cache, and command-client consumption of shared contracts",
        "",
        "This is an intentionally polyglot decision, but only at the seams the corpus already justifies. Taxat is not adopting a 'best tool per file' culture.",
        "",
        "## Decision Drivers",
        "",
        markdown_table(
            ["Driver", "Priority", "Weight", "Why It Matters"],
            driver_rows,
        ),
        "",
        "## Alternatives Considered",
        "",
        markdown_table(
            ["Alternative", "Weighted Score", "Rank"],
            comparison_rows,
        ),
        "",
        "The winning option is **"
        + winner["label"]
        + f"** with a weighted score of `{winner['weighted_total']}`.",
        "",
        "## Why This Option Wins",
        "",
        "- It is the strongest fit for the browser-heavy product surface, the semantic-selector contracts, and the Playwright-first validation model.",
        "- It gives the cleanest shared-type story across browser UI, backend APIs, and automated browser tests, which is the largest avoidable source of drift at this phase.",
        "- It preserves the substantial Python validator and analysis estate as a first-class support runtime instead of forcing a premature rewrite.",
        "- It coexists cleanly with the server-authoritative Swift macOS client because the native blueprint already expects the server to own legal truth and the client to stay projection-and-command only.",
        "",
        "## Guardrails on the Decision",
        "",
        "- No money-bearing or hash-governing path may use imprecise binary floating-point primitives without a documented exact-decimal abstraction. In practice, persisted money values remain canonical decimal strings with fixed scale.",
        "- Canonical serialization and hash calculation must live in one shared, versioned implementation boundary, not one ad hoc copy per service or client.",
        "- Python remains authoritative for corpus self-tests and forensic guards until a concrete replacement plan exists. ADR-001 does not authorize deleting or sidelining that tooling estate.",
        "- Swift remains the only acceptable runtime for the first-class native macOS client. ADR-001 does not authorize replacing the native workspace with a browser wrapper or embedded-web compromise.",
        "",
        "## Runtime Role Assignment",
        "",
        markdown_table(
            ["Role", "Primary Runtime", "Host Runtime", "Why"],
            role_rows,
        ),
        "",
        "## Consequences",
        "",
        "Positive consequences:",
        "",
        "- Product-core browser and backend work can share one primary language and one primary contract-consumption target.",
        "- Playwright, browser fixtures, and product DTOs stay in one ecosystem instead of straddling a harder backend seam.",
        "- Python keeps its clear, justified ownership of validation and analysis rather than being forced into the live product core just because it already exists.",
        "- Swift remains a principled client embodiment rather than a second compliance engine.",
        "",
        "Negative consequences and tradeoffs:",
        "",
        "- TypeScript requires stronger discipline than Python or Kotlin around exact-decimal safety and canonical serialization.",
        "- Product engineers still need to operate in a polyglot repo: TypeScript for product core, Python for validation/tooling, and Swift for native.",
        "- Some backend-only alternatives offer stronger raw throughput or built-in decimal ergonomics, but they lose too much on browser alignment and shared contract reuse for phase 00.",
        "",
        "## Risks and Mitigations",
        "",
        "| Risk | Why It Matters | Mitigation |",
        "| --- | --- | --- |",
        "| JS number drift in money-bearing paths | Violates exact-decimal and replay credibility. | Enforce fixed-scale decimal abstractions, canonical decimal-string persistence, and contract tests that reject binary-float drift. |",
        "| Hash drift across runtimes | Breaks replay, manifest sealing, and deterministic attestation. | Centralize canonical serialization/hash helpers and validate them against Python fixtures and golden packs. |",
        "| Type drift between TypeScript, Python, and Swift consumers | Causes browser/backend/native disagreement. | Keep schemas as the only machine-authoritative shape source and gate changes through cross-runtime fixture tests. |",
        "| Backend framework details leak into ADR-001 | Would prematurely decide storage, transport, or identity implementation details. | Fence those items explicitly as deferred ADRs. |",
        "",
        "## Rollback Posture",
        "",
        "If the TypeScript/Node product core cannot satisfy exact-decimal discipline, canonical hashing, or operational requirements during implementation spikes, the rollback target is **not** a free-for-all rewrite. The rollback path is to preserve:",
        "",
        "- the same prose contracts and JSON schemas",
        "- the same Python validator and fixture estate",
        "- the same Swift native client boundary",
        "",
        "and to reconsider the backend/product-core runtime behind the same contract seam, with Kotlin/JVM as the strongest current fallback candidate. That rollback would be a later ADR superseding ADR-001 rather than a quiet per-service drift.",
        "",
        "## Deferred Decisions",
        "",
        "- storage and eventing topology",
        "- identity, step-up, and session implementation details",
        "- authority-boundary implementation specifics",
        "- exact web framework and browser frontend topology",
        "- exact decimal library and codegen tool choices",
        "- monorepo package boundaries and team ownership splits",
        "",
        "Those decisions are intentionally deferred to later ADRs or later phase-00 cards.",
        "",
        "## Shared Contract Consumption Strategy",
        "",
        "- Canonical sources: prose contracts, JSON schemas, deterministic fixtures, and validator self-tests.",
        "- Primary product consumption target: TypeScript for browser and Node runtime code.",
        "- Supporting consumption targets: Python for offline verification and analysis; Swift for native projection and command-client models.",
        "- Drift guards: shared canonical decimal/hash law, Python validator self-test, TypeScript fixture tests, and native decode smoke tests.",
        "",
        "## References",
        "",
        "- Constraint matrix: [primary_stack_constraint_matrix.json](/Users/test/Code/taxat_/data/analysis/primary_stack_constraint_matrix.json)",
        "- Runtime role map: [language_runtime_role_assignment.json](/Users/test/Code/taxat_/data/analysis/language_runtime_role_assignment.json)",
        "- Contract consumption strategy: [shared_contract_consumption_strategy.json](/Users/test/Code/taxat_/data/analysis/shared_contract_consumption_strategy.json)",
        "- Scorecard: [ADR-001-primary-implementation-stack-scorecard.json](/Users/test/Code/taxat_/docs/architecture/adr/ADR-001-primary-implementation-stack-scorecard.json)",
        "- Comparison notes: [ADR-001-primary-implementation-stack-comparison.md](/Users/test/Code/taxat_/docs/architecture/adr/ADR-001-primary-implementation-stack-comparison.md)",
        "- Decision diagram: [ADR-001-primary-implementation-stack.mmd](/Users/test/Code/taxat_/diagrams/analysis/ADR-001-primary-implementation-stack.mmd)",
        "",
    ]
    text_write(ADR_PATH, "\n".join(sections))


def write_comparison_markdown(criteria: list[dict[str, Any]], results: list[dict[str, Any]]) -> None:
    criteria_by_id = {item["criterion_id"]: item for item in criteria}
    summary_rows = [
        [result["rank"], result["label"], result["weighted_total"], "; ".join(result["strengths"][:2])]
        for result in results
    ]
    sections = [
        "# ADR-001 Comparison Notes",
        "",
        "This comparison expands the weighted scorecard that supports ADR-001.",
        "",
        "## Ranking",
        "",
        markdown_table(
            ["Rank", "Alternative", "Weighted Score", "Leading Strengths"],
            summary_rows,
        ),
        "",
        "## Criteria and Weights",
        "",
        markdown_table(
            ["Criterion", "Priority", "Weight", "Source Grounding"],
            [
                [
                    item["label"],
                    item["priority"],
                    item["weight"],
                    item["source_refs"],
                ]
                for item in criteria
            ],
        ),
        "",
        "## Criterion-By-Criterion Scoring",
        "",
    ]

    for criterion in sorted(criteria, key=lambda item: (-item["weight"], item["criterion_id"])):
        row_values: list[list[Any]] = []
        for result in results:
            breakdown = next(
                item for item in result["criterion_breakdown"] if item["criterion_id"] == criterion["criterion_id"]
            )
            row_values.append(
                [
                    result["label"],
                    breakdown["raw_score"],
                    breakdown["weighted_score"],
                    breakdown["note"],
                ]
            )
        sections.extend(
            [
                f"### {criterion['label']}",
                "",
                f"- Priority: `{criterion['priority']}`",
                f"- Weight: `{criterion['weight']}`",
                f"- Rationale: {criterion['rationale']}",
                "",
                markdown_table(
                    ["Alternative", "Raw Score", "Weighted Contribution", "Reason"],
                    row_values,
                ),
                "",
            ]
        )

    sections.extend(
        [
            "## Why The Runner-Up Options Lost",
            "",
            f"- `{results[1]['label']}` is strongest on backend exact-decimal rigor and concurrency headroom, but it introduces a new core runtime and loses too much end-to-end contract reuse between browser UI, backend APIs, and Playwright fixtures.",
            f"- `{results[2]['label']}` is technically strong on backend rigor and throughput, but phase 00 would pay too much upfront in migration cost and runtime fragmentation for advantages that are not yet the dominant decision drivers.",
            "",
        ]
    )
    text_write(COMPARISON_PATH, "\n".join(sections))


def main() -> None:
    criteria = build_criteria()
    alternatives = build_alternatives()
    validate_inputs(criteria, alternatives)
    results = calculate_results(criteria, alternatives)
    if results[0]["alternative_id"] != "typescript_node_primary_with_python_and_swift":
        raise ValueError("ADR-001 input data no longer supports the expected winning stack")

    constraint_matrix = build_constraint_matrix(criteria)
    role_assignment = build_role_assignment()
    consumption_strategy = build_consumption_strategy()
    scorecard = build_scorecard_payload(criteria, results)

    json_write(CONSTRAINT_MATRIX_PATH, constraint_matrix)
    json_write(ROLE_ASSIGNMENT_PATH, role_assignment)
    json_write(CONSUMPTION_STRATEGY_PATH, consumption_strategy)
    json_write(SCORECARD_PATH, scorecard)
    text_write(MERMAID_PATH, build_mermaid())
    write_adr_markdown(criteria, results, role_assignment, consumption_strategy)
    write_comparison_markdown(criteria, results)

    print(
        json.dumps(
            {
                "status": "PASS",
                "winner": results[0]["alternative_id"],
                "winner_score": results[0]["weighted_total"],
                "alternative_count": len(results),
                "criteria_weight_sum": sum(item["weight"] for item in criteria),
            },
            indent=2,
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
