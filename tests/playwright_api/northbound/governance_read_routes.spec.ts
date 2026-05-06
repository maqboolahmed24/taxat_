import { expect, test } from "@playwright/test";

import {
  getGovernanceOverviewRoutePath,
  getGovernancePolicySnapshotRoutePath,
  getGovernancePrincipalsRoutePath,
  getGovernanceRoleMatrixRoutePath,
  registerGovernanceReadRoutes,
} from "../../../packages/backend-northbound/src/index.ts";
import { validateContractSchema } from "../../unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  governanceReadActorContext,
  governanceReadRepositoriesFixture,
  governanceTenantId,
} from "../../unit/backend_northbound/governance_read_fixtures.ts";

test("governance read route family registers four GET handlers and returns no-store artifacts", async () => {
  const {
    accessPreview,
    governancePolicySnapshotRepository,
    overviewRepository,
    principalAccessViewRepository,
    roleTemplateMatrixRepository,
  } = await governanceReadRepositoriesFixture();
  const registered = new Map<string, (request: never) => Promise<unknown>>();
  const handlers = registerGovernanceReadRoutes(
    {
      get: (path, handler) => {
        registered.set(path, handler);
      },
    },
    {
      governancePolicySnapshotRepository,
      principalAccessViewRepository,
      roleTemplateMatrixRepository,
      tenantGovernanceSnapshotRepository: overviewRepository,
    },
  );

  expect([...registered.keys()].sort()).toEqual(
    [
      getGovernanceOverviewRoutePath,
      getGovernancePolicySnapshotRoutePath,
      getGovernancePrincipalsRoutePath,
      getGovernanceRoleMatrixRoutePath,
    ].sort(),
  );
  expect(registered.get(getGovernanceOverviewRoutePath)).toBe(handlers.overview);
  expect(registered.get(getGovernancePolicySnapshotRoutePath)).toBe(handlers.policySnapshot);
  expect(registered.get(getGovernancePrincipalsRoutePath)).toBe(handlers.principals);
  expect(registered.get(getGovernanceRoleMatrixRoutePath)).toBe(handlers.roleMatrix);

  const overview = await handlers.overview({
    actorContext: governanceReadActorContext,
    correlationId: "corr.api.governance.overview",
    method: "GET",
    path: `/v1/governance/tenants/${encodeURIComponent(governanceTenantId)}/overview`,
  });
  const policy = await handlers.policySnapshot({
    actorContext: governanceReadActorContext,
    correlationId: "corr.api.governance.policy",
    method: "GET",
    path: `/v1/governance/tenants/${encodeURIComponent(governanceTenantId)}/policy-snapshot`,
  });
  const principals = await handlers.principals({
    actorContext: governanceReadActorContext,
    correlationId: "corr.api.governance.principals",
    method: "GET",
    path: `/v1/governance/tenants/${encodeURIComponent(
      governanceTenantId,
    )}/principals?principal_id=${encodeURIComponent(accessPreview.principal_view.principal_id)}`,
  });
  const role = await handlers.roleMatrix({
    actorContext: governanceReadActorContext,
    correlationId: "corr.api.governance.role",
    method: "GET",
    path: `/v1/governance/tenants/${encodeURIComponent(
      governanceTenantId,
    )}/roles/${encodeURIComponent(accessPreview.role_template_matrix.role_id)}`,
  });

  expect(overview.status).toBe(200);
  expect(policy.status).toBe(200);
  expect(principals.status).toBe(200);
  expect(role.status).toBe(200);
  expect(overview.headers["Cache-Control"]).toBe("no-store");
  expect(policy.headers["Cache-Control"]).toBe("no-store");
  expect(principals.headers["Cache-Control"]).toBe("no-store");
  expect(role.headers["Cache-Control"]).toBe("no-store");
  expect(overview.body.artifact_type).toBe("TenantGovernanceSnapshot");
  expect(policy.body.artifact_type).toBe("GovernancePolicySnapshot");
  expect(policy.body.policy_snapshot_hash).toBeTruthy();
  expect(policy.body.interaction_layer.selected_filter_chip_refs).toEqual([]);
  await validateContractSchema("governance_policy_snapshot", policy.body);
  expect(principals.body.artifact_type).toBe("PrincipalAccessView");
  expect(role.body.artifact_type).toBe("RoleTemplateMatrix");
});
