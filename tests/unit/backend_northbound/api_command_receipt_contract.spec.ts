import { expect, test } from "@playwright/test";

import {
  ApiCommandReceiptRepository,
  assertApiCommandReceiptContract,
  postCommandsEndpoint,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  actorContext,
  fixedNow,
  workItemCommandEnvelope,
  workspaceRouteState,
} from "./post_commands_fixtures.ts";

test("accepted receipts retain durable recovery anchors alongside projection mirrors", async () => {
  const repository = new ApiCommandReceiptRepository();
  const response = await postCommandsEndpoint(
    {
      actorContext: actorContext(),
      body: await workItemCommandEnvelope(),
      correlationId: "corr.receipt.accepted",
      method: "POST",
      path: "/v1/commands",
    },
    {
      clock: () => fixedNow,
      receiptRepository: repository,
      routeStateResolver: () => workspaceRouteState(),
    },
  );

  expect(response.status).toBe(202);
  assertApiCommandReceiptContract(response.body);
  expect(response.body.acceptance_state).toBe("ACCEPTED");
  expect(response.body.audit_event_refs).toEqual([`audit-event.${response.body.request_hash}`]);
});

test("success-class receipts cannot use latest_projection_ref as the sole recovery basis", async () => {
  const repository = new ApiCommandReceiptRepository();
  const response = await postCommandsEndpoint(
    {
      actorContext: actorContext(),
      body: await workItemCommandEnvelope(),
      correlationId: "corr.receipt.projection-only",
      method: "POST",
      path: "/v1/commands",
    },
    {
      clock: () => fixedNow,
      receiptRepository: repository,
      routeStateResolver: () => workspaceRouteState(),
    },
  );

  const invalid = {
    ...response.body,
    activity_refs: [],
    audit_event_refs: [],
    notification_refs: [],
    result_ref: null,
  };

  expect(() => assertApiCommandReceiptContract(invalid)).toThrow(
    /latest_projection_ref cannot be the sole/,
  );
});
