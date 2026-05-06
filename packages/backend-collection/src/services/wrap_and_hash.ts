import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  buildCollectionArtifactContract,
  deriveCollectionControlHash,
  normalizeCollectionString,
  normalizeCollectionStringSet,
} from "../models/collection_control_common.ts";
import {
  artifactTypeHashNamespace,
  deriveArtifactContractContentHash,
} from "./build_artifact_contract_hash.ts";

export type IntakeArtifactSetType =
  | "SourceRecordSet"
  | "EvidenceItemSet"
  | "CandidateFactSet"
  | "ConflictSet"
  | "CanonicalFactSet";

export type ArtifactSetHashEnvelope = {
  artifact_contract_hash: string;
  contract: SchemaBundleArtifactContract;
  item_identity_hash: string;
  set_hash: string;
  set_id: string;
};

const SET_REF_PREFIX: Record<IntakeArtifactSetType, string> = {
  CandidateFactSet: "candidate-fact-set",
  CanonicalFactSet: "canonical-fact-set",
  ConflictSet: "conflict-set",
  EvidenceItemSet: "evidence-item-set",
  SourceRecordSet: "source-record-set",
};

const SET_HASH_PREFIX: Record<IntakeArtifactSetType, string> = {
  CandidateFactSet: "candidate-fact-set-hash",
  CanonicalFactSet: "canonical-fact-set-hash",
  ConflictSet: "conflict-set-hash",
  EvidenceItemSet: "evidence-item-set-hash",
  SourceRecordSet: "source-record-set-hash",
};

const CONTENT_HASH_PREFIX: Record<IntakeArtifactSetType, string> = {
  CandidateFactSet: "candidate-fact-set-content-hash",
  CanonicalFactSet: "canonical-fact-set-content-hash",
  ConflictSet: "conflict-set-content-hash",
  EvidenceItemSet: "evidence-item-set-content-hash",
  SourceRecordSet: "source-record-set-content-hash",
};

const ITEM_IDENTITY_HASH_PREFIX: Record<IntakeArtifactSetType, string> = {
  CandidateFactSet: "candidate-fact-set-item-identity-hash",
  CanonicalFactSet: "canonical-fact-set-item-identity-hash",
  ConflictSet: "conflict-set-item-identity-hash",
  EvidenceItemSet: "evidence-item-set-item-identity-hash",
  SourceRecordSet: "source-record-set-item-identity-hash",
};

function hashNamespace(artifactType: IntakeArtifactSetType) {
  return artifactTypeHashNamespace(artifactType);
}

export function artifactSetRef(input: {
  artifact_type: IntakeArtifactSetType;
  set_id: string;
}) {
  const prefix = SET_REF_PREFIX[input.artifact_type];
  return `${prefix}://${normalizeCollectionString("artifact_set.set_id", input.set_id)}`;
}

export function wrapAndHashArtifactSet<
  TBase extends {
    artifact_type: IntakeArtifactSetType;
    items: readonly unknown[];
    manifest_id: string;
    produced_at: string;
  },
>(input: {
  base: TBase;
  item_identity_keys: readonly string[];
  schema_bundle_hash?: string;
  schema_id: string;
  schema_source_hash: string;
  set_identity_components?: unknown;
  writer_build_id?: string;
}): ArtifactSetHashEnvelope {
  const artifactType = input.base.artifact_type;
  const namespace = hashNamespace(artifactType);
  const manifestId = normalizeCollectionString("artifact_set.manifest_id", input.base.manifest_id);
  const producedAt = normalizeUtcInstantString(input.base.produced_at);
  const base = {
    ...input.base,
    manifest_id: manifestId,
    produced_at: producedAt,
  };
  const itemIdentityHash = `${ITEM_IDENTITY_HASH_PREFIX[artifactType]}://${deriveCollectionControlHash({
    artifact_family: `${namespace}_ITEM_IDENTITY`,
    payload: normalizeCollectionStringSet(
      "artifact_set.item_identity_keys",
      input.item_identity_keys,
    ),
  })}`;
  const setId = `${SET_REF_PREFIX[artifactType]}.${deriveCollectionControlHash({
    artifact_family: `${namespace}_ID`,
    payload: {
      artifact_type: artifactType,
      item_identity_hash: itemIdentityHash,
      manifest_id: manifestId,
      set_identity_components: input.set_identity_components ?? null,
    },
  })}`;
  const provisionalSetHash = `${SET_HASH_PREFIX[artifactType]}://pending`;
  const provisionalContentHash = `${CONTENT_HASH_PREFIX[artifactType]}://${deriveCollectionControlHash({
    artifact_family: `${namespace}_CONTENT`,
    payload: {
      ...base,
      artifact_contract_hash: "artifact-contract-hash://pending",
      item_identity_hash: itemIdentityHash,
      set_hash: provisionalSetHash,
      set_id: setId,
    },
  })}`;
  const contract = buildCollectionArtifactContract({
    artifact_content_hash: provisionalContentHash,
    artifact_id: artifactSetRef({ artifact_type: artifactType, set_id: setId }),
    artifact_type: artifactType,
    ...(input.schema_bundle_hash === undefined
      ? {}
      : { schema_bundle_hash: input.schema_bundle_hash }),
    schema_id: input.schema_id,
    schema_source_hash: input.schema_source_hash,
    writer_build_id: input.writer_build_id ?? "build.taxat.collection.0119",
  });
  const artifactContractHash = deriveArtifactContractContentHash({
    artifact_family: `${namespace}_ARTIFACT_CONTRACT`,
    contract,
  });
  const setHash = `${SET_HASH_PREFIX[artifactType]}://${deriveCollectionControlHash({
    artifact_family: `${namespace}_SET`,
    payload: {
      ...base,
      artifact_contract_hash: artifactContractHash,
      item_identity_hash: itemIdentityHash,
      set_id: setId,
    },
  })}`;

  return {
    artifact_contract_hash: artifactContractHash,
    contract,
    item_identity_hash: itemIdentityHash,
    set_hash: setHash,
    set_id: setId,
  };
}
