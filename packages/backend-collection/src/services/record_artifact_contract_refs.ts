import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import type { IntakeArtifactContractRef } from "../types/intake_artifact_contract_ref.ts";
import { buildArtifactContractHash } from "./build_artifact_contract_hash.ts";
import { recordArtifactContractRef } from "./record_artifact_contract_ref.ts";

export type RecordedArtifactContractRefs = {
  artifact_contract_hash: string;
  artifact_contract_records: IntakeArtifactContractRef[];
  artifact_contract_refs: string[];
};

export function recordArtifactContractRefs(input: {
  contracts: readonly SchemaBundleArtifactContract[];
  hash_scope?: string;
}): RecordedArtifactContractRefs {
  const records = input.contracts
    .map((contract) => recordArtifactContractRef({ contract }))
    .sort(
      (left, right) =>
        left.artifact_type.localeCompare(right.artifact_type) ||
        left.artifact_id.localeCompare(right.artifact_id) ||
        left.artifact_contract_hash.localeCompare(right.artifact_contract_hash),
    );
  const refs = records.map((record) => record.artifact_contract_ref);
  return {
    artifact_contract_hash: buildArtifactContractHash({
      artifact_contract_refs: refs,
      ...(input.hash_scope === undefined ? {} : { hash_scope: input.hash_scope }),
    }),
    artifact_contract_records: records,
    artifact_contract_refs: refs,
  };
}

