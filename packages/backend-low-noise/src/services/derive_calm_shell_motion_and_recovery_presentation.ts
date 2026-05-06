import type {
  OperatorInteractionLayer,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import type {
  LowNoiseActionabilityState,
  LowNoiseRecoveryPosture,
  LowNoiseSettlementState,
} from "../models/low_noise_frame.ts";

export type CalmShellMotionAndRecoveryPresentation = Pick<
  OperatorInteractionLayer,
  | "delta_promotion_mode"
  | "feedback_truth_policy"
  | "motion_profile"
  | "mounted_content_policy"
  | "recovery_presentation"
  | "refresh_presentation"
  | "unsafe_action_policy"
> & {
  requiresFailClosedActions: boolean;
};

export function deriveCalmShellMotionAndRecoveryPresentation(input: {
  actionabilityState?: LowNoiseActionabilityState | undefined;
  recoveryPosture?: LowNoiseRecoveryPosture | undefined;
  settlementState?: LowNoiseSettlementState | undefined;
} = {}): CalmShellMotionAndRecoveryPresentation {
  const settlementState = input.settlementState ?? "STEADY";
  const recoveryPosture = input.recoveryPosture ?? "NONE";
  const requiresFailClosedActions =
    input.actionabilityState === "NO_SAFE_ACTION" ||
    recoveryPosture !== "NONE" ||
    ["STALE_REVIEW_REQUIRED", "DEGRADED_READ_ONLY", "RECOVERY_REQUIRED"].includes(settlementState);

  return {
    delta_promotion_mode: "COALESCE_BEFORE_PROMOTION",
    feedback_truth_policy: "DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN",
    motion_profile: "SUBTLE_CAUSAL_ONLY",
    mounted_content_policy: "KEEP_MOUNTED_CONTENT",
    recovery_presentation: "INLINE_EXPLICIT_REBASE",
    refresh_presentation: "INLINE_STATUS_ONLY",
    requiresFailClosedActions,
    unsafe_action_policy: "FAIL_CLOSED_DURING_DEGRADED_OR_RECOVERY",
  };
}
