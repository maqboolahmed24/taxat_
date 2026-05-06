import { expect, test } from "@playwright/test";

import {
  getWorkItemWorkspaceSnapshotEndpoint,
  validateStoredWorkspaceSnapshot,
} from "../../../packages/backend-northbound/src/index.ts";
import { persistedWorkspaceFixture } from "./workspace_read_fixtures.ts";

test("customer snapshots keep portal shell, customer modules, and no internal posture", async () => {
  const fixture = await persistedWorkspaceFixture({ viewerScope: "CUSTOMER_VISIBLE" });
  const stored = validateStoredWorkspaceSnapshot(fixture.storedSnapshot);

  expect(stored.record.shell_family).toBe("CLIENT_PORTAL_SHELL");
  expect(stored.record.internal_head_sequence_or_null).toBeNull();
  expect(stored.record.detail_drawer.modules.map((module) => module.module_code)).toEqual([
    "CUSTOMER_ACTIVITY",
    "FILES",
  ]);
  expect(
    stored.record.participants.every(
      (participant) => participant.watch_state === "CUSTOMER_PARTICIPANT",
    ),
  ).toBe(true);
  expect(stored.record.queue_projection.internal_unread_count_or_null).toBeNull();
});

test("snapshot endpoint applies ETag equal to workspace_version", async () => {
  const fixture = await persistedWorkspaceFixture({ viewerScope: "STAFF_FULL" });
  const first = await getWorkItemWorkspaceSnapshotEndpoint(
    {
      actorContext: fixture.actorContext,
      itemId: fixture.itemId,
      method: "GET",
      viewerScope: "STAFF_FULL",
    },
    {
      workspaceSnapshotRepository: fixture.workspaceSnapshotRepository,
    },
  );

  expect(first.status).toBe(200);
  if (first.status !== 200) {
    throw new Error(first.body.problem_code);
  }
  expect(first.headers.ETag).toBe(String(first.body.workspace_version));

  const second = await getWorkItemWorkspaceSnapshotEndpoint(
    {
      actorContext: fixture.actorContext,
      ifNoneMatch: first.headers.ETag,
      itemId: fixture.itemId,
      method: "GET",
      viewerScope: "STAFF_FULL",
    },
    {
      workspaceSnapshotRepository: fixture.workspaceSnapshotRepository,
    },
  );

  expect(second.status).toBe(304);
});

test("rejects same-object drift in context bar and participant rows", async () => {
  const fixture = await persistedWorkspaceFixture({ viewerScope: "STAFF_FULL" });

  expect(() =>
    validateStoredWorkspaceSnapshot({
      ...fixture.storedSnapshot,
      record: {
        ...fixture.storedSnapshot.record,
        context_bar: {
          ...fixture.storedSnapshot.record.context_bar,
          item_id: "other-item",
        },
      },
    }),
  ).toThrow(/item_id/);

  expect(() =>
    validateStoredWorkspaceSnapshot({
      ...fixture.storedSnapshot,
      record: {
        ...fixture.storedSnapshot.record,
        participants: [
          {
            ...fixture.storedSnapshot.record.participants[0],
            item_id: "other-item",
          },
        ],
      },
    }),
  ).toThrow(/participants/);
});
