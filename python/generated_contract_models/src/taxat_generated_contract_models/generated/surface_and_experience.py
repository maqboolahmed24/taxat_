"""DO NOT EDIT: generated downstream from packages/contracts-core."""
from __future__ import annotations

from typing import Literal, NotRequired, Required, TypedDict

from .primitives import ExactDecimalString, ISO8601DateTimeString, JSONValue

type ActionStripStateDetailModuleCode = Literal["EVIDENCE_TIDE", "PACKET_FORGE", "AUTHORITY_TUNNEL", "DRIFT_FIELD", "FOCUS_LENS", "TWIN_PANEL"]

class ActionStripState(TypedDict, total=False):
    artifact_type: Required[Literal["ActionStripState"]]
    surface_code: Required[Literal["ACTION_STRIP"]]
    source_module_code: Required[Literal["WORKFLOW_CHOREOGRAPHER"]]
    actionability_state: Required[Literal["ACTION_AVAILABLE", "NO_SAFE_ACTION"]]
    mode_safety_posture: Required[Literal["LIVE_COMPLIANCE_MUTATIONS_ALLOWED", "NON_LIVE_MUTATIONS_FORBIDDEN"]]
    primary_action: Required[ActionStripStateAction | None]
    secondary_actions: Required[list[ActionStripStateAction]]
    available_action_codes: Required[list[str]]
    blocked_action_codes: Required[list[str]]
    ownership_posture: Required[Literal["SELF", "HUMAN_REVIEW", "APPROVAL_REQUIRED", "AUTHORITY_WAIT", "CUSTOMER_WAIT", "SYSTEM_WAIT", "NONE"]]
    ownership_label: Required[str | None]
    waiting_on_label: Required[str | None]
    blocking_reason: Required[str | None]
    no_safe_action_reason_code: Required[str | None]
    machine_reason_codes: Required[list[str]]
    investigation_entry_point: Required[ActionStripStateDetailModuleCode | None]
    suggested_detail_surface_code: Required[ActionStripStateDetailModuleCode | None]
    active_detail_surface_code: Required[ActionStripStateDetailModuleCode | None]
    focus_anchor_ref: Required[str | None]
    primary_action_score: Required[int]
    runner_up_action_score: Required[int]
    dominance_margin: Required[int]
    suppressed_secondary_count: Required[int]
    full_text_ref: Required[str]

class ActionStripStateAction(TypedDict, total=False):
    action_code: Required[str]
    label: Required[str]
    action_kind: Required[Literal["AUTHORITY_MUTATION", "FILING_MUTATION", "APPROVAL_MUTATION", "OVERRIDE_MUTATION", "INVESTIGATE", "COMPARE", "EXPORT", "REQUEST_REVIEW", "REFRESH"]]
    target_object_ref: Required[str | None]
    target_detail_surface_code: Required[ActionStripStateDetailModuleCode | None]
    requires_live_freshness: Required[bool]
    mutation_precondition_binding_or_null: Required[MutationPreconditionBinding | None]

ActionStripStateSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/action_strip_state.schema.json",
    "source_hash": "c234d4ddcbc3cffd75eefe529dc0c734e3c7ebf9d67ff2a737dc7ba94d839559",
}

class ContextBarState(TypedDict, total=False):
    artifact_type: Required[Literal["ContextBarState"]]
    surface_code: Required[Literal["CONTEXT_BAR"]]
    source_module_code: Required[Literal["MANIFEST_RIBBON"]]
    manifest_label: Required[str]
    period_label: Required[str]
    scope_label: Required[str]
    phase_label: Required[str]
    freshness_state: Required[Literal["FRESH", "STALE", "CATCHING_UP", "DEGRADED"]]
    truth_origin: Required[Literal["LOCAL_INTENT", "PERSISTED_STATE", "AUTHORITY_ARTIFACT", "OUT_OF_BAND_DISCOVERY"]]
    connection_state: Required[Literal["CONNECTED", "RECONNECTING", "CATCHING_UP", "STALE", "DEGRADED"]]
    owner_handoff_posture: Required[Literal["UNASSIGNED", "OWNED", "HANDOFF_PENDING", "WAITING_ON_CUSTOMER", "WAITING_ON_AUTHORITY", "WAITING_ON_REVIEW", "WAITING_ON_APPROVAL"]]
    owner_label: Required[str | None]
    mode_posture: Required[Literal["LIVE_COMPLIANCE", "ANALYSIS_ONLY", "REPLAY_ONLY", "MASKED_LIMITED", "READ_ONLY"]]
    limitation_statement: Required[str | None]
    full_text_ref: Required[str]

ContextBarStateSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/context_bar_state.schema.json",
    "source_hash": "d4d16da7d94a1046bb5b8686f9be4bdce4764cc6f6f5988439253342b1fa3588",
}

class CrossDeviceContinuityContract(TypedDict, total=False):
    contract_version: Required[Literal["CROSS_DEVICE_CONTINUITY_V1"]]
    continuity_scope: Required[Literal["MANIFEST_ROUTE", "WORKSPACE_ROUTE", "CLIENT_PORTAL_ROUTE", "WORK_ITEM_NOTIFICATION", "NATIVE_PRIMARY_SCENE", "NATIVE_SECONDARY_WINDOW", "GOVERNANCE_ROUTE"]]
    canonical_object_ref: Required[str]
    shell_family: Required[Literal["CALM_SHELL", "CLIENT_PORTAL_SHELL", "GOVERNANCE_DENSITY_SHELL"]]
    route_identity_ref: Required[str]
    parent_context_ref_or_null: Required[str | None]
    focus_anchor_ref_or_null: Required[str | None]
    return_focus_anchor_ref_or_null: Required[str | None]
    dominant_action_state_or_null: Required[Literal["ACTION_AVAILABLE", "NO_SAFE_ACTION", None]]
    stability_guard_hash_or_null: Required[str | None]
    access_scope_hash_or_null: Required[str | None]
    masking_scope_fingerprint_or_null: Required[str | None]
    session_scope_ref_or_null: Required[str | None]
    visibility_cache_partition_key_or_null: Required[str | None]
    allowed_embodiments: Required[list[Literal["BROWSER_WIDE", "BROWSER_NARROW_STACKED", "NATIVE_PRIMARY_SCENE", "NATIVE_SUPPORT_WINDOW"]]]
    same_object_policy: Required[Literal["PRESERVE_EXACT_OBJECT_OR_EXPLICIT_LAWFUL_FALLBACK"]]
    same_shell_policy: Required[Literal["PRESERVE_SAME_SHELL_FAMILY"]]
    narrow_layout_policy: Required[Literal["STACK_WITHIN_SAME_SHELL", "NOT_APPLICABLE"]]
    deep_link_return_policy: Required[Literal["EXPLICIT_PARENT_CONTEXT_AND_FOCUS"]]
    action_posture_policy: Required[Literal["DOMINANCE_AND_SETTLEMENT_SERVER_AUTHORED_ONLY"]]
    hydration_compatibility_policy: Required[Literal["TENANT_ACCESS_MASKING_AND_SESSION_BOUND"]]
    compatibility_basis_class: Required[Literal["ROUTE_GUARD_ONLY", "ROUTE_GUARD_AND_VISIBILITY", "VISIBILITY_ONLY", "SESSION_MASKING_AND_ROUTE_GUARD", "SESSION_MASKING_AND_PARENT_SCENE"]]
    restoration_mode_policy: Required[Literal["EXPLICIT_CARRY_FORWARD_OR_REBASE_ONLY"]]
    secondary_window_policy: Required[Literal["NOT_APPLICABLE", "SUPPORT_ONLY_PARENT_BOUND"]]
    supported_invalidation_reason_codes: Required[list[Literal["TENANT_SWITCH", "PRIVILEGE_DOWNGRADE", "ACCESS_BINDING_CHANGE", "MASKING_CHANGE", "VIEW_GUARD_CHANGE", "SESSION_REVOKED", "SCHEMA_INCOMPATIBLE", "OBJECT_GONE", "PARENT_WINDOW_CLOSED", "POLICY_SNAPSHOT_CHANGE"]]]

CrossDeviceContinuityContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/cross_device_continuity_contract.schema.json",
    "source_hash": "62be8c89a0d472a84eb5b3fca1ba4603ed3aad667048382a337c40707973ce83",
}

class DecisionSummaryState(TypedDict, total=False):
    artifact_type: Required[Literal["DecisionSummaryState"]]
    surface_code: Required[Literal["DECISION_SUMMARY"]]
    source_module_codes: Required[list[JSONValue]]
    headline: Required[str]
    primary_issue_ref: Required[str | None]
    attention_state: Required[Literal["CALM", "NOTICE", "REVIEW", "BLOCKED", "WAITING", "LIMITED"]]
    visible_warning_count: Required[int]
    visible_reasons: Required[list[DecisionSummaryStateVisibleReason]]
    additional_reason_count: Required[int]
    plain_explanation: Required[str]
    uncertainty_statement: Required[str | None]
    limitation_state: Required[Literal["NONE", "NOT_REQUESTED", "NOT_YET_MATERIALIZED", "LIMITED", "NOT_APPLICABLE"]]
    state_reason_code_or_null: Required[Literal["REQUEST_NOT_TRIGGERED", "MATERIALIZATION_PENDING", "NOT_APPLICABLE_TO_CONTEXT", None]]
    limitation_reason_codes: Required[list[str]]
    limitation_statement: Required[str | None]
    blocking_reason: Required[str | None]
    machine_reason_codes: Required[list[str]]
    full_text_ref: Required[str]

class DecisionSummaryStateVisibleReason(TypedDict, total=False):
    reason_code: Required[str]
    label: Required[str]
    severity: Required[Literal["NOTICE", "REVIEW", "BLOCKED", "WAITING", "LIMITED"]]

DecisionSummaryStateSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/decision_summary_state.schema.json",
    "source_hash": "0a38e778b730005dd065ea63a6a3bdf581bec00b88518b0611d9f43379d428de",
}

type DetailDrawerStateDetailModuleCode = Literal["EVIDENCE_TIDE", "PACKET_FORGE", "AUTHORITY_TUNNEL", "DRIFT_FIELD", "FOCUS_LENS", "TWIN_PANEL"]

class DetailDrawerState(TypedDict, total=False):
    artifact_type: Required[Literal["DetailDrawerState"]]
    surface_code: Required[Literal["DETAIL_DRAWER"]]
    entry_points: Required[list[DetailDrawerStateDetailEntry]]
    expanded_module_code: Required[DetailDrawerStateDetailModuleCode | None]
    expanded_content_state: Required[Literal["COLLAPSED", "POPULATED", "NOT_REQUESTED", "NOT_YET_MATERIALIZED", "LIMITED", "NOT_APPLICABLE"]]
    focus_anchor_ref: Required[str | None]
    fallback_reason_code: Required[str | None]
    compare_mode_explicit: Required[bool]
    audit_mode_explicit: Required[bool]
    full_text_ref: Required[str]

class DetailDrawerStateDetailEntry(TypedDict, total=False):
    module_code: Required[DetailDrawerStateDetailModuleCode]
    entry_label: Required[str]
    semantic_view_kind: Required[Literal["CAUSAL_EVIDENCE_TRACE", "FILING_PACKET_BINDING", "AUTHORITY_SEQUENCE_STATUS", "BASELINE_CHANGE_INTERPRETATION", "AUDIT_NEIGHBORHOOD_TRACE", "COMPUTED_VS_AUTHORITY_COMPARISON"]]
    plain_language_summary: Required[str]
    entry_reason: Required[str | None]
    content_state: Required[Literal["POPULATED", "NOT_REQUESTED", "NOT_YET_MATERIALIZED", "LIMITED", "NOT_APPLICABLE"]]
    state_reason_code_or_null: Required[Literal["REQUEST_NOT_TRIGGERED", "MATERIALIZATION_PENDING", "NOT_APPLICABLE_TO_CONTEXT", None]]
    limitation_reason_codes: Required[list[str]]
    anchorable_object_refs: Required[list[str]]

DetailDrawerStateSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/detail_drawer_state.schema.json",
    "source_hash": "73dfa5a384deca11fc8f136b73ddad3e76ed10bbc9504dce8e2b946608d2d940",
}

class ExperienceCursor(TypedDict, total=False):
    artifact_type: Required[Literal["ExperienceCursor"]]
    cursor_scope_class: Required[Literal["MANIFEST_EXPERIENCE"]]
    cursor_id: Required[str]
    tenant_id: Required[str]
    principal_ref: Required[str]
    principal_class: Required[str]
    manifest_id: Required[str]
    shell_route_key: Required[str]
    shell_stability_token: Required[str]
    session_ref: Required[str]
    session_binding_hash: Required[str]
    access_binding_hash: Required[str]
    frame_epoch: Required[int]
    last_ack_sequence: Required[int]
    last_published_sequence: Required[int]
    latest_snapshot_ref: Required[str]
    resume_token_hash: Required[str]
    stream_recovery_contract: Required[StreamRecoveryContract]
    native_cache_hydration_contract: Required[NativeCacheHydrationContract]
    truth_boundary_contract: Required[CommandTruthBoundaryContract]
    stability_contract: Required[RouteStabilityContract]
    replacement_stability_contract_or_null: Required[RouteStabilityContract | None]
    cursor_state: Required[Literal["LIVE", "REBASED", "CLOSED", "REVOKED", "EXPIRED"]]
    masking_posture_hash: Required[str]
    schema_compatibility_ref: Required[str]
    replacement_snapshot_ref: Required[str | None]
    invalidation_reason_code: Required[Literal["FRAME_EPOCH_ADVANCED", "HISTORY_COMPACTED", "SHELL_STABILITY_CHANGED", "SESSION_REVOKED", "SESSION_BINDING_CHANGED", "ACCESS_BINDING_CHANGED", "MASKING_POSTURE_CHANGED", "SCHEMA_INCOMPATIBLE", "TENANT_SWITCHED", "PRINCIPAL_CLASS_CHANGED", "CURSOR_TTL_ELAPSED", "CLIENT_CLOSED", None]]
    invalidated_at: Required[ISO8601DateTimeString]
    last_seen_at: Required[ISO8601DateTimeString]
    expires_at: Required[ISO8601DateTimeString]

ExperienceCursorSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/experience_cursor.schema.json",
    "source_hash": "60057dfc5655cd1617426dacc34a92af2c5697b24a1ef6f3ab302d6ef92ceb22",
}

type ExperienceDeltaSurfaceCode = Literal["CONTEXT_BAR", "DECISION_SUMMARY", "ACTION_STRIP", "DETAIL_DRAWER", "SCOPE_COMPOSER", "PULSE_SPINE", "MANIFEST_RIBBON", "HANDOFF_BATON", "DECISION_STAGE", "CONSEQUENCE_RAIL", "DECISION_CONSTELLATION", "GATE_LATTICE", "TRUST_PRISM", "WORKFLOW_CHOREOGRAPHER", "EVIDENCE_TIDE", "PACKET_FORGE", "AUTHORITY_TUNNEL", "DRIFT_FIELD", "FOCUS_LENS", "TWIN_PANEL"]

type ExperienceDeltaLowNoiseSurfaceCode = Literal["CONTEXT_BAR", "DECISION_SUMMARY", "ACTION_STRIP", "DETAIL_DRAWER"]

type ExperienceDeltaDetailModuleCode = Literal["EVIDENCE_TIDE", "PACKET_FORGE", "AUTHORITY_TUNNEL", "DRIFT_FIELD", "FOCUS_LENS", "TWIN_PANEL"]

type ExperienceDeltaEmptyStateKind = Literal["NONE", "NOT_REQUESTED", "NOT_YET_MATERIALIZED", "LIMITED", "NOT_APPLICABLE"]

class ExperienceDelta(TypedDict, total=False):
    manifest_id: Required[str]
    experience_sequence: Required[int]
    frame_epoch: Required[int]
    delivery_class: Required[Literal["LIVE", "CATCH_UP", "SNAPSHOT"]]
    shell_route_key: Required[str]
    posture_state: Required[Literal["STREAMING", "FROZEN", "CONTAINED", "BRIDGED", "FRACTURED"]]
    semantic_motion: Required[Literal["ORBIT", "TRACE", "SEAL", "RIPPLE", "BRIDGE", "FRACTURE", "ECHO"]]
    cause_ref: Required[str]
    connection_state: NotRequired[Literal["CONNECTED", "RECONNECTING", "CATCHING_UP", "STALE", "DEGRADED", None]]
    activity_state: NotRequired[Literal["IDLE", "STREAMING", "WAITING_ON_HUMAN", "WAITING_ON_AUTHORITY", "WAITING_ON_LATE_DATA", "RECONNECTING", "REPLAYING", None]]
    truth_state: NotRequired[Literal["LOCAL_INTENT_ONLY", "PERSISTED_INTERNAL", "AUTHORITY_PENDING", "AUTHORITY_CONFIRMED", "AUTHORITY_REJECTED", "AUTHORITY_UNKNOWN", "AUTHORITY_OUT_OF_BAND", None]]
    checkpoint_state: NotRequired[Literal["NONE", "SOURCE_COLLECTION", "PROJECTION_PENDING", "HUMAN_REVIEW", "APPROVAL_PENDING", "AUTHORITY_PREFLIGHT", "TRANSMIT_PENDING", "PENDING_ACK", "RECONCILIATION_PENDING", "LATE_DATA_PENDING", "CONFIRMED", "REJECTED", "UNKNOWN", "OUT_OF_BAND", None]]
    truth_origin: NotRequired[Literal["LOCAL_INTENT", "PERSISTED_STATE", "AUTHORITY_ARTIFACT", "OUT_OF_BAND_DISCOVERY", None]]
    truth_boundary_contract: Required[CommandTruthBoundaryContract]
    experience_profile: Required[Literal["LOW_NOISE"]]
    attention_state: NotRequired[Literal["CALM", "NOTICE", "REVIEW", "BLOCKED", "WAITING", "LIMITED", None]]
    primary_object_ref: NotRequired[str | None]
    actionability_state: Required[Literal["ACTION_AVAILABLE", "NO_SAFE_ACTION"]]
    primary_action_code: NotRequired[str | None]
    no_safe_action_reason_code: NotRequired[str | None]
    secondary_notice_count: NotRequired[int | None]
    detail_entry_points: NotRequired[list[ExperienceDeltaDetailModuleCode]]
    suggested_detail_surface_code: NotRequired[ExperienceDeltaDetailModuleCode | None]
    attention_policy: Required[ExperienceDeltaAttentionPolicy]
    cognitive_budget: Required[ExperienceDeltaCognitiveBudget]
    active_detail_surface_code: NotRequired[ExperienceDeltaDetailModuleCode | None]
    focus_anchor_ref: Required[str | None]
    shell_stability_token: Required[str | None]
    next_checkpoint_at: NotRequired[ISO8601DateTimeString]
    checkpoint_reason: NotRequired[str | None]
    plain_reason: NotRequired[str | None]
    blocked_action_codes: NotRequired[list[str]]
    affected_object_refs: Required[list[str]]
    affected_surface_codes: Required[list[ExperienceDeltaLowNoiseSurfaceCode]]
    occurred_at: Required[ISO8601DateTimeString]
    surface_updates: Required[list[ExperienceDeltaSurfaceUpdate]]
    resume_token: NotRequired[str | None]
    is_terminal: NotRequired[bool]

class ExperienceDeltaAttentionPolicy(TypedDict, total=False):
    policy_version: Required[str]
    attention_state: Required[Literal["CALM", "NOTICE", "REVIEW", "BLOCKED", "WAITING", "LIMITED"]]
    primary_surface_code: Required[ExperienceDeltaLowNoiseSurfaceCode]
    primary_object_ref: Required[str | None]
    actionability_state: Required[Literal["ACTION_AVAILABLE", "NO_SAFE_ACTION"]]
    primary_action_code: Required[str | None]
    no_safe_action_reason_code: Required[str | None]
    secondary_notice_count: Required[int]
    detail_entry_points: Required[list[ExperienceDeltaDetailModuleCode]]
    ranking_basis: Required[list[str]]
    suggested_detail_surface_code: Required[ExperienceDeltaDetailModuleCode | None]
    primary_rank_score: Required[int]
    runner_up_rank_score: Required[int]
    dominance_margin: Required[int]
    default_detail_module_code: Required[ExperienceDeltaDetailModuleCode | None]
    visible_warning_count: Required[int]

class ExperienceDeltaCognitiveBudget(TypedDict, total=False):
    persistent_surface_limit: Required[Literal[4]]
    concurrent_primary_limit: Required[Literal[1]]
    primary_reason_limit: Required[Literal[3]]
    secondary_action_limit: Required[Literal[2]]
    visible_warning_limit: Required[Literal[1]]
    detail_entry_point_limit: Required[Literal[5]]
    expanded_detail_module_limit: Required[Literal[1]]
    visibility_budget_units: Required[Literal[12]]
    prominent_motion_limit: Required[Literal[1]]
    issue_dominance_min_margin: Required[Literal[12]]
    action_dominance_min_margin: Required[Literal[15]]
    primary_rank_hysteresis: Required[Literal[8]]
    non_material_rank_swap_limit: Required[Literal[1]]
    non_material_continuity_cost_limit: Required[Literal[6]]
    refresh_coalescing_window_ms: Required[Literal[1500]]
    refresh_burst_visible_change_limit: Required[Literal[2]]

class ExperienceDeltaReasonItem(TypedDict, total=False):
    reason_code: Required[str]
    label: Required[str]

class ExperienceDeltaContextBarPayload(TypedDict, total=False):
    manifest_label: Required[str]
    period_label: Required[str]
    scope_label: Required[str]
    phase_label: Required[str]
    freshness_label: Required[str]
    truth_origin_label: Required[str]
    connection_label: Required[str]
    owner_label: NotRequired[str | None]
    mode_label: NotRequired[str | None]
    limitation_label: NotRequired[str | None]

class ExperienceDeltaDecisionSummaryPayload(TypedDict, total=False):
    headline: Required[str]
    primary_issue_state: Required[Literal["CALM", "NOTICE", "REVIEW", "BLOCKED", "WAITING", "LIMITED"]]
    reason_items: Required[list[ExperienceDeltaReasonItem]]
    additional_reason_count: Required[int]
    uncertainty_statement: Required[str | None]
    plain_explanation: Required[str]
    empty_state_kind: Required[ExperienceDeltaEmptyStateKind]

class ExperienceDeltaActionToken(TypedDict, total=False):
    action_code: Required[str]
    label: Required[str]
    ownership_label: NotRequired[str | None]

class ExperienceDeltaActionStripPayload(TypedDict, total=False):
    action_state: Required[Literal["ACTIONABLE", "WAITING", "NO_SAFE_ACTION"]]
    primary_action: Required[ExperienceDeltaActionToken | None]
    secondary_actions: Required[list[ExperienceDeltaActionToken]]
    ownership_label: Required[str | None]
    waiting_on_label: Required[str | None]
    blocking_reason: Required[str | None]
    investigation_entry_point: Required[ExperienceDeltaDetailModuleCode | None]

class ExperienceDeltaDetailModule(TypedDict, total=False):
    module_code: Required[ExperienceDeltaDetailModuleCode]
    entry_label: Required[str]
    entry_reason: Required[str]
    module_state: Required[Literal["READY", "LIMITED", "EMPTY", "MATERIALIZING"]]
    available_action_codes: NotRequired[list[str]]

class ExperienceDeltaDetailDrawerPayload(TypedDict, total=False):
    modules: Required[list[ExperienceDeltaDetailModule]]
    expanded_module_code: Required[ExperienceDeltaDetailModuleCode | None]
    empty_state_kind: Required[ExperienceDeltaEmptyStateKind]
    compare_mode: Required[bool]
    audit_mode: Required[bool]
    focus_anchor_ref: Required[str | None]

class ExperienceDeltaSurfaceUpdate(TypedDict, total=False):
    surface_code: Required[ExperienceDeltaLowNoiseSurfaceCode]
    surface_version: Required[int]
    patch_kind: Required[Literal["UPSERT_OBJECT", "REPLACE_FRAGMENT", "APPEND_EVENT", "REMOVE_OBJECT", "NOOP"]]
    surface_lifecycle_state: Required[Literal["UNBORN", "MATERIALIZING", "STABLE", "UPDATING", "SUPERSEDED", "LIMITED"]]
    plain_reason: NotRequired[str | None]
    available_action_codes: NotRequired[list[str]]
    blocked_action_codes: NotRequired[list[str]]
    affected_object_refs: NotRequired[list[str]]
    last_material_change_at: NotRequired[ISO8601DateTimeString]
    freshness_age: NotRequired[int | None]
    limited_by: NotRequired[list[str]]
    default_visibility: NotRequired[Literal["VISIBLE", "COLLAPSED", "HIDDEN"]]
    attention_tier: NotRequired[Literal["PRIMARY", "SECONDARY", "CONTEXTUAL", "INVESTIGATIVE"]]
    summary_rank: NotRequired[int]
    payload: Required[dict[str, JSONValue]]

class ExperienceDeltaExperienceFrame(TypedDict, total=False):
    manifest_id: Required[str]
    frame_epoch: Required[int]
    shell_route_key: Required[str]
    experience_profile: Required[Literal["LOW_NOISE"]]
    attention_state: Required[Literal["CALM", "NOTICE", "REVIEW", "BLOCKED", "WAITING", "LIMITED"]]
    primary_object_ref: NotRequired[str | None]
    actionability_state: Required[Literal["ACTION_AVAILABLE", "NO_SAFE_ACTION"]]
    primary_action_code: NotRequired[str | None]
    no_safe_action_reason_code: NotRequired[str | None]
    detail_entry_points: Required[list[ExperienceDeltaDetailModuleCode]]
    suggested_detail_surface_code: NotRequired[ExperienceDeltaDetailModuleCode | None]
    attention_policy: Required[ExperienceDeltaAttentionPolicy]
    cognitive_budget: Required[ExperienceDeltaCognitiveBudget]
    active_detail_surface_code: NotRequired[ExperienceDeltaDetailModuleCode | None]
    focus_anchor_ref: Required[str | None]
    shell_stability_token: Required[str | None]
    surface_order: Required[list[JSONValue]]
    surfaces: Required[dict[str, JSONValue]]

ExperienceDeltaSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/experience_delta.schema.json",
    "source_hash": "ef74b4f037aa98d644513856236ba44c1c6518ee738edbfd87b71c1b41a068ec",
}

class ExperienceStreamEvent(TypedDict, total=False):
    artifact_type: Required[Literal["ExperienceStreamEvent"]]
    stream_scope_class: Required[Literal["MANIFEST_EXPERIENCE"]]
    manifest_id: Required[str]
    shell_route_key: Required[str]
    experience_sequence: Required[int]
    frame_epoch: Required[int]
    shell_stability_token: Required[str]
    resume_token: Required[str]
    stream_recovery_contract: Required[StreamRecoveryContract]
    stability_contract: Required[RouteStabilityContract]
    event_type: Required[Literal["experience.delta", "experience.snapshot", "terminal.bundle", "heartbeat"]]
    snapshot_ref: Required[str | None]
    delta_ref: Required[str | None]
    terminal_bundle_ref: Required[str | None]
    occurred_at: Required[ISO8601DateTimeString]

ExperienceStreamEventSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/experience_stream_event.schema.json",
    "source_hash": "21494b4d725acca39deb7b31108f1bf0b779cbb4ebf735f756b7913760f3ba0b",
}

class FocusRestorationContract(TypedDict, total=False):
    requested_focus_anchor_ref_or_null: Required[str | None]
    resolved_focus_anchor_ref_or_null: Required[str | None]
    restoration_disposition: Required[Literal["EXACT_FOCUS", "REMAPPED_FOCUS", "OBJECT_SUMMARY", "PARENT_RETURN", "INVALIDATED"]]
    restoration_reason_code_or_null: Required[str | None]

FocusRestorationContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/focus_restoration_contract.schema.json",
    "source_hash": "d6de8729efa37d6b4154c7adb4ec6a93423919ee6557b5d09a26fdf16eaab7ef",
}

type FocusRestoreReturnTargetHarnessSurfaceType = Literal["LowNoiseExperienceFrame", "WorkspaceSnapshot", "ClientPortalWorkspace", "TenantGovernanceSnapshot", "NativeOperatorSecondaryWindowScene"]

type FocusRestoreReturnTargetHarnessFocusScope = Literal["MANIFEST_SUPPORT_REGION", "WORKSPACE_DETAIL_ROUTE", "CLIENT_PORTAL_CONTEXTUAL_ROUTE", "GOVERNANCE_SUPPORT_ROUTE", "NATIVE_SECONDARY_WINDOW"]

type FocusRestoreReturnTargetHarnessTriggerAction = Literal["CLOSE_SUPPORT_REGION", "BACK_NAVIGATION", "HELP_HANDOFF_RETURN", "STALE_REBASE_RECOVERY", "LIVE_UPDATE_DURING_ACTIVE_INPUT", "RESPONSIVE_RESTACK", "SECONDARY_WINDOW_CLOSE"]

type FocusRestoreReturnTargetHarnessModality = Literal["KEYBOARD_ONLY", "POINTER_BASELINE", "ASSISTIVE_TECH"]

type FocusRestoreReturnTargetHarnessObjectLossState = Literal["EXACT_TARGET_VISIBLE", "EXACT_TARGET_STALE_SAME_OBJECT_LAWFUL", "OBJECT_STALE_PARENT_LAWFUL", "PARENT_STALE_NARROW_LIST_LAWFUL"]

type FocusRestoreReturnTargetHarnessSupportSurfaceKind = Literal["TRAILING_INSPECTOR", "DETAIL_DRAWER", "CONTEXTUAL_DETAIL", "HELP_ROUTE", "SECONDARY_COMPARE_WINDOW"]

type FocusRestoreReturnTargetHarnessActiveFocusLockKind = Literal["COMPOSER", "PICKER", "COMPARE_CONTROL"]

type FocusRestoreReturnTargetHarnessExpectedTargetKind = Literal["INVOKER", "OBJECT_SUMMARY", "PARENT_RETURN", "NARROWEST_SURVIVING_LIST"]

type FocusRestoreReturnTargetHarnessRestorationDisposition = Literal["EXACT_FOCUS", "REMAPPED_FOCUS", "OBJECT_SUMMARY", "PARENT_RETURN", "INVALIDATED"]

class FocusRestoreReturnTargetHarness(TypedDict, total=False):
    contract_version: Required[Literal["FOCUS_RESTORE_RETURN_TARGET_HARNESS_V1"]]
    harness_id: Required[str]
    deterministic_seed: Required[int]
    suite_profile: Required[Literal["KEYBOARD_FIRST_RETURN_TARGET_AND_FALLBACK_MATRIX"]]
    run_mode: Required[Literal["DETERMINISTIC_SEEDED_ENUMERATION"]]
    modality_policy: Required[Literal["KEYBOARD_FIRST_WITH_POINTER_AND_ASSISTIVE_PARITY"]]
    identifier_policy: Required[Literal["DATA_TESTID_AND_ACCESSIBILITY_IDENTIFIER_MIRROR_SERIALIZED_ANCHORS"]]
    return_target_policy: Required[Literal["SERIALIZED_INVOKER_OR_NARROWEST_LAWFUL_FALLBACK"]]
    fallback_order_policy: Required[Literal["REMAP_WITHIN_OBJECT_THEN_OBJECT_SUMMARY_THEN_PARENT_RETURN_THEN_NARROWEST_LIST"]]
    live_update_focus_policy: Required[Literal["NEVER_STEAL_ACTIVE_COMPOSER_PICKER_OR_COMPARE_FOCUS"]]
    help_handoff_policy: Required[Literal["HELP_HANDOFF_RETURNS_TO_SERIALIZED_SOURCE_ANCHOR"]]
    cases: Required[list[FocusRestoreReturnTargetHarnessHarnessCase]]

class FocusRestoreReturnTargetHarnessStateSnapshot(TypedDict, total=False):
    route_or_scene_ref: Required[str]
    canonical_object_ref_or_null: Required[str | None]
    active_focus_anchor_ref_or_null: Required[str | None]
    return_route_or_scene_ref_or_null: Required[str | None]
    return_focus_anchor_ref_or_null: Required[str | None]
    fallback_route_or_scene_ref_or_null: Required[str | None]
    fallback_focus_anchor_ref_or_null: Required[str | None]
    focus_restoration_disposition_or_null: Required[str | None]
    focus_restoration_reason_code_or_null: Required[str | None]
    browser_active_identifier_or_null: Required[str | None]
    browser_return_identifier_or_null: Required[str | None]
    native_active_identifier_or_null: Required[str | None]
    native_return_identifier_or_null: Required[str | None]
    active_focus_lock_ref_or_null: Required[str | None]

class FocusRestoreReturnTargetHarnessHarnessCase(TypedDict, total=False):
    case_id: Required[str]
    surface_type: Required[FocusRestoreReturnTargetHarnessSurfaceType]
    focus_scope: Required[FocusRestoreReturnTargetHarnessFocusScope]
    trigger_action: Required[FocusRestoreReturnTargetHarnessTriggerAction]
    covered_modalities: Required[list[FocusRestoreReturnTargetHarnessModality]]
    object_loss_state: Required[FocusRestoreReturnTargetHarnessObjectLossState]
    support_surface_kind_or_null: Required[str | None]
    active_focus_lock_kind_or_null: Required[str | None]
    expected_target_kind: Required[FocusRestoreReturnTargetHarnessExpectedTargetKind]
    expected_focus_restoration_disposition: Required[FocusRestoreReturnTargetHarnessRestorationDisposition]
    pre_state: Required[FocusRestoreReturnTargetHarnessStateSnapshot]
    post_state: Required[FocusRestoreReturnTargetHarnessStateSnapshot]

FocusRestoreReturnTargetHarnessSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/focus_restore_return_target_harness.schema.json",
    "source_hash": "d5ebd72b42c2b8999c4f1033f251d7e89954996bb49e678161e512f71ea34f20",
}

class InteractionLayerFoundationContract(TypedDict, total=False):
    contract_version: Required[Literal["CROSS_SHELL_INTERACTION_FOUNDATION_V1"]]
    shell_family: Required[Literal["CALM_SHELL", "CLIENT_PORTAL_SHELL", "GOVERNANCE_DENSITY_SHELL"]]
    design_token_binding_policy: Required[Literal["EXPLICIT_SEMANTIC_BINDINGS_ONLY"]]
    layout_density_token: Required[Literal["CALM_FOUR_SURFACE_DENSITY_V1", "PORTAL_COMFORTABLE_TASK_DENSITY_V1", "GOVERNANCE_WORKSPACE_DENSITY_V1"]]
    surface_spacing_token: Required[Literal["CALM_FOUR_SURFACE_SPACING_V1", "PORTAL_PRIMARY_STACK_SPACING_V1", "GOVERNANCE_CANVAS_SPACING_V1"]]
    support_surface_spacing_token: Required[Literal["CALM_DETAIL_DRAWER_SUPPORT_SPACING_V1", "PORTAL_INLINE_SUPPORT_SPACING_V1", "GOVERNANCE_AUXILIARY_SURFACE_SPACING_V1"]]
    responsive_compaction_token: Required[Literal["CALM_SUPPORT_REDOCK_V1", "PORTAL_STACK_BELOW_PRIMARY_V1", "GOVERNANCE_AUXILIARY_REDOCK_V1"]]
    selector_profile: Required[Literal["OPERATOR_SEMANTIC_SELECTORS_V1", "PORTAL_SEMANTIC_SELECTORS_V1", "GOVERNANCE_SEMANTIC_SELECTORS_V1"]]
    support_surface_policy: Required[Literal["ONE_PROMOTED_SUPPORT_SURFACE_MAX"]]
    continuity_policy: Required[Literal["SAME_OBJECT_SAME_SHELL_INLINE_RECOVERY", "SAME_SHELL_CONTEXTUAL_RETURN", "SAME_OBJECT_SAME_SHELL_CONTEXT_RETENTION"]]
    recovery_surface_policy: Required[Literal["INLINE_EXPLICIT_REBASE", "INLINE_REVIEW_OR_RECOVERY_NOTICE", "INLINE_TYPED_CONTEXTUAL_RECOVERY"]]
    history_presentation_policy: Required[Literal["CURRENT_PRIMARY_HISTORY_SECONDARY", "ACTIVE_SLICE_PRIMARY_CONTEXTUAL_HISTORY"]]
    preview_surface_policy: Required[Literal["DETAIL_DRAWER_OR_PARENT_BOUND_SECONDARY_WINDOW", "PRIMARY_CONTEXT_WITH_STACKED_SUPPORT", "AUXILIARY_SURFACE_CONTEXTUAL_ONLY"]]
    notification_surface_policy: Required[Literal["CONTEXT_BOUND_INLINE_FEEDBACK_OR_PARENT_MIRROR", "CONTEXT_BOUND_INLINE_FEEDBACK"]]
    secondary_window_policy: Required[Literal["SUPPORT_ONLY_PARENT_BOUND_CLOSE_RETURNS_FOCUS", "NOT_APPLICABLE"]]
    motion_profile: Required[Literal["SUBTLE_CAUSAL_ONLY"]]
    motion_token: Required[Literal["SUBTLE_CAUSAL_MOTION_V1"]]
    feedback_truth_policy: Required[Literal["DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN"]]
    platform_parity_policy: Required[Literal["SAME_FAMILY_REUSES_SAME_INTERACTION_GRAMMAR"]]

InteractionLayerFoundationContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/interaction_layer_foundation_contract.schema.json",
    "source_hash": "1400be63482ef4a193e04e687caabf09957571df5e2626ea07abfcefd6bb5ff1",
}

class LowNoiseBudgetAudit(TypedDict, total=False):
    contract_version: Required[Literal["LOW_NOISE_BUDGET_AUDIT_V1"]]
    shell_family: Required[Literal["CALM_SHELL"]]
    audit_scope: Required[Literal["FIRST_VIEW", "NON_MATERIAL_REFRESH", "RECOVERY_RECONNECT"]]
    rendered_surface_order: Required[list[JSONValue]]
    persistent_surface_count: Required[int]
    concurrent_primary_count: Required[int]
    dominant_issue_count: Required[int]
    primary_mutation_action_count: Required[int]
    secondary_mutation_action_count: Required[int]
    visible_reason_count: Required[int]
    collapsed_reason_count: Required[int]
    visible_warning_count: Required[int]
    visible_action_count: Required[int]
    visible_detail_entry_count: Required[int]
    visible_shell_char_count: Required[int]
    prominent_motion_count: Required[int]
    scan_load: Required[float]
    copy_budget_state: Required[Literal["WITHIN_FROZEN_COPY_BUDGET"]]
    surface_budget_state: Required[Literal["WITHIN_FROZEN_SURFACE_BUDGET"]]
    attention_budget_state: Required[Literal["WITHIN_FROZEN_ATTENTION_BUDGET"]]
    semantic_coverage_state: Required[Literal["LOSSLESS_DECISIVE_ATOMS_VISIBLE_OR_ROUTE_STABLE"]]
    duplicate_posture_codes: Required[list[Literal["LIMITATION_STATEMENT_DUPLICATED", "BLOCKING_REASON_DUPLICATED", "DETAIL_ENTRY_REASON_DUPLICATED"]]]
    duplicate_posture_cluster_count: Required[int]
    rank_swap_count_or_null: Required[int | None]
    continuity_cost_or_null: Required[int | None]
    visible_change_count_in_window_or_null: Required[int | None]
    coalesced_change_count_or_null: Required[int | None]
    refresh_budget_state: Required[Literal["NOT_APPLICABLE", "WITHIN_NON_MATERIAL_REFRESH_BUDGET", "COALESCED_TO_PRESERVE_BUDGET"]]
    detail_fallback_state: Required[Literal["NOT_APPLICABLE", "ACTIVE_MODULE_PRESERVED", "FIRST_VALID_ENTRY_SELECTED", "SUGGESTED_MODULE_SELECTED", "COLLAPSED_ROOT_SELECTED"]]

LowNoiseBudgetAuditSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/low_noise_budget_audit.schema.json",
    "source_hash": "8776c4cb2e34e4646075949cd4bb22be38b01c26e65191932b9e9e19eea6e7d1",
}

type LowNoiseBudgetAuditPackScenarioClass = Literal["FIRST_VIEW", "REASON_PRESSURE", "NO_SAFE_ACTION", "NON_MATERIAL_REFRESH", "RECONNECT_CATCH_UP", "DETAIL_FALLBACK"]

type LowNoiseBudgetAuditPackActionabilityState = Literal["ACTION_AVAILABLE", "NO_SAFE_ACTION"]

type LowNoiseBudgetAuditPackModePosture = Literal["LIVE_COMPLIANCE", "ANALYSIS_ONLY", "REPLAY_ONLY", "MASKED_LIMITED", "READ_ONLY"]

type LowNoiseBudgetAuditPackCoalescingOutcome = Literal["NONE", "COLLAPSE_TO_COUNTS", "DETAIL_LOCAL_ONLY", "HOLD_UNTIL_MATERIAL"]

type LowNoiseBudgetAuditPackDetailFallbackState = Literal["NOT_APPLICABLE", "ACTIVE_MODULE_PRESERVED", "FIRST_VALID_ENTRY_SELECTED", "SUGGESTED_MODULE_SELECTED", "COLLAPSED_ROOT_SELECTED"]

type LowNoiseBudgetAuditPackDetailModuleCode = Literal["EVIDENCE_TIDE", "PACKET_FORGE", "AUTHORITY_TUNNEL", "DRIFT_FIELD", "FOCUS_LENS", "TWIN_PANEL", None]

class LowNoiseBudgetAuditPack(TypedDict, total=False):
    contract_version: Required[Literal["LOW_NOISE_BUDGET_AUDIT_PACK_V1"]]
    pack_id: Required[str]
    deterministic_seed: Required[int]
    suite_profile: Required[Literal["CALM_SHELL_SURFACE_COMPRESSION_AND_NOISE_BUDGET_MATRIX"]]
    run_mode: Required[Literal["DETERMINISTIC_SEEDED_ENUMERATION"]]
    dominant_story_policy: Required[Literal["ONE_PRIMARY_ISSUE_AND_ONE_SAFE_NEXT_MOVE"]]
    posture_deduplication_policy: Required[Literal["ANALYSIS_MASKING_AND_LIMITATION_VISIBLE_ONCE"]]
    coalescing_policy: Required[Literal["NON_MATERIAL_DELTAS_COALESCE_BEFORE_ATTENTION_REORDER"]]
    copy_budget_policy: Required[Literal["FROZEN_MICROCOPY_BUDGETS_AND_LOSSLESS_DECISIVE_ATOMS"]]
    cases: Required[list[LowNoiseBudgetAuditPackAuditCase]]

class LowNoiseBudgetAuditPackAuditCase(TypedDict, total=False):
    case_id: Required[str]
    scenario_class: Required[LowNoiseBudgetAuditPackScenarioClass]
    frame_ref: Required[str]
    mode_posture: Required[LowNoiseBudgetAuditPackModePosture]
    actionability_state: Required[LowNoiseBudgetAuditPackActionabilityState]
    audit: Required[LowNoiseBudgetAudit]
    dominant_question_changed: Required[bool]
    primary_action_changed: Required[bool]
    active_detail_surface_code_or_null: Required[LowNoiseBudgetAuditPackDetailModuleCode]
    expected_coalescing_outcome: Required[LowNoiseBudgetAuditPackCoalescingOutcome]
    expected_fallback_state: Required[LowNoiseBudgetAuditPackDetailFallbackState]

LowNoiseBudgetAuditPackSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/low_noise_budget_audit_pack.schema.json",
    "source_hash": "2532fc8f24933f6ee6860df950b5119ba81570e76b6dedd42fdf54ce6d41dbcd",
}

type LowNoiseExperienceFrameLowNoiseSurfaceCode = Literal["CONTEXT_BAR", "DECISION_SUMMARY", "ACTION_STRIP", "DETAIL_DRAWER"]

type LowNoiseExperienceFrameDetailModuleCode = Literal["EVIDENCE_TIDE", "PACKET_FORGE", "AUTHORITY_TUNNEL", "DRIFT_FIELD", "FOCUS_LENS", "TWIN_PANEL"]

type LowNoiseExperienceFrameSettlementState = Literal["STEADY", "RECEIPT_PENDING", "FRESHENING", "STALE_REVIEW_REQUIRED", "DEGRADED_READ_ONLY", "RECOVERY_REQUIRED"]

type LowNoiseExperienceFrameRecoveryPosture = Literal["NONE", "INLINE_RECONNECT", "INLINE_REBASE", "READ_ONLY_LIMITED", "OBJECT_SUPERSEDED", "ACCESS_REBIND_REQUIRED"]

class LowNoiseExperienceFrame(TypedDict, total=False):
    artifact_type: Required[Literal["LowNoiseExperienceFrame"]]
    frame_id: Required[str]
    manifest_id: Required[str]
    decision_bundle_ref: Required[str]
    decision_bundle_hash: Required[str]
    trust_summary_ref: Required[str]
    experience_profile: Required[Literal["LOW_NOISE"]]
    shell_family: Required[Literal["CALM_SHELL"]]
    object_anchor_ref: Required[str]
    shell_route_key: Required[str]
    dominant_question: Required[str]
    dominance_contract: Required[ShellDominanceContract]
    state_taxonomy_contract: Required[ShellStateTaxonomyContract]
    cross_device_continuity_contract: Required[CrossDeviceContinuityContract]
    cache_isolation_contract: Required[CacheIsolationContract]
    semantic_accessibility_contract: Required[SemanticAccessibilityContract]
    truth_boundary_contract: Required[CommandTruthBoundaryContract]
    frame_epoch: Required[int]
    last_published_sequence: Required[int]
    shell_stability_token: Required[str]
    resume_token: Required[str]
    stream_recovery_contract: Required[StreamRecoveryContract]
    stability_contract: Required[RouteStabilityContract]
    connection_state: Required[Literal["CONNECTED", "RECONNECTING", "CATCHING_UP", "STALE", "DEGRADED"]]
    truth_state: Required[Literal["LOCAL_INTENT_ONLY", "PERSISTED_INTERNAL", "AUTHORITY_PENDING", "AUTHORITY_CONFIRMED", "AUTHORITY_REJECTED", "AUTHORITY_UNKNOWN", "AUTHORITY_OUT_OF_BAND"]]
    checkpoint_state: Required[Literal["NONE", "SOURCE_COLLECTION", "PROJECTION_PENDING", "HUMAN_REVIEW", "APPROVAL_PENDING", "AUTHORITY_PREFLIGHT", "TRANSMIT_PENDING", "PENDING_ACK", "RECONCILIATION_PENDING", "LATE_DATA_PENDING", "CONFIRMED", "REJECTED", "UNKNOWN", "OUT_OF_BAND"]]
    truth_origin: Required[Literal["LOCAL_INTENT", "PERSISTED_STATE", "AUTHORITY_ARTIFACT", "OUT_OF_BAND_DISCOVERY"]]
    settlement_state: Required[LowNoiseExperienceFrameSettlementState]
    recovery_posture: Required[LowNoiseExperienceFrameRecoveryPosture]
    interaction_layer: Required[OperatorInteractionLayer]
    attention_policy: Required[LowNoiseExperienceFrameAttentionPolicy]
    cognitive_budget: Required[LowNoiseExperienceFrameCognitiveBudget]
    copy_budget: Required[LowNoiseExperienceFrameCopyBudget]
    low_noise_budget_audit: Required[LowNoiseBudgetAudit]
    surface_order: Required[list[JSONValue]]
    context_bar: Required[ContextBarState]
    decision_summary: Required[DecisionSummaryState]
    action_strip: Required[ActionStripState]
    detail_drawer: Required[DetailDrawerState]
    active_detail_surface_code: Required[LowNoiseExperienceFrameDetailModuleCode | None]
    focus_anchor_ref: Required[str | None]
    rendered_at: Required[ISO8601DateTimeString]

class LowNoiseExperienceFrameAttentionPolicy(TypedDict, total=False):
    policy_version: Required[str]
    attention_state: Required[Literal["CALM", "NOTICE", "REVIEW", "BLOCKED", "WAITING", "LIMITED"]]
    primary_surface_code: Required[LowNoiseExperienceFrameLowNoiseSurfaceCode]
    primary_object_ref: Required[str | None]
    actionability_state: Required[Literal["ACTION_AVAILABLE", "NO_SAFE_ACTION"]]
    primary_action_code: Required[str | None]
    no_safe_action_reason_code: Required[str | None]
    secondary_notice_count: Required[int]
    detail_entry_points: Required[list[LowNoiseExperienceFrameDetailModuleCode]]
    suggested_detail_surface_code: Required[LowNoiseExperienceFrameDetailModuleCode | None]
    primary_rank_score: Required[int]
    runner_up_rank_score: Required[int]
    dominance_margin: Required[int]
    ranking_basis: Required[list[str]]
    default_detail_module_code: Required[LowNoiseExperienceFrameDetailModuleCode | None]
    visible_warning_count: Required[int]

class LowNoiseExperienceFrameCognitiveBudget(TypedDict, total=False):
    persistent_surface_limit: Required[Literal[4]]
    concurrent_primary_limit: Required[Literal[1]]
    primary_reason_limit: Required[Literal[3]]
    secondary_action_limit: Required[Literal[2]]
    visible_warning_limit: Required[Literal[1]]
    detail_entry_point_limit: Required[Literal[5]]
    expanded_detail_module_limit: Required[Literal[1]]
    visibility_budget_units: Required[Literal[12]]
    prominent_motion_limit: Required[Literal[1]]
    issue_dominance_min_margin: Required[Literal[12]]
    action_dominance_min_margin: Required[Literal[15]]
    primary_rank_hysteresis: Required[Literal[8]]
    non_material_rank_swap_limit: Required[Literal[1]]
    non_material_continuity_cost_limit: Required[Literal[6]]
    refresh_coalescing_window_ms: Required[Literal[1500]]
    refresh_burst_visible_change_limit: Required[Literal[2]]

class LowNoiseExperienceFrameCopyBudget(TypedDict, total=False):
    manifest_label_max_chars: Required[Literal[64]]
    context_label_max_chars: Required[Literal[48]]
    headline_max_chars: Required[Literal[96]]
    reason_label_max_chars: Required[Literal[120]]
    explanation_max_chars: Required[Literal[240]]
    action_label_max_chars: Required[Literal[40]]
    blocking_reason_max_chars: Required[Literal[160]]
    uncertainty_max_chars: Required[Literal[160]]
    detail_entry_label_max_chars: Required[Literal[48]]
    detail_entry_reason_max_chars: Required[Literal[120]]

LowNoiseExperienceFrameSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/low_noise_experience_frame.schema.json",
    "source_hash": "bb5663b9f5f82e6bca819caee2748edd976dc5db3de0e83796fb7b86d6773f97",
}

type NativeCacheHydrationAutomationPackAutomationHarness = Literal["XCUITEST", "NATIVE_PERSISTENCE_FIXTURE"]

type NativeCacheHydrationAutomationPackHydrationScopeClass = Literal["EXPERIENCE_CURSOR", "WORKSPACE_CURSOR", "NATIVE_PRIMARY_SCENE", "NATIVE_SECONDARY_WINDOW"]

type NativeCacheHydrationAutomationPackScenarioClass = Literal["COLD_START_COMPATIBLE_CACHE", "COLD_START_SCHEMA_INCOMPATIBLE", "TENANT_SWITCH", "PRIVILEGE_DOWNGRADE", "SESSION_REVOCATION", "CACHE_ONLY_RESTORE_REBASE_REQUIRED", "SECONDARY_WINDOW_MASKING_PURGE"]

type NativeCacheHydrationAutomationPackPurgeReason = Literal["TENANT_SWITCH", "PRIVILEGE_DOWNGRADE", "SESSION_REVOKED", "SCHEMA_INCOMPATIBLE", "MASKING_CHANGE", None]

type NativeCacheHydrationAutomationPackArtifactClass = Literal["STRUCTURED_CACHE", "RESUME_METADATA", "SCENE_RESTORATION_PAYLOAD", "NSUSERACTIVITY", "PREVIEW_CACHE", "TEMP_EXPORT_FILE", "LOCAL_SEARCH_INDEX"]

type NativeCacheHydrationAutomationPackFirstPaintOutcome = Literal["CACHED_RENDER_AFTER_CHECK", "PLACEHOLDER_UNTIL_FRESH_SNAPSHOT", "PURGED_NO_RESTORE"]

type NativeCacheHydrationAutomationPackActionOutcome = Literal["LIVE_ACTIONS_ALLOWED", "MUTATION_BLOCKED_PENDING_REBASE", "MUTATION_BLOCKED_PENDING_ACCESS_REBIND"]

type NativeCacheHydrationAutomationPackResumeBindingState = Literal["UNCHANGED_LIVE", "CLEARED_FOR_REBASE", "CLEARED_FOR_ACCESS_REBIND"]

class NativeCacheHydrationAutomationPack(TypedDict, total=False):
    contract_version: Required[Literal["NATIVE_CACHE_HYDRATION_AUTOMATION_PACK_V1"]]
    pack_id: Required[str]
    deterministic_seed: Required[int]
    suite_profile: Required[Literal["MACOS_CACHE_HYDRATION_PURGE_REBASE_AND_RESTORATION_MATRIX"]]
    run_mode: Required[Literal["DETERMINISTIC_SEEDED_ENUMERATION"]]
    first_paint_assertion_policy: Required[Literal["COMPATIBILITY_VERIFIED_BEFORE_RENDERED_CONTENT"]]
    purge_assertion_policy: Required[Literal["IMMEDIATE_SELECTIVE_PURGE_ACROSS_CACHE_AND_LOCAL_ARTIFACTS"]]
    action_gate_assertion_policy: Required[Literal["CACHE_ONLY_RESTORE_CANNOT_MUTATE_UNTIL_LIVE_REBASE"]]
    coverage_policy: Required[Literal["COLD_START_RECONNECT_TENANT_SWITCH_DOWNGRADE_REVOCATION_AND_SCHEMA_DRIFT"]]
    cases: Required[list[NativeCacheHydrationAutomationPackAutomationCase]]

class NativeCacheHydrationAutomationPackAutomationCase(TypedDict, total=False):
    case_id: Required[str]
    automation_harness: Required[NativeCacheHydrationAutomationPackAutomationHarness]
    hydration_scope_class: Required[NativeCacheHydrationAutomationPackHydrationScopeClass]
    scenario_class: Required[NativeCacheHydrationAutomationPackScenarioClass]
    compatibility_check_completed_before_render: Required[bool]
    incompatible_content_rendered: Required[bool]
    purge_reason_code_or_null: Required[NativeCacheHydrationAutomationPackPurgeReason]
    purged_artifact_classes: Required[list[NativeCacheHydrationAutomationPackArtifactClass]]
    resume_lineage_reused_illegally: Required[bool]
    restoration_reopened_stale_context: Required[bool]
    expected_first_paint_outcome: Required[NativeCacheHydrationAutomationPackFirstPaintOutcome]
    expected_action_outcome: Required[NativeCacheHydrationAutomationPackActionOutcome]
    expected_resume_binding_state: Required[NativeCacheHydrationAutomationPackResumeBindingState]

NativeCacheHydrationAutomationPackSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/native_cache_hydration_automation_pack.schema.json",
    "source_hash": "7020281be9a0755ba71075eec73827ca8cd1d67410bd557ad531699794b34344",
}

class NativeCacheHydrationContract(TypedDict, total=False):
    contract_version: Required[Literal["NATIVE_CACHE_HYDRATION_V1"]]
    hydration_scope_class: Required[Literal["EXPERIENCE_CURSOR", "WORKSPACE_CURSOR", "NATIVE_PRIMARY_SCENE", "NATIVE_SECONDARY_WINDOW"]]
    tenant_id: Required[str]
    principal_class: Required[str]
    session_binding_hash: Required[str]
    session_lineage_ref_or_null: Required[str | None]
    access_binding_hash_or_null: Required[str | None]
    masking_posture_fingerprint: Required[str]
    route_identity_ref: Required[str]
    canonical_object_ref: Required[str]
    shell_family: Required[str]
    schema_compatibility_ref: Required[str]
    projection_guard_ref: Required[str]
    resume_binding_ref_or_null: Required[str | None]
    restoration_anchor_ref_or_null: Required[str | None]
    preview_subject_ref_or_null: Required[str | None]
    compatibility_dimensions: Required[list[JSONValue]]
    purge_trigger_reason_codes: Required[list[JSONValue]]
    regulated_local_artifact_classes: Required[list[JSONValue]]
    first_paint_policy: Required[Literal["VERIFY_COMPATIBILITY_BEFORE_RENDER_OR_RESTORE"]]
    purge_execution_policy: Required[Literal["SELECTIVE_IMMEDIATE_PURGE_ON_SCOPE_SESSION_MASKING_OR_SCHEMA_DRIFT"]]
    cursor_lineage_policy: Required[Literal["RESUME_AND_DELTA_REUSE_REQUIRE_EXACT_LIVE_CURSOR_LINEAGE"]]
    restoration_reuse_policy: Required[Literal["SAME_OBJECT_SAME_SHELL_ONLY_WHEN_FULL_LEGALITY_ENVELOPE_MATCHES"]]
    mutation_gate_policy: Required[Literal["NO_MUTATION_OR_FILING_AFTER_CACHE_ONLY_RESTORE_OR_CONTEXT_DRIFT"]]
    local_artifact_purge_policy: Required[Literal["PURGE_NSUSERACTIVITY_PREVIEW_EXPORT_AND_INDEX_WITH_CACHE_STATE"]]

NativeCacheHydrationContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/native_cache_hydration_contract.schema.json",
    "source_hash": "1fe7671d934377786466e683c784b9837bf08445cb7d246143e5a030a3e86a99",
}

class NativeOperatorSecondaryWindowScene(TypedDict, total=False):
    artifact_type: Required[Literal["NativeOperatorSecondaryWindowScene"]]
    scene_id: Required[str]
    tenant_id: Required[str]
    shell_family: Required[Literal["CALM_SHELL"]]
    surface_embodiment: Required[Literal["NATIVE_OPERATOR"]]
    secondary_window_kind: Required[Literal["TWIN_COMPARE", "DRIFT_DIFF", "AUDIT_FOCUS", "EVIDENCE_PREVIEW"]]
    source_module_code: Required[Literal["TWIN_PANEL", "DRIFT_FIELD", "FOCUS_LENS", "EVIDENCE_TIDE"]]
    parent_scene_ref: Required[str]
    parent_backing_read_model_type: Required[Literal["LowNoiseExperienceFrame", "WorkspaceSnapshot"]]
    parent_object_family: Required[Literal["MANIFEST", "WORK_ITEM"]]
    parent_object_anchor_ref: Required[str]
    parent_focus_anchor_ref: Required[str]
    dominant_question: Required[str]
    interaction_layer: Required[OperatorInteractionLayer]
    cross_device_continuity_contract: Required[CrossDeviceContinuityContract]
    cache_isolation_contract: Required[CacheIsolationContract]
    native_cache_hydration_contract: Required[NativeCacheHydrationContract]
    semantic_accessibility_contract: Required[SemanticAccessibilityContract]
    window_surface_order: Required[list[JSONValue]]
    artifact_affordance: Required[ArtifactAffordanceContract]
    identity_header: Required[NativeOperatorSecondaryWindowSceneIdentityHeader]
    summary_loading: Required[NativeOperatorSecondaryWindowSceneSummaryLoading]
    focus_handoff: Required[NativeOperatorSecondaryWindowSceneFocusHandoff]
    scene_identity: Required[NativeOperatorSecondaryWindowSceneSceneIdentity]
    scene_restoration: Required[NativeOperatorSecondaryWindowSceneSceneRestoration]
    support_only_window: Required[Literal[True]]
    rendered_at: Required[ISO8601DateTimeString]

class NativeOperatorSecondaryWindowSceneIdentityHeader(TypedDict, total=False):
    parent_object_ref: Required[str]
    mounted_artifact_ref: Required[str]
    headline: Required[str]
    status_label: Required[str]
    currentness_state: Required[Literal["CURRENT_PRIMARY", "CURRENT_WITH_HISTORY_AVAILABLE", "HISTORICAL_CONTEXT"]]
    lineage_summary_ref: Required[str]

class NativeOperatorSecondaryWindowSceneSummaryLoading(TypedDict, total=False):
    summary_card_ref: Required[str]
    summary_state: Required[Literal["VISIBLE_LOADING_DETAIL", "VISIBLE_READY"]]
    detail_state: Required[Literal["LOADING", "READY"]]
    default_revision_posture: Required[Literal["CURRENT_ARTIFACT", "CURRENT_ARTIFACT_WITH_HISTORY_AVAILABLE", "CURRENT_VS_HISTORICAL_DIFF"]]
    historical_navigation_state: Required[Literal["HIDDEN_UNTIL_REQUESTED", "AVAILABLE_ON_DEMAND"]]

class NativeOperatorSecondaryWindowSceneFocusHandoff(TypedDict, total=False):
    launch_focus_anchor_ref: Required[str]
    window_focus_target: Required[Literal["IDENTITY_HEADER", "SUMMARY_CARD", "DETAIL_BODY"]]
    close_return_focus_anchor_ref: Required[str]
    parent_focus_restore_policy: Required[Literal["RETURN_TO_PARENT_FOCUS_ANCHOR"]]

class NativeOperatorSecondaryWindowSceneSceneIdentity(TypedDict, total=False):
    principal_session_lineage_ref: Required[str]
    masking_posture_fingerprint: Required[str]
    access_binding_hash_or_null: Required[str | None]
    schema_compatibility_ref: Required[str]
    stability_contract: Required[RouteStabilityContract]
    shell_stability_token: Required[str]
    route_key: Required[str]
    frame_epoch: Required[int]
    workspace_version_or_null: Required[int | None]
    manifest_id_or_null: Required[str | None]
    work_item_id_or_null: Required[str | None]
    focus_anchor_ref_or_null: Required[str | None]

class NativeOperatorSecondaryWindowSceneSceneRestoration(TypedDict, total=False):
    restoration_state: Required[Literal["RESTORABLE", "FRESH_SNAPSHOT_REQUIRED", "INVALIDATED"]]
    invalid_reason_codes: Required[list[Literal["TENANT_SWITCH", "PRIVILEGE_DOWNGRADE", "ACCESS_BINDING_CHANGE", "MASKING_CHANGE", "SESSION_REVOKED", "SCHEMA_INCOMPATIBLE", "OBJECT_GONE", "PARENT_WINDOW_CLOSED"]]]
    restoration_anchor_ref_or_null: Required[str | None]
    resume_token_ref_or_null: Required[str | None]
    focus_restoration: Required[FocusRestorationContract]

NativeOperatorSecondaryWindowSceneSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/native_operator_secondary_window_scene.schema.json",
    "source_hash": "a5b333cc1a53dfb216275f64063a6914c64d3f414cd8119b2c5270e398810610",
}

type NativeOperatorWorkspaceSceneSettlementState = Literal["STEADY", "RECEIPT_PENDING", "FRESHENING", "STALE_REVIEW_REQUIRED", "DEGRADED_READ_ONLY", "RECOVERY_REQUIRED"]

type NativeOperatorWorkspaceSceneRecoveryPosture = Literal["NONE", "INLINE_RECONNECT", "INLINE_REBASE", "READ_ONLY_LIMITED", "OBJECT_SUPERSEDED", "ACCESS_REBIND_REQUIRED"]

type NativeOperatorWorkspaceSceneDetailSurfaceCode = Literal["CONTEXT_BAR", "DECISION_SUMMARY", "ACTION_STRIP", "DETAIL_DRAWER"]

class NativeOperatorWorkspaceScene(TypedDict, total=False):
    artifact_type: Required[Literal["NativeOperatorWorkspaceScene"]]
    scene_id: Required[str]
    tenant_id: Required[str]
    shell_family: Required[Literal["CALM_SHELL"]]
    surface_embodiment: Required[Literal["NATIVE_OPERATOR"]]
    backing_read_model_type: Required[Literal["LowNoiseExperienceFrame", "WorkspaceSnapshot"]]
    backing_read_model_ref: Required[str]
    object_family: Required[Literal["MANIFEST", "WORK_ITEM"]]
    object_anchor_ref: Required[str]
    dominant_question: Required[str]
    dominance_contract: Required[ShellDominanceContract]
    state_taxonomy_contract: Required[ShellStateTaxonomyContract]
    cross_device_continuity_contract: Required[CrossDeviceContinuityContract]
    cache_isolation_contract: Required[CacheIsolationContract]
    native_cache_hydration_contract: Required[NativeCacheHydrationContract]
    semantic_accessibility_contract: Required[SemanticAccessibilityContract]
    settlement_state: Required[NativeOperatorWorkspaceSceneSettlementState]
    recovery_posture: Required[NativeOperatorWorkspaceSceneRecoveryPosture]
    interaction_layer: Required[OperatorInteractionLayer]
    surface_order: Required[list[JSONValue]]
    leading_sidebar: Required[NativeOperatorWorkspaceSceneLeadingSidebar]
    primary_canvas: Required[NativeOperatorWorkspaceScenePrimaryCanvas]
    trailing_inspector: Required[NativeOperatorWorkspaceSceneTrailingInspector]
    scene_identity: Required[NativeOperatorWorkspaceSceneSceneIdentity]
    scene_restoration: Required[NativeOperatorWorkspaceSceneSceneRestoration]
    shortcut_posture: Required[NativeOperatorWorkspaceSceneShortcutPosture]
    rendered_at: Required[ISO8601DateTimeString]

class NativeOperatorWorkspaceSceneLeadingSidebar(TypedDict, total=False):
    selection_family: Required[Literal["MANIFEST_QUEUE", "WORK_QUEUE"]]
    sidebar_collapse_state: Required[Literal["EXPANDED", "ICON_RAIL", "HIDDEN"]]
    selected_object_ref: Required[str]
    selected_focus_anchor_ref_or_null: Required[str | None]

class NativeOperatorWorkspaceScenePrimaryCanvas(TypedDict, total=False):
    surface_order: Required[list[JSONValue]]
    authoritative_action_surface_code: Required[Literal["ACTION_STRIP"]]
    mounted_object_ref: Required[str]
    focused_surface_code_or_null: Required[NativeOperatorWorkspaceSceneDetailSurfaceCode | None]

class NativeOperatorWorkspaceSceneTrailingInspector(TypedDict, total=False):
    presentation_mode: Required[Literal["DOCKED", "COLLAPSED", "DETACHED"]]
    support_surface_code: Required[Literal["DETAIL_DRAWER"]]
    bound_object_ref_or_null: Required[str | None]
    focus_anchor_ref_or_null: Required[str | None]
    detached_scene_ref_or_null: Required[str | None]
    authoritative_action_strip_present: Required[Literal[False]]

class NativeOperatorWorkspaceSceneSceneIdentity(TypedDict, total=False):
    principal_session_lineage_ref: Required[str]
    masking_posture_fingerprint: Required[str]
    access_binding_hash_or_null: Required[str | None]
    schema_compatibility_ref: Required[str]
    stability_contract: Required[RouteStabilityContract]
    shell_stability_token: Required[str]
    route_key: Required[str]
    frame_epoch: Required[int]
    workspace_version_or_null: Required[int | None]
    manifest_id_or_null: Required[str | None]
    work_item_id_or_null: Required[str | None]
    focus_anchor_ref_or_null: Required[str | None]

class NativeOperatorWorkspaceSceneSceneRestoration(TypedDict, total=False):
    restoration_state: Required[Literal["RESTORABLE", "FRESH_SNAPSHOT_REQUIRED", "INVALIDATED"]]
    invalid_reason_codes: Required[list[Literal["TENANT_SWITCH", "PRIVILEGE_DOWNGRADE", "ACCESS_BINDING_CHANGE", "MASKING_CHANGE", "SESSION_REVOKED", "SCHEMA_INCOMPATIBLE", "OBJECT_GONE"]]]
    restoration_anchor_ref_or_null: Required[str | None]
    resume_token_ref_or_null: Required[str | None]
    focus_restoration: Required[FocusRestorationContract]

class NativeOperatorWorkspaceSceneShortcutPosture(TypedDict, total=False):
    available_shortcut_codes: Required[list[JSONValue]]
    focused_region: Required[Literal["LEADING_SIDEBAR", "PRIMARY_CANVAS", "TRAILING_INSPECTOR", "DETACHED_INSPECTOR"]]
    menu_command_surface_state: Required[Literal["PRIMARY_ACTIONS_VISIBLE_AND_MIRRORED"]]
    focus_restore_policy: Required[Literal["RETURN_TO_LAST_OBJECT_ANCHOR"]]

NativeOperatorWorkspaceSceneSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/native_operator_workspace_scene.schema.json",
    "source_hash": "8437b846bcb9b095516a5850088b14e42b4b26389f456e7f262d652d7519e3a2",
}

class OperatorInteractionLayer(TypedDict, total=False):
    foundation_contract: Required[InteractionLayerFoundationContract]
    mounted_content_policy: Required[Literal["KEEP_MOUNTED_CONTENT"]]
    refresh_presentation: Required[Literal["INLINE_STATUS_ONLY"]]
    recovery_presentation: Required[Literal["INLINE_EXPLICIT_REBASE"]]
    recovery_notice_surface: Required[Literal["CONTEXT_BAR", "IDENTITY_HEADER"]]
    delta_promotion_mode: Required[Literal["COALESCE_BEFORE_PROMOTION"]]
    selector_profile: Required[Literal["OPERATOR_SEMANTIC_SELECTORS_V1"]]
    shell_continuity_policy: Required[Literal["SAME_OBJECT_SAME_SHELL_INLINE_RECOVERY"]]
    activity_partition_policy: Required[Literal["VISIBILITY_SCOPED_LANES_WITH_CURRENT_FIRST_ARTIFACTS"]]
    investigation_presentation_policy: Required[Literal["SUMMARY_FIRST_PLAIN_LANGUAGE_MODULES"]]
    secondary_window_policy: Required[Literal["SUPPORT_ONLY_PARENT_BOUND_CLOSE_RETURNS_FOCUS"]]
    notification_surface: Required[Literal["CONTEXT_BAR", "CONTEXT_BAR_WITH_SYSTEM_MIRROR", "PARENT_CONTEXT_BAR"]]
    artifact_preview_surface: Required[Literal["DETAIL_DRAWER", "SECONDARY_WINDOW_BODY"]]
    history_presentation: Required[Literal["CURRENT_PRIMARY_HISTORY_SECONDARY"]]
    motion_profile: Required[Literal["SUBTLE_CAUSAL_ONLY"]]
    unsafe_action_policy: Required[Literal["FAIL_CLOSED_DURING_DEGRADED_OR_RECOVERY"]]
    feedback_truth_policy: Required[Literal["DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN"]]

OperatorInteractionLayerSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/operator_interaction_layer.schema.json",
    "source_hash": "09c6f385e74b009d4fb76743a66f4c0596a2643a075e17940457a7ce9ffb30e9",
}

class RouteStabilityContract(TypedDict, total=False):
    route_scope_class: Required[Literal["MANIFEST_EXPERIENCE", "WORKSPACE", "CLIENT_PORTAL_ROUTE", "GOVERNANCE_ROUTE"]]
    publication_generation: Required[int]
    guard_vector_hash: Required[str]
    guard_vector_components: Required[RouteStabilityContractGuardVectorComponents]
    last_published_sequence_or_null: Required[int | None]
    resume_token_or_null: Required[str | None]
    resume_capability: Required[Literal["STREAM_RESUMABLE", "SNAPSHOT_ONLY", "ACCESS_REBIND_REQUIRED"]]

class RouteStabilityContractGuardVectorComponents(TypedDict, total=False):
    decision_bundle_hash_or_null: Required[str | None]
    shell_stability_token_or_null: Required[str | None]
    frame_epoch_or_null: Required[int | None]
    work_item_version_or_null: Required[int | None]
    customer_thread_head_or_null: Required[int | None]
    internal_thread_head_or_null: Required[int | None]
    request_state_version_or_null: Required[int | None]
    client_portal_workspace_version_or_null: Required[int | None]
    view_guard_ref_or_null: Required[str | None]
    policy_snapshot_hash_or_null: Required[str | None]
    dependency_topology_hash_or_null: Required[str | None]
    simulation_basis_hash_or_null: Required[str | None]
    mutation_basis_contract_hash_or_null: NotRequired[str | None]

RouteStabilityContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/route_stability_contract.schema.json",
    "source_hash": "ae13fc174b6924f8525c5b26fa8615663cb48634fdaa730a3f33f85bcbc72bfc",
}

type SemanticAccessibilityContractAnchorCode = Literal["SHELL_ROOT", "SHELL_FAMILY", "OBJECT_ANCHOR", "DOMINANT_QUESTION", "DOMINANT_ACTION", "SETTLEMENT_POSTURE", "RECOVERY_POSTURE", "WORKSPACE_POSTURE", "CONTEXT_BAR", "DECISION_SUMMARY", "ACTION_STRIP", "PRIMARY_ACTION", "NO_SAFE_ACTION_REASON", "DETAIL_DRAWER", "PROMOTED_SUPPORT_REGION", "LIMITATION_NOTICE", "RECOVERY_NOTICE", "ARTIFACT_HANDOFF", "ARTIFACT_STATE_LABEL", "RETURN_PATH_CONTROL", "ROUTE_TABS", "REQUEST_FOCUS", "CURRENT_ARTIFACT", "HISTORY_LIST", "SECTION_NAV", "PRIMARY_WORKLIST", "WORKSPACE_HEADER", "ATTENTION_SUMMARY", "RISK_LEDGER", "LEADING_SIDEBAR", "PRIMARY_CANVAS", "TRAILING_INSPECTOR", "IDENTITY_HEADER", "SUMMARY_CARD", "DETAIL_BODY"]

type SemanticAccessibilityContractFocusRegionCode = Literal["CONTEXT_BAR", "DECISION_SUMMARY", "ACTION_STRIP", "DETAIL_DRAWER", "PORTAL_HEADER", "STATUS_HERO", "PRIMARY_ACTION", "PROMOTED_SUPPORT_REGION", "SUPPORTING_DETAIL", "SECTION_NAV", "PRIMARY_WORKLIST", "WORKSPACE_HEADER", "ATTENTION_SUMMARY", "PROMOTED_AUXILIARY_SURFACE", "LEADING_SIDEBAR", "PRIMARY_CANVAS", "TRAILING_INSPECTOR", "IDENTITY_HEADER", "SUMMARY_CARD", "DETAIL_BODY"]

type SemanticAccessibilityContractAnnouncedChangeKind = Literal["ACTIVITY_DELTA", "BADGE_DELTA", "LIMITATION_NOTICE", "RECOVERY_NOTICE", "COMMAND_FAILURE", "TERMINAL_SETTLEMENT"]

class SemanticAccessibilityContract(TypedDict, total=False):
    contract_version: Required[Literal["SEMANTIC_ACCESSIBILITY_V1"]]
    shell_family: Required[Literal["CALM_SHELL", "CLIENT_PORTAL_SHELL", "GOVERNANCE_DENSITY_SHELL"]]
    selector_profile: Required[Literal["OPERATOR_SEMANTIC_SELECTORS_V1", "PORTAL_SEMANTIC_SELECTORS_V1", "GOVERNANCE_SEMANTIC_SELECTORS_V1"]]
    identifier_semantics_policy: Required[Literal["DOMAIN_MEANING_OVER_VISUAL_STYLING"]]
    browser_identifier_policy: Required[Literal["DATA_TESTID_MIRRORS_SEMANTIC_ANCHOR"]]
    native_identifier_policy: Required[Literal["ACCESSIBILITY_IDENTIFIER_MIRRORS_SEMANTIC_ANCHOR"]]
    landmark_structure_policy: Required[Literal["STABLE_SHELL_SUMMARY_ACTION_SUPPORT_AND_NOTICE_LANDMARKS"]]
    heading_navigation_policy: Required[Literal["PRIMARY_HEADING_AND_PROMOTED_REGION_HEADINGS"]]
    focus_order_policy: Required[Literal["VISIBLE_SEMANTIC_ORDER_ONLY"]]
    focus_entry_policy: Required[Literal["REQUESTED_ANCHOR_OR_PRIMARY_HEADING_OR_EXPLICIT_NOTICE"]]
    focus_restore_policy: Required[Literal["RETURN_TO_INVOKER_OR_LAWFUL_ANCESTOR"]]
    keyboard_completion_policy: Required[Literal["ALL_GOVERNED_ACTIONS_KEYBOARD_OPERABLE"]]
    live_update_focus_policy: Required[Literal["NEVER_STEAL_ACTIVE_INPUT_OR_PICKER_FOCUS"]]
    live_region_policy: Required[Literal["POLITE_ACTIVITY_ASSERTIVE_FAILURE_ONLY"]]
    conditional_notice_anchor_policy: Required[Literal["LIMITATION_AND_RECOVERY_NOTICES_REQUIRE_ADDRESSABLE_ANCHORS"]]
    support_region_access_policy: Required[Literal["PROMOTED_SUPPORT_REGION_KEYBOARD_REACHABLE_AND_ESCAPABLE"]]
    detail_module_access_policy: Required[Literal["SUPPORT_MODULES_KEYBOARD_AND_ASSISTIVE_TECH_REACHABLE"]]
    artifact_handoff_policy: Required[Literal["CURRENT_AND_HISTORY_ANCHORS_SEPARATE"]]
    reduced_motion_policy: Required[Literal["MEANING_PRESERVED_WITH_MINIMAL_OR_NO_MOTION"]]
    required_anchor_codes: Required[list[SemanticAccessibilityContractAnchorCode]]
    semantic_focus_order: Required[list[SemanticAccessibilityContractFocusRegionCode]]
    announced_change_kinds: Required[list[SemanticAccessibilityContractAnnouncedChangeKind]]

SemanticAccessibilityContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/semantic_accessibility_contract.schema.json",
    "source_hash": "83be304f9b057ad506807e18b1018f2274c02aa0eb32fd564931c6c4a29c567c",
}

type SemanticAccessibilityRegressionPackSurfaceType = Literal["LowNoiseExperienceFrame", "WorkspaceSnapshot", "ClientPortalWorkspace", "TenantGovernanceSnapshot", "NativeOperatorWorkspaceScene", "NativeOperatorSecondaryWindowScene"]

type SemanticAccessibilityRegressionPackShellFamily = Literal["CALM_SHELL", "CLIENT_PORTAL_SHELL", "GOVERNANCE_DENSITY_SHELL"]

type SemanticAccessibilityRegressionPackSelectorProfile = Literal["OPERATOR_SEMANTIC_SELECTORS_V1", "PORTAL_SEMANTIC_SELECTORS_V1", "GOVERNANCE_SEMANTIC_SELECTORS_V1"]

type SemanticAccessibilityRegressionPackAutomationHarness = Literal["PLAYWRIGHT", "XCUITEST"]

type SemanticAccessibilityRegressionPackModality = Literal["KEYBOARD_ONLY", "SCREEN_READER", "REDUCED_MOTION"]

type SemanticAccessibilityRegressionPackTransitionClass = Literal["RESPONSIVE_RESTACK", "REBASE", "RECONNECT", "SUPPORT_REGION_COLLAPSE", "LIVE_UPDATE", "SECONDARY_WINDOW_RETURN"]

type SemanticAccessibilityRegressionPackAnnouncementMode = Literal["POLITE", "ASSERTIVE"]

class SemanticAccessibilityRegressionPack(TypedDict, total=False):
    contract_version: Required[Literal["SEMANTIC_ACCESSIBILITY_REGRESSION_PACK_V1"]]
    pack_id: Required[str]
    deterministic_seed: Required[int]
    suite_profile: Required[Literal["CROSS_SHELL_SEMANTIC_ACCESSIBILITY_AND_ASSISTIVE_TECH_MATRIX"]]
    run_mode: Required[Literal["DETERMINISTIC_SEEDED_ENUMERATION"]]
    modality_policy: Required[Literal["EVERY_CASE_COVERS_KEYBOARD_SCREEN_READER_AND_REDUCED_MOTION"]]
    identifier_binding_policy: Required[Literal["AUTOMATION_IDENTIFIERS_MUST_EQUAL_SEMANTIC_ANCHOR_REFS"]]
    landmark_heading_policy: Required[Literal["LANDMARKS_AND_HEADINGS_MIRROR_VISIBLE_SHELL_STRUCTURE"]]
    live_update_announcement_policy: Required[Literal["DECISIVE_CHANGE_ANNOUNCED_WITHOUT_NOISE_OR_FOCUS_THEFT"]]
    support_surface_policy: Required[Literal["PROMOTED_SUPPORT_AND_DETAIL_SURFACES_REMAIN_NON_MODAL_AND_ESCAPABLE"]]
    transition_stability_policy: Required[Literal["RESPONSIVE_REBASE_RECONNECT_AND_COLLAPSE_KEEP_SEMANTIC_ANCHORS_STABLE"]]
    return_path_policy: Required[Literal["RETURN_PATH_CONTROLS_REMAIN_ADDRESSABLE_ACROSS_CONTEXTUAL_AND_SECONDARY_FLOWS"]]
    cases: Required[list[SemanticAccessibilityRegressionPackRegressionCase]]

class SemanticAccessibilityRegressionPackAnchorBinding(TypedDict, total=False):
    anchor_code: Required[str]
    semantic_anchor_ref: Required[str]
    browser_identifier_or_null: Required[str | None]
    native_identifier_or_null: Required[str | None]
    heading_level_or_null: Required[int | None]
    landmark_role_or_null: Required[str | None]

class SemanticAccessibilityRegressionPackRegressionCase(TypedDict, total=False):
    case_id: Required[str]
    surface_type: Required[SemanticAccessibilityRegressionPackSurfaceType]
    shell_family: Required[SemanticAccessibilityRegressionPackShellFamily]
    selector_profile: Required[SemanticAccessibilityRegressionPackSelectorProfile]
    automation_harness: Required[SemanticAccessibilityRegressionPackAutomationHarness]
    covered_modalities: Required[list[SemanticAccessibilityRegressionPackModality]]
    transition_classes: Required[list[SemanticAccessibilityRegressionPackTransitionClass]]
    required_anchor_codes: Required[list[str]]
    semantic_focus_order: Required[list[str]]
    announced_change_kinds: Required[list[str]]
    anchor_bindings: Required[list[SemanticAccessibilityRegressionPackAnchorBinding]]
    landmark_anchor_codes_in_order: Required[list[str]]
    heading_anchor_codes_in_order: Required[list[str]]
    focus_entry_anchor_ref: Required[str]
    keyboard_path_anchor_refs: Required[list[str]]
    screen_reader_anchor_codes_in_order: Required[list[str]]
    live_update_change_kind_or_null: Required[str | None]
    live_region_mode_or_null: Required[str | None]
    live_update_focus_theft_detected: Required[bool]
    excessive_live_noise_detected: Required[bool]
    support_surface_kind_or_null: Required[str | None]
    support_surface_keyboard_reachable: Required[bool]
    support_surface_keyboard_dismissible: Required[bool]
    support_surface_modal_trap_detected: Required[bool]
    return_path_anchor_code_or_null: Required[str | None]
    reduced_motion_semantics_preserved: Required[bool]
    reduced_motion_recovery_story_matches_default: Required[bool]

SemanticAccessibilityRegressionPackSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/semantic_accessibility_regression_pack.schema.json",
    "source_hash": "448a34f8195646d69811f038825b487582e94b3d4d8ede6ba92cde30f8fc7fe3",
}

type ShellContinuityFuzzHarnessSurfaceType = Literal["LowNoiseExperienceFrame", "WorkspaceSnapshot", "ClientPortalWorkspace", "TenantGovernanceSnapshot", "NativeOperatorWorkspaceScene", "NativeOperatorSecondaryWindowScene"]

type ShellContinuityFuzzHarnessContinuityScope = Literal["MANIFEST_ROUTE", "WORKSPACE_ROUTE", "CLIENT_PORTAL_ROUTE", "GOVERNANCE_ROUTE", "NATIVE_PRIMARY_SCENE", "NATIVE_SECONDARY_WINDOW"]

type ShellContinuityFuzzHarnessShellFamily = Literal["CALM_SHELL", "CLIENT_PORTAL_SHELL", "GOVERNANCE_DENSITY_SHELL"]

type ShellContinuityFuzzHarnessPerturbation = Literal["REBASE", "RECONNECT", "RESIZE_WIDE_TO_NARROW", "RESIZE_NARROW_TO_WIDE", "RESPONSIVE_COLLAPSE", "STREAM_CATCH_UP", "FRAME_EPOCH_ADVANCE", "NATIVE_SCENE_RESTORE", "SECONDARY_WINDOW_RESTORE"]

type ShellContinuityFuzzHarnessAssertedInvariant = Literal["SHELL_FAMILY", "ROUTE_IDENTITY", "OBJECT_ANCHOR", "DOMINANT_QUESTION", "SETTLEMENT_STATE", "ACTIVE_CONTEXT", "FOCUS_ANCHOR", "RETURN_FOCUS_ANCHOR", "DOMINANT_MEANING"]

class ShellContinuityFuzzHarness(TypedDict, total=False):
    contract_version: Required[Literal["SHELL_CONTINUITY_FUZZ_HARNESS_V1"]]
    harness_id: Required[str]
    deterministic_seed: Required[int]
    suite_profile: Required[Literal["SAME_OBJECT_SAME_SHELL_PERTURBATION_MATRIX"]]
    run_mode: Required[Literal["DETERMINISTIC_SEEDED_ENUMERATION"]]
    shrink_policy: Required[Literal["REMOVE_NONESSENTIAL_PERTURBATIONS_KEEP_FIRST_BREAK"]]
    coverage_policy: Required[Literal["BROWSER_AND_NATIVE_COVERAGE_REQUIRED"]]
    continuity_invariant_policy: Required[Literal["SHELL_ROUTE_OBJECT_QUESTION_MODULE_FOCUS_STABLE_WHEN_LAWFUL"]]
    inline_recovery_policy: Required[Literal["INLINE_TYPED_RECOVERY_INSTEAD_OF_SILENT_REMOUNT"]]
    action_meaning_policy: Required[Literal["DOMINANT_MEANING_STABLE_WITHOUT_TRUTH_CHANGE"]]
    native_return_policy: Required[Literal["SECONDARY_AND_RESTORED_SCENES_RETURN_TO_PARENT_ANCHOR"]]
    cases: Required[list[ShellContinuityFuzzHarnessFuzzCase]]

class ShellContinuityFuzzHarnessStateSnapshot(TypedDict, total=False):
    route_identity_ref: Required[str]
    canonical_object_ref: Required[str]
    shell_family: Required[ShellContinuityFuzzHarnessShellFamily]
    dominant_question: Required[str]
    dominant_meaning_ref_or_null: Required[str | None]
    settlement_state_or_null: Required[str | None]
    recovery_posture_or_null: Required[str | None]
    active_context_ref_or_null: Required[str | None]
    focus_anchor_ref_or_null: Required[str | None]
    return_focus_anchor_ref_or_null: Required[str | None]

class ShellContinuityFuzzHarnessFuzzCase(TypedDict, total=False):
    case_id: Required[str]
    surface_type: Required[ShellContinuityFuzzHarnessSurfaceType]
    continuity_scope: Required[ShellContinuityFuzzHarnessContinuityScope]
    shell_family: Required[ShellContinuityFuzzHarnessShellFamily]
    truth_change_detected: Required[bool]
    perturbations: Required[list[ShellContinuityFuzzHarnessPerturbation]]
    shrink_sequence: Required[list[ShellContinuityFuzzHarnessPerturbation]]
    expected_outcome: Required[Literal["PRESERVED", "INLINE_RECOVERY"]]
    expected_inline_recovery_reason_or_null: Required[str | None]
    asserted_invariants: Required[list[ShellContinuityFuzzHarnessAssertedInvariant]]
    pre_state: Required[ShellContinuityFuzzHarnessStateSnapshot]
    post_state: Required[ShellContinuityFuzzHarnessStateSnapshot]

ShellContinuityFuzzHarnessSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/shell_continuity_fuzz_harness.schema.json",
    "source_hash": "d8b67626c4ad07ba4152195744702c3579235d468bcf22cdc379f1f60dc9cf51",
}

type ShellDominanceContractSurfaceCode = Literal["CONTEXT_BAR", "DECISION_SUMMARY", "ACTION_STRIP", "DETAIL_DRAWER", "STATUS_HERO", "TASK_QUEUE", "DOCUMENT_CENTER", "APPROVAL_CENTER", "STEP_WORKSPACE", "SUPPORT_PANEL", "LIMITATION_NOTICE", "DRAFT_RESUME", "ATTENTION_SUMMARY", "WORKSPACE_CANVAS", "AUDIT_SIDECAR", "BLAST_RADIUS_PANEL", "DIFF_PANEL", "EXPORT_ELIGIBILITY_PANEL", "APPROVAL_PANEL", "PRIMARY_CANVAS", "TRAILING_INSPECTOR"]

type ShellDominanceContractSupportSurfaceCode = Literal["DETAIL_DRAWER", "SUPPORT_PANEL", "LIMITATION_NOTICE", "DRAFT_RESUME", "AUDIT_SIDECAR", "BLAST_RADIUS_PANEL", "DIFF_PANEL", "EXPORT_ELIGIBILITY_PANEL", "APPROVAL_PANEL", "TRAILING_INSPECTOR"]

class ShellDominanceContract(TypedDict, total=False):
    contract_version: Required[Literal["SHELL_DOMINANCE_V1"]]
    summary_action_alignment_policy: Required[Literal["SAME_DOMINANT_QUESTION"]]
    dominant_question_surface_code: Required[ShellDominanceContractSurfaceCode]
    dominant_action_surface_code: Required[ShellDominanceContractSurfaceCode]
    dominant_action_ref_or_null: Required[str | None]
    safe_action_state: Required[Literal["ACTION_AVAILABLE", "NO_SAFE_ACTION"]]
    promoted_support_surface_code_or_null: Required[ShellDominanceContractSupportSurfaceCode | None]
    support_surface_role: Required[Literal["NONE", "SUBORDINATE", "INVESTIGATION", "RECOVERY"]]
    supplemental_queue_policy: Required[Literal["NOT_APPLICABLE", "PRIMARY_ACTION_MIRROR_ONLY", "SECONDARY_TO_PRIMARY_ACTION"]]
    parallel_primary_posture: Required[Literal["DISALLOWED"]]
    explicit_multifocus_mode: Required[Literal["DEFAULT", "COMPARE", "AUDIT"]]
    renderer_salience_policy: Required[Literal["SERVER_AUTHORED_ONLY"]]
    responsive_collapse_policy: Required[Literal["PRESERVE_DOMINANT_SUMMARY_AND_ACTION"]]
    detached_support_policy: Required[Literal["SUPPORT_ONLY_NEVER_PRIMARY"]]

ShellDominanceContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/shell_dominance_contract.schema.json",
    "source_hash": "dc69c82897d2e421cd337c3a719e8ea924fafbc739178aa535e3916dc71e4fa0",
}

class ShellStateTaxonomyContract(TypedDict, total=False):
    contract_version: Required[Literal["SHELL_STATE_TAXONOMY_V1"]]
    current_empty_state_or_null: Required[Literal["NOT_REQUESTED", "NOT_YET_MATERIALIZED", "LIMITED", "NOT_APPLICABLE", None]]
    current_empty_surface_code_or_null: Required[Literal["CONTEXT_BAR", "DECISION_SUMMARY", "DETAIL_DRAWER", "STATUS_HERO", "TASK_QUEUE", "DOCUMENT_CENTER", "APPROVAL_CENTER", "STEP_WORKSPACE", "SUPPORT_PANEL", "LIMITATION_NOTICE", "ATTENTION_SUMMARY", "PRIMARY_CANVAS", "TRAILING_INSPECTOR", None]]
    limitation_reason_codes: Required[list[str]]
    current_settlement_state: Required[Literal["STEADY", "RECEIPT_PENDING", "FRESHENING", "STALE_REVIEW_REQUIRED", "DEGRADED_READ_ONLY", "RECOVERY_REQUIRED"]]
    current_recovery_posture: Required[Literal["NONE", "INLINE_RECONNECT", "INLINE_REBASE", "READ_ONLY_LIMITED", "OBJECT_SUPERSEDED", "ACCESS_REBIND_REQUIRED"]]
    mounted_context_state: Required[Literal["PRESERVED", "INLINE_REFRESH", "READ_ONLY_PRESERVED", "INLINE_RECOVERY", "SUPERSEDED"]]
    generic_placeholder_policy: Required[Literal["FORBID_GENERIC_EMPTY_SPINNER_WARNING"]]
    loading_strategy: Required[Literal["INLINE_PRESERVE_PRIOR_CONTENT"]]
    limitation_reason_policy: Required[Literal["LIMITED_REQUIRES_EXPLICIT_REASON_CODES"]]
    stale_action_policy: Required[Literal["STALE_DEGRADED_AND_RECOVERY_REQUIRE_NO_SAFE_ACTION"]]
    recovery_navigation_policy: Required[Literal["PRESERVE_CURRENT_OBJECT_UNLESS_SUPERSEDED"]]
    profile_copy_policy: Required[Literal["PROFILE_COPY_MUST_MAP_TO_SHARED_TAXONOMY"]]

ShellStateTaxonomyContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/shell_state_taxonomy_contract.schema.json",
    "source_hash": "307e14e9eb39a2ad49c092cbc24d9a9ddf5fffb5b85f126647549f9ce3238e6e",
}

class WorkspaceCursor(TypedDict, total=False):
    artifact_type: Required[Literal["WorkspaceCursor"]]
    cursor_scope_class: Required[Literal["WORKSPACE"]]
    cursor_id: Required[str]
    tenant_id: Required[str]
    principal_ref: Required[str]
    principal_class: Required[str]
    item_id: Required[str]
    workspace_route_key: Required[str]
    session_visibility_class: Required[Literal["STAFF_FULL", "CUSTOMER_VISIBLE"]]
    shell_stability_token: Required[str]
    session_ref: Required[str]
    session_binding_hash: Required[str]
    access_binding_hash: Required[str]
    masking_posture_fingerprint: Required[str]
    frame_epoch: Required[int]
    workspace_version: Required[int]
    customer_head_sequence: Required[int]
    internal_head_sequence_or_null: Required[int | None]
    request_state_version_or_null: Required[int | None]
    last_ack_sequence: Required[int]
    last_published_sequence: Required[int]
    latest_snapshot_ref: Required[str]
    resume_token_hash: Required[str]
    stream_recovery_contract: Required[StreamRecoveryContract]
    native_cache_hydration_contract: Required[NativeCacheHydrationContract]
    stability_contract: Required[RouteStabilityContract]
    replacement_stability_contract_or_null: Required[RouteStabilityContract | None]
    cursor_state: Required[Literal["LIVE", "REBASED", "CLOSED", "REVOKED", "EXPIRED"]]
    schema_compatibility_ref: Required[str]
    replacement_snapshot_ref: Required[str | None]
    invalidation_reason_code: Required[Literal["FRAME_EPOCH_ADVANCED", "HISTORY_COMPACTED", "SHELL_STABILITY_CHANGED", "ROUTE_CONTEXT_CHANGED", "SESSION_REVOKED", "SESSION_BINDING_CHANGED", "ACCESS_BINDING_CHANGED", "MASKING_POSTURE_CHANGED", "SCHEMA_INCOMPATIBLE", "TENANT_SWITCHED", "PRINCIPAL_CLASS_CHANGED", "CURSOR_TTL_ELAPSED", "CLIENT_CLOSED", None]]
    invalidated_at: Required[ISO8601DateTimeString]
    last_seen_at: Required[ISO8601DateTimeString]
    expires_at: Required[ISO8601DateTimeString]

WorkspaceCursorSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/workspace_cursor.schema.json",
    "source_hash": "5d5637c30712f2619950628f5fcdf541199d959b3ac62e4c51e93192dfaa034d",
}

SurfaceAndExperienceBindingManifest = {"family_ref": "SURFACE_AND_EXPERIENCE", "schema_count": 26}
