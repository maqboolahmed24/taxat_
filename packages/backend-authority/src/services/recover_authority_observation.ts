import { AuthorityModelError } from "../models/authority_common.ts";
import type { AuthorityResponseEnvelope } from "../models/authority_response_envelope.ts";
import { normalizeAuthorityResponse, type NormalizeAuthorityResponseInput } from "./normalize_authority_response.ts";

export async function recoverAuthorityObservation(
  input: Omit<NormalizeAuthorityResponseInput, "response_source"> & {
    recovery_basis_response_id: string;
  },
): Promise<{
  ingress_receipt_repository: Awaited<ReturnType<typeof normalizeAuthorityResponse>>["ingress_receipt_repository"];
  response: AuthorityResponseEnvelope;
}> {
  if (!input.recovery_basis_response_id) {
    throw new AuthorityModelError(
      "AUTHORITY_FIELD_REQUIRED",
      "recovery_basis_response_id is required for recovery reads",
    );
  }
  return normalizeAuthorityResponse({
    ...input,
    corroborates_response_ids: input.corroborates_response_ids?.length
      ? input.corroborates_response_ids
      : [input.recovery_basis_response_id],
    response_source: "RECOVERY_READ",
  });
}

