import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  createObservabilityInventoryTemplate,
  provisionOtelCollectionAndBackends,
} from "../../../infra/observability/bootstrap/provision_otel_collection_and_backends.js";

test("dry-run OpenTelemetry bootstrap freezes a sanitized provider-unresolved topology and supports adoption without destructive reset", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "taxat-otel-topology-"));
  const inventoryPath = path.join(tempDir, "observability_inventory.json");

  const result = await provisionOtelCollectionAndBackends({
    runContext: {
      runId: "run-fixture-telemetry-topology-001",
      workspaceId: "wk-fixture-telemetry-topology",
      operatorIdentityAlias: "ops.telemetry.fixture",
    },
    inventoryPath,
  });

  const persisted = JSON.parse(await readFile(inventoryPath, "utf8"));

  expect(result.outcome).toBe(
    "OTEL_TOPOLOGY_DECLARED_PROVIDER_SELECTION_REQUIRED",
  );
  expect(result.selection_status).toBe("PROVIDER_SELECTION_REQUIRED");
  expect(result.steps[0]?.status).toBe("BLOCKED_BY_POLICY");
  expect(result.steps.slice(1).every((step) => step.status === "SUCCEEDED")).toBe(
    true,
  );
  expect(result.notes).toEqual(
    expect.arrayContaining([
      "No live provider mutation occurred.",
      "This flow is safe to rerun because unresolved-provider posture only writes sanitized inventory and compares drift explicitly.",
    ]),
  );
  expect(persisted).toEqual(
    createObservabilityInventoryTemplate({
      runId: "run-fixture-telemetry-topology-001",
      workspaceId: "wk-fixture-telemetry-topology",
      operatorIdentityAlias: "ops.telemetry.fixture",
    }),
  );
  expect(JSON.stringify(persisted)).not.toContain("Bearer ");
  expect(JSON.stringify(persisted)).not.toContain("BEGIN PRIVATE KEY");
  expect(JSON.stringify(persisted)).not.toContain("token_value");

  const adopted = await provisionOtelCollectionAndBackends({
    runContext: {
      runId: "run-fixture-telemetry-topology-002",
      workspaceId: "wk-fixture-telemetry-topology",
      operatorIdentityAlias: "ops.telemetry.fixture",
    },
    inventoryPath,
    existingInventoryPath: inventoryPath,
  });

  expect(adopted.outcome).toBe(
    "OTEL_TOPOLOGY_DECLARED_PROVIDER_SELECTION_REQUIRED",
  );
  expect(adopted.steps[5]?.status).toBe("SKIPPED_AS_ALREADY_PRESENT");
});
