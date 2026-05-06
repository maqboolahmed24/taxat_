import type {
  CommandTruthBoundaryContract,
  StreamRecoveryContract,
} from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type {
  ActionStripState,
  ActionStripStateAction,
  ContextBarState,
  CrossDeviceContinuityContract,
  DecisionSummaryState,
  DecisionSummaryStateVisibleReason,
  DetailDrawerStateDetailEntry,
  DetailDrawerStateDetailModuleCode,
  LowNoiseBudgetAudit,
  LowNoiseExperienceFrameAttentionPolicy,
  LowNoiseExperienceFrameCognitiveBudget,
  LowNoiseExperienceFrameCopyBudget,
  LowNoiseExperienceFrameRecoveryPosture,
  LowNoiseExperienceFrameSettlementState,
  OperatorInteractionLayer,
  RouteStabilityContract,
  SemanticAccessibilityContract,
  ShellDominanceContract,
  ShellStateTaxonomyContract,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import type { CacheIsolationContract } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";

export type LowNoiseSurfaceCode =
  | "CONTEXT_BAR"
  | "DECISION_SUMMARY"
  | "ACTION_STRIP"
  | "DETAIL_DRAWER";

export type LowNoiseDetailModuleCode = DetailDrawerStateDetailModuleCode;
export type LowNoiseAttentionState = LowNoiseExperienceFrameAttentionPolicy["attention_state"];
export type LowNoiseActionabilityState =
  LowNoiseExperienceFrameAttentionPolicy["actionability_state"];
export type LowNoiseSettlementState = LowNoiseExperienceFrameSettlementState;
export type LowNoiseRecoveryPosture = LowNoiseExperienceFrameRecoveryPosture;

export type LowNoiseDetailDrawerState = {
  artifact_type: "DetailDrawerState";
  surface_code: "DETAIL_DRAWER";
  entry_points: DetailDrawerStateDetailEntry[];
  expanded_module_code: LowNoiseDetailModuleCode | null;
  expanded_content_state: "COLLAPSED" | DetailDrawerStateDetailEntry["content_state"];
  focus_anchor_ref: string | null;
  fallback_reason_code: string | null;
  compare_mode_explicit: boolean;
  audit_mode_explicit: boolean;
  full_text_ref: string;
};

export type LowNoiseFrameSurfaces = {
  action_strip: ActionStripState;
  context_bar: ContextBarState;
  decision_summary: DecisionSummaryState;
  detail_drawer: LowNoiseDetailDrawerState;
};

export type LowNoiseExperienceFrameRecord = Record<string, unknown> &
  LowNoiseFrameSurfaces & {
    active_detail_surface_code: LowNoiseDetailModuleCode | null;
    artifact_type: "LowNoiseExperienceFrame";
    attention_policy: LowNoiseExperienceFrameAttentionPolicy;
    cache_isolation_contract: CacheIsolationContract;
    checkpoint_state:
      | "NONE"
      | "SOURCE_COLLECTION"
      | "PROJECTION_PENDING"
      | "HUMAN_REVIEW"
      | "APPROVAL_PENDING"
      | "AUTHORITY_PREFLIGHT"
      | "TRANSMIT_PENDING"
      | "PENDING_ACK"
      | "RECONCILIATION_PENDING"
      | "LATE_DATA_PENDING"
      | "CONFIRMED"
      | "REJECTED"
      | "UNKNOWN"
      | "OUT_OF_BAND";
    cognitive_budget: LowNoiseExperienceFrameCognitiveBudget;
    connection_state: ContextBarState["connection_state"];
    copy_budget: LowNoiseExperienceFrameCopyBudget;
    cross_device_continuity_contract: CrossDeviceContinuityContract;
    decision_bundle_hash: string;
    decision_bundle_ref: string;
    dominance_contract: ShellDominanceContract;
    dominant_question: string;
    experience_profile: "LOW_NOISE";
    focus_anchor_ref: string | null;
    frame_epoch: number;
    frame_id: string;
    interaction_layer: OperatorInteractionLayer;
    last_published_sequence: number;
    low_noise_budget_audit: LowNoiseBudgetAudit;
    manifest_id: string;
    object_anchor_ref: string;
    recovery_posture: LowNoiseRecoveryPosture;
    rendered_at: string;
    resume_token: string;
    semantic_accessibility_contract: SemanticAccessibilityContract;
    settlement_state: LowNoiseSettlementState;
    shell_family: "CALM_SHELL";
    shell_route_key: string;
    shell_stability_token: string;
    stability_contract: RouteStabilityContract;
    state_taxonomy_contract: ShellStateTaxonomyContract;
    stream_recovery_contract: StreamRecoveryContract;
    surface_order: LowNoiseSurfaceCode[];
    trust_summary_ref: string;
    truth_boundary_contract: CommandTruthBoundaryContract;
    truth_origin: ContextBarState["truth_origin"];
    truth_state:
      | "LOCAL_INTENT_ONLY"
      | "PERSISTED_INTERNAL"
      | "AUTHORITY_PENDING"
      | "AUTHORITY_CONFIRMED"
      | "AUTHORITY_REJECTED"
      | "AUTHORITY_UNKNOWN"
      | "AUTHORITY_OUT_OF_BAND";
  };

export type LowNoiseFrameRecoveryAuditScope = LowNoiseBudgetAudit["audit_scope"];
export type LowNoiseDetailFallbackState = LowNoiseBudgetAudit["detail_fallback_state"];
export type LowNoiseAction = ActionStripStateAction;
export type LowNoiseVisibleReason = DecisionSummaryStateVisibleReason;

export type LowNoiseDetailAudience = "STAFF" | "CUSTOMER_SAFE" | "MASKED_LIMITED";

export type LowNoiseDetailEntryCandidate = {
  anchorableObjectRefs?: readonly string[] | undefined;
  contentState?: DetailDrawerStateDetailEntry["content_state"] | undefined;
  customerSafe?: boolean | undefined;
  entryReason?: string | null | undefined;
  lawful?: boolean | undefined;
  limitationReasonCodes?: readonly string[] | undefined;
  moduleCode: LowNoiseDetailModuleCode;
  plainLanguageSummary?: string | undefined;
  rankScore?: number | undefined;
  staffOnly?: boolean | undefined;
};

export const lowNoiseSurfaceOrder = [
  "CONTEXT_BAR",
  "DECISION_SUMMARY",
  "ACTION_STRIP",
  "DETAIL_DRAWER",
] as const satisfies readonly LowNoiseSurfaceCode[];

export const lowNoiseDetailModuleLabels = {
  AUTHORITY_TUNNEL: "Authority Handshake Tunnel",
  DRIFT_FIELD: "Drift Ripple Field",
  EVIDENCE_TIDE: "Evidence Prism",
  FOCUS_LENS: "Audit Echo Panel",
  PACKET_FORGE: "Packet Forge",
  TWIN_PANEL: "Twin Lens",
} as const satisfies Record<LowNoiseDetailModuleCode, string>;

export const lowNoiseDetailModuleSemanticViewKinds = {
  AUTHORITY_TUNNEL: "AUTHORITY_SEQUENCE_STATUS",
  DRIFT_FIELD: "BASELINE_CHANGE_INTERPRETATION",
  EVIDENCE_TIDE: "CAUSAL_EVIDENCE_TRACE",
  FOCUS_LENS: "AUDIT_NEIGHBORHOOD_TRACE",
  PACKET_FORGE: "FILING_PACKET_BINDING",
  TWIN_PANEL: "COMPUTED_VS_AUTHORITY_COMPARISON",
} as const satisfies Record<LowNoiseDetailModuleCode, DetailDrawerStateDetailEntry["semantic_view_kind"]>;

export const lowNoiseCognitiveBudget = {
  action_dominance_min_margin: 15,
  concurrent_primary_limit: 1,
  detail_entry_point_limit: 5,
  expanded_detail_module_limit: 1,
  issue_dominance_min_margin: 12,
  non_material_continuity_cost_limit: 6,
  non_material_rank_swap_limit: 1,
  persistent_surface_limit: 4,
  primary_rank_hysteresis: 8,
  primary_reason_limit: 3,
  prominent_motion_limit: 1,
  refresh_burst_visible_change_limit: 2,
  refresh_coalescing_window_ms: 1500,
  secondary_action_limit: 2,
  visibility_budget_units: 12,
  visible_warning_limit: 1,
} as const satisfies LowNoiseExperienceFrameCognitiveBudget;

export const lowNoiseCopyBudget = {
  action_label_max_chars: 40,
  blocking_reason_max_chars: 160,
  context_label_max_chars: 48,
  detail_entry_label_max_chars: 48,
  detail_entry_reason_max_chars: 120,
  explanation_max_chars: 240,
  headline_max_chars: 96,
  manifest_label_max_chars: 64,
  reason_label_max_chars: 120,
  uncertainty_max_chars: 160,
} as const satisfies LowNoiseExperienceFrameCopyBudget;
