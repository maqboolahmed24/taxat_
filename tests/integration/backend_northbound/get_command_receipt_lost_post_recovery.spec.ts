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

test("lost POST response can be recovered from GET /v1/commands/{command_id}", async () => {
  const repository = new ApiCommandReceiptRepository();
  const body = await workItemCommandEnvelope();
  const postResponse = await postCommandsEndpoint(
    {
      actorContext: actorContext(),
      body,
      correlationId: "corr.get.lost-post.submit",
      method: "POST",
      path: "/v1/commands",
    },
    {
      clock: () => fixedNow,
      receiptRepository: repository,
      routeStateResolver: () => workspaceRouteState(),
    },
  );

  expect(postResponse.status).toBe(202);
  const recovered = await getCommandReceiptEndpoint(
    {
      actorContext: actorContext({
        session_ref: "session.workspace-relaunched",
      }),
      correlationId: "corr.get.lost-post.recover",
      method: "GET",
      path: `/v1/commands/${encodeURIComponent(body.command_id)}`,
    },
    {
      receiptRepository: repository,
    },
  );

  expect(recovered.status).toBe(200);
  expect(recovered.headers["Cache-Control"]).toBe("no-store");
  expect(recovered.body.artifact_type).toBe("ApiCommandReceipt");
  expect(recovered.body.receipt_id).toBe(postResponse.body.receipt_id);
  expect(recovered.body.command_id).toBe(body.command_id);
  expect(recovered.body.idempotency_key).toBe(body.idempotency_key);
  expect(recovered.body.request_hash).toBe(postResponse.body.request_hash);
  expect(recovered.body.latest_projection_ref).toBe("workspace.snapshot.live");
  expect(recovered.body.result_ref ?? recovered.body.audit_event_refs[0]).toBeTruthy();
});
