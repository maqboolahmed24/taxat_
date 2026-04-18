#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[2]
ALGORITHM_DIR = ROOT / "Algorithm"
DATA_ANALYSIS_DIR = ROOT / "data" / "analysis"
DOCS_ANALYSIS_DIR = ROOT / "docs" / "analysis"
DOCS_ARCH_ADR_DIR = ROOT / "docs" / "architecture" / "adr"
DIAGRAMS_ANALYSIS_DIR = ROOT / "diagrams" / "analysis"

MACOS_BLUEPRINT_PATH = ALGORITHM_DIR / "macos_native_operator_workspace_blueprint.md"
FRONTEND_SHELL_PATH = ALGORITHM_DIR / "frontend_shell_and_interaction_law.md"
FOUNDATION_PATH = (
    ALGORITHM_DIR
    / "cross_shell_design_token_and_interaction_layer_foundation_contract.md"
)
LOW_NOISE_PATH = ALGORITHM_DIR / "low_noise_experience_contract.md"
COLLABORATION_PATH = ALGORITHM_DIR / "collaboration_workspace_contract.md"
GOVERNANCE_PATH = ALGORITHM_DIR / "admin_governance_console_architecture.md"
NORTHBOUND_PATH = ALGORITHM_DIR / "northbound_api_and_session_contract.md"
SECURITY_PATH = ALGORITHM_DIR / "security_and_runtime_hardening_contract.md"
NATIVE_CACHE_PATH = ALGORITHM_DIR / "native_cache_hydration_purge_and_rebase_contract.md"
CACHE_ISOLATION_PATH = ALGORITHM_DIR / "cache_isolation_and_secure_reuse_contract.md"
UIUX_PATH = ALGORITHM_DIR / "UIUX_DESIGN_SKILL.md"

EXISTING_NATIVE_TOPOLOGY_PATH = DATA_ANALYSIS_DIR / "native_scene_window_topology.json"
IDENTITY_BOUNDARY_PATH = (
    DATA_ANALYSIS_DIR / "browser_native_automation_identity_boundary.json"
)
DEEP_LINK_RULES_PATH = DATA_ANALYSIS_DIR / "deep_link_invite_and_resume_rules.json"
SESSION_FLOW_PATH = DATA_ANALYSIS_DIR / "session_flow_matrix.json"
READ_MODEL_ROUTE_MAP_PATH = DATA_ANALYSIS_DIR / "read_model_to_route_and_shell_map.json"
WEB_TOPOLOGY_PATH = DATA_ANALYSIS_DIR / "web_surface_topology_and_deployable_map.json"

ADR_PATH = DOCS_ARCH_ADR_DIR / "ADR-007-native-macos-delivery-strategy.md"
COMPARISON_PATH = (
    DOCS_ARCH_ADR_DIR / "ADR-007-native-macos-delivery-strategy-comparison.md"
)
SCORECARD_PATH = (
    DOCS_ARCH_ADR_DIR / "ADR-007-native-macos-delivery-strategy-scorecard.json"
)
SCENE_TOPOLOGY_PATH = DATA_ANALYSIS_DIR / "native_scene_and_window_topology.json"
TRANSLATION_MAP_PATH = DATA_ANALYSIS_DIR / "native_platform_translation_map.json"
CACHE_SECURITY_PATH = (
    DATA_ANALYSIS_DIR / "native_cache_session_and_security_boundary.json"
)
ROLLOUT_PATH = DATA_ANALYSIS_DIR / "native_feature_rollout_sequence.json"
HANDOFF_TEST_PATH = DATA_ANALYSIS_DIR / "native_handoff_and_test_strategy.json"
MERMAID_PATH = DIAGRAMS_ANALYSIS_DIR / "ADR-007-native-macos-delivery-strategy.mmd"
SCENE_ATLAS_PATH = DOCS_ANALYSIS_DIR / "native_operator_scene_atlas.md"

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


def build_supporting_context() -> dict[str, Any]:
    native_topology = load_json(EXISTING_NATIVE_TOPOLOGY_PATH)
    identity_boundaries = load_json(IDENTITY_BOUNDARY_PATH)
    deep_link_rules = load_json(DEEP_LINK_RULES_PATH)
    session_flows = load_json(SESSION_FLOW_PATH)
    route_map = load_json(READ_MODEL_ROUTE_MAP_PATH)
    web_topology = load_json(WEB_TOPOLOGY_PATH)

    native_routes = [
        row for row in route_map["routes"] if row["embodiment"].startswith("NATIVE")
    ]
    return {
        "xcode_package_count": len(native_topology["xcode_workspace_topology"]),
        "existing_scene_count": len(native_routes),
        "existing_primary_scene_count": len(native_topology["primary_scenes"]),
        "existing_secondary_window_count": len(native_topology["secondary_windows"]),
        "identity_boundary_count": identity_boundaries["summary"]["boundary_count"],
        "resume_rule_count": deep_link_rules["summary"]["rule_count"],
        "session_flow_count": session_flows["summary"]["flow_count"],
        "web_deployable_count": web_topology["summary"]["deployable_count"],
    }


def build_native_scene_and_window_topology() -> dict[str, Any]:
    existing_topology = load_json(EXISTING_NATIVE_TOPOLOGY_PATH)

    scenes = [
        {
            "scene_id": "native_primary_manifest_scene",
            "scene_kind": "PRIMARY_WORKSPACE",
            "window_role": "Daily manifest decision workspace",
            "default_size_px": {"width": 1560, "height": 980},
            "minimum_size_px": {"width": 1280, "height": 820},
            "shell_family": "CALM_SHELL",
            "layout_regions": [
                {"region": "leading_sidebar", "width_pt": "260-300"},
                {"region": "central_workspace", "minimum_width_pt": 820},
                {"region": "trailing_inspector", "width_pt": "320-380"},
            ],
            "support_surface_rule": "The trailing inspector is the single promoted support surface. It may collapse or detach but never becomes a second writable action strip.",
            "read_models": [
                "DecisionBundle",
                "ExperienceCursor",
                "WorkspaceSnapshot (linked focus when present)",
            ],
            "implementation_split": {
                "swiftui_default": [
                    "NavigationSplitView shell composition",
                    "context bar and decision summary",
                    "inspector orchestration",
                ],
                "appkit_escalation": [
                    "very large evidence tables",
                    "precision diff or attributed-text viewers",
                ],
            },
            "restoration_class": "SESSION_MASKING_AND_ROUTE_GUARD",
            "browser_handoff_return_rule": "System-browser auth, help, or authority checkpoint returns to the same manifest object and focus anchor.",
            "source_refs": [
                heading_ref(
                    MACOS_BLUEPRINT_PATH, "5. Preferred window and scene architecture"
                ),
                heading_ref(MACOS_BLUEPRINT_PATH, "9. SwiftUI versus AppKit decision matrix"),
                heading_ref(LOW_NOISE_PATH, "Default visible shell"),
            ],
        },
        {
            "scene_id": "native_primary_work_item_scene",
            "scene_kind": "PRIMARY_WORKSPACE",
            "window_role": "Daily collaboration and work-item workspace",
            "default_size_px": {"width": 1560, "height": 980},
            "minimum_size_px": {"width": 1280, "height": 820},
            "shell_family": "CALM_SHELL",
            "layout_regions": [
                {"region": "leading_sidebar", "width_pt": "260-300"},
                {"region": "central_workspace", "minimum_width_pt": 820},
                {"region": "trailing_inspector", "width_pt": "320-380"},
            ],
            "support_surface_rule": "Inspector, detached previews, and support windows remain subordinate to the work-item action posture and never replace the dominant question.",
            "read_models": [
                "WorkspaceSnapshot",
                "WorkspaceDelta",
                "WorkspaceCursor",
            ],
            "implementation_split": {
                "swiftui_default": [
                    "workspace shell composition",
                    "assignment and activity modules",
                    "command surfaces",
                ],
                "appkit_escalation": [
                    "multi-column activity timelines",
                    "dense attachment or provenance lists",
                ],
            },
            "restoration_class": "SESSION_MASKING_AND_ROUTE_GUARD",
            "browser_handoff_return_rule": "Browser-owned checkpoint or reconnect recovery returns to the same work item, module anchor, and inspector posture.",
            "source_refs": [
                heading_ref(MACOS_BLUEPRINT_PATH, "6. Data flow and synchronization model"),
                heading_ref(
                    COLLABORATION_PATH, "11. Accessibility and responsive rules"
                ),
                heading_ref(
                    COLLABORATION_PATH, "12. Playwright scenarios"
                ),
            ],
        },
        {
            "scene_id": "native_secondary_compare_window",
            "scene_kind": "SECONDARY_SUPPORT_WINDOW",
            "window_role": "Detached comparison and drift investigation",
            "default_size_px": {"width": 1320, "height": 840},
            "minimum_size_px": {"width": 960, "height": 720},
            "shell_family": "CALM_SHELL",
            "layout_regions": [
                {"region": "identity_header", "order": 1},
                {"region": "summary_card", "order": 2},
                {"region": "detail_body", "order": 3},
            ],
            "support_surface_rule": "Support-only detached window; may print or export but never publishes a competing primary action strip for the same object.",
            "implementation_split": {
                "swiftui_default": ["window coordination", "header and summary shell"],
                "appkit_escalation": [
                    "side-by-side diff viewer",
                    "complex evidence comparison tables",
                ],
            },
            "restoration_class": "SESSION_MASKING_AND_PARENT_SCENE",
            "source_refs": normalize_source_refs(
                existing_topology["secondary_windows"][0]["source_refs"]
            ),
        },
        {
            "scene_id": "native_secondary_audit_window",
            "scene_kind": "SECONDARY_SUPPORT_WINDOW",
            "window_role": "Detached audit and provenance investigation",
            "default_size_px": {"width": 960, "height": 720},
            "minimum_size_px": {"width": 960, "height": 720},
            "shell_family": "CALM_SHELL",
            "layout_regions": [
                {"region": "identity_header", "order": 1},
                {"region": "summary_card", "order": 2},
                {"region": "detail_body", "order": 3},
            ],
            "support_surface_rule": "Audit detail stays summary-first and parent-bound; it enriches the parent investigation rather than becoming a separate legal workspace.",
            "implementation_split": {
                "swiftui_default": ["window frame and inspector shell"],
                "appkit_escalation": [
                    "virtualized audit tables",
                    "multi-column provenance explorers",
                ],
            },
            "restoration_class": "SESSION_MASKING_AND_PARENT_SCENE",
            "source_refs": normalize_source_refs(
                existing_topology["secondary_windows"][1]["source_refs"]
            )
            + [heading_ref(GOVERNANCE_PATH, "8. Accessibility and responsive requirements")],
        },
        {
            "scene_id": "native_secondary_filing_packet_window",
            "scene_kind": "SECONDARY_SUPPORT_WINDOW",
            "window_role": "Filing-packet review, preview, and export surface",
            "default_size_px": {"width": 960, "height": 720},
            "minimum_size_px": {"width": 960, "height": 720},
            "shell_family": "CALM_SHELL",
            "layout_regions": [
                {"region": "identity_header", "order": 1},
                {"region": "summary_card", "order": 2},
                {"region": "detail_body", "order": 3},
            ],
            "support_surface_rule": "Quick Look, print, and export remain governed support affordances subject to masking and preview-subject legality.",
            "implementation_split": {
                "swiftui_default": ["preview shell", "export posture indicators"],
                "appkit_escalation": ["print fidelity", "document preview integration"],
            },
            "restoration_class": "SESSION_MASKING_AND_PARENT_SCENE",
            "source_refs": normalize_source_refs(
                existing_topology["secondary_windows"][2]["source_refs"]
            )
            + [heading_ref(MACOS_BLUEPRINT_PATH, "10. Native UX opportunities that should replace browser habits")],
        },
        {
            "scene_id": "native_secondary_authority_review_window",
            "scene_kind": "SECONDARY_SUPPORT_WINDOW",
            "window_role": "Authority review and reconciliation support surface",
            "default_size_px": {"width": 960, "height": 720},
            "minimum_size_px": {"width": 960, "height": 720},
            "shell_family": "CALM_SHELL",
            "layout_regions": [
                {"region": "identity_header", "order": 1},
                {"region": "summary_card", "order": 2},
                {"region": "detail_body", "order": 3},
            ],
            "support_surface_rule": "Authority review stays parent-bound and may launch system-browser authority tasks, but completion is never inferred locally.",
            "implementation_split": {
                "swiftui_default": ["review shell", "binding-health summary"],
                "appkit_escalation": ["dense reconciliation lists", "long-form detail panes"],
            },
            "restoration_class": "SESSION_MASKING_AND_PARENT_SCENE",
            "source_refs": normalize_source_refs(
                existing_topology["secondary_windows"][3]["source_refs"]
            ),
        },
        {
            "scene_id": "native_settings_and_utility_scene",
            "scene_kind": "UTILITY_SUPPORT_SCENE",
            "window_role": "Settings, diagnostics, and compatibility utility flow",
            "default_size_px": {"width": 820, "height": 620},
            "minimum_size_px": {"width": 760, "height": 560},
            "shell_family": "NO_NEW_LEGAL_SHELL",
            "layout_regions": [
                {"region": "preferences_list", "order": 1},
                {"region": "detail_panel", "order": 2},
            ],
            "support_surface_rule": "Utility flows do not introduce a fourth shell family; they remain non-legal support surfaces tied to the current operator session.",
            "implementation_split": {
                "swiftui_default": [
                    "settings panes",
                    "diagnostic posture",
                    "feature and compatibility notices",
                ],
                "appkit_escalation": [],
            },
            "restoration_class": "SESSION_AND_COMPATIBILITY_GUARD",
            "source_refs": [
                heading_ref(MACOS_BLUEPRINT_PATH, "3. Recommended Xcode workspace topology"),
                heading_ref(MACOS_BLUEPRINT_PATH, "13. Delivery sequencing"),
            ],
        },
    ]

    browser_handoff_boundary = {
        "boundary_id": "native_system_browser_handoff",
        "system_surface": "ASWebAuthenticationSession or default system browser",
        "owned_use_cases": [
            "product sign-in",
            "step-up completion",
            "authority-owned HMRC or help tasks",
        ],
        "return_rule": "Return to the correct object, shell, and focus anchor; pending language persists until the governed parent read model refreshes.",
        "forbidden": [
            "embedded unrestricted webview as the primary sign-in or step-up authority",
            "return implying settlement before live read-side confirmation",
        ],
        "source_refs": [
            heading_ref(MACOS_BLUEPRINT_PATH, "7. Authentication and session strategy"),
            heading_ref(FRONTEND_SHELL_PATH, "7.5 Browser and system handoff"),
            heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
        ],
    }

    restoration_identity_envelope = [
        "tenant_id",
        "principal_class",
        "session_binding_hash",
        "session_lineage_ref",
        "masking_posture_fingerprint",
        "shell_family",
        "route_or_parent_scene_identity",
        "canonical_object_ref",
        "access_binding_hash_or_null",
        "projection_guard_or_shell_stability_token",
        "supported_contract_window",
        "preview_subject_ref_or_null_for_secondary_windows",
    ]

    invalidation_triggers = [
        "tenant switch",
        "privilege downgrade",
        "masking change",
        "session revocation",
        "device binding invalidation",
        "schema incompatibility",
        "access binding drift",
        "preview subject mismatch",
    ]

    return {
        "contract_version": TODAY,
        "selected_delivery_strategy": "signed_notarized_swiftui_first_appkit_accelerated_native_operator_workspace",
        "delivery_scope": {
            "in_scope_native": [
                "internal operator manifest work",
                "work-item collaboration",
                "compare and audit investigation windows",
                "filing packet review and export support",
                "authority review support surfaces",
            ],
            "retained_browser_owned_surfaces": [
                "client portal",
                "system-browser sign-in and step-up",
                "low-risk help or documentation",
                "authority-owned browser checkpoints",
            ],
        },
        "summary": {
            "scene_count": len(scenes),
            "primary_scene_count": len(
                [scene for scene in scenes if scene["scene_kind"] == "PRIMARY_WORKSPACE"]
            ),
            "secondary_window_count": len(
                [
                    scene
                    for scene in scenes
                    if scene["scene_kind"] == "SECONDARY_SUPPORT_WINDOW"
                ]
            ),
            "utility_scene_count": len(
                [
                    scene
                    for scene in scenes
                    if scene["scene_kind"] == "UTILITY_SUPPORT_SCENE"
                ]
            ),
            "package_count": len(existing_topology["xcode_workspace_topology"]),
            "command_surface_count": len(existing_topology["command_surfaces"]),
            "restoration_identity_dimension_count": len(restoration_identity_envelope),
            "restoration_invalidation_trigger_count": len(invalidation_triggers),
        },
        "xcode_workspace_topology": existing_topology["xcode_workspace_topology"],
        "command_surfaces": existing_topology["command_surfaces"],
        "restoration_identity_envelope": restoration_identity_envelope,
        "restoration_invalidation_triggers": invalidation_triggers,
        "scenes": scenes,
        "browser_handoff_boundary": browser_handoff_boundary,
    }


def build_native_platform_translation_map(
    scene_topology: dict[str, Any]
) -> dict[str, Any]:
    shell_coverage = [
        {
            "shell_family": "CALM_SHELL",
            "coverage_status": "PRIMARY_NATIVE_EMBODIMENT",
            "native_surfaces": [
                "native_primary_manifest_scene",
                "native_primary_work_item_scene",
                "all detached support windows",
            ],
            "rule": "Native scenes preserve same-object and same-shell continuity rather than introducing a desktop-only legal shell.",
            "source_refs": [
                heading_ref(FRONTEND_SHELL_PATH, "1. Shell families and object ownership"),
                heading_ref(MACOS_BLUEPRINT_PATH, "1. Architectural thesis"),
            ],
        },
        {
            "shell_family": "GOVERNANCE_DENSITY_SHELL",
            "coverage_status": "SELECTIVE_NATIVE_INVESTIGATION_AND_DENSE_REVIEW",
            "native_surfaces": [
                "audit and provenance investigation windows",
                "authority review support surfaces",
            ],
            "rule": "Governance density obligations carry into native dense review surfaces, but the ADR does not choose full browser-console parity as a day-zero native requirement.",
            "source_refs": [
                heading_ref(GOVERNANCE_PATH, "2. Profile boundary and shell contract"),
                heading_ref(GOVERNANCE_PATH, "7. Frontend systems architecture"),
                heading_ref(MACOS_BLUEPRINT_PATH, "12. Performance strategy"),
            ],
        },
        {
            "shell_family": "CLIENT_PORTAL_SHELL",
            "coverage_status": "BROWSER_ONLY_RETAINED",
            "native_surfaces": [],
            "rule": "Portal remains browser-delivered; the native macOS product is the internal operator workspace, not a universal desktop wrapper for every audience.",
            "source_refs": [
                heading_ref(MACOS_BLUEPRINT_PATH, "Purpose"),
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
            ],
        },
    ]

    translations = [
        {
            "browser_primitive": "route tree",
            "native_translation": "NavigationSplitView, WindowGroup, and parent-bound detached support windows",
            "why": "Native orchestration replaces browser tabs and nested drawers while preserving shell ownership and object continuity.",
            "source_refs": [heading_ref(MACOS_BLUEPRINT_PATH, "4. Platform translation map")],
        },
        {
            "browser_primitive": "browser refresh",
            "native_translation": "snapshot hydration plus stream resume or rebase",
            "why": "The client restores the same scene identity only after compatibility checks rather than reloading the whole shell blindly.",
            "source_refs": [
                heading_ref(MACOS_BLUEPRINT_PATH, "6. Data flow and synchronization model"),
                heading_ref(NATIVE_CACHE_PATH, "Required rules"),
            ],
        },
        {
            "browser_primitive": "localStorage or session storage",
            "native_translation": "Keychain for product-session artifacts plus tenant-bound structured persistence",
            "why": "Credential material stays in OS-protected storage while disposable projections and preferences stay purgeable.",
            "source_refs": [
                heading_ref(MACOS_BLUEPRINT_PATH, "7. Authentication and session strategy"),
                heading_ref(MACOS_BLUEPRINT_PATH, "8. Persistence model"),
            ],
        },
        {
            "browser_primitive": "DOM event bus",
            "native_translation": "typed actions over observable models and actor boundaries",
            "why": "The native app keeps projection and command flows explicit instead of recreating a browser-style ambient event mesh.",
            "source_refs": [heading_ref(MACOS_BLUEPRINT_PATH, "4. Platform translation map")],
        },
        {
            "browser_primitive": "browser auth or help flow",
            "native_translation": "ASWebAuthenticationSession or default system browser return coordinator",
            "why": "System-browser ownership keeps sign-in, step-up, and authority-only tasks out of unrestricted embedded web shells.",
            "source_refs": [
                heading_ref(MACOS_BLUEPRINT_PATH, "7. Authentication and session strategy"),
                heading_ref(SECURITY_PATH, "4. Browser, native-client, API, and transport hardening"),
            ],
        },
        {
            "browser_primitive": "calm-shell support drawer",
            "native_translation": "trailing inspector or detached support window",
            "why": "Detached support still remains support-only and close-return focus stays parent-bound.",
            "source_refs": [
                heading_ref(MACOS_BLUEPRINT_PATH, "5. Preferred window and scene architecture"),
                heading_ref(FRONTEND_SHELL_PATH, "8. Accessibility, focus, and motion"),
            ],
        },
        {
            "browser_primitive": "large table or diff canvas",
            "native_translation": "AppKit bridge inside a SwiftUI-managed scene",
            "why": "Dense evidence, audit, and diff workloads justify AppKit only where profiling proves SwiftUI is not enough.",
            "source_refs": [
                heading_ref(MACOS_BLUEPRINT_PATH, "9. SwiftUI versus AppKit decision matrix"),
                heading_ref(MACOS_BLUEPRINT_PATH, "12. Performance strategy"),
            ],
        },
        {
            "browser_primitive": "hover-first browser affordance",
            "native_translation": "menu commands, keyboard shortcuts, Quick Look, print, and drag-out",
            "why": "Native ergonomics should replace browser habits without changing algorithmic meaning.",
            "source_refs": [heading_ref(MACOS_BLUEPRINT_PATH, "10. Native UX opportunities that should replace browser habits")],
        },
        {
            "browser_primitive": "browser cache identity",
            "native_translation": "combined FE-25 cache isolation plus FE-75 hydration legality envelope",
            "why": "Native restore and first paint must fail closed on tenant, masking, route, or compatibility drift.",
            "source_refs": [
                heading_ref(CACHE_ISOLATION_PATH, "Purpose"),
                heading_ref(NATIVE_CACHE_PATH, "Required rules"),
            ],
        },
    ]

    swiftui_default = [
        "calm-shell composition",
        "inspectors and detail flows",
        "settings and preferences",
        "lightweight forms and command launchers",
        "menu commands and keyboard shortcuts",
        "accessibility-rich semantic components",
    ]
    appkit_selective = [
        "evidence and audit tables needing aggressive virtualization",
        "multi-column outline views with complex disclosure behavior",
        "side-by-side attributed diff viewers",
        "advanced text editing or annotation surfaces",
        "print or export surfaces requiring mature desktop fidelity",
    ]

    native_affordances = [
        "multi-window deep work instead of tab sprawl",
        "keyboard-first command flows",
        "Quick Look previews for evidence artifacts",
        "detached compare and audit windows",
        "state restoration via scenes and NSUserActivity",
        "system notifications with redaction-safe copy",
    ]

    prohibitions = [
        "No browser-wrapper chrome or browser-first navigation model inside the native app.",
        "No embedded unrestricted webview as the primary sign-in, step-up, or authority handoff authority.",
        "No AppKit-by-default posture; escalation must be justified by density or performance evidence.",
        "No client-local recreation of filing, gate, trust, or authority legality in Swift.",
    ]

    return {
        "contract_version": TODAY,
        "selected_embodiment": "swiftui_first_with_targeted_appkit_acceleration",
        "workspace_name": "InternalOperatorWorkspace.xcworkspace",
        "app_target": "Apps/InternalOperatorWorkspaceMac",
        "shell_coverage": shell_coverage,
        "browser_to_native_translations": translations,
        "swiftui_default_domains": swiftui_default,
        "appkit_selective_domains": appkit_selective,
        "native_affordances_to_replace_browser_habits": native_affordances,
        "prohibitions": prohibitions,
        "summary": {
            "shell_coverage_count": len(shell_coverage),
            "translation_rule_count": len(translations),
            "swiftui_default_count": len(swiftui_default),
            "appkit_selective_count": len(appkit_selective),
            "native_affordance_count": len(native_affordances),
            "browser_retained_surface_count": len(
                scene_topology["delivery_scope"]["retained_browser_owned_surfaces"]
            ),
        },
    }


def build_native_cache_session_and_security_boundary() -> dict[str, Any]:
    identity_boundary = load_json(IDENTITY_BOUNDARY_PATH)
    native_boundary = next(
        boundary
        for boundary in identity_boundary["boundaries"]
        if boundary["boundary_id"] == "interactive_native_human"
    )

    compatibility_dimensions = [
        "tenant_id",
        "principal_class",
        "session_binding_hash",
        "session_lineage_ref",
        "access_binding_hash_or_null",
        "masking_posture_fingerprint",
        "route_identity",
        "canonical_object_ref",
        "shell_family",
        "projection_version",
        "projection_guard_or_shell_stability_ref",
        "supported_contract_window",
        "preview_subject_ref_or_null_for_secondary_windows",
        "delivery_binding_hash_for_temp_artifacts",
    ]

    purge_triggers = [
        "tenant switch",
        "privilege downgrade",
        "masking drift",
        "session revocation",
        "device binding invalidation",
        "schema incompatibility",
        "projection guard mismatch",
        "route identity drift",
        "preview subject mismatch",
        "remote kill switch",
    ]

    boundaries = [
        {
            "boundary_id": "native_human_session",
            "label": "Interactive native human session boundary",
            "allowed_storage": [
                "Keychain-backed product-session artifacts",
                "resume metadata",
                "redaction-safe local preferences",
            ],
            "forbidden_storage": [
                "raw authority credentials on device",
                "embedded webview-owned primary sign-in state",
            ],
            "live_session_requirement": "Mutation-capable actions require a live bound session plus current actor-session validation.",
            "source_refs": normalize_source_refs(native_boundary["source_refs"]),
        },
        {
            "boundary_id": "structured_projection_cache",
            "label": "Structured projection and receipt cache boundary",
            "allowed_storage": [
                "DecisionBundle",
                "ExperienceDelta",
                "WorkspaceSnapshot",
                "WorkspaceDelta",
                "ApiCommandReceipt history",
                "resume metadata",
                "pinned evidence",
                "compare selections",
                "recent lists",
            ],
            "forbidden_storage": [
                "unsent filing legality decisions",
                "client-generated workflow conclusions",
                "pre-acceptance mutation state without durable receipt",
            ],
            "live_session_requirement": "Cache-only restoration may render compatible read state, but filing-capable or mutation-capable actions stay blocked until live rebase re-establishes legality.",
            "source_refs": [
                heading_ref(MACOS_BLUEPRINT_PATH, "8. Persistence model"),
                heading_ref(NATIVE_CACHE_PATH, "Required rules"),
            ],
        },
        {
            "boundary_id": "scene_restoration_and_resume",
            "label": "Scene restoration and resume lineage boundary",
            "allowed_storage": [
                "scene restoration payloads",
                "NSUserActivity",
                "focus restoration outcome",
                "cross_device_continuity_contract",
            ],
            "forbidden_storage": [
                "restoration under invalid tenant, masking, or session lineage",
                "reopening stale objects after access or compatibility drift",
            ],
            "live_session_requirement": "Restore proceeds only when local cache, resume metadata, and server session remain valid together.",
            "source_refs": [
                heading_ref(MACOS_BLUEPRINT_PATH, "11. Security and runtime posture for the desktop client"),
                "data/analysis/deep_link_invite_and_resume_rules.json::native_restore_requires_valid_server_session[ADR-003 exported native restore rule]",
            ],
        },
        {
            "boundary_id": "regulated_local_artifacts",
            "label": "Regulated previews, exports, and local index boundary",
            "allowed_storage": [
                "preview caches",
                "temporary exports",
                "Quick Look staging",
                "redaction-safe local search indices",
            ],
            "forbidden_storage": [
                "broader preview reuse across subject drift",
                "masked or revoked material left in temp storage",
            ],
            "live_session_requirement": "Materialization remains bound to current masking, export posture, and selected preview subject.",
            "source_refs": [
                heading_ref(MACOS_BLUEPRINT_PATH, "10. Native UX opportunities that should replace browser habits"),
                heading_ref(CACHE_ISOLATION_PATH, "FE-75 Native Hydration Composition"),
            ],
        },
        {
            "boundary_id": "browser_handoff_context",
            "label": "System-browser handoff return boundary",
            "allowed_storage": [
                "return target",
                "focused object anchor",
                "focus restoration anchor",
            ],
            "forbidden_storage": [
                "local completion inference from browser return alone",
                "scope widening from deep-link or handoff context alone",
            ],
            "live_session_requirement": "The parent scene keeps pending posture until the governing read model refreshes and the target remains lawful.",
            "source_refs": [
                heading_ref(MACOS_BLUEPRINT_PATH, "7. Authentication and session strategy"),
                heading_ref(FRONTEND_SHELL_PATH, "7.5 Browser and system handoff"),
            ],
        },
        {
            "boundary_id": "authority_secret_boundary",
            "label": "Authority token and secret boundary",
            "allowed_storage": [
                "vault-held authority token lineage",
                "vault-held IdP client secrets or private keys",
            ],
            "forbidden_storage": [
                "raw authority access or refresh tokens in Keychain, cache, queues, or read models",
                "mixed storage of IdP admin material with general application persistence",
            ],
            "live_session_requirement": "Native flows may trigger authority work, but raw token material stays outside device storage boundaries.",
            "source_refs": [
                heading_ref(SECURITY_PATH, "3. Secret, key, and token handling"),
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
            ],
        },
        {
            "boundary_id": "disconnected_fail_closed_boundary",
            "label": "Disconnected and cache-only fail-closed boundary",
            "allowed_storage": [
                "local drafts",
                "compare selections",
                "read-only compatible projections",
            ],
            "forbidden_storage": [
                "blind queued filing sends",
                "blind queued approval or authority mutations",
            ],
            "live_session_requirement": "Offline or disconnected posture degrades to read-only or local-draft mode for legally material actions.",
            "source_refs": [
                heading_ref(MACOS_BLUEPRINT_PATH, "6. Data flow and synchronization model"),
                heading_ref(NATIVE_CACHE_PATH, "Failure modes closed"),
            ],
        },
    ]

    return {
        "contract_version": TODAY,
        "selected_security_posture": "system_browser_auth_plus_keychain_plus_tenant_bound_disposable_cache",
        "native_session_carrier": native_boundary["session_carrier"],
        "compatibility_dimensions": compatibility_dimensions,
        "purge_triggers": purge_triggers,
        "boundaries": boundaries,
        "summary": {
            "boundary_count": len(boundaries),
            "compatibility_dimension_count": len(compatibility_dimensions),
            "purge_trigger_count": len(purge_triggers),
        },
        "source_refs": [
            heading_ref(SECURITY_PATH, "2. Identity, session, and command trust"),
            heading_ref(SECURITY_PATH, "6. Data protection, privacy, and cache safety"),
            heading_ref(NATIVE_CACHE_PATH, "Coverage requirements"),
            heading_ref(CACHE_ISOLATION_PATH, "Reuse Law"),
        ],
    }


def build_native_feature_rollout_sequence() -> dict[str, Any]:
    stages = [
        {
            "sequence_id": "sequence_0_contract_freeze",
            "label": "Contract freeze and capability negotiation",
            "rollout_class": "FOUNDATION_ONLY",
            "objective": "Freeze northbound snapshot, stream, receipt, cache-envelope, and compatibility-window contracts before native state restoration ships.",
            "capabilities_unlocked": [
                "server capability flags for native rollout",
                "desktop cache-envelope freeze",
                "cursor invalidation trigger freeze",
            ],
            "verification_gates": [
                "compatibility negotiation published",
                "FE-25 and FE-75 boundaries encoded",
                "shared route and shell law carried into native outputs",
            ],
            "source_refs": [heading_ref(MACOS_BLUEPRINT_PATH, "13. Delivery sequencing")],
        },
        {
            "sequence_id": "sequence_1_read_only_shell",
            "label": "Read-only native shell",
            "rollout_class": "INTERNAL_DOGFOOD",
            "objective": "Ship a signed internal macOS app that authenticates, hydrates snapshots, streams live state, and renders the calm shell plus investigation windows.",
            "capabilities_unlocked": [
                "manifest and work-item native scenes",
                "read-only detached compare and audit windows",
                "scene restoration and resume with fail-closed invalidation",
            ],
            "verification_gates": [
                "cold start faster than supported browser embodiment",
                "same-object scene restoration works when legal",
                "browser handoff returns correctly",
            ],
            "source_refs": [heading_ref(MACOS_BLUEPRINT_PATH, "13. Delivery sequencing")],
        },
        {
            "sequence_id": "sequence_2_command_capable_workflows",
            "label": "Command-capable native workflows",
            "rollout_class": "GUARDED_INTERNAL_DEFAULT",
            "objective": "Add safe native command paths for review, override initiation, packet preparation, assignment, and collaboration actions that already exist northbound.",
            "capabilities_unlocked": [
                "typed command emission with durable receipt posture",
                "stale-view rejection parity with browser",
                "local draft flows that reacquire legality before send",
            ],
            "verification_gates": [
                "receipt, duplicate replay, and stale-view behavior match browser",
                "offline posture fails closed for legally material actions",
                "system-browser step-up returns remain same-object",
            ],
            "source_refs": [heading_ref(MACOS_BLUEPRINT_PATH, "13. Delivery sequencing")],
        },
        {
            "sequence_id": "sequence_3_appkit_acceleration",
            "label": "AppKit acceleration surfaces",
            "rollout_class": "PERFORMANCE_TARGETED",
            "objective": "Promote the heaviest diff, audit, provenance, and table surfaces onto AppKit-backed components only where profiling justifies the bridge.",
            "capabilities_unlocked": [
                "virtualized audit tables",
                "mature diff viewers",
                "high-fidelity print or export surfaces",
            ],
            "verification_gates": [
                "profiling proves SwiftUI is the bottleneck",
                "support-only window law remains intact",
                "reduced-motion and semantic anchor parity survive the bridge",
            ],
            "source_refs": [
                heading_ref(MACOS_BLUEPRINT_PATH, "9. SwiftUI versus AppKit decision matrix"),
                heading_ref(MACOS_BLUEPRINT_PATH, "12. Performance strategy"),
            ],
        },
        {
            "sequence_id": "sequence_4_workflow_consolidation",
            "label": "Workflow consolidation",
            "rollout_class": "PRIMARY_OPERATOR_TOOL",
            "objective": "Retire browser-only operator dependencies where native is mature, while retaining browser ownership only for low-risk fallback or browser-owned auth/help surfaces.",
            "capabilities_unlocked": [
                "native workspace as the primary operator tool",
                "feature-flagged retirement of browser-only operator paths",
                "compatibility-aware rollback to browser surfaces",
            ],
            "verification_gates": [
                "native workspace passes daily-tool acceptance criteria",
                "kill switches and browser fallback remain available",
                "compatibility windows and signing posture are operationalized",
            ],
            "source_refs": [heading_ref(MACOS_BLUEPRINT_PATH, "13. Delivery sequencing")],
        },
    ]

    return {
        "contract_version": TODAY,
        "selected_rollout_model": "sequence_0_to_4_progressive_internal_operator_rollout",
        "stages": stages,
        "summary": {
            "stage_count": len(stages),
            "first_command_capable_stage": "sequence_2_command_capable_workflows",
            "first_appkit_acceleration_stage": "sequence_3_appkit_acceleration",
        },
    }


def build_native_handoff_and_test_strategy(
    scene_topology: dict[str, Any]
) -> dict[str, Any]:
    deep_link_rules = load_json(DEEP_LINK_RULES_PATH)

    browser_handoff_rules = [
        rule
        for rule in deep_link_rules["rules"]
        if "NATIVE_MACOS" in rule["applicable_channels"]
        or (
            "BROWSER" in rule["applicable_channels"]
            and "NATIVE_MACOS" in rule["applicable_channels"]
        )
    ]

    native_scene_scenarios = [
        {
            "scenario_id": "primary_manifest_restore_same_object",
            "automation_layer": "XCUITEST",
            "assertion": "The same manifest reopens in the same primary scene identity after relaunch when the legality envelope still matches.",
        },
        {
            "scenario_id": "work_item_restore_same_object",
            "automation_layer": "XCUITEST",
            "assertion": "Work-item scene restore keeps the same work item, module anchor, and inspector posture when legal.",
        },
        {
            "scenario_id": "detached_window_close_returns_focus",
            "automation_layer": "XCUITEST",
            "assertion": "Closing a detached compare, audit, or filing-packet window returns focus to the invoking parent control.",
        },
        {
            "scenario_id": "resize_redock_preserves_shell_meaning",
            "automation_layer": "XCUITEST",
            "assertion": "Sidebar collapse, inspector detach, and compact redock preserve the same shell meaning and dominant question.",
        },
        {
            "scenario_id": "cache_only_restore_blocks_mutation",
            "automation_layer": "PERSISTENCE_FIXTURE",
            "assertion": "Compatible cache-only restore may render read state, but mutation-capable actions remain blocked until live rebase completes.",
        },
        {
            "scenario_id": "schema_drift_purges_before_first_paint",
            "automation_layer": "PERSISTENCE_FIXTURE",
            "assertion": "Incompatible cache envelopes purge before stale content becomes visible.",
        },
        {
            "scenario_id": "reduced_motion_keeps_semantic_order",
            "automation_layer": "XCUITEST",
            "assertion": "Reduced-motion mode keeps the same semantic ordering, focus targets, and recovery meaning.",
        },
        {
            "scenario_id": "appkit_bridge_keeps_support_only_policy",
            "automation_layer": "PREVIEW_AND_XCUITEST",
            "assertion": "AppKit-accelerated surfaces preserve support-only posture and do not publish a second authoritative action strip.",
        },
    ]

    preview_contracts = [
        "primary manifest scene",
        "primary work-item scene",
        "detached compare window",
        "detached audit window",
        "settings and utility flow",
    ]

    automation_layers = [
        {
            "layer_id": "swiftui_previews_and_snapshots",
            "role": "Layout-law verification for primary scenes, detached support windows, and settings utilities before runtime integration.",
        },
        {
            "layer_id": "xcuitest_native_scenes",
            "role": "Interactive native verification for focus return, restoration, keyboard flows, reduced motion, and support-only window behavior.",
        },
        {
            "layer_id": "persistence_fixture_and_store_tests",
            "role": "Deterministic FE-75 coverage for cache hydration, purge, resume lineage, and schema drift.",
        },
        {
            "layer_id": "playwright_browser_owned_handoffs",
            "role": "Browser-owned auth, help, and authority handoff verification paired with native return-target expectations.",
        },
        {
            "layer_id": "domain_and_sdk_unit_tests",
            "role": "OperatorDomain reducers, receipt handling, northbound adapters, and feature-flag negotiation logic.",
        },
    ]

    persistence_cases = [
        "compatible cold-start hydration",
        "schema-incompatible cold-start purge",
        "tenant-switch purge",
        "privilege-downgrade purge",
        "session-revocation purge",
        "cache-only restoration with live-rebase-required mutation block",
        "secondary-window masking or preview purge",
    ]

    browser_owned_surfaces = [
        "system-browser sign-in and step-up",
        "authority-owned browser checkpoints",
        "low-risk help or documentation content",
    ]

    return {
        "contract_version": TODAY,
        "selected_test_strategy": "xcuitest_plus_preview_pack_plus_persistence_fixtures_plus_playwright_for_browser_owned_surfaces",
        "browser_owned_surfaces": browser_owned_surfaces,
        "browser_handoff_rules": [
            {
                "rule_id": rule["rule_id"],
                "label": rule["label"],
                "requirement": rule["requirement"],
                "fallback_or_recovery": rule["fallback_or_recovery"],
                "source_refs": normalize_source_refs(rule["source_refs"]),
            }
            for rule in browser_handoff_rules
        ],
        "native_scene_scenarios": native_scene_scenarios,
        "preview_contracts": preview_contracts,
        "persistence_fixture_cases": persistence_cases,
        "automation_layers": automation_layers,
        "scene_scope": [scene["scene_id"] for scene in scene_topology["scenes"]],
        "summary": {
            "automation_layer_count": len(automation_layers),
            "browser_owned_surface_count": len(browser_owned_surfaces),
            "browser_handoff_rule_count": len(browser_handoff_rules),
            "native_scene_scenario_count": len(native_scene_scenarios),
            "preview_contract_count": len(preview_contracts),
            "persistence_fixture_case_count": len(persistence_cases),
        },
        "source_refs": [
            heading_ref(MACOS_BLUEPRINT_PATH, "7. Authentication and session strategy"),
            heading_ref(MACOS_BLUEPRINT_PATH, "14. Acceptance criteria"),
            heading_ref(UIUX_PATH, "Playwright-first / XCUITest-first design expectation"),
            heading_ref(UIUX_PATH, "What to test with Playwright / XCUITest"),
        ],
    }


def build_criteria() -> list[dict[str, Any]]:
    return [
        {
            "criterion_id": "shell_law_fidelity_native_embodiment",
            "label": "Shell-law fidelity across native embodiment",
            "weight": 14,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Native delivery must preserve the same object, shell, support-region, and recovery law instead of inventing a fourth desktop-only shell.",
            "source_refs": [
                heading_ref(FRONTEND_SHELL_PATH, "1. Shell families and object ownership"),
                heading_ref(MACOS_BLUEPRINT_PATH, "5. Preferred window and scene architecture"),
            ],
        },
        {
            "criterion_id": "server_authoritative_legality",
            "label": "Server-authoritative legality",
            "weight": 12,
            "priority": "HARD_REQUIREMENT",
            "rationale": "The desktop app must remain a projection-and-command client rather than a second compliance engine.",
            "source_refs": [
                heading_ref(MACOS_BLUEPRINT_PATH, "1. Architectural thesis"),
                heading_ref(MACOS_BLUEPRINT_PATH, "2. Architectural guardrails"),
            ],
        },
        {
            "criterion_id": "performance_for_large_tables_and_diffs",
            "label": "Performance for large tables, diffs, and investigations",
            "weight": 11,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Native delivery is only worth the cost if it materially outperforms the browser on high-density operator work.",
            "source_refs": [
                heading_ref(MACOS_BLUEPRINT_PATH, "9. SwiftUI versus AppKit decision matrix"),
                heading_ref(MACOS_BLUEPRINT_PATH, "12. Performance strategy"),
            ],
        },
        {
            "criterion_id": "auth_session_and_system_browser_handoff",
            "label": "Auth/session safety and system-browser handoff quality",
            "weight": 11,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Native sign-in and step-up must use system-browser-managed flows with safe return-target continuity and no raw authority credentials on device.",
            "source_refs": [
                heading_ref(MACOS_BLUEPRINT_PATH, "7. Authentication and session strategy"),
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
            ],
        },
        {
            "criterion_id": "cache_isolation_and_invalidation_integrity",
            "label": "Cache isolation and invalidation integrity",
            "weight": 10,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Native speed is lawful only when FE-25 and FE-75 boundaries are explicit, exact, and fail closed on drift.",
            "source_refs": [
                heading_ref(CACHE_ISOLATION_PATH, "Purpose"),
                heading_ref(NATIVE_CACHE_PATH, "Required rules"),
            ],
        },
        {
            "criterion_id": "scene_window_coherence_and_restoration",
            "label": "Scene/window coherence and restoration behavior",
            "weight": 10,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Primary scenes, detached support windows, and restoration rules must stay concrete enough that later native work does not drift.",
            "source_refs": [
                heading_ref(MACOS_BLUEPRINT_PATH, "5. Preferred window and scene architecture"),
                heading_ref(MACOS_BLUEPRINT_PATH, "14. Acceptance criteria"),
            ],
        },
        {
            "criterion_id": "native_ergonomics_and_os_integration",
            "label": "Native ergonomics and OS integration",
            "weight": 10,
            "priority": "HARD_REQUIREMENT",
            "rationale": "A macOS product should use menu commands, keyboard-first flows, Quick Look, state restoration, and multi-window deep work instead of mimicking browser habits.",
            "source_refs": [
                heading_ref(MACOS_BLUEPRINT_PATH, "10. Native UX opportunities that should replace browser habits"),
                heading_ref(UIUX_PATH, "Core design language"),
            ],
        },
        {
            "criterion_id": "signing_notarization_operability",
            "label": "Release, signing, notarization, and compatibility operability",
            "weight": 8,
            "priority": "STRONG_PREFERENCE",
            "rationale": "Native delivery needs a sane operational model for signing, hardened runtime, kill switches, compatibility windows, and browser fallback.",
            "source_refs": [
                heading_ref(MACOS_BLUEPRINT_PATH, "11. Security and runtime posture for the desktop client"),
                heading_ref(MACOS_BLUEPRINT_PATH, "13. Delivery sequencing"),
            ],
        },
        {
            "criterion_id": "implementation_velocity_and_maintainability",
            "label": "Implementation velocity and long-term maintainability",
            "weight": 7,
            "priority": "TRADEOFF",
            "rationale": "The chosen strategy must be implementable by a native team without locking the product into a permanently costly abstraction mistake.",
            "source_refs": [
                heading_ref(MACOS_BLUEPRINT_PATH, "3. Recommended Xcode workspace topology"),
                heading_ref(MACOS_BLUEPRINT_PATH, "13. Delivery sequencing"),
            ],
        },
        {
            "criterion_id": "testing_fit_across_native_and_browser_handoffs",
            "label": "Testing strategy fit across native and browser-owned handoffs",
            "weight": 7,
            "priority": "HARD_REQUIREMENT",
            "rationale": "The architecture must pair XCUITest and native preview coverage with Playwright over browser-owned handoff surfaces.",
            "source_refs": [
                heading_ref(MACOS_BLUEPRINT_PATH, "14. Acceptance criteria"),
                heading_ref(UIUX_PATH, "Playwright-first / XCUITest-first design expectation"),
            ],
        },
    ]


def build_alternatives() -> list[dict[str, Any]]:
    return [
        {
            "alternative_id": "swiftui_first_appkit_accelerated_native",
            "label": "Signed/notarized Xcode-native macOS client with SwiftUI-first delivery and targeted AppKit acceleration",
            "summary": "Ship a first-class internal operator desktop app in Xcode, using SwiftUI for shell composition and AppKit only where density or performance justifies it.",
            "strengths": [
                "Best fit for system-browser auth, Keychain session posture, multi-window deep work, and high-density operator investigation.",
                "Preserves server-authoritative legality while still giving the desktop product real native advantages over the browser.",
            ],
            "risks": [
                "Requires deliberate Xcode workspace, signing, kill-switch, and bridge-governance discipline rather than one thin wrapper runtime.",
            ],
        },
        {
            "alternative_id": "browser_wrapper_desktop",
            "label": "Electron, Tauri, or browser-wrapper desktop delivery",
            "summary": "Deliver the operator desktop product primarily as a browser runtime wrapped in a desktop shell with light native integrations.",
            "strengths": [
                "Faster initial implementation because web surfaces can be reused aggressively.",
                "Can centralize some browser and desktop development around one shared rendering stack.",
            ],
            "risks": [
                "Encourages a browser-wrapper mindset, weakens true native scene/window design, and makes system-browser/session boundaries easier to blur.",
            ],
        },
        {
            "alternative_id": "browser_only_no_native",
            "label": "Browser-only delivery with no first-class native desktop product",
            "summary": "Keep operators entirely in browser deployables and do not ship a dedicated macOS workspace.",
            "strengths": [
                "Operationally simpler because no signed native product, update channel, or Xcode workspace is required.",
                "Maintains one rendering stack and one test surface.",
            ],
            "risks": [
                "Rejects the product requirement for keyboard-first, multi-window, high-density native investigation work and leaves browser limits in place.",
            ],
        },
    ]


def build_score_map() -> dict[str, dict[str, tuple[float, str]]]:
    return {
        "swiftui_first_appkit_accelerated_native": {
            "shell_law_fidelity_native_embodiment": (
                4.75,
                "It is the only option that cleanly treats native as an embodiment of the governed shell law rather than a browser imitation.",
            ),
            "server_authoritative_legality": (
                4.75,
                "The source blueprint explicitly frames this as a server-authoritative projection-and-command client, which the native Xcode approach matches directly.",
            ),
            "performance_for_large_tables_and_diffs": (
                4.5,
                "SwiftUI plus targeted AppKit bridges can outperform the browser meaningfully on dense audit, diff, and evidence workflows.",
            ),
            "auth_session_and_system_browser_handoff": (
                4.75,
                "System-browser auth, Keychain-backed session artifacts, and native return-target control are first-class here.",
            ),
            "cache_isolation_and_invalidation_integrity": (
                4.75,
                "A dedicated native architecture can encode FE-25 and FE-75 exactly rather than adapting browser cache assumptions.",
            ),
            "scene_window_coherence_and_restoration": (
                4.75,
                "WindowGroup, scene restoration, and detached support surfaces map directly to the blueprint's scene law.",
            ),
            "native_ergonomics_and_os_integration": (
                4.75,
                "It unlocks true menu commands, Quick Look, native notifications, keyboard flows, and deep multi-window work.",
            ),
            "signing_notarization_operability": (
                4.5,
                "This is the only option that fully embraces signing, notarization, hardened runtime, and kill-switch posture as native product concerns.",
            ),
            "implementation_velocity_and_maintainability": (
                4.25,
                "The Xcode-native path costs more upfront, but it gives the clearest long-term ownership seams and avoids wrapper debt.",
            ),
            "testing_fit_across_native_and_browser_handoffs": (
                4.5,
                "It supports a clean XCUITest plus Playwright split instead of forcing all behavior through one compromised runtime.",
            ),
        },
        "browser_wrapper_desktop": {
            "shell_law_fidelity_native_embodiment": (
                2.25,
                "A wrapper runtime makes it too easy to re-skin browser metaphors instead of building real native scene law.",
            ),
            "server_authoritative_legality": (
                3.0,
                "It can stay server-authoritative, but browser-local habits and wrapper shortcuts make client-local drift more tempting.",
            ),
            "performance_for_large_tables_and_diffs": (
                2.75,
                "It helps a little with packaging, but it still inherits many browser rendering limits on the exact workloads native is meant to improve.",
            ),
            "auth_session_and_system_browser_handoff": (
                2.25,
                "System-browser and embedded-wrapper boundaries become blurrier and harder to keep exact.",
            ),
            "cache_isolation_and_invalidation_integrity": (
                2.5,
                "Wrapper-local persistence and browser-style caches make FE-25 and FE-75 discipline harder to keep sharp.",
            ),
            "scene_window_coherence_and_restoration": (
                2.75,
                "Detached support windows and restoration are possible, but the model still pulls toward tabbed web thinking.",
            ),
            "native_ergonomics_and_os_integration": (
                2.5,
                "Some desktop APIs are available, but the product remains semantically browser-first rather than native-first.",
            ),
            "signing_notarization_operability": (
                3.25,
                "Desktop packaging exists, but hardened-runtime and entitlement posture are weaker fits than a true Xcode-native app.",
            ),
            "implementation_velocity_and_maintainability": (
                3.0,
                "Short-term velocity is real, but long-term wrapper debt and performance compromises accumulate quickly.",
            ),
            "testing_fit_across_native_and_browser_handoffs": (
                2.75,
                "The automation split is muddier because the product never cleanly commits to native or browser ownership.",
            ),
        },
        "browser_only_no_native": {
            "shell_law_fidelity_native_embodiment": (
                1.75,
                "It avoids desktop drift only by refusing to solve native embodiment at all.",
            ),
            "server_authoritative_legality": (
                4.25,
                "Browser-only delivery can keep legality centralized, which is its strongest attribute.",
            ),
            "performance_for_large_tables_and_diffs": (
                1.5,
                "It leaves the heaviest operator workflows stuck with browser constraints that the native blueprint exists to overcome.",
            ),
            "auth_session_and_system_browser_handoff": (
                3.25,
                "Browser auth is familiar, but it gives up the safer system-browser-plus-Keychain posture for the operator desktop product.",
            ),
            "cache_isolation_and_invalidation_integrity": (
                2.5,
                "Browser cache isolation can be good, but it does not solve native restoration or OS-artifact control because there is no native product.",
            ),
            "scene_window_coherence_and_restoration": (
                1.0,
                "There is no true answer for scene restoration, detached support windows, or native multi-window continuity because the product never ships them.",
            ),
            "native_ergonomics_and_os_integration": (
                1.0,
                "It forfeits Quick Look, native menus, rich keyboard flows, and deep multi-window investigation altogether.",
            ),
            "signing_notarization_operability": (
                4.5,
                "Operationally simpler because there is no native signing or notarization surface to run.",
            ),
            "implementation_velocity_and_maintainability": (
                3.75,
                "It is cheaper upfront, though that savings comes from declining the native product requirement.",
            ),
            "testing_fit_across_native_and_browser_handoffs": (
                2.75,
                "One browser stack is easier to test, but it leaves the native handoff and restoration problem unsolved rather than solved well.",
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
        "decision_id": "ADR-007",
        "decision_title": "Native macOS Delivery Strategy",
        "decision_date": TODAY,
        "selected_alternative_id": ranked[0]["alternative_id"],
        "criteria": criteria,
        "alternatives": ranked,
    }


def build_mermaid() -> str:
    return """flowchart LR
  operator["Internal operator"]
  browser["System browser / ASWebAuthenticationSession"]

  subgraph Native["Signed macOS app"]
    app["InternalOperatorWorkspaceMac"]
    swiftui["SwiftUI shell + scenes"]
    appkit["Targeted AppKit acceleration"]
    cache["Keychain + tenant-bound disposable cache"]
  end

  subgraph Packages["Workspace packages"]
    domain["OperatorDomain"]
    sdk["OperatorPlatformSDK"]
    persistence["OperatorPersistence"]
    ui["OperatorUI + OperatorDesktopKit"]
    flags["OperatorFeatureFlags + Diagnostics"]
  end

  north["Northbound API + stream + receipt surfaces"]

  operator --> app
  app --> swiftui
  app --> appkit
  app --> cache
  app --> browser

  swiftui --> domain
  swiftui --> ui
  appkit --> ui
  app --> sdk
  app --> persistence
  app --> flags

  sdk --> north
  persistence --> north
"""


def build_adr_markdown(
    scorecard: dict[str, Any],
    scene_topology: dict[str, Any],
    translation_map: dict[str, Any],
    cache_security: dict[str, Any],
    rollout: dict[str, Any],
    handoff_test: dict[str, Any],
) -> str:
    winner = scorecard["alternatives"][0]

    scene_rows = [
        [
            scene["scene_id"],
            scene["scene_kind"],
            scene["window_role"],
            scene["shell_family"],
        ]
        for scene in scene_topology["scenes"]
    ]
    coverage_rows = [
        [
            row["shell_family"],
            row["coverage_status"],
            row["native_surfaces"] or "browser retained",
            row["rule"],
        ]
        for row in translation_map["shell_coverage"]
    ]
    boundary_rows = [
        [
            row["label"],
            row["allowed_storage"],
            row["forbidden_storage"],
        ]
        for row in cache_security["boundaries"]
    ]
    rollout_rows = [
        [row["label"], row["rollout_class"], row["objective"]]
        for row in rollout["stages"]
    ]
    ranking_rows = [
        [row["rank"], row["label"], row["weighted_total"]]
        for row in scorecard["alternatives"]
    ]
    criteria_rows = [
        [row["label"], row["priority"], row["weight"], row["rationale"]]
        for row in scorecard["criteria"]
    ]

    deferred_decisions = [
        "Exact persistence implementation choice inside `OperatorPersistence` such as SQLite wrapper versus Core Data.",
        "Exact update-distribution mechanism such as MDM-only, direct signed distribution, or Sparkle-like updater.",
        "Exact entitlement and sandbox posture details once export, Quick Look, and diagnostics integrations are finalized.",
        "Exact scope and timing for promoting more governance-density workflows into native scenes.",
        "Exact browser fallback retirement date once sequence-4 consolidation proves stable in production.",
    ]

    return f"""# ADR-007: Native macOS Delivery Strategy

- Status: Accepted
- Date: {TODAY}
- Deciders: Phase 00 architecture analysis pack

## Context

Taxat already carries a strong native direction in the source corpus: the macOS workspace is described as a signed, notarized, server-authoritative desktop embodiment, not a browser wrapper. What was still missing was one central ADR that chose the delivery shape, scoped the native product, fixed the SwiftUI versus AppKit split, summarized FE-25 and FE-75 cache legality, and bound browser-owned auth or authority handoffs back to concrete native scene law.

The prior phase-00 outputs already resolved the surrounding constraints: ADR-003 fixed system-browser auth plus Keychain-backed native session posture, ADR-005 fixed server-authored projection doctrine, ADR-006 fixed the browser topology and confirmed `client-portal-web` stays a separate browser deployable, and the earlier native atlas normalized `7` governed native scene or boundary records. ADR-007 closes the remaining gap by selecting how Taxat actually ships the macOS product.

## Decision

Adopt a **signed and notarized Xcode-native internal macOS operator workspace**:

- `InternalOperatorWorkspace.xcworkspace` is the native delivery unit.
- `Apps/InternalOperatorWorkspaceMac` is the shipping app target.
- SwiftUI owns shell composition, most scene layout, settings, keyboard-first command surfaces, and accessibility-rich interface semantics.
- AppKit is used selectively for evidence tables, provenance explorers, diff viewers, and other dense surfaces only where profiling shows SwiftUI is not the right tool.
- Product sign-in, step-up, and browser-owned authority checkpoints stay system-browser-managed through `ASWebAuthenticationSession` or the default browser.
- Keychain stores only product-session artifacts; structured local persistence remains tenant-bound, disposable, redaction-safe, and fail-closed under FE-25 and FE-75 invalidation.
- Native delivery scope is the internal operator workspace. The client portal remains browser-only, and browser-owned auth/help/authority checkpoints remain browser-owned even when launched from native scenes.

## Decision Drivers

{markdown_table(["Driver", "Priority", "Weight", "Why It Matters"], criteria_rows)}

## Native Scope And Scene Topology

{markdown_table(["Scene", "Kind", "Role", "Shell Family"], scene_rows)}

The ADR chooses one primary native product for **internal operators**, not a universal desktop wrapper for every audience. Two primary calm-shell scenes handle manifest and work-item daily work; detached support windows handle compare, audit, filing-packet, and authority review depth; settings remain utility support rather than a new legal shell. Browser-owned auth or authority checkpoints return to the same object and focus anchor, but they do not themselves become native scenes.

## Shell Coverage Across Embodiments

{markdown_table(["Shell Family", "Coverage", "Native Surfaces", "Rule"], coverage_rows)}

The calm shell is the primary native embodiment. Governance density rules carry into dense audit or authority review surfaces as needed, but ADR-007 does not claim full browser-console parity on day zero. The client portal stays browser-delivered.

## SwiftUI Versus AppKit Split

- SwiftUI stays the default for shell composition, inspectors, settings, forms, commands, and accessibility semantics.
- AppKit is reserved for virtualized tables, attributed diff viewers, complex outline views, and print or export fidelity where profiling justifies the bridge.
- AppKit bridges remain inside SwiftUI-managed scene law. They do not create a second navigation model, a second action strip, or a second shell identity.
- The burden of proof is explicit: if profiling does not justify an AppKit bridge, the feature stays in SwiftUI.

## Cache, Session, And Security Boundary

{markdown_table(["Boundary", "Allowed Storage", "Forbidden Storage"], boundary_rows)}

The combined FE-25 and FE-75 rule is strict:

- native caches may reuse compatible state for speed
- native caches may not outrun tenant, session lineage, access binding, masking posture, object identity, or compatibility-window legality
- cache-only restoration may reopen compatible read state, but mutation-capable or filing-capable posture stays blocked until a fresh snapshot or rebase re-establishes legality
- raw authority credentials, IdP secret material, and blind disconnected sends remain outside the device boundary entirely

## Rollout Strategy

{markdown_table(["Sequence", "Rollout Class", "Objective"], rollout_rows)}

This yields a pragmatic progression: contract freeze first, then read-only native shell, then command-capable workflows, then AppKit acceleration where measurement justifies it, and only then consolidation away from browser-only operator dependencies.

## Browser-Owned Handoffs And Testing

- Browser-owned surfaces remain explicit: system-browser sign-in, step-up, authority checkpoints, and low-risk help/documentation.
- Native verification uses SwiftUI preview contracts, XCUITest scene flows, and persistence-fixture coverage for FE-75.
- Playwright still owns browser handoff verification and must prove return-to-object, return-to-focus, and “return does not imply settlement” behavior.
- Accessibility and reduced-motion semantics remain aligned with the shared interaction-layer and semantic-contract outputs rather than diverging into native-only identifiers.

## Alternatives Considered

    {markdown_table(["Rank", "Alternative", "Weighted Score"], ranking_rows)}

The winning option is **{winner["label"]}** with a weighted score of `{winner["weighted_total"]}`.

## Why This Option Wins

- It is the only option that fully matches the corpus posture of a signed, notarized, server-authoritative desktop workspace.
- It gives native real product value: menu commands, keyboard-first flows, scene restoration, Quick Look, detached compare windows, and better density handling than the browser.
- It keeps system-browser auth, Keychain session storage, and vault-only authority credentials exact rather than approximate.
- It avoids the browser-wrapper trap, where a desktop package exists but the product still behaves like a re-skinned browser tab.
- It gives later native teams exact scene, cache, session, and testing doctrine before implementation begins.

## Guardrails On The Decision

- Native delivery SHALL remain an embodiment of governed shell law, not a fourth legal shell.
- Client-local state SHALL remain disposable and rebuildable from platform truth.
- System-browser or platform-auth-session ownership SHALL remain the authority for sign-in and step-up.
- Detached support windows SHALL remain support-only and SHALL NOT publish a second authoritative action strip for the same object.
- Offline posture SHALL fail closed for filing-capable, approval-capable, or authority-mutating actions.
- AppKit SHALL be introduced only where density or performance evidence justifies it.
- Client portal surfaces SHALL remain browser-delivered under ADR-007.

## Consequences

Positive consequences:

- Native implementation gets a clear target: an internal operator workspace with explicit scene law, cache law, and rollout law.
- Security posture is sharper because the ADR fixes system-browser auth, Keychain-only product-session storage, and vault-only raw authority secrets.
- High-density operator workflows finally have a lawful path beyond browser constraints.

Negative consequences and tradeoffs:

- Native delivery requires real Xcode workspace ownership, signing, notarization, and compatibility governance.
- Browser and native teams must coordinate on handoff, return, and stale-view parity instead of treating those as implementation-local concerns.
- AppKit bridge discipline must stay tight so performance work does not fracture shell or accessibility law.

## Rollback Posture

- Browser internal surfaces remain the fallback path while native rollout advances through the declared sequences.
- Native kill switches and capability negotiation can disable scene families or command-capable flows without invalidating the broader operator product.
- If signing, compatibility, or FE-75 restoration posture becomes unsafe, the product falls back to browser internal surfaces rather than attempting permissive degraded native behavior.

## Deferred Decisions

{chr(10).join(f"- {decision}" for decision in deferred_decisions)}

## References

- Scene and window topology: [native_scene_and_window_topology.json]({SCENE_TOPOLOGY_PATH})
- Platform translation map: [native_platform_translation_map.json]({TRANSLATION_MAP_PATH})
- Cache, session, and security boundary: [native_cache_session_and_security_boundary.json]({CACHE_SECURITY_PATH})
- Rollout sequence: [native_feature_rollout_sequence.json]({ROLLOUT_PATH})
- Handoff and test strategy: [native_handoff_and_test_strategy.json]({HANDOFF_TEST_PATH})
- Native scene atlas: [native_operator_scene_atlas.md]({SCENE_ATLAS_PATH})
- Scorecard: [ADR-007-native-macos-delivery-strategy-scorecard.json]({SCORECARD_PATH})
- Comparison notes: [ADR-007-native-macos-delivery-strategy-comparison.md]({COMPARISON_PATH})
- Diagram: [ADR-007-native-macos-delivery-strategy.mmd]({MERMAID_PATH})
"""


def build_comparison_markdown(
    scorecard: dict[str, Any],
    scene_topology: dict[str, Any],
    cache_security: dict[str, Any],
    handoff_test: dict[str, Any],
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
        "# ADR-007 Comparison Notes",
        "",
        "This comparison expands the weighted scorecard that supports ADR-007.",
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
        f"- Native scenes and windows normalized: `{scene_topology['summary']['scene_count']}`",
        f"- Cache or security boundaries declared: `{cache_security['summary']['boundary_count']}`",
        f"- Browser handoff rules carried into the strategy: `{handoff_test['summary']['browser_handoff_rule_count']}`",
        f"- Native scene scenarios declared: `{handoff_test['summary']['native_scene_scenario_count']}`",
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


def build_scene_atlas_markdown(
    scene_topology: dict[str, Any],
    translation_map: dict[str, Any],
    cache_security: dict[str, Any],
    handoff_test: dict[str, Any],
) -> str:
    window_rows = [
        [
            scene["window_role"],
            f"{scene['default_size_px']['width']} × {scene['default_size_px']['height']}",
            f"{scene['minimum_size_px']['width']} × {scene['minimum_size_px']['height']}",
            scene["support_surface_rule"],
        ]
        for scene in scene_topology["scenes"]
    ]
    scene_rows = [
        [
            scene["scene_id"],
            scene["scene_kind"],
            scene["shell_family"],
            scene["implementation_split"]["swiftui_default"],
            scene["implementation_split"]["appkit_escalation"] or "none by default",
        ]
        for scene in scene_topology["scenes"]
    ]
    command_rows = [
        [command, "menu command or keyboard-targetable surface"]
        for command in scene_topology["command_surfaces"]
    ]
    boundary_rows = [
        [row["label"], row["allowed_storage"], row["live_session_requirement"]]
        for row in cache_security["boundaries"]
    ]
    preview_rows = [[name] for name in handoff_test["preview_contracts"]]

    return f"""# Native Operator Scene Atlas

This atlas turns ADR-007 into concrete scene and window law for later native implementers.

## Product Posture

- Signed and notarized internal macOS operator workspace.
- SwiftUI-first scene composition with targeted AppKit acceleration.
- System-browser or `ASWebAuthenticationSession` ownership for sign-in, step-up, and browser-owned checkpoints.
- Tenant-bound, disposable persistence governed by FE-25 and FE-75.

## Window Budgets

{markdown_table(["Window Role", "Default Size", "Minimum Size", "Support Rule"], window_rows)}

## Scene Inventory

{markdown_table(["Scene", "Kind", "Shell Family", "SwiftUI Default", "AppKit Escalation"], scene_rows)}

## Browser Handoff Boundary

- System surface: `{scene_topology['browser_handoff_boundary']['system_surface']}`
- Return rule: {scene_topology['browser_handoff_boundary']['return_rule']}
- Owned use cases: {", ".join(scene_topology['browser_handoff_boundary']['owned_use_cases'])}

## Restoration Identity Envelope

{chr(10).join(f"- `{field}`" for field in scene_topology["restoration_identity_envelope"])}

## Invalidation Triggers

{chr(10).join(f"- {reason}" for reason in scene_topology["restoration_invalidation_triggers"])}

## Command Surface Vocabulary

{markdown_table(["Command Surface", "Role"], command_rows)}

## Cache And Session Boundary

{markdown_table(["Boundary", "Allowed Storage", "Live Session Requirement"], boundary_rows)}

## Preview And Automation Contracts

SwiftUI preview or snapshot contracts:

{markdown_table(["Preview Contract"], preview_rows)}

Native scene automation scenarios:

{chr(10).join(f"- `{row['scenario_id']}`: {row['assertion']}" for row in handoff_test["native_scene_scenarios"])}

## Scaffolding Pseudocode

```swift
@main
struct InternalOperatorWorkspaceMacApp: App {{
    var body: some Scene {{
        WindowGroup(id: "manifest.workspace") {{
            ManifestWorkspaceSceneView()
        }}
        .defaultSize(width: 1560, height: 980)

        WindowGroup(id: "workitem.workspace") {{
            WorkItemWorkspaceSceneView()
        }}
        .defaultSize(width: 1560, height: 980)

        Settings {{
            SettingsRootView()
        }}
    }}
}}
```

```swift
struct ManifestWorkspaceSceneView: View {{
    var body: some View {{
        NavigationSplitView {{
            ManifestSidebarView()
        }} detail: {{
            CalmWorkspaceCanvasView()
        }}
        .inspector(isPresented: .constant(true)) {{
            SupportInspectorView()
        }}
    }}
}}
```

```swift
struct CompareWindowRoot: NSViewControllerRepresentable {{
    func makeNSViewController(context: Context) -> CompareDiffController {{
        CompareDiffController()
    }}

    func updateNSViewController(_ controller: CompareDiffController, context: Context) {{
        controller.applyLatestProjection()
    }}
}}
```

## Translation Notes

{chr(10).join(f"- {row['browser_primitive']} -> {row['native_translation']}: {row['why']}" for row in translation_map["browser_to_native_translations"])}
"""


def main() -> None:
    supporting_context = build_supporting_context()
    scene_topology = build_native_scene_and_window_topology()
    translation_map = build_native_platform_translation_map(scene_topology)
    cache_security = build_native_cache_session_and_security_boundary()
    rollout = build_native_feature_rollout_sequence()
    handoff_test = build_native_handoff_and_test_strategy(scene_topology)
    criteria = build_criteria()
    alternatives = build_alternatives()
    scorecard = build_scorecard(criteria, alternatives)

    adr_markdown = build_adr_markdown(
        scorecard,
        scene_topology,
        translation_map,
        cache_security,
        rollout,
        handoff_test,
    )
    comparison_markdown = build_comparison_markdown(
        scorecard, scene_topology, cache_security, handoff_test
    )
    scene_atlas_markdown = build_scene_atlas_markdown(
        scene_topology, translation_map, cache_security, handoff_test
    )

    json_write(SCENE_TOPOLOGY_PATH, scene_topology)
    json_write(TRANSLATION_MAP_PATH, translation_map)
    json_write(CACHE_SECURITY_PATH, cache_security)
    json_write(ROLLOUT_PATH, rollout)
    json_write(HANDOFF_TEST_PATH, handoff_test)
    json_write(SCORECARD_PATH, scorecard)
    text_write(ADR_PATH, adr_markdown)
    text_write(COMPARISON_PATH, comparison_markdown)
    text_write(MERMAID_PATH, build_mermaid())
    text_write(SCENE_ATLAS_PATH, scene_atlas_markdown)

    print(
        json.dumps(
            {
                "status": "ok",
                "decision": scorecard["selected_alternative_id"],
                "supporting_context": supporting_context,
                "scene_count": scene_topology["summary"]["scene_count"],
                "boundary_count": cache_security["summary"]["boundary_count"],
                "automation_layers": handoff_test["summary"]["automation_layer_count"],
            },
            indent=2,
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
