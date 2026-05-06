import {
  authorityCalculationRequestRef,
  normalizeAuthorityCalculationRequest,
  type AuthorityCalculationRequestRecord,
} from "../models/authority_calculation_request.ts";
import {
  buildAuthorityCalculationResult,
  type AuthorityCalculationResultRecord,
} from "../models/authority_calculation_result.ts";
import { AuthorityModelError } from "../models/authority_common.ts";
import { AuthorityCalculationResultRepository } from "../repositories/authority_calculation_result_repository.ts";
import { AuthorityCalculationRequestRepository } from "../repositories/authority_calculation_request_repository.ts";

export type RetrieveAuthorityCalculationResultInput = {
  authority_response_ref?: string | null;
  calculation_id?: string;
  money_profile?: unknown;
  reason_codes?: readonly string[];
  request_repository?: AuthorityCalculationRequestRepository;
  repository?: AuthorityCalculationResultRepository;
  request: AuthorityCalculationRequestRecord;
  retrieved_at?: string | null;
  retrieved_payload?: unknown;
  retrieved_payload_ref?: string | null;
  validation_outcome?: AuthorityCalculationResultRecord["validation_outcome"];
};

export async function retrieveAuthorityCalculationResult(
  input: RetrieveAuthorityCalculationResultInput,
): Promise<{
  repository: AuthorityCalculationResultRepository;
  request: AuthorityCalculationRequestRecord;
  request_stored: Awaited<
    ReturnType<AuthorityCalculationRequestRepository["persistAuthorityCalculationRequest"]>
  > | null;
  result: AuthorityCalculationResultRecord;
  stored: Awaited<ReturnType<AuthorityCalculationResultRepository["persistAuthorityCalculationResult"]>>;
}> {
  const repository = input.repository ?? new AuthorityCalculationResultRepository();
  const request = input.request;
  if (request.request_state === "SUPERSEDED") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "superseded calculation requests cannot retrieve a current result",
    );
  }

  const modeled = !request.live_authority_call_executed || request.request_state === "MODELED_ONLY";
  const updatedRequest = modeled
    ? request
    : normalizeAuthorityCalculationRequest({ ...request, request_state: "RETRIEVED" });
  const requestStored = input.request_repository
    ? await input.request_repository.persistAuthorityCalculationRequest({ request: updatedRequest })
    : null;
  const result = buildAuthorityCalculationResult({
    authority_response_ref: modeled ? null : input.authority_response_ref,
    calculation_id: input.calculation_id,
    calculation_request_ref: authorityCalculationRequestRef(request),
    calculation_type: request.calculation_type,
    live_authority_call_executed: !modeled,
    manifest_id: request.manifest_id,
    money_profile: input.money_profile,
    reason_codes: modeled
      ? [...(input.reason_codes ?? request.reason_codes)]
      : [
          ...(input.reason_codes ??
            (input.validation_outcome === "PASS_WITH_NOTICE" ? ["AUTHORITY_NOTICE_PRESENT"] : [])),
        ],
    result_state: modeled ? "MODELED" : "RETRIEVED",
    retrieved_at: modeled ? null : input.retrieved_at ?? "2026-04-29T12:00:00Z",
    retrieved_payload: input.retrieved_payload ?? {},
    retrieved_payload_ref: modeled ? null : input.retrieved_payload_ref,
    validation_outcome:
      input.validation_outcome ?? (modeled ? "HARD_BLOCK" : "PASS"),
  });
  const stored = await repository.persistAuthorityCalculationResult({ result });
  return { repository, request: updatedRequest, request_stored: requestStored, result, stored };
}
