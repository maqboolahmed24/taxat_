import { ConflictSetSchemaLineage } from "../../../generated-models/src/generated/typescript/provenance-and-evidence.ts";
import { normalizeCandidateFactRecord, type CandidateFactRecord } from "../models/candidate_fact.ts";
import {
  cloneConflictSetRecord,
  normalizeConflictSetRecord,
  projectConflictSetFrontier,
  type ConflictSetRecord,
} from "../models/conflict_set.ts";
import {
  cloneConflictRecordRecord,
  normalizeConflictRecordRecord,
  type ConflictRecordRecord,
} from "../models/conflict_record.ts";
import {
  deriveUnresolvedConflictHash,
} from "./conflict_identity_hash.ts";
import { normalizeCollectionString, normalizeCollectionStringSet } from "../models/collection_control_common.ts";
import { buildArtifactSet } from "./build_artifact_set.ts";
import { wrapAndHashArtifactSet } from "./wrap_and_hash.ts";

export type BuildConflictSetErrorCode =
  | "CONFLICT_SET_MANIFEST_REQUIRED"
  | "CONFLICT_SET_PARTITION_REQUIRED";

export class BuildConflictSetError extends Error {
  readonly code: BuildConflictSetErrorCode;

  constructor(code: BuildConflictSetErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "BuildConflictSetError";
    this.code = code;
  }
}

function inferManifestId(input: {
  candidate_facts?: readonly CandidateFactRecord[];
  conflict_records: readonly ConflictRecordRecord[];
  manifest_id?: string;
}) {
  if (input.manifest_id !== undefined) {
    return normalizeCollectionString("conflict_set.manifest_id", input.manifest_id);
  }
  const conflict = input.conflict_records[0];
  if (conflict !== undefined) {
    return normalizeCollectionString("conflict_set.manifest_id", conflict.manifest_id);
  }
  const candidate = input.candidate_facts?.[0];
  if (candidate !== undefined) {
    return normalizeCollectionString("conflict_set.manifest_id", candidate.manifest_id);
  }
  throw new BuildConflictSetError(
    "CONFLICT_SET_MANIFEST_REQUIRED",
    "conflict set construction requires a manifest id when there are no candidate or conflict records",
  );
}

function inferPartitionRefs(input: {
  business_partition_refs?: readonly string[];
  candidate_facts?: readonly CandidateFactRecord[];
  conflict_records: readonly ConflictRecordRecord[];
}) {
  const explicit = normalizeCollectionStringSet(
    "conflict_set.business_partition_refs",
    input.business_partition_refs ?? [],
  );
  if (explicit.length > 0) {
    return explicit;
  }
  const candidatePartitions = normalizeCollectionStringSet(
    "conflict_set.candidate_partition_refs",
    (input.candidate_facts ?? []).map((candidate) => candidate.partition_scope),
  );
  if (candidatePartitions.length > 0) {
    return candidatePartitions;
  }
  const conflictRefs = normalizeCollectionStringSet(
    "conflict_set.conflict_partition_fallback_refs",
    input.conflict_records.flatMap((record) => record.involved_fact_refs),
  );
  if (conflictRefs.length > 0) {
    return ["partition://conflict-frontier/unknown"];
  }
  throw new BuildConflictSetError(
    "CONFLICT_SET_PARTITION_REQUIRED",
    "conflict set construction requires at least one business partition ref",
  );
}

export function buildConflictSet(input: {
  business_partition_refs?: readonly string[];
  candidate_facts?: readonly CandidateFactRecord[];
  conflict_detection_policy_ref: string;
  conflict_records: readonly ConflictRecordRecord[];
  manifest_id?: string;
  normalization_context_ref: string;
  produced_at: string;
  schema_bundle_hash?: string;
  writer_build_id?: string;
}): ConflictSetRecord {
  const candidates = (input.candidate_facts ?? []).map((candidate) =>
    normalizeCandidateFactRecord(candidate),
  );
  const manifestId = inferManifestId({
    candidate_facts: candidates,
    conflict_records: input.conflict_records,
    ...(input.manifest_id === undefined ? {} : { manifest_id: input.manifest_id }),
  });
  const set = buildArtifactSet({
    identity_key: (record) => `conflict-record://${record.conflict_id}`,
    item_manifest_id: (record) => record.manifest_id,
    items: input.conflict_records,
    manifest_id: manifestId,
    normalize_item: (record) => normalizeConflictRecordRecord(record),
    set_label: "conflict_set",
    sort_key: (record) => record.conflict_id,
  });
  const records = set.items;
  const frontier = projectConflictSetFrontier(records);
  const unresolvedConflictHash = deriveUnresolvedConflictHash(frontier);
  const base = {
    artifact_type: "ConflictSet" as const,
    blocking_conflict_count: frontier.blocking_conflict_count,
    blocking_conflict_ids: frontier.blocking_conflict_ids,
    business_partition_refs: inferPartitionRefs({
      candidate_facts: candidates,
      conflict_records: records,
      ...(input.business_partition_refs === undefined
        ? {}
        : { business_partition_refs: input.business_partition_refs }),
    }),
    conflict_detection_policy_ref: normalizeCollectionString(
      "conflict_set.conflict_detection_policy_ref",
      input.conflict_detection_policy_ref,
    ),
    dominant_blocking_class: frontier.dominant_blocking_class,
    items: records.map((record) => cloneConflictRecordRecord(record)),
    manifest_id: manifestId,
    normalization_context_ref: normalizeCollectionString(
      "conflict_set.normalization_context_ref",
      input.normalization_context_ref,
    ),
    open_conflict_count: frontier.open_conflict_count,
    open_conflict_ids: frontier.open_conflict_ids,
    produced_at: input.produced_at,
    resolution_frontier: frontier.resolution_frontier,
    unresolved_conflict_hash: unresolvedConflictHash,
  };
  const envelope = wrapAndHashArtifactSet({
    base,
    item_identity_keys: set.item_identity_keys,
    ...(input.schema_bundle_hash === undefined
      ? {}
      : { schema_bundle_hash: input.schema_bundle_hash }),
    schema_id: ConflictSetSchemaLineage.schemaId,
    schema_source_hash: ConflictSetSchemaLineage.sourceHash,
    set_identity_components: {
      conflict_detection_policy_ref: base.conflict_detection_policy_ref,
      normalization_context_ref: base.normalization_context_ref,
      unresolved_conflict_hash: unresolvedConflictHash,
    },
    ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
  });
  const record = normalizeConflictSetRecord({
    ...base,
    artifact_contract_hash: envelope.artifact_contract_hash,
    contract: envelope.contract,
    item_identity_hash: envelope.item_identity_hash,
    set_hash: envelope.set_hash,
    set_id: envelope.set_id,
  });

  return cloneConflictSetRecord(record);
}
