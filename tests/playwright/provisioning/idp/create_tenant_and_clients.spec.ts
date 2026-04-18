import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { createRunContext } from "../../../../automation/provisioning/src/core/run_context.js";
import {
  createIdpTenantAndClients,
  IDP_PROVIDER_ID,
  IDP_TENANT_CLIENT_FLOW_ID,
  type CreateIdpTenantAndClientsResult,
  type IdpEntryUrls,
  type IdpTenantRecordCatalog,
  type IdpApplicationClientCatalog,
  type IdpMachineClientInventory,
} from "../../../../automation/provisioning/src/providers/idp/flows/create_idp_tenant_and_clients.js";

function fixtureEntryUrls(scenario: "fresh" | "existing"): IdpEntryUrls {
  return {
    controlPlane:
      `/automation/provisioning/tests/fixtures/auth0_idp_console.html?scenario=${scenario}`,
  };
}

function fixtureRunContext() {
  return createRunContext({
    runId: "run-fixture-idp-topology",
    providerId: IDP_PROVIDER_ID,
    flowId: IDP_TENANT_CLIENT_FLOW_ID,
    productEnvironmentId: "env_local_provisioning_workstation",
    providerEnvironment: "fixture",
    executionMode: "fixture",
    operatorIdentityAlias: "ops.idp.fixture",
    workspaceId: "wk-local-provisioning-idp",
    evidenceRoot: "artifacts/runs/idp-topology-fixture",
  });
}

async function runFixtureBootstrap(
  page: Parameters<typeof createIdpTenantAndClients>[0]["page"],
  scenario: "fresh" | "existing",
) {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), `taxat-idp-${scenario}-`));
  const tenantRecordPath = path.join(rootDir, "idp_tenant_record.json");
  const applicationClientCatalogPath = path.join(
    rootDir,
    "idp_application_client_catalog.json",
  );
  const callbackOriginMatrixPath = path.join(rootDir, "idp_callback_origin_matrix.json");
  const machineClientInventoryPath = path.join(
    rootDir,
    "idp_machine_client_inventory.json",
  );

  const result = await createIdpTenantAndClients({
    page,
    runContext: fixtureRunContext(),
    tenantRecordPath,
    applicationClientCatalogPath,
    callbackOriginMatrixPath,
    machineClientInventoryPath,
    entryUrls: fixtureEntryUrls(scenario),
  });

  return {
    rootDir,
    tenantRecordPath,
    applicationClientCatalogPath,
    callbackOriginMatrixPath,
    machineClientInventoryPath,
    result,
  };
}

async function readPersistedArtifacts(paths: {
  tenantRecordPath: string;
  applicationClientCatalogPath: string;
  machineClientInventoryPath: string;
}) {
  const [tenantRecordRaw, applicationCatalogRaw, machineInventoryRaw] =
    await Promise.all([
      readFile(paths.tenantRecordPath, "utf8"),
      readFile(paths.applicationClientCatalogPath, "utf8"),
      readFile(paths.machineClientInventoryPath, "utf8"),
    ]);

  return {
    tenantRecordRaw,
    applicationCatalogRaw,
    machineInventoryRaw,
    tenantRecord: JSON.parse(tenantRecordRaw) as IdpTenantRecordCatalog,
    applicationCatalog: JSON.parse(applicationCatalogRaw) as IdpApplicationClientCatalog,
    machineInventory: JSON.parse(machineInventoryRaw) as IdpMachineClientInventory,
  };
}

function expectSuccessfulFlow(result: CreateIdpTenantAndClientsResult) {
  expect(result.outcome).toBe("IDP_TOPOLOGY_READY");
  expect(result.steps.map((step) => step.status)).toEqual([
    "SUCCEEDED",
    "SUCCEEDED",
    "SUCCEEDED",
    "SUCCEEDED",
    "SUCCEEDED",
  ]);
}

test("fresh fixture bootstrap creates the recommended IdP tenant and client topology without persisting raw secrets", async ({
  page,
}) => {
  const bootstrap = await runFixtureBootstrap(page, "fresh");
  expectSuccessfulFlow(bootstrap.result);

  const persisted = await readPersistedArtifacts(bootstrap);
  expect(persisted.tenantRecord.tenant_records).toHaveLength(3);
  expect(persisted.applicationCatalog.application_clients).toHaveLength(9);
  expect(persisted.machineInventory.machine_clients).toHaveLength(6);
  expect(
    persisted.applicationCatalog.application_clients.filter(
      (client) => client.surface_family === "NATIVE_MACOS_OPERATOR",
    ),
  ).toHaveLength(3);
  expect(
    persisted.applicationCatalog.application_clients.filter(
      (client) => client.secret_posture.capture_posture === "IMMEDIATE_VAULT_CAPTURE",
    ).length,
  ).toBeGreaterThan(0);

  expect(persisted.applicationCatalogRaw).not.toContain("sandbox-operator-secret");
  expect(persisted.applicationCatalogRaw).not.toContain("preprod-portal-secret");
  expect(persisted.machineInventoryRaw).not.toContain("production-management-secret");
  expect(persisted.tenantRecord.typed_gaps).toEqual(
    expect.arrayContaining([
      expect.stringContaining("shared_operating_contract_0038_to_0045.md"),
      expect.stringContaining("PROVIDER_DEFAULT_APPLIED"),
    ]),
  );
});

test("existing fixture bootstrap adopts pre-existing tenants and clients instead of recreating them", async ({
  page,
}) => {
  const bootstrap = await runFixtureBootstrap(page, "existing");
  expectSuccessfulFlow(bootstrap.result);

  const persisted = await readPersistedArtifacts(bootstrap);
  expect(
    persisted.tenantRecord.tenant_records.every(
      (tenant) => tenant.source_disposition === "ADOPTED_EXISTING",
    ),
  ).toBe(true);
  expect(
    persisted.applicationCatalog.application_clients.every(
      (client) => client.source_disposition === "ADOPTED_EXISTING",
    ),
  ).toBe(true);
  expect(
    persisted.machineInventory.machine_clients.every(
      (client) => client.source_disposition === "ADOPTED_EXISTING",
    ),
  ).toBe(true);
});

test("live-provider execution remains blocked unless the run context explicitly opts in", async ({
  page,
}) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "taxat-idp-live-gate-"));

  await expect(
    createIdpTenantAndClients({
      page,
      runContext: createRunContext({
        providerId: IDP_PROVIDER_ID,
        flowId: IDP_TENANT_CLIENT_FLOW_ID,
        productEnvironmentId: "env_shared_sandbox_integration",
        providerEnvironment: "sandbox",
        executionMode: "sandbox",
        operatorIdentityAlias: "ops.idp.live",
        workspaceId: "wk-live-idp-topology",
        evidenceRoot: "artifacts/runs/idp-topology-live",
      }),
      tenantRecordPath: path.join(rootDir, "idp_tenant_record.json"),
      applicationClientCatalogPath: path.join(rootDir, "idp_application_client_catalog.json"),
      callbackOriginMatrixPath: path.join(rootDir, "idp_callback_origin_matrix.json"),
      machineClientInventoryPath: path.join(rootDir, "idp_machine_client_inventory.json"),
    }),
  ).rejects.toThrow(/live provider execution is not enabled/i);
});

test("idp topology atlas renders semantic lanes, keyboard selection, and reduced-motion safe inspector details", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(
    "/automation/provisioning/report_viewer/index.html?fixture=./data/sample_run.json&page=idp-topology-atlas",
  );

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", { name: "Environment and client families" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Provider tenant" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Interactive clients" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Callback and origin bindings" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Machine clients" })).toBeVisible();

  const nodeButton = page.getByRole("button", {
    name: /Taxat Operator Web Sandbox/i,
  });
  await nodeButton.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#drawer-title")).toHaveText("Taxat Operator Web Sandbox");
  await expect(page.getByText("Client secret store ref")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy safe ref" }).first()).toBeVisible();
  await expect(page.getByText("sandbox-operator-secret")).toHaveCount(0);

  const tenantButton = page.getByRole("button", {
    name: /Taxat Production Runtime Tenant/i,
  });
  await tenantButton.click();
  await expect(page.locator("#drawer-title")).toHaveText("Taxat Operator Web Production");
  await expect(page.getByText("idp-operator-web-production")).toBeVisible();
});
