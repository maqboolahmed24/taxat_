import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { AuthoritativeEtagBasis } from "../services/derive_authoritative_etag.ts";
import { buildPreconditionFailedProblemEnvelope } from "../services/build_precondition_failed_problem_envelope.ts";
import {
  validateIfMatchAgainstAuthoritativeGuard,
  type IfMatchValidationResult,
} from "../services/validate_if_match_against_authoritative_guard.ts";

export type IfMatchPreconditionGuardResult =
  | {
      authoritativeEtag: string;
      outcome: "PASSED";
    }
  | {
      body: ProblemEnvelope;
      headers: ReturnType<typeof buildPreconditionFailedProblemEnvelope>["headers"] & {
        ETag: string;
      };
      outcome: "FAILED";
      status: 412;
      validation: Extract<IfMatchValidationResult, { outcome: "INVALID" | "MISMATCH" | "MISSING" }>;
    };

export function applyIfMatchPreconditionGuard(input: {
  audience?: Parameters<typeof buildPreconditionFailedProblemEnvelope>[0]["audience"];
  authoritative: AuthoritativeEtagBasis | string;
  correlationId: string;
  ifMatch?: string | null;
  manifestId?: string | null;
  requireIfMatch?: boolean;
  resourceExists?: boolean;
  suggestedDetailSurfaceCode?: Parameters<
    typeof buildPreconditionFailedProblemEnvelope
  >[0]["suggestedDetailSurfaceCode"];
}): IfMatchPreconditionGuardResult {
  const validation = validateIfMatchAgainstAuthoritativeGuard({
    authoritative: input.authoritative,
    ifMatch: input.ifMatch,
    requireIfMatch: input.requireIfMatch,
    resourceExists: input.resourceExists,
  });
  if (validation.outcome === "MATCH") {
    return {
      authoritativeEtag: validation.authoritativeEtag,
      outcome: "PASSED",
    };
  }
  const failed = buildPreconditionFailedProblemEnvelope({
    audience: input.audience,
    correlationId: input.correlationId,
    manifestId: input.manifestId,
    reasonCodes: validation.reasonCodes,
    suggestedDetailSurfaceCode: input.suggestedDetailSurfaceCode,
  });
  return {
    body: failed.body,
    headers: {
      ...failed.headers,
      ETag: validation.authoritativeEtag,
    },
    outcome: "FAILED",
    status: failed.status,
    validation,
  };
}

