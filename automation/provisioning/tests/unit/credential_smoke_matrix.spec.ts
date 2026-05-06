import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  CREDENTIAL_KEYS,
  ENVIRONMENT_REFS,
  credentialEnvironmentRowRef,
  createCredentialEvidenceLedgerViewModel,
  createCredentialSmokeMatrix,
  createExternalCredentialSmokeInventoryTemplate,
  createPrincipalScopeAndEndpointAssertions,
  validateCredentialSmokeMatrix,
  validatePrincipalScopeAndEndpointAssertions,
  type CredentialEvidenceLedgerViewModel,
  type CredentialSmokeMatrix,
  type PrincipalScopeAndEndpointAssertions,
} from "../../../smoke/execute_external_credential_smoke_matrix.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

async function readJson<T>(segments: string[]): Promise<T> {
  return JSON.parse(await readFile(path.join(repoRoot, ...segments), "utf8")) as T;
}

test("checked-in smoke matrix, assertions, and sample ledger fixture match the builder", async () => {
  const persistedMatrix = await readJson<CredentialSmokeMatrix>([
    "config",
    "smoke",
    "credential_smoke_matrix.json",
  ]);
  const persistedAssertions = await readJson<PrincipalScopeAndEndpointAssertions>([
    "config",
    "smoke",
    "principal_scope_and_endpoint_assertions.json",
  ]);
  const sampleRun = await readJson<{
    credentialEvidenceLedger: CredentialEvidenceLedgerViewModel;
  }>(["automation", "provisioning", "report_viewer", "data", "sample_run.json"]);

  expect(persistedMatrix).toEqual(createCredentialSmokeMatrix(repoRoot));
  expect(persistedAssertions).toEqual(createPrincipalScopeAndEndpointAssertions(repoRoot));
  expect(sampleRun.credentialEvidenceLedger).toEqual(
    createCredentialEvidenceLedgerViewModel(repoRoot),
  );

  validateCredentialSmokeMatrix(persistedMatrix);
  validatePrincipalScopeAndEndpointAssertions(persistedAssertions, persistedMatrix);
});

test("every credential family expands across every canonical environment with explicit typed blocked outcomes", () => {
  const matrix = createCredentialSmokeMatrix(repoRoot);
  const inventory = createExternalCredentialSmokeInventoryTemplate({ repoRoot });

  expect(
    matrix.family_rows
      .map((row) => row.credential_key)
      .sort((left, right) => left.localeCompare(right)),
  ).toEqual([...CREDENTIAL_KEYS].sort((left, right) => left.localeCompare(right)));
  expect(matrix.smoke_rows).toHaveLength(CREDENTIAL_KEYS.length * ENVIRONMENT_REFS.length);

  for (const credentialKey of CREDENTIAL_KEYS) {
    const rows = matrix.smoke_rows.filter((row) => row.credential_key === credentialKey);
    expect(rows).toHaveLength(ENVIRONMENT_REFS.length);
    expect(
      rows.map((row) => row.environment_ref).sort((left, right) => left.localeCompare(right)),
    ).toEqual([...ENVIRONMENT_REFS].sort((left, right) => left.localeCompare(right)));
  }

  const outcomeByRowRef = new Map(
    inventory.result_rows.map((row) => [row.smoke_row_ref, row.outcome_code]),
  );

  expect(
    outcomeByRowRef.get(
      credentialEnvironmentRowRef("helpdesk-api-token", "env_preproduction_verification"),
    ),
  ).toBe("BLOCKED_NOT_SELECTED");
  expect(
    outcomeByRowRef.get(
      credentialEnvironmentRowRef("ocr-service-credential", "env_shared_sandbox_integration"),
    ),
  ).toBe("BLOCKED_PROVIDER_SELECTION");
  expect(
    outcomeByRowRef.get(
      credentialEnvironmentRowRef("authority-oauth-token-bundle", "env_preproduction_verification"),
    ),
  ).toBe("ENVIRONMENT_DISABLED");
  expect(
    outcomeByRowRef.get(
      credentialEnvironmentRowRef(
        "email-provider-api-key-and-domain-proof",
        "env_preproduction_verification",
      ),
    ),
  ).toBe("MANUAL_CHECKPOINT_REQUIRED");
});
