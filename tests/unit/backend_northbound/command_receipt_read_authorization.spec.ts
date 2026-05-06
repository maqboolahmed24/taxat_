import { expect, test } from "@playwright/test";

import {
  ApiCommandReceiptRepository,
  authorizeCommandReceiptRead,
  postCommandsEndpoint,
  type StoredApiCommandReceipt,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  actorContext,
  fixedNow,
  workItemCommandEnvelope,
  workspaceRouteState,
} from "./post_commands_fixtures.ts";

async function storedReceipt() {
  const repository = new ApiCommandReceiptRepository();
  const response = await postCommandsEndpoint(
    {
      actorContext: actorContext(),
      body: await workItemCommandEnvelope(),
      correlationId: "corr.auth.accepted",
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
  const records = await repository.listApiCommandReceipts();
  expect(records).toHaveLength(1);
  return records[0] as StoredApiCommandReceipt;
}

test("same principal and client can recover a receipt after session relaunch", async () => {
  const authorization = authorizeCommandReceiptRead({
    actorContext: actorContext({
      session_ref: "session.workspace-relaunched",
    }),
    storedReceipt: await storedReceipt(),
  });

  expect(authorization.authorized).toBe(true);
  if (authorization.authorized) {
    expect(authorization.targetScopeClass).toBe("WORK_ITEM");
    expect(authorization.targetRef).toBe("work-item.001");
  }
});

test("tenant, principal, and client mismatches are hidden as not-found candidates", async () => {
  const receipt = await storedReceipt();

  for (const mismatchedActor of [
    actorContext({ tenant_id: "tenant.other" }),
    actorContext({ principal_ref: "principal.other" }),
    actorContext({ client_id_or_null: "client.other" }),
  ]) {
    const authorization = authorizeCommandReceiptRead({
      actorContext: mismatchedActor,
      storedReceipt: receipt,
    });
    expect(authorization).toMatchObject({
      authorized: false,
      hidden: true,
      reasonCodes: ["COMMAND_RECEIPT_SCOPE_HIDDEN"],
    });
  }
});

test("target scope corruption is surfaced only after actor visibility is established", async () => {
  const receipt = await storedReceipt();
  const corruptReceipt = {
    ...receipt,
    receipt: {
      ...receipt.receipt,
      manifest_id: "manifest.overloaded",
    },
  } satisfies StoredApiCommandReceipt;

  const authorization = authorizeCommandReceiptRead({
    actorContext: actorContext(),
    storedReceipt: corruptReceipt,
  });

  expect(authorization.authorized).toBe(true);
  if (authorization.authorized && "corruptionReasonCodes" in authorization) {
    expect(authorization.corruptionReasonCodes).toEqual(["COMMAND_RECEIPT_TARGET_SCOPE_CORRUPT"]);
  } else {
    throw new Error("expected target-scope corruption");
  }
});
