#!/usr/bin/env python3
from __future__ import annotations

import copy
import json
from collections import Counter, defaultdict
from pathlib import Path
from textwrap import dedent
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
ALGORITHM_DIR = ROOT / "Algorithm"
DOCS_ANALYSIS_DIR = ROOT / "docs" / "analysis"
DATA_ANALYSIS_DIR = ROOT / "data" / "analysis"
DIAGRAMS_ANALYSIS_DIR = ROOT / "diagrams" / "analysis"
PROTOTYPE_DIR = ROOT / "prototypes" / "analysis" / "surface_requirements_atlas"
TESTS_DIR = ROOT / "tests" / "playwright"
PROMPT_DIR = ROOT / "PROMPT"

MULTISURFACE_PACK_PATH = DOCS_ANALYSIS_DIR / "14_multisurface_requirements_pack.md"
UIUX_SPEC_PATH = DOCS_ANALYSIS_DIR / "14_surface_uiux_and_interaction_spec.md"
READ_MODEL_BINDING_PATH = DOCS_ANALYSIS_DIR / "14_cross_surface_read_models_commands_and_streams.md"
NATIVE_SCENE_SPEC_PATH = DOCS_ANALYSIS_DIR / "14_native_scene_and_restoration_spec.md"

ROUTE_MATRIX_PATH = DATA_ANALYSIS_DIR / "surface_route_and_capability_matrix.json"
COMPONENT_INVENTORY_PATH = DATA_ANALYSIS_DIR / "surface_component_inventory.json"
READ_MODEL_API_BINDING_JSON_PATH = DATA_ANALYSIS_DIR / "surface_read_model_api_binding.json"
STATE_VISIBILITY_MATRIX_PATH = DATA_ANALYSIS_DIR / "surface_state_visibility_recovery_matrix.json"
SELECTOR_REGISTRY_PATH = DATA_ANALYSIS_DIR / "surface_selector_registry.json"
NATIVE_TOPOLOGY_PATH = DATA_ANALYSIS_DIR / "native_scene_window_topology.json"
GAP_REGISTER_PATH = DATA_ANALYSIS_DIR / "cross_surface_gap_register.json"

IA_DIAGRAM_PATH = DIAGRAMS_ANALYSIS_DIR / "14_multisurface_information_architecture.mmd"
NATIVE_DIAGRAM_PATH = DIAGRAMS_ANALYSIS_DIR / "14_native_scene_topology.mmd"

ATLAS_DATA_PATH = PROTOTYPE_DIR / "atlas_data.json"
ATLAS_INDEX_PATH = PROTOTYPE_DIR / "index.html"
ATLAS_STYLES_PATH = PROTOTYPE_DIR / "styles.css"
ATLAS_APP_PATH = PROTOTYPE_DIR / "app.js"

PLAYWRIGHT_SPEC_PATH = TESTS_DIR / "surface_requirements_atlas.spec.ts"
PLAYWRIGHT_CONTINUITY_SPEC_PATH = TESTS_DIR / "surface_requirements_atlas.continuity.spec.ts"
PLAYWRIGHT_ACCESSIBILITY_SPEC_PATH = TESTS_DIR / "surface_requirements_atlas.accessibility.spec.ts"

COLLABORATION = "Algorithm/collaboration_workspace_contract.md"
PORTAL = "Algorithm/customer_client_portal_experience_contract.md"
GOVERNANCE = "Algorithm/admin_governance_console_architecture.md"
NATIVE = "Algorithm/macos_native_operator_workspace_blueprint.md"
FRONTEND_LAW = "Algorithm/frontend_shell_and_interaction_law.md"
LOW_NOISE = "Algorithm/low_noise_experience_contract.md"
SELECTOR_LAW = "Algorithm/semantic_selector_and_accessibility_contract.md"
SELECTOR_PACK = "Algorithm/semantic_selector_and_accessibility_regression_pack_contract.md"
FOCUS_RESTORE = "Algorithm/focus_restoration_and_return_target_harness_contract.md"
CROSS_DEVICE = "Algorithm/cross_device_continuity_and_restoration_contract.md"
STREAM_RESUME = "Algorithm/stream_resume_and_catch_up_ordering_contract.md"
EMPTY_STATE = "Algorithm/empty_state_limitation_and_recovery_taxonomy_contract.md"
NORTHBOUND = "Algorithm/northbound_api_and_session_contract.md"
CACHE_ISOLATION = "Algorithm/cache_isolation_and_secure_reuse_contract.md"
TOKENS = "Algorithm/cross_shell_design_token_and_interaction_layer_foundation_contract.md"
UIUX_SKILL = "Algorithm/UIUX_DESIGN_SKILL.md"


def ref(source_file: str, heading: str, rationale: str) -> dict[str, str]:
    return {
        "source_file": source_file,
        "source_heading_or_logical_block": heading,
        "rationale": rationale,
    }


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.rstrip() + "\n", encoding="utf-8")


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def unique(values: list[str]) -> list[str]:
    seen: set[str] = set()
    output: list[str] = []
    for value in values:
        if value not in seen:
            seen.add(value)
            output.append(value)
    return output


def normalize_markdown(text: str) -> str:
    return dedent(text).strip()


def md_cell(value: Any) -> str:
    return str(value).replace("|", "\\|").replace("\n", "<br>")


def markdown_table(headers: list[str], rows: list[list[Any]]) -> str:
    header_row = "| " + " | ".join(headers) + " |"
    divider = "| " + " | ".join(["---"] * len(headers)) + " |"
    body = ["| " + " | ".join(md_cell(cell) for cell in row) + " |" for row in rows]
    return "\n".join([header_row, divider, *body])


def summarize_refs(source_refs: list[dict[str, str]]) -> str:
    lines = []
    for source_ref in source_refs:
        lines.append(
            f"`{source_ref['source_file']}` -> {source_ref['source_heading_or_logical_block']}"
        )
    return "<br>".join(lines)


def route_record(base: dict[str, Any], **overrides: Any) -> dict[str, Any]:
    payload = copy.deepcopy(base)
    payload.update(overrides)
    return payload


SOURCE_ASSERTIONS: dict[str, list[str]] = {
    COLLABORATION: [
        "CUSTOMER_VISIBLE",
        "INTERNAL_ONLY",
        "/work",
        "/portal/requests/{item_id}",
        "WorkInboxSnapshot",
        "workspace.delta",
        "GET /v1/work-items/{item_id}/attachments?visibility=customer|internal",
    ],
    PORTAL: [
        "CLIENT_VIEWER",
        "Home",
        "Documents",
        "Approvals",
        "Onboarding",
        "Help",
        "ClientPortalWorkspace",
        "portal-shell",
        "upload_confidence_score",
    ],
    GOVERNANCE: [
        "GOVERNANCE_DENSITY_SHELL",
        "/governance/tenant",
        "/governance/access/principals",
        "/governance/authority-links",
        "/governance/audit",
        "ChangeBasket",
        "ApprovalComposer",
        "GovernanceInteractionLayer",
    ],
    NATIVE: [
        "NavigationSplitView",
        "NativeOperatorWorkspaceScene",
        "NativeOperatorSecondaryWindowScene",
        "TOGGLE_INSPECTOR",
        "ASWebAuthenticationSession",
        "scene restoration",
    ],
    FRONTEND_LAW: [
        "CALM_SHELL",
        "CLIENT_PORTAL_SHELL",
        "GOVERNANCE_DENSITY_SHELL",
        "Same object, same shell",
        "one promoted support region",
    ],
    SELECTOR_LAW: [
        "LowNoiseExperienceFrame",
        "ClientPortalWorkspace",
        "TenantGovernanceSnapshot",
        "NativeOperatorWorkspaceScene",
    ],
    SELECTOR_PACK: [
        "SECONDARY_WINDOW_RETURN",
        "TenantGovernanceSnapshot",
        "ClientPortalWorkspace",
    ],
    FOCUS_RESTORE: [
        "serialized parent return target",
        "the narrowest surviving list or queue target",
    ],
    CROSS_DEVICE: [
        "cross_device_continuity_contract",
        "WorkItemNotification",
        "TenantGovernanceSnapshot",
    ],
    STREAM_RESUME: [
        "WORKSPACE",
        "REBASE_REQUIRED",
        "ACCESS_REBIND_REQUIRED",
    ],
    EMPTY_STATE: [
        "settlement_state",
        "RECOVERY_REQUIRED",
        "INLINE_REBASE",
        "OBJECT_SUPERSEDED",
    ],
    NORTHBOUND: [
        "POST /v1/commands",
        "GET /v1/commands/{command_id}",
        "TenantGovernanceSnapshot",
        "POST /v1/uploads/sessions",
        "CLIENT_PORTAL_REQUEST_HELP",
    ],
    CACHE_ISOLATION: [
        "cache_isolation_contract",
        "WORKSPACE_SNAPSHOT",
        "CLIENT_PORTAL_WORKSPACE",
        "preview_subject_ref_or_null",
    ],
    TOKENS: [
        "CALM_SHELL",
        "CLIENT_PORTAL_SHELL",
        "GOVERNANCE_DENSITY_SHELL",
        "secondary_window_policy",
    ],
    UIUX_SKILL: [
        "Taxat Decision Observatory",
        "same object, same shell",
        "CONTEXT_BAR",
        "DETAIL_DRAWER",
    ],
}


def assert_source_grounding() -> None:
    missing: list[str] = []
    for relative_path, snippets in SOURCE_ASSERTIONS.items():
        text = (ROOT / relative_path).read_text(encoding="utf-8")
        for snippet in snippets:
            if snippet not in text:
                missing.append(f"{relative_path}: missing snippet {snippet!r}")
    if missing:
        raise RuntimeError("Source grounding assertions failed:\n" + "\n".join(missing))


VISUAL_RESEARCH = [
    {
        "title": "A calmer interface for a product in motion",
        "url": "https://linear.app/now/behind-the-latest-design-refresh",
        "published_date": "2026-03-12",
        "retrieved_date": "2026-04-17",
        "takeaway": "Let navigation recede so the working surface carries the strongest visual weight, and soften structure until it is felt rather than loudly seen.",
        "scope": "Aesthetic reference only. Taxat algorithm contracts remain the sole semantic authority.",
    },
    {
        "title": "Vercel Design",
        "url": "https://vercel.com/design",
        "published_date": "n/a",
        "retrieved_date": "2026-04-17",
        "takeaway": "Systemize craft: restrained typography, consistent spacing, and a design-language spine strong enough to support multiple interface embodiments.",
        "scope": "Aesthetic reference only. Used to tune the atlas visual discipline, not the product semantics.",
    },
    {
        "title": "Raycast User Interface API",
        "url": "https://developers.raycast.com/api-reference/user-interface",
        "published_date": "last updated 2 years ago",
        "retrieved_date": "2026-04-17",
        "takeaway": "Keep native operator flows keyboard-first, with a list-detail-action-panel mental model and fast scene rendering under loading or reconnect.",
        "scope": "Aesthetic and interaction reference only for native command-surface posture.",
    },
]

SHARED_SETTLEMENT_STATES = [
    "STEADY",
    "RECEIPT_PENDING",
    "FRESHENING",
    "STALE_REVIEW_REQUIRED",
    "DEGRADED_READ_ONLY",
    "RECOVERY_REQUIRED",
]

SHARED_RECOVERY_POSTURES = [
    "NONE",
    "INLINE_RECONNECT",
    "INLINE_REBASE",
    "READ_ONLY_LIMITED",
    "OBJECT_SUPERSEDED",
    "ACCESS_REBIND_REQUIRED",
]

CACHE_ENVELOPE_KEYS = [
    "tenant_or_client_scope",
    "principal_or_session_scope",
    "access_binding",
    "masking_fingerprint",
    "route_or_scene_identity",
    "canonical_object_ref",
    "shell_family",
    "projection_version",
    "preview_subject_ref_or_null",
]

SHARED_LAWS = [
    {
        "law_key": "SAME_OBJECT_SAME_SHELL",
        "statement": "A stable object keeps the same shell family or embodiment frame across refresh, reconnect, and deep-link return.",
        "source_refs": [
            ref(FRONTEND_LAW, "1. Shell families and object ownership", "Cross-surface shell law is authoritative."),
            ref(NATIVE, "4. Platform translation map", "Native scenes embody browser shell law rather than replacing it."),
        ],
    },
    {
        "law_key": "ONE_PROMOTED_SUPPORT_REGION",
        "statement": "Each mounted route or scene gets at most one promoted support region by default, even when dense detail or audit context is present.",
        "source_refs": [
            ref(FRONTEND_LAW, "3. Layout topology and support-region promotion", "Support promotion is capped across shell families."),
            ref(GOVERNANCE, "6. Shared interaction and mutation rules", "Governance sidecar promotion follows the same cap."),
        ],
    },
    {
        "law_key": "APPEND_ONLY_TRUTH_WITH_INLINE_RECOVERY",
        "statement": "Previously valid content stays mounted while stale, reconnect, or limited-read posture is explained inline and mutation surfaces fail closed.",
        "source_refs": [
            ref(EMPTY_STATE, "Shared shell freshness and recovery vocabulary", "The shared taxonomy governs stale and degraded states."),
            ref(COLLABORATION, "9. Stream events and notifications", "Workspace delta and activity events keep the shell mounted through rebase."),
        ],
    },
    {
        "law_key": "COMMAND_AND_READ_SEPARATION",
        "statement": "All durable product mutations travel through `POST /v1/commands`, except governed upload-session allocation for raw bytes, while route reads stay role-filtered projections.",
        "source_refs": [
            ref(NORTHBOUND, "Command surface", "The northbound contract pins the command endpoint."),
            ref(PORTAL, "Read-model and API translation requirements", "Portal projections stay customer-safe and role-filtered."),
        ],
    },
    {
        "law_key": "VISIBILITY_BOUNDARIES_ARE_HARD",
        "statement": "Internal-only collaboration activity, masked governance slices, customer-safe portal projections, and native cached state remain explicitly partitioned and never inferred across surfaces.",
        "source_refs": [
            ref(COLLABORATION, "1. Core invariants", "Customer-visible and internal activity are stored and streamed separately."),
            ref(CACHE_ISOLATION, "Cache identity envelope", "Visibility and masking are part of cache legality."),
        ],
    },
    {
        "law_key": "FOCUS_RETURN_IS_SERIALIZED",
        "statement": "Detail drawers, support panels, modals, detached windows, and external handoffs restore focus to a serialized parent anchor rather than forcing rediscovery.",
        "source_refs": [
            ref(FOCUS_RESTORE, "Return targets", "Parent focus targets are contractually preserved."),
            ref(NATIVE, "5. Preferred window and scene architecture", "Detached native windows restore focus to the parent scene."),
        ],
    },
]

SURFACE_FAMILIES = [
    {
        "surface_family": "COLLABORATION",
        "label": "Collaboration Workspace",
        "page_id": "collaboration",
        "accent": "#76A9FF",
        "shell_families": ["CALM_SHELL", "CLIENT_PORTAL_SHELL"],
        "thesis": "A shared work object exposes distinct staff and customer views without ever crossing visibility lanes or losing queue continuity.",
        "interaction_signature": "Queue -> workspace -> thread/module focus with inline rebase and append-only activity.",
        "promoted_support_region_law": "DETAIL_DRAWER in staff surfaces; contextual support panel in customer-safe request views.",
    },
    {
        "surface_family": "PORTAL",
        "label": "Client Portal",
        "page_id": "portal",
        "accent": "#99D2FF",
        "shell_families": ["CLIENT_PORTAL_SHELL"],
        "thesis": "A task-first, customer-safe portal keeps language plain, support subordinate, and trust moments explicit across upload, approval, onboarding, and help routes.",
        "interaction_signature": "Single-column primary task flow with contextual history, help, and artifact handoff kept subordinate.",
        "promoted_support_region_law": "Exactly one support region outside Help; help route itself may foreground support context.",
    },
    {
        "surface_family": "GOVERNANCE",
        "label": "Governance Console",
        "page_id": "governance",
        "accent": "#E7C37A",
        "shell_families": ["GOVERNANCE_DENSITY_SHELL"],
        "thesis": "Dense control-plane work stays diff-first, basis-hash-aware, and audit-visible without collapsing into noisy admin chrome.",
        "interaction_signature": "Context bar + section nav + inventory rail + workspace canvas + audit sidecar, with staged mutation baskets and approval posture.",
        "promoted_support_region_law": "AUDIT_SIDECAR is the default promoted support region unless a route-local support window temporarily supersedes it.",
    },
    {
        "surface_family": "NATIVE_OPERATOR",
        "label": "macOS Operator Workspace",
        "page_id": "native",
        "accent": "#7FE0C8",
        "shell_families": ["CALM_SHELL (embodied natively)"],
        "thesis": "The native client turns calm-shell law into multi-window operator depth, keyboard surfaces, and scene restoration without inventing new product semantics.",
        "interaction_signature": "Primary split view scenes, parent-bound secondary windows, command-surface shortcuts, and cache-backed resume with fail-closed legality checks.",
        "promoted_support_region_law": "Trailing inspector in primary scenes; parent-bound secondary windows for compare, audit, packet, and authority review.",
    },
]

ATLAS_PAGES = [
    {
        "page_id": "overview",
        "title": "Overview",
        "eyebrow": "One product architecture",
        "subtitle": "Four surface families, one semantic spine.",
        "hero_statement": "Taxat exposes collaboration, portal, governance, and native operator embodiments through shared shell, continuity, selector, and recovery law.",
    },
    {
        "page_id": "collaboration",
        "title": "Collaboration",
        "eyebrow": "Shared work object",
        "subtitle": "Staff and customer lanes over the same workflow truth.",
        "hero_statement": "The collaboration family keeps one work object legible across queue triage, workspace threads, request lists, and customer-safe request detail without leaking internal-only context.",
    },
    {
        "page_id": "portal",
        "title": "Portal",
        "eyebrow": "Task-first client flow",
        "subtitle": "Uploads, approvals, onboarding, and help stay plain-language and recoverable.",
        "hero_statement": "The portal family turns northbound truth into customer-safe steps, request-safe upload states, and in-route trust moments that do not require internal product literacy.",
    },
    {
        "page_id": "governance",
        "title": "Governance",
        "eyebrow": "Dense control plane",
        "subtitle": "Diff-first change staging with audit-native visibility.",
        "hero_statement": "The governance family manages tenant policy, access, authority links, retention, and investigations through basis-hash-aware projections and staged mutations.",
    },
    {
        "page_id": "native",
        "title": "Native",
        "eyebrow": "Embodied calm-shell law",
        "subtitle": "Primary scenes, support windows, command surfaces, and restore envelopes.",
        "hero_statement": "The macOS workspace makes operator depth native with split views, keyboard focus grammar, detached support windows, and strict scene-restoration legality.",
    },
    {
        "page_id": "continuity",
        "title": "Continuity & Recovery",
        "eyebrow": "What never drifts",
        "subtitle": "Route restoration, stream resume, focus return, and reduced-state taxonomy across all families.",
        "hero_statement": "Every family shares the same recovery vocabulary: keep valid content mounted, explain stale posture inline, and return the user to the narrowest surviving anchor.",
    },
]

PROFILE_REFS = {
    "COLLABORATION_STAFF_QUEUE_V1": [
        ref(COLLABORATION, "3. Page layouts / Work inbox", "Staff queue anchors come directly from the inbox layout and validation plan."),
        ref(SELECTOR_LAW, "LowNoiseExperienceFrame", "Shell-safe queue anchors participate in semantic accessibility."),
    ],
    "COLLABORATION_WORKSPACE_V1": [
        ref(COLLABORATION, "3. Page layouts / Work item workspace", "Workspace anchors reflect the ordered calm-shell stack and module picker."),
        ref(SELECTOR_PACK, "Regression pack", "Workspace anchors must remain stable under rebase, reconnect, and stale mutation protection."),
    ],
    "COLLABORATION_CUSTOMER_V1": [
        ref(COLLABORATION, "2. Screen map / Customer routes", "Customer collaboration selectors stay customer-safe."),
        ref(PORTAL, "Minimum semantic selectors", "Customer request detail borrows the portal-safe selector grammar."),
    ],
    "PORTAL_SHELL_V1": [
        ref(PORTAL, "Minimum semantic selectors", "The portal contract explicitly names these anchors."),
        ref(SELECTOR_LAW, "ClientPortalWorkspace", "Portal semantic anchors are part of the route-safe accessibility contract."),
    ],
    "GOVERNANCE_SEMANTIC_SELECTORS_V1": [
        ref(GOVERNANCE, "10. Minimum semantic selectors", "Governance selectors are explicitly enumerated."),
        ref(SELECTOR_LAW, "TenantGovernanceSnapshot", "Governance anchors participate in semantic accessibility and regression tests."),
    ],
    "NATIVE_OPERATOR_SELECTORS_V1": [
        ref(NATIVE, "5. Preferred window and scene architecture", "Native scene anchors mirror sidebar, canvas, inspector, and support-window topology."),
        ref(SELECTOR_PACK, "SECONDARY_WINDOW_RETURN", "Detached windows need stable selector hooks for return-target regression checks."),
    ],
}

SELECTOR_PROFILES = {
    "COLLABORATION_STAFF_QUEUE_V1": {
        "surface_family": "COLLABORATION",
        "description": "Staff queue and row anchors for `/work` triage.",
        "selectors": [
            "work-inbox",
            "work-inbox-filters",
            "work-item-row",
            "authoritative-action",
            "work-item-status",
            "assignee-chip",
            "sla-badge",
            "escalation-badge",
        ],
    },
    "COLLABORATION_WORKSPACE_V1": {
        "surface_family": "COLLABORATION",
        "description": "Calm-shell workspace anchors for summary, action, support, and module continuity.",
        "selectors": [
            "context-bar",
            "decision-summary",
            "action-strip",
            "detail-drawer",
            "dominant-question",
            "settlement-posture",
            "customer-activity",
            "internal-activity",
            "files-module",
            "linked-context-panel",
            "audit-tape",
            "no-safe-action",
        ],
    },
    "COLLABORATION_CUSTOMER_V1": {
        "surface_family": "COLLABORATION",
        "description": "Customer-safe request-list and request-detail anchors.",
        "selectors": [
            "portal-request-focus",
            "portal-workspace-posture",
            "portal-primary-action",
            "portal-inline-recovery",
            "portal-current-artifact",
            "portal-history-list",
            "portal-artifact-handoff",
        ],
    },
    "PORTAL_SHELL_V1": {
        "surface_family": "PORTAL",
        "description": "Canonical client-portal route anchors.",
        "selectors": [
            "portal-shell",
            "portal-workspace-posture",
            "portal-status-hero",
            "portal-primary-action",
            "portal-support-entry",
            "portal-support-panel",
            "portal-route-tabs",
            "portal-inline-recovery",
            "portal-request-focus",
            "portal-artifact-handoff",
            "portal-current-artifact",
            "portal-history-list",
        ],
    },
    "GOVERNANCE_SEMANTIC_SELECTORS_V1": {
        "surface_family": "GOVERNANCE",
        "description": "Governance density-shell anchors across overview, policy, retention, and audit routes.",
        "selectors": [
            "governance-context-bar",
            "governance-shell-family",
            "governance-object-anchor",
            "governance-dominant-question",
            "governance-settlement-posture",
            "governance-recovery-posture",
            "governance-section-nav",
            "governance-primary-worklist",
            "governance-workspace-header",
            "overview-attention-summary",
            "governance-risk-ledger",
            "governance-support-sidecar",
            "tenant-config-workspace",
            "change-basket",
            "approval-composer",
            "principal-directory",
            "principal-access-grid",
            "authority-chain-panel",
            "policy-simulator",
            "authority-link-inventory",
            "authority-link-detail",
            "binding-health-timeline",
            "retention-policy-matrix",
            "legal-hold-register",
            "erasure-queue",
            "retention-impact-preview",
            "audit-investigation-workbench",
            "audit-tape",
            "event-diff-inspector",
            "export-eligibility-panel",
        ],
    },
    "NATIVE_OPERATOR_SELECTORS_V1": {
        "surface_family": "NATIVE_OPERATOR",
        "description": "Native sidebar, inspector, detached-window, and restoration anchors.",
        "selectors": [
            "native-scene-sidebar",
            "native-scene-primary-canvas",
            "native-scene-inspector",
            "native-secondary-window",
            "native-command-surface",
            "native-auth-handoff",
            "native-scene-restore",
            "native-quicklook",
            "native-window-anchor",
            "native-purge-posture",
        ],
    },
}


def build_selector_registry() -> dict[str, Any]:
    selectors: list[dict[str, Any]] = []
    profile_rows: list[dict[str, Any]] = []
    for profile_name, profile in SELECTOR_PROFILES.items():
        profile_rows.append(
            {
                "selector_profile": profile_name,
                "surface_family": profile["surface_family"],
                "description": profile["description"],
                "selector_count": len(profile["selectors"]),
                "source_refs": PROFILE_REFS[profile_name],
            }
        )
        for selector_id in profile["selectors"]:
            selectors.append(
                {
                    "selector_profile": profile_name,
                    "surface_family": profile["surface_family"],
                    "selector_id": selector_id,
                    "data_testid": selector_id,
                    "atlas_rendered": True,
                    "future_facing": False,
                    "scope": selector_id.split("-", 1)[0],
                    "notes": f"Rendered in the surface atlas as the contract anchor for `{selector_id}`.",
                    "source_refs": PROFILE_REFS[profile_name],
                }
            )
    return {
        "summary": {
            "profile_count": len(profile_rows),
            "selector_count": len(selectors),
        },
        "profiles": profile_rows,
        "selectors": selectors,
    }


SHARED_COMMAND_SURFACE = [
    "POST /v1/commands",
    "GET /v1/commands/{command_id}",
]

COLLAB_STAFF_BASE = {
    "surface_family": "COLLABORATION",
    "shell_family": "CALM_SHELL",
    "embodiment": "WEB",
    "promoted_support_region": "DETAIL_DRAWER",
    "command_transport": SHARED_COMMAND_SURFACE,
    "settlement_states": SHARED_SETTLEMENT_STATES,
    "recovery_postures": SHARED_RECOVERY_POSTURES,
    "cache_partition_basis": [
        "tenant",
        "session",
        "masking",
        "route",
        "work_item_id",
        "visibility_partition",
    ],
    "source_file": COLLABORATION,
    "source_heading_or_logical_block": "2. Screen map / 3. Page layouts / 8. Command and read API additions / 11. Accessibility and responsive rules",
}

COLLAB_CUSTOMER_BASE = {
    "surface_family": "COLLABORATION",
    "shell_family": "CLIENT_PORTAL_SHELL",
    "embodiment": "WEB",
    "promoted_support_region": "SUPPORT_PANEL",
    "command_transport": SHARED_COMMAND_SURFACE,
    "settlement_states": SHARED_SETTLEMENT_STATES,
    "recovery_postures": SHARED_RECOVERY_POSTURES,
    "cache_partition_basis": [
        "client",
        "session",
        "customer_safe_projection",
        "route",
        "request_id",
        "visibility_partition",
    ],
    "source_file": COLLABORATION,
    "source_heading_or_logical_block": "2. Screen map / Customer request routes / 11. Accessibility and responsive rules",
}

PORTAL_BASE = {
    "surface_family": "PORTAL",
    "shell_family": "CLIENT_PORTAL_SHELL",
    "embodiment": "WEB",
    "promoted_support_region": "SUPPORT_PANEL",
    "command_transport": ["POST /v1/commands", "POST /v1/uploads/sessions", "GET /v1/commands/{command_id}"],
    "settlement_states": SHARED_SETTLEMENT_STATES,
    "recovery_postures": SHARED_RECOVERY_POSTURES,
    "cache_partition_basis": [
        "client",
        "session",
        "customer_safe_projection",
        "route",
        "artifact_subject",
    ],
    "source_file": PORTAL,
    "source_heading_or_logical_block": "Navigation contract / Route architecture / Accessibility and interaction rules / Read-model and API translation requirements",
}

GOVERNANCE_BASE = {
    "surface_family": "GOVERNANCE",
    "shell_family": "GOVERNANCE_DENSITY_SHELL",
    "embodiment": "WEB",
    "promoted_support_region": "AUDIT_SIDECAR",
    "command_transport": SHARED_COMMAND_SURFACE,
    "settlement_states": SHARED_SETTLEMENT_STATES,
    "recovery_postures": SHARED_RECOVERY_POSTURES,
    "cache_partition_basis": [
        "tenant",
        "session",
        "access_binding",
        "masking",
        "route",
        "policy_snapshot_or_basis_hash",
    ],
    "source_file": GOVERNANCE,
    "source_heading_or_logical_block": "2. Profile boundary and shell contract / 4. Information architecture and route map / 6. Shared interaction and mutation rules / 8. Accessibility and responsive requirements",
}

NATIVE_PRIMARY_BASE = {
    "surface_family": "NATIVE_OPERATOR",
    "shell_family": "CALM_SHELL",
    "embodiment": "NATIVE_MACOS",
    "promoted_support_region": "TRAILING_INSPECTOR",
    "command_transport": SHARED_COMMAND_SURFACE,
    "settlement_states": SHARED_SETTLEMENT_STATES,
    "recovery_postures": SHARED_RECOVERY_POSTURES,
    "cache_partition_basis": [
        "tenant",
        "session",
        "access_binding",
        "masking",
        "scene_identity",
        "canonical_object_ref",
        "preview_subject_ref_or_null",
    ],
    "source_file": NATIVE,
    "source_heading_or_logical_block": "4. Platform translation map / 5. Preferred window and scene architecture / 6. Data flow and synchronization model / 8. Persistence model",
}

NATIVE_SECONDARY_BASE = {
    "surface_family": "NATIVE_OPERATOR",
    "shell_family": "CALM_SHELL",
    "embodiment": "NATIVE_MACOS",
    "promoted_support_region": "PARENT_BOUND_SUPPORT_WINDOW",
    "command_transport": [
        "LOCAL_NATIVE_COMMAND",
        "POST /v1/commands when route-local actions are still legal",
        "GET /v1/commands/{command_id}",
    ],
    "settlement_states": SHARED_SETTLEMENT_STATES,
    "recovery_postures": SHARED_RECOVERY_POSTURES,
    "cache_partition_basis": [
        "tenant",
        "session",
        "access_binding",
        "masking",
        "scene_identity",
        "canonical_object_ref",
        "preview_subject_ref_or_null",
    ],
    "source_file": NATIVE,
    "source_heading_or_logical_block": "5. Preferred window and scene architecture / 8. Persistence model / 11. Security and runtime posture",
}

ROUTE_RECORDS = [
    route_record(
        COLLAB_STAFF_BASE,
        route_or_scene_key="collaboration_staff_inbox",
        title="Staff work inbox",
        route_or_scene_kind="route",
        route_pattern="/work",
        actor_profile="STAFF_OPERATOR",
        object_ownership="WorkInbox / WorkItemQueue",
        dominant_question="Which work item needs action now, and why?",
        dominant_action="Assign, claim, escalate, or enter the workspace without losing queue context.",
        read_models=["WorkInboxSnapshot", "WorkInboxDelta"],
        read_surfaces=[
            "GET /v1/work-items?assignee=...&lifecycle_state=...&waiting_on=...&due_state=...&customer_projection=...",
            "GET /v1/work-items/stream?resume_token=...",
        ],
        commands=["ASSIGN_WORK_ITEM", "REASSIGN_WORK_ITEM", "ESCALATE_WORK_ITEM"],
        command_semantics="AUTHORITATIVE_ENUM",
        stream_sources=["workspace.delta", "notification.badge", "heartbeat"],
        visibility_lanes=["CUSTOMER_VISIBLE summary facts", "INTERNAL_ONLY triage metadata"],
        artifact_posture="Queue rows summarize current state only; attachments stay subordinate until workspace entry.",
        step_up_checkpoints=["Privileged reassignment or escalation may trigger inline step-up under northbound command law."],
        stale_view_posture="Rows remain mounted while basis drift rebases inline and mutation affordances fail closed.",
        recovery_and_resume_rules=[
            "Refresh and reconnect preserve filters, row order, and the anchored row.",
            "Notification-open returns to the same queue row when the object remains legal.",
            "No full-page reset for ordinary row updates.",
        ],
        focus_return_rule="Return to the originating inbox row or the narrowest surviving filter chip.",
        selector_profile="COLLABORATION_STAFF_QUEUE_V1",
        responsive_fallback="Filter rails compact into chips and the detail drawer redocks beneath the primary stack on narrow screens.",
        components=["WorkInboxRow", "StatusPill", "AssigneeChip", "SlaBadge", "EscalationBadge"],
        notes="The inbox is the staff collaboration queue root and must update in place.",
        source_refs=[
            ref(COLLABORATION, "2. Screen map / Staff `/work`", "The route and queue semantics are explicit."),
            ref(COLLABORATION, "12. Playwright scenarios", "Queue updates, escalation posture, and stale protection are explicitly testable."),
        ],
    ),
    route_record(
        COLLAB_STAFF_BASE,
        route_or_scene_key="collaboration_staff_workspace",
        title="Staff work-item workspace",
        route_or_scene_kind="route",
        route_pattern="/work/items/{item_id}",
        actor_profile="STAFF_OPERATOR",
        object_ownership="WorkItemWorkspace",
        dominant_question="What is the safest next decision on this work item?",
        dominant_action="Advance the work item while preserving dominant question, settlement posture, and thread continuity.",
        read_models=["WorkspaceSnapshot", "WorkspaceDelta"],
        read_surfaces=[
            "GET /v1/work-items/{item_id}/workspace/snapshot",
            "GET /v1/work-items/{item_id}/workspace/stream?resume_token=...",
        ],
        commands=[
            "ASSIGN_WORK_ITEM",
            "CHANGE_WORK_ITEM_STATUS",
            "SET_WORK_ITEM_DUE_DATES",
            "REQUEST_CUSTOMER_INFO",
        ],
        command_semantics="AUTHORITATIVE_ENUM",
        stream_sources=["workspace.snapshot", "workspace.delta", "notification.badge", "heartbeat"],
        visibility_lanes=["CUSTOMER_VISIBLE activity slice", "INTERNAL_ONLY activity slice", "AUDIT trail"],
        artifact_posture="Current artifacts, linked context, and history remain visibly distinct inside the same shell.",
        step_up_checkpoints=["Risky status changes and authority-dependent actions stay inline and shell-local."],
        stale_view_posture="Keep the full calm-shell frame mounted and downgrade unsafe mutations to `NO_SAFE_ACTION` during rebase.",
        recovery_and_resume_rules=[
            "The ordered reading path remains `CONTEXT_BAR -> DECISION_SUMMARY -> ACTION_STRIP -> DETAIL_DRAWER`.",
            "Rebase preserves the same item shell, draft context, and selected module when still legal.",
            "Focus returns to the route-local anchor after module, drawer, or composer transitions.",
        ],
        focus_return_rule="Return to the originating module tab, composer trigger, or queue row anchor.",
        selector_profile="COLLABORATION_WORKSPACE_V1",
        responsive_fallback="On narrow screens the drawer collapses below the primary stack without changing module meaning.",
        components=[
            "ContextBar",
            "DecisionSummary",
            "ActionStrip",
            "DetailDrawer",
            "DominantQuestion",
            "SettlementPosture",
            "NoSafeAction",
        ],
        notes="This is the canonical calm-shell collaboration workspace and owns same-object/same-shell continuity for work items.",
        source_refs=[
            ref(COLLABORATION, "3. Page layouts / Staff work-item workspace", "The four-surface order and module grammar are explicit."),
            ref(LOW_NOISE, "LowNoiseExperienceFrame", "The calm-shell ordered reading path is shared law."),
        ],
    ),
    route_record(
        COLLAB_STAFF_BASE,
        route_or_scene_key="collaboration_staff_customer_activity_module",
        title="Staff customer-visible activity module",
        route_or_scene_kind="route",
        route_pattern="/work/items/{item_id}?module=customer-activity",
        actor_profile="STAFF_OPERATOR",
        object_ownership="CustomerVisibleActivitySlice",
        dominant_question="What has the customer seen, and what reply is safe now?",
        dominant_action="Respond or request more information using customer-visible language only.",
        read_models=["CollaborationActivitySlice", "WorkspaceDelta"],
        read_surfaces=[
            "GET /v1/work-items/{item_id}/activity?thread=customer&before_sequence=...",
            "GET /v1/work-items/{item_id}/workspace/stream?resume_token=...",
        ],
        commands=["ADD_CUSTOMER_COMMENT", "REQUEST_CUSTOMER_INFO"],
        command_semantics="AUTHORITATIVE_ENUM",
        stream_sources=["activity.appended", "workspace.delta"],
        visibility_lanes=["CUSTOMER_VISIBLE"],
        artifact_posture="Only customer-visible activity and customer-safe attachment posture may appear here.",
        step_up_checkpoints=["Sensitive outbound requests stay bound to the work-item stale-view guard."],
        stale_view_posture="Preserve the thread and composer while invalidating only the unsafe submission path.",
        recovery_and_resume_rules=[
            "Customer-visible concurrency is visibility-scoped.",
            "Inline refresh preserves scroll position and composer context when legal.",
        ],
        focus_return_rule="Return to the customer-activity tab or the exact composer trigger.",
        selector_profile="COLLABORATION_WORKSPACE_V1",
        responsive_fallback="Customer activity remains in the same reading order; history and composer stack vertically on narrow screens.",
        components=["CustomerActivityThread", "DetailDrawer", "ActionStrip"],
        notes="Customer-visible activity is a separate stream and cannot be contaminated by internal-only facts.",
        source_refs=[
            ref(COLLABORATION, "1. Core invariants", "Customer-visible activity is separately stored and streamed."),
            ref(COLLABORATION, "8. Command and read API additions", "The customer thread read surface and command surface are explicit."),
        ],
    ),
    route_record(
        COLLAB_STAFF_BASE,
        route_or_scene_key="collaboration_staff_internal_activity_module",
        title="Staff internal-only activity module",
        route_or_scene_kind="route",
        route_pattern="/work/items/{item_id}?module=internal-activity",
        actor_profile="STAFF_OPERATOR",
        object_ownership="InternalOnlyActivitySlice",
        dominant_question="What internal context, constraints, or reasoning must stay staff-only?",
        dominant_action="Append internal notes and coordinate without contaminating customer-visible projections.",
        read_models=["CollaborationActivitySlice", "WorkspaceDelta"],
        read_surfaces=[
            "GET /v1/work-items/{item_id}/activity?thread=internal&before_sequence=...",
            "GET /v1/work-items/{item_id}/workspace/stream?resume_token=...",
        ],
        commands=["ADD_INTERNAL_NOTE"],
        command_semantics="AUTHORITATIVE_ENUM",
        stream_sources=["activity.appended", "workspace.delta"],
        visibility_lanes=["INTERNAL_ONLY"],
        artifact_posture="Internal-only notes and attachments never appear in customer-facing routes.",
        step_up_checkpoints=["Higher-privilege note entry stays policy-gated and non-leaky."],
        stale_view_posture="Thread stays mounted but the note composer fails closed if the workspace basis drifts.",
        recovery_and_resume_rules=[
            "Internal-only activity does not stale or notify customer-visible routes.",
            "Append-only history remains visible during reconnect and rebase.",
        ],
        focus_return_rule="Return to the internal-activity tab, latest note anchor, or the invoking queue row.",
        selector_profile="COLLABORATION_WORKSPACE_V1",
        responsive_fallback="Thread and note composer stack beneath summary content without changing visibility semantics.",
        components=["InternalActivityThread", "ProblemBanner", "NoSafeAction"],
        notes="This module is the hard internal/customer boundary inside collaboration.",
        source_refs=[
            ref(COLLABORATION, "1. Core invariants", "Internal-only activity must never appear in customer-visible surfaces."),
            ref(COLLABORATION, "12. Playwright scenarios", "The customer-visible omission and stale behavior are explicit regression scenarios."),
        ],
    ),
    route_record(
        COLLAB_STAFF_BASE,
        route_or_scene_key="collaboration_staff_files_module",
        title="Staff files module",
        route_or_scene_kind="route",
        route_pattern="/work/items/{item_id}?module=files",
        actor_profile="STAFF_OPERATOR",
        object_ownership="CollaborationAttachmentSlice",
        dominant_question="Which artifact is current, historical, quarantined, or not safely downloadable?",
        dominant_action="Inspect the current artifact posture before previewing, downloading, or requesting replacement.",
        read_models=["CollaborationAttachmentSlice", "WorkspaceDelta"],
        read_surfaces=[
            "GET /v1/work-items/{item_id}/attachments?visibility=customer|internal",
            "GET /v1/work-items/{item_id}/workspace/stream?resume_token=...",
        ],
        commands=[],
        command_semantics="READ_ONLY_ATTACHMENT_POSTURE",
        stream_sources=["workspace.delta"],
        visibility_lanes=["CUSTOMER_VISIBLE shared artifacts", "INTERNAL_ONLY staff-only or quarantined artifacts"],
        artifact_posture="Current-vs-history posture is explicit and quarantined files never masquerade as downloadable current artifacts.",
        step_up_checkpoints=["Sensitive download or export posture remains policy-governed and may require step-up."],
        stale_view_posture="Artifact rows stay visible as stale context but cannot be promoted to current on a drifted view.",
        recovery_and_resume_rules=[
            "Current and historical artifact anchors survive inline refresh.",
            "Quarantined or replacement-required files remain visible as typed recovery context.",
        ],
        focus_return_rule="Return to the exact artifact row or preview launcher that opened detail.",
        selector_profile="COLLABORATION_WORKSPACE_V1",
        responsive_fallback="Artifact rows stay single-column with current-state chips preserved on mobile widths.",
        components=["FilesModule", "ProblemBanner"],
        notes="The files module is the collaboration truth surface for current-vs-history artifact posture.",
        source_refs=[
            ref(COLLABORATION, "4. Key components / Files module", "The files module is a first-class workspace component."),
            ref(COLLABORATION, "12. Playwright scenarios", "Current-vs-history and quarantined download posture are explicit scenarios."),
        ],
    ),
    route_record(
        COLLAB_STAFF_BASE,
        route_or_scene_key="collaboration_manifest_focus_jump",
        title="Manifest route with workflow focus jump",
        route_or_scene_kind="route",
        route_pattern="/manifests/{manifest_id}?focus=workflow:{item_id}",
        actor_profile="STAFF_OPERATOR",
        object_ownership="ManifestDecisionBundle plus linked work-item context",
        dominant_question="How does this workflow item affect the current manifest decision?",
        dominant_action="Inspect the linked work item as subordinate context without changing the manifest shell identity.",
        read_models=["DecisionBundle", "WorkspaceSnapshot", "WorkspaceDelta"],
        read_surfaces=[
            "Manifest experience snapshot and stream surfaces from the northbound contract",
            "GET /v1/work-items/{item_id}/workspace/snapshot",
        ],
        commands=["MANIFEST_ROUTE_LOCAL_COMMANDS", "REQUEST_CUSTOMER_INFO"],
        command_semantics="MIXED_MANIFEST_AND_COLLABORATION",
        stream_sources=["manifest experience stream", "workspace.delta"],
        visibility_lanes=["CALM operator truth", "linked workflow visibility partition"],
        artifact_posture="Manifest truth remains primary while workflow context opens as linked support detail.",
        step_up_checkpoints=["Manifest-local filing or approval step-up still stays route-local to the manifest shell."],
        stale_view_posture="The manifest route remains mounted; linked workflow focus rebases inline or drops back to the manifest anchor.",
        recovery_and_resume_rules=[
            "Same object, same shell applies to the manifest route even when workflow focus is active.",
            "The focus query must restore the linked work-item anchor after refresh if still legal.",
        ],
        focus_return_rule="Return to the manifest-local workflow focus anchor or the parent manifest navigator.",
        selector_profile="COLLABORATION_WORKSPACE_V1",
        responsive_fallback="The linked workflow support view docks below the main manifest stack on narrow screens.",
        components=["LinkedContextPanel", "ContextBar", "DecisionSummary", "DetailDrawer"],
        notes="This route normalizes the explicit workflow focus deep link into the cross-surface atlas.",
        source_refs=[
            ref(COLLABORATION, "2. Screen map", "The explicit manifest focus pattern is named here."),
            ref(FRONTEND_LAW, "2. Route continuity and shell stability", "Focus jumps cannot invent a new shell identity."),
        ],
    ),
    route_record(
        COLLAB_CUSTOMER_BASE,
        route_or_scene_key="collaboration_customer_request_list",
        title="Customer request list",
        route_or_scene_kind="route",
        route_pattern="/portal/requests",
        actor_profile="CLIENT_CONTRIBUTOR",
        object_ownership="CustomerRequestListSnapshot",
        dominant_question="Which request needs a reply, upload, approval, or simply waiting?",
        dominant_action="Open the exact request without losing customer-safe context or the return target.",
        read_models=["CustomerRequestListSnapshot"],
        read_surfaces=["Customer-visible request-list projection under the collaboration contract"],
        commands=[],
        command_semantics="READ_ONLY_ENTRY_SURFACE",
        stream_sources=["notification.badge", "customer-safe list refresh"],
        visibility_lanes=["CUSTOMER_VISIBLE"],
        artifact_posture="Only current safe request state and customer-safe history summaries may appear.",
        step_up_checkpoints=[],
        stale_view_posture="The list refreshes in place and never shows internal-only fields even during reconnect.",
        recovery_and_resume_rules=[
            "Opening and closing request detail preserves the parent request-row anchor.",
            "Cross-device continuity restores the same request when still legal.",
        ],
        focus_return_rule="Return to the originating request row or list filter.",
        selector_profile="COLLABORATION_CUSTOMER_V1",
        responsive_fallback="Single-column list with contextual support hidden behind explicit disclosure on narrow screens.",
        components=["StatusHero", "TaskQueue", "RecentActivity"],
        notes="The customer request list is collaboration truth rendered through portal-safe language and visibility rules.",
        source_refs=[
            ref(COLLABORATION, "2. Screen map / Customer `/portal/requests`", "The route is explicit."),
            ref(PORTAL, "Shell continuity, support budget, and constrained layouts", "Client-shell continuity and return-target rules apply."),
        ],
    ),
    route_record(
        COLLAB_CUSTOMER_BASE,
        route_or_scene_key="collaboration_customer_request_detail",
        title="Customer request workspace",
        route_or_scene_kind="route",
        route_pattern="/portal/requests/{item_id}",
        actor_profile="CLIENT_CONTRIBUTOR",
        object_ownership="Customer-safe request-detail projection",
        dominant_question="What exactly is being asked of the client, and what is the safe next step?",
        dominant_action="Reply, upload, or acknowledge from the same request lane without surfacing staff-only state.",
        read_models=["WorkspaceSnapshot", "CollaborationActivitySlice", "CollaborationAttachmentSlice"],
        read_surfaces=[
            "Customer-visible request-detail projection",
            "GET /v1/work-items/{item_id}/activity?thread=customer&before_sequence=...",
        ],
        commands=["RESPOND_TO_REQUEST_INFO", "ADD_CUSTOMER_COMMENT"],
        command_semantics="AUTHORITATIVE_ENUM",
        stream_sources=["activity.appended", "customer-safe request refresh"],
        visibility_lanes=["CUSTOMER_VISIBLE"],
        artifact_posture="Current artifact, history, and support handoff stay explicit and customer-safe.",
        step_up_checkpoints=["Identity or authority verification stays inside the route rather than redirecting to a new shell."],
        stale_view_posture="The request card stays mounted with inline recovery and explicit no-safe-action language when needed.",
        recovery_and_resume_rules=[
            "Return from browser or authority handoff never implies completion until the request projection settles.",
            "Historical artifacts remain visible as context but never become the default current artifact on rebase.",
        ],
        focus_return_rule="Return to the request focus anchor, current artifact row, or the invoking request list row.",
        selector_profile="COLLABORATION_CUSTOMER_V1",
        responsive_fallback="Primary task column fills the viewport; history and help collapse behind explicit disclosure on mobile widths.",
        components=["PortalHeader", "SupportPanel", "DocumentHistory"],
        notes="This is the customer-safe collaboration detail route that shares portal shell law without inheriting staff-only vocabulary.",
        source_refs=[
            ref(COLLABORATION, "2. Screen map / Customer `/portal/requests/{item_id}`", "The route is explicit."),
            ref(PORTAL, "Accessibility and interaction rules", "Customer-safe return, handoff, and artifact posture rules are shared."),
        ],
    ),
    route_record(
        PORTAL_BASE,
        route_or_scene_key="portal_home",
        title="Portal home",
        route_or_scene_kind="route",
        route_pattern="/portal",
        actor_profile="CLIENT_VIEWER | CLIENT_CONTRIBUTOR | CLIENT_SIGNATORY",
        object_ownership="ClientPortalWorkspace",
        dominant_question="What changed, what matters now, and what should the client do next?",
        dominant_action="Choose the next routed task from one status hero and one task queue.",
        read_models=["ClientPortalWorkspace", "ClientTimelineEvent"],
        read_surfaces=["ClientPortalWorkspace route projection (root home slice)"],
        commands=["PORTAL_OPEN_REQUEST", "PORTAL_OPEN_HELP_CASE"],
        command_semantics="NORMALIZED_ACTION_FAMILY",
        stream_sources=["role-filtered portal refresh", "cross_device_continuity_contract"],
        visibility_lanes=["CUSTOMER_SAFE_PROJECTION"],
        artifact_posture="Home uses summary-first current-state cards; artifacts stay subordinate to task selection.",
        step_up_checkpoints=["Home may route into in-place step-up, but does not force a new top-level destination."],
        stale_view_posture="The hero and task queue remain visible while stale or reconnect posture is explained inline.",
        recovery_and_resume_rules=[
            "Home must restore the pending task, upload, approval pack, or onboarding draft across devices.",
            "Contextual routes are not allowed to become a sixth permanent tab.",
        ],
        focus_return_rule="Return to the status hero primary action or the exact task queue row that launched a deeper route.",
        selector_profile="PORTAL_SHELL_V1",
        responsive_fallback="Home stays single-column and mobile-first; support remains subordinate to the task queue.",
        components=["PortalHeader", "StatusHero", "TaskQueue", "RecentActivity"],
        notes="The atlas binds Home to `/portal` as the canonical root route because the contract names Home but not `/portal/home`.",
        source_refs=[
            ref(PORTAL, "Navigation contract", "Home is one of the five permanent destinations."),
            ref(PORTAL, "Route architecture / Home", "Home layout modules are explicit."),
        ],
    ),
    route_record(
        PORTAL_BASE,
        route_or_scene_key="portal_documents",
        title="Portal documents",
        route_or_scene_kind="route",
        route_pattern="/portal/documents",
        actor_profile="CLIENT_CONTRIBUTOR",
        object_ownership="ClientDocumentRequest + ClientUploadSession",
        dominant_question="Which document request is active, and what is the exact upload posture?",
        dominant_action="Upload, retry, or replace inside the same request lane with confidence and binding made explicit.",
        read_models=["ClientPortalWorkspace", "ClientDocumentRequest", "ClientUploadSession"],
        read_surfaces=[
            "ClientPortalWorkspace route projection (documents slice)",
            "POST /v1/uploads/sessions",
        ],
        commands=[
            "PORTAL_START_UPLOAD",
            "PORTAL_RETRY_UPLOAD",
            "PORTAL_REPLACE_DOCUMENT",
            "PORTAL_ATTACH_FINALIZED_UPLOAD",
        ],
        command_semantics="NORMALIZED_ACTION_FAMILY",
        stream_sources=["upload session progress", "role-filtered portal refresh"],
        visibility_lanes=["CUSTOMER_SAFE_PROJECTION"],
        artifact_posture="Transfer, scan, validation, accepted, rejected, superseded, and replacement-only states stay visibly distinct.",
        step_up_checkpoints=["Sensitive uploads remain request-bound and may require route-local confirmation before final attachment."],
        stale_view_posture="The request card stays mounted with request-version posture explicit during rebase or reconnect.",
        recovery_and_resume_rules=[
            "Resumed uploads preserve frozen tenant, client, request, and request-version identity.",
            "Rejected and superseded uploads remain visible as recovery context but never become default current artifacts.",
        ],
        focus_return_rule="Return to the request card, current upload row, or upload affordance that initiated the transfer.",
        selector_profile="PORTAL_SHELL_V1",
        responsive_fallback="On mobile the active request card owns the full viewport and history/help collapse behind disclosure.",
        components=["DocumentInbox", "UploadPanel", "UploadStatusList", "DocumentHistory"],
        notes="Upload action families are normalized from prose because the contract names the flow and the byte-session exception, not a complete command enum.",
        source_refs=[
            ref(PORTAL, "Secure document-upload flow", "The upload phases and request-binding rules are explicit."),
            ref(NORTHBOUND, "Binary transfer exception", "Upload session allocation is the sole non-command mutation surface for raw bytes."),
        ],
    ),
    route_record(
        PORTAL_BASE,
        route_or_scene_key="portal_approvals",
        title="Portal approvals",
        route_or_scene_kind="route",
        route_pattern="/portal/approvals",
        actor_profile="CLIENT_SIGNATORY",
        object_ownership="ClientApprovalPack",
        dominant_question="What is being approved, and is sign-off safe right now?",
        dominant_action="Review change digest, declaration, and sign-off inside one contained route.",
        read_models=["ClientPortalWorkspace", "ClientApprovalPack"],
        read_surfaces=["ClientPortalWorkspace route projection (approvals slice)"],
        commands=["PORTAL_ACCEPT_APPROVAL", "PORTAL_DECLINE_APPROVAL", "PORTAL_ACKNOWLEDGE_CHANGE_DIGEST"],
        command_semantics="NORMALIZED_ACTION_FAMILY",
        stream_sources=["approval pack refresh", "cross_device_continuity_contract"],
        visibility_lanes=["CUSTOMER_SAFE_PROJECTION"],
        artifact_posture="Current approval pack and signed receipt stay explicit; superseded packs remain historical only.",
        step_up_checkpoints=["Step-up stays contained inside the route and must not route-switch the client into a different shell."],
        stale_view_posture="The approval pack remains visible while stale-signoff posture blocks unsafe commitment.",
        recovery_and_resume_rules=[
            "Return from external sign-off handoff never implies completion until the governed approval read model settles.",
            "Historical approval packs remain available but cannot become the current default by drift.",
        ],
        focus_return_rule="Return to the digest anchor, declaration section, or the sign-off trigger.",
        selector_profile="PORTAL_SHELL_V1",
        responsive_fallback="The active approval pack takes full width on mobile and keeps sticky sign-off controls visible without covering governing explanation.",
        components=["ApprovalSummary", "ChangeDigest", "DeclarationPanel", "SignOffPanel"],
        notes="Approval command names are normalized from route-local action prose rather than a published command enum.",
        source_refs=[
            ref(PORTAL, "Approval and sign-off flow", "Approval posture, step-up, and stale protection are explicit."),
            ref(PORTAL, "Playwright validation minimum", "Rebased approval and historical pack posture are explicit scenarios."),
        ],
    ),
    route_record(
        PORTAL_BASE,
        route_or_scene_key="portal_onboarding",
        title="Portal onboarding",
        route_or_scene_kind="route",
        route_pattern="/portal/onboarding",
        actor_profile="CLIENT_CONTRIBUTOR",
        object_ownership="ClientOnboardingJourney",
        dominant_question="Which onboarding step is active, what is saved, and what still needs completion?",
        dominant_action="Advance the current onboarding step without losing entered answers, uploads, or support context.",
        read_models=["ClientPortalWorkspace", "ClientOnboardingJourney"],
        read_surfaces=["ClientPortalWorkspace route projection (onboarding slice)"],
        commands=["PORTAL_SAVE_ONBOARDING_STEP", "PORTAL_ADVANCE_ONBOARDING", "PORTAL_OPEN_SUPPORT"],
        command_semantics="NORMALIZED_ACTION_FAMILY",
        stream_sources=["journey refresh", "cross_device_continuity_contract"],
        visibility_lanes=["CUSTOMER_SAFE_PROJECTION"],
        artifact_posture="Onboarding confirmations and route-local uploads stay subordinate to the active step workspace.",
        step_up_checkpoints=["Identity and eligibility checks stay inside the journey step where they are relevant."],
        stale_view_posture="Previously entered answers and resumable draft posture stay visible during refresh, reconnect, and rebase.",
        recovery_and_resume_rules=[
            "Save-and-return preserves the current step, answers, and any in-progress upload sessions.",
            "Onboarding is only a permanent destination while active.",
        ],
        focus_return_rule="Return to the active step header, current form field group, or support entry anchor.",
        selector_profile="PORTAL_SHELL_V1",
        responsive_fallback="The active onboarding step fills the viewport on mobile while support collapses behind explicit entry.",
        components=["WelcomePanel", "OnboardingStepper", "StepWorkspace", "SupportPanel"],
        notes="Onboarding continuity is route-local and must not be reinterpreted as a general portal dashboard state.",
        source_refs=[
            ref(PORTAL, "Onboarding flow", "Step save-and-return and support posture are explicit."),
            ref(PORTAL, "Responsive fallback rules", "Mobile-width onboarding rules are explicit."),
        ],
    ),
    route_record(
        PORTAL_BASE,
        route_or_scene_key="portal_help",
        title="Portal help",
        route_or_scene_kind="route",
        route_pattern="/portal/help",
        actor_profile="CLIENT_VIEWER | CLIENT_CONTRIBUTOR | CLIENT_SIGNATORY",
        object_ownership="PortalHelpRequest",
        dominant_question="What help path matches the current problem without losing route context?",
        dominant_action="Open or resume support using context-preserving case materialization.",
        read_models=["ClientPortalWorkspace", "PortalHelpRequest"],
        read_surfaces=["ClientPortalWorkspace route projection (help slice)"],
        commands=["CLIENT_PORTAL_REQUEST_HELP"],
        command_semantics="AUTHORITATIVE_ENUM",
        stream_sources=["help request refresh", "cross_device_continuity_contract"],
        visibility_lanes=["CUSTOMER_SAFE_PROJECTION"],
        artifact_posture="Support history and current case context stay explicit and subordinate to the active help action.",
        step_up_checkpoints=["Escalated help flows may invoke route-local verification while preserving the case context panel."],
        stale_view_posture="The case context panel stays mounted and makes hidden/unavailable states plain-language rather than implicit.",
        recovery_and_resume_rules=[
            "Help requests preserve route, reason family, and context bundle when resumed.",
            "Return targets after support handoff restore the originating route and focus anchor.",
        ],
        focus_return_rule="Return to the support entry trigger, top question row, or the originating route action that opened Help.",
        selector_profile="PORTAL_SHELL_V1",
        responsive_fallback="Help stays single-column with context tucked beneath the primary support options on mobile widths.",
        components=["HelpOptions", "TopQuestions", "CaseContextPanel", "SupportPanel"],
        notes="Help is the only portal route where the support surface is allowed to foreground itself.",
        source_refs=[
            ref(PORTAL, "Route architecture / Help", "Help route modules are explicit."),
            ref(NORTHBOUND, "Portal help request", "The durable `CLIENT_PORTAL_REQUEST_HELP` command is explicit."),
        ],
    ),
    route_record(
        GOVERNANCE_BASE,
        route_or_scene_key="governance_overview",
        title="Governance overview",
        route_or_scene_kind="route",
        route_pattern="/governance",
        actor_profile="TENANT_ADMIN | AUDITOR | APPROVER | SUPPORT_OPERATOR",
        object_ownership="TenantGovernanceSnapshot",
        dominant_question="Where is governance attention required right now?",
        dominant_action="Open the highest-priority risk, queue item, or route slice without losing the current governance basis.",
        read_models=["TenantGovernanceSnapshot"],
        read_surfaces=["GET /v1/governance/tenants/{tenant_id}/overview"],
        commands=["GOVERNANCE_OPEN_QUEUE_ITEM"],
        command_semantics="NORMALIZED_ACTION_FAMILY",
        stream_sources=["durable command receipts", "governance overview refresh"],
        visibility_lanes=["MASKED_GOVERNANCE slices", "role-limited overview counts"],
        artifact_posture="Overview is summary-first and never exports broader detail than the current filtered slice permits.",
        step_up_checkpoints=["Risky follow-on routes may trigger inline step-up before mutation staging begins."],
        stale_view_posture="Overview cards stay mounted while stale basis or access drift is surfaced inline.",
        recovery_and_resume_rules=[
            "Selected object, dominant question, and filters survive responsive collapse and browser back.",
            "Overview attention rows preserve the same route anchor across refresh.",
        ],
        focus_return_rule="Return to the overview attention summary row or pending change queue item that launched deeper work.",
        selector_profile="GOVERNANCE_SEMANTIC_SELECTORS_V1",
        responsive_fallback="On narrower widths the inventory rail compresses to a tray and the audit sidecar redocks beneath the canvas.",
        components=["GovernanceContextBar", "SectionNav", "InventoryRail", "OverviewAttentionSummary", "GovernanceRiskLedger", "PendingChangeQueue", "AuditSidcar"],
        notes="Overview keeps the five-region governance grammar visible even when density collapses responsively.",
        source_refs=[
            ref(GOVERNANCE, "4.1 `/governance`", "Overview widgets and route purpose are explicit."),
            ref(NORTHBOUND, "Governance read surfaces", "The overview endpoint is explicit."),
        ],
    ),
    route_record(
        GOVERNANCE_BASE,
        route_or_scene_key="governance_tenant",
        title="Tenant configuration workspace",
        route_or_scene_kind="route",
        route_pattern="/governance/tenant",
        actor_profile="TENANT_ADMIN | APPROVER",
        object_ownership="GovernancePolicySnapshot",
        dominant_question="What tenant-wide change is proposed, and what is its blast radius?",
        dominant_action="Stage diff-first changes into the basket and seek approval without hiding impact.",
        read_models=["GovernancePolicySnapshot"],
        read_surfaces=["GET /v1/governance/tenants/{tenant_id}/policy-snapshot"],
        commands=["GOVERNANCE_STAGE_TENANT_CHANGE", "GOVERNANCE_SUBMIT_APPROVAL"],
        command_semantics="NORMALIZED_ACTION_FAMILY",
        stream_sources=["durable command receipts", "policy snapshot refresh"],
        visibility_lanes=["MASKED_GOVERNANCE"],
        artifact_posture="Diffs, blast radius, and history are first-class and remain visible beside staged change posture.",
        step_up_checkpoints=["Approval submission and any privilege-widening change remain inline and basis-hash guarded."],
        stale_view_posture="The staged diff remains visible but cannot commit once policy snapshot or dependency topology drifts.",
        recovery_and_resume_rules=[
            "Change basket retains context across refresh, reconnect, and responsive collapse.",
            "The exact basis hash must be preserved when approving or submitting staged changes.",
        ],
        focus_return_rule="Return to the staged diff row, change basket item, or approval composer trigger.",
        selector_profile="GOVERNANCE_SEMANTIC_SELECTORS_V1",
        responsive_fallback="Sidecar redocks under the workspace and the basket remains visible before any history panel on narrow screens.",
        components=["ChangeBasket", "ApprovalComposer", "BlastRadiusPanel", "ConfigHistoryTimeline", "WorkspaceCanvas"],
        notes="Mutation families are normalized from the governance route prose; the northbound contract instead pins stale guards and basis hashes.",
        source_refs=[
            ref(GOVERNANCE, "4.2 `/governance/tenant`", "Tenant config widgets and basket/approval posture are explicit."),
            ref(NORTHBOUND, "Governance stale guards", "Policy snapshot and dependency topology hashes are explicit."),
        ],
    ),
    route_record(
        GOVERNANCE_BASE,
        route_or_scene_key="governance_access_principals",
        title="Principal access directory",
        route_or_scene_kind="route",
        route_pattern="/governance/access/principals",
        actor_profile="TENANT_ADMIN | SUPPORT_OPERATOR",
        object_ownership="PrincipalAccessView",
        dominant_question="Who currently has access, and how was it granted?",
        dominant_action="Inspect principal access posture and stage adjustments without losing chain-of-authority context.",
        read_models=["PrincipalAccessView"],
        read_surfaces=["GET /v1/governance/tenants/{tenant_id}/principals"],
        commands=["GOVERNANCE_STAGE_PRINCIPAL_CHANGE"],
        command_semantics="NORMALIZED_ACTION_FAMILY",
        stream_sources=["durable command receipts", "principal inventory refresh"],
        visibility_lanes=["MASKED_GOVERNANCE"],
        artifact_posture="Principal detail, authority chain, and staged access changes remain side-by-side.",
        step_up_checkpoints=["Any privilege-widening change must preserve simulation basis and step-up posture."],
        stale_view_posture="Principal detail stays visible while mutation controls fail closed when access basis drifts.",
        recovery_and_resume_rules=[
            "Roving selection preserves the selected principal under responsive collapse.",
            "Authority chain detail remains attached to the selected principal rather than resetting to list top.",
        ],
        focus_return_rule="Return to the principal directory row or authority-chain invocation anchor.",
        selector_profile="GOVERNANCE_SEMANTIC_SELECTORS_V1",
        responsive_fallback="Directory compresses to a tray but selected principal context persists into the canvas.",
        components=["PrincipalDirectory", "PrincipalAccessGrid", "AuthorityChainPanel", "AuditSidcar"],
        notes="This route preserves the governance five-layer access explanation stack in detail form.",
        source_refs=[
            ref(GOVERNANCE, "4.3 `/governance/access/principals`", "Principal route purpose and detail are explicit."),
            ref(NORTHBOUND, "Governance read surfaces", "The principals endpoint is explicit."),
        ],
    ),
    route_record(
        GOVERNANCE_BASE,
        route_or_scene_key="governance_access_roles",
        title="Role template matrix",
        route_or_scene_kind="route",
        route_pattern="/governance/access/roles",
        actor_profile="TENANT_ADMIN | APPROVER",
        object_ownership="RoleTemplateMatrix",
        dominant_question="What does each role grant, and how would a change alter effective authority?",
        dominant_action="Stage role definition changes against the matrix with diff-first review.",
        read_models=["RoleTemplateMatrix"],
        read_surfaces=["GET /v1/governance/tenants/{tenant_id}/roles/{role_id}"],
        commands=["GOVERNANCE_STAGE_ROLE_CHANGE"],
        command_semantics="NORMALIZED_ACTION_FAMILY",
        stream_sources=["durable command receipts", "role matrix refresh"],
        visibility_lanes=["MASKED_GOVERNANCE"],
        artifact_posture="Role diffs, impact, and history remain visible before commit.",
        step_up_checkpoints=["Role changes that widen authority preserve both topology and simulation basis hashes."],
        stale_view_posture="Matrix stays visible while mutation affordances fail closed on outdated basis.",
        recovery_and_resume_rules=[
            "Selected role and visible diff row survive refresh and browser back.",
            "Role edits preserve the current comparison anchor after re-render.",
        ],
        focus_return_rule="Return to the selected role row, matrix cell, or change basket invocation.",
        selector_profile="GOVERNANCE_SEMANTIC_SELECTORS_V1",
        responsive_fallback="Matrix columns compress before the sidecar; detailed diff remains explicit.",
        components=["WorkspaceCanvas", "ChangeBasket", "ApprovalComposer", "BlastRadiusPanel"],
        notes="The roles route is dense but never allowed to hide diff and blast-radius posture behind collapsible noise.",
        source_refs=[
            ref(GOVERNANCE, "4.3 `/governance/access/roles`", "Role route purpose follows the access map."),
            ref(NORTHBOUND, "Governance read surfaces", "The role matrix endpoint is explicit."),
        ],
    ),
    route_record(
        GOVERNANCE_BASE,
        route_or_scene_key="governance_access_simulator",
        title="Access simulator",
        route_or_scene_kind="route",
        route_pattern="/governance/access/simulator",
        actor_profile="TENANT_ADMIN | APPROVER | AUDITOR",
        object_ownership="GovernanceAccessSimulation",
        dominant_question="What would authorization do under the exact current basis and topology?",
        dominant_action="Run a simulation and, when lawful, stage a mutation against that exact basis.",
        read_models=["GovernanceAccessSimulation"],
        read_surfaces=["POST /v1/governance/tenants/{tenant_id}/access-simulations"],
        commands=["RUN_ACCESS_SIMULATION", "COMMIT_SIMULATED_GOVERNANCE_CHANGE"],
        command_semantics="NORMALIZED_ACTION_FAMILY",
        stream_sources=["durable command receipts", "simulation result refresh"],
        visibility_lanes=["MASKED_GOVERNANCE"],
        artifact_posture="Simulation basis, dependency topology, and potential blast radius are treated as first-class artifacts.",
        step_up_checkpoints=["Committing a simulated change requires the exact simulation basis hash and any route-local step-up."],
        stale_view_posture="Simulation result remains visible but cannot be committed after basis or topology drift.",
        recovery_and_resume_rules=[
            "Simulation basis hash and dependency topology hash are preserved across receipts and retries.",
            "The simulator cannot silently rerun under a different basis when resumed.",
        ],
        focus_return_rule="Return to the simulation parameter set, result card, or commit trigger.",
        selector_profile="GOVERNANCE_SEMANTIC_SELECTORS_V1",
        responsive_fallback="Controls collapse above results on narrow widths while preserving the same simulation anchor.",
        components=["PolicySimulator", "ChangeBasket", "ApprovalComposer", "BlastRadiusPanel"],
        notes="The simulator route is the most explicit place where governance basis hashes become user-visible product law.",
        source_refs=[
            ref(GOVERNANCE, "4.3 `/governance/access/simulator`", "The simulator route is explicit."),
            ref(NORTHBOUND, "Access simulations", "The simulation endpoint and basis-hash rules are explicit."),
        ],
    ),
    route_record(
        GOVERNANCE_BASE,
        route_or_scene_key="governance_authority_links",
        title="Authority link inventory",
        route_or_scene_kind="route",
        route_pattern="/governance/authority-links",
        actor_profile="TENANT_ADMIN | SUPPORT_OPERATOR | AUDITOR",
        object_ownership="AuthorityLinkInventoryItem",
        dominant_question="Which authority links are healthy, mismatched, drifting, or missing delegation?",
        dominant_action="Inspect health and stage repairs without collapsing mismatch categories together.",
        read_models=["AuthorityLinkInventoryItem"],
        read_surfaces=["GET /v1/governance/tenants/{tenant_id}/authority-links"],
        commands=["GOVERNANCE_REPAIR_AUTHORITY_LINK", "GOVERNANCE_REBIND_DELEGATION"],
        command_semantics="NORMALIZED_ACTION_FAMILY",
        stream_sources=["durable command receipts", "authority-link inventory refresh"],
        visibility_lanes=["MASKED_GOVERNANCE"],
        artifact_posture="Binding mismatch, delegation gap, and environment drift are distinct and remain inspectable as separate artifacts.",
        step_up_checkpoints=["Repair commands stay basis-hash guarded and may demand step-up for authority-widening effects."],
        stale_view_posture="Health detail remains visible while repair actions fail closed on outdated inventory or topology basis.",
        recovery_and_resume_rules=[
            "The selected link item remains anchored through refresh and export eligibility checks.",
            "Repair posture cannot silently downgrade mismatch severity or merge categories after resume.",
        ],
        focus_return_rule="Return to the selected authority-link row or detail expansion trigger.",
        selector_profile="GOVERNANCE_SEMANTIC_SELECTORS_V1",
        responsive_fallback="Inventory rows collapse into a tray while detail and health timeline stay accessible in the canvas.",
        components=["AuthorityLinkInventory", "AuthorityLinkDetail", "BindingHealthTimeline", "AuditSidcar"],
        notes="Authority link health categories stay deliberately distinct to prevent semantic flattening in later UI work.",
        source_refs=[
            ref(GOVERNANCE, "4.4 `/governance/authority-links`", "The route semantics are explicit."),
            ref(NORTHBOUND, "Governance read surfaces", "The authority-links endpoint is explicit."),
        ],
    ),
    route_record(
        GOVERNANCE_BASE,
        route_or_scene_key="governance_retention_policies",
        title="Retention policy matrix",
        route_or_scene_kind="route",
        route_pattern="/governance/retention/policies",
        actor_profile="TENANT_ADMIN | APPROVER | AUDITOR",
        object_ownership="RetentionGovernanceFrame",
        dominant_question="Which retention minimums and exceptions govern this tenant right now?",
        dominant_action="Review or stage policy changes with explicit impact preview and legal hold interaction.",
        read_models=["RetentionGovernanceFrame"],
        read_surfaces=["GET /v1/governance/tenants/{tenant_id}/retention"],
        commands=["GOVERNANCE_STAGE_RETENTION_POLICY_CHANGE"],
        command_semantics="NORMALIZED_ACTION_FAMILY",
        stream_sources=["durable command receipts", "retention frame refresh"],
        visibility_lanes=["MASKED_GOVERNANCE"],
        artifact_posture="Policy matrix and impact preview remain paired; export follows the active filtered slice only.",
        step_up_checkpoints=["Lowering retention minimums or widening erase posture remains step-up and approval guarded."],
        stale_view_posture="The matrix remains visible while commit actions fail closed on drifted retention frames.",
        recovery_and_resume_rules=[
            "Retention focus order is normalized from the shared governance shell law plus route-local workspaces.",
            "Selected policy row and impact preview remain attached under responsive collapse.",
        ],
        focus_return_rule="Return to the selected policy row or impact preview toggle.",
        selector_profile="GOVERNANCE_SEMANTIC_SELECTORS_V1",
        responsive_fallback="Policy matrix compacts before impact preview disappears; sidecar redocks beneath the canvas.",
        components=["RetentionPolicyMatrix", "RetentionImpactPreview", "ChangeBasket", "AuditSidcar"],
        notes="This route uses a normalized landmark order because the contract names the workspace more strongly than exact landmark sequencing.",
        source_refs=[
            ref(GOVERNANCE, "4.5 `/governance/retention`", "Retention routes are explicit."),
            ref(NORTHBOUND, "Governance read surfaces", "The retention endpoint is explicit."),
        ],
    ),
    route_record(
        GOVERNANCE_BASE,
        route_or_scene_key="governance_retention_legal_holds",
        title="Legal hold register",
        route_or_scene_kind="route",
        route_pattern="/governance/retention/legal-holds",
        actor_profile="TENANT_ADMIN | APPROVER | AUDITOR",
        object_ownership="RetentionGovernanceFrame / legal-hold slice",
        dominant_question="Which legal holds are active, and what do they block or override?",
        dominant_action="Open or release legal holds with explicit downstream impact in view.",
        read_models=["RetentionGovernanceFrame"],
        read_surfaces=["GET /v1/governance/tenants/{tenant_id}/retention"],
        commands=["GOVERNANCE_OPEN_LEGAL_HOLD", "GOVERNANCE_RELEASE_LEGAL_HOLD"],
        command_semantics="NORMALIZED_ACTION_FAMILY",
        stream_sources=["durable command receipts", "retention frame refresh"],
        visibility_lanes=["MASKED_GOVERNANCE"],
        artifact_posture="Hold records, policy impacts, and downstream constraints remain visible together.",
        step_up_checkpoints=["Opening or releasing a hold requires inline step-up and approval posture when policy demands it."],
        stale_view_posture="Register entries remain visible but irreversible actions fail closed on stale retention basis.",
        recovery_and_resume_rules=[
            "Legal hold selection and impact preview remain anchored under layout collapse.",
            "Hold state is never inferred from a policy matrix alone; the register stays authoritative.",
        ],
        focus_return_rule="Return to the legal-hold row or impact preview trigger.",
        selector_profile="GOVERNANCE_SEMANTIC_SELECTORS_V1",
        responsive_fallback="Register stays primary; impact preview and audit sidecar redock beneath the main workspace on narrow widths.",
        components=["LegalHoldRegister", "RetentionImpactPreview", "AuditSidcar"],
        notes="Legal holds remain explicitly distinct from broader retention policy edits.",
        source_refs=[
            ref(GOVERNANCE, "4.5 `/governance/retention/legal-holds`", "The route is explicit."),
            ref(NORTHBOUND, "Governance read surfaces", "The retention frame is the northbound source for legal-hold slices."),
        ],
    ),
    route_record(
        GOVERNANCE_BASE,
        route_or_scene_key="governance_retention_erasure",
        title="Erasure queue",
        route_or_scene_kind="route",
        route_pattern="/governance/retention/erasure",
        actor_profile="TENANT_ADMIN | APPROVER | AUDITOR",
        object_ownership="RetentionGovernanceFrame / erasure slice",
        dominant_question="Which erasure requests are eligible, blocked, or irreversible?",
        dominant_action="Inspect and approve erasure only when the current retention frame and legal-hold state permit it.",
        read_models=["RetentionGovernanceFrame"],
        read_surfaces=["GET /v1/governance/tenants/{tenant_id}/retention"],
        commands=["GOVERNANCE_STAGE_ERASURE_DECISION", "GOVERNANCE_APPROVE_ERASURE"],
        command_semantics="NORMALIZED_ACTION_FAMILY",
        stream_sources=["durable command receipts", "retention frame refresh"],
        visibility_lanes=["MASKED_GOVERNANCE"],
        artifact_posture="Eligibility, blocking holds, and irreversible consequences are all first-class rows, not hidden edge cases.",
        step_up_checkpoints=["Irreversible erasure actions are never accepted from a stale governance view."],
        stale_view_posture="Queue context remains visible while erase actions fail closed with typed stale-view errors.",
        recovery_and_resume_rules=[
            "Selected erasure row and blocker detail stay mounted across refresh and back.",
            "The route preserves the same filtered slice for export and receipt review.",
        ],
        focus_return_rule="Return to the erasure queue row or blocker explanation anchor.",
        selector_profile="GOVERNANCE_SEMANTIC_SELECTORS_V1",
        responsive_fallback="Queue remains first; blocker detail redocks beneath it before any loss of semantic meaning.",
        components=["ErasureQueue", "RetentionImpactPreview", "AuditSidcar"],
        notes="This route is the clearest example of the governance stale-view hard stop on irreversible action.",
        source_refs=[
            ref(GOVERNANCE, "4.5 `/governance/retention/erasure`", "The route is explicit."),
            ref(NORTHBOUND, "Governance stale-view rules", "Unmasked audit export and irreversible retention actions cannot commit from stale views."),
        ],
    ),
    route_record(
        GOVERNANCE_BASE,
        route_or_scene_key="governance_audit",
        title="Audit investigation workbench",
        route_or_scene_kind="route",
        route_pattern="/governance/audit",
        actor_profile="AUDITOR | SUPPORT_OPERATOR | TENANT_ADMIN",
        object_ownership="AuditInvestigationFrame",
        dominant_question="What happened, when, why, and what evidence is export-eligible now?",
        dominant_action="Investigate append-only event slices and compare diffs without altering the audit trail.",
        read_models=["AuditInvestigationFrame"],
        read_surfaces=["GET /v1/governance/tenants/{tenant_id}/audit-investigations"],
        commands=["GOVERNANCE_EXPORT_AUDIT_SLICE"],
        command_semantics="NORMALIZED_ACTION_FAMILY",
        stream_sources=["append-only event refresh", "durable command receipts"],
        visibility_lanes=["MASKED_GOVERNANCE", "audit-retention-visible receipts"],
        artifact_posture="Append-only event slices, correlation neighborhoods, and export eligibility remain explicit and non-destructive.",
        step_up_checkpoints=["Export remains governed by the active filtered slice and masking/export posture."],
        stale_view_posture="Investigation frames stay visible while export or follow-on actions fail closed when masking or basis drift.",
        recovery_and_resume_rules=[
            "Selected event, diff inspector state, and export eligibility panel survive refresh and responsive collapse.",
            "Audit slices remain append-only and never reorder into heuristic summaries.",
        ],
        focus_return_rule="Return to the selected event row or export eligibility trigger.",
        selector_profile="GOVERNANCE_SEMANTIC_SELECTORS_V1",
        responsive_fallback="The audit sidecar redocks but remains visible before export posture is obscured.",
        components=["AuditInvestigationWorkbench", "AuditTape", "EventDiffInspector", "ExportEligibilityPanel", "AuditSidcar"],
        notes="This route is read-heavy and append-only, but still governed by the same return-target and support-region laws.",
        source_refs=[
            ref(GOVERNANCE, "4.6 `/governance/audit`", "Audit route purpose is explicit."),
            ref(NORTHBOUND, "Governance read surfaces", "The audit-investigations endpoint is explicit."),
        ],
    ),
    route_record(
        NATIVE_PRIMARY_BASE,
        route_or_scene_key="native_primary_manifest_scene",
        title="Primary manifest scene",
        route_or_scene_kind="scene",
        route_pattern="NativeOperatorWorkspaceScene(manifest)",
        actor_profile="STAFF_OPERATOR",
        object_ownership="DecisionBundle + manifest experience state",
        dominant_question="What is the current manifest decision state, and what support detail belongs in the inspector or a detached window?",
        dominant_action="Operate on the same manifest object through sidebar, canvas, and inspector without violating browser truth.",
        read_models=["DecisionBundle", "ExperienceCursor", "WorkspaceSnapshot (linked focus when present)"],
        read_surfaces=["Manifest experience snapshot", "Manifest experience stream", "Local cache hydration envelope"],
        commands=[
            "TOGGLE_SIDEBAR",
            "TOGGLE_INSPECTOR",
            "FOCUS_PRIMARY_CANVAS",
            "OPEN_COMPARE_WINDOW",
            "REFRESH_CURRENT_SCENE",
        ],
        command_semantics="LOCAL_NATIVE_COMMAND",
        stream_sources=["snapshot hydration", "stream resume", "manifest delta application"],
        visibility_lanes=["NATIVE_CACHED_NON_AUTHORITATIVE", "CALM operator truth after northbound reconciliation"],
        artifact_posture="Evidence preview, compare context, and pinned selections stay inside cache-safe native affordances.",
        step_up_checkpoints=["Native step-up still delegates to governed backend/browser flows rather than inventing offline legal commands."],
        stale_view_posture="Previously valid content stays mounted while inspector actions fail closed and refresh/rebase becomes explicit.",
        recovery_and_resume_rules=[
            "Scene restoration never reopens a manifest after tenant switch, privilege downgrade, or masking drift.",
            "Resize or inspector collapse must preserve the same manifest scene identity, dominant question, and settlement posture.",
        ],
        focus_return_rule="Return to the manifest sidebar row, canvas anchor, or inspector trigger that opened support detail.",
        selector_profile="NATIVE_OPERATOR_SELECTORS_V1",
        responsive_fallback="Sidebar and inspector collapse independently but the same object remains mounted in the center canvas.",
        components=["NativeLeadingSidebar", "NativePrimaryCanvas", "NativeTrailingInspector", "NativeCommandSurface", "NativeSceneRestoreCapsule"],
        notes="Native primary scenes embody calm-shell law; they do not define a fourth shell family.",
        source_refs=[
            ref(NATIVE, "5. Preferred window and scene architecture", "The primary split-view scene is explicit."),
            ref(CACHE_ISOLATION, "Native secondary windows and preview subjects", "Scene legality is cache-bound."),
        ],
    ),
    route_record(
        NATIVE_PRIMARY_BASE,
        route_or_scene_key="native_primary_work_item_scene",
        title="Primary work-item scene",
        route_or_scene_kind="scene",
        route_pattern="NativeOperatorWorkspaceScene(work-item)",
        actor_profile="STAFF_OPERATOR",
        object_ownership="WorkspaceSnapshot + WorkspaceCursor",
        dominant_question="What is the safest next action on this work item from the native scene?",
        dominant_action="Work the same collaboration object through native navigation, inspector, and shortcuts while honoring web truth.",
        read_models=["WorkspaceSnapshot", "WorkspaceDelta", "WorkspaceCursor"],
        read_surfaces=["Workspace snapshot", "Workspace stream", "Local cache hydration envelope"],
        commands=[
            "TOGGLE_SIDEBAR",
            "TOGGLE_INSPECTOR",
            "FOCUS_SIDEBAR",
            "FOCUS_PRIMARY_CANVAS",
            "OPEN_AUDIT_WINDOW",
            "OPEN_AUTHORITY_REVIEW_WINDOW",
            "REFRESH_CURRENT_SCENE",
        ],
        command_semantics="LOCAL_NATIVE_COMMAND",
        stream_sources=["snapshot hydration", "stream resume", "workspace delta application"],
        visibility_lanes=["NATIVE_CACHED_NON_AUTHORITATIVE", "CALM operator truth after northbound reconciliation"],
        artifact_posture="Current workspace detail may be cached locally, but mutations still respect stale-view guards from the rendered surface.",
        step_up_checkpoints=["No blind offline legal commands; backend stale-view guards still bind every mutation-capable affordance."],
        stale_view_posture="The scene stays mounted but any stale command lane downgrades inline to read-only or refresh-required posture.",
        recovery_and_resume_rules=[
            "Reconnect and rebase must match the browser collaboration contract.",
            "Scene restoration keeps the same work item, dominant question, and settlement posture when still legal.",
        ],
        focus_return_rule="Return to the invoking sidebar item, selected module anchor, or inspector trigger.",
        selector_profile="NATIVE_OPERATOR_SELECTORS_V1",
        responsive_fallback="Scene collapses from three-pane to two-pane without replacing the work-item object or hiding the inspector law.",
        components=["NativeLeadingSidebar", "NativePrimaryCanvas", "NativeTrailingInspector", "NativeCommandSurface", "QuickLookPreview"],
        notes="The work-item scene is the native mirror of the collaboration workspace, with native command affordances layered on top.",
        source_refs=[
            ref(NATIVE, "6. Data flow and synchronization model", "Work-item data flow and cursor/resume model are explicit."),
            ref(NATIVE, "14. Acceptance criteria", "Rebase, stale-view, and scene-identity parity are explicit acceptance criteria."),
        ],
    ),
    route_record(
        NATIVE_SECONDARY_BASE,
        route_or_scene_key="native_secondary_compare_window",
        title="Detached compare window",
        route_or_scene_kind="scene",
        route_pattern="NativeOperatorSecondaryWindowScene(compare)",
        actor_profile="STAFF_OPERATOR",
        object_ownership="Manifest lineage or drift comparison subject",
        dominant_question="How do two evidence or decision states compare without collapsing the parent scene context?",
        dominant_action="Inspect compare detail in a support-only window and return to the parent anchor.",
        read_models=["DecisionBundle comparison slice", "preview_subject_ref_or_null"],
        read_surfaces=["Parent scene export to detached compare window", "Local cached compare payload"],
        commands=["FOCUS_PRIMARY_CANVAS", "CLOSE_SECONDARY_WINDOW", "COPY_IDENTIFIERS"],
        command_semantics="LOCAL_NATIVE_COMMAND",
        stream_sources=["parent scene refresh", "detached window restore payload"],
        visibility_lanes=["NATIVE_CACHED_NON_AUTHORITATIVE"],
        artifact_posture="Compare windows are support-only and cannot silently widen preview scope beyond the parent subject.",
        step_up_checkpoints=[],
        stale_view_posture="If the parent scene basis drifts, the compare window becomes read-only or closes back to the parent anchor.",
        recovery_and_resume_rules=[
            "Detached windows serialize as `NativeOperatorSecondaryWindowScene` with parent return metadata.",
            "Preview subject legality is rechecked before scene restoration.",
        ],
        focus_return_rule="Return to the exact parent compare trigger or selected evidence row.",
        selector_profile="NATIVE_OPERATOR_SELECTORS_V1",
        responsive_fallback="Secondary windows are native overlays; they do not collapse into browser route variants.",
        components=["NativeSecondaryWindowHeader", "NativeCompareWindow", "NativeSceneRestoreCapsule"],
        notes="Secondary windows are deliberately support-only overlays, not new shell families.",
        source_refs=[
            ref(NATIVE, "5. Preferred window and scene architecture / Secondary windows", "Compare windows are explicit."),
            ref(NATIVE, "11. Security and runtime posture", "Preview subject legality and temp-artifact purges are explicit."),
        ],
    ),
    route_record(
        NATIVE_SECONDARY_BASE,
        route_or_scene_key="native_secondary_audit_window",
        title="Detached audit window",
        route_or_scene_kind="scene",
        route_pattern="NativeOperatorSecondaryWindowScene(audit)",
        actor_profile="STAFF_OPERATOR | AUDITOR",
        object_ownership="Audit trail and provenance slice",
        dominant_question="What audit or provenance detail supports the current scene without displacing it?",
        dominant_action="Inspect append-only audit detail in a parent-bound support window.",
        read_models=["Audit slice", "preview_subject_ref_or_null"],
        read_surfaces=["Parent scene audit export", "Local cached audit payload"],
        commands=["FOCUS_PRIMARY_CANVAS", "CLOSE_SECONDARY_WINDOW", "COPY_IDENTIFIERS"],
        command_semantics="LOCAL_NATIVE_COMMAND",
        stream_sources=["parent scene refresh", "detached window restore payload"],
        visibility_lanes=["NATIVE_CACHED_NON_AUTHORITATIVE"],
        artifact_posture="Audit detail stays non-authoritative locally and must respect masking/export posture at open time and restore time.",
        step_up_checkpoints=["Export or print remains governed by masking/export posture before any helper opens."],
        stale_view_posture="Audit content may remain visible but any export or print action fails closed on drift.",
        recovery_and_resume_rules=[
            "Parent focus restoration is serialized and mandatory.",
            "Quick Look, print, and export helpers purge temp artifacts if tenant, masking, or preview subject drift.",
        ],
        focus_return_rule="Return to the parent audit trigger or provenance row anchor.",
        selector_profile="NATIVE_OPERATOR_SELECTORS_V1",
        responsive_fallback="Window remains detached rather than collapsing into a route-local drawer.",
        components=["NativeSecondaryWindowHeader", "NativeAuditWindow", "QuickLookPreview"],
        notes="Audit windows inherit native support-only rules and masking-aware restore envelopes.",
        source_refs=[
            ref(NATIVE, "5. Preferred window and scene architecture / Secondary windows", "Audit windows are explicit."),
            ref(NATIVE, "11. Security and runtime posture", "Quick Look and export legality are explicit."),
        ],
    ),
    route_record(
        NATIVE_SECONDARY_BASE,
        route_or_scene_key="native_secondary_filing_packet_window",
        title="Detached filing-packet window",
        route_or_scene_kind="scene",
        route_pattern="NativeOperatorSecondaryWindowScene(filing-packet)",
        actor_profile="STAFF_OPERATOR",
        object_ownership="Filing packet review/export surface",
        dominant_question="What packet material is ready for review, export, or print under current masking posture?",
        dominant_action="Review or export packet detail in a support-only window tied to the invoking parent scene.",
        read_models=["Packet preview slice", "preview_subject_ref_or_null"],
        read_surfaces=["Parent scene packet export", "Local cached packet payload"],
        commands=["FOCUS_PRIMARY_CANVAS", "CLOSE_SECONDARY_WINDOW", "COPY_IDENTIFIERS"],
        command_semantics="LOCAL_NATIVE_COMMAND",
        stream_sources=["parent scene refresh", "detached window restore payload"],
        visibility_lanes=["NATIVE_CACHED_NON_AUTHORITATIVE"],
        artifact_posture="Print-preview and export staging are governed helpers, not independent truth surfaces.",
        step_up_checkpoints=["Export and print helpers must recheck masking/export posture before opening or restoring."],
        stale_view_posture="Packet preview may persist visually while export controls fail closed on drift.",
        recovery_and_resume_rules=[
            "Temp artifacts purge when tenant, masking, or preview subject drift.",
            "The secondary window must restore back to the exact parent packet trigger.",
        ],
        focus_return_rule="Return to the parent packet review trigger or selected evidence row.",
        selector_profile="NATIVE_OPERATOR_SELECTORS_V1",
        responsive_fallback="Detached packet review stays a windowed support surface rather than a route mutation.",
        components=["NativeSecondaryWindowHeader", "NativeFilingPacketWindow", "QuickLookPreview"],
        notes="Packet review is explicitly support-only and inherits the parent scene legality envelope.",
        source_refs=[
            ref(NATIVE, "5. Preferred window and scene architecture / Secondary windows", "Filing packet review/export windows are explicit."),
            ref(NATIVE, "11. Security and runtime posture", "Temporary artifact purge rules are explicit."),
        ],
    ),
    route_record(
        NATIVE_SECONDARY_BASE,
        route_or_scene_key="native_secondary_authority_review_window",
        title="Detached authority review window",
        route_or_scene_kind="scene",
        route_pattern="NativeOperatorSecondaryWindowScene(authority-review)",
        actor_profile="STAFF_OPERATOR | SUPPORT_OPERATOR",
        object_ownership="Authority interaction review slice",
        dominant_question="What authority interaction detail belongs in support context without widening the parent scene?",
        dominant_action="Inspect authority detail and return to the parent work surface.",
        read_models=["Authority interaction slice", "preview_subject_ref_or_null"],
        read_surfaces=["Parent scene authority review export", "Local cached authority payload"],
        commands=["FOCUS_PRIMARY_CANVAS", "CLOSE_SECONDARY_WINDOW", "COPY_IDENTIFIERS"],
        command_semantics="LOCAL_NATIVE_COMMAND",
        stream_sources=["parent scene refresh", "detached window restore payload"],
        visibility_lanes=["NATIVE_CACHED_NON_AUTHORITATIVE"],
        artifact_posture="Authority review stays tied to the invoking object and cannot survive into a broader context.",
        step_up_checkpoints=["Any authority action still routes through governed backend or browser step-up paths."],
        stale_view_posture="Authority review can stay visible, but action affordances fail closed when the parent basis drifts.",
        recovery_and_resume_rules=[
            "Detached authority review restores to the exact parent invocation anchor.",
            "Route legality is rechecked before the detached window resumes.",
        ],
        focus_return_rule="Return to the parent authority review trigger.",
        selector_profile="NATIVE_OPERATOR_SELECTORS_V1",
        responsive_fallback="Detached authority review is never collapsed into a new browser route or shell family.",
        components=["NativeSecondaryWindowHeader", "NativeAuthorityReviewWindow"],
        notes="Authority review is support-only and parent-bound like the other detached native windows.",
        source_refs=[
            ref(NATIVE, "5. Preferred window and scene architecture / Secondary windows", "Authority interaction review is explicit."),
            ref(NATIVE, "7. Authentication and session strategy", "Authority work still uses governed browser/session flows when needed."),
        ],
    ),
    route_record(
        NATIVE_SECONDARY_BASE,
        route_or_scene_key="native_auth_handoff_session",
        title="Native browser auth handoff",
        route_or_scene_kind="scene",
        route_pattern="ASWebAuthenticationSession(authority or step-up)",
        actor_profile="STAFF_OPERATOR | CLIENT_SIGNATORY",
        object_ownership="Temporary external identity or authority handoff",
        dominant_question="What external authority or identity task must complete before the parent scene can settle?",
        dominant_action="Leave the native scene temporarily, complete the external authority step, and resume the parent scene with the same return target.",
        read_models=["Return target envelope", "pending authority task binding"],
        read_surfaces=["ASWebAuthenticationSession callback", "Parent scene refresh after settlement"],
        commands=["BEGIN_ASWEB_AUTH_SESSION", "RESUME_PARENT_SCENE"],
        command_semantics="LOCAL_NATIVE_AND_AUTH",
        stream_sources=["auth callback", "parent scene refresh"],
        visibility_lanes=["NATIVE_CACHED_NON_AUTHORITATIVE", "external authority truth"],
        artifact_posture="No external handoff implies completion until the parent governed read model confirms settlement.",
        step_up_checkpoints=["The handoff itself is the step-up checkpoint and must serialize the parent return target."],
        stale_view_posture="Parent scene remains preserved behind the handoff and resumes only after legality checks and fresh read settlement.",
        recovery_and_resume_rules=[
            "Temporary external handoff is allowed but must restore the exact parent route/scene and focus anchor.",
            "Tenant switch, privilege downgrade, or masking drift invalidate the return envelope rather than resuming heuristically.",
        ],
        focus_return_rule="Return to the exact parent scene trigger that initiated the handoff.",
        selector_profile="NATIVE_OPERATOR_SELECTORS_V1",
        responsive_fallback="The handoff is external, not responsive; the parent scene remains preserved for resume or explicit invalidation.",
        components=["NativeAuthHandoff", "NativeSceneRestoreCapsule"],
        notes="External handoff is a temporary escape hatch, not a shell transition.",
        source_refs=[
            ref(NATIVE, "7. Authentication and session strategy", "ASWebAuthenticationSession is explicit."),
            ref(FRONTEND_LAW, "2. Route continuity and shell stability", "External handoff must return to the same object and shell."),
        ],
    ),
]


COMPONENT_METADATA = {
    "WorkInboxRow": ("COLLABORATION", "PRIMARY_ROW", "work-item-row", "A staff inbox row with identity, triage, and action bands.", [ref(COLLABORATION, "4. Key components", "Work inbox components are explicitly listed.")]),
    "StatusPill": ("COLLABORATION", "STATUS", "work-item-status", "Typed lifecycle status chip for collaboration rows.", [ref(COLLABORATION, "4. Key components", "StatusPill is explicit.")]),
    "AssigneeChip": ("COLLABORATION", "STATUS", "assignee-chip", "Current owner anchor for queue and workspace headers.", [ref(COLLABORATION, "4. Key components", "AssigneeChip is explicit.")]),
    "SlaBadge": ("COLLABORATION", "STATUS", "sla-badge", "SLA timing posture attached to the inbox row.", [ref(COLLABORATION, "4. Key components", "SlaBadge is explicit.")]),
    "EscalationBadge": ("COLLABORATION", "STATUS", "escalation-badge", "Escalation posture anchor for queues and summaries.", [ref(COLLABORATION, "4. Key components", "EscalationBadge is explicit.")]),
    "ContextBar": ("COLLABORATION", "PRIMARY_CONTEXT", "context-bar", "Top calm-shell context anchor.", [ref(LOW_NOISE, "LowNoiseExperienceFrame", "Context bar is part of the calm-shell order.")]),
    "DecisionSummary": ("COLLABORATION", "PRIMARY_SUMMARY", "decision-summary", "Decision summary block above the action strip.", [ref(LOW_NOISE, "LowNoiseExperienceFrame", "Decision summary is part of the calm-shell order.")]),
    "ActionStrip": ("COLLABORATION", "PRIMARY_ACTION", "action-strip", "Action strip containing the dominant legal next step.", [ref(LOW_NOISE, "LowNoiseExperienceFrame", "Action strip is part of the calm-shell order.")]),
    "DetailDrawer": ("COLLABORATION", "PROMOTED_SUPPORT", "detail-drawer", "The single promoted support region in calm-shell workspaces.", [ref(FRONTEND_LAW, "3. Layout topology and support-region promotion", "Only one promoted support region is allowed.")]),
    "DominantQuestion": ("COLLABORATION", "PRIMARY_SUMMARY", "dominant-question", "The explicit top-level question the operator should answer now.", [ref(COLLABORATION, "1. Core invariants", "Every route keeps one dominant question.")]),
    "SettlementPosture": ("COLLABORATION", "PRIMARY_SUMMARY", "settlement-posture", "Shared settlement-state surface for the current work item.", [ref(EMPTY_STATE, "Shared shell freshness and recovery vocabulary", "Settlement states are shared law.")]),
    "NoSafeAction": ("COLLABORATION", "RECOVERY", "no-safe-action", "Fail-closed action state when stale or limited.", [ref(EMPTY_STATE, "Shared shell freshness and recovery vocabulary", "Unsafe mutation affordances fail closed.")]),
    "CustomerActivityThread": ("COLLABORATION", "THREAD", "customer-activity", "Customer-visible activity thread.", [ref(COLLABORATION, "4. Key components", "Customer activity thread is explicit.")]),
    "InternalActivityThread": ("COLLABORATION", "THREAD", "internal-activity", "Internal-only staff activity thread.", [ref(COLLABORATION, "4. Key components", "Internal activity thread is explicit.")]),
    "ProblemBanner": ("COLLABORATION", "RECOVERY", "portal-inline-recovery", "Inline problem or limitation notice during stale/rebase posture.", [ref(COLLABORATION, "4. Key components", "ProblemBanner is explicit.")]),
    "FilesModule": ("COLLABORATION", "ARTIFACT", "files-module", "Current-vs-history attachment and download posture module.", [ref(COLLABORATION, "4. Key components", "FilesModule is explicit.")]),
    "LinkedContextPanel": ("COLLABORATION", "PROMOTED_SUPPORT", "linked-context-panel", "Linked manifest or external work context.", [ref(COLLABORATION, "4. Key components", "LinkedContextPanel is explicit.")]),
    "AuditTape": ("COLLABORATION", "PROMOTED_SUPPORT", "audit-tape", "Append-only workspace-local audit stream.", [ref(COLLABORATION, "4. Key components", "AuditTape is explicit.")]),
    "PortalHeader": ("PORTAL", "PRIMARY_CONTEXT", "portal-shell", "Top shell header for portal routes.", [ref(PORTAL, "Minimum semantic selectors", "Portal shell anchor is explicit.")]),
    "StatusHero": ("PORTAL", "PRIMARY_SUMMARY", "portal-status-hero", "Home route summary and next-action frame.", [ref(PORTAL, "Route architecture / Home", "STATUS_HERO is explicit.")]),
    "TaskQueue": ("PORTAL", "PRIMARY_ACTION", "portal-primary-action", "Task-first queue for portal home.", [ref(PORTAL, "Route architecture / Home", "TASK_QUEUE is explicit.")]),
    "RecentActivity": ("PORTAL", "SECONDARY_CONTEXT", "portal-history-list", "Recent portal-safe activity timeline.", [ref(PORTAL, "Route architecture / Home", "RECENT_ACTIVITY is explicit.")]),
    "DocumentInbox": ("PORTAL", "PRIMARY_CONTEXT", "portal-request-focus", "Document request list and grouping.", [ref(PORTAL, "Route architecture / Documents", "DOCUMENT_INBOX is explicit.")]),
    "UploadPanel": ("PORTAL", "PRIMARY_ACTION", "portal-primary-action", "Upload controls and file selection entry.", [ref(PORTAL, "Route architecture / Documents", "UPLOAD_PANEL is explicit.")]),
    "UploadStatusList": ("PORTAL", "PRIMARY_ACTION", "portal-inline-recovery", "Transfer/scan/validation/acceptance ribbon and rows.", [ref(PORTAL, "Secure document-upload flow", "Upload status posture is explicit.")]),
    "DocumentHistory": ("PORTAL", "SECONDARY_CONTEXT", "portal-history-list", "Traceable accepted/rejected/superseded document history.", [ref(PORTAL, "Route architecture / Documents", "DOCUMENT_HISTORY is explicit.")]),
    "ApprovalSummary": ("PORTAL", "PRIMARY_SUMMARY", "portal-request-focus", "Current approval pack summary.", [ref(PORTAL, "Route architecture / Approvals", "APPROVAL_SUMMARY is explicit.")]),
    "ChangeDigest": ("PORTAL", "PRIMARY_CONTEXT", "portal-current-artifact", "Digest of pending changes to review.", [ref(PORTAL, "Route architecture / Approvals", "CHANGE_DIGEST is explicit.")]),
    "DeclarationPanel": ("PORTAL", "PRIMARY_CONTEXT", "portal-workspace-posture", "Declaration copy and legal posture container.", [ref(PORTAL, "Route architecture / Approvals", "DECLARATION_PANEL is explicit.")]),
    "SignOffPanel": ("PORTAL", "PRIMARY_ACTION", "portal-primary-action", "Sign-off action surface.", [ref(PORTAL, "Route architecture / Approvals", "SIGN_OFF_PANEL is explicit.")]),
    "WelcomePanel": ("PORTAL", "PRIMARY_SUMMARY", "portal-request-focus", "Onboarding welcome or orientation panel.", [ref(PORTAL, "Route architecture / Onboarding", "WELCOME_PANEL is explicit.")]),
    "OnboardingStepper": ("PORTAL", "PRIMARY_CONTEXT", "portal-route-tabs", "Onboarding step progression indicator.", [ref(PORTAL, "Route architecture / Onboarding", "ONBOARDING_STEPPER is explicit.")]),
    "StepWorkspace": ("PORTAL", "PRIMARY_ACTION", "portal-workspace-posture", "Active onboarding step workspace.", [ref(PORTAL, "Route architecture / Onboarding", "STEP_WORKSPACE is explicit.")]),
    "SupportPanel": ("PORTAL", "PROMOTED_SUPPORT", "portal-support-panel", "Single promoted support region in portal routes.", [ref(PORTAL, "Shell continuity, support budget, and constrained layouts", "Support budget is explicit.")]),
    "HelpOptions": ("PORTAL", "PRIMARY_ACTION", "portal-support-entry", "Main help route support choices.", [ref(PORTAL, "Route architecture / Help", "HELP_OPTIONS is explicit.")]),
    "TopQuestions": ("PORTAL", "SECONDARY_CONTEXT", "portal-history-list", "Top question or FAQ list.", [ref(PORTAL, "Route architecture / Help", "TOP_QUESTIONS is explicit.")]),
    "CaseContextPanel": ("PORTAL", "PROMOTED_SUPPORT", "portal-support-panel", "Current support case context panel.", [ref(PORTAL, "Route architecture / Help", "CASE_CONTEXT_PANEL is explicit.")]),
    "GovernanceContextBar": ("GOVERNANCE", "PRIMARY_CONTEXT", "governance-context-bar", "Top governance context bar.", [ref(GOVERNANCE, "4. Information architecture and route map", "Governance context bar is explicit.")]),
    "SectionNav": ("GOVERNANCE", "NAVIGATION", "governance-section-nav", "Persistent section navigation rail.", [ref(GOVERNANCE, "4. Information architecture and route map", "Section nav is explicit.")]),
    "InventoryRail": ("GOVERNANCE", "NAVIGATION", "governance-primary-worklist", "Persistent inventory or worklist rail.", [ref(GOVERNANCE, "4. Information architecture and route map", "Inventory rail is explicit.")]),
    "WorkspaceCanvas": ("GOVERNANCE", "PRIMARY_CONTEXT", "governance-workspace-header", "Primary governance workspace area.", [ref(GOVERNANCE, "4. Information architecture and route map", "Workspace canvas is explicit.")]),
    "AuditSidcar": ("GOVERNANCE", "PROMOTED_SUPPORT", "governance-support-sidecar", "Promoted audit sidecar.", [ref(GOVERNANCE, "4. Information architecture and route map", "Audit sidecar is explicit.")]),
    "OverviewAttentionSummary": ("GOVERNANCE", "PRIMARY_SUMMARY", "overview-attention-summary", "Overview priority summary.", [ref(GOVERNANCE, "4.1 `/governance`", "OverviewAttentionSummary is explicit.")]),
    "GovernanceRiskLedger": ("GOVERNANCE", "PRIMARY_CONTEXT", "governance-risk-ledger", "Risk ledger for overview.", [ref(GOVERNANCE, "4.1 `/governance`", "GovernanceRiskLedger is explicit.")]),
    "PendingChangeQueue": ("GOVERNANCE", "PRIMARY_ACTION", "governance-primary-worklist", "Pending change queue on overview.", [ref(GOVERNANCE, "4.1 `/governance`", "PendingChangeQueue is explicit.")]),
    "ChangeBasket": ("GOVERNANCE", "PRIMARY_ACTION", "change-basket", "Diff-first staging basket.", [ref(GOVERNANCE, "6. Shared interaction and mutation rules", "ChangeBasket is explicit.")]),
    "ApprovalComposer": ("GOVERNANCE", "PROMOTED_SUPPORT", "approval-composer", "Approval and communication composer.", [ref(GOVERNANCE, "6. Shared interaction and mutation rules", "ApprovalComposer is explicit.")]),
    "BlastRadiusPanel": ("GOVERNANCE", "PROMOTED_SUPPORT", "governance-dominant-question", "Blast-radius and downstream impact surface.", [ref(GOVERNANCE, "4.2 `/governance/tenant`", "BlastRadiusPanel is explicit.")]),
    "ConfigHistoryTimeline": ("GOVERNANCE", "SECONDARY_CONTEXT", "governance-recovery-posture", "Configuration history timeline.", [ref(GOVERNANCE, "4.2 `/governance/tenant`", "ConfigHistoryTimeline is explicit.")]),
    "PrincipalDirectory": ("GOVERNANCE", "NAVIGATION", "principal-directory", "Principal list and filters.", [ref(GOVERNANCE, "10. Minimum semantic selectors", "Principal directory selector is explicit.")]),
    "PrincipalAccessGrid": ("GOVERNANCE", "PRIMARY_CONTEXT", "principal-access-grid", "Effective access detail grid.", [ref(GOVERNANCE, "10. Minimum semantic selectors", "Principal access grid selector is explicit.")]),
    "AuthorityChainPanel": ("GOVERNANCE", "PROMOTED_SUPPORT", "authority-chain-panel", "Chain-of-authority inspection panel.", [ref(GOVERNANCE, "10. Minimum semantic selectors", "Authority chain panel selector is explicit.")]),
    "PolicySimulator": ("GOVERNANCE", "PRIMARY_ACTION", "policy-simulator", "Simulation workspace and basis hash surface.", [ref(GOVERNANCE, "10. Minimum semantic selectors", "Policy simulator selector is explicit.")]),
    "AuthorityLinkInventory": ("GOVERNANCE", "NAVIGATION", "authority-link-inventory", "Authority link inventory list.", [ref(GOVERNANCE, "10. Minimum semantic selectors", "Authority link inventory selector is explicit.")]),
    "AuthorityLinkDetail": ("GOVERNANCE", "PRIMARY_CONTEXT", "authority-link-detail", "Selected authority link detail surface.", [ref(GOVERNANCE, "10. Minimum semantic selectors", "Authority link detail selector is explicit.")]),
    "BindingHealthTimeline": ("GOVERNANCE", "PROMOTED_SUPPORT", "binding-health-timeline", "Timeline of binding health changes.", [ref(GOVERNANCE, "10. Minimum semantic selectors", "Binding health timeline selector is explicit.")]),
    "RetentionPolicyMatrix": ("GOVERNANCE", "PRIMARY_CONTEXT", "retention-policy-matrix", "Retention policy matrix.", [ref(GOVERNANCE, "10. Minimum semantic selectors", "Retention policy matrix selector is explicit.")]),
    "LegalHoldRegister": ("GOVERNANCE", "PRIMARY_CONTEXT", "legal-hold-register", "Legal hold list and filters.", [ref(GOVERNANCE, "10. Minimum semantic selectors", "Legal hold register selector is explicit.")]),
    "ErasureQueue": ("GOVERNANCE", "PRIMARY_CONTEXT", "erasure-queue", "Erasure review queue.", [ref(GOVERNANCE, "10. Minimum semantic selectors", "Erasure queue selector is explicit.")]),
    "RetentionImpactPreview": ("GOVERNANCE", "PROMOTED_SUPPORT", "retention-impact-preview", "Impact preview for retention changes.", [ref(GOVERNANCE, "10. Minimum semantic selectors", "Retention impact preview selector is explicit.")]),
    "AuditInvestigationWorkbench": ("GOVERNANCE", "PRIMARY_CONTEXT", "audit-investigation-workbench", "Audit investigation workspace.", [ref(GOVERNANCE, "10. Minimum semantic selectors", "Audit investigation workbench selector is explicit.")]),
    "EventDiffInspector": ("GOVERNANCE", "PROMOTED_SUPPORT", "event-diff-inspector", "Audit event diff inspector.", [ref(GOVERNANCE, "10. Minimum semantic selectors", "Event diff inspector selector is explicit.")]),
    "ExportEligibilityPanel": ("GOVERNANCE", "PROMOTED_SUPPORT", "export-eligibility-panel", "Governed export eligibility surface.", [ref(GOVERNANCE, "10. Minimum semantic selectors", "Export eligibility panel selector is explicit.")]),
    "NativeLeadingSidebar": ("NATIVE_OPERATOR", "NAVIGATION", "native-scene-sidebar", "Leading sidebar in primary native scenes.", [ref(NATIVE, "5. Preferred window and scene architecture", "Leading sidebar is explicit.")]),
    "NativePrimaryCanvas": ("NATIVE_OPERATOR", "PRIMARY_CONTEXT", "native-scene-primary-canvas", "Central content area in primary native scenes.", [ref(NATIVE, "5. Preferred window and scene architecture", "Primary canvas is explicit.")]),
    "NativeTrailingInspector": ("NATIVE_OPERATOR", "PROMOTED_SUPPORT", "native-scene-inspector", "Trailing inspector in primary native scenes.", [ref(NATIVE, "5. Preferred window and scene architecture", "Trailing inspector is explicit.")]),
    "NativeSecondaryWindowHeader": ("NATIVE_OPERATOR", "PRIMARY_CONTEXT", "native-secondary-window", "Identity header for detached support windows.", [ref(NATIVE, "5. Preferred window and scene architecture / Secondary windows", "Secondary window header posture is explicit.")]),
    "NativeCompareWindow": ("NATIVE_OPERATOR", "PRIMARY_CONTEXT", "native-secondary-window", "Detached compare window canvas.", [ref(NATIVE, "5. Preferred window and scene architecture / Secondary windows", "Compare windows are explicit.")]),
    "NativeAuditWindow": ("NATIVE_OPERATOR", "PRIMARY_CONTEXT", "native-secondary-window", "Detached audit or provenance window canvas.", [ref(NATIVE, "5. Preferred window and scene architecture / Secondary windows", "Audit windows are explicit.")]),
    "NativeFilingPacketWindow": ("NATIVE_OPERATOR", "PRIMARY_CONTEXT", "native-secondary-window", "Detached filing packet review/export canvas.", [ref(NATIVE, "5. Preferred window and scene architecture / Secondary windows", "Filing packet windows are explicit.")]),
    "NativeAuthorityReviewWindow": ("NATIVE_OPERATOR", "PRIMARY_CONTEXT", "native-secondary-window", "Detached authority review canvas.", [ref(NATIVE, "5. Preferred window and scene architecture / Secondary windows", "Authority review windows are explicit.")]),
    "NativeCommandSurface": ("NATIVE_OPERATOR", "PRIMARY_ACTION", "native-command-surface", "Keyboard-first command surface for native scenes.", [ref(NATIVE, "Commands / menus", "Native command vocabulary is explicit.")]),
    "NativeAuthHandoff": ("NATIVE_OPERATOR", "PRIMARY_ACTION", "native-auth-handoff", "External browser auth handoff capsule.", [ref(NATIVE, "7. Authentication and session strategy", "ASWebAuthenticationSession is explicit.")]),
    "NativeSceneRestoreCapsule": ("NATIVE_OPERATOR", "RECOVERY", "native-scene-restore", "Scene restoration metadata and return-target container.", [ref(NATIVE, "8. Persistence model", "Scene restoration payloads are explicit.")]),
    "QuickLookPreview": ("NATIVE_OPERATOR", "ARTIFACT", "native-quicklook", "Quick Look / preview helper surface.", [ref(NATIVE, "10. Native UX opportunities", "Quick Look is explicit.")]),
}


def build_component_inventory(route_records: list[dict[str, Any]]) -> dict[str, Any]:
    inventory_map: dict[tuple[str, str], dict[str, Any]] = {}
    for route in route_records:
        for component_key in route["components"]:
            surface_family, region_kind, selector_anchor, notes, source_refs = COMPONENT_METADATA[component_key]
            key = (surface_family, component_key)
            if key not in inventory_map:
                inventory_map[key] = {
                    "surface_family": surface_family,
                    "component_key": component_key,
                    "label": component_key,
                    "region_kind": region_kind,
                    "selector_anchor": selector_anchor,
                    "route_or_scene_keys": [],
                    "notes": notes,
                    "source_refs": source_refs,
                }
            inventory_map[key]["route_or_scene_keys"].append(route["route_or_scene_key"])
    inventory = list(inventory_map.values())
    for row in inventory:
        row["route_or_scene_keys"] = unique(sorted(row["route_or_scene_keys"]))
    inventory.sort(key=lambda item: (item["surface_family"], item["component_key"]))
    return {
        "summary": {
            "component_count": len(inventory),
        },
        "components": inventory,
    }


def build_read_model_api_binding(route_records: list[dict[str, Any]]) -> dict[str, Any]:
    bindings = []
    for route in route_records:
        bindings.append(
            {
                "surface_family": route["surface_family"],
                "route_or_scene_key": route["route_or_scene_key"],
                "route_or_scene_kind": route["route_or_scene_kind"],
                "shell_family": route["shell_family"],
                "read_models": route["read_models"],
                "read_surfaces": route["read_surfaces"],
                "command_transport": route["command_transport"],
                "commands": route["commands"],
                "command_semantics": route["command_semantics"],
                "stream_sources": route["stream_sources"],
                "cache_partition_basis": route["cache_partition_basis"],
                "notes": route["notes"],
            }
        )
    return {
        "shared_command_law": {
            "default_command_surface": "POST /v1/commands",
            "durable_receipt_surface": "GET /v1/commands/{command_id}",
            "binary_transfer_exception": "POST /v1/uploads/sessions allocates resumable upload sessions; attachment finalization still returns to POST /v1/commands.",
            "source_refs": [
                ref(NORTHBOUND, "Command surface", "Command and receipt surfaces are explicit."),
                ref(NORTHBOUND, "Binary transfer exception", "The upload-session exception is explicit."),
            ],
        },
        "bindings": bindings,
    }


def build_state_visibility_matrix(route_records: list[dict[str, Any]]) -> dict[str, Any]:
    rows = []
    for route in route_records:
        rows.append(
            {
                "surface_family": route["surface_family"],
                "route_or_scene_key": route["route_or_scene_key"],
                "visibility_lanes": route["visibility_lanes"],
                "settlement_states": route["settlement_states"],
                "recovery_postures": route["recovery_postures"],
                "stale_view_posture": route["stale_view_posture"],
                "focus_return_rule": route["focus_return_rule"],
                "artifact_posture": route["artifact_posture"],
                "step_up_checkpoints": route["step_up_checkpoints"],
                "cache_partition_basis": route["cache_partition_basis"],
                "recovery_and_resume_rules": route["recovery_and_resume_rules"],
                "source_refs": route["source_refs"],
            }
        )
    return {
        "shared_taxonomy": {
            "visibility_families": [
                "CUSTOMER_VISIBLE",
                "INTERNAL_ONLY",
                "MASKED_GOVERNANCE",
                "CUSTOMER_SAFE_PROJECTION",
                "NATIVE_CACHED_NON_AUTHORITATIVE",
            ],
            "settlement_states": SHARED_SETTLEMENT_STATES,
            "recovery_postures": SHARED_RECOVERY_POSTURES,
            "cache_isolation_keys": CACHE_ENVELOPE_KEYS,
            "source_refs": [
                ref(EMPTY_STATE, "Shared shell freshness and recovery vocabulary", "Shared stale/recovery vocabulary is authoritative."),
                ref(CACHE_ISOLATION, "Cache identity envelope", "Cache legality envelope is authoritative."),
            ],
        },
        "rows": rows,
    }


CONTINUITY_SCENARIOS = [
    {
        "scenario_id": "queue_notification_return",
        "title": "Queue notification returns to the same item",
        "trigger": "A notification opens a work item and the operator returns to the inbox.",
        "applies_to": ["COLLABORATION"],
        "preserved": ["queue filters", "row anchor", "detail drawer anchor"],
        "invalidated": ["none if the object remains legal"],
        "focus_return_rule": "Return to the originating work-item row.",
        "source_refs": [
            ref(COLLABORATION, "9. Stream events and notifications", "Notification return targets are explicit."),
            ref(FOCUS_RESTORE, "Return targets", "The narrowest surviving list target is authoritative."),
        ],
    },
    {
        "scenario_id": "inline_rebase",
        "title": "Inline rebase keeps valid content mounted",
        "trigger": "A stale mutation or basis drift is detected while the route remains otherwise legal.",
        "applies_to": ["COLLABORATION", "PORTAL", "GOVERNANCE", "NATIVE_OPERATOR"],
        "preserved": ["mounted content", "dominant question", "selector anchors"],
        "invalidated": ["unsafe mutation affordances"],
        "focus_return_rule": "Return to the invoking action or route-local anchor after the recovery explanation closes.",
        "source_refs": [
            ref(EMPTY_STATE, "Shared shell freshness and recovery vocabulary", "Inline rebase and fail-closed mutation posture are explicit."),
            ref(STREAM_RESUME, "Resume and catch-up ordering", "Rebase-required and access-rebind postures are explicit."),
        ],
    },
    {
        "scenario_id": "portal_upload_resume",
        "title": "Portal upload resumes the same request lane",
        "trigger": "Weak connectivity or cross-device resume occurs mid-upload.",
        "applies_to": ["PORTAL"],
        "preserved": ["request card", "upload session identity", "current next action"],
        "invalidated": ["any stale assumption that transfer success equals acceptance"],
        "focus_return_rule": "Return to the current upload row or the request card upload trigger.",
        "source_refs": [
            ref(PORTAL, "Secure document-upload flow", "Upload request-binding and resumability posture are explicit."),
            ref(PORTAL, "Playwright validation minimum", "Mobile upload reconnect is an explicit scenario."),
        ],
    },
    {
        "scenario_id": "governance_basis_hash_protection",
        "title": "Governance basis-hash protection",
        "trigger": "A commit is attempted after policy, dependency topology, or simulation basis drift.",
        "applies_to": ["GOVERNANCE"],
        "preserved": ["diff view", "selected object", "change basket"],
        "invalidated": ["commit affordance"],
        "focus_return_rule": "Return to the staged diff or simulation result that requires refresh.",
        "source_refs": [
            ref(NORTHBOUND, "Governance stale guards", "Governance basis-hash requirements are explicit."),
            ref(GOVERNANCE, "6. Shared interaction and mutation rules", "Change basket retention is explicit."),
        ],
    },
    {
        "scenario_id": "native_scene_restore",
        "title": "Native scene restore under legality checks",
        "trigger": "The native app relaunches or reopens a serialized scene.",
        "applies_to": ["NATIVE_OPERATOR"],
        "preserved": ["scene identity", "focus target", "selected object"],
        "invalidated": ["the entire restore envelope if tenant, privilege, or masking drifted"],
        "focus_return_rule": "Return to the serialized parent scene anchor when the restore is legal.",
        "source_refs": [
            ref(NATIVE, "8. Persistence model", "Scene restoration payloads are explicit."),
            ref(CACHE_ISOLATION, "Cache identity envelope", "Scene legality is cache-bound."),
        ],
    },
    {
        "scenario_id": "external_handoff_return",
        "title": "External handoff returns to the same shell",
        "trigger": "A browser or authority handoff completes and the user returns to the product.",
        "applies_to": ["PORTAL", "NATIVE_OPERATOR"],
        "preserved": ["parent route or scene", "focus anchor", "dominant task"],
        "invalidated": ["any assumption of completion before the governing read model settles"],
        "focus_return_rule": "Return to the invoking action after fresh settlement confirms completion.",
        "source_refs": [
            ref(PORTAL, "Artifact, print, and browser-handoff rules", "Portal external handoff return law is explicit."),
            ref(NATIVE, "7. Authentication and session strategy", "Native auth handoff is explicit."),
        ],
    },
    {
        "scenario_id": "responsive_support_redock",
        "title": "Responsive support-region redock",
        "trigger": "Viewport width collapses below wide layouts.",
        "applies_to": ["COLLABORATION", "PORTAL", "GOVERNANCE", "NATIVE_OPERATOR"],
        "preserved": ["same object", "same shell", "selected support content"],
        "invalidated": ["none; only the spatial presentation changes"],
        "focus_return_rule": "Return to the same support anchor after the drawer, sidecar, or inspector redocks.",
        "source_refs": [
            ref(FRONTEND_LAW, "3. Layout topology and support-region promotion", "Support redocking remains same-shell."),
            ref(GOVERNANCE, "8. Accessibility and responsive requirements", "Governance sidecar redocking is explicit."),
        ],
    },
    {
        "scenario_id": "reduced_motion_mode",
        "title": "Reduced-motion mode keeps semantic hierarchy",
        "trigger": "The user requests reduced motion or is on a motion-sensitive platform profile.",
        "applies_to": ["COLLABORATION", "PORTAL", "GOVERNANCE", "NATIVE_OPERATOR"],
        "preserved": ["ordering, emphasis, and focus landmarks"],
        "invalidated": ["ornamental transitions"],
        "focus_return_rule": "Focus anchors remain unchanged; only animation posture changes.",
        "source_refs": [
            ref(PORTAL, "Accessibility and interaction rules", "Portal flows must remain operable with reduced motion."),
            ref(FRONTEND_LAW, "Accessibility and motion", "Motion is subordinate to continuity and semantic hierarchy."),
        ],
    },
]


def build_native_topology(route_records: list[dict[str, Any]]) -> dict[str, Any]:
    native_routes = [route for route in route_records if route["surface_family"] == "NATIVE_OPERATOR"]
    primary_scenes = [
        {
            "scene_key": route["route_or_scene_key"],
            "title": route["title"],
            "layout_regions": ["leading sidebar", "primary canvas", "trailing inspector"],
            "focus_rule": route["focus_return_rule"],
            "read_models": route["read_models"],
            "recovery_rules": route["recovery_and_resume_rules"],
            "source_refs": route["source_refs"],
        }
        for route in native_routes
        if route["route_or_scene_key"].startswith("native_primary_")
    ]
    secondary_windows = [
        {
            "scene_key": route["route_or_scene_key"],
            "title": route["title"],
            "window_order": ["IDENTITY_HEADER", "SUMMARY_CARD", "DETAIL_BODY"],
            "parent_bound": True,
            "focus_rule": route["focus_return_rule"],
            "source_refs": route["source_refs"],
        }
        for route in native_routes
        if route["route_or_scene_key"].startswith("native_secondary_")
    ]
    return {
        "xcode_workspace_topology": [
            "Apps/InternalOperatorWorkspaceMac",
            "Packages/OperatorDomain",
            "Packages/OperatorPlatformSDK",
            "Packages/OperatorPersistence",
            "Packages/OperatorUI",
            "Packages/OperatorDesktopKit",
            "Packages/OperatorDiagnostics",
            "Packages/OperatorFeatureFlags",
        ],
        "primary_scenes": primary_scenes,
        "secondary_windows": secondary_windows,
        "auth_handoff": {
            "scene_key": "native_auth_handoff_session",
            "transport": "ASWebAuthenticationSession",
            "resume_rule": "Completion never implies settlement until the governed parent read model refreshes and the return target is still legal.",
            "source_refs": [
                ref(NATIVE, "7. Authentication and session strategy", "Auth strategy is explicit."),
                ref(FRONTEND_LAW, "2. Route continuity and shell stability", "External handoff returns to the same shell."),
            ],
        },
        "command_surfaces": [
            "TOGGLE_SIDEBAR",
            "TOGGLE_INSPECTOR",
            "DETACH_INSPECTOR",
            "FOCUS_SIDEBAR",
            "FOCUS_PRIMARY_CANVAS",
            "FOCUS_INSPECTOR",
            "REFRESH_CURRENT_SCENE",
            "OPEN_COMPARE_WINDOW",
            "OPEN_AUDIT_WINDOW",
            "OPEN_AUTHORITY_REVIEW_WINDOW",
            "COPY_IDENTIFIERS",
        ],
        "persistence": {
            "cached_models": [
                "DecisionBundle",
                "ExperienceDelta",
                "WorkspaceSnapshot",
                "WorkspaceDelta",
                "receipts and resume metadata",
                "pinned evidence",
                "compare selections",
                "recent lists",
            ],
            "purge_triggers": [
                "tenant switch",
                "privilege downgrade",
                "masking drift",
                "cache-envelope incompatibility",
                "remote kill switch",
                "preview subject mismatch",
            ],
            "source_refs": [
                ref(NATIVE, "8. Persistence model", "Persistence and purge rules are explicit."),
                ref(CACHE_ISOLATION, "Cache identity envelope", "The legality envelope is explicit."),
            ],
        },
        "performance_strategy": [
            "snapshot decode on background actors",
            "incremental stream application",
            "virtualization for long evidence or audit lists",
            "lazy preview loading",
        ],
        "translation_notes": [
            "Browser routes become `NavigationSplitView`, `WindowGroup`, and dedicated support windows.",
            "Refresh becomes snapshot hydration plus stream resume/rebase rather than browser reload.",
            "Native support windows remain embodiments of calm-shell support law, not a new shell family.",
        ],
    }


def build_gap_register() -> dict[str, Any]:
    shared_contract_path = PROMPT_DIR / "shared_operating_contract_0014_to_0021.md"
    gaps = [
        {
            "gap_key": "MISSING_SHARED_PROMPT_CONTRACT_0014_TO_0021",
            "severity": "warning",
            "status": "open" if not shared_contract_path.exists() else "closed",
            "summary": "The card references `shared_operating_contract_0014_to_0021.md`, but that file is not present in the prompt directory.",
            "impact": "Implementation had to ground directly in the authoritative `Algorithm/` contracts and adjacent completed cards.",
            "source_refs": [ref("PROMPT/CARDS/pc_0014.md", "Working Notes / Autonomous Coding Prompt", "The missing shared contract path is referenced here.")],
        },
        {
            "gap_key": "PORTAL_READ_PATH_LITERALS_NOT_FULLY_ENUMERATED",
            "severity": "note",
            "status": "open",
            "summary": "The portal contract fully enumerates route semantics and read models, but does not publish every literal northbound path per route.",
            "impact": "The atlas records route-local portal reads as governed projections and calls out the missing literal path enumeration instead of inventing stable URLs.",
            "source_refs": [
                ref(PORTAL, "Read-model and API translation requirements", "Read models are explicit."),
                ref(NORTHBOUND, "Portal read surfaces", "The northbound contract describes portal projections more than literal per-route URLs."),
            ],
        },
        {
            "gap_key": "PORTAL_COMMAND_ENUMS_NORMALIZED_FROM_PROSE",
            "severity": "note",
            "status": "open",
            "summary": "Portal flow documents describe upload, approval, onboarding, and support action families more strongly than a literal complete command enum.",
            "impact": "The atlas uses normalized action-family names where the source is semantic rather than enum-complete, while preserving exact transport law.",
            "source_refs": [
                ref(PORTAL, "Secure document-upload flow / Approval and sign-off flow / Onboarding flow", "Flow semantics are explicit."),
                ref(NORTHBOUND, "Command surface", "Transport law is explicit even where route-local enums are not."),
            ],
        },
        {
            "gap_key": "GOVERNANCE_MUTATION_ENUMS_NORMALIZED_FROM_PROSE",
            "severity": "note",
            "status": "open",
            "summary": "Governance routes define staged mutations, basis hashes, and approval posture explicitly, but not a complete per-route mutation enum.",
            "impact": "The atlas names normalized governance action families while preserving the exact stale-guard and basis-hash contract.",
            "source_refs": [
                ref(GOVERNANCE, "6. Shared interaction and mutation rules", "Mutation semantics are explicit."),
                ref(NORTHBOUND, "Governance stale guards", "Stale-view and basis-hash rules are explicit."),
            ],
        },
        {
            "gap_key": "MANIFEST_FOCUS_ROUTE_NORMALIZED",
            "severity": "note",
            "status": "open",
            "summary": "The collaboration contract explicitly names `/manifests/{manifest_id}?focus=workflow:{item_id}`, but other manifest route literals are distributed across the corpus rather than centralized.",
            "impact": "The atlas keeps the explicit focus-jump form and avoids inventing additional manifest shell families.",
            "source_refs": [
                ref(COLLABORATION, "2. Screen map", "The explicit focus-jump form is named here."),
                ref(FRONTEND_LAW, "2. Route continuity and shell stability", "Focus jumps still obey shell stability law."),
            ],
        },
        {
            "gap_key": "NATIVE_WINDOWS_ARE_ROUTELESS_SUPPORT_OVERLAYS",
            "severity": "note",
            "status": "open",
            "summary": "Detached native support windows are not browser routes and must not be treated as a fourth shell family.",
            "impact": "The atlas models them as scene overlays bound to the parent object, focus target, and preview subject envelope.",
            "source_refs": [
                ref(NATIVE, "5. Preferred window and scene architecture / Secondary windows", "Detached windows are explicit."),
                ref(FRONTEND_LAW, "1. Shell families and object ownership", "Native is an embodiment, not a new shell family."),
            ],
        },
    ]
    return {
        "summary": {
            "gap_count": len(gaps),
            "open_count": sum(1 for gap in gaps if gap["status"] == "open"),
        },
        "gaps": gaps,
    }


def build_summary(
    route_records: list[dict[str, Any]],
    selector_registry: dict[str, Any],
    component_inventory: dict[str, Any],
    gap_register: dict[str, Any],
) -> dict[str, Any]:
    by_family = Counter(route["surface_family"] for route in route_records)
    return {
        "surface_family_count": len(SURFACE_FAMILIES),
        "route_scene_count": len(route_records),
        "selector_count": selector_registry["summary"]["selector_count"],
        "component_count": component_inventory["summary"]["component_count"],
        "gap_count": gap_register["summary"]["gap_count"],
        "routes_by_family": dict(by_family),
    }


def build_atlas_data(
    summary: dict[str, Any],
    route_records: list[dict[str, Any]],
    selector_registry: dict[str, Any],
    component_inventory: dict[str, Any],
    read_model_bindings: dict[str, Any],
    state_matrix: dict[str, Any],
    native_topology: dict[str, Any],
    gap_register: dict[str, Any],
) -> dict[str, Any]:
    page_route_defaults = {}
    for page in ATLAS_PAGES:
        if page["page_id"] in {"overview", "continuity"}:
            continue
        page_route_defaults[page["page_id"]] = next(
            route["route_or_scene_key"]
            for route in route_records
            if route["surface_family"] == next(
                family["surface_family"] for family in SURFACE_FAMILIES if family["page_id"] == page["page_id"]
            )
        )
    return {
        "summary": summary,
        "pages": ATLAS_PAGES,
        "surface_families": SURFACE_FAMILIES,
        "shared_laws": SHARED_LAWS,
        "visual_research": VISUAL_RESEARCH,
        "route_records": route_records,
        "selector_profiles": selector_registry["profiles"],
        "selectors": selector_registry["selectors"],
        "component_inventory": component_inventory["components"],
        "read_model_bindings": read_model_bindings["bindings"],
        "state_matrix": state_matrix["rows"],
        "state_taxonomy": state_matrix["shared_taxonomy"],
        "native_topology": native_topology,
        "gap_register": gap_register["gaps"],
        "continuity_scenarios": CONTINUITY_SCENARIOS,
        "page_route_defaults": page_route_defaults,
        "default_record": "collaboration_staff_inbox",
        "default_scenario": "inline_rebase",
    }


def build_information_architecture_mermaid(route_records: list[dict[str, Any]]) -> str:
    families = defaultdict(list)
    for route in route_records:
        families[route["surface_family"]].append(route)
    lines = ["flowchart LR", '  law["Shared shell, continuity, selector, and recovery law"]']
    order = ["COLLABORATION", "PORTAL", "GOVERNANCE", "NATIVE_OPERATOR"]
    for family in order:
        lines.append(f"  subgraph {family}")
        for route in families[family]:
            node_id = route["route_or_scene_key"].upper()
            lines.append(f'    {node_id}["{route["title"]}\\n{route["route_pattern"]}"]')
        lines.append("  end")
        for route in families[family]:
            node_id = route["route_or_scene_key"].upper()
            lines.append(f"  law --> {node_id}")
    return "\n".join(lines)


def build_native_topology_mermaid(native_topology: dict[str, Any]) -> str:
    lines = [
        "flowchart LR",
        '  PRIMARY["Primary scene\\nNavigationSplitView"]',
        '  SIDEBAR["Leading sidebar"]',
        '  CANVAS["Primary canvas"]',
        '  INSPECTOR["Trailing inspector"]',
        '  AUTH["ASWebAuthenticationSession\\nexternal handoff"]',
        '  CACHE["Cache isolation envelope\\nscene identity + preview subject"]',
        '  SECONDARY["Parent-bound secondary windows"]',
        '  COMPARE["Compare window"]',
        '  AUDIT["Audit window"]',
        '  PACKET["Filing packet window"]',
        '  AUTHORITY["Authority review window"]',
        '  PRIMARY --> SIDEBAR',
        '  PRIMARY --> CANVAS',
        '  PRIMARY --> INSPECTOR',
        '  PRIMARY --> SECONDARY',
        '  PRIMARY --> AUTH',
        '  PRIMARY --> CACHE',
        '  SECONDARY --> COMPARE',
        '  SECONDARY --> AUDIT',
        '  SECONDARY --> PACKET',
        '  SECONDARY --> AUTHORITY',
    ]
    return "\n".join(lines)


def write_multisurface_pack(
    summary: dict[str, Any],
    route_records: list[dict[str, Any]],
    gap_register: dict[str, Any],
) -> None:
    law_rows = [
        [law["law_key"], law["statement"], summarize_refs(law["source_refs"])]
        for law in SHARED_LAWS
    ]
    gap_rows = [
        [gap["gap_key"], gap["severity"], gap["status"], gap["summary"]]
        for gap in gap_register["gaps"]
    ]
    sections: list[str] = [
        "# 14 Multisurface Requirements Pack",
        "",
        "This pack consolidates the authoritative surface law for Taxat across collaboration, portal, governance, and native operator embodiments.",
        "It is intentionally route- and scene-specific so later frontend, backend, native, and QA work can bind to one stable semantic atlas.",
        "",
        "## Summary",
        "",
        f"- Surface families: `{summary['surface_family_count']}`",
        f"- Route or scene records: `{summary['route_scene_count']}`",
        f"- Selector anchors: `{summary['selector_count']}`",
        f"- Component inventory rows: `{summary['component_count']}`",
        f"- Opened or carried-forward gaps: `{gap_register['summary']['gap_count']}`",
        "",
        "## Laws That Never Change",
        "",
        markdown_table(["Law", "Meaning", "Source grounding"], law_rows),
        "",
    ]
    for family in SURFACE_FAMILIES:
        family_routes = [route for route in route_records if route["surface_family"] == family["surface_family"]]
        rows = [
            [
                route["title"],
                route["route_pattern"],
                route["shell_family"],
                route["actor_profile"],
                route["dominant_question"],
                route["promoted_support_region"],
                route["selector_profile"],
            ]
            for route in family_routes
        ]
        sections.extend(
            [
                f"## {family['label']}",
                "",
                f"- Surface family: `{family['surface_family']}`",
                f"- Shell families: {', '.join(f'`{value}`' for value in family['shell_families'])}",
                f"- Route/scene count: `{len(family_routes)}`",
                f"- Interaction signature: {family['interaction_signature']}",
                f"- Support-region law: {family['promoted_support_region_law']}",
                "",
                markdown_table(
                    ["Route / Scene", "Pattern", "Shell", "Actors", "Dominant question", "Promoted support", "Selector profile"],
                    rows,
                ),
                "",
            ]
        )
    sections.extend(
        [
            "## Explicit Gaps And Normalizations",
            "",
            markdown_table(["Gap", "Severity", "Status", "Summary"], gap_rows),
        ]
    )
    write_text(MULTISURFACE_PACK_PATH, "\n".join(sections))


def write_uiux_spec(summary: dict[str, Any]) -> None:
    research_rows = [
        [
            item["title"],
            f"[link]({item['url']})",
            item["retrieved_date"],
            item["takeaway"],
        ]
        for item in VISUAL_RESEARCH
    ]
    family_rows = [
        [
            family["label"],
            family["thesis"],
            family["interaction_signature"],
            family["promoted_support_region_law"],
        ]
        for family in SURFACE_FAMILIES
    ]
    lines = [
        "# 14 Surface UIUX And Interaction Spec",
        "",
        "The atlas visual direction is intentionally premium, quiet, and operational rather than dashboard-generic.",
        "The semantic truth still comes only from the Taxat algorithm corpus. Current web research was used only to tune the visual restraint and composition of the browser-viewable atlas.",
        "",
        "## Visual Thesis",
        "",
        "- Mood: calm mission-control field guide with low-noise chrome and evidence-first hierarchy.",
        "- Material: dark structured planes, soft borders, tight typographic rhythm, and one family accent per surface.",
        "- Motion: causal fades and short vertical lifts only; no ornamental animation survives reduced-motion mode.",
        "",
        "## Current Visual Research Inputs",
        "",
        markdown_table(["Reference", "Source", "Retrieved", "Design takeaway"], research_rows),
        "",
        "## Token Direction",
        "",
        "- Background: `#090C11`",
        "- Surface ladder: `#10151D`, `#171E28`, `#1D2531`",
        "- Border: `rgba(255,255,255,0.08)`",
        "- Primary text: `#F5F7FB`",
        "- Secondary text: `#9AA5B3`",
        "- Collaboration accent: `#76A9FF`",
        "- Portal accent: `#99D2FF`",
        "- Governance accent: `#E7C37A`",
        "- Native accent: `#7FE0C8`",
        "- Success / warning / danger: `#78D7A6`, `#F2C66D`, `#FF8E80`",
        "",
        "## Spatial System",
        "",
        "- Desktop grid: `12` columns, `max-width: 1520px`",
        "- Page padding: `32px` desktop, `24px` tablet, `16px` mobile",
        "- Sticky left rail: `280px`",
        "- Sticky evidence inspector: `360px`",
        "- Collapse inspector below `1180px`; stack all sections below `820px`",
        "- Outer radius: `22px`",
        "- Panel radius: `18px`",
        "- Inset card radius: `14px`",
        "",
        "## Family-Specific Composition",
        "",
        markdown_table(["Family", "Visual responsibility", "Interaction signature", "Support-region law"], family_rows),
        "",
        "## Atlas Page Composition",
        "",
        "1. `Overview` uses a hero thesis, a four-bar monochrome glyph, a `2x2` family matrix, and a right-column law stack.",
        "2. `Collaboration` foregrounds queue/workspace/request continuity, internal-vs-customer lanes, and current-vs-history artifact posture.",
        "3. `Portal` stays mobile-first with one task column, an upload-state ribbon, approvals digest, and subordinate help continuity.",
        "4. `Governance` uses denser side-by-side inventory, basket, approval, and audit framing without inheriting calm-shell aesthetics.",
        "5. `Native` shows the split-view primary scene, detached support windows, command surfaces, auth handoff, and restore envelope.",
        "6. `Continuity & Recovery` surfaces route restoration, focus return, state taxonomy, and stream resume ordering across all families.",
        "",
        "## Atlas Harness Expectations",
        "",
        f"- The atlas renders `{summary['route_scene_count']}` route or scene records from one generated data source.",
        "- Semantic selector chips are visible for every selector profile rendered by the harness.",
        "- Reduced-motion mode changes only animation posture; it does not change ordering, selector anchors, or focus return law.",
    ]
    write_text(UIUX_SPEC_PATH, "\n".join(lines))


def write_read_model_binding_doc(read_model_bindings: dict[str, Any]) -> None:
    rows = [
        [
            row["route_or_scene_key"],
            row["shell_family"],
            ", ".join(row["read_models"]),
            "<br>".join(row["read_surfaces"]),
            "<br>".join(row["commands"]) if row["commands"] else "n/a",
            row["command_semantics"],
            "<br>".join(row["stream_sources"]),
        ]
        for row in read_model_bindings["bindings"]
    ]
    lines = [
        "# 14 Cross-Surface Read Models Commands And Streams",
        "",
        "This matrix binds every route or scene to its governing read models, northbound read surfaces, command transport, and live-update dependencies.",
        "It preserves the distinction between exact published command enums and normalized action families inferred from route prose.",
        "",
        "## Shared Command Law",
        "",
        f"- Default command surface: `{read_model_bindings['shared_command_law']['default_command_surface']}`",
        f"- Durable receipt surface: `{read_model_bindings['shared_command_law']['durable_receipt_surface']}`",
        f"- Binary transfer exception: {read_model_bindings['shared_command_law']['binary_transfer_exception']}",
        "",
        "## Route / Scene Binding Matrix",
        "",
        markdown_table(
            ["Route / Scene", "Shell", "Read models", "Read surfaces", "Commands", "Command semantics", "Streams / live updates"],
            rows,
        ),
    ]
    write_text(READ_MODEL_BINDING_PATH, "\n".join(lines))


def write_native_scene_spec(native_topology: dict[str, Any]) -> None:
    primary_rows = [
        [
            row["title"],
            " -> ".join(row["layout_regions"]),
            ", ".join(row["read_models"]),
            "<br>".join(row["recovery_rules"]),
        ]
        for row in native_topology["primary_scenes"]
    ]
    secondary_rows = [
        [
            row["title"],
            " -> ".join(row["window_order"]),
            "yes" if row["parent_bound"] else "no",
            row["focus_rule"],
        ]
        for row in native_topology["secondary_windows"]
    ]
    lines = [
        "# 14 Native Scene And Restoration Spec",
        "",
        "The native operator workspace is a server-authoritative macOS embodiment of existing shell law.",
        "It adds multi-window depth, keyboard command surfaces, scene restoration, and cache-backed resume while staying subordinate to northbound truth.",
        "",
        "## Workspace Topology",
        "",
        f"- Xcode workspace: {', '.join(f'`{item}`' for item in native_topology['xcode_workspace_topology'])}",
        "",
        "## Primary Scenes",
        "",
        markdown_table(["Scene", "Layout regions", "Read models", "Recovery and restore rules"], primary_rows),
        "",
        "## Secondary Windows",
        "",
        markdown_table(["Window", "Window order", "Parent-bound", "Focus return"], secondary_rows),
        "",
        "## Command Surfaces",
        "",
        f"- {', '.join(f'`{item}`' for item in native_topology['command_surfaces'])}",
        "",
        "## Auth Handoff",
        "",
        f"- Transport: `{native_topology['auth_handoff']['transport']}`",
        f"- Resume rule: {native_topology['auth_handoff']['resume_rule']}",
        "",
        "## Persistence And Purge",
        "",
        f"- Cached models: {', '.join(f'`{item}`' for item in native_topology['persistence']['cached_models'])}",
        f"- Purge triggers: {', '.join(f'`{item}`' for item in native_topology['persistence']['purge_triggers'])}",
        "",
        "## Browser-To-Native Translation Notes",
        "",
        f"- {' '.join(native_topology['translation_notes'])}",
    ]
    write_text(NATIVE_SCENE_SPEC_PATH, "\n".join(lines))


def write_index_html() -> None:
    write_text(
        ATLAS_INDEX_PATH,
        normalize_markdown(
            """
            <!doctype html>
            <html lang="en">
              <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>Surface Requirements Atlas</title>
                <link rel="stylesheet" href="./styles.css" />
              </head>
              <body>
                <div id="app" data-testid="surface-requirements-atlas"></div>
                <script type="module" src="./app.js"></script>
              </body>
            </html>
            """
        ),
    )


def write_styles_css() -> None:
    write_text(
        ATLAS_STYLES_PATH,
        normalize_markdown(
            """
            :root {
              --bg: #090c11;
              --surface-1: #10151d;
              --surface-2: #171e28;
              --surface-3: #1d2531;
              --border: rgba(255, 255, 255, 0.08);
              --text-strong: #f5f7fb;
              --text-mid: #9aa5b3;
              --text-weak: #6f7b8a;
              --success: #78d7a6;
              --warning: #f2c66d;
              --danger: #ff8e80;
              --radius-outer: 22px;
              --radius-panel: 18px;
              --radius-card: 14px;
              --shadow: 0 24px 80px rgba(0, 0, 0, 0.32);
              color-scheme: dark;
              font-family: "Inter", "Inter Variable", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              min-height: 100%;
              background:
                radial-gradient(circle at top left, rgba(118, 169, 255, 0.12), transparent 28%),
                radial-gradient(circle at top right, rgba(231, 195, 122, 0.08), transparent 25%),
                var(--bg);
              color: var(--text-strong);
            }

            body {
              padding: 32px;
            }

            button,
            input,
            textarea,
            select {
              font: inherit;
            }

            a {
              color: inherit;
            }

            .atlas-shell {
              max-width: 1520px;
              margin: 0 auto;
              display: grid;
              grid-template-columns: 280px minmax(0, 1fr) 360px;
              gap: 24px;
              align-items: start;
            }

            .rail,
            .stage,
            .inspector {
              min-width: 0;
            }

            .rail {
              position: sticky;
              top: 32px;
            }

            .inspector {
              position: sticky;
              top: 32px;
            }

            .panel {
              background: rgba(16, 21, 29, 0.88);
              border: 1px solid var(--border);
              border-radius: var(--radius-outer);
              box-shadow: var(--shadow);
              backdrop-filter: blur(14px);
            }

            .rail-panel,
            .stage-panel,
            .inspector-panel {
              padding: 24px;
            }

            .stage {
              display: grid;
              gap: 20px;
            }

            .eyebrow {
              margin: 0 0 10px;
              color: var(--text-mid);
              font-size: 12px;
              line-height: 16px;
              font-weight: 700;
              letter-spacing: 0.04em;
              text-transform: uppercase;
            }

            .hero-title {
              margin: 0;
              font-size: clamp(32px, 4vw, 40px);
              line-height: 1.1;
              font-weight: 650;
            }

            .hero-subtitle,
            .copy,
            .metric-note,
            .route-note,
            .list-note {
              margin: 0;
              color: var(--text-mid);
              font-size: 15px;
              line-height: 24px;
              font-weight: 450;
            }

            .stack {
              display: grid;
              gap: 16px;
            }

            .page-nav {
              display: grid;
              gap: 8px;
              margin-top: 24px;
            }

            .page-tab {
              border: 1px solid transparent;
              border-radius: 999px;
              padding: 12px 14px;
              text-align: left;
              background: transparent;
              color: var(--text-mid);
              cursor: pointer;
              transition: border-color 160ms ease, background 160ms ease, color 160ms ease, transform 160ms ease;
            }

            .page-tab:hover,
            .page-tab:focus-visible {
              border-color: rgba(255, 255, 255, 0.14);
              background: rgba(255, 255, 255, 0.04);
              color: var(--text-strong);
              outline: none;
            }

            .page-tab[aria-selected="true"] {
              border-color: var(--accent, rgba(255, 255, 255, 0.18));
              background: color-mix(in srgb, var(--accent, #76a9ff) 16%, transparent);
              color: var(--text-strong);
            }

            .mono {
              font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
              font-size: 12px;
              line-height: 18px;
            }

            .summary-grid,
            .family-grid,
            .route-grid,
            .component-grid,
            .scenario-grid,
            .native-grid,
            .governance-grid {
              display: grid;
              gap: 16px;
            }

            .summary-grid {
              grid-template-columns: repeat(4, minmax(0, 1fr));
            }

            .family-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .route-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .component-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .scenario-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .native-grid,
            .governance-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .card,
            .route-card,
            .selector-card,
            .scenario-card {
              border-radius: var(--radius-panel);
              border: 1px solid var(--border);
              background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
              padding: 20px;
              min-height: 64px;
            }

            .route-card {
              width: 100%;
              text-align: left;
              cursor: pointer;
              color: inherit;
              transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
            }

            .route-card:hover,
            .route-card:focus-visible {
              transform: translateY(-2px);
              border-color: color-mix(in srgb, var(--accent, #76a9ff) 45%, white 10%);
              outline: none;
            }

            .route-card[data-active="true"] {
              border-color: color-mix(in srgb, var(--accent, #76a9ff) 70%, white 10%);
              background: linear-gradient(180deg, color-mix(in srgb, var(--accent, #76a9ff) 12%, transparent), rgba(255, 255, 255, 0.02));
            }

            .kpi-value {
              margin: 10px 0 0;
              font-size: 28px;
              line-height: 30px;
              font-weight: 650;
            }

            .section-title,
            .card-title {
              margin: 0;
              font-size: 24px;
              line-height: 30px;
              font-weight: 600;
            }

            .card-title {
              font-size: 18px;
              line-height: 24px;
            }

            .chip-row {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              margin-top: 14px;
            }

            .chip {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              min-height: 28px;
              border-radius: 999px;
              padding: 0 12px;
              background: rgba(255, 255, 255, 0.06);
              border: 1px solid rgba(255, 255, 255, 0.08);
              color: var(--text-mid);
              font-size: 12px;
              line-height: 16px;
              font-weight: 600;
              letter-spacing: 0.04em;
              text-transform: uppercase;
            }

            .chip-accent {
              background: color-mix(in srgb, var(--accent, #76a9ff) 18%, transparent);
              color: var(--text-strong);
            }

            .chip-success {
              background: rgba(120, 215, 166, 0.14);
              color: var(--success);
            }

            .chip-warning {
              background: rgba(242, 198, 109, 0.14);
              color: var(--warning);
            }

            .chip-danger {
              background: rgba(255, 142, 128, 0.14);
              color: var(--danger);
            }

            .overview-hero {
              display: grid;
              grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
              gap: 20px;
              align-items: stretch;
            }

            .hero-glyph {
              display: grid;
              gap: 10px;
              align-content: center;
              padding: 24px;
              border-radius: var(--radius-panel);
              border: 1px solid var(--border);
              background: linear-gradient(160deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01));
            }

            .hero-bar {
              height: 26px;
              border-radius: 999px;
              background: rgba(255, 255, 255, 0.08);
            }

            .hero-bar:nth-child(1) { width: 58%; }
            .hero-bar:nth-child(2) { width: 72%; }
            .hero-bar:nth-child(3) { width: 48%; }
            .hero-bar:nth-child(4) { width: 64%; background: color-mix(in srgb, var(--accent, #76a9ff) 70%, white 10%); }

            .law-list,
            .detail-list {
              margin: 0;
              padding-left: 18px;
              color: var(--text-mid);
              font-size: 14px;
              line-height: 22px;
            }

            .rail-meta {
              display: grid;
              gap: 8px;
              margin-top: 18px;
            }

            .inspector-meta {
              display: grid;
              gap: 12px;
            }

            .meta-block {
              border-top: 1px solid rgba(255, 255, 255, 0.08);
              padding-top: 12px;
            }

            .meta-label {
              margin: 0 0 6px;
              color: var(--text-weak);
              font-size: 12px;
              line-height: 16px;
              font-weight: 700;
              letter-spacing: 0.04em;
              text-transform: uppercase;
            }

            .meta-value {
              margin: 0;
              color: var(--text-mid);
              font-size: 14px;
              line-height: 22px;
            }

            .family-card,
            .component-card {
              display: grid;
              gap: 12px;
            }

            .lane-map,
            .portal-frame,
            .timeline-panel,
            .native-topology {
              display: grid;
              gap: 14px;
            }

            .lane-columns {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 16px;
            }

            .lane-column,
            .mini-stack,
            .native-window-card,
            .governance-stack {
              padding: 18px;
              border-radius: var(--radius-card);
              border: 1px solid var(--border);
              background: rgba(255, 255, 255, 0.02);
            }

            .portal-ribbon {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
            }

            .timeline-line {
              display: grid;
              gap: 10px;
              border-left: 1px solid rgba(255, 255, 255, 0.12);
              padding-left: 18px;
            }

            .support-demo {
              display: grid;
              gap: 16px;
            }

            .support-shell {
              display: grid;
              grid-template-columns: minmax(0, 1fr) 320px;
              gap: 16px;
            }

            .support-drawer {
              border-radius: var(--radius-panel);
              border: 1px solid color-mix(in srgb, var(--accent, #76a9ff) 40%, white 8%);
              background: color-mix(in srgb, var(--accent, #76a9ff) 10%, rgba(255, 255, 255, 0.02));
              padding: 18px;
            }

            .button-row {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
            }

            .button {
              border: 1px solid rgba(255, 255, 255, 0.12);
              border-radius: 999px;
              background: transparent;
              color: var(--text-strong);
              padding: 10px 14px;
              cursor: pointer;
              transition: background 160ms ease, border-color 160ms ease;
            }

            .button:hover,
            .button:focus-visible {
              background: rgba(255, 255, 255, 0.05);
              border-color: rgba(255, 255, 255, 0.22);
              outline: none;
            }

            .button-accent {
              background: color-mix(in srgb, var(--accent, #76a9ff) 22%, transparent);
              border-color: color-mix(in srgb, var(--accent, #76a9ff) 60%, white 6%);
            }

            .inspector-close {
              width: 100%;
              margin-top: 12px;
            }

            .stage-header {
              display: grid;
              gap: 12px;
            }

            .route-header {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              align-items: start;
            }

            .selector-grid {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              margin-top: 12px;
            }

            .selector-pill {
              border-radius: 999px;
              padding: 8px 10px;
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.08);
              color: var(--text-mid);
              font-size: 12px;
              line-height: 16px;
              font-weight: 600;
            }

            .list-grid {
              display: grid;
              gap: 10px;
            }

            .metric-line {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              color: var(--text-mid);
              font-size: 14px;
              line-height: 22px;
            }

            .metric-line strong {
              color: var(--text-strong);
              font-weight: 600;
            }

            [data-motion="reduce"] * {
              transition-duration: 0ms !important;
              animation-duration: 0ms !important;
              scroll-behavior: auto !important;
            }

            @media (max-width: 1180px) {
              body {
                padding: 24px;
              }

              .atlas-shell {
                grid-template-columns: 280px minmax(0, 1fr);
              }

              .inspector {
                position: static;
                grid-column: 2;
              }

              .summary-grid,
              .family-grid,
              .route-grid,
              .component-grid,
              .scenario-grid,
              .native-grid,
              .governance-grid,
              .overview-hero,
              .support-shell {
                grid-template-columns: 1fr;
              }
            }

            @media (max-width: 820px) {
              body {
                padding: 16px;
              }

              .atlas-shell {
                grid-template-columns: 1fr;
              }

              .rail,
              .inspector {
                position: static;
                top: auto;
              }

              .inspector {
                grid-column: auto;
              }

              .lane-columns {
                grid-template-columns: 1fr;
              }
            }
            """
        ),
    )


def write_app_js() -> None:
    write_text(
        ATLAS_APP_PATH,
        normalize_markdown(
            """
            const root = document.getElementById("app");

            const state = {
              pageId: "overview",
              recordKey: "collaboration_staff_inbox",
              scenarioId: "inline_rebase",
              supportOpen: false,
            };

            let atlasData = null;
            let restoreFocusId = null;

            function parseHash() {
              const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
              return {
                pageId: params.get("page") || "overview",
                recordKey: params.get("record") || null,
                scenarioId: params.get("scenario") || "inline_rebase",
              };
            }

            function setMotionMode() {
              const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
              document.documentElement.dataset.motion = reduced ? "reduce" : "standard";
            }

            function getPage(pageId) {
              return atlasData.pages.find((page) => page.page_id === pageId) || atlasData.pages[0];
            }

            function getFamilyByPage(pageId) {
              return atlasData.surface_families.find((family) => family.page_id === pageId) || null;
            }

            function getRoutesForPage(pageId) {
              const family = getFamilyByPage(pageId);
              if (!family) return [];
              return atlasData.route_records.filter((route) => route.surface_family === family.surface_family);
            }

            function getRecord(recordKey) {
              return atlasData.route_records.find((route) => route.route_or_scene_key === recordKey) || atlasData.route_records[0];
            }

            function getScenario(scenarioId) {
              return atlasData.continuity_scenarios.find((scenario) => scenario.scenario_id === scenarioId) || atlasData.continuity_scenarios[0];
            }

            function defaultRecordForPage(pageId) {
              return atlasData.page_route_defaults[pageId] || atlasData.default_record;
            }

            function syncStateFromHash(replace = false) {
              const next = parseHash();
              const page = getPage(next.pageId);
              state.pageId = page.page_id;
              const pageRoutes = getRoutesForPage(state.pageId);
              const recordExists = atlasData.route_records.some((route) => route.route_or_scene_key === next.recordKey);
              state.recordKey = recordExists ? next.recordKey : (pageRoutes[0]?.route_or_scene_key || atlasData.default_record);
              const scenarioExists = atlasData.continuity_scenarios.some((scenario) => scenario.scenario_id === next.scenarioId);
              state.scenarioId = scenarioExists ? next.scenarioId : atlasData.default_scenario;
              if (replace && !window.location.hash) {
                updateHash({ pageId: state.pageId, recordKey: state.recordKey, scenarioId: state.scenarioId }, true);
                return;
              }
              render();
            }

            function updateHash(nextState, replace = false) {
              const params = new URLSearchParams();
              params.set("page", nextState.pageId);
              if (nextState.recordKey) params.set("record", nextState.recordKey);
              if (nextState.pageId === "continuity") params.set("scenario", nextState.scenarioId);
              const nextHash = `#${params.toString()}`;
              if (replace) {
                window.history.replaceState({}, "", nextHash);
                syncStateFromHash(false);
              } else {
                window.location.hash = nextHash;
              }
            }

            function escapeHtml(value) {
              return String(value)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
            }

            function chips(values, klass = "") {
              return values
                .map((value) => `<span class="chip ${klass}".trim()>${escapeHtml(value)}</span>`)
                .join("");
            }

            function sourceRefList(sourceRefs) {
              return sourceRefs
                .map((sourceRef) => `
                  <li class="list-note">
                    <span class="mono">${escapeHtml(sourceRef.source_file)}</span><br />
                    ${escapeHtml(sourceRef.source_heading_or_logical_block)}
                  </li>
                `)
                .join("");
            }

            function metricLines(items) {
              return items
                .map(([label, value]) => `
                  <div class="metric-line">
                    <span>${escapeHtml(label)}</span>
                    <strong>${escapeHtml(value)}</strong>
                  </div>
                `)
                .join("");
            }

            function lawCard(law) {
              return `
                <article class="card">
                  <p class="eyebrow">${escapeHtml(law.law_key)}</p>
                  <p class="copy">${escapeHtml(law.statement)}</p>
                </article>
              `;
            }

            function familyCard(family) {
              const routeCount = atlasData.summary.routes_by_family[family.surface_family] || 0;
              return `
                <article class="family-card card" style="--accent:${family.accent}">
                  <p class="eyebrow">${escapeHtml(family.surface_family)}</p>
                  <h3 class="card-title">${escapeHtml(family.label)}</h3>
                  <p class="copy">${escapeHtml(family.thesis)}</p>
                  <div class="chip-row">
                    <span class="chip chip-accent">${routeCount} routes</span>
                    <span class="chip">${escapeHtml(family.shell_families.join(" / "))}</span>
                  </div>
                  <p class="route-note">${escapeHtml(family.interaction_signature)}</p>
                </article>
              `;
            }

            function routeCard(route) {
              return `
                <button
                  type="button"
                  class="route-card"
                  data-action="select-record"
                  data-record-key="${escapeHtml(route.route_or_scene_key)}"
                  data-active="${String(route.route_or_scene_key === state.recordKey)}"
                  data-focus-id="${escapeHtml(route.route_or_scene_key)}"
                  data-testid="route-card-${escapeHtml(route.route_or_scene_key)}"
                  style="--accent:${escapeHtml(getAccent(route.surface_family))}"
                >
                  <div class="route-header">
                    <div>
                      <p class="eyebrow">${escapeHtml(route.route_or_scene_kind)}</p>
                      <h3 class="card-title">${escapeHtml(route.title)}</h3>
                    </div>
                    <span class="chip chip-accent">${escapeHtml(route.shell_family)}</span>
                  </div>
                  <p class="copy mono">${escapeHtml(route.route_pattern)}</p>
                  <p class="route-note">${escapeHtml(route.dominant_question)}</p>
                  <div class="chip-row">
                    <span class="chip">${escapeHtml(route.selector_profile)}</span>
                    <span class="chip">${escapeHtml(route.promoted_support_region)}</span>
                  </div>
                </button>
              `;
            }

            function selectorChips(record) {
              const selectorRows = atlasData.selectors.filter((selector) => selector.selector_profile === record.selector_profile);
              return selectorRows
                .map((selector) => `
                  <span
                    class="selector-pill mono"
                    data-testid="selector-chip-${escapeHtml(selector.selector_id)}"
                  >
                    ${escapeHtml(selector.selector_id)}
                  </span>
                `)
                .join("");
            }

            function componentCards(record) {
              const components = atlasData.component_inventory.filter((component) =>
                component.route_or_scene_keys.includes(record.route_or_scene_key)
              );
              return components
                .map((component) => `
                  <article class="component-card card">
                    <p class="eyebrow">${escapeHtml(component.region_kind)}</p>
                    <h3 class="card-title">${escapeHtml(component.label)}</h3>
                    <p class="copy">${escapeHtml(component.notes)}</p>
                    <div class="chip-row">
                      <span class="chip mono">${escapeHtml(component.selector_anchor)}</span>
                    </div>
                  </article>
                `)
                .join("");
            }

            function renderOverview() {
              return `
                <section class="stage-panel panel">
                  <div class="overview-hero">
                    <div class="stack">
                      <div class="stage-header">
                        <p class="eyebrow">Overview</p>
                        <h1 class="hero-title">Surface Requirements Atlas</h1>
                        <p class="hero-subtitle">One coherent product architecture across collaboration, portal, governance, and native operator embodiments.</p>
                      </div>
                      <div class="summary-grid">
                        <article class="card" data-testid="summary-surface-families">
                          <p class="eyebrow">Families</p>
                          <p class="kpi-value">${atlasData.summary.surface_family_count}</p>
                        </article>
                        <article class="card" data-testid="summary-route-scenes">
                          <p class="eyebrow">Routes / scenes</p>
                          <p class="kpi-value">${atlasData.summary.route_scene_count}</p>
                        </article>
                        <article class="card" data-testid="summary-selectors">
                          <p class="eyebrow">Selectors</p>
                          <p class="kpi-value">${atlasData.summary.selector_count}</p>
                        </article>
                        <article class="card" data-testid="summary-components">
                          <p class="eyebrow">Components</p>
                          <p class="kpi-value">${atlasData.summary.component_count}</p>
                        </article>
                      </div>
                    </div>
                    <div class="hero-glyph" aria-hidden="true" data-testid="overview-glyph">
                      <div class="hero-bar"></div>
                      <div class="hero-bar"></div>
                      <div class="hero-bar"></div>
                      <div class="hero-bar"></div>
                    </div>
                  </div>
                </section>

                <section class="stage-panel panel">
                  <div class="family-grid">
                    ${atlasData.surface_families.map((family) => familyCard(family)).join("")}
                  </div>
                </section>

                <section class="stage-panel panel">
                  <div class="route-header">
                    <div>
                      <p class="eyebrow">Laws that never change</p>
                      <h2 class="section-title">Cross-surface invariants</h2>
                    </div>
                    <span class="chip chip-warning">${atlasData.gap_register.length} explicit gaps / normalizations</span>
                  </div>
                  <div class="family-grid">
                    ${atlasData.shared_laws.map((law) => lawCard(law)).join("")}
                  </div>
                </section>
              `;
            }

            function renderCollaborationPage(record) {
              return `
                <section class="stage-panel panel" style="--accent:#76A9FF">
                  <div class="stage-header">
                    <p class="eyebrow">Collaboration</p>
                    <h1 class="hero-title">Shared work object, split visibility</h1>
                    <p class="hero-subtitle">Staff calm-shell workspaces and customer-safe request routes sit over the same workflow truth, but never cross visibility lanes.</p>
                  </div>
                  <div class="lane-map" data-testid="collaboration-lane-map">
                    <div class="lane-columns">
                      <div class="lane-column">
                        <p class="eyebrow">Lane A</p>
                        <h3 class="card-title">CUSTOMER_VISIBLE</h3>
                        <p class="copy">Customer threads, safe attachments, request replies, and role-filtered status live here. Concurrency is visibility-scoped.</p>
                      </div>
                      <div class="lane-column">
                        <p class="eyebrow">Lane B</p>
                        <h3 class="card-title">INTERNAL_ONLY</h3>
                        <p class="copy">Staff notes, hidden attachments, triage facts, and restricted audit context never bleed into portal-visible surfaces.</p>
                      </div>
                    </div>
                    <div class="chip-row">
                      <span class="chip chip-accent">Assignment and escalation stay inline</span>
                      <span class="chip">Current vs history artifact posture stays explicit</span>
                      <span class="chip">Rebase preserves the same work item shell</span>
                    </div>
                  </div>
                </section>

                <section class="stage-panel panel">
                  <div class="route-header">
                    <div>
                      <p class="eyebrow">Storyboard</p>
                      <h2 class="section-title">Inbox, workspace, request list, request detail</h2>
                    </div>
                    <span class="chip chip-accent">${record.selector_profile}</span>
                  </div>
                  <div class="route-grid">
                    ${getRoutesForPage("collaboration").map((route) => routeCard(route)).join("")}
                  </div>
                </section>

                <section class="stage-panel panel">
                  <div class="route-header">
                    <div>
                      <p class="eyebrow">Selector profile</p>
                      <h2 class="section-title">Current route anchors</h2>
                    </div>
                    <span class="chip">${record.route_or_scene_key}</span>
                  </div>
                  <div class="selector-grid">${selectorChips(record)}</div>
                </section>

                <section class="stage-panel panel">
                  <div class="route-header">
                    <div>
                      <p class="eyebrow">Components</p>
                      <h2 class="section-title">Mounted components for the selected route</h2>
                    </div>
                  </div>
                  <div class="component-grid">${componentCards(record)}</div>
                </section>
              `;
            }

            function renderPortalPage(record) {
              return `
                <section class="stage-panel panel" style="--accent:#99D2FF">
                  <div class="stage-header">
                    <p class="eyebrow">Portal</p>
                    <h1 class="hero-title">Task-first, customer-safe routes</h1>
                    <p class="hero-subtitle">Portal language stays plain, support stays subordinate, and upload / approval / onboarding posture stays explicit inside one client shell.</p>
                  </div>
                  <div class="portal-frame" data-testid="portal-mobile-frame">
                    <div class="mini-stack">
                      <p class="eyebrow">Primary stack</p>
                      <h3 class="card-title">STATUS_HERO -> TASK_QUEUE -> route workspace</h3>
                      <p class="copy">The active request, approval pack, or onboarding step takes the primary column; history and help stay subordinate.</p>
                    </div>
                    <div class="portal-ribbon">
                      <span class="chip chip-accent" data-testid="upload-state-transfer">transfer</span>
                      <span class="chip chip-warning" data-testid="upload-state-scan">scan</span>
                      <span class="chip chip-warning" data-testid="upload-state-validation">validation</span>
                      <span class="chip chip-success" data-testid="upload-state-accepted">accepted</span>
                      <span class="chip chip-danger">rejected / replacement</span>
                    </div>
                  </div>
                </section>

                <section class="stage-panel panel">
                  <div class="route-grid">
                    ${getRoutesForPage("portal").map((route) => routeCard(route)).join("")}
                  </div>
                </section>

                <section class="stage-panel panel">
                  <div class="route-header">
                    <div>
                      <p class="eyebrow">Current selector profile</p>
                      <h2 class="section-title">Portal anchors</h2>
                    </div>
                    <span class="chip">${record.selector_profile}</span>
                  </div>
                  <div class="selector-grid">${selectorChips(record)}</div>
                </section>

                <section class="stage-panel panel">
                  <div class="component-grid">${componentCards(record)}</div>
                </section>
              `;
            }

            function renderGovernancePage(record) {
              return `
                <section class="stage-panel panel" style="--accent:#E7C37A">
                  <div class="stage-header">
                    <p class="eyebrow">Governance</p>
                    <h1 class="hero-title">Dense control-plane, diff-first mutation</h1>
                    <p class="hero-subtitle">Governance uses its own denser layout grammar: context bar, section nav, inventory rail, workspace canvas, and audit sidecar.</p>
                  </div>
                  <div class="governance-grid">
                    <div class="governance-stack">
                      <p class="eyebrow">Mutation posture</p>
                      <h3 class="card-title" data-testid="governance-basket-ribbon">Change basket + approval composer</h3>
                      <p class="copy">All risky mutations stage into a basket, preserve diff context, and expose blast radius before commit.</p>
                    </div>
                    <div class="governance-stack">
                      <p class="eyebrow">Visibility posture</p>
                      <h3 class="card-title">Masked slices + basis hashes</h3>
                      <p class="copy">Every route preserves object anchor, dominant question, settlement state, and recovery posture under masking and basis drift.</p>
                    </div>
                  </div>
                </section>

                <section class="stage-panel panel">
                  <div class="route-grid">
                    ${getRoutesForPage("governance").map((route) => routeCard(route)).join("")}
                  </div>
                </section>

                <section class="stage-panel panel">
                  <div class="selector-grid">${selectorChips(record)}</div>
                </section>

                <section class="stage-panel panel">
                  <div class="component-grid">${componentCards(record)}</div>
                </section>
              `;
            }

            function renderNativePage(record) {
              const native = atlasData.native_topology;
              return `
                <section class="stage-panel panel" style="--accent:#7FE0C8">
                  <div class="stage-header">
                    <p class="eyebrow">Native</p>
                    <h1 class="hero-title">Primary scenes, support windows, restore envelope</h1>
                    <p class="hero-subtitle">Native scenes embody calm-shell law with split views, detached support windows, command surfaces, and strict legality checks.</p>
                  </div>
                  <div class="native-topology" data-testid="native-primary-scene">
                    <div class="native-grid">
                      <div class="native-window-card">
                        <p class="eyebrow">Primary scene</p>
                        <h3 class="card-title">Sidebar -> canvas -> inspector</h3>
                        <p class="copy">The same object remains mounted while sidebar and inspector independently collapse or detach.</p>
                      </div>
                      <div class="native-window-card">
                        <p class="eyebrow">Auth + restore</p>
                        <h3 class="card-title">External handoff, then lawful resume</h3>
                        <p class="copy">Scene restoration binds tenant, masking, route identity, object, and preview subject before anything reopens.</p>
                      </div>
                    </div>
                    <div class="chip-row">
                      ${native.command_surfaces.slice(0, 6).map((command) => `<span class="chip mono">${escapeHtml(command)}</span>`).join("")}
                    </div>
                  </div>
                </section>

                <section class="stage-panel panel">
                  <div class="route-grid">
                    ${getRoutesForPage("native").map((route) => routeCard(route)).join("")}
                  </div>
                </section>

                <section class="stage-panel panel">
                  <div class="selector-grid">${selectorChips(record)}</div>
                </section>

                <section class="stage-panel panel">
                  <div class="component-grid">${componentCards(record)}</div>
                </section>
              `;
            }

            function renderContinuityPage(scenario) {
              return `
                <section class="stage-panel panel" style="--accent:#76A9FF">
                  <div class="stage-header">
                    <p class="eyebrow">Continuity & Recovery</p>
                    <h1 class="hero-title">Mounted truth, explicit recovery, serialized focus return</h1>
                    <p class="hero-subtitle">Every family shares the same recovery vocabulary and the same promise: keep valid content mounted and explain the exact unsafe edge inline.</p>
                  </div>
                  <div class="timeline-panel">
                    <div class="timeline-line" data-testid="continuity-timeline">
                      <p class="card-title">${escapeHtml(scenario.title)}</p>
                      <p class="copy">${escapeHtml(scenario.trigger)}</p>
                      <p class="route-note">Preserved: ${escapeHtml(scenario.preserved.join(", "))}</p>
                      <p class="route-note">Invalidated: ${escapeHtml(scenario.invalidated.join(", "))}</p>
                    </div>
                  </div>
                </section>

                <section class="stage-panel panel">
                  <div class="route-header">
                    <div>
                      <p class="eyebrow">Scenario set</p>
                      <h2 class="section-title">Continuity scenarios</h2>
                    </div>
                  </div>
                  <div class="scenario-grid" data-testid="continuity-scenario-list">
                    ${atlasData.continuity_scenarios.map((item) => `
                      <button
                        type="button"
                        class="route-card"
                        data-action="select-scenario"
                        data-scenario-id="${escapeHtml(item.scenario_id)}"
                        data-active="${String(item.scenario_id === state.scenarioId)}"
                      >
                        <p class="eyebrow">${escapeHtml(item.applies_to.join(" / "))}</p>
                        <h3 class="card-title">${escapeHtml(item.title)}</h3>
                        <p class="copy">${escapeHtml(item.trigger)}</p>
                      </button>
                    `).join("")}
                  </div>
                </section>

                <section class="stage-panel panel">
                  <div class="route-header">
                    <div>
                      <p class="eyebrow">Support-region focus return</p>
                      <h2 class="section-title">Close support, return to anchor</h2>
                    </div>
                  </div>
                  <div class="support-demo" data-testid="continuity-support-demo">
                    <div class="button-row">
                      <button type="button" class="button button-accent" data-action="toggle-support" data-testid="support-demo-toggle" data-focus-id="support-demo-toggle">Open support region</button>
                    </div>
                    <div class="support-shell">
                      <div class="mini-stack">
                        <p class="eyebrow">Parent surface</p>
                        <h3 class="card-title">Route and scene anchors persist</h3>
                        <p class="copy">The parent surface keeps its dominant question and object anchor while support opens, redocks, or closes.</p>
                      </div>
                      ${state.supportOpen ? `
                        <aside class="support-drawer" data-testid="support-demo-drawer">
                          <p class="eyebrow">Promoted support region</p>
                          <h3 class="card-title">Serialized return target</h3>
                          <p class="copy">Closing this support region restores focus to the exact parent trigger rather than to an approximate container.</p>
                          <button type="button" class="button inspector-close" data-action="close-support" data-testid="support-demo-close">Close support region</button>
                        </aside>
                      ` : ""}
                    </div>
                  </div>
                </section>
              `;
            }

            function renderInspector() {
              if (state.pageId === "continuity") {
                const scenario = getScenario(state.scenarioId);
                return `
                  <div class="inspector-panel panel" role="complementary" aria-label="Evidence inspector" data-testid="evidence-inspector">
                    <p class="eyebrow">Evidence inspector</p>
                    <h2 class="card-title">${escapeHtml(scenario.title)}</h2>
                    <p class="copy">${escapeHtml(scenario.focus_return_rule)}</p>
                    <div class="inspector-meta">
                      <div class="meta-block">
                        <p class="meta-label">Applies to</p>
                        <p class="meta-value">${escapeHtml(scenario.applies_to.join(", "))}</p>
                      </div>
                      <div class="meta-block">
                        <p class="meta-label">Preserved</p>
                        <p class="meta-value">${escapeHtml(scenario.preserved.join(", "))}</p>
                      </div>
                      <div class="meta-block">
                        <p class="meta-label">Source refs</p>
                        <ul class="detail-list">${sourceRefList(scenario.source_refs)}</ul>
                      </div>
                    </div>
                  </div>
                `;
              }

              const record = getRecord(state.recordKey);
              return `
                <div class="inspector-panel panel" role="complementary" aria-label="Evidence inspector" data-testid="evidence-inspector" style="--accent:${escapeHtml(getAccent(record.surface_family))}">
                  <p class="eyebrow">Evidence inspector</p>
                  <h2 class="card-title">${escapeHtml(record.title)}</h2>
                  <p class="copy">${escapeHtml(record.notes)}</p>
                  <div class="inspector-meta">
                    <div class="meta-block">
                      <p class="meta-label">Actors</p>
                      <p class="meta-value">${escapeHtml(record.actor_profile)}</p>
                    </div>
                    <div class="meta-block">
                      <p class="meta-label">Object ownership</p>
                      <p class="meta-value">${escapeHtml(record.object_ownership)}</p>
                    </div>
                    <div class="meta-block">
                      <p class="meta-label">Read models</p>
                      <p class="meta-value">${escapeHtml(record.read_models.join(", "))}</p>
                    </div>
                    <div class="meta-block">
                      <p class="meta-label">Commands</p>
                      <p class="meta-value">${record.commands.length ? escapeHtml(record.commands.join(", ")) : "n/a"}</p>
                    </div>
                    <div class="meta-block">
                      <p class="meta-label">Streams / live updates</p>
                      <p class="meta-value">${escapeHtml(record.stream_sources.join(", "))}</p>
                    </div>
                    <div class="meta-block">
                      <p class="meta-label">Visibility lanes</p>
                      <p class="meta-value">${escapeHtml(record.visibility_lanes.join(", "))}</p>
                    </div>
                    <div class="meta-block">
                      <p class="meta-label">Source refs</p>
                      <ul class="detail-list">${sourceRefList(record.source_refs)}</ul>
                    </div>
                  </div>
                  <button type="button" class="button inspector-close" data-action="clear-record" data-testid="inspector-close">Close inspector selection</button>
                </div>
              `;
            }

            function getAccent(surfaceFamily) {
              const family = atlasData.surface_families.find((item) => item.surface_family === surfaceFamily);
              return family ? family.accent : "#76A9FF";
            }

            function renderRail() {
              const currentPage = getPage(state.pageId);
              return `
                <aside class="rail">
                  <div class="rail-panel panel">
                    <p class="eyebrow">Surface atlas</p>
                    <h1 class="card-title">Taxat multisurface map</h1>
                    <p class="copy">Generated from the authoritative algorithm contracts and the current analysis pack.</p>
                    <div class="rail-meta">
                      ${metricLines([
                        ["Current page", currentPage.title],
                        ["Motion mode", document.documentElement.dataset.motion || "standard"],
                        ["Gaps tracked", String(atlasData.gap_register.length)],
                      ])}
                    </div>
                    <div class="page-nav" role="tablist" aria-label="Atlas pages" data-testid="atlas-page-tabs">
                      ${atlasData.pages.map((page) => `
                        <button
                          type="button"
                          class="page-tab"
                          role="tab"
                          id="page-tab-${escapeHtml(page.page_id)}"
                          aria-selected="${String(page.page_id === state.pageId)}"
                          aria-controls="atlas-stage"
                          tabindex="${page.page_id === state.pageId ? "0" : "-1"}"
                          data-action="select-page"
                          data-page-id="${escapeHtml(page.page_id)}"
                        >
                          ${escapeHtml(page.title)}
                        </button>
                      `).join("")}
                    </div>
                  </div>
                </aside>
              `;
            }

            function renderStage() {
              const page = getPage(state.pageId);
              let pageMarkup = "";
              if (state.pageId === "overview") {
                pageMarkup = renderOverview();
              } else if (state.pageId === "collaboration") {
                pageMarkup = renderCollaborationPage(getRecord(state.recordKey));
              } else if (state.pageId === "portal") {
                pageMarkup = renderPortalPage(getRecord(state.recordKey));
              } else if (state.pageId === "governance") {
                pageMarkup = renderGovernancePage(getRecord(state.recordKey));
              } else if (state.pageId === "native") {
                pageMarkup = renderNativePage(getRecord(state.recordKey));
              } else {
                pageMarkup = renderContinuityPage(getScenario(state.scenarioId));
              }

              return `
                <main class="stage" id="atlas-stage" role="tabpanel" aria-labelledby="page-tab-${escapeHtml(page.page_id)}">
                  ${pageMarkup}
                </main>
              `;
            }

            function render() {
              root.innerHTML = `
                <div class="atlas-shell">
                  ${renderRail()}
                  ${renderStage()}
                  <aside class="inspector">${renderInspector()}</aside>
                </div>
              `;

              if (restoreFocusId) {
                requestAnimationFrame(() => {
                  const target =
                    document.getElementById(restoreFocusId) ||
                    root.querySelector(`[data-focus-id="${CSS.escape(restoreFocusId)}"]`) ||
                    root.querySelector(`[data-testid="${CSS.escape(restoreFocusId)}"]`);
                  if (target) target.focus();
                  restoreFocusId = null;
                });
              }
            }

            function handleClick(event) {
              const target = event.target.closest("[data-action]");
              if (!target) return;

              const action = target.dataset.action;
              if (action === "select-page") {
                state.supportOpen = false;
                const pageId = target.dataset.pageId;
                const recordKey = defaultRecordForPage(pageId);
                updateHash({ pageId, recordKey, scenarioId: state.scenarioId });
                return;
              }

              if (action === "select-record") {
                state.supportOpen = false;
                const recordKey = target.dataset.recordKey;
                updateHash({ pageId: state.pageId, recordKey, scenarioId: state.scenarioId });
                return;
              }

              if (action === "select-scenario") {
                state.supportOpen = false;
                const scenarioId = target.dataset.scenarioId;
                updateHash({ pageId: "continuity", recordKey: state.recordKey, scenarioId });
                return;
              }

              if (action === "toggle-support") {
                state.supportOpen = true;
                render();
                return;
              }

              if (action === "close-support") {
                state.supportOpen = false;
                restoreFocusId = "support-demo-toggle";
                render();
                return;
              }

              if (action === "clear-record") {
                const fallback = defaultRecordForPage(state.pageId);
                restoreFocusId = state.recordKey;
                updateHash({ pageId: state.pageId, recordKey: fallback, scenarioId: state.scenarioId });
              }
            }

            function handleTabKeydown(event) {
              const tab = event.target.closest(".page-tab");
              if (!tab) return;
              const tabs = [...root.querySelectorAll(".page-tab")];
              const currentIndex = tabs.indexOf(tab);
              if (currentIndex === -1) return;

              let nextIndex = null;
              if (event.key === "ArrowDown" || event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
              if (event.key === "ArrowUp" || event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
              if (event.key === "Home") nextIndex = 0;
              if (event.key === "End") nextIndex = tabs.length - 1;
              if (nextIndex === null) return;

              event.preventDefault();
              restoreFocusId = `page-tab-${tabs[nextIndex].dataset.pageId}`;
              tabs[nextIndex].focus();
              tabs[nextIndex].click();
            }

            async function init() {
              const response = await fetch("./atlas_data.json");
              atlasData = await response.json();
              setMotionMode();
              syncStateFromHash(true);
              window.addEventListener("hashchange", () => syncStateFromHash(false));
              window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", () => {
                setMotionMode();
                render();
              });
              root.addEventListener("click", handleClick);
              root.addEventListener("keydown", handleTabKeydown);
            }

            init();
            """
        ),
    )


def write_playwright_specs(summary: dict[str, Any]) -> None:
    write_text(
        PLAYWRIGHT_SPEC_PATH,
        normalize_markdown(
            f"""
            import {{ expect, test }} from "@playwright/test";

            const atlasPath = "/prototypes/analysis/surface_requirements_atlas/index.html";

            async function gotoAtlas(page, hash = "#page=overview&record=collaboration_staff_inbox") {{
              await page.goto(`${{atlasPath}}${{hash}}`);
              await expect(page.getByTestId("surface-requirements-atlas")).toBeVisible();
              await expect(page.getByRole("tablist", {{ name: "Atlas pages" }})).toBeVisible();
            }}

            test("overview renders summary and navigation", async ({{ page }}) => {{
              await gotoAtlas(page);
              await expect(page.getByText("Surface Requirements Atlas")).toBeVisible();
              await expect(page.getByTestId("summary-surface-families")).toContainText("{summary["surface_family_count"]}");
              await expect(page.getByTestId("summary-route-scenes")).toContainText("{summary["route_scene_count"]}");
              await expect(page.getByRole("tab", {{ name: "Collaboration" }})).toBeVisible();
            }});

            test("family pages render collaboration, portal, governance, and native compositions", async ({{ page }}) => {{
              await gotoAtlas(page);

              await page.getByRole("tab", {{ name: "Collaboration" }}).click();
              await expect(page.getByTestId("collaboration-lane-map")).toBeVisible();
              await expect(page.getByTestId("route-card-collaboration_staff_workspace")).toBeVisible();

              await page.getByRole("tab", {{ name: "Portal" }}).click();
              await expect(page.getByTestId("portal-mobile-frame")).toBeVisible();
              await expect(page.getByTestId("upload-state-transfer")).toBeVisible();

              await page.getByRole("tab", {{ name: "Governance" }}).click();
              await expect(page.getByTestId("governance-basket-ribbon")).toBeVisible();

              await page.getByRole("tab", {{ name: "Native" }}).click();
              await expect(page.getByTestId("native-primary-scene")).toBeVisible();
            }});

            test("overview screenshot baseline", async ({{ page }}) => {{
              await gotoAtlas(page);
              await expect(page.getByTestId("surface-requirements-atlas")).toHaveScreenshot("surface-requirements-atlas-overview.png", {{
                animations: "disabled",
                fullPage: true,
              }});
            }});
            """
        ),
    )

    write_text(
        PLAYWRIGHT_CONTINUITY_SPEC_PATH,
        normalize_markdown(
            """
            import { expect, test } from "@playwright/test";

            const atlasPath = "/prototypes/analysis/surface_requirements_atlas/index.html";

            async function gotoAtlas(page, hash = "#page=continuity&scenario=inline_rebase&record=collaboration_staff_workspace") {
              await page.goto(`${atlasPath}${hash}`);
              await expect(page.getByTestId("surface-requirements-atlas")).toBeVisible();
            }

            test("continuity scenarios switch and support focus returns to the parent trigger", async ({ page }) => {
              await gotoAtlas(page);
              await expect(page.getByTestId("continuity-scenario-list")).toBeVisible();

              await page.getByTestId("support-demo-toggle").click();
              await expect(page.getByTestId("support-demo-drawer")).toBeVisible();
              await page.getByTestId("support-demo-close").click();
              await expect(page.getByTestId("support-demo-toggle")).toBeFocused();

              await page.getByRole("button", { name: "Native scene restore under legality checks" }).click();
              await expect(page.getByTestId("evidence-inspector")).toContainText("Native scene restore under legality checks");
            });

            test("reduced motion mode is reflected in the document dataset", async ({ page }) => {
              await page.emulateMedia({ reducedMotion: "reduce" });
              await gotoAtlas(page);
              await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.motion)).toBe("reduce");
            });

            test("continuity screenshot baseline", async ({ page }) => {
              await gotoAtlas(page);
              await expect(page.getByTestId("surface-requirements-atlas")).toHaveScreenshot("surface-requirements-atlas-continuity.png", {
                animations: "disabled",
                fullPage: true,
              });
            });
            """
        ),
    )

    write_text(
        PLAYWRIGHT_ACCESSIBILITY_SPEC_PATH,
        normalize_markdown(
            """
            import { expect, test } from "@playwright/test";

            const atlasPath = "/prototypes/analysis/surface_requirements_atlas/index.html";

            async function gotoAtlas(page, hash = "#page=portal&record=portal_documents") {
              await page.goto(`${atlasPath}${hash}`);
              await expect(page.getByTestId("surface-requirements-atlas")).toBeVisible();
            }

            test("page tabs support keyboard navigation", async ({ page }) => {
              await gotoAtlas(page);
              const portalTab = page.getByRole("tab", { name: "Portal" });
              await portalTab.focus();
              await page.keyboard.press("ArrowDown");
              await expect(page.getByRole("tab", { name: "Governance" })).toBeFocused();
            });

            test("portal selector chips and evidence inspector are visible", async ({ page }) => {
              await gotoAtlas(page);
              await expect(page.getByTestId("selector-chip-portal-shell")).toBeVisible();
              await expect(page.getByTestId("selector-chip-portal-support-panel")).toBeVisible();
              await expect(page.getByRole("complementary", { name: "Evidence inspector" })).toBeVisible();
            });

            test("inspector close returns to the selected route anchor", async ({ page }) => {
              await gotoAtlas(page);
              await page.getByTestId("route-card-portal_documents").click();
              await page.getByTestId("inspector-close").click();
              await expect(page.getByTestId("route-card-portal_documents")).toBeFocused();
            });
            """
        ),
    )


def main() -> None:
    assert_source_grounding()

    selector_registry = build_selector_registry()
    component_inventory = build_component_inventory(ROUTE_RECORDS)
    read_model_bindings = build_read_model_api_binding(ROUTE_RECORDS)
    state_matrix = build_state_visibility_matrix(ROUTE_RECORDS)
    native_topology = build_native_topology(ROUTE_RECORDS)
    gap_register = build_gap_register()
    summary = build_summary(ROUTE_RECORDS, selector_registry, component_inventory, gap_register)
    atlas_data = build_atlas_data(
        summary,
        ROUTE_RECORDS,
        selector_registry,
        component_inventory,
        read_model_bindings,
        state_matrix,
        native_topology,
        gap_register,
    )

    write_json(ROUTE_MATRIX_PATH, {"summary": summary, "routes": ROUTE_RECORDS})
    write_json(COMPONENT_INVENTORY_PATH, component_inventory)
    write_json(READ_MODEL_API_BINDING_JSON_PATH, read_model_bindings)
    write_json(STATE_VISIBILITY_MATRIX_PATH, state_matrix)
    write_json(SELECTOR_REGISTRY_PATH, selector_registry)
    write_json(NATIVE_TOPOLOGY_PATH, native_topology)
    write_json(GAP_REGISTER_PATH, gap_register)
    write_json(ATLAS_DATA_PATH, atlas_data)

    write_multisurface_pack(summary, ROUTE_RECORDS, gap_register)
    write_uiux_spec(summary)
    write_read_model_binding_doc(read_model_bindings)
    write_native_scene_spec(native_topology)

    write_text(IA_DIAGRAM_PATH, build_information_architecture_mermaid(ROUTE_RECORDS))
    write_text(NATIVE_DIAGRAM_PATH, build_native_topology_mermaid(native_topology))

    write_index_html()
    write_styles_css()
    write_app_js()
    write_playwright_specs(summary)


if __name__ == "__main__":
    main()
