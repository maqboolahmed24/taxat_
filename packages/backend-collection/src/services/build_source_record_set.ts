import { SourceRecordSetSchemaLineage } from "../../../generated-models/src/generated/typescript/provenance-and-evidence.ts";
import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import {
  cloneSourceRecordRecord,
  normalizeSourceRecordRecord,
  sourceRecordRef,
  type SourceRecordRecord,
} from "../models/source_record.ts";
import { buildArtifactSet } from "./build_artifact_set.ts";
import { artifactSetRef, wrapAndHashArtifactSet } from "./wrap_and_hash.ts";

export type SourceRecordSetRecord = {
  artifact_contract_hash: string;
  artifact_type: "SourceRecordSet";
  contract: SchemaBundleArtifactContract;
  item_identity_hash: string;
  items: SourceRecordRecord[];
  manifest_id: string;
  produced_at: string;
  set_hash: string;
  set_id: string;
};

export function sourceRecordSetRef(record: Pick<SourceRecordSetRecord, "set_id">) {
  return artifactSetRef({ artifact_type: "SourceRecordSet", set_id: record.set_id });
}

export function buildSourceRecordSet(input: {
  manifest_id: string;
  produced_at: string;
  schema_bundle_hash?: string;
  source_records: readonly SourceRecordRecord[];
  writer_build_id?: string;
}): SourceRecordSetRecord {
  const set = buildArtifactSet({
    identity_key: (item) => sourceRecordRef(item),
    item_manifest_id: (item) => item.manifest_id,
    items: input.source_records,
    manifest_id: input.manifest_id,
    normalize_item: (item) => normalizeSourceRecordRecord(item),
    set_label: "source_record_set",
    sort_key: (item) => item.source_record_id,
  });
  const base = {
    artifact_type: "SourceRecordSet" as const,
    items: set.items.map((item) => cloneSourceRecordRecord(item)),
    manifest_id: set.manifest_id,
    produced_at: input.produced_at,
  };
  const envelope = wrapAndHashArtifactSet({
    base,
    item_identity_keys: set.item_identity_keys,
    ...(input.schema_bundle_hash === undefined
      ? {}
      : { schema_bundle_hash: input.schema_bundle_hash }),
    schema_id: SourceRecordSetSchemaLineage.schemaId,
    schema_source_hash: SourceRecordSetSchemaLineage.sourceHash,
    ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
  });
  return {
    ...base,
    ...envelope,
  };
}

