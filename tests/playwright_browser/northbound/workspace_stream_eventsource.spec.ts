import { expect, test } from "@playwright/test";

import {
  getWorkItemWorkspaceStreamEndpoint,
  WorkspaceCursorRepository,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  persistedWorkspaceFixture,
  workspaceStreamRepositoryWithEvents,
} from "../../unit/backend_northbound/workspace_read_fixtures.ts";

test("browser EventSource consumes workspace stream events without fixed sleeps", async ({
  page,
}) => {
  const fixture = await persistedWorkspaceFixture({ viewerScope: "STAFF_FULL" });
  const eventRepository = workspaceStreamRepositoryWithEvents({
    eventTypes: ["activity.appended", "workspace.snapshot"],
    sequences: [3, 4],
    storedSnapshot: fixture.storedSnapshot,
  });
  const response = await getWorkItemWorkspaceStreamEndpoint(
    {
      actorContext: fixture.actorContext,
      initialLastAckSequence: 2,
      itemId: fixture.itemId,
      method: "GET",
      now: "2026-05-03T12:25:00.000Z",
      resumeToken: fixture.snapshot.resume_token,
      viewerScope: "STAFF_FULL",
    },
    {
      workspaceCursorRepository: new WorkspaceCursorRepository(),
      workspaceSnapshotRepository: fixture.workspaceSnapshotRepository,
      workspaceStreamEventRepository: eventRepository,
    },
  );
  expect(response.status).toBe(200);
  if (response.status !== 200) {
    throw new Error(response.body.problem_code);
  }

  const streamUrl = `http://workspace-stream.test/v1/work-items/${encodeURIComponent(
    fixture.itemId,
  )}/workspace/stream?viewer=staff&resume_token=${encodeURIComponent(fixture.snapshot.resume_token)}`;
  await page.route(streamUrl, (route) =>
    route.fulfill({
      body: response.body,
      contentType: "text/event-stream",
      headers: {
        "Cache-Control": "no-store",
      },
      status: 200,
    }),
  );
  await page.goto("about:blank");

  const received = await page.evaluate(
    ({ url }) =>
      new Promise<Array<{ sequence: number; type: string }>>((resolve, reject) => {
        const events: Array<{ sequence: number; type: string }> = [];
        const source = new EventSource(url);
        const timeout = window.setTimeout(() => {
          source.close();
          reject(new Error(`Timed out waiting for workspace events: ${JSON.stringify(events)}`));
        }, 5000);
        const record = (message: MessageEvent<string>) => {
          const parsed = JSON.parse(message.data) as {
            event_type: string;
            workspace_sequence: number;
          };
          events.push({
            sequence: parsed.workspace_sequence,
            type: parsed.event_type,
          });
          if (events.length === 2) {
            window.clearTimeout(timeout);
            source.close();
            resolve(events);
          }
        };
        source.addEventListener("activity.appended", record);
        source.addEventListener("workspace.snapshot", record);
      }),
    { url: streamUrl },
  );

  expect(received).toEqual([
    { sequence: 3, type: "activity.appended" },
    { sequence: 4, type: "workspace.snapshot" },
  ]);
});
