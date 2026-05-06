import { expect, test } from "@playwright/test";

import {
  ApiCommandReceiptRepository,
  postCommandsEndpoint,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  actorContext,
  fixedNow,
  workItemCommandEnvelope,
  workspaceRouteState,
} from "../../unit/backend_northbound/post_commands_fixtures.ts";

test("stale work-item guard returns a rebase problem and durable stale receipt", async () => {
  const repository = new ApiCommandReceiptRepository();
  let dispatchCount = 0;
  const response = await postCommandsEndpoint(
    {
      actorContext: actorContext(),
      body: await workItemCommandEnvelope({
        command_id: "command.workspace.stale.001",
        idempotency_key: "idem.workspace.stale.001",
        if_match_work_item_version: 27,
      }),
      correlationId: "corr.stale.workspace",
      method: "POST",
      path: "/v1/commands",
    },
    {
      clock: () => fixedNow,
      domainCommandHandler: () => {
        dispatchCount += 1;
        return {
          dispatch_ref: "dispatch.unexpected",
          dispatched_at: fixedNow.toISOString(),
        };
      },
      receiptRepository: repository,
      routeStateResolver: () => workspaceRouteState(),
    },
  );

  expect(response.status).toBe(409);
  expect(response.body.artifact_type).toBe("ProblemEnvelope");
  expect(response.body.problem_code).toBe("VIEW_STALE");
  expect(response.body.latest_workspace_snapshot_ref).toBe("workspace.snapshot.live");
  expect(response.body.latest_command_receipt_ref).toMatch(/^receipt\./);
  expect(response.body.latest_stale_guard_value).toBe(28);
  expect(dispatchCount).toBe(0);

  const stored = await repository.listApiCommandReceipts();
  expect(stored).toHaveLength(1);
  expect(stored[0]?.receipt.acceptance_state).toBe("REJECTED_STALE_VIEW");
});
