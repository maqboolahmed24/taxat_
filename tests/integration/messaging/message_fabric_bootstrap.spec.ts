import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  createMessagingInventoryTemplate,
  provisionQueueOrBrokerForOutboxInboxAndWorkerCoordination,
} from "../../../infra/messaging/bootstrap/provision_queue_or_broker_for_outbox_inbox_and_worker_coordination.js";

test("dry-run messaging bootstrap freezes a sanitized provider-unresolved topology and supports adoption without destructive reset", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "taxat-messaging-topology-"));
  const inventoryPath = path.join(tempDir, "messaging_inventory.json");

  const result =
    await provisionQueueOrBrokerForOutboxInboxAndWorkerCoordination({
      runContext: {
        runId: "run-fixture-messaging-topology-001",
        workspaceId: "wk-fixture-messaging-topology",
        operatorIdentityAlias: "ops.messaging.fixture",
      },
      inventoryPath,
    });

  const persisted = JSON.parse(await readFile(inventoryPath, "utf8"));

  expect(result.outcome).toBe(
    "MESSAGING_TOPOLOGY_DECLARED_PROVIDER_SELECTION_REQUIRED",
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
    createMessagingInventoryTemplate({
      runId: "run-fixture-messaging-topology-001",
      workspaceId: "wk-fixture-messaging-topology",
      operatorIdentityAlias: "ops.messaging.fixture",
    }),
  );
  expect(JSON.stringify(persisted)).not.toContain("Bearer ");
  expect(JSON.stringify(persisted)).not.toContain("BEGIN PRIVATE KEY");

  const adopted =
    await provisionQueueOrBrokerForOutboxInboxAndWorkerCoordination({
      runContext: {
        runId: "run-fixture-messaging-topology-002",
        workspaceId: "wk-fixture-messaging-topology",
        operatorIdentityAlias: "ops.messaging.fixture",
      },
      inventoryPath,
      existingInventoryPath: inventoryPath,
    });

  expect(adopted.outcome).toBe(
    "MESSAGING_TOPOLOGY_DECLARED_PROVIDER_SELECTION_REQUIRED",
  );
  expect(adopted.steps[4]?.status).toBe("SKIPPED_AS_ALREADY_PRESENT");
});
