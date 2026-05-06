import { expect, test } from "@playwright/test";

import {
  buildUploadBlobChecksumPlan,
  ClientUploadSessionRepository,
  getUploadSessionStatusEndpoint,
  postUploadSessionsEndpoint,
  putUploadBlobEndpoint,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  uploadActorContext,
  uploadAllocationBody,
  uploadChunks,
  uploadFixedNow,
} from "../../unit/backend_northbound/upload_session_fixtures.ts";

test("allocate, chunk PUT, and status GET preserve governed upload session state", async () => {
  const repository = new ClientUploadSessionRepository();
  const allocation = await uploadAllocationBody();
  const chunks = uploadChunks();
  const checksumPlan = await buildUploadBlobChecksumPlan({ chunks });
  const dependencies = {
    clock: () => uploadFixedNow,
    repository,
  };

  const created = await postUploadSessionsEndpoint(
    {
      actorContext: uploadActorContext,
      body: allocation,
      correlationId: "corr.integration.upload.allocate",
      method: "POST",
      path: "/v1/uploads/sessions",
    },
    dependencies,
  );

  expect(created.status).toBe(201);
  expect(created.body.artifact_type).toBe("ClientUploadSession");
  expect(created.body.transfer_state).toBe("UPLOADING");
  expect(created.body.resumability_state).toBe("RESUMABLE");

  const firstChunk = await putUploadBlobEndpoint(
    {
      actorContext: uploadActorContext,
      body: chunks[0],
      chunkDigest: checksumPlan.chunkDigests[0],
      correlationId: "corr.integration.upload.first-chunk",
      method: "PUT",
      offset: 0,
      path: `/v1/uploads/sessions/${created.body.upload_session_id}/blob`,
    },
    {
      clock: () => new Date("2026-05-04T09:01:00Z"),
      repository,
    },
  );
  expect(firstChunk.status).toBe(202);
  expect(firstChunk.body.bytes_transferred).toBe(4);
  expect(firstChunk.body.next_action_code).toBe("RESUME_UPLOAD");

  let latest = firstChunk;
  for (const [index, chunk] of chunks.slice(1).entries()) {
    latest = await putUploadBlobEndpoint(
      {
        actorContext: uploadActorContext,
        body: chunk,
        chunkDigest: checksumPlan.chunkDigests[index + 1],
        correlationId: `corr.integration.upload.chunk.${index + 2}`,
        method: "PUT",
        offset: (index + 1) * 4,
        path: `/v1/uploads/sessions/${created.body.upload_session_id}/blob`,
      },
      {
        clock: () => new Date(`2026-05-04T09:0${index + 2}:00Z`),
        repository,
      },
    );
  }

  expect(latest.status).toBe(200);
  expect(latest.body.transfer_state).toBe("ACCEPTED");
  expect(latest.body.integrity_state).toBe("VERIFIED");
  expect(latest.body.malware_scan_state).toBe("CLEAN");
  expect(latest.body.validation_state).toBe("ACCEPTED");
  expect(latest.body.attachment_state).toBe("CONFIRMATION_REQUIRED");

  const status = await getUploadSessionStatusEndpoint(
    {
      actorContext: uploadActorContext,
      correlationId: "corr.integration.upload.status",
      method: "GET",
      path: `/v1/uploads/sessions/${created.body.upload_session_id}`,
    },
    dependencies,
  );
  expect(status.status).toBe(200);
  expect(status.body.upload_session_id).toBe(created.body.upload_session_id);
  expect(status.body.request_version_ref).toBe(allocation.request_version_ref);
  expect(status.body.upload_request_binding_contract.frozen_request_version_ref).toBe(
    allocation.request_version_ref,
  );
});

test("duplicate allocation and accepted chunk replay return the existing session", async () => {
  const repository = new ClientUploadSessionRepository();
  const allocation = await uploadAllocationBody();
  const chunks = uploadChunks();
  const checksumPlan = await buildUploadBlobChecksumPlan({ chunks });

  const first = await postUploadSessionsEndpoint(
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
  const duplicate = await postUploadSessionsEndpoint(
    {
      actorContext: uploadActorContext,
      body: allocation,
      method: "POST",
      path: "/v1/uploads/sessions",
    },
    {
      clock: () => new Date("2026-05-04T09:00:30Z"),
      repository,
    },
  );

  expect(first.status).toBe(201);
  expect(duplicate.status).toBe(200);
  expect(duplicate.headers["X-Upload-Session-Reused"]).toBe("true");
  expect(duplicate.body.upload_session_id).toBe(first.body.upload_session_id);
  expect(duplicate.body.storage_ref).toBe(first.body.storage_ref);

  for (const [index, chunk] of chunks.entries()) {
    await putUploadBlobEndpoint(
      {
        actorContext: uploadActorContext,
        body: chunk,
        chunkDigest: checksumPlan.chunkDigests[index],
        method: "PUT",
        offset: index * 4,
        path: `/v1/uploads/sessions/${first.body.upload_session_id}/blob`,
      },
      {
        clock: () => new Date(`2026-05-04T09:0${index + 1}:00Z`),
        repository,
      },
    );
  }
  const replay = await putUploadBlobEndpoint(
    {
      actorContext: uploadActorContext,
      body: chunks[0],
      chunkDigest: checksumPlan.chunkDigests[0],
      method: "PUT",
      offset: 0,
      path: `/v1/uploads/sessions/${first.body.upload_session_id}/blob`,
    },
    {
      clock: () => new Date("2026-05-04T09:05:00Z"),
      repository,
    },
  );

  expect(replay.status).toBe(200);
  expect(replay.headers["X-Upload-Duplicate-Replay"]).toBe("true");
  expect(replay.body.upload_session_id).toBe(first.body.upload_session_id);
  expect(await repository.listUploadSessions()).toHaveLength(1);
});
