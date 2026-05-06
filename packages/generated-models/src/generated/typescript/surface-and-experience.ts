/* DO NOT EDIT: generated downstream from packages/contracts-core. */
import type { ExactDecimalString, ISO8601DateTimeString, JsonValue } from "./primitives";

export type ActionStripState = {
  "artifact_type": "ActionStripState";
  "surface_code": "ACTION_STRIP";
  "source_module_code": "WORKFLOW_CHOREOGRAPHER";
  "actionability_state": "ACTION_AVAILABLE" | "NO_SAFE_ACTION";
  "mode_safety_posture": "LIVE_COMPLIANCE_MUTATIONS_ALLOWED" | "NON_LIVE_MUTATIONS_FORBIDDEN";
  "primary_action": ActionStripStateAction | null;
  "secondary_actions": Array<ActionStripStateAction>;
  "available_action_codes": Array<string>;
  "blocked_action_codes": Array<string>;
  "ownership_posture": "SELF" | "HUMAN_REVIEW" | "APPROVAL_REQUIRED" | "AUTHORITY_WAIT" | "CUSTOMER_WAIT" | "SYSTEM_WAIT" | "NONE";
  "ownership_label": string | null;
  "waiting_on_label": string | null;
  "blocking_reason": string | null;
  "no_safe_action_reason_code": string | null;
  "machine_reason_codes": Array<string>;
  "investigation_entry_point": ActionStripStateDetailModuleCode | null;
  "suggested_detail_surface_code": ActionStripStateDetailModuleCode | null;
  "active_detail_surface_code": ActionStripStateDetailModuleCode | null;
  "focus_anchor_ref": string | null;
  "primary_action_score": number;
  "runner_up_action_score": number;
  "dominance_margin": number;
  "suppressed_secondary_count": number;
  "full_text_ref": string;
};
export const ActionStripStateSchemaLineage = { schemaId: "https://taxat.dev/schemas/action_strip_state.schema.json", sourceHash: "c234d4ddcbc3cffd75eefe529dc0c734e3c7ebf9d67ff2a737dc7ba94d839559" } as const;

export type ActionStripStateDetailModuleCode = "EVIDENCE_TIDE" | "PACKET_FORGE" | "AUTHORITY_TUNNEL" | "DRIFT_FIELD" | "FOCUS_LENS" | "TWIN_PANEL";

export type ActionStripStateAction = {
  "action_code": string;
  "label": string;
  "action_kind": "AUTHORITY_MUTATION" | "FILING_MUTATION" | "APPROVAL_MUTATION" | "OVERRIDE_MUTATION" | "INVESTIGATE" | "COMPARE" | "EXPORT" | "REQUEST_REVIEW" | "REFRESH";
  "target_object_ref": string | null;
  "target_detail_surface_code": ActionStripStateDetailModuleCode | null;
  "requires_live_freshness": boolean;
  "mutation_precondition_binding_or_null": MutationPreconditionBinding | null;
};

export type ContextBarState = {
  "artifact_type": "ContextBarState";
  "surface_code": "CONTEXT_BAR";
  "source_module_code": "MANIFEST_RIBBON";
  "manifest_label": string;
  "period_label": string;
  "scope_label": string;
  "phase_label": string;
  "freshness_state": "FRESH" | "STALE" | "CATCHING_UP" | "DEGRADED";
  "truth_origin": "LOCAL_INTENT" | "PERSISTED_STATE" | "AUTHORITY_ARTIFACT" | "OUT_OF_BAND_DISCOVERY";
  "connection_state": "CONNECTED" | "RECONNECTING" | "CATCHING_UP" | "STALE" | "DEGRADED";
  "owner_handoff_posture": "UNASSIGNED" | "OWNED" | "HANDOFF_PENDING" | "WAITING_ON_CUSTOMER" | "WAITING_ON_AUTHORITY" | "WAITING_ON_REVIEW" | "WAITING_ON_APPROVAL";
  "owner_label": string | null;
  "mode_posture": "LIVE_COMPLIANCE" | "ANALYSIS_ONLY" | "REPLAY_ONLY" | "MASKED_LIMITED" | "READ_ONLY";
  "limitation_statement": string | null;
  "full_text_ref": string;
};
export const ContextBarStateSchemaLineage = { schemaId: "https://taxat.dev/schemas/context_bar_state.schema.json", sourceHash: "d4d16da7d94a1046bb5b8686f9be4bdce4764cc6f6f5988439253342b1fa3588" } as const;

export type CrossDeviceContinuityContract = {
  "contract_version": "CROSS_DEVICE_CONTINUITY_V1";
  "continuity_scope": "MANIFEST_ROUTE" | "WORKSPACE_ROUTE" | "CLIENT_PORTAL_ROUTE" | "WORK_ITEM_NOTIFICATION" | "NATIVE_PRIMARY_SCENE" | "NATIVE_SECONDARY_WINDOW" | "GOVERNANCE_ROUTE";
  "canonical_object_ref": string;
  "shell_family": "CALM_SHELL" | "CLIENT_PORTAL_SHELL" | "GOVERNANCE_DENSITY_SHELL";
  "route_identity_ref": string;
  "parent_context_ref_or_null": string | null;
  "focus_anchor_ref_or_null": string | null;
  "return_focus_anchor_ref_or_null": string | null;
  "dominant_action_state_or_null": "ACTION_AVAILABLE" | "NO_SAFE_ACTION" | null;
  "stability_guard_hash_or_null": string | null;
  "access_scope_hash_or_null": string | null;
  "masking_scope_fingerprint_or_null": string | null;
  "session_scope_ref_or_null": string | null;
  "visibility_cache_partition_key_or_null": string | null;
  "allowed_embodiments": Array<"BROWSER_WIDE" | "BROWSER_NARROW_STACKED" | "NATIVE_PRIMARY_SCENE" | "NATIVE_SUPPORT_WINDOW">;
  "same_object_policy": "PRESERVE_EXACT_OBJECT_OR_EXPLICIT_LAWFUL_FALLBACK";
  "same_shell_policy": "PRESERVE_SAME_SHELL_FAMILY";
  "narrow_layout_policy": "STACK_WITHIN_SAME_SHELL" | "NOT_APPLICABLE";
  "deep_link_return_policy": "EXPLICIT_PARENT_CONTEXT_AND_FOCUS";
  "action_posture_policy": "DOMINANCE_AND_SETTLEMENT_SERVER_AUTHORED_ONLY";
  "hydration_compatibility_policy": "TENANT_ACCESS_MASKING_AND_SESSION_BOUND";
  "compatibility_basis_class": "ROUTE_GUARD_ONLY" | "ROUTE_GUARD_AND_VISIBILITY" | "VISIBILITY_ONLY" | "SESSION_MASKING_AND_ROUTE_GUARD" | "SESSION_MASKING_AND_PARENT_SCENE";
  "restoration_mode_policy": "EXPLICIT_CARRY_FORWARD_OR_REBASE_ONLY";
  "secondary_window_policy": "NOT_APPLICABLE" | "SUPPORT_ONLY_PARENT_BOUND";
  "supported_invalidation_reason_codes": Array<"TENANT_SWITCH" | "PRIVILEGE_DOWNGRADE" | "ACCESS_BINDING_CHANGE" | "MASKING_CHANGE" | "VIEW_GUARD_CHANGE" | "SESSION_REVOKED" | "SCHEMA_INCOMPATIBLE" | "OBJECT_GONE" | "PARENT_WINDOW_CLOSED" | "POLICY_SNAPSHOT_CHANGE">;
};
export const CrossDeviceContinuityContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/cross_device_continuity_contract.schema.json", sourceHash: "62be8c89a0d472a84eb5b3fca1ba4603ed3aad667048382a337c40707973ce83" } as const;

export type DecisionSummaryState = {
  "artifact_type": "DecisionSummaryState";
  "surface_code": "DECISION_SUMMARY";
  "source_module_codes": Array<JsonValue>;
  "headline": string;
  "primary_issue_ref": string | null;
  "attention_state": "CALM" | "NOTICE" | "REVIEW" | "BLOCKED" | "WAITING" | "LIMITED";
  "visible_warning_count": number;
  "visible_reasons": Array<DecisionSummaryStateVisibleReason>;
  "additional_reason_count": number;
  "plain_explanation": string;
  "uncertainty_statement": string | null;
  "limitation_state": "NONE" | "NOT_REQUESTED" | "NOT_YET_MATERIALIZED" | "LIMITED" | "NOT_APPLICABLE";
  "state_reason_code_or_null": "REQUEST_NOT_TRIGGERED" | "MATERIALIZATION_PENDING" | "NOT_APPLICABLE_TO_CONTEXT" | null;
  "limitation_reason_codes": Array<string>;
  "limitation_statement": string | null;
  "blocking_reason": string | null;
  "machine_reason_codes": Array<string>;
  "full_text_ref": string;
};
export const DecisionSummaryStateSchemaLineage = { schemaId: "https://taxat.dev/schemas/decision_summary_state.schema.json", sourceHash: "0a38e778b730005dd065ea63a6a3bdf581bec00b88518b0611d9f43379d428de" } as const;

export type DecisionSummaryStateVisibleReason = {
  "reason_code": string;
  "label": string;
  "severity": "NOTICE" | "REVIEW" | "BLOCKED" | "WAITING" | "LIMITED";
};

export type DetailDrawerState = {
  "entry_points"?: JsonValue;
} & {
  "entry_points"?: JsonValue;
} & {
  "entry_points"?: JsonValue;
} & {
  "entry_points"?: JsonValue;
} & {
  "entry_points"?: JsonValue;
} & {
  "entry_points"?: JsonValue;
};
export const DetailDrawerStateSchemaLineage = { schemaId: "https://taxat.dev/schemas/detail_drawer_state.schema.json", sourceHash: "73dfa5a384deca11fc8f136b73ddad3e76ed10bbc9504dce8e2b946608d2d940" } as const;

export type DetailDrawerStateDetailModuleCode = "EVIDENCE_TIDE" | "PACKET_FORGE" | "AUTHORITY_TUNNEL" | "DRIFT_FIELD" | "FOCUS_LENS" | "TWIN_PANEL";

export type DetailDrawerStateDetailEntry = {
  "module_code": DetailDrawerStateDetailModuleCode;
  "entry_label": string;
  "semantic_view_kind": "CAUSAL_EVIDENCE_TRACE" | "FILING_PACKET_BINDING" | "AUTHORITY_SEQUENCE_STATUS" | "BASELINE_CHANGE_INTERPRETATION" | "AUDIT_NEIGHBORHOOD_TRACE" | "COMPUTED_VS_AUTHORITY_COMPARISON";
  "plain_language_summary": string;
  "entry_reason": string | null;
  "content_state": "POPULATED" | "NOT_REQUESTED" | "NOT_YET_MATERIALIZED" | "LIMITED" | "NOT_APPLICABLE";
  "state_reason_code_or_null": "REQUEST_NOT_TRIGGERED" | "MATERIALIZATION_PENDING" | "NOT_APPLICABLE_TO_CONTEXT" | null;
  "limitation_reason_codes": Array<string>;
  "anchorable_object_refs": Array<string>;
};

export type ExperienceCursor = {
  "artifact_type": "ExperienceCursor";
  "cursor_scope_class": "MANIFEST_EXPERIENCE";
  "cursor_id": string;
  "tenant_id": string;
  "principal_ref": string;
  "principal_class": string;
  "manifest_id": string;
  "shell_route_key": string;
  "shell_stability_token": string;
  "session_ref": string;
  "session_binding_hash": string;
  "access_binding_hash": string;
  "frame_epoch": number;
  "last_ack_sequence": number;
  "last_published_sequence": number;
  "latest_snapshot_ref": string;
  "resume_token_hash": string;
  "stream_recovery_contract": StreamRecoveryContract;
  "native_cache_hydration_contract": NativeCacheHydrationContract & {
    "hydration_scope_class"?: "EXPERIENCE_CURSOR";
  };
  "truth_boundary_contract": CommandTruthBoundaryContract & {
    "artifact_role"?: "READ_SIDE_PROJECTION";
    "authoritative_record_families"?: ["RUN_MANIFEST","GATE_DECISION_RECORD","WORKFLOW_ITEM","AUTHORITY_INTERACTION_RECORD","AUDIT_EVENT"];
    "observable_projection_families"?: [];
  };
  "stability_contract": RouteStabilityContract & {
    "route_scope_class"?: "MANIFEST_EXPERIENCE";
    "guard_vector_components"?: {
      "decision_bundle_hash_or_null"?: string;
      "shell_stability_token_or_null"?: string;
      "frame_epoch_or_null"?: number;
      "work_item_version_or_null"?: null;
      "customer_thread_head_or_null"?: null;
      "internal_thread_head_or_null"?: null;
      "request_state_version_or_null"?: null;
      "client_portal_workspace_version_or_null"?: null;
      "view_guard_ref_or_null"?: null;
    };
    "last_published_sequence_or_null"?: number;
    "resume_capability"?: "STREAM_RESUMABLE";
  };
  "replacement_stability_contract_or_null": RouteStabilityContract & {
    "route_scope_class"?: "MANIFEST_EXPERIENCE";
    "guard_vector_components"?: {
      "decision_bundle_hash_or_null"?: string;
      "shell_stability_token_or_null"?: string;
      "frame_epoch_or_null"?: number;
      "work_item_version_or_null"?: null;
      "customer_thread_head_or_null"?: null;
      "internal_thread_head_or_null"?: null;
      "request_state_version_or_null"?: null;
      "client_portal_workspace_version_or_null"?: null;
      "view_guard_ref_or_null"?: null;
    };
    "last_published_sequence_or_null"?: number;
    "resume_capability"?: "STREAM_RESUMABLE";
  } | null;
  "cursor_state": "LIVE" | "REBASED" | "CLOSED" | "REVOKED" | "EXPIRED";
  "masking_posture_hash": string;
  "schema_compatibility_ref": string;
  "replacement_snapshot_ref": string | null;
  "invalidation_reason_code": "FRAME_EPOCH_ADVANCED" | "HISTORY_COMPACTED" | "SHELL_STABILITY_CHANGED" | "SESSION_REVOKED" | "SESSION_BINDING_CHANGED" | "ACCESS_BINDING_CHANGED" | "MASKING_POSTURE_CHANGED" | "SCHEMA_INCOMPATIBLE" | "TENANT_SWITCHED" | "PRINCIPAL_CLASS_CHANGED" | "CURSOR_TTL_ELAPSED" | "CLIENT_CLOSED" | null;
  "invalidated_at": ISO8601DateTimeString;
  "last_seen_at": ISO8601DateTimeString;
  "expires_at": ISO8601DateTimeString;
};
export const ExperienceCursorSchemaLineage = { schemaId: "https://taxat.dev/schemas/experience_cursor.schema.json", sourceHash: "60057dfc5655cd1617426dacc34a92af2c5697b24a1ef6f3ab302d6ef92ceb22" } as const;

export type ExperienceDelta = {
  "manifest_id": string;
  "experience_sequence": number;
  "frame_epoch": number;
  "delivery_class": "LIVE" | "CATCH_UP" | "SNAPSHOT";
  "shell_route_key": string;
  "posture_state": "STREAMING" | "FROZEN" | "CONTAINED" | "BRIDGED" | "FRACTURED";
  "semantic_motion": "ORBIT" | "TRACE" | "SEAL" | "RIPPLE" | "BRIDGE" | "FRACTURE" | "ECHO";
  "cause_ref": string;
  "connection_state"?: "CONNECTED" | "RECONNECTING" | "CATCHING_UP" | "STALE" | "DEGRADED" | null;
  "activity_state"?: "IDLE" | "STREAMING" | "WAITING_ON_HUMAN" | "WAITING_ON_AUTHORITY" | "WAITING_ON_LATE_DATA" | "RECONNECTING" | "REPLAYING" | null;
  "truth_state"?: "LOCAL_INTENT_ONLY" | "PERSISTED_INTERNAL" | "AUTHORITY_PENDING" | "AUTHORITY_CONFIRMED" | "AUTHORITY_REJECTED" | "AUTHORITY_UNKNOWN" | "AUTHORITY_OUT_OF_BAND" | null;
  "checkpoint_state"?: "NONE" | "SOURCE_COLLECTION" | "PROJECTION_PENDING" | "HUMAN_REVIEW" | "APPROVAL_PENDING" | "AUTHORITY_PREFLIGHT" | "TRANSMIT_PENDING" | "PENDING_ACK" | "RECONCILIATION_PENDING" | "LATE_DATA_PENDING" | "CONFIRMED" | "REJECTED" | "UNKNOWN" | "OUT_OF_BAND" | null;
  "truth_origin"?: "LOCAL_INTENT" | "PERSISTED_STATE" | "AUTHORITY_ARTIFACT" | "OUT_OF_BAND_DISCOVERY" | null;
  "truth_boundary_contract": CommandTruthBoundaryContract & {
    "artifact_role"?: "READ_SIDE_PROJECTION";
    "authoritative_record_families"?: ["RUN_MANIFEST","GATE_DECISION_RECORD","WORKFLOW_ITEM","AUTHORITY_INTERACTION_RECORD","AUDIT_EVENT"];
    "observable_projection_families"?: [];
  };
  "experience_profile": "LOW_NOISE";
  "attention_state"?: "CALM" | "NOTICE" | "REVIEW" | "BLOCKED" | "WAITING" | "LIMITED" | null;
  "primary_object_ref"?: string | null;
  "actionability_state": "ACTION_AVAILABLE" | "NO_SAFE_ACTION";
  "primary_action_code"?: string | null;
  "no_safe_action_reason_code"?: string | null;
  "secondary_notice_count"?: number | null;
  "detail_entry_points"?: Array<ExperienceDeltaDetailModuleCode>;
  "suggested_detail_surface_code"?: ExperienceDeltaDetailModuleCode | null;
  "attention_policy": ExperienceDeltaAttentionPolicy;
  "cognitive_budget": ExperienceDeltaCognitiveBudget;
  "active_detail_surface_code"?: ExperienceDeltaDetailModuleCode | null;
  "focus_anchor_ref": string | null;
  "shell_stability_token": string | null;
  "next_checkpoint_at"?: ISO8601DateTimeString;
  "checkpoint_reason"?: string | null;
  "plain_reason"?: string | null;
  "blocked_action_codes"?: Array<string>;
  "affected_object_refs": Array<string>;
  "affected_surface_codes": Array<ExperienceDeltaLowNoiseSurfaceCode>;
  "occurred_at": ISO8601DateTimeString;
  "surface_updates": Array<ExperienceDeltaSurfaceUpdate>;
  "resume_token"?: string | null;
  "is_terminal"?: boolean;
};
export const ExperienceDeltaSchemaLineage = { schemaId: "https://taxat.dev/schemas/experience_delta.schema.json", sourceHash: "ef74b4f037aa98d644513856236ba44c1c6518ee738edbfd87b71c1b41a068ec" } as const;

export type ExperienceDeltaSurfaceCode = "CONTEXT_BAR" | "DECISION_SUMMARY" | "ACTION_STRIP" | "DETAIL_DRAWER" | "SCOPE_COMPOSER" | "PULSE_SPINE" | "MANIFEST_RIBBON" | "HANDOFF_BATON" | "DECISION_STAGE" | "CONSEQUENCE_RAIL" | "DECISION_CONSTELLATION" | "GATE_LATTICE" | "TRUST_PRISM" | "WORKFLOW_CHOREOGRAPHER" | "EVIDENCE_TIDE" | "PACKET_FORGE" | "AUTHORITY_TUNNEL" | "DRIFT_FIELD" | "FOCUS_LENS" | "TWIN_PANEL";

export type ExperienceDeltaLowNoiseSurfaceCode = "CONTEXT_BAR" | "DECISION_SUMMARY" | "ACTION_STRIP" | "DETAIL_DRAWER";

export type ExperienceDeltaDetailModuleCode = "EVIDENCE_TIDE" | "PACKET_FORGE" | "AUTHORITY_TUNNEL" | "DRIFT_FIELD" | "FOCUS_LENS" | "TWIN_PANEL";

export type ExperienceDeltaAttentionPolicy = {
  "policy_version": string;
  "attention_state": "CALM" | "NOTICE" | "REVIEW" | "BLOCKED" | "WAITING" | "LIMITED";
  "primary_surface_code": ExperienceDeltaLowNoiseSurfaceCode;
  "primary_object_ref": string | null;
  "actionability_state": "ACTION_AVAILABLE" | "NO_SAFE_ACTION";
  "primary_action_code": string | null;
  "no_safe_action_reason_code": string | null;
  "secondary_notice_count": number;
  "detail_entry_points": Array<ExperienceDeltaDetailModuleCode>;
  "ranking_basis": Array<string>;
  "suggested_detail_surface_code": ExperienceDeltaDetailModuleCode | null;
  "primary_rank_score": number;
  "runner_up_rank_score": number;
  "dominance_margin": number;
  "default_detail_module_code": ExperienceDeltaDetailModuleCode | null;
  "visible_warning_count": number;
};

export type ExperienceDeltaCognitiveBudget = {
  "persistent_surface_limit": 4;
  "concurrent_primary_limit": 1;
  "primary_reason_limit": 3;
  "secondary_action_limit": 2;
  "visible_warning_limit": 1;
  "detail_entry_point_limit": 5;
  "expanded_detail_module_limit": 1;
  "visibility_budget_units": 12;
  "prominent_motion_limit": 1;
  "issue_dominance_min_margin": 12;
  "action_dominance_min_margin": 15;
  "primary_rank_hysteresis": 8;
  "non_material_rank_swap_limit": 1;
  "non_material_continuity_cost_limit": 6;
  "refresh_coalescing_window_ms": 1500;
  "refresh_burst_visible_change_limit": 2;
};

export type ExperienceDeltaEmptyStateKind = "NONE" | "NOT_REQUESTED" | "NOT_YET_MATERIALIZED" | "LIMITED" | "NOT_APPLICABLE";

export type ExperienceDeltaReasonItem = {
  "reason_code": string;
  "label": string;
};

export type ExperienceDeltaContextBarPayload = {
  "manifest_label": string;
  "period_label": string;
  "scope_label": string;
  "phase_label": string;
  "freshness_label": string;
  "truth_origin_label": string;
  "connection_label": string;
  "owner_label"?: string | null;
  "mode_label"?: string | null;
  "limitation_label"?: string | null;
};

export type ExperienceDeltaDecisionSummaryPayload = {
  "headline": string;
  "primary_issue_state": "CALM" | "NOTICE" | "REVIEW" | "BLOCKED" | "WAITING" | "LIMITED";
  "reason_items": Array<ExperienceDeltaReasonItem>;
  "additional_reason_count": number;
  "uncertainty_statement": string | null;
  "plain_explanation": string;
  "empty_state_kind": ExperienceDeltaEmptyStateKind;
};

export type ExperienceDeltaActionToken = {
  "action_code": string;
  "label": string;
  "ownership_label"?: string | null;
};

export type ExperienceDeltaActionStripPayload = {
  "action_state": "ACTIONABLE" | "WAITING" | "NO_SAFE_ACTION";
  "primary_action": ExperienceDeltaActionToken | null;
  "secondary_actions": Array<ExperienceDeltaActionToken>;
  "ownership_label": string | null;
  "waiting_on_label": string | null;
  "blocking_reason": string | null;
  "investigation_entry_point": ExperienceDeltaDetailModuleCode | null;
};

export type ExperienceDeltaDetailModule = {
  "module_code": ExperienceDeltaDetailModuleCode;
  "entry_label": string;
  "entry_reason": string;
  "module_state": "READY" | "LIMITED" | "EMPTY" | "MATERIALIZING";
  "available_action_codes"?: Array<string>;
};

export type ExperienceDeltaDetailDrawerPayload = {
  "modules"?: JsonValue;
} & {
  "modules"?: JsonValue;
} & {
  "modules"?: JsonValue;
} & {
  "modules"?: JsonValue;
} & {
  "modules"?: JsonValue;
} & {
  "modules"?: JsonValue;
};

export type ExperienceDeltaSurfaceUpdate = {
  "surface_code": ExperienceDeltaLowNoiseSurfaceCode;
  "surface_version": number;
  "patch_kind": "UPSERT_OBJECT" | "REPLACE_FRAGMENT" | "APPEND_EVENT" | "REMOVE_OBJECT" | "NOOP";
  "surface_lifecycle_state": "UNBORN" | "MATERIALIZING" | "STABLE" | "UPDATING" | "SUPERSEDED" | "LIMITED";
  "plain_reason"?: string | null;
  "available_action_codes"?: Array<string>;
  "blocked_action_codes"?: Array<string>;
  "affected_object_refs"?: Array<string>;
  "last_material_change_at"?: ISO8601DateTimeString;
  "freshness_age"?: number | null;
  "limited_by"?: Array<string>;
  "default_visibility"?: "VISIBLE" | "COLLAPSED" | "HIDDEN";
  "attention_tier"?: "PRIMARY" | "SECONDARY" | "CONTEXTUAL" | "INVESTIGATIVE";
  "summary_rank"?: number;
  "payload": { [key: string]: never };
};

export type ExperienceDeltaExperienceFrame = {
  "manifest_id": string;
  "frame_epoch": number;
  "shell_route_key": string;
  "experience_profile": "LOW_NOISE";
  "attention_state": "CALM" | "NOTICE" | "REVIEW" | "BLOCKED" | "WAITING" | "LIMITED";
  "primary_object_ref"?: string | null;
  "actionability_state": "ACTION_AVAILABLE" | "NO_SAFE_ACTION";
  "primary_action_code"?: string | null;
  "no_safe_action_reason_code"?: string | null;
  "detail_entry_points": Array<ExperienceDeltaDetailModuleCode>;
  "suggested_detail_surface_code"?: ExperienceDeltaDetailModuleCode | null;
  "attention_policy": ExperienceDeltaAttentionPolicy;
  "cognitive_budget": ExperienceDeltaCognitiveBudget;
  "active_detail_surface_code"?: ExperienceDeltaDetailModuleCode | null;
  "focus_anchor_ref": string | null;
  "shell_stability_token": string | null;
  "surface_order": Array<JsonValue>;
  "surfaces": {
    "CONTEXT_BAR": ExperienceDeltaSurfaceUpdate & {
      "surface_code": "CONTEXT_BAR";
    };
    "DECISION_SUMMARY": ExperienceDeltaSurfaceUpdate & {
      "surface_code": "DECISION_SUMMARY";
    };
    "ACTION_STRIP": ExperienceDeltaSurfaceUpdate & {
      "surface_code": "ACTION_STRIP";
    };
    "DETAIL_DRAWER": ExperienceDeltaSurfaceUpdate & {
      "surface_code": "DETAIL_DRAWER";
    };
  };
};

export type ExperienceStreamEvent = {
  "artifact_type": "ExperienceStreamEvent";
  "stream_scope_class": "MANIFEST_EXPERIENCE";
  "manifest_id": string;
  "shell_route_key": string;
  "experience_sequence": number;
  "frame_epoch": number;
  "shell_stability_token": string;
  "resume_token": string;
  "stream_recovery_contract": StreamRecoveryContract;
  "stability_contract": RouteStabilityContract & {
    "route_scope_class"?: "MANIFEST_EXPERIENCE";
    "guard_vector_components"?: {
      "decision_bundle_hash_or_null"?: string;
      "shell_stability_token_or_null"?: string;
      "frame_epoch_or_null"?: number;
      "work_item_version_or_null"?: null;
      "customer_thread_head_or_null"?: null;
      "internal_thread_head_or_null"?: null;
      "request_state_version_or_null"?: null;
      "client_portal_workspace_version_or_null"?: null;
      "view_guard_ref_or_null"?: null;
    };
    "last_published_sequence_or_null"?: number;
    "resume_capability"?: "STREAM_RESUMABLE";
  };
  "event_type": "experience.delta" | "experience.snapshot" | "terminal.bundle" | "heartbeat";
  "snapshot_ref": string | null;
  "delta_ref": string | null;
  "terminal_bundle_ref": string | null;
  "occurred_at": ISO8601DateTimeString;
};
export const ExperienceStreamEventSchemaLineage = { schemaId: "https://taxat.dev/schemas/experience_stream_event.schema.json", sourceHash: "21494b4d725acca39deb7b31108f1bf0b779cbb4ebf735f756b7913760f3ba0b" } as const;

export type FocusRestorationContract = {
  "requested_focus_anchor_ref_or_null": string | null;
  "resolved_focus_anchor_ref_or_null": string | null;
  "restoration_disposition": "EXACT_FOCUS" | "REMAPPED_FOCUS" | "OBJECT_SUMMARY" | "PARENT_RETURN" | "INVALIDATED";
  "restoration_reason_code_or_null": string | null;
};
export const FocusRestorationContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/focus_restoration_contract.schema.json", sourceHash: "d6de8729efa37d6b4154c7adb4ec6a93423919ee6557b5d09a26fdf16eaab7ef" } as const;

export type FocusRestoreReturnTargetHarness = {
  "contract_version": "FOCUS_RESTORE_RETURN_TARGET_HARNESS_V1";
  "harness_id": string;
  "deterministic_seed": number;
  "suite_profile": "KEYBOARD_FIRST_RETURN_TARGET_AND_FALLBACK_MATRIX";
  "run_mode": "DETERMINISTIC_SEEDED_ENUMERATION";
  "modality_policy": "KEYBOARD_FIRST_WITH_POINTER_AND_ASSISTIVE_PARITY";
  "identifier_policy": "DATA_TESTID_AND_ACCESSIBILITY_IDENTIFIER_MIRROR_SERIALIZED_ANCHORS";
  "return_target_policy": "SERIALIZED_INVOKER_OR_NARROWEST_LAWFUL_FALLBACK";
  "fallback_order_policy": "REMAP_WITHIN_OBJECT_THEN_OBJECT_SUMMARY_THEN_PARENT_RETURN_THEN_NARROWEST_LIST";
  "live_update_focus_policy": "NEVER_STEAL_ACTIVE_COMPOSER_PICKER_OR_COMPARE_FOCUS";
  "help_handoff_policy": "HELP_HANDOFF_RETURNS_TO_SERIALIZED_SOURCE_ANCHOR";
  "cases": Array<FocusRestoreReturnTargetHarnessHarnessCase>;
};
export const FocusRestoreReturnTargetHarnessSchemaLineage = { schemaId: "https://taxat.dev/schemas/focus_restore_return_target_harness.schema.json", sourceHash: "d5ebd72b42c2b8999c4f1033f251d7e89954996bb49e678161e512f71ea34f20" } as const;

export type FocusRestoreReturnTargetHarnessSurfaceType = "LowNoiseExperienceFrame" | "WorkspaceSnapshot" | "ClientPortalWorkspace" | "TenantGovernanceSnapshot" | "NativeOperatorSecondaryWindowScene";

export type FocusRestoreReturnTargetHarnessFocusScope = "MANIFEST_SUPPORT_REGION" | "WORKSPACE_DETAIL_ROUTE" | "CLIENT_PORTAL_CONTEXTUAL_ROUTE" | "GOVERNANCE_SUPPORT_ROUTE" | "NATIVE_SECONDARY_WINDOW";

export type FocusRestoreReturnTargetHarnessTriggerAction = "CLOSE_SUPPORT_REGION" | "BACK_NAVIGATION" | "HELP_HANDOFF_RETURN" | "STALE_REBASE_RECOVERY" | "LIVE_UPDATE_DURING_ACTIVE_INPUT" | "RESPONSIVE_RESTACK" | "SECONDARY_WINDOW_CLOSE";

export type FocusRestoreReturnTargetHarnessModality = "KEYBOARD_ONLY" | "POINTER_BASELINE" | "ASSISTIVE_TECH";

export type FocusRestoreReturnTargetHarnessObjectLossState = "EXACT_TARGET_VISIBLE" | "EXACT_TARGET_STALE_SAME_OBJECT_LAWFUL" | "OBJECT_STALE_PARENT_LAWFUL" | "PARENT_STALE_NARROW_LIST_LAWFUL";

export type FocusRestoreReturnTargetHarnessSupportSurfaceKind = "TRAILING_INSPECTOR" | "DETAIL_DRAWER" | "CONTEXTUAL_DETAIL" | "HELP_ROUTE" | "SECONDARY_COMPARE_WINDOW";

export type FocusRestoreReturnTargetHarnessActiveFocusLockKind = "COMPOSER" | "PICKER" | "COMPARE_CONTROL";

export type FocusRestoreReturnTargetHarnessExpectedTargetKind = "INVOKER" | "OBJECT_SUMMARY" | "PARENT_RETURN" | "NARROWEST_SURVIVING_LIST";

export type FocusRestoreReturnTargetHarnessRestorationDisposition = "EXACT_FOCUS" | "REMAPPED_FOCUS" | "OBJECT_SUMMARY" | "PARENT_RETURN" | "INVALIDATED";

export type FocusRestoreReturnTargetHarnessStateSnapshot = {
  "route_or_scene_ref": string;
  "canonical_object_ref_or_null": string | null;
  "active_focus_anchor_ref_or_null": string | null;
  "return_route_or_scene_ref_or_null": string | null;
  "return_focus_anchor_ref_or_null": string | null;
  "fallback_route_or_scene_ref_or_null": string | null;
  "fallback_focus_anchor_ref_or_null": string | null;
  "focus_restoration_disposition_or_null": string | null;
  "focus_restoration_reason_code_or_null": string | null;
  "browser_active_identifier_or_null": string | null;
  "browser_return_identifier_or_null": string | null;
  "native_active_identifier_or_null": string | null;
  "native_return_identifier_or_null": string | null;
  "active_focus_lock_ref_or_null": string | null;
};

export type FocusRestoreReturnTargetHarnessHarnessCase = {
  "case_id": string;
  "surface_type": FocusRestoreReturnTargetHarnessSurfaceType;
  "focus_scope": FocusRestoreReturnTargetHarnessFocusScope;
  "trigger_action": FocusRestoreReturnTargetHarnessTriggerAction;
  "covered_modalities": Array<FocusRestoreReturnTargetHarnessModality>;
  "object_loss_state": FocusRestoreReturnTargetHarnessObjectLossState;
  "support_surface_kind_or_null": string | null;
  "active_focus_lock_kind_or_null": string | null;
  "expected_target_kind": FocusRestoreReturnTargetHarnessExpectedTargetKind;
  "expected_focus_restoration_disposition": FocusRestoreReturnTargetHarnessRestorationDisposition;
  "pre_state": FocusRestoreReturnTargetHarnessStateSnapshot;
  "post_state": FocusRestoreReturnTargetHarnessStateSnapshot;
};

export type InteractionLayerFoundationContract = {
  "contract_version": "CROSS_SHELL_INTERACTION_FOUNDATION_V1";
  "shell_family": "CALM_SHELL" | "CLIENT_PORTAL_SHELL" | "GOVERNANCE_DENSITY_SHELL";
  "design_token_binding_policy": "EXPLICIT_SEMANTIC_BINDINGS_ONLY";
  "layout_density_token": "CALM_FOUR_SURFACE_DENSITY_V1" | "PORTAL_COMFORTABLE_TASK_DENSITY_V1" | "GOVERNANCE_WORKSPACE_DENSITY_V1";
  "surface_spacing_token": "CALM_FOUR_SURFACE_SPACING_V1" | "PORTAL_PRIMARY_STACK_SPACING_V1" | "GOVERNANCE_CANVAS_SPACING_V1";
  "support_surface_spacing_token": "CALM_DETAIL_DRAWER_SUPPORT_SPACING_V1" | "PORTAL_INLINE_SUPPORT_SPACING_V1" | "GOVERNANCE_AUXILIARY_SURFACE_SPACING_V1";
  "responsive_compaction_token": "CALM_SUPPORT_REDOCK_V1" | "PORTAL_STACK_BELOW_PRIMARY_V1" | "GOVERNANCE_AUXILIARY_REDOCK_V1";
  "selector_profile": "OPERATOR_SEMANTIC_SELECTORS_V1" | "PORTAL_SEMANTIC_SELECTORS_V1" | "GOVERNANCE_SEMANTIC_SELECTORS_V1";
  "support_surface_policy": "ONE_PROMOTED_SUPPORT_SURFACE_MAX";
  "continuity_policy": "SAME_OBJECT_SAME_SHELL_INLINE_RECOVERY" | "SAME_SHELL_CONTEXTUAL_RETURN" | "SAME_OBJECT_SAME_SHELL_CONTEXT_RETENTION";
  "recovery_surface_policy": "INLINE_EXPLICIT_REBASE" | "INLINE_REVIEW_OR_RECOVERY_NOTICE" | "INLINE_TYPED_CONTEXTUAL_RECOVERY";
  "history_presentation_policy": "CURRENT_PRIMARY_HISTORY_SECONDARY" | "ACTIVE_SLICE_PRIMARY_CONTEXTUAL_HISTORY";
  "preview_surface_policy": "DETAIL_DRAWER_OR_PARENT_BOUND_SECONDARY_WINDOW" | "PRIMARY_CONTEXT_WITH_STACKED_SUPPORT" | "AUXILIARY_SURFACE_CONTEXTUAL_ONLY";
  "notification_surface_policy": "CONTEXT_BOUND_INLINE_FEEDBACK_OR_PARENT_MIRROR" | "CONTEXT_BOUND_INLINE_FEEDBACK";
  "secondary_window_policy": "SUPPORT_ONLY_PARENT_BOUND_CLOSE_RETURNS_FOCUS" | "NOT_APPLICABLE";
  "motion_profile": "SUBTLE_CAUSAL_ONLY";
  "motion_token": "SUBTLE_CAUSAL_MOTION_V1";
  "feedback_truth_policy": "DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN";
  "platform_parity_policy": "SAME_FAMILY_REUSES_SAME_INTERACTION_GRAMMAR";
};
export const InteractionLayerFoundationContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/interaction_layer_foundation_contract.schema.json", sourceHash: "1400be63482ef4a193e04e687caabf09957571df5e2626ea07abfcefd6bb5ff1" } as const;

export type LowNoiseBudgetAudit = {
  "contract_version": "LOW_NOISE_BUDGET_AUDIT_V1";
  "shell_family": "CALM_SHELL";
  "audit_scope": "FIRST_VIEW" | "NON_MATERIAL_REFRESH" | "RECOVERY_RECONNECT";
  "rendered_surface_order": Array<JsonValue>;
  "persistent_surface_count": number;
  "concurrent_primary_count": number;
  "dominant_issue_count": number;
  "primary_mutation_action_count": number;
  "secondary_mutation_action_count": number;
  "visible_reason_count": number;
  "collapsed_reason_count": number;
  "visible_warning_count": number;
  "visible_action_count": number;
  "visible_detail_entry_count": number;
  "visible_shell_char_count": number;
  "prominent_motion_count": number;
  "scan_load": number;
  "copy_budget_state": "WITHIN_FROZEN_COPY_BUDGET";
  "surface_budget_state": "WITHIN_FROZEN_SURFACE_BUDGET";
  "attention_budget_state": "WITHIN_FROZEN_ATTENTION_BUDGET";
  "semantic_coverage_state": "LOSSLESS_DECISIVE_ATOMS_VISIBLE_OR_ROUTE_STABLE";
  "duplicate_posture_codes": Array<"LIMITATION_STATEMENT_DUPLICATED" | "BLOCKING_REASON_DUPLICATED" | "DETAIL_ENTRY_REASON_DUPLICATED">;
  "duplicate_posture_cluster_count": number;
  "rank_swap_count_or_null": number | null;
  "continuity_cost_or_null": number | null;
  "visible_change_count_in_window_or_null": number | null;
  "coalesced_change_count_or_null": number | null;
  "refresh_budget_state": "NOT_APPLICABLE" | "WITHIN_NON_MATERIAL_REFRESH_BUDGET" | "COALESCED_TO_PRESERVE_BUDGET";
  "detail_fallback_state": "NOT_APPLICABLE" | "ACTIVE_MODULE_PRESERVED" | "FIRST_VALID_ENTRY_SELECTED" | "SUGGESTED_MODULE_SELECTED" | "COLLAPSED_ROOT_SELECTED";
};
export const LowNoiseBudgetAuditSchemaLineage = { schemaId: "https://taxat.dev/schemas/low_noise_budget_audit.schema.json", sourceHash: "8776c4cb2e34e4646075949cd4bb22be38b01c26e65191932b9e9e19eea6e7d1" } as const;

export type LowNoiseBudgetAuditPack = {
  "contract_version": "LOW_NOISE_BUDGET_AUDIT_PACK_V1";
  "pack_id": string;
  "deterministic_seed": number;
  "suite_profile": "CALM_SHELL_SURFACE_COMPRESSION_AND_NOISE_BUDGET_MATRIX";
  "run_mode": "DETERMINISTIC_SEEDED_ENUMERATION";
  "dominant_story_policy": "ONE_PRIMARY_ISSUE_AND_ONE_SAFE_NEXT_MOVE";
  "posture_deduplication_policy": "ANALYSIS_MASKING_AND_LIMITATION_VISIBLE_ONCE";
  "coalescing_policy": "NON_MATERIAL_DELTAS_COALESCE_BEFORE_ATTENTION_REORDER";
  "copy_budget_policy": "FROZEN_MICROCOPY_BUDGETS_AND_LOSSLESS_DECISIVE_ATOMS";
  "cases": Array<LowNoiseBudgetAuditPackAuditCase>;
};
export const LowNoiseBudgetAuditPackSchemaLineage = { schemaId: "https://taxat.dev/schemas/low_noise_budget_audit_pack.schema.json", sourceHash: "2532fc8f24933f6ee6860df950b5119ba81570e76b6dedd42fdf54ce6d41dbcd" } as const;

export type LowNoiseBudgetAuditPackScenarioClass = "FIRST_VIEW" | "REASON_PRESSURE" | "NO_SAFE_ACTION" | "NON_MATERIAL_REFRESH" | "RECONNECT_CATCH_UP" | "DETAIL_FALLBACK";

export type LowNoiseBudgetAuditPackActionabilityState = "ACTION_AVAILABLE" | "NO_SAFE_ACTION";

export type LowNoiseBudgetAuditPackModePosture = "LIVE_COMPLIANCE" | "ANALYSIS_ONLY" | "REPLAY_ONLY" | "MASKED_LIMITED" | "READ_ONLY";

export type LowNoiseBudgetAuditPackCoalescingOutcome = "NONE" | "COLLAPSE_TO_COUNTS" | "DETAIL_LOCAL_ONLY" | "HOLD_UNTIL_MATERIAL";

export type LowNoiseBudgetAuditPackDetailFallbackState = "NOT_APPLICABLE" | "ACTIVE_MODULE_PRESERVED" | "FIRST_VALID_ENTRY_SELECTED" | "SUGGESTED_MODULE_SELECTED" | "COLLAPSED_ROOT_SELECTED";

export type LowNoiseBudgetAuditPackDetailModuleCode = "EVIDENCE_TIDE" | "PACKET_FORGE" | "AUTHORITY_TUNNEL" | "DRIFT_FIELD" | "FOCUS_LENS" | "TWIN_PANEL" | null;

export type LowNoiseBudgetAuditPackAuditCase = {
  "case_id": string;
  "scenario_class": LowNoiseBudgetAuditPackScenarioClass;
  "frame_ref": string;
  "mode_posture": LowNoiseBudgetAuditPackModePosture;
  "actionability_state": LowNoiseBudgetAuditPackActionabilityState;
  "audit": LowNoiseBudgetAudit;
  "dominant_question_changed": boolean;
  "primary_action_changed": boolean;
  "active_detail_surface_code_or_null": LowNoiseBudgetAuditPackDetailModuleCode;
  "expected_coalescing_outcome": LowNoiseBudgetAuditPackCoalescingOutcome;
  "expected_fallback_state": LowNoiseBudgetAuditPackDetailFallbackState;
};

export type LowNoiseExperienceFrame = {
  "interaction_layer": {
    "recovery_notice_surface": "CONTEXT_BAR";
    "notification_surface": "CONTEXT_BAR";
    "artifact_preview_surface": "DETAIL_DRAWER";
  };
};
export const LowNoiseExperienceFrameSchemaLineage = { schemaId: "https://taxat.dev/schemas/low_noise_experience_frame.schema.json", sourceHash: "bb5663b9f5f82e6bca819caee2748edd976dc5db3de0e83796fb7b86d6773f97" } as const;

export type LowNoiseExperienceFrameLowNoiseSurfaceCode = "CONTEXT_BAR" | "DECISION_SUMMARY" | "ACTION_STRIP" | "DETAIL_DRAWER";

export type LowNoiseExperienceFrameDetailModuleCode = "EVIDENCE_TIDE" | "PACKET_FORGE" | "AUTHORITY_TUNNEL" | "DRIFT_FIELD" | "FOCUS_LENS" | "TWIN_PANEL";

export type LowNoiseExperienceFrameSettlementState = "STEADY" | "RECEIPT_PENDING" | "FRESHENING" | "STALE_REVIEW_REQUIRED" | "DEGRADED_READ_ONLY" | "RECOVERY_REQUIRED";

export type LowNoiseExperienceFrameRecoveryPosture = "NONE" | "INLINE_RECONNECT" | "INLINE_REBASE" | "READ_ONLY_LIMITED" | "OBJECT_SUPERSEDED" | "ACCESS_REBIND_REQUIRED";

export type LowNoiseExperienceFrameAttentionPolicy = {
  "policy_version": string;
  "attention_state": "CALM" | "NOTICE" | "REVIEW" | "BLOCKED" | "WAITING" | "LIMITED";
  "primary_surface_code": LowNoiseExperienceFrameLowNoiseSurfaceCode;
  "primary_object_ref": string | null;
  "actionability_state": "ACTION_AVAILABLE" | "NO_SAFE_ACTION";
  "primary_action_code": string | null;
  "no_safe_action_reason_code": string | null;
  "secondary_notice_count": number;
  "detail_entry_points": Array<LowNoiseExperienceFrameDetailModuleCode>;
  "suggested_detail_surface_code": LowNoiseExperienceFrameDetailModuleCode | null;
  "primary_rank_score": number;
  "runner_up_rank_score": number;
  "dominance_margin": number;
  "ranking_basis": Array<string>;
  "default_detail_module_code": LowNoiseExperienceFrameDetailModuleCode | null;
  "visible_warning_count": number;
};

export type LowNoiseExperienceFrameCognitiveBudget = {
  "persistent_surface_limit": 4;
  "concurrent_primary_limit": 1;
  "primary_reason_limit": 3;
  "secondary_action_limit": 2;
  "visible_warning_limit": 1;
  "detail_entry_point_limit": 5;
  "expanded_detail_module_limit": 1;
  "visibility_budget_units": 12;
  "prominent_motion_limit": 1;
  "issue_dominance_min_margin": 12;
  "action_dominance_min_margin": 15;
  "primary_rank_hysteresis": 8;
  "non_material_rank_swap_limit": 1;
  "non_material_continuity_cost_limit": 6;
  "refresh_coalescing_window_ms": 1500;
  "refresh_burst_visible_change_limit": 2;
};

export type LowNoiseExperienceFrameCopyBudget = {
  "manifest_label_max_chars": 64;
  "context_label_max_chars": 48;
  "headline_max_chars": 96;
  "reason_label_max_chars": 120;
  "explanation_max_chars": 240;
  "action_label_max_chars": 40;
  "blocking_reason_max_chars": 160;
  "uncertainty_max_chars": 160;
  "detail_entry_label_max_chars": 48;
  "detail_entry_reason_max_chars": 120;
};

export type NativeCacheHydrationAutomationPack = {
  "contract_version": "NATIVE_CACHE_HYDRATION_AUTOMATION_PACK_V1";
  "pack_id": string;
  "deterministic_seed": number;
  "suite_profile": "MACOS_CACHE_HYDRATION_PURGE_REBASE_AND_RESTORATION_MATRIX";
  "run_mode": "DETERMINISTIC_SEEDED_ENUMERATION";
  "first_paint_assertion_policy": "COMPATIBILITY_VERIFIED_BEFORE_RENDERED_CONTENT";
  "purge_assertion_policy": "IMMEDIATE_SELECTIVE_PURGE_ACROSS_CACHE_AND_LOCAL_ARTIFACTS";
  "action_gate_assertion_policy": "CACHE_ONLY_RESTORE_CANNOT_MUTATE_UNTIL_LIVE_REBASE";
  "coverage_policy": "COLD_START_RECONNECT_TENANT_SWITCH_DOWNGRADE_REVOCATION_AND_SCHEMA_DRIFT";
  "cases": Array<NativeCacheHydrationAutomationPackAutomationCase>;
};
export const NativeCacheHydrationAutomationPackSchemaLineage = { schemaId: "https://taxat.dev/schemas/native_cache_hydration_automation_pack.schema.json", sourceHash: "7020281be9a0755ba71075eec73827ca8cd1d67410bd557ad531699794b34344" } as const;

export type NativeCacheHydrationAutomationPackAutomationHarness = "XCUITEST" | "NATIVE_PERSISTENCE_FIXTURE";

export type NativeCacheHydrationAutomationPackHydrationScopeClass = "EXPERIENCE_CURSOR" | "WORKSPACE_CURSOR" | "NATIVE_PRIMARY_SCENE" | "NATIVE_SECONDARY_WINDOW";

export type NativeCacheHydrationAutomationPackScenarioClass = "COLD_START_COMPATIBLE_CACHE" | "COLD_START_SCHEMA_INCOMPATIBLE" | "TENANT_SWITCH" | "PRIVILEGE_DOWNGRADE" | "SESSION_REVOCATION" | "CACHE_ONLY_RESTORE_REBASE_REQUIRED" | "SECONDARY_WINDOW_MASKING_PURGE";

export type NativeCacheHydrationAutomationPackPurgeReason = "TENANT_SWITCH" | "PRIVILEGE_DOWNGRADE" | "SESSION_REVOKED" | "SCHEMA_INCOMPATIBLE" | "MASKING_CHANGE" | null;

export type NativeCacheHydrationAutomationPackArtifactClass = "STRUCTURED_CACHE" | "RESUME_METADATA" | "SCENE_RESTORATION_PAYLOAD" | "NSUSERACTIVITY" | "PREVIEW_CACHE" | "TEMP_EXPORT_FILE" | "LOCAL_SEARCH_INDEX";

export type NativeCacheHydrationAutomationPackFirstPaintOutcome = "CACHED_RENDER_AFTER_CHECK" | "PLACEHOLDER_UNTIL_FRESH_SNAPSHOT" | "PURGED_NO_RESTORE";

export type NativeCacheHydrationAutomationPackActionOutcome = "LIVE_ACTIONS_ALLOWED" | "MUTATION_BLOCKED_PENDING_REBASE" | "MUTATION_BLOCKED_PENDING_ACCESS_REBIND";

export type NativeCacheHydrationAutomationPackResumeBindingState = "UNCHANGED_LIVE" | "CLEARED_FOR_REBASE" | "CLEARED_FOR_ACCESS_REBIND";

export type NativeCacheHydrationAutomationPackAutomationCase = {
  "case_id": string;
  "automation_harness": NativeCacheHydrationAutomationPackAutomationHarness;
  "hydration_scope_class": NativeCacheHydrationAutomationPackHydrationScopeClass;
  "scenario_class": NativeCacheHydrationAutomationPackScenarioClass;
  "compatibility_check_completed_before_render": boolean;
  "incompatible_content_rendered": boolean;
  "purge_reason_code_or_null": NativeCacheHydrationAutomationPackPurgeReason;
  "purged_artifact_classes": Array<NativeCacheHydrationAutomationPackArtifactClass>;
  "resume_lineage_reused_illegally": boolean;
  "restoration_reopened_stale_context": boolean;
  "expected_first_paint_outcome": NativeCacheHydrationAutomationPackFirstPaintOutcome;
  "expected_action_outcome": NativeCacheHydrationAutomationPackActionOutcome;
  "expected_resume_binding_state": NativeCacheHydrationAutomationPackResumeBindingState;
};

export type NativeCacheHydrationContract = {
  "contract_version": "NATIVE_CACHE_HYDRATION_V1";
  "hydration_scope_class": "EXPERIENCE_CURSOR" | "WORKSPACE_CURSOR" | "NATIVE_PRIMARY_SCENE" | "NATIVE_SECONDARY_WINDOW";
  "tenant_id": string;
  "principal_class": string;
  "session_binding_hash": string;
  "session_lineage_ref_or_null": string | null;
  "access_binding_hash_or_null": string | null;
  "masking_posture_fingerprint": string;
  "route_identity_ref": string;
  "canonical_object_ref": string;
  "shell_family": string;
  "schema_compatibility_ref": string;
  "projection_guard_ref": string;
  "resume_binding_ref_or_null": string | null;
  "restoration_anchor_ref_or_null": string | null;
  "preview_subject_ref_or_null": string | null;
  "compatibility_dimensions": Array<JsonValue>;
  "purge_trigger_reason_codes": Array<JsonValue>;
  "regulated_local_artifact_classes": Array<JsonValue>;
  "first_paint_policy": "VERIFY_COMPATIBILITY_BEFORE_RENDER_OR_RESTORE";
  "purge_execution_policy": "SELECTIVE_IMMEDIATE_PURGE_ON_SCOPE_SESSION_MASKING_OR_SCHEMA_DRIFT";
  "cursor_lineage_policy": "RESUME_AND_DELTA_REUSE_REQUIRE_EXACT_LIVE_CURSOR_LINEAGE";
  "restoration_reuse_policy": "SAME_OBJECT_SAME_SHELL_ONLY_WHEN_FULL_LEGALITY_ENVELOPE_MATCHES";
  "mutation_gate_policy": "NO_MUTATION_OR_FILING_AFTER_CACHE_ONLY_RESTORE_OR_CONTEXT_DRIFT";
  "local_artifact_purge_policy": "PURGE_NSUSERACTIVITY_PREVIEW_EXPORT_AND_INDEX_WITH_CACHE_STATE";
};
export const NativeCacheHydrationContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/native_cache_hydration_contract.schema.json", sourceHash: "1fe7671d934377786466e683c784b9837bf08445cb7d246143e5a030a3e86a99" } as const;

export type NativeOperatorSecondaryWindowScene = {
  "interaction_layer": {
    "recovery_notice_surface": "IDENTITY_HEADER";
    "notification_surface": "PARENT_CONTEXT_BAR";
    "artifact_preview_surface": "SECONDARY_WINDOW_BODY";
  };
};
export const NativeOperatorSecondaryWindowSceneSchemaLineage = { schemaId: "https://taxat.dev/schemas/native_operator_secondary_window_scene.schema.json", sourceHash: "a5b333cc1a53dfb216275f64063a6914c64d3f414cd8119b2c5270e398810610" } as const;

export type NativeOperatorSecondaryWindowSceneIdentityHeader = {
  "parent_object_ref": string;
  "mounted_artifact_ref": string;
  "headline": string;
  "status_label": string;
  "currentness_state": "CURRENT_PRIMARY" | "CURRENT_WITH_HISTORY_AVAILABLE" | "HISTORICAL_CONTEXT";
  "lineage_summary_ref": string;
};

export type NativeOperatorSecondaryWindowSceneSummaryLoading = {
  "summary_card_ref": string;
  "summary_state": "VISIBLE_LOADING_DETAIL" | "VISIBLE_READY";
  "detail_state": "LOADING" | "READY";
  "default_revision_posture": "CURRENT_ARTIFACT" | "CURRENT_ARTIFACT_WITH_HISTORY_AVAILABLE" | "CURRENT_VS_HISTORICAL_DIFF";
  "historical_navigation_state": "HIDDEN_UNTIL_REQUESTED" | "AVAILABLE_ON_DEMAND";
};

export type NativeOperatorSecondaryWindowSceneFocusHandoff = {
  "launch_focus_anchor_ref": string;
  "window_focus_target": "IDENTITY_HEADER" | "SUMMARY_CARD" | "DETAIL_BODY";
  "close_return_focus_anchor_ref": string;
  "parent_focus_restore_policy": "RETURN_TO_PARENT_FOCUS_ANCHOR";
};

export type NativeOperatorSecondaryWindowSceneSceneIdentity = {
  "principal_session_lineage_ref": string;
  "masking_posture_fingerprint": string;
  "access_binding_hash_or_null": string | null;
  "schema_compatibility_ref": string;
  "stability_contract": RouteStabilityContract;
  "shell_stability_token": string;
  "route_key": string;
  "frame_epoch": number;
  "workspace_version_or_null": number | null;
  "manifest_id_or_null": string | null;
  "work_item_id_or_null": string | null;
  "focus_anchor_ref_or_null": string | null;
};

export type NativeOperatorSecondaryWindowSceneSceneRestoration = {
  "restoration_state": "RESTORABLE" | "FRESH_SNAPSHOT_REQUIRED" | "INVALIDATED";
  "invalid_reason_codes": Array<"TENANT_SWITCH" | "PRIVILEGE_DOWNGRADE" | "ACCESS_BINDING_CHANGE" | "MASKING_CHANGE" | "SESSION_REVOKED" | "SCHEMA_INCOMPATIBLE" | "OBJECT_GONE" | "PARENT_WINDOW_CLOSED">;
  "restoration_anchor_ref_or_null": string | null;
  "resume_token_ref_or_null": string | null;
  "focus_restoration": FocusRestorationContract;
};

export type NativeOperatorWorkspaceScene = {
  "interaction_layer": {
    "recovery_notice_surface": "CONTEXT_BAR";
    "notification_surface": "CONTEXT_BAR_WITH_SYSTEM_MIRROR";
    "artifact_preview_surface": "SECONDARY_WINDOW_BODY";
  };
};
export const NativeOperatorWorkspaceSceneSchemaLineage = { schemaId: "https://taxat.dev/schemas/native_operator_workspace_scene.schema.json", sourceHash: "8437b846bcb9b095516a5850088b14e42b4b26389f456e7f262d652d7519e3a2" } as const;

export type NativeOperatorWorkspaceSceneSettlementState = "STEADY" | "RECEIPT_PENDING" | "FRESHENING" | "STALE_REVIEW_REQUIRED" | "DEGRADED_READ_ONLY" | "RECOVERY_REQUIRED";

export type NativeOperatorWorkspaceSceneRecoveryPosture = "NONE" | "INLINE_RECONNECT" | "INLINE_REBASE" | "READ_ONLY_LIMITED" | "OBJECT_SUPERSEDED" | "ACCESS_REBIND_REQUIRED";

export type NativeOperatorWorkspaceSceneDetailSurfaceCode = "CONTEXT_BAR" | "DECISION_SUMMARY" | "ACTION_STRIP" | "DETAIL_DRAWER";

export type NativeOperatorWorkspaceSceneLeadingSidebar = {
  "selection_family": "MANIFEST_QUEUE" | "WORK_QUEUE";
  "sidebar_collapse_state": "EXPANDED" | "ICON_RAIL" | "HIDDEN";
  "selected_object_ref": string;
  "selected_focus_anchor_ref_or_null": string | null;
};

export type NativeOperatorWorkspaceScenePrimaryCanvas = {
  "surface_order": Array<JsonValue>;
  "authoritative_action_surface_code": "ACTION_STRIP";
  "mounted_object_ref": string;
  "focused_surface_code_or_null": NativeOperatorWorkspaceSceneDetailSurfaceCode | null;
};

export type NativeOperatorWorkspaceSceneTrailingInspector = {
  "presentation_mode": "DOCKED" | "COLLAPSED" | "DETACHED";
  "support_surface_code": "DETAIL_DRAWER";
  "bound_object_ref_or_null": string | null;
  "focus_anchor_ref_or_null": string | null;
  "detached_scene_ref_or_null": string | null;
  "authoritative_action_strip_present": false;
};

export type NativeOperatorWorkspaceSceneSceneIdentity = {
  "principal_session_lineage_ref": string;
  "masking_posture_fingerprint": string;
  "access_binding_hash_or_null": string | null;
  "schema_compatibility_ref": string;
  "stability_contract": RouteStabilityContract;
  "shell_stability_token": string;
  "route_key": string;
  "frame_epoch": number;
  "workspace_version_or_null": number | null;
  "manifest_id_or_null": string | null;
  "work_item_id_or_null": string | null;
  "focus_anchor_ref_or_null": string | null;
};

export type NativeOperatorWorkspaceSceneSceneRestoration = {
  "restoration_state": "RESTORABLE" | "FRESH_SNAPSHOT_REQUIRED" | "INVALIDATED";
  "invalid_reason_codes": Array<"TENANT_SWITCH" | "PRIVILEGE_DOWNGRADE" | "ACCESS_BINDING_CHANGE" | "MASKING_CHANGE" | "SESSION_REVOKED" | "SCHEMA_INCOMPATIBLE" | "OBJECT_GONE">;
  "restoration_anchor_ref_or_null": string | null;
  "resume_token_ref_or_null": string | null;
  "focus_restoration": FocusRestorationContract;
};

export type NativeOperatorWorkspaceSceneShortcutPosture = {
  "available_shortcut_codes": Array<JsonValue>;
  "focused_region": "LEADING_SIDEBAR" | "PRIMARY_CANVAS" | "TRAILING_INSPECTOR" | "DETACHED_INSPECTOR";
  "menu_command_surface_state": "PRIMARY_ACTIONS_VISIBLE_AND_MIRRORED";
  "focus_restore_policy": "RETURN_TO_LAST_OBJECT_ANCHOR";
};

export type OperatorInteractionLayer = {
  "foundation_contract": InteractionLayerFoundationContract & {
    "shell_family"?: "CALM_SHELL";
  };
  "mounted_content_policy": "KEEP_MOUNTED_CONTENT";
  "refresh_presentation": "INLINE_STATUS_ONLY";
  "recovery_presentation": "INLINE_EXPLICIT_REBASE";
  "recovery_notice_surface": "CONTEXT_BAR" | "IDENTITY_HEADER";
  "delta_promotion_mode": "COALESCE_BEFORE_PROMOTION";
  "selector_profile": "OPERATOR_SEMANTIC_SELECTORS_V1";
  "shell_continuity_policy": "SAME_OBJECT_SAME_SHELL_INLINE_RECOVERY";
  "activity_partition_policy": "VISIBILITY_SCOPED_LANES_WITH_CURRENT_FIRST_ARTIFACTS";
  "investigation_presentation_policy": "SUMMARY_FIRST_PLAIN_LANGUAGE_MODULES";
  "secondary_window_policy": "SUPPORT_ONLY_PARENT_BOUND_CLOSE_RETURNS_FOCUS";
  "notification_surface": "CONTEXT_BAR" | "CONTEXT_BAR_WITH_SYSTEM_MIRROR" | "PARENT_CONTEXT_BAR";
  "artifact_preview_surface": "DETAIL_DRAWER" | "SECONDARY_WINDOW_BODY";
  "history_presentation": "CURRENT_PRIMARY_HISTORY_SECONDARY";
  "motion_profile": "SUBTLE_CAUSAL_ONLY";
  "unsafe_action_policy": "FAIL_CLOSED_DURING_DEGRADED_OR_RECOVERY";
  "feedback_truth_policy": "DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN";
};
export const OperatorInteractionLayerSchemaLineage = { schemaId: "https://taxat.dev/schemas/operator_interaction_layer.schema.json", sourceHash: "09c6f385e74b009d4fb76743a66f4c0596a2643a075e17940457a7ce9ffb30e9" } as const;

export type RouteStabilityContract = {
  "route_scope_class": "MANIFEST_EXPERIENCE" | "WORKSPACE" | "CLIENT_PORTAL_ROUTE" | "GOVERNANCE_ROUTE";
  "publication_generation": number;
  "guard_vector_hash": string;
  "guard_vector_components": RouteStabilityContractGuardVectorComponents;
  "last_published_sequence_or_null": number | null;
  "resume_token_or_null": string | null;
  "resume_capability": "STREAM_RESUMABLE" | "SNAPSHOT_ONLY" | "ACCESS_REBIND_REQUIRED";
};
export const RouteStabilityContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/route_stability_contract.schema.json", sourceHash: "ae13fc174b6924f8525c5b26fa8615663cb48634fdaa730a3f33f85bcbc72bfc" } as const;

export type RouteStabilityContractGuardVectorComponents = {
  "decision_bundle_hash_or_null": string | null;
  "shell_stability_token_or_null": string | null;
  "frame_epoch_or_null": number | null;
  "work_item_version_or_null": number | null;
  "customer_thread_head_or_null": number | null;
  "internal_thread_head_or_null": number | null;
  "request_state_version_or_null": number | null;
  "client_portal_workspace_version_or_null": number | null;
  "view_guard_ref_or_null": string | null;
  "policy_snapshot_hash_or_null": string | null;
  "dependency_topology_hash_or_null": string | null;
  "simulation_basis_hash_or_null": string | null;
  "mutation_basis_contract_hash_or_null"?: string | null;
};

export type SemanticAccessibilityContract = {
  "contract_version": "SEMANTIC_ACCESSIBILITY_V1";
  "shell_family": "CALM_SHELL" | "CLIENT_PORTAL_SHELL" | "GOVERNANCE_DENSITY_SHELL";
  "selector_profile": "OPERATOR_SEMANTIC_SELECTORS_V1" | "PORTAL_SEMANTIC_SELECTORS_V1" | "GOVERNANCE_SEMANTIC_SELECTORS_V1";
  "identifier_semantics_policy": "DOMAIN_MEANING_OVER_VISUAL_STYLING";
  "browser_identifier_policy": "DATA_TESTID_MIRRORS_SEMANTIC_ANCHOR";
  "native_identifier_policy": "ACCESSIBILITY_IDENTIFIER_MIRRORS_SEMANTIC_ANCHOR";
  "landmark_structure_policy": "STABLE_SHELL_SUMMARY_ACTION_SUPPORT_AND_NOTICE_LANDMARKS";
  "heading_navigation_policy": "PRIMARY_HEADING_AND_PROMOTED_REGION_HEADINGS";
  "focus_order_policy": "VISIBLE_SEMANTIC_ORDER_ONLY";
  "focus_entry_policy": "REQUESTED_ANCHOR_OR_PRIMARY_HEADING_OR_EXPLICIT_NOTICE";
  "focus_restore_policy": "RETURN_TO_INVOKER_OR_LAWFUL_ANCESTOR";
  "keyboard_completion_policy": "ALL_GOVERNED_ACTIONS_KEYBOARD_OPERABLE";
  "live_update_focus_policy": "NEVER_STEAL_ACTIVE_INPUT_OR_PICKER_FOCUS";
  "live_region_policy": "POLITE_ACTIVITY_ASSERTIVE_FAILURE_ONLY";
  "conditional_notice_anchor_policy": "LIMITATION_AND_RECOVERY_NOTICES_REQUIRE_ADDRESSABLE_ANCHORS";
  "support_region_access_policy": "PROMOTED_SUPPORT_REGION_KEYBOARD_REACHABLE_AND_ESCAPABLE";
  "detail_module_access_policy": "SUPPORT_MODULES_KEYBOARD_AND_ASSISTIVE_TECH_REACHABLE";
  "artifact_handoff_policy": "CURRENT_AND_HISTORY_ANCHORS_SEPARATE";
  "reduced_motion_policy": "MEANING_PRESERVED_WITH_MINIMAL_OR_NO_MOTION";
  "required_anchor_codes": Array<SemanticAccessibilityContractAnchorCode>;
  "semantic_focus_order": Array<SemanticAccessibilityContractFocusRegionCode>;
  "announced_change_kinds": Array<SemanticAccessibilityContractAnnouncedChangeKind>;
};
export const SemanticAccessibilityContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/semantic_accessibility_contract.schema.json", sourceHash: "83be304f9b057ad506807e18b1018f2274c02aa0eb32fd564931c6c4a29c567c" } as const;

export type SemanticAccessibilityContractAnchorCode = "SHELL_ROOT" | "SHELL_FAMILY" | "OBJECT_ANCHOR" | "DOMINANT_QUESTION" | "DOMINANT_ACTION" | "SETTLEMENT_POSTURE" | "RECOVERY_POSTURE" | "WORKSPACE_POSTURE" | "CONTEXT_BAR" | "DECISION_SUMMARY" | "ACTION_STRIP" | "PRIMARY_ACTION" | "NO_SAFE_ACTION_REASON" | "DETAIL_DRAWER" | "PROMOTED_SUPPORT_REGION" | "LIMITATION_NOTICE" | "RECOVERY_NOTICE" | "ARTIFACT_HANDOFF" | "ARTIFACT_STATE_LABEL" | "RETURN_PATH_CONTROL" | "ROUTE_TABS" | "REQUEST_FOCUS" | "CURRENT_ARTIFACT" | "HISTORY_LIST" | "SECTION_NAV" | "PRIMARY_WORKLIST" | "WORKSPACE_HEADER" | "ATTENTION_SUMMARY" | "RISK_LEDGER" | "LEADING_SIDEBAR" | "PRIMARY_CANVAS" | "TRAILING_INSPECTOR" | "IDENTITY_HEADER" | "SUMMARY_CARD" | "DETAIL_BODY";

export type SemanticAccessibilityContractFocusRegionCode = "CONTEXT_BAR" | "DECISION_SUMMARY" | "ACTION_STRIP" | "DETAIL_DRAWER" | "PORTAL_HEADER" | "STATUS_HERO" | "PRIMARY_ACTION" | "PROMOTED_SUPPORT_REGION" | "SUPPORTING_DETAIL" | "SECTION_NAV" | "PRIMARY_WORKLIST" | "WORKSPACE_HEADER" | "ATTENTION_SUMMARY" | "PROMOTED_AUXILIARY_SURFACE" | "LEADING_SIDEBAR" | "PRIMARY_CANVAS" | "TRAILING_INSPECTOR" | "IDENTITY_HEADER" | "SUMMARY_CARD" | "DETAIL_BODY";

export type SemanticAccessibilityContractAnnouncedChangeKind = "ACTIVITY_DELTA" | "BADGE_DELTA" | "LIMITATION_NOTICE" | "RECOVERY_NOTICE" | "COMMAND_FAILURE" | "TERMINAL_SETTLEMENT";

export type SemanticAccessibilityRegressionPack = {
  "contract_version": "SEMANTIC_ACCESSIBILITY_REGRESSION_PACK_V1";
  "pack_id": string;
  "deterministic_seed": number;
  "suite_profile": "CROSS_SHELL_SEMANTIC_ACCESSIBILITY_AND_ASSISTIVE_TECH_MATRIX";
  "run_mode": "DETERMINISTIC_SEEDED_ENUMERATION";
  "modality_policy": "EVERY_CASE_COVERS_KEYBOARD_SCREEN_READER_AND_REDUCED_MOTION";
  "identifier_binding_policy": "AUTOMATION_IDENTIFIERS_MUST_EQUAL_SEMANTIC_ANCHOR_REFS";
  "landmark_heading_policy": "LANDMARKS_AND_HEADINGS_MIRROR_VISIBLE_SHELL_STRUCTURE";
  "live_update_announcement_policy": "DECISIVE_CHANGE_ANNOUNCED_WITHOUT_NOISE_OR_FOCUS_THEFT";
  "support_surface_policy": "PROMOTED_SUPPORT_AND_DETAIL_SURFACES_REMAIN_NON_MODAL_AND_ESCAPABLE";
  "transition_stability_policy": "RESPONSIVE_REBASE_RECONNECT_AND_COLLAPSE_KEEP_SEMANTIC_ANCHORS_STABLE";
  "return_path_policy": "RETURN_PATH_CONTROLS_REMAIN_ADDRESSABLE_ACROSS_CONTEXTUAL_AND_SECONDARY_FLOWS";
  "cases": Array<SemanticAccessibilityRegressionPackRegressionCase>;
};
export const SemanticAccessibilityRegressionPackSchemaLineage = { schemaId: "https://taxat.dev/schemas/semantic_accessibility_regression_pack.schema.json", sourceHash: "448a34f8195646d69811f038825b487582e94b3d4d8ede6ba92cde30f8fc7fe3" } as const;

export type SemanticAccessibilityRegressionPackSurfaceType = "LowNoiseExperienceFrame" | "WorkspaceSnapshot" | "ClientPortalWorkspace" | "TenantGovernanceSnapshot" | "NativeOperatorWorkspaceScene" | "NativeOperatorSecondaryWindowScene";

export type SemanticAccessibilityRegressionPackShellFamily = "CALM_SHELL" | "CLIENT_PORTAL_SHELL" | "GOVERNANCE_DENSITY_SHELL";

export type SemanticAccessibilityRegressionPackSelectorProfile = "OPERATOR_SEMANTIC_SELECTORS_V1" | "PORTAL_SEMANTIC_SELECTORS_V1" | "GOVERNANCE_SEMANTIC_SELECTORS_V1";

export type SemanticAccessibilityRegressionPackAutomationHarness = "PLAYWRIGHT" | "XCUITEST";

export type SemanticAccessibilityRegressionPackModality = "KEYBOARD_ONLY" | "SCREEN_READER" | "REDUCED_MOTION";

export type SemanticAccessibilityRegressionPackTransitionClass = "RESPONSIVE_RESTACK" | "REBASE" | "RECONNECT" | "SUPPORT_REGION_COLLAPSE" | "LIVE_UPDATE" | "SECONDARY_WINDOW_RETURN";

export type SemanticAccessibilityRegressionPackAnnouncementMode = "POLITE" | "ASSERTIVE";

export type SemanticAccessibilityRegressionPackAnchorBinding = {
  "anchor_code": string;
  "semantic_anchor_ref": string;
  "browser_identifier_or_null": string | null;
  "native_identifier_or_null": string | null;
  "heading_level_or_null": number | null;
  "landmark_role_or_null": string | null;
};

export type SemanticAccessibilityRegressionPackRegressionCase = {
  "case_id": string;
  "surface_type": SemanticAccessibilityRegressionPackSurfaceType;
  "shell_family": SemanticAccessibilityRegressionPackShellFamily;
  "selector_profile": SemanticAccessibilityRegressionPackSelectorProfile;
  "automation_harness": SemanticAccessibilityRegressionPackAutomationHarness;
  "covered_modalities": Array<SemanticAccessibilityRegressionPackModality>;
  "transition_classes": Array<SemanticAccessibilityRegressionPackTransitionClass>;
  "required_anchor_codes": Array<string>;
  "semantic_focus_order": Array<string>;
  "announced_change_kinds": Array<string>;
  "anchor_bindings": Array<SemanticAccessibilityRegressionPackAnchorBinding>;
  "landmark_anchor_codes_in_order": Array<string>;
  "heading_anchor_codes_in_order": Array<string>;
  "focus_entry_anchor_ref": string;
  "keyboard_path_anchor_refs": Array<string>;
  "screen_reader_anchor_codes_in_order": Array<string>;
  "live_update_change_kind_or_null": string | null;
  "live_region_mode_or_null": string | null;
  "live_update_focus_theft_detected": boolean;
  "excessive_live_noise_detected": boolean;
  "support_surface_kind_or_null": string | null;
  "support_surface_keyboard_reachable": boolean;
  "support_surface_keyboard_dismissible": boolean;
  "support_surface_modal_trap_detected": boolean;
  "return_path_anchor_code_or_null": string | null;
  "reduced_motion_semantics_preserved": boolean;
  "reduced_motion_recovery_story_matches_default": boolean;
};

export type ShellContinuityFuzzHarness = {
  "contract_version": "SHELL_CONTINUITY_FUZZ_HARNESS_V1";
  "harness_id": string;
  "deterministic_seed": number;
  "suite_profile": "SAME_OBJECT_SAME_SHELL_PERTURBATION_MATRIX";
  "run_mode": "DETERMINISTIC_SEEDED_ENUMERATION";
  "shrink_policy": "REMOVE_NONESSENTIAL_PERTURBATIONS_KEEP_FIRST_BREAK";
  "coverage_policy": "BROWSER_AND_NATIVE_COVERAGE_REQUIRED";
  "continuity_invariant_policy": "SHELL_ROUTE_OBJECT_QUESTION_MODULE_FOCUS_STABLE_WHEN_LAWFUL";
  "inline_recovery_policy": "INLINE_TYPED_RECOVERY_INSTEAD_OF_SILENT_REMOUNT";
  "action_meaning_policy": "DOMINANT_MEANING_STABLE_WITHOUT_TRUTH_CHANGE";
  "native_return_policy": "SECONDARY_AND_RESTORED_SCENES_RETURN_TO_PARENT_ANCHOR";
  "cases": Array<ShellContinuityFuzzHarnessFuzzCase>;
};
export const ShellContinuityFuzzHarnessSchemaLineage = { schemaId: "https://taxat.dev/schemas/shell_continuity_fuzz_harness.schema.json", sourceHash: "d8b67626c4ad07ba4152195744702c3579235d468bcf22cdc379f1f60dc9cf51" } as const;

export type ShellContinuityFuzzHarnessSurfaceType = "LowNoiseExperienceFrame" | "WorkspaceSnapshot" | "ClientPortalWorkspace" | "TenantGovernanceSnapshot" | "NativeOperatorWorkspaceScene" | "NativeOperatorSecondaryWindowScene";

export type ShellContinuityFuzzHarnessContinuityScope = "MANIFEST_ROUTE" | "WORKSPACE_ROUTE" | "CLIENT_PORTAL_ROUTE" | "GOVERNANCE_ROUTE" | "NATIVE_PRIMARY_SCENE" | "NATIVE_SECONDARY_WINDOW";

export type ShellContinuityFuzzHarnessShellFamily = "CALM_SHELL" | "CLIENT_PORTAL_SHELL" | "GOVERNANCE_DENSITY_SHELL";

export type ShellContinuityFuzzHarnessPerturbation = "REBASE" | "RECONNECT" | "RESIZE_WIDE_TO_NARROW" | "RESIZE_NARROW_TO_WIDE" | "RESPONSIVE_COLLAPSE" | "STREAM_CATCH_UP" | "FRAME_EPOCH_ADVANCE" | "NATIVE_SCENE_RESTORE" | "SECONDARY_WINDOW_RESTORE";

export type ShellContinuityFuzzHarnessAssertedInvariant = "SHELL_FAMILY" | "ROUTE_IDENTITY" | "OBJECT_ANCHOR" | "DOMINANT_QUESTION" | "SETTLEMENT_STATE" | "ACTIVE_CONTEXT" | "FOCUS_ANCHOR" | "RETURN_FOCUS_ANCHOR" | "DOMINANT_MEANING";

export type ShellContinuityFuzzHarnessStateSnapshot = {
  "route_identity_ref": string;
  "canonical_object_ref": string;
  "shell_family": ShellContinuityFuzzHarnessShellFamily;
  "dominant_question": string;
  "dominant_meaning_ref_or_null": string | null;
  "settlement_state_or_null": string | null;
  "recovery_posture_or_null": string | null;
  "active_context_ref_or_null": string | null;
  "focus_anchor_ref_or_null": string | null;
  "return_focus_anchor_ref_or_null": string | null;
};

export type ShellContinuityFuzzHarnessFuzzCase = {
  "case_id": string;
  "surface_type": ShellContinuityFuzzHarnessSurfaceType;
  "continuity_scope": ShellContinuityFuzzHarnessContinuityScope;
  "shell_family": ShellContinuityFuzzHarnessShellFamily;
  "truth_change_detected": boolean;
  "perturbations": Array<ShellContinuityFuzzHarnessPerturbation>;
  "shrink_sequence": Array<ShellContinuityFuzzHarnessPerturbation>;
  "expected_outcome": "PRESERVED" | "INLINE_RECOVERY";
  "expected_inline_recovery_reason_or_null": string | null;
  "asserted_invariants": Array<ShellContinuityFuzzHarnessAssertedInvariant>;
  "pre_state": ShellContinuityFuzzHarnessStateSnapshot;
  "post_state": ShellContinuityFuzzHarnessStateSnapshot;
};

export type ShellDominanceContract = {
  "contract_version": "SHELL_DOMINANCE_V1";
  "summary_action_alignment_policy": "SAME_DOMINANT_QUESTION";
  "dominant_question_surface_code": ShellDominanceContractSurfaceCode;
  "dominant_action_surface_code": ShellDominanceContractSurfaceCode;
  "dominant_action_ref_or_null": string | null;
  "safe_action_state": "ACTION_AVAILABLE" | "NO_SAFE_ACTION";
  "promoted_support_surface_code_or_null": ShellDominanceContractSupportSurfaceCode | null;
  "support_surface_role": "NONE" | "SUBORDINATE" | "INVESTIGATION" | "RECOVERY";
  "supplemental_queue_policy": "NOT_APPLICABLE" | "PRIMARY_ACTION_MIRROR_ONLY" | "SECONDARY_TO_PRIMARY_ACTION";
  "parallel_primary_posture": "DISALLOWED";
  "explicit_multifocus_mode": "DEFAULT" | "COMPARE" | "AUDIT";
  "renderer_salience_policy": "SERVER_AUTHORED_ONLY";
  "responsive_collapse_policy": "PRESERVE_DOMINANT_SUMMARY_AND_ACTION";
  "detached_support_policy": "SUPPORT_ONLY_NEVER_PRIMARY";
};
export const ShellDominanceContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/shell_dominance_contract.schema.json", sourceHash: "dc69c82897d2e421cd337c3a719e8ea924fafbc739178aa535e3916dc71e4fa0" } as const;

export type ShellDominanceContractSurfaceCode = "CONTEXT_BAR" | "DECISION_SUMMARY" | "ACTION_STRIP" | "DETAIL_DRAWER" | "STATUS_HERO" | "TASK_QUEUE" | "DOCUMENT_CENTER" | "APPROVAL_CENTER" | "STEP_WORKSPACE" | "SUPPORT_PANEL" | "LIMITATION_NOTICE" | "DRAFT_RESUME" | "ATTENTION_SUMMARY" | "WORKSPACE_CANVAS" | "AUDIT_SIDECAR" | "BLAST_RADIUS_PANEL" | "DIFF_PANEL" | "EXPORT_ELIGIBILITY_PANEL" | "APPROVAL_PANEL" | "PRIMARY_CANVAS" | "TRAILING_INSPECTOR";

export type ShellDominanceContractSupportSurfaceCode = "DETAIL_DRAWER" | "SUPPORT_PANEL" | "LIMITATION_NOTICE" | "DRAFT_RESUME" | "AUDIT_SIDECAR" | "BLAST_RADIUS_PANEL" | "DIFF_PANEL" | "EXPORT_ELIGIBILITY_PANEL" | "APPROVAL_PANEL" | "TRAILING_INSPECTOR";

export type ShellStateTaxonomyContract = {
  "contract_version": "SHELL_STATE_TAXONOMY_V1";
  "current_empty_state_or_null": "NOT_REQUESTED" | "NOT_YET_MATERIALIZED" | "LIMITED" | "NOT_APPLICABLE" | null;
  "current_empty_surface_code_or_null": "CONTEXT_BAR" | "DECISION_SUMMARY" | "DETAIL_DRAWER" | "STATUS_HERO" | "TASK_QUEUE" | "DOCUMENT_CENTER" | "APPROVAL_CENTER" | "STEP_WORKSPACE" | "SUPPORT_PANEL" | "LIMITATION_NOTICE" | "ATTENTION_SUMMARY" | "PRIMARY_CANVAS" | "TRAILING_INSPECTOR" | null;
  "limitation_reason_codes": Array<string>;
  "current_settlement_state": "STEADY" | "RECEIPT_PENDING" | "FRESHENING" | "STALE_REVIEW_REQUIRED" | "DEGRADED_READ_ONLY" | "RECOVERY_REQUIRED";
  "current_recovery_posture": "NONE" | "INLINE_RECONNECT" | "INLINE_REBASE" | "READ_ONLY_LIMITED" | "OBJECT_SUPERSEDED" | "ACCESS_REBIND_REQUIRED";
  "mounted_context_state": "PRESERVED" | "INLINE_REFRESH" | "READ_ONLY_PRESERVED" | "INLINE_RECOVERY" | "SUPERSEDED";
  "generic_placeholder_policy": "FORBID_GENERIC_EMPTY_SPINNER_WARNING";
  "loading_strategy": "INLINE_PRESERVE_PRIOR_CONTENT";
  "limitation_reason_policy": "LIMITED_REQUIRES_EXPLICIT_REASON_CODES";
  "stale_action_policy": "STALE_DEGRADED_AND_RECOVERY_REQUIRE_NO_SAFE_ACTION";
  "recovery_navigation_policy": "PRESERVE_CURRENT_OBJECT_UNLESS_SUPERSEDED";
  "profile_copy_policy": "PROFILE_COPY_MUST_MAP_TO_SHARED_TAXONOMY";
};
export const ShellStateTaxonomyContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/shell_state_taxonomy_contract.schema.json", sourceHash: "307e14e9eb39a2ad49c092cbc24d9a9ddf5fffb5b85f126647549f9ce3238e6e" } as const;

export type WorkspaceCursor = {
  "artifact_type": "WorkspaceCursor";
  "cursor_scope_class": "WORKSPACE";
  "cursor_id": string;
  "tenant_id": string;
  "principal_ref": string;
  "principal_class": string;
  "item_id": string;
  "workspace_route_key": string;
  "session_visibility_class": "STAFF_FULL" | "CUSTOMER_VISIBLE";
  "shell_stability_token": string;
  "session_ref": string;
  "session_binding_hash": string;
  "access_binding_hash": string;
  "masking_posture_fingerprint": string;
  "frame_epoch": number;
  "workspace_version": number;
  "customer_head_sequence": number;
  "internal_head_sequence_or_null": number | null;
  "request_state_version_or_null": number | null;
  "last_ack_sequence": number;
  "last_published_sequence": number;
  "latest_snapshot_ref": string;
  "resume_token_hash": string;
  "stream_recovery_contract": StreamRecoveryContract;
  "native_cache_hydration_contract": NativeCacheHydrationContract & {
    "hydration_scope_class"?: "WORKSPACE_CURSOR";
  };
  "stability_contract": RouteStabilityContract & {
    "route_scope_class"?: "WORKSPACE";
  };
  "replacement_stability_contract_or_null": RouteStabilityContract & {
    "route_scope_class"?: "WORKSPACE";
  } | null;
  "cursor_state": "LIVE" | "REBASED" | "CLOSED" | "REVOKED" | "EXPIRED";
  "schema_compatibility_ref": string;
  "replacement_snapshot_ref": string | null;
  "invalidation_reason_code": "FRAME_EPOCH_ADVANCED" | "HISTORY_COMPACTED" | "SHELL_STABILITY_CHANGED" | "ROUTE_CONTEXT_CHANGED" | "SESSION_REVOKED" | "SESSION_BINDING_CHANGED" | "ACCESS_BINDING_CHANGED" | "MASKING_POSTURE_CHANGED" | "SCHEMA_INCOMPATIBLE" | "TENANT_SWITCHED" | "PRINCIPAL_CLASS_CHANGED" | "CURSOR_TTL_ELAPSED" | "CLIENT_CLOSED" | null;
  "invalidated_at": ISO8601DateTimeString;
  "last_seen_at": ISO8601DateTimeString;
  "expires_at": ISO8601DateTimeString;
};
export const WorkspaceCursorSchemaLineage = { schemaId: "https://taxat.dev/schemas/workspace_cursor.schema.json", sourceHash: "5d5637c30712f2619950628f5fcdf541199d959b3ac62e4c51e93192dfaa034d" } as const;

export const SurfaceAndExperienceBindingManifest = { familyRef: "SURFACE_AND_EXPERIENCE", schemaCount: 26 } as const;
