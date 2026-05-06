import type {
  PrincipalAccessViewActionMatrixCell,
  PrincipalAccessViewChainLayerOutcome,
} from "../../../generated-models/src/generated/typescript/authority-and-access.ts";

import type { GovernedAuthorityLayerBoundaryContract } from "../models/authority_layer_boundary_contract.ts";
import {
  buildAuthorityChainLayers,
} from "./authority_chain_layer_builder.ts";
import type { AuthorityOfRecordState } from "./authority_boundary_reasoning.ts";

export type BuildAuthorityChainStackInput = {
  authority_layer_boundary: GovernedAuthorityLayerBoundaryContract;
  authority_of_record_outcome?: PrincipalAccessViewChainLayerOutcome;
  authority_of_record_reason_codes?: string[];
  authority_of_record_state?: AuthorityOfRecordState;
};

export class AuthorityChainStackBuilder {
  async build(
    input: BuildAuthorityChainStackInput,
  ): Promise<PrincipalAccessViewActionMatrixCell["authority_chain_layers"]> {
    const layers = await buildAuthorityChainLayers(input.authority_layer_boundary, {
      ...(input.authority_of_record_outcome === undefined
        ? {}
        : { authorityOfRecordOutcome: input.authority_of_record_outcome }),
      ...(input.authority_of_record_reason_codes === undefined
        ? {}
        : { authorityOfRecordReasonCodes: input.authority_of_record_reason_codes }),
      ...(input.authority_of_record_state === undefined
        ? {}
        : { authorityOfRecordState: input.authority_of_record_state }),
    });
    const includeAuthorityOfRecordLayer =
      input.authority_layer_boundary.integration_capability === "AUTHORITY_INTEGRATED" ||
      input.authority_of_record_outcome !== undefined ||
      (input.authority_of_record_state !== undefined &&
        input.authority_of_record_state !== "NOT_APPLICABLE");
    return (includeAuthorityOfRecordLayer ? layers : layers.slice(0, 4)) as PrincipalAccessViewActionMatrixCell["authority_chain_layers"];
  }
}
