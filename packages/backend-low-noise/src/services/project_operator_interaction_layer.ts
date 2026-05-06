import type {
  InteractionLayerFoundationContract,
  OperatorInteractionLayer,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import type {
  LowNoiseActionabilityState,
  LowNoiseRecoveryPosture,
  LowNoiseSettlementState,
} from "../models/low_noise_frame.ts";
import {
  deriveCalmShellMotionAndRecoveryPresentation,
} from "./derive_calm_shell_motion_and_recovery_presentation.ts";
import {
  deriveCalmShellPreviewNotificationAndHistoryPosture,
  type CalmShellEmbodiment,
} from "./derive_calm_shell_preview_notification_and_history_posture.ts";
import { projectFoundationContractForShell } from "./project_foundation_contract_for_shell.ts";

export function projectOperatorInteractionLayer(input: {
  actionabilityState?: LowNoiseActionabilityState | undefined;
  embodiment?: CalmShellEmbodiment | undefined;
  foundationContract?: InteractionLayerFoundationContract | undefined;
  recoveryPosture?: LowNoiseRecoveryPosture | undefined;
  settlementState?: LowNoiseSettlementState | undefined;
} = {}): OperatorInteractionLayer {
  const foundationContract =
    input.foundationContract ??
    projectFoundationContractForShell({ shellFamily: "CALM_SHELL" });
  if (foundationContract.shell_family !== "CALM_SHELL") {
    throw new Error("OperatorInteractionLayer requires a CALM_SHELL foundation contract");
  }
  const previewPosture = deriveCalmShellPreviewNotificationAndHistoryPosture({
    embodiment: input.embodiment,
  });
  const motionPosture = deriveCalmShellMotionAndRecoveryPresentation({
    actionabilityState: input.actionabilityState,
    recoveryPosture: input.recoveryPosture,
    settlementState: input.settlementState,
  });

  return {
    activity_partition_policy: "VISIBILITY_SCOPED_LANES_WITH_CURRENT_FIRST_ARTIFACTS",
    artifact_preview_surface: previewPosture.artifact_preview_surface,
    delta_promotion_mode: motionPosture.delta_promotion_mode,
    feedback_truth_policy: motionPosture.feedback_truth_policy,
    foundation_contract: foundationContract,
    history_presentation: previewPosture.history_presentation,
    investigation_presentation_policy: "SUMMARY_FIRST_PLAIN_LANGUAGE_MODULES",
    motion_profile: motionPosture.motion_profile,
    mounted_content_policy: motionPosture.mounted_content_policy,
    notification_surface: previewPosture.notification_surface,
    recovery_notice_surface: previewPosture.recovery_notice_surface,
    recovery_presentation: motionPosture.recovery_presentation,
    refresh_presentation: motionPosture.refresh_presentation,
    secondary_window_policy: "SUPPORT_ONLY_PARENT_BOUND_CLOSE_RETURNS_FOCUS",
    selector_profile: foundationContract.selector_profile,
    shell_continuity_policy: foundationContract.continuity_policy,
    unsafe_action_policy: motionPosture.unsafe_action_policy,
  };
}
