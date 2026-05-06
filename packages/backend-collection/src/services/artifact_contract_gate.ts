import type { CanonicalScopeToken } from "../../../backend-access/src/services/principal_context_normalizer.ts";
import type { RunManifestGateDecisionRecord } from "../../../backend-manifest/src/models/run_manifest.ts";
import type { SchemaBundleRecord } from "../../../backend-manifest/src/models/schema_bundle.ts";
import type {
  ArtifactSchemaValidator,
  PresealArtifactValidationResult,
} from "../types/artifact_validation_result.ts";
import {
  type PresealArtifactContractPackInput,
  validateArtifactContractsForPresealSet,
} from "./validate_artifact_contracts_for_preseal_set.ts";
import { buildArtifactContractGateRecord } from "./build_artifact_contract_gate_record.ts";

export type ArtifactContractGateResult = {
  gate_record: RunManifestGateDecisionRecord;
  validation: PresealArtifactValidationResult;
};

export async function artifactContractGate(input: {
  artifacts: PresealArtifactContractPackInput;
  decided_at: string;
  effective_scope: CanonicalScopeToken[];
  execution_mode?: "ANALYSIS" | "COMPLIANCE";
  manifest_id: string;
  policy_version_ref?: string;
  prerequisite_gate_refs?: readonly string[];
  schema_bundle: SchemaBundleRecord;
  schema_validator?: ArtifactSchemaValidator;
}): Promise<ArtifactContractGateResult> {
  const validation = await validateArtifactContractsForPresealSet({
    artifacts: input.artifacts,
    ...(input.execution_mode === undefined ? {} : { execution_mode: input.execution_mode }),
    schema_bundle: input.schema_bundle,
    ...(input.schema_validator === undefined ? {} : { schema_validator: input.schema_validator }),
  });
  return {
    gate_record: buildArtifactContractGateRecord({
      decided_at: input.decided_at,
      effective_scope: input.effective_scope,
      manifest_id: input.manifest_id,
      ...(input.policy_version_ref === undefined
        ? {}
        : { policy_version_ref: input.policy_version_ref }),
      ...(input.prerequisite_gate_refs === undefined
        ? {}
        : { prerequisite_gate_refs: input.prerequisite_gate_refs }),
      validation,
    }),
    validation,
  };
}
