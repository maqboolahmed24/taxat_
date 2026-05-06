import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sortSetLikeStrings } from "../../../domain-kernel/src/primitives/hash.ts";
import type { PrincipalAccessViewChainLayerOutcome } from "../../../generated-models/src/generated/typescript/authority-and-access.ts";

import type {
  AuthorityBoundaryAuthorityLinkState,
  AuthorityBoundaryClientDelegationState,
  AuthorityBoundaryHumanGateResolutionState,
  AuthorityBoundaryTenantPermissionState,
  GovernedAuthorityLayerBoundaryContract,
} from "../models/authority_layer_boundary_contract.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const rulesPath = path.join(
  repoRoot,
  "config",
  "access",
  "authority_layer_interpretation_rules.json",
);

type StateRuleEntry = {
  summary: string;
  reason_codes: string[];
};

export type AuthorityOfRecordState =
  | "NOT_APPLICABLE"
  | "NOT_EVALUATED"
  | "CONFLICT_UNCERTAIN"
  | "CONFIRMED";

export type AuthorityLayerInterpretationRules = {
  contract_version: "AUTHORITY_LAYER_INTERPRETATION_RULES_V1";
  basis_statement: string;
  session_authn: {
    ACCEPTED: StateRuleEntry;
    STEP_UP_PENDING: StateRuleEntry;
    STEP_UP_FROZEN: StateRuleEntry;
  };
  tenant_permission_state: Record<AuthorityBoundaryTenantPermissionState, StateRuleEntry>;
  client_delegation_state: Record<AuthorityBoundaryClientDelegationState, StateRuleEntry>;
  authority_link_state: Record<AuthorityBoundaryAuthorityLinkState, StateRuleEntry>;
  human_gate_resolution_state: Record<AuthorityBoundaryHumanGateResolutionState, StateRuleEntry>;
  authority_of_record_state: Record<
    AuthorityOfRecordState,
    StateRuleEntry & { layer_outcome: PrincipalAccessViewChainLayerOutcome }
  >;
};

export type AuthorityBoundaryReasoningLayer = {
  outcome: PrincipalAccessViewChainLayerOutcome;
  reason_codes: string[];
  summary: string;
};

export type AuthorityBoundaryReasoning = {
  session_authn: AuthorityBoundaryReasoningLayer;
  tenant_operational_authority: AuthorityBoundaryReasoningLayer;
  client_delegation_coverage: AuthorityBoundaryReasoningLayer;
  external_authority_link_readiness: AuthorityBoundaryReasoningLayer;
  authority_of_record_outcome: AuthorityBoundaryReasoningLayer;
  flattened_reason_codes: string[];
};

export type AuthorityBoundaryReasoningOptions = {
  sessionAuthnReasonCodes?: string[];
  tenantOperationalReasonCodes?: string[];
  clientDelegationReasonCodes?: string[];
  externalAuthorityLinkReasonCodes?: string[];
  authorityOfRecordOutcome?: PrincipalAccessViewChainLayerOutcome;
  authorityOfRecordReasonCodes?: string[];
  authorityOfRecordState?: AuthorityOfRecordState;
};

let cachedRules: Promise<AuthorityLayerInterpretationRules> | null = null;

function canonicalReasonCodes(values: readonly string[]) {
  return sortSetLikeStrings(
    values
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  );
}

function outcomeFromTenantBoundary(
  contract: GovernedAuthorityLayerBoundaryContract,
): PrincipalAccessViewChainLayerOutcome {
  if (contract.tenant_permission_state === "DENIED") {
    return "DENY";
  }
  if (contract.tenant_permission_state === "MASKED") {
    return "ALLOW_MASKED";
  }
  if (
    (contract.human_gate_requirement === "REQUIRE_APPROVAL" ||
      contract.human_gate_requirement === "REQUIRE_STEP_UP_AND_APPROVAL") &&
    contract.human_gate_resolution_state !== "EVIDENCE_FROZEN"
  ) {
    return "REQUIRE_APPROVAL";
  }
  if (
    (contract.human_gate_requirement === "REQUIRE_STEP_UP" ||
      contract.human_gate_requirement === "REQUIRE_STEP_UP_AND_APPROVAL") &&
    contract.human_gate_resolution_state !== "EVIDENCE_FROZEN"
  ) {
    return "REQUIRE_STEP_UP";
  }
  return "ALLOW";
}

function outcomeFromDelegationState(
  state: AuthorityBoundaryClientDelegationState,
): PrincipalAccessViewChainLayerOutcome {
  return state === "MISSING" || state === "EXPIRED" ? "DENY" : "ALLOW";
}

function outcomeFromAuthorityLinkState(
  state: AuthorityBoundaryAuthorityLinkState,
): PrincipalAccessViewChainLayerOutcome {
  if (state === "NOT_REQUIRED") {
    return "NOT_APPLICABLE";
  }
  if (state === "AUTHORISED_ACTIVE" || state === "AUTHORISED_LIMITED") {
    return "ALLOW";
  }
  return "DENY";
}

export async function loadAuthorityLayerInterpretationRules(options?: {
  reload?: boolean;
}) {
  if (!cachedRules || options?.reload) {
    cachedRules = readFile(rulesPath, "utf8").then((raw) => {
      const parsed = JSON.parse(raw) as AuthorityLayerInterpretationRules;
      if (parsed.contract_version !== "AUTHORITY_LAYER_INTERPRETATION_RULES_V1") {
        throw new Error("Unexpected authority layer interpretation rules version.");
      }
      return parsed;
    });
  }
  return cachedRules;
}

export async function deriveAuthorityBoundaryReasoning(
  contract: GovernedAuthorityLayerBoundaryContract,
  options: AuthorityBoundaryReasoningOptions = {},
) {
  const rules = await loadAuthorityLayerInterpretationRules();

  const sessionRuleKey =
    (contract.human_gate_requirement === "REQUIRE_STEP_UP" ||
      contract.human_gate_requirement === "REQUIRE_STEP_UP_AND_APPROVAL") &&
    contract.human_gate_resolution_state !== "EVIDENCE_FROZEN"
      ? "STEP_UP_PENDING"
      : (contract.human_gate_requirement === "REQUIRE_STEP_UP" ||
            contract.human_gate_requirement === "REQUIRE_STEP_UP_AND_APPROVAL") &&
          contract.human_gate_resolution_state === "EVIDENCE_FROZEN"
        ? "STEP_UP_FROZEN"
        : "ACCEPTED";

  const sessionRule = rules.session_authn[sessionRuleKey];
  const tenantRule = rules.tenant_permission_state[contract.tenant_permission_state];
  const delegationRule = rules.client_delegation_state[contract.client_delegation_state];
  const authorityLinkRule = rules.authority_link_state[contract.authority_link_state];
  const humanGateRule =
    rules.human_gate_resolution_state[contract.human_gate_resolution_state];
  const authorityOfRecordRule =
    rules.authority_of_record_state[
      options.authorityOfRecordState ??
        (contract.integration_capability === "AUTHORITY_INTEGRATED"
          ? "NOT_EVALUATED"
          : "NOT_APPLICABLE")
    ];

  const tenantReasonCodes =
    options.tenantOperationalReasonCodes && options.tenantOperationalReasonCodes.length > 0
      ? canonicalReasonCodes(options.tenantOperationalReasonCodes)
      : canonicalReasonCodes(
          tenantRule.reason_codes.concat(
            contract.human_gate_requirement === "NOT_REQUIRED"
              ? []
              : humanGateRule.reason_codes,
          ),
        );

  const sessionReasonCodes =
    options.sessionAuthnReasonCodes && options.sessionAuthnReasonCodes.length > 0
      ? canonicalReasonCodes(options.sessionAuthnReasonCodes)
      : canonicalReasonCodes(sessionRule.reason_codes);

  const delegationReasonCodes =
    options.clientDelegationReasonCodes && options.clientDelegationReasonCodes.length > 0
      ? canonicalReasonCodes(options.clientDelegationReasonCodes)
      : canonicalReasonCodes(delegationRule.reason_codes);

  const authorityLinkReasonCodes =
    options.externalAuthorityLinkReasonCodes &&
    options.externalAuthorityLinkReasonCodes.length > 0
      ? canonicalReasonCodes(options.externalAuthorityLinkReasonCodes)
      : canonicalReasonCodes(authorityLinkRule.reason_codes);

  const authorityOfRecordReasonCodes =
    options.authorityOfRecordReasonCodes &&
    options.authorityOfRecordReasonCodes.length > 0
      ? canonicalReasonCodes(options.authorityOfRecordReasonCodes)
      : canonicalReasonCodes(authorityOfRecordRule.reason_codes);

  return {
    session_authn: {
      outcome: sessionRuleKey === "STEP_UP_PENDING" ? "REQUIRE_STEP_UP" : "ALLOW",
      reason_codes: sessionReasonCodes,
      summary: sessionRule.summary,
    },
    tenant_operational_authority: {
      outcome: outcomeFromTenantBoundary(contract),
      reason_codes: tenantReasonCodes,
      summary: tenantRule.summary,
    },
    client_delegation_coverage: {
      outcome: outcomeFromDelegationState(contract.client_delegation_state),
      reason_codes: delegationReasonCodes,
      summary: delegationRule.summary,
    },
    external_authority_link_readiness: {
      outcome: outcomeFromAuthorityLinkState(contract.authority_link_state),
      reason_codes: authorityLinkReasonCodes,
      summary: authorityLinkRule.summary,
    },
    authority_of_record_outcome: {
      outcome: options.authorityOfRecordOutcome ?? authorityOfRecordRule.layer_outcome,
      reason_codes: authorityOfRecordReasonCodes,
      summary: authorityOfRecordRule.summary,
    },
    flattened_reason_codes: canonicalReasonCodes([
      ...sessionReasonCodes,
      ...tenantReasonCodes,
      ...delegationReasonCodes,
      ...authorityLinkReasonCodes,
      ...authorityOfRecordReasonCodes,
    ]),
  } satisfies AuthorityBoundaryReasoning;
}
