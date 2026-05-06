import { expect, test } from "@playwright/test";

import {
  buildAuthorityLayerBoundaryContract,
  type AuthorityLayerBoundaryContractInput,
} from "../../../packages/backend-access/src/models/authority_layer_boundary_contract.ts";
import {
  AuthorityBoundaryValidationError,
  assertValidAuthorityLayerBoundaryContract,
  validateAuthorityLayerBoundaryContract,
} from "../../../packages/backend-access/src/services/authority_boundary_validator.ts";

function makeBoundary(
  overrides: Partial<AuthorityLayerBoundaryContractInput> = {},
) {
  return buildAuthorityLayerBoundaryContract({
    binding_scope_class: "AUTHORIZATION_DECISION",
    integration_capability: "AUTHORITY_INTEGRATED",
    active_principal_class: "HUMAN",
    tenant_permission_state: "SATISFIED",
    client_delegation_state: "SATISFIED",
    delegation_basis: "CLIENT_GRANTED",
    delegation_freshness_state: "NOT_APPLICABLE",
    authority_link_state: "AUTHORISED_ACTIVE",
    exceptional_authority_state: "NOT_APPLICABLE",
    human_gate_requirement: "NOT_REQUIRED",
    human_gate_resolution_state: "NOT_REQUIRED",
    ...overrides,
  });
}

test("valid authority-integrated boundary passes the schema guard", async () => {
  const boundary = makeBoundary();
  expect(validateAuthorityLayerBoundaryContract(boundary)).toEqual([]);
});

test("internal-only posture rejects explicit delegation and authority-link layers", async () => {
  const issues = validateAuthorityLayerBoundaryContract(
    makeBoundary({
      integration_capability: "INTERNAL_ONLY",
      client_delegation_state: "SATISFIED",
      authority_link_state: "AUTHORISED_ACTIVE",
    }),
  );
  expect(issues.map((issue) => issue.field)).toEqual(
    expect.arrayContaining(["client_delegation_state", "authority_link_state"]),
  );
});

test("service principal cannot claim frozen human-gate satisfaction", async () => {
  expect(() =>
    assertValidAuthorityLayerBoundaryContract(
      makeBoundary({
        active_principal_class: "SERVICE",
        client_delegation_state: "NOT_REQUIRED",
        delegation_basis: "TENANT_INTERNAL",
        human_gate_requirement: "REQUIRE_STEP_UP",
        human_gate_resolution_state: "EVIDENCE_FROZEN",
      }),
    ),
  ).toThrowError(AuthorityBoundaryValidationError);
});

test("imported delegation requires explicit freshness posture", async () => {
  const issues = validateAuthorityLayerBoundaryContract(
    makeBoundary({
      delegation_basis: "SELF_ASSESSMENT_IMPORTED",
      delegation_freshness_state: "NOT_APPLICABLE",
    }),
  );
  expect(issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        field: "delegation_freshness_state",
      }),
    ]),
  );
});

test("bounded exceptional authority requires frozen evidence", async () => {
  const issues = validateAuthorityLayerBoundaryContract(
    makeBoundary({
      exceptional_authority_state: "BOUNDED_INTERNAL_EXCEPTION",
      human_gate_requirement: "REQUIRE_APPROVAL",
      human_gate_resolution_state: "PENDING_EVIDENCE",
    }),
  );
  expect(issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        field: "exceptional_authority_state",
      }),
    ]),
  );
});

test("sendable authority artifacts fail closed without live delegation, live link, and frozen evidence", async () => {
  const issues = validateAuthorityLayerBoundaryContract(
    makeBoundary({
      binding_scope_class: "AUTHORITY_REQUEST_ENVELOPE",
      client_delegation_state: "EXPIRED",
      authority_link_state: "TOKEN_INVALID",
      human_gate_requirement: "REQUIRE_STEP_UP",
      human_gate_resolution_state: "PENDING_EVIDENCE",
    }),
  );
  expect(issues.map((issue) => issue.field)).toEqual(
    expect.arrayContaining([
      "client_delegation_state",
      "authority_link_state",
      "human_gate_resolution_state",
    ]),
  );
});

