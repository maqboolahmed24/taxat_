import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  createMessageFabricAtlasViewModel,
  createMessagingInventoryTemplate,
  createOutboxInboxChannelMatrix,
  validateOutboxInboxChannelMatrix,
  type MessageFabricAtlasViewModel,
  type MessagingInventoryTemplate,
  type OutboxInboxChannelMatrix,
} from "../../../../infra/messaging/bootstrap/provision_queue_or_broker_for_outbox_inbox_and_worker_coordination.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
);

async function readJson<T>(segments: string[]): Promise<T> {
  return JSON.parse(
    await readFile(path.join(repoRoot, ...segments), "utf8"),
  ) as T;
}

test("checked-in channel matrix, inventory, and atlas payload match the builder", async () => {
  const persistedMatrix = await readJson<OutboxInboxChannelMatrix>([
    "config",
    "messaging",
    "outbox_inbox_channel_matrix.json",
  ]);
  const persistedInventory = await readJson<MessagingInventoryTemplate>([
    "data",
    "provisioning",
    "messaging_inventory.template.json",
  ]);
  const sampleRun = await readJson<{
    messageFabricAtlas: MessageFabricAtlasViewModel;
  }>([
    "automation",
    "provisioning",
    "report_viewer",
    "data",
    "sample_run.json",
  ]);

  expect(persistedMatrix).toEqual(createOutboxInboxChannelMatrix());
  expect(persistedInventory).toEqual(createMessagingInventoryTemplate());
  expect(sampleRun.messageFabricAtlas).toEqual(createMessageFabricAtlasViewModel());
});

test("channel matrix keeps durable outboxes, authenticated ingress, and rebuildable broker law explicit", () => {
  const matrix = createOutboxInboxChannelMatrix();
  validateOutboxInboxChannelMatrix(matrix);

  expect(matrix.family_rows).toHaveLength(5);
  expect(matrix.channel_rows.length).toBeGreaterThanOrEqual(10);
  expect(
    matrix.channel_rows.every(
      (row) =>
        row.payload_posture === "OPAQUE_REFS_AND_BASIS_HASHES_ONLY" ||
        row.payload_posture === "OPAQUE_REFS_PLUS_AUTH_METADATA_NO_SECRETS",
    ),
  ).toBe(true);

  const callbackIngress = matrix.channel_rows.find(
    (row) => row.channel_ref === "channel.authority.callback.ingress",
  );
  expect(callbackIngress?.outbox_mode).toBe("NONE_EXTERNAL_SOURCE");
  expect(callbackIngress?.outbox_ref_or_null).toBeNull();
  expect(callbackIngress?.inbox_mode).toBe(
    "AUTHENTICATED_DEDUPE_INBOX_REQUIRED",
  );
  expect(callbackIngress?.truth_boundary_statement).toContain(
    "before legal-state mutation",
  );
  expect(callbackIngress?.truth_boundary_statement).toContain(
    "authenticated dedupe inbox",
  );

  const stageDispatch = matrix.channel_rows.find(
    (row) => row.channel_ref === "channel.manifest.stage.dispatch",
  );
  expect(stageDispatch?.outbox_mode).toBe("TRANSACTIONAL_OUTBOX_REQUIRED");
  expect(stageDispatch?.outbox_identity_fields).toEqual(
    expect.arrayContaining([
      "tenant_id",
      "manifest_ref",
      "stage_code",
      "command_receipt_ref",
    ]),
  );
  expect(stageDispatch?.rebuild_basis_refs).toEqual(
    expect.arrayContaining(["RunManifest", "ManifestStageRecord"]),
  );
  expect(stageDispatch?.truth_boundary_statement).toMatch(/broker|transport/i);
});
