import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";

export type IntakeArtifactContractRef = {
  artifact_contract_hash: string;
  artifact_contract_ref: string;
  artifact_content_hash: string;
  artifact_id: string;
  artifact_type: string;
  schema_bundle_hash: string;
  schema_id: string;
};

export type IntakeArtifactContractRefInput = {
  artifact_contract_hash?: string;
  contract: SchemaBundleArtifactContract;
};

