#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from textwrap import dedent
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
ALGORITHM_DIR = ROOT / "Algorithm"
DATA_ANALYSIS_DIR = ROOT / "data" / "analysis"
DOCS_ANALYSIS_DIR = ROOT / "docs" / "analysis"
PROTOTYPE_DIR = ROOT / "prototypes" / "analysis" / "frontend_contract_atlas"
TESTS_DIR = ROOT / "tests" / "playwright"

FRONTEND_REQUIREMENTS_PATH = DOCS_ANALYSIS_DIR / "13_frontend_shell_route_and_interaction_layer_requirements.md"
VISUAL_SYSTEM_PATH = DOCS_ANALYSIS_DIR / "13_visual_system_layout_and_motion_spec.md"
VALIDATION_PLAN_PATH = DOCS_ANALYSIS_DIR / "13_playwright_accessibility_and_continuity_validation_plan.md"

SHELL_ROUTE_MATRIX_PATH = DATA_ANALYSIS_DIR / "shell_route_matrix.json"
INTERACTION_LAYER_MAP_PATH = DATA_ANALYSIS_DIR / "interaction_layer_foundation_map.json"
SEMANTIC_SELECTOR_REGISTRY_PATH = DATA_ANALYSIS_DIR / "semantic_selector_registry.json"
CONTINUITY_RECOVERY_MATRIX_PATH = DATA_ANALYSIS_DIR / "continuity_recovery_matrix.json"
LAYOUT_BREAKPOINT_CONTRACT_PATH = DATA_ANALYSIS_DIR / "layout_breakpoint_contract.json"
ROUTE_FOCUS_REGISTRY_PATH = DATA_ANALYSIS_DIR / "route_landmark_and_focus_order_registry.json"

ATLAS_DATA_PATH = PROTOTYPE_DIR / "atlas_data.json"
ATLAS_INDEX_PATH = PROTOTYPE_DIR / "index.html"
ATLAS_STYLES_PATH = PROTOTYPE_DIR / "styles.css"
ATLAS_APP_PATH = PROTOTYPE_DIR / "app.js"

PLAYWRIGHT_SPEC_PATH = TESTS_DIR / "frontend_contract_atlas.spec.ts"
PLAYWRIGHT_CONTINUITY_SPEC_PATH = TESTS_DIR / "frontend_contract_atlas.continuity.spec.ts"
PLAYWRIGHT_ACCESSIBILITY_SPEC_PATH = TESTS_DIR / "frontend_contract_atlas.accessibility.spec.ts"

FRONTEND_LAW = "Algorithm/frontend_shell_and_interaction_law.md"
LOW_NOISE = "Algorithm/low_noise_experience_contract.md"
PORTAL = "Algorithm/customer_client_portal_experience_contract.md"
COLLABORATION = "Algorithm/collaboration_workspace_contract.md"
GOVERNANCE = "Algorithm/admin_governance_console_architecture.md"
CROSS_SHELL = "Algorithm/cross_shell_design_token_and_interaction_layer_foundation_contract.md"
SEMANTIC_ACCESSIBILITY = "Algorithm/semantic_selector_and_accessibility_contract.md"
SEMANTIC_REGRESSION = "Algorithm/semantic_selector_and_accessibility_regression_pack_contract.md"
SHELL_CONTINUITY = "Algorithm/shell_continuity_fuzzing_and_recovery_contract.md"
FOCUS_RESTORE = "Algorithm/focus_restoration_and_return_target_harness_contract.md"
CROSS_DEVICE = "Algorithm/cross_device_continuity_and_restoration_contract.md"
STREAM_RESUME = "Algorithm/stream_resume_and_catch_up_ordering_contract.md"
CACHE_REBASE = "Algorithm/native_cache_hydration_purge_and_rebase_contract.md"
NATIVE_BLUEPRINT = "Algorithm/macos_native_operator_workspace_blueprint.md"
UIUX_SKILL = "Algorithm/UIUX_DESIGN_SKILL.md"

SOURCE_ASSERTIONS: dict[str, list[str]] = {
    FRONTEND_LAW: [
        "CALM_SHELL",
        "CLIENT_PORTAL_SHELL",
        "GOVERNANCE_DENSITY_SHELL",
        "cross_device_continuity_contract{",
        "semantic_accessibility_contract{",
        "shell_continuity_fuzz_harness{",
    ],
    LOW_NOISE: [
        "CONTEXT_BAR",
        "DECISION_SUMMARY",
        "ACTION_STRIP",
        "DETAIL_DRAWER",
        "LowNoiseExperienceFrame",
        "OperatorInteractionLayer",
    ],
    PORTAL: [
        "Home",
        "Documents",
        "Approvals",
        "Onboarding",
        "Help",
        "/portal/requests/{item_id}",
    ],
    COLLABORATION: [
        "/work",
        "/work/items/{item_id}",
        "CUSTOMER_ACTIVITY",
        "INTERNAL_ACTIVITY",
        "AUDIO_TRAIL" if False else "AUDIT_TRAIL",
    ],
    GOVERNANCE: [
        "/governance",
        "/governance/tenant",
        "/governance/access",
        "/governance/authority-links",
        "/governance/audit",
        "Governance interaction layer",
    ],
    CROSS_SHELL: [
        "CALM_SHELL",
        "CLIENT_PORTAL_SHELL",
        "GOVERNANCE_DENSITY_SHELL",
        "layout_density_token",
        "secondary_window_policy",
    ],
    SEMANTIC_ACCESSIBILITY: [
        "LowNoiseExperienceFrame",
        "ClientPortalWorkspace",
        "TenantGovernanceSnapshot",
        "NativeOperatorWorkspaceScene",
    ],
    SEMANTIC_REGRESSION: [
        "LowNoiseExperienceFrame",
        "ClientPortalWorkspace",
        "TenantGovernanceSnapshot",
        "SECONDARY_WINDOW_RETURN",
    ],
    SHELL_CONTINUITY: [
        "truth_change_detected = false",
        "PRESERVED",
        "INLINE_RECOVERY",
    ],
    FOCUS_RESTORE: [
        "serialized parent return target",
        "the narrowest surviving list or queue target",
    ],
    CROSS_DEVICE: [
        "LowNoiseExperienceFrame",
        "WorkItemNotification",
        "TenantGovernanceSnapshot",
    ],
    STREAM_RESUME: [
        "MANIFEST_EXPERIENCE",
        "WORKSPACE",
        "REBASE_REQUIRED",
        "ACCESS_REBIND_REQUIRED",
    ],
    CACHE_REBASE: [
        "mutation-capable",
        "filing-capable",
        "tenant, session, masking, object, or contract-window legality",
    ],
    NATIVE_BLUEPRINT: [
        "NavigationSplitView",
        "leading sidebar",
        "PRIMARY_CANVAS",
        "inspector",
        "NativeOperatorSecondaryWindowScene",
    ],
    UIUX_SKILL: [
        "Taxat Decision Observatory",
        "same object, same shell",
        "CONTEXT_BAR",
        "DETAIL_DRAWER",
    ],
}


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
    prefix = " " * 8
    return "\n".join(
        line[len(prefix):] if line.startswith(prefix) else line
        for line in dedent(text).strip().splitlines()
    )


def assert_source_grounding() -> None:
    missing: list[str] = []
    for relative_path, snippets in SOURCE_ASSERTIONS.items():
        path = ROOT / relative_path
        text = path.read_text(encoding="utf-8")
        for snippet in snippets:
            if snippet not in text:
                missing.append(f"{relative_path}: missing snippet {snippet!r}")
    if missing:
        message = "\n".join(missing)
        raise RuntimeError(f"Source grounding assertions failed:\n{message}")


ASSUMPTIONS = [
    {
        "code": "ASSUMPTION_MANIFEST_WORKSPACE_ROUTE_PATTERN",
        "description": "The corpus names manifest-scoped operator surfaces without a single literal browser root path, so the atlas normalizes the primary manifest route as `/manifests/{manifest_id}` to align with the explicit workflow deep-link form.",
        "impact": "Manifest-focused route cards and the calm-shell overview use a stable browser pattern without inventing extra shell families.",
        "source_refs": [
            ref(FRONTEND_LAW, "1.2 Same object, same shell", "Manifest-scoped objects are explicitly owned by the calm shell family."),
            ref(COLLABORATION, "Route map", "The collaboration contract explicitly publishes `/manifests/{manifest_id}?focus=workflow:{item_id}` as a route-stable focus jump."),
        ],
    },
    {
        "code": "ASSUMPTION_PORTAL_HOME_CANONICAL_ROOT_ROUTE",
        "description": "The client portal contract enumerates the Home destination but does not require a `/portal/home` literal, so the atlas binds Home to the canonical root route `/portal`.",
        "impact": "Portal route tables and the atlas navigation keep a five-destination top-level model without creating a sixth path variant.",
        "source_refs": [
            ref(PORTAL, "Navigation contract", "Home is one of the five permanent top-level destinations."),
            ref(PORTAL, "Route architecture", "The route architecture distinguishes contextual detail routes from the permanent top-level navigation."),
        ],
    },
    {
        "code": "ASSUMPTION_RETENTION_ROUTE_FOCUS_ORDER_NORMALIZATION",
        "description": "Retention policy, legal-hold, and erasure routes are enumerated explicitly, but their exact landmark order is less granular than the tenant/access/audit routes, so the atlas normalizes them through the shared governance reading-order law plus the named route-local workspaces.",
        "impact": "The route landmark registry stays machine-usable while clearly marking the retention-family focus order as a governed normalization rather than a verbatim copy.",
        "source_refs": [
            ref(GOVERNANCE, "4.5 /governance/retention", "Retention routes are enumerated at the route-family level."),
            ref(FRONTEND_LAW, "3.3 Shell-family topology", "Governance routes keep one promoted support region and a stable semantic order within the density shell."),
        ],
    },
    {
        "code": "RISK_NATIVE_SECONDARY_WINDOW_ROUTELESS_OVERLAY",
        "description": "Native secondary windows are deliberate support overlays rather than a fourth shell family. They do not introduce route patterns, so the atlas models them as embodiment overlays on top of calm-shell continuity law.",
        "impact": "Future native implementation work must preserve parent-bound focus return and must not let compare/audit windows drift into independent shell semantics.",
        "source_refs": [
            ref(FRONTEND_LAW, "1.1 Canonical shell families", "Native scenes are embodiments of existing shell families rather than a new family."),
            ref(NATIVE_BLUEPRINT, "Secondary windows", "Detached native support windows restore focus to the parent anchor and remain support-only."),
        ],
    },
]

SHARED_STABILITY_KEYS = [
    "shell_route_key",
    "route_context",
    "shell_stability_token",
    "focus_anchor_ref",
    "return_focus_anchor_ref_or_null",
    "access_scope_hash_or_null",
    "masking_scope_fingerprint_or_null",
    "session_scope_ref_or_null",
    "visibility_cache_partition_key_or_null",
]

CALM_STABILITY_KEYS = SHARED_STABILITY_KEYS + [
    "workspace_route_key",
    "publication_generation",
    "decision_bundle_hash",
    "view_guard_ref",
    "stream_recovery_contract",
]

PORTAL_STABILITY_KEYS = SHARED_STABILITY_KEYS + [
    "workspace_route_key",
    "artifact_focus_bucket_or_null",
    "artifact_focus_subject_ref_or_null",
    "request_version_ref",
    "approval_pack_hash",
    "narrow_screen_mode",
]

GOVERNANCE_STABILITY_KEYS = SHARED_STABILITY_KEYS + [
    "workspace_route_key",
    "policy_snapshot_hash",
    "selected_filter_chip_refs",
    "active_filters",
    "compaction_mode",
    "focus_trap_mode",
]

LOW_NOISE_SELECTORS = [
    "low-noise-shell",
    "shell-family",
    "object-anchor",
    "dominant-question",
    "settlement-posture",
    "recovery-posture",
    "context-bar",
    "decision-summary",
    "action-strip",
    "primary-action",
    "no-safe-action",
    "detail-drawer",
    "detail-entry-EVIDENCE_TIDE",
    "detail-entry-PACKET_FORGE",
    "detail-entry-AUTHORITY_TUNNEL",
    "detail-entry-DRIFT_FIELD",
    "detail-entry-FOCUS_LENS",
    "detail-entry-TWIN_PANEL",
]

COLLABORATION_SELECTORS = [
    "action-assign",
    "assign-dialog",
    "assignee-chip",
    "thread-internal",
    "module-audit",
    "composer-internal",
    "composer-customer-visible",
    "thread-customer",
    "module-files",
    "action-escalate",
    "escalation-dialog",
    "escalation-badge",
    "problem-banner",
    "attachment-chip-pending",
    "attachment-chip-unavailable",
    "attachment-chip-current",
    "attachment-chip-historical",
    "workspace-dominant-question",
    "workspace-settlement-posture",
    "workspace-no-safe-action",
]

PORTAL_SELECTORS = [
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
]

GOVERNANCE_SELECTORS = [
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
]

SHARED_CONTINUITY_SELECTORS = [
    "return-path-control",
    "artifact-preview-header",
    "artifact-state-label",
    "limitation-notice",
    "stale-notice",
    "recovery-notice",
    "focus-anchor",
    "current-artifact-target",
    "historical-artifact-target",
]

FOCUS_RESTORE_ORDER = [
    "Remap to the closest surviving focus anchor within the same governed object.",
    "Fall back to the owning object summary on the same governed object.",
    "Use the serialized parent return target if the original focus anchor no longer exists.",
    "Use the narrowest surviving list or queue target with an explicit recovery explanation.",
]

SETTLEMENT_POSTURES = [
    "STEADY",
    "RECEIPT_PENDING",
    "FRESHENING",
    "STALE_REVIEW_REQUIRED",
    "DEGRADED_READ_ONLY",
    "RECOVERY_REQUIRED",
]


def build_shell_families() -> list[dict[str, Any]]:
    return [
        {
            "shell_family": "CALM_SHELL",
            "shell_label": "Calm decision workspace",
            "owning_object_rule": "Manifest-scoped operator surfaces and staff collaboration workspaces stay inside the calm shell family.",
            "route_grammar": [
                "/manifests/{manifest_id}",
                "/manifests/{manifest_id}?focus=workflow:{item_id}",
                "/work",
                "/work/items/{item_id}",
                "/work/items/{item_id}?module={module_code}",
            ],
            "default_surface_order": ["CONTEXT_BAR", "DECISION_SUMMARY", "ACTION_STRIP", "DETAIL_DRAWER"],
            "dominant_question_law": "One dominant question and one dominant lawful action stay visible at all times.",
            "promoted_support_region_law": "Only one promoted support region is mounted by default; compare and audit surfaces require explicit entry.",
            "continuity_contract": "SAME_OBJECT_SAME_SHELL_INLINE_RECOVERY",
            "selector_profile": "OPERATOR_SEMANTIC_SELECTORS_V1",
            "native_embodiment_policy": "Allowed in browser and native operator embodiments without creating a new shell family.",
            "source_refs": [
                ref(FRONTEND_LAW, "1.1 Canonical shell families", "Defines calm shell as a canonical family."),
                ref(LOW_NOISE, "Default visible shell", "Freezes the four-surface calm-shell layout and interaction law."),
                ref(COLLABORATION, "3.2 Staff work item workspace", "Work item collaboration inherits the same four-surface shell."),
            ],
        },
        {
            "shell_family": "CLIENT_PORTAL_SHELL",
            "shell_label": "Client-safe task portal",
            "owning_object_rule": "Customer request, upload, approval, onboarding, and help flows stay in the client-safe portal shell.",
            "route_grammar": [
                "/portal",
                "/portal/documents",
                "/portal/approvals",
                "/portal/onboarding",
                "/portal/help",
                "/portal/requests/{item_id}",
            ],
            "default_surface_order": [
                "PORTAL_HEADER",
                "STATUS_HERO",
                "PRIMARY_ACTION",
                "PROMOTED_SUPPORT_REGION",
                "SUPPORTING_DETAIL",
            ],
            "dominant_question_law": "Each client route foregrounds the next safe customer task in plain-language status terms.",
            "promoted_support_region_law": "One promoted support region maximum outside the dedicated Help route.",
            "continuity_contract": "SAME_SHELL_CONTEXTUAL_RETURN",
            "selector_profile": "PORTAL_SEMANTIC_SELECTORS_V1",
            "native_embodiment_policy": "Browser-first shell with the same continuity contracts when opened through a native wrapper.",
            "source_refs": [
                ref(FRONTEND_LAW, "1.2 Same object, same shell", "Client request and approval flows are explicitly portal-owned."),
                ref(PORTAL, "Shell continuity, support budget, and constrained layouts", "Defines the portal support-budget and continuity rules."),
                ref(PORTAL, "Minimum semantic selectors", "Defines the portal selector profile."),
            ],
        },
        {
            "shell_family": "GOVERNANCE_DENSITY_SHELL",
            "shell_label": "Governance density workspace",
            "owning_object_rule": "Governance objects, administrative mutation work, and policy inspection stay inside the governance density shell.",
            "route_grammar": [
                "/governance",
                "/governance/tenant",
                "/governance/access/principals",
                "/governance/access/roles",
                "/governance/access/simulator",
                "/governance/authority-links",
                "/governance/retention/policies",
                "/governance/retention/legal-holds",
                "/governance/retention/erasure",
                "/governance/audit",
            ],
            "default_surface_order": [
                "SECTION_NAV",
                "PRIMARY_WORKLIST",
                "WORKSPACE_HEADER",
                "ATTENTION_SUMMARY",
                "PROMOTED_AUXILIARY_SURFACE",
            ],
            "dominant_question_law": "Governance routes may show multiple structural regions, but one dominant question and worklist still lead the route.",
            "promoted_support_region_law": "One promoted auxiliary surface by default; additional density requires explicit audit, compare, or contradiction states.",
            "continuity_contract": "SAME_OBJECT_SAME_SHELL_CONTEXT_RETENTION",
            "selector_profile": "GOVERNANCE_SEMANTIC_SELECTORS_V1",
            "native_embodiment_policy": "No new shell family for native admin surfaces; future native work must remain a governance-density embodiment.",
            "source_refs": [
                ref(FRONTEND_LAW, "3.3 Shell-family topology", "Defines the governance topology and promoted-support law."),
                ref(GOVERNANCE, "6.7 Governance interaction layer", "Defines the governance interaction layer and preserved context fields."),
                ref(CROSS_SHELL, "GOVERNANCE_DENSITY_SHELL", "Maps the governance family to its design-token and behavior foundation."),
            ],
        },
    ]


def make_route(
    *,
    shell_family: str,
    route_id: str,
    route_pattern: str,
    owning_object_family: str,
    viewer_capability_profile: str,
    required_stability_keys: list[str],
    interaction_layer_contract: str,
    dominant_question: str,
    dominant_action_policy: str,
    promoted_support_region_policy: str,
    landmarks: list[str],
    focus_order: list[str],
    semantic_selector_set: list[str],
    recovery_postures: list[str],
    rebase_invalidation_reasons: list[str],
    external_handoff_rules: list[str],
    responsive_collapse_rules: list[str],
    source_refs: list[dict[str, str]],
    notes: str,
) -> dict[str, Any]:
    return {
        "shell_family": shell_family,
        "route_id": route_id,
        "route_pattern": route_pattern,
        "owning_object_family": owning_object_family,
        "viewer_capability_profile": viewer_capability_profile,
        "required_stability_keys": unique(required_stability_keys),
        "interaction_layer_contract": interaction_layer_contract,
        "dominant_question": dominant_question,
        "dominant_action_policy": dominant_action_policy,
        "promoted_support_region_policy": promoted_support_region_policy,
        "landmarks": landmarks,
        "focus_order": focus_order,
        "semantic_selector_set": unique(semantic_selector_set),
        "recovery_postures": recovery_postures,
        "rebase_invalidation_reasons": rebase_invalidation_reasons,
        "external_handoff_rules": external_handoff_rules,
        "responsive_collapse_rules": responsive_collapse_rules,
        "source_refs": source_refs,
        "notes": notes,
    }


def build_route_records() -> list[dict[str, Any]]:
    return [
        make_route(
            shell_family="CALM_SHELL",
            route_id="calm_manifest_workspace",
            route_pattern="/manifests/{manifest_id}",
            owning_object_family="RunManifest",
            viewer_capability_profile="OPERATOR_LOW_NOISE",
            required_stability_keys=CALM_STABILITY_KEYS,
            interaction_layer_contract="OperatorInteractionLayer",
            dominant_question="What is the current authoritative decision posture for this manifest?",
            dominant_action_policy="Expose only the next lawful manifest action in `ACTION_STRIP`; omit unsafe or non-material actions instead of disabling them.",
            promoted_support_region_policy="Promote `DETAIL_DRAWER` only; compare, audit, and authority review open as explicit secondary states rather than permanent extra panes.",
            landmarks=["CONTEXT_BAR", "DECISION_SUMMARY", "ACTION_STRIP", "DETAIL_DRAWER"],
            focus_order=["CONTEXT_BAR", "DECISION_SUMMARY", "ACTION_STRIP", "DETAIL_DRAWER"],
            semantic_selector_set=LOW_NOISE_SELECTORS + SHARED_CONTINUITY_SELECTORS,
            recovery_postures=SETTLEMENT_POSTURES,
            rebase_invalidation_reasons=[
                "frame epoch drift",
                "shell stability token drift",
                "route context drift",
                "stream compaction floor advance",
                "publication generation mismatch",
            ],
            external_handoff_rules=[
                "Authority or identity browser handoff must return to the same manifest shell, object anchor, and focus anchor.",
                "Detached comparison, audit, or packet windows remain support-only and must restore focus to the invoking parent anchor.",
            ],
            responsive_collapse_rules=[
                "Keep `CONTEXT_BAR`, `DECISION_SUMMARY`, and `ACTION_STRIP` stacked in canonical order.",
                "Collapse `DETAIL_DRAWER` inline or into a focus-preserving sheet before collapsing any primary summary or dominant action content.",
            ],
            source_refs=[
                ref(FRONTEND_LAW, "1.2 Same object, same shell", "Manifest-scoped objects stay in the calm shell family."),
                ref(LOW_NOISE, "Default visible shell", "Freezes the four-surface calm-shell composition."),
                ref(LOW_NOISE, "Shell continuity, constrained layouts, and artifact handoff", "Defines same-object continuity and narrow-layout collapse."),
            ],
            notes="ASSUMPTION_MANIFEST_WORKSPACE_ROUTE_PATTERN: the browser route is normalized from the explicit manifest focus grammar and manifest ownership law.",
        ),
        make_route(
            shell_family="CALM_SHELL",
            route_id="calm_manifest_workflow_focus",
            route_pattern="/manifests/{manifest_id}?focus=workflow:{item_id}",
            owning_object_family="RunManifest + WorkflowItem focus",
            viewer_capability_profile="OPERATOR_COLLABORATION",
            required_stability_keys=CALM_STABILITY_KEYS + ["route_context.active_module_code", "artifact_focus_subject_ref_or_null"],
            interaction_layer_contract="OperatorInteractionLayer",
            dominant_question="What workflow issue attached to this manifest requires operator attention now?",
            dominant_action_policy="Retain the manifest-level dominant action while opening workflow context as an explicit support-mode focus, not a shell switch.",
            promoted_support_region_policy="Use the same `DETAIL_DRAWER` support budget while deep-linking the workflow module into focus.",
            landmarks=["CONTEXT_BAR", "DECISION_SUMMARY", "ACTION_STRIP", "DETAIL_DRAWER"],
            focus_order=["CONTEXT_BAR", "DECISION_SUMMARY", "ACTION_STRIP", "DETAIL_DRAWER"],
            semantic_selector_set=LOW_NOISE_SELECTORS + COLLABORATION_SELECTORS + SHARED_CONTINUITY_SELECTORS,
            recovery_postures=SETTLEMENT_POSTURES,
            rebase_invalidation_reasons=[
                "focus anchor remap failure",
                "workflow module mismatch",
                "shell stability token drift",
                "access binding drift",
            ],
            external_handoff_rules=[
                "Workflow deep links restore the manifest shell and preserve the explicit workflow return path.",
                "Notification-driven opens must highlight the focused workflow item without remounting a new shell family.",
            ],
            responsive_collapse_rules=[
                "Keep the workflow focus in the same SPA shell.",
                "On narrow layouts, retain the module focus and restoration target instead of discarding the active workflow context.",
            ],
            source_refs=[
                ref(COLLABORATION, "Route map", "Publishes the explicit manifest-to-workflow deep link."),
                ref(FRONTEND_LAW, "2.3 Deep-link restoration", "Defines the deep-link fallback order for same-object restoration."),
                ref(FOCUS_RESTORE, "Fallback order", "Governs parent return and list fallback when the original focus anchor is unavailable."),
            ],
            notes="Uses the manifest route as the owning shell while exposing workflow context as a route-stable focus jump.",
        ),
        make_route(
            shell_family="CALM_SHELL",
            route_id="calm_work_inbox",
            route_pattern="/work",
            owning_object_family="WorkflowItem queue",
            viewer_capability_profile="OPERATOR_COLLABORATION",
            required_stability_keys=CALM_STABILITY_KEYS + ["active_filters", "route_context.entry_surface"],
            interaction_layer_contract="OperatorInteractionLayer",
            dominant_question="Which workflow item requires intervention next?",
            dominant_action_policy="Expose one authoritative row action per queue row after identity and triage signals; keep illegal actions omitted.",
            promoted_support_region_policy="Keep queue detail subordinate; opening an item stays inside the same SPA shell rather than spawning a new route family.",
            landmarks=["WORK_INBOX_HEADER", "FILTER_CHIPS", "WORKLIST", "ROW_ACTIONS"],
            focus_order=["WORK_INBOX_HEADER", "FILTER_CHIPS", "WORKLIST", "ROW_PRIMARY_ACTION"],
            semantic_selector_set=LOW_NOISE_SELECTORS + COLLABORATION_SELECTORS + ["focus-anchor"] + SHARED_CONTINUITY_SELECTORS,
            recovery_postures=["PRESERVED", "INLINE_RECOVERY", "REBASE_REQUIRED"],
            rebase_invalidation_reasons=[
                "queue filter grammar drift",
                "access binding drift",
                "shell stability token drift",
                "list selection no longer resolves",
            ],
            external_handoff_rules=[
                "Queue-to-item transitions preserve filter chips, selection, scroll anchor, and return focus.",
                "Notification-open restores the same queue slice or focused item row before escalating to list fallback.",
            ],
            responsive_collapse_rules=[
                "Preserve queue filters and selected row across breakpoint changes.",
                "Queue -> item -> queue transitions stay inside the SPA shell at all breakpoints.",
            ],
            source_refs=[
                ref(COLLABORATION, "3.1 Staff work inbox", "Defines queue hierarchy, filter chips, and authoritative row actions."),
                ref(FRONTEND_LAW, "2.5 Queue and inbox continuity", "Queue continuity requires preserving the lawful filter and return state."),
                ref(CROSS_DEVICE, "WorkItemNotification", "Cross-device continuity includes notification-driven work item restoration."),
            ],
            notes="The calm shell owns the queue even when the work item body opens inside the same application shell.",
        ),
        make_route(
            shell_family="CALM_SHELL",
            route_id="calm_work_item",
            route_pattern="/work/items/{item_id}",
            owning_object_family="WorkflowItem",
            viewer_capability_profile="OPERATOR_COLLABORATION",
            required_stability_keys=CALM_STABILITY_KEYS + ["route_context.return_route_ref", "route_context.active_module_code"],
            interaction_layer_contract="OperatorInteractionLayer",
            dominant_question="What is the next lawful action for this workflow item?",
            dominant_action_policy="Keep the workflow decision and next step explicit in `ACTION_STRIP`, with settlement-aware feedback in `CONTEXT_BAR`.",
            promoted_support_region_policy="Use `DETAIL_DRAWER` for customer activity, internal activity, files, linked context, and audit without promoting contradictory panes.",
            landmarks=["CONTEXT_BAR", "DECISION_SUMMARY", "ACTION_STRIP", "DETAIL_DRAWER"],
            focus_order=["CONTEXT_BAR", "DECISION_SUMMARY", "ACTION_STRIP", "MODULE_PICKER", "THREAD_HISTORY", "COMPOSER", "ATTACHMENTS"],
            semantic_selector_set=LOW_NOISE_SELECTORS + COLLABORATION_SELECTORS + SHARED_CONTINUITY_SELECTORS,
            recovery_postures=SETTLEMENT_POSTURES,
            rebase_invalidation_reasons=[
                "workflow item no longer available",
                "access binding drift",
                "focus anchor remap failure",
                "stream compaction or schema incompatibility",
            ],
            external_handoff_rules=[
                "Authority and identity step-up flows must return to the same workflow item and module focus.",
                "Closing explicit support windows restores focus to the invoking control or nearest lawful ancestor heading.",
            ],
            responsive_collapse_rules=[
                "Desktop may show a vertical module picker, tablet collapses to a segmented control, and mobile gives the active module full width.",
                "Customer and internal activity threads never appear side by side on mobile.",
            ],
            source_refs=[
                ref(COLLABORATION, "3.2 Staff work item workspace", "Defines the same four-surface shell and module taxonomy."),
                ref(COLLABORATION, "11. Accessibility and responsive rules", "Defines keyboard order and breakpoint-specific module behavior."),
                ref(LOW_NOISE, "Settlement-state contract", "Defines settlement-aware inline feedback and no-safe-action posture."),
            ],
            notes="This route is the canonical staff collaboration workspace inside the calm shell.",
        ),
        make_route(
            shell_family="CALM_SHELL",
            route_id="calm_work_item_module",
            route_pattern="/work/items/{item_id}?module={module_code}",
            owning_object_family="WorkflowItem module focus",
            viewer_capability_profile="OPERATOR_COLLABORATION",
            required_stability_keys=CALM_STABILITY_KEYS + ["route_context.active_module_code", "route_context.return_focus_anchor_ref"],
            interaction_layer_contract="OperatorInteractionLayer",
            dominant_question="Which workflow module is in focus, and what action remains lawful from that focus?",
            dominant_action_policy="Deep-linking a module must not rewrite the dominant action; it only changes the promoted support context.",
            promoted_support_region_policy="Only the addressed module becomes the promoted support region, and it remains parent-bound to the workflow item shell.",
            landmarks=["CONTEXT_BAR", "DECISION_SUMMARY", "ACTION_STRIP", "DETAIL_DRAWER"],
            focus_order=["CONTEXT_BAR", "DECISION_SUMMARY", "ACTION_STRIP", "MODULE_PICKER", "ACTIVE_MODULE"],
            semantic_selector_set=LOW_NOISE_SELECTORS + COLLABORATION_SELECTORS + SHARED_CONTINUITY_SELECTORS,
            recovery_postures=SETTLEMENT_POSTURES,
            rebase_invalidation_reasons=[
                "module code no longer resolves",
                "focus anchor remap failure",
                "stream recovery rebase",
                "access drift",
            ],
            external_handoff_rules=[
                "External handoffs must preserve the active module code and return focus anchor.",
                "The workflow item remains the owning route even when module deep links are opened from notifications or manifest jumps.",
            ],
            responsive_collapse_rules=[
                "Keep the active module code mounted on tablet and mobile even when the module picker compacts.",
                "Never remap a module deep link into a different route family as a responsive workaround.",
            ],
            source_refs=[
                ref(COLLABORATION, "Route map", "Publishes the module deep-link grammar without leaving the SPA shell."),
                ref(FRONTEND_LAW, "2.2 Stable route keys", "The route context and focus anchors remain part of the stability contract."),
                ref(FOCUS_RESTORE, "Fallback order", "Module deep links still restore within the same governed object first."),
            ],
            notes="Module focus is route-stable state, not a permission to mount a separate collaboration shell.",
        ),
        make_route(
            shell_family="CLIENT_PORTAL_SHELL",
            route_id="portal_home",
            route_pattern="/portal",
            owning_object_family="ClientPortalWorkspace",
            viewer_capability_profile="CLIENT_SAFE",
            required_stability_keys=PORTAL_STABILITY_KEYS,
            interaction_layer_contract="PortalInteractionLayer",
            dominant_question="What is the client's current required next step?",
            dominant_action_policy="Exactly one dominant CTA stays inside `STATUS_HERO` with plain-language status copy.",
            promoted_support_region_policy="Keep help, history, and supplemental detail subordinate beneath the primary task surface.",
            landmarks=["PORTAL_HEADER", "STATUS_HERO", "TASK_QUEUE", "RECENT_ACTIVITY"],
            focus_order=["PORTAL_HEADER", "STATUS_HERO", "TASK_QUEUE", "RECENT_ACTIVITY"],
            semantic_selector_set=PORTAL_SELECTORS + SHARED_CONTINUITY_SELECTORS,
            recovery_postures=["PRESERVED", "INLINE_RECOVERY", "STALE_REVIEW_REQUIRED"],
            rebase_invalidation_reasons=[
                "request version drift",
                "artifact focus bucket mismatch",
                "access or delegated-identity drift",
                "latest portal object no longer matches cached route context",
            ],
            external_handoff_rules=[
                "Identity or authority browser handoff returns to the same portal route and focused request or approval.",
                "Delegated acting-for identity persists across refresh, reconnect, and external handoff boundaries.",
            ],
            responsive_collapse_rules=[
                "Keep the top-level tab selection, dominant CTA, and return focus when moving to narrow screens.",
                "Stack support below the primary task rather than splitting the shell into alternate mobile-only routes.",
            ],
            source_refs=[
                ref(PORTAL, "Navigation contract", "Defines the five-destination top-level portal navigation."),
                ref(PORTAL, "Home", "Defines the home route reading order."),
                ref(FRONTEND_LAW, "3.4 Responsive fallback", "Portal routes preserve semantic order before density."),
            ],
            notes="ASSUMPTION_PORTAL_HOME_CANONICAL_ROOT_ROUTE: the home route is normalized to the portal root path.",
        ),
        make_route(
            shell_family="CLIENT_PORTAL_SHELL",
            route_id="portal_documents",
            route_pattern="/portal/documents",
            owning_object_family="DocumentRequest workspace",
            viewer_capability_profile="CLIENT_SAFE",
            required_stability_keys=PORTAL_STABILITY_KEYS + ["upload_session_ref_or_null"],
            interaction_layer_contract="PortalInteractionLayer",
            dominant_question="What document or upload action must the client complete next?",
            dominant_action_policy="Upload affordances are frozen as browse, drag-drop, and camera capture; status phases remain explicit and typed.",
            promoted_support_region_policy="Keep upload help and history below or behind the primary upload workspace.",
            landmarks=["DOCUMENT_INBOX", "UPLOAD_PANEL", "UPLOAD_STATUS_LIST", "DOCUMENT_HISTORY"],
            focus_order=["DOCUMENT_INBOX", "UPLOAD_PANEL", "UPLOAD_STATUS_LIST", "DOCUMENT_HISTORY"],
            semantic_selector_set=PORTAL_SELECTORS + ["portal-current-artifact", "portal-history-list"] + SHARED_CONTINUITY_SELECTORS,
            recovery_postures=["PRESERVED", "INLINE_RECOVERY", "STALE_REVIEW_REQUIRED"],
            rebase_invalidation_reasons=[
                "upload session drift",
                "request version drift",
                "artifact handoff context invalid",
                "access scope drift",
            ],
            external_handoff_rules=[
                "External authority or identity steps return to the same upload session and request focus.",
                "Current and historical document artifacts remain separately addressable after recovery or reconnect.",
            ],
            responsive_collapse_rules=[
                "Resume the same upload session on reconnect in narrow layouts.",
                "Keep file type and size-limit guidance visible without introducing a second promoted support panel.",
            ],
            source_refs=[
                ref(PORTAL, "Documents", "Defines the documents route reading order and upload affordances."),
                ref(PORTAL, "Playwright validation minimum", "Requires reconnect-safe upload session continuation."),
                ref(FRONTEND_LAW, "2.2A Interaction-layer boundary", "Route continuity keeps the portal interaction-layer contract intact."),
            ],
            notes="Status phases remain `[TRANSFER, SCAN, VALIDATION, ACCEPTANCE, REJECTION, RETRY]` in user-visible order.",
        ),
        make_route(
            shell_family="CLIENT_PORTAL_SHELL",
            route_id="portal_approvals",
            route_pattern="/portal/approvals",
            owning_object_family="ApprovalPack workspace",
            viewer_capability_profile="CLIENT_SAFE",
            required_stability_keys=PORTAL_STABILITY_KEYS + ["approval_pack_hash"],
            interaction_layer_contract="PortalInteractionLayer",
            dominant_question="What approval decision does the client need to make right now?",
            dominant_action_policy="The signature or sign-off action remains the only dominant action and must never target a stale pack.",
            promoted_support_region_policy="Expose change digest and declaration detail as subordinate support around the sign-off posture.",
            landmarks=["APPROVAL_SUMMARY", "CHANGE_DIGEST", "DECLARATION_PANEL", "SIGN_OFF_PANEL"],
            focus_order=["APPROVAL_SUMMARY", "CHANGE_DIGEST", "DECLARATION_PANEL", "SIGN_OFF_PANEL"],
            semantic_selector_set=PORTAL_SELECTORS + ["portal-request-focus"] + SHARED_CONTINUITY_SELECTORS,
            recovery_postures=["PRESERVED", "INLINE_RECOVERY", "STALE_REVIEW_REQUIRED"],
            rebase_invalidation_reasons=[
                "approval pack hash drift",
                "stale approval payload",
                "delegated identity drift",
                "return focus anchor remap failure",
            ],
            external_handoff_rules=[
                "Signing or identity proof returns to the same approval and the same return path anchor.",
                "If the pack becomes stale, the route must redirect to the latest pack before signing instead of letting the old sign-off continue.",
            ],
            responsive_collapse_rules=[
                "Retain the approval route and return path on mobile rather than remapping to a separate signing surface.",
                "Keep change digest and declaration context available beneath the primary sign-off action.",
            ],
            source_refs=[
                ref(PORTAL, "Approvals", "Defines the approvals route reading order."),
                ref(PORTAL, "Playwright validation minimum", "Requires stale approval rerouting before signing."),
                ref(FRONTEND_LAW, "4.2 No contradictory writable posture", "Writable posture cannot conflict with the current legal approval state."),
            ],
            notes="Approval routes inherit the portal language contract and must stay client-safe under all recovery postures.",
        ),
        make_route(
            shell_family="CLIENT_PORTAL_SHELL",
            route_id="portal_onboarding",
            route_pattern="/portal/onboarding",
            owning_object_family="Client onboarding flow",
            viewer_capability_profile="CLIENT_SAFE",
            required_stability_keys=PORTAL_STABILITY_KEYS + ["step_id", "return_focus_anchor_ref_or_null"],
            interaction_layer_contract="PortalInteractionLayer",
            dominant_question="What onboarding step must the client complete next?",
            dominant_action_policy="The stepper workspace exposes only the next lawful onboarding action and omits inactive destinations.",
            promoted_support_region_policy="Keep support content subordinate to the active step workspace unless the user enters Help.",
            landmarks=["WELCOME_PANEL", "ONBOARDING_STEPPER", "STEP_WORKSPACE", "SUPPORT_PANEL"],
            focus_order=["WELCOME_PANEL", "ONBOARDING_STEPPER", "STEP_WORKSPACE", "SUPPORT_PANEL"],
            semantic_selector_set=PORTAL_SELECTORS + SHARED_CONTINUITY_SELECTORS,
            recovery_postures=["PRESERVED", "INLINE_RECOVERY", "STALE_REVIEW_REQUIRED"],
            rebase_invalidation_reasons=[
                "step no longer active",
                "delegated identity drift",
                "route context return mismatch",
                "request version drift",
            ],
            external_handoff_rules=[
                "Identity proof or authority interactions return to the active onboarding step and its focus anchor.",
                "Inactive onboarding navigation destinations remain omitted rather than disabled after recovery.",
            ],
            responsive_collapse_rules=[
                "Keep the stepper visible before secondary help content when compacting.",
                "Retain the same shell and return path across stacked narrow-screen layouts.",
            ],
            source_refs=[
                ref(PORTAL, "Onboarding", "Defines onboarding reading order."),
                ref(PORTAL, "Navigation contract", "Top-level destinations are omitted when inactive."),
                ref(FRONTEND_LAW, "3.1 One dominant question, one dominant action", "Each route retains a single dominant task."),
            ],
            notes="Onboarding remains a top-level route only while active and never becomes a permanent sixth portal destination.",
        ),
        make_route(
            shell_family="CLIENT_PORTAL_SHELL",
            route_id="portal_help",
            route_pattern="/portal/help",
            owning_object_family="Client help workspace",
            viewer_capability_profile="CLIENT_SAFE",
            required_stability_keys=PORTAL_STABILITY_KEYS + ["case_context_ref_or_null"],
            interaction_layer_contract="PortalInteractionLayer",
            dominant_question="Which help path or support handoff best resolves the client's current blocker?",
            dominant_action_policy="The dominant action routes into the most relevant help option while keeping case context visible and client-safe.",
            promoted_support_region_policy="Help may devote the primary workspace to support choice and case context, but it still avoids contradictory competing panels.",
            landmarks=["HELP_OPTIONS", "TOP_QUESTIONS", "CASE_CONTEXT_PANEL"],
            focus_order=["HELP_OPTIONS", "TOP_QUESTIONS", "CASE_CONTEXT_PANEL"],
            semantic_selector_set=PORTAL_SELECTORS + SHARED_CONTINUITY_SELECTORS,
            recovery_postures=["PRESERVED", "INLINE_RECOVERY", "STALE_REVIEW_REQUIRED"],
            rebase_invalidation_reasons=[
                "case context no longer resolves",
                "delegated identity drift",
                "focus anchor remap failure",
            ],
            external_handoff_rules=[
                "Returning from external help or authority flows restores the same case context and support option selection.",
                "Help never leaks internal lifecycle, escalation, or audit-only objects into the customer shell.",
            ],
            responsive_collapse_rules=[
                "Keep help option hierarchy ahead of deep supporting context on narrow screens.",
                "Case context remains visible but subordinate to the help choice hierarchy.",
            ],
            source_refs=[
                ref(PORTAL, "Help", "Defines the help route reading order."),
                ref(FRONTEND_LAW, "1.2 Same object, same shell", "Client help remains owned by the portal shell family."),
                ref(PORTAL, "Contextual request-detail routes", "Portal detail views must avoid internal audit leakage."),
            ],
            notes="Help is the only route where support content is allowed to dominate the shell without becoming a different shell family.",
        ),
        make_route(
            shell_family="CLIENT_PORTAL_SHELL",
            route_id="portal_request_detail",
            route_pattern="/portal/requests/{item_id}",
            owning_object_family="Customer request workspace",
            viewer_capability_profile="CLIENT_SAFE",
            required_stability_keys=PORTAL_STABILITY_KEYS + ["route_context.return_focus_anchor_ref_or_null", "focus_restoration"],
            interaction_layer_contract="PortalInteractionLayer",
            dominant_question="What request-specific action, artifact, or clarification should the client address next?",
            dominant_action_policy="The request detail route stays contextual: the parent tab remains active and the dominant action remains tied to the request focus, not to hidden internal state.",
            promoted_support_region_policy="Keep exactly one promoted support region and preserve the explicit return path to the parent tab.",
            landmarks=["PORTAL_HEADER", "STATUS_HERO", "REQUEST_WORKSPACE", "REQUEST_SUPPORT"],
            focus_order=["PORTAL_HEADER", "STATUS_HERO", "REQUEST_WORKSPACE", "REQUEST_SUPPORT"],
            semantic_selector_set=PORTAL_SELECTORS + SHARED_CONTINUITY_SELECTORS,
            recovery_postures=["PRESERVED", "INLINE_RECOVERY", "STALE_REVIEW_REQUIRED"],
            rebase_invalidation_reasons=[
                "request version drift",
                "notification target no longer exists",
                "focus restoration remap failure",
                "return path no longer lawful",
            ],
            external_handoff_rules=[
                "Notification deep links restore request focus and explicit return-path control.",
                "Identity and authority browser handoff returns to the same request route, focus anchor, and parent tab state.",
            ],
            responsive_collapse_rules=[
                "Narrow-screen recovery keeps the same parent tab, request focus, and return path.",
                "No portal detail route is allowed to leak internal assignee, escalation, or audit posture as a compaction shortcut.",
            ],
            source_refs=[
                ref(PORTAL, "Contextual request-detail routes", "Defines request detail as contextual, same-shell detail rather than a new top-level destination."),
                ref(PORTAL, "Playwright validation minimum", "Requires notification deep-link restoration with preserved return path."),
                ref(FRONTEND_LAW, "2.4 Back/return behavior", "Back navigation preserves filters, selection, and focus."),
            ],
            notes="This route is contextual detail, not a sixth permanent top-level destination.",
        ),
        make_route(
            shell_family="GOVERNANCE_DENSITY_SHELL",
            route_id="governance_overview",
            route_pattern="/governance",
            owning_object_family="TenantGovernanceSnapshot",
            viewer_capability_profile="GOVERNANCE_OPERATOR",
            required_stability_keys=GOVERNANCE_STABILITY_KEYS,
            interaction_layer_contract="GovernanceInteractionLayer",
            dominant_question="Which governance risk, configuration drift, or policy task requires attention first?",
            dominant_action_policy="Promote one attention summary and worklist action at a time even when multiple structural regions are visible.",
            promoted_support_region_policy="Keep a single promoted auxiliary surface by default while preserving inventory and audit context.",
            landmarks=["GOVERNANCE_CONTEXT_BAR", "INVENTORY_RAIL", "WORKSPACE_CANVAS", "AUDIT_SIDECAR"],
            focus_order=["GOVERNANCE_CONTEXT_BAR", "INVENTORY_RAIL", "OVERVIEW_ATTENTION_SUMMARY", "WORKSPACE_CANVAS", "AUDIT_SIDECAR"],
            semantic_selector_set=GOVERNANCE_SELECTORS + SHARED_CONTINUITY_SELECTORS,
            recovery_postures=["PRESERVED", "INLINE_TYPED_CONTEXTUAL_RECOVERY", "REBASE_REQUIRED"],
            rebase_invalidation_reasons=[
                "policy snapshot hash drift",
                "selected object no longer resolves",
                "access scope drift",
                "active filter grammar mismatch",
            ],
            external_handoff_rules=[
                "Step-up or export actions must return to the same filtered worklist and selected object.",
                "Governance overview receipts and problem notices stay inline and context-bound instead of launching separate status shells.",
            ],
            responsive_collapse_rules=[
                "At >=1440px the shell may show all structural regions; below that, the audit sidecar redocks before the workspace canvas changes semantic order.",
                "Narrow layouts preserve selected object, dominant question, active filters, and promoted sidecar mode.",
            ],
            source_refs=[
                ref(GOVERNANCE, "4.1 /governance", "Defines the overview layout and attention summary."),
                ref(FRONTEND_LAW, "3.3 Shell-family topology", "Defines one promoted support region by default in governance routes."),
                ref(GOVERNANCE, "8. Accessibility and responsive requirements", "Defines breakpoint-specific redocking behavior."),
            ],
            notes="The overview route is the densest browser shell but still obeys one dominant question and one promoted auxiliary surface.",
        ),
        make_route(
            shell_family="GOVERNANCE_DENSITY_SHELL",
            route_id="governance_tenant",
            route_pattern="/governance/tenant",
            owning_object_family="Tenant configuration workspace",
            viewer_capability_profile="GOVERNANCE_OPERATOR",
            required_stability_keys=GOVERNANCE_STABILITY_KEYS + ["change_basket_ref_or_null", "approval_requirement_snapshot"],
            interaction_layer_contract="GovernanceInteractionLayer",
            dominant_question="What tenant configuration change is being staged, and what blast radius does it carry?",
            dominant_action_policy="Mutation is diff-first: configuration changes stage into a basket with explicit blast-radius and approval communication before submission.",
            promoted_support_region_policy="Use inline policy help and blast-radius detail as a single promoted auxiliary cluster around the main configuration workspace.",
            landmarks=["SECTION_NAV", "CONFIG_FORM", "INLINE_POLICY_HELP", "BLAST_RADIUS_PANEL", "CHANGE_BASKET", "APPROVAL_COMPOSER", "CONFIG_HISTORY_TIMELINE"],
            focus_order=["SECTION_NAV", "CONFIG_FORM", "INLINE_POLICY_HELP", "BLAST_RADIUS_PANEL", "CHANGE_BASKET", "APPROVAL_COMPOSER", "CONFIG_HISTORY_TIMELINE"],
            semantic_selector_set=GOVERNANCE_SELECTORS + SHARED_CONTINUITY_SELECTORS,
            recovery_postures=["PRESERVED", "INLINE_TYPED_CONTEXTUAL_RECOVERY", "REBASE_REQUIRED"],
            rebase_invalidation_reasons=[
                "policy snapshot hash drift",
                "change basket invalidated by new policy basis",
                "approval requirement drift",
                "access scope change",
            ],
            external_handoff_rules=[
                "Approval or step-up flows must restore the same staged diff, rationale text, and blast-radius context.",
                "Receipts and failures stay tied to the configuration workspace rather than appearing as detached status views.",
            ],
            responsive_collapse_rules=[
                "Standard desktop and tablet keep the configuration workspace primary while collapsing auxiliary surfaces into drawers or tabs.",
                "Narrow layouts preserve change basket, approval composer, rationale text, and filters.",
            ],
            source_refs=[
                ref(GOVERNANCE, "4.2 /governance/tenant", "Defines the tenant route semantic reading order."),
                ref(GOVERNANCE, "9. Validation plan", "Requires blast-radius communication and approval requirements."),
                ref(FRONTEND_LAW, "4.1 Dominant-action law", "Mutation routes still keep one dominant action and avoid contradictory writable posture."),
            ],
            notes="Tenant mutation routes are governed by diff-first staging and never bypass the change basket or approval composer.",
        ),
        make_route(
            shell_family="GOVERNANCE_DENSITY_SHELL",
            route_id="governance_access_principals",
            route_pattern="/governance/access/principals",
            owning_object_family="Principal directory workspace",
            viewer_capability_profile="GOVERNANCE_OPERATOR",
            required_stability_keys=GOVERNANCE_STABILITY_KEYS + ["selected_principal_ref_or_null"],
            interaction_layer_contract="GovernanceInteractionLayer",
            dominant_question="Which principal's effective access posture requires review or change?",
            dominant_action_policy="Directory selection and effective access inspection drive the next action; simulation and authority chains remain support surfaces.",
            promoted_support_region_policy="Keep one promoted auxiliary surface around the principal workspace even when the simulator is available.",
            landmarks=["PRINCIPAL_DIRECTORY", "WORKSPACE_CANVAS", "ACCESS_INSPECTOR", "AUTHORITY_CHAIN_PANEL", "POLICY_SIMULATOR"],
            focus_order=["PRINCIPAL_DIRECTORY", "WORKSPACE_CANVAS", "ACCESS_INSPECTOR", "AUTHORITY_CHAIN_PANEL", "POLICY_SIMULATOR"],
            semantic_selector_set=GOVERNANCE_SELECTORS + SHARED_CONTINUITY_SELECTORS,
            recovery_postures=["PRESERVED", "INLINE_TYPED_CONTEXTUAL_RECOVERY", "REBASE_REQUIRED"],
            rebase_invalidation_reasons=[
                "selected principal no longer resolves",
                "role matrix drift",
                "policy simulator basis mismatch",
                "access scope drift",
            ],
            external_handoff_rules=[
                "Step-up flows return to the same principal selection, filter slice, and simulator context.",
                "Receipts must explain typed outcomes such as `ALLOW_MASKED` without dropping the current inspection context.",
            ],
            responsive_collapse_rules=[
                "Collapse auxiliary access panels before collapsing the primary principal directory.",
                "Preserve roving selection and the selected principal across breakpoint changes.",
            ],
            source_refs=[
                ref(GOVERNANCE, "4.3 /governance/access", "Defines the access and roles route family."),
                ref(FRONTEND_LAW, "3.3 Shell-family topology", "Governs the semantic order for governance access routes."),
                ref(GOVERNANCE, "9. Validation plan", "Requires explaining `ALLOW_MASKED` in the access simulation flow."),
            ],
            notes="Access routes share the same semantic order even as principals, roles, and simulator contexts vary.",
        ),
        make_route(
            shell_family="GOVERNANCE_DENSITY_SHELL",
            route_id="governance_access_roles",
            route_pattern="/governance/access/roles",
            owning_object_family="Role matrix workspace",
            viewer_capability_profile="GOVERNANCE_OPERATOR",
            required_stability_keys=GOVERNANCE_STABILITY_KEYS + ["selected_role_ref_or_null", "diff_basket_ref_or_null"],
            interaction_layer_contract="GovernanceInteractionLayer",
            dominant_question="What role policy or matrix change is under review?",
            dominant_action_policy="Role matrix diffs and staged changes lead the route; the authority chain and simulator remain auxiliary.",
            promoted_support_region_policy="Only one auxiliary surface is promoted while role diffs and rationale remain visible.",
            landmarks=["PRINCIPAL_DIRECTORY", "WORKSPACE_CANVAS", "ACCESS_INSPECTOR", "AUTHORITY_CHAIN_PANEL", "POLICY_SIMULATOR"],
            focus_order=["PRINCIPAL_DIRECTORY", "WORKSPACE_CANVAS", "ACCESS_INSPECTOR", "AUTHORITY_CHAIN_PANEL", "POLICY_SIMULATOR"],
            semantic_selector_set=GOVERNANCE_SELECTORS + SHARED_CONTINUITY_SELECTORS,
            recovery_postures=["PRESERVED", "INLINE_TYPED_CONTEXTUAL_RECOVERY", "REBASE_REQUIRED"],
            rebase_invalidation_reasons=[
                "selected role no longer resolves",
                "diff basket invalidated",
                "policy simulator basis mismatch",
                "filter slice drift",
            ],
            external_handoff_rules=[
                "Role-matrix diff and rationale must survive step-up and return intact.",
                "Role edits return to the same matrix slice and preserve the authoritative diff basket.",
            ],
            responsive_collapse_rules=[
                "Preserve diff context and staged rationale through compaction.",
                "Redock the auxiliary surface before collapsing the primary matrix workspace.",
            ],
            source_refs=[
                ref(GOVERNANCE, "4.3 /governance/access", "Roles are part of the access route family."),
                ref(GOVERNANCE, "9. Validation plan", "Role matrix diffs must survive step-up."),
                ref(FRONTEND_LAW, "2.2 Stable route keys", "Governance routes preserve filter chips and focus anchors as stability keys."),
            ],
            notes="ASSUMPTION_ROLE_DETAIL_WITHIN_ROLES_ROUTE_FAMILY: role detail overlays remain governed by the `/governance/access/roles` route family.",
        ),
        make_route(
            shell_family="GOVERNANCE_DENSITY_SHELL",
            route_id="governance_access_simulator",
            route_pattern="/governance/access/simulator",
            owning_object_family="Policy simulation workspace",
            viewer_capability_profile="GOVERNANCE_OPERATOR",
            required_stability_keys=GOVERNANCE_STABILITY_KEYS + ["simulation_basis_hash"],
            interaction_layer_contract="GovernanceInteractionLayer",
            dominant_question="How would the current policy basis evaluate a governed access request?",
            dominant_action_policy="The simulation result and explanation lead the route; edits remain staged and contextual.",
            promoted_support_region_policy="Use a single promoted support surface to show authority chains or matrix detail around the simulator.",
            landmarks=["PRINCIPAL_DIRECTORY", "WORKSPACE_CANVAS", "ACCESS_INSPECTOR", "AUTHORITY_CHAIN_PANEL", "POLICY_SIMULATOR"],
            focus_order=["PRINCIPAL_DIRECTORY", "WORKSPACE_CANVAS", "ACCESS_INSPECTOR", "AUTHORITY_CHAIN_PANEL", "POLICY_SIMULATOR"],
            semantic_selector_set=GOVERNANCE_SELECTORS + SHARED_CONTINUITY_SELECTORS,
            recovery_postures=["PRESERVED", "INLINE_TYPED_CONTEXTUAL_RECOVERY", "REBASE_REQUIRED"],
            rebase_invalidation_reasons=[
                "simulation basis hash drift",
                "principal or role selection drift",
                "policy snapshot mismatch",
                "access scope drift",
            ],
            external_handoff_rules=[
                "Return from step-up to the same simulator inputs and explanation panel.",
                "Simulation outcomes remain typed and inline rather than redirecting to detached receipts.",
            ],
            responsive_collapse_rules=[
                "Keep simulator inputs and explanation visible in semantic order when compacting.",
                "Collapse authority-chain support before the simulator core.",
            ],
            source_refs=[
                ref(GOVERNANCE, "4.3 /governance/access", "The simulator belongs to the access route family."),
                ref(GOVERNANCE, "9. Validation plan", "Requires typed `ALLOW_MASKED` explanation in the simulator flow."),
                ref(CROSS_SHELL, "GOVERNANCE_DENSITY_SHELL", "The governance interaction layer defines the support-surface and selector policies."),
            ],
            notes="The simulator is a governance route, not a detached tool; it inherits the same selector and continuity contracts.",
        ),
        make_route(
            shell_family="GOVERNANCE_DENSITY_SHELL",
            route_id="governance_authority_links",
            route_pattern="/governance/authority-links",
            owning_object_family="AuthorityLink workspace",
            viewer_capability_profile="GOVERNANCE_OPERATOR",
            required_stability_keys=GOVERNANCE_STABILITY_KEYS + ["selected_authority_link_ref_or_null"],
            interaction_layer_contract="GovernanceInteractionLayer",
            dominant_question="Which authority binding or handshake posture requires intervention?",
            dominant_action_policy="Identity, binding health, and preflight readiness surface the next action; mismatch, delegation gap, and environment drift remain first-class status surfaces.",
            promoted_support_region_policy="One auxiliary surface at a time around the workspace canvas and audit sidecar.",
            landmarks=["INVENTORY_RAIL", "WORKSPACE_CANVAS", "AUDIT_SIDECAR"],
            focus_order=["INVENTORY_RAIL", "WORKSPACE_CANVAS", "AUDIT_SIDECAR"],
            semantic_selector_set=GOVERNANCE_SELECTORS + SHARED_CONTINUITY_SELECTORS,
            recovery_postures=["PRESERVED", "INLINE_TYPED_CONTEXTUAL_RECOVERY", "REBASE_REQUIRED"],
            rebase_invalidation_reasons=[
                "authority link no longer resolves",
                "binding health timeline drift",
                "environment mismatch or delegation-gap state change",
                "filter slice drift",
            ],
            external_handoff_rules=[
                "External authority review flows return to the same link detail and preflight context.",
                "Mismatch, delegation gap, and environment drift remain typed inline statuses after restoration.",
            ],
            responsive_collapse_rules=[
                "Collapse the audit sidecar before changing the identity and health timeline order.",
                "Preserve the selected authority link and current preflight checklist state across breakpoint changes.",
            ],
            source_refs=[
                ref(GOVERNANCE, "4.4 /governance/authority-links", "Defines the authority links route and workspace module order."),
                ref(FRONTEND_LAW, "3.3 Shell-family topology", "Governance auxiliary surfaces remain support-only by default."),
                ref(GOVERNANCE, "9. Validation plan", "Requires mismatch, delegation gap, and environment drift to remain distinct surfaces."),
            ],
            notes="Authority links are a governance shell route even though they visualize external-authority posture.",
        ),
        make_route(
            shell_family="GOVERNANCE_DENSITY_SHELL",
            route_id="governance_retention_policies",
            route_pattern="/governance/retention/policies",
            owning_object_family="Retention policy workspace",
            viewer_capability_profile="GOVERNANCE_OPERATOR",
            required_stability_keys=GOVERNANCE_STABILITY_KEYS + ["selected_retention_policy_ref_or_null"],
            interaction_layer_contract="GovernanceInteractionLayer",
            dominant_question="Which retention policy requires review or change?",
            dominant_action_policy="Policy selection and its blast radius lead the route; approvals remain explicit and staged.",
            promoted_support_region_policy="Use one promoted auxiliary surface for policy impact, diff, or approval context.",
            landmarks=["SECTION_NAV", "RETENTION_POLICY_MATRIX", "CHANGE_BASKET", "APPROVAL_COMPOSER", "GOVERNANCE_SUPPORT_SIDECAR"],
            focus_order=["SECTION_NAV", "RETENTION_POLICY_MATRIX", "CHANGE_BASKET", "APPROVAL_COMPOSER", "GOVERNANCE_SUPPORT_SIDECAR"],
            semantic_selector_set=GOVERNANCE_SELECTORS + SHARED_CONTINUITY_SELECTORS,
            recovery_postures=["PRESERVED", "INLINE_TYPED_CONTEXTUAL_RECOVERY", "REBASE_REQUIRED"],
            rebase_invalidation_reasons=[
                "retention policy basis drift",
                "change basket invalidated",
                "approval requirement drift",
                "filter slice mismatch",
            ],
            external_handoff_rules=[
                "Approval or export flows return to the same policy slice, change basket, and rationale.",
                "Receipts stay attached to the retention policy workspace rather than redirecting away from the selected policy.",
            ],
            responsive_collapse_rules=[
                "Redock auxiliary support before changing the semantic order of policy matrix and approval composer.",
                "Keep selected policy, filters, and approval state through narrow-screen compaction.",
            ],
            source_refs=[
                ref(GOVERNANCE, "4.5 /governance/retention", "Enumerates the retention policy route family."),
                ref(FRONTEND_LAW, "3.3 Shell-family topology", "Shared governance topology governs support promotion."),
                ref(GOVERNANCE, "8. Accessibility and responsive requirements", "Governance breakpoint rules preserve object selection and filters."),
            ],
            notes="ASSUMPTION_RETENTION_ROUTE_FOCUS_ORDER_NORMALIZATION applies to the retention policy landmark order.",
        ),
        make_route(
            shell_family="GOVERNANCE_DENSITY_SHELL",
            route_id="governance_retention_legal_holds",
            route_pattern="/governance/retention/legal-holds",
            owning_object_family="Legal hold workspace",
            viewer_capability_profile="GOVERNANCE_OPERATOR",
            required_stability_keys=GOVERNANCE_STABILITY_KEYS + ["selected_legal_hold_ref_or_null"],
            interaction_layer_contract="GovernanceInteractionLayer",
            dominant_question="Which legal hold requires action, review, or release?",
            dominant_action_policy="Hold selection and typed hold posture lead the route; auxiliary evidence and approval remain staged support.",
            promoted_support_region_policy="One promoted auxiliary surface around the legal-hold register and current hold workspace.",
            landmarks=["SECTION_NAV", "LEGAL_HOLD_REGISTER", "WORKSPACE_CANVAS", "APPROVAL_COMPOSER", "GOVERNANCE_SUPPORT_SIDECAR"],
            focus_order=["SECTION_NAV", "LEGAL_HOLD_REGISTER", "WORKSPACE_CANVAS", "APPROVAL_COMPOSER", "GOVERNANCE_SUPPORT_SIDECAR"],
            semantic_selector_set=GOVERNANCE_SELECTORS + SHARED_CONTINUITY_SELECTORS,
            recovery_postures=["PRESERVED", "INLINE_TYPED_CONTEXTUAL_RECOVERY", "REBASE_REQUIRED"],
            rebase_invalidation_reasons=[
                "selected legal hold no longer resolves",
                "hold status drift",
                "approval requirement change",
                "filter slice drift",
            ],
            external_handoff_rules=[
                "Approval or export flows return to the same legal-hold register entry and hold detail focus.",
                "Inline notices must preserve the hold context and selected object anchor after recovery.",
            ],
            responsive_collapse_rules=[
                "Preserve the selected legal hold and current hold detail when redocking the auxiliary surface.",
                "Collapse the sidecar before the legal-hold register or workspace body.",
            ],
            source_refs=[
                ref(GOVERNANCE, "4.5 /governance/retention", "Enumerates legal-hold routes within the retention family."),
                ref(GOVERNANCE, "10. Minimum semantic selectors", "Defines `legal-hold-register` as a required semantic anchor."),
                ref(FRONTEND_LAW, "2.4 Back/return behavior", "Return behavior still preserves lawful selection and focus."),
            ],
            notes="ASSUMPTION_RETENTION_ROUTE_FOCUS_ORDER_NORMALIZATION applies to the legal-hold route as well.",
        ),
        make_route(
            shell_family="GOVERNANCE_DENSITY_SHELL",
            route_id="governance_retention_erasure",
            route_pattern="/governance/retention/erasure",
            owning_object_family="Erasure workspace",
            viewer_capability_profile="GOVERNANCE_OPERATOR",
            required_stability_keys=GOVERNANCE_STABILITY_KEYS + ["selected_erasure_case_ref_or_null"],
            interaction_layer_contract="GovernanceInteractionLayer",
            dominant_question="Which erasure request or exception posture needs resolution?",
            dominant_action_policy="The selected erasure case and its approval posture lead the route; blast radius and supporting context remain explicit support.",
            promoted_support_region_policy="Keep exactly one promoted auxiliary surface around the erasure workspace.",
            landmarks=["SECTION_NAV", "ERASURE_WORKSPACE", "BLAST_RADIUS_PANEL", "APPROVAL_COMPOSER", "GOVERNANCE_SUPPORT_SIDECAR"],
            focus_order=["SECTION_NAV", "ERASURE_WORKSPACE", "BLAST_RADIUS_PANEL", "APPROVAL_COMPOSER", "GOVERNANCE_SUPPORT_SIDECAR"],
            semantic_selector_set=GOVERNANCE_SELECTORS + SHARED_CONTINUITY_SELECTORS,
            recovery_postures=["PRESERVED", "INLINE_TYPED_CONTEXTUAL_RECOVERY", "REBASE_REQUIRED"],
            rebase_invalidation_reasons=[
                "selected erasure case drift",
                "policy snapshot mismatch",
                "approval or blast-radius basis drift",
                "filter slice drift",
            ],
            external_handoff_rules=[
                "Approval and export flows return to the same erasure case, blast-radius context, and rationale anchor.",
                "Problem notices remain typed and inline to the erasure workspace rather than remounting the route elsewhere.",
            ],
            responsive_collapse_rules=[
                "Keep the selected erasure case and approval state stable while redocking support.",
                "Collapse auxiliary surfaces before the core erasure workspace.",
            ],
            source_refs=[
                ref(GOVERNANCE, "4.5 /governance/retention", "Enumerates the erasure route within the retention family."),
                ref(FRONTEND_LAW, "3.1 One dominant question, one dominant action", "Even dense governance routes preserve a single dominant task."),
                ref(GOVERNANCE, "8. Accessibility and responsive requirements", "Governance routes preserve selected object and dominant question across breakpoints."),
            ],
            notes="ASSUMPTION_RETENTION_ROUTE_FOCUS_ORDER_NORMALIZATION applies to the erasure route focus order.",
        ),
        make_route(
            shell_family="GOVERNANCE_DENSITY_SHELL",
            route_id="governance_audit",
            route_pattern="/governance/audit",
            owning_object_family="Audit workbench",
            viewer_capability_profile="GOVERNANCE_OPERATOR",
            required_stability_keys=GOVERNANCE_STABILITY_KEYS + ["selected_event_ref_or_null", "comparison_basis_hash_or_null"],
            interaction_layer_contract="GovernanceInteractionLayer",
            dominant_question="Which audit event, diff, or neighborhood comparison needs investigation?",
            dominant_action_policy="Audit tape selection drives the route; contextual diff and object neighborhood remain promoted support without becoming a second dominant workflow.",
            promoted_support_region_policy="One promoted auxiliary surface around the event diff inspector and sidecar.",
            landmarks=["INVENTORY_RAIL", "WORKSPACE_CANVAS", "EVENT_DIFF_INSPECTOR", "AUDIT_SIDECAR"],
            focus_order=["INVENTORY_RAIL", "WORKSPACE_CANVAS", "EVENT_DIFF_INSPECTOR", "AUDIT_SIDECAR"],
            semantic_selector_set=GOVERNANCE_SELECTORS + SHARED_CONTINUITY_SELECTORS,
            recovery_postures=["PRESERVED", "INLINE_TYPED_CONTEXTUAL_RECOVERY", "REBASE_REQUIRED"],
            rebase_invalidation_reasons=[
                "selected audit event no longer resolves",
                "comparison basis drift",
                "filter grammar mismatch",
                "access scope drift",
            ],
            external_handoff_rules=[
                "Detached audit compare windows remain parent-bound support and restore focus to the invoking audit anchor.",
                "Return from step-up or export preserves the selected event, comparison basis, and active audit slice.",
            ],
            responsive_collapse_rules=[
                "Redock the audit sidecar before changing the order of tape, workspace, and diff inspector.",
                "Preserve selected event and comparison basis through breakpoint changes.",
            ],
            source_refs=[
                ref(GOVERNANCE, "4.6 /governance/audit", "Defines the audit route semantic reading order and module order."),
                ref(NATIVE_BLUEPRINT, "Secondary windows", "Native compare and audit windows remain parent-bound support windows."),
                ref(FRONTEND_LAW, "2.4 Back/return behavior", "Audit return paths preserve focus and selection."),
            ],
            notes="Audit routes may launch explicit compare or review windows, but those windows remain overlays on the governance shell rather than separate shells.",
        ),
    ]


def build_interaction_layer_foundation_map() -> dict[str, Any]:
    return {
        "shell_foundations": [
            {
                "shell_family": "CALM_SHELL",
                "interaction_layer_contract": "OperatorInteractionLayer",
                "design_tokens": {
                    "layout_density_token": "CALM_FOUR_SURFACE_DENSITY_V1",
                    "surface_spacing_token": "CALM_FOUR_SURFACE_SPACING_V1",
                    "support_surface_spacing_token": "CALM_DETAIL_DRAWER_SUPPORT_SPACING_V1",
                    "responsive_compaction_token": "CALM_SUPPORT_REDOCK_V1",
                },
                "behavior_contract": {
                    "selector_profile": "OPERATOR_SEMANTIC_SELECTORS_V1",
                    "continuity_policy": "SAME_OBJECT_SAME_SHELL_INLINE_RECOVERY",
                    "recovery_surface_policy": "INLINE_EXPLICIT_REBASE",
                    "history_presentation_policy": "CURRENT_PRIMARY_HISTORY_SECONDARY",
                    "preview_surface_policy": "DETAIL_DRAWER_OR_PARENT_BOUND_SECONDARY_WINDOW",
                    "notification_surface_policy": "CONTEXT_BOUND_INLINE_FEEDBACK_OR_PARENT_MIRROR",
                    "secondary_window_policy": "SUPPORT_ONLY_PARENT_BOUND_CLOSE_RETURNS_FOCUS",
                },
                "source_refs": [
                    ref(CROSS_SHELL, "CALM_SHELL", "Maps calm-shell design tokens and behavior policies."),
                    ref(LOW_NOISE, "Operator interaction layer", "Freezes operator-specific interaction policies and notification surfaces."),
                ],
            },
            {
                "shell_family": "CLIENT_PORTAL_SHELL",
                "interaction_layer_contract": "PortalInteractionLayer",
                "design_tokens": {
                    "layout_density_token": "PORTAL_COMFORTABLE_TASK_DENSITY_V1",
                    "surface_spacing_token": "PORTAL_PRIMARY_STACK_SPACING_V1",
                    "support_surface_spacing_token": "PORTAL_INLINE_SUPPORT_SPACING_V1",
                    "responsive_compaction_token": "PORTAL_STACK_BELOW_PRIMARY_V1",
                },
                "behavior_contract": {
                    "selector_profile": "PORTAL_SEMANTIC_SELECTORS_V1",
                    "continuity_policy": "SAME_SHELL_CONTEXTUAL_RETURN",
                    "recovery_surface_policy": "INLINE_REVIEW_OR_RECOVERY_NOTICE",
                    "history_presentation_policy": "CURRENT_PRIMARY_HISTORY_SECONDARY",
                    "preview_surface_policy": "PRIMARY_CONTEXT_WITH_STACKED_SUPPORT",
                    "notification_surface_policy": "CONTEXT_BOUND_INLINE_FEEDBACK",
                    "secondary_window_policy": "NOT_APPLICABLE",
                },
                "source_refs": [
                    ref(CROSS_SHELL, "CLIENT_PORTAL_SHELL", "Maps portal design tokens and behavior policies."),
                    ref(PORTAL, "Shell continuity, support budget, and constrained layouts", "Defines the portal interaction layer and support-region law."),
                ],
            },
            {
                "shell_family": "GOVERNANCE_DENSITY_SHELL",
                "interaction_layer_contract": "GovernanceInteractionLayer",
                "design_tokens": {
                    "layout_density_token": "GOVERNANCE_WORKSPACE_DENSITY_V1",
                    "surface_spacing_token": "GOVERNANCE_CANVAS_SPACING_V1",
                    "support_surface_spacing_token": "GOVERNANCE_AUXILIARY_SURFACE_SPACING_V1",
                    "responsive_compaction_token": "GOVERNANCE_AUXILIARY_REDOCK_V1",
                },
                "behavior_contract": {
                    "selector_profile": "GOVERNANCE_SEMANTIC_SELECTORS_V1",
                    "continuity_policy": "SAME_OBJECT_SAME_SHELL_CONTEXT_RETENTION",
                    "recovery_surface_policy": "INLINE_TYPED_CONTEXTUAL_RECOVERY",
                    "history_presentation_policy": "ACTIVE_SLICE_PRIMARY_CONTEXTUAL_HISTORY",
                    "preview_surface_policy": "AUXILIARY_SURFACE_CONTEXTUAL_ONLY",
                    "notification_surface_policy": "CONTEXT_BOUND_INLINE_FEEDBACK",
                    "secondary_window_policy": "NOT_APPLICABLE",
                },
                "source_refs": [
                    ref(CROSS_SHELL, "GOVERNANCE_DENSITY_SHELL", "Maps governance design tokens and behavior policies."),
                    ref(GOVERNANCE, "6.7 Governance interaction layer", "Defines governance interaction-layer invariants and preserved context."),
                ],
            },
        ],
        "native_overlays": [
            {
                "overlay_id": "native_primary_operator_scene",
                "surface_embodiment": "NATIVE_OPERATOR",
                "inherits_shell_family": "CALM_SHELL",
                "scene_type": "NativeOperatorWorkspaceScene",
                "scene_order": ["LEADING_SIDEBAR", "PRIMARY_CANVAS", "TRAILING_INSPECTOR"],
                "continuity_rules": [
                    "The native primary workspace keeps the same dominant question, same object continuity, and the same settlement posture as the calm shell.",
                    "Mutation-capable affordances downgrade inline whenever recovery posture is non-`NONE`.",
                ],
                "source_refs": [
                    ref(NATIVE_BLUEPRINT, "Primary workspace window", "Defines the primary native scene regions and calm-shell inheritance."),
                    ref(FRONTEND_LAW, "1.1 Canonical shell families", "Native scenes are embodiments of canonical shell families."),
                ],
            },
            {
                "overlay_id": "native_secondary_support_window",
                "surface_embodiment": "NATIVE_OPERATOR",
                "inherits_shell_family": "CALM_SHELL",
                "scene_type": "NativeOperatorSecondaryWindowScene",
                "scene_order": ["IDENTITY_HEADER", "SUMMARY_CARD", "DETAIL_BODY"],
                "continuity_rules": [
                    "Secondary windows are support-only, parent-bound, and restore focus to the invoking anchor when closed.",
                    "Compare, audit, Quick Look, export, filing-packet, and authority-review windows never become a fourth shell family.",
                ],
                "source_refs": [
                    ref(NATIVE_BLUEPRINT, "Secondary windows", "Defines secondary native support windows and focus return."),
                    ref(SEMANTIC_ACCESSIBILITY, "NativeOperatorSecondaryWindowScene", "Defines the semantic order for native support windows."),
                ],
            },
        ],
        "shared_contracts": [
            {
                "contract": "cross_device_continuity_contract",
                "required_fields": [
                    "continuity_scope",
                    "canonical_object_ref",
                    "route_identity_ref",
                    "focus_anchor_ref_or_null",
                    "return_focus_anchor_ref_or_null",
                    "allowed_embodiments[]",
                    "same_object_policy",
                    "same_shell_policy",
                    "narrow_layout_policy",
                    "deep_link_return_policy",
                    "restoration_mode_policy",
                    "secondary_window_policy",
                    "supported_invalidation_reason_codes[]",
                ],
                "source_refs": [
                    ref(FRONTEND_LAW, "2.2 Stable route keys", "Defines the continuity contract fields."),
                    ref(CROSS_DEVICE, "Cross-device continuity", "Lists the surfaces that must publish the continuity contract."),
                ],
            },
            {
                "contract": "semantic_accessibility_contract",
                "required_fields": [
                    "contract_version",
                    "shell_family",
                    "selector_profile",
                    "required_anchor_codes[]",
                    "semantic_focus_order[]",
                    "announced_change_kinds[]",
                ],
                "source_refs": [
                    ref(FRONTEND_LAW, "2.2A Interaction-layer boundary", "Defines the semantic accessibility contract fields."),
                    ref(SEMANTIC_ACCESSIBILITY, "Shared semantic selector and accessibility contract", "Turns semantic order and anchors into regression-grade contracts."),
                ],
            },
        ],
    }


def build_semantic_selector_registry(route_records: list[dict[str, Any]]) -> dict[str, Any]:
    profile_map = {
        "OPERATOR_SEMANTIC_SELECTORS_V1": {
            "shell_family": "CALM_SHELL",
            "selectors": LOW_NOISE_SELECTORS + COLLABORATION_SELECTORS,
            "purpose": "Calm shell, manifest workspace, and staff collaboration anchors.",
            "source_refs": [
                ref(LOW_NOISE, "Minimum semantic selectors", "Defines calm-shell anchors."),
                ref(COLLABORATION, "12. Playwright scenarios", "Adds collaboration-specific module, thread, and action anchors."),
            ],
        },
        "PORTAL_SEMANTIC_SELECTORS_V1": {
            "shell_family": "CLIENT_PORTAL_SHELL",
            "selectors": PORTAL_SELECTORS,
            "purpose": "Client-safe portal, artifact, support, and request-focus anchors.",
            "source_refs": [
                ref(PORTAL, "Minimum semantic selectors", "Defines the portal selector profile."),
                ref(FRONTEND_LAW, "10. Automation anchors and UI observability fencing", "Shared route-visible anchors must remain machine-observable."),
            ],
        },
        "GOVERNANCE_SEMANTIC_SELECTORS_V1": {
            "shell_family": "GOVERNANCE_DENSITY_SHELL",
            "selectors": GOVERNANCE_SELECTORS,
            "purpose": "Governance worklist, mutation, diff, sidecar, and audit anchors.",
            "source_refs": [
                ref(GOVERNANCE, "10. Minimum semantic selectors", "Defines the governance selector profile."),
                ref(FRONTEND_LAW, "10. Automation anchors and UI observability fencing", "Shared route-visible anchors remain required across shells."),
            ],
        },
    }
    route_index: dict[str, list[str]] = {}
    for route in route_records:
        for selector in route["semantic_selector_set"]:
            route_index.setdefault(selector, []).append(route["route_id"])
    profiles: list[dict[str, Any]] = []
    total_selector_count = 0
    for profile_id, profile in profile_map.items():
        selector_entries = []
        for selector in unique(profile["selectors"]):
            selector_entries.append(
                {
                    "selector": selector,
                    "scope": "route-visible semantic anchor",
                    "purpose": profile["purpose"],
                    "exemplar_routes": route_index.get(selector, []),
                    "source_refs": profile["source_refs"],
                }
            )
        total_selector_count += len(selector_entries)
        profiles.append(
            {
                "profile_id": profile_id,
                "shell_family": profile["shell_family"],
                "selector_entries": selector_entries,
            }
        )
    shared_entries = [
        {
            "selector": selector,
            "scope": "cross-shell continuity anchor",
            "purpose": "Preserves return targets, artifact identity, notices, and focus continuity across shell families.",
            "exemplar_routes": route_index.get(selector, []),
            "source_refs": [
                ref(FRONTEND_LAW, "10. Automation anchors and UI observability fencing", "Defines shared anchors for shell root, notices, artifacts, and return paths."),
                ref(SEMANTIC_ACCESSIBILITY, "Shared semantic selector and accessibility contract", "Shared anchors must survive accessibility regression checks."),
            ],
        }
        for selector in SHARED_CONTINUITY_SELECTORS
    ]
    total_selector_count += len(shared_entries)
    return {
        "profiles": profiles,
        "shared_selectors": shared_entries,
        "summary": {
            "profile_count": len(profiles),
            "selector_count": total_selector_count,
            "shared_selector_count": len(shared_entries),
        },
        "assumptions": ASSUMPTIONS,
    }


def build_continuity_recovery_matrix() -> dict[str, Any]:
    scenarios = [
        {
            "scenario_id": "refresh_preserves_same_object",
            "trigger": "Full browser refresh or view reload without truth change.",
            "applicable_shells": ["CALM_SHELL", "CLIENT_PORTAL_SHELL", "GOVERNANCE_DENSITY_SHELL"],
            "preserved_invariants": [
                "shell family",
                "route identity",
                "canonical object anchor",
                "dominant question",
                "focus anchor",
                "return focus anchor",
            ],
            "recovery_mode": "PRESERVED",
            "announcement_posture": "polite",
            "focus_restore_order": FOCUS_RESTORE_ORDER,
            "invalidation_reasons": [],
            "test_harnesses": ["shell_continuity_fuzz_harness", "semantic_accessibility_regression_pack"],
            "source_refs": [
                ref(SHELL_CONTINUITY, "Preserved outcomes", "No truth change preserves shell, route, object, and focus invariants."),
                ref(CROSS_DEVICE, "Cross-device continuity", "Refresh-compatible shells must publish continuity contracts."),
            ],
            "notes": "Refresh may replay visibility-scoped updates, but it must not remount a different shell family or silently drop focus.",
        },
        {
            "scenario_id": "reconnect_stream_catch_up",
            "trigger": "Live stream reconnect with monotonic catch-up or visibility re-entry.",
            "applicable_shells": ["CALM_SHELL", "CLIENT_PORTAL_SHELL", "GOVERNANCE_DENSITY_SHELL"],
            "preserved_invariants": [
                "current object anchor",
                "active module or tab",
                "focus anchor when lawful",
                "current-vs-history artifact distinction",
            ],
            "recovery_mode": "INLINE_RECOVERY",
            "announcement_posture": "polite",
            "focus_restore_order": FOCUS_RESTORE_ORDER,
            "invalidation_reasons": ["stream compaction floor advance", "schema incompatibility"],
            "test_harnesses": ["shell_continuity_fuzz_harness", "stream_resume_and_catch_up_ordering_contract"],
            "source_refs": [
                ref(LOW_NOISE, "Manifest stream recovery and catch-up", "Calm-shell reconnect must keep focus anchor and active detail module when lawful."),
                ref(STREAM_RESUME, "Stream scope and ordering", "Reconnect and catch-up are governed by route key, object, access binding, and compaction state."),
            ],
            "notes": "Reconnect remains inline unless the stream basis or access binding now demands rebase or access rebind.",
        },
        {
            "scenario_id": "publication_or_epoch_rebase",
            "trigger": "Frame epoch drift, shell-stability drift, route-context drift, or compaction that invalidates the current surface basis.",
            "applicable_shells": ["CALM_SHELL", "CLIENT_PORTAL_SHELL", "GOVERNANCE_DENSITY_SHELL"],
            "preserved_invariants": ["owning object family", "return path", "typed recovery reason"],
            "recovery_mode": "REBASE_REQUIRED",
            "announcement_posture": "assertive",
            "focus_restore_order": FOCUS_RESTORE_ORDER,
            "invalidation_reasons": [
                "frame epoch drift",
                "shell-stability drift",
                "route-context drift",
                "published frontier fell behind compaction floor",
            ],
            "test_harnesses": ["shell_continuity_fuzz_harness", "semantic_accessibility_regression_pack"],
            "source_refs": [
                ref(LOW_NOISE, "Manifest stream recovery and catch-up", "Defines `REBASE_REQUIRED` when the frame epoch or shell basis drifts."),
                ref(STREAM_RESUME, "Stream scope and ordering", "Compaction floor and publication frontier drive rebase decisions."),
            ],
            "notes": "Rebase remains inline and explicit. The UI may downgrade mutation-capable actions, but it must not silently continue on stale authority.",
        },
        {
            "scenario_id": "access_rebind_after_scope_change",
            "trigger": "Session, access binding, masking, or schema compatibility drift.",
            "applicable_shells": ["CALM_SHELL", "CLIENT_PORTAL_SHELL", "GOVERNANCE_DENSITY_SHELL"],
            "preserved_invariants": ["route identity", "typed failure or rebind reason", "return path"],
            "recovery_mode": "ACCESS_REBIND_REQUIRED",
            "announcement_posture": "assertive",
            "focus_restore_order": FOCUS_RESTORE_ORDER,
            "invalidation_reasons": [
                "session scope drift",
                "access binding drift",
                "masking scope mismatch",
                "schema incompatibility",
            ],
            "test_harnesses": ["shell_continuity_fuzz_harness", "native_cache_hydration_purge_and_rebase_contract"],
            "source_refs": [
                ref(LOW_NOISE, "Manifest stream recovery and catch-up", "Defines `ACCESS_REBIND_REQUIRED` on session, access, masking, or schema drift."),
                ref(CACHE_REBASE, "Hydration purge and rebase", "Hydrated cache views must block mutation-capable actions until legality is restored."),
            ],
            "notes": "Access rebind is fail-closed: cached content may remain readable, but mutation-capable or filing-capable actions stay blocked until the live legality basis is restored.",
        },
        {
            "scenario_id": "deep_link_entry_and_restore",
            "trigger": "Direct deep-link entry from browser address bar, notification, or in-app jump.",
            "applicable_shells": ["CALM_SHELL", "CLIENT_PORTAL_SHELL"],
            "preserved_invariants": ["same object", "same shell family", "typed fallback explanation", "return target"],
            "recovery_mode": "PRESERVED",
            "announcement_posture": "polite",
            "focus_restore_order": FOCUS_RESTORE_ORDER,
            "invalidation_reasons": ["focus anchor no longer exists", "target module or request detail no longer resolves"],
            "test_harnesses": ["focus_restoration_and_return_target_harness", "cross_device_continuity_contract"],
            "source_refs": [
                ref(FRONTEND_LAW, "2.3 Deep-link restoration", "Defines deep-link fallback order."),
                ref(PORTAL, "Contextual request-detail routes", "Notification deep links restore request focus and return path."),
            ],
            "notes": "Deep links first try to restore focus inside the same object. Only then may they fall back to summary or list anchors.",
        },
        {
            "scenario_id": "notification_open_preserves_slice",
            "trigger": "Notification click or inbox/open-from-alert event.",
            "applicable_shells": ["CALM_SHELL", "CLIENT_PORTAL_SHELL"],
            "preserved_invariants": ["current queue or tab slice", "explicit return path", "highlighted target"],
            "recovery_mode": "PRESERVED",
            "announcement_posture": "polite",
            "focus_restore_order": FOCUS_RESTORE_ORDER,
            "invalidation_reasons": ["highlight target removed", "permission drift"],
            "test_harnesses": ["cross_device_continuity_contract", "focus_restoration_and_return_target_harness"],
            "source_refs": [
                ref(FRONTEND_LAW, "2.5 Queue and inbox continuity", "Queue continuity preserves filters and target highlighting."),
                ref(PORTAL, "Playwright validation minimum", "Notification deep links must restore request focus and return path."),
            ],
            "notes": "Alerts and notifications do not excuse shell swaps or filter loss. They just pre-focus an existing governed target.",
        },
        {
            "scenario_id": "narrow_screen_collapse_preserves_order",
            "trigger": "Responsive collapse from desktop to tablet or mobile.",
            "applicable_shells": ["CALM_SHELL", "CLIENT_PORTAL_SHELL", "GOVERNANCE_DENSITY_SHELL"],
            "preserved_invariants": ["semantic order", "selected object", "dominant question", "dominant action", "focus anchor"],
            "recovery_mode": "PRESERVED",
            "announcement_posture": "polite",
            "focus_restore_order": FOCUS_RESTORE_ORDER,
            "invalidation_reasons": [],
            "test_harnesses": ["semantic_accessibility_regression_pack", "shell_continuity_fuzz_harness"],
            "source_refs": [
                ref(FRONTEND_LAW, "3.4 Responsive fallback", "Semantic order is preserved before side-by-side density."),
                ref(GOVERNANCE, "8. Accessibility and responsive requirements", "Governance compaction preserves filters, selection, and focus anchors."),
            ],
            "notes": "Responsive compaction redocks support surfaces first and never introduces mobile-only alternate shell families.",
        },
        {
            "scenario_id": "browser_back_and_return",
            "trigger": "Browser back, route return, or explicit back control.",
            "applicable_shells": ["CALM_SHELL", "CLIENT_PORTAL_SHELL", "GOVERNANCE_DENSITY_SHELL"],
            "preserved_invariants": ["filters", "selection", "scroll anchor", "draft state", "focus"],
            "recovery_mode": "PRESERVED",
            "announcement_posture": "polite",
            "focus_restore_order": FOCUS_RESTORE_ORDER,
            "invalidation_reasons": ["return target invalidated by truth change", "permission drift"],
            "test_harnesses": ["focus_restoration_and_return_target_harness", "semantic_accessibility_regression_pack"],
            "source_refs": [
                ref(FRONTEND_LAW, "2.4 Back/return behavior", "Back behavior preserves lawful filters, selection, drafts, and focus."),
                ref(COLLABORATION, "Route map", "Queue -> item -> queue stays in the same SPA shell with explicit return routes."),
            ],
            "notes": "Back navigation is a governed restoration path, not just URL history replay.",
        },
        {
            "scenario_id": "native_scene_restoration",
            "trigger": "macOS scene restoration or cached workspace hydration on app relaunch.",
            "applicable_shells": ["CALM_SHELL"],
            "preserved_invariants": ["same object anchor", "same dominant question", "same settlement state", "parent-bound support windows"],
            "recovery_mode": "PRESERVED",
            "announcement_posture": "polite",
            "focus_restore_order": FOCUS_RESTORE_ORDER,
            "invalidation_reasons": ["tenant/session/masking mismatch", "contract mismatch", "focus anchor no longer valid"],
            "test_harnesses": ["cross_device_continuity_contract", "native_cache_hydration_purge_and_rebase_contract"],
            "source_refs": [
                ref(NATIVE_BLUEPRINT, "State management", "Native restoration uses scenes and `NSUserActivity`."),
                ref(CACHE_REBASE, "Hydration purge and rebase", "Mismatch requires purge and fail-closed mutation posture."),
            ],
            "notes": "Native restoration reuses calm-shell law instead of inventing a route-less shell family with different semantics.",
        },
        {
            "scenario_id": "secondary_window_return",
            "trigger": "Closing a native or browser support window such as compare, audit, Quick Look, export, or packet review.",
            "applicable_shells": ["CALM_SHELL", "GOVERNANCE_DENSITY_SHELL"],
            "preserved_invariants": ["parent object", "return focus anchor", "support-only posture"],
            "recovery_mode": "PRESERVED",
            "announcement_posture": "polite",
            "focus_restore_order": FOCUS_RESTORE_ORDER,
            "invalidation_reasons": ["parent focus anchor removed", "parent object invalidated"],
            "test_harnesses": ["semantic_accessibility_regression_pack", "focus_restoration_and_return_target_harness"],
            "source_refs": [
                ref(SEMANTIC_REGRESSION, "SECONDARY_WINDOW_RETURN", "Secondary-window return is a mandatory regression scenario."),
                ref(NATIVE_BLUEPRINT, "Secondary windows", "Parent-bound support windows restore focus when closed."),
            ],
            "notes": "Support windows never become primary shells; closing them must restore the invoking parent context.",
        },
        {
            "scenario_id": "reduced_motion_semantic_equivalence",
            "trigger": "Reduced-motion preference is enabled.",
            "applicable_shells": ["CALM_SHELL", "CLIENT_PORTAL_SHELL", "GOVERNANCE_DENSITY_SHELL"],
            "preserved_invariants": ["same meaning", "same action order", "same recovery meaning", "same focus order"],
            "recovery_mode": "PRESERVED",
            "announcement_posture": "polite",
            "focus_restore_order": FOCUS_RESTORE_ORDER,
            "invalidation_reasons": [],
            "test_harnesses": ["semantic_accessibility_regression_pack"],
            "source_refs": [
                ref(FRONTEND_LAW, "8. Accessibility, focus, and motion", "Reduced-motion must preserve meaning with minimal or no displacement."),
                ref(SEMANTIC_ACCESSIBILITY, "Shared semantic selector and accessibility contract", "Reduced motion cannot change semantic order or action meaning."),
            ],
            "notes": "Spatial motion becomes opacity, highlight, or state-color transitions without changing semantic order.",
        },
        {
            "scenario_id": "cache_hydration_purge_and_rebase",
            "trigger": "Native or browser cache hydration on mismatched tenant, masking, or contract basis.",
            "applicable_shells": ["CALM_SHELL", "CLIENT_PORTAL_SHELL", "GOVERNANCE_DENSITY_SHELL"],
            "preserved_invariants": ["typed failure posture", "read-only legality until live basis returns", "same return path when lawful"],
            "recovery_mode": "ACCESS_REBIND_REQUIRED",
            "announcement_posture": "assertive",
            "focus_restore_order": FOCUS_RESTORE_ORDER,
            "invalidation_reasons": [
                "tenant mismatch",
                "session mismatch",
                "masking mismatch",
                "contract mismatch",
            ],
            "test_harnesses": ["native_cache_hydration_purge_and_rebase_contract", "semantic_accessibility_regression_pack"],
            "source_refs": [
                ref(CACHE_REBASE, "Hydration purge and rebase", "Purges are immediate on tenant, session, masking, or contract mismatch."),
                ref(FRONTEND_LAW, "4.2 No contradictory writable posture", "Illegal mutation must remain fail-closed during degraded or recovery posture."),
            ],
            "notes": "Hydrated content may remain visible for continuity, but write-capable actions stay blocked until live legality is re-established.",
        },
    ]
    return {
        "scenarios": scenarios,
        "summary": {
            "scenario_count": len(scenarios),
            "shell_family_count": 3,
            "harness_count": len(unique([harness for scenario in scenarios for harness in scenario["test_harnesses"]])),
        },
        "assumptions": ASSUMPTIONS,
    }


def build_layout_breakpoint_contract() -> dict[str, Any]:
    return {
        "visual_system": {
            "theme_name": "Decision observatory / legal-control cockpit",
            "colors": {
                "background": "#0B0D12",
                "surface_1": "#121721",
                "surface_2": "#181E29",
                "surface_3": "#202735",
                "hairline_border": "rgba(255,255,255,0.08)",
                "text_strong": "#F5F7FA",
                "text_mid": "#B8C2CF",
                "text_weak": "#7F8A99",
                "accent_primary": "#5AA9FF",
                "accent_soft": "rgba(90,169,255,0.14)",
                "success": "#52C18C",
                "notice": "#E7B04B",
                "danger": "#E96B6B",
            },
            "direction": "Restrained dark, typography-led, quiet surfaces, one accent family, explicit status colors only.",
            "source_refs": [
                ref(UIUX_SKILL, "Visual philosophy", "Premium low-noise product direction."),
                ref(FRONTEND_LAW, "3.1 One dominant question, one dominant action", "Quiet visual hierarchy serves the dominant question/action law."),
            ],
        },
        "typography": {
            "primary_stack": "Inter, SF Pro Text, SF Pro Display, system-ui, sans-serif",
            "monospace_stack": "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            "scale": {
                "display": "40/48",
                "page_title": "32/40",
                "section_heading": "20/28",
                "card_title": "16/24",
                "body": "14/22",
                "meta": "12/18",
            },
            "usage_rules": [
                "Use monospace only for ids, hashes, scope tokens, route keys, and schema or selector refs.",
                "Keep headline hierarchy sparse so the shell law reads as a contract, not marketing copy.",
            ],
            "source_refs": [
                ref(UIUX_SKILL, "Taxat Decision Observatory", "The product language is typographic and summary-first."),
                ref(FRONTEND_LAW, "10. Automation anchors and UI observability fencing", "Structural anchors must remain legible and stable."),
            ],
        },
        "grid": {
            "desktop": {"columns": 12, "max_width": 1440, "gutter": 32},
            "tablet": {"columns": 8, "gutter": 24},
            "mobile": {"columns": 4, "gutter": 16},
            "shell_header_height": 64,
            "context_bar_min_height": 72,
            "card_radius": 16,
            "chip_radius": 999,
            "inspector_width": 360,
            "source_refs": [
                ref(UIUX_SKILL, "Default product shell", "The shell remains calm and structural rather than card-noisy."),
                ref(CROSS_SHELL, "Shared design token and interaction layer foundation", "Density and spacing tokens remain shell-specific."),
            ],
        },
        "motion_contract": {
            "standard_duration_ms": 160,
            "emphasis_duration_ms": 220,
            "max_duration_ms": 280,
            "allowed_motion": "Opacity changes and vertical translation up to 8px.",
            "reduced_motion_policy": "Replace displacement with opacity, highlight, or color-state changes while preserving semantic meaning.",
            "source_refs": [
                ref(FRONTEND_LAW, "8. Accessibility, focus, and motion", "Motion stays low-amplitude and semantic."),
                ref(SEMANTIC_ACCESSIBILITY, "Shared semantic selector and accessibility contract", "Reduced motion preserves meaning and action order."),
            ],
        },
        "shell_breakpoints": [
            {
                "shell_family": "CALM_SHELL",
                "breakpoints": [
                    {
                        "range": "desktop >= 1280px",
                        "rules": [
                            "Four-surface composition may show a vertical module picker and full detail drawer.",
                            "Primary calm hierarchy remains `CONTEXT_BAR -> DECISION_SUMMARY -> ACTION_STRIP -> DETAIL_DRAWER`.",
                        ],
                    },
                    {
                        "range": "tablet 768px - 1279px",
                        "rules": [
                            "Module picker may collapse to segmented control.",
                            "The drawer stays promoted but may redock into a shallower panel.",
                        ],
                    },
                    {
                        "range": "mobile < 768px",
                        "rules": [
                            "Active drawer module takes full width.",
                            "Customer and internal activity threads never sit side by side.",
                        ],
                    },
                ],
                "source_refs": [
                    ref(LOW_NOISE, "Shell continuity, constrained layouts, and artifact handoff", "Calm shell compacts by redocking the drawer before primary surfaces."),
                    ref(COLLABORATION, "11. Accessibility and responsive rules", "Collaboration module behavior changes at desktop, tablet, and mobile breakpoints."),
                ],
            },
            {
                "shell_family": "CLIENT_PORTAL_SHELL",
                "breakpoints": [
                    {
                        "range": "desktop",
                        "rules": [
                            "Keep one primary task column with subordinate help/history.",
                            "Portal tabs remain the only top-level navigation surface.",
                        ],
                    },
                    {
                        "range": "tablet",
                        "rules": [
                            "Stack support below the primary task before removing important task context.",
                            "Keep the same tab, same primary action, and same return path.",
                        ],
                    },
                    {
                        "range": "mobile",
                        "rules": [
                            "Resume upload, request, or approval sessions in the same route context.",
                            "No mobile-only alternate route family is allowed.",
                        ],
                    },
                ],
                "source_refs": [
                    ref(PORTAL, "Shell continuity, support budget, and constrained layouts", "Portal support stacks below the primary task and keeps same-shell continuity."),
                    ref(FRONTEND_LAW, "3.4 Responsive fallback", "Responsive fallback preserves semantic order before density."),
                ],
            },
            {
                "shell_family": "GOVERNANCE_DENSITY_SHELL",
                "breakpoints": [
                    {
                        "range": "wide >= 1440px",
                        "rules": [
                            "May show all five structural regions at once.",
                            "One promoted auxiliary surface still governs user attention.",
                        ],
                    },
                    {
                        "range": "standard 1024px - 1439px",
                        "rules": [
                            "Keep `WORKSPACE_CANVAS` primary and redock the audit sidecar into a drawer or tabbed inspector.",
                            "Preserve active filters, selected object, and focus anchor.",
                        ],
                    },
                    {
                        "range": "narrow < 1024px",
                        "rules": [
                            "Move `SECTION_NAV` into compact tabs or menus.",
                            "Collapse `INVENTORY_RAIL` into a filter-and-selection tray and keep one promoted support region at a time.",
                        ],
                    },
                ],
                "source_refs": [
                    ref(GOVERNANCE, "8. Accessibility and responsive requirements", "Defines the governance breakpoint rules."),
                    ref(FRONTEND_LAW, "3.3 Shell-family topology", "Governance routes still respect one promoted support region by default."),
                ],
            },
        ],
        "assumptions": ASSUMPTIONS,
    }


def build_route_focus_registry(route_records: list[dict[str, Any]]) -> dict[str, Any]:
    rows = []
    for route in route_records:
        rows.append(
            {
                "route_id": route["route_id"],
                "route_pattern": route["route_pattern"],
                "shell_family": route["shell_family"],
                "landmarks": route["landmarks"],
                "focus_order": route["focus_order"],
                "default_focus_anchor": route["focus_order"][0],
                "return_path_policy": "Return to the invoking anchor or nearest lawful ancestor heading while preserving the same shell and object when possible.",
                "focus_restore_order": FOCUS_RESTORE_ORDER,
                "promoted_support_region_policy": route["promoted_support_region_policy"],
                "source_refs": route["source_refs"],
            }
        )
    return {
        "routes": rows,
        "summary": {
            "route_count": len(rows),
            "landmark_count": sum(len(row["landmarks"]) for row in rows),
            "focus_step_count": sum(len(row["focus_order"]) for row in rows),
        },
        "assumptions": ASSUMPTIONS,
    }


def build_shell_route_matrix(shell_families: list[dict[str, Any]], route_records: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "shell_families": shell_families,
        "route_records": route_records,
        "summary": {
            "shell_family_count": len(shell_families),
            "route_count": len(route_records),
            "calm_route_count": sum(1 for route in route_records if route["shell_family"] == "CALM_SHELL"),
            "portal_route_count": sum(1 for route in route_records if route["shell_family"] == "CLIENT_PORTAL_SHELL"),
            "governance_route_count": sum(1 for route in route_records if route["shell_family"] == "GOVERNANCE_DENSITY_SHELL"),
        },
        "assumptions": ASSUMPTIONS,
    }


def build_atlas_data(
    shell_route_matrix: dict[str, Any],
    interaction_layer_map: dict[str, Any],
    selector_registry: dict[str, Any],
    continuity_matrix: dict[str, Any],
    layout_contract: dict[str, Any],
) -> dict[str, Any]:
    shell_pages = [
        {
            "page_id": "overview",
            "title": "Overview",
            "subtitle": "Cross-shell route law, visual law, and continuity law for the Taxat frontend corpus.",
            "hero_statement": "This atlas is a contract demonstrator, not a speculative dashboard. Every page exists to keep later implementation agents inside the shell, selector, and recovery law.",
        },
        {
            "page_id": "calm",
            "title": "CALM_SHELL",
            "shell_family": "CALM_SHELL",
            "subtitle": "Manifest and staff decision workspaces stay quiet, summary-first, and support-budgeted.",
            "hero_statement": "Four persistent surfaces, one dominant question, one promoted support region, and inline typed recovery.",
            "featured_route_ids": [
                "calm_manifest_workspace",
                "calm_work_inbox",
                "calm_work_item",
                "calm_work_item_module",
            ],
        },
        {
            "page_id": "portal",
            "title": "CLIENT_PORTAL_SHELL",
            "shell_family": "CLIENT_PORTAL_SHELL",
            "subtitle": "Client-safe routes foreground the next task with plain language, strong continuity, and one support region maximum.",
            "hero_statement": "Five top-level destinations, contextual request detail, and no internal leakage across help, documents, approvals, or onboarding.",
            "featured_route_ids": [
                "portal_home",
                "portal_documents",
                "portal_approvals",
                "portal_request_detail",
            ],
        },
        {
            "page_id": "governance",
            "title": "GOVERNANCE_DENSITY_SHELL",
            "shell_family": "GOVERNANCE_DENSITY_SHELL",
            "subtitle": "Dense admin workspaces still preserve one dominant question, one promoted support surface, and route-stable filters, selection, and diff context.",
            "hero_statement": "Mutation is diff-first, receipts stay inline, and breakpoint compaction never throws away the selected governance object.",
            "featured_route_ids": [
                "governance_overview",
                "governance_tenant",
                "governance_authority_links",
                "governance_audit",
            ],
        },
        {
            "page_id": "continuity",
            "title": "Continuity Lab",
            "subtitle": "Recovery, rebase, focus return, motion reduction, and hydration law across browser and native embodiments.",
            "hero_statement": "The lab turns continuity contracts into visible invariants and Playwright-verifiable behaviors.",
        },
    ]
    return {
        "summary": {
            "shell_family_count": shell_route_matrix["summary"]["shell_family_count"],
            "route_count": shell_route_matrix["summary"]["route_count"],
            "selector_count": selector_registry["summary"]["selector_count"],
            "scenario_count": continuity_matrix["summary"]["scenario_count"],
            "native_overlay_count": len(interaction_layer_map["native_overlays"]),
        },
        "shell_pages": shell_pages,
        "shell_families": shell_route_matrix["shell_families"],
        "route_records": shell_route_matrix["route_records"],
        "interaction_layers": interaction_layer_map["shell_foundations"],
        "native_overlays": interaction_layer_map["native_overlays"],
        "continuity_scenarios": continuity_matrix["scenarios"],
        "selector_profiles": selector_registry["profiles"],
        "shared_selectors": selector_registry["shared_selectors"],
        "layout_contract": layout_contract,
        "assumptions": ASSUMPTIONS,
    }


def render_frontend_requirements_doc(
    shell_route_matrix: dict[str, Any],
    interaction_layer_map: dict[str, Any],
) -> str:
    route_rows = "\n".join(
        f"| `{route['route_id']}` | `{route['route_pattern']}` | `{route['shell_family']}` | {route['owning_object_family']} | {route['dominant_question']} |"
        for route in shell_route_matrix["route_records"]
    )
    shell_sections = []
    for shell in shell_route_matrix["shell_families"]:
        shell_sections.append(
            dedent(
                f"""
                ### {shell["shell_family"]}
                - Label: {shell["shell_label"]}
                - Ownership rule: {shell["owning_object_rule"]}
                - Continuity contract: `{shell["continuity_contract"]}`
                - Selector profile: `{shell["selector_profile"]}`
                - Default surface order: {", ".join(f"`{surface}`" for surface in shell["default_surface_order"])}
                - Support-region law: {shell["promoted_support_region_law"]}
                """
            ).strip()
        )
    foundation_rows = "\n".join(
        f"| `{row['shell_family']}` | `{row['interaction_layer_contract']}` | `{row['behavior_contract']['selector_profile']}` | `{row['behavior_contract']['continuity_policy']}` |"
        for row in interaction_layer_map["shell_foundations"]
    )
    assumption_rows = "\n".join(
        f"- `{item['code']}`: {item['description']}"
        for item in ASSUMPTIONS
    )
    return normalize_markdown(
        f"""
        # Frontend Shell Route And Interaction Layer Requirements

        ## Summary
        - Shell families modeled: `{shell_route_matrix["summary"]["shell_family_count"]}`
        - Route records modeled: `{shell_route_matrix["summary"]["route_count"]}`
        - Calm-shell routes: `{shell_route_matrix["summary"]["calm_route_count"]}`
        - Portal routes: `{shell_route_matrix["summary"]["portal_route_count"]}`
        - Governance routes: `{shell_route_matrix["summary"]["governance_route_count"]}`
        - Native overlays modeled without inventing a fourth shell family: `{len(interaction_layer_map["native_overlays"])}`

        ## Shell Families
        {"\n\n".join(shell_sections)}

        ## Route Matrix
        | Route ID | Pattern | Shell | Owning Object | Dominant Question |
        | --- | --- | --- | --- | --- |
        {route_rows}

        ## Interaction-Layer Foundations
        | Shell | Interaction Layer | Selector Profile | Continuity Policy |
        | --- | --- | --- | --- |
        {foundation_rows}

        Native overlays remain embodiments, not new shell families:
        - `native_primary_operator_scene`: `CALM_SHELL` embodiment with `LEADING_SIDEBAR -> PRIMARY_CANVAS -> TRAILING_INSPECTOR`.
        - `native_secondary_support_window`: parent-bound support overlay with `IDENTITY_HEADER -> SUMMARY_CARD -> DETAIL_BODY`.

        ## Shared Contract Requirements
        - Every route-visible shell or scene that survives refresh, reconnect, resize, or deep-link restoration must publish `cross_device_continuity_contract`.
        - Every route-visible shell or scene that exposes landmarks, focus order, or regression anchors must publish `semantic_accessibility_contract`.
        - Browser and native surfaces remain subject to the same same-object / same-shell law, dominant-question law, and promoted-support-region budget.

        ## Assumptions And Risks
        {assumption_rows}
        """
    )


def render_visual_system_doc(layout_contract: dict[str, Any], interaction_layer_map: dict[str, Any]) -> str:
    color_rows = "\n".join(
        f"| `{name}` | `{value}` |"
        for name, value in layout_contract["visual_system"]["colors"].items()
    )
    type_rows = "\n".join(
        f"| {label.replace('_', ' ')} | `{value}` |"
        for label, value in layout_contract["typography"]["scale"].items()
    )
    shell_sections = []
    for breakpoint_group in layout_contract["shell_breakpoints"]:
        rules = []
        for item in breakpoint_group["breakpoints"]:
            rules.append(
                f"- `{item['range']}`: {' '.join(item['rules'])}"
            )
        shell_sections.append(f"### {breakpoint_group['shell_family']}\n" + "\n".join(rules))
    token_rows = "\n".join(
        f"| `{row['shell_family']}` | `{row['design_tokens']['layout_density_token']}` | `{row['design_tokens']['responsive_compaction_token']}` |"
        for row in interaction_layer_map["shell_foundations"]
    )
    return normalize_markdown(
        f"""
        # Visual System Layout And Motion Spec

        ## Visual Direction
        - Theme: {layout_contract["visual_system"]["theme_name"]}
        - Direction: {layout_contract["visual_system"]["direction"]}
        - Structural rule: quiet dark surfaces, high-legibility typography, one accent family, and explicit success / notice / danger states only.

        ## Core Color Tokens
        | Token | Value |
        | --- | --- |
        {color_rows}

        ## Typography
        - Primary stack: `{layout_contract["typography"]["primary_stack"]}`
        - Monospace stack: `{layout_contract["typography"]["monospace_stack"]}`

        | Scale | Value |
        | --- | --- |
        {type_rows}

        ## Layout Constants
        - Desktop grid: `{layout_contract["grid"]["desktop"]["columns"]}` columns, max width `{layout_contract["grid"]["desktop"]["max_width"]}`, gutter `{layout_contract["grid"]["desktop"]["gutter"]}`
        - Tablet grid: `{layout_contract["grid"]["tablet"]["columns"]}` columns, gutter `{layout_contract["grid"]["tablet"]["gutter"]}`
        - Mobile grid: `{layout_contract["grid"]["mobile"]["columns"]}` columns, gutter `{layout_contract["grid"]["mobile"]["gutter"]}`
        - Shell header height: `{layout_contract["grid"]["shell_header_height"]}`
        - Context bar minimum height: `{layout_contract["grid"]["context_bar_min_height"]}`
        - Card radius: `{layout_contract["grid"]["card_radius"]}`
        - Inspector width: `{layout_contract["grid"]["inspector_width"]}`

        ## Family-Level Density Tokens
        | Shell | Density Token | Responsive Compaction Token |
        | --- | --- | --- |
        {token_rows}

        ## Breakpoint Contracts
        {"\n\n".join(shell_sections)}

        ## Motion Contract
        - Standard duration: `{layout_contract["motion_contract"]["standard_duration_ms"]}ms`
        - Emphasis duration: `{layout_contract["motion_contract"]["emphasis_duration_ms"]}ms`
        - Maximum duration: `{layout_contract["motion_contract"]["max_duration_ms"]}ms`
        - Allowed motion: {layout_contract["motion_contract"]["allowed_motion"]}
        - Reduced-motion policy: {layout_contract["motion_contract"]["reduced_motion_policy"]}
        """
    )


def render_validation_plan_doc(
    selector_registry: dict[str, Any],
    continuity_matrix: dict[str, Any],
) -> str:
    profile_rows = "\n".join(
        f"| `{profile['profile_id']}` | `{profile['shell_family']}` | `{len(profile['selector_entries'])}` |"
        for profile in selector_registry["profiles"]
    )
    scenario_rows = "\n".join(
        f"| `{scenario['scenario_id']}` | {scenario['trigger']} | `{scenario['recovery_mode']}` | `{scenario['announcement_posture']}` |"
        for scenario in continuity_matrix["scenarios"]
    )
    harnesses = unique([harness for scenario in continuity_matrix["scenarios"] for harness in scenario["test_harnesses"]])
    return normalize_markdown(
        f"""
        # Playwright Accessibility And Continuity Validation Plan

        ## Test Suite Structure
        - `frontend_contract_atlas.spec.ts`: render integrity, tab navigation, shell-page coverage, and screenshot baselines.
        - `frontend_contract_atlas.continuity.spec.ts`: continuity lab scenarios, focus-return demo, back/forward route history, and reduced-motion parity.
        - `frontend_contract_atlas.accessibility.spec.ts`: keyboard tab flow, semantic anchor visibility, aria-live posture, and heading/landmark integrity.

        ## Selector Profiles
        | Profile | Shell | Selector Count |
        | --- | --- | --- |
        {profile_rows}

        Shared selectors validated across shells: `{selector_registry["summary"]["shared_selector_count"]}`

        ## Continuity Scenarios
        | Scenario | Trigger | Recovery Mode | Live Region |
        | --- | --- | --- | --- |
        {scenario_rows}

        ## Mandatory Harness Concepts
        {"\n".join(f"- `{harness}`" for harness in harnesses)}

        ## Browser And Accessibility Expectations
        - Use role-based locators for tabs, tab panels, buttons, and headings first.
        - Reserve `data-testid` for stable domain anchors such as semantic selectors, summary cards, and the continuity support demo.
        - Verify reduced-motion parity explicitly through `document.documentElement.dataset.motion`.
        - Keep screenshot baselines to overview and continuity pages so visual regressions stay high-signal rather than noisy.
        """
    )


def render_index_html() -> str:
    return dedent(
        """
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Taxat Frontend Contract Atlas</title>
            <link rel="stylesheet" href="./styles.css" />
          </head>
          <body>
            <div class="atlas" data-testid="frontend-contract-atlas">
              <header class="hero">
                <div class="hero-copy">
                  <p class="eyebrow">Taxat Decision Observatory</p>
                  <h1>Frontend Contract Atlas</h1>
                  <p class="hero-text">
                    Shell law, route law, selector law, and recovery law rendered as a browser-viewable
                    contract demonstrator for future web and native implementation agents.
                  </p>
                </div>
                <div class="hero-summary" id="summary-grid" aria-label="Atlas summary"></div>
              </header>

              <nav class="atlas-tabs" aria-label="Shell families" role="tablist" id="atlas-tabs"></nav>

              <main class="atlas-main">
                <aside class="meta-rail">
                  <section class="meta-card">
                    <p class="meta-label">Motion</p>
                    <p class="meta-value" data-testid="motion-mode" id="motion-mode">standard</p>
                  </section>
                  <section class="meta-card">
                    <p class="meta-label">Contract basis</p>
                    <p class="meta-small">
                      Same object, same shell. One dominant question. One promoted support region by default.
                    </p>
                  </section>
                  <section class="meta-card">
                    <p class="meta-label">Assumptions</p>
                    <ul class="meta-list" id="assumption-list"></ul>
                  </section>
                </aside>
                <section class="content-pane" id="content-pane" role="tabpanel" tabindex="0" aria-live="polite"></section>
              </main>
            </div>

            <script type="module" src="./app.js"></script>
          </body>
        </html>
        """
    ).strip()


def render_styles_css() -> str:
    return dedent(
        """
        :root {
          --background: #0b0d12;
          --surface-1: #121721;
          --surface-2: #181e29;
          --surface-3: #202735;
          --border: rgba(255, 255, 255, 0.08);
          --text-strong: #f5f7fa;
          --text-mid: #b8c2cf;
          --text-weak: #7f8a99;
          --accent: #5aa9ff;
          --accent-soft: rgba(90, 169, 255, 0.14);
          --success: #52c18c;
          --notice: #e7b04b;
          --danger: #e96b6b;
          --radius: 16px;
          --radius-chip: 999px;
          --shadow: 0 18px 50px rgba(0, 0, 0, 0.28);
          --transition-standard: 160ms ease;
          --transition-emphasis: 220ms ease;
          color-scheme: dark;
          font-family: Inter, "SF Pro Text", "SF Pro Display", system-ui, sans-serif;
          background:
            radial-gradient(circle at top left, rgba(90, 169, 255, 0.18), transparent 28%),
            linear-gradient(180deg, #10141d 0%, #0b0d12 42%, #08090d 100%);
        }

        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          min-height: 100%;
          background: var(--background);
          color: var(--text-strong);
        }

        body {
          padding: 32px;
        }

        button,
        input,
        select,
        textarea {
          font: inherit;
          color: inherit;
        }

        button {
          cursor: pointer;
        }

        button:focus-visible,
        a:focus-visible,
        [tabindex]:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 3px;
        }

        .atlas {
          max-width: 1440px;
          margin: 0 auto;
        }

        .hero {
          display: grid;
          grid-template-columns: minmax(0, 1.9fr) minmax(320px, 1fr);
          gap: 24px;
          padding: 32px;
          border: 1px solid var(--border);
          border-radius: 28px;
          background: linear-gradient(180deg, rgba(18, 23, 33, 0.92), rgba(10, 12, 18, 0.92));
          box-shadow: var(--shadow);
          min-height: 240px;
        }

        .eyebrow {
          margin: 0 0 12px;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 11px;
          line-height: 16px;
        }

        h1 {
          margin: 0;
          font-size: clamp(2.4rem, 4vw, 3.25rem);
          line-height: 1.12;
          letter-spacing: -0.04em;
        }

        .hero-text {
          max-width: 62ch;
          margin: 16px 0 0;
          font-size: 15px;
          line-height: 1.7;
          color: var(--text-mid);
        }

        .hero-summary {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          align-content: start;
        }

        .summary-card {
          padding: 18px;
          border-radius: 18px;
          border: 1px solid var(--border);
          background: rgba(24, 30, 41, 0.82);
        }

        .summary-label {
          margin: 0;
          color: var(--text-weak);
          font-size: 12px;
          line-height: 18px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .summary-value {
          margin: 12px 0 0;
          font-size: 30px;
          line-height: 1.1;
          letter-spacing: -0.03em;
        }

        .atlas-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin: 24px 0 0;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: rgba(12, 16, 24, 0.78);
          position: sticky;
          top: 12px;
          backdrop-filter: blur(16px);
          z-index: 10;
        }

        .atlas-tab {
          border: 1px solid transparent;
          background: transparent;
          color: var(--text-mid);
          padding: 12px 18px;
          border-radius: 999px;
          transition: background-color var(--transition-standard), color var(--transition-standard), border-color var(--transition-standard), transform var(--transition-standard);
        }

        .atlas-tab[aria-selected="true"] {
          background: var(--accent-soft);
          border-color: rgba(90, 169, 255, 0.36);
          color: var(--text-strong);
        }

        .atlas-tab:hover {
          transform: translateY(-1px);
          color: var(--text-strong);
        }

        .atlas-main {
          display: grid;
          grid-template-columns: 280px minmax(0, 1fr);
          gap: 24px;
          margin-top: 24px;
          align-items: start;
        }

        .meta-rail {
          display: grid;
          gap: 16px;
          position: sticky;
          top: 94px;
        }

        .meta-card,
        .content-card,
        .stage-card,
        .route-card,
        .scenario-card {
          border: 1px solid var(--border);
          border-radius: var(--radius);
          background: rgba(18, 23, 33, 0.88);
          box-shadow: var(--shadow);
        }

        .meta-card {
          padding: 18px;
        }

        .meta-label,
        .kicker {
          margin: 0;
          color: var(--text-weak);
          font-size: 12px;
          line-height: 18px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .meta-value {
          margin: 10px 0 0;
          font-size: 15px;
          line-height: 1.45;
          color: var(--text-strong);
        }

        .meta-small {
          margin: 10px 0 0;
          font-size: 14px;
          line-height: 1.65;
          color: var(--text-mid);
        }

        .meta-list {
          margin: 10px 0 0;
          padding-left: 18px;
          color: var(--text-mid);
          font-size: 13px;
          line-height: 1.6;
        }

        .content-pane {
          display: grid;
          gap: 20px;
        }

        .content-card,
        .stage-card {
          padding: 24px;
        }

        .page-header {
          display: grid;
          gap: 12px;
        }

        .page-title {
          margin: 0;
          font-size: clamp(1.8rem, 3vw, 2.4rem);
          line-height: 1.15;
          letter-spacing: -0.03em;
        }

        .page-subtitle,
        .page-copy,
        .card-copy,
        .law-list,
        .token-list,
        .route-note,
        .scenario-copy,
        .scenario-list,
        .detail-list {
          margin: 0;
          color: var(--text-mid);
          font-size: 14px;
          line-height: 1.72;
        }

        .page-grid,
        .shell-grid,
        .detail-grid,
        .route-grid,
        .continuity-grid {
          display: grid;
          gap: 20px;
        }

        .page-grid,
        .detail-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .shell-grid {
          grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
        }

        .route-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .continuity-grid {
          grid-template-columns: 300px minmax(0, 1fr);
        }

        .shell-card-title,
        .section-title,
        .stage-title,
        .route-title,
        .scenario-title {
          margin: 0;
          font-size: 18px;
          line-height: 1.4;
          letter-spacing: -0.02em;
        }

        .shell-card {
          padding: 22px;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          background: rgba(18, 23, 33, 0.82);
        }

        .chip-row,
        .route-chip-row,
        .scenario-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
        }

        .chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: var(--radius-chip);
          border: 1px solid var(--border);
          padding: 6px 10px;
          font-size: 12px;
          line-height: 1.4;
          color: var(--text-mid);
          background: rgba(24, 30, 41, 0.78);
        }

        .chip-accent {
          color: var(--text-strong);
          border-color: rgba(90, 169, 255, 0.32);
          background: var(--accent-soft);
        }

        .chip-success {
          border-color: rgba(82, 193, 140, 0.28);
          color: var(--success);
        }

        .chip-notice {
          border-color: rgba(231, 176, 75, 0.28);
          color: var(--notice);
        }

        .chip-danger {
          border-color: rgba(233, 107, 107, 0.28);
          color: var(--danger);
        }

        .metric-line {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 12px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .metric-line:first-of-type {
          border-top: none;
        }

        .metric-label {
          color: var(--text-weak);
        }

        .metric-value {
          color: var(--text-strong);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }

        .stage-card {
          position: relative;
          overflow: hidden;
        }

        .stage-card::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(90, 169, 255, 0.08), transparent 34%);
          pointer-events: none;
        }

        .surface-stack,
        .portal-stage,
        .governance-stage {
          display: grid;
          gap: 10px;
          margin-top: 18px;
        }

        .surface-block,
        .portal-block,
        .governance-block {
          padding: 14px 16px;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: rgba(24, 30, 41, 0.92);
          min-height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .surface-block strong,
        .portal-block strong,
        .governance-block strong {
          font-size: 13px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-weak);
        }

        .surface-block span,
        .portal-block span,
        .governance-block span {
          color: var(--text-strong);
          font-size: 14px;
          line-height: 1.5;
        }

        .portal-stage {
          grid-template-columns: 1fr;
        }

        .governance-stage {
          grid-template-columns: 0.9fr 1.4fr 0.85fr;
          align-items: start;
        }

        .governance-stage .governance-block[data-compact="tall"] {
          min-height: 180px;
          align-items: flex-start;
        }

        .route-card,
        .scenario-card {
          padding: 20px;
        }

        .route-meta {
          margin: 12px 0 0;
          font-size: 12px;
          line-height: 1.5;
          color: var(--text-weak);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }

        .route-list,
        .detail-list,
        .scenario-list {
          margin-top: 14px;
          padding-left: 18px;
        }

        .scenario-selector-list {
          display: grid;
          gap: 10px;
        }

        .scenario-selector {
          width: 100%;
          text-align: left;
          padding: 16px;
          border-radius: 16px;
          border: 1px solid var(--border);
          background: rgba(18, 23, 33, 0.88);
          color: var(--text-mid);
          transition: background-color var(--transition-standard), border-color var(--transition-standard), transform var(--transition-standard);
        }

        .scenario-selector[aria-pressed="true"] {
          background: var(--accent-soft);
          border-color: rgba(90, 169, 255, 0.34);
          color: var(--text-strong);
        }

        .scenario-selector:hover {
          transform: translateY(-1px);
          color: var(--text-strong);
        }

        .live-region {
          margin-top: 16px;
          padding: 16px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(24, 30, 41, 0.72);
        }

        .support-demo {
          margin-top: 18px;
          display: grid;
          gap: 12px;
        }

        .support-controls {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .button {
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 10px 16px;
          background: rgba(24, 30, 41, 0.9);
          color: var(--text-strong);
          transition: background-color var(--transition-standard), border-color var(--transition-standard), transform var(--transition-standard);
        }

        .button:hover {
          transform: translateY(-1px);
          border-color: rgba(90, 169, 255, 0.3);
        }

        .button-primary {
          background: var(--accent-soft);
          border-color: rgba(90, 169, 255, 0.36);
        }

        .support-panel {
          border: 1px solid rgba(90, 169, 255, 0.24);
          background: rgba(18, 23, 33, 0.92);
          border-radius: 16px;
          padding: 16px;
        }

        .support-panel[hidden] {
          display: none;
        }

        .route-table {
          display: grid;
          gap: 14px;
        }

        .route-row {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
          gap: 16px;
          padding: 16px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .route-row:first-child {
          border-top: none;
        }

        .route-row p {
          margin: 0;
        }

        .mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }

        html[data-motion="reduce"] * {
          scroll-behavior: auto;
        }

        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }
        }

        html[data-motion="reduce"] .atlas-tab,
        html[data-motion="reduce"] .scenario-selector,
        html[data-motion="reduce"] .button {
          transition-duration: 0.01ms;
          transform: none !important;
        }

        @media (max-width: 1199px) {
          .hero,
          .atlas-main,
          .shell-grid,
          .continuity-grid,
          .page-grid,
          .detail-grid,
          .route-grid {
            grid-template-columns: 1fr;
          }

          .meta-rail {
            position: static;
          }

          .governance-stage {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 767px) {
          body {
            padding: 16px;
          }

          .hero,
          .content-card,
          .stage-card,
          .route-card,
          .scenario-card,
          .meta-card {
            padding: 18px;
          }

          .hero-summary {
            grid-template-columns: 1fr 1fr;
          }

          .atlas-tabs {
            border-radius: 24px;
            padding: 10px;
          }
        }
        """
    ).strip()


def render_app_js() -> str:
    return dedent(
        """
        const summaryGrid = document.getElementById("summary-grid");
        const assumptionList = document.getElementById("assumption-list");
        const tabsRoot = document.getElementById("atlas-tabs");
        const contentPane = document.getElementById("content-pane");
        const motionMode = document.getElementById("motion-mode");

        const DEFAULT_PAGE = "overview";
        let atlasData = null;
        let state = {
          pageId: DEFAULT_PAGE,
          scenarioId: "refresh_preserves_same_object",
          supportOpen: false,
        };

        function setMotionMode() {
          const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          const mode = reduced ? "reduce" : "standard";
          document.documentElement.dataset.motion = mode;
          motionMode.textContent = mode;
        }

        function parseLocationState() {
          const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
          return {
            pageId: params.get("page") || DEFAULT_PAGE,
            scenarioId: params.get("scenario") || "refresh_preserves_same_object",
          };
        }

        function syncStateFromLocation() {
          const locationState = parseLocationState();
          state.pageId = atlasData.shell_pages.some((page) => page.page_id === locationState.pageId)
            ? locationState.pageId
            : DEFAULT_PAGE;
          state.scenarioId = atlasData.continuity_scenarios.some((item) => item.scenario_id === locationState.scenarioId)
            ? locationState.scenarioId
            : "refresh_preserves_same_object";
          render();
        }

        function updateLocation(next, replace = false) {
          const params = new URLSearchParams();
          params.set("page", next.pageId);
          if (next.pageId === "continuity") {
            params.set("scenario", next.scenarioId);
          }
          const hash = `#${params.toString()}`;
          if (replace) {
            window.history.replaceState({}, "", hash);
          } else {
            window.history.pushState({}, "", hash);
          }
          syncStateFromLocation();
        }

        function createElement(tag, className, text) {
          const node = document.createElement(tag);
          if (className) {
            node.className = className;
          }
          if (text !== undefined) {
            node.textContent = text;
          }
          return node;
        }

        function createChip(label, className = "", testId = "") {
          const chip = createElement("span", `chip ${className}`.trim(), label);
          if (testId) {
            chip.dataset.testid = testId;
          }
          return chip;
        }

        function renderSummaryCards() {
          const cards = [
            ["Shell families", atlasData.summary.shell_family_count, "atlas-summary-shells"],
            ["Routes", atlasData.summary.route_count, "atlas-summary-routes"],
            ["Selectors", atlasData.summary.selector_count, "atlas-summary-selectors"],
            ["Recovery scenarios", atlasData.summary.scenario_count, "atlas-summary-scenarios"],
          ];
          summaryGrid.replaceChildren();
          cards.forEach(([label, value, testId]) => {
            const card = createElement("section", "summary-card");
            if (testId) {
              card.dataset.testid = testId;
            }
            card.append(
              createElement("p", "summary-label", label),
              createElement("p", "summary-value", String(value)),
            );
            summaryGrid.append(card);
          });
        }

        function renderAssumptions() {
          assumptionList.replaceChildren();
          atlasData.assumptions.forEach((item) => {
            const li = document.createElement("li");
            li.textContent = item.code;
            assumptionList.append(li);
          });
        }

        function renderTabs() {
          tabsRoot.replaceChildren();
          atlasData.shell_pages.forEach((page, index) => {
            const button = createElement("button", "atlas-tab", page.title);
            button.type = "button";
            button.setAttribute("role", "tab");
            button.dataset.pageId = page.page_id;
            button.dataset.index = String(index);
            button.id = `atlas-tab-${page.page_id}`;
            button.setAttribute("aria-controls", "atlas-panel");
            button.setAttribute("aria-selected", String(page.page_id === state.pageId));
            button.tabIndex = page.page_id === state.pageId ? 0 : -1;
            button.addEventListener("click", () => {
              state.supportOpen = false;
              updateLocation({ pageId: page.page_id, scenarioId: state.scenarioId });
            });
            button.addEventListener("keydown", handleTabKeydown);
            tabsRoot.append(button);
          });
        }

        function handleTabKeydown(event) {
          const buttons = [...tabsRoot.querySelectorAll(".atlas-tab")];
          const currentIndex = buttons.findIndex((button) => button.dataset.pageId === state.pageId);
          if (currentIndex === -1) {
            return;
          }
          let nextIndex = null;
          if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % buttons.length;
          if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
          if (event.key === "Home") nextIndex = 0;
          if (event.key === "End") nextIndex = buttons.length - 1;
          if (nextIndex === null) {
            return;
          }
  event.preventDefault();
  const target = buttons[nextIndex];
  state.supportOpen = false;
  updateLocation({ pageId: target.dataset.pageId, scenarioId: state.scenarioId });
  requestAnimationFrame(() => {
    const selected = tabsRoot.querySelector(`[data-page-id="${target.dataset.pageId}"]`);
    if (selected) {
      selected.focus();
    }
  });
}

        function getShellPage(pageId) {
          return atlasData.shell_pages.find((page) => page.page_id === pageId);
        }

        function getRoutesByShell(shellFamily) {
          return atlasData.route_records.filter((route) => route.shell_family === shellFamily);
        }

        function getFoundation(shellFamily) {
          return atlasData.interaction_layers.find((row) => row.shell_family === shellFamily);
        }

        function getProfile(shellFamily) {
          return atlasData.selector_profiles.find((profile) => profile.shell_family === shellFamily);
        }

        function makeHeader(page) {
          const header = createElement("section", "content-card page-header");
          const eyebrow = createElement("p", "kicker", page.shell_family || "Cross-shell");
          const title = createElement("h2", "page-title", page.title);
          const subtitle = createElement("p", "page-subtitle", page.subtitle);
          const statement = createElement("p", "page-copy", page.hero_statement);
          header.append(eyebrow, title, subtitle, statement);
          return header;
        }

        function renderOverview() {
          const page = getShellPage("overview");
          const fragment = document.createDocumentFragment();
          fragment.append(makeHeader(page));

          const shellGrid = createElement("section", "page-grid");
          atlasData.shell_families.forEach((shell) => {
            const routes = getRoutesByShell(shell.shell_family);
            const card = createElement("article", "shell-card");
            card.append(
              createElement("p", "kicker", shell.shell_family),
              createElement("h3", "shell-card-title", shell.shell_label),
              createElement("p", "card-copy", shell.owning_object_rule),
            );
            const chips = createElement("div", "chip-row");
            chips.append(
              createChip(`${routes.length} routes`, "chip-accent"),
              createChip(shell.selector_profile),
              createChip(shell.continuity_contract),
            );
            card.append(chips);
            card.append(
              createElement("p", "card-copy", `Surface order: ${shell.default_surface_order.join(" -> ")}`),
              createElement("p", "card-copy", `Support law: ${shell.promoted_support_region_law}`),
            );
            shellGrid.append(card);
          });
          fragment.append(shellGrid);

          const routeMatrix = createElement("section", "content-card");
          routeMatrix.append(
            createElement("p", "kicker", "Route matrix"),
            createElement("h3", "section-title", "Canonical browser route families"),
          );
          const routeTable = createElement("div", "route-table");
          atlasData.route_records.forEach((route) => {
            const row = createElement("div", "route-row");
            const left = createElement("div");
            left.append(
              createElement("p", "route-title", route.route_id),
              createElement("p", "route-meta mono", route.route_pattern),
              createElement("p", "route-note", route.dominant_question),
            );
            const right = createElement("div");
            right.append(
              createElement("p", "route-note", route.promoted_support_region_policy),
              createElement("p", "route-meta mono", route.interaction_layer_contract),
            );
            row.append(left, right);
            routeTable.append(row);
          });
          routeMatrix.append(routeTable);
          fragment.append(routeMatrix);

          const nativeCard = createElement("section", "content-card");
          nativeCard.append(
            createElement("p", "kicker", "Native embodiment"),
            createElement("h3", "section-title", "Embodiments, not shell sprawl"),
            createElement(
              "p",
              "card-copy",
              "Native primary scenes and detached support windows inherit calm-shell continuity. They do not invent a fourth shell family.",
            ),
          );
          const nativeList = createElement("ul", "detail-list");
          atlasData.native_overlays.forEach((overlay) => {
            const item = document.createElement("li");
            item.textContent = `${overlay.scene_type}: ${overlay.scene_order.join(" -> ")}`;
            nativeList.append(item);
          });
          nativeCard.append(nativeList);
          fragment.append(nativeCard);
          return fragment;
        }

        function makeMetricCard(label, value) {
          const row = createElement("div", "metric-line");
          row.append(createElement("span", "metric-label", label), createElement("span", "metric-value", value));
          return row;
        }

        function renderCalmStage() {
          const card = createElement("section", "stage-card");
          card.append(
            createElement("p", "kicker", "Surface demonstrator"),
            createElement("h3", "stage-title", "Four-surface calm shell"),
            createElement("p", "card-copy", "Quiet, summary-first, and support-budgeted. External handoffs and detail work stay parent-bound."),
          );
          const stack = createElement("div", "surface-stack");
          const blocks = [
            ["context-bar", "CONTEXT_BAR", "Current object, settlement posture, typed notices, and return path."],
            ["decision-summary", "DECISION_SUMMARY", "Dominant question, lawful state, and highest-signal decision context."],
            ["action-strip", "ACTION_STRIP", "Exactly one dominant action plus fail-closed no-safe-action posture."],
            ["detail-drawer", "DETAIL_DRAWER", "Evidence, packet, authority, drift, focus, and twin-lens support modules."],
          ];
          blocks.forEach(([testId, title, copy]) => {
            const block = createElement("div", "surface-block");
            block.dataset.testid = testId;
            block.append(createElement("strong", "", title), createElement("span", "", copy));
            stack.append(block);
          });
          const metadata = createElement("div", "chip-row");
          [
            ["shell-family", "CALM_SHELL"],
            ["object-anchor", "RunManifest / WorkflowItem anchor"],
            ["dominant-question", "One dominant question"],
            ["settlement-posture", "Settlement posture"],
            ["recovery-posture", "Recovery posture"],
            ["primary-action", "Primary action"],
          ].forEach(([testId, label]) => metadata.append(createChip(label, "chip-accent", testId)));
          card.append(stack, metadata);
          return card;
        }

        function renderPortalStage() {
          const card = createElement("section", "stage-card");
          card.append(
            createElement("p", "kicker", "Surface demonstrator"),
            createElement("h3", "stage-title", "Client-safe primary stack"),
            createElement("p", "card-copy", "One primary task column, plain-language status, and contextual support that never leaks internal workflow state."),
          );
          const stage = createElement("div", "portal-stage");
          [
            ["portal-shell", "PORTAL_HEADER", "Top-level destination framing and client-safe context."],
            ["portal-status-hero", "STATUS_HERO", "Next required client action with typed status language."],
            ["portal-primary-action", "PRIMARY_ACTION", "Single lawful CTA for documents, approvals, onboarding, or help."],
            ["portal-support-panel", "PROMOTED_SUPPORT_REGION", "Stacked support content beneath the primary task."],
            ["portal-current-artifact", "CURRENT_ARTIFACT", "Current client-visible artifact or handoff target."],
            ["portal-history-list", "HISTORY", "Historical items remain distinct from the current artifact."],
          ].forEach(([testId, title, copy]) => {
            const block = createElement("div", "portal-block");
            block.dataset.testid = testId;
            block.append(createElement("strong", "", title), createElement("span", "", copy));
            stage.append(block);
          });
          const chips = createElement("div", "chip-row");
          [
            ["portal-route-tabs", "Five top-level destinations"],
            ["portal-request-focus", "Contextual request detail"],
            ["portal-inline-recovery", "Inline recovery only"],
            ["return-path-control", "Return path"],
          ].forEach(([testId, label]) => chips.append(createChip(label, "chip-accent", testId)));
          card.append(stage, chips);
          return card;
        }

        function renderGovernanceStage() {
          const card = createElement("section", "stage-card");
          card.append(
            createElement("p", "kicker", "Surface demonstrator"),
            createElement("h3", "stage-title", "Governance density shell"),
            createElement("p", "card-copy", "Dense admin workspaces still respect one dominant question, one promoted auxiliary surface, and inline typed recovery."),
          );
          const stage = createElement("div", "governance-stage");

          const left = createElement("div", "governance-block");
          left.dataset.testid = "governance-primary-worklist";
          left.append(createElement("strong", "", "INVENTORY_RAIL"), createElement("span", "", "Filter slice, object selection, and route-stable worklist."));
          stage.append(left);

          const middle = createElement("div", "governance-block");
          middle.dataset.compact = "tall";
          middle.dataset.testid = "governance-workspace-header";
          middle.append(createElement("strong", "", "WORKSPACE_CANVAS"), createElement("span", "", "Primary diff, mutation, simulation, or audit canvas driven by the selected governance object."));
          stage.append(middle);

          const right = createElement("div", "governance-block");
          right.dataset.testid = "governance-support-sidecar";
          right.append(createElement("strong", "", "AUDIT_SIDECAR"), createElement("span", "", "One promoted auxiliary surface for diff, audit, blast radius, or chain detail."));
          stage.append(right);

          const chips = createElement("div", "chip-row");
          [
            ["governance-shell-family", "GOVERNANCE_DENSITY_SHELL"],
            ["governance-context-bar", "Context bar"],
            ["overview-attention-summary", "Attention summary"],
            ["change-basket", "Change basket"],
            ["approval-composer", "Approval composer"],
            ["governance-section-nav", "Section nav"],
          ].forEach(([testId, label]) => chips.append(createChip(label, "chip-accent", testId)));
          card.append(stage, chips);
          return card;
        }

        function renderShellPage(pageId) {
          const page = getShellPage(pageId);
          const routes = getRoutesByShell(page.shell_family);
          const foundation = getFoundation(page.shell_family);
          const profile = getProfile(page.shell_family);
          const fragment = document.createDocumentFragment();
          fragment.append(makeHeader(page));

          const topGrid = createElement("section", "shell-grid");
          let stage;
          if (pageId === "calm") stage = renderCalmStage();
          if (pageId === "portal") stage = renderPortalStage();
          if (pageId === "governance") stage = renderGovernanceStage();
          topGrid.append(stage);

          const lawCard = createElement("article", "content-card");
          lawCard.append(
            createElement("p", "kicker", "Foundation"),
            createElement("h3", "section-title", "Interaction-layer contract"),
            createElement("p", "card-copy", `${foundation.interaction_layer_contract} with ${foundation.behavior_contract.selector_profile}.`),
          );
          const chips = createElement("div", "chip-row");
          chips.append(
            createChip(foundation.behavior_contract.continuity_policy, "chip-accent"),
            createChip(foundation.design_tokens.layout_density_token),
            createChip(foundation.design_tokens.responsive_compaction_token),
          );
          lawCard.append(chips);
          lawCard.append(
            makeMetricCard("History presentation", foundation.behavior_contract.history_presentation_policy),
            makeMetricCard("Preview surface", foundation.behavior_contract.preview_surface_policy),
            makeMetricCard("Notification surface", foundation.behavior_contract.notification_surface_policy),
            makeMetricCard("Secondary window policy", foundation.behavior_contract.secondary_window_policy),
          );
          topGrid.append(lawCard);
          fragment.append(topGrid);

          const detailGrid = createElement("section", "detail-grid");
          const selectorsCard = createElement("article", "content-card");
          selectorsCard.append(
            createElement("p", "kicker", "Selectors"),
            createElement("h3", "section-title", "Semantic selector roster"),
            createElement("p", "card-copy", `Profile ${profile.profile_id} contributes ${profile.selector_entries.length} semantic anchors.`),
          );
          const selectorChips = createElement("div", "chip-row");
          profile.selector_entries.slice(0, 16).forEach((entry) => selectorChips.append(createChip(entry.selector)));
          selectorsCard.append(selectorChips);
          detailGrid.append(selectorsCard);

          const lawsCard = createElement("article", "content-card");
          lawsCard.append(
            createElement("p", "kicker", "Route law"),
            createElement("h3", "section-title", "Shell invariants"),
          );
          const lawList = createElement("ul", "detail-list");
          [
            routes[0]?.promoted_support_region_policy,
            routes[0]?.dominant_action_policy,
            `Required stability keys include ${routes[0]?.required_stability_keys.slice(0, 4).join(", ")} and route-specific context extensions.`,
            `Recovery postures are governed by ${routes[0]?.recovery_postures.join(", ")}.`,
          ].filter(Boolean).forEach((item) => {
            const li = document.createElement("li");
            li.textContent = item;
            lawList.append(li);
          });
          lawsCard.append(lawList);
          detailGrid.append(lawsCard);
          fragment.append(detailGrid);

          const routeSection = createElement("section", "route-grid");
          routes.forEach((route) => {
            const card = createElement("article", "route-card");
            card.dataset.testid = `route-card-${route.route_id}`;
            card.append(
              createElement("p", "kicker", route.shell_family),
              createElement("h3", "route-title", route.route_id),
              createElement("p", "route-meta mono", route.route_pattern),
              createElement("p", "route-note", route.dominant_question),
            );
            const chipRow = createElement("div", "route-chip-row");
            chipRow.append(
              createChip(route.owning_object_family, "chip-accent"),
              createChip(route.viewer_capability_profile),
              createChip(route.interaction_layer_contract),
            );
            card.append(chipRow);
            const list = createElement("ul", "route-list");
            [route.dominant_action_policy, route.promoted_support_region_policy, `Focus order: ${route.focus_order.join(" -> ")}`].forEach((item) => {
              const li = document.createElement("li");
              li.textContent = item;
              list.append(li);
            });
            card.append(list);
            routeSection.append(card);
          });
          fragment.append(routeSection);
          return fragment;
        }

        function renderContinuityPage() {
          const page = getShellPage("continuity");
          const scenario = atlasData.continuity_scenarios.find((item) => item.scenario_id === state.scenarioId);
          const fragment = document.createDocumentFragment();
          fragment.append(makeHeader(page));

          const grid = createElement("section", "continuity-grid");
          const selectors = createElement("article", "content-card");
          selectors.append(
            createElement("p", "kicker", "Scenarios"),
            createElement("h3", "section-title", "Recovery scenario rail"),
          );
          const selectorList = createElement("div", "scenario-selector-list");
          atlasData.continuity_scenarios.forEach((item) => {
            const button = createElement("button", "scenario-selector");
            button.type = "button";
            button.dataset.testid = `continuity-scenario-${item.scenario_id}`;
            button.setAttribute("aria-pressed", String(item.scenario_id === state.scenarioId));
            button.append(
              createElement("span", "kicker", item.recovery_mode),
              createElement("strong", "route-title", item.scenario_id),
              createElement("span", "card-copy", item.trigger),
            );
            button.addEventListener("click", () => {
              state.supportOpen = false;
              updateLocation({ pageId: "continuity", scenarioId: item.scenario_id });
            });
            selectorList.append(button);
          });
          selectors.append(selectorList);
          grid.append(selectors);

          const detail = createElement("article", "scenario-card");
          detail.append(
            createElement("p", "kicker", scenario.recovery_mode),
            createElement("h3", "scenario-title", scenario.scenario_id),
            createElement("p", "scenario-copy", scenario.trigger),
          );
          const chipRow = createElement("div", "scenario-chip-row");
          chipRow.append(
            createChip(`${scenario.applicable_shells.length} shell families`, "chip-accent"),
            createChip(scenario.announcement_posture === "assertive" ? "assertive live region" : "polite live region", scenario.announcement_posture === "assertive" ? "chip-danger" : "chip-success"),
          );
          detail.append(chipRow);
          const lists = createElement("div", "detail-grid");
          const invariants = createElement("section", "content-card");
          invariants.append(createElement("p", "kicker", "Preserved invariants"), createElement("h3", "section-title", "What must survive"));
          const invariantList = createElement("ul", "detail-list");
          scenario.preserved_invariants.forEach((item) => {
            const li = document.createElement("li");
            li.textContent = item;
            invariantList.append(li);
          });
          invariants.append(invariantList);
          lists.append(invariants);

          const focus = createElement("section", "content-card");
          focus.append(createElement("p", "kicker", "Focus restoration"), createElement("h3", "section-title", "Fallback order"));
          const focusList = createElement("ol", "detail-list");
          focusList.dataset.testid = "continuity-restoration-order";
          scenario.focus_restore_order.forEach((item) => {
            const li = document.createElement("li");
            li.textContent = item;
            focusList.append(li);
          });
          focus.append(focusList);
          lists.append(focus);
          detail.append(lists);

          const live = createElement("div", "live-region");
          live.dataset.testid = "continuity-live-region";
          live.setAttribute("aria-live", scenario.announcement_posture);
          live.textContent = `Announcement posture: ${scenario.announcement_posture}. Recovery mode: ${scenario.recovery_mode}.`;
          detail.append(live);

          const supportDemo = createElement("section", "support-demo");
          supportDemo.append(
            createElement("p", "kicker", "Return target demo"),
            createElement("h3", "section-title", "Support region close returns focus"),
            createElement("p", "card-copy", "Open the support region, then close it. Focus returns to the invoker to model parent-bound support law."),
          );

          const controls = createElement("div", "support-controls");
          const openButton = createElement("button", "button button-primary", "Open support region");
          openButton.type = "button";
          openButton.dataset.testid = "continuity-open-support";
          openButton.addEventListener("click", () => {
            state.supportOpen = true;
            render();
          });
          controls.append(openButton);
          supportDemo.append(controls);

          const panel = createElement("div", "support-panel");
          panel.dataset.testid = "continuity-support-panel";
          panel.hidden = !state.supportOpen;
          panel.append(
            createElement("p", "kicker", "Support-only overlay"),
            createElement("p", "card-copy", "This panel stands in for compare, audit, packet review, or authority support windows."),
          );
          const closeButton = createElement("button", "button", "Close and restore focus");
          closeButton.type = "button";
          closeButton.dataset.testid = "continuity-close-support";
          closeButton.addEventListener("click", () => {
            state.supportOpen = false;
            render();
            requestAnimationFrame(() => {
              const invoker = document.querySelector("[data-testid='continuity-open-support']");
              if (invoker) invoker.focus();
            });
          });
          panel.append(closeButton);
          supportDemo.append(panel);
          detail.append(supportDemo);

          grid.append(detail);
          fragment.append(grid);
          return fragment;
        }

        function render() {
          renderTabs();
          contentPane.id = "atlas-panel";
          contentPane.setAttribute("aria-labelledby", `atlas-tab-${state.pageId}`);
          contentPane.replaceChildren();
          let fragment;
          if (state.pageId === "overview") {
            fragment = renderOverview();
          } else if (state.pageId === "continuity") {
            fragment = renderContinuityPage();
          } else {
            fragment = renderShellPage(state.pageId);
          }
          contentPane.append(fragment);
        }

        async function bootstrap() {
          setMotionMode();
          window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", setMotionMode);
          const response = await fetch("./atlas_data.json");
          atlasData = await response.json();
          renderSummaryCards();
          renderAssumptions();
          const locationState = parseLocationState();
          updateLocation({ pageId: locationState.pageId || DEFAULT_PAGE, scenarioId: locationState.scenarioId || "refresh_preserves_same_object" }, true);
          window.addEventListener("popstate", syncStateFromLocation);
        }

        bootstrap().catch((error) => {
          contentPane.textContent = `Failed to load atlas: ${error.message}`;
        });
        """
    ).strip()


def render_playwright_spec() -> str:
    return dedent(
        """
        import { expect, test } from "@playwright/test";

        const atlasPath = "/prototypes/analysis/frontend_contract_atlas/index.html";

        async function gotoAtlas(page: Parameters<typeof test>[0]["page"], hash = "#page=overview") {
          await page.goto(`${atlasPath}${hash}`);
          await expect(page.getByTestId("frontend-contract-atlas")).toBeVisible();
          await expect(page.getByRole("tablist", { name: "Shell families" })).toBeVisible();
        }

        test("overview renders shell summary and route matrix", async ({ page }) => {
          await gotoAtlas(page);
          await expect(page.getByText("Frontend Contract Atlas")).toBeVisible();
          await expect(page.getByTestId("atlas-summary-shells")).toContainText("3");
          await expect(page.getByTestId("atlas-summary-routes")).toContainText("21");
          await expect(page.getByRole("tab", { name: "CALM_SHELL" })).toBeVisible();
          await expect(page.getByText("Canonical browser route families")).toBeVisible();
        });

        test("shell tabs switch between calm, portal, and governance pages", async ({ page }) => {
          await gotoAtlas(page);
          await page.getByRole("tab", { name: "CALM_SHELL" }).click();
          await expect(page.getByTestId("context-bar")).toBeVisible();
          await expect(page.getByTestId("detail-drawer")).toBeVisible();

          await page.getByRole("tab", { name: "CLIENT_PORTAL_SHELL" }).click();
          await expect(page.getByTestId("portal-shell")).toBeVisible();
          await expect(page.getByTestId("portal-route-tabs")).toBeVisible();

          await page.getByRole("tab", { name: "GOVERNANCE_DENSITY_SHELL" }).click();
          await expect(page.getByTestId("governance-primary-worklist")).toBeVisible();
          await expect(page.getByTestId("governance-support-sidecar")).toBeVisible();
        });

        test("overview screenshot baseline", async ({ page }) => {
          await gotoAtlas(page);
          await expect(page.getByTestId("frontend-contract-atlas")).toHaveScreenshot("frontend-contract-atlas-overview.png", {
            animations: "disabled",
            fullPage: true,
          });
        });

        test("continuity lab screenshot baseline", async ({ page }) => {
          await gotoAtlas(page, "#page=continuity&scenario=publication_or_epoch_rebase");
          await expect(page.getByTestId("frontend-contract-atlas")).toHaveScreenshot("frontend-contract-atlas-continuity.png", {
            animations: "disabled",
            fullPage: true,
          });
        });
        """
    ).strip()


def render_playwright_continuity_spec() -> str:
    return dedent(
        """
        import { expect, test } from "@playwright/test";

        const atlasPath = "/prototypes/analysis/frontend_contract_atlas/index.html";

        async function gotoContinuity(page: Parameters<typeof test>[0]["page"], scenario = "refresh_preserves_same_object") {
          await page.goto(`${atlasPath}#page=continuity&scenario=${scenario}`);
          await expect(page.getByTestId("frontend-contract-atlas")).toBeVisible();
          await expect(page.getByRole("tab", { name: "Continuity Lab" })).toHaveAttribute("aria-selected", "true");
        }

        test("scenario selection updates the live region and restoration order", async ({ page }) => {
          await gotoContinuity(page);
          await page.getByTestId("continuity-scenario-publication_or_epoch_rebase").click();
          await expect(page.getByRole("heading", { name: "publication_or_epoch_rebase" })).toBeVisible();
          await expect(page.getByTestId("continuity-live-region")).toHaveAttribute("aria-live", "assertive");
          await expect(page.getByTestId("continuity-restoration-order")).toContainText("serialized parent return target");
        });

        test("support region close returns focus to the invoker", async ({ page }) => {
          await gotoContinuity(page, "secondary_window_return");
          const opener = page.getByTestId("continuity-open-support");
          await opener.click();
          await expect(page.getByTestId("continuity-support-panel")).toBeVisible();
          await page.getByTestId("continuity-close-support").click();
          await expect(opener).toBeFocused();
        });

        test("back and forward navigation preserve page and scenario history", async ({ page }) => {
          await page.goto(`${atlasPath}#page=overview`);
          await page.getByRole("tab", { name: "CALM_SHELL" }).click();
          await page.getByRole("tab", { name: "Continuity Lab" }).click();
          await page.getByTestId("continuity-scenario-cache_hydration_purge_and_rebase").click();
          await page.goBack();
          await expect(page.getByRole("tab", { name: "Continuity Lab" })).toHaveAttribute("aria-selected", "true");
          await expect(page.getByRole("heading", { name: "refresh_preserves_same_object" })).toBeVisible();
          await page.goBack();
          await expect(page.getByRole("tab", { name: "CALM_SHELL" })).toHaveAttribute("aria-selected", "true");
          await page.goForward();
          await expect(page.getByRole("tab", { name: "Continuity Lab" })).toHaveAttribute("aria-selected", "true");
        });

        test.describe("reduced motion", () => {
          test.use({ reducedMotion: "reduce" });

          test("reduced motion mode is surfaced without changing semantic state", async ({ page }) => {
            await page.emulateMedia({ reducedMotion: "reduce" });
            await gotoContinuity(page, "reduced_motion_semantic_equivalence");
            await expect
              .poll(async () => page.evaluate(() => document.documentElement.dataset.motion))
              .toBe("reduce");
            await expect(page.getByTestId("motion-mode")).toContainText("reduce");
          });
        });
        """
    ).strip()


def render_playwright_accessibility_spec() -> str:
    return dedent(
        """
        import { expect, test } from "@playwright/test";

        const atlasPath = "/prototypes/analysis/frontend_contract_atlas/index.html";

        async function gotoAtlas(page: Parameters<typeof test>[0]["page"], hash = "#page=overview") {
          await page.goto(`${atlasPath}${hash}`);
          await expect(page.getByTestId("frontend-contract-atlas")).toBeVisible();
        }

        test("tab keyboard navigation works across the atlas pages", async ({ page }) => {
          await gotoAtlas(page);
          const overview = page.getByRole("tab", { name: "Overview" });
          await overview.focus();
          await page.keyboard.press("ArrowRight");
          await expect(page.getByRole("tab", { name: "CALM_SHELL" })).toHaveAttribute("aria-selected", "true");
          await page.keyboard.press("End");
          await expect(page.getByRole("tab", { name: "Continuity Lab" })).toHaveAttribute("aria-selected", "true");
          await page.keyboard.press("Home");
          await expect(page.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
        });

        test("calm shell page exposes the required semantic anchors", async ({ page }) => {
          await gotoAtlas(page, "#page=calm");
          await expect(page.getByTestId("context-bar")).toBeVisible();
          await expect(page.getByTestId("decision-summary")).toBeVisible();
          await expect(page.getByTestId("action-strip")).toBeVisible();
          await expect(page.getByTestId("detail-drawer")).toBeVisible();
          await expect(page.getByTestId("primary-action")).toBeVisible();
        });

        test("portal shell page exposes the client-safe semantic anchors", async ({ page }) => {
          await gotoAtlas(page, "#page=portal");
          await expect(page.getByTestId("portal-shell")).toBeVisible();
          await expect(page.getByTestId("portal-status-hero")).toBeVisible();
          await expect(page.getByTestId("portal-primary-action")).toBeVisible();
          await expect(page.getByTestId("portal-support-panel")).toBeVisible();
          await expect(page.getByTestId("portal-history-list")).toBeVisible();
        });

        test("governance shell page exposes the governance semantic anchors", async ({ page }) => {
          await gotoAtlas(page, "#page=governance");
          await expect(page.getByTestId("governance-shell-family")).toBeVisible();
          await expect(page.getByTestId("governance-context-bar")).toBeVisible();
          await expect(page.getByTestId("governance-primary-worklist")).toBeVisible();
          await expect(page.getByTestId("overview-attention-summary")).toBeVisible();
          await expect(page.getByTestId("governance-support-sidecar")).toBeVisible();
        });

        test("continuity lab toggles polite and assertive live regions", async ({ page }) => {
          await gotoAtlas(page, "#page=continuity&scenario=refresh_preserves_same_object");
          await expect(page.getByTestId("continuity-live-region")).toHaveAttribute("aria-live", "polite");
          await page.getByTestId("continuity-scenario-access_rebind_after_scope_change").click();
          await expect(page.getByTestId("continuity-live-region")).toHaveAttribute("aria-live", "assertive");
        });
        """
    ).strip()


def main() -> None:
    assert_source_grounding()
    shell_families = build_shell_families()
    route_records = build_route_records()
    shell_route_matrix = build_shell_route_matrix(shell_families, route_records)
    interaction_layer_map = build_interaction_layer_foundation_map()
    selector_registry = build_semantic_selector_registry(route_records)
    continuity_matrix = build_continuity_recovery_matrix()
    layout_contract = build_layout_breakpoint_contract()
    focus_registry = build_route_focus_registry(route_records)
    atlas_data = build_atlas_data(
        shell_route_matrix=shell_route_matrix,
        interaction_layer_map=interaction_layer_map,
        selector_registry=selector_registry,
        continuity_matrix=continuity_matrix,
        layout_contract=layout_contract,
    )

    write_json(SHELL_ROUTE_MATRIX_PATH, shell_route_matrix)
    write_json(INTERACTION_LAYER_MAP_PATH, interaction_layer_map)
    write_json(SEMANTIC_SELECTOR_REGISTRY_PATH, selector_registry)
    write_json(CONTINUITY_RECOVERY_MATRIX_PATH, continuity_matrix)
    write_json(LAYOUT_BREAKPOINT_CONTRACT_PATH, layout_contract)
    write_json(ROUTE_FOCUS_REGISTRY_PATH, focus_registry)
    write_json(ATLAS_DATA_PATH, atlas_data)

    write_text(FRONTEND_REQUIREMENTS_PATH, render_frontend_requirements_doc(shell_route_matrix, interaction_layer_map))
    write_text(VISUAL_SYSTEM_PATH, render_visual_system_doc(layout_contract, interaction_layer_map))
    write_text(VALIDATION_PLAN_PATH, render_validation_plan_doc(selector_registry, continuity_matrix))

    write_text(ATLAS_INDEX_PATH, render_index_html())
    write_text(ATLAS_STYLES_PATH, render_styles_css())
    write_text(ATLAS_APP_PATH, render_app_js())

    write_text(PLAYWRIGHT_SPEC_PATH, render_playwright_spec())
    write_text(PLAYWRIGHT_CONTINUITY_SPEC_PATH, render_playwright_continuity_spec())
    write_text(PLAYWRIGHT_ACCESSIBILITY_SPEC_PATH, render_playwright_accessibility_spec())

    print(
        "frontend_contract_atlas built:"
        f" routes={shell_route_matrix['summary']['route_count']}"
        f" selectors={selector_registry['summary']['selector_count']}"
        f" scenarios={continuity_matrix['summary']['scenario_count']}"
    )


if __name__ == "__main__":
    main()
