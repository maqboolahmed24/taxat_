import type { AuthorityLinkInventoryItem } from "../../../generated-models/src/generated/typescript/authority-and-access.ts";

export const authorityLinkHandshakeStepOrder = [
  "SELECT_AUTHORITY",
  "CONFIRM_CLIENT_SCOPE",
  "RUN_PREFLIGHT_CHECKS",
  "AUTHORISE_EXTERNAL_HANDOFF",
  "VALIDATE_BINDING",
] as const satisfies readonly AuthorityLinkInventoryItem["guided_handshake_stepper"]["step_order"][number][];

type FlowState = AuthorityLinkInventoryItem["guided_handshake_stepper"]["flow_state"];

function defaultFlowState(input: {
  lifecycleState: AuthorityLinkInventoryItem["lifecycle_state"];
  preflightBlockingCheckRefs: readonly string[];
}) {
  if (input.preflightBlockingCheckRefs.length > 0) {
    return "BLOCKED" as const;
  }
  if (input.lifecycleState === "AUTHORISED_ACTIVE" || input.lifecycleState === "AUTHORISED_LIMITED") {
    return "LINKED" as const;
  }
  if (input.lifecycleState === "LINK_INITIATED") {
    return "IN_PROGRESS" as const;
  }
  return "NOT_STARTED" as const;
}

function completedStepsFor(flowState: FlowState) {
  switch (flowState) {
    case "LINKED":
      return [...authorityLinkHandshakeStepOrder];
    case "VALIDATION_PENDING":
      return authorityLinkHandshakeStepOrder.slice(0, 4);
    case "HANDOFF_PENDING":
      return authorityLinkHandshakeStepOrder.slice(0, 3);
    case "BLOCKED":
      return authorityLinkHandshakeStepOrder.slice(0, 2);
    case "IN_PROGRESS":
      return authorityLinkHandshakeStepOrder.slice(0, 1);
    case "NOT_STARTED":
      return [];
  }
}

function currentStepFor(flowState: FlowState) {
  switch (flowState) {
    case "LINKED":
    case "VALIDATION_PENDING":
      return "VALIDATE_BINDING" as const;
    case "HANDOFF_PENDING":
      return "AUTHORISE_EXTERNAL_HANDOFF" as const;
    case "BLOCKED":
      return "RUN_PREFLIGHT_CHECKS" as const;
    case "IN_PROGRESS":
      return "CONFIRM_CLIENT_SCOPE" as const;
    case "NOT_STARTED":
      return "SELECT_AUTHORITY" as const;
  }
}

export function buildGuidedHandshakeStepper(input: {
  authorityLinkId: string;
  externalHandoffRef?: string | null | undefined;
  flowState?: FlowState | undefined;
  lifecycleState: AuthorityLinkInventoryItem["lifecycle_state"];
  preflightBlockingCheckRefs: readonly string[];
}): AuthorityLinkInventoryItem["guided_handshake_stepper"] {
  const hasPreflightBlockers = input.preflightBlockingCheckRefs.length > 0;
  const flow_state =
    hasPreflightBlockers
      ? "BLOCKED"
      : input.flowState ??
        defaultFlowState({
          lifecycleState: input.lifecycleState,
          preflightBlockingCheckRefs: input.preflightBlockingCheckRefs,
        });
  const external_handoff_ref_or_null =
    flow_state === "HANDOFF_PENDING" || flow_state === "VALIDATION_PENDING"
      ? input.externalHandoffRef ?? `external-handoff.${input.authorityLinkId}`
      : null;
  if (flow_state === "BLOCKED" && !hasPreflightBlockers) {
    throw new Error("BLOCKED authority-link handshake requires preflight blocking refs");
  }

  return {
    completed_step_codes: completedStepsFor(flow_state),
    credential_capture_mode: "GUIDED_HANDSHAKE_ONLY",
    current_step_code: currentStepFor(flow_state),
    external_handoff_ref_or_null,
    flow_state,
    preflight_blocking_check_refs: [...input.preflightBlockingCheckRefs],
    step_order: [...authorityLinkHandshakeStepOrder],
  };
}
