import { expect, test } from "@playwright/test";

import {
  ApiCommandReceiptRepository,
  getClientPortalWorkspaceEndpoint,
  getWorkItemWorkspaceSnapshotEndpoint,
  postCommandsEndpoint,
} from "../../../packages/backend-northbound/src/index.ts";
import { validateContractSchema } from "../../unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  clientPortalReadRepositoriesFixture,
  portalReadActorContext,
} from "../../unit/backend_northbound/client_portal_read_fixtures.ts";
import {
  actorContext,
  fixedNow,
  workItemCommandEnvelope,
  workspaceRouteState,
} from "../../unit/backend_northbound/post_commands_fixtures.ts";
import { persistedWorkspaceFixture } from "../../unit/backend_northbound/workspace_read_fixtures.ts";

test("representative routes keep centralized ETags and stale command problems schema-valid", async () => {
  const workspaceFixture = await persistedWorkspaceFixture({ viewerScope: "STAFF_FULL" });
  const snapshot = await getWorkItemWorkspaceSnapshotEndpoint(
    {
      actorContext: workspaceFixture.actorContext,
      ifNoneMatch: String(workspaceFixture.snapshot.workspace_version),
      itemId: workspaceFixture.itemId,
      method: "GET",
      viewerScope: "STAFF_FULL",
    },
    {
      workspaceSnapshotRepository: workspaceFixture.workspaceSnapshotRepository,
    },
  );
  expect(snapshot.status).toBe(304);
  expect(snapshot.headers.ETag).toBe(String(workspaceFixture.snapshot.workspace_version));

  const { clientPortalWorkspaceRepository } = await clientPortalReadRepositoriesFixture();
  const portal = await getClientPortalWorkspaceEndpoint(
    {
      actorContext: portalReadActorContext,
      ifNoneMatch: '"12"',
      method: "GET",
    },
    {
      clientPortalWorkspaceRepository,
    },
  );
  expect(portal.status).toBe(304);
  expect(portal.headers.ETag).toBe("12");

  const repository = new ApiCommandReceiptRepository();
  let dispatchCount = 0;
  const stale = await postCommandsEndpoint(
    {
      actorContext: actorContext(),
      body: await workItemCommandEnvelope({
        command_id: "command.pc0167.stale",
        idempotency_key: "idem.pc0167.stale",
        if_match_work_item_version: 27,
      }),
      correlationId: "corr.pc0167.integration.stale",
      method: "POST",
      path: "/v1/commands",
    },
    {
      clock: () => fixedNow,
      domainCommandHandler: () => {
        dispatchCount += 1;
        return {
          dispatch_ref: "dispatch.unexpected.pc0167",
          dispatched_at: fixedNow.toISOString(),
        };
      },
      receiptRepository: repository,
      routeStateResolver: () => workspaceRouteState(),
    },
  );

  expect(stale.status).toBe(409);
  expect(stale.body.artifact_type).toBe("ProblemEnvelope");
  expect(stale.body.problem_code).toBe("VIEW_STALE");
  expect(stale.body.latest_workspace_snapshot_ref).toBe("workspace.snapshot.live");
  expect(stale.body.latest_command_receipt_ref).toMatch(/^receipt\./);
  expect(dispatchCount).toBe(0);
  await validateContractSchema("problem_envelope", stale.body);
});
