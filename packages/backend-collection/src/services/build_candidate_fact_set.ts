import { CandidateFactSetSchemaLineage } from "../../../generated-models/src/generated/typescript/provenance-and-evidence.ts";
import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import {
  candidateFactRef,
  cloneCandidateFactRecord,
  normalizeCandidateFactRecord,
  type CandidateFactRecord,
} from "../models/candidate_fact.ts";
import { buildArtifactSet } from "./build_artifact_set.ts";
import { artifactSetRef, wrapAndHashArtifactSet } from "./wrap_and_hash.ts";

export type CandidateFactSetRecord = {
  artifact_contract_hash: string;
  artifact_type: "CandidateFactSet";
  contract: SchemaBundleArtifactContract;
  item_identity_hash: string;
  items: CandidateFactRecord[];
  manifest_id: string;
  produced_at: string;
  set_hash: string;
  set_id: string;
};

export function candidateFactSetRef(record: Pick<CandidateFactSetRecord, "set_id">) {
  return artifactSetRef({ artifact_type: "CandidateFactSet", set_id: record.set_id });
}

export function buildCandidateFactSet(input: {
  candidate_facts: readonly CandidateFactRecord[];
  manifest_id: string;
  produced_at: string;
  schema_bundle_hash?: string;
  writer_build_id?: string;
}): CandidateFactSetRecord {
  const set = buildArtifactSet({
    identity_key: (item) => candidateFactRef(item),
    item_manifest_id: (item) => item.manifest_id,
    items: input.candidate_facts,
    manifest_id: input.manifest_id,
    normalize_item: (item) => normalizeCandidateFactRecord(item),
    set_label: "candidate_fact_set",
    sort_key: (item) => item.candidate_fact_id,
  });
  const base = {
    artifact_type: "CandidateFactSet" as const,
    items: set.items.map((item) => cloneCandidateFactRecord(item)),
    manifest_id: set.manifest_id,
    produced_at: input.produced_at,
  };
  const envelope = wrapAndHashArtifactSet({
    base,
    item_identity_keys: set.item_identity_keys,
    ...(input.schema_bundle_hash === undefined
      ? {}
      : { schema_bundle_hash: input.schema_bundle_hash }),
    schema_id: CandidateFactSetSchemaLineage.schemaId,
    schema_source_hash: CandidateFactSetSchemaLineage.sourceHash,
    ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
  });
  return {
    ...base,
    ...envelope,
  };
}

