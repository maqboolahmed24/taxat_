import { ConflictRecordSchemaLineage } from "../../../generated-models/src/generated/typescript/provenance-and-evidence.ts";
import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import {
  buildCollectionArtifactContract,
  deriveCollectionControlHash,
  normalizeCollectionString,
  normalizeCollectionStringSet,
} from "./collection_control_common.ts";
import {
  conflictIdFromIdentity,
  deriveConflictIdentityHash,
  type ConflictIdentityHashInput,
} from "../services/conflict_identity_hash.ts";

export const CONFLICT_TYPES = [
  "DUPLICATE_CANDIDATE",
  "AMOUNT_MISMATCH",
  "DATE_CONFLICT",
  "CATEGORY_CONFLICT",
  "BUSINESS_PARTITION_CONFLICT",
  "SOURCE_PRECEDENCE_CONFLICT",
  "AUTHORITY_DIFFERENCE",
  "MISSING_REQUIRED_FIELD",
  "LOW_CONFIDENCE_EXTRACTION",
  "OUT_OF_PERIOD_RECORD",
] as const;

export const CONFLICT_SEVERITIES = ["INFO", "NOTICE", "WARNING", "ERROR", "CRITICAL"] as const;

export const CONFLICT_BLOCKING_CLASSES = [
  "NON_BLOCKING",
  "BLOCKS_AUTOMATION",
  "BLOCKS_REVIEW_PROGRESS",
  "BLOCKS_FILING",
  "BLOCKS_AMENDMENT",
  "BLOCKS_ERASURE",
  "BLOCKS_RUN",
  "BLOCKS_AUTHORITY_CALL",
] as const;

export const CONFLICT_RESOLUTION_STATES = [
  "OPEN",
  "IN_PROGRESS",
  "MONITORING",
  "RESOLVED",
  "ACCEPTED_RISK",
  "SUPERSEDED",
  "CANCELLED",
] as const;

export const CONFLICT_CONTRADICTION_CLASSES = [
  "NONE",
  "SOFT_CONTRADICTION",
  "DECISIVE_CONTRADICTION",
  "AUTHORITY_DIVERGENCE",
] as const;

export type ConflictType = (typeof CONFLICT_TYPES)[number];
export type ConflictSeverity = (typeof CONFLICT_SEVERITIES)[number];
export type ConflictBlockingClass = (typeof CONFLICT_BLOCKING_CLASSES)[number];
export type ConflictResolutionState = (typeof CONFLICT_RESOLUTION_STATES)[number];
export type ConflictContradictionClass = (typeof CONFLICT_CONTRADICTION_CLASSES)[number];
export type DominantConflictBlockingClass = Exclude<ConflictBlockingClass, "NON_BLOCKING">;

export type ConflictRecordRecord = {
  artifact_type: "ConflictRecord";
  authority_position_refs: string[];
  blocking_class: ConflictBlockingClass;
  conflict_id: string;
  conflict_type: ConflictType;
  contract: SchemaBundleArtifactContract;
  contradiction_class: ConflictContradictionClass;
  decisive_target_refs: string[];
  evidence_refs: string[];
  involved_fact_refs: string[];
  manifest_id: string;
  reason_codes: string[];
  resolution_state: ConflictResolutionState;
  severity: ConflictSeverity;
  supersedes_conflict_id: string | null;
};

export type ConflictRecordDraft = Omit<ConflictRecordRecord, "conflict_id" | "contract">;

export type ConflictRecordModelErrorCode =
  | "CONFLICT_RECORD_ARTIFACT_TYPE_INVALID"
  | "CONFLICT_RECORD_CONSTANT_INVALID"
  | "CONFLICT_RECORD_DECISIVE_TARGET_REQUIRED"
  | "CONFLICT_RECORD_INVOLVED_REFS_REQUIRED"
  | "CONFLICT_RECORD_REASON_REQUIRED";

export class ConflictRecordModelError extends Error {
  readonly code: ConflictRecordModelErrorCode;

  constructor(code: ConflictRecordModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ConflictRecordModelError";
    this.code = code;
  }
}

const CONFLICT_TYPE_SET = new Set<ConflictType>(CONFLICT_TYPES);
const SEVERITY_SET = new Set<ConflictSeverity>(CONFLICT_SEVERITIES);
const BLOCKING_CLASS_SET = new Set<ConflictBlockingClass>(CONFLICT_BLOCKING_CLASSES);
const RESOLUTION_STATE_SET = new Set<ConflictResolutionState>(CONFLICT_RESOLUTION_STATES);
const CONTRADICTION_CLASS_SET = new Set<ConflictContradictionClass>(
  CONFLICT_CONTRADICTION_CLASSES,
);

export function conflictRecordRef(record: Pick<ConflictRecordRecord, "conflict_id">) {
  return `conflict://${record.conflict_id}`;
}

export function isUnresolvedConflictState(state: ConflictResolutionState) {
  return state === "OPEN" || state === "IN_PROGRESS" || state === "MONITORING";
}

export function isBlockingConflict(record: Pick<ConflictRecordRecord, "blocking_class" | "resolution_state">) {
  return isUnresolvedConflictState(record.resolution_state) && record.blocking_class !== "NON_BLOCKING";
}

function normalizeConflictType(value: unknown): ConflictType {
  const normalized = normalizeCollectionString("conflict_record.conflict_type", value);
  if (!CONFLICT_TYPE_SET.has(normalized as ConflictType)) {
    throw new ConflictRecordModelError(
      "CONFLICT_RECORD_CONSTANT_INVALID",
      "conflict_type must be canonical",
    );
  }
  return normalized as ConflictType;
}

function normalizeSeverity(value: unknown): ConflictSeverity {
  const normalized = normalizeCollectionString("conflict_record.severity", value);
  if (!SEVERITY_SET.has(normalized as ConflictSeverity)) {
    throw new ConflictRecordModelError(
      "CONFLICT_RECORD_CONSTANT_INVALID",
      "severity must be canonical",
    );
  }
  return normalized as ConflictSeverity;
}

function normalizeBlockingClass(value: unknown): ConflictBlockingClass {
  const normalized = normalizeCollectionString("conflict_record.blocking_class", value);
  if (!BLOCKING_CLASS_SET.has(normalized as ConflictBlockingClass)) {
    throw new ConflictRecordModelError(
      "CONFLICT_RECORD_CONSTANT_INVALID",
      "blocking_class must be canonical",
    );
  }
  return normalized as ConflictBlockingClass;
}

function normalizeResolutionState(value: unknown): ConflictResolutionState {
  const normalized = normalizeCollectionString("conflict_record.resolution_state", value);
  if (!RESOLUTION_STATE_SET.has(normalized as ConflictResolutionState)) {
    throw new ConflictRecordModelError(
      "CONFLICT_RECORD_CONSTANT_INVALID",
      "resolution_state must be canonical",
    );
  }
  return normalized as ConflictResolutionState;
}

function normalizeContradictionClass(value: unknown): ConflictContradictionClass {
  const normalized = normalizeCollectionString("conflict_record.contradiction_class", value);
  if (!CONTRADICTION_CLASS_SET.has(normalized as ConflictContradictionClass)) {
    throw new ConflictRecordModelError(
      "CONFLICT_RECORD_CONSTANT_INVALID",
      "contradiction_class must be canonical",
    );
  }
  return normalized as ConflictContradictionClass;
}

export function deriveConflictRecordContentHash(record: Omit<ConflictRecordRecord, "contract">) {
  return `conflict-record-content-hash://${deriveCollectionControlHash({
    artifact_family: "CONFLICT_RECORD_CONTENT",
    payload: record,
  })}`;
}

export function buildConflictRecordContract(input: {
  conflict_id: string;
  conflict_record_content_hash: string;
  schema_bundle_hash?: string;
  writer_build_id?: string;
}) {
  return buildCollectionArtifactContract({
    artifact_content_hash: input.conflict_record_content_hash,
    artifact_id: conflictRecordRef({ conflict_id: input.conflict_id }),
    artifact_type: "ConflictRecord",
    ...(input.schema_bundle_hash === undefined
      ? {}
      : { schema_bundle_hash: input.schema_bundle_hash }),
    schema_id: ConflictRecordSchemaLineage.schemaId,
    schema_source_hash: ConflictRecordSchemaLineage.sourceHash,
    writer_build_id: input.writer_build_id ?? "build.taxat.collection.0115",
  });
}

export function normalizeConflictRecordRecord(input: ConflictRecordRecord): ConflictRecordRecord {
  if (input.artifact_type !== "ConflictRecord") {
    throw new ConflictRecordModelError(
      "CONFLICT_RECORD_ARTIFACT_TYPE_INVALID",
      "conflict records must carry artifact_type ConflictRecord",
    );
  }

  const involvedFactRefs = normalizeCollectionStringSet(
    "conflict_record.involved_fact_refs",
    input.involved_fact_refs,
    { minItems: 2 },
  );
  if (involvedFactRefs.length < 2) {
    throw new ConflictRecordModelError(
      "CONFLICT_RECORD_INVOLVED_REFS_REQUIRED",
      "conflict records require at least two involved refs",
    );
  }
  const reasonCodes = normalizeCollectionStringSet(
    "conflict_record.reason_codes",
    input.reason_codes,
    { minItems: 1 },
  );
  if (reasonCodes.length === 0) {
    throw new ConflictRecordModelError(
      "CONFLICT_RECORD_REASON_REQUIRED",
      "conflict records require at least one machine reason code",
    );
  }

  const blockingClass = normalizeBlockingClass(input.blocking_class);
  const contradictionClass = normalizeContradictionClass(input.contradiction_class);
  const decisiveTargetRefs = normalizeCollectionStringSet(
    "conflict_record.decisive_target_refs",
    input.decisive_target_refs,
  );
  if (
    (contradictionClass === "DECISIVE_CONTRADICTION" ||
      contradictionClass === "AUTHORITY_DIVERGENCE") &&
    (decisiveTargetRefs.length === 0 || blockingClass === "NON_BLOCKING")
  ) {
    throw new ConflictRecordModelError(
      "CONFLICT_RECORD_DECISIVE_TARGET_REQUIRED",
      "decisive contradictions and authority divergence require decisive targets and blocking posture",
    );
  }

  return {
    artifact_type: "ConflictRecord",
    authority_position_refs: normalizeCollectionStringSet(
      "conflict_record.authority_position_refs",
      input.authority_position_refs,
    ),
    blocking_class: blockingClass,
    conflict_id: normalizeCollectionString("conflict_record.conflict_id", input.conflict_id),
    conflict_type: normalizeConflictType(input.conflict_type),
    contract: structuredClone(input.contract),
    contradiction_class: contradictionClass,
    decisive_target_refs: decisiveTargetRefs,
    evidence_refs: normalizeCollectionStringSet(
      "conflict_record.evidence_refs",
      input.evidence_refs,
    ),
    involved_fact_refs: involvedFactRefs,
    manifest_id: normalizeCollectionString("conflict_record.manifest_id", input.manifest_id),
    reason_codes: reasonCodes,
    resolution_state: normalizeResolutionState(input.resolution_state),
    severity: normalizeSeverity(input.severity),
    supersedes_conflict_id:
      input.supersedes_conflict_id === null
        ? null
        : normalizeCollectionString(
            "conflict_record.supersedes_conflict_id",
            input.supersedes_conflict_id,
          ),
  };
}

export function buildConflictRecord(input: {
  conflict_detection_policy_ref: string;
  draft: ConflictRecordDraft;
  schema_bundle_hash?: string;
  writer_build_id?: string;
}) {
  const identityInput: ConflictIdentityHashInput = {
    conflict_detection_policy_ref: input.conflict_detection_policy_ref,
    conflict_type: input.draft.conflict_type,
    contradiction_class: input.draft.contradiction_class,
    decisive_target_refs: input.draft.decisive_target_refs,
    involved_fact_refs: input.draft.involved_fact_refs,
    manifest_id: input.draft.manifest_id,
    reason_codes: input.draft.reason_codes,
  };
  const conflictIdentityHash = deriveConflictIdentityHash(identityInput);
  const conflictId = conflictIdFromIdentity(conflictIdentityHash);
  const conflictRecordContentHash = deriveConflictRecordContentHash({
    ...input.draft,
    conflict_id: conflictId,
  });
  return normalizeConflictRecordRecord({
    ...input.draft,
    conflict_id: conflictId,
    contract: buildConflictRecordContract({
      conflict_id: conflictId,
      conflict_record_content_hash: conflictRecordContentHash,
      ...(input.schema_bundle_hash === undefined
        ? {}
        : { schema_bundle_hash: input.schema_bundle_hash }),
      ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
    }),
  });
}

export function cloneConflictRecordRecord(record: ConflictRecordRecord) {
  return structuredClone(record);
}
