import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import {
  buildProblemEnvelope,
  northboundNoStoreHeaders,
  type BuildProblemEnvelopeInput,
} from "./build_problem_envelope.ts";
import type { AccessRebindReasonCode } from "./detect_access_binding_or_masking_rebind_requirement.ts";

export type AccessRebindRequiredProblemResponse = {
  body: ProblemEnvelope;
  headers: typeof northboundNoStoreHeaders;
  status: 403;
};

export function buildAccessRebindRequiredProblem(input: {
  audience?: BuildProblemEnvelopeInput["audience"];
  correlationId: string;
  detail?: string;
  manifestId?: string | null;
  reasonCodes: readonly (AccessRebindReasonCode | string)[];
  suggestedDetailSurfaceCode?: ProblemEnvelope["suggested_detail_surface_code"];
  title?: string;
}): AccessRebindRequiredProblemResponse {
  return {
    body: buildProblemEnvelope({
      audience: input.audience,
      correlationId: input.correlationId,
      detail:
        input.detail ??
        "The resume binding no longer matches the active session, access scope, masking posture, or schema window.",
      manifestId: input.manifestId,
      problemCode: "ACCESS_REBIND_REQUIRED",
      reasonCodes: input.reasonCodes,
      recoveryRefs: null,
      restrictRecoveryFamilyTo: "NONE",
      retryable: false,
      suggestedDetailSurfaceCode: input.suggestedDetailSurfaceCode ?? "FOCUS_LENS",
      title: input.title ?? "Access rebind is required",
    }),
    headers: northboundNoStoreHeaders,
    status: 403,
  };
}
