import {
  AUTHORITY_LAYER_BOUNDARY_AUTHORITY_LINK_STATES,
  AUTHORITY_LAYER_BOUNDARY_CLIENT_DELEGATION_STATES,
  AUTHORITY_LAYER_BOUNDARY_DELEGATION_BASES,
  AUTHORITY_LAYER_BOUNDARY_DELEGATION_FRESHNESS_STATES,
  AUTHORITY_LAYER_BOUNDARY_EXCEPTIONAL_AUTHORITY_STATES,
  AUTHORITY_LAYER_BOUNDARY_HUMAN_GATE_REQUIREMENTS,
  AUTHORITY_LAYER_BOUNDARY_HUMAN_GATE_RESOLUTION_STATES,
  AUTHORITY_LAYER_BOUNDARY_INTEGRATION_CAPABILITIES,
  AUTHORITY_LAYER_BOUNDARY_LIVE_DELEGATION_STATES,
  AUTHORITY_LAYER_BOUNDARY_POLICY_FIELDS,
  AUTHORITY_LAYER_BOUNDARY_PRINCIPAL_CLASSES,
  AUTHORITY_LAYER_BOUNDARY_PROHIBITED_ESCALATIONS,
  AUTHORITY_LAYER_BOUNDARY_SCOPE_CLASSES,
  AUTHORITY_LAYER_BOUNDARY_SENDABLE_SCOPE_CLASSES,
  AUTHORITY_LAYER_BOUNDARY_TENANT_PERMISSION_STATES,
  AUTHORITY_LAYER_BOUNDARY_VERSION,
  type AuthorityBoundaryBindingScopeClass,
  type AuthorityBoundaryIntegrationCapability,
  type GovernedAuthorityLayerBoundaryContract,
} from "../models/authority_layer_boundary_contract.ts";

export type AuthorityBoundaryValidationIssue = {
  code:
    | "AUTHORITY_BOUNDARY_ENUM_INVALID"
    | "AUTHORITY_BOUNDARY_EXPECTATION_MISMATCH"
    | "AUTHORITY_BOUNDARY_POLICY_DRIFT"
    | "AUTHORITY_BOUNDARY_REQUIRED"
    | "AUTHORITY_BOUNDARY_SCHEMA_GUARD"
    | "AUTHORITY_BOUNDARY_SHAPE_INVALID";
  detail: string;
  field: string;
};

export class AuthorityBoundaryValidationError extends Error {
  readonly issues: readonly AuthorityBoundaryValidationIssue[];

  constructor(issues: AuthorityBoundaryValidationIssue[]) {
    super(issues.map((issue) => `${issue.field}: ${issue.detail}`).join("; "));
    this.name = "AuthorityBoundaryValidationError";
    this.issues = issues;
  }
}

export type AuthorityBoundaryValidationOptions = {
  expectedBindingScopeClass?: AuthorityBoundaryBindingScopeClass;
  expectedIntegrationCapability?: AuthorityBoundaryIntegrationCapability;
};

type BoundaryShape = Record<string, unknown>;

const allowedFieldNames = new Set<string>([
  "contract_version",
  "binding_scope_class",
  "integration_capability",
  "active_principal_class",
  "tenant_permission_state",
  "client_delegation_state",
  "delegation_basis",
  "delegation_freshness_state",
  "authority_link_state",
  "exceptional_authority_state",
  "human_gate_requirement",
  "human_gate_resolution_state",
  ...Object.keys(AUTHORITY_LAYER_BOUNDARY_POLICY_FIELDS),
  ...Object.keys(AUTHORITY_LAYER_BOUNDARY_PROHIBITED_ESCALATIONS),
]);
const sendableScopeClasses = new Set<string>(AUTHORITY_LAYER_BOUNDARY_SENDABLE_SCOPE_CLASSES);

function pushIssue(
  issues: AuthorityBoundaryValidationIssue[],
  code: AuthorityBoundaryValidationIssue["code"],
  field: string,
  detail: string,
) {
  issues.push({ code, field, detail });
}

function isRecord(value: unknown): value is BoundaryShape {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function expectEnumValue(
  issues: AuthorityBoundaryValidationIssue[],
  field: string,
  value: unknown,
  allowedValues: readonly string[],
) {
  if (typeof value !== "string" || !allowedValues.includes(value)) {
    pushIssue(
      issues,
      "AUTHORITY_BOUNDARY_ENUM_INVALID",
      field,
      `must be one of ${allowedValues.join(", ")}`,
    );
  }
}

export function validateAuthorityLayerBoundaryContract(
  contract: unknown,
  options: AuthorityBoundaryValidationOptions = {},
) {
  const issues: AuthorityBoundaryValidationIssue[] = [];
  if (!isRecord(contract)) {
    pushIssue(
      issues,
      "AUTHORITY_BOUNDARY_SHAPE_INVALID",
      "authority_layer_boundary",
      "must be a structured authority-layer boundary contract",
    );
    return issues;
  }

  const candidate = contract;
  for (const field of Object.keys(candidate)) {
    if (!allowedFieldNames.has(field)) {
      pushIssue(
        issues,
        "AUTHORITY_BOUNDARY_SCHEMA_GUARD",
        field,
        "is not allowed by authority_layer_boundary_contract.schema.json",
      );
    }
  }

  if (candidate.contract_version !== AUTHORITY_LAYER_BOUNDARY_VERSION) {
    pushIssue(
      issues,
      "AUTHORITY_BOUNDARY_REQUIRED",
      "contract_version",
      `must stay ${AUTHORITY_LAYER_BOUNDARY_VERSION}`,
    );
  }

  expectEnumValue(
    issues,
    "binding_scope_class",
    candidate.binding_scope_class,
    AUTHORITY_LAYER_BOUNDARY_SCOPE_CLASSES,
  );
  expectEnumValue(
    issues,
    "integration_capability",
    candidate.integration_capability,
    AUTHORITY_LAYER_BOUNDARY_INTEGRATION_CAPABILITIES,
  );
  expectEnumValue(
    issues,
    "active_principal_class",
    candidate.active_principal_class,
    AUTHORITY_LAYER_BOUNDARY_PRINCIPAL_CLASSES,
  );
  expectEnumValue(
    issues,
    "tenant_permission_state",
    candidate.tenant_permission_state,
    AUTHORITY_LAYER_BOUNDARY_TENANT_PERMISSION_STATES,
  );
  expectEnumValue(
    issues,
    "client_delegation_state",
    candidate.client_delegation_state,
    AUTHORITY_LAYER_BOUNDARY_CLIENT_DELEGATION_STATES,
  );
  expectEnumValue(
    issues,
    "delegation_basis",
    candidate.delegation_basis,
    AUTHORITY_LAYER_BOUNDARY_DELEGATION_BASES,
  );
  expectEnumValue(
    issues,
    "delegation_freshness_state",
    candidate.delegation_freshness_state,
    AUTHORITY_LAYER_BOUNDARY_DELEGATION_FRESHNESS_STATES,
  );
  expectEnumValue(
    issues,
    "authority_link_state",
    candidate.authority_link_state,
    AUTHORITY_LAYER_BOUNDARY_AUTHORITY_LINK_STATES,
  );
  expectEnumValue(
    issues,
    "exceptional_authority_state",
    candidate.exceptional_authority_state,
    AUTHORITY_LAYER_BOUNDARY_EXCEPTIONAL_AUTHORITY_STATES,
  );
  expectEnumValue(
    issues,
    "human_gate_requirement",
    candidate.human_gate_requirement,
    AUTHORITY_LAYER_BOUNDARY_HUMAN_GATE_REQUIREMENTS,
  );
  expectEnumValue(
    issues,
    "human_gate_resolution_state",
    candidate.human_gate_resolution_state,
    AUTHORITY_LAYER_BOUNDARY_HUMAN_GATE_RESOLUTION_STATES,
  );

  if (
    options.expectedBindingScopeClass &&
    candidate.binding_scope_class !== options.expectedBindingScopeClass
  ) {
    pushIssue(
      issues,
      "AUTHORITY_BOUNDARY_EXPECTATION_MISMATCH",
      "binding_scope_class",
      `must stay ${options.expectedBindingScopeClass}`,
    );
  }
  if (
    options.expectedIntegrationCapability &&
    candidate.integration_capability !== options.expectedIntegrationCapability
  ) {
    pushIssue(
      issues,
      "AUTHORITY_BOUNDARY_EXPECTATION_MISMATCH",
      "integration_capability",
      `must stay ${options.expectedIntegrationCapability}`,
    );
  }

  for (const [field, expectedValue] of Object.entries(
    AUTHORITY_LAYER_BOUNDARY_POLICY_FIELDS,
  )) {
    if (candidate[field] !== expectedValue) {
      pushIssue(
        issues,
        "AUTHORITY_BOUNDARY_POLICY_DRIFT",
        field,
        `must stay ${expectedValue}`,
      );
    }
  }

  for (const [field, expectedValue] of Object.entries(
    AUTHORITY_LAYER_BOUNDARY_PROHIBITED_ESCALATIONS,
  )) {
    if (candidate[field] !== expectedValue) {
      pushIssue(
        issues,
        "AUTHORITY_BOUNDARY_POLICY_DRIFT",
        field,
        "must stay false",
      );
    }
  }

  const activePrincipalClass = candidate.active_principal_class;
  const clientDelegationState = candidate.client_delegation_state;
  const delegationBasis = candidate.delegation_basis;
  const delegationFreshnessState = candidate.delegation_freshness_state;
  const authorityLinkState = candidate.authority_link_state;
  const exceptionalAuthorityState = candidate.exceptional_authority_state;
  const humanGateRequirement = candidate.human_gate_requirement;
  const humanGateResolutionState = candidate.human_gate_resolution_state;
  const integrationCapability = candidate.integration_capability;
  const bindingScopeClass = candidate.binding_scope_class;

  if (
    humanGateRequirement === "NOT_REQUIRED" &&
    humanGateResolutionState !== "NOT_REQUIRED"
  ) {
    pushIssue(
      issues,
      "AUTHORITY_BOUNDARY_SCHEMA_GUARD",
      "human_gate_resolution_state",
      "must stay NOT_REQUIRED when no human gate is required",
    );
  }

  if (
    humanGateRequirement !== "NOT_REQUIRED" &&
    !["PENDING_EVIDENCE", "EVIDENCE_FROZEN"].includes(
      String(humanGateResolutionState),
    )
  ) {
    pushIssue(
      issues,
      "AUTHORITY_BOUNDARY_SCHEMA_GUARD",
      "human_gate_resolution_state",
      "must stay PENDING_EVIDENCE or EVIDENCE_FROZEN when a human gate is required",
    );
  }

  if (
    activePrincipalClass === "SERVICE" &&
    humanGateResolutionState === "EVIDENCE_FROZEN"
  ) {
    pushIssue(
      issues,
      "AUTHORITY_BOUNDARY_SCHEMA_GUARD",
      "human_gate_resolution_state",
      "must not serialize a service principal as having satisfied a human gate",
    );
  }

  if (
    activePrincipalClass === "SERVICE" &&
    !["TENANT_INTERNAL", "SYSTEM_ASSIGNED"].includes(String(delegationBasis))
  ) {
    pushIssue(
      issues,
      "AUTHORITY_BOUNDARY_SCHEMA_GUARD",
      "delegation_basis",
      "service principals must use TENANT_INTERNAL or SYSTEM_ASSIGNED delegation basis",
    );
  }

  if (
    clientDelegationState === "NOT_REQUIRED" &&
    !["SELF_ACTING", "TENANT_INTERNAL", "SYSTEM_ASSIGNED"].includes(
      String(delegationBasis),
    )
  ) {
    pushIssue(
      issues,
      "AUTHORITY_BOUNDARY_SCHEMA_GUARD",
      "delegation_basis",
      "must stay SELF_ACTING, TENANT_INTERNAL, or SYSTEM_ASSIGNED when client delegation is not required",
    );
  }

  if (
    ["SATISFIED", "LIMITED", "MISSING", "EXPIRED"].includes(
      String(clientDelegationState),
    ) &&
    !["CLIENT_GRANTED", "SELF_ASSESSMENT_IMPORTED", "DIGITAL_HANDSHAKE"].includes(
      String(delegationBasis),
    )
  ) {
    pushIssue(
      issues,
      "AUTHORITY_BOUNDARY_SCHEMA_GUARD",
      "delegation_basis",
      "must stay CLIENT_GRANTED, SELF_ASSESSMENT_IMPORTED, or DIGITAL_HANDSHAKE when delegation posture is explicit",
    );
  }

  if (
    ["SELF_ASSESSMENT_IMPORTED", "DIGITAL_HANDSHAKE"].includes(
      String(delegationBasis),
    )
  ) {
    if (
      !["CURRENT", "REVALIDATION_REQUIRED"].includes(
        String(delegationFreshnessState),
      )
    ) {
      pushIssue(
        issues,
        "AUTHORITY_BOUNDARY_SCHEMA_GUARD",
        "delegation_freshness_state",
        "must stay CURRENT or REVALIDATION_REQUIRED for imported or handshake delegation",
      );
    }
  } else if (delegationFreshnessState !== "NOT_APPLICABLE") {
    pushIssue(
      issues,
      "AUTHORITY_BOUNDARY_SCHEMA_GUARD",
      "delegation_freshness_state",
      "must stay NOT_APPLICABLE for non-imported delegation bases",
    );
  }

  if (integrationCapability === "INTERNAL_ONLY") {
    if (clientDelegationState !== "NOT_REQUIRED") {
      pushIssue(
        issues,
        "AUTHORITY_BOUNDARY_SCHEMA_GUARD",
        "client_delegation_state",
        "must stay NOT_REQUIRED for internal-only posture",
      );
    }
    if (authorityLinkState !== "NOT_REQUIRED") {
      pushIssue(
        issues,
        "AUTHORITY_BOUNDARY_SCHEMA_GUARD",
        "authority_link_state",
        "must stay NOT_REQUIRED for internal-only posture",
      );
    }
  }

  if (
    integrationCapability === "AUTHORITY_INTEGRATED" &&
    authorityLinkState === "NOT_REQUIRED"
  ) {
    pushIssue(
      issues,
      "AUTHORITY_BOUNDARY_SCHEMA_GUARD",
      "authority_link_state",
      "must stay explicit for authority-integrated posture",
    );
  }

  if (
    exceptionalAuthorityState === "BOUNDED_INTERNAL_EXCEPTION" &&
    humanGateResolutionState !== "EVIDENCE_FROZEN"
  ) {
    pushIssue(
      issues,
      "AUTHORITY_BOUNDARY_SCHEMA_GUARD",
      "exceptional_authority_state",
      "must not mark exceptional authority active before approving human evidence is frozen",
    );
  }

  if (
    typeof bindingScopeClass === "string" &&
    sendableScopeClasses.has(bindingScopeClass)
  ) {
    if (candidate.tenant_permission_state !== "SATISFIED") {
      pushIssue(
        issues,
        "AUTHORITY_BOUNDARY_SCHEMA_GUARD",
        "tenant_permission_state",
        "must stay SATISFIED for sendable authority artifacts",
      );
    }
    if (
      humanGateRequirement !== "NOT_REQUIRED" &&
      humanGateResolutionState !== "EVIDENCE_FROZEN"
    ) {
      pushIssue(
        issues,
        "AUTHORITY_BOUNDARY_SCHEMA_GUARD",
        "human_gate_resolution_state",
        "must stay EVIDENCE_FROZEN for sendable authority artifacts with a human gate",
      );
    }
    if (
      activePrincipalClass === "SERVICE" &&
      humanGateRequirement !== "NOT_REQUIRED"
    ) {
      pushIssue(
        issues,
        "AUTHORITY_BOUNDARY_SCHEMA_GUARD",
        "active_principal_class",
        "must not let a service principal carry a satisfied human gate into a sendable authority artifact",
      );
    }
    if (
      !AUTHORITY_LAYER_BOUNDARY_LIVE_DELEGATION_STATES.includes(
        clientDelegationState as (typeof AUTHORITY_LAYER_BOUNDARY_LIVE_DELEGATION_STATES)[number],
      )
    ) {
      pushIssue(
        issues,
        "AUTHORITY_BOUNDARY_SCHEMA_GUARD",
        "client_delegation_state",
        "must stay live-usable for sendable authority artifacts",
      );
    }
    if (
      !["AUTHORISED_ACTIVE", "AUTHORISED_LIMITED"].includes(String(authorityLinkState))
    ) {
      pushIssue(
        issues,
        "AUTHORITY_BOUNDARY_SCHEMA_GUARD",
        "authority_link_state",
        "must stay AUTHORISED_ACTIVE or AUTHORISED_LIMITED for sendable authority artifacts",
      );
    }
  }

  return issues;
}

export function assertValidAuthorityLayerBoundaryContract(
  contract: unknown,
  options?: AuthorityBoundaryValidationOptions,
): asserts contract is GovernedAuthorityLayerBoundaryContract {
  const issues = validateAuthorityLayerBoundaryContract(contract, options);
  if (issues.length > 0) {
    throw new AuthorityBoundaryValidationError(issues);
  }
}
