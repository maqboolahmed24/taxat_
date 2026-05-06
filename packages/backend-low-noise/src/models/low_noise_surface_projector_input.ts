import type {
  ActionStripState,
  ContextBarState,
  DecisionSummaryState,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import type { MutationPreconditionBinding } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type {
  LowNoiseAction,
  LowNoiseActionabilityState,
  LowNoiseDetailAudience,
  LowNoiseDetailEntryCandidate,
  LowNoiseAttentionState,
  LowNoiseDetailModuleCode,
  LowNoiseRecoveryPosture,
  LowNoiseSettlementState,
  LowNoiseVisibleReason,
} from "./low_noise_frame.ts";

export type LowNoiseNormalizedPosture = {
  connectionState: ContextBarState["connection_state"];
  modePosture: ContextBarState["mode_posture"];
  recoveryPosture: LowNoiseRecoveryPosture;
  settlementState: LowNoiseSettlementState;
};

export type LowNoiseReasonCandidate = {
  issueRef?: string | undefined;
  label: string;
  rankScore?: number | undefined;
  reasonCode: string;
  severity?: LowNoiseVisibleReason["severity"] | undefined;
};

export type LowNoiseActionCandidate = {
  actionCode: string;
  actionKind: LowNoiseAction["action_kind"];
  blockedReasonCode?: string | null | undefined;
  label: string;
  mutationPreconditionBindingOrNull?: MutationPreconditionBinding | null | undefined;
  rankScore?: number | undefined;
  reasonCodes?: readonly string[] | undefined;
  requiresLiveFreshness?: boolean | undefined;
  targetDetailSurfaceCode?: LowNoiseDetailModuleCode | null | undefined;
  targetObjectRef?: string | null | undefined;
};

export type LowNoiseSurfaceProjectorInput = {
  actionabilityState?: LowNoiseActionabilityState | undefined;
  activeDetailSurfaceCode?: LowNoiseDetailModuleCode | null | undefined;
  additionalReasonCount?: number | undefined;
  attentionState: LowNoiseAttentionState;
  contextLimitationStatement?: string | undefined;
  decisionLimitationReasonCodes?: readonly string[] | undefined;
  decisionLimitationState?: DecisionSummaryState["limitation_state"] | undefined;
  decisionLimitationStatement?: string | null | undefined;
  detailAudience?: LowNoiseDetailAudience | undefined;
  detailEntries?: readonly LowNoiseDetailEntryCandidate[] | undefined;
  detailFocusAnchorObjectRef?: string | undefined;
  detailPreviousEntryPoints?: readonly LowNoiseDetailModuleCode[] | undefined;
  headline?: string | undefined;
  focusAnchorRef?: string | null | undefined;
  machineReasonCodes?: readonly string[] | undefined;
  manifestId: string;
  manifestLabel?: string | undefined;
  noSafeActionReasonCode?: string | undefined;
  objectAnchorRef: string;
  ownerHandoffPosture?: ContextBarState["owner_handoff_posture"] | undefined;
  ownerLabel?: string | null | undefined;
  ownershipLabel?: string | null | undefined;
  ownershipPosture?: ActionStripState["ownership_posture"] | undefined;
  periodLabel?: string | undefined;
  plainExplanation?: string | undefined;
  posture: LowNoiseNormalizedPosture;
  primaryAction?: Partial<LowNoiseAction> | null | undefined;
  primaryActionCandidates?: readonly LowNoiseActionCandidate[] | undefined;
  primaryIssueRef?: string | null | undefined;
  reasons?: readonly LowNoiseReasonCandidate[] | undefined;
  scopeLabel?: string | undefined;
  secondaryActions?: readonly Partial<LowNoiseAction>[] | undefined;
  secondaryActionCandidates?: readonly LowNoiseActionCandidate[] | undefined;
  suggestedDetailSurfaceCode?: LowNoiseDetailModuleCode | null | undefined;
  truthOrigin: ContextBarState["truth_origin"];
  uncertaintyStatement?: string | null | undefined;
  visibleSecondaryLimit?: number | undefined;
  visibleWarningCount?: number | undefined;
  waitingOnLabel?: string | null | undefined;
  workflowPhaseLabel?: string | undefined;
};
