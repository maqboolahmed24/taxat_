import type { DetailDrawerStateDetailEntry } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import {
  lowNoiseCognitiveBudget,
  lowNoiseDetailModuleLabels,
  lowNoiseDetailModuleSemanticViewKinds,
  type LowNoiseDetailAudience,
  type LowNoiseDetailEntryCandidate,
  type LowNoiseDetailModuleCode,
} from "../models/low_noise_frame.ts";
import {
  enforceLowNoiseCopyBudget,
  uniqueLowNoiseStrings,
} from "./enforce_low_noise_copy_budgets.ts";

const detailModuleBaseRank = {
  AUTHORITY_TUNNEL: 56,
  DRIFT_FIELD: 44,
  EVIDENCE_TIDE: 60,
  FOCUS_LENS: 40,
  PACKET_FORGE: 52,
  TWIN_PANEL: 42,
} as const satisfies Record<LowNoiseDetailModuleCode, number>;

function stateReasonForDetailContent(contentState: DetailDrawerStateDetailEntry["content_state"]) {
  switch (contentState) {
    case "POPULATED":
    case "LIMITED":
      return null;
    case "NOT_APPLICABLE":
      return "NOT_APPLICABLE_TO_CONTEXT" as const;
    case "NOT_REQUESTED":
      return "REQUEST_NOT_TRIGGERED" as const;
    case "NOT_YET_MATERIALIZED":
      return "MATERIALIZATION_PENDING" as const;
  }
}

function defaultSummaryFor(moduleCode: LowNoiseDetailModuleCode) {
  switch (moduleCode) {
    case "AUTHORITY_TUNNEL":
      return "Authority exchange status is ready for inspection.";
    case "DRIFT_FIELD":
      return "Baseline drift context is ready for comparison.";
    case "EVIDENCE_TIDE":
      return "Evidence context is ready for inspection.";
    case "FOCUS_LENS":
      return "Audit context explains the current recovery path.";
    case "PACKET_FORGE":
      return "Filing packet bindings are ready for inspection.";
    case "TWIN_PANEL":
      return "Computed and authority comparison context is ready.";
  }
}

function defaultReasonFor(moduleCode: LowNoiseDetailModuleCode) {
  return `${lowNoiseDetailModuleLabels[moduleCode]} is not available here.`;
}

function candidateIsVisible(input: {
  audience: LowNoiseDetailAudience;
  candidate: LowNoiseDetailEntryCandidate;
}) {
  if (input.candidate.lawful === false) {
    return false;
  }
  if (
    input.audience !== "STAFF" &&
    (input.candidate.staffOnly === true || input.candidate.customerSafe === false)
  ) {
    return false;
  }
  return true;
}

export function normalizeDetailEntryCandidate(input: {
  candidate: LowNoiseDetailEntryCandidate;
  manifestId: string;
}): DetailDrawerStateDetailEntry {
  const contentState = input.candidate.contentState ?? "POPULATED";
  return {
    anchorable_object_refs:
      contentState === "POPULATED"
        ? uniqueLowNoiseStrings(input.candidate.anchorableObjectRefs ?? [input.manifestId])
        : uniqueLowNoiseStrings(input.candidate.anchorableObjectRefs ?? []),
    content_state: contentState,
    entry_label: lowNoiseDetailModuleLabels[input.candidate.moduleCode],
    entry_reason:
      contentState === "POPULATED"
        ? null
        : enforceLowNoiseCopyBudget(
            input.candidate.entryReason,
            "detailEntryReason",
            defaultReasonFor(input.candidate.moduleCode),
          ),
    limitation_reason_codes:
      contentState === "LIMITED"
        ? uniqueLowNoiseStrings(input.candidate.limitationReasonCodes ?? ["DETAIL_LIMITED"])
        : [],
    module_code: input.candidate.moduleCode,
    plain_language_summary: enforceLowNoiseCopyBudget(
      input.candidate.plainLanguageSummary,
      "detailSummary",
      defaultSummaryFor(input.candidate.moduleCode),
    ),
    semantic_view_kind: lowNoiseDetailModuleSemanticViewKinds[input.candidate.moduleCode],
    state_reason_code_or_null: stateReasonForDetailContent(contentState),
  };
}

function scoreCandidate(input: {
  activeDetailSurfaceCode: LowNoiseDetailModuleCode | null;
  attentionDetailEntryPoints: readonly LowNoiseDetailModuleCode[];
  candidate: LowNoiseDetailEntryCandidate;
  originalIndex: number;
  previousDetailEntryPoints: readonly LowNoiseDetailModuleCode[];
  suggestedDetailSurfaceCode: LowNoiseDetailModuleCode | null;
}) {
  const attentionIndex = input.attentionDetailEntryPoints.indexOf(input.candidate.moduleCode);
  const previousIndex = input.previousDetailEntryPoints.indexOf(input.candidate.moduleCode);
  return (
    (input.candidate.rankScore ?? detailModuleBaseRank[input.candidate.moduleCode]) +
    (input.candidate.moduleCode === input.activeDetailSurfaceCode ? 100 : 0) +
    (input.candidate.moduleCode === input.suggestedDetailSurfaceCode ? 80 : 0) +
    (attentionIndex >= 0 ? 40 - attentionIndex * 4 : 0) +
    (previousIndex >= 0 ? lowNoiseCognitiveBudget.primary_rank_hysteresis - previousIndex : 0) -
    input.originalIndex / 100
  );
}

export function rankDetailEntryPoints(input: {
  activeDetailSurfaceCode?: LowNoiseDetailModuleCode | null | undefined;
  attentionDetailEntryPoints?: readonly LowNoiseDetailModuleCode[] | undefined;
  audience?: LowNoiseDetailAudience | undefined;
  candidates?: readonly LowNoiseDetailEntryCandidate[] | undefined;
  manifestId: string;
  previousDetailEntryPoints?: readonly LowNoiseDetailModuleCode[] | undefined;
  suggestedDetailSurfaceCode?: LowNoiseDetailModuleCode | null | undefined;
}) {
  const audience = input.audience ?? "STAFF";
  const activeDetailSurfaceCode = input.activeDetailSurfaceCode ?? null;
  const suggestedDetailSurfaceCode = input.suggestedDetailSurfaceCode ?? null;
  const hasSuppliedCandidates = input.candidates !== undefined && input.candidates.length > 0;
  const candidates =
    hasSuppliedCandidates
      ? [...input.candidates]
      : [
          {
            moduleCode: activeDetailSurfaceCode ?? suggestedDetailSurfaceCode ?? "EVIDENCE_TIDE",
          },
        ];

  if (!hasSuppliedCandidates) {
    for (const requiredModule of [activeDetailSurfaceCode, suggestedDetailSurfaceCode].filter(
      (moduleCode): moduleCode is LowNoiseDetailModuleCode => moduleCode !== null,
    )) {
      if (!candidates.some((candidate) => candidate.moduleCode === requiredModule)) {
        candidates.unshift({ moduleCode: requiredModule });
      }
    }
  }

  const visibleCandidates = candidates.filter((candidate) =>
    candidateIsVisible({ audience, candidate }),
  );
  const deduped = new Map<LowNoiseDetailModuleCode, LowNoiseDetailEntryCandidate>();
  for (const candidate of visibleCandidates) {
    if (!deduped.has(candidate.moduleCode)) {
      deduped.set(candidate.moduleCode, candidate);
    }
  }
  if (deduped.size === 0) {
    deduped.set("EVIDENCE_TIDE", {
      contentState: "NOT_APPLICABLE",
      entryReason: "No lawful detail module is available for this view.",
      moduleCode: "EVIDENCE_TIDE",
    });
  }

  const rankedCandidates = [...deduped.values()]
    .map((candidate, originalIndex) => ({
      candidate,
      originalIndex,
      score: scoreCandidate({
        activeDetailSurfaceCode,
        attentionDetailEntryPoints: input.attentionDetailEntryPoints ?? [],
        candidate,
        originalIndex,
        previousDetailEntryPoints: input.previousDetailEntryPoints ?? [],
        suggestedDetailSurfaceCode,
      }),
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.originalIndex - right.originalIndex ||
        left.candidate.moduleCode.localeCompare(right.candidate.moduleCode),
    );
  const retained = rankedCandidates
    .slice(0, lowNoiseCognitiveBudget.detail_entry_point_limit)
    .map((ranked) => ranked.candidate);
  return retained.map((candidate) =>
    normalizeDetailEntryCandidate({ candidate, manifestId: input.manifestId }),
  );
}
