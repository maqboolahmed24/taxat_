import { CanonicalFactSetSchemaLineage } from "../../../generated-models/src/generated/typescript/provenance-and-evidence.ts";
import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import {
  canonicalFactRef,
  cloneCanonicalFactRecord,
  normalizeCanonicalFactRecord,
  type CanonicalFactRecord,
} from "../models/canonical_fact.ts";
import { buildArtifactSet } from "./build_artifact_set.ts";
import { artifactSetRef, wrapAndHashArtifactSet } from "./wrap_and_hash.ts";

export type CanonicalFactSetRecord = {
  artifact_contract_hash: string;
  artifact_type: "CanonicalFactSet";
  contract: SchemaBundleArtifactContract;
  item_identity_hash: string;
  items: CanonicalFactRecord[];
  manifest_id: string;
  produced_at: string;
  set_hash: string;
  set_id: string;
};

export function canonicalFactSetRef(record: Pick<CanonicalFactSetRecord, "set_id">) {
  return artifactSetRef({ artifact_type: "CanonicalFactSet", set_id: record.set_id });
}

export function buildCanonicalFactSet(input: {
  canonical_facts: readonly CanonicalFactRecord[];
  manifest_id: string;
  produced_at: string;
  schema_bundle_hash?: string;
  writer_build_id?: string;
}): CanonicalFactSetRecord {
  const set = buildArtifactSet({
    identity_key: (item) => canonicalFactRef(item),
    item_manifest_id: (item) => item.manifest_id,
    items: input.canonical_facts,
    manifest_id: input.manifest_id,
    normalize_item: (item) => normalizeCanonicalFactRecord(item),
    set_label: "canonical_fact_set",
    sort_key: (item) => item.canonical_fact_id,
  });
  const base = {
    artifact_type: "CanonicalFactSet" as const,
    items: set.items.map((item) => cloneCanonicalFactRecord(item)),
    manifest_id: set.manifest_id,
    produced_at: input.produced_at,
  };
  const envelope = wrapAndHashArtifactSet({
    base,
    item_identity_keys: set.item_identity_keys,
    ...(input.schema_bundle_hash === undefined
      ? {}
      : { schema_bundle_hash: input.schema_bundle_hash }),
    schema_id: CanonicalFactSetSchemaLineage.schemaId,
    schema_source_hash: CanonicalFactSetSchemaLineage.sourceHash,
    ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
  });
  return {
    ...base,
    ...envelope,
  };
}

