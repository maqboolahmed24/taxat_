import type { DecisionSummaryState } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import {
  type LowNoiseAttentionState,
  lowNoiseCognitiveBudget,
  type LowNoiseVisibleReason,
} from "../models/low_noise_frame.ts";
import type {
  LowNoiseReasonCandidate,
  LowNoiseSurfaceProjectorInput,
} from "../models/low_noise_surface_projector_input.ts";
import {
  enforceLowNoiseCopyBudget,
  requireLowNoiseString,
  uniqueLowNoiseStrings,
} from "../services/enforce_low_noise_copy_budgets.ts";
import { normalizeLimitationState } from "../services/normalize_limitation_state.ts";

function defaultReason(input: {
  attentionState: Exclude<LowNoiseAttentionState, "CALM">;
  manifestId: string;
}): LowNoiseReasonCandidate {
  switch (input.attentionState) {
    case "BLOCKED":
      return {
        issueRef: `issue://${input.manifestId}/primary`,
        label: "Recovery is required before action",
        rankScore: 100,
        reasonCode: "FRAME_RECOVERY_REQUIRED",
        severity: "BLOCKED",
      };
    case "WAITING":
      return {
        issueRef: `issue://${input.manifestId}/primary`,
        label: "Waiting on the next responsible party",
        rankScore: 90,
        reasonCode: "WAITING_ON_EXTERNAL_PARTY",
        severity: "WAITING",
      };
    case "LIMITED":
      return {
        issueRef: `issue://${input.manifestId}/primary`,
        label: "Current view has limited detail",
        rankScore: 80,
        reasonCode: "FRAME_LIMITED_VIEW",
        severity: "LIMITED",
      };
    case "NOTICE":
      return {
        issueRef: `issue://${input.manifestId}/primary`,
        label: "Notice is available for this manifest",
        rankScore: 70,
        reasonCode: "FRAME_NOTICE_REQUIRED",
        severity: "NOTICE",
      };
    case "REVIEW":
      return {
        issueRef: `issue://${input.manifestId}/primary`,
        label: "Review the current manifest posture",
        rankScore: 80,
        reasonCode: "FRAME_REVIEW_REQUIRED",
        severity: "REVIEW",
      };
  }
}

const reasonSeverityRank = {
  BLOCKED: 5,
  LIMITED: 3,
  NOTICE: 1,
  REVIEW: 2,
  WAITING: 4,
} as const satisfies Record<LowNoiseVisibleReason["severity"], number>;

function rankReasonCandidates(reasons: readonly LowNoiseReasonCandidate[]) {
  const deduped = new Map<string, LowNoiseReasonCandidate & { originalIndex: number }>();
  reasons.forEach((reason, originalIndex) => {
    const reasonCode = requireLowNoiseString("reason.reasonCode", reason.reasonCode);
    if (!deduped.has(reasonCode)) {
      deduped.set(reasonCode, { ...reason, originalIndex, reasonCode });
    }
  });
  return [...deduped.values()].sort((left, right) => {
    const leftScore = left.rankScore ?? reasonSeverityRank[left.severity ?? "REVIEW"] * 10;
    const rightScore = right.rankScore ?? reasonSeverityRank[right.severity ?? "REVIEW"] * 10;
    return rightScore - leftScore || left.originalIndex - right.originalIndex;
  });
}

function normalizeVisibleReasons(input: {
  attentionState: LowNoiseAttentionState;
  manifestId: string;
  reasons?: readonly LowNoiseReasonCandidate[] | undefined;
}) {
  if (input.attentionState === "CALM") {
    return {
      additionalReasonCount: 0,
      primaryIssueRef: null,
      visibleReasons: [] as LowNoiseVisibleReason[],
    };
  }
  const candidates =
    input.reasons && input.reasons.length > 0
      ? input.reasons
      : [defaultReason({ attentionState: input.attentionState, manifestId: input.manifestId })];
  const rankedReasons = rankReasonCandidates(candidates);
  const visibleReasons = rankedReasons
    .slice(0, lowNoiseCognitiveBudget.primary_reason_limit)
    .map(
      (reason): LowNoiseVisibleReason => ({
        label: enforceLowNoiseCopyBudget(reason.label, "reasonLabel", "Review manifest posture"),
        reason_code: requireLowNoiseString("reason.reasonCode", reason.reasonCode),
        severity: reason.severity ?? "REVIEW",
      }),
    );
  return {
    additionalReasonCount: Math.max(0, rankedReasons.length - visibleReasons.length),
    primaryIssueRef: rankedReasons[0]?.issueRef ?? `issue://${input.manifestId}/primary`,
    visibleReasons,
  };
}

export function buildDecisionSummaryState(input: LowNoiseSurfaceProjectorInput): DecisionSummaryState {
  const reasonState = normalizeVisibleReasons({
    attentionState: input.attentionState,
    manifestId: input.manifestId,
    reasons: input.reasons,
  });
  const limitation = normalizeLimitationState({
    defaultLimitedReasonCode: "LIMITED_VIEW",
    defaultStatement: "Some detail is limited by the current view.",
    limitationReasonCodes: input.decisionLimitationReasonCodes,
    limitationState: input.decisionLimitationState,
    limitationStatement: input.decisionLimitationStatement,
  });
  const upstreamAdditionalReasonCount =
    reasonState.visibleReasons.length === lowNoiseCognitiveBudget.primary_reason_limit
      ? (input.additionalReasonCount ?? 0)
      : 0;
  const machineReasonCodes =
    input.attentionState === "CALM"
      ? ["FRAME_CURRENT"]
      : uniqueLowNoiseStrings([
          ...(input.machineReasonCodes ?? []),
          ...reasonState.visibleReasons.map((reason) => reason.reason_code),
        ]);

  return {
    additional_reason_count: reasonState.additionalReasonCount + upstreamAdditionalReasonCount,
    artifact_type: "DecisionSummaryState",
    attention_state: input.attentionState,
    blocking_reason:
      input.attentionState === "BLOCKED"
        ? enforceLowNoiseCopyBudget(
            "Dominant manifest action is blocked by the current recovery posture.",
            "blockingReason",
            "Dominant manifest action is blocked.",
          )
        : null,
    full_text_ref: `low-noise-full-text://${input.manifestId}/decision-summary`,
    headline: enforceLowNoiseCopyBudget(
      input.headline,
      "headline",
      input.attentionState === "CALM" ? "Manifest is current" : "Manifest needs review",
    ),
    limitation_reason_codes: limitation.limitation_reason_codes,
    limitation_state: limitation.limitation_state,
    limitation_statement: limitation.limitation_statement,
    machine_reason_codes: machineReasonCodes,
    plain_explanation: enforceLowNoiseCopyBudget(
      input.plainExplanation,
      "explanation",
      input.attentionState === "CALM"
        ? "The manifest frame is stable and ready to inspect."
        : "Review the visible reason before taking the next safe step.",
    ),
    primary_issue_ref: input.primaryIssueRef ?? reasonState.primaryIssueRef,
    source_module_codes: ["DECISION_CONSTELLATION", "GATE_LATTICE", "TRUST_PRISM"],
    state_reason_code_or_null: limitation.state_reason_code_or_null,
    surface_code: "DECISION_SUMMARY",
    uncertainty_statement:
      input.uncertaintyStatement === null
        ? null
        : input.uncertaintyStatement === undefined
          ? null
          : enforceLowNoiseCopyBudget(
              input.uncertaintyStatement,
              "uncertainty",
              "Uncertainty remains under review.",
            ),
    visible_reasons: reasonState.visibleReasons,
    visible_warning_count:
      input.attentionState === "CALM" ? 0 : Math.min(input.visibleWarningCount ?? 1, 1),
  };
}
