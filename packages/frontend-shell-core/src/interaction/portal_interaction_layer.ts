import type { InteractionLayerFoundationContract } from "../route_contracts/interaction_layer_foundation";
import {
  foundationContractForInteractionLayer,
} from "./foundation_contract";

export type PortalInteractionLayer = {
  foundation_contract: InteractionLayerFoundationContract & {
    shell_family: "CLIENT_PORTAL_SHELL";
  };
  navigation_model: "TOP_LEVEL_TABS_CONTEXTUAL_DETAIL";
  spacing_profile: "COMFORTABLE_TASK_FIRST";
  status_language_profile: "PLAIN_LITERAL_CLIENT_SAFE";
  selector_profile: "PORTAL_SEMANTIC_SELECTORS_V1";
  support_region_policy: "ONE_PROMOTED_REGION_MAX";
  route_continuity_policy: "SAME_SHELL_CONTEXTUAL_RETURN";
  focus_restoration_policy: "RETURN_FOCUS_ANCHOR_THEN_LATEST_VISIBLE";
  artifact_hierarchy_policy: "CURRENT_PRIMARY_HISTORY_SECONDARY";
  responsive_detail_policy: "STACK_SUPPORT_BELOW_PRIMARY";
  motion_profile: "SUBTLE_CAUSAL_ONLY";
  feedback_truth_policy: "DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN";
};

export function buildPortalInteractionLayer(input: {
  foundationContract?: InteractionLayerFoundationContract | undefined;
} = {}) {
  const foundation = foundationContractForInteractionLayer(
    "CLIENT_PORTAL_SHELL",
    input.foundationContract,
  ) as PortalInteractionLayer["foundation_contract"];

  return {
    artifact_hierarchy_policy: "CURRENT_PRIMARY_HISTORY_SECONDARY",
    feedback_truth_policy: foundation.feedback_truth_policy,
    focus_restoration_policy: "RETURN_FOCUS_ANCHOR_THEN_LATEST_VISIBLE",
    foundation_contract: foundation,
    motion_profile: foundation.motion_profile,
    navigation_model: "TOP_LEVEL_TABS_CONTEXTUAL_DETAIL",
    responsive_detail_policy: "STACK_SUPPORT_BELOW_PRIMARY",
    route_continuity_policy: "SAME_SHELL_CONTEXTUAL_RETURN",
    selector_profile: "PORTAL_SEMANTIC_SELECTORS_V1",
    spacing_profile: "COMFORTABLE_TASK_FIRST",
    status_language_profile: "PLAIN_LITERAL_CLIENT_SAFE",
    support_region_policy: "ONE_PROMOTED_REGION_MAX",
  } satisfies PortalInteractionLayer;
}
