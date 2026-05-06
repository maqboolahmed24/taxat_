import { expect, test } from "@playwright/test";

import {
  getWorkItemWorkspaceStreamEndpoint,
  WorkspaceCursorRepository,
  WorkspaceStreamEventRepository,
} from "../../../packages/backend-northbound/src/index.ts";
import { validateContractSchema } from "../../unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  persistedWorkspaceFixture,
  workspaceStreamEventFixture,
} from "../../unit/backend_northbound/workspace_read_fixtures.ts";

test("workspace stream reconnect keeps cursor recovery hashed and heartbeat recovery raw", async () => {
  const fixture = await persistedWorkspaceFixture({
    itemId: "workflow-item-pc0168-reconnect",
    viewerScope: "STAFF_FULL",
  });
  const cursorRepository = new WorkspaceCursorRepository();
  const eventRepository = new WorkspaceStreamEventRepository();

  const first = await getWorkItemWorkspaceStreamEndpoint(
    {
      actorContext: fixture.actorContext,
      correlationId: "corr.pc0168.workspace.reconnect.first",
      itemId: fixture.itemId,
      method: "GET",
      now: "2026-05-04T09:08:00.000Z",
      resumeToken: fixture.snapshot.resume_token,
      viewerScope: "STAFF_FULL",
    },
    {
      workspaceCursorRepository: cursorRepository,
      workspaceSnapshotRepository: fixture.workspaceSnapshotRepository,
      workspaceStreamEventRepository: eventRepository,
    },
  );
  expect(first.status).toBe(200);
  if (first.status !== 200) {
    throw new Error(first.body.problem_code);
  }
  expect(first.cursor.stream_recovery_contract.resume_binding_representation).toBe("HASHED_TOKEN");

  const reconnect = await getWorkItemWorkspaceStreamEndpoint(
    {
      actorContext: fixture.actorContext,
      correlationId: "corr.pc0168.workspace.reconnect.second",
      itemId: fixture.itemId,
      method: "GET",
      now: "2026-05-04T09:08:30.000Z",
      resumeToken: fixture.snapshot.resume_token,
      viewerScope: "STAFF_FULL",
    },
    {
      workspaceCursorRepository: cursorRepository,
      workspaceSnapshotRepository: fixture.workspaceSnapshotRepository,
      workspaceStreamEventRepository: eventRepository,
    },
  );
  expect(reconnect.status).toBe(200);
  if (reconnect.status !== 200) {
    throw new Error(reconnect.body.problem_code);
  }
  expect(reconnect.cursor.stream_recovery_contract.resume_binding_representation).toBe(
    "HASHED_TOKEN",
  );
  expect(reconnect.events[0]?.stream_recovery_contract.resume_binding_representation).toBe(
    "RAW_TOKEN",
  );
  expect(reconnect.events[0]?.stream_recovery_contract.resume_binding_ref_or_null).toBe(
    fixture.snapshot.resume_token,
  );
  await validateContractSchema("workspace_cursor", reconnect.cursor);
});

test("workspace stream rebase failure keeps cursor and problem recovery contracts schema-valid", async () => {
  const fixture = await persistedWorkspaceFixture({
    itemId: "workflow-item-pc0168-gap",
    viewerScope: "STAFF_FULL",
  });
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
      correlationId: "corr.pc0168.workspace.gap",
      includeHeartbeat: false,
      initialLastAckSequence: 2,
      itemId: fixture.itemId,
      method: "GET",
      now: "2026-05-04T09:10:00.000Z",
      resumeToken: fixture.snapshot.resume_token,
      viewerScope: "STAFF_FULL",
    },
    {
      workspaceCursorRepository: cursorRepository,
      workspaceSnapshotRepository: fixture.workspaceSnapshotRepository,
      workspaceStreamEventRepository: eventRepository,
    },
  );

  expect(response.status).toBe(409);
  expect(response.body.problem_code).toBe("REBASE_REQUIRED");
  expect(response.body.latest_workspace_snapshot_ref).toBe(fixture.storedSnapshot.snapshot_ref);
  expect(response.body.latest_command_receipt_ref).toMatch(/^stream-recovery-receipt:\/\//);
  expect(response.body.latest_resume_token).toBeNull();
  await validateContractSchema("problem_envelope", response.body);

  const [cursor] = await cursorRepository.listCursors();
  expect(cursor.cursor_state).toBe("REBASED");
  expect(cursor.stream_recovery_contract.delivery_window_state).toBe("REBASE_REQUIRED");
  expect(cursor.stream_recovery_contract.resume_binding_representation).toBe("HASHED_TOKEN");
  expect(cursor.stream_recovery_contract.resume_binding_ref_or_null).toBeNull();
  expect(cursor.replacement_snapshot_ref).not.toBe(cursor.latest_snapshot_ref);
  await validateContractSchema("workspace_cursor", cursor);
});
