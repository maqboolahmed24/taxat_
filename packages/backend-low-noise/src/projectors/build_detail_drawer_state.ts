import type { DetailDrawerStateDetailEntry } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import type {
  LowNoiseDetailAudience,
  LowNoiseDetailDrawerState,
  LowNoiseDetailEntryCandidate,
  LowNoiseDetailFallbackState,
  LowNoiseDetailModuleCode,
} from "../models/low_noise_frame.ts";
import { preserveFocusAnchorOnDetailChange } from "../services/preserve_focus_anchor_on_detail_change.ts";
import { rankDetailEntryPoints } from "../services/rank_detail_entry_points.ts";
import {
  fallbackReasonForExpandedEntry,
  resolveDetailFallbackState,
} from "../services/resolve_detail_fallback_state.ts";

export type BuildDetailDrawerStateInput = {
  activeDetailSurfaceCode?: LowNoiseDetailModuleCode | null | undefined;
  attentionDetailEntryPoints?: readonly LowNoiseDetailModuleCode[] | undefined;
  auditModeExplicit?: boolean | undefined;
  compareModeExplicit?: boolean | undefined;
  detailAudience?: LowNoiseDetailAudience | undefined;
  detailEntries?: readonly LowNoiseDetailEntryCandidate[] | undefined;
  focusAnchorObjectRef?: string | undefined;
  manifestId: string;
  previousDetailEntryPoints?: readonly LowNoiseDetailModuleCode[] | undefined;
  previousFocusAnchorRef?: string | null | undefined;
  suggestedDetailSurfaceCode?: LowNoiseDetailModuleCode | null | undefined;
};

export type BuildDetailDrawerStateResult = {
  activeDetailSurfaceCode: LowNoiseDetailModuleCode | null;
  detailDrawer: LowNoiseDetailDrawerState;
  detailFallbackState: LowNoiseDetailFallbackState;
  entryPoints: DetailDrawerStateDetailEntry[];
  focusAnchorRef: string | null;
  suggestedDetailSurfaceCode: LowNoiseDetailModuleCode | null;
};

const compareDetailModules = new Set<LowNoiseDetailModuleCode>(["DRIFT_FIELD", "TWIN_PANEL"]);

function requestedDetailMode(input: BuildDetailDrawerStateInput) {
  if (input.auditModeExplicit === true) {
    return {
      activeDetailSurfaceCode: "FOCUS_LENS" as const,
      compareModeExplicit: false,
      suggestedDetailSurfaceCode: "FOCUS_LENS" as const,
    };
  }
  if (input.compareModeExplicit === true) {
    const requestedActive = input.activeDetailSurfaceCode ?? null;
    const requestedSuggested = input.suggestedDetailSurfaceCode ?? null;
    const compareModule =
      requestedActive !== null && compareDetailModules.has(requestedActive)
        ? requestedActive
        : requestedSuggested !== null && compareDetailModules.has(requestedSuggested)
          ? requestedSuggested
          : "DRIFT_FIELD";
    return {
      activeDetailSurfaceCode: compareModule,
      compareModeExplicit: true,
      suggestedDetailSurfaceCode: compareModule,
    };
  }
  return {
    activeDetailSurfaceCode: input.activeDetailSurfaceCode ?? null,
    compareModeExplicit: false,
    suggestedDetailSurfaceCode: input.suggestedDetailSurfaceCode ?? null,
  };
}

export function buildDetailDrawerState(
  input: BuildDetailDrawerStateInput,
): BuildDetailDrawerStateResult {
  const requestedMode = requestedDetailMode(input);
  const entryPoints = rankDetailEntryPoints({
    activeDetailSurfaceCode: requestedMode.activeDetailSurfaceCode,
    attentionDetailEntryPoints: input.attentionDetailEntryPoints,
    audience: input.detailAudience,
    candidates: input.detailEntries,
    manifestId: input.manifestId,
    previousDetailEntryPoints: input.previousDetailEntryPoints,
    suggestedDetailSurfaceCode: requestedMode.suggestedDetailSurfaceCode,
  });
  const resolution = resolveDetailFallbackState({
    activeDetailSurfaceCode: requestedMode.activeDetailSurfaceCode,
    auditModeExplicit: input.auditModeExplicit,
    compareModeExplicit: requestedMode.compareModeExplicit,
    entryPoints,
    suggestedDetailSurfaceCode: requestedMode.suggestedDetailSurfaceCode,
  });
  const expandedEntry =
    resolution.activeDetailSurfaceCode === null
      ? null
      : (entryPoints.find((entry) => entry.module_code === resolution.activeDetailSurfaceCode) ??
        null);
  const focusAnchorRef = preserveFocusAnchorOnDetailChange({
    activeDetailSurfaceCode: resolution.activeDetailSurfaceCode,
    expandedEntry,
    focusAnchorObjectRef: input.focusAnchorObjectRef,
    manifestId: input.manifestId,
    previousFocusAnchorRef: input.previousFocusAnchorRef,
  });
  const fallbackReasonCode = fallbackReasonForExpandedEntry(expandedEntry, resolution);

  return {
    activeDetailSurfaceCode: resolution.activeDetailSurfaceCode,
    detailDrawer: {
      artifact_type: "DetailDrawerState",
      audit_mode_explicit: resolution.auditModeExplicit,
      compare_mode_explicit: resolution.compareModeExplicit,
      entry_points: entryPoints,
      expanded_content_state:
        resolution.activeDetailSurfaceCode === null
          ? "COLLAPSED"
          : (expandedEntry?.content_state ?? "NOT_APPLICABLE"),
      expanded_module_code: resolution.activeDetailSurfaceCode,
      fallback_reason_code: fallbackReasonCode,
      focus_anchor_ref: focusAnchorRef,
      full_text_ref: `low-noise-full-text://${input.manifestId}/detail-drawer`,
      surface_code: "DETAIL_DRAWER",
    },
    detailFallbackState: resolution.detailFallbackState,
    entryPoints,
    focusAnchorRef,
    suggestedDetailSurfaceCode: resolution.suggestedDetailSurfaceCode,
  };
}
