import { expect, test } from "@playwright/test";

import {
  ApiCommandReceiptRepository,
  getCommandReceiptRoutePath,
  postCommandsEndpoint,
  registerGetCommandReceiptRoute,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  actorContext,
  fixedNow,
  workItemCommandEnvelope,
  workspaceRouteState,
} from "../../unit/backend_northbound/post_commands_fixtures.ts";

test("GET /v1/commands/{command_id} route exposes no-store receipt recovery", async () => {
  const repository = new ApiCommandReceiptRepository();
  const body = await workItemCommandEnvelope({
    command_id: "command.workspace.api-get.001",
    idempotency_key: "idem.workspace.api-get.001",
  });
  const submitted = await postCommandsEndpoint(
    {
      actorContext: actorContext(),
      body,
      correlationId: "corr.api.get.submit",
      method: "POST",
      path: "/v1/commands",
    },
    {
      clock: () => fixedNow,
      receiptRepository: repository,
      routeStateResolver: () => workspaceRouteState(),
    },
  );
  expect(submitted.status).toBe(202);

  let registeredPath: string | null = null;
  let registeredHandler: unknown = null;
  const handler = registerGetCommandReceiptRoute(
    {
      get: (path, routeHandler) => {
        registeredPath = path;
        registeredHandler = routeHandler;
      },
    },
    {
      receiptRepository: repository,
    },
  );

  expect(registeredPath).toBe(getCommandReceiptRoutePath);
  expect(registeredHandler).toBe(handler);

  const response = await handler({
    actorContext: actorContext(),
    correlationId: "corr.api.get.read",
    method: "GET",
    path: `/v1/commands/${encodeURIComponent(body.command_id)}`,
  });

  expect(response.status).toBe(200);
  expect(response.headers["Cache-Control"]).toBe("no-store");
  expect(response.body.artifact_type).toBe("ApiCommandReceipt");
  expect(response.body.receipt_id).toBe(submitted.body.receipt_id);
  expect(response.body.command_id).toBe(body.command_id);
  expect(response.body.duplicate_of_receipt_id).not.toBe(response.body.receipt_id);
});

test("hidden and missing command receipts use the same non-leaky 404 envelope", async () => {
  const repository = new ApiCommandReceiptRepository();
  const body = await workItemCommandEnvelope({
    command_id: "command.workspace.api-hidden.001",
    idempotency_key: "idem.workspace.api-hidden.001",
  });
  await postCommandsEndpoint(
    {
      actorContext: actorContext(),
      body,
      correlationId: "corr.api.hidden.submit",
      method: "POST",
      path: "/v1/commands",
    },
    {
      clock: () => fixedNow,
      receiptRepository: repository,
      routeStateResolver: () => workspaceRouteState(),
    },
  );
  const handler = registerGetCommandReceiptRoute(
    {
      register: (route) => {
        void route;
      },
    },
    {
      receiptRepository: repository,
    },
  );

  const hidden = await handler({
    actorContext: actorContext({
      principal_ref: "principal.other",
    }),
    commandId: body.command_id,
    correlationId: "corr.api.hidden.read",
    method: "GET",
  });
  const missing = await handler({
    actorContext: actorContext(),
    commandId: "command.workspace.missing.001",
    correlationId: "corr.api.missing.read",
    method: "GET",
  });

  expect(hidden.status).toBe(404);
  expect(missing.status).toBe(404);
  expect(hidden.body.problem_code).toBe("COMMAND_RECEIPT_NOT_FOUND");
  expect(missing.body.problem_code).toBe("COMMAND_RECEIPT_NOT_FOUND");
  expect(hidden.body.latest_command_receipt_ref).toBeNull();
  expect(missing.body.latest_command_receipt_ref).toBeNull();
  expect(hidden.body.reason_codes).toEqual(missing.body.reason_codes);
});
