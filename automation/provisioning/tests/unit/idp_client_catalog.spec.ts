import { expect, test } from "@playwright/test";

import { createRunContext } from "../../src/core/run_context.js";
import {
  buildTemplateIdpArtifacts,
  createRecommendedFixtureState,
  validateIdpApplicationClientCatalog,
  validateIdpMachineClientInventory,
  type IdpApplicationClientCatalog,
} from "../../src/providers/idp/flows/create_idp_tenant_and_clients.js";

function fixtureRunContext() {
  return createRunContext({
    runId: "run-fixture-idp-topology",
    providerId: "oidc-external-idp-control-plane",
    flowId: "idp-tenant-and-clients-bootstrap",
    productEnvironmentId: "env_local_provisioning_workstation",
    providerEnvironment: "fixture",
    executionMode: "fixture",
    operatorIdentityAlias: "ops.idp.fixture",
    workspaceId: "wk-local-provisioning-idp",
    evidenceRoot: "artifacts/runs/idp-topology-fixture",
  });
}

function buildCatalog(mode: "fresh" | "existing" = "existing") {
  return buildTemplateIdpArtifacts(
    fixtureRunContext(),
    createRecommendedFixtureState(mode),
  );
}

test("template builder emits stable interactive and machine client catalogs for the recommended topology", () => {
  const artifacts = buildCatalog("existing");

  expect(artifacts.tenantRecord.tenant_records).toHaveLength(3);
  expect(artifacts.applicationClientCatalog.application_clients).toHaveLength(9);
  expect(artifacts.machineClientInventory.machine_clients).toHaveLength(6);
  expect(
    artifacts.callbackOriginMatrix.rows.filter(
      (row) => row.registration_decision === "CONFIGURE_NOW",
    ),
  ).toHaveLength(9);

  const nativeClient = artifacts.applicationClientCatalog.application_clients.find(
    (client) => client.surface_family === "NATIVE_MACOS_OPERATOR",
  );
  expect(nativeClient).toBeDefined();
  expect(nativeClient?.application_type).toBe("NATIVE_APPLICATION");
  expect(nativeClient?.client_visibility).toBe("PUBLIC");
  expect(nativeClient?.bundle_identifier).toBe("dev.taxat.InternalOperatorWorkspaceMac");
  expect(nativeClient?.secret_posture.requires_vault_secret).toBe(false);

  const browserClients = artifacts.applicationClientCatalog.application_clients.filter(
    (client) => client.surface_family !== "NATIVE_MACOS_OPERATOR",
  );
  expect(browserClients.every((client) => client.allowed_web_origins.length > 0)).toBe(true);
  expect(browserClients.every((client) => client.secret_posture.requires_vault_secret)).toBe(
    true,
  );

  const machineAudiences = new Set(
    artifacts.machineClientInventory.machine_clients.map(
      (client) => client.management_audience_ref,
    ),
  );
  expect(machineAudiences).toEqual(
    new Set(["urn:taxat:backend-service", "urn:auth0-management-api"]),
  );
});

test("fresh topology catalogs never persist raw client secrets", () => {
  const artifacts = buildCatalog("fresh");

  const serialized = JSON.stringify(artifacts);
  expect(serialized).not.toContain("sandbox-operator-secret");
  expect(serialized).not.toContain("preprod-operator-secret");
  expect(serialized).not.toContain("production-management-secret");
  expect(serialized).toContain("vault-write://sec_sandbox_runtime/idp_client_operator_browser_sandbox");
});

test("application catalog validator rejects browser clients without allowed origins", () => {
  const artifacts = buildCatalog("existing");
  const brokenCatalog: IdpApplicationClientCatalog = structuredClone(
    artifacts.applicationClientCatalog,
  );
  const browserClient = brokenCatalog.application_clients.find(
    (client) => client.surface_family === "OPERATOR_BROWSER",
  );
  expect(browserClient).toBeDefined();
  if (!browserClient) {
    throw new Error("Expected an operator browser client in the fixture topology.");
  }

  browserClient.allowed_web_origins = [];

  expect(() =>
    validateIdpApplicationClientCatalog(
      brokenCatalog,
      artifacts.callbackOriginMatrix,
      artifacts.tenantRecord,
    ),
  ).toThrow(/allowed web origins/i);
});

test("machine catalog validator rejects callback leakage onto machine clients", () => {
  const artifacts = buildCatalog("existing");
  const brokenInventory = structuredClone(artifacts.machineClientInventory) as any;
  brokenInventory.machine_clients[0]!.callback_urls = [
    "https://auth.sandbox.taxat.example/oauth/idp/operator/callback",
  ];

  expect(() =>
    validateIdpMachineClientInventory(brokenInventory, artifacts.tenantRecord),
  ).toThrow(/must not carry callback or origin state/i);
});
