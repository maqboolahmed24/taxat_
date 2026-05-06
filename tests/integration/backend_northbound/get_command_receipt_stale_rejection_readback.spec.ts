import { expect, test } from "@playwright/test";

import {
  ApiCommandReceiptRepository,
  getCommandReceiptEndpoint,
  postCommandsEndpoint,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  actorContext,
  fixedNow,
  workItemCommandEnvelope,
  workspaceRouteState,
} from "../../unit/backend_northbound/post_commands_fixtures.ts";

test("stale-view command outcome is returned as a durable receipt readback", async () => {
  const repository = new ApiCommandReceiptRepository();
  const command = await workItemCommandEnvelope({
    command_id: "command.workspace.stale.readback.001",
    idempotency_key: "idem.workspace.stale.readback.001",
    if_match_work_item_version: 27,
  });
  const stale = await postCommandsEndpoint(
    {
      actorContext: actorContext(),
      body: command,
      correlationId: "corr.get.stale.submit",
      method: "POST",
      path: "/v1/commands",
    },
    {
      clock: () => fixedNow,
      receiptRepository: repository,
      routeStateResolver: () => workspaceRouteState(),
    },
  );

  expect(stale.status).toBe(409);
  expect(stale.body.artifact_type).toBe("ProblemEnvelope");
  expect(stale.body.latest_command_receipt_ref).toMatch(/^receipt\./);

  const response = await getCommandReceiptEndpoint(
    {
      actorContext: actorContext(),
      commandId: command.command_id,
      correlationId: "corr.get.stale.read",
      method: "GET",
    },
    {
      receiptRepository: repository,
    },
  );

  expect(response.status).toBe(200);
  expect(response.body.artifact_type).toBe("ApiCommandReceipt");
  expect(response.body.acceptance_state).toBe("REJECTED_STALE_VIEW");
  expect(response.body.stale_guard_family).toBe("WORK_ITEM_VERSION");
  expect(response.body.latest_stale_guard_value).toBe(28);
  expect(response.body.latest_stability_contract_or_null).not.toBeNull();
  expect(response.body.latest_projection_ref).toBe("workspace.snapshot.live");
});
