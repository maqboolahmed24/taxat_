import {
  buildManifestRouteStabilityContract,
  buildManifestStreamRecoveryContract,
  issueManifestResumeToken,
  type LowNoiseExperienceFrameRecord,
  LowNoiseExperienceFrameRepository,
  manifestResumeBindingFromActor,
} from "../../../packages/backend-northbound/src/index.ts";
import type { ExperienceStreamEvent } from "../../../packages/generated-models/src/generated/typescript/surface-and-experience.ts";
import { actorContext } from "./post_commands_fixtures.ts";

export const defaultExperienceActorContext = actorContext({
  principal_ref: "principal-experience",
  session_ref: "session-experience",
  tenant_id: "tenant-experience",
});

export type ExperienceSnapshotPosture =
  | "DEGRADED_READ_ONLY"
  | "FRESHENING"
  | "STALE_REVIEW_REQUIRED"
  | "STEADY";

function calmInteractionLayer() {
  return {
    artifact_preview_surface: "DETAIL_DRAWER",
    delta_promotion_mode: "COALESCE_BEFORE_PROMOTION",
    feedback_truth_policy: "DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN",
    foundation_contract: {
      contract_version: "CROSS_SHELL_INTERACTION_FOUNDATION_V1",
      continuity_policy: "SAME_OBJECT_SAME_SHELL_INLINE_RECOVERY",
      design_token_binding_policy: "EXPLICIT_SEMANTIC_BINDINGS_ONLY",
      feedback_truth_policy: "DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN",
      history_presentation_policy: "CURRENT_PRIMARY_HISTORY_SECONDARY",
      layout_density_token: "CALM_FOUR_SURFACE_DENSITY_V1",
      motion_profile: "SUBTLE_CAUSAL_ONLY",
      motion_token: "SUBTLE_CAUSAL_MOTION_V1",
      notification_surface_policy: "CONTEXT_BOUND_INLINE_FEEDBACK_OR_PARENT_MIRROR",
      platform_parity_policy: "SAME_FAMILY_REUSES_SAME_INTERACTION_GRAMMAR",
      preview_surface_policy: "DETAIL_DRAWER_OR_PARENT_BOUND_SECONDARY_WINDOW",
      recovery_surface_policy: "INLINE_EXPLICIT_REBASE",
      responsive_compaction_token: "CALM_SUPPORT_REDOCK_V1",
      secondary_window_policy: "SUPPORT_ONLY_PARENT_BOUND_CLOSE_RETURNS_FOCUS",
      selector_profile: "OPERATOR_SEMANTIC_SELECTORS_V1",
      shell_family: "CALM_SHELL",
      support_surface_policy: "ONE_PROMOTED_SUPPORT_SURFACE_MAX",
      support_surface_spacing_token: "CALM_DETAIL_DRAWER_SUPPORT_SPACING_V1",
      surface_spacing_token: "CALM_FOUR_SURFACE_SPACING_V1",
    },
    history_presentation: "CURRENT_PRIMARY_HISTORY_SECONDARY",
    investigation_presentation_policy: "SUMMARY_FIRST_PLAIN_LANGUAGE_MODULES",
    mounted_content_policy: "KEEP_MOUNTED_CONTENT",
    motion_profile: "SUBTLE_CAUSAL_ONLY",
    notification_surface: "CONTEXT_BAR",
    recovery_notice_surface: "CONTEXT_BAR",
    recovery_presentation: "INLINE_EXPLICIT_REBASE",
    refresh_presentation: "INLINE_STATUS_ONLY",
    secondary_window_policy: "SUPPORT_ONLY_PARENT_BOUND_CLOSE_RETURNS_FOCUS",
    selector_profile: "OPERATOR_SEMANTIC_SELECTORS_V1",
    shell_continuity_policy: "SAME_OBJECT_SAME_SHELL_INLINE_RECOVERY",
    unsafe_action_policy: "FAIL_CLOSED_DURING_DEGRADED_OR_RECOVERY",
    activity_partition_policy: "VISIBILITY_SCOPED_LANES_WITH_CURRENT_FIRST_ARTIFACTS",
  };
}

function readSideTruthBoundaryContract() {
  return {
    artifact_role: "READ_SIDE_PROJECTION",
    authoritative_record_families: [
      "RUN_MANIFEST",
      "GATE_DECISION_RECORD",
      "WORKFLOW_ITEM",
      "AUTHORITY_INTERACTION_RECORD",
      "AUDIT_EVENT",
    ],
    authoritative_source_policy: "MIRROR_DURABLE_COMMAND_RECORDS_ONLY",
    contract_version: "COMMAND_TRUTH_BOUNDARY_V1",
    durable_writeback_policy: "NO_DURABLE_STATE_WRITEBACK",
    observable_projection_families: [],
    projection_input_policy: "NO_PROJECTION_INPUTS",
    recovery_basis_policy: "REBUILD_FROM_DURABLE_RECORDS_ONLY",
  };
}

function cognitiveBudget() {
  return {
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
  };
}

function copyBudget() {
  return {
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
  };
}

function surfaceStateForPosture(posture: ExperienceSnapshotPosture, manifestId: string) {
  const steady = posture === "STEADY" || posture === "FRESHENING";
  const activeDetailSurface = steady ? null : "FOCUS_LENS";
  const focusAnchorRef = steady ? null : `focus://${manifestId}/recovery`;
  const actionabilityState = steady ? "ACTION_AVAILABLE" : "NO_SAFE_ACTION";
  const connectionState =
    posture === "DEGRADED_READ_ONLY"
      ? "DEGRADED"
      : posture === "STALE_REVIEW_REQUIRED"
        ? "STALE"
        : "CONNECTED";
  const modePosture = steady ? "LIVE_COMPLIANCE" : "READ_ONLY";
  const limitationStatement = steady ? null : "Review the current frame before mutation.";
  const attentionState =
    posture === "STEADY" ? "CALM" : posture === "FRESHENING" ? "NOTICE" : "REVIEW";
  const visibleWarningCount = steady ? 0 : 1;
  const detailEntryPoints = steady ? ["EVIDENCE_TIDE"] : ["FOCUS_LENS"];
  return {
    activeDetailSurface,
    action_strip: {
      actionability_state: actionabilityState,
      active_detail_surface_code: activeDetailSurface,
      artifact_type: "ActionStripState",
      available_action_codes: steady ? ["REFRESH"] : [],
      blocked_action_codes: steady ? [] : ["SUBMIT_FOR_APPROVAL"],
      blocking_reason: steady ? null : "Current frame requires recovery before mutation.",
      dominance_margin: steady ? 20 : 0,
      focus_anchor_ref: focusAnchorRef,
      full_text_ref: `full-text://${manifestId}/action-strip`,
      investigation_entry_point: activeDetailSurface,
      machine_reason_codes: steady ? ["FRAME_CURRENT"] : ["FRAME_RECOVERY_REQUIRED"],
      mode_safety_posture: steady
        ? "LIVE_COMPLIANCE_MUTATIONS_ALLOWED"
        : "NON_LIVE_MUTATIONS_FORBIDDEN",
      no_safe_action_reason_code: steady ? null : "FRAME_RECOVERY_REQUIRED",
      ownership_label: steady ? "You" : null,
      ownership_posture: steady ? "SELF" : "NONE",
      primary_action: steady
        ? {
            action_code: "REFRESH",
            action_kind: "REFRESH",
            label: "Refresh",
            mutation_precondition_binding_or_null: null,
            requires_live_freshness: false,
            target_detail_surface_code: null,
            target_object_ref: manifestId,
          }
        : null,
      primary_action_score: steady ? 70 : 0,
      runner_up_action_score: steady ? 50 : 0,
      secondary_actions: [],
      source_module_code: "WORKFLOW_CHOREOGRAPHER",
      suggested_detail_surface_code: steady ? null : "FOCUS_LENS",
      surface_code: "ACTION_STRIP",
      suppressed_secondary_count: 0,
      waiting_on_label: null,
    },
    attention_policy: {
      actionability_state: actionabilityState,
      attention_state: attentionState,
      default_detail_module_code: detailEntryPoints[0],
      detail_entry_points: detailEntryPoints,
      dominance_margin: steady ? 0 : 30,
      no_safe_action_reason_code: steady ? null : "FRAME_RECOVERY_REQUIRED",
      policy_version: "LOW_NOISE_ATTENTION_V1",
      primary_action_code: steady ? "REFRESH" : null,
      primary_object_ref: steady ? null : `issue://${manifestId}/recovery`,
      primary_rank_score: steady ? 0 : 90,
      primary_surface_code: "DECISION_SUMMARY",
      ranking_basis: steady ? ["CALM_NO_DOMINANT_ISSUE"] : ["RECOVERY_POSTURE"],
      runner_up_rank_score: steady ? 0 : 60,
      secondary_notice_count: steady ? 0 : 1,
      suggested_detail_surface_code: steady ? null : "FOCUS_LENS",
      visible_warning_count: visibleWarningCount,
    },
    connectionState,
    context_bar: {
      artifact_type: "ContextBarState",
      connection_state: connectionState,
      freshness_state:
        connectionState === "DEGRADED"
          ? "DEGRADED"
          : connectionState === "STALE"
            ? "STALE"
            : "FRESH",
      full_text_ref: `full-text://${manifestId}/context`,
      limitation_statement: limitationStatement,
      manifest_label: manifestId,
      mode_posture: modePosture,
      owner_handoff_posture: steady ? "OWNED" : "UNASSIGNED",
      owner_label: steady ? "You" : null,
      period_label: "2026",
      phase_label: posture,
      scope_label: "Manifest",
      source_module_code: "MANIFEST_RIBBON",
      surface_code: "CONTEXT_BAR",
      truth_origin: "PERSISTED_STATE",
    },
    decision_summary: {
      additional_reason_count: 0,
      artifact_type: "DecisionSummaryState",
      attention_state: attentionState,
      blocking_reason: steady ? null : "Recovery is required before mutation.",
      full_text_ref: `full-text://${manifestId}/summary`,
      headline: steady ? "No immediate review required" : "Review the current frame",
      limitation_reason_codes: [],
      limitation_state: "NONE",
      limitation_statement: null,
      machine_reason_codes: steady ? ["FRAME_CURRENT"] : ["FRAME_RECOVERY_REQUIRED"],
      plain_explanation: steady
        ? "The manifest shell is current."
        : "The shell remains mounted while recovery is handled inline.",
      primary_issue_ref: steady ? null : `issue://${manifestId}/recovery`,
      source_module_codes: ["DECISION_CONSTELLATION", "GATE_LATTICE", "TRUST_PRISM"],
      state_reason_code_or_null: null,
      surface_code: "DECISION_SUMMARY",
      uncertainty_statement: null,
      visible_reasons: steady
        ? []
        : [
            {
              label: "Recovery required",
              reason_code: "FRAME_RECOVERY_REQUIRED",
              severity: "REVIEW",
            },
          ],
      visible_warning_count: visibleWarningCount,
    },
    detail_drawer: {
      artifact_type: "DetailDrawerState",
      audit_mode_explicit: false,
      compare_mode_explicit: false,
      entry_points: detailEntryPoints.map((moduleCode) => ({
        anchorable_object_refs: [manifestId],
        content_state: "POPULATED",
        entry_label: moduleCode === "FOCUS_LENS" ? "Audit Echo Panel" : "Evidence Prism",
        entry_reason: null,
        limitation_reason_codes: [],
        module_code: moduleCode,
        plain_language_summary: "The drawer keeps supporting evidence available.",
        semantic_view_kind:
          moduleCode === "FOCUS_LENS" ? "AUDIT_NEIGHBORHOOD_TRACE" : "CAUSAL_EVIDENCE_TRACE",
        state_reason_code_or_null: null,
      })),
      expanded_content_state: activeDetailSurface === null ? "COLLAPSED" : "POPULATED",
      expanded_module_code: activeDetailSurface,
      fallback_reason_code: null,
      focus_anchor_ref: focusAnchorRef,
      full_text_ref: `full-text://${manifestId}/drawer`,
      surface_code: "DETAIL_DRAWER",
    },
    focusAnchorRef,
    recoveryPosture: steady ? "NONE" : "INLINE_REBASE",
    settlementState: posture,
    visibleWarningCount,
  };
}

export function experienceFrameFixture(input: {
  actor?: ReturnType<typeof actorContext>;
  decisionBundleHash?: string;
  frameEpoch?: number;
  frameId?: string;
  lastPublishedSequence?: number;
  manifestId: string;
  posture?: ExperienceSnapshotPosture;
  publicationGeneration?: number;
  renderedAt?: string;
  resumeToken?: string;
  shellStabilityToken?: string;
}): LowNoiseExperienceFrameRecord {
  const manifestId = input.manifestId;
  const actor = input.actor ?? defaultExperienceActorContext;
  const posture = input.posture ?? "STEADY";
  const frameEpoch = input.frameEpoch ?? 3;
  const lastPublishedSequence = input.lastPublishedSequence ?? 7;
  const publicationGeneration = input.publicationGeneration ?? 11;
  const shellStabilityToken = input.shellStabilityToken ?? `shell.${manifestId}.stable`;
  const decisionBundleHash = input.decisionBundleHash ?? `decision.hash.${manifestId}`;
  const surface = surfaceStateForPosture(posture, manifestId);
  const binding = manifestResumeBindingFromActor({
    actorContext: actor,
    frameEpoch,
    lastPublishedSequence,
    manifestId,
    publicationGeneration,
    shellRouteKey: manifestId,
    shellStabilityToken,
  });
  const resumeToken =
    input.resumeToken ??
    issueManifestResumeToken({
      ...binding,
      issuedAt: "2026-05-03T10:00:00.000Z",
      nonce: `stored-${manifestId}`,
    });
  const stabilityContract = buildManifestRouteStabilityContract({
    decisionBundleHash,
    frameEpoch,
    lastPublishedSequence,
    publicationGeneration,
    resumeToken,
    shellStabilityToken,
  });
  const streamRecoveryContract = buildManifestStreamRecoveryContract({
    accessBindingHash: binding.accessBindingHash,
    frameEpoch,
    lastPublishedSequence,
    manifestId,
    maskingContextHash: binding.maskingContextHash,
    publicationGeneration,
    resumeToken,
    sessionBindingHash: binding.sessionBindingHash,
    sessionRef: binding.sessionRef,
    shellRouteKey: manifestId,
    shellStabilityToken,
  });
  return {
    action_strip: surface.action_strip,
    active_detail_surface_code: surface.activeDetailSurface,
    artifact_type: "LowNoiseExperienceFrame",
    attention_policy: surface.attention_policy,
    cache_isolation_contract: {
      access_binding_hash_or_null: binding.accessBindingHash,
      cache_partition_ref: `cache://${manifestId}`,
      cache_scope_class: "LOW_NOISE_FRAME",
      canonical_object_ref: manifestId,
      client_id_or_null: actor.client_id_or_null,
      contract_version: "CACHE_ISOLATION_V1",
      customer_safe_projection: false,
      delivery_binding_hash: `delivery.${manifestId}`,
      delivery_revalidation_policy: "PREVIEW_EXPORT_AND_DOWNLOAD_REQUIRE_EXACT_BINDING",
      hydration_guard_policy: "REJECT_ON_CONTEXT_ROUTE_VERSION_OR_PREVIEW_MISMATCH",
      local_storage_reuse_policy: "PURGE_ON_TENANT_PRINCIPAL_SESSION_ACCESS_MASKING_OR_ROUTE_DRIFT",
      masking_posture_fingerprint_or_null: binding.maskingContextHash,
      preview_export_reuse_policy: "ROUTE_AND_SELECTION_BOUND_CURRENT_ONLY",
      preview_subject_ref_or_null: null,
      principal_class: "STAFF_FULL",
      projection_version_ref: String(frameEpoch),
      route_identity_ref: manifestId,
      scope_narrowing_invalidation_policy: "PURGE_BROADER_VARIANTS_ON_ACCESS_OR_MASKING_NARROWING",
      session_binding_hash: binding.sessionBindingHash,
      shared_cache_reuse_policy: "EXACT_SECURITY_CONTEXT_ONLY",
      shared_layer_cache_policy: "NO_CDN_OR_PROXY_REUSE_WITHOUT_IDENTICAL_CONTEXT",
      shell_family: "CALM_SHELL",
      shell_stability_ref_or_null: shellStabilityToken,
      temporary_artifact_policy: "TEMP_FILES_AND_NATIVE_PREVIEW_PURGED_ON_BINDING_DRIFT",
      tenant_id: actor.tenant_id,
      visibility_cache_partition_key_or_null: null,
    },
    checkpoint_state: "NONE",
    cognitive_budget: cognitiveBudget(),
    connection_state: surface.connectionState,
    context_bar: surface.context_bar,
    copy_budget: copyBudget(),
    cross_device_continuity_contract: {
      access_scope_hash_or_null: null,
      action_posture_policy: "DOMINANCE_AND_SETTLEMENT_SERVER_AUTHORED_ONLY",
      allowed_embodiments: [
        "BROWSER_WIDE",
        "BROWSER_NARROW_STACKED",
        "NATIVE_PRIMARY_SCENE",
        "NATIVE_SUPPORT_WINDOW",
      ],
      canonical_object_ref: manifestId,
      compatibility_basis_class: "ROUTE_GUARD_ONLY",
      continuity_scope: "MANIFEST_ROUTE",
      contract_version: "CROSS_DEVICE_CONTINUITY_V1",
      deep_link_return_policy: "EXPLICIT_PARENT_CONTEXT_AND_FOCUS",
      dominant_action_state_or_null: surface.action_strip.actionability_state,
      focus_anchor_ref_or_null: surface.focusAnchorRef,
      hydration_compatibility_policy: "TENANT_ACCESS_MASKING_AND_SESSION_BOUND",
      masking_scope_fingerprint_or_null: null,
      narrow_layout_policy: "STACK_WITHIN_SAME_SHELL",
      parent_context_ref_or_null: null,
      restoration_mode_policy: "EXPLICIT_CARRY_FORWARD_OR_REBASE_ONLY",
      return_focus_anchor_ref_or_null: null,
      route_identity_ref: manifestId,
      same_object_policy: "PRESERVE_EXACT_OBJECT_OR_EXPLICIT_LAWFUL_FALLBACK",
      same_shell_policy: "PRESERVE_SAME_SHELL_FAMILY",
      secondary_window_policy: "SUPPORT_ONLY_PARENT_BOUND",
      session_scope_ref_or_null: null,
      shell_family: "CALM_SHELL",
      stability_guard_hash_or_null: stabilityContract.guard_vector_hash,
      supported_invalidation_reason_codes: [
        "TENANT_SWITCH",
        "PRIVILEGE_DOWNGRADE",
        "ACCESS_BINDING_CHANGE",
        "MASKING_CHANGE",
        "SESSION_REVOKED",
        "SCHEMA_INCOMPATIBLE",
        "OBJECT_GONE",
        "PARENT_WINDOW_CLOSED",
      ],
      visibility_cache_partition_key_or_null: null,
    },
    decision_bundle_hash: decisionBundleHash,
    decision_bundle_ref: `decision-bundle://${manifestId}`,
    decision_summary: surface.decision_summary,
    detail_drawer: surface.detail_drawer,
    dominance_contract: {
      contract_version: "SHELL_DOMINANCE_V1",
      detached_support_policy: "SUPPORT_ONLY_NEVER_PRIMARY",
      dominant_action_ref_or_null:
        surface.action_strip.actionability_state === "ACTION_AVAILABLE" ? "REFRESH" : null,
      dominant_action_surface_code: "ACTION_STRIP",
      dominant_question_surface_code: "DECISION_SUMMARY",
      explicit_multifocus_mode: "DEFAULT",
      parallel_primary_posture: "DISALLOWED",
      promoted_support_surface_code_or_null:
        surface.activeDetailSurface === null ? null : "DETAIL_DRAWER",
      renderer_salience_policy: "SERVER_AUTHORED_ONLY",
      responsive_collapse_policy: "PRESERVE_DOMINANT_SUMMARY_AND_ACTION",
      safe_action_state: surface.action_strip.actionability_state,
      summary_action_alignment_policy: "SAME_DOMINANT_QUESTION",
      supplemental_queue_policy: "NOT_APPLICABLE",
      support_surface_role: surface.activeDetailSurface === null ? "NONE" : "RECOVERY",
    },
    dominant_question:
      posture === "STEADY" ? "Is this manifest current?" : "What recovery is required?",
    experience_profile: "LOW_NOISE",
    focus_anchor_ref: surface.focusAnchorRef,
    frame_epoch: frameEpoch,
    frame_id: input.frameId ?? `frame.${manifestId}.${frameEpoch}.${lastPublishedSequence}`,
    interaction_layer: calmInteractionLayer(),
    last_published_sequence: lastPublishedSequence,
    low_noise_budget_audit: {
      attention_budget_state: "WITHIN_FROZEN_ATTENTION_BUDGET",
      audit_scope: "FIRST_VIEW",
      coalesced_change_count_or_null: null,
      collapsed_reason_count: 0,
      concurrent_primary_count: 1,
      continuity_cost_or_null: null,
      contract_version: "LOW_NOISE_BUDGET_AUDIT_V1",
      copy_budget_state: "WITHIN_FROZEN_COPY_BUDGET",
      detail_fallback_state: "NOT_APPLICABLE",
      dominant_issue_count: surface.decision_summary.primary_issue_ref === null ? 0 : 1,
      duplicate_posture_cluster_count: 0,
      duplicate_posture_codes: [],
      persistent_surface_count: 4,
      primary_mutation_action_count: 0,
      prominent_motion_count: 0,
      rank_swap_count_or_null: null,
      refresh_budget_state: "NOT_APPLICABLE",
      rendered_surface_order: ["CONTEXT_BAR", "DECISION_SUMMARY", "ACTION_STRIP", "DETAIL_DRAWER"],
      scan_load: 1,
      secondary_mutation_action_count: 0,
      semantic_coverage_state: "LOSSLESS_DECISIVE_ATOMS_VISIBLE_OR_ROUTE_STABLE",
      shell_family: "CALM_SHELL",
      surface_budget_state: "WITHIN_FROZEN_SURFACE_BUDGET",
      visible_action_count: surface.action_strip.actionability_state === "ACTION_AVAILABLE" ? 1 : 0,
      visible_change_count_in_window_or_null: null,
      visible_detail_entry_count: surface.attention_policy.detail_entry_points.length,
      visible_reason_count: surface.decision_summary.visible_reasons.length,
      visible_shell_char_count: 280,
      visible_warning_count: surface.visibleWarningCount,
    },
    manifest_id: manifestId,
    object_anchor_ref: manifestId,
    recovery_posture: surface.recoveryPosture,
    rendered_at: input.renderedAt ?? "2026-05-03T10:00:00.000Z",
    resume_token: resumeToken,
    semantic_accessibility_contract: {
      announced_change_kinds: [
        "LIMITATION_NOTICE",
        "RECOVERY_NOTICE",
        "COMMAND_FAILURE",
        "TERMINAL_SETTLEMENT",
      ],
      artifact_handoff_policy: "CURRENT_AND_HISTORY_ANCHORS_SEPARATE",
      browser_identifier_policy: "DATA_TESTID_MIRRORS_SEMANTIC_ANCHOR",
      conditional_notice_anchor_policy:
        "LIMITATION_AND_RECOVERY_NOTICES_REQUIRE_ADDRESSABLE_ANCHORS",
      contract_version: "SEMANTIC_ACCESSIBILITY_V1",
      detail_module_access_policy: "SUPPORT_MODULES_KEYBOARD_AND_ASSISTIVE_TECH_REACHABLE",
      focus_entry_policy: "REQUESTED_ANCHOR_OR_PRIMARY_HEADING_OR_EXPLICIT_NOTICE",
      focus_order_policy: "VISIBLE_SEMANTIC_ORDER_ONLY",
      focus_restore_policy: "RETURN_TO_INVOKER_OR_LAWFUL_ANCESTOR",
      heading_navigation_policy: "PRIMARY_HEADING_AND_PROMOTED_REGION_HEADINGS",
      identifier_semantics_policy: "DOMAIN_MEANING_OVER_VISUAL_STYLING",
      keyboard_completion_policy: "ALL_GOVERNED_ACTIONS_KEYBOARD_OPERABLE",
      landmark_structure_policy: "STABLE_SHELL_SUMMARY_ACTION_SUPPORT_AND_NOTICE_LANDMARKS",
      live_region_policy: "POLITE_ACTIVITY_ASSERTIVE_FAILURE_ONLY",
      live_update_focus_policy: "NEVER_STEAL_ACTIVE_INPUT_OR_PICKER_FOCUS",
      native_identifier_policy: "ACCESSIBILITY_IDENTIFIER_MIRRORS_SEMANTIC_ANCHOR",
      reduced_motion_policy: "MEANING_PRESERVED_WITH_MINIMAL_OR_NO_MOTION",
      required_anchor_codes: [
        "SHELL_ROOT",
        "SHELL_FAMILY",
        "OBJECT_ANCHOR",
        "DOMINANT_QUESTION",
        "DOMINANT_ACTION",
        "SETTLEMENT_POSTURE",
        "RECOVERY_POSTURE",
        "CONTEXT_BAR",
        "DECISION_SUMMARY",
        "ACTION_STRIP",
        "PRIMARY_ACTION",
        "DETAIL_DRAWER",
        "PROMOTED_SUPPORT_REGION",
        "LIMITATION_NOTICE",
        "RECOVERY_NOTICE",
      ],
      selector_profile: "OPERATOR_SEMANTIC_SELECTORS_V1",
      semantic_focus_order: ["CONTEXT_BAR", "DECISION_SUMMARY", "ACTION_STRIP", "DETAIL_DRAWER"],
      shell_family: "CALM_SHELL",
      support_region_access_policy: "PROMOTED_SUPPORT_REGION_KEYBOARD_REACHABLE_AND_ESCAPABLE",
    },
    settlement_state: surface.settlementState,
    shell_family: "CALM_SHELL",
    shell_route_key: manifestId,
    shell_stability_token: shellStabilityToken,
    stability_contract: stabilityContract,
    state_taxonomy_contract: {
      contract_version: "SHELL_STATE_TAXONOMY_V1",
      current_empty_state_or_null: null,
      current_empty_surface_code_or_null: null,
      current_recovery_posture: surface.recoveryPosture,
      current_settlement_state: surface.settlementState,
      generic_placeholder_policy: "FORBID_GENERIC_EMPTY_SPINNER_WARNING",
      limitation_reason_codes: [],
      limitation_reason_policy: "LIMITED_REQUIRES_EXPLICIT_REASON_CODES",
      loading_strategy: "INLINE_PRESERVE_PRIOR_CONTENT",
      mounted_context_state:
        surface.recoveryPosture === "NONE" ? "LIVE_CURRENT" : "READ_ONLY_PRESERVED",
      profile_copy_policy: "PROFILE_COPY_MUST_MAP_TO_SHARED_TAXONOMY",
      recovery_navigation_policy: "PRESERVE_CURRENT_OBJECT_UNLESS_SUPERSEDED",
      stale_action_policy: "STALE_DEGRADED_AND_RECOVERY_REQUIRE_NO_SAFE_ACTION",
    },
    stream_recovery_contract: streamRecoveryContract,
    surface_order: ["CONTEXT_BAR", "DECISION_SUMMARY", "ACTION_STRIP", "DETAIL_DRAWER"],
    trust_summary_ref: `trust-summary://${manifestId}`,
    truth_boundary_contract: readSideTruthBoundaryContract(),
    truth_origin: "PERSISTED_STATE",
    truth_state: "PERSISTED_INTERNAL",
  };
}

export async function persistedExperienceFrameFixture(input: {
  actor?: ReturnType<typeof actorContext>;
  frameEpoch?: number;
  lastPublishedSequence?: number;
  manifestId: string;
  posture?: ExperienceSnapshotPosture;
  repository?: LowNoiseExperienceFrameRepository;
}) {
  const repository = input.repository ?? new LowNoiseExperienceFrameRepository();
  const frame = experienceFrameFixture(input);
  const stored = await repository.persistFrame({ frame });
  return {
    frame,
    repository,
    stored,
  };
}

export function experienceStreamEventFixture(input: {
  deltaRef?: string;
  eventType?: ExperienceStreamEvent["event_type"];
  frame: LowNoiseExperienceFrameRecord;
  occurredAt?: string;
  sequence: number;
  snapshotRef?: string;
  terminalBundleRef?: string;
}): ExperienceStreamEvent {
  const eventType = input.eventType ?? "experience.delta";
  return {
    artifact_type: "ExperienceStreamEvent",
    delta_ref:
      eventType === "experience.delta"
        ? (input.deltaRef ?? `delta://${input.frame.manifest_id}/${input.sequence}`)
        : null,
    event_type: eventType,
    experience_sequence: input.sequence,
    frame_epoch: input.frame.frame_epoch,
    manifest_id: input.frame.manifest_id,
    occurred_at:
      input.occurredAt ?? `2026-05-03T10:00:${String(input.sequence).padStart(2, "0")}.000Z`,
    resume_token: input.frame.resume_token,
    shell_route_key: input.frame.shell_route_key,
    shell_stability_token: input.frame.shell_stability_token,
    snapshot_ref:
      eventType === "experience.snapshot"
        ? (input.snapshotRef ?? `snapshot://${input.frame.manifest_id}/${input.sequence}`)
        : null,
    stability_contract: input.frame.stability_contract,
    stream_recovery_contract: input.frame.stream_recovery_contract,
    stream_scope_class: "MANIFEST_EXPERIENCE",
    terminal_bundle_ref:
      eventType === "terminal.bundle"
        ? (input.terminalBundleRef ?? `terminal-bundle://${input.frame.manifest_id}`)
        : null,
  };
}
