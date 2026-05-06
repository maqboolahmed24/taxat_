import { expect, test } from "@playwright/test";

import {
  type ApiCommandReceipt,
  ApiCommandReceiptRepository,
  CommandReceiptRecoveryAnchorError,
  commandReceiptRecoveryAnchorFamilies,
  postCommandsEndpoint,
  validateCommandReceiptRecoveryAnchors,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  actorContext,
  fixedNow,
  workItemCommandEnvelope,
  workspaceRouteState,
} from "./post_commands_fixtures.ts";

async function acceptedReceipt() {
  const repository = new ApiCommandReceiptRepository();
  const response = await postCommandsEndpoint(
    {
      actorContext: actorContext(),
      body: await workItemCommandEnvelope(),
      correlationId: "corr.anchor.accepted",
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
  return response.body as ApiCommandReceipt;
}

test("activity refs are durable recovery anchors alongside projection mirrors", async () => {
  const receipt = {
    ...(await acceptedReceipt()),
    activity_refs: ["activity.request-customer-info.001"],
    audit_event_refs: [],
    result_ref: null,
  };

  expect(() =>
    validateCommandReceiptRecoveryAnchors({
      receipt,
    }),
  ).not.toThrow();
  expect(commandReceiptRecoveryAnchorFamilies(receipt)).toEqual(["ACTIVITY_REFS"]);
});

test("projection-only success receipts fail closed", async () => {
  const receipt = {
    ...(await acceptedReceipt()),
    activity_refs: [],
    audit_event_refs: [],
    notification_refs: [],
    result_ref: null,
  };

  expect(() =>
    validateCommandReceiptRecoveryAnchors({
      receipt,
    }),
  ).toThrow(CommandReceiptRecoveryAnchorError);
});

test("expired success receipts preserve original posture and anchor family", async () => {
  const accepted = await acceptedReceipt();
  const expired = {
    ...accepted,
    acceptance_state: "EXPIRED",
    original_acceptance_state: "ACCEPTED",
    reason_codes: ["RECEIPT_EXPIRED"],
    receipt_id: `${accepted.receipt_id}.expired`,
  } satisfies ApiCommandReceipt;

  validateCommandReceiptRecoveryAnchors({
    receipt: expired,
  });
  expect(expired.command_id).toBe(accepted.command_id);
  expect(expired.request_hash).toBe(accepted.request_hash);
  expect(expired.idempotency_key).toBe(accepted.idempotency_key);
  expect(commandReceiptRecoveryAnchorFamilies(expired)).toEqual(
    commandReceiptRecoveryAnchorFamilies(accepted),
  );
});

test("duplicate replay receipts must preserve source lineage anchors", async () => {
  const repository = new ApiCommandReceiptRepository();
  const dependencies = {
    clock: () => fixedNow,
    receiptRepository: repository,
    routeStateResolver: () => workspaceRouteState(),
  };
  const body = await workItemCommandEnvelope();
  const first = await postCommandsEndpoint(
    {
      actorContext: actorContext(),
      body,
      correlationId: "corr.anchor.duplicate.first",
      method: "POST",
      path: "/v1/commands",
    },
    dependencies,
  );
  const second = await postCommandsEndpoint(
    {
      actorContext: actorContext(),
      body,
      correlationId: "corr.anchor.duplicate.second",
      method: "POST",
      path: "/v1/commands",
    },
    dependencies,
  );

  expect(second.body.acceptance_state).toBe("DUPLICATE_REPLAY");
  validateCommandReceiptRecoveryAnchors({
    duplicateSource: first.body as ApiCommandReceipt,
    receipt: second.body as ApiCommandReceipt,
  });

  expect(() =>
    validateCommandReceiptRecoveryAnchors({
      duplicateSource: first.body as ApiCommandReceipt,
      receipt: {
        ...(second.body as ApiCommandReceipt),
        result_ref: "result.drifted",
      },
    }),
  ).toThrow(CommandReceiptRecoveryAnchorError);
});
