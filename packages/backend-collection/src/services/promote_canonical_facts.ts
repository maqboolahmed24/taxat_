import { normalizeCandidateFactRecord, type CandidateFactRecord } from "../models/candidate_fact.ts";
import type { CanonicalFactRecord } from "../models/canonical_fact.ts";
import { normalizeConflictSetRecord, type ConflictSetRecord } from "../models/conflict_set.ts";
import type { EvidenceItemRecord } from "../models/evidence_item.ts";
import type { SourceRecordRecord } from "../models/source_record.ts";
import { mapCandidateGroupToCanonicalFact } from "./candidate_to_canonical_mapper.ts";
import type { PromotionStatePolicy } from "./select_promotion_state.ts";

export type PromoteCanonicalFactsErrorCode =
  | "CANONICAL_PROMOTION_CONFLICT_SET_MANIFEST_MISMATCH"
  | "CANONICAL_PROMOTION_INPUT_EMPTY";

export class PromoteCanonicalFactsError extends Error {
  readonly code: PromoteCanonicalFactsErrorCode;

  constructor(code: PromoteCanonicalFactsErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "PromoteCanonicalFactsError";
    this.code = code;
  }
}

function pushGroup(
  groups: Map<string, CandidateFactRecord[]>,
  key: string,
  candidate: CandidateFactRecord,
) {
  const current = groups.get(key) ?? [];
  current.push(candidate);
  groups.set(key, current);
}

export function promoteCanonicalFacts(input: {
  candidate_facts: readonly CandidateFactRecord[];
  conflict_set: ConflictSetRecord;
  evidence_items?: readonly EvidenceItemRecord[];
  promoted_at: string;
  promotion_policy?: PromotionStatePolicy;
  retention_basis_ref?: string;
  schema_bundle_hash?: string;
  source_records?: readonly SourceRecordRecord[];
  writer_build_id?: string;
}): CanonicalFactRecord[] {
  const candidates = input.candidate_facts
    .map((candidate) => normalizeCandidateFactRecord(candidate))
    .sort((left, right) => left.dedupe_key.localeCompare(right.dedupe_key));
  if (candidates.length === 0) {
    throw new PromoteCanonicalFactsError(
      "CANONICAL_PROMOTION_INPUT_EMPTY",
      "canonical promotion requires at least one candidate fact",
    );
  }
  const conflictSet = normalizeConflictSetRecord(input.conflict_set);
  if (candidates.some((candidate) => candidate.manifest_id !== conflictSet.manifest_id)) {
    throw new PromoteCanonicalFactsError(
      "CANONICAL_PROMOTION_CONFLICT_SET_MANIFEST_MISMATCH",
      "candidate facts and conflict set must belong to the same manifest",
    );
  }

  const groups = new Map<string, CandidateFactRecord[]>();
  for (const candidate of candidates) {
    pushGroup(groups, candidate.dedupe_key, candidate);
  }

  return [...groups.values()]
    .map((group) =>
      mapCandidateGroupToCanonicalFact({
        candidate_facts: group,
        conflict_set: conflictSet,
        ...(input.evidence_items === undefined ? {} : { evidence_items: input.evidence_items }),
        promoted_at: input.promoted_at,
        ...(input.promotion_policy === undefined
          ? {}
          : { promotion_policy: input.promotion_policy }),
        ...(input.retention_basis_ref === undefined
          ? {}
          : { retention_basis_ref: input.retention_basis_ref }),
        ...(input.schema_bundle_hash === undefined
          ? {}
          : { schema_bundle_hash: input.schema_bundle_hash }),
        ...(input.source_records === undefined ? {} : { source_records: input.source_records }),
        ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
      }),
    )
    .sort((left, right) => left.dedupe_key.localeCompare(right.dedupe_key));
}
