import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  deriveCollectionControlHash,
  normalizeCollectionString,
  normalizeCollectionStringSet,
} from "../models/collection_control_common.ts";
import type { ConflictResolutionFrontier } from "../models/conflict_set.ts";

export type CanonicalPromotionRecord = {
  approved_override_ref_or_null: string | null;
  blocking_conflict_count_at_promotion: number;
  blocking_conflict_ids_at_promotion: string[];
  conflict_set_ref: string;
  evidence_lineage_complete: true;
  frozen_collection_boundary_required: true;
  promoted_at: string;
  promotion_activity_ref: string;
  promotion_rule_ref: string;
  resolution_frontier_at_promotion: ConflictResolutionFrontier;
  visibility_safe_for_authority: true;
};

export type BuildPromotionRecordErrorCode = "PROMOTION_RECORD_BLOCKING_MISMATCH";

export class BuildPromotionRecordError extends Error {
  readonly code: BuildPromotionRecordErrorCode;

  constructor(code: BuildPromotionRecordErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "BuildPromotionRecordError";
    this.code = code;
  }
}

export function buildPromotionActivityRef(input: {
  conflict_set_ref: string;
  promoted_at: string;
  promoted_from_candidate_fact_refs: readonly string[];
  promotion_rule_ref: string;
}) {
  return `promotion-activity://${deriveCollectionControlHash({
    artifact_family: "CANONICAL_PROMOTION_ACTIVITY",
    payload: {
      conflict_set_ref: normalizeCollectionString(
        "promotion_record.conflict_set_ref",
        input.conflict_set_ref,
      ),
      promoted_at: normalizeUtcInstantString(input.promoted_at),
      promoted_from_candidate_fact_refs: normalizeCollectionStringSet(
        "promotion_record.promoted_from_candidate_fact_refs",
        input.promoted_from_candidate_fact_refs,
        { minItems: 1 },
      ),
      promotion_rule_ref: normalizeCollectionString(
        "promotion_record.promotion_rule_ref",
        input.promotion_rule_ref,
      ),
    },
  })}`;
}

export function buildPromotionRecord(input: {
  approved_override_ref_or_null?: string | null;
  blocking_conflict_ids_at_promotion: readonly string[];
  conflict_set_ref: string;
  promoted_at: string;
  promoted_from_candidate_fact_refs: readonly string[];
  promotion_activity_ref?: string;
  promotion_rule_ref: string;
  resolution_frontier_at_promotion: ConflictResolutionFrontier;
}): CanonicalPromotionRecord {
  const blockingConflictIds = normalizeCollectionStringSet(
    "promotion_record.blocking_conflict_ids_at_promotion",
    input.blocking_conflict_ids_at_promotion,
  );
  if (
    blockingConflictIds.length === 0 &&
    input.resolution_frontier_at_promotion === "BLOCKING_PRESENT"
  ) {
    throw new BuildPromotionRecordError(
      "PROMOTION_RECORD_BLOCKING_MISMATCH",
      "blocking frontier requires blocking conflict ids",
    );
  }
  if (
    blockingConflictIds.length > 0 &&
    input.resolution_frontier_at_promotion !== "BLOCKING_PRESENT"
  ) {
    throw new BuildPromotionRecordError(
      "PROMOTION_RECORD_BLOCKING_MISMATCH",
      "blocking conflict ids require BLOCKING_PRESENT frontier",
    );
  }

  const promotedAt = normalizeUtcInstantString(input.promoted_at);
  const promotionRuleRef = normalizeCollectionString(
    "promotion_record.promotion_rule_ref",
    input.promotion_rule_ref,
  );
  const conflictSetRef = normalizeCollectionString(
    "promotion_record.conflict_set_ref",
    input.conflict_set_ref,
  );
  const promotedFromCandidateFactRefs = normalizeCollectionStringSet(
    "promotion_record.promoted_from_candidate_fact_refs",
    input.promoted_from_candidate_fact_refs,
    { minItems: 1 },
  );

  return {
    approved_override_ref_or_null:
      input.approved_override_ref_or_null === undefined ||
      input.approved_override_ref_or_null === null
        ? null
        : normalizeCollectionString(
            "promotion_record.approved_override_ref_or_null",
            input.approved_override_ref_or_null,
          ),
    blocking_conflict_count_at_promotion: blockingConflictIds.length,
    blocking_conflict_ids_at_promotion: blockingConflictIds,
    conflict_set_ref: conflictSetRef,
    evidence_lineage_complete: true,
    frozen_collection_boundary_required: true,
    promoted_at: promotedAt,
    promotion_activity_ref:
      input.promotion_activity_ref ??
      buildPromotionActivityRef({
        conflict_set_ref: conflictSetRef,
        promoted_at: promotedAt,
        promoted_from_candidate_fact_refs: promotedFromCandidateFactRefs,
        promotion_rule_ref: promotionRuleRef,
      }),
    promotion_rule_ref: promotionRuleRef,
    resolution_frontier_at_promotion: input.resolution_frontier_at_promotion,
    visibility_safe_for_authority: true,
  };
}
