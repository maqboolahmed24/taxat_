import type { PortalInteractionLayer } from "../../../generated-models/src/generated/typescript/client-and-collaboration.ts";
import type {
  InteractionLayerFoundationContract,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import { projectFoundationContractForShell } from "./project_foundation_contract_for_shell.ts";

export function projectPortalInteractionLayer(input: {
  foundationContract?: InteractionLayerFoundationContract | undefined;
} = {}): PortalInteractionLayer {
  const foundationContract =
    input.foundationContract ??
    projectFoundationContractForShell({ shellFamily: "CLIENT_PORTAL_SHELL" });
  if (foundationContract.shell_family !== "CLIENT_PORTAL_SHELL") {
    throw new Error("PortalInteractionLayer requires a CLIENT_PORTAL_SHELL foundation contract");
  }
  if (foundationContract.secondary_window_policy !== "NOT_APPLICABLE") {
    throw new Error("PortalInteractionLayer cannot publish detached secondary-window semantics");
  }

  return {
    artifact_hierarchy_policy: foundationContract.history_presentation_policy,
    feedback_truth_policy: foundationContract.feedback_truth_policy,
    focus_restoration_policy: "RETURN_FOCUS_ANCHOR_THEN_LATEST_VISIBLE",
    foundation_contract: foundationContract,
    motion_profile: foundationContract.motion_profile,
    navigation_model: "TOP_LEVEL_TABS_CONTEXTUAL_DETAIL",
    responsive_detail_policy: "STACK_SUPPORT_BELOW_PRIMARY",
    route_continuity_policy: foundationContract.continuity_policy,
    selector_profile: foundationContract.selector_profile,
    spacing_profile: "COMFORTABLE_TASK_FIRST",
    status_language_profile: "PLAIN_LITERAL_CLIENT_SAFE",
    support_region_policy: "ONE_PROMOTED_REGION_MAX",
  };
}
