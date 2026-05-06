import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import type {
  IntakeArtifactContractRef,
  IntakeArtifactContractRefInput,
} from "../types/intake_artifact_contract_ref.ts";
import { normalizeCollectionString } from "../models/collection_control_common.ts";
import {
  artifactContractHashFamily,
  deriveArtifactContractContentHash,
} from "./build_artifact_contract_hash.ts";

function encodeRefPart(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export function artifactContractRefFromParts(input: {
  artifact_contract_hash: string;
  artifact_content_hash: string;
  artifact_id: string;
  artifact_type: string;
  schema_bundle_hash: string;
  schema_id: string;
}) {
  const artifactType = normalizeCollectionString(
    "artifact_contract_ref.artifact_type",
    input.artifact_type,
  );
  const query = [
    ["artifact_id", input.artifact_id],
    ["schema_id", input.schema_id],
    ["schema_bundle_hash", input.schema_bundle_hash],
    ["artifact_content_hash", input.artifact_content_hash],
    ["artifact_contract_hash", input.artifact_contract_hash],
  ]
    .map(
      ([key, value]) =>
        `${key}=${encodeRefPart(normalizeCollectionString(`artifact_contract_ref.${key}`, value))}`,
    )
    .join("&");
  return `artifact-contract://${encodeRefPart(artifactType)}?${query}`;
}

export function recordArtifactContractRef(
  input: IntakeArtifactContractRefInput,
): IntakeArtifactContractRef {
  const contract: SchemaBundleArtifactContract = structuredClone(input.contract);
  const artifactContractHash =
    input.artifact_contract_hash ??
    deriveArtifactContractContentHash({
      artifact_family: artifactContractHashFamily(contract.artifact_type),
      contract,
    });
  return {
    artifact_contract_hash: normalizeCollectionString(
      "artifact_contract_ref.artifact_contract_hash",
      artifactContractHash,
    ),
    artifact_contract_ref: artifactContractRefFromParts({
      artifact_contract_hash: artifactContractHash,
      artifact_content_hash: contract.artifact_content_hash,
      artifact_id: contract.artifact_id,
      artifact_type: contract.artifact_type,
      schema_bundle_hash: contract.schema_bundle_hash,
      schema_id: contract.schema_id,
    }),
    artifact_content_hash: normalizeCollectionString(
      "artifact_contract_ref.artifact_content_hash",
      contract.artifact_content_hash,
    ),
    artifact_id: normalizeCollectionString("artifact_contract_ref.artifact_id", contract.artifact_id),
    artifact_type: normalizeCollectionString(
      "artifact_contract_ref.artifact_type",
      contract.artifact_type,
    ),
    schema_bundle_hash: normalizeCollectionString(
      "artifact_contract_ref.schema_bundle_hash",
      contract.schema_bundle_hash,
    ),
    schema_id: normalizeCollectionString("artifact_contract_ref.schema_id", contract.schema_id),
  };
}
