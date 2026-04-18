import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  createCacheInventoryTemplate,
  provisionCacheAndStreamResumeStore,
} from "../../../infra/cache/bootstrap/provision_cache_and_stream_resume_store.js";

test("dry-run cache bootstrap freezes a sanitized provider-unresolved topology and supports adoption without destructive reset", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "taxat-cache-resume-topology-"));
  const inventoryPath = path.join(tempDir, "cache_inventory.json");

  const result = await provisionCacheAndStreamResumeStore({
    runContext: {
      runId: "run-fixture-cache-resume-topology-001",
      workspaceId: "wk-fixture-cache-resume-topology",
      operatorIdentityAlias: "ops.cache.fixture",
    },
    inventoryPath,
  });

  const persisted = JSON.parse(await readFile(inventoryPath, "utf8"));

  expect(result.outcome).toBe(
    "CACHE_RESUME_TOPOLOGY_DECLARED_PROVIDER_SELECTION_REQUIRED",
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
    createCacheInventoryTemplate({
      runId: "run-fixture-cache-resume-topology-001",
      workspaceId: "wk-fixture-cache-resume-topology",
      operatorIdentityAlias: "ops.cache.fixture",
    }),
  );
  expect(JSON.stringify(persisted)).not.toContain("Bearer ");
  expect(JSON.stringify(persisted)).not.toContain("resume-token-");

  const adopted = await provisionCacheAndStreamResumeStore({
    runContext: {
      runId: "run-fixture-cache-resume-topology-002",
      workspaceId: "wk-fixture-cache-resume-topology",
      operatorIdentityAlias: "ops.cache.fixture",
    },
    inventoryPath,
    existingInventoryPath: inventoryPath,
  });

  expect(adopted.outcome).toBe(
    "CACHE_RESUME_TOPOLOGY_DECLARED_PROVIDER_SELECTION_REQUIRED",
  );
  expect(adopted.steps[5]?.status).toBe("SKIPPED_AS_ALREADY_PRESENT");
});
