import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  ActorSessionRepository,
  AuthorizationDecisionFactory,
  buildAuthorityLayerBoundaryContract,
  PrincipalContextBuilder,
  PrincipalContextRepository,
  SessionLifecycleService,
  TenantRepository,
  UserRepository,
} from "../../../packages/backend-access/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const migrationPath = path.join(
  repoRoot,
  "db",
  "migrations",
  "phase03_0002_principal_context_authorization_decision.sql",
);
const reasonCodeCatalogPath = path.join(repoRoot, "config", "access", "reason_code_catalog.json");

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

test.describe.configure({ mode: "serial" });

test("migration and reason-code catalog freeze the durable access lookup surface", async () => {
  const [migrationSql, reasonCodeCatalogRaw] = await Promise.all([
    readFile(migrationPath, "utf8"),
    readFile(reasonCodeCatalogPath, "utf8"),
  ]);
  const reasonCodeCatalog = JSON.parse(reasonCodeCatalogRaw) as {
    contract_version: string;
    codes: Array<{ code: string }>;
  };

  expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS control_access.principal_context_register");
  expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS control_access.authorization_decision_register");
  expect(migrationSql).toContain("CREATE UNIQUE INDEX IF NOT EXISTS principal_context_access_binding_lookup");
  expect(migrationSql).toContain("CREATE UNIQUE INDEX IF NOT EXISTS authorization_decision_access_binding_lookup");
  expect(migrationSql).toContain("CREATE INDEX IF NOT EXISTS authorization_decision_simulation_lookup");
  expect(migrationSql).toContain("ENABLE ROW LEVEL SECURITY");
  expect(migrationSql).toContain("control_support.require_tenant_context()");

  expect(reasonCodeCatalog.contract_version).toBe("ACCESS_REASON_CODE_CATALOG_V1");
  expect(reasonCodeCatalog.codes.some((entry) => entry.code === "STEP_UP_REQUIRED_FOR_AUTHORITY_SUBMISSION")).toBe(true);
  expect(reasonCodeCatalog.codes.some((entry) => entry.code === "APPROVAL_REQUIRED_FOR_OVERRIDE_CREATION")).toBe(true);
});

test("principal contexts and authorization decisions persist by access binding and stay schema-valid", async () => {
  const tenantRepository = new TenantRepository();
  const userRepository = new UserRepository({ tenantRepository });
  const actorSessionRepository = new ActorSessionRepository({
    tenantRepository,
    userRepository,
  });
  const sessionLifecycle = new SessionLifecycleService({
    actorSessionRepository,
    tenantRepository,
    userRepository,
  });
  const principalContextBuilder = new PrincipalContextBuilder({
    actorSessionRepository,
    tenantRepository,
    userRepository,
  });
  const authorizationDecisionFactory = new AuthorizationDecisionFactory();
  const principalContextRepository = new PrincipalContextRepository();

  await tenantRepository.create({
    artifact_type: "Tenant",
    tenant_id: "tenant.taxat",
    name: "Taxat Sandbox",
    policy_profile_id: "policy.default",
    default_retention_profile_id: "retention.default",
    lifecycle_state: "ACTIVE",
    disabled_at: null,
    created_at: "2026-04-23T08:00:00Z",
  });
  await userRepository.create({
    artifact_type: "User",
    user_id: "user.operator.001",
    tenant_id: "tenant.taxat",
    roles: ["TENANT_ADMIN"],
    attributes: {
      locale: "en-GB",
    },
    mfa_state: "SATISFIED",
    lifecycle_state: "ACTIVE",
    disabled_at: null,
    created_at: "2026-04-23T08:00:00Z",
  });

  await sessionLifecycle.issueBrowserSession({
    tenant_id: "tenant.taxat",
    user_id: "user.operator.001",
    session_id: "session.browser.401",
    authn_level: "STEP_UP",
    step_up_state: "SATISFIED",
    session_binding_hash: "hash.binding.browser.401",
    csrf_ref: "csrf.binding.401",
    issued_at: "2026-04-23T08:00:00Z",
    expires_at: "2026-04-23T16:00:00Z",
  });

  const principalContext = await principalContextBuilder.build({
    tenant_id: "tenant.taxat",
    session_id: "session.browser.401",
    delegation_basis: "SELF_ACTING",
    client_scope: ["client.taxpayer.001"],
    requested_scope: ["amendment_intent", "year_end"],
    partition_scope_refs: ["period.2026-Q1", "partition.uk.vat"],
    masking_scope: "TENANT_ADMIN_UNMASKED",
    authorization_evaluated_at: "2026-04-23T09:00:00Z",
  });

  await validatePayloadAgainstSchema("principal_context.schema.json", principalContext);
  await principalContextRepository.storePrincipalContext(principalContext);

  const allowMaskedDecision = await authorizationDecisionFactory.create({
    principal_context: principalContext,
    resource_class: "Client",
    action_family: "VIEW_MASKED",
    decision: "ALLOW_MASKED",
    reason_codes: ["ROLE_TENANT_ADMIN_BASELINE_ALLOW_MASKED"],
    effective_scope: ["year_end"],
    effective_partition_scope_refs: ["period.2026-Q1"],
    masking_rules: ["mask.client_personal_fields"],
    authority_layer_boundary: buildAuthorityLayerBoundaryContract({
      binding_scope_class: "AUTHORIZATION_DECISION",
      integration_capability: "INTERNAL_ONLY",
      active_principal_class: "HUMAN",
      tenant_permission_state: "MASKED",
      client_delegation_state: "NOT_REQUIRED",
      delegation_basis: "SELF_ACTING",
      delegation_freshness_state: "NOT_APPLICABLE",
      authority_link_state: "NOT_REQUIRED",
      exceptional_authority_state: "NOT_APPLICABLE",
      human_gate_requirement: "NOT_REQUIRED",
      human_gate_resolution_state: "NOT_REQUIRED",
    }),
    delegation_snapshot_refs: [],
    authority_link_snapshot_refs: [],
    evaluated_at: "2026-04-23T09:01:00Z",
  });

  const approvalDecision = await authorizationDecisionFactory.create({
    principal_context: principalContext,
    resource_class: "Override",
    action_family: "CREATE_OVERRIDE",
    decision: "REQUIRE_APPROVAL",
    reason_codes: ["APPROVAL_REQUIRED_FOR_OVERRIDE_CREATION"],
    effective_scope: ["year_end", "amendment_intent"],
    effective_partition_scope_refs: ["partition.uk.vat", "period.2026-Q1"],
    required_approvals: ["approval.override.single-approver"],
    authority_layer_boundary: buildAuthorityLayerBoundaryContract({
      binding_scope_class: "AUTHORIZATION_DECISION",
      integration_capability: "INTERNAL_ONLY",
      active_principal_class: "HUMAN",
      tenant_permission_state: "SATISFIED",
      client_delegation_state: "NOT_REQUIRED",
      delegation_basis: "SELF_ACTING",
      delegation_freshness_state: "NOT_APPLICABLE",
      authority_link_state: "NOT_REQUIRED",
      exceptional_authority_state: "NOT_APPLICABLE",
      human_gate_requirement: "REQUIRE_APPROVAL",
      human_gate_resolution_state: "PENDING_EVIDENCE",
    }),
    delegation_snapshot_refs: [],
    authority_link_snapshot_refs: [],
    bounded_safe_mutation: 0,
    approval_requirement: "SINGLE_APPROVER",
    dependency_topology_hash: "dependency.topology.401",
    simulation_basis_hash: "simulation.basis.401",
    evaluated_at: "2026-04-23T09:02:00Z",
  });

  await validatePayloadAgainstSchema("authorization_decision.schema.json", allowMaskedDecision);
  await validatePayloadAgainstSchema("authorization_decision.schema.json", approvalDecision);

  await principalContextRepository.storeAuthorizationDecision({
    principal_context: principalContext,
    authorization_decision: allowMaskedDecision,
  });
  await principalContextRepository.storeAuthorizationDecision({
    principal_context: principalContext,
    authorization_decision: approvalDecision,
  });

  const byAccessBinding = await principalContextRepository.getPrincipalContextByAccessBindingHash(
    "tenant.taxat",
    principalContext.access_binding_hash,
  );
  expect(byAccessBinding?.principal_id).toBe("user.operator.001");

  const byPolicySnapshot = await principalContextRepository.listPrincipalContextsByPolicySnapshotHash(
    "tenant.taxat",
    principalContext.policy_snapshot_hash,
  );
  expect(byPolicySnapshot).toHaveLength(1);

  const decisionsByPolicySnapshot =
    await principalContextRepository.listAuthorizationDecisionsByPolicySnapshotHash(
      "tenant.taxat",
      principalContext.policy_snapshot_hash,
    );
  expect(decisionsByPolicySnapshot).toHaveLength(2);

  const decisionsBySimulationBasis =
    await principalContextRepository.listAuthorizationDecisionsBySimulationBasisHash(
      "tenant.taxat",
      "simulation.basis.401",
    );
  expect(decisionsBySimulationBasis.map((decision) => decision.decision_id)).toEqual([
    approvalDecision.decision_id,
  ]);

  const reconstructed = await principalContextRepository.reconstructFrozenAuthorizationContext(
    "tenant.taxat",
    principalContext.access_binding_hash,
  );
  expect(reconstructed.principal_context.access_binding_hash).toBe(
    principalContext.access_binding_hash,
  );
  expect(reconstructed.authorization_decisions.map((decision) => decision.decision)).toEqual([
    "ALLOW_MASKED",
    "REQUIRE_APPROVAL",
  ]);

  expect(
    await principalContextRepository.getPrincipalContextByAccessBindingHash(
      "tenant.other",
      principalContext.access_binding_hash,
    ),
  ).toBeNull();
  expect(
    await principalContextRepository.listAuthorizationDecisionsBySimulationBasisHash(
      "tenant.other",
      "simulation.basis.401",
    ),
  ).toEqual([]);
});
