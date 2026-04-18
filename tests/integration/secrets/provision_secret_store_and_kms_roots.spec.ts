import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  createSecretRootInventoryTemplate,
  provisionSecretsManagerKmsOrHsmRoots,
} from "../../../infra/secrets/bootstrap/provision_secrets_manager_kms_or_hsm_roots.js";

test("dry-run bootstrap freezes sanitized topology and fails closed when provider selection is unresolved", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "taxat-secret-root-"));
  const inventoryPath = path.join(tempDir, "secret_root_inventory.json");

  const result = await provisionSecretsManagerKmsOrHsmRoots({
    runContext: {
      runId: "run-fixture-secret-root-001",
      workspaceId: "wk-fixture-secret-root",
      operatorIdentityAlias: "ops.security.fixture",
    },
    inventoryPath,
  });

  const persisted = JSON.parse(await readFile(inventoryPath, "utf8"));

  expect(result.outcome).toBe(
    "SECRET_ROOT_TOPOLOGY_DECLARED_PROVIDER_SELECTION_REQUIRED",
  );
  expect(result.selection_status).toBe("PROVIDER_SELECTION_REQUIRED");
  expect(result.steps[0]?.status).toBe("BLOCKED_BY_POLICY");
  expect(result.steps.slice(1).every((step) => step.status === "SUCCEEDED")).toBe(
    true,
  );
  expect(result.notes).toEqual(
    expect.arrayContaining([
      "No live provider mutation occurred.",
      "This flow is safe to rerun because unresolved-provider posture only rewrites sanitized inventory.",
    ]),
  );
  expect(persisted).toEqual({
    ...createSecretRootInventoryTemplate({
      runId: "run-fixture-secret-root-001",
      workspaceId: "wk-fixture-secret-root",
      operatorIdentityAlias: "ops.security.fixture",
    }),
    selection_status: "PROVIDER_SELECTION_REQUIRED",
    selected_provider_stack_id_or_null: null,
  });
  expect(JSON.stringify(persisted)).not.toContain("client_secret");
  expect(JSON.stringify(persisted)).not.toContain("BEGIN PRIVATE KEY");
});
