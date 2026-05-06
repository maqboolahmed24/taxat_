import { expect, test } from "@playwright/test";

import {
  serializeWorkspaceStreamEvent,
  validateWorkspaceStreamEvent,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  persistedWorkspaceFixture,
  workspaceStreamEventFixture,
} from "./workspace_read_fixtures.ts";

test("serializes workspace stream events as route-scoped SSE frames", async () => {
  const fixture = await persistedWorkspaceFixture({ viewerScope: "STAFF_FULL" });
  const delta = workspaceStreamEventFixture({
    sequence: 3,
    storedSnapshot: fixture.storedSnapshot,
  });
  const snapshot = workspaceStreamEventFixture({
    eventType: "workspace.snapshot",
    sequence: 4,
    storedSnapshot: fixture.storedSnapshot,
  });

  const serializedDelta = serializeWorkspaceStreamEvent(delta);
  const serializedSnapshot = serializeWorkspaceStreamEvent(snapshot);

  expect(serializedDelta).toContain(
    `id: WORKSPACE:${fixture.itemId}:${fixture.snapshot.frame_epoch}:3`,
  );
  expect(serializedDelta).toContain("event: workspace.delta");
  expect(serializedDelta).toContain(`"delta_ref":"workspace-delta://${fixture.itemId}/3"`);
  expect(serializedSnapshot).toContain("event: workspace.snapshot");
  expect(serializedSnapshot).toContain(`"snapshot_ref":"${fixture.storedSnapshot.snapshot_ref}"`);
});

test("heartbeats serialize as comments without payload refs", async () => {
  const fixture = await persistedWorkspaceFixture({ viewerScope: "CUSTOMER_VISIBLE" });
  const heartbeat = workspaceStreamEventFixture({
    eventType: "heartbeat",
    sequence: fixture.snapshot.last_published_sequence,
    storedSnapshot: fixture.storedSnapshot,
  });

  const serialized = serializeWorkspaceStreamEvent(heartbeat);

  expect(serialized).toContain(
    `: heartbeat scope=WORKSPACE route=${fixture.snapshot.workspace_route_key}`,
  );
  expect(serialized).not.toContain("event:");
  expect(serialized).not.toContain("data:");
});

test("rejects mixed payload refs and customer audit delivery", async () => {
  const customer = await persistedWorkspaceFixture({ viewerScope: "CUSTOMER_VISIBLE" });
  const delta = workspaceStreamEventFixture({
    sequence: 3,
    storedSnapshot: customer.storedSnapshot,
  });
  expect(() =>
    validateWorkspaceStreamEvent({
      ...delta,
      snapshot_ref: "workspace-snapshot://unexpected",
    }),
  ).toThrow(/only delta_ref/);

  expect(() =>
    validateWorkspaceStreamEvent({
      ...workspaceStreamEventFixture({
        eventType: "audit.appended",
        sequence: 4,
        storedSnapshot: customer.storedSnapshot,
      }),
      audit_ref: "audit://forbidden",
    }),
  ).toThrow(/customer/);
});
