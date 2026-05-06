import { AuthorityModelError } from "../models/authority_common.ts";
import type { AuthorityRequestIdentityLookupRecord } from "../repositories/authority_request_identity_lookup_repository.ts";
import { assertAuthorityRequestIdentityStability } from "./assert_authority_request_identity_stability.ts";

export const REQUEST_IDENTITY_COLLISION_CODES = [
  "NO_COLLISION",
  "EXACT_REQUEST_REPLAY",
  "EXACT_REQUEST_COLLISION",
  "IDENTITY_NAMESPACE_COLLISION",
  "IDEMPOTENCY_KEY_COLLISION",
  "CONFLICTING_ACCESS_BINDING_HASH",
] as const;

export type RequestIdentityCollisionCode = (typeof REQUEST_IDENTITY_COLLISION_CODES)[number];

export type RequestIdentityCollisionDecision = {
  blocking: boolean;
  code: RequestIdentityCollisionCode;
  conflicting_lookup_ids: string[];
  reason_codes: string[];
};

const NAMESPACE_FIELDS = [
  "authority_name",
  "authority_product_profile",
  "provider_environment",
  "authority_scope",
  "operation_family",
  "operation_profile",
  "provider_api_version",
  "binding_lineage_ref",
] as const satisfies readonly (keyof AuthorityRequestIdentityLookupRecord)[];

const EXACT_REQUEST_FIELDS = [
  "tenant_id",
  "client_id",
  "attempt_lineage_manifest_id",
  "canonical_path",
  "canonical_query",
  "request_body_hash",
  "access_binding_hash",
  "authority_binding_ref",
  "authority_link_ref",
  "subject_ref",
  "acting_party_ref",
  "token_binding_ref",
  "policy_snapshot_hash",
] as const satisfies readonly (keyof AuthorityRequestIdentityLookupRecord)[];

function firstDifferentField(
  candidate: AuthorityRequestIdentityLookupRecord,
  existing: AuthorityRequestIdentityLookupRecord,
  fields: readonly (keyof AuthorityRequestIdentityLookupRecord)[],
) {
  return fields.find((field) => candidate[field] !== existing[field]) ?? null;
}

function decision(
  code: RequestIdentityCollisionCode,
  conflictingLookupIds: readonly string[],
  reasonCodes: readonly string[] = [],
): RequestIdentityCollisionDecision {
  return {
    blocking: !["NO_COLLISION", "EXACT_REQUEST_REPLAY"].includes(code),
    code,
    conflicting_lookup_ids: [...conflictingLookupIds].sort(),
    reason_codes: [...reasonCodes].sort(),
  };
}

export function detectRequestIdentityCollision(input: {
  candidate: AuthorityRequestIdentityLookupRecord;
  existing_records: readonly AuthorityRequestIdentityLookupRecord[];
}): RequestIdentityCollisionDecision {
  let exactReplay: AuthorityRequestIdentityLookupRecord | null = null;

  for (const existing of input.existing_records) {
    if (existing.lookup_id === input.candidate.lookup_id) {
      continue;
    }

    if (
      existing.identity_namespace_hash === input.candidate.identity_namespace_hash &&
      firstDifferentField(input.candidate, existing, NAMESPACE_FIELDS) !== null
    ) {
      return decision("IDENTITY_NAMESPACE_COLLISION", [existing.lookup_id], [
        "NAMESPACE_HASH_REUSED_FOR_DIFFERENT_NAMESPACE_TUPLE",
      ]);
    }

    if (
      existing.idempotency_key === input.candidate.idempotency_key &&
      existing.duplicate_meaning_key !== input.candidate.duplicate_meaning_key
    ) {
      return decision("IDEMPOTENCY_KEY_COLLISION", [existing.lookup_id], [
        "REQUEST_LEVEL_IDEMPOTENCY_KEY_REUSED_OUTSIDE_DUPLICATE_BUCKET",
      ]);
    }

    if (existing.request_hash !== input.candidate.request_hash) {
      continue;
    }

    const namespaceDiff = firstDifferentField(input.candidate, existing, NAMESPACE_FIELDS);
    if (namespaceDiff !== null) {
      return decision("IDENTITY_NAMESPACE_COLLISION", [existing.lookup_id], [
        `REQUEST_HASH_REUSED_WITH_DIFFERENT_${String(namespaceDiff).toUpperCase()}`,
      ]);
    }

    if (existing.access_binding_hash !== input.candidate.access_binding_hash) {
      return decision("CONFLICTING_ACCESS_BINDING_HASH", [existing.lookup_id], [
        "REQUEST_HASH_REUSED_WITH_DIFFERENT_ACCESS_BINDING_HASH",
      ]);
    }

    const exactDiff = firstDifferentField(input.candidate, existing, EXACT_REQUEST_FIELDS);
    if (exactDiff !== null) {
      return decision("EXACT_REQUEST_COLLISION", [existing.lookup_id], [
        `REQUEST_HASH_REUSED_WITH_DIFFERENT_${String(exactDiff).toUpperCase()}`,
      ]);
    }

    try {
      assertAuthorityRequestIdentityStability({
        actual: input.candidate.request_identity_contract,
        expected: existing.request_identity_contract,
      });
      exactReplay = existing;
    } catch (error) {
      if (error instanceof AuthorityModelError) {
        return decision("EXACT_REQUEST_COLLISION", [existing.lookup_id], [
          "REQUEST_HASH_REUSED_WITH_DIFFERENT_GROUPED_CONTRACT",
        ]);
      }
      throw error;
    }
  }

  if (exactReplay !== null) {
    return decision("EXACT_REQUEST_REPLAY", [exactReplay.lookup_id], ["EXACT_SEALED_REQUEST_ALREADY_EXISTS"]);
  }
  return decision("NO_COLLISION", []);
}
