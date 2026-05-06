import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  credentialEnvironmentRowRef,
  executeExternalCredentialSmokeMatrix,
  type ExternalCredentialSmokeInventoryTemplate,
} from "../../../automation/smoke/execute_external_credential_smoke_matrix.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

test("safe smoke execution persists typed success, soft-fail, transient, and manual-checkpoint outcomes without leaking secrets", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "taxat-credential-smoke-"));
  const inventoryPath = path.join(tempDir, "external_credential_smoke_inventory.json");

  const successRef = credentialEnvironmentRowRef(
    "hmrc-sandbox-client-credentials",
    "env_shared_sandbox_integration",
  );
  const authMismatchRef = credentialEnvironmentRowRef(
    "idp-federation-signing-and-admin-material",
    "env_local_provisioning_workstation",
  );
  const scopeMismatchRef = credentialEnvironmentRowRef(
    "idp-application-client-secrets",
    "env_preproduction_verification",
  );
  const transientFailureRef = credentialEnvironmentRowRef(
    "error-monitoring-ingest-token",
    "env_local_provisioning_workstation",
  );
  const manualCheckpointRef = credentialEnvironmentRowRef(
    "email-provider-api-key-and-domain-proof",
    "env_preproduction_verification",
  );

  const result = await executeExternalCredentialSmokeMatrix({
    repoRoot,
    inventoryPath,
    runContext: {
      runId: "run-integration-credential-smoke-001",
      workspaceId: "wk-integration-credential-smoke",
      operatorIdentityAlias: "ops.integration.credential.smoke",
    },
    simulatedOutcomeOverrides: {
      [successRef]: {
        outcome_code: "SUCCESS",
        observed_principal_or_null: "hmrc.sandbox.client.taxat",
        observed_scope_or_role_refs: ["read:self-assessment"],
        observed_endpoint_or_null: "https://test-api.service.hmrc.gov.uk/oauth/token",
        http_status_or_null: 200,
        masked_response_excerpt_or_null:
          "Sandbox credential metadata matched the expected application identity.",
      },
      [authMismatchRef]: {
        outcome_code: "SOFT_FAIL_AUTH_MISMATCH",
        observed_principal_or_null: "tenant-mismatch.auth0-client",
        observed_scope_or_role_refs: [],
        observed_endpoint_or_null: "https://taxat-dev.eu.auth0.com/api/v2/clients",
        http_status_or_null: 401,
        masked_response_excerpt_or_null:
          "Masked provider metadata indicated the credential could not authenticate against the selected tenant.",
      },
      [scopeMismatchRef]: {
        outcome_code: "SOFT_FAIL_SCOPE_MISMATCH",
        observed_principal_or_null: "taxat-staging-web",
        observed_scope_or_role_refs: ["read:clients"],
        observed_endpoint_or_null: "https://taxat-staging.eu.auth0.com/api/v2/clients",
        http_status_or_null: 403,
        masked_response_excerpt_or_null:
          "Principal resolved, but the provider grant omitted the required management scope set.",
      },
      [transientFailureRef]: {
        outcome_code: "SOFT_FAIL_TRANSIENT_PROVIDER_FAILURE",
        observed_principal_or_null: "taxat-monitoring-runtime",
        observed_scope_or_role_refs: ["event:write"],
        observed_endpoint_or_null: "https://sentry.io/api/0/organizations/taxat-sandbox/projects/",
        http_status_or_null: 503,
        masked_response_excerpt_or_null:
          "Provider returned a transient upstream error while the masked principal binding remained intact.",
      },
      [manualCheckpointRef]: {
        outcome_code: "MANUAL_CHECKPOINT_REQUIRED",
        observed_principal_or_null: "notify.preprod.taxat.example",
        observed_scope_or_role_refs: ["domains:read", "server:read"],
        observed_endpoint_or_null: "https://api.postmarkapp.com/domains",
        http_status_or_null: 202,
        masked_response_excerpt_or_null:
          "Masked checkpoint capture retained only route identity, challenge reason, and sanitized evidence refs.",
        manual_checkpoint_reason_code_or_null: "EMAIL_OR_DOMAIN_VERIFICATION_REQUIRED",
      },
    },
  });

  const persistedInventory = JSON.parse(
    await readFile(inventoryPath, "utf8"),
  ) as ExternalCredentialSmokeInventoryTemplate;

  expect(result.outcome).toBe("SMOKE_MATRIX_EXECUTED");
  expect(result.overall_status).toBe("MIXED");
  expect(result.steps.map((step) => step.status)).toEqual(["SUCCEEDED", "SUCCEEDED", "SUCCEEDED"]);
  expect(persistedInventory).toEqual(result.inventory);

  const resultByRef = new Map(
    persistedInventory.result_rows.map((row) => [row.smoke_row_ref, row]),
  );

  expect(resultByRef.get(successRef)?.outcome_code).toBe("SUCCESS");
  expect(resultByRef.get(authMismatchRef)?.outcome_code).toBe("SOFT_FAIL_AUTH_MISMATCH");
  expect(resultByRef.get(scopeMismatchRef)?.outcome_code).toBe("SOFT_FAIL_SCOPE_MISMATCH");
  expect(resultByRef.get(transientFailureRef)?.outcome_code).toBe(
    "SOFT_FAIL_TRANSIENT_PROVIDER_FAILURE",
  );
  expect(resultByRef.get(manualCheckpointRef)?.outcome_code).toBe("MANUAL_CHECKPOINT_REQUIRED");
  expect(resultByRef.get(manualCheckpointRef)?.manual_checkpoint_reason_code_or_null).toBe(
    "EMAIL_OR_DOMAIN_VERIFICATION_REQUIRED",
  );

  const serializedInventory = JSON.stringify(persistedInventory);
  expect(serializedInventory).not.toContain("vault://secret/");
  expect(serializedInventory).not.toContain("BEGIN PRIVATE KEY");
});
