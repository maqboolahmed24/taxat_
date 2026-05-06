import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  createCiInventoryTemplate,
  provisionCiCdRunnersAndPreviewAccounts,
} from "../../../infra/ci/bootstrap/provision_ci_cd_runners_and_preview_accounts.js";

test("dry-run CI bootstrap freezes a sanitized delivery topology and re-adopts matching inventory without duplication", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "taxat-delivery-pipeline-"));
  const inventoryPath = path.join(tempDir, "ci_inventory.json");

  const result = await provisionCiCdRunnersAndPreviewAccounts({
    runContext: {
      runId: "run-fixture-delivery-pipeline-001",
      workspaceId: "wk-fixture-delivery-pipeline",
      operatorIdentityAlias: "ops.delivery.fixture",
    },
    inventoryPath,
  });

  const persisted = JSON.parse(await readFile(inventoryPath, "utf8"));

  expect(result.outcome).toBe("CI_CD_PROVIDER_OVERRIDE_APPLIED");
  expect(result.selection_status).toBe("PROVIDER_OVERRIDE_APPLIED");
  expect(result.notes).toEqual(
    expect.arrayContaining([
      "No live provider mutation occurred.",
      "This flow is safe to rerun because it only writes sanitized inventory and compares topology drift explicitly.",
    ]),
  );
  expect(
    result.steps.find((step) => step.step_id === "ci.persist-sanitized-inventory")?.status,
  ).toBe("SUCCEEDED");
  expect(persisted).toEqual(
    createCiInventoryTemplate({
      runContext: {
        runId: "run-fixture-delivery-pipeline-001",
        workspaceId: "wk-fixture-delivery-pipeline",
        operatorIdentityAlias: "ops.delivery.fixture",
      },
    }),
  );
  expect(JSON.stringify(persisted)).not.toContain("BEGIN PRIVATE KEY");
  expect(JSON.stringify(persisted)).not.toContain("vault://");

  const adopted = await provisionCiCdRunnersAndPreviewAccounts({
    runContext: {
      runId: "run-fixture-delivery-pipeline-002",
      workspaceId: "wk-fixture-delivery-pipeline",
      operatorIdentityAlias: "ops.delivery.fixture",
    },
    inventoryPath,
    existingInventoryPath: inventoryPath,
  });

  expect(adopted.outcome).toBe("CI_CD_PROVIDER_OVERRIDE_APPLIED");
  expect(
    adopted.steps.find((step) => step.step_id === "ci.adopt-or-verify-existing-topology")?.status,
  ).toBe("SKIPPED_AS_ALREADY_PRESENT");
});

test("drifted CI inventory stops the bootstrap before overwrite", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "taxat-delivery-pipeline-drift-"));
  const inventoryPath = path.join(tempDir, "ci_inventory.json");
  const driftInventoryPath = path.join(tempDir, "ci_inventory_drift.json");

  const driftedInventory = createCiInventoryTemplate({
    runContext: {
      runId: "run-fixture-delivery-pipeline-drift-seed",
      workspaceId: "wk-fixture-delivery-pipeline",
      operatorIdentityAlias: "ops.delivery.fixture",
    },
  });
  driftedInventory.runner_pool_refs = [...driftedInventory.runner_pool_refs, "runner.unknown"];
  await writeFile(driftInventoryPath, `${JSON.stringify(driftedInventory, null, 2)}\n`, "utf8");

  const result = await provisionCiCdRunnersAndPreviewAccounts({
    runContext: {
      runId: "run-fixture-delivery-pipeline-drift-001",
      workspaceId: "wk-fixture-delivery-pipeline",
      operatorIdentityAlias: "ops.delivery.fixture",
    },
    inventoryPath,
    existingInventoryPath: driftInventoryPath,
  });

  expect(result.outcome).toBe("CI_CD_DRIFT_REVIEW_REQUIRED");
  expect(
    result.steps.find((step) => step.step_id === "ci.adopt-or-verify-existing-topology")?.status,
  ).toBe("BLOCKED_BY_DRIFT");
});
