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
PROTOTYPE_DIR = ROOT / "prototypes" / "analysis" / "web-shell-atlas"

FRONTEND_SHELL_PATH = ALGORITHM_DIR / "frontend_shell_and_interaction_law.md"
LOW_NOISE_PATH = ALGORITHM_DIR / "low_noise_experience_contract.md"
PORTAL_PATH = ALGORITHM_DIR / "customer_client_portal_experience_contract.md"
COLLABORATION_PATH = ALGORITHM_DIR / "collaboration_workspace_contract.md"
GOVERNANCE_PATH = ALGORITHM_DIR / "admin_governance_console_architecture.md"
FOUNDATION_PATH = (
    ALGORITHM_DIR / "cross_shell_design_token_and_interaction_layer_foundation_contract.md"
)
SEMANTIC_SELECTOR_PATH = ALGORITHM_DIR / "semantic_selector_and_accessibility_contract.md"
SEMANTIC_REGRESSION_PATH = (
    ALGORITHM_DIR / "semantic_selector_and_accessibility_regression_pack_contract.md"
)
SHELL_CONTINUITY_PATH = (
    ALGORITHM_DIR / "shell_continuity_fuzzing_and_recovery_contract.md"
)
CROSS_DEVICE_PATH = ALGORITHM_DIR / "cross_device_continuity_and_restoration_contract.md"
FOCUS_RESTORE_PATH = (
    ALGORITHM_DIR / "focus_restoration_and_return_target_harness_contract.md"
)
UIUX_SKILL_PATH = ALGORITHM_DIR / "UIUX_DESIGN_SKILL.md"
NORTHBOUND_PATH = ALGORITHM_DIR / "northbound_api_and_session_contract.md"

SHELL_ROUTE_MATRIX_PATH = DATA_ANALYSIS_DIR / "shell_route_matrix.json"
INTERACTION_LAYER_MAP_PATH = DATA_ANALYSIS_DIR / "interaction_layer_foundation_map.json"
SEMANTIC_SELECTOR_REGISTRY_PATH = DATA_ANALYSIS_DIR / "semantic_selector_registry.json"
CONTINUITY_RECOVERY_MATRIX_PATH = DATA_ANALYSIS_DIR / "continuity_recovery_matrix.json"
LAYOUT_BREAKPOINT_CONTRACT_PATH = DATA_ANALYSIS_DIR / "layout_breakpoint_contract.json"
ROUTE_FOCUS_REGISTRY_PATH = (
    DATA_ANALYSIS_DIR / "route_landmark_and_focus_order_registry.json"
)
SURFACE_ROUTE_MATRIX_PATH = DATA_ANALYSIS_DIR / "surface_route_and_capability_matrix.json"
READ_MODEL_ROUTE_MAP_PATH = DATA_ANALYSIS_DIR / "read_model_to_route_and_shell_map.json"
GAP_REGISTER_PATH = DATA_ANALYSIS_DIR / "cross_surface_gap_register.json"

ADR_PATH = DOCS_ARCH_ADR_DIR / "ADR-006-web-frontend-topology.md"
COMPARISON_PATH = (
    DOCS_ARCH_ADR_DIR / "ADR-006-web-frontend-topology-comparison.md"
)
SCORECARD_PATH = (
    DOCS_ARCH_ADR_DIR / "ADR-006-web-frontend-topology-scorecard.json"
)
SURFACE_TOPOLOGY_PATH = DATA_ANALYSIS_DIR / "web_surface_topology_and_deployable_map.json"
ROUTE_GROUP_PATH = DATA_ANALYSIS_DIR / "web_route_group_and_shell_ownership_map.json"
STATE_DOMAIN_PATH = DATA_ANALYSIS_DIR / "web_state_domain_and_data_boundary_map.json"
TOKEN_BINDING_PATH = (
    DATA_ANALYSIS_DIR / "web_design_token_and_interaction_layer_binding.json"
)
PLAYWRIGHT_STRATEGY_PATH = DATA_ANALYSIS_DIR / "web_playwright_strategy.json"
MERMAID_PATH = DIAGRAMS_ANALYSIS_DIR / "ADR-006-web-frontend-topology.mmd"
ATLAS_DATA_PATH = PROTOTYPE_DIR / "atlas_data.json"

HEADING_RE = re.compile(r"^(#{2,4})\s+(.*)$")
TODAY = "2026-04-18"

VISUAL_SYSTEM = {
    "background": "#F6F7F9",
    "surface_primary": "#FFFFFF",
    "surface_secondary": "#EEF1F4",
    "text_strong": "#111318",
    "text_muted": "#5B6472",
    "hairline": "rgba(17,19,24,0.08)",
    "success": "#12715B",
    "warning": "#8A5A00",
    "danger": "#A63A2B",
    "calm_accent": "#3158C7",
    "portal_accent": "#19796C",
    "governance_accent": "#7C4E8E",
}


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


def line_ref(path: Path, line_number: int, label: str) -> str:
    safe_label = re.sub(r"[^A-Za-z0-9_.-]+", "_", label).strip("_") or "line"
    return f"{repo_rel(path)}::L{line_number}[{safe_label}]"


def heading_ref(path: Path, heading_text: str, label: str | None = None) -> str:
    return line_ref(path, find_heading_line(path, heading_text), label or heading_text)


def md_escape(value: Any) -> str:
    if isinstance(value, list):
        value = ", ".join(str(item) for item in value)
    return str(value).replace("|", "\\|").replace("\n", " ").strip()


def markdown_table(headers: list[str], rows: list[list[Any]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join("---" for _ in headers) + " |"
    body_lines = [
        "| " + " | ".join(md_escape(cell) for cell in row) + " |" for row in rows
    ]
    return "\n".join([header_line, divider_line, *body_lines])


def normalize_source_refs(source_refs: Iterable[Any]) -> list[str]:
    normalized: list[str] = []
    for ref in source_refs:
        if isinstance(ref, str):
            normalized.append(ref)
            continue
        if isinstance(ref, dict):
            source_file = ref.get("source_file", "unknown")
            logical_block = (
                ref.get("source_heading_or_logical_block")
                or ref.get("source_heading")
                or "source"
            )
            rationale = ref.get("rationale")
            text = f"{source_file}::{logical_block}"
            if rationale:
                text += f"[{rationale}]"
            normalized.append(text)
            continue
        normalized.append(str(ref))
    return ordered_unique(normalized)


def deployable_for_shell(shell_family: str) -> str:
    return "client-portal-web" if shell_family == "CLIENT_PORTAL_SHELL" else "operator-web"


def route_group_for_key(route_key: str) -> str:
    if route_key == "calm_manifest_workspace":
        return "manifest_workspace"
    if route_key.startswith("collaboration_") and "customer" not in route_key:
        return "operator_collaboration"
    if route_key.startswith("portal_"):
        return "portal_primary"
    if route_key.startswith("collaboration_customer_"):
        return "portal_request_context"
    if route_key.startswith("governance_"):
        return "governance_console"
    return "shared_browser_edge"


def build_supporting_context() -> dict[str, Any]:
    route_map = load_json(READ_MODEL_ROUTE_MAP_PATH)
    selectors = load_json(SEMANTIC_SELECTOR_REGISTRY_PATH)
    continuity = load_json(CONTINUITY_RECOVERY_MATRIX_PATH)
    gaps = load_json(GAP_REGISTER_PATH)
    browser_routes = [row for row in route_map["routes"] if row["embodiment"] == "WEB"]
    return {
        "browser_route_count": len(browser_routes),
        "route_map_count": route_map["summary"]["route_or_scene_count"],
        "selector_profile_count": selectors["summary"]["profile_count"],
        "selector_count": selectors["summary"]["selector_count"],
        "continuity_scenario_count": continuity["summary"]["scenario_count"],
        "gap_count": gaps["summary"]["gap_count"],
    }


def build_shared_packages() -> list[dict[str, Any]]:
    return [
        {
            "package_id": "packages/contracts",
            "responsibility": "Generated and hand-authored route, shell, projection, selector, and stale-guard contracts shared by both deployables.",
            "must_not_hold": "framework-specific page composition or branded copy",
        },
        {
            "package_id": "packages/route-runtime",
            "responsibility": "Shell ownership, route grammar, deep-link restore, browser handoff return, and same-object continuity helpers.",
            "must_not_hold": "audience-specific page chrome",
        },
        {
            "package_id": "packages/design-tokens",
            "responsibility": "Light premium browser token system, shell accents, spacing scales, typography stacks, and motion timing constants.",
            "must_not_hold": "route business logic",
        },
        {
            "package_id": "packages/interaction-layers",
            "responsibility": "Operator, portal, and governance interaction-layer bindings mapped from the shell foundation contract.",
            "must_not_hold": "raw API fetching or cache adapters",
        },
        {
            "package_id": "packages/selector-grammar",
            "responsibility": "Semantic selector helpers and accessibility anchor exports for Playwright-first validation.",
            "must_not_hold": "visual-only classes or CSS selectors as test contracts",
        },
        {
            "package_id": "packages/northbound-clients",
            "responsibility": "Typed API clients, command envelope helpers, receipt polling, upload-session clients, and stream adapters.",
            "must_not_hold": "route-local composition or customer-safe copy decisions",
        },
        {
            "package_id": "packages/state-runtime",
            "responsibility": "Shared cache keys, continuity store utilities, stale/rebase posture state, and session-bound storage guards.",
            "must_not_hold": "durable business truth",
        },
        {
            "package_id": "packages/test-harness",
            "responsibility": "Playwright fixtures, semantic locator helpers, contract-driven mocks, and screenshot harness utilities.",
            "must_not_hold": "production runtime side effects",
        },
    ]


def build_browser_routes() -> list[dict[str, Any]]:
    route_map = load_json(READ_MODEL_ROUTE_MAP_PATH)
    shell_routes = load_json(SHELL_ROUTE_MATRIX_PATH)
    landmarks = load_json(ROUTE_FOCUS_REGISTRY_PATH)
    surface_routes = load_json(SURFACE_ROUTE_MATRIX_PATH)

    shell_lookup = {row["route_id"]: row for row in shell_routes["route_records"]}
    landmark_lookup = {row["route_id"]: row for row in landmarks["routes"]}
    surface_lookup = {row["route_or_scene_key"]: row for row in surface_routes["routes"]}

    browser_rows: list[dict[str, Any]] = []
    for row in route_map["routes"]:
        if row["embodiment"] != "WEB":
            continue
        route_key = row["route_or_scene_key"]
        canonical_key = row["canonical_route_key"]
        shell_row = shell_lookup.get(canonical_key)
        landmark_row = landmark_lookup.get(canonical_key)
        surface_row = surface_lookup.get(route_key)
        deployable = deployable_for_shell(row["shell_family"])
        browser_rows.append(
            {
                "route_or_scene_key": route_key,
                "canonical_route_key": canonical_key,
                "deployable_id": deployable,
                "route_group_id": route_group_for_key(route_key),
                "shell_family": row["shell_family"],
                "interaction_layer_contract": row["interaction_layer_contract"],
                "title": row["title"],
                "route_pattern": row["route_pattern"],
                "viewer_capability_profile": row["viewer_capability_profile"],
                "projection_contract": row["projection_contract"],
                "read_models": row["read_models"],
                "command_transport": row["command_transport"],
                "stream_sources": row["stream_sources"],
                "visibility_lanes": row["visibility_lanes"],
                "cache_partition_basis": row["cache_partition_basis"],
                "landmarks": landmark_row["landmarks"] if landmark_row else [],
                "focus_order": landmark_row["focus_order"] if landmark_row else [],
                "default_focus_anchor": (
                    landmark_row["default_focus_anchor"] if landmark_row else None
                ),
                "promoted_support_region_policy": (
                    landmark_row["promoted_support_region_policy"]
                    if landmark_row
                    else surface_row.get("promoted_support_region")
                    if surface_row
                    else None
                ),
                "stale_view_posture": row["stale_view_posture"],
                "recovery_and_resume_rules": row["recovery_and_resume_rules"],
                "notes": row["notes"],
                "source_refs": normalize_source_refs(row["source_refs"]),
            }
        )
    browser_rows.sort(key=lambda item: (item["deployable_id"], item["route_pattern"]))
    return browser_rows


def build_surface_topology_and_deployable_map() -> dict[str, Any]:
    browser_routes = build_browser_routes()
    shared_packages = build_shared_packages()

    deployables = [
        {
            "deployable_id": "operator-web",
            "label": "Operator Web",
            "audiences": [
                "STAFF_OPERATOR",
                "TENANT_ADMIN",
                "AUDITOR",
                "APPROVER",
                "SUPPORT_OPERATOR",
            ],
            "shell_families": ["CALM_SHELL", "GOVERNANCE_DENSITY_SHELL"],
            "route_group_ids": ["manifest_workspace", "operator_collaboration", "governance_console"],
            "session_posture": "Internal authenticated browser surface with receipt-aware mutations, step-up checkpoints, and authority/help handoff returns.",
            "bundle_policy": "Keep calm-shell and governance code in one internal deployable with route-level code splitting so internal session and selector grammar stay unified without exposing portal bundles.",
            "why_separate": "The internal surface shares operator identity posture and can reuse internal shell runtime without shipping customer-safe copy or portal bundles.",
            "shared_packages": [row["package_id"] for row in shared_packages],
        },
        {
            "deployable_id": "client-portal-web",
            "label": "Client Portal Web",
            "audiences": [
                "CLIENT_VIEWER",
                "CLIENT_CONTRIBUTOR",
                "CLIENT_SIGNATORY",
            ],
            "shell_families": ["CLIENT_PORTAL_SHELL"],
            "route_group_ids": ["portal_primary", "portal_request_context"],
            "session_posture": "Customer-safe authenticated browser surface with explicit continuity contracts, plain-language copy, and route-bound upload/approval flows.",
            "bundle_policy": "Portal deployable excludes governance and internal operator modules entirely, and ships only portal-safe selectors, copy, and route families.",
            "why_separate": "Deployable isolation protects customer-safe semantics, bundle size, branding, and blast radius from internal operator/governance changes.",
            "shared_packages": [row["package_id"] for row in shared_packages],
        },
    ]
    route_counts = {
        deployable["deployable_id"]: len(
            [
                route
                for route in browser_routes
                if route["deployable_id"] == deployable["deployable_id"]
            ]
        )
        for deployable in deployables
    }
    for deployable in deployables:
        deployable["route_count"] = route_counts[deployable["deployable_id"]]

    relevant_gaps = load_json(GAP_REGISTER_PATH)["gaps"]
    typed_gaps = [
        {
            "gap_key": row["gap_key"],
            "summary": row["summary"],
            "status": row["status"],
            "source_refs": normalize_source_refs(row["source_refs"]),
        }
        for row in relevant_gaps
        if row["gap_key"]
        in {
            "PORTAL_READ_PATH_LITERALS_NOT_FULLY_ENUMERATED",
            "PORTAL_COMMAND_ENUMS_NORMALIZED_FROM_PROSE",
            "GOVERNANCE_MUTATION_ENUMS_NORMALIZED_FROM_PROSE",
            "MANIFEST_FOCUS_ROUTE_NORMALIZED",
        }
    ]

    return {
        "contract_version": TODAY,
        "selected_topology": {
            "topology_id": "shared_platform_two_deployables",
            "summary": "One shared TypeScript/React browser platform with two deployables: `operator-web` for calm-shell and governance surfaces, and `client-portal-web` for the customer-safe portal shell.",
            "explicit_non_choices": [
                "No single mega application that ships every shell family and audience in one browser deployable.",
                "No route-level micro-frontend seams that fracture shell continuity or selector grammar.",
            ],
        },
        "summary": {
            "browser_route_count": len(browser_routes),
            "deployable_count": len(deployables),
            "shared_package_count": len(shared_packages),
            "deployable_route_counts": route_counts,
        },
        "deployables": deployables,
        "shared_packages": shared_packages,
        "browser_routes": browser_routes,
        "typed_gaps": typed_gaps,
    }


def build_route_group_and_shell_ownership_map(
    surface_topology: dict[str, Any]
) -> dict[str, Any]:
    group_specs = {
        "manifest_workspace": {
            "label": "Manifest workspace",
            "deployable_id": "operator-web",
            "shell_family": "CALM_SHELL",
            "owner_package": "apps/operator-web + packages/route-runtime + packages/interaction-layers",
            "continuity_rule": "Same manifest or focused workflow object must reopen in the calm shell with the same dominant question and promoted support region policy.",
            "browser_handoff_rule": "Authority or identity browser handoff returns to the same manifest object and focus anchor.",
        },
        "operator_collaboration": {
            "label": "Operator collaboration",
            "deployable_id": "operator-web",
            "shell_family": "CALM_SHELL",
            "owner_package": "apps/operator-web + packages/route-runtime + packages/state-runtime",
            "continuity_rule": "Queue-to-item transitions stay inside the same calm shell and preserve filters, selection, drafts, and module focus when lawful.",
            "browser_handoff_rule": "Notification-open and refresh preserve the same item or queue anchor; no remount to a different shell family.",
        },
        "portal_primary": {
            "label": "Portal primary routes",
            "deployable_id": "client-portal-web",
            "shell_family": "CLIENT_PORTAL_SHELL",
            "owner_package": "apps/client-portal-web + packages/interaction-layers + packages/design-tokens",
            "continuity_rule": "Home, Documents, Approvals, Onboarding, and Help keep one primary task context and one promoted support region even through refresh or responsive collapse.",
            "browser_handoff_rule": "Browser-owned help, upload, or sign-off checkpoint returns stay bound to the same portal route and object context.",
        },
        "portal_request_context": {
            "label": "Portal request-context routes",
            "deployable_id": "client-portal-web",
            "shell_family": "CLIENT_PORTAL_SHELL",
            "owner_package": "apps/client-portal-web + packages/route-runtime + packages/state-runtime",
            "continuity_rule": "Contextual request-detail routes remain in the portal shell and preserve return-path anchors rather than becoming a separate route family.",
            "browser_handoff_rule": "Return from browser or authority handoff never implies completion until the customer-safe request projection settles.",
        },
        "governance_console": {
            "label": "Governance console",
            "deployable_id": "operator-web",
            "shell_family": "GOVERNANCE_DENSITY_SHELL",
            "owner_package": "apps/operator-web + packages/contracts + packages/interaction-layers",
            "continuity_rule": "Selected object, filters, and promoted support sidecar stay in the same governance shell across route changes and responsive redock.",
            "browser_handoff_rule": "Step-up, approvals, and audit exports return to the same governance route and selected object context.",
        },
    }

    group_rows = []
    for group_id, spec in group_specs.items():
        routes = [
            row
            for row in surface_topology["browser_routes"]
            if row["route_group_id"] == group_id
        ]
        group_rows.append(
            {
                "route_group_id": group_id,
                "label": spec["label"],
                "deployable_id": spec["deployable_id"],
                "shell_family": spec["shell_family"],
                "owner_package": spec["owner_package"],
                "route_keys": [row["route_or_scene_key"] for row in routes],
                "route_patterns": [row["route_pattern"] for row in routes],
                "interaction_layer_contracts": ordered_unique(
                    row["interaction_layer_contract"] for row in routes
                ),
                "projection_contracts": ordered_unique(
                    row["projection_contract"] for row in routes
                ),
                "selector_profiles": ordered_unique(
                    profile_for_shell(row["shell_family"]) for row in routes
                ),
                "continuity_rule": spec["continuity_rule"],
                "browser_handoff_rule": spec["browser_handoff_rule"],
                "route_count": len(routes),
                "source_refs": route_group_refs(group_id),
            }
        )
    return {
        "contract_version": TODAY,
        "summary": {
            "route_group_count": len(group_rows),
            "deployable_group_counts": {
                deployable["deployable_id"]: len(
                    [
                        row
                        for row in group_rows
                        if row["deployable_id"] == deployable["deployable_id"]
                    ]
                )
                for deployable in surface_topology["deployables"]
            },
        },
        "route_groups": group_rows,
    }


def route_group_refs(group_id: str) -> list[str]:
    mapping = {
        "manifest_workspace": [
            heading_ref(FRONTEND_SHELL_PATH, "1. Shell families and object ownership"),
            heading_ref(FRONTEND_SHELL_PATH, "2. Route continuity and shell stability"),
            heading_ref(LOW_NOISE_PATH, "Default visible shell"),
        ],
        "operator_collaboration": [
            heading_ref(COLLABORATION_PATH, "2. Screen map"),
            heading_ref(COLLABORATION_PATH, "3. Page layouts"),
            heading_ref(COLLABORATION_PATH, "11. Accessibility and responsive rules"),
        ],
        "portal_primary": [
            heading_ref(PORTAL_PATH, "Navigation contract"),
            heading_ref(PORTAL_PATH, "Route architecture"),
            heading_ref(PORTAL_PATH, "Shell continuity, support budget, and constrained layouts"),
        ],
        "portal_request_context": [
            heading_ref(PORTAL_PATH, "Route architecture"),
            heading_ref(PORTAL_PATH, "Read-model and API translation requirements"),
            heading_ref(CROSS_DEVICE_PATH, "Required rules"),
        ],
        "governance_console": [
            heading_ref(GOVERNANCE_PATH, "2. Profile boundary and shell contract"),
            heading_ref(GOVERNANCE_PATH, "4. Information architecture and route map"),
            heading_ref(GOVERNANCE_PATH, "7. Frontend systems architecture"),
        ],
    }
    return mapping[group_id]


def profile_for_shell(shell_family: str) -> str:
    return {
        "CALM_SHELL": "OPERATOR_SEMANTIC_SELECTORS_V1",
        "CLIENT_PORTAL_SHELL": "PORTAL_SEMANTIC_SELECTORS_V1",
        "GOVERNANCE_DENSITY_SHELL": "GOVERNANCE_SEMANTIC_SELECTORS_V1",
    }[shell_family]


def build_state_domain_and_data_boundary_map() -> dict[str, Any]:
    rows = [
        {
            "domain_id": "server_projection_state",
            "purpose": "Hydrated route-level read models, receipt follow-up, and stream-backed query state.",
            "authoritative_owner": "packages/northbound-clients inside each deployable runtime",
            "allowed_storage": "in-memory query cache only; optional persistent cache only for route-safe replay and never as legal truth",
            "examples": [
                "LowNoiseExperienceFrame",
                "WorkspaceSnapshot",
                "ClientPortalWorkspace",
                "TenantGovernanceSnapshot",
            ],
            "purge_or_invalidation_triggers": [
                "stale guard mismatch",
                "access binding drift",
                "masking drift",
                "deployable contract version mismatch",
            ],
            "forbidden_misuse": "Do not derive new legal posture in the client or persist these projections as durable truth.",
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "2. Required northbound surfaces"),
                heading_ref(NORTHBOUND_PATH, "6. Concurrency and stale-view rules"),
                heading_ref(NORTHBOUND_PATH, "7. Stream and reconnect rules"),
            ],
        },
        {
            "domain_id": "continuity_and_stale_guard_state",
            "purpose": "Route ownership, shell stability, focus restoration, return targets, and rebase posture that preserve same-object continuity.",
            "authoritative_owner": "packages/route-runtime + packages/state-runtime",
            "allowed_storage": "URL, history.state, and tiny session-bound restore records only",
            "examples": [
                "shell_route_key",
                "route_context",
                "shell_stability_token",
                "focus_anchor_ref",
                "return_focus_anchor_ref_or_null",
            ],
            "purge_or_invalidation_triggers": [
                "object no longer resolves",
                "access rebind required",
                "browser handoff returns with incompatible route context",
            ],
            "forbidden_misuse": "Do not hide continuity state behind local component-only memory when the route contract requires cross-refresh restore.",
            "source_refs": [
                heading_ref(FRONTEND_SHELL_PATH, "2. Route continuity and shell stability"),
                heading_ref(CROSS_DEVICE_PATH, "Required rules"),
                heading_ref(FOCUS_RESTORE_PATH, "Required rules"),
            ],
        },
        {
            "domain_id": "local_draft_state",
            "purpose": "Unsubmitted route-local drafts, upload selections, approval acknowledgements, and governance change-basket work.",
            "authoritative_owner": "deployable-local feature modules with packages/state-runtime guards",
            "allowed_storage": "memory first; session-bound browser storage only when the contract publishes draft-resume semantics",
            "examples": [
                "portal draft_resume",
                "collaboration composer draft",
                "governance change basket",
            ],
            "purge_or_invalidation_triggers": [
                "tenant switch",
                "session revoke",
                "access scope downgrade",
                "stale-view rebase invalidates draft basis",
            ],
            "forbidden_misuse": "Do not silently replay drafts after a stale-view rejection or scope downgrade without explicit user-visible rebasing.",
            "source_refs": [
                heading_ref(PORTAL_PATH, "Read-model and API translation requirements"),
                heading_ref(COLLABORATION_PATH, "8. Command and read API additions"),
                heading_ref(GOVERNANCE_PATH, "6. Shared interaction and mutation rules"),
            ],
        },
        {
            "domain_id": "ephemeral_ui_state",
            "purpose": "Purely presentational state such as drawer openness, filter chips, tab focus, viewport density, and transient highlights.",
            "authoritative_owner": "route-local components inside each deployable",
            "allowed_storage": "memory only",
            "examples": [
                "active shell atlas tab",
                "drawer open state",
                "temporary highlight pulse",
            ],
            "purge_or_invalidation_triggers": ["route remount", "full refresh", "reduced-motion preference change"],
            "forbidden_misuse": "Do not encode business truth, customer-safe visibility, or settlement semantics here.",
            "source_refs": [
                heading_ref(FRONTEND_SHELL_PATH, "3. Layout topology and support-region promotion"),
                heading_ref(FRONTEND_SHELL_PATH, "8. Accessibility, focus, and motion"),
            ],
        },
        {
            "domain_id": "auth_and_session_state",
            "purpose": "Browser-authenticated session envelopes, anti-CSRF state, and browser handoff return metadata for each deployable.",
            "authoritative_owner": "server session boundary plus packages/northbound-clients handoff runtime",
            "allowed_storage": "httpOnly cookies and server-side session state; no raw tokens in browser-managed JavaScript storage",
            "examples": [
                "internal operator session",
                "portal session",
                "browser handoff return binding",
            ],
            "purge_or_invalidation_triggers": [
                "logout",
                "step-up expiry",
                "tenant switch",
                "audience mismatch between deployables",
            ],
            "forbidden_misuse": "Do not collapse operator and portal sessions into one mega-app ambient login state.",
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
                heading_ref(FRONTEND_SHELL_PATH, "7.5 Browser and system handoff"),
            ],
        },
        {
            "domain_id": "browser_cache_and_transfer_state",
            "purpose": "Route-safe upload-session descriptors, preview/download intents, and limited cached transfer metadata.",
            "authoritative_owner": "packages/state-runtime + packages/northbound-clients",
            "allowed_storage": "session-bound storage or IndexedDB only for transfer/resume metadata that the route contract explicitly allows",
            "examples": [
                "ClientUploadSession resume metadata",
                "preview_subject_ref_or_null",
                "download intent token",
            ],
            "purge_or_invalidation_triggers": [
                "tenant/session/access mismatch",
                "customer-safe visibility drift",
                "artifact selection basis mismatch",
            ],
            "forbidden_misuse": "Do not store raw authority credentials, legal truth, hidden staff context, or customer-safe widened caches here.",
            "source_refs": [
                heading_ref(PORTAL_PATH, "FE-25 Cache Isolation"),
                heading_ref(NORTHBOUND_PATH, "FE-25 Cache Isolation"),
                heading_ref(FRONTEND_SHELL_PATH, "7. Artifact preview, export, print, and browser handoff"),
            ],
        },
    ]
    return {
        "contract_version": TODAY,
        "summary": {
            "state_domain_count": len(rows),
            "persistent_domain_count": 4,
        },
        "domains": rows,
    }


def build_design_token_and_interaction_layer_binding() -> dict[str, Any]:
    interaction_map = load_json(INTERACTION_LAYER_MAP_PATH)
    breakpoints = load_json(LAYOUT_BREAKPOINT_CONTRACT_PATH)
    selectors = load_json(SEMANTIC_SELECTOR_REGISTRY_PATH)

    selector_counts = {
        row["profile_id"]: len(row["selector_entries"]) for row in selectors["profiles"]
    }
    breakpoint_lookup = {row["shell_family"]: row["breakpoints"] for row in breakpoints["shell_breakpoints"]}
    shell_rows = []
    for row in interaction_map["shell_foundations"]:
        shell_family = row["shell_family"]
        shell_rows.append(
            {
                "shell_family": shell_family,
                "deployable_id": deployable_for_shell(shell_family),
                "interaction_layer_contract": row["interaction_layer_contract"],
                "selector_profile": row["behavior_contract"]["selector_profile"],
                "selector_count": selector_counts[row["behavior_contract"]["selector_profile"]],
                "continuity_policy": row["behavior_contract"]["continuity_policy"],
                "recovery_surface_policy": row["behavior_contract"]["recovery_surface_policy"],
                "accent_color": {
                    "CALM_SHELL": VISUAL_SYSTEM["calm_accent"],
                    "CLIENT_PORTAL_SHELL": VISUAL_SYSTEM["portal_accent"],
                    "GOVERNANCE_DENSITY_SHELL": VISUAL_SYSTEM["governance_accent"],
                }[shell_family],
                "layout_budget": {
                    "CALM_SHELL": {
                        "leading_context_column_px": "272-296",
                        "primary_decision_column_px": "760-880",
                        "support_inspector_px": "360-400",
                        "desktop_max_width_px": "1440-1560",
                    },
                    "CLIENT_PORTAL_SHELL": {
                        "content_max_width_px": "1120",
                        "dominant_task_column_px": "680-760",
                        "support_stack_below_primary_under_px": "1024",
                    },
                    "GOVERNANCE_DENSITY_SHELL": {
                        "persistent_nav_px": "272-296",
                        "worklist_or_canvas_min_px": "760",
                        "auxiliary_sidecar_px": "320-400",
                        "compact_mode_rule": "redock auxiliary surfaces without changing shell meaning",
                    },
                }[shell_family],
                "shared_visual_system": {
                    "background": VISUAL_SYSTEM["background"],
                    "surface_primary": VISUAL_SYSTEM["surface_primary"],
                    "surface_secondary": VISUAL_SYSTEM["surface_secondary"],
                    "text_strong": VISUAL_SYSTEM["text_strong"],
                    "text_muted": VISUAL_SYSTEM["text_muted"],
                    "hairline": VISUAL_SYSTEM["hairline"],
                    "success": VISUAL_SYSTEM["success"],
                    "warning": VISUAL_SYSTEM["warning"],
                    "danger": VISUAL_SYSTEM["danger"],
                    "typography_ui": 'Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
                    "typography_mono": 'SF Mono, ui-monospace, "JetBrains Mono", monospace',
                    "type_ramp_px": [12, 14, 16, 20, 28, 36],
                    "corner_radius_px": "12-16",
                    "spacing_base_px": 8,
                    "desktop_section_spacing_px": "24-32",
                    "compact_section_spacing_px": "16-24",
                    "motion_duration_ms": "140-200",
                },
                "breakpoint_rules": breakpoint_lookup[shell_family],
                "source_refs": normalize_source_refs(row["source_refs"])
                + [
                    heading_ref(UIUX_SKILL_PATH, "Design philosophy"),
                    heading_ref(UIUX_SKILL_PATH, "Core design language"),
                    heading_ref(UIUX_SKILL_PATH, "Playwright-first / XCUITest-first design expectation"),
                    f"{repo_rel(ADR_PATH)}::selected_browser_visual_system[ADR-006 selected browser visual system]",
                ],
            }
        )
    return {
        "contract_version": TODAY,
        "summary": {
            "shell_family_count": len(shell_rows),
            "shared_selector_count": selectors["summary"]["shared_selector_count"],
        },
        "shared_visual_direction": {
            "mood": "Minimalist premium, exact, quiet, and product-specific.",
            "prohibitions": [
                "No generic dashboard card mosaics.",
                "No ornamental gradients, chatbot panels, neon accents, or speculative AI visuals.",
                "No support region that competes with the dominant action surface.",
            ],
        },
        "shell_bindings": shell_rows,
    }


def build_playwright_strategy(surface_topology: dict[str, Any]) -> dict[str, Any]:
    continuity = load_json(CONTINUITY_RECOVERY_MATRIX_PATH)
    relevant_scenarios = [
        row
        for row in continuity["scenarios"]
        if row["scenario_id"]
        in {
            "refresh_preserves_same_object",
            "publication_or_epoch_rebase",
            "deep_link_entry_and_restore",
            "browser_back_and_return",
            "reduced_motion_semantic_equivalence",
            "access_rebind_after_scope_change",
        }
    ]
    shell_routes = {
        "CALM_SHELL": "calm_manifest_workspace",
        "CLIENT_PORTAL_SHELL": "portal_home",
        "GOVERNANCE_DENSITY_SHELL": "governance_overview",
    }
    return {
        "contract_version": TODAY,
        "atlas_path": repo_rel(PROTOTYPE_DIR / "index.html"),
        "test_file": "tests/playwright/analysis/web-shell-atlas.spec.ts",
        "locator_strategy": {
            "priority_order": [
                "role",
                "label",
                "text",
                "semantic data-testid only when the selector contract requires a machine anchor",
            ],
            "forbidden": ["CSS selectors", "XPath selectors", "fragile DOM-order coupling"],
            "trace_policy": "retain-on-failure",
            "screenshot_policy": "capture golden overviews for topology and shell continuity states",
        },
        "coverage": {
            "shell_smoke_routes": shell_routes,
            "required_assertions": [
                "semantic locator presence per shell family",
                "keyboard roving across atlas tabs",
                "same-shell continuity on route-variant change",
                "focus return after support panel close",
                "stale/recovery inline message without object loss",
                "reduced-motion parity",
            ],
            "continuity_scenarios": [
                {
                    "scenario_id": row["scenario_id"],
                    "recovery_mode": row["recovery_mode"],
                    "applicable_shells": row["applicable_shells"],
                    "focus_restore_order": row["focus_restore_order"],
                    "source_refs": normalize_source_refs(row["source_refs"]),
                }
                for row in relevant_scenarios
            ],
        },
        "browser_handoff_plan": {
            "owner": "Playwright covers browser-owned auth/help/handoff surfaces; later native tasks pair this with native automation for desktop-only scenes.",
            "rules": [
                "Return to the owning shell and object context after browser handoff.",
                "Preserve focus anchor or explicit fallback target after handoff completion or cancellation.",
            ],
        },
        "source_refs": [
            heading_ref(SEMANTIC_SELECTOR_PATH, "Required rules"),
            heading_ref(SEMANTIC_REGRESSION_PATH, "Coverage requirements"),
            heading_ref(SHELL_CONTINUITY_PATH, "Coverage requirements"),
            heading_ref(UIUX_SKILL_PATH, "Playwright-first / XCUITest-first design expectation"),
            heading_ref(UIUX_SKILL_PATH, "What to test with Playwright / XCUITest"),
        ],
    }


def build_criteria() -> list[dict[str, Any]]:
    return [
        {
            "criterion_id": "shell_law_fidelity",
            "label": "Shell-law fidelity",
            "weight": 14,
            "priority": "HARD_REQUIREMENT",
            "rationale": "The topology must preserve the three shell families and their distinct layout grammars without collapsing them into one generic dashboard.",
            "source_refs": [
                heading_ref(FRONTEND_SHELL_PATH, "1. Shell families and object ownership"),
                heading_ref(LOW_NOISE_PATH, "Default visible shell"),
                heading_ref(PORTAL_PATH, "Experience thesis"),
                heading_ref(GOVERNANCE_PATH, "2. Profile boundary and shell contract"),
            ],
        },
        {
            "criterion_id": "cross_shell_code_sharing_without_semantic_drift",
            "label": "Cross-shell code sharing without semantic drift",
            "weight": 10,
            "priority": "HARD_REQUIREMENT",
            "rationale": "The shared web platform must reuse contracts, tokens, selector grammar, and continuity logic without forcing one shell grammar onto another.",
            "source_refs": [
                heading_ref(FOUNDATION_PATH, "Required family mappings"),
                heading_ref(UIUX_SKILL_PATH, "Interface families and profile boundaries"),
            ],
        },
        {
            "criterion_id": "deployable_isolation",
            "label": "Deployable isolation between operator/governance and portal surfaces",
            "weight": 12,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Internal operator/governance code and customer portal code need clear deployable boundaries for audience safety, bundle isolation, and blast-radius control.",
            "source_refs": [
                heading_ref(PORTAL_PATH, "Experience thesis"),
                heading_ref(GOVERNANCE_PATH, "2. Profile boundary and shell contract"),
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
            ],
        },
        {
            "criterion_id": "route_continuity_and_deep_link_stability",
            "label": "Route continuity and deep-link stability",
            "weight": 10,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Refresh, deep link, back/return, and notification open must preserve the same owned shell and object context where the corpus requires it.",
            "source_refs": [
                heading_ref(FRONTEND_SHELL_PATH, "2. Route continuity and shell stability"),
                heading_ref(CROSS_DEVICE_PATH, "Required rules"),
                heading_ref(FOCUS_RESTORE_PATH, "Required rules"),
            ],
        },
        {
            "criterion_id": "auth_session_integration_fit",
            "label": "Auth/session integration fit",
            "weight": 8,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Browser handoff, step-up, and session posture must map cleanly to the chosen deployable split.",
            "source_refs": [
                heading_ref(FRONTEND_SHELL_PATH, "7. Artifact preview, export, print, and browser handoff"),
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
            ],
        },
        {
            "criterion_id": "customer_safe_separation",
            "label": "Customer-safe separation",
            "weight": 12,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Portal surfaces must remain physically and semantically isolated from staff-only semantics and hidden internal context.",
            "source_refs": [
                heading_ref(PORTAL_PATH, "Read-model and API translation requirements"),
                heading_ref(COLLABORATION_PATH, "12. Playwright scenarios"),
            ],
        },
        {
            "criterion_id": "performance_and_bundle_isolation",
            "label": "Performance and bundle isolation",
            "weight": 9,
            "priority": "STRONG_PREFERENCE",
            "rationale": "The browser topology should allow route-level code splitting and avoid shipping internal operator/governance code to portal users.",
            "source_refs": [
                heading_ref(GOVERNANCE_PATH, "7. Frontend systems architecture"),
                heading_ref(PORTAL_PATH, "Responsive fallback rules"),
            ],
        },
        {
            "criterion_id": "design_token_and_selector_reuse",
            "label": "Design-token and selector reuse",
            "weight": 8,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Shared tokens, semantic selectors, and interaction-layer bindings need one platform spine so later implementation does not drift.",
            "source_refs": [
                heading_ref(FOUNDATION_PATH, "Required family mappings"),
                heading_ref(SEMANTIC_SELECTOR_PATH, "Surface mapping"),
                heading_ref(SEMANTIC_REGRESSION_PATH, "Coverage requirements"),
            ],
        },
        {
            "criterion_id": "playwright_testability",
            "label": "Testability with Playwright",
            "weight": 7,
            "priority": "HARD_REQUIREMENT",
            "rationale": "The topology should encourage semantic locators, deterministic shells, and stable browser automation contracts.",
            "source_refs": [
                heading_ref(FRONTEND_SHELL_PATH, "10. Automation anchors and UI observability fencing"),
                heading_ref(UIUX_SKILL_PATH, "Playwright-first / XCUITest-first design expectation"),
            ],
        },
        {
            "criterion_id": "phase_05_evolvability",
            "label": "Evolvability for later phase-05 implementation tasks",
            "weight": 5,
            "priority": "STRONG_PREFERENCE",
            "rationale": "The chosen topology must give later web implementation tasks stable package seams, deployable seams, and testing seams.",
            "source_refs": [
                heading_ref(UIUX_SKILL_PATH, "Deliverable template for future UI/UX proposals"),
                f"{repo_rel(ADR_PATH)}::planned_topology[ADR-006 implementation seam doctrine]",
            ],
        },
        {
            "criterion_id": "operational_simplicity",
            "label": "Operational simplicity and blast-radius control",
            "weight": 5,
            "priority": "TRADEOFF",
            "rationale": "The deployable split should stay operationally coherent while still limiting blast radius between internal and portal surfaces.",
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "1. Core principles"),
                heading_ref(UIUX_SKILL_PATH, "Interface families and profile boundaries"),
            ],
        },
    ]


def build_alternatives() -> list[dict[str, Any]]:
    return [
        {
            "alternative_id": "shared_platform_two_deployables",
            "label": "Shared TypeScript/React web platform with two deployables",
            "summary": "Build one shared browser platform with shared contracts, tokens, route runtime, selector grammar, API clients, and continuity logic, but ship two deployables: `operator-web` and `client-portal-web`.",
            "strengths": [
                "Preserves portal deployable isolation while keeping one shared contract spine.",
                "Allows calm-shell and governance surfaces to share the internal session and route runtime without shipping that bundle to portal users.",
            ],
            "risks": [
                "Requires disciplined shared-package governance so shell-specific design and copy do not drift into one another.",
            ],
        },
        {
            "alternative_id": "single_mega_application",
            "label": "One single mega web application containing all shell families and audiences",
            "summary": "Ship one browser application for every audience and shell family, with route guards and runtime branching for portal, operator, and governance surfaces.",
            "strengths": [
                "Simplifies some deployment plumbing and can make local development feel more centralized.",
                "Keeps all shells under one runtime process and one build graph.",
            ],
            "risks": [
                "Weakens portal isolation and makes bundle/code leakage harder to control.",
            ],
        },
        {
            "alternative_id": "micro_frontend_decomposition",
            "label": "Micro-frontend decomposition by route family, shell, or feature slice",
            "summary": "Split manifest, collaboration, portal, and governance surfaces into separate micro-frontends composed at runtime.",
            "strengths": [
                "Can isolate ownership aggressively and shrink individual feature bundles.",
                "Looks attractive when many teams want independent shipping cadence.",
            ],
            "risks": [
                "Shell continuity, selector grammar, and focus restoration become materially harder to keep exact across seams.",
            ],
        },
    ]


def build_score_map() -> dict[str, dict[str, tuple[float, str]]]:
    return {
        "shared_platform_two_deployables": {
            "shell_law_fidelity": (
                4.75,
                "Best fit because it keeps shell grammars distinct in code and deployables while still sharing contract infrastructure.",
            ),
            "cross_shell_code_sharing_without_semantic_drift": (
                4.5,
                "Shared packages cover the contract spine, while separate apps keep portal and internal shell composition from collapsing together.",
            ),
            "deployable_isolation": (
                4.75,
                "Portal stays physically separate from internal operator/governance bundles and session posture.",
            ),
            "route_continuity_and_deep_link_stability": (
                4.5,
                "One shared route runtime can preserve same-object continuity across both deployables without route-family seams inside a page.",
            ),
            "auth_session_integration_fit": (
                4.5,
                "Separate deployables let portal and internal sessions enforce different browser posture while still using the same IdP and handoff contracts.",
            ),
            "customer_safe_separation": (
                4.75,
                "This is the cleanest way to keep portal copy, selectors, and bundles customer-safe by default.",
            ),
            "performance_and_bundle_isolation": (
                4.5,
                "Each audience ships only the shell families it needs, with route-level splitting inside each deployable.",
            ),
            "design_token_and_selector_reuse": (
                4.5,
                "Shared token and selector packages keep browser implementation consistent without forcing identical visual grammar.",
            ),
            "playwright_testability": (
                4.5,
                "Two deployables plus one selector grammar keeps tests deterministic and clear about audience boundaries.",
            ),
            "phase_05_evolvability": (
                4.5,
                "Later teams get clean app/package seams and can implement shells without re-deriving deployable doctrine.",
            ),
            "operational_simplicity": (
                4.0,
                "Two deployables add some operational work, but the blast-radius and bundle safety payoff is high.",
            ),
        },
        "single_mega_application": {
            "shell_law_fidelity": (
                3.0,
                "It can preserve shell law in theory, but one runtime increases pressure to normalize all shells into one dashboard grammar.",
            ),
            "cross_shell_code_sharing_without_semantic_drift": (
                3.25,
                "Code sharing is easy, but the same convenience makes semantic bleed between portal and internal shells more likely.",
            ),
            "deployable_isolation": (
                2.0,
                "Portal and internal code inevitably co-reside, making audience isolation weaker and blast radius wider.",
            ),
            "route_continuity_and_deep_link_stability": (
                4.0,
                "A single runtime can preserve route history well, which is its strongest point.",
            ),
            "auth_session_integration_fit": (
                3.0,
                "One mega app has to juggle materially different audience/session postures inside one runtime envelope.",
            ),
            "customer_safe_separation": (
                2.25,
                "Customer-safe separation depends too heavily on runtime branching and discipline rather than build-level isolation.",
            ),
            "performance_and_bundle_isolation": (
                2.5,
                "Portal users are more exposed to unnecessary internal code and styling churn even with code splitting.",
            ),
            "design_token_and_selector_reuse": (
                4.0,
                "One app does make shared tokens and selectors easy to centralize.",
            ),
            "playwright_testability": (
                3.5,
                "Tests stay in one runtime, but audience-specific regressions become more coupled and noisy.",
            ),
            "phase_05_evolvability": (
                3.25,
                "Later teams get a simpler repo picture, but fewer safe boundaries for independent implementation and rollout.",
            ),
            "operational_simplicity": (
                4.25,
                "Operationally simple on paper because there is only one browser deployable.",
            ),
        },
        "micro_frontend_decomposition": {
            "shell_law_fidelity": (
                2.25,
                "Route-level seams and cross-bundle composition make exact shell continuity and support-region law harder to preserve.",
            ),
            "cross_shell_code_sharing_without_semantic_drift": (
                2.5,
                "Each micro-frontend wants its own primitives and runtime conventions, which weakens the shared shell law spine.",
            ),
            "deployable_isolation": (
                4.0,
                "Isolation is strong, which is the main appeal of this option.",
            ),
            "route_continuity_and_deep_link_stability": (
                2.0,
                "Deep-link restore, browser back, and support-region focus return are hardest when route ownership crosses runtime seams.",
            ),
            "auth_session_integration_fit": (
                2.75,
                "Browser handoff and session transitions become more complex when many runtimes can own the same user journey.",
            ),
            "customer_safe_separation": (
                3.5,
                "Portal can be isolated, but the cost is more cross-app contract stitching for shared customer-request flows.",
            ),
            "performance_and_bundle_isolation": (
                3.75,
                "Bundle isolation can be good, though runtime orchestration overhead offsets some of that benefit.",
            ),
            "design_token_and_selector_reuse": (
                2.25,
                "Selector grammar and token discipline are the first things to drift in a micro-frontend layout.",
            ),
            "playwright_testability": (
                2.5,
                "End-to-end tests become more brittle once shell continuity crosses multiple independently mounted runtimes.",
            ),
            "phase_05_evolvability": (
                2.5,
                "Ownership looks flexible, but later implementation has to solve shell drift and continuity tax repeatedly.",
            ),
            "operational_simplicity": (
                2.25,
                "Many deployables and seams increase operational overhead significantly.",
            ),
        },
    }


def build_scorecard(
    criteria: list[dict[str, Any]], alternatives: list[dict[str, Any]]
) -> dict[str, Any]:
    score_map = build_score_map()
    scored: list[dict[str, Any]] = []
    for alternative in alternatives:
        weighted_total = 0.0
        breakdown = []
        for criterion in criteria:
            raw_score, note = score_map[alternative["alternative_id"]][criterion["criterion_id"]]
            weighted_score = round(criterion["weight"] * raw_score / 5, 2)
            weighted_total += weighted_score
            breakdown.append(
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
        scored.append(
            {
                **alternative,
                "criterion_breakdown": breakdown,
                "weighted_total": round(weighted_total, 2),
            }
        )
    ranked = sorted(scored, key=lambda item: item["weighted_total"], reverse=True)
    for index, alternative in enumerate(ranked, 1):
        alternative["rank"] = index
    return {
        "decision_id": "ADR-006",
        "decision_title": "Web Frontend Topology",
        "decision_date": TODAY,
        "selected_alternative_id": ranked[0]["alternative_id"],
        "criteria": criteria,
        "alternatives": ranked,
    }


def build_mermaid() -> str:
    return """flowchart LR
  subgraph Users["Browser audiences"]
    operator["Operator / Governance users"]
    client["Client portal users"]
  end

  subgraph Apps["Deployables"]
    opweb["operator-web\\nCALM_SHELL + GOVERNANCE_DENSITY_SHELL"]
    portal["client-portal-web\\nCLIENT_PORTAL_SHELL"]
  end

  subgraph Shared["Shared browser platform packages"]
    contracts["contracts"]
    runtime["route-runtime + state-runtime"]
    tokens["design-tokens + interaction-layers"]
    testh["selector-grammar + test-harness"]
    api["northbound-clients"]
  end

  north["Northbound API + command/receipt surfaces"]

  operator --> opweb
  client --> portal

  opweb --> contracts
  opweb --> runtime
  opweb --> tokens
  opweb --> api
  opweb --> testh

  portal --> contracts
  portal --> runtime
  portal --> tokens
  portal --> api
  portal --> testh

  contracts --> north
  api --> north

  classDef deploy fill:#ffffff,stroke:#111318,color:#111318;
  classDef shared fill:#eef1f4,stroke:#111318,color:#111318;
  class opweb,portal deploy;
  class contracts,runtime,tokens,testh,api shared;
"""


def build_atlas_data(
    surface_topology: dict[str, Any],
    route_groups: dict[str, Any],
    state_domains: dict[str, Any],
    token_binding: dict[str, Any],
    playwright_strategy: dict[str, Any],
    scorecard: dict[str, Any],
) -> dict[str, Any]:
    browser_routes = {row["route_or_scene_key"]: row for row in surface_topology["browser_routes"]}
    winner = scorecard["alternatives"][0]
    shell_bindings = {row["shell_family"]: row for row in token_binding["shell_bindings"]}
    return {
        "decision": {
            "title": "ADR-006 Web Frontend Topology",
            "winner": winner["label"],
            "weighted_score": winner["weighted_total"],
            "tagline": "Two browser deployables, one shared contract spine, zero permission to drift into a generic dashboard.",
        },
        "summary": {
            "deployables": len(surface_topology["deployables"]),
            "browserRoutes": surface_topology["summary"]["browser_route_count"],
            "sharedPackages": surface_topology["summary"]["shared_package_count"],
            "selectorProfiles": token_binding["summary"]["shell_family_count"],
        },
        "deployables": surface_topology["deployables"],
        "sharedPackages": surface_topology["shared_packages"],
        "routeGroups": route_groups["route_groups"],
        "stateDomains": state_domains["domains"],
        "shells": [
            {
                "id": "calm",
                "shellFamily": "CALM_SHELL",
                "deployable": "operator-web",
                "accent": VISUAL_SYSTEM["calm_accent"],
                "selectorProfile": shell_bindings["CALM_SHELL"]["selector_profile"],
                "layoutBudget": shell_bindings["CALM_SHELL"]["layout_budget"],
                "routeVariants": [
                    {
                        "id": "manifest",
                        "label": "Manifest workspace",
                        "routeKey": "calm_manifest_workspace",
                        "routePattern": browser_routes["calm_manifest_workspace"]["route_pattern"],
                        "objectAnchor": "manifest:2026-Q1",
                        "dominantQuestion": "What is the current authoritative decision posture for this manifest?",
                        "primaryAction": "Review packet",
                        "supportTitle": "Evidence drawer",
                        "landmarks": browser_routes["calm_manifest_workspace"]["landmarks"],
                        "statusTone": "Live bundle aligned with the current manifest seal.",
                    },
                    {
                        "id": "workitem",
                        "label": "Work item workspace",
                        "routeKey": "collaboration_staff_workspace",
                        "routePattern": browser_routes["collaboration_staff_workspace"]["route_pattern"],
                        "objectAnchor": "work-item:REQ-184",
                        "dominantQuestion": "What workflow issue attached to this object requires intervention now?",
                        "primaryAction": "Request customer info",
                        "supportTitle": "Collaboration drawer",
                        "landmarks": browser_routes["collaboration_staff_workspace"]["landmarks"],
                        "statusTone": "Inline stale/rebase posture downgrades unsafe actions without remounting the shell.",
                    },
                ],
            },
            {
                "id": "portal",
                "shellFamily": "CLIENT_PORTAL_SHELL",
                "deployable": "client-portal-web",
                "accent": VISUAL_SYSTEM["portal_accent"],
                "selectorProfile": shell_bindings["CLIENT_PORTAL_SHELL"]["selector_profile"],
                "layoutBudget": shell_bindings["CLIENT_PORTAL_SHELL"]["layout_budget"],
                "routeVariants": [
                    {
                        "id": "home",
                        "label": "Portal home",
                        "routeKey": "portal_home",
                        "routePattern": browser_routes["portal_home"]["route_pattern"],
                        "objectAnchor": "portal:home:client-712",
                        "dominantQuestion": "What is the one next safe task for this client right now?",
                        "primaryAction": "Upload request documents",
                        "supportTitle": "Recent activity",
                        "landmarks": ["PORTAL_HEADER", "STATUS_HERO", "TASK_QUEUE", "RECENT_ACTIVITY"],
                        "statusTone": "Customer-safe summary with explicit reassurance and limitation copy.",
                    },
                    {
                        "id": "request-detail",
                        "label": "Request detail",
                        "routeKey": "collaboration_customer_request_detail",
                        "routePattern": browser_routes["collaboration_customer_request_detail"]["route_pattern"],
                        "objectAnchor": "request:REQ-184",
                        "dominantQuestion": "What does the client need to complete this request safely?",
                        "primaryAction": "Provide requested file",
                        "supportTitle": "History and help",
                        "landmarks": ["PORTAL_HEADER", "REQUEST_STATUS", "PRIMARY_TASK", "SUPPORT_PANEL"],
                        "statusTone": "Same portal shell, contextual return, no leakage of staff-only semantics.",
                    },
                ],
            },
            {
                "id": "governance",
                "shellFamily": "GOVERNANCE_DENSITY_SHELL",
                "deployable": "operator-web",
                "accent": VISUAL_SYSTEM["governance_accent"],
                "selectorProfile": shell_bindings["GOVERNANCE_DENSITY_SHELL"]["selector_profile"],
                "layoutBudget": shell_bindings["GOVERNANCE_DENSITY_SHELL"]["layout_budget"],
                "routeVariants": [
                    {
                        "id": "overview",
                        "label": "Governance overview",
                        "routeKey": "governance_overview",
                        "routePattern": browser_routes["governance_overview"]["route_pattern"],
                        "objectAnchor": "tenant:west-01",
                        "dominantQuestion": "Which governance slice requires review or staged mutation next?",
                        "primaryAction": "Review pending policy diffs",
                        "supportTitle": "Audit sidecar",
                        "landmarks": ["SECTION_NAV", "WORKSPACE_CANVAS", "ATTENTION_SUMMARY", "AUXILIARY_SIDECAR"],
                        "statusTone": "Dense control-plane workspace with one promoted sidecar and route-stable filters.",
                    },
                    {
                        "id": "audit",
                        "label": "Audit investigation",
                        "routeKey": "governance_audit",
                        "routePattern": browser_routes["governance_audit"]["route_pattern"],
                        "objectAnchor": "audit:case-117",
                        "dominantQuestion": "What evidence explains this configuration or authority change?",
                        "primaryAction": "Open evidence trace",
                        "supportTitle": "Timeline sidecar",
                        "landmarks": ["SECTION_NAV", "WORKSPACE_CANVAS", "FILTER_BAR", "AUXILIARY_SIDECAR"],
                        "statusTone": "The same shell remains mounted while the selected object and sidecar context change.",
                    },
                ],
            },
        ],
        "verificationLab": {
            "scenarios": [
                {
                    "id": "publication_or_epoch_rebase",
                    "label": "Stale rebase without object loss",
                    "ariaLive": "assertive",
                    "message": "The route keeps the same shell and object anchor, explains the changed basis, and offers rebase instead of remounting elsewhere.",
                    "preserved": ["shell family", "object anchor", "dominant question", "return path"],
                },
                {
                    "id": "deep_link_entry_and_restore",
                    "label": "Deep link restore",
                    "ariaLive": "polite",
                    "message": "Open directly into the governed object and restore the nearest lawful focus anchor or serialized parent return target.",
                    "preserved": ["route identity", "focus anchor", "return focus anchor"],
                },
                {
                    "id": "browser_back_and_return",
                    "label": "Browser back/return continuity",
                    "ariaLive": "polite",
                    "message": "Back and forward keep the same shell page semantics and do not dissolve the route group into a generic home screen.",
                    "preserved": ["selected route variant", "shell family", "layout reading order"],
                },
                {
                    "id": "reduced_motion_semantic_equivalence",
                    "label": "Reduced-motion parity",
                    "ariaLive": "polite",
                    "message": "Reduced motion removes displacement but preserves hierarchy, state meaning, and disclosure order.",
                    "preserved": ["semantic order", "state language", "focus targets"],
                },
            ],
            "focusReturnContract": "Closing a support surface returns focus to the invoking control.",
        },
        "playwright": playwright_strategy,
    }


def build_adr_markdown(
    scorecard: dict[str, Any],
    surface_topology: dict[str, Any],
    route_groups: dict[str, Any],
    state_domains: dict[str, Any],
    token_binding: dict[str, Any],
    playwright_strategy: dict[str, Any],
) -> str:
    winner = scorecard["alternatives"][0]
    deployable_rows = [
        [
            row["label"],
            row["shell_families"],
            row["route_count"],
            row["bundle_policy"],
        ]
        for row in surface_topology["deployables"]
    ]
    package_rows = [
        [row["package_id"], row["responsibility"], row["must_not_hold"]]
        for row in surface_topology["shared_packages"]
    ]
    state_rows = [
        [row["domain_id"], row["allowed_storage"], row["forbidden_misuse"]]
        for row in state_domains["domains"]
    ]
    shell_rows = [
        [
            row["shell_family"],
            row["deployable_id"],
            row["interaction_layer_contract"],
            row["selector_profile"],
            row["accent_color"],
        ]
        for row in token_binding["shell_bindings"]
    ]
    criteria_rows = [
        [row["label"], row["priority"], row["weight"], row["rationale"]]
        for row in scorecard["criteria"]
    ]
    ranking_rows = [
        [row["rank"], row["label"], row["weighted_total"]]
        for row in scorecard["alternatives"]
    ]
    deferred_rows = surface_topology["typed_gaps"]
    return f"""# ADR-006: Web Frontend Topology

- Status: Accepted
- Date: {TODAY}
- Deciders: Phase 00 architecture analysis pack

## Context

Taxat already defines the browser contract in enough detail to make a topology choice now: three shell families, stable route grammar, interaction-layer bindings, customer-safe projection law, selector law, continuity law, and Playwright-oriented validation obligations. What the corpus had not yet selected was the deployable shape that should embody those contracts.

The existing analysis outputs normalized `{surface_topology["summary"]["browser_route_count"]}` browser routes, `{token_binding["summary"]["shell_family_count"]}` shell families, `{playwright_strategy["coverage"]["continuity_scenarios"] and len(playwright_strategy["coverage"]["continuity_scenarios"])}` continuity scenarios used for browser validation, and one shared route/projection map from ADR-005. ADR-006 closes the remaining gap by choosing how browser surfaces are partitioned, how shared packages are owned, how local/browser state domains are fenced, and how the shell atlas proves the choice in code.

## Decision

Adopt a **shared TypeScript/React browser platform with two deployables**:

- `operator-web` owns `CALM_SHELL` and `GOVERNANCE_DENSITY_SHELL`.
- `client-portal-web` owns `CLIENT_PORTAL_SHELL`, including the customer-safe request-context routes.
- Both deployables share one contract spine for route ownership, interaction-layer bindings, selector grammar, design tokens, northbound API clients, continuity runtime, and Playwright fixtures.
- Route-level micro-frontend seams are rejected; route groups stay inside one deployable runtime so shell continuity, focus restore, and selector grammar remain exact.
- The browser visual system is deliberately light, quiet, and typographic, with restrained shell accents and no generic enterprise dashboard chrome.

## Decision Drivers

{markdown_table(["Driver", "Priority", "Weight", "Why It Matters"], criteria_rows)}

## Deployable Topology

{markdown_table(["Deployable", "Owned Shell Families", "Browser Routes", "Why It Exists"], deployable_rows)}

This split is the core architectural choice. Internal operator/governance routes share one deployable because they share internal session posture and internal route runtime. The portal stays separate because customer-safe copy, bundle contents, and blast radius must stay separate by default rather than by runtime discipline alone.

## Shared Package Boundaries

{markdown_table(["Package", "Responsibility", "Must Not Hold"], package_rows)}

The platform is shared, not merged. Shared packages carry the browser contract spine; each deployable still owns its shell-specific composition, copy, and route-local behavior.

## State-Domain Boundaries

{markdown_table(["State Domain", "Allowed Storage", "First Forbidden Move"], state_rows)}

The non-negotiable rule is that browser state may preserve continuity, drafts, and local UX posture, but it may not become legal truth. Route projections, stale guards, and customer-safe fences remain server-authored contracts.

## Design Token And Interaction-Layer Binding

{markdown_table(["Shell Family", "Deployable", "Interaction Layer", "Selector Profile", "Accent"], shell_rows)}

ADR-006 intentionally selects a restrained light browser system: background `{VISUAL_SYSTEM["background"]}`, primary surface `{VISUAL_SYSTEM["surface_primary"]}`, secondary surface `{VISUAL_SYSTEM["surface_secondary"]}`, ink `{VISUAL_SYSTEM["text_strong"]}`, muted text `{VISUAL_SYSTEM["text_muted"]}`, and only sparse shell accents. The shells share typography and motion discipline, but they do not share one layout grammar blindly.

## Atlas And Playwright Proof

- The atlas lives in [web-shell-atlas]({PROTOTYPE_DIR}) and demonstrates one calm-shell route, one portal route, one governance route, plus a verification lab.
- The Playwright pack lives in [web-shell-atlas.spec.ts]({ROOT / "tests" / "playwright" / "analysis" / "web-shell-atlas.spec.ts"}) and validates semantic anchors, keyboard flow, same-shell continuity, focus return, reduced motion, and stale/recovery behavior.
- Locator strategy remains Playwright-first: role/label/text first, semantic `data-testid` only for contract anchors, no CSS/XPath dependency.

## Alternatives Considered

{markdown_table(["Alternative", "Weighted Score", "Rank"], ranking_rows)}

The winning option is **{winner["label"]}** with a weighted score of `{winner["weighted_total"]}`.

## Why This Option Wins

- It is the only option that gives the portal a real deployable boundary while still keeping one shared contract spine for shells, selectors, tokens, and stale/continuity logic.
- It preserves shell-law fidelity by keeping route groups inside one deployable runtime instead of introducing micro-frontend seams that would fracture focus and return behavior.
- It keeps customer-safe separation structural: portal code, copy, and bundle contents are isolated from internal operator/governance surfaces.
- It supports later phase-05 web tasks cleanly because the app seams, package seams, and test seams are explicit now.

## Guardrails On The Decision

- The portal deployable SHALL NOT ship governance or internal operator modules.
- Internal operator/governance surfaces SHALL NOT share one generic shell grammar with portal routes.
- Route-level micro-frontend seams SHALL NOT be introduced unless they can prove exact shell continuity, selector reuse, and focus-return parity.
- Semantic selectors SHALL remain stable across wide and compact layouts.
- Reduced-motion mode SHALL preserve meaning, ordering, and state language without relying on spatial choreography.
- Support regions SHALL remain support-only and SHALL NOT become competing primary-action surfaces.

## Consequences

Positive consequences:

- Browser implementation gets clean seams: two apps, one platform spine, explicit shared packages, and explicit state domains.
- Portal safety improves because customer-facing bundles, copy, and selectors are isolated by build boundary rather than only by route guards.
- Playwright coverage becomes easier to scale because selector grammar and continuity contracts live in one shared harness layer.

Negative consequences and tradeoffs:

- Two deployables require more deployment and environment coordination than a single mega app.
- Shared-package governance must stay strict so shell-specific design decisions do not leak across deployables.
- Internal calm/governance surfaces still need route-level code splitting and disciplined ownership to avoid becoming a noisy internal mega app.

## Rollback And Deploy Posture

- `operator-web` and `client-portal-web` may roll independently when their shared contract package versions remain compatible.
- Shared package releases that change route grammar, selector contracts, or interaction-layer bindings require synchronized compatibility review before either deployable rolls forward.
- If one deployable must roll back, browser continuity and cache/runtime guards fail closed by invalidating incompatible route state rather than attempting best-effort replay.

## Deferred Decisions

{chr(10).join(f"- {row['gap_key']}: {row['summary']}" for row in deferred_rows)}

- Exact router, query-cache, SSR/ISR, and CDN adapter choices are deferred; ADR-006 chooses topology and boundaries, not every implementation adapter.

## References

- Surface topology map: [web_surface_topology_and_deployable_map.json]({SURFACE_TOPOLOGY_PATH})
- Route-group ownership map: [web_route_group_and_shell_ownership_map.json]({ROUTE_GROUP_PATH})
- State-domain map: [web_state_domain_and_data_boundary_map.json]({STATE_DOMAIN_PATH})
- Design-token binding: [web_design_token_and_interaction_layer_binding.json]({TOKEN_BINDING_PATH})
- Playwright strategy: [web_playwright_strategy.json]({PLAYWRIGHT_STRATEGY_PATH})
- Scorecard: [ADR-006-web-frontend-topology-scorecard.json]({SCORECARD_PATH})
- Comparison notes: [ADR-006-web-frontend-topology-comparison.md]({COMPARISON_PATH})
- Diagram: [ADR-006-web-frontend-topology.mmd]({MERMAID_PATH})
"""


def build_comparison_markdown(
    scorecard: dict[str, Any], surface_topology: dict[str, Any]
) -> str:
    ranking_rows = [
        [row["rank"], row["label"], row["weighted_total"], row["strengths"][:2]]
        for row in scorecard["alternatives"]
    ]
    criteria_rows = [
        [row["label"], row["priority"], row["weight"], row["source_refs"]]
        for row in scorecard["criteria"]
    ]
    sections = [
        "# ADR-006 Comparison Notes",
        "",
        "This comparison expands the weighted scorecard that supports ADR-006.",
        "",
        "## Ranking",
        "",
        markdown_table(
            ["Rank", "Alternative", "Weighted Score", "Leading Strengths"], ranking_rows
        ),
        "",
        "## Criteria and Weights",
        "",
        markdown_table(
            ["Criterion", "Priority", "Weight", "Source Grounding"], criteria_rows
        ),
        "",
        "## Coverage Summary",
        "",
        f"- Browser routes covered: `{surface_topology['summary']['browser_route_count']}`",
        f"- Deployables covered: `{surface_topology['summary']['deployable_count']}`",
        f"- Shared packages declared: `{surface_topology['summary']['shared_package_count']}`",
        f"- Typed deployable-route gaps carried forward: `{len(surface_topology['typed_gaps'])}`",
    ]
    for criterion in scorecard["criteria"]:
        sections.extend(
            [
                "",
                f"## {criterion['label']}",
                "",
                f"- Priority: `{criterion['priority']}`",
                f"- Weight: `{criterion['weight']}`",
                f"- Rationale: {criterion['rationale']}",
                "",
                markdown_table(
                    ["Alternative", "Raw Score", "Weighted Contribution", "Reason"],
                    [
                        [
                            alternative["label"],
                            next(
                                item["raw_score"]
                                for item in alternative["criterion_breakdown"]
                                if item["criterion_id"] == criterion["criterion_id"]
                            ),
                            next(
                                item["weighted_score"]
                                for item in alternative["criterion_breakdown"]
                                if item["criterion_id"] == criterion["criterion_id"]
                            ),
                            next(
                                item["note"]
                                for item in alternative["criterion_breakdown"]
                                if item["criterion_id"] == criterion["criterion_id"]
                            ),
                        ]
                        for alternative in scorecard["alternatives"]
                    ],
                ),
            ]
        )
    sections.extend(
        [
            "",
            "## Why The Runner-Up Options Lost",
            "",
            *[
                f"- `{row['label']}` lost because {row['risks'][0][0].lower() + row['risks'][0][1:]}"
                for row in scorecard["alternatives"][1:]
            ],
        ]
    )
    return "\n".join(sections) + "\n"


def main() -> None:
    supporting_context = build_supporting_context()
    surface_topology = build_surface_topology_and_deployable_map()
    route_groups = build_route_group_and_shell_ownership_map(surface_topology)
    state_domains = build_state_domain_and_data_boundary_map()
    token_binding = build_design_token_and_interaction_layer_binding()
    criteria = build_criteria()
    alternatives = build_alternatives()
    scorecard = build_scorecard(criteria, alternatives)
    playwright_strategy = build_playwright_strategy(surface_topology)
    atlas_data = build_atlas_data(
        surface_topology,
        route_groups,
        state_domains,
        token_binding,
        playwright_strategy,
        scorecard,
    )
    adr_markdown = build_adr_markdown(
        scorecard,
        surface_topology,
        route_groups,
        state_domains,
        token_binding,
        playwright_strategy,
    )
    comparison_markdown = build_comparison_markdown(scorecard, surface_topology)

    json_write(SURFACE_TOPOLOGY_PATH, surface_topology)
    json_write(ROUTE_GROUP_PATH, route_groups)
    json_write(STATE_DOMAIN_PATH, state_domains)
    json_write(TOKEN_BINDING_PATH, token_binding)
    json_write(PLAYWRIGHT_STRATEGY_PATH, playwright_strategy)
    json_write(SCORECARD_PATH, scorecard)
    json_write(ATLAS_DATA_PATH, atlas_data)
    text_write(ADR_PATH, adr_markdown)
    text_write(COMPARISON_PATH, comparison_markdown)
    text_write(MERMAID_PATH, build_mermaid())

    print(
        json.dumps(
            {
                "status": "ok",
                "decision": scorecard["selected_alternative_id"],
                "supporting_context": supporting_context,
                "browser_route_count": surface_topology["summary"]["browser_route_count"],
                "deployables": surface_topology["summary"]["deployable_route_counts"],
            },
            indent=2,
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
