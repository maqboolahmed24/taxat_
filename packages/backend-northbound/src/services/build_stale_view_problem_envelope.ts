import type {
  MutationPreconditionBinding,
  ProblemEnvelope,
} from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { RouteStabilityContract } from "../../../../packages/generated-models/src/generated/typescript/surface-and-experience.ts";
import {
  buildProblemEnvelope,
  northboundNoStoreHeaders,
  type BuildProblemEnvelopeInput,
} from "./build_problem_envelope.ts";
import type { ProblemRecoveryRefs } from "./restrict_problem_recovery_family.ts";

export type StaleViewProblemResponse = {
  body: ProblemEnvelope;
  headers: typeof northboundNoStoreHeaders;
  status: 409;
};

export function buildStaleViewProblemEnvelope(input: {
  audience?: BuildProblemEnvelopeInput["audience"];
  correlationId: string;
  detail?: string;
  latestStabilityContract: RouteStabilityContract;
  latestStaleGuardValue: NonNullable<ProblemEnvelope["latest_stale_guard_value"]>;
  manifestId?: string | null;
  mutationPreconditionBinding: MutationPreconditionBinding;
  problemCode?: "REBASE_REQUIRED" | "VIEW_STALE";
  reasonCodes?: readonly string[];
  recoveryRefs: Partial<ProblemRecoveryRefs>;
  staleGuardFamily: NonNullable<ProblemEnvelope["stale_guard_family"]>;
  suggestedDetailSurfaceCode?: ProblemEnvelope["suggested_detail_surface_code"];
  title?: string;
}): StaleViewProblemResponse {
  const problemCode = input.problemCode ?? "VIEW_STALE";
  return {
    body: buildProblemEnvelope({
      audience: input.audience,
      correlationId: input.correlationId,
      detail:
        input.detail ??
        (problemCode === "VIEW_STALE"
          ? "The request was formed from stale view state and must be rebased before retry."
          : "The route generation changed and must be rebased before retry."),
      latestStabilityContractOrNull: input.latestStabilityContract,
      latestStaleGuardValue: input.latestStaleGuardValue,
      manifestId: input.manifestId,
      mutationPreconditionBindingOrNull: input.mutationPreconditionBinding,
      problemCode,
      reasonCodes:
        input.reasonCodes ??
        [
          problemCode === "VIEW_STALE"
            ? `${input.staleGuardFamily}_MISMATCH`
            : "ROUTE_STABILITY_MISMATCH",
        ],
      rebaseRequired: true,
      recoveryRefs: input.recoveryRefs,
      retryable: true,
      staleGuardFamily: input.staleGuardFamily,
      suggestedDetailSurfaceCode: input.suggestedDetailSurfaceCode ?? "FOCUS_LENS",
      title:
        input.title ??
        (problemCode === "VIEW_STALE"
          ? "The current view is stale"
          : "Route continuity changed and the request must be rebased"),
    }),
    headers: northboundNoStoreHeaders,
    status: 409,
  };
}
