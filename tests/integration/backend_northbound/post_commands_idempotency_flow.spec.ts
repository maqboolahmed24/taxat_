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

test("exact safe retry returns a duplicate-replay receipt and does not dispatch twice", async () => {
  const repository = new ApiCommandReceiptRepository();
  let dispatchCount = 0;
  const dependencies = {
    clock: () => fixedNow,
    domainCommandHandler: () => {
      dispatchCount += 1;
      return {
        dispatch_ref: `dispatch.${dispatchCount}`,
        dispatched_at: fixedNow.toISOString(),
      };
    },
    receiptRepository: repository,
    routeStateResolver: () => workspaceRouteState(),
  };

  const body = await workItemCommandEnvelope();
  const first = await postCommandsEndpoint(
    {
      actorContext: actorContext(),
      body,
      correlationId: "corr.idem.first",
      method: "POST",
      path: "/v1/commands",
    },
    dependencies,
  );
  const second = await postCommandsEndpoint(
    {
      actorContext: actorContext(),
      body,
      correlationId: "corr.idem.second",
      method: "POST",
      path: "/v1/commands",
    },
    dependencies,
  );

  expect(first.status).toBe(202);
  expect(second.status).toBe(200);
  expect(first.body.acceptance_state).toBe("ACCEPTED");
  expect(second.body.acceptance_state).toBe("DUPLICATE_REPLAY");
  expect(second.body.duplicate_of_receipt_id).toBe(first.body.receipt_id);
  expect(dispatchCount).toBe(1);
  expect(await repository.listApiCommandReceipts()).toHaveLength(2);
});
