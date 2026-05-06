import type { AuthorizationDecisionRecord } from "../models/authorization_decision.ts";
import { LIVE_MUTATION_SCOPE_TOKENS } from "./principal_context_normalizer.ts";

export type MaskingProjectionTokenEvaluation = {
  active: boolean;
  blocked_reason_codes: string[];
  legal: boolean;
  masking_rules: string[];
};

export type MaskingProjectionTokenInput = {
  action_family: string;
  masked_variant_supported: boolean;
  masking_rules: string[];
  policy_decision: AuthorizationDecisionRecord["decision"];
  scope_token: string;
};

export class MaskingProjectionPolicy {
  evaluateToken(input: MaskingProjectionTokenInput): MaskingProjectionTokenEvaluation {
    const active = input.policy_decision === "ALLOW_MASKED";
    if (!active) {
      return {
        active: false,
        legal: true,
        masking_rules: [],
        blocked_reason_codes: [],
      };
    }

    if (!input.masked_variant_supported) {
      return {
        active: true,
        legal: false,
        masking_rules: [],
        blocked_reason_codes: [],
      };
    }

    if (LIVE_MUTATION_SCOPE_TOKENS.has(input.scope_token)) {
      return {
        active: true,
        legal: false,
        masking_rules: [...input.masking_rules],
        blocked_reason_codes: [],
      };
    }

    return {
      active: true,
      legal: true,
      masking_rules: [...input.masking_rules],
      blocked_reason_codes: [],
    };
  }
}
