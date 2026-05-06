import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { RouteStabilityContract } from "../../../../packages/generated-models/src/generated/typescript/surface-and-experience.ts";
import {
  buildAccessRebindRequiredProblem,
} from "../services/build_access_rebind_required_problem.ts";
import { buildProblemEnvelope, northboundNoStoreHeaders } from "../services/build_problem_envelope.ts";
import { buildRebaseRequiredProblem } from "../services/build_rebase_required_problem.ts";
import {
  detectRouteOrEpochRebaseRequirement,
  type StreamRecoveryScopeClass,
} from "../services/detect_route_or_epoch_rebase_requirement.ts";

export type StreamRecoveryProblemResponse = {
  body: ProblemEnvelope;
  headers: typeof northboundNoStoreHeaders;
  status: number;
};

export type StreamRecoveryFailureKind =
  | "ACCESS_REBIND_REQUIRED"
  | "REBASE_REQUIRED"
  | "RESUME_TOKEN_REQUIRED";

export function mapStreamRecoveryFailure(input: {
  audience?: "PORTAL" | "STAFF";
  correlationId: string;
  failureKind: StreamRecoveryFailureKind;
  frameEpoch: number;
  latestCommandReceiptRef?: string | null;
  latestDecisionBundleRef?: string | null;
  latestResumeToken?: string | null;
  latestStabilityContract?: RouteStabilityContract | null;
  latestWorkspaceSnapshotRef?: string | null;
  manifestId?: string | null;
  reasonCodes: readonly string[];
  scope: StreamRecoveryScopeClass;
  shellStabilityToken: string;
  suggestedDetailSurfaceCode?: ProblemEnvelope["suggested_detail_surface_code"];
  workspaceVersion?: number | null;
}): StreamRecoveryProblemResponse {
  if (input.failureKind === "ACCESS_REBIND_REQUIRED") {
    return buildAccessRebindRequiredProblem({
      audience: input.audience,
      correlationId: input.correlationId,
      manifestId: input.manifestId,
      reasonCodes: input.reasonCodes,
      suggestedDetailSurfaceCode: input.suggestedDetailSurfaceCode,
    });
  }
  if (input.failureKind === "RESUME_TOKEN_REQUIRED") {
    return {
      body: buildProblemEnvelope({
        audience: input.audience,
        correlationId: input.correlationId,
        detail:
          input.scope === "MANIFEST_EXPERIENCE"
            ? "The manifest experience stream requires a snapshot-issued resume_token."
            : "The workspace stream requires a snapshot-issued resume_token.",
        manifestId: input.manifestId,
        problemCode:
          input.scope === "MANIFEST_EXPERIENCE"
            ? "MANIFEST_RESUME_TOKEN_REQUIRED"
            : "WORKSPACE_RESUME_TOKEN_REQUIRED",
        reasonCodes: input.reasonCodes,
        retryable: false,
        suggestedDetailSurfaceCode: input.suggestedDetailSurfaceCode ?? "FOCUS_LENS",
        title:
          input.scope === "MANIFEST_EXPERIENCE"
            ? "Manifest stream resume token is required"
            : "Workspace stream resume token is required",
      }),
      headers: northboundNoStoreHeaders,
      status: 400,
    };
  }
  if (input.latestStabilityContract === undefined || input.latestStabilityContract === null) {
    throw new Error("REBASE_REQUIRED stream recovery mapping requires latestStabilityContract");
  }
  const requirement = detectRouteOrEpochRebaseRequirement({
    frameEpoch: input.frameEpoch,
    reasonCodes: input.reasonCodes,
    scope: input.scope,
    shellStabilityToken: input.shellStabilityToken,
    workspaceVersion: input.workspaceVersion,
  });
  return buildRebaseRequiredProblem({
    audience: input.audience,
    correlationId: input.correlationId,
    latestCommandReceiptRef: input.latestCommandReceiptRef,
    latestDecisionBundleRef: input.latestDecisionBundleRef,
    latestResumeToken: input.latestResumeToken,
    latestStabilityContract: input.latestStabilityContract,
    latestStaleGuardValue: requirement.latestStaleGuardValue,
    latestWorkspaceSnapshotRef: input.latestWorkspaceSnapshotRef,
    manifestId: input.manifestId,
    reasonCodes: requirement.reasonCodes,
    scope: input.scope,
    staleGuardFamily: requirement.staleGuardFamily,
    suggestedDetailSurfaceCode: input.suggestedDetailSurfaceCode,
  });
}
