import type {
  GateBlockingClass,
  GateDecision,
  GateOverrideDependencyState,
  GateOverrideResolutionState,
  GateProgressionSemantics,
  GateSemanticsContract,
  GateSeverity,
} from "../models/gate_decision_record.ts";

export class GateSemanticsContractError extends Error {
  readonly code: "GATE_SEMANTICS_POSTURE_INVALID";

  constructor(detail: string) {
    super(`GATE_SEMANTICS_POSTURE_INVALID: ${detail}`);
    this.name = "GateSemanticsContractError";
    this.code = "GATE_SEMANTICS_POSTURE_INVALID";
  }
}

export const GATE_DECISION_RANK_BY_DECISION: Record<GateDecision, 0 | 1 | 2 | 3 | 4> = {
  HARD_BLOCK: 4,
  MANUAL_REVIEW: 2,
  OVERRIDABLE_BLOCK: 3,
  PASS: 0,
  PASS_WITH_NOTICE: 1,
};

export const GATE_PROGRESSION_RANK_BY_DECISION: Record<GateDecision, 0 | 1 | 2> = {
  HARD_BLOCK: 0,
  MANUAL_REVIEW: 1,
  OVERRIDABLE_BLOCK: 0,
  PASS: 2,
  PASS_WITH_NOTICE: 2,
};

export const GATE_SEVERITY_BY_DECISION: Record<GateDecision, GateSeverity> = {
  HARD_BLOCK: "CRITICAL",
  MANUAL_REVIEW: "WARNING",
  OVERRIDABLE_BLOCK: "ERROR",
  PASS: "INFO",
  PASS_WITH_NOTICE: "NOTICE",
};

export const GATE_BLOCKING_CLASS_BY_DECISION: Record<GateDecision, GateBlockingClass> = {
  HARD_BLOCK: "BLOCKED",
  MANUAL_REVIEW: "REVIEW_REQUIRED",
  OVERRIDABLE_BLOCK: "BLOCKED",
  PASS: "NON_BLOCKING",
  PASS_WITH_NOTICE: "NON_BLOCKING",
};

export const GATE_PROGRESSION_SEMANTICS_BY_DECISION: Record<
  GateDecision,
  GateProgressionSemantics
> = {
  HARD_BLOCK: "BLOCKED",
  MANUAL_REVIEW: "REVIEW_ONLY",
  OVERRIDABLE_BLOCK: "BLOCKED",
  PASS: "AUTOMATED_CONTINUE",
  PASS_WITH_NOTICE: "AUTOMATED_CONTINUE_WITH_NOTICE",
};

export function severityForGateDecision(decision: GateDecision) {
  return GATE_SEVERITY_BY_DECISION[decision];
}

export function decisionRankForGateDecision(decision: GateDecision) {
  return GATE_DECISION_RANK_BY_DECISION[decision];
}

export function progressionRankForGateDecision(decision: GateDecision) {
  return GATE_PROGRESSION_RANK_BY_DECISION[decision];
}

export function deriveGateOverrideDependencyState(input: {
  decision: GateDecision;
  override_resolution_state: GateOverrideResolutionState;
}): GateOverrideDependencyState {
  if (input.override_resolution_state === "VALID_OVERRIDE_ACTIVE") {
    if (
      input.decision !== "PASS" &&
      input.decision !== "PASS_WITH_NOTICE" &&
      input.decision !== "MANUAL_REVIEW"
    ) {
      throw new GateSemanticsContractError(
        "VALID_OVERRIDE_ACTIVE is only legal for PASS, PASS_WITH_NOTICE, or MANUAL_REVIEW",
      );
    }
    return "VALID_OVERRIDE_GOVERNED";
  }
  if (input.decision === "OVERRIDABLE_BLOCK") {
    if (input.override_resolution_state !== "NO_VALID_OVERRIDE") {
      throw new GateSemanticsContractError(
        "OVERRIDABLE_BLOCK requires NO_VALID_OVERRIDE",
      );
    }
    return "OVERRIDE_REQUIRED_MISSING";
  }
  if (input.decision === "HARD_BLOCK") {
    if (input.override_resolution_state !== "NOT_APPLICABLE") {
      throw new GateSemanticsContractError("HARD_BLOCK requires NOT_APPLICABLE");
    }
    return "OVERRIDE_FORBIDDEN";
  }
  if (input.override_resolution_state !== "NOT_APPLICABLE") {
    throw new GateSemanticsContractError(
      `${input.decision} can only use NOT_APPLICABLE or VALID_OVERRIDE_ACTIVE`,
    );
  }
  return "OVERRIDE_INDEPENDENT";
}

export function buildGateSemanticsContract(input: {
  decision: GateDecision;
  override_resolution_state: GateOverrideResolutionState;
}): GateSemanticsContract {
  return {
    blocking_class: GATE_BLOCKING_CLASS_BY_DECISION[input.decision],
    contract_version: "GATE_SEMANTICS_CONTRACT_V1",
    decision_rank: GATE_DECISION_RANK_BY_DECISION[input.decision],
    evaluation_order_profile_code: "NON_ACCESS_GATE_ORDER_V1",
    override_dependency_state: deriveGateOverrideDependencyState(input),
    progression_rank: GATE_PROGRESSION_RANK_BY_DECISION[input.decision],
    progression_semantics: GATE_PROGRESSION_SEMANTICS_BY_DECISION[input.decision],
    reason_order_profile_code: "NON_ACCESS_GATE_REASON_PRIORITY_V1",
    severity_profile_code: "NON_ACCESS_GATE_SEVERITY_V1",
  };
}
