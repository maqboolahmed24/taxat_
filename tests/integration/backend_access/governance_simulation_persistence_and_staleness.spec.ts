import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  AuthorityLinkRepository,
  AuthorizeService,
  DelegationGrantRepository,
  ExceptionalAuthorityGrantRepository,
  GovernanceAccessSimulationRepository,
  GovernanceMutationSimulator,
  SimulationStalenessGuard,
  TenantRepository,
  loadAuthorizationPolicyRuntime,
  normalizePrincipalContextRecord,
} from "../../../packages/backend-access/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const migrationPath = path.join(
  repoRoot,
  "db",
  "migrations",
  "phase03_0004_governance_simulation_and_hazard_basis.sql",
);
const simulationProfileCatalogPath = path.join(
  repoRoot,
  "config",
  "governance",
  "simulation_profile_catalog.json",
);

async function validatePayloadAgainstSchema(schemaName: string, payload: unknown) {
  const script = `
import json
import pathlib
import sys

repo = pathlib.Path(sys.argv[1])
sys.path.insert(0, str(repo / "packages" / "contracts-core" / "python"))
from validate_contracts import (  # type: ignore
    CUSTOM_VALIDATORS,
    Draft202012Validator,
    build_registry,
    load_json,
)

schema_name = sys.argv[2]
payload = json.loads(sys.argv[3])
schema = load_json(repo / "packages" / "contracts-core" / "schemas" / schema_name)
validator = Draft202012Validator(
    schema,
    registry=build_registry(),
    format_checker=Draft202012Validator.FORMAT_CHECKER,
)
issues = [
    f"schema:<{'/'.join(map(str, error.absolute_path)) or '<root>'}>: {error.message}"
    for error in sorted(validator.iter_errors(payload), key=lambda error: list(error.absolute_path))
]
custom_validator = CUSTOM_VALIDATORS.get(schema_name.replace(".schema.json", ""))
if custom_validator:
    issues.extend(
        f"custom:{getattr(issue, 'location', 'inline')}: {getattr(issue, 'message', str(issue))}"
        for issue in custom_validator(payload, "inline")
    )
if issues:
    raise SystemExit("\\n".join(issues))
`;

  await execFileAsync(path.join(repoRoot, ".venv", "bin", "python3"), [
    "-c",
    script,
    repoRoot,
    schemaName,
    JSON.stringify(payload),
  ]);
}

async function buildPrincipalContext() {
  const runtime = await loadAuthorizationPolicyRuntime({ reload: true });
  return normalizePrincipalContextRecord({
    principal_id: "user.operator.integration.0091",
    principal_type: "HUMAN",
    effective_role_set: ["TENANT_ADMIN"],
    tenant_id: "tenant.taxat",
    client_scope: ["client.taxpayer.integration.0091"],
    requested_scope: ["year_end", "amendment_intent"],
    partition_scope_refs: ["partition.uk.vat", "period.2026-Q1"],
    authn_level: "STEP_UP",
    subject_identity_assurance_level: "STEP_UP_VERIFIED",
    session_id: "session.browser.integration.0091",
    service_identity_ref: null,
    delegation_basis: "SELF_ACTING",
    authorization_evaluated_at: "2026-04-23T10:00:00Z",
    policy_snapshot_hash: runtime.policy_snapshot_hash,
    delegation_snapshot_refs: [],
    authority_link_refs: [],
    authority_link_snapshot_refs: [],
    masking_scope: "TENANT_ADMIN_UNMASKED",
    approval_capabilities: ["CHANGE_BOARD", "DUAL_APPROVER", "SECURITY_TEAM", "TENANT_ADMIN"],
    client_portal_capabilities: [],
    run_kind_capabilities: ["GOVERNANCE_SIMULATION"],
  });
}

function buildAuthorizeService() {
  const tenantRepository = new TenantRepository();
  const delegationGrantRepository = new DelegationGrantRepository({
    tenantRepository,
  });
  const authorityLinkRepository = new AuthorityLinkRepository({
    tenantRepository,
    delegationGrantRepository,
  });
  const exceptionalAuthorityGrantRepository =
    new ExceptionalAuthorityGrantRepository({
      tenantRepository,
    });
  return new AuthorizeService({
    authorityLinkRepository,
    delegationGrantRepository,
    exceptionalAuthorityGrantRepository,
  });
}

test.describe.configure({ mode: "serial" });

test("migration and simulation profile catalog preserve the governance simulation lookup surface", async () => {
  const [migrationSql, simulationProfileCatalogRaw] = await Promise.all([
    readFile(migrationPath, "utf8"),
    readFile(simulationProfileCatalogPath, "utf8"),
  ]);
  const simulationProfileCatalog = JSON.parse(simulationProfileCatalogRaw) as {
    contract_version: string;
    profiles: Array<{ profile_ref: string }>;
  };

  expect(migrationSql).toContain(
    "CREATE TABLE IF NOT EXISTS control_access.governance_mutation_hazard_contract_register",
  );
  expect(migrationSql).toContain(
    "CREATE TABLE IF NOT EXISTS control_access.governance_mutation_basis_contract_register",
  );
  expect(migrationSql).toContain(
    "CREATE TABLE IF NOT EXISTS control_access.governance_access_simulation_register",
  );
  expect(migrationSql).toContain(
    "CREATE INDEX IF NOT EXISTS governance_access_simulation_simulation_basis_lookup",
  );
  expect(migrationSql).toContain("ENABLE ROW LEVEL SECURITY");
  expect(migrationSql).toContain("control_support.require_tenant_context()");

  expect(simulationProfileCatalog.contract_version).toBe(
    "GOVERNANCE_SIMULATION_PROFILE_CATALOG_V1",
  );
  expect(
    simulationProfileCatalog.profiles.some(
      (profile) => profile.profile_ref === "governance.profile.config_change.v1",
    ),
  ).toBe(true);
  expect(
    simulationProfileCatalog.profiles.some(
      (profile) => profile.profile_ref === "governance.profile.authority_link.v1",
    ),
  ).toBe(true);
});

test("governance simulations persist, validate, and stale-reject drifted commit bundles", async () => {
  const principal_context = await buildPrincipalContext();
  const repository = new GovernanceAccessSimulationRepository();
  const simulator = new GovernanceMutationSimulator({
    authorizeService: buildAuthorizeService(),
    governanceAccessSimulationRepository: repository,
  });
  const stalenessGuard = new SimulationStalenessGuard();

  const primary = await simulator.simulate({
    principal_context,
    resource_class: "ConfigChangeRequest",
    action_family: "APPROVE_CONFIG",
    governance_target_ref: "config-change-request.integration.0091",
    proposed_diff: {
      diff_class: "ROLE_GRANT",
      staged_object_refs: ["policy.rule.200", "workflow.guard.200"],
    },
    topology: {
      nodes: [
        {
          node_ref: "policy.rule.200",
          node_type: "POLICY_RULE",
          seed: 1,
          version_ref: "policy.rule.version.200",
        },
        {
          node_ref: "workflow.guard.200",
          node_type: "WORKFLOW",
          seed: 0.7,
          version_ref: "workflow.guard.version.200",
        },
      ],
      edges: [
        {
          from_node_ref: "policy.rule.200",
          to_node_ref: "workflow.guard.200",
          edge_type: "WORKFLOW_GUARD",
          version_ref: "edge.version.200",
        },
      ],
      inventory_slice_refs: ["inventory.policy.rule.200", "inventory.workflow.guard.200"],
    },
    action_cell_deltas: [
      {
        cell_ref: "cell.ConfigChangeRequest.APPROVE_CONFIG",
        pre_decision: "REQUIRE_APPROVAL",
        post_decision: "ALLOW",
        pre_effective_scope: ["year_end", "amendment_intent"],
        post_effective_scope: ["year_end", "amendment_intent"],
        cell_weight: 1.5,
      },
    ],
    simulated_at: "2026-04-23T10:05:00Z",
    persist: true,
  });

  await validatePayloadAgainstSchema(
    "governance_access_simulation.schema.json",
    primary.simulation,
  );
  await validatePayloadAgainstSchema(
    "governance_mutation_hazard_contract.schema.json",
    primary.simulation.mutation_hazard,
  );
  await validatePayloadAgainstSchema(
    "governance_mutation_basis_contract.schema.json",
    primary.simulation.mutation_basis_contract,
  );

  const stored = await repository.requireSimulationById(
    primary.simulation.simulation_id,
  );
  expect(stored.basis_contract_hash).toBe(
    primary.simulation.mutation_basis_contract?.basis_contract_hash ?? null,
  );
  expect(
    await repository.listSimulationsByPolicySnapshotHash(
      principal_context.tenant_id,
      principal_context.policy_snapshot_hash,
    ),
  ).toHaveLength(1);
  expect(
    await repository.listSimulationsBySimulationBasisHash(
      principal_context.tenant_id,
      primary.simulation.mutation_basis_contract!.simulation_basis_hash,
    ),
  ).toHaveLength(1);

  expect(
    stalenessGuard.assertFresh({
      stored_simulation: stored,
      current_policy_snapshot_hash: stored.policy_snapshot_hash,
      current_dependency_topology_hash: stored.dependency_topology_hash,
      current_simulation_basis_hash: stored.simulation_basis_hash,
      current_basis_contract_hash: stored.basis_contract_hash,
      current_authorization_decision_access_binding_hash:
        stored.authorization_decision_access_binding_hash,
      current_required_approvals:
        stored.simulation.mutation_basis_contract?.required_approvals ?? [],
      current_inventory_slice_refs: stored.inventory_slice_refs,
    }).stale,
  ).toBe(false);

  expect(() =>
    stalenessGuard.assertFresh({
      stored_simulation: stored,
      current_policy_snapshot_hash: `${stored.policy_snapshot_hash}.drifted`,
      current_dependency_topology_hash: stored.dependency_topology_hash,
      current_simulation_basis_hash: stored.simulation_basis_hash,
      current_basis_contract_hash: stored.basis_contract_hash,
      current_required_approvals:
        stored.simulation.mutation_basis_contract?.required_approvals ?? [],
      current_inventory_slice_refs: stored.inventory_slice_refs,
    }),
  ).toThrow(/SIMULATION_STALENESS_DETECTED/);

  expect(() =>
    stalenessGuard.assertFresh({
      stored_simulation: stored,
      current_policy_snapshot_hash: stored.policy_snapshot_hash,
      current_dependency_topology_hash: `${stored.dependency_topology_hash}.drifted`,
      current_simulation_basis_hash: stored.simulation_basis_hash,
      current_basis_contract_hash: null,
      current_required_approvals:
        stored.simulation.mutation_basis_contract?.required_approvals ?? [],
      current_inventory_slice_refs: ["inventory.policy.rule.200"],
    }),
  ).toThrow(/SIMULATION_STALENESS_DETECTED/);

  const secondary = await simulator.simulate({
    principal_context,
    resource_class: "ConfigChangeRequest",
    action_family: "APPROVE_CONFIG",
    governance_target_ref: "config-change-request.integration.0092",
    proposed_diff: {
      diff_class: "POLICY_STAGE",
      staged_object_refs: ["policy.rule.201"],
    },
    topology: {
      nodes: [
        {
          node_ref: "policy.rule.201",
          node_type: "POLICY_RULE",
          seed: 1,
          version_ref: "policy.rule.version.201",
        },
      ],
      edges: [],
      inventory_slice_refs: ["inventory.policy.rule.201"],
    },
    simulated_at: "2026-04-23T10:06:00Z",
    persist: true,
  });

  const storedSecondary = await repository.requireSimulationById(
    secondary.simulation.simulation_id,
  );
  expect(() =>
    stalenessGuard.assertSingleBasisBatch([stored, storedSecondary]),
  ).toThrow(/SIMULATION_STALENESS_MIXED_BASIS/);
});
