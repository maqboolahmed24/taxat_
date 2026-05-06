import { expect, test } from "@playwright/test";

import {
  ApiCommandReceiptRepository,
  registerPostCommandsRoute,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  actorContext,
  fixedNow,
  workItemCommandEnvelope,
  workspaceRouteState,
} from "../../unit/backend_northbound/post_commands_fixtures.ts";

test("POST /v1/commands route registration exposes the durable receipt contract", async () => {
  const repository = new ApiCommandReceiptRepository();
  let registeredPath: string | null = null;
  let registeredHandler: unknown = null;
  const handler = registerPostCommandsRoute(
    {
      post: (path, routeHandler) => {
        registeredPath = path;
        registeredHandler = routeHandler;
      },
    },
    {
      clock: () => fixedNow,
      receiptRepository: repository,
      routeStateResolver: () => workspaceRouteState(),
    },
  );

  expect(registeredPath).toBe("/v1/commands");
  expect(registeredHandler).toBe(handler);
  const response = await handler({
    actorContext: actorContext(),
    body: await workItemCommandEnvelope(),
    correlationId: "corr.api.contract",
    method: "POST",
    path: "/v1/commands",
  });

  expect(response.status).toBe(202);
  expect(response.body.artifact_type).toBe("ApiCommandReceipt");
  expect(response.body.acceptance_state).toBe("ACCEPTED");
  expect(response.body.request_hash).toMatch(/^[a-f0-9]{64}$/);
});
