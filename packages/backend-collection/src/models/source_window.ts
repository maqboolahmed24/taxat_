import type { SourceWindow as GeneratedSourceWindow } from "../../../generated-models/src/generated/typescript/provenance-and-evidence.ts";
import { SourceWindowSchemaLineage } from "../../../generated-models/src/generated/typescript/provenance-and-evidence.ts";
import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { normalizeUtcInstantString, parseUtcInstant } from "../../../domain-kernel/src/primitives/time.ts";
import {
  buildCollectionArtifactContract,
  deriveCollectionControlHash,
  normalizeCollectionString,
} from "./collection_control_common.ts";

export type SourceWindowRecord = Omit<GeneratedSourceWindow, "contract"> & {
  contract: SchemaBundleArtifactContract;
};

export type SourceWindowDraft = Omit<SourceWindowRecord, "contract" | "source_window_hash">;

export type SourceWindowModelErrorCode =
  | "SOURCE_WINDOW_ARTIFACT_TYPE_INVALID"
  | "SOURCE_WINDOW_CUTOFF_ENFORCEMENT_INVALID"
  | "SOURCE_WINDOW_HASH_MISMATCH"
  | "SOURCE_WINDOW_POST_CUTOFF_MODE_INVALID"
  | "SOURCE_WINDOW_TIMESTAMP_ORDER_INVALID";

export class SourceWindowModelError extends Error {
  readonly code: SourceWindowModelErrorCode;

  constructor(code: SourceWindowModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SourceWindowModelError";
    this.code = code;
  }
}

function assertTimeline(input: {
  collection_completed_at: string;
  collection_started_at: string;
  read_cutoff_at: string;
}) {
  const startedAt = parseUtcInstant(input.collection_started_at).valueOf();
  const completedAt = parseUtcInstant(input.collection_completed_at).valueOf();
  const cutoffAt = parseUtcInstant(input.read_cutoff_at).valueOf();
  if (startedAt > completedAt) {
    throw new SourceWindowModelError(
      "SOURCE_WINDOW_TIMESTAMP_ORDER_INVALID",
      "collection_started_at must be at or before collection_completed_at",
    );
  }
  if (completedAt > cutoffAt) {
    throw new SourceWindowModelError(
      "SOURCE_WINDOW_TIMESTAMP_ORDER_INVALID",
      "collection_completed_at must be at or before read_cutoff_at",
    );
  }
}

export function sourceWindowRef(window: Pick<SourceWindowRecord, "source_window_id">) {
  return `source-window://${window.source_window_id}`;
}

export function normalizeSourceWindowDraft(input: SourceWindowDraft): SourceWindowDraft {
  if (input.artifact_type !== "SourceWindow") {
    throw new SourceWindowModelError(
      "SOURCE_WINDOW_ARTIFACT_TYPE_INVALID",
      "source windows must carry artifact_type SourceWindow",
    );
  }
  if (input.cutoff_enforcement_state !== "HARD_CLOSED_AT_READ_CUTOFF") {
    throw new SourceWindowModelError(
      "SOURCE_WINDOW_CUTOFF_ENFORCEMENT_INVALID",
      "cutoff_enforcement_state must be HARD_CLOSED_AT_READ_CUTOFF",
    );
  }
  if (input.post_cutoff_observation_mode !== "LATE_DATA_ONLY") {
    throw new SourceWindowModelError(
      "SOURCE_WINDOW_POST_CUTOFF_MODE_INVALID",
      "post_cutoff_observation_mode must be LATE_DATA_ONLY",
    );
  }

  const draft: SourceWindowDraft = {
    source_window_id: normalizeCollectionString(
      "source_window.source_window_id",
      input.source_window_id,
    ),
    manifest_id: normalizeCollectionString("source_window.manifest_id", input.manifest_id),
    artifact_type: "SourceWindow",
    source_plan_ref: normalizeCollectionString(
      "source_window.source_plan_ref",
      input.source_plan_ref,
    ),
    collection_started_at: normalizeUtcInstantString(input.collection_started_at),
    collection_completed_at: normalizeUtcInstantString(input.collection_completed_at),
    read_cutoff_at: normalizeUtcInstantString(input.read_cutoff_at),
    cutoff_enforcement_state: "HARD_CLOSED_AT_READ_CUTOFF",
    post_cutoff_observation_mode: "LATE_DATA_ONLY",
  };
  assertTimeline(draft);
  return draft;
}

export function deriveSourceWindowHash(input: SourceWindowDraft) {
  return `source-window-hash://${deriveCollectionControlHash({
    artifact_family: "SOURCE_WINDOW",
    payload: normalizeSourceWindowDraft(input),
  })}`;
}

export function buildSourceWindowContract(input: {
  schema_bundle_hash?: string;
  source_window_hash: string;
  source_window_id: string;
  writer_build_id?: string;
}) {
  return buildCollectionArtifactContract({
    artifact_content_hash: input.source_window_hash,
    artifact_id: sourceWindowRef({ source_window_id: input.source_window_id }),
    artifact_type: "SourceWindow",
    schema_bundle_hash: input.schema_bundle_hash,
    schema_id: SourceWindowSchemaLineage.schemaId,
    schema_source_hash: SourceWindowSchemaLineage.sourceHash,
    writer_build_id: input.writer_build_id,
  });
}

export function normalizeSourceWindowRecord(input: SourceWindowRecord): SourceWindowRecord {
  const draft = normalizeSourceWindowDraft(input);
  const expectedHash = deriveSourceWindowHash(draft);
  if (input.source_window_hash !== expectedHash) {
    throw new SourceWindowModelError(
      "SOURCE_WINDOW_HASH_MISMATCH",
      "source_window_hash must match the canonical source window payload",
    );
  }
  return {
    ...draft,
    source_window_hash: expectedHash,
    contract: structuredClone(input.contract),
  };
}

export function cloneSourceWindowRecord(record: SourceWindowRecord) {
  return structuredClone(record);
}
