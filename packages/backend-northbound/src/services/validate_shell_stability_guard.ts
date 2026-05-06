import { detectRouteOrEpochRebaseRequirement } from "./detect_route_or_epoch_rebase_requirement.ts";
import type {
  RouteOrEpochRebaseRequirement,
  StreamRecoveryScopeClass,
} from "./detect_route_or_epoch_rebase_requirement.ts";

export type ShellStabilityGuardValidation =
  | {
      outcome: "MATCH";
    }
  | {
      outcome: "REBASE_REQUIRED";
      requirement: RouteOrEpochRebaseRequirement;
    };

export function validateShellStabilityGuard(input: {
  authoritativeShellStabilityToken: string;
  frameEpoch: number;
  ifMatchShellStabilityToken?: string | null;
  scope: StreamRecoveryScopeClass;
  workspaceVersion?: number | null;
}): ShellStabilityGuardValidation {
  if (
    input.ifMatchShellStabilityToken === undefined ||
    input.ifMatchShellStabilityToken === null ||
    input.ifMatchShellStabilityToken === input.authoritativeShellStabilityToken
  ) {
    return { outcome: "MATCH" };
  }
  return {
    outcome: "REBASE_REQUIRED",
    requirement: detectRouteOrEpochRebaseRequirement({
      frameEpoch: input.frameEpoch,
      reasonCodes: ["SHELL_STABILITY_CHANGED"],
      scope: input.scope,
      shellStabilityToken: input.authoritativeShellStabilityToken,
      workspaceVersion: input.workspaceVersion,
    }),
  };
}
