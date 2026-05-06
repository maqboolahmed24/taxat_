import { expect, test } from "@playwright/test";

import {
  buildUploadBlobChecksumPlan,
  ClientUploadSessionRepository,
  getUploadSessionStatusEndpoint,
  postUploadSessionsEndpoint,
  putUploadBlobEndpoint,
  transitionClientUploadSessionState,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  uploadActorContext,
  uploadAllocationBody,
  uploadChunks,
  uploadFixedNow,
  uploadRequestVersionV2,
} from "../../unit/backend_northbound/upload_session_fixtures.ts";

test("in-flight request rebase preserves frozen lineage and blocks current-request satisfaction", async () => {
  const repository = new ClientUploadSessionRepository();
  const allocation = await uploadAllocationBody();
  const chunks = uploadChunks();
  const checksumPlan = await buildUploadBlobChecksumPlan({ chunks });
  const created = await postUploadSessionsEndpoint(
    {
      actorContext: uploadActorContext,
      body: allocation,
      method: "POST",
      path: "/v1/uploads/sessions",
    },
    {
      clock: () => uploadFixedNow,
      repository,
    },
  );
  await putUploadBlobEndpoint(
    {
      actorContext: uploadActorContext,
      body: chunks[0],
      chunkDigest: checksumPlan.chunkDigests[0],
      method: "PUT",
      offset: 0,
      path: `/v1/uploads/sessions/${created.body.upload_session_id}/blob`,
    },
    {
      clock: () => new Date("2026-05-04T09:01:00Z"),
      repository,
    },
  );

  const rebased = await getUploadSessionStatusEndpoint(
    {
      actorContext: uploadActorContext,
      method: "GET",
      path: `/v1/uploads/sessions/${created.body.upload_session_id}?live_request_version_ref=${encodeURIComponent(
        uploadRequestVersionV2,
      )}`,
    },
    {
      clock: () => new Date("2026-05-04T09:02:00Z"),
      repository,
    },
  );
  expect(rebased.status).toBe(200);
  expect(rebased.body.upload_session_id).toBe(created.body.upload_session_id);
  expect(rebased.body.storage_ref).toBe(created.body.storage_ref);
  expect(rebased.body.request_version_ref).toBe(allocation.request_version_ref);
  expect(rebased.body.upload_request_binding_contract.live_request_version_ref).toBe(
    uploadRequestVersionV2,
  );
  expect(rebased.body.request_binding_state).toBe("RECONFIRMATION_REQUIRED");

  let latest = rebased;
  for (const [index, chunk] of chunks.slice(1).entries()) {
    latest = await putUploadBlobEndpoint(
      {
        actorContext: uploadActorContext,
        body: chunk,
        chunkDigest: checksumPlan.chunkDigests[index + 1],
        liveRequestVersionRef: uploadRequestVersionV2,
        method: "PUT",
        offset: (index + 1) * 4,
        path: `/v1/uploads/sessions/${created.body.upload_session_id}/blob`,
      },
      {
        clock: () => new Date(`2026-05-04T09:0${index + 3}:00Z`),
        repository,
      },
    );
  }

  expect(latest.status).toBe(200);
  expect(latest.body.transfer_state).toBe("ACCEPTED");
  expect(latest.body.attachment_state).toBe("REBIND_REQUIRED");
  expect(latest.body.next_action_code).toBe("RECONFIRM_REQUEST");
  expect(latest.body.attached_document_ref).toBeNull();
  expect(latest.body.request_version_ref).toBe(allocation.request_version_ref);
});

test("explicit reconfirmation restores current binding but still requires attachment confirmation", async () => {
  const repository = new ClientUploadSessionRepository();
  const allocation = await uploadAllocationBody();
  const chunks = uploadChunks();
  const checksumPlan = await buildUploadBlobChecksumPlan({ chunks });
  const created = await postUploadSessionsEndpoint(
    {
      actorContext: uploadActorContext,
      body: allocation,
      method: "POST",
      path: "/v1/uploads/sessions",
    },
    {
      clock: () => uploadFixedNow,
      repository,
    },
  );
  for (const [index, chunk] of chunks.entries()) {
    await putUploadBlobEndpoint(
      {
        actorContext: uploadActorContext,
        body: chunk,
        chunkDigest: checksumPlan.chunkDigests[index],
        liveRequestVersionRef: index === chunks.length - 1 ? uploadRequestVersionV2 : undefined,
        method: "PUT",
        offset: index * 4,
        path: `/v1/uploads/sessions/${created.body.upload_session_id}/blob`,
      },
      {
        clock: () => new Date(`2026-05-04T09:0${index + 1}:00Z`),
        repository,
      },
    );
  }
  const staleStored = await repository.findByUploadSessionId(created.body.upload_session_id);
  expect(staleStored?.aggregate.session.attachment_state).toBe("REBIND_REQUIRED");

  const reconfirmed = await transitionClientUploadSessionState({
    aggregate: staleStored!.aggregate,
    transition: {
      explicitReconfirmation: true,
      kind: "REBASE",
      liveRequestVersionRef: uploadRequestVersionV2,
      now: "2026-05-04T09:05:00Z",
    },
  });
  await repository.persistUploadSession({
    aggregate: reconfirmed,
    duplicateSuppressionKey: staleStored!.duplicate_suppression_key,
    persistedAt: "2026-05-04T09:05:00Z",
  });

  const status = await getUploadSessionStatusEndpoint(
    {
      actorContext: uploadActorContext,
      method: "GET",
      path: `/v1/uploads/sessions/${created.body.upload_session_id}`,
    },
    {
      repository,
    },
  );
  expect(status.status).toBe(200);
  expect(status.body.request_binding_state).toBe("RECONFIRMED_CURRENT");
  expect(status.body.attachment_state).toBe("CONFIRMATION_REQUIRED");
  expect(status.body.next_action_code).toBe("CONFIRM_ATTACHMENT");
  expect(status.body.attached_document_ref).toBeNull();
});
