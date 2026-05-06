import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  createEdgeInventoryTemplate,
  provisionDnsTlsWafAndEdgeDelivery,
} from "../../../infra/edge/bootstrap/provision_dns_tls_waf_and_edge_delivery.js";

test("dry-run edge bootstrap freezes a sanitized topology and re-adopts matching inventory without duplication", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "taxat-edge-boundary-"));
  const inventoryPath = path.join(tempDir, "edge_inventory.json");

  const result = await provisionDnsTlsWafAndEdgeDelivery({
    runContext: {
      runId: "run-fixture-edge-boundary-001",
      workspaceId: "wk-fixture-edge-boundary",
      operatorIdentityAlias: "ops.edge.fixture",
    },
    inventoryPath,
  });

  const persisted = JSON.parse(await readFile(inventoryPath, "utf8"));

  expect(result.outcome).toBe("EDGE_BOUNDARY_PROVIDER_DEFAULT_APPLIED");
  expect(result.selection_status).toBe("PROVIDER_DEFAULT_APPLIED");
  expect(result.notes).toEqual(
    expect.arrayContaining([
      "No live provider mutation occurred.",
      "This flow is safe to rerun because it only writes sanitized inventory and compares topology drift explicitly.",
    ]),
  );
  expect(
    result.steps.find((step) => step.step_id === "edge.persist-sanitized-inventory")?.status,
  ).toBe("SUCCEEDED");
  expect(persisted).toEqual(
    createEdgeInventoryTemplate({
      runContext: {
        runId: "run-fixture-edge-boundary-001",
        workspaceId: "wk-fixture-edge-boundary",
        operatorIdentityAlias: "ops.edge.fixture",
      },
    }),
  );
  expect(JSON.stringify(persisted).toLowerCase()).not.toContain("password");
  expect(JSON.stringify(persisted).toLowerCase()).not.toContain("secret");
  expect(JSON.stringify(persisted).toLowerCase()).not.toContain("private key");

  const adopted = await provisionDnsTlsWafAndEdgeDelivery({
    runContext: {
      runId: "run-fixture-edge-boundary-002",
      workspaceId: "wk-fixture-edge-boundary",
      operatorIdentityAlias: "ops.edge.fixture",
    },
    inventoryPath,
    existingInventoryPath: inventoryPath,
  });

  expect(adopted.outcome).toBe("EDGE_BOUNDARY_PROVIDER_DEFAULT_APPLIED");
  expect(
    adopted.steps.find((step) => step.step_id === "edge.adopt-or-verify-existing-topology")?.status,
  ).toBe("SKIPPED_AS_ALREADY_PRESENT");
});
