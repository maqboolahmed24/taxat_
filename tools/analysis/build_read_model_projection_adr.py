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

TRUTH_SEPARATION_PATH = (
    ALGORITHM_DIR / "authority_truth_and_internal_projection_separation_contract.md"
)
PORTAL_PATH = ALGORITHM_DIR / "customer_client_portal_experience_contract.md"
COLLABORATION_PATH = ALGORITHM_DIR / "collaboration_workspace_contract.md"
GOVERNANCE_PATH = ALGORITHM_DIR / "admin_governance_console_architecture.md"
FRONTEND_SHELL_PATH = ALGORITHM_DIR / "frontend_shell_and_interaction_law.md"
FOUNDATION_PATH = (
    ALGORITHM_DIR
    / "cross_shell_design_token_and_interaction_layer_foundation_contract.md"
)
NORTHBOUND_PATH = ALGORITHM_DIR / "northbound_api_and_session_contract.md"
MACOS_PATH = ALGORITHM_DIR / "macos_native_operator_workspace_blueprint.md"
MODULES_PATH = ALGORITHM_DIR / "modules.md"

READ_MODEL_INDEX_PATH = DATA_ANALYSIS_DIR / "read_model_projection_index.json"
SURFACE_BINDING_PATH = DATA_ANALYSIS_DIR / "surface_read_model_api_binding.json"
SURFACE_ROUTE_MATRIX_PATH = DATA_ANALYSIS_DIR / "surface_route_and_capability_matrix.json"
SURFACE_STATE_MATRIX_PATH = (
    DATA_ANALYSIS_DIR / "surface_state_visibility_recovery_matrix.json"
)
SHELL_ROUTE_MATRIX_PATH = DATA_ANALYSIS_DIR / "shell_route_matrix.json"
FOUNDATION_MAP_PATH = DATA_ANALYSIS_DIR / "interaction_layer_foundation_map.json"
NATIVE_TOPOLOGY_PATH = DATA_ANALYSIS_DIR / "native_scene_window_topology.json"
GAP_REGISTER_PATH = DATA_ANALYSIS_DIR / "cross_surface_gap_register.json"
AUTHORITY_TRUTH_MAP_PATH = (
    DATA_ANALYSIS_DIR / "authority_truth_vs_internal_projection_map.json"
)

ADR_PATH = DOCS_ARCH_ADR_DIR / "ADR-005-read-model-projection-strategy.md"
COMPARISON_PATH = (
    DOCS_ARCH_ADR_DIR / "ADR-005-read-model-projection-strategy-comparison.md"
)
SCORECARD_PATH = (
    DOCS_ARCH_ADR_DIR / "ADR-005-read-model-projection-strategy-scorecard.json"
)
READ_MODEL_CATALOG_PATH = DATA_ANALYSIS_DIR / "read_model_catalog_and_owner_map.json"
READ_MODEL_ROUTE_MAP_PATH = DATA_ANALYSIS_DIR / "read_model_to_route_and_shell_map.json"
GENERATION_POLICY_PATH = (
    DATA_ANALYSIS_DIR / "projection_generation_and_rebuild_policy.json"
)
CUSTOMER_SAFE_BOUNDARY_PATH = (
    DATA_ANALYSIS_DIR / "customer_safe_projection_boundary_matrix.json"
)
STREAM_CONTRACT_PATH = DATA_ANALYSIS_DIR / "projection_stream_delta_contracts.json"
STALENESS_POLICY_PATH = (
    DATA_ANALYSIS_DIR / "projection_version_and_staleness_policy.json"
)
MERMAID_PATH = DIAGRAMS_ANALYSIS_DIR / "ADR-005-read-model-projection-strategy.mmd"

HEADING_RE = re.compile(r"^(#{2,4})\s+(.*)$")
TODAY = "2026-04-18"

BLOCKED_CUSTOMER_SAFE_FAMILIES = [
    "ASSIGNMENT_STATE",
    "ESCALATION_LOGIC",
    "RAW_GATE_STATE",
    "STAFF_REASON_CODES",
    "AUDIT_LINEAGE",
    "INTERNAL_ACTIVITY",
    "INTERNAL_ATTACHMENTS",
    "INTERNAL_PARTICIPANTS",
    "INTERNAL_COUNTS",
    "STAFF_ROUTE_CONTEXT",
]

PORTAL_OBJECTS = {
    "ClientApprovalPack",
    "ClientDocumentRequest",
    "ClientOnboardingJourney",
    "ClientPortalWorkspace",
    "ClientTimelineEvent",
    "ClientUploadSession",
    "PortalHelpRequest",
}
COLLAB_QUEUE_OBJECTS = {
    "WorkInboxSnapshot",
    "WorkInboxDelta",
    "WorkItemNotification",
}
COLLAB_WORKSPACE_OBJECTS = {
    "CollaborationActivitySlice",
    "CollaborationAttachmentSlice",
    "CustomerRequestListSnapshot",
    "WorkspaceCursor",
    "WorkspaceDelta",
    "WorkspaceSnapshot",
    "WorkspaceStreamEvent",
}
MANIFEST_OBJECTS = {
    "ActionStripState",
    "ContextBarState",
    "DecisionBundle",
    "DecisionSummaryState",
    "DetailDrawerState",
    "ExperienceCursor",
    "ExperienceDelta",
    "ExperienceStreamEvent",
    "LowNoiseBudgetAudit",
    "LowNoiseExperienceFrame",
    "TwinView",
}
GOVERNANCE_OBJECTS = {
    "AuditInvestigationFrame",
    "AuthorityLinkInventoryItem",
    "GovernanceAccessSimulation",
    "GovernancePolicySnapshot",
    "GovernanceRiskLedger",
    "PendingChangeQueue",
    "PrincipalAccessView",
    "RetentionGovernanceFrame",
    "RoleTemplateMatrix",
    "TenantConfigWorkspace",
    "TenantGovernanceSnapshot",
}
NATIVE_OBJECTS = {
    "NativeOperatorSecondaryWindowScene",
    "NativeOperatorWorkspaceScene",
}
ANALYTICS_OBJECTS = {
    "AuthorityIngressInvestigationSnapshot",
    "AuthorityReconciliationAnalyticsSnapshot",
    "FailureLifecycleDashboard",
    "OperatorMorningDigest",
}

SUPPLEMENTAL_READ_MODELS: list[dict[str, Any]] = [
    {
        "audience_classes": ["operator_staff"],
        "authoritative_source_refs": [
            "Algorithm/data_model.md::DecisionBundle[canonical manifest snapshot]",
            "Algorithm/northbound_api_and_session_contract.md::2. Required northbound surfaces[manifest experience snapshot and stream are required northbound surfaces]",
        ],
        "notes": [
            "Supplemental record added by ADR-005 because route bindings consume DecisionBundle directly even though the earlier projection index tracks the downstream calm-shell frame rather than the upstream bundle.",
        ],
        "object_id_or_null": "obj_decision_bundle",
        "object_kind": "read_model",
        "object_name": "DecisionBundle",
        "projection_role": "calm_shell_projection",
        "schema_path_or_paths": [
            "Algorithm/schemas/decision_bundle.schema.json",
        ],
        "shell_families": ["CALM_SHELL"],
        "source_status": "supplemental_route_surface",
        "truth_class": "mixed_with_guardrails",
    }
]


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
    return str(value).replace("|", "\\|").replace("\n", " ").strip()


def markdown_table(headers: list[str], rows: list[list[Any]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join("---" for _ in headers) + " |"
    body_lines = [
        "| " + " | ".join(md_escape(cell) for cell in row) + " |" for row in rows
    ]
    return "\n".join([header_line, divider_line, *body_lines])


def compact_source_ref(ref: Any) -> str:
    if isinstance(ref, str):
        return ref
    if not isinstance(ref, dict):
        return str(ref)
    source_file = ref.get("source_file", "unknown")
    logical_block = (
        ref.get("source_heading_or_logical_block")
        or ref.get("source_heading")
        or ref.get("logical_block")
        or "source"
    )
    rationale = ref.get("rationale")
    text = f"{source_file}::{logical_block}"
    if rationale:
        text += f"[{rationale}]"
    return text


def normalize_source_refs(source_refs: Iterable[Any]) -> list[str]:
    return ordered_unique(compact_source_ref(ref) for ref in source_refs)


def normalize_read_surface_name(name: str) -> str:
    value = name.strip()
    exact_map = {
        "WorkspaceSnapshot (linked focus when present)": "WorkspaceSnapshot",
        "DecisionBundle comparison slice": "DecisionBundle",
        "Audit slice": "AuditInvestigationFrame",
        "Packet preview slice": "DecisionBundle",
        "Authority interaction slice": "AuthorityIngressInvestigationSnapshot",
        "Return target envelope": "ReturnTargetEnvelope",
        "pending authority task binding": "PendingAuthorityTaskBinding",
        "preview_subject_ref_or_null": "PreviewSubjectRef",
    }
    if value in exact_map:
        return exact_map[value]
    if value.endswith(" comparison slice"):
        return value[: -len(" comparison slice")]
    if value.endswith(" slice"):
        return value[: -len(" slice")]
    value = re.sub(r"\s+\(.*\)$", "", value)
    return value.strip()


def title_from_key(key: str) -> str:
    return key.replace("_", " ").title()


def family_for_object(name: str) -> str:
    if name in MANIFEST_OBJECTS:
        return "manifest_experience"
    if name in COLLAB_QUEUE_OBJECTS:
        return "collaboration_queue"
    if name in COLLAB_WORKSPACE_OBJECTS:
        return "collaboration_workspace"
    if name in PORTAL_OBJECTS:
        return "portal_customer_safe"
    if name in GOVERNANCE_OBJECTS:
        return "governance_control_plane"
    if name in NATIVE_OBJECTS:
        return "native_projection_mirror"
    if name in ANALYTICS_OBJECTS:
        return "ops_and_analytics"
    return "ops_and_analytics"


def build_supporting_context() -> dict[str, Any]:
    read_model_index = load_json(READ_MODEL_INDEX_PATH)
    surface_routes = load_json(SURFACE_ROUTE_MATRIX_PATH)
    shell_routes = load_json(SHELL_ROUTE_MATRIX_PATH)
    gaps = load_json(GAP_REGISTER_PATH)
    authority_truth_map = load_json(AUTHORITY_TRUTH_MAP_PATH)
    foundation_map = load_json(FOUNDATION_MAP_PATH)
    native_topology = load_json(NATIVE_TOPOLOGY_PATH)
    return {
        "projection_row_count": read_model_index["summary"]["projection_row_count"],
        "surface_route_count": surface_routes["summary"]["route_scene_count"],
        "shell_route_count": shell_routes["summary"]["route_count"],
        "gap_count": gaps["summary"]["gap_count"],
        "truth_surface_count": authority_truth_map["summary"]["surface_count"],
        "shell_family_count": len(foundation_map["shell_foundations"]),
        "native_primary_scene_count": len(native_topology["primary_scenes"]),
        "native_secondary_window_count": len(native_topology["secondary_windows"]),
    }


def build_family_specs() -> dict[str, dict[str, Any]]:
    return {
        "manifest_experience": {
            "label": "Manifest calm-shell projections",
            "owner_boundary": "MANIFEST_READ_MODEL_BOUNDARY",
            "projection_owner": "BUILD_SNAPSHOT(...) + EXTRACT_AUTHORITY_VIEWS(...) + BUILD_LIVE_EXPERIENCE_FRAME(...)",
            "source_truth_surfaces": [
                "RunManifest",
                "WorkflowItem",
                "SubmissionRecord",
                "AuthorityInteractionRecord",
                "ApiCommandReceipt",
            ],
            "update_mode": "SERVER_AUTHORED_SNAPSHOT_PLUS_TYPED_DELTA",
            "precompute_mode": "PRECOMPUTED_FRAME_WITH_STREAM_COMPANION",
            "stale_guard_basis": [
                "decision_bundle_hash",
                "publication_generation",
                "shell_stability_token",
                "view_guard_ref",
                "stream_recovery_contract",
            ],
            "rebuild_source": "Rebuild from durable manifest truth, workflow truth, and authority views; never from browser cache, SSE memory, or native local state.",
            "client_composition_rule": "Clients may restack, scroll, or collapse support regions, but they SHALL NOT derive legal posture from detail fragments or local heuristics.",
            "native_parity_rule": "Native and web share the same calm-shell semantics and consume the same server-authored snapshot/delta doctrine.",
            "generation_timing": {
                "command_side_truth_changes": "Manifest, workflow, authority, or receipt truth changes append durable truth first.",
                "projector_updates": "The manifest projector regenerates DecisionBundle and the calm-shell frame deterministically from durable truth.",
                "stream_publication": "Publish the fresh calm-shell frame or typed delta with ordered resume metadata after the authoritative bundle commits.",
                "browser_cache_hydration": "Browser cache stores only route-partitioned disposable projections keyed by shell stability and publication generation.",
                "native_cache_hydration": "Native scenes hydrate from the same northbound snapshot and typed deltas; local persistence remains disposable.",
                "reconnect_and_catchup": "Resume by cursor and sequence; if epoch or guard drift appears, fetch a fresh snapshot and preserve the same manifest shell when legal.",
                "full_rebuild_after_drift_schema_or_restore": "Discard all cached projections and rebuild from durable bundle truth when schema, restore, or replay drift is detected.",
                "schema_evolution_reader_window": "Support additive reader windows by versioning snapshot envelopes and forcing rebase when a reader cannot honor the current projection version.",
            },
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "2. Required northbound surfaces"),
                heading_ref(NORTHBOUND_PATH, "7. Stream and reconnect rules"),
                heading_ref(FRONTEND_SHELL_PATH, "1. Shell families and object ownership"),
                heading_ref(FRONTEND_SHELL_PATH, "2.2 Stable route keys"),
                heading_ref(MODULES_PATH, "BUILD_SNAPSHOT(...)"),
                heading_ref(MODULES_PATH, "EXTRACT_AUTHORITY_VIEWS(...)"),
                heading_ref(MODULES_PATH, "BUILD_LIVE_EXPERIENCE_FRAME(...)"),
            ],
        },
        "collaboration_queue": {
            "label": "Collaboration queue and notification projections",
            "owner_boundary": "COLLABORATION_QUEUE_PROJECTION_BOUNDARY",
            "projection_owner": "PLAN_WORKFLOW(...) + UPSERT_WORKFLOW_ITEMS(...) + collaboration queue projector",
            "source_truth_surfaces": [
                "WorkflowItem",
                "SubmissionRecord",
                "AuthorityInteractionRecord",
                "WorkItemNotification",
                "ApiCommandReceipt",
            ],
            "update_mode": "SERVER_AUTHORED_QUEUE_SNAPSHOT_PLUS_TYPED_DELTA",
            "precompute_mode": "PRECOMPUTED_QUEUE_ROWS_WITH_MONOTONIC_DELTA",
            "stale_guard_basis": [
                "workspace_route_key",
                "resume_token",
                "shell_stability_token",
                "visibility_cache_partition_key",
                "access_binding_hash",
                "masking_posture_fingerprint",
            ],
            "rebuild_source": "Rebuild from workflow truth and append-only notification history; never reconstruct the inbox by fan-out reads from mounted workspaces.",
            "client_composition_rule": "Clients may preserve filters, selection, and scroll anchors, but SHALL NOT reconstruct queue order or row legality from independent workspace fetches.",
            "native_parity_rule": "Native mirrors the same route-stable queue semantics only through northbound snapshots and receipts.",
            "generation_timing": {
                "command_side_truth_changes": "Workflow state, assignment, escalation, and request-for-info truth updates commit first.",
                "projector_updates": "Queue rows and badges are recomputed from the current workflow truth basis with deterministic ordering.",
                "stream_publication": "Emit WorkInboxDelta in strictly monotonic sequence for the tenant/route scope.",
                "browser_cache_hydration": "Browser cache stores queue rows under tenant, session, masking, route, and visibility partition keys.",
                "native_cache_hydration": "Native consumers may cache the queue as a disposable mirror but must honor the same visibility and route bindings.",
                "reconnect_and_catchup": "Resume by sequence; duplicate deliveries stay idempotent, and compaction or guard drift forces a fresh WorkInboxSnapshot.",
                "full_rebuild_after_drift_schema_or_restore": "Regenerate the full queue snapshot from workflow truth after restore, replay, or incompatible schema change.",
                "schema_evolution_reader_window": "Readers may accept additive row fields, but ordering basis and visibility partition changes require a snapshot refresh.",
            },
            "source_refs": [
                heading_ref(COLLABORATION_PATH, "7.3 Read models"),
                heading_ref(COLLABORATION_PATH, "8. Command and read API additions"),
                heading_ref(COLLABORATION_PATH, "9. Stream events and notifications"),
                heading_ref(FRONTEND_SHELL_PATH, "2.5 Queue and inbox continuity"),
            ],
        },
        "collaboration_workspace": {
            "label": "Collaboration workspace and customer-request projections",
            "owner_boundary": "COLLABORATION_WORKSPACE_PROJECTION_BOUNDARY",
            "projection_owner": "BUILD_SNAPSHOT(...) + collaboration workspace projector",
            "source_truth_surfaces": [
                "WorkflowItem",
                "RequestInfoRecord",
                "CollaborationThread",
                "CollaborationEntry",
                "CollaborationAttachment",
                "WorkItemParticipant",
                "SubmissionRecord",
                "AuthorityInteractionRecord",
                "ApiCommandReceipt",
            ],
            "update_mode": "SERVER_AUTHORED_WORKSPACE_SNAPSHOT_PLUS_TYPED_DELTA",
            "precompute_mode": "PRECOMPUTED_WORKSPACE_WITH_PAGED_SUPPORT_SLICES",
            "stale_guard_basis": [
                "workspace_version",
                "shell_stability_token",
                "workspace_route_key",
                "access_binding_hash",
                "masking_posture_fingerprint",
                "visibility_cache_partition_key",
            ],
            "rebuild_source": "Rebuild the mounted workspace and support slices from durable workflow truth and append-only collaboration artifacts.",
            "client_composition_rule": "Clients may choose the active module and preserve draft context, but SHALL NOT invent assignment, escalation, or customer-safe posture from hidden staff lanes.",
            "native_parity_rule": "Native work-item scenes mirror the same workspace snapshot/delta contract rather than reimplementing workflow legality.",
            "generation_timing": {
                "command_side_truth_changes": "Workflow, collaboration, attachment, and receipt truth append first.",
                "projector_updates": "WorkspaceSnapshot, support slices, and customer request list projections rebuild deterministically from the latest durable state.",
                "stream_publication": "WorkspaceDelta and activity append events publish only after the mounted workspace basis is durable.",
                "browser_cache_hydration": "Browser cache partitions the mounted workspace by tenant/client, access binding, masking, route, and visibility partition.",
                "native_cache_hydration": "Native work-item scenes hydrate the same snapshot and apply typed deltas idempotently.",
                "reconnect_and_catchup": "Resume by workspace cursor or sequence; epoch drift or stale-view rejection forces an inline rebase while preserving the same object and shell.",
                "full_rebuild_after_drift_schema_or_restore": "Discard cached workspace state and regenerate from workflow truth and append-only collaboration artifacts.",
                "schema_evolution_reader_window": "Additive fields are tolerated inside the same workspace version family; incompatible reader windows require a full workspace refresh.",
            },
            "source_refs": [
                heading_ref(COLLABORATION_PATH, "7.3 Read models"),
                heading_ref(COLLABORATION_PATH, "8. Command and read API additions"),
                heading_ref(COLLABORATION_PATH, "9. Stream events and notifications"),
                heading_ref(COLLABORATION_PATH, "12. Playwright scenarios"),
                heading_ref(FRONTEND_SHELL_PATH, "5. State, freshness, visibility, and recovery presentation"),
            ],
        },
        "portal_customer_safe": {
            "label": "Portal customer-safe projections",
            "owner_boundary": "PORTAL_CUSTOMER_SAFE_PROJECTION_BOUNDARY",
            "projection_owner": "BUILD_CLIENT_PORTAL_WORKSPACE(...) + route-level customer-safe projectors",
            "source_truth_surfaces": [
                "WorkflowItem",
                "SubmissionRecord",
                "AuthorityInteractionRecord",
                "ObligationMirror",
                "ApiCommandReceipt",
                "ProblemEnvelope",
            ],
            "update_mode": "SERVER_AUTHORED_CUSTOMER_SAFE_SNAPSHOT_WITH_REFRESH",
            "precompute_mode": "PRECOMPUTED_ROUTE_SNAPSHOT_WITH_RECEIPT_DRIVEN_REHYDRATION",
            "stale_guard_basis": [
                "workspace_version",
                "view_guard_ref",
                "customer_safe_projection",
                "visibility_partition",
                "latest_stale_guard_value",
            ],
            "rebuild_source": "Rebuild portal routes from durable truth through the customer-safe projection boundary; never widen hidden staff state from route path or client composition.",
            "client_composition_rule": "Portal clients may restore tabs, drafts, and focus anchors, but SHALL NOT infer stronger authority certainty, hidden staff rationale, or current/historical artifact posture locally.",
            "native_parity_rule": "Any future native portal embodiment must consume the same PortalInteractionLayer and customer-safe translation contract.",
            "generation_timing": {
                "command_side_truth_changes": "Durable workflow, receipt, authority, and obligation truth changes commit first.",
                "projector_updates": "Portal route projections regenerate by applying customer-safe translation rules before serialization.",
                "stream_publication": "Portal routes refresh through role-filtered snapshot publication and continuity contracts rather than raw internal deltas.",
                "browser_cache_hydration": "Browser cache partitions by client, session, route, object, projection version, and customer-safe visibility partition.",
                "native_cache_hydration": "A native portal cache may only mirror the exact same customer-safe slice and must purge on access-binding or masking drift.",
                "reconnect_and_catchup": "Reconnect preserves the same route and object anchor; stale or degraded posture stays explicit until a fresh snapshot clears it.",
                "full_rebuild_after_drift_schema_or_restore": "Drop portal caches and regenerate from durable truth whenever schema, restore, or binding drift invalidates the current customer-safe boundary.",
                "schema_evolution_reader_window": "Portal readers may accept additive copy or support fields, but customer-safe boundary and stale-guard changes require a full route refresh.",
            },
            "source_refs": [
                heading_ref(PORTAL_PATH, "Read-model and API translation requirements"),
                heading_ref(PORTAL_PATH, "Minimum semantic selectors"),
                heading_ref(PORTAL_PATH, "Playwright validation minimum"),
                heading_ref(FRONTEND_SHELL_PATH, "1. Shell families and object ownership"),
                heading_ref(FRONTEND_SHELL_PATH, "2.2 Stable route keys"),
                heading_ref(MODULES_PATH, "BUILD_CLIENT_PORTAL_WORKSPACE(...)"),
            ],
        },
        "governance_control_plane": {
            "label": "Governance read models and simulation projections",
            "owner_boundary": "GOVERNANCE_PROJECTION_BOUNDARY",
            "projection_owner": "BUILD_TENANT_GOVERNANCE_SNAPSHOT(...) + governance read-side projectors",
            "source_truth_surfaces": [
                "PrincipalContext",
                "DelegationGrant",
                "AuthorityLink",
                "ConfigChangeRequest",
                "RetentionTag",
                "ArtifactRetention",
                "AuditEvent",
                "ApiCommandReceipt",
            ],
            "update_mode": "SERVER_AUTHORED_GOVERNANCE_SNAPSHOT_WITH_RECEIPT_REFRESH",
            "precompute_mode": "PRECOMPUTED_ROUTE_SNAPSHOTS_WITH_ON_DEMAND_SIMULATION",
            "stale_guard_basis": [
                "policy_snapshot_hash",
                "dependency_topology_hash",
                "simulation_basis_hash",
                "access_binding_hash",
                "masking_posture_fingerprint",
            ],
            "rebuild_source": "Rebuild governance surfaces from durable control-plane truth, audit ledgers, and simulation basis snapshots.",
            "client_composition_rule": "Clients may manage local baskets, filters, and comparison panels, but SHALL NOT derive authoritative policy truth from granular mutation fragments.",
            "native_parity_rule": "Governance remains server-state first; any native embodiment would still consume the same snapshot and simulation contracts.",
            "generation_timing": {
                "command_side_truth_changes": "Governance commands settle durable config, access, retention, or audit truth first.",
                "projector_updates": "Governance snapshots and simulations recompute from the committed truth basis or declared simulation basis hash.",
                "stream_publication": "Governance favors receipt-driven refresh and selective snapshot invalidation over free-form client recomposition.",
                "browser_cache_hydration": "Browser caches governance snapshots by tenant, session, access binding, masking, route, and policy basis hashes.",
                "native_cache_hydration": "No first-class native governance cache is assumed; any future client must treat these projections as disposable.",
                "reconnect_and_catchup": "Reconnect preserves the same object and route anchor; stale basis hashes force inline refresh before further mutation.",
                "full_rebuild_after_drift_schema_or_restore": "Recompute all governance snapshots from durable config and audit truth after restore, replay, or incompatible schema change.",
                "schema_evolution_reader_window": "Additive route fields are acceptable, but changes to policy basis hashes or simulation contracts require a fresh snapshot.",
            },
            "source_refs": [
                heading_ref(GOVERNANCE_PATH, "6. Shared interaction and mutation rules"),
                heading_ref(GOVERNANCE_PATH, "7. Frontend systems architecture"),
                heading_ref(GOVERNANCE_PATH, "7.6 Minimum route read models"),
                heading_ref(GOVERNANCE_PATH, "8. Accessibility and responsive requirements"),
                heading_ref(MODULES_PATH, "BUILD_TENANT_GOVERNANCE_SNAPSHOT(...)"),
            ],
        },
        "native_projection_mirror": {
            "label": "Native cached mirrors",
            "owner_boundary": "NATIVE_CACHE_HYDRATION_BOUNDARY",
            "projection_owner": "Northbound snapshot hydrator + native resume engine",
            "source_truth_surfaces": [
                "RunManifest",
                "WorkflowItem",
                "SubmissionRecord",
                "AuthorityInteractionRecord",
                "ApiCommandReceipt",
            ],
            "update_mode": "SERVER_AUTHORED_SNAPSHOT_WITH_DISPOSABLE_NATIVE_CACHE",
            "precompute_mode": "ON_DEMAND_HYDRATION_WITH_TYPED_RESUME",
            "stale_guard_basis": [
                "scene_identity",
                "canonical_object_ref",
                "projection_version",
                "access_binding",
                "masking",
                "resume_token",
            ],
            "rebuild_source": "Rebuild native scenes from northbound snapshots and typed deltas; purge local persistence on revocation, tenant switch, masking drift, or schema incompatibility.",
            "client_composition_rule": "SwiftUI/AppKit may compose window chrome and local drafts, but SHALL NOT reimplement filing, gate, trust, amendment, or customer-safe legality.",
            "native_parity_rule": "Native is an embodiment of the same shell laws, not a fourth shell family.",
            "generation_timing": {
                "command_side_truth_changes": "Server truth settles first; native never authors legal state locally.",
                "projector_updates": "Northbound projectors publish the same snapshot and delta contracts that browser clients consume.",
                "stream_publication": "Native applies typed deltas idempotently or rebases to a fresh snapshot when guards drift.",
                "browser_cache_hydration": "Not applicable; this family exists to mirror browser doctrine in native form.",
                "native_cache_hydration": "Hydrate the latest compatible snapshot, mark cached posture explicitly, then fetch fresh and attach to resume streams.",
                "reconnect_and_catchup": "Reconnect by resume token; if drift or incompatibility appears, fetch a fresh snapshot and keep the same scene when the object still resolves.",
                "full_rebuild_after_drift_schema_or_restore": "Purge native caches and rebuild entirely from northbound truth on restore, replay, or incompatible schema migration.",
                "schema_evolution_reader_window": "Native readers may accept additive fields within a compatible projection version, but incompatible schema drift requires full purge and rehydrate.",
            },
            "source_refs": [
                heading_ref(MACOS_PATH, "1. Architectural thesis"),
                heading_ref(MACOS_PATH, "4. Platform translation map"),
                heading_ref(MACOS_PATH, "6. Data flow and synchronization model"),
                heading_ref(MACOS_PATH, "FE-25 Cache Isolation"),
                heading_ref(MACOS_PATH, "FE-75 Native Cache Hydration, Purge, and Rebase"),
            ],
        },
        "ops_and_analytics": {
            "label": "Ops and analytics projections",
            "owner_boundary": "OPS_ANALYTICS_PROJECTION_BOUNDARY",
            "projection_owner": "Named investigation, reconciliation, and failure projectors",
            "source_truth_surfaces": [
                "AuthorityIngressReceipt",
                "AuthorityInteractionRecord",
                "SubmissionRecord",
                "AuditEvent",
                "FailureInvestigation",
            ],
            "update_mode": "SERVER_AUTHORED_DERIVED_SNAPSHOT",
            "precompute_mode": "BATCH_OR_ON_DEMAND_DERIVATION",
            "stale_guard_basis": [
                "projection_version",
                "query_basis_hash",
                "cursor_or_window_anchor",
            ],
            "rebuild_source": "Rebuild entirely from append-only evidence and durable command-side truth.",
            "client_composition_rule": "Clients may filter and compare, but SHALL NOT convert observability projections into settlement truth.",
            "native_parity_rule": "No special native rule; consumers remain projection readers only.",
            "generation_timing": {
                "command_side_truth_changes": "Append-only ingress, reconciliation, audit, and failure evidence settles first.",
                "projector_updates": "Derived dashboards and investigation snapshots rebuild from append-only truth and typed aggregations.",
                "stream_publication": "These projections usually refresh by polling or explicit query rather than long-lived UX deltas.",
                "browser_cache_hydration": "If cached at all, cache by query basis and projection version only.",
                "native_cache_hydration": "Native mirrors are optional and remain disposable.",
                "reconnect_and_catchup": "Refresh from the declared query basis rather than replaying opaque local calculations.",
                "full_rebuild_after_drift_schema_or_restore": "Re-run the derivation over durable evidence after restore or incompatible schema drift.",
                "schema_evolution_reader_window": "Favor additive evidence and versioned query envelopes; incompatible analytics readers must refresh completely.",
            },
            "source_refs": [
                heading_ref(TRUTH_SEPARATION_PATH, "Required Outcomes"),
                heading_ref(MODULES_PATH, "PROJECT_AUTHORITY_INGRESS_INVESTIGATION(...)"),
                heading_ref(MODULES_PATH, "EMIT_AUTHORITY_RECONCILIATION_ANALYTICS(...)"),
                heading_ref(MODULES_PATH, "BUILD_FAILURE_LIFECYCLE_DASHBOARD(...)"),
            ],
        },
    }


def build_criteria() -> list[dict[str, Any]]:
    return [
        {
            "criterion_id": "legal_truth_separation",
            "label": "Legal truth separation",
            "weight": 16,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Projection architecture must preserve the separation between authority truth, internal workflow truth, and customer-safe mirrors so no client cache or UI fragment can become legal meaning.",
            "source_refs": [
                heading_ref(TRUTH_SEPARATION_PATH, "Purpose"),
                heading_ref(TRUTH_SEPARATION_PATH, "Governing Model"),
                heading_ref(TRUTH_SEPARATION_PATH, "Required Outcomes"),
                heading_ref(TRUTH_SEPARATION_PATH, "Surface Rules"),
            ],
        },
        {
            "criterion_id": "visibility_control",
            "label": "Staff versus customer-safe visibility control",
            "weight": 12,
            "priority": "HARD_REQUIREMENT",
            "rationale": "The architecture must enforce customer-safe projection boundaries before serialization so portal and customer-visible collaboration routes cannot infer staff-only context.",
            "source_refs": [
                heading_ref(PORTAL_PATH, "Read-model and API translation requirements"),
                heading_ref(COLLABORATION_PATH, "7.3 Read models"),
                heading_ref(FRONTEND_SHELL_PATH, "6. Empty, loading, and partial-visibility rules"),
            ],
        },
        {
            "criterion_id": "same_object_same_shell_continuity",
            "label": "Same-object and same-shell continuity",
            "weight": 10,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Rebase, reconnect, notification-open, and responsive collapse must preserve the same object and shell identity where the object still resolves.",
            "source_refs": [
                heading_ref(FRONTEND_SHELL_PATH, "1. Shell families and object ownership"),
                heading_ref(FRONTEND_SHELL_PATH, "2.2 Stable route keys"),
                heading_ref(PORTAL_PATH, "Read-model and API translation requirements"),
                heading_ref(COLLABORATION_PATH, "12. Playwright scenarios"),
            ],
        },
        {
            "criterion_id": "browser_native_parity_without_duplicate_logic",
            "label": "Browser/native parity without duplicate business logic",
            "weight": 10,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Web and native clients must share projection semantics and interaction-layer contracts rather than reimplementing business logic independently.",
            "source_refs": [
                heading_ref(FOUNDATION_PATH, "Required family mappings"),
                heading_ref(MACOS_PATH, "1. Architectural thesis"),
                heading_ref(MACOS_PATH, "4. Platform translation map"),
                heading_ref(MACOS_PATH, "6. Data flow and synchronization model"),
            ],
        },
        {
            "criterion_id": "stream_delta_and_reconnect_fitness",
            "label": "Stream delta and reconnect fitness",
            "weight": 10,
            "priority": "HARD_REQUIREMENT",
            "rationale": "The chosen projection strategy must fit monotonic deltas, resume tokens, duplicate idempotency, and typed catch-up rules.",
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "7. Stream and reconnect rules"),
                heading_ref(COLLABORATION_PATH, "9. Stream events and notifications"),
                heading_ref(MACOS_PATH, "6. Data flow and synchronization model"),
            ],
        },
        {
            "criterion_id": "stale_view_protection_and_rebase_clarity",
            "label": "Stale-view protection and rebase clarity",
            "weight": 10,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Stale-view rejection, rebase, and recovery must remain explicit server-authored contracts so clients do not guess what changed.",
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "6. Concurrency and stale-view rules"),
                heading_ref(PORTAL_PATH, "Read-model and API translation requirements"),
                heading_ref(GOVERNANCE_PATH, "7. Frontend systems architecture"),
                heading_ref(COLLABORATION_PATH, "8. Command and read API additions"),
            ],
        },
        {
            "criterion_id": "rebuildability_from_durable_truth",
            "label": "Rebuildability from durable truth",
            "weight": 9,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Streams, caches, and native hydrators must remain disposable and fully rebuildable from durable truth without hidden heuristics.",
            "source_refs": [
                heading_ref(TRUTH_SEPARATION_PATH, "Required Outcomes"),
                heading_ref(NORTHBOUND_PATH, "1. Core principles"),
                heading_ref(MODULES_PATH, "BUILD_SNAPSHOT(...)"),
                heading_ref(MODULES_PATH, "EXTRACT_AUTHORITY_VIEWS(...)"),
            ],
        },
        {
            "criterion_id": "schema_evolution_and_reader_window_safety",
            "label": "Schema evolution and reader-window safety",
            "weight": 8,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Projection contracts need stable versioning and reader-window rules so web, native, and tests can survive additive change while failing closed on incompatible drift.",
            "source_refs": [
                heading_ref(PORTAL_PATH, "Read-model and API translation requirements"),
                heading_ref(COLLABORATION_PATH, "7.3 Read models"),
                heading_ref(GOVERNANCE_PATH, "7.6 Minimum route read models"),
                heading_ref(MACOS_PATH, "FE-75 Native Cache Hydration, Purge, and Rebase"),
            ],
        },
        {
            "criterion_id": "performance_and_cache_invalidation_complexity",
            "label": "Performance and cache invalidation complexity",
            "weight": 6,
            "priority": "TRADEOFF",
            "rationale": "Projection design must keep cache invalidation explicit and affordable without pushing semantic composition or truth leakage to the clients.",
            "source_refs": [
                heading_ref(GOVERNANCE_PATH, "7. Frontend systems architecture"),
                heading_ref(PORTAL_PATH, "FE-25 Cache Isolation"),
                heading_ref(MACOS_PATH, "FE-25 Cache Isolation"),
                heading_ref(NORTHBOUND_PATH, "7. Stream and reconnect rules"),
            ],
        },
        {
            "criterion_id": "testing_determinism_and_fixture_friendliness",
            "label": "Testing determinism and fixture friendliness",
            "weight": 5,
            "priority": "STRONG_PREFERENCE",
            "rationale": "Stable read-model envelopes and selectors make Playwright, API, and native tests deterministic and easier to fixture.",
            "source_refs": [
                heading_ref(PORTAL_PATH, "Playwright validation minimum"),
                heading_ref(COLLABORATION_PATH, "12. Playwright scenarios"),
                heading_ref(GOVERNANCE_PATH, "9. Validation plan"),
                heading_ref(FRONTEND_SHELL_PATH, "10. Automation anchors and UI observability fencing"),
            ],
        },
        {
            "criterion_id": "operational_simplicity_and_debuggability",
            "label": "Operational simplicity and debuggability",
            "weight": 4,
            "priority": "TRADEOFF",
            "rationale": "The projection doctrine should be explainable in production incidents without hiding critical semantics inside client code or one giant graph query.",
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "1. Core principles"),
                heading_ref(GOVERNANCE_PATH, "7. Frontend systems architecture"),
                heading_ref(MODULES_PATH, "BUILD_LIVE_EXPERIENCE_FRAME(...)"),
                heading_ref(MODULES_PATH, "BUILD_CLIENT_PORTAL_WORKSPACE(...)"),
                heading_ref(MODULES_PATH, "BUILD_TENANT_GOVERNANCE_SNAPSHOT(...)"),
            ],
        },
    ]


def build_alternatives() -> list[dict[str, Any]]:
    return [
        {
            "alternative_id": "server_authored_per_surface_typed_projections",
            "label": "Server-authored per-surface typed read models and deltas",
            "summary": "The server owns route-level read models, stream deltas, stale guards, customer-safe redaction, and native/browser parity; clients consume and render those contracts rather than inventing legal posture from fragments.",
            "strengths": [
                "Best fit for the corpus's named route-level projections such as calm-shell frames, collaboration snapshots/deltas, portal workspaces, and governance snapshots.",
                "Preserves customer-safe boundaries and stale/recovery posture as server-authored contracts instead of client heuristics.",
                "Lets browser and native clients share one doctrine while keeping caches disposable.",
            ],
            "risks": [
                "Requires explicit projector ownership and more schema discipline than a thin pass-through API.",
                "Needs clear versioning and invalidation rules so projection sprawl does not become accidental duplication.",
            ],
        },
        {
            "alternative_id": "thin_backend_client_composed_view_models",
            "label": "Thin backend plus client-composed view models from granular APIs",
            "summary": "Expose many smaller APIs and let browser/native clients assemble their own view models, status posture, and route state from granular domain fragments.",
            "strengths": [
                "Looks simpler initially because fewer dedicated server projections need to be maintained.",
                "Can reduce some duplicated server read-side code for small or highly local screens.",
            ],
            "risks": [
                "Pushes stale-view logic, visibility fencing, and route continuity semantics into browser and native code.",
                "Raises the odds that different clients compose different meanings from the same fragments.",
            ],
        },
        {
            "alternative_id": "large_unified_graph_client_heavy_selection",
            "label": "Large unified graph or mega-workspace model with client-heavy selection and composition",
            "summary": "Expose a large all-in-one graph or mega-workspace payload and let clients select slices, derive posture, and coordinate refreshes locally.",
            "strengths": [
                "Promises fewer explicit route-specific envelopes and can simplify some bulk-fetch patterns.",
                "May look attractive for exploratory consoles that need broad graph traversal.",
            ],
            "risks": [
                "Blurs route ownership, visibility lanes, and customer-safe boundaries because the client sees too much at once.",
                "Makes stale-view, rebase, and cache invalidation more implicit and harder to debug.",
            ],
        },
    ]


def build_score_map() -> dict[str, dict[str, tuple[float, str]]]:
    return {
        "server_authored_per_surface_typed_projections": {
            "legal_truth_separation": (
                4.75,
                "Best match for the truth-separation contract because projections stay disposable and subordinate to durable truth surfaces.",
            ),
            "visibility_control": (
                4.75,
                "Customer-safe redaction happens at projection build time, before any browser or native serialization boundary.",
            ),
            "same_object_same_shell_continuity": (
                4.75,
                "Route-level envelopes can carry the exact shell, focus, and recovery anchors needed to preserve same-object continuity.",
            ),
            "browser_native_parity_without_duplicate_logic": (
                4.5,
                "Typed projections let web and native share the same business semantics while differing only in embodiment.",
            ),
            "stream_delta_and_reconnect_fitness": (
                4.75,
                "Monotonic deltas, explicit cursors, and rebase contracts align directly with the named northbound and collaboration stream rules.",
            ),
            "stale_view_protection_and_rebase_clarity": (
                4.75,
                "The server can publish guard families, latest values, and typed rebase posture instead of leaving clients to infer them.",
            ),
            "rebuildability_from_durable_truth": (
                4.75,
                "All caches and deltas remain disposable because route projections are rebuilt from durable truth rather than acting as primary state.",
            ),
            "schema_evolution_and_reader_window_safety": (
                4.5,
                "Versioned route envelopes give web, native, and tests one stable reader window for additive change.",
            ),
            "performance_and_cache_invalidation_complexity": (
                4.0,
                "More server read models exist, but invalidation stays explicit and local to named surfaces rather than exploding client-side.",
            ),
            "testing_determinism_and_fixture_friendliness": (
                4.5,
                "Dedicated read models, stable selectors, and typed deltas are easier to fixture and regression-test consistently.",
            ),
            "operational_simplicity_and_debuggability": (
                4.0,
                "Projection ownership is explicit per surface family, making incident analysis clearer than multi-client composition rules.",
            ),
        },
        "thin_backend_client_composed_view_models": {
            "legal_truth_separation": (
                2.75,
                "Truth separation can be preserved in principle, but route meaning is more likely to drift once clients compose posture from fragments.",
            ),
            "visibility_control": (
                2.5,
                "Customer-safe boundaries become harder to enforce because clients must know which granular fields are forbidden to combine.",
            ),
            "same_object_same_shell_continuity": (
                2.75,
                "Continuity can be approximated, but route and shell identity depend on each client recomposing equivalent anchors.",
            ),
            "browser_native_parity_without_duplicate_logic": (
                2.75,
                "Web and native inevitably duplicate more composition and recovery logic when the server does less shaping.",
            ),
            "stream_delta_and_reconnect_fitness": (
                2.75,
                "Granular APIs can stream, but reconnect semantics become harder once the client owns composition of many moving pieces.",
            ),
            "stale_view_protection_and_rebase_clarity": (
                2.5,
                "Clients need to combine many stale bases and can more easily guess at rebase causes or route fallbacks.",
            ),
            "rebuildability_from_durable_truth": (
                3.25,
                "Durable truth still exists, but recreating the exact client-composed state requires reproducing more hidden client rules.",
            ),
            "schema_evolution_and_reader_window_safety": (
                3.0,
                "Granular APIs can evolve independently, but the overall reader window is harder to reason about because view-model meaning is emergent.",
            ),
            "performance_and_cache_invalidation_complexity": (
                4.25,
                "This option can reduce some server projection work and allow narrower fetches, which is its strongest tradeoff.",
            ),
            "testing_determinism_and_fixture_friendliness": (
                4.0,
                "Unit tests can cover some client composition logic, but end-to-end determinism suffers once many fragments must align at runtime.",
            ),
            "operational_simplicity_and_debuggability": (
                4.0,
                "Short-term service topology is simpler, though runtime reasoning becomes split across multiple clients and caches.",
            ),
        },
        "large_unified_graph_client_heavy_selection": {
            "legal_truth_separation": (
                2.25,
                "A mega-model exposes too much adjacent state to the client and makes it easier to treat hidden graph context as user-facing truth.",
            ),
            "visibility_control": (
                2.0,
                "Customer-safe and staff-only lanes are hardest to police when one large payload contains broad mixed visibility state.",
            ),
            "same_object_same_shell_continuity": (
                2.0,
                "Shell and route ownership blur when the client can pivot locally through a broad graph without explicit route contracts.",
            ),
            "browser_native_parity_without_duplicate_logic": (
                2.25,
                "Both clients still need substantial local selection and derivation logic, so parity remains fragile.",
            ),
            "stream_delta_and_reconnect_fitness": (
                3.25,
                "A large graph can support streams, but fine-grained invalidation and rebase semantics become much harder to type and explain.",
            ),
            "stale_view_protection_and_rebase_clarity": (
                2.25,
                "Clients see broad state drift without clear route-level stale guard families, making rebase posture murkier.",
            ),
            "rebuildability_from_durable_truth": (
                2.0,
                "The client-side graph often accumulates hidden composition rules that are difficult to replay or rebuild deterministically.",
            ),
            "schema_evolution_and_reader_window_safety": (
                2.25,
                "A single mega-envelope increases blast radius for schema drift and widens the reader window problem.",
            ),
            "performance_and_cache_invalidation_complexity": (
                2.75,
                "Broad payloads and cross-cutting invalidation can quickly become expensive and opaque.",
            ),
            "testing_determinism_and_fixture_friendliness": (
                1.75,
                "Tests have to stand up a large shape and still reproduce local selection logic reliably.",
            ),
            "operational_simplicity_and_debuggability": (
                2.0,
                "The runtime can appear centralized, but debugging which graph fragment produced which user-facing posture becomes difficult.",
            ),
        },
    }


def build_scorecard(
    criteria: list[dict[str, Any]], alternatives: list[dict[str, Any]]
) -> dict[str, Any]:
    score_map = build_score_map()
    scored_alternatives: list[dict[str, Any]] = []
    for alternative in alternatives:
        criterion_breakdown: list[dict[str, Any]] = []
        weighted_total = 0.0
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
                **alternative,
                "criterion_breakdown": criterion_breakdown,
                "weighted_total": round(weighted_total, 2),
            }
        )
    ranked = sorted(
        scored_alternatives, key=lambda item: item["weighted_total"], reverse=True
    )
    for index, alternative in enumerate(ranked, 1):
        alternative["rank"] = index
    return {
        "decision_id": "ADR-005",
        "decision_title": "Read-Model Projection Strategy",
        "decision_date": TODAY,
        "selected_alternative_id": ranked[0]["alternative_id"],
        "criteria": criteria,
        "alternatives": ranked,
    }


def build_route_map(
    family_specs: dict[str, dict[str, Any]]
) -> dict[str, Any]:
    surface_bindings = load_json(SURFACE_BINDING_PATH)
    surface_routes = load_json(SURFACE_ROUTE_MATRIX_PATH)
    surface_state = load_json(SURFACE_STATE_MATRIX_PATH)
    shell_routes = load_json(SHELL_ROUTE_MATRIX_PATH)
    foundation_map = load_json(FOUNDATION_MAP_PATH)

    binding_lookup = {
        row["route_or_scene_key"]: row for row in surface_bindings["bindings"]
    }
    surface_lookup = {
        row["route_or_scene_key"]: row for row in surface_routes["routes"]
    }
    state_lookup = {
        row["route_or_scene_key"]: row for row in surface_state["rows"]
    }
    shell_route_lookup = {row["route_id"]: row for row in shell_routes["route_records"]}
    foundation_lookup = {
        row["shell_family"]: row["interaction_layer_contract"]
        for row in foundation_map["shell_foundations"]
    }

    route_rows: list[dict[str, Any]] = []

    manifest_route = shell_route_lookup["calm_manifest_workspace"]
    route_rows.append(
        {
            "route_or_scene_key": "calm_manifest_workspace",
            "route_or_scene_kind": "route",
            "canonical_route_key": "calm_manifest_workspace",
            "surface_family": "MANIFEST",
            "shell_family": manifest_route["shell_family"],
            "embodiment": "WEB",
            "title": "Calm Manifest Workspace",
            "route_pattern": manifest_route["route_pattern"],
            "viewer_capability_profile": manifest_route["viewer_capability_profile"],
            "interaction_layer_contract": manifest_route["interaction_layer_contract"],
            "projection_contract": "SERVER_AUTHORED_CALM_SHELL_SNAPSHOT_AND_DELTA",
            "read_models": [
                "DecisionBundle",
                "LowNoiseExperienceFrame",
                "ExperienceCursor",
                "ExperienceDelta",
                "ExperienceStreamEvent",
            ],
            "read_surfaces": [
                "Manifest experience snapshot surface from the northbound contract",
                "Manifest experience stream surface from the northbound contract",
            ],
            "command_transport": [
                "POST /v1/commands",
                "GET /v1/commands/{command_id}",
            ],
            "stream_sources": [
                "manifest experience stream",
                "durable command receipts",
            ],
            "visibility_lanes": [
                "OPERATOR_LOW_NOISE",
                "support-only detail drawer states",
            ],
            "cache_partition_basis": [
                "tenant",
                "session",
                "access_scope",
                "masking",
                "route",
                "manifest_id",
                "publication_generation",
            ],
            "stale_view_posture": "Keep the calm-shell frame mounted; downgrade unsafe mutations to `NO_SAFE_ACTION` while rebasing against the latest bundle.",
            "recovery_and_resume_rules": manifest_route["external_handoff_rules"]
            + manifest_route["responsive_collapse_rules"],
            "notes": manifest_route["notes"],
            "source_refs": normalize_source_refs(manifest_route["source_refs"])
            + [
                heading_ref(NORTHBOUND_PATH, "2. Required northbound surfaces"),
                heading_ref(NORTHBOUND_PATH, "7. Stream and reconnect rules"),
            ],
        }
    )

    for key, route in surface_lookup.items():
        binding = binding_lookup.get(key, {})
        state_row = state_lookup.get(key, {})
        normalized_read_models = ordered_unique(
            normalize_read_surface_name(model)
            for model in route.get("read_models", binding.get("read_models", []))
        )
        projection_contract = "SERVER_AUTHORED_ROUTE_PROJECTION"
        if key == "collaboration_staff_inbox":
            projection_contract = "SERVER_AUTHORED_QUEUE_SNAPSHOT_AND_DELTA"
        elif key in {
            "collaboration_staff_workspace",
            "collaboration_staff_customer_activity_module",
            "collaboration_staff_internal_activity_module",
            "collaboration_staff_files_module",
            "collaboration_manifest_focus_jump",
        }:
            projection_contract = "SERVER_AUTHORED_WORKSPACE_SNAPSHOT_AND_DELTA"
        elif route["shell_family"] == "CLIENT_PORTAL_SHELL":
            projection_contract = "SERVER_AUTHORED_CUSTOMER_SAFE_ROUTE_PROJECTION"
        elif route["shell_family"] == "GOVERNANCE_DENSITY_SHELL":
            projection_contract = "SERVER_AUTHORED_GOVERNANCE_SNAPSHOT"
        elif route["embodiment"].startswith("NATIVE"):
            projection_contract = (
                "SERVER_AUTHORED_NORTHBOUND_SNAPSHOT_WITH_DISPOSABLE_NATIVE_CACHE"
            )

        route_rows.append(
            {
                "route_or_scene_key": key,
                "route_or_scene_kind": route["route_or_scene_kind"],
                "canonical_route_key": (
                    "calm_manifest_workflow_focus"
                    if key == "collaboration_manifest_focus_jump"
                    else key
                ),
                "surface_family": route["surface_family"],
                "shell_family": route["shell_family"],
                "embodiment": route["embodiment"],
                "title": route["title"],
                "route_pattern": route["route_pattern"],
                "viewer_capability_profile": route["actor_profile"],
                "interaction_layer_contract": foundation_lookup.get(
                    route["shell_family"], route.get("interaction_layer_contract")
                ),
                "projection_contract": projection_contract,
                "read_models": normalized_read_models,
                "read_surfaces": binding.get("read_surfaces", route.get("read_surfaces", [])),
                "command_transport": binding.get(
                    "command_transport", route.get("command_transport", [])
                ),
                "stream_sources": binding.get(
                    "stream_sources", route.get("stream_sources", [])
                ),
                "visibility_lanes": route.get(
                    "visibility_lanes", state_row.get("visibility_lanes", [])
                ),
                "cache_partition_basis": route.get(
                    "cache_partition_basis", state_row.get("cache_partition_basis", [])
                ),
                "stale_view_posture": route.get(
                    "stale_view_posture", state_row.get("stale_view_posture")
                ),
                "recovery_and_resume_rules": route.get(
                    "recovery_and_resume_rules",
                    state_row.get("recovery_and_resume_rules", []),
                ),
                "notes": route.get("notes", ""),
                "source_refs": normalize_source_refs(route.get("source_refs", [])),
            }
        )

    route_rows.sort(key=lambda item: (item["surface_family"], item["route_or_scene_key"]))
    projection_contract_counts: dict[str, int] = {}
    for row in route_rows:
        projection_contract_counts[row["projection_contract"]] = (
            projection_contract_counts.get(row["projection_contract"], 0) + 1
        )
    return {
        "contract_version": TODAY,
        "selected_strategy": {
            "strategy_id": "server_authored_per_surface_typed_projections",
            "doctrine": "Each route or scene binds to a server-authored projection contract; browser and native clients may compose local view state only and SHALL NOT infer legal posture from granular truth fragments.",
            "forbidden_client_moves": [
                "Derive legal truth from caches, deltas, or local graph composition.",
                "Widen customer-safe visibility from route path or hidden staff fields.",
                "Treat native or browser cached state as authoritative after stale-view rejection.",
            ],
        },
        "summary": {
            "route_or_scene_count": len(route_rows),
            "projection_contract_counts": projection_contract_counts,
            "shell_family_counts": {
                shell_family: len(
                    [row for row in route_rows if row["shell_family"] == shell_family]
                )
                for shell_family in ordered_unique(
                    row["shell_family"] for row in route_rows
                )
            },
        },
        "routes": route_rows,
    }


def build_read_model_catalog(route_map: dict[str, Any]) -> dict[str, Any]:
    read_model_index = load_json(READ_MODEL_INDEX_PATH)
    family_specs = build_family_specs()

    route_bindings_by_model: dict[str, list[str]] = {}
    viewer_profiles_by_model: dict[str, list[str]] = {}
    visibility_by_model: dict[str, list[str]] = {}
    for route in route_map["routes"]:
        for model in route["read_models"]:
            route_bindings_by_model.setdefault(model, []).append(route["route_or_scene_key"])
            viewer_profiles_by_model.setdefault(model, []).append(
                route["viewer_capability_profile"]
            )
            visibility_by_model.setdefault(model, []).extend(route["visibility_lanes"])

    raw_rows = read_model_index["rows"] + SUPPLEMENTAL_READ_MODELS
    catalog_rows: list[dict[str, Any]] = []
    family_counts: dict[str, int] = {}
    route_bound_count = 0
    for row in sorted(raw_rows, key=lambda item: item["object_name"]):
        object_name = row["object_name"]
        family_id = family_for_object(object_name)
        family_spec = family_specs[family_id]
        route_bindings = ordered_unique(route_bindings_by_model.get(object_name, []))
        if route_bindings:
            route_bound_count += 1
        family_counts[family_id] = family_counts.get(family_id, 0) + 1
        if route_bindings:
            viewer_capability_profiles = ordered_unique(
                viewer_profiles_by_model.get(object_name, [])
            )
            visibility_classes = ordered_unique(visibility_by_model.get(object_name, []))
        else:
            viewer_capability_profiles = row.get("audience_classes", [])
            visibility_classes = row.get("audience_classes", [])
        stream_companions = {
            "LowNoiseExperienceFrame": [
                "ExperienceCursor",
                "ExperienceDelta",
                "ExperienceStreamEvent",
            ],
            "DecisionBundle": [
                "LowNoiseExperienceFrame",
                "ExperienceCursor",
                "ExperienceDelta",
            ],
            "WorkInboxSnapshot": ["WorkInboxDelta"],
            "WorkspaceSnapshot": [
                "WorkspaceCursor",
                "WorkspaceDelta",
                "WorkspaceStreamEvent",
            ],
            "CollaborationActivitySlice": ["WorkspaceDelta"],
            "CollaborationAttachmentSlice": ["WorkspaceDelta"],
        }.get(object_name, [])
        catalog_rows.append(
            {
                "object_name": object_name,
                "object_kind": row["object_kind"],
                "projection_role": row["projection_role"],
                "projection_family": family_id,
                "projection_family_label": family_spec["label"],
                "owner_boundary": family_spec["owner_boundary"],
                "projection_owner": family_spec["projection_owner"],
                "shell_families": ordered_unique(
                    row.get("shell_families", [])
                    + [
                        route["shell_family"]
                        for route in route_map["routes"]
                        if route["route_or_scene_key"] in route_bindings
                    ]
                ),
                "viewer_capability_profiles": viewer_capability_profiles,
                "visibility_classes": visibility_classes,
                "source_truth_surfaces": family_spec["source_truth_surfaces"],
                "update_mode": family_spec["update_mode"],
                "precompute_mode": family_spec["precompute_mode"],
                "stale_guard_basis": family_spec["stale_guard_basis"],
                "stream_companions": stream_companions,
                "rebuild_source": family_spec["rebuild_source"],
                "route_bindings": route_bindings,
                "client_composition_rule": family_spec["client_composition_rule"],
                "native_parity_rule": family_spec["native_parity_rule"],
                "authoritative_source_refs": row["authoritative_source_refs"],
                "source_refs": family_spec["source_refs"],
                "schema_path_or_paths": row.get("schema_path_or_paths", []),
                "truth_class": row["truth_class"],
                "notes": row.get("notes", []),
                "source_status": row["source_status"],
            }
        )
    return {
        "contract_version": TODAY,
        "selected_strategy": route_map["selected_strategy"],
        "summary": {
            "read_model_count": len(catalog_rows),
            "route_bound_read_model_count": route_bound_count,
            "projection_family_counts": family_counts,
            "customer_safe_read_model_count": len(
                [
                    row
                    for row in catalog_rows
                    if row["projection_family"] == "portal_customer_safe"
                    or "CUSTOMER_SAFE_PROJECTION" in row["visibility_classes"]
                    or "customer_client" in row["viewer_capability_profiles"]
                ]
            ),
        },
        "read_models": catalog_rows,
    }


def build_generation_policy(catalog: dict[str, Any]) -> dict[str, Any]:
    family_specs = build_family_specs()
    family_members: dict[str, list[str]] = {}
    for row in catalog["read_models"]:
        family_members.setdefault(row["projection_family"], []).append(row["object_name"])
    policy_rows = []
    for family_id, spec in family_specs.items():
        policy_rows.append(
            {
                "projection_family": family_id,
                "projection_family_label": spec["label"],
                "owned_read_models": sorted(family_members.get(family_id, [])),
                "owner_boundary": spec["owner_boundary"],
                "projection_owner": spec["projection_owner"],
                "source_truth_surfaces": spec["source_truth_surfaces"],
                "update_mode": spec["update_mode"],
                "precompute_mode": spec["precompute_mode"],
                "command_side_truth_changes": spec["generation_timing"][
                    "command_side_truth_changes"
                ],
                "projector_updates": spec["generation_timing"]["projector_updates"],
                "stream_publication": spec["generation_timing"]["stream_publication"],
                "browser_cache_hydration": spec["generation_timing"][
                    "browser_cache_hydration"
                ],
                "native_cache_hydration": spec["generation_timing"][
                    "native_cache_hydration"
                ],
                "reconnect_and_catchup": spec["generation_timing"][
                    "reconnect_and_catchup"
                ],
                "full_rebuild_after_drift_schema_or_restore": spec["generation_timing"][
                    "full_rebuild_after_drift_schema_or_restore"
                ],
                "schema_evolution_reader_window": spec["generation_timing"][
                    "schema_evolution_reader_window"
                ],
                "source_refs": spec["source_refs"],
            }
        )
    return {
        "contract_version": TODAY,
        "selected_strategy": catalog["selected_strategy"],
        "summary": {
            "projection_family_count": len(policy_rows),
            "precompute_modes": {
                row["precompute_mode"]: len(
                    [candidate for candidate in policy_rows if candidate["precompute_mode"] == row["precompute_mode"]]
                )
                for row in policy_rows
            },
        },
        "policies": policy_rows,
    }


def build_customer_safe_boundary_matrix() -> dict[str, Any]:
    gaps = load_json(GAP_REGISTER_PATH)
    gap_rows = {
        row["gap_key"]: row
        for row in gaps["gaps"]
        if row["gap_key"] in {"PORTAL_READ_PATH_LITERALS_NOT_FULLY_ENUMERATED"}
    }
    rows = [
        {
            "row_id": "portal_workspace",
            "read_model": "ClientPortalWorkspace",
            "surface_scope": "PORTAL_WORKSPACE",
            "allowed_viewer_scope": "CLIENT_VIEWER | CLIENT_CONTRIBUTOR | CLIENT_SIGNATORY",
            "allowed_truth_surfaces": [
                "WorkflowItem",
                "SubmissionRecord",
                "ObligationMirror",
                "ApiCommandReceipt",
                "ProblemEnvelope",
            ],
            "required_redactions": BLOCKED_CUSTOMER_SAFE_FAMILIES,
            "required_transformations": [
                "Flatten workflow and gate posture into client-safe language before serialization.",
                "Keep `authority_truth_state` explicit and never overclaim pending, ambiguous, rejected, or out-of-band authority posture as confirmed.",
                "Bind continuity, return-path, and visibility cache partition to the same route-safe customer object anchor.",
            ],
            "forbidden_inferences": [
                "No derivation from staff-only notes, assignee posture, escalation reasoning, or raw gate explanations.",
                "No hidden-activity derivation for badges, ordering, or status hero language.",
            ],
            "stale_and_recovery_rule": "Stale, degraded, and recovery posture must remain explicit and receipt-driven; portal clients may not guess what changed.",
            "source_refs": [
                heading_ref(PORTAL_PATH, "Read-model and API translation requirements"),
            ],
        },
        {
            "row_id": "portal_request_list",
            "read_model": "CustomerRequestListSnapshot",
            "surface_scope": "PORTAL_REQUEST_LIST",
            "allowed_viewer_scope": "CLIENT_VIEWER | CLIENT_CONTRIBUTOR | CLIENT_SIGNATORY",
            "allowed_truth_surfaces": [
                "WorkflowItem",
                "SubmissionRecord",
                "ApiCommandReceipt",
            ],
            "required_redactions": BLOCKED_CUSTOMER_SAFE_FAMILIES,
            "required_transformations": [
                "Expose one customer-safe dominant action and current-versus-history posture per request row.",
                "Keep list row language aligned to the same authoritative action contract used by detail routes.",
            ],
            "forbidden_inferences": [
                "No list reordering from hidden staff activity or internal unread counts.",
            ],
            "stale_and_recovery_rule": "Refresh and notification-open must preserve the same request row identity without widening visibility.",
            "source_refs": [
                heading_ref(PORTAL_PATH, "Read-model and API translation requirements"),
                heading_ref(COLLABORATION_PATH, "`CustomerRequestListSnapshot`"),
            ],
        },
        {
            "row_id": "customer_request_detail_workspace",
            "read_model": "WorkspaceSnapshot",
            "surface_scope": "CUSTOMER_VISIBLE_COLLABORATION_DETAIL",
            "allowed_viewer_scope": "CLIENT_VIEWER | CLIENT_CONTRIBUTOR | CLIENT_SIGNATORY",
            "allowed_truth_surfaces": [
                "WorkflowItem",
                "SubmissionRecord",
                "RequestInfoRecord",
                "ApiCommandReceipt",
            ],
            "required_redactions": BLOCKED_CUSTOMER_SAFE_FAMILIES
            + ["LINKED_CONTEXT", "AUDIT_TRAIL"],
            "required_transformations": [
                "Publish `customer_safe_projection` with the exact workspace visibility partition and access binding.",
                "Keep contextual request detail in `CLIENT_PORTAL_SHELL` language even though the underlying workflow is collaboration-owned.",
            ],
            "forbidden_inferences": [
                "No customer-visible workspace route may point at internal activity, linked context, or audit trail.",
            ],
            "stale_and_recovery_rule": "Rebase preserves the same request detail object and current-vs-history artifact posture when the object remains legal.",
            "source_refs": [
                heading_ref(COLLABORATION_PATH, "`WorkspaceSnapshot`"),
                heading_ref(COLLABORATION_PATH, "12. Playwright scenarios"),
            ],
        },
        {
            "row_id": "customer_activity_slice",
            "read_model": "CollaborationActivitySlice",
            "surface_scope": "COLLABORATION_ACTIVITY_SLICE",
            "allowed_viewer_scope": "CUSTOMER_VISIBLE",
            "allowed_truth_surfaces": [
                "CollaborationEntry",
                "RequestInfoRecord",
                "WorkflowItem",
            ],
            "required_redactions": BLOCKED_CUSTOMER_SAFE_FAMILIES
            + ["INTERNAL_THREAD_METADATA"],
            "required_transformations": [
                "Return only `thread_visibility_class = CUSTOMER_VISIBLE` entries.",
                "Pin the customer-safe projection to the same route-visible guard spine as the mounted workspace.",
            ],
            "forbidden_inferences": [
                "No hidden internal thread activity or unread counts may leak through paging or return cursors.",
            ],
            "stale_and_recovery_rule": "Paged activity must rebase against the mounted workspace rather than guessing a new route target.",
            "source_refs": [
                heading_ref(COLLABORATION_PATH, "`CollaborationActivitySlice`"),
            ],
        },
        {
            "row_id": "customer_attachment_slice",
            "read_model": "CollaborationAttachmentSlice",
            "surface_scope": "COLLABORATION_ATTACHMENT_SLICE",
            "allowed_viewer_scope": "CUSTOMER_VISIBLE",
            "allowed_truth_surfaces": [
                "CollaborationAttachment",
                "WorkflowItem",
            ],
            "required_redactions": BLOCKED_CUSTOMER_SAFE_FAMILIES
            + ["PENDING_PLACEHOLDER_ONLY_INTERNAL_ATTACHMENTS"],
            "required_transformations": [
                "Return only `visibility_class = CUSTOMER_VISIBLE` attachments.",
                "Preserve explicit current-versus-history artifact posture and allowed export scope.",
            ],
            "forbidden_inferences": [
                "No customer-visible attachment read may expose pending internal placeholders or internal-only attachment metadata.",
            ],
            "stale_and_recovery_rule": "Historical artifacts stay visible as context but never become the default current artifact on rebase.",
            "source_refs": [
                heading_ref(COLLABORATION_PATH, "`CollaborationAttachmentSlice`"),
                heading_ref(FRONTEND_SHELL_PATH, "7. Artifact preview, export, print, and browser handoff"),
            ],
        },
        {
            "row_id": "portal_documents",
            "read_model": "ClientDocumentRequest",
            "surface_scope": "PORTAL_DOCUMENT_CENTER",
            "allowed_viewer_scope": "CLIENT_CONTRIBUTOR | CLIENT_SIGNATORY",
            "allowed_truth_surfaces": [
                "WorkflowItem",
                "ApiCommandReceipt",
                "ClientUploadSession",
            ],
            "required_redactions": BLOCKED_CUSTOMER_SAFE_FAMILIES,
            "required_transformations": [
                "Upload bytes move through ClientUploadSession, while legal attachment finalization remains a typed command.",
                "Document status must stay client-safe and route-local.",
            ],
            "forbidden_inferences": [
                "No widening from upload transport state into hidden staff workflow posture.",
            ],
            "stale_and_recovery_rule": "Any stale upload or document finalization posture must come from receipts and typed failures, not browser guesses.",
            "source_refs": [
                heading_ref(PORTAL_PATH, "Secure document-upload flow"),
                heading_ref(PORTAL_PATH, "Read-model and API translation requirements"),
            ],
        },
        {
            "row_id": "portal_approvals",
            "read_model": "ClientApprovalPack",
            "surface_scope": "PORTAL_APPROVAL_CENTER",
            "allowed_viewer_scope": "CLIENT_SIGNATORY",
            "allowed_truth_surfaces": [
                "WorkflowItem",
                "SubmissionRecord",
                "ApiCommandReceipt",
            ],
            "required_redactions": BLOCKED_CUSTOMER_SAFE_FAMILIES,
            "required_transformations": [
                "Carry one stale-view hash so the UI cannot sign a superseded summary.",
                "Keep step-up or sign-off posture explicit without revealing staff-only rationale.",
            ],
            "forbidden_inferences": [
                "No derivation of signatory safety from session age or local state alone.",
            ],
            "stale_and_recovery_rule": "Signature, stale-review, and recovery posture remain explicit and receipt-driven.",
            "source_refs": [
                heading_ref(PORTAL_PATH, "Approval and sign-off flow"),
                heading_ref(PORTAL_PATH, "Read-model and API translation requirements"),
            ],
        },
        {
            "row_id": "portal_onboarding",
            "read_model": "ClientOnboardingJourney",
            "surface_scope": "PORTAL_ONBOARDING",
            "allowed_viewer_scope": "CLIENT_VIEWER | CLIENT_CONTRIBUTOR",
            "allowed_truth_surfaces": [
                "WorkflowItem",
                "ApiCommandReceipt",
            ],
            "required_redactions": BLOCKED_CUSTOMER_SAFE_FAMILIES,
            "required_transformations": [
                "Publish one dominant next step and explicit limitation notices using plain client-safe language.",
            ],
            "forbidden_inferences": [
                "No hidden staff routing or internal actor context may appear in step sequencing.",
            ],
            "stale_and_recovery_rule": "Resume and rebased onboarding drafts must distinguish live resume from stale carry-forward state.",
            "source_refs": [
                heading_ref(PORTAL_PATH, "Onboarding flow"),
                heading_ref(PORTAL_PATH, "Read-model and API translation requirements"),
            ],
        },
        {
            "row_id": "portal_timeline",
            "read_model": "ClientTimelineEvent",
            "surface_scope": "PORTAL_ACTIVITY_TIMELINE",
            "allowed_viewer_scope": "CLIENT_VIEWER | CLIENT_CONTRIBUTOR | CLIENT_SIGNATORY",
            "allowed_truth_surfaces": [
                "SubmissionRecord",
                "AuthorityInteractionRecord",
                "ObligationMirror",
            ],
            "required_redactions": BLOCKED_CUSTOMER_SAFE_FAMILIES,
            "required_transformations": [
                "Keep `authority_truth_state` explicit and literal.",
                "Translate workflow events into customer-safe timeline copy without leaking internal chronology or audit lineage.",
            ],
            "forbidden_inferences": [
                "No timeline copy may overclaim confirmation when truth remains pending, ambiguous, corrected, or out-of-band.",
            ],
            "stale_and_recovery_rule": "Timeline refresh stays subordinate to the mounted portal workspace and its customer-safe visibility partition.",
            "source_refs": [
                heading_ref(PORTAL_PATH, "Read-model and API translation requirements"),
            ],
        },
        {
            "row_id": "customer_notification",
            "read_model": "WorkItemNotification",
            "surface_scope": "CUSTOMER_VISIBLE_NOTIFICATION_OPEN",
            "allowed_viewer_scope": "CUSTOMER_VISIBLE",
            "allowed_truth_surfaces": [
                "WorkflowItem",
                "ApiCommandReceipt",
            ],
            "required_redactions": BLOCKED_CUSTOMER_SAFE_FAMILIES,
            "required_transformations": [
                "Notification routing stays pinned to the same customer-safe projection boundary scope.",
                "Notification-open may restore an object, but not widen the visible slice.",
            ],
            "forbidden_inferences": [
                "No customer notification may target internal activity, linked context, or audit trail modules.",
            ],
            "stale_and_recovery_rule": "Notification-open restores the same lawful object or fallback target without inventing a new route branch.",
            "source_refs": [
                heading_ref(COLLABORATION_PATH, "`WorkItemNotification`"),
                heading_ref(COLLABORATION_PATH, "9. Stream events and notifications"),
            ],
        },
    ]
    return {
        "contract_version": TODAY,
        "shared_boundary_contract": {
            "boundary_name": "customer_safe_projection",
            "status_derivation_policy": "CUSTOMER_SAFE_BLOCKS_ONLY",
            "staff_field_dependency_policy": "EXCLUDE_STAFF_FIELDS_AT_PROJECTION_SOURCE",
            "hidden_activity_policy": "NO_HIDDEN_ACTIVITY_DERIVATION",
            "notification_navigation_policy": "PORTAL_SAME_SHELL_AND_VISIBILITY_ONLY",
            "export_visibility_policy": "CUSTOMER_VISIBLE_EXPORTS_ONLY",
            "blocked_internal_families": BLOCKED_CUSTOMER_SAFE_FAMILIES,
        },
        "summary": {
            "row_count": len(rows),
            "blocked_internal_family_count": len(BLOCKED_CUSTOMER_SAFE_FAMILIES),
        },
        "rows": rows,
        "typed_gaps": [
            {
                "gap_key": gap_rows["PORTAL_READ_PATH_LITERALS_NOT_FULLY_ENUMERATED"][
                    "gap_key"
                ],
                "summary": gap_rows["PORTAL_READ_PATH_LITERALS_NOT_FULLY_ENUMERATED"][
                    "summary"
                ],
                "impact": gap_rows["PORTAL_READ_PATH_LITERALS_NOT_FULLY_ENUMERATED"][
                    "impact"
                ],
                "status": gap_rows["PORTAL_READ_PATH_LITERALS_NOT_FULLY_ENUMERATED"][
                    "status"
                ],
                "source_refs": normalize_source_refs(
                    gap_rows["PORTAL_READ_PATH_LITERALS_NOT_FULLY_ENUMERATED"][
                        "source_refs"
                    ]
                ),
            }
        ],
    }


def build_stream_contracts() -> dict[str, Any]:
    gaps = load_json(GAP_REGISTER_PATH)
    gap_lookup = {row["gap_key"]: row for row in gaps["gaps"]}
    rows = [
        {
            "contract_id": "manifest_experience_stream",
            "surface_family": "MANIFEST",
            "delivery_mode": "SNAPSHOT_PLUS_TYPED_DELTA",
            "primary_snapshot": "LowNoiseExperienceFrame",
            "delta_or_refresh_companion": "ExperienceDelta",
            "cursor_or_resume_contract": "ExperienceCursor",
            "event_envelope": "ExperienceStreamEvent",
            "ordering_scope": "manifest_id",
            "duplicate_handling": "Duplicate deltas are idempotent by sequence and publication generation.",
            "rebase_triggers": [
                "frame epoch drift",
                "shell stability token drift",
                "route context drift",
                "stream compaction floor advance",
            ],
            "customer_safe_boundary": "NOT_APPLICABLE",
            "client_rule": "Clients apply typed deltas and may preserve local focus only; they may not derive fresh legal meaning from the stream alone.",
            "rebuild_source": "DecisionBundle and durable manifest truth.",
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "2. Required northbound surfaces"),
                heading_ref(NORTHBOUND_PATH, "7. Stream and reconnect rules"),
            ],
        },
        {
            "contract_id": "work_inbox_stream",
            "surface_family": "COLLABORATION",
            "delivery_mode": "SNAPSHOT_PLUS_TYPED_DELTA",
            "primary_snapshot": "WorkInboxSnapshot",
            "delta_or_refresh_companion": "WorkInboxDelta",
            "cursor_or_resume_contract": "resume_token",
            "event_envelope": "notification.badge",
            "ordering_scope": "(tenant_id, inbox_route_key)",
            "duplicate_handling": "Duplicate delivery is idempotent by monotonic sequence.",
            "rebase_triggers": [
                "queue filter grammar drift",
                "access binding drift",
                "shell stability token drift",
            ],
            "customer_safe_boundary": "STAFF_QUEUE_WITH_CUSTOMER_VISIBLE_SUMMARY_ONLY",
            "client_rule": "Clients preserve filters and scroll anchors but do not reconstruct queue truth from mounted workspaces.",
            "rebuild_source": "Workflow truth and append-only notification history.",
            "source_refs": [
                heading_ref(COLLABORATION_PATH, "`WorkInboxSnapshot`"),
                heading_ref(COLLABORATION_PATH, "`WorkInboxDelta`"),
                heading_ref(COLLABORATION_PATH, "9. Stream events and notifications"),
            ],
        },
        {
            "contract_id": "workspace_stream",
            "surface_family": "COLLABORATION",
            "delivery_mode": "SNAPSHOT_PLUS_TYPED_DELTA",
            "primary_snapshot": "WorkspaceSnapshot",
            "delta_or_refresh_companion": "WorkspaceDelta",
            "cursor_or_resume_contract": "WorkspaceCursor",
            "event_envelope": "WorkspaceStreamEvent",
            "ordering_scope": "item_id",
            "duplicate_handling": "Workspace deltas are idempotent by sequence and route guard spine.",
            "rebase_triggers": [
                "workspace_version drift",
                "shell_stability_token drift",
                "access binding drift",
                "masking posture drift",
            ],
            "customer_safe_boundary": "CUSTOMER_SAFE_PROJECTION_ON_CUSTOMER_VISIBLE_VARIANTS_ONLY",
            "client_rule": "Clients preserve the active module and draft context, but do not synthesize assignment, escalation, or hidden-lane state.",
            "rebuild_source": "Workflow truth plus append-only collaboration artifacts.",
            "source_refs": [
                heading_ref(COLLABORATION_PATH, "`WorkspaceSnapshot`"),
                heading_ref(COLLABORATION_PATH, "`WorkspaceDelta`"),
                heading_ref(COLLABORATION_PATH, "9. Stream events and notifications"),
            ],
        },
        {
            "contract_id": "activity_and_attachment_support_slices",
            "surface_family": "COLLABORATION",
            "delivery_mode": "PAGED_SLICE_PLUS_WORKSPACE_DELTA",
            "primary_snapshot": "CollaborationActivitySlice / CollaborationAttachmentSlice",
            "delta_or_refresh_companion": "WorkspaceDelta",
            "cursor_or_resume_contract": "before_sequence / latest_workspace_snapshot_ref",
            "event_envelope": "activity.appended",
            "ordering_scope": "item_id + thread_visibility_class_or_attachment_visibility_class",
            "duplicate_handling": "Paged support slices rebase to the mounted workspace snapshot rather than applying opaque local patch sets.",
            "rebase_triggers": [
                "latest_workspace_snapshot_ref drift",
                "visibility partition drift",
            ],
            "customer_safe_boundary": "CUSTOMER_SAFE_PROJECTION_REQUIRED_ON_CUSTOMER_VISIBLE_SLICES",
            "client_rule": "Clients may page older entries and switch lanes only when the server returns the matching visibility-scoped slice.",
            "rebuild_source": "Append-only collaboration entries and attachments plus mounted workspace truth.",
            "source_refs": [
                heading_ref(COLLABORATION_PATH, "`CollaborationActivitySlice`"),
                heading_ref(COLLABORATION_PATH, "`CollaborationAttachmentSlice`"),
            ],
        },
        {
            "contract_id": "portal_route_refresh",
            "surface_family": "PORTAL",
            "delivery_mode": "ROLE_FILTERED_REFRESH",
            "primary_snapshot": "ClientPortalWorkspace and route-local customer-safe read models",
            "delta_or_refresh_companion": "role-filtered portal refresh",
            "cursor_or_resume_contract": "cross_device_continuity_contract",
            "event_envelope": "customer-safe route refresh",
            "ordering_scope": "client_id + route + object_anchor_ref",
            "duplicate_handling": "Portal refresh replaces the mounted route projection only when the view guard and visibility partition still match.",
            "rebase_triggers": [
                "workspace_version drift",
                "customer_safe_projection drift",
                "access binding drift",
                "masking posture drift",
            ],
            "customer_safe_boundary": "MANDATORY",
            "client_rule": "Portal clients never infer stronger certainty or hidden staff posture from refresh timing or badge changes.",
            "rebuild_source": "Durable workflow, obligation, authority, and receipt truth through the customer-safe boundary.",
            "source_refs": [
                heading_ref(PORTAL_PATH, "Read-model and API translation requirements"),
                heading_ref(NORTHBOUND_PATH, "2. Required northbound surfaces"),
            ],
        },
        {
            "contract_id": "governance_snapshot_refresh",
            "surface_family": "GOVERNANCE",
            "delivery_mode": "SNAPSHOT_REFRESH_WITH_RECEIPT_INVALIDATION",
            "primary_snapshot": "Governance route snapshots and simulations",
            "delta_or_refresh_companion": "durable command receipts",
            "cursor_or_resume_contract": "policy/dependency/simulation basis hashes",
            "event_envelope": "governance overview refresh",
            "ordering_scope": "tenant + route + basis_hash",
            "duplicate_handling": "Equivalent basis hashes dedupe refreshes; changed basis hashes force a new snapshot.",
            "rebase_triggers": [
                "policy_snapshot_hash drift",
                "dependency_topology_hash drift",
                "simulation_basis_hash drift",
            ],
            "customer_safe_boundary": "MASKED_GOVERNANCE_ONLY",
            "client_rule": "Governance clients may preserve local filters and change baskets, but not derive authoritative policy state from mutated local fragments.",
            "rebuild_source": "Durable governance truth, audit ledgers, and simulation basis snapshots.",
            "source_refs": [
                heading_ref(GOVERNANCE_PATH, "7. Frontend systems architecture"),
                heading_ref(GOVERNANCE_PATH, "7.6 Minimum route read models"),
            ],
        },
        {
            "contract_id": "native_scene_hydration",
            "surface_family": "NATIVE_OPERATOR",
            "delivery_mode": "SNAPSHOT_HYDRATION_PLUS_TYPED_RESUME",
            "primary_snapshot": "DecisionBundle / WorkspaceSnapshot",
            "delta_or_refresh_companion": "ExperienceDelta / WorkspaceDelta",
            "cursor_or_resume_contract": "ExperienceCursor / WorkspaceCursor / resume_token",
            "event_envelope": "native scene rehydrate",
            "ordering_scope": "scene_identity + canonical_object_ref",
            "duplicate_handling": "Native delta application is idempotent; incompatible cache or guard drift triggers full rehydrate.",
            "rebase_triggers": [
                "scene identity drift",
                "access binding drift",
                "masking drift",
                "schema incompatibility",
            ],
            "customer_safe_boundary": "NOT_APPLICABLE",
            "client_rule": "Native caches are disposable mirrors only and must purge on revocation, tenant switch, masking drift, or incompatible schema.",
            "rebuild_source": "Northbound snapshots and typed deltas sourced from durable truth.",
            "source_refs": [
                heading_ref(MACOS_PATH, "6. Data flow and synchronization model"),
                heading_ref(MACOS_PATH, "FE-75 Native Cache Hydration, Purge, and Rebase"),
            ],
        },
    ]
    return {
        "contract_version": TODAY,
        "selected_strategy": {
            "strategy_id": "server_authored_per_surface_typed_projections",
            "doctrine": "Use typed deltas where the corpus already names them; otherwise prefer receipt-driven snapshot refresh over client-composed legal posture.",
        },
        "summary": {
            "stream_contract_count": len(rows),
            "delivery_modes": {
                row["delivery_mode"]: len(
                    [candidate for candidate in rows if candidate["delivery_mode"] == row["delivery_mode"]]
                )
                for row in rows
            },
        },
        "stream_contracts": rows,
        "typed_gaps": [
            {
                "gap_key": gap_lookup["MANIFEST_FOCUS_ROUTE_NORMALIZED"]["gap_key"],
                "summary": gap_lookup["MANIFEST_FOCUS_ROUTE_NORMALIZED"]["summary"],
                "status": gap_lookup["MANIFEST_FOCUS_ROUTE_NORMALIZED"]["status"],
                "source_refs": normalize_source_refs(
                    gap_lookup["MANIFEST_FOCUS_ROUTE_NORMALIZED"]["source_refs"]
                ),
            }
        ],
    }


def version_markers_for_route(route: dict[str, Any]) -> list[str]:
    key = route["route_or_scene_key"]
    if key == "calm_manifest_workspace":
        return [
            "decision_bundle_hash",
            "publication_generation",
            "shell_stability_token",
            "view_guard_ref",
            "stream_recovery_contract",
        ]
    if route["surface_family"] == "COLLABORATION" and key == "collaboration_staff_inbox":
        return [
            "workspace_route_key",
            "resume_token",
            "shell_stability_token",
            "visibility_cache_partition_key",
            "access_binding_hash",
            "masking_posture_fingerprint",
        ]
    if route["surface_family"] == "COLLABORATION":
        markers = [
            "workspace_version",
            "shell_stability_token",
            "workspace_route_key",
            "access_binding_hash",
            "masking_posture_fingerprint",
        ]
        if route["shell_family"] == "CLIENT_PORTAL_SHELL":
            markers.append("customer_safe_projection")
        return markers
    if route["shell_family"] == "CLIENT_PORTAL_SHELL":
        return [
            "workspace_version",
            "view_guard_ref",
            "customer_safe_projection",
            "visibility_partition",
            "latest_stale_guard_value",
        ]
    if route["shell_family"] == "GOVERNANCE_DENSITY_SHELL":
        return [
            "policy_snapshot_hash",
            "dependency_topology_hash",
            "simulation_basis_hash",
            "access_binding_hash",
            "masking_posture_fingerprint",
        ]
    if route["embodiment"].startswith("NATIVE") and key != "native_auth_handoff_session":
        return [
            "scene_identity",
            "canonical_object_ref",
            "projection_version",
            "access_binding",
            "masking",
            "resume_token",
        ]
    if key == "native_auth_handoff_session":
        return [
            "return_target_binding",
            "pending_authority_task_binding",
            "session_binding",
        ]
    return ["view_guard_ref"]


def client_forbidden_move_for_route(route: dict[str, Any]) -> str:
    if route["shell_family"] == "CLIENT_PORTAL_SHELL":
        return "Do not infer stronger certainty, hidden staff rationale, or wider visibility than the mounted customer-safe projection allows."
    if route["surface_family"] == "COLLABORATION":
        return "Do not synthesize assignment, escalation, internal notes, or customer-safe status from hidden lanes or stale deltas."
    if route["surface_family"] == "GOVERNANCE":
        return "Do not commit authoritative policy meaning from local baskets, stale hashes, or partial simulations."
    if route["embodiment"].startswith("NATIVE"):
        return "Do not treat native cached state as authoritative or reimplement server-side business legality locally."
    return "Do not derive legal posture from local cache, hidden fragments, or stale guard guesses."


def build_staleness_policy(route_map: dict[str, Any]) -> dict[str, Any]:
    rows = []
    relevant_routes = [
        route
        for route in route_map["routes"]
        if route["route_or_scene_key"] != "native_auth_handoff_session"
    ]
    for route in relevant_routes:
        rows.append(
            {
                "route_or_scene_key": route["route_or_scene_key"],
                "canonical_route_key": route["canonical_route_key"],
                "surface_family": route["surface_family"],
                "shell_family": route["shell_family"],
                "embodiment": route["embodiment"],
                "primary_read_models": route["read_models"],
                "version_markers": version_markers_for_route(route),
                "stale_guard_family": route["projection_contract"],
                "stale_view_posture": route["stale_view_posture"],
                "recovery_postures": route.get("recovery_and_resume_rules", []),
                "cache_partition_basis": route["cache_partition_basis"],
                "preservation_rule": route["recovery_and_resume_rules"][0]
                if route["recovery_and_resume_rules"]
                else "Preserve the same object when it still resolves.",
                "rebuild_rule": "If any version marker drifts incompatibly, fetch a fresh snapshot from the authoritative route contract and preserve the same object or explicit fallback target only.",
                "client_forbidden_move": client_forbidden_move_for_route(route),
                "source_refs": route["source_refs"],
            }
        )
    return {
        "contract_version": TODAY,
        "summary": {
            "surface_count": len(rows),
            "shell_family_counts": {
                shell_family: len(
                    [row for row in rows if row["shell_family"] == shell_family]
                )
                for shell_family in ordered_unique(row["shell_family"] for row in rows)
            },
        },
        "routes": rows,
    }


def build_coverage_summary(
    catalog: dict[str, Any],
    route_map: dict[str, Any],
    boundary_matrix: dict[str, Any],
    stream_contracts: dict[str, Any],
    staleness_policy: dict[str, Any],
) -> dict[str, int]:
    return {
        "read_model_count": catalog["summary"]["read_model_count"],
        "route_or_scene_count": route_map["summary"]["route_or_scene_count"],
        "route_bound_read_model_count": catalog["summary"]["route_bound_read_model_count"],
        "customer_safe_boundary_rows": boundary_matrix["summary"]["row_count"],
        "blocked_customer_safe_families": boundary_matrix["summary"][
            "blocked_internal_family_count"
        ],
        "stream_contract_count": stream_contracts["summary"]["stream_contract_count"],
        "staleness_surface_count": staleness_policy["summary"]["surface_count"],
    }


def build_mermaid() -> str:
    return """flowchart LR
  subgraph T["Durable Truth"]
    manifest["RunManifest / WorkflowItem / SubmissionRecord"]
    authority["AuthorityInteractionRecord / ObligationMirror"]
    control["PrincipalContext / AuthorityLink / AuditEvent"]
    receipts["ApiCommandReceipt / ProblemEnvelope"]
  end

  subgraph P["Server-Authored Projection Boundaries"]
    calm["Manifest calm-shell projector"]
    queue["Collaboration queue and workspace projector"]
    portal["Portal customer-safe projector"]
    governance["Governance snapshot projector"]
    native["Native hydration boundary"]
  end

  subgraph D["Disposable Delivery"]
    stream["Typed snapshots, deltas, cursors, and refresh contracts"]
    browser["Browser cache partitions"]
    ncache["Native cache mirrors"]
  end

  subgraph C["Clients"]
    calmc["CALM_SHELL routes"]
    portalc["CLIENT_PORTAL_SHELL routes"]
    govc["GOVERNANCE_DENSITY_SHELL routes"]
    nativec["Native operator scenes"]
  end

  manifest --> calm
  manifest --> queue
  authority --> calm
  authority --> portal
  control --> governance
  receipts --> calm
  receipts --> queue
  receipts --> portal
  receipts --> governance

  calm --> stream
  queue --> stream
  portal --> stream
  governance --> stream
  stream --> browser
  stream --> ncache
  ncache --> native

  browser --> calmc
  browser --> portalc
  browser --> govc
  native --> nativec

  classDef warning fill:#fff1c9,stroke:#8a6d1d,color:#3d3100;
  rule["Clients render projections; they do not invent legal posture from fragments."]:::warning
  stream --> rule
"""


def build_adr_markdown(
    scorecard: dict[str, Any],
    catalog: dict[str, Any],
    route_map: dict[str, Any],
    generation_policy: dict[str, Any],
    boundary_matrix: dict[str, Any],
    stream_contracts: dict[str, Any],
    staleness_policy: dict[str, Any],
) -> str:
    winner = scorecard["alternatives"][0]
    coverage = build_coverage_summary(
        catalog, route_map, boundary_matrix, stream_contracts, staleness_policy
    )
    family_policy_rows = []
    for row in generation_policy["policies"]:
        family_policy_rows.append(
            [
                row["projection_family_label"],
                ", ".join(row["owned_read_models"][:5])
                + (" ..." if len(row["owned_read_models"]) > 5 else ""),
                row["precompute_mode"],
                row["owner_boundary"],
            ]
        )
    representative_routes = []
    for key in [
        "calm_manifest_workspace",
        "collaboration_staff_workspace",
        "portal_home",
        "governance_overview",
        "native_primary_work_item_scene",
    ]:
        route = next(row for row in route_map["routes"] if row["route_or_scene_key"] == key)
        representative_routes.append(
            [
                route["title"],
                route["shell_family"],
                route["projection_contract"],
                route["read_models"],
            ]
        )
    customer_safe_rows = []
    for row in boundary_matrix["rows"][:5]:
        customer_safe_rows.append(
            [
                row["read_model"],
                row["surface_scope"],
                row["required_redactions"][:4] + ["..."],
                row["forbidden_inferences"][0],
            ]
        )
    criteria_rows = [
        [item["label"], item["priority"], item["weight"], item["rationale"]]
        for item in scorecard["criteria"]
    ]
    ranking_rows = [
        [item["rank"], item["label"], item["weighted_total"]]
        for item in scorecard["alternatives"]
    ]
    deferred_gaps = load_json(GAP_REGISTER_PATH)["gaps"]
    deferred_rows = [
        row
        for row in deferred_gaps
        if row["gap_key"]
        in {
            "PORTAL_READ_PATH_LITERALS_NOT_FULLY_ENUMERATED",
            "PORTAL_COMMAND_ENUMS_NORMALIZED_FROM_PROSE",
            "GOVERNANCE_MUTATION_ENUMS_NORMALIZED_FROM_PROSE",
            "MANIFEST_FOCUS_ROUTE_NORMALIZED",
            "NATIVE_WINDOWS_ARE_ROUTELESS_SUPPORT_OVERLAYS",
        }
    ]

    return f"""# ADR-005: Read-Model Projection Strategy

- Status: Accepted
- Date: {TODAY}
- Deciders: Phase 00 architecture analysis pack

## Context

Taxat already names the route-level projection surfaces that matter: calm-shell manifest frames, collaboration queue and workspace snapshots with deltas, customer-safe portal workspaces, governance snapshots, and native mirrors that hydrate from the same northbound contracts. What the corpus did not previously choose in one place was the architectural doctrine behind those surfaces: whether clients should consume typed server-authored projections, compose their own route meaning from granular APIs, or operate from one giant graph payload.

The prior analysis packs normalized `{coverage["read_model_count"]}` read-model records, `{coverage["route_or_scene_count"]}` browser/native surfaces, `{coverage["customer_safe_boundary_rows"]}` customer-safe boundary rows, and `{coverage["stream_contract_count"]}` stream or refresh contracts. ADR-005 closes the remaining gap by choosing one projection strategy that keeps legal truth, customer-safe redaction, stale-view protection, and browser/native parity explicit at the server boundary.

## Decision

Adopt **server-authored, per-surface typed read models and deltas** as the default projection doctrine for Taxat:

- Each major route or scene consumes a named server-authored projection contract rather than composing legal posture from granular fragments.
- Projections remain disposable caches. Durable truth continues to live in manifest, workflow, authority, governance, receipt, and audit artifacts.
- Typed deltas are used where the corpus already defines them (`ExperienceDelta`, `WorkInboxDelta`, `WorkspaceDelta` and companions). Other surfaces prefer receipt-driven snapshot refresh over client-composed meaning.
- Customer-safe boundaries are enforced before serialization. Portal and customer-visible collaboration routes may only consume customer-safe projections and may never infer staff-only meaning from hidden fields.
- Native clients hydrate from the same northbound projections and stale/recovery contracts as browser routes; they do not define a separate business-logic stack.

## Decision Drivers

{markdown_table(["Driver", "Priority", "Weight", "Why It Matters"], criteria_rows)}

## Projection Ownership

{markdown_table(["Projection Family", "Representative Read Models", "Generation Mode", "Owning Boundary"], family_policy_rows)}

The decisive pattern is consistent across families: durable truth settles first, a named server-side projector translates that truth into a route-safe projection, typed refresh or delta contracts deliver it, and browser/native clients limit themselves to local view-state composition such as selection, scroll position, drawer state, or draft continuation.

## Route And Shell Binding

{markdown_table(["Representative Surface", "Shell Family", "Projection Contract", "Primary Read Models"], representative_routes)}

This is the operational reason the doctrine wins. Same-object and same-shell continuity only stays trustworthy when the mounted route already carries the exact projection, stale-guard, visibility, and return-path contract the client needs. Taxat's shell law does not want the browser or native layer reconstructing that from unrelated APIs.

## Customer-Safe Boundary Summary

{markdown_table(["Read Model", "Surface Scope", "Blocked Internal Families", "First Forbidden Inference"], customer_safe_rows)}

Customer-safe projection is not a UI preference; it is a projection boundary. The server must block `{", ".join(BLOCKED_CUSTOMER_SAFE_FAMILIES)}` at the projection source, flatten internal workflow posture into customer-safe language, and keep authority certainty explicit rather than optimistic.

## Generation And Rebuild Posture

- Manifest and collaboration routes use precomputed snapshots plus typed deltas or cursors, because those surfaces need strong reconnect, rebase, and same-shell continuity guarantees.
- Portal routes use server-authored customer-safe snapshots with receipt-driven refresh because customer-safe posture, stale-view protection, and continuity are more important than exposing raw internal deltas.
- Governance routes use server-authored snapshots and simulation outputs keyed by basis hashes so stale policy meaning never lives in local UI state.
- Native scenes hydrate the same northbound snapshots and deltas but treat local persistence as disposable; purge and rehydrate wins over local truth invention.

## Alternatives Considered

{markdown_table(["Alternative", "Weighted Score", "Rank"], ranking_rows)}

The winning option is **{winner["label"]}** with a weighted score of `{winner["weighted_total"]}`.

## Why This Option Wins

- It is the only option that makes the named Taxat route models first-class rather than incidental. The corpus already behaves as if these projections exist; ADR-005 formalizes that doctrine.
- It keeps customer-safe redaction at the projection source, where it can be tested and audited, instead of treating redaction as a client coding convention.
- It preserves same-object continuity because route-level projections can carry the exact shell stability tokens, stale guards, and fallback anchors required for rebase.
- It gives browser and native clients one shared business meaning while still allowing each embodiment to restack or present support surfaces differently.
- It keeps restore, replay, and cache invalidation tractable because streams, browser caches, and native caches remain disposable and rebuildable from durable truth.

## Guardrails On The Decision

- Projections SHALL NOT become legal truth.
- Portal and other customer-safe surfaces SHALL NOT serialize hidden staff context, internal notes, internal queue posture, or stronger authority certainty than the truth contract permits.
- Clients MAY preserve local view state, drafts, and focus anchors, but SHALL NOT derive assignment, escalation, gate posture, or settlement legality from hidden fragments.
- Stream deltas, browser caches, and native caches SHALL remain disposable and rebuildable from durable truth.
- Rebase after stale-view rejection SHALL preserve the same object, shell, and dominant meaning where the object still resolves.
- Historical and current artifact posture SHALL remain distinct wherever the route contract requires it.

## Consequences

Positive consequences:

- Backend, web, and native teams now share one projection doctrine: named route surfaces, explicit redaction rules, typed stale/recovery posture, and disposable caches.
- Tests become easier to author because projections and selectors are more deterministic than multi-API client composition.
- Production debugging improves because each surface has a declared owner, invalidation basis, and rebuild source.

Negative consequences and tradeoffs:

- The server owns more read-side contracts and must keep them versioned and disciplined.
- Projection sprawl becomes a real maintenance concern if later teams add surfaces without reusing the named family rules in this ADR.
- Some routes will refresh whole projections rather than exposing finer-grained client composition, which is the deliberate tradeoff for correctness and clarity.

## Deferred Decisions

{chr(10).join(f"- {row['gap_key']}: {row['summary']}" for row in deferred_rows)}

These are deferred because ADR-005 is choosing projection doctrine, not locking exact URL literals, vendor cache products, or every future route/module split.

## References

- Read-model catalog: [read_model_catalog_and_owner_map.json]({READ_MODEL_CATALOG_PATH})
- Route and shell map: [read_model_to_route_and_shell_map.json]({READ_MODEL_ROUTE_MAP_PATH})
- Generation and rebuild policy: [projection_generation_and_rebuild_policy.json]({GENERATION_POLICY_PATH})
- Customer-safe boundary matrix: [customer_safe_projection_boundary_matrix.json]({CUSTOMER_SAFE_BOUNDARY_PATH})
- Stream and refresh contracts: [projection_stream_delta_contracts.json]({STREAM_CONTRACT_PATH})
- Version and staleness policy: [projection_version_and_staleness_policy.json]({STALENESS_POLICY_PATH})
- Scorecard: [ADR-005-read-model-projection-strategy-scorecard.json]({SCORECARD_PATH})
- Comparison notes: [ADR-005-read-model-projection-strategy-comparison.md]({COMPARISON_PATH})
- Decision diagram: [ADR-005-read-model-projection-strategy.mmd]({MERMAID_PATH})
"""


def build_comparison_markdown(
    scorecard: dict[str, Any],
    coverage: dict[str, int],
) -> str:
    ranking_rows = []
    for item in scorecard["alternatives"]:
        ranking_rows.append(
            [item["rank"], item["label"], item["weighted_total"], item["strengths"][:2]]
        )
    criteria_rows = [
        [item["label"], item["priority"], item["weight"], item["source_refs"]]
        for item in scorecard["criteria"]
    ]
    sections = [
        "# ADR-005 Comparison Notes",
        "",
        "This comparison expands the weighted scorecard that supports ADR-005.",
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
        f"- Read models covered: `{coverage['read_model_count']}`",
        f"- Route or scene bindings covered: `{coverage['route_or_scene_count']}`",
        f"- Route-bound read models covered: `{coverage['route_bound_read_model_count']}`",
        f"- Customer-safe boundary rows covered: `{coverage['customer_safe_boundary_rows']}`",
        f"- Blocked customer-safe internal families: `{coverage['blocked_customer_safe_families']}`",
        f"- Stream or refresh contracts covered: `{coverage['stream_contract_count']}`",
        f"- Version/staleness surfaces covered: `{coverage['staleness_surface_count']}`",
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
    runner_ups = scorecard["alternatives"][1:]
    sections.extend(
        [
            "",
            "## Why The Runner-Up Options Lost",
            "",
            *[
                f"- `{item['label']}` lost because {item['risks'][0][0].lower() + item['risks'][0][1:]}"
                for item in runner_ups
            ],
        ]
    )
    return "\n".join(sections) + "\n"


def main() -> None:
    supporting_context = build_supporting_context()
    family_specs = build_family_specs()
    criteria = build_criteria()
    alternatives = build_alternatives()
    scorecard = build_scorecard(criteria, alternatives)
    route_map = build_route_map(family_specs)
    catalog = build_read_model_catalog(route_map)
    generation_policy = build_generation_policy(catalog)
    boundary_matrix = build_customer_safe_boundary_matrix()
    stream_contracts = build_stream_contracts()
    staleness_policy = build_staleness_policy(route_map)
    coverage = build_coverage_summary(
        catalog, route_map, boundary_matrix, stream_contracts, staleness_policy
    )

    adr_markdown = build_adr_markdown(
        scorecard,
        catalog,
        route_map,
        generation_policy,
        boundary_matrix,
        stream_contracts,
        staleness_policy,
    )
    comparison_markdown = build_comparison_markdown(scorecard, coverage)
    mermaid = build_mermaid()

    json_write(SCORECARD_PATH, scorecard)
    json_write(READ_MODEL_CATALOG_PATH, catalog)
    json_write(READ_MODEL_ROUTE_MAP_PATH, route_map)
    json_write(GENERATION_POLICY_PATH, generation_policy)
    json_write(CUSTOMER_SAFE_BOUNDARY_PATH, boundary_matrix)
    json_write(STREAM_CONTRACT_PATH, stream_contracts)
    json_write(STALENESS_POLICY_PATH, staleness_policy)
    text_write(ADR_PATH, adr_markdown)
    text_write(COMPARISON_PATH, comparison_markdown)
    text_write(MERMAID_PATH, mermaid)

    print(
        json.dumps(
            {
                "status": "ok",
                "decision": scorecard["selected_alternative_id"],
                "coverage": coverage,
                "supporting_context": supporting_context,
            },
            indent=2,
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
