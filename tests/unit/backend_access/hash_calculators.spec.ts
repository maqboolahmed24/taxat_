import { expect, test } from "@playwright/test";

import {
  buildAuthorizationDecisionAccessBindingHash,
  buildCanonicalHashVector,
  buildDependencyTopologyHash,
  buildPrincipalContextAccessBindingHash,
  buildSimulationBasisHash,
  buildScopeExecutionBindingAccessBindingHash,
  canonicalJsonStringify,
  backendAccessHashVectorFixtures,
  governanceAuthorizationDecisionFixture,
  governanceMutationBasisContractFixture,
  governanceMutationHazardContractFixture,
  principalContextAccessBindingFixture,
  scopeExecutionBindingFixture,
  dependencyTopologyFixture,
  simulationBasisFixture,
  allowAuthorizationDecisionFixture,
  HASH_VECTOR_FIXTURE_CATALOG_VERSION,
} from "../../../packages/backend-access/src/index.ts";

test("canonical serializer stays byte-stable across key-order drift and normalizes Date values", async () => {
  const first = buildCanonicalHashVector({
    nested: {
      when: new Date("2026-04-23T11:05:00Z"),
      state: "ACTIVE",
    },
    alpha: "value",
    count: 2,
  });
  const second = buildCanonicalHashVector({
    count: 2,
    alpha: "value",
    nested: {
      state: "ACTIVE",
      when: "2026-04-23T11:05:00Z",
    },
  });

  expect(first.serialized).toBe(second.serialized);
  expect(first.digest).toBe(second.digest);
  expect(first.serialized).toBe(
    '{"alpha":"value","count":2,"nested":{"state":"ACTIVE","when":"2026-04-23T11:05:00Z"}}',
  );
  expect(() => canonicalJsonStringify({ forbidden: undefined })).toThrow(
    /HASH_UNDEFINED_FORBIDDEN/,
  );
});

test("published hash vector fixtures remain stable", async () => {
  expect(HASH_VECTOR_FIXTURE_CATALOG_VERSION).toBe(
    "BACKEND_ACCESS_HASH_VECTOR_FIXTURES_V1",
  );

  expect(
    buildPrincipalContextAccessBindingHash(
      principalContextAccessBindingFixture.input,
    ),
  ).toBe(principalContextAccessBindingFixture.expected_digest);
  expect(
    buildAuthorizationDecisionAccessBindingHash(
      governanceAuthorizationDecisionFixture.input,
    ),
  ).toBe(governanceAuthorizationDecisionFixture.expected_digest);
  expect(
    buildAuthorizationDecisionAccessBindingHash(allowAuthorizationDecisionFixture.input),
  ).toBe(allowAuthorizationDecisionFixture.expected_digest);
  expect(
    buildScopeExecutionBindingAccessBindingHash(scopeExecutionBindingFixture.input),
  ).toBe(scopeExecutionBindingFixture.expected_digest);
  expect(
    buildDependencyTopologyHash(dependencyTopologyFixture.input),
  ).toBe(dependencyTopologyFixture.expected_digest);
  expect(buildSimulationBasisHash(simulationBasisFixture.input)).toBe(
    simulationBasisFixture.expected_digest,
  );
  expect(
    buildCanonicalHashVector(governanceMutationHazardContractFixture.vector).digest,
  ).toBe(governanceMutationHazardContractFixture.expected_digest);
  expect(
    buildCanonicalHashVector(governanceMutationBasisContractFixture.vector).digest,
  ).toBe(governanceMutationBasisContractFixture.expected_digest);
});

test("principal-context and scope-execution access bindings ignore set and scope ordering drift", async () => {
  const reorderedPrincipal = {
    ...principalContextAccessBindingFixture.input,
    effective_role_set: ["REVIEWER", "TENANT_ADMIN"],
    client_scope: ["client.taxpayer.001"],
    requested_scope: ["prepare_submission", "submit", "year_end"],
    partition_scope_refs: ["partition.uk.vat", "period.2026-Q1"],
    delegation_snapshot_refs: [
      "delegation.snapshot.001",
      "delegation.snapshot.002",
    ],
    authority_link_refs: ["authority.link.001", "authority.link.002"],
    authority_link_snapshot_refs: [
      "authority.snapshot.001",
      "authority.snapshot.002",
    ],
    approval_capabilities: ["SECURITY_TEAM", "TENANT_ADMIN"],
    client_portal_capabilities: ["REQUEST_ASSISTANCE_ON_BEHALF"],
    run_kind_capabilities: ["GOVERNANCE_SIMULATION", "TENANT_MUTATION_PREVIEW"],
  };
  const reorderedScopeBinding = {
    ...scopeExecutionBindingFixture.input,
    requested_scope: ["prepare_submission", "submit", "year_end"],
    executable_scope: ["prepare_submission", "year_end"],
    executable_partition_scope_refs: ["partition.uk.vat", "period.2026-Q1"],
  };

  expect(buildPrincipalContextAccessBindingHash(reorderedPrincipal)).toBe(
    principalContextAccessBindingFixture.expected_digest,
  );
  expect(buildScopeExecutionBindingAccessBindingHash(reorderedScopeBinding)).toBe(
    scopeExecutionBindingFixture.expected_digest,
  );
});

test("governance authorization decisions bind topology and simulation basis drift", async () => {
  const topologyDrift = buildAuthorizationDecisionAccessBindingHash({
    ...governanceAuthorizationDecisionFixture.input,
    dependency_topology_hash:
      "ece6f1697e7232bf6e37e7ec4ae171aba471c536fd7cb27f2fd58a1e1b5f8bb0",
  });
  const basisDrift = buildAuthorizationDecisionAccessBindingHash({
    ...governanceAuthorizationDecisionFixture.input,
    simulation_basis_hash:
      "856bef4fd97756207e500437205cc5c31ebb81b5b7500338dac4b2d5904b8db0",
  });

  expect(
    buildAuthorizationDecisionAccessBindingHash(
      governanceAuthorizationDecisionFixture.input,
    ),
  ).toBe(governanceAuthorizationDecisionFixture.expected_digest);
  expect(topologyDrift).not.toBe(
    governanceAuthorizationDecisionFixture.expected_digest,
  );
  expect(basisDrift).not.toBe(
    governanceAuthorizationDecisionFixture.expected_digest,
  );
});

test("non-governance authorization decisions keep null topology and basis fields explicit", async () => {
  expect(allowAuthorizationDecisionFixture.vector.dependency_topology_hash).toBeNull();
  expect(allowAuthorizationDecisionFixture.vector.simulation_basis_hash).toBeNull();
  expect(
    allowAuthorizationDecisionFixture.serialized_vector.includes(
      '"dependency_topology_hash":null',
    ),
  ).toBe(true);
  expect(
    allowAuthorizationDecisionFixture.serialized_vector.includes(
      '"simulation_basis_hash":null',
    ),
  ).toBe(true);
});

test("dependency topology and simulation basis hashes fail open only on true lineage drift", async () => {
  const driftedTopologyHash = buildDependencyTopologyHash({
    ...dependencyTopologyFixture.input,
    nodes: dependencyTopologyFixture.input.nodes.map((node) =>
      node.node_ref === "policy.rule.200"
        ? { ...node, version_ref: "policy.rule.version.201" }
        : node,
    ),
  });
  const reorderedApproverScopeHash = buildSimulationBasisHash({
    ...simulationBasisFixture.input,
    requested_approver_scope: ["SECURITY_TEAM", "TENANT_ADMIN"],
  });
  const widenedApproverScopeHash = buildSimulationBasisHash({
    ...simulationBasisFixture.input,
    requested_approver_scope: ["SECURITY_TEAM", "TENANT_ADMIN", "CHANGE_BOARD"],
  });

  expect(driftedTopologyHash).not.toBe(dependencyTopologyFixture.expected_digest);
  expect(reorderedApproverScopeHash).toBe(simulationBasisFixture.expected_digest);
  expect(widenedApproverScopeHash).not.toBe(
    simulationBasisFixture.expected_digest,
  );
});
