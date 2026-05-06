import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import {
  buildProblemEnvelope,
  northboundNoStoreHeaders,
  type BuildProblemEnvelopeInput,
} from "./build_problem_envelope.ts";

export type PreconditionFailedProblemResponse = {
  body: ProblemEnvelope;
  headers: typeof northboundNoStoreHeaders;
  status: 412;
};

export function buildPreconditionFailedProblemEnvelope(input: {
  audience?: BuildProblemEnvelopeInput["audience"];
  correlationId: string;
  detail?: string;
  manifestId?: string | null;
  reasonCodes?: readonly string[];
  suggestedDetailSurfaceCode?: ProblemEnvelope["suggested_detail_surface_code"];
  title?: string;
}): PreconditionFailedProblemResponse {
  return {
    body: buildProblemEnvelope({
      audience: input.audience,
      correlationId: input.correlationId,
      detail:
        input.detail ??
        "The supplied If-Match validator does not match the current authoritative ETag.",
      manifestId: input.manifestId,
      problemCode: "PRECONDITION_FAILED",
      reasonCodes: input.reasonCodes ?? ["IF_MATCH_PRECONDITION_FAILED"],
      rebaseRequired: false,
      retryable: true,
      suggestedDetailSurfaceCode: input.suggestedDetailSurfaceCode ?? "FOCUS_LENS",
      title: input.title ?? "Precondition failed",
    }),
    headers: northboundNoStoreHeaders,
    status: 412,
  };
}

