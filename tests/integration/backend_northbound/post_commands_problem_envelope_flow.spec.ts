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

test("idempotency key reuse with a different command meaning returns a typed problem", async () => {
  const repository = new ApiCommandReceiptRepository();
  const dependencies = {
    clock: () => fixedNow,
    receiptRepository: repository,
    routeStateResolver: () => workspaceRouteState(),
  };

  const first = await postCommandsEndpoint(
    {
      actorContext: actorContext(),
      body: await workItemCommandEnvelope(),
      correlationId: "corr.problem.first",
      method: "POST",
      path: "/v1/commands",
    },
    dependencies,
  );
  const collision = await postCommandsEndpoint(
    {
      actorContext: actorContext(),
      body: await workItemCommandEnvelope({
        payload: {
          prompt_code: "DIFFERENT_MISSING_DOCUMENT",
        },
      }),
      correlationId: "corr.problem.collision",
      method: "POST",
      path: "/v1/commands",
    },
    dependencies,
  );

  expect(first.status).toBe(202);
  expect(collision.status).toBe(409);
  expect(collision.body.artifact_type).toBe("ProblemEnvelope");
  expect(collision.body.problem_code).toBe("IDEMPOTENCY_COLLISION");
  expect(collision.body.latest_command_receipt_ref).toBe(first.body.receipt_id);
});
