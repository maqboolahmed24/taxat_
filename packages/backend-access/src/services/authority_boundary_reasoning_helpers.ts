import type { GovernedAuthorityLayerBoundaryContract } from "../models/authority_layer_boundary_contract.ts";
import {
  deriveAuthorityBoundaryReasoning,
  type AuthorityBoundaryReasoning,
  type AuthorityBoundaryReasoningOptions,
} from "./authority_boundary_reasoning.ts";

export async function explainAuthorityLayerBoundary(
  contract: GovernedAuthorityLayerBoundaryContract,
  options: AuthorityBoundaryReasoningOptions = {},
) {
  const reasoning = await deriveAuthorityBoundaryReasoning(contract, options);
  return {
    summary: [
      reasoning.session_authn.summary,
      reasoning.tenant_operational_authority.summary,
      reasoning.client_delegation_coverage.summary,
      reasoning.external_authority_link_readiness.summary,
      reasoning.authority_of_record_outcome.summary,
    ].join(" "),
    layers: reasoning,
  } satisfies { summary: string; layers: AuthorityBoundaryReasoning };
}

