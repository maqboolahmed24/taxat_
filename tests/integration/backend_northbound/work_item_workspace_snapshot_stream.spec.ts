import { expect, test } from "@playwright/test";

import {
  getWorkItemWorkspaceSnapshotEndpoint,
  getWorkItemWorkspaceStreamEndpoint,
  WorkspaceCursorRepository,
  WorkspaceStreamEventRepository,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  persistedWorkspaceFixture,
  workspaceStreamEventFixture,
} from "../../unit/backend_northbound/workspace_read_fixtures.ts";

test("reads a workspace snapshot and resumes stream catch-up before heartbeat", async () => {
  const fixture = await persistedWorkspaceFixture({ viewerScope: "STAFF_FULL" });
  const cursorRepository = new WorkspaceCursorRepository();
  const eventRepository = new WorkspaceStreamEventRepository();
  eventRepository.persistEvent({
    event: workspaceStreamEventFixture({
      eventType: "activity.appended",
      sequence: 3,
      storedSnapshot: fixture.storedSnapshot,
    }),
  });
  eventRepository.persistEvent({
    event: workspaceStreamEventFixture({
      eventType: "workspace.snapshot",
      sequence: 4,
      storedSnapshot: fixture.storedSnapshot,
    }),
  });

  const snapshotResponse = await getWorkItemWorkspaceSnapshotEndpoint(
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
  expect(snapshotResponse.status).toBe(200);
  if (snapshotResponse.status !== 200) {
    throw new Error(snapshotResponse.body.problem_code);
  }

  const streamResponse = await getWorkItemWorkspaceStreamEndpoint(
    {
      actorContext: fixture.actorContext,
      initialLastAckSequence: 2,
      itemId: fixture.itemId,
      method: "GET",
      now: "2026-05-03T12:10:00.000Z",
      resumeToken: fixture.snapshot.resume_token,
      viewerScope: "STAFF_FULL",
    },
    {
      workspaceCursorRepository: cursorRepository,
      workspaceSnapshotRepository: fixture.workspaceSnapshotRepository,
      workspaceStreamEventRepository: eventRepository,
    },
  );

  expect(streamResponse.status).toBe(200);
  if (streamResponse.status !== 200) {
    throw new Error(streamResponse.body.problem_code);
  }
  expect(streamResponse.headers["Content-Type"]).toBe("text/event-stream");
  expect(streamResponse.events.map((event) => event.event_type)).toEqual([
    "activity.appended",
    "workspace.snapshot",
    "heartbeat",
  ]);
  expect(streamResponse.events.map((event) => event.workspace_sequence)).toEqual([3, 4, 4]);
  expect(streamResponse.cursor.last_ack_sequence).toBe(4);
});

test("stream resume fails closed with REBASE_REQUIRED when catch-up has a gap", async () => {
  const fixture = await persistedWorkspaceFixture({ viewerScope: "STAFF_FULL" });
  const cursorRepository = new WorkspaceCursorRepository();
  const eventRepository = new WorkspaceStreamEventRepository();
  eventRepository.persistEvent({
    event: workspaceStreamEventFixture({
      eventType: "workspace.snapshot",
      sequence: 4,
      storedSnapshot: fixture.storedSnapshot,
    }),
  });

  const response = await getWorkItemWorkspaceStreamEndpoint(
    {
      actorContext: fixture.actorContext,
      correlationId: "corr.workspace.gap",
      initialLastAckSequence: 2,
      itemId: fixture.itemId,
      method: "GET",
      now: "2026-05-03T12:15:00.000Z",
      resumeToken: fixture.snapshot.resume_token,
      viewerScope: "STAFF_FULL",
    },
    {
      workspaceCursorRepository: cursorRepository,
      workspaceSnapshotRepository: fixture.workspaceSnapshotRepository,
      workspaceStreamEventRepository: eventRepository,
    },
  );
  const cursors = await cursorRepository.listCursors();

  expect(response.status).toBe(409);
  expect(response.body.problem_code).toBe("REBASE_REQUIRED");
  expect(response.body.reason_codes).toContain("SEQUENCE_GAP_DETECTED");
  expect(cursors).toHaveLength(1);
  expect(cursors[0].cursor_state).toBe("REBASED");
  expect(cursors[0].replacement_snapshot_ref).not.toBe(cursors[0].latest_snapshot_ref);
});
