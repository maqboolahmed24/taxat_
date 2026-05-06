import {
  buildAuthorityChainLayers as buildAccessAuthorityChainLayers,
} from "../../../backend-access/src/services/authority_chain_layer_builder.ts";
import type { AuthorityBoundaryReasoningOptions } from "../../../backend-access/src/services/authority_boundary_reasoning.ts";
import type { GovernedAuthorityLayerBoundaryContract } from "../../../backend-access/src/models/authority_layer_boundary_contract.ts";
import type { GovernanceAccessSimulationAuthorityChainLayerStack } from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";

export type BuildGovernanceAuthorityChainLayersInput =
  AuthorityBoundaryReasoningOptions & {
    authority_layer_boundary: GovernedAuthorityLayerBoundaryContract;
    includeAuthorityOfRecordLayer?: boolean;
  };

function isAuthorityOfRecordMaterial(input: BuildGovernanceAuthorityChainLayersInput) {
  return (
    input.includeAuthorityOfRecordLayer === true ||
    input.authority_layer_boundary.integration_capability === "AUTHORITY_INTEGRATED" ||
    input.authorityOfRecordOutcome !== undefined ||
    (input.authorityOfRecordState !== undefined &&
      input.authorityOfRecordState !== "NOT_APPLICABLE")
  );
}

export async function buildGovernanceAuthorityChainLayers(
  input: BuildGovernanceAuthorityChainLayersInput,
): Promise<GovernanceAccessSimulationAuthorityChainLayerStack> {
  const layers = await buildAccessAuthorityChainLayers(
    input.authority_layer_boundary,
    {
      ...(input.authorityOfRecordOutcome === undefined
        ? {}
        : { authorityOfRecordOutcome: input.authorityOfRecordOutcome }),
      ...(input.authorityOfRecordReasonCodes === undefined
        ? {}
        : { authorityOfRecordReasonCodes: input.authorityOfRecordReasonCodes }),
      ...(input.authorityOfRecordState === undefined
        ? {}
        : { authorityOfRecordState: input.authorityOfRecordState }),
      ...(input.tenantOperationalReasonCodes === undefined
        ? {}
        : { tenantOperationalReasonCodes: input.tenantOperationalReasonCodes }),
    },
  );
  return (
    isAuthorityOfRecordMaterial(input) ? layers : layers.slice(0, 4)
  ) as GovernanceAccessSimulationAuthorityChainLayerStack;
}
