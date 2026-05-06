import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  createSupplyChainInventoryTemplate,
  provisionRegistrySigningAndAttestation,
} from "../../../infra/supplychain/bootstrap/provision_registry_signing_and_attestation.js";

test("dry-run supply chain bootstrap freezes a sanitized provider-unresolved topology and supports adoption without destructive reset", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "taxat-supply-chain-"));
  const inventoryPath = path.join(tempDir, "supply_chain_inventory.json");

  const result = await provisionRegistrySigningAndAttestation({
    runContext: {
      runId: "run-fixture-supply-chain-001",
      workspaceId: "wk-fixture-supply-chain",
      operatorIdentityAlias: "ops.release.fixture",
    },
    inventoryPath,
  });

  const persisted = JSON.parse(await readFile(inventoryPath, "utf8"));

  expect(result.outcome).toBe("SUPPLY_CHAIN_DECLARED_PROVIDER_SELECTION_REQUIRED");
  expect(result.selection_status).toBe("PROVIDER_SELECTION_REQUIRED");
  expect(result.steps[0]?.status).toBe("BLOCKED_BY_POLICY");
  expect(result.notes).toEqual(
    expect.arrayContaining([
      "No live provider mutation occurred.",
      "This flow is safe to rerun because unresolved-provider posture only writes sanitized inventory and compares drift explicitly.",
    ]),
  );
  expect(persisted).toEqual(
    createSupplyChainInventoryTemplate({
      runContext: {
        runId: "run-fixture-supply-chain-001",
        workspaceId: "wk-fixture-supply-chain",
        operatorIdentityAlias: "ops.release.fixture",
      },
    }),
  );
  expect(JSON.stringify(persisted)).not.toContain("BEGIN PRIVATE KEY");
  expect(JSON.stringify(persisted)).not.toContain("password");
  expect(JSON.stringify(persisted)).not.toContain("token");

  const adopted = await provisionRegistrySigningAndAttestation({
    runContext: {
      runId: "run-fixture-supply-chain-002",
      workspaceId: "wk-fixture-supply-chain",
      operatorIdentityAlias: "ops.release.fixture",
    },
    inventoryPath,
    existingInventoryPath: inventoryPath,
  });

  expect(adopted.outcome).toBe("SUPPLY_CHAIN_DECLARED_PROVIDER_SELECTION_REQUIRED");
  expect(adopted.steps[5]?.status).toBe("SKIPPED_AS_ALREADY_PRESENT");
});
