import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";

export type RouteOrEpochRebaseReasonCode =
  | "FRAME_EPOCH_ADVANCED"
  | "HISTORY_COMPACTED"
  | "ROUTE_CONTEXT_CHANGED"
  | "SHELL_STABILITY_CHANGED";

export type StreamRecoveryScopeClass = "MANIFEST_EXPERIENCE" | "WORKSPACE";

export type RouteOrEpochRebaseRequirement = {
  kind: "REBASE_REQUIRED";
  reasonCode: RouteOrEpochRebaseReasonCode;
  reasonCodes: string[];
  staleGuardFamily: NonNullable<ProblemEnvelope["stale_guard_family"]>;
  latestStaleGuardValue: NonNullable<ProblemEnvelope["latest_stale_guard_value"]>;
};

function firstRouteRebaseReason(reasonCodes: readonly string[]): RouteOrEpochRebaseReasonCode {
  if (reasonCodes.includes("SHELL_STABILITY_CHANGED")) {
    return "SHELL_STABILITY_CHANGED";
  }
  if (reasonCodes.includes("FRAME_EPOCH_ADVANCED")) {
    return "FRAME_EPOCH_ADVANCED";
  }
  if (reasonCodes.includes("HISTORY_COMPACTED")) {
    return "HISTORY_COMPACTED";
  }
  return "ROUTE_CONTEXT_CHANGED";
}

export function detectRouteOrEpochRebaseRequirement(input: {
  frameEpoch: number;
  reasonCodes: readonly string[];
  scope: StreamRecoveryScopeClass;
  shellStabilityToken: string;
  workspaceVersion?: number | null;
}): RouteOrEpochRebaseRequirement {
  const reasonCode = firstRouteRebaseReason(input.reasonCodes);
  const reasonCodes = input.reasonCodes.length > 0 ? [...input.reasonCodes] : [reasonCode];
  if (input.scope === "MANIFEST_EXPERIENCE") {
    if (reasonCode === "SHELL_STABILITY_CHANGED") {
      return {
        kind: "REBASE_REQUIRED",
        latestStaleGuardValue: input.shellStabilityToken,
        reasonCode,
        reasonCodes,
        staleGuardFamily: "SHELL_STABILITY_TOKEN",
      };
    }
    return {
      kind: "REBASE_REQUIRED",
      latestStaleGuardValue: input.frameEpoch,
      reasonCode,
      reasonCodes,
      staleGuardFamily: "FRAME_EPOCH",
    };
  }
  if (reasonCode === "SHELL_STABILITY_CHANGED") {
    return {
      kind: "REBASE_REQUIRED",
      latestStaleGuardValue: input.shellStabilityToken,
      reasonCode,
      reasonCodes,
      staleGuardFamily: "SHELL_STABILITY_TOKEN",
    };
  }
  return {
    kind: "REBASE_REQUIRED",
    latestStaleGuardValue: input.workspaceVersion ?? 0,
    reasonCode,
    reasonCodes,
    staleGuardFamily: "WORK_ITEM_VERSION",
  };
}
