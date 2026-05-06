import type {
  ExperienceDelta,
  ExperienceDeltaActionStripPayload,
  ExperienceDeltaActionToken,
  ExperienceDeltaContextBarPayload,
  ExperienceDeltaDecisionSummaryPayload,
  ExperienceDeltaDetailDrawerPayload,
  ExperienceDeltaDetailModule,
  ExperienceDeltaEmptyStateKind,
  ExperienceDeltaLowNoiseSurfaceCode,
  ExperienceDeltaSurfaceUpdate,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import type {
  LowNoiseExperienceFrameRecord,
  LowNoiseSurfaceCode,
} from "../models/low_noise_frame.ts";
import { buildLowNoiseBudgetAudit } from "../audit/build_low_noise_budget_audit.ts";
import {
  changedLowNoiseSurfaceCodes,
  computeContinuityCost,
  type LowNoiseContinuityCost,
} from "./compute_continuity_cost.ts";
import {
  coalesceNonMaterialRefresh,
  type LowNoiseCoalescingDecision,
} from "./coalesce_non_material_refresh.ts";
import {
  deriveDeltaPostureState,
  deriveSemanticMotion,
  prominentMotionCountForSemanticMotion,
} from "./derive_semantic_motion.ts";
import { validateDeltaMirrorContract } from "./validate_delta_mirror_contract.ts";

export type LowNoiseDeltaMateriality = "MATERIAL" | "NON_MATERIAL";

export type BuildExperienceDeltaInput = {
  causeRef: string;
  deliveryClass?: ExperienceDelta["delivery_class"] | undefined;
  experienceSequence: number;
  materiality?: LowNoiseDeltaMateriality | undefined;
  nextFrame: LowNoiseExperienceFrameRecord;
  occurredAt?: string | undefined;
  previousFrame?: LowNoiseExperienceFrameRecord | null | undefined;
  resumeToken?: string | null | undefined;
  visibleChangeCountInWindow?: number | undefined;
};

export type BuildExperienceDeltaResult = {
  coalescingDecision: LowNoiseCoalescingDecision;
  continuity: LowNoiseContinuityCost | null;
  delta: ExperienceDelta | null;
};

const noCoalescingDecision = {
  outcome: "PUBLISH",
  reasonCodes: [],
  shouldPublishDelta: true,
} as const satisfies LowNoiseCoalescingDecision;

function uniqueStrings(values: readonly (string | null | undefined)[]) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function emptyStateKindFromSummary(
  state: LowNoiseExperienceFrameRecord["decision_summary"]["limitation_state"],
): ExperienceDeltaEmptyStateKind {
  return state;
}

function detailModuleState(
  contentState: LowNoiseExperienceFrameRecord["detail_drawer"]["entry_points"][number]["content_state"],
): ExperienceDeltaDetailModule["module_state"] {
  switch (contentState) {
    case "POPULATED":
      return "READY";
    case "LIMITED":
      return "LIMITED";
    case "NOT_YET_MATERIALIZED":
      return "MATERIALIZING";
    case "NOT_APPLICABLE":
    case "NOT_REQUESTED":
      return "EMPTY";
  }
}

function actionToken(
  action: NonNullable<LowNoiseExperienceFrameRecord["action_strip"]["primary_action"]>,
  ownershipLabel: string | null,
): ExperienceDeltaActionToken {
  return {
    action_code: action.action_code,
    label: action.label,
    ownership_label: ownershipLabel,
  };
}

function contextPayload(frame: LowNoiseExperienceFrameRecord): ExperienceDeltaContextBarPayload {
  return {
    connection_label: frame.context_bar.connection_state,
    freshness_label: frame.context_bar.freshness_state,
    limitation_label: frame.context_bar.limitation_statement,
    manifest_label: frame.context_bar.manifest_label,
    mode_label: frame.context_bar.mode_posture,
    owner_label: frame.context_bar.owner_label,
    period_label: frame.context_bar.period_label,
    phase_label: frame.context_bar.phase_label,
    scope_label: frame.context_bar.scope_label,
    truth_origin_label: frame.context_bar.truth_origin,
  };
}

function decisionPayload(
  frame: LowNoiseExperienceFrameRecord,
): ExperienceDeltaDecisionSummaryPayload {
  return {
    additional_reason_count: frame.decision_summary.additional_reason_count,
    empty_state_kind: emptyStateKindFromSummary(frame.decision_summary.limitation_state),
    headline: frame.decision_summary.headline,
    plain_explanation: frame.decision_summary.plain_explanation,
    primary_issue_state: frame.decision_summary.attention_state,
    reason_items: frame.decision_summary.visible_reasons.map((reason) => ({
      label: reason.label,
      reason_code: reason.reason_code,
    })),
    uncertainty_statement: frame.decision_summary.uncertainty_statement,
  };
}

function actionPayload(frame: LowNoiseExperienceFrameRecord): ExperienceDeltaActionStripPayload {
  const isWaiting =
    frame.action_strip.actionability_state === "NO_SAFE_ACTION" &&
    frame.action_strip.waiting_on_label !== null;
  return {
    action_state:
      frame.action_strip.actionability_state === "ACTION_AVAILABLE"
        ? "ACTIONABLE"
        : isWaiting
          ? "WAITING"
          : "NO_SAFE_ACTION",
    blocking_reason: frame.action_strip.blocking_reason,
    investigation_entry_point: frame.action_strip.investigation_entry_point,
    ownership_label: frame.action_strip.ownership_label,
    primary_action:
      frame.action_strip.primary_action === null
        ? null
        : actionToken(frame.action_strip.primary_action, frame.action_strip.ownership_label),
    secondary_actions: frame.action_strip.secondary_actions.map((action) =>
      actionToken(action, frame.action_strip.ownership_label),
    ),
    waiting_on_label: frame.action_strip.waiting_on_label,
  };
}

function detailPayload(frame: LowNoiseExperienceFrameRecord): ExperienceDeltaDetailDrawerPayload {
  const modules: ExperienceDeltaDetailModule[] = frame.detail_drawer.entry_points.map((entry) => ({
    available_action_codes: frame.action_strip.available_action_codes,
    entry_label: entry.entry_label,
    entry_reason: entry.entry_reason ?? entry.plain_language_summary,
    module_code: entry.module_code,
    module_state: detailModuleState(entry.content_state),
  }));
  return {
    audit_mode: frame.detail_drawer.audit_mode_explicit,
    compare_mode: frame.detail_drawer.compare_mode_explicit,
    empty_state_kind: modules.length === 0 ? frame.detail_drawer.expanded_content_state : "NONE",
    expanded_module_code: frame.detail_drawer.expanded_module_code,
    focus_anchor_ref: frame.detail_drawer.focus_anchor_ref,
    modules,
  } as ExperienceDeltaDetailDrawerPayload;
}

function surfacePayload(frame: LowNoiseExperienceFrameRecord, surfaceCode: LowNoiseSurfaceCode) {
  switch (surfaceCode) {
    case "ACTION_STRIP":
      return actionPayload(frame);
    case "CONTEXT_BAR":
      return contextPayload(frame);
    case "DECISION_SUMMARY":
      return decisionPayload(frame);
    case "DETAIL_DRAWER":
      return detailPayload(frame);
  }
}

function surfaceLifecycleState(frame: LowNoiseExperienceFrameRecord, surfaceCode: LowNoiseSurfaceCode) {
  if (surfaceCode === "DETAIL_DRAWER") {
    const activeEntry =
      frame.active_detail_surface_code === null
        ? null
        : (frame.detail_drawer.entry_points.find(
            (entry) => entry.module_code === frame.active_detail_surface_code,
          ) ?? null);
    return activeEntry !== null && activeEntry.content_state === "LIMITED" ? "LIMITED" : "UPDATING";
  }
  if (surfaceCode === "DECISION_SUMMARY" && frame.decision_summary.limitation_state === "LIMITED") {
    return "LIMITED";
  }
  return "UPDATING";
}

function attentionTier(surfaceCode: LowNoiseSurfaceCode) {
  switch (surfaceCode) {
    case "ACTION_STRIP":
    case "DECISION_SUMMARY":
      return "PRIMARY" as const;
    case "CONTEXT_BAR":
      return "CONTEXTUAL" as const;
    case "DETAIL_DRAWER":
      return "INVESTIGATIVE" as const;
  }
}

function surfaceUpdate(input: {
  frame: LowNoiseExperienceFrameRecord;
  lastMaterialChangeAt: string | null;
  patchKind: ExperienceDeltaSurfaceUpdate["patch_kind"];
  surfaceCode: LowNoiseSurfaceCode;
}) {
  const surfaceRank = input.frame.surface_order.indexOf(input.surfaceCode) + 1;
  const limitedBy =
    input.surfaceCode === "DECISION_SUMMARY"
      ? input.frame.decision_summary.limitation_reason_codes
      : input.surfaceCode === "DETAIL_DRAWER"
        ? input.frame.detail_drawer.entry_points.flatMap((entry) => entry.limitation_reason_codes)
        : [];
  return {
    affected_object_refs: uniqueStrings([
      input.frame.object_anchor_ref,
      input.frame.focus_anchor_ref,
    ]),
    attention_tier: attentionTier(input.surfaceCode),
    available_action_codes:
      input.surfaceCode === "ACTION_STRIP" ? input.frame.action_strip.available_action_codes : [],
    blocked_action_codes:
      input.surfaceCode === "ACTION_STRIP" ? input.frame.action_strip.blocked_action_codes : [],
    default_visibility:
      input.surfaceCode === "DETAIL_DRAWER" && input.frame.active_detail_surface_code === null
        ? "COLLAPSED"
        : "VISIBLE",
    freshness_age: null,
    last_material_change_at: input.lastMaterialChangeAt,
    limited_by: uniqueStrings(limitedBy),
    patch_kind: input.patchKind,
    payload: surfacePayload(input.frame, input.surfaceCode) as ExperienceDeltaSurfaceUpdate["payload"],
    plain_reason: `${input.surfaceCode} updated from published low-noise frame.`,
    summary_rank: surfaceRank,
    surface_code: input.surfaceCode,
    surface_lifecycle_state: surfaceLifecycleState(input.frame, input.surfaceCode),
    surface_version: input.frame.last_published_sequence,
  } satisfies ExperienceDeltaSurfaceUpdate;
}

function activityState(frame: LowNoiseExperienceFrameRecord): ExperienceDelta["activity_state"] {
  if (frame.connection_state === "RECONNECTING") {
    return "RECONNECTING";
  }
  if (frame.connection_state === "CATCHING_UP") {
    return "REPLAYING";
  }
  switch (frame.action_strip.ownership_posture) {
    case "AUTHORITY_WAIT":
      return "WAITING_ON_AUTHORITY";
    case "CUSTOMER_WAIT":
      return "WAITING_ON_HUMAN";
    case "SYSTEM_WAIT":
      return "RECONNECTING";
    default:
      return frame.action_strip.actionability_state === "ACTION_AVAILABLE" ? "STREAMING" : "IDLE";
  }
}

function defaultDeliveryClass(input: BuildExperienceDeltaInput): ExperienceDelta["delivery_class"] {
  if (input.deliveryClass) {
    return input.deliveryClass;
  }
  if (
    input.nextFrame.connection_state === "CATCHING_UP" ||
    input.nextFrame.connection_state === "RECONNECTING"
  ) {
    return "CATCH_UP";
  }
  return "LIVE";
}

function defaultMateriality(input: BuildExperienceDeltaInput): LowNoiseDeltaMateriality {
  if (input.materiality) {
    return input.materiality;
  }
  if (!input.previousFrame) {
    return "MATERIAL";
  }
  return input.previousFrame.frame_epoch === input.nextFrame.frame_epoch
    ? "NON_MATERIAL"
    : "MATERIAL";
}

export function buildExperienceDelta(
  input: BuildExperienceDeltaInput,
): BuildExperienceDeltaResult {
  const deliveryClass = defaultDeliveryClass(input);
  const materiality = defaultMateriality(input);
  const affectedSurfaceCodes = changedLowNoiseSurfaceCodes({
    nextFrame: input.nextFrame,
    previousFrame: input.previousFrame,
  });
  const continuity =
    input.previousFrame === null || input.previousFrame === undefined
      ? null
      : computeContinuityCost({
          nextFrame: input.nextFrame,
          previousFrame: input.previousFrame,
          visibleChangeCount: input.visibleChangeCountInWindow ?? affectedSurfaceCodes.length,
        });
  const semanticMotion = deriveSemanticMotion({
    affectedSurfaceCount: affectedSurfaceCodes.length,
    deliveryClass,
    focusAnchorLost: continuity?.focusAnchorLost,
    nextFrame: input.nextFrame,
  });
  const prominentMotionCount = prominentMotionCountForSemanticMotion(semanticMotion);
  const continuityWithMotion =
    continuity === null
      ? null
      : {
          ...continuity,
          continuityCost:
            continuity.continuityCost + 2 * (prominentMotionCount - continuity.prominentMotionCount),
          prominentMotionCount,
        };
  const audit = buildLowNoiseBudgetAudit({
    action_strip: input.nextFrame.action_strip,
    auditScope: materiality === "NON_MATERIAL" ? "NON_MATERIAL_REFRESH" : "FIRST_VIEW",
    coalescedChangeCountOrNull: 0,
    context_bar: input.nextFrame.context_bar,
    continuityCostOrNull: continuityWithMotion?.continuityCost ?? 0,
    decision_summary: input.nextFrame.decision_summary,
    detailFallbackState: input.nextFrame.low_noise_budget_audit.detail_fallback_state,
    detail_drawer: input.nextFrame.detail_drawer,
    prominentMotionCount,
    rankSwapCountOrNull: continuityWithMotion?.rankSwapCount ?? 0,
    surface_order: input.nextFrame.surface_order,
    visibleChangeCountInWindowOrNull:
      input.visibleChangeCountInWindow ?? continuityWithMotion?.visibleChangeCount ?? 0,
  });
  const coalescingDecision =
    materiality === "NON_MATERIAL" && continuityWithMotion !== null
      ? coalesceNonMaterialRefresh({
          continuity: continuityWithMotion,
          scanLoad: audit.scan_load,
        })
      : noCoalescingDecision;

  if (!coalescingDecision.shouldPublishDelta) {
    return {
      coalescingDecision,
      continuity: continuityWithMotion,
      delta: null,
    };
  }

  const effectiveAffectedSurfaceCodes =
    affectedSurfaceCodes.length > 0 ? affectedSurfaceCodes : ["CONTEXT_BAR"];
  const surfaceUpdates = effectiveAffectedSurfaceCodes.map((surfaceCode) =>
    surfaceUpdate({
      frame: input.nextFrame,
      lastMaterialChangeAt: materiality === "MATERIAL" ? input.nextFrame.rendered_at : null,
      patchKind: input.previousFrame ? "REPLACE_FRAGMENT" : "UPSERT_OBJECT",
      surfaceCode,
    }),
  );
  const delta: ExperienceDelta = {
    actionability_state: input.nextFrame.attention_policy.actionability_state,
    activity_state: activityState(input.nextFrame),
    active_detail_surface_code: input.nextFrame.active_detail_surface_code,
    affected_object_refs: uniqueStrings([
      input.nextFrame.object_anchor_ref,
      input.nextFrame.focus_anchor_ref,
    ]),
    affected_surface_codes: effectiveAffectedSurfaceCodes as ExperienceDeltaLowNoiseSurfaceCode[],
    attention_policy: input.nextFrame.attention_policy,
    attention_state: input.nextFrame.attention_policy.attention_state,
    blocked_action_codes: input.nextFrame.action_strip.blocked_action_codes,
    cause_ref: input.causeRef,
    checkpoint_state: input.nextFrame.checkpoint_state,
    cognitive_budget: input.nextFrame.cognitive_budget,
    connection_state: input.nextFrame.connection_state,
    delivery_class: deliveryClass,
    detail_entry_points: input.nextFrame.attention_policy.detail_entry_points,
    experience_profile: "LOW_NOISE",
    experience_sequence: input.experienceSequence,
    focus_anchor_ref: input.nextFrame.focus_anchor_ref,
    frame_epoch: input.nextFrame.frame_epoch,
    is_terminal: false,
    manifest_id: input.nextFrame.manifest_id,
    no_safe_action_reason_code: input.nextFrame.attention_policy.no_safe_action_reason_code,
    occurred_at: input.occurredAt ?? input.nextFrame.rendered_at,
    posture_state: deriveDeltaPostureState({ deliveryClass, nextFrame: input.nextFrame }),
    primary_action_code: input.nextFrame.attention_policy.primary_action_code,
    primary_object_ref: input.nextFrame.attention_policy.primary_object_ref,
    resume_token: input.resumeToken ?? input.nextFrame.resume_token,
    secondary_notice_count: input.nextFrame.attention_policy.secondary_notice_count,
    semantic_motion: semanticMotion,
    shell_route_key: input.nextFrame.shell_route_key,
    shell_stability_token: input.nextFrame.shell_stability_token,
    suggested_detail_surface_code: input.nextFrame.attention_policy.suggested_detail_surface_code,
    surface_updates: surfaceUpdates,
    truth_boundary_contract: input.nextFrame.truth_boundary_contract,
    truth_origin: input.nextFrame.truth_origin,
    truth_state: input.nextFrame.truth_state,
  };

  return {
    coalescingDecision,
    continuity: continuityWithMotion,
    delta: validateDeltaMirrorContract(delta),
  };
}
