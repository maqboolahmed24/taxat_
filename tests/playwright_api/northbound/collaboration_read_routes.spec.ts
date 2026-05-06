import { expect, test } from "@playwright/test";

import {
  getCollaborationActivityRoutePath,
  getCollaborationAttachmentsRoutePath,
  getWorkItemWorkspaceSnapshotRoutePath,
  getWorkItemWorkspaceStreamRoutePath,
  registerCollaborationReadRoutes,
  WorkspaceCursorRepository,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  persistedWorkspaceFixture,
  workspaceStreamRepositoryWithEvents,
} from "../../unit/backend_northbound/workspace_read_fixtures.ts";

test("collaboration read route registry exposes snapshot, stream, activity, and attachments", async () => {
  const fixture = await persistedWorkspaceFixture({ viewerScope: "STAFF_FULL" });
  const paths: string[] = [];
  const handlers = registerCollaborationReadRoutes(
    {
      get: (path) => {
        paths.push(path);
      },
    },
    {
      attachmentRepository: fixture.attachmentRepository,
      entryRepository: fixture.entryRepository,
      threadRepository: fixture.threadRepository,
      workspaceCursorRepository: new WorkspaceCursorRepository(),
      workspaceSnapshotRepository: fixture.workspaceSnapshotRepository,
      workspaceStreamEventRepository: workspaceStreamRepositoryWithEvents({
        eventTypes: ["activity.appended", "workspace.snapshot"],
        sequences: [3, 4],
        storedSnapshot: fixture.storedSnapshot,
      }),
    },
  );

  expect(paths).toEqual([
    getWorkItemWorkspaceSnapshotRoutePath,
    getWorkItemWorkspaceStreamRoutePath,
    getCollaborationActivityRoutePath,
    getCollaborationAttachmentsRoutePath,
  ]);

  const snapshot = await handlers.snapshot({
    actorContext: fixture.actorContext,
    method: "GET",
    path: `/v1/work-items/${encodeURIComponent(fixture.itemId)}/workspace/snapshot?viewer=staff`,
  });
  expect(snapshot.status).toBe(200);
  if (snapshot.status !== 200) {
    throw new Error(snapshot.body.problem_code);
  }
  expect(snapshot.headers["Cache-Control"]).toBe("no-store");
  expect(snapshot.headers.ETag).toBe(String(snapshot.body.workspace_version));

  const activity = await handlers.activity({
    actorContext: fixture.actorContext,
    method: "GET",
    path: `/v1/work-items/${encodeURIComponent(fixture.itemId)}/activity?viewer=staff&thread=internal`,
  });
  expect(activity.status).toBe(200);
  if (activity.status !== 200) {
    throw new Error(activity.body.problem_code);
  }
  expect(activity.body.thread_visibility_class).toBe("INTERNAL_ONLY");

  const attachments = await handlers.attachments({
    actorContext: fixture.actorContext,
    method: "GET",
    path: `/v1/work-items/${encodeURIComponent(fixture.itemId)}/attachments?viewer=staff&visibility=customer&include_history=false`,
  });
  expect(attachments.status).toBe(200);
  if (attachments.status !== 200) {
    throw new Error(attachments.body.problem_code);
  }
  expect(attachments.body.historical_attachment_refs).toEqual([]);

  const stream = await handlers.stream({
    actorContext: fixture.actorContext,
    initialLastAckSequence: 2,
    method: "GET",
    now: "2026-05-03T12:20:00.000Z",
    path: `/v1/work-items/${encodeURIComponent(
      fixture.itemId,
    )}/workspace/stream?viewer=staff&resume_token=${encodeURIComponent(fixture.snapshot.resume_token)}`,
  });
  expect(stream.status).toBe(200);
  if (stream.status !== 200) {
    throw new Error(stream.body.problem_code);
  }
  expect(stream.headers["Content-Type"]).toBe("text/event-stream");
  expect(stream.body).toContain("event: activity.appended");
  expect(stream.body).toContain("event: workspace.snapshot");
  expect(stream.body).toContain(": heartbeat scope=WORKSPACE");
});
