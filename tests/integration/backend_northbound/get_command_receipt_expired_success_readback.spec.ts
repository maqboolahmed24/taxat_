import { expect, test } from "@playwright/test";

import {
  type ApiCommandReceipt,
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

test("expired success receipt keeps original posture and recovery anchor family", async () => {
  const repository = new ApiCommandReceiptRepository();
  const body = await workItemCommandEnvelope({
    command_id: "command.workspace.expired.001",
    idempotency_key: "idem.workspace.expired.001",
  });
  const accepted = await postCommandsEndpoint(
    {
      actorContext: actorContext(),
      body,
      correlationId: "corr.get.expired.submit",
      method: "POST",
      path: "/v1/commands",
    },
    {
      clock: () => fixedNow,
      receiptRepository: repository,
      routeStateResolver: () => workspaceRouteState(),
    },
  );
  expect(accepted.status).toBe(202);

  const [stored] = await repository.listApiCommandReceipts();
  const expiredReceipt = {
    ...(accepted.body as ApiCommandReceipt),
    acceptance_state: "EXPIRED",
    original_acceptance_state: "ACCEPTED",
    reason_codes: ["RECEIPT_EXPIRED"],
    receipt_id: `${(accepted.body as ApiCommandReceipt).receipt_id}.expired`,
  } satisfies ApiCommandReceipt;
  await repository.persistApiCommandReceipt({
    command: stored.command,
    duplicate_suppression_key: stored.duplicate_suppression_key,
    persisted_at: "2026-05-04T10:00:00.000Z",
    receipt: expiredReceipt,
  });

  const response = await getCommandReceiptEndpoint(
    {
      actorContext: actorContext(),
      commandId: body.command_id,
      correlationId: "corr.get.expired.read",
      method: "GET",
    },
    {
      receiptRepository: repository,
    },
  );

  expect(response.status).toBe(200);
  expect(response.body.acceptance_state).toBe("EXPIRED");
  expect(response.body.original_acceptance_state).toBe("ACCEPTED");
  expect(response.body.command_id).toBe(body.command_id);
  expect(response.body.request_hash).toBe((accepted.body as ApiCommandReceipt).request_hash);
  expect(response.body.idempotency_key).toBe(body.idempotency_key);
  expect(response.body.result_ref).toBe((accepted.body as ApiCommandReceipt).result_ref);
  expect(response.body.audit_event_refs).toEqual(
    (accepted.body as ApiCommandReceipt).audit_event_refs,
  );
});
