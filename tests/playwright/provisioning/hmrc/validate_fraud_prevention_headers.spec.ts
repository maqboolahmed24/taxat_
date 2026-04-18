import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  createFixtureFphValidatorClient,
} from "../../../../automation/provisioning/src/providers/hmrc/clients/fph_validator_client.js";
import {
  HMRC_FPH_VALIDATION_FLOW_ID,
  validateFraudPreventionHeaders,
} from "../../../../automation/provisioning/src/providers/hmrc/flows/validate_fraud_prevention_headers.js";
import {
  createRunContext,
} from "../../../../automation/provisioning/src/core/run_context.js";

function fixtureRunContext() {
  return createRunContext({
    providerId: "hmrc-developer-hub",
    flowId: HMRC_FPH_VALIDATION_FLOW_ID,
    productEnvironmentId: "env_local_provisioning_workstation",
    providerEnvironment: "fixture",
    executionMode: "fixture",
    operatorIdentityAlias: "ops.hmrc.fixture",
    workspaceId: "wk-local-provisioning-sandbox",
    evidenceRoot: "artifacts/runs/hmrc-fph-validation-fixture",
  });
}

test("fixture validation persists sanitized binding evidence and seeds later authority-sandbox breadth", async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "taxat-hmrc-fph-"));
  const profileMatrixPath = path.join(
    rootDir,
    "hmrc_fraud_prevention_profile_matrix.template.json",
  );
  const bindingEvidencePath = path.join(
    rootDir,
    "hmrc_sandbox_profile_binding_evidence.template.json",
  );
  const authoritySandboxSeedMatrixPath = path.join(
    rootDir,
    "hmrc_authority_sandbox_seed_matrix.json",
  );

  const validatorClient = createFixtureFphValidatorClient({
    onValidateHeaders(headers) {
      expect(headers).toMatchObject({
        "Gov-Client-Connection-Method": expect.any(String),
        "Gov-Vendor-Version": expect.any(String),
      });
      return {
        specVersion: "3.1",
        code: "VALID_HEADERS",
        message: "Fixture validation passed.",
        errors: [],
        warnings: [],
      };
    },
  });

  const result = await validateFraudPreventionHeaders({
    runContext: fixtureRunContext(),
    profileMatrixPath,
    bindingEvidencePath,
    authoritySandboxSeedMatrixPath,
    validatorClient,
  });

  expect(result.outcome).toBe("FRAUD_HEADERS_READY");
  expect(result.profileMatrix.binding_rows.map((row) => row.fraud_header_profile_ref)).toEqual(
    expect.arrayContaining([
      "fph_web_app_via_server",
      "fph_desktop_app_via_server",
      "fph_batch_process_direct",
    ]),
  );
  expect(
    result.bindingEvidence.profile_validations.map(
      (validation) => validation.validator_validate_code,
    ),
  ).toEqual(["VALID_HEADERS", "VALID_HEADERS"]);
  expect(
    result.authoritySandboxSeedMatrix.rows.filter(
      (row) => row.readiness_posture === "SEEDED_WITH_FRAUD_VALIDATION",
    ).length,
  ).toBeGreaterThan(0);
  expect(
    result.authoritySandboxSeedMatrix.rows.some(
      (row) =>
        row.fraud_header_profile_ref === "fph_batch_process_direct" &&
        row.readiness_posture === "DEFERRED_FOR_LATER_CARDS",
    ),
  ).toBe(true);

  const persistedEvidence = await readFile(bindingEvidencePath, "utf8");
  const persistedSeedMatrix = await readFile(authoritySandboxSeedMatrixPath, "utf8");
  expect(persistedEvidence).not.toContain("66fb6f1f-f1bb-4eef-a3b0-3cf013bfed1d");
  expect(persistedEvidence).not.toContain("198.51.100.23");
  expect(persistedSeedMatrix).toContain("FRAUD_HEADER_VALIDATION");
});

test("viewer surfaces fraud-header validation posture without exposing raw header values", async ({
  page,
}) => {
  await page.goto(
    "/automation/provisioning/report_viewer/index.html?fixture=./data/sample_run.json",
  );

  await expect(page.getByRole("heading", { name: "Fraud-header posture" })).toBeVisible();
  await expect(page.getByText("WEB APP VIA SERVER")).toBeVisible();
  await expect(page.getByText("DESKTOP APP VIA SERVER")).toBeVisible();
  await expect(page.getByText("VALID HEADERS")).toHaveCount(2);
  await expect(page.getByText("66fb6f1f-f1bb-4eef-a3b0-3cf013bfed1d")).toHaveCount(0);
});
