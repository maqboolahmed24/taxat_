import { ConflictSetSchemaLineage } from "../../../generated-models/src/generated/typescript/provenance-and-evidence.ts";
import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  buildCollectionArtifactContract,
  deriveCollectionControlHash,
  normalizeCollectionString,
  normalizeCollectionStringSet,
} from "./collection_control_common.ts";
import {
  cloneConflictRecordRecord,
  conflictRecordRef,
  isBlockingConflict,
  isUnresolvedConflictState,
  normalizeConflictRecordRecord,
  type ConflictBlockingClass,
  type ConflictRecordRecord,
  type DominantConflictBlockingClass,
} from "./conflict_record.ts";

export type ConflictResolutionFrontier = "CLEAR" | "MONITORING_ONLY" | "BLOCKING_PRESENT";

export type ConflictSetRecord = {
  artifact_contract_hash: string;
  artifact_type: "ConflictSet";
  blocking_conflict_count: number;
  blocking_conflict_ids: string[];
  business_partition_refs: string[];
  conflict_detection_policy_ref: string;
  contract: SchemaBundleArtifactContract;
  dominant_blocking_class: DominantConflictBlockingClass | null;
  item_identity_hash: string;
  items: ConflictRecordRecord[];
  manifest_id: string;
  normalization_context_ref: string;
  open_conflict_count: number;
  open_conflict_ids: string[];
  produced_at: string;
  resolution_frontier: ConflictResolutionFrontier;
  set_hash: string;
  set_id: string;
  unresolved_conflict_hash: string;
};

export type ConflictSetDraft = Omit<
  ConflictSetRecord,
  "artifact_contract_hash" | "contract" | "item_identity_hash" | "set_hash" | "set_id" | "unresolved_conflict_hash"
>;

export type ConflictSetModelErrorCode =
  | "CONFLICT_SET_ARTIFACT_TYPE_INVALID"
  | "CONFLICT_SET_DUPLICATE_ITEM"
  | "CONFLICT_SET_FRONTIER_MISMATCH"
  | "CONFLICT_SET_ITEM_MANIFEST_MISMATCH"
  | "CONFLICT_SET_PARTITION_REQUIRED";

export class ConflictSetModelError extends Error {
  readonly code: ConflictSetModelErrorCode;

  constructor(code: ConflictSetModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ConflictSetModelError";
    this.code = code;
  }
}

const BLOCKING_CLASS_PRIORITY: Record<DominantConflictBlockingClass, number> = {
  BLOCKS_RUN: 1,
  BLOCKS_FILING: 2,
  BLOCKS_AUTHORITY_CALL: 3,
  BLOCKS_AUTOMATION: 4,
  BLOCKS_REVIEW_PROGRESS: 5,
  BLOCKS_AMENDMENT: 6,
  BLOCKS_ERASURE: 7,
};

export type ConflictFrontierProjection = {
  blocking_conflict_count: number;
  blocking_conflict_ids: string[];
  dominant_blocking_class: DominantConflictBlockingClass | null;
  open_conflict_count: number;
  open_conflict_ids: string[];
  resolution_frontier: ConflictResolutionFrontier;
};

export function conflictSetRef(record: Pick<ConflictSetRecord, "set_id">) {
  return `conflict-set://${record.set_id}`;
}

export function projectConflictSetFrontier(
  records: readonly ConflictRecordRecord[],
): ConflictFrontierProjection {
  const normalized = records.map((record) => normalizeConflictRecordRecord(record));
  const openConflicts = normalized.filter((record) =>
    isUnresolvedConflictState(record.resolution_state),
  );
  const blockingConflicts = openConflicts.filter((record) => isBlockingConflict(record));
  const openConflictIds = normalizeCollectionStringSet(
    "conflict_set.open_conflict_ids",
    openConflicts.map((record) => record.conflict_id),
  );
  const blockingConflictIds = normalizeCollectionStringSet(
    "conflict_set.blocking_conflict_ids",
    blockingConflicts.map((record) => record.conflict_id),
  );
  const dominantBlockingClass =
    blockingConflicts.length === 0
      ? null
      : [...new Set(blockingConflicts.map((record) => record.blocking_class))]
          .filter((value): value is DominantConflictBlockingClass => value !== "NON_BLOCKING")
          .sort(
            (left, right) =>
              BLOCKING_CLASS_PRIORITY[left] - BLOCKING_CLASS_PRIORITY[right] ||
              left.localeCompare(right),
          )[0] ?? null;
  const resolutionFrontier: ConflictResolutionFrontier =
    blockingConflictIds.length > 0
      ? "BLOCKING_PRESENT"
      : openConflictIds.length > 0
        ? "MONITORING_ONLY"
        : "CLEAR";

  return {
    blocking_conflict_count: blockingConflictIds.length,
    blocking_conflict_ids: blockingConflictIds,
    dominant_blocking_class: dominantBlockingClass,
    open_conflict_count: openConflictIds.length,
    open_conflict_ids: openConflictIds,
    resolution_frontier: resolutionFrontier,
  };
}

function assertFrontierMatches(input: ConflictSetRecord, frontier: ConflictFrontierProjection) {
  const actualOpen = normalizeCollectionStringSet(
    "conflict_set.open_conflict_ids",
    input.open_conflict_ids,
  );
  const actualBlocking = normalizeCollectionStringSet(
    "conflict_set.blocking_conflict_ids",
    input.blocking_conflict_ids,
  );
  if (
    JSON.stringify(actualOpen) !== JSON.stringify(frontier.open_conflict_ids) ||
    JSON.stringify(actualBlocking) !== JSON.stringify(frontier.blocking_conflict_ids) ||
    input.open_conflict_count !== frontier.open_conflict_count ||
    input.blocking_conflict_count !== frontier.blocking_conflict_count ||
    input.resolution_frontier !== frontier.resolution_frontier ||
    input.dominant_blocking_class !== frontier.dominant_blocking_class
  ) {
    throw new ConflictSetModelError(
      "CONFLICT_SET_FRONTIER_MISMATCH",
      "conflict set frontier fields must mirror unresolved conflict posture exactly",
    );
  }
}

export function deriveConflictSetContentHash(record: Omit<ConflictSetRecord, "contract">) {
  return `conflict-set-content-hash://${deriveCollectionControlHash({
    artifact_family: "CONFLICT_SET_CONTENT",
    payload: record,
  })}`;
}

export function deriveConflictSetHash(record: Omit<ConflictSetRecord, "contract" | "set_hash">) {
  return `conflict-set-hash://${deriveCollectionControlHash({
    artifact_family: "CONFLICT_SET_HASH",
    payload: record,
  })}`;
}

export function deriveConflictArtifactContractHash(contract: SchemaBundleArtifactContract) {
  return `artifact-contract-hash://${deriveCollectionControlHash({
    artifact_family: "CONFLICT_SET_ARTIFACT_CONTRACT",
    payload: contract,
  })}`;
}

export function buildConflictSetContract(input: {
  conflict_set_content_hash: string;
  schema_bundle_hash?: string;
  set_id: string;
  writer_build_id?: string;
}) {
  return buildCollectionArtifactContract({
    artifact_content_hash: input.conflict_set_content_hash,
    artifact_id: conflictSetRef({ set_id: input.set_id }),
    artifact_type: "ConflictSet",
    ...(input.schema_bundle_hash === undefined
      ? {}
      : { schema_bundle_hash: input.schema_bundle_hash }),
    schema_id: ConflictSetSchemaLineage.schemaId,
    schema_source_hash: ConflictSetSchemaLineage.sourceHash,
    writer_build_id: input.writer_build_id ?? "build.taxat.collection.0115",
  });
}

export function normalizeConflictSetRecord(input: ConflictSetRecord): ConflictSetRecord {
  if (input.artifact_type !== "ConflictSet") {
    throw new ConflictSetModelError(
      "CONFLICT_SET_ARTIFACT_TYPE_INVALID",
      "conflict sets must carry artifact_type ConflictSet",
    );
  }

  const businessPartitionRefs = normalizeCollectionStringSet(
    "conflict_set.business_partition_refs",
    input.business_partition_refs,
    { minItems: 1 },
  );
  if (businessPartitionRefs.length === 0) {
    throw new ConflictSetModelError(
      "CONFLICT_SET_PARTITION_REQUIRED",
      "conflict sets require at least one business partition ref",
    );
  }
  const manifestId = normalizeCollectionString("conflict_set.manifest_id", input.manifest_id);
  const items = input.items
    .map((record) => normalizeConflictRecordRecord(record))
    .sort((left, right) => left.conflict_id.localeCompare(right.conflict_id));
  const itemIds = new Set<string>();
  for (const item of items) {
    if (item.manifest_id !== manifestId) {
      throw new ConflictSetModelError(
        "CONFLICT_SET_ITEM_MANIFEST_MISMATCH",
        "conflict set items must belong to the set manifest",
      );
    }
    if (itemIds.has(item.conflict_id)) {
      throw new ConflictSetModelError(
        "CONFLICT_SET_DUPLICATE_ITEM",
        `conflict set contains duplicate conflict_id ${item.conflict_id}`,
      );
    }
    itemIds.add(item.conflict_id);
  }

  const normalized: ConflictSetRecord = {
    artifact_contract_hash: normalizeCollectionString(
      "conflict_set.artifact_contract_hash",
      input.artifact_contract_hash,
    ),
    artifact_type: "ConflictSet",
    blocking_conflict_count: input.blocking_conflict_count,
    blocking_conflict_ids: normalizeCollectionStringSet(
      "conflict_set.blocking_conflict_ids",
      input.blocking_conflict_ids,
    ),
    business_partition_refs: businessPartitionRefs,
    conflict_detection_policy_ref: normalizeCollectionString(
      "conflict_set.conflict_detection_policy_ref",
      input.conflict_detection_policy_ref,
    ),
    contract: structuredClone(input.contract),
    dominant_blocking_class: input.dominant_blocking_class as DominantConflictBlockingClass | null,
    item_identity_hash: normalizeCollectionString(
      "conflict_set.item_identity_hash",
      input.item_identity_hash,
    ),
    items: items.map((record) => cloneConflictRecordRecord(record)),
    manifest_id: manifestId,
    normalization_context_ref: normalizeCollectionString(
      "conflict_set.normalization_context_ref",
      input.normalization_context_ref,
    ),
    open_conflict_count: input.open_conflict_count,
    open_conflict_ids: normalizeCollectionStringSet(
      "conflict_set.open_conflict_ids",
      input.open_conflict_ids,
    ),
    produced_at: normalizeUtcInstantString(input.produced_at),
    resolution_frontier: input.resolution_frontier,
    set_hash: normalizeCollectionString("conflict_set.set_hash", input.set_hash),
    set_id: normalizeCollectionString("conflict_set.set_id", input.set_id),
    unresolved_conflict_hash: normalizeCollectionString(
      "conflict_set.unresolved_conflict_hash",
      input.unresolved_conflict_hash,
    ),
  };
  const frontier = projectConflictSetFrontier(normalized.items);
  assertFrontierMatches(normalized, frontier);
  if (normalized.dominant_blocking_class !== null) {
    const blockingClass = normalized.dominant_blocking_class as ConflictBlockingClass;
    if (blockingClass === "NON_BLOCKING") {
      throw new ConflictSetModelError(
        "CONFLICT_SET_FRONTIER_MISMATCH",
        "dominant_blocking_class cannot be NON_BLOCKING",
      );
    }
  }
  return normalized;
}

export function cloneConflictSetRecord(record: ConflictSetRecord) {
  return structuredClone(record);
}
