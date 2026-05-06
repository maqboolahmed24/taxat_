import { EvidenceItemSetSchemaLineage } from "../../../generated-models/src/generated/typescript/provenance-and-evidence.ts";
import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import {
  cloneEvidenceItemRecord,
  evidenceItemRef,
  normalizeEvidenceItemRecord,
  type EvidenceItemRecord,
} from "../models/evidence_item.ts";
import { buildArtifactSet } from "./build_artifact_set.ts";
import { artifactSetRef, wrapAndHashArtifactSet } from "./wrap_and_hash.ts";

export type EvidenceItemSetRecord = {
  artifact_contract_hash: string;
  artifact_type: "EvidenceItemSet";
  contract: SchemaBundleArtifactContract;
  item_identity_hash: string;
  items: EvidenceItemRecord[];
  manifest_id: string;
  produced_at: string;
  set_hash: string;
  set_id: string;
};

export function evidenceItemSetRef(record: Pick<EvidenceItemSetRecord, "set_id">) {
  return artifactSetRef({ artifact_type: "EvidenceItemSet", set_id: record.set_id });
}

export function buildEvidenceItemSet(input: {
  evidence_items: readonly EvidenceItemRecord[];
  manifest_id: string;
  produced_at: string;
  schema_bundle_hash?: string;
  writer_build_id?: string;
}): EvidenceItemSetRecord {
  const set = buildArtifactSet({
    identity_key: (item) => evidenceItemRef(item),
    item_manifest_id: (item) => item.manifest_id,
    items: input.evidence_items,
    manifest_id: input.manifest_id,
    normalize_item: (item) => normalizeEvidenceItemRecord(item),
    set_label: "evidence_item_set",
    sort_key: (item) => item.evidence_item_id,
  });
  const base = {
    artifact_type: "EvidenceItemSet" as const,
    items: set.items.map((item) => cloneEvidenceItemRecord(item)),
    manifest_id: set.manifest_id,
    produced_at: input.produced_at,
  };
  const envelope = wrapAndHashArtifactSet({
    base,
    item_identity_keys: set.item_identity_keys,
    ...(input.schema_bundle_hash === undefined
      ? {}
      : { schema_bundle_hash: input.schema_bundle_hash }),
    schema_id: EvidenceItemSetSchemaLineage.schemaId,
    schema_source_hash: EvidenceItemSetSchemaLineage.sourceHash,
    ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
  });
  return {
    ...base,
    ...envelope,
  };
}

