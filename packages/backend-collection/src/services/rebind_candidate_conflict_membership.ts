import {
  buildCandidateFactContract,
  candidateFactRef,
  deriveCandidateFactContentHash,
  normalizeCandidateFactRecord,
  type CandidateFactRecord,
} from "../models/candidate_fact.ts";
import {
  conflictRecordRef,
  isBlockingConflict,
  isUnresolvedConflictState,
  type ConflictRecordRecord,
} from "../models/conflict_record.ts";
import {
  conflictSetRef,
  normalizeConflictSetRecord,
  type ConflictSetRecord,
} from "../models/conflict_set.ts";
import { normalizeCollectionStringSet } from "../models/collection_control_common.ts";
import type { CandidateFactPromotionReadinessRecord } from "../types/candidate_fact_draft.ts";

function conflictsForCandidate(input: {
  candidate: CandidateFactRecord;
  conflicts: readonly ConflictRecordRecord[];
}) {
  const ref = candidateFactRef(input.candidate);
  return input.conflicts.filter((conflict) => conflict.involved_fact_refs.includes(ref));
}

function buildReadiness(input: {
  candidate: CandidateFactRecord;
  candidate_conflicts: readonly ConflictRecordRecord[];
  conflict_set: ConflictSetRecord;
  promotion_rule_ref?: string;
}): CandidateFactPromotionReadinessRecord {
  const unresolved = input.candidate_conflicts.filter((conflict) =>
    isUnresolvedConflictState(conflict.resolution_state),
  );
  const blockingConflictIds = normalizeCollectionStringSet(
    "candidate_fact.promotion_readiness.blocking_conflict_ids",
    unresolved.filter((conflict) => isBlockingConflict(conflict)).map((conflict) => conflict.conflict_id),
  );
  const hasMonitoringConflict = unresolved.length > 0 && blockingConflictIds.length === 0;
  return {
    approved_override_ref_or_null:
      input.candidate.promotion_readiness.approved_override_ref_or_null,
    blocking_conflict_count: blockingConflictIds.length,
    blocking_conflict_ids: blockingConflictIds,
    conflict_set_ref: conflictSetRef(input.conflict_set),
    evidence_lineage_complete: true,
    frozen_collection_boundary_required: true,
    promotion_rule_ref:
      input.promotion_rule_ref ?? input.candidate.promotion_readiness.promotion_rule_ref,
    readiness_state:
      blockingConflictIds.length > 0
        ? "CONFLICT_BLOCKED"
        : hasMonitoringConflict
          ? "PROVISIONAL_ALLOWED"
          : "READY_FOR_CANONICAL",
    resolution_frontier:
      blockingConflictIds.length > 0
        ? "BLOCKING_PRESENT"
        : hasMonitoringConflict
          ? "MONITORING_ONLY"
          : "CLEAR",
    visibility_safe_for_authority: true,
  };
}

function nextPromotionState(input: {
  candidate: CandidateFactRecord;
  conflict_membership_refs: readonly string[];
  readiness: CandidateFactPromotionReadinessRecord;
}) {
  if (input.candidate.promotion_state === "SUPERSEDED" || input.candidate.promotion_state === "RETIRED") {
    return input.candidate.promotion_state;
  }
  if (input.readiness.blocking_conflict_count > 0) {
    return "CONTESTED" as const;
  }
  if (input.conflict_membership_refs.length > 0) {
    return "PROVISIONAL" as const;
  }
  return "CANDIDATE" as const;
}

export function rebindCandidateConflictMembership(input: {
  candidate_facts: readonly CandidateFactRecord[];
  conflict_set: ConflictSetRecord;
  promotion_rule_ref?: string;
  schema_bundle_hash?: string;
  writer_build_id?: string;
}): CandidateFactRecord[] {
  const conflictSet = normalizeConflictSetRecord(input.conflict_set);
  return input.candidate_facts
    .map((candidateInput) => {
      const candidate = normalizeCandidateFactRecord(candidateInput);
      const candidateConflicts = conflictsForCandidate({
        candidate,
        conflicts: conflictSet.items,
      });
      const unresolved = candidateConflicts.filter((conflict) =>
        isUnresolvedConflictState(conflict.resolution_state),
      );
      const conflictMembershipRefs = normalizeCollectionStringSet(
        "candidate_fact.conflict_membership_refs",
        unresolved.map((conflict) => conflictRecordRef(conflict)),
      );
      const promotionReadiness = buildReadiness({
        candidate,
        candidate_conflicts: candidateConflicts,
        conflict_set: conflictSet,
        ...(input.promotion_rule_ref === undefined
          ? {}
          : { promotion_rule_ref: input.promotion_rule_ref }),
      });
      const draft = {
        ...candidate,
        conflict_membership_refs: conflictMembershipRefs,
        promotion_readiness: promotionReadiness,
        promotion_state: nextPromotionState({
          candidate,
          conflict_membership_refs: conflictMembershipRefs,
          readiness: promotionReadiness,
        }),
      };
      const { contract: _contract, ...candidateContent } = draft;
      void _contract;
      const candidateFactContentHash = deriveCandidateFactContentHash(candidateContent);
      return normalizeCandidateFactRecord({
        ...draft,
        contract: buildCandidateFactContract({
          candidate_fact_content_hash: candidateFactContentHash,
          candidate_fact_id: candidate.candidate_fact_id,
          ...(input.schema_bundle_hash === undefined
            ? {}
            : { schema_bundle_hash: input.schema_bundle_hash }),
          ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
        }),
      });
    })
    .sort((left, right) => left.dedupe_key.localeCompare(right.dedupe_key));
}
