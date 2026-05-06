import type { PrincipalAccessViewAuthorityChainLayerStack } from "../../../generated-models/src/generated/typescript/authority-and-access.ts";

import type { GovernedAuthorityLayerBoundaryContract } from "../models/authority_layer_boundary_contract.ts";
import {
  deriveAuthorityBoundaryReasoning,
  type AuthorityBoundaryReasoningOptions,
} from "./authority_boundary_reasoning.ts";

export async function buildAuthorityChainLayers(
  contract: GovernedAuthorityLayerBoundaryContract,
  options: AuthorityBoundaryReasoningOptions = {},
) {
  const reasoning = await deriveAuthorityBoundaryReasoning(contract, options);
  return [
    {
      layer_code: "SESSION_AUTHN_POSTURE",
      layer_outcome: reasoning.session_authn.outcome,
      reason_codes: reasoning.session_authn.reason_codes,
    },
    {
      layer_code: "TENANT_OPERATIONAL_AUTHORITY",
      layer_outcome: reasoning.tenant_operational_authority.outcome,
      reason_codes: reasoning.tenant_operational_authority.reason_codes,
    },
    {
      layer_code: "CLIENT_DELEGATION_COVERAGE",
      layer_outcome: reasoning.client_delegation_coverage.outcome,
      reason_codes: reasoning.client_delegation_coverage.reason_codes,
    },
    {
      layer_code: "EXTERNAL_AUTHORITY_LINK_READINESS",
      layer_outcome: reasoning.external_authority_link_readiness.outcome,
      reason_codes: reasoning.external_authority_link_readiness.reason_codes,
    },
    {
      layer_code: "AUTHORITY_OF_RECORD_OUTCOME",
      layer_outcome: reasoning.authority_of_record_outcome.outcome,
      reason_codes: reasoning.authority_of_record_outcome.reason_codes,
    },
  ] as PrincipalAccessViewAuthorityChainLayerStack;
}
