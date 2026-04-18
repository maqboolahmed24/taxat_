import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { createRunContext } from "../../../../automation/provisioning/src/core/run_context.js";
import {
  configureRolesScopesMfaSessions,
  IDP_POLICY_FLOW_ID,
  IDP_PROVIDER_ID,
  type ConfigureIdpPoliciesResult,
  type IdpPolicyEntryUrls,
  type IdpPolicyEvidenceTemplate,
} from "../../../../automation/provisioning/src/providers/idp/flows/configure_roles_scopes_mfa_sessions.js";

function fixtureEntryUrls(
  scenario: "fresh" | "existing" | "policy-drift",
): IdpPolicyEntryUrls {
  return {
    controlPlane:
      `/automation/provisioning/tests/fixtures/auth0_idp_console.html?scenario=${scenario}`,
  };
}

function fixtureRunContext() {
  return createRunContext({
    runId: "run-fixture-idp-policy",
    providerId: IDP_PROVIDER_ID,
    flowId: IDP_POLICY_FLOW_ID,
    productEnvironmentId: "env_local_provisioning_workstation",
    providerEnvironment: "fixture",
    executionMode: "fixture",
    operatorIdentityAlias: "ops.idp.fixture",
    workspaceId: "wk-local-provisioning-idp-policy",
    evidenceRoot: "artifacts/runs/idp-policy-fixture",
  });
}

async function runFixturePolicyFlow(
  page: Parameters<typeof configureRolesScopesMfaSessions>[0]["page"],
  scenario: "fresh" | "existing" | "policy-drift",
) {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), `taxat-idp-policy-${scenario}-`));
  const policyEvidencePath = path.join(rootDir, "idp_policy_evidence.json");

  const result = await configureRolesScopesMfaSessions({
    page,
    runContext: fixtureRunContext(),
    policyEvidencePath,
    entryUrls: fixtureEntryUrls(scenario),
  });

  const [policyEvidenceRaw, evidenceManifestRaw] = await Promise.all([
    readFile(policyEvidencePath, "utf8"),
    readFile(result.evidenceManifestPath, "utf8"),
  ]);

  return {
    rootDir,
    policyEvidencePath,
    result,
    policyEvidenceRaw,
    evidenceManifestRaw,
    policyEvidence: JSON.parse(policyEvidenceRaw) as IdpPolicyEvidenceTemplate,
  };
}

function expectSucceededSteps(result: ConfigureIdpPoliciesResult) {
  expect(result.steps.map((step) => step.status)).toEqual([
    "SUCCEEDED",
    "SUCCEEDED",
    "SUCCEEDED",
    "SUCCEEDED",
    "SUCCEEDED",
  ]);
}

test("fresh fixture reconciliation applies the recommended IdP policy pack and persists sanitized evidence", async ({
  page,
}) => {
  const flow = await runFixturePolicyFlow(page, "fresh");

  expect(flow.result.outcome).toBe("IDP_POLICIES_READY");
  expectSucceededSteps(flow.result);
  expect(flow.result.roleCatalog.summary.role_count).toBe(8);
  expect(flow.result.scopeCatalog.summary.scope_count).toBe(18);
  expect(flow.result.stepUpPolicyMatrix.summary.trigger_count).toBe(10);
  expect(flow.result.sessionPolicyMatrix.summary.session_profile_count).toBe(6);
  expect(flow.result.driftRegister).toEqual([]);

  expect(flow.policyEvidence.observed_console_posture.role_refs).toHaveLength(8);
  expect(flow.policyEvidence.observed_console_posture.scope_refs).toHaveLength(18);
  expect(flow.policyEvidence.observed_console_posture.enabled_factors).toEqual(
    expect.arrayContaining(["webauthn_roaming", "otp", "recovery_code"]),
  );
  expect(flow.policyEvidence.observed_console_posture.session_profile_refs).toEqual(
    expect.arrayContaining(["session.native.operator", "session.machine.runtime"]),
  );
  expect(flow.policyEvidenceRaw).not.toContain("production-operator-secret");
  expect(flow.policyEvidenceRaw).toContain("REQUEST_ELEVATED_SCOPE_THEN_CHALLENGE_IN_POST_LOGIN_ACTION");
  expect(flow.evidenceManifestRaw).toContain(
    "Applied or adopted coarse roles and scopes while keeping delegation",
  );
});

test("policy drift stays explicit and blocks the flow instead of silently mutating mismatched provider posture", async ({
  page,
}) => {
  const flow = await runFixturePolicyFlow(page, "policy-drift");

  expect(flow.result.outcome).toBe("IDP_POLICY_DRIFT_REQUIRES_REVIEW");
  expect(flow.result.steps[1]?.status).toBe("BLOCKED_BY_POLICY");
  expect(flow.result.steps[4]?.status).toBe("SUCCEEDED");
  expect(flow.result.driftRegister.length).toBeGreaterThan(0);
  expect(flow.result.driftRegister.map((row) => row.field_ref)).toEqual(
    expect.arrayContaining(["role_refs", "scope_refs"]),
  );
  expect(flow.policyEvidence.drift_register.length).toBeGreaterThan(0);
  expect(flow.policyEvidence.notes).toEqual(
    expect.arrayContaining([
      expect.stringContaining("provider decides final Taxat legality"),
    ]),
  );
});

test("access and step-up matrix viewer renders semantic navigation, inspector detail, and reduced-motion safe behavior", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(
    "/automation/provisioning/report_viewer/index.html?fixture=./data/sample_run.json&page=access-stepup-matrix",
  );

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", { name: "Roles, scopes, and session profiles" }),
  ).toBeVisible();
  await expect(page.locator("#main-title")).toHaveText("Governance admin");
  await expect(page.locator("#drawer-title")).toHaveText("Submit filing or amendment");
  await expect(page.getByText("Fresh step-up or approved equivalent")).toBeVisible();
  await expect(page.getByText("authority_of_record_outcome")).toHaveCount(0);

  await page
    .locator(".policy-rail-list button")
    .filter({ hasText: "Portal signatory" })
    .first()
    .click();
  await expect(page.locator("#main-title")).toHaveText("Portal signatory");
  await expect(page.locator("#drawer-title")).toHaveText("Submit filing or amendment");
  await expect(
    page.locator("#drawer-body").getByText("scope.elevated.client_signoff"),
  ).toBeVisible();
});
