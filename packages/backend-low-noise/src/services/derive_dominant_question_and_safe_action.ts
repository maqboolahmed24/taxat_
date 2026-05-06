import type {
  ShellDominanceContract,
  ShellDominanceContractSurfaceCode,
  ShellStateTaxonomyContract,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";

export type ShellSalienceFamily =
  | "CALM_SHELL"
  | "CLIENT_PORTAL_SHELL"
  | "GOVERNANCE_DENSITY_SHELL"
  | "NATIVE_OPERATOR_SCENE";

export type ClientPortalRoute = "HOME" | "DOCUMENTS" | "APPROVALS" | "ONBOARDING" | "HELP";

export type DominantQuestionAndSafeAction = {
  dominantActionRefOrNull: string | null;
  dominantActionSurfaceCode: ShellDominanceContractSurfaceCode;
  dominantQuestion: string;
  dominantQuestionSurfaceCode: ShellDominanceContractSurfaceCode;
  safeActionState: ShellDominanceContract["safe_action_state"];
  supplementalQueuePolicy: ShellDominanceContract["supplemental_queue_policy"];
};

export const portalDominanceSurfaceByRoute = {
  APPROVALS: "APPROVAL_CENTER",
  DOCUMENTS: "DOCUMENT_CENTER",
  HELP: "SUPPORT_PANEL",
  HOME: "STATUS_HERO",
  ONBOARDING: "STEP_WORKSPACE",
} as const satisfies Record<ClientPortalRoute, ShellDominanceContractSurfaceCode>;

function normalizeQuestion(value: string | null | undefined, fallback: string) {
  const normalized = (value ?? fallback).split(/\s+/u).join(" ").trim();
  return normalized.length > 0 ? normalized : fallback;
}

function requiresNoSafeAction(input: {
  recoveryPosture?: ShellStateTaxonomyContract["current_recovery_posture"] | undefined;
}) {
  return input.recoveryPosture === "ACCESS_REBIND_REQUIRED" || input.recoveryPosture === "READ_ONLY_LIMITED";
}

export function dominanceSurfaceMappingFor(input: {
  portalRoute?: ClientPortalRoute | undefined;
  shellFamily: ShellSalienceFamily;
}) {
  if (input.shellFamily === "CALM_SHELL") {
    return {
      dominantActionSurfaceCode: "ACTION_STRIP",
      dominantQuestionSurfaceCode: "DECISION_SUMMARY",
      supplementalQueuePolicy: "NOT_APPLICABLE",
    } as const satisfies Pick<
      DominantQuestionAndSafeAction,
      "dominantActionSurfaceCode" | "dominantQuestionSurfaceCode" | "supplementalQueuePolicy"
    >;
  }
  if (input.shellFamily === "CLIENT_PORTAL_SHELL") {
    if (!input.portalRoute) {
      throw new Error("CLIENT_PORTAL_SHELL salience projection requires portalRoute");
    }
    const routeSurface = portalDominanceSurfaceByRoute[input.portalRoute];
    return {
      dominantActionSurfaceCode: routeSurface,
      dominantQuestionSurfaceCode: routeSurface,
      supplementalQueuePolicy:
        input.portalRoute === "HOME" ? "SECONDARY_TO_PRIMARY_ACTION" : "NOT_APPLICABLE",
    } as const satisfies Pick<
      DominantQuestionAndSafeAction,
      "dominantActionSurfaceCode" | "dominantQuestionSurfaceCode" | "supplementalQueuePolicy"
    >;
  }
  if (input.shellFamily === "GOVERNANCE_DENSITY_SHELL") {
    return {
      dominantActionSurfaceCode: "ATTENTION_SUMMARY",
      dominantQuestionSurfaceCode: "ATTENTION_SUMMARY",
      supplementalQueuePolicy: "SECONDARY_TO_PRIMARY_ACTION",
    } as const satisfies Pick<
      DominantQuestionAndSafeAction,
      "dominantActionSurfaceCode" | "dominantQuestionSurfaceCode" | "supplementalQueuePolicy"
    >;
  }
  return {
    dominantActionSurfaceCode: "ACTION_STRIP",
    dominantQuestionSurfaceCode: "PRIMARY_CANVAS",
    supplementalQueuePolicy: "NOT_APPLICABLE",
  } as const satisfies Pick<
    DominantQuestionAndSafeAction,
    "dominantActionSurfaceCode" | "dominantQuestionSurfaceCode" | "supplementalQueuePolicy"
  >;
}

export function deriveDominantQuestionAndSafeAction(input: {
  actionabilityState?: ShellDominanceContract["safe_action_state"] | undefined;
  dominantActionRefOrNull?: string | null | undefined;
  dominantQuestion?: string | null | undefined;
  noSafeActionReasonCode?: string | null | undefined;
  portalRoute?: ClientPortalRoute | undefined;
  previousDominantQuestion?: string | null | undefined;
  primaryActionCode?: string | null | undefined;
  recoveryPosture?: ShellStateTaxonomyContract["current_recovery_posture"] | undefined;
  settlementState?: ShellStateTaxonomyContract["current_settlement_state"] | undefined;
  shellFamily: ShellSalienceFamily;
}): DominantQuestionAndSafeAction {
  const mapping = dominanceSurfaceMappingFor(input);
  const forcedNoSafe = requiresNoSafeAction(input);
  const requestedSafeState =
    input.actionabilityState ??
    (input.primaryActionCode !== null && input.primaryActionCode !== undefined
      ? "ACTION_AVAILABLE"
      : "NO_SAFE_ACTION");
  const safeActionState = forcedNoSafe ? "NO_SAFE_ACTION" : requestedSafeState;
  const dominantQuestion =
    input.settlementState === "RECEIPT_PENDING" && input.previousDominantQuestion
      ? normalizeQuestion(input.previousDominantQuestion, "What is the current safe next step?")
      : normalizeQuestion(
          input.dominantQuestion,
          safeActionState === "NO_SAFE_ACTION"
            ? "What recovery is required?"
            : "What is the current safe next step?",
        );
  const dominantActionRefOrNull =
    safeActionState === "ACTION_AVAILABLE"
      ? (input.dominantActionRefOrNull ?? input.primaryActionCode ?? null)
      : null;

  return {
    ...mapping,
    dominantActionRefOrNull,
    dominantQuestion,
    safeActionState,
    supplementalQueuePolicy:
      input.shellFamily === "CLIENT_PORTAL_SHELL" &&
      input.portalRoute === "HOME" &&
      dominantActionRefOrNull !== null
        ? "PRIMARY_ACTION_MIRROR_ONLY"
        : mapping.supplementalQueuePolicy,
  };
}
