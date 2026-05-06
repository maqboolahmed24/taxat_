import { expect, test } from "@playwright/test";

import {
  buildAuthorityBinding,
  buildAuthorityLayerBoundaryContract,
  buildAuthorityOperation,
} from "../../../packages/backend-authority/src/index.ts";

const base = {
  access_binding_hash: "hash.access.0135",
  authority_binding_ref: "authority-binding://binding-0135",
  authority_link_ref: "authority-link://0135",
  binding_lineage_ref: "authority-binding-lineage://0135",
  client_id: "client-0135",
  manifest_id: "manifest-0135",
  policy_snapshot_hash: "hash.policy.0135",
  tenant_id: "tenant-0135",
  token_binding_ref: "authority-token-binding://0135",
};

function periodicOperation(overrides = {}) {
  return buildAuthorityOperation({
    ...base,
    acting_party_ref: "client://0135",
    business_partitions: ["business-partition://itsa/2026-q1"],
    operation_family: "AUTH_SUBMIT_PERIODIC_UPDATE",
    operation_id: "operation-0135",
    requested_scope: ["quarterly_update", "prepare_submission", "submit"],
    runtime_scope: ["quarterly_update", "prepare_submission", "submit"],
    subject_ref: "client://0135",
    target_obligation_ref: "obligation://itsa/2026-q1",
    ...overrides,
  });
}

test("freezes canonical requested/runtime scope and partition-bound operation lineage", () => {
  const operation = periodicOperation();

  expect(operation.runtime_scope).toEqual(["quarterly_update", "prepare_submission", "submit"]);
  expect(operation.scope_execution_binding.executable_scope).toEqual(operation.runtime_scope);
  expect(operation.scope_execution_binding.executable_partition_scope_refs).toEqual(
    operation.business_partitions,
  );
  expect(operation.scope_execution_binding.access_binding_hash).toBe(operation.access_binding_hash);
});

test("rejects runtime scope widening and missing business partitions for live families", () => {
  expect(() =>
    periodicOperation({
      runtime_scope: ["quarterly_update", "prepare_submission", "submit", "amendment_submit"],
    }),
  ).toThrow(/runtime_scope/);

  expect(() => periodicOperation({ business_partitions: [] })).toThrow(/business_partitions/);
});

test("retains delegated acting lineage and blocks self-acting delegation leakage", () => {
  const delegatedBoundary = buildAuthorityLayerBoundaryContract({
    binding_scope_class: "AUTHORITY_OPERATION",
    client_delegation_state: "SATISFIED",
  });
  const delegated = periodicOperation({
    acting_party_ref: "agent://tax-adviser/0135",
    authority_layer_boundary: delegatedBoundary,
    delegation_grant_ref: "delegation-grant://0135",
  });
  expect(delegated.delegation_grant_ref).toBe("delegation-grant://0135");

  expect(() => periodicOperation({ delegation_grant_ref: "delegation-grant://leaked" })).toThrow(
    /self-acting/,
  );
});

test("seals token/client binding health and preflight token version without send-time mutation", () => {
  const binding = buildAuthorityBinding({
    ...base,
    authority_binding_id: "binding-0135",
    partition_scope_refs: ["business-partition://itsa/2026-q1"],
    subject_ref: "client://0135",
    acting_party_ref: "client://0135",
    token_version_ref: "authority-token-version://preflight-selected",
  });

  expect(binding.binding_health).toBe("HEALTHY");
  expect(binding.token_client_binding_state).toBe("BOUND");
  expect(binding.token_version_ref).toBe("authority-token-version://preflight-selected");

  expect(() =>
    buildAuthorityBinding({
      ...base,
      authority_binding_id: "binding-0135-mismatch",
      blocked_reason_codes: ["AUTHORITY_BINDING_CLIENT_BINDING_MISMATCH"],
      binding_health: "CLIENT_BINDING_MISMATCH",
      partition_scope_refs: ["business-partition://itsa/2026-q1"],
      token_client_binding_state: "BOUND",
    }),
  ).toThrow(/MISMATCH/);
});
