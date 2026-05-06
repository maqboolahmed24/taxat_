import { expect, test } from "@playwright/test";

import {
  hashCommandRequest,
  validateCommandEnvelope,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  actorContext,
  uploadFinalizeCommandEnvelope,
  workItemCommandEnvelope,
} from "./post_commands_fixtures.ts";

test("validates a work-item command against the northbound policy binding", async () => {
  const parsed = await validateCommandEnvelope({
    actorContext: actorContext(),
    envelope: await workItemCommandEnvelope(),
  });

  expect(parsed.command.command_type).toBe("REQUEST_CUSTOMER_INFO");
  expect(parsed.command.mutation_precondition_binding.profile_code).toBe(
    "WORK_ITEM_CUSTOMER_APPEND",
  );
});

test("rejects raw upload bytes on the command surface", async () => {
  await expect(
    validateCommandEnvelope({
      actorContext: actorContext({
        session_ref: "session.portal-1",
      }),
      envelope: await uploadFinalizeCommandEnvelope({
        raw_file_bytes: "not allowed here",
        upload_session_id: "upload-session.001",
      }),
    }),
  ).rejects.toMatchObject({
    problemCode: "INVALID_COMMAND_ENVELOPE",
    reasonCodes: ["PAYLOAD_CONTAINS_FORBIDDEN_AUTHORITY_INPUT"],
  });
});

test("request hash includes command_id so body-only duplicate collapse cannot occur", async () => {
  const first = await validateCommandEnvelope({
    actorContext: actorContext(),
    envelope: await workItemCommandEnvelope({
      command_id: "command.workspace.001",
    }),
  });
  const second = await validateCommandEnvelope({
    actorContext: actorContext(),
    envelope: await workItemCommandEnvelope({
      command_id: "command.workspace.002",
    }),
  });

  expect(hashCommandRequest(first).request_hash).not.toBe(
    hashCommandRequest(second).request_hash,
  );
});
