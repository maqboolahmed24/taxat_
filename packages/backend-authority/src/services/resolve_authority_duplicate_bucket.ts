import {
  type AuthorityRequestIdentityLookupRecord,
  type AuthorityRequestIdentityLookupRepository,
} from "../repositories/authority_request_identity_lookup_repository.ts";
import {
  detectDuplicateMeaningConflict,
  type DuplicateMeaningConflictDecision,
} from "./detect_duplicate_meaning_conflict.ts";
import {
  detectRequestIdentityCollision,
  type RequestIdentityCollisionDecision,
} from "./detect_request_identity_collision.ts";

export const AUTHORITY_DUPLICATE_BUCKET_RESOLUTION_STATES = [
  "EMPTY_BUCKET",
  "EXACT_REPLAY_REUSE",
  "DUPLICATE_BUCKET_OCCUPIED_RECONCILE",
  "HARD_BLOCK_COLLISION",
] as const;

export type AuthorityDuplicateBucketResolutionState =
  (typeof AUTHORITY_DUPLICATE_BUCKET_RESOLUTION_STATES)[number];

export type AuthorityDuplicateBucketResolution = {
  candidate: AuthorityRequestIdentityLookupRecord;
  duplicate_conflict: DuplicateMeaningConflictDecision;
  existing_records: AuthorityRequestIdentityLookupRecord[];
  request_collision: RequestIdentityCollisionDecision;
  resolution_state: AuthorityDuplicateBucketResolutionState;
  reusable_lookup_id: string | null;
};

function mergeRecords(records: readonly AuthorityRequestIdentityLookupRecord[]) {
  const byId = new Map<string, AuthorityRequestIdentityLookupRecord>();
  for (const record of records) {
    byId.set(record.lookup_id, record);
  }
  return [...byId.values()].sort((left, right) => left.lookup_id.localeCompare(right.lookup_id));
}

export async function resolveAuthorityDuplicateBucket(input: {
  candidate: AuthorityRequestIdentityLookupRecord;
  repository: AuthorityRequestIdentityLookupRepository;
}): Promise<AuthorityDuplicateBucketResolution> {
  const [byDuplicate, byRequestHash, byIdempotencyKey, byNamespace] = await Promise.all([
    input.repository.listRequestIdentityLookupsByDuplicateMeaningKey(input.candidate.duplicate_meaning_key),
    input.repository.listRequestIdentityLookupsByRequestHash(input.candidate.request_hash),
    input.repository.listRequestIdentityLookupsByIdempotencyKey(input.candidate.idempotency_key),
    input.repository.listRequestIdentityLookupsByIdentityNamespaceHash(input.candidate.identity_namespace_hash),
  ]);
  const existingRecords = mergeRecords([
    ...byDuplicate,
    ...byRequestHash,
    ...byIdempotencyKey,
    ...byNamespace,
  ]);
  const requestCollision = detectRequestIdentityCollision({
    candidate: input.candidate,
    existing_records: existingRecords,
  });
  const duplicateConflict = detectDuplicateMeaningConflict({
    candidate: input.candidate,
    existing_records: existingRecords,
  });

  if (requestCollision.blocking || ["BODY_COLLISION", "CONFLICTING_ACCESS_BINDING_HASH", "IDENTITY_NAMESPACE_COLLISION"].includes(duplicateConflict.code)) {
    return {
      candidate: input.candidate,
      duplicate_conflict: duplicateConflict,
      existing_records: existingRecords,
      request_collision: requestCollision,
      resolution_state: "HARD_BLOCK_COLLISION",
      reusable_lookup_id: null,
    };
  }

  if (duplicateConflict.code === "STALE_DUPLICATE_BUCKET_STRONGER_TRUTH") {
    return {
      candidate: input.candidate,
      duplicate_conflict: duplicateConflict,
      existing_records: existingRecords,
      request_collision: requestCollision,
      resolution_state: "DUPLICATE_BUCKET_OCCUPIED_RECONCILE",
      reusable_lookup_id: null,
    };
  }

  if (requestCollision.code === "EXACT_REQUEST_REPLAY" || duplicateConflict.code === "EXACT_REQUEST_REPLAY") {
    const reusableLookupId =
      requestCollision.conflicting_lookup_ids[0] ?? duplicateConflict.conflicting_lookup_ids[0] ?? null;
    return {
      candidate: input.candidate,
      duplicate_conflict: duplicateConflict,
      existing_records: existingRecords,
      request_collision: requestCollision,
      resolution_state: "EXACT_REPLAY_REUSE",
      reusable_lookup_id: reusableLookupId,
    };
  }

  if (duplicateConflict.code === "DUPLICATE_MEANING_COLLISION") {
    return {
      candidate: input.candidate,
      duplicate_conflict: duplicateConflict,
      existing_records: existingRecords,
      request_collision: requestCollision,
      resolution_state: "DUPLICATE_BUCKET_OCCUPIED_RECONCILE",
      reusable_lookup_id: null,
    };
  }

  return {
    candidate: input.candidate,
    duplicate_conflict: duplicateConflict,
    existing_records: existingRecords,
    request_collision: requestCollision,
    resolution_state: "EMPTY_BUCKET",
    reusable_lookup_id: null,
  };
}
