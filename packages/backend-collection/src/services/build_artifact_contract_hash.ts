import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import {
  deriveCollectionControlHash,
  normalizeCollectionString,
  normalizeCollectionStringSet,
} from "../models/collection_control_common.ts";

export function artifactTypeHashNamespace(artifactType: string) {
  return normalizeCollectionString("artifact_contract_hash.artifact_type", artifactType)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toUpperCase();
}

export function artifactContractHashFamily(artifactType: string) {
  return `${artifactTypeHashNamespace(artifactType)}_ARTIFACT_CONTRACT`;
}

export function deriveArtifactContractContentHash(input: {
  artifact_family?: string;
  contract: SchemaBundleArtifactContract;
}) {
  return `artifact-contract-hash://${deriveCollectionControlHash({
    artifact_family: input.artifact_family ?? "ARTIFACT_CONTRACT_CONTENT",
    payload: input.contract,
  })}`;
}

export function buildArtifactContractHash(input: {
  artifact_contract_refs: readonly string[];
  hash_scope?: string;
}) {
  return `artifact-contract-hash://${deriveCollectionControlHash({
    artifact_family: input.hash_scope ?? "INTAKE_ARTIFACT_CONTRACT_REFS",
    payload: normalizeCollectionStringSet(
      "artifact_contract_hash.artifact_contract_refs",
      input.artifact_contract_refs,
      { minItems: 1 },
    ),
  })}`;
}

export function deriveArtifactContractHashFromContracts(input: {
  contracts: readonly SchemaBundleArtifactContract[];
  hash_scope?: string;
}) {
  const contracts = input.contracts
    .map((contract) => ({
      artifact_content_hash: normalizeCollectionString(
        "artifact_contract_hash.artifact_content_hash",
        contract.artifact_content_hash,
      ),
      artifact_id: normalizeCollectionString(
        "artifact_contract_hash.artifact_id",
        contract.artifact_id,
      ),
      artifact_type: normalizeCollectionString(
        "artifact_contract_hash.artifact_type",
        contract.artifact_type,
      ),
      schema_bundle_hash: normalizeCollectionString(
        "artifact_contract_hash.schema_bundle_hash",
        contract.schema_bundle_hash,
      ),
      schema_id: normalizeCollectionString("artifact_contract_hash.schema_id", contract.schema_id),
      writer_build_id: normalizeCollectionString(
        "artifact_contract_hash.writer_build_id",
        contract.writer_build_id,
      ),
    }))
    .sort(
      (left, right) =>
        left.artifact_type.localeCompare(right.artifact_type) ||
        left.artifact_id.localeCompare(right.artifact_id) ||
        left.schema_id.localeCompare(right.schema_id) ||
        left.artifact_content_hash.localeCompare(right.artifact_content_hash),
    );
  return `artifact-contract-hash://${deriveCollectionControlHash({
    artifact_family: input.hash_scope ?? "INTAKE_ARTIFACT_CONTRACT_CONTENTS",
    payload: contracts,
  })}`;
}
