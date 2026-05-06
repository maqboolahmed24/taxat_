import {
  candidateFactRef,
  normalizeCandidateFactRecord,
  type CandidateFactRecord,
} from "../models/candidate_fact.ts";
import {
  buildConflictRecord,
  type ConflictBlockingClass,
  type ConflictContradictionClass,
  type ConflictRecordDraft,
  type ConflictRecordRecord,
  type ConflictSeverity,
  type ConflictType,
} from "../models/conflict_record.ts";
import { normalizeCollectionString, normalizeCollectionStringSet } from "../models/collection_control_common.ts";
import type { SourceStrengthTier } from "../models/source_record.ts";

export type CandidateConflictSemanticProjection = {
  amount_value?: string;
  authority_position_ref?: string;
  candidate_fact_id?: string;
  candidate_fact_ref?: string;
  category_ref?: string;
  cross_partition_group_ref?: string;
  date_value?: string;
  expected_period_ref?: string;
  logical_subject_ref?: string;
  missing_required_field_codes?: readonly string[];
  period_ref?: string;
  source_precedence_issue_ref?: string;
};

export type DetectConflictsErrorCode = "CONFLICT_DETECTION_MANIFEST_MISMATCH";

export class DetectConflictsError extends Error {
  readonly code: DetectConflictsErrorCode;

  constructor(code: DetectConflictsErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "DetectConflictsError";
    this.code = code;
  }
}

const DEFAULT_POLICY_REF = "conflict-policy://collection/default-v1";
const DEFAULT_LOW_CONFIDENCE_THRESHOLD = 0.75;

const SOURCE_STRENGTH_RANK: Record<SourceStrengthTier, number> = {
  TIER_1_AUTHORITY_FINAL: 1,
  TIER_2_AUTHORITY_REFERENCE: 2,
  TIER_3_STRUCTURED_EXTERNAL: 3,
  TIER_4_STRUCTURED_INTERNAL: 4,
  TIER_5_DOCUMENT_SUPPORT: 5,
  TIER_6_DECLARED_ONLY: 6,
  TIER_7_INFERRED: 7,
  TIER_8_GOVERNANCE_ONLY: 8,
};

const SEVERITY_RANK: Record<ConflictSeverity, number> = {
  INFO: 1,
  NOTICE: 2,
  WARNING: 3,
  ERROR: 4,
  CRITICAL: 5,
};

const BLOCKING_RANK: Record<ConflictBlockingClass, number> = {
  NON_BLOCKING: 0,
  BLOCKS_REVIEW_PROGRESS: 1,
  BLOCKS_AUTOMATION: 2,
  BLOCKS_AMENDMENT: 3,
  BLOCKS_ERASURE: 4,
  BLOCKS_AUTHORITY_CALL: 5,
  BLOCKS_FILING: 6,
  BLOCKS_RUN: 7,
};

const CONTRADICTION_RANK: Record<ConflictContradictionClass, number> = {
  NONE: 0,
  SOFT_CONTRADICTION: 1,
  DECISIVE_CONTRADICTION: 2,
  AUTHORITY_DIVERGENCE: 3,
};

type ConflictDraftAccumulator = ConflictRecordDraft & {
  conflict_detection_policy_ref: string;
};

function candidateRef(record: CandidateFactRecord) {
  return candidateFactRef(record);
}

function firstSupportRef(candidate: CandidateFactRecord) {
  return candidate.supporting_evidence_refs[0] ?? candidate.source_record_refs[0]!;
}

function semanticKeyFor(candidate: CandidateFactRecord) {
  return candidateRef(candidate);
}

function semanticMap(projections: readonly CandidateConflictSemanticProjection[] | undefined) {
  const map = new Map<string, CandidateConflictSemanticProjection>();
  for (const projection of projections ?? []) {
    if (projection.candidate_fact_ref !== undefined) {
      map.set(projection.candidate_fact_ref, projection);
    }
    if (projection.candidate_fact_id !== undefined) {
      map.set(`candidate-fact://${projection.candidate_fact_id}`, projection);
    }
  }
  return map;
}

function pushGroup<T>(groups: Map<string, T[]>, key: string, value: T) {
  const current = groups.get(key) ?? [];
  current.push(value);
  groups.set(key, current);
}

function strongestCandidateRefs(candidates: readonly CandidateFactRecord[]) {
  const strongestRank = Math.min(
    ...candidates.map((candidate) => SOURCE_STRENGTH_RANK[candidate.source_strength_tier]),
  );
  return normalizeCollectionStringSet(
    "conflict_record.decisive_target_refs",
    candidates
      .filter((candidate) => SOURCE_STRENGTH_RANK[candidate.source_strength_tier] === strongestRank)
      .map((candidate) => candidateRef(candidate)),
    { minItems: 1 },
  );
}

function strongerSeverity(left: ConflictSeverity, right: ConflictSeverity): ConflictSeverity {
  return SEVERITY_RANK[right] > SEVERITY_RANK[left] ? right : left;
}

function strongerBlocking(
  left: ConflictBlockingClass,
  right: ConflictBlockingClass,
): ConflictBlockingClass {
  return BLOCKING_RANK[right] > BLOCKING_RANK[left] ? right : left;
}

function strongerContradiction(
  left: ConflictContradictionClass,
  right: ConflictContradictionClass,
): ConflictContradictionClass {
  return CONTRADICTION_RANK[right] > CONTRADICTION_RANK[left] ? right : left;
}

function addConflict(
  conflicts: Map<string, ConflictDraftAccumulator>,
  input: {
    authority_position_refs?: readonly string[];
    blocking_class: ConflictBlockingClass;
    conflict_detection_policy_ref: string;
    conflict_type: ConflictType;
    contradiction_class: ConflictContradictionClass;
    decisive_target_refs?: readonly string[];
    evidence_refs?: readonly string[];
    involved_fact_refs: readonly string[];
    manifest_id: string;
    reason_codes: readonly string[];
    resolution_state?: "OPEN" | "MONITORING";
    severity: ConflictSeverity;
  },
) {
  const involvedFactRefs = normalizeCollectionStringSet(
    "conflict_record.involved_fact_refs",
    input.involved_fact_refs,
    { minItems: 2 },
  );
  const key = `${input.conflict_type}::${involvedFactRefs.join("::")}`;
  const existing = conflicts.get(key);
  if (existing) {
    existing.authority_position_refs = normalizeCollectionStringSet(
      "conflict_record.authority_position_refs",
      [...existing.authority_position_refs, ...(input.authority_position_refs ?? [])],
    );
    existing.blocking_class = strongerBlocking(existing.blocking_class, input.blocking_class);
    existing.contradiction_class = strongerContradiction(
      existing.contradiction_class,
      input.contradiction_class,
    );
    existing.decisive_target_refs = normalizeCollectionStringSet(
      "conflict_record.decisive_target_refs",
      [...existing.decisive_target_refs, ...(input.decisive_target_refs ?? [])],
    );
    existing.evidence_refs = normalizeCollectionStringSet(
      "conflict_record.evidence_refs",
      [...existing.evidence_refs, ...(input.evidence_refs ?? [])],
    );
    existing.reason_codes = normalizeCollectionStringSet(
      "conflict_record.reason_codes",
      [...existing.reason_codes, ...input.reason_codes],
      { minItems: 1 },
    );
    existing.severity = strongerSeverity(existing.severity, input.severity);
    return;
  }
  conflicts.set(key, {
    artifact_type: "ConflictRecord",
    authority_position_refs: normalizeCollectionStringSet(
      "conflict_record.authority_position_refs",
      input.authority_position_refs ?? [],
    ),
    blocking_class: input.blocking_class,
    conflict_detection_policy_ref: input.conflict_detection_policy_ref,
    conflict_type: input.conflict_type,
    contradiction_class: input.contradiction_class,
    decisive_target_refs: normalizeCollectionStringSet(
      "conflict_record.decisive_target_refs",
      input.decisive_target_refs ?? [],
    ),
    evidence_refs: normalizeCollectionStringSet(
      "conflict_record.evidence_refs",
      input.evidence_refs ?? [],
    ),
    involved_fact_refs: involvedFactRefs,
    manifest_id: input.manifest_id,
    reason_codes: normalizeCollectionStringSet(
      "conflict_record.reason_codes",
      input.reason_codes,
      { minItems: 1 },
    ),
    resolution_state: input.resolution_state ?? "OPEN",
    severity: input.severity,
    supersedes_conflict_id: null,
  });
}

function addDistinctValueConflict(
  conflicts: Map<string, ConflictDraftAccumulator>,
  input: {
    candidates: readonly CandidateFactRecord[];
    conflict_detection_policy_ref: string;
    conflict_type: ConflictType;
    decisive_target_refs: readonly string[];
    manifest_id: string;
    reason_code: string;
    values: readonly string[];
  },
) {
  if (new Set(input.values).size <= 1) {
    return;
  }
  addConflict(conflicts, {
    blocking_class:
      input.conflict_type === "AMOUNT_MISMATCH"
        ? "BLOCKS_FILING"
        : input.conflict_type === "DATE_CONFLICT"
          ? "BLOCKS_AUTOMATION"
          : "BLOCKS_REVIEW_PROGRESS",
    conflict_detection_policy_ref: input.conflict_detection_policy_ref,
    conflict_type: input.conflict_type,
    contradiction_class: "DECISIVE_CONTRADICTION",
    decisive_target_refs: input.decisive_target_refs,
    evidence_refs: input.candidates.flatMap((candidate) => candidate.supporting_evidence_refs),
    involved_fact_refs: input.candidates.map((candidate) => candidateRef(candidate)),
    manifest_id: input.manifest_id,
    reason_codes: [input.reason_code],
    severity: input.conflict_type === "AMOUNT_MISMATCH" ? "CRITICAL" : "ERROR",
  });
}

export function detectConflicts(input: {
  candidate_facts: readonly CandidateFactRecord[];
  conflict_detection_policy_ref?: string;
  expected_period_ref?: string;
  low_confidence_threshold?: number;
  schema_bundle_hash?: string;
  semantic_projections?: readonly CandidateConflictSemanticProjection[];
  writer_build_id?: string;
}): ConflictRecordRecord[] {
  const candidates = input.candidate_facts
    .map((candidate) => normalizeCandidateFactRecord(candidate))
    .sort((left, right) => candidateRef(left).localeCompare(candidateRef(right)));
  if (candidates.length === 0) {
    return [];
  }
  const manifestId = candidates[0]!.manifest_id;
  for (const candidate of candidates) {
    if (candidate.manifest_id !== manifestId) {
      throw new DetectConflictsError(
        "CONFLICT_DETECTION_MANIFEST_MISMATCH",
        "conflict detection is manifest-scoped",
      );
    }
  }
  const policyRef = normalizeCollectionString(
    "conflict_detection.policy_ref",
    input.conflict_detection_policy_ref ?? DEFAULT_POLICY_REF,
  );
  const lowConfidenceThreshold =
    input.low_confidence_threshold ?? DEFAULT_LOW_CONFIDENCE_THRESHOLD;
  const projections = semanticMap(input.semantic_projections);
  const conflicts = new Map<string, ConflictDraftAccumulator>();

  const duplicateGroups = new Map<string, CandidateFactRecord[]>();
  for (const candidate of candidates) {
    pushGroup(duplicateGroups, candidate.dedupe_key, candidate);
    if (candidate.confidence < lowConfidenceThreshold) {
      addConflict(conflicts, {
        blocking_class: "NON_BLOCKING",
        conflict_detection_policy_ref: policyRef,
        conflict_type: "LOW_CONFIDENCE_EXTRACTION",
        contradiction_class: "SOFT_CONTRADICTION",
        evidence_refs: candidate.supporting_evidence_refs,
        involved_fact_refs: [candidateRef(candidate), firstSupportRef(candidate)],
        manifest_id: manifestId,
        reason_codes: ["EXTRACTION_CONFIDENCE_BELOW_POLICY"],
        resolution_state: "MONITORING",
        severity: "WARNING",
      });
    }

    const projection = projections.get(semanticKeyFor(candidate));
    const missingFieldCodes = normalizeCollectionStringSet(
      "conflict_detection.missing_required_field_codes",
      projection?.missing_required_field_codes ?? [],
    );
    if (missingFieldCodes.length > 0) {
      addConflict(conflicts, {
        blocking_class: "BLOCKS_AUTOMATION",
        conflict_detection_policy_ref: policyRef,
        conflict_type: "MISSING_REQUIRED_FIELD",
        contradiction_class: "SOFT_CONTRADICTION",
        evidence_refs: candidate.supporting_evidence_refs,
        involved_fact_refs: [candidateRef(candidate), firstSupportRef(candidate)],
        manifest_id: manifestId,
        reason_codes: missingFieldCodes.map((code) => `REQUIRED_FIELD_MISSING:${code}`),
        severity: "ERROR",
      });
    }
    const expectedPeriodRef =
      projection?.expected_period_ref ?? input.expected_period_ref ?? undefined;
    if (
      projection?.period_ref !== undefined &&
      expectedPeriodRef !== undefined &&
      projection.period_ref !== expectedPeriodRef
    ) {
      addConflict(conflicts, {
        blocking_class: "BLOCKS_AUTOMATION",
        conflict_detection_policy_ref: policyRef,
        conflict_type: "OUT_OF_PERIOD_RECORD",
        contradiction_class: "SOFT_CONTRADICTION",
        evidence_refs: candidate.supporting_evidence_refs,
        involved_fact_refs: [candidateRef(candidate), firstSupportRef(candidate)],
        manifest_id: manifestId,
        reason_codes: ["CANDIDATE_PERIOD_OUTSIDE_EXPECTED_SCOPE"],
        severity: "ERROR",
      });
    }
  }

  for (const group of duplicateGroups.values()) {
    if (group.length < 2) {
      continue;
    }
    addConflict(conflicts, {
      blocking_class: "NON_BLOCKING",
      conflict_detection_policy_ref: policyRef,
      conflict_type: "DUPLICATE_CANDIDATE",
      contradiction_class: "NONE",
      evidence_refs: group.flatMap((candidate) => candidate.supporting_evidence_refs),
      involved_fact_refs: group.map((candidate) => candidateRef(candidate)),
      manifest_id: manifestId,
      reason_codes: ["DUPLICATE_CANDIDATE_DEDUPE_KEY_REUSED"],
      resolution_state: "MONITORING",
      severity: "NOTICE",
    });
  }

  const subjectGroups = new Map<string, CandidateFactRecord[]>();
  const precedenceGroups = new Map<string, CandidateFactRecord[]>();
  for (const candidate of candidates) {
    const projection = projections.get(semanticKeyFor(candidate));
    if (projection?.logical_subject_ref !== undefined) {
      pushGroup(
        subjectGroups,
        `${candidate.partition_scope}::${projection.logical_subject_ref}`,
        candidate,
      );
    }
    if (projection?.source_precedence_issue_ref !== undefined) {
      pushGroup(
        precedenceGroups,
        `${candidate.partition_scope}::${projection.source_precedence_issue_ref}`,
        candidate,
      );
    }
  }

  for (const group of subjectGroups.values()) {
    if (group.length < 2) {
      continue;
    }
    const decisiveTargetRefs = strongestCandidateRefs(group);
    const groupProjections = group.map((candidate) => projections.get(semanticKeyFor(candidate)));
    addDistinctValueConflict(conflicts, {
      candidates: group,
      conflict_detection_policy_ref: policyRef,
      conflict_type: "AMOUNT_MISMATCH",
      decisive_target_refs: decisiveTargetRefs,
      manifest_id: manifestId,
      reason_code: "AMOUNT_VALUES_CONTRADICT",
      values: groupProjections
        .map((projection) => projection?.amount_value)
        .filter((value): value is string => value !== undefined),
    });
    addDistinctValueConflict(conflicts, {
      candidates: group,
      conflict_detection_policy_ref: policyRef,
      conflict_type: "DATE_CONFLICT",
      decisive_target_refs: decisiveTargetRefs,
      manifest_id: manifestId,
      reason_code: "DATE_VALUES_CONTRADICT",
      values: groupProjections
        .map((projection) => projection?.date_value)
        .filter((value): value is string => value !== undefined),
    });
    addDistinctValueConflict(conflicts, {
      candidates: group,
      conflict_detection_policy_ref: policyRef,
      conflict_type: "CATEGORY_CONFLICT",
      decisive_target_refs: decisiveTargetRefs,
      manifest_id: manifestId,
      reason_code: "CATEGORY_VALUES_CONTRADICT",
      values: groupProjections
        .map((projection) => projection?.category_ref)
        .filter((value): value is string => value !== undefined),
    });
    const authorityPositions = groupProjections
      .map((projection) => projection?.authority_position_ref)
      .filter((value): value is string => value !== undefined);
    if (new Set(authorityPositions).size > 1) {
      addConflict(conflicts, {
        authority_position_refs: authorityPositions,
        blocking_class: "BLOCKS_AUTHORITY_CALL",
        conflict_detection_policy_ref: policyRef,
        conflict_type: "AUTHORITY_DIFFERENCE",
        contradiction_class: "AUTHORITY_DIVERGENCE",
        decisive_target_refs: decisiveTargetRefs,
        evidence_refs: group.flatMap((candidate) => candidate.supporting_evidence_refs),
        involved_fact_refs: group.map((candidate) => candidateRef(candidate)),
        manifest_id: manifestId,
        reason_codes: ["AUTHORITY_POSITION_DIVERGES_FROM_CANDIDATES"],
        severity: "CRITICAL",
      });
    }
  }

  for (const group of precedenceGroups.values()) {
    if (group.length < 2) {
      continue;
    }
    addConflict(conflicts, {
      blocking_class: "BLOCKS_REVIEW_PROGRESS",
      conflict_detection_policy_ref: policyRef,
      conflict_type: "SOURCE_PRECEDENCE_CONFLICT",
      contradiction_class: "SOFT_CONTRADICTION",
      evidence_refs: group.flatMap((candidate) => candidate.supporting_evidence_refs),
      involved_fact_refs: group.map((candidate) => candidateRef(candidate)),
      manifest_id: manifestId,
      reason_codes: ["SOURCE_PRECEDENCE_REQUIRES_DECISION"],
      severity: "ERROR",
    });
  }

  return [...conflicts.values()]
    .map((draftWithPolicy) => {
      const { conflict_detection_policy_ref, ...draft } = draftWithPolicy;
      return buildConflictRecord({
        conflict_detection_policy_ref,
        draft,
        ...(input.schema_bundle_hash === undefined
          ? {}
          : { schema_bundle_hash: input.schema_bundle_hash }),
        ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
      });
    })
    .sort((left, right) => left.conflict_id.localeCompare(right.conflict_id));
}
