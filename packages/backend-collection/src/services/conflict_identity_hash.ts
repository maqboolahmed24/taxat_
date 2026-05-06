import {
  deriveCollectionControlHash,
  normalizeCollectionString,
  normalizeCollectionStringSet,
} from "../models/collection_control_common.ts";

export type ConflictIdentityHashInput = {
  conflict_detection_policy_ref: string;
  conflict_type: string;
  contradiction_class: string;
  decisive_target_refs: readonly string[];
  involved_fact_refs: readonly string[];
  manifest_id: string;
  reason_codes: readonly string[];
};

export function deriveConflictIdentityHash(input: ConflictIdentityHashInput) {
  return `conflict-identity-hash://${deriveCollectionControlHash({
    artifact_family: "CONFLICT_IDENTITY",
    payload: {
      conflict_detection_policy_ref: normalizeCollectionString(
        "conflict_identity.conflict_detection_policy_ref",
        input.conflict_detection_policy_ref,
      ),
      conflict_type: normalizeCollectionString(
        "conflict_identity.conflict_type",
        input.conflict_type,
      ),
      contradiction_class: normalizeCollectionString(
        "conflict_identity.contradiction_class",
        input.contradiction_class,
      ),
      decisive_target_refs: normalizeCollectionStringSet(
        "conflict_identity.decisive_target_refs",
        input.decisive_target_refs,
      ),
      involved_fact_refs: normalizeCollectionStringSet(
        "conflict_identity.involved_fact_refs",
        input.involved_fact_refs,
        { minItems: 2 },
      ),
      manifest_id: normalizeCollectionString("conflict_identity.manifest_id", input.manifest_id),
      reason_codes: normalizeCollectionStringSet(
        "conflict_identity.reason_codes",
        input.reason_codes,
        { minItems: 1 },
      ),
    },
  })}`;
}

export function conflictIdFromIdentity(conflictIdentityHash: string) {
  return `conflict.${deriveCollectionControlHash({
    artifact_family: "CONFLICT_ID",
    payload: normalizeCollectionString(
      "conflict_identity.conflict_identity_hash",
      conflictIdentityHash,
    ),
  })}`;
}

export function deriveConflictSetItemIdentityHash(conflictIds: readonly string[]) {
  return `conflict-set-item-identity-hash://${deriveCollectionControlHash({
    artifact_family: "CONFLICT_SET_ITEM_IDENTITY",
    payload: normalizeCollectionStringSet("conflict_set.item_conflict_ids", conflictIds),
  })}`;
}

export function deriveUnresolvedConflictHash(input: {
  blocking_conflict_ids: readonly string[];
  dominant_blocking_class: string | null;
  open_conflict_ids: readonly string[];
  resolution_frontier: string;
}) {
  return `unresolved-conflict-hash://${deriveCollectionControlHash({
    artifact_family: "CONFLICT_SET_UNRESOLVED_FRONTIER",
    payload: {
      blocking_conflict_ids: normalizeCollectionStringSet(
        "conflict_set.blocking_conflict_ids",
        input.blocking_conflict_ids,
      ),
      dominant_blocking_class: input.dominant_blocking_class,
      open_conflict_ids: normalizeCollectionStringSet(
        "conflict_set.open_conflict_ids",
        input.open_conflict_ids,
      ),
      resolution_frontier: normalizeCollectionString(
        "conflict_set.resolution_frontier",
        input.resolution_frontier,
      ),
    },
  })}`;
}

export function deriveConflictSetId(input: {
  conflict_detection_policy_ref: string;
  item_identity_hash: string;
  manifest_id: string;
  normalization_context_ref: string;
  unresolved_conflict_hash: string;
}) {
  return `conflict-set.${deriveCollectionControlHash({
    artifact_family: "CONFLICT_SET_ID",
    payload: {
      conflict_detection_policy_ref: normalizeCollectionString(
        "conflict_set.conflict_detection_policy_ref",
        input.conflict_detection_policy_ref,
      ),
      item_identity_hash: normalizeCollectionString(
        "conflict_set.item_identity_hash",
        input.item_identity_hash,
      ),
      manifest_id: normalizeCollectionString("conflict_set.manifest_id", input.manifest_id),
      normalization_context_ref: normalizeCollectionString(
        "conflict_set.normalization_context_ref",
        input.normalization_context_ref,
      ),
      unresolved_conflict_hash: normalizeCollectionString(
        "conflict_set.unresolved_conflict_hash",
        input.unresolved_conflict_hash,
      ),
    },
  })}`;
}
