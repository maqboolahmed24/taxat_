import type {
  CacheIsolationContract,
  CommandTruthBoundaryContract,
} from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type {
  ActionStripState,
  ContextBarState,
  CrossDeviceContinuityContract,
  DecisionSummaryState,
  LowNoiseExperienceFrameAttentionPolicy,
  RouteStabilityContract,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import { buildCacheIsolationContract as buildSharedCacheIsolationContract } from "../../../backend-recovery/src/services/build_cache_isolation_contract.ts";
import { buildManifestRouteContinuityContract as buildSharedManifestRouteContinuityContract } from "../../../backend-recovery/src/services/build_cross_device_continuity_contract.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { createStreamRecoveryContract } from "../../../domain-kernel/src/streaming/stream_recovery.ts";
import {
  lowNoiseCognitiveBudget,
  lowNoiseCopyBudget,
  lowNoiseSurfaceOrder,
  type LowNoiseAction,
  type LowNoiseActionabilityState,
  type LowNoiseDetailAudience,
  type LowNoiseAttentionState,
  type LowNoiseDetailDrawerState,
  type LowNoiseDetailEntryCandidate,
  type LowNoiseDetailModuleCode,
  type LowNoiseExperienceFrameRecord,
  type LowNoiseRecoveryPosture,
  type LowNoiseSettlementState,
} from "../models/low_noise_frame.ts";
import type {
  LowNoiseActionCandidate,
  LowNoiseReasonCandidate,
  LowNoiseSurfaceProjectorInput,
} from "../models/low_noise_surface_projector_input.ts";
import { buildActionStripState, mustFailClosedLowNoisePosture } from "./build_action_strip_state.ts";
import { buildContextBarState, normalizedContextConnectionState } from "./build_context_bar_state.ts";
import { buildDecisionSummaryState } from "./build_decision_summary_state.ts";
import { buildDetailDrawerState } from "./build_detail_drawer_state.ts";
import { deriveDominantQuestionAndSafeAction } from "../services/derive_dominant_question_and_safe_action.ts";
import { projectShellDominanceContract } from "../services/project_shell_dominance_contract.ts";
import { projectShellStateTaxonomyContract } from "../services/project_shell_state_taxonomy_contract.ts";
import { projectOperatorInteractionLayer } from "../services/project_operator_interaction_layer.ts";
import { projectSemanticAccessibilityContract } from "../services/project_semantic_accessibility_contract.ts";
import {
  assertLowNoiseBudgetWithinFrozenRules,
  buildLowNoiseBudgetAudit,
} from "../audit/build_low_noise_budget_audit.ts";
import { validateLowNoiseFramePublication } from "../services/validate_low_noise_frame_publication.ts";
import { validatePublishedSurfaceOrder } from "../services/validate_published_surface_order.ts";

export type BuildLowNoiseExperienceFrameInput = {
  accessBindingHash: string;
  activeDetailSurfaceCode?: LowNoiseDetailModuleCode | null;
  additionalReasonCount?: number;
  auditModeExplicit?: boolean;
  auditScope?: "FIRST_VIEW" | "NON_MATERIAL_REFRESH" | "RECOVERY_RECONNECT";
  checkpointState?: LowNoiseExperienceFrameRecord["checkpoint_state"];
  clientIdOrNull?: string | null;
  coalescedChangeCountOrNull?: number | null;
  compareModeExplicit?: boolean;
  connectionState?: ContextBarState["connection_state"];
  contextLimitationStatement?: string;
  continuityCostOrNull?: number | null;
  decisionBundleHash: string;
  decisionBundleRef?: string;
  decisionLimitationReasonCodes?: readonly string[];
  decisionLimitationState?: DecisionSummaryState["limitation_state"];
  decisionLimitationStatement?: string | null;
  detailAudience?: LowNoiseDetailAudience;
  detailEntries?: readonly LowNoiseDetailEntryCandidate[];
  detailFocusAnchorObjectRef?: string;
  detailPreviousEntryPoints?: readonly LowNoiseDetailModuleCode[];
  dominantQuestion?: string;
  frameEpoch: number;
  frameId?: string;
  headline?: string;
  lastPublishedSequence: number;
  manifestId: string;
  manifestLabel?: string;
  maskingContextHash: string;
  modePosture?: ContextBarState["mode_posture"];
  noSafeActionReasonCode?: string;
  objectAnchorRef?: string;
  ownershipLabel?: string | null;
  ownershipPosture?: ActionStripState["ownership_posture"];
  ownerHandoffPosture?: ContextBarState["owner_handoff_posture"];
  ownerLabel?: string | null;
  periodLabel?: string;
  plainExplanation?: string;
  previousDominantQuestion?: string | null;
  primaryAction?: Partial<LowNoiseAction> | null;
  primaryActionCandidates?: readonly LowNoiseActionCandidate[];
  primaryIssueRef?: string | null;
  primaryRankScore?: number;
  previousFocusAnchorRef?: string | null;
  principalClass: string;
  publicationGeneration: number;
  rankSwapCountOrNull?: number | null;
  reasons?: readonly LowNoiseReasonCandidate[];
  recoveryPosture?: LowNoiseRecoveryPosture;
  renderedAt: string;
  resumeToken: string;
  scopeLabel?: string;
  secondaryActionCandidates?: readonly LowNoiseActionCandidate[];
  secondaryActions?: readonly Partial<LowNoiseAction>[];
  sessionBindingHash: string;
  sessionRef: string;
  settlementState?: LowNoiseSettlementState;
  shellStabilityToken: string;
  suggestedDetailSurfaceCode?: LowNoiseDetailModuleCode | null;
  tenantId: string;
  trustSummaryRef?: string;
  truthOrigin?: ContextBarState["truth_origin"];
  truthState?: LowNoiseExperienceFrameRecord["truth_state"];
  uncertaintyStatement?: string | null;
  visibleChangeCountInWindowOrNull?: number | null;
  visibleSecondaryLimit?: number;
  visibleWarningCount?: number;
  waitingOnLabel?: string | null;
  workflowPhaseLabel?: string;
};

type NormalizedPosture = {
  connectionState: ContextBarState["connection_state"];
  modePosture: ContextBarState["mode_posture"];
  recoveryPosture: LowNoiseRecoveryPosture;
  settlementState: LowNoiseSettlementState;
};

function requireString(label: string, value: string) {
  if (value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function requireNonNegativeInteger(label: string, value: number) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return value;
}

function boundedText(value: string | null | undefined, fallback: string, maxChars: number) {
  const source = (value ?? fallback).split(/\s+/u).join(" ").trim();
  const safe = source.length === 0 ? fallback : source;
  return safe.length <= maxChars ? safe : safe.slice(0, maxChars).trimEnd();
}

function normalizedConnectionState(
  connectionState: ContextBarState["connection_state"] | undefined,
): ContextBarState["connection_state"] {
  return normalizedContextConnectionState(connectionState);
}

function normalizePosture(input: BuildLowNoiseExperienceFrameInput): NormalizedPosture {
  const connectionState = normalizedConnectionState(input.connectionState);
  let settlementState =
    input.settlementState ??
    (connectionState === "STALE"
      ? "STALE_REVIEW_REQUIRED"
      : connectionState === "DEGRADED"
        ? "DEGRADED_READ_ONLY"
        : connectionState === "CATCHING_UP"
          ? "FRESHENING"
          : "STEADY");
  let recoveryPosture = input.recoveryPosture ?? "NONE";
  if (recoveryPosture !== "NONE" && settlementState === "STEADY") {
    settlementState = "RECOVERY_REQUIRED";
  }
  if (settlementState === "RECOVERY_REQUIRED" && recoveryPosture === "NONE") {
    recoveryPosture = "INLINE_RECONNECT";
  }
  const modePosture =
    input.modePosture ??
    (connectionState === "CONNECTED" && recoveryPosture === "NONE" ? "LIVE_COMPLIANCE" : "READ_ONLY");
  return {
    connectionState,
    modePosture,
    recoveryPosture,
    settlementState,
  };
}

function mustFailClosed(posture: NormalizedPosture) {
  return mustFailClosedLowNoisePosture(posture);
}

function buildRouteStabilityContract(input: {
  decisionBundleHash: string;
  frameEpoch: number;
  lastPublishedSequence: number;
  publicationGeneration: number;
  resumeToken: string;
  shellStabilityToken: string;
}): RouteStabilityContract {
  const guardVectorComponents: RouteStabilityContract["guard_vector_components"] = {
    client_portal_workspace_version_or_null: null,
    customer_thread_head_or_null: null,
    decision_bundle_hash_or_null: input.decisionBundleHash,
    dependency_topology_hash_or_null: null,
    frame_epoch_or_null: input.frameEpoch,
    internal_thread_head_or_null: null,
    policy_snapshot_hash_or_null: null,
    request_state_version_or_null: null,
    shell_stability_token_or_null: input.shellStabilityToken,
    simulation_basis_hash_or_null: null,
    view_guard_ref_or_null: null,
    work_item_version_or_null: null,
  };
  return {
    guard_vector_components: guardVectorComponents,
    guard_vector_hash: stableJsonHash(guardVectorComponents),
    last_published_sequence_or_null: input.lastPublishedSequence,
    publication_generation: input.publicationGeneration,
    resume_capability: "STREAM_RESUMABLE",
    resume_token_or_null: input.resumeToken,
    route_scope_class: "MANIFEST_EXPERIENCE",
  };
}

function buildTruthBoundaryContract(): CommandTruthBoundaryContract {
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

function buildCacheIsolationContract(input: {
  accessBindingHash: string;
  clientIdOrNull: string | null;
  manifestId: string;
  maskingContextHash: string;
  principalClass: string;
  projectionVersionRef: string;
  sessionBindingHash: string;
  shellStabilityToken: string;
  tenantId: string;
}): CacheIsolationContract {
  const cachePartitionRef = stableJsonHash({
    access_binding_hash: input.accessBindingHash,
    cache_scope_class: "LOW_NOISE_FRAME",
    client_id_or_null: input.clientIdOrNull,
    masking_context_hash: input.maskingContextHash,
    route_identity_ref: input.manifestId,
    session_binding_hash: input.sessionBindingHash,
    tenant_id: input.tenantId,
  });
  return buildSharedCacheIsolationContract({
    access_binding_hash_or_null: input.accessBindingHash,
    cache_partition_ref: cachePartitionRef,
    cache_scope_class: "LOW_NOISE_FRAME",
    canonical_object_ref: input.manifestId,
    client_id_or_null: input.clientIdOrNull,
    customer_safe_projection: false,
    masking_posture_fingerprint_or_null: input.maskingContextHash,
    principal_class: input.principalClass,
    projection_version_ref: input.projectionVersionRef,
    route_identity_ref: input.manifestId,
    session_binding_hash: input.sessionBindingHash,
    shell_family: "CALM_SHELL",
    shell_stability_ref_or_null: input.shellStabilityToken,
    tenant_id: input.tenantId,
  });
}

function buildCrossDeviceContinuityContract(input: {
  actionabilityState: LowNoiseActionabilityState;
  focusAnchorRef: string | null;
  objectAnchorRef: string;
  shellRouteKey: string;
  stabilityGuardHash: string;
}): CrossDeviceContinuityContract {
  return buildSharedManifestRouteContinuityContract({
    canonical_object_ref: input.objectAnchorRef,
    dominant_action_state_or_null: input.actionabilityState,
    focus_anchor_ref_or_null: input.focusAnchorRef,
    route_identity_ref: input.shellRouteKey,
    stability_guard_hash_or_null: input.stabilityGuardHash,
  });
}

function buildAttentionPolicy(input: {
  actionStrip: ActionStripState;
  decisionSummary: DecisionSummaryState;
  detailDrawer: LowNoiseDetailDrawerState;
  manifestId: string;
  primaryRankScore?: number;
}): LowNoiseExperienceFrameAttentionPolicy {
  if (input.decisionSummary.attention_state === "CALM") {
    return {
      actionability_state: input.actionStrip.actionability_state,
      attention_state: "CALM",
      default_detail_module_code: input.detailDrawer.entry_points[0]?.module_code ?? null,
      detail_entry_points: input.detailDrawer.entry_points.map((entry) => entry.module_code),
      dominance_margin: 0,
      no_safe_action_reason_code: null,
      policy_version: "LOW_NOISE_ATTENTION_POLICY_V1",
      primary_action_code: input.actionStrip.primary_action?.action_code ?? null,
      primary_object_ref: input.manifestId,
      primary_rank_score: 0,
      primary_surface_code: "DECISION_SUMMARY",
      ranking_basis: ["DOMINANT_QUESTION", "ACTIONABILITY", "DETAIL_CONTINUITY"],
      runner_up_rank_score: 0,
      secondary_notice_count: 0,
      suggested_detail_surface_code: input.actionStrip.suggested_detail_surface_code,
      visible_warning_count: 0,
    };
  }
  const primaryRankScore = input.primaryRankScore ?? 80;
  const runnerUpRankScore = Math.max(0, primaryRankScore - 20);
  return {
    actionability_state: input.actionStrip.actionability_state,
    attention_state: input.decisionSummary.attention_state,
    default_detail_module_code: input.detailDrawer.entry_points[0]?.module_code ?? null,
    detail_entry_points: input.detailDrawer.entry_points.map((entry) => entry.module_code),
    dominance_margin: primaryRankScore - runnerUpRankScore,
    no_safe_action_reason_code: input.actionStrip.no_safe_action_reason_code,
    policy_version: "LOW_NOISE_ATTENTION_POLICY_V1",
    primary_action_code: input.actionStrip.primary_action?.action_code ?? null,
    primary_object_ref: input.manifestId,
    primary_rank_score: primaryRankScore,
    primary_surface_code: "DECISION_SUMMARY",
    ranking_basis: ["DOMINANT_QUESTION", "ACTIONABILITY", "DETAIL_CONTINUITY"],
    runner_up_rank_score: runnerUpRankScore,
    secondary_notice_count:
      input.decisionSummary.additional_reason_count + input.decisionSummary.visible_warning_count,
    suggested_detail_surface_code: input.actionStrip.suggested_detail_surface_code,
    visible_warning_count: input.decisionSummary.visible_warning_count,
  };
}

function compactSurfacesToBudget(input: {
  actionStrip: ActionStripState;
  attentionPolicy: ReturnType<typeof buildAttentionPolicy>;
  contextBar: ContextBarState;
  decisionSummary: DecisionSummaryState;
  detailDrawer: LowNoiseDetailDrawerState;
}) {
  let actionStrip = input.actionStrip;
  let detailDrawer = input.detailDrawer;
  let attentionPolicy = input.attentionPolicy;
  let budgetAudit = buildLowNoiseBudgetAudit({
    action_strip: actionStrip,
    context_bar: input.contextBar,
    decision_summary: input.decisionSummary,
    detail_drawer: detailDrawer,
  });
  if (budgetAudit.scan_load <= lowNoiseCognitiveBudget.visibility_budget_units) {
    return { actionStrip, attentionPolicy, budgetAudit, detailDrawer };
  }

  if (actionStrip.secondary_actions.length > 0) {
    actionStrip = {
      ...actionStrip,
      available_action_codes: actionStrip.primary_action ? [actionStrip.primary_action.action_code] : [],
      secondary_actions: [],
      suppressed_secondary_count: 0,
    };
  }
  if (detailDrawer.entry_points.length > 1) {
    const retainedEntry =
      detailDrawer.expanded_module_code === null
        ? detailDrawer.entry_points[0]
        : (detailDrawer.entry_points.find(
            (entry) => entry.module_code === detailDrawer.expanded_module_code,
          ) ?? detailDrawer.entry_points[0]);
    detailDrawer = {
      ...detailDrawer,
      entry_points: retainedEntry ? [retainedEntry] : detailDrawer.entry_points.slice(0, 1),
    };
  }
  attentionPolicy = {
    ...attentionPolicy,
    default_detail_module_code: detailDrawer.entry_points[0]?.module_code ?? null,
    detail_entry_points: detailDrawer.entry_points.map((entry) => entry.module_code),
  };
  budgetAudit = buildLowNoiseBudgetAudit({
    action_strip: actionStrip,
    context_bar: input.contextBar,
    decision_summary: input.decisionSummary,
    detail_drawer: detailDrawer,
  });
  return { actionStrip, attentionPolicy, budgetAudit, detailDrawer };
}

function taxonomyInputsFromSurfaces(input: {
  decisionSummary: DecisionSummaryState;
  detailDrawer: LowNoiseDetailDrawerState;
  recoveryPosture: LowNoiseRecoveryPosture;
  settlementState: LowNoiseSettlementState;
}) {
  const summaryEmpty =
    input.decisionSummary.limitation_state === "NONE" ? null : input.decisionSummary.limitation_state;
  const expandedEntry =
    input.detailDrawer.expanded_module_code === null
      ? null
      : (input.detailDrawer.entry_points.find(
          (entry) => entry.module_code === input.detailDrawer.expanded_module_code,
        ) ?? null);
  const detailEmpty =
    expandedEntry !== null && expandedEntry.content_state !== "POPULATED"
      ? expandedEntry.content_state
      : null;
  const currentEmptyStateOrNull = summaryEmpty ?? detailEmpty;
  return {
    currentEmptyStateOrNull,
    currentEmptySurfaceCodeOrNull:
      summaryEmpty !== null ? "DECISION_SUMMARY" : detailEmpty !== null ? "DETAIL_DRAWER" : null,
    limitationReasonCodes:
      summaryEmpty === "LIMITED"
        ? input.decisionSummary.limitation_reason_codes
        : detailEmpty === "LIMITED" && expandedEntry !== null
          ? expandedEntry.limitation_reason_codes
          : [],
    recoveryPosture: input.recoveryPosture,
    settlementState: input.settlementState,
  };
}

export function buildLowNoiseExperienceFrame(
  input: BuildLowNoiseExperienceFrameInput,
): LowNoiseExperienceFrameRecord {
  requireString("manifestId", input.manifestId);
  requireString("decisionBundleHash", input.decisionBundleHash);
  requireString("shellStabilityToken", input.shellStabilityToken);
  requireString("resumeToken", input.resumeToken);
  requireNonNegativeInteger("frameEpoch", input.frameEpoch);
  requireNonNegativeInteger("lastPublishedSequence", input.lastPublishedSequence);
  requireNonNegativeInteger("publicationGeneration", input.publicationGeneration);
  const posture = normalizePosture(input);
  const shellRouteKey = input.manifestId;
  const objectAnchorRef = input.objectAnchorRef ?? input.manifestId;
  const frameId =
    input.frameId ??
    `low-noise-frame.${input.manifestId}.${input.frameEpoch}.${input.lastPublishedSequence}`;
  const decisionBundleRef = input.decisionBundleRef ?? `decision-bundle://${input.manifestId}`;
  const projectionVersionRef = stableJsonHash({
    decision_bundle_hash: input.decisionBundleHash,
    frame_epoch: input.frameEpoch,
    last_published_sequence: input.lastPublishedSequence,
    manifest_id: input.manifestId,
  });
  const noSafe = mustFailClosed(posture) || input.primaryAction === null;
  const requestedSuggestedDetailSurfaceCode =
    input.suggestedDetailSurfaceCode ??
    (noSafe ? (input.activeDetailSurfaceCode ?? "FOCUS_LENS") : null);
  const requestedActiveDetailSurfaceCode = noSafe
    ? (input.activeDetailSurfaceCode ?? requestedSuggestedDetailSurfaceCode)
    : (input.activeDetailSurfaceCode ?? null);
  const detailResult = buildDetailDrawerState({
    activeDetailSurfaceCode: requestedActiveDetailSurfaceCode,
    auditModeExplicit: input.auditModeExplicit,
    compareModeExplicit: input.compareModeExplicit,
    detailAudience: input.detailAudience,
    detailEntries: input.detailEntries,
    focusAnchorObjectRef: input.detailFocusAnchorObjectRef ?? objectAnchorRef,
    manifestId: input.manifestId,
    previousDetailEntryPoints: input.detailPreviousEntryPoints,
    previousFocusAnchorRef: input.previousFocusAnchorRef,
    suggestedDetailSurfaceCode: requestedSuggestedDetailSurfaceCode,
  });
  const activeDetailSurfaceCode = detailResult.activeDetailSurfaceCode;
  const suggestedDetailSurfaceCode = noSafe ? detailResult.suggestedDetailSurfaceCode : null;
  const attentionState: LowNoiseAttentionState =
    input.reasons && input.reasons.length > 0
      ? (input.visibleWarningCount === 0 ? "NOTICE" : "REVIEW")
      : noSafe
        ? "REVIEW"
        : "CALM";
  const surfaceProjectorInput = {
    actionabilityState: noSafe ? "NO_SAFE_ACTION" : "ACTION_AVAILABLE",
    activeDetailSurfaceCode,
    additionalReasonCount: input.additionalReasonCount,
    attentionState,
    contextLimitationStatement: input.contextLimitationStatement,
    decisionLimitationReasonCodes: input.decisionLimitationReasonCodes,
    decisionLimitationState: input.decisionLimitationState,
    decisionLimitationStatement: input.decisionLimitationStatement,
    detailAudience: input.detailAudience,
    detailEntries: input.detailEntries,
    detailFocusAnchorObjectRef: input.detailFocusAnchorObjectRef,
    detailPreviousEntryPoints: input.detailPreviousEntryPoints,
    focusAnchorRef: detailResult.focusAnchorRef,
    headline: input.headline,
    manifestId: input.manifestId,
    manifestLabel: input.manifestLabel,
    noSafeActionReasonCode: input.noSafeActionReasonCode,
    objectAnchorRef,
    ownershipLabel: input.ownershipLabel,
    ownershipPosture: input.ownershipPosture,
    ownerHandoffPosture: input.ownerHandoffPosture,
    ownerLabel: input.ownerLabel,
    periodLabel: input.periodLabel,
    plainExplanation: input.plainExplanation,
    posture,
    primaryAction: input.primaryAction,
    primaryActionCandidates: input.primaryActionCandidates,
    primaryIssueRef: input.primaryIssueRef,
    reasons: input.reasons,
    scopeLabel: input.scopeLabel,
    secondaryActionCandidates: input.secondaryActionCandidates,
    secondaryActions: input.secondaryActions,
    suggestedDetailSurfaceCode,
    truthOrigin: input.truthOrigin ?? "PERSISTED_STATE",
    uncertaintyStatement: input.uncertaintyStatement,
    visibleSecondaryLimit: input.visibleSecondaryLimit,
    visibleWarningCount: input.visibleWarningCount,
    waitingOnLabel: input.waitingOnLabel,
    workflowPhaseLabel: input.workflowPhaseLabel,
  } satisfies LowNoiseSurfaceProjectorInput;
  const contextBar = buildContextBarState(surfaceProjectorInput);
  const decisionSummary = buildDecisionSummaryState(surfaceProjectorInput);
  const actionResult = buildActionStripState(surfaceProjectorInput);
  let detailDrawer = detailResult.detailDrawer;
  let attentionPolicy = buildAttentionPolicy({
    actionStrip: actionResult.actionStrip,
    decisionSummary,
    detailDrawer,
    manifestId: input.manifestId,
    primaryRankScore: input.primaryRankScore,
  });
  const compacted = compactSurfacesToBudget({
    actionStrip: actionResult.actionStrip,
    attentionPolicy,
    contextBar,
    decisionSummary,
    detailDrawer,
  });
  const actionStrip = compacted.actionStrip;
  attentionPolicy = compacted.attentionPolicy;
  detailDrawer = compacted.detailDrawer;
  const stabilityContract = buildRouteStabilityContract({
    decisionBundleHash: input.decisionBundleHash,
    frameEpoch: input.frameEpoch,
    lastPublishedSequence: input.lastPublishedSequence,
    publicationGeneration: input.publicationGeneration,
    resumeToken: input.resumeToken,
    shellStabilityToken: input.shellStabilityToken,
  });
  const lowNoiseBudgetAudit = assertLowNoiseBudgetWithinFrozenRules(
    buildLowNoiseBudgetAudit({
      action_strip: actionStrip,
      auditScope: input.auditScope,
      coalescedChangeCountOrNull: input.coalescedChangeCountOrNull,
      context_bar: contextBar,
      continuityCostOrNull: input.continuityCostOrNull,
      decision_summary: decisionSummary,
      detailFallbackState: detailResult.detailFallbackState,
      detail_drawer: detailDrawer,
      rankSwapCountOrNull: input.rankSwapCountOrNull,
      visibleChangeCountInWindowOrNull: input.visibleChangeCountInWindowOrNull,
    }),
  );
  const dominantSalience = deriveDominantQuestionAndSafeAction({
    actionabilityState: actionStrip.actionability_state,
    dominantQuestion: boundedText(
      input.dominantQuestion,
      noSafe ? "What recovery is required?" : "Is this manifest current?",
      120,
    ),
    noSafeActionReasonCode: actionStrip.no_safe_action_reason_code,
    previousDominantQuestion:
      input.previousDominantQuestion === null || input.previousDominantQuestion === undefined
        ? null
        : boundedText(input.previousDominantQuestion, "What is the current safe next step?", 120),
    primaryActionCode: actionStrip.primary_action?.action_code ?? null,
    recoveryPosture: posture.recoveryPosture,
    settlementState: posture.settlementState,
    shellFamily: "CALM_SHELL",
  });
  const frame: LowNoiseExperienceFrameRecord = {
    action_strip: actionStrip,
    active_detail_surface_code: activeDetailSurfaceCode,
    artifact_type: "LowNoiseExperienceFrame",
    attention_policy: attentionPolicy,
    cache_isolation_contract: buildCacheIsolationContract({
      accessBindingHash: input.accessBindingHash,
      clientIdOrNull: input.clientIdOrNull ?? null,
      manifestId: input.manifestId,
      maskingContextHash: input.maskingContextHash,
      principalClass: input.principalClass,
      projectionVersionRef,
      sessionBindingHash: input.sessionBindingHash,
      shellStabilityToken: input.shellStabilityToken,
      tenantId: input.tenantId,
    }),
    checkpoint_state: input.checkpointState ?? "NONE",
    cognitive_budget: lowNoiseCognitiveBudget,
    connection_state: posture.connectionState,
    context_bar: contextBar,
    copy_budget: lowNoiseCopyBudget,
    cross_device_continuity_contract: buildCrossDeviceContinuityContract({
      actionabilityState: actionStrip.actionability_state,
      focusAnchorRef: detailResult.focusAnchorRef,
      objectAnchorRef,
      shellRouteKey,
      stabilityGuardHash: stabilityContract.guard_vector_hash,
    }),
    decision_bundle_hash: input.decisionBundleHash,
    decision_bundle_ref: decisionBundleRef,
    decision_summary: decisionSummary,
    detail_drawer: detailDrawer,
    dominance_contract: projectShellDominanceContract({
      actionabilityState: actionStrip.actionability_state,
      activeDetailSurfaceCode,
      auditModeExplicit: detailDrawer.audit_mode_explicit,
      compareModeExplicit: detailDrawer.compare_mode_explicit,
      dominantActionRefOrNull: actionStrip.primary_action?.action_code ?? null,
      noSafeActionReasonCode: actionStrip.no_safe_action_reason_code,
      primaryActionCode: actionStrip.primary_action?.action_code ?? null,
      recoveryPosture: posture.recoveryPosture,
      settlementState: posture.settlementState,
      shellFamily: "CALM_SHELL",
    }),
    dominant_question: dominantSalience.dominantQuestion,
    experience_profile: "LOW_NOISE",
    focus_anchor_ref: detailResult.focusAnchorRef,
    frame_epoch: input.frameEpoch,
    frame_id: frameId,
    interaction_layer: projectOperatorInteractionLayer({
      actionabilityState: actionStrip.actionability_state,
      recoveryPosture: posture.recoveryPosture,
      settlementState: posture.settlementState,
    }),
    last_published_sequence: input.lastPublishedSequence,
    low_noise_budget_audit: lowNoiseBudgetAudit,
    manifest_id: input.manifestId,
    object_anchor_ref: objectAnchorRef,
    recovery_posture: posture.recoveryPosture,
    rendered_at: input.renderedAt,
    resume_token: input.resumeToken,
    semantic_accessibility_contract: projectSemanticAccessibilityContract({
      surfaceType: "LowNoiseExperienceFrame",
    }),
    settlement_state: posture.settlementState,
    shell_family: "CALM_SHELL",
    shell_route_key: shellRouteKey,
    shell_stability_token: input.shellStabilityToken,
    stability_contract: stabilityContract,
    state_taxonomy_contract: projectShellStateTaxonomyContract(
      taxonomyInputsFromSurfaces({
        decisionSummary,
        detailDrawer,
        recoveryPosture: posture.recoveryPosture,
        settlementState: posture.settlementState,
      }),
    ),
    stream_recovery_contract: createStreamRecoveryContract({
      access_binding_hash: input.accessBindingHash,
      compaction_floor_sequence_or_null: null,
      delivery_window_state: "LIVE_RESUMABLE",
      frame_epoch: input.frameEpoch,
      last_published_sequence: input.lastPublishedSequence,
      masking_context_hash: input.maskingContextHash,
      publication_generation: input.publicationGeneration,
      rebase_reason_code_or_null: null,
      resume_binding_ref_or_null: input.resumeToken,
      resume_binding_representation: "RAW_TOKEN",
      route_key: shellRouteKey,
      session_binding_hash: input.sessionBindingHash,
      session_ref: input.sessionRef,
      shell_stability_token: input.shellStabilityToken,
      stream_scope_class: "MANIFEST_EXPERIENCE",
      subject_ref: input.manifestId,
    }),
    surface_order: validatePublishedSurfaceOrder({ surfaceOrder: lowNoiseSurfaceOrder }),
    trust_summary_ref: input.trustSummaryRef ?? `trust-summary://${input.manifestId}`,
    truth_boundary_contract: buildTruthBoundaryContract(),
    truth_origin: input.truthOrigin ?? "PERSISTED_STATE",
    truth_state: input.truthState ?? "PERSISTED_INTERNAL",
  };
  return validateLowNoiseFramePublication(frame);
}
