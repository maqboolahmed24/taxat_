import type { InteractionLayerFoundationContract } from "../route_contracts/interaction_layer_foundation";
import {
  foundationContractForInteractionLayer,
} from "./foundation_contract";

export type OperatorInteractionLayer = {
  foundation_contract: InteractionLayerFoundationContract & { shell_family: "CALM_SHELL" };
  mounted_content_policy: "KEEP_MOUNTED_CONTENT";
  refresh_presentation: "INLINE_STATUS_ONLY";
  recovery_presentation: "INLINE_EXPLICIT_REBASE";
  recovery_notice_surface: "CONTEXT_BAR" | "IDENTITY_HEADER";
  delta_promotion_mode: "COALESCE_BEFORE_PROMOTION";
  selector_profile: "OPERATOR_SEMANTIC_SELECTORS_V1";
  shell_continuity_policy: "SAME_OBJECT_SAME_SHELL_INLINE_RECOVERY";
  activity_partition_policy: "VISIBILITY_SCOPED_LANES_WITH_CURRENT_FIRST_ARTIFACTS";
  investigation_presentation_policy: "SUMMARY_FIRST_PLAIN_LANGUAGE_MODULES";
  secondary_window_policy: "SUPPORT_ONLY_PARENT_BOUND_CLOSE_RETURNS_FOCUS";
  notification_surface: "CONTEXT_BAR" | "CONTEXT_BAR_WITH_SYSTEM_MIRROR" | "PARENT_CONTEXT_BAR";
  artifact_preview_surface: "DETAIL_DRAWER" | "SECONDARY_WINDOW_BODY";
  history_presentation: "CURRENT_PRIMARY_HISTORY_SECONDARY";
  motion_profile: "SUBTLE_CAUSAL_ONLY";
  unsafe_action_policy: "FAIL_CLOSED_DURING_DEGRADED_OR_RECOVERY";
  feedback_truth_policy: "DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN";
};

export type OperatorInteractionLayerInput = {
  embodiment?: "BROWSER_PRIMARY" | "PARENT_BOUND_SUPPORT_WINDOW" | undefined;
  foundationContract?: InteractionLayerFoundationContract | undefined;
  mirrorNotificationToSystem?: boolean | undefined;
};

export function buildOperatorInteractionLayer({
  embodiment = "BROWSER_PRIMARY",
  foundationContract,
  mirrorNotificationToSystem = false,
}: OperatorInteractionLayerInput = {}) {
  const foundation = foundationContractForInteractionLayer(
    "CALM_SHELL",
    foundationContract,
  ) as OperatorInteractionLayer["foundation_contract"];
  const parentBoundSupportWindow = embodiment === "PARENT_BOUND_SUPPORT_WINDOW";

  return {
    activity_partition_policy: "VISIBILITY_SCOPED_LANES_WITH_CURRENT_FIRST_ARTIFACTS",
    artifact_preview_surface: parentBoundSupportWindow ? "SECONDARY_WINDOW_BODY" : "DETAIL_DRAWER",
    delta_promotion_mode: "COALESCE_BEFORE_PROMOTION",
    feedback_truth_policy: foundation.feedback_truth_policy,
    foundation_contract: foundation,
    history_presentation: "CURRENT_PRIMARY_HISTORY_SECONDARY",
    investigation_presentation_policy: "SUMMARY_FIRST_PLAIN_LANGUAGE_MODULES",
    motion_profile: foundation.motion_profile,
    mounted_content_policy: "KEEP_MOUNTED_CONTENT",
    notification_surface: parentBoundSupportWindow
      ? "PARENT_CONTEXT_BAR"
      : mirrorNotificationToSystem
        ? "CONTEXT_BAR_WITH_SYSTEM_MIRROR"
        : "CONTEXT_BAR",
    recovery_notice_surface: parentBoundSupportWindow ? "IDENTITY_HEADER" : "CONTEXT_BAR",
    recovery_presentation: "INLINE_EXPLICIT_REBASE",
    refresh_presentation: "INLINE_STATUS_ONLY",
    secondary_window_policy: "SUPPORT_ONLY_PARENT_BOUND_CLOSE_RETURNS_FOCUS",
    selector_profile: "OPERATOR_SEMANTIC_SELECTORS_V1",
    shell_continuity_policy: "SAME_OBJECT_SAME_SHELL_INLINE_RECOVERY",
    unsafe_action_policy: "FAIL_CLOSED_DURING_DEGRADED_OR_RECOVERY",
  } satisfies OperatorInteractionLayer;
}
