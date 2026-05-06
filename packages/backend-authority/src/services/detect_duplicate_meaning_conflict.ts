import type { AuthorityRequestIdentityLookupRecord } from "../repositories/authority_request_identity_lookup_repository.ts";

export const DUPLICATE_MEANING_CONFLICT_CODES = [
  "NO_CONFLICT",
  "EXACT_REQUEST_REPLAY",
  "DUPLICATE_MEANING_COLLISION",
  "BODY_COLLISION",
  "CONFLICTING_ACCESS_BINDING_HASH",
  "IDENTITY_NAMESPACE_COLLISION",
  "STALE_DUPLICATE_BUCKET_STRONGER_TRUTH",
] as const;

export type DuplicateMeaningConflictCode = (typeof DUPLICATE_MEANING_CONFLICT_CODES)[number];

export type DuplicateMeaningConflictDecision = {
  blocking: boolean;
  code: DuplicateMeaningConflictCode;
  conflicting_lookup_ids: string[];
  reason_codes: string[];
};

const AUTHORITY_GROUNDED_STRONGER_TRUTH = new Set(["CONFIRMED", "REJECTED", "OUT_OF_BAND"]);

function decision(
  code: DuplicateMeaningConflictCode,
  conflictingLookupIds: readonly string[],
  reasonCodes: readonly string[] = [],
): DuplicateMeaningConflictDecision {
  return {
    blocking: !["NO_CONFLICT", "EXACT_REQUEST_REPLAY"].includes(code),
    code,
    conflicting_lookup_ids: [...conflictingLookupIds].sort(),
    reason_codes: [...reasonCodes].sort(),
  };
}

export function detectDuplicateMeaningConflict(input: {
  candidate: AuthorityRequestIdentityLookupRecord;
  existing_records: readonly AuthorityRequestIdentityLookupRecord[];
}): DuplicateMeaningConflictDecision {
  let exactReplay: AuthorityRequestIdentityLookupRecord | null = null;

  for (const existing of input.existing_records) {
    if (
      existing.lookup_id === input.candidate.lookup_id ||
      existing.duplicate_meaning_key !== input.candidate.duplicate_meaning_key
    ) {
      continue;
    }

    if (AUTHORITY_GROUNDED_STRONGER_TRUTH.has(existing.authority_truth_state)) {
      return decision("STALE_DUPLICATE_BUCKET_STRONGER_TRUTH", [existing.lookup_id], [
        "STRONGER_AUTHORITY_TRUTH_PRESENT_FOR_DUPLICATE_BUCKET",
      ]);
    }

    if (existing.identity_namespace_hash !== input.candidate.identity_namespace_hash) {
      return decision("IDENTITY_NAMESPACE_COLLISION", [existing.lookup_id], [
        "DUPLICATE_BUCKET_REUSED_ACROSS_NAMESPACE",
      ]);
    }

    if (existing.request_body_hash !== input.candidate.request_body_hash) {
      return decision("BODY_COLLISION", [existing.lookup_id], [
        "DUPLICATE_BUCKET_REUSED_WITH_DIFFERENT_REQUEST_BODY_HASH",
      ]);
    }

    if (existing.access_binding_hash !== input.candidate.access_binding_hash) {
      return decision("CONFLICTING_ACCESS_BINDING_HASH", [existing.lookup_id], [
        "DUPLICATE_BUCKET_REUSED_WITH_DIFFERENT_ACCESS_BINDING_HASH",
      ]);
    }

    if (existing.request_hash === input.candidate.request_hash) {
      exactReplay = existing;
      continue;
    }

    return decision("DUPLICATE_MEANING_COLLISION", [existing.lookup_id], [
      "DUPLICATE_BUCKET_OCCUPIED_BY_DIFFERENT_EXACT_REQUEST",
    ]);
  }

  if (exactReplay !== null) {
    return decision("EXACT_REQUEST_REPLAY", [exactReplay.lookup_id], ["EXACT_SEALED_REQUEST_ALREADY_EXISTS"]);
  }
  return decision("NO_CONFLICT", []);
}
