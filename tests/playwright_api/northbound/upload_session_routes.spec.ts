import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { AddressInfo } from "node:net";
import { expect, test } from "@playwright/test";

import {
  buildUploadBlobChecksumPlan,
  ClientUploadSessionRepository,
  registerUploadSessionRoutes,
  type UploadSessionRouteHandlers,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  uploadActorContext,
  uploadAllocationBody,
  uploadChunks,
  uploadFixedNow,
} from "../../unit/backend_northbound/upload_session_fixtures.ts";

type UploadHandler = UploadSessionRouteHandlers[keyof UploadSessionRouteHandlers];

async function readRequestBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function uploadRoutesHttpHarness() {
  const repository = new ClientUploadSessionRepository();
  const registered = new Map<string, UploadHandler>();
  registerUploadSessionRoutes(
    {
      register: (route) => {
        registered.set(`${route.method} ${route.path}`, route.handler as UploadHandler);
      },
    },
    {
      clock: () => uploadFixedNow,
      repository,
    },
  );

  const server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const method = request.method ?? "GET";
    const bodyBytes = await readRequestBody(request);
    const headers = request.headers as Record<string, string | string[] | undefined>;
    const write = (result: { body: unknown; headers?: Record<string, string>; status: number }) => {
      response.writeHead(result.status, {
        "Content-Type": "application/json",
        ...(result.headers ?? {}),
      });
      response.end(JSON.stringify(result.body));
    };

    if (method === "POST" && url.pathname === "/v1/uploads/sessions") {
      const handler = registered.get("POST /v1/uploads/sessions");
      const body = bodyBytes.byteLength === 0 ? null : JSON.parse(bodyBytes.toString("utf8"));
      write(
        (await handler!({
          actorContext: uploadActorContext,
          body,
          correlationId: "corr.api.upload.allocate",
          method,
          path: `${url.pathname}${url.search}`,
        } as never)) as { body: unknown; headers?: Record<string, string>; status: number },
      );
      return;
    }

    const putMatch = /^\/v1\/uploads\/sessions\/([^/]+)\/blob$/.exec(url.pathname);
    if (method === "PUT" && putMatch !== null) {
      const handler = registered.get("PUT /v1/uploads/sessions/{upload_session_id}/blob");
      write(
        (await handler!({
          actorContext: uploadActorContext,
          body: bodyBytes,
          correlationId: "corr.api.upload.put",
          headers,
          method,
          path: `${url.pathname}${url.search}`,
        } as never)) as { body: unknown; headers?: Record<string, string>; status: number },
      );
      return;
    }

    const getMatch = /^\/v1\/uploads\/sessions\/([^/]+)$/.exec(url.pathname);
    if (method === "GET" && getMatch !== null) {
      const handler = registered.get("GET /v1/uploads/sessions/{upload_session_id}");
      write(
        (await handler!({
          actorContext: uploadActorContext,
          correlationId: "corr.api.upload.get",
          method,
          path: `${url.pathname}${url.search}`,
        } as never)) as { body: unknown; headers?: Record<string, string>; status: number },
      );
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ problem_code: "HTTP_ROUTE_INVALID" }));
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = (server.address() as AddressInfo).port;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
    registered,
  };
}

test("upload session routes serve allocate, PUT blob, and status through APIRequestContext", async ({
  request,
}) => {
  const harness = await uploadRoutesHttpHarness();
  try {
    const allocation = await uploadAllocationBody();
    const chunks = uploadChunks();
    const checksumPlan = await buildUploadBlobChecksumPlan({ chunks });

    const created = await request.post(`${harness.baseUrl}/v1/uploads/sessions`, {
      data: allocation,
    });
    expect(created.status()).toBe(201);
    expect(created.headers()["cache-control"]).toBe("no-store");
    const createdBody = await created.json();
    expect(createdBody.artifact_type).toBe("ClientUploadSession");
    expect(createdBody.transfer_state).toBe("UPLOADING");

    let latestBody = createdBody;
    for (const [index, chunk] of chunks.entries()) {
      const put = await request.put(
        `${harness.baseUrl}/v1/uploads/sessions/${createdBody.upload_session_id}/blob`,
        {
          data: Buffer.from(chunk),
          headers: {
            "x-upload-chunk-digest": checksumPlan.chunkDigests[index],
            "x-upload-offset": String(index * 4),
          },
        },
      );
      expect([200, 202]).toContain(put.status());
      latestBody = await put.json();
    }

    expect(latestBody.transfer_state).toBe("ACCEPTED");
    expect(latestBody.attachment_state).toBe("CONFIRMATION_REQUIRED");

    const status = await request.get(
      `${harness.baseUrl}/v1/uploads/sessions/${createdBody.upload_session_id}`,
    );
    expect(status.status()).toBe(200);
    const statusBody = await status.json();
    expect(statusBody.upload_session_id).toBe(createdBody.upload_session_id);
    expect(statusBody.storage_ref).toBe(createdBody.storage_ref);
    expect(statusBody.request_version_ref).toBe(allocation.request_version_ref);

    const rebasedStatus = await request.get(
      `${harness.baseUrl}/v1/uploads/sessions/${createdBody.upload_session_id}?live_request_version_ref=request-version.bank-statement.v2`,
    );
    expect(rebasedStatus.status()).toBe(200);
    const rebasedBody = await rebasedStatus.json();
    expect(rebasedBody.upload_session_id).toBe(createdBody.upload_session_id);
    expect(rebasedBody.storage_ref).toBe(createdBody.storage_ref);
    expect(rebasedBody.request_version_ref).toBe(allocation.request_version_ref);
    expect(rebasedBody.upload_request_binding_contract.frozen_request_version_ref).toBe(
      allocation.request_version_ref,
    );
    expect(rebasedBody.upload_request_binding_contract.live_request_version_ref).toBe(
      "request-version.bank-statement.v2",
    );
    expect(rebasedBody.request_binding_state).toBe("RECONFIRMATION_REQUIRED");
    expect(rebasedBody.next_action_code).toBe("RECONFIRM_REQUEST");
  } finally {
    await harness.close();
  }
});

test("upload HTTP surface reports checksum problems with session recovery anchors", async ({
  request,
}) => {
  const harness = await uploadRoutesHttpHarness();
  try {
    const allocation = await uploadAllocationBody();
    const chunks = uploadChunks();
    const created = await request.post(`${harness.baseUrl}/v1/uploads/sessions`, {
      data: allocation,
    });
    const createdBody = await created.json();

    const badPut = await request.put(
      `${harness.baseUrl}/v1/uploads/sessions/${createdBody.upload_session_id}/blob`,
      {
        data: Buffer.from(chunks[0]),
        headers: {
          "x-upload-chunk-digest": "0".repeat(64),
          "x-upload-offset": "0",
        },
      },
    );
    expect(badPut.status()).toBe(409);
    const problem = await badPut.json();
    expect(problem.artifact_type).toBe("ProblemEnvelope");
    expect(problem.problem_code).toBe("UPLOAD_SESSION_CHECKSUM_INVALID");
    expect(problem.latest_upload_session_ref).toBe(createdBody.upload_session_id);
    expect(problem.latest_command_receipt_ref).toContain("receipt.upload-session.");
    expect(problem.rebase_required).toBe(false);
    expect(problem.stale_guard_family).toBeNull();
    expect(problem.actionability_state).toBe("ACTION_AVAILABLE");
    expect(problem.suggested_detail_surface_code).toBeNull();
  } finally {
    await harness.close();
  }
});

test("upload HTTP surface reports stale recovery hints with the session anchor", async ({
  request,
}) => {
  const harness = await uploadRoutesHttpHarness();
  try {
    const allocation = await uploadAllocationBody();
    const chunks = uploadChunks();
    const created = await request.post(`${harness.baseUrl}/v1/uploads/sessions`, {
      data: allocation,
    });
    const createdBody = await created.json();

    const staleBadPut = await request.put(
      `${harness.baseUrl}/v1/uploads/sessions/${createdBody.upload_session_id}/blob?live_request_version_ref=request-version.bank-statement.v2`,
      {
        data: Buffer.from(chunks[0]),
        headers: {
          "x-upload-chunk-digest": "0".repeat(64),
          "x-upload-offset": "0",
        },
      },
    );
    expect(staleBadPut.status()).toBe(409);
    const problem = await staleBadPut.json();
    expect(problem.artifact_type).toBe("ProblemEnvelope");
    expect(problem.latest_upload_session_ref).toBe(createdBody.upload_session_id);
    expect(problem.latest_command_receipt_ref).toContain("receipt.upload-session.");
    expect(problem.rebase_required).toBe(true);
    expect(problem.stale_guard_family).toBe("CLIENT_PORTAL_WORKSPACE_VERSION");
    expect(problem.latest_stale_guard_value).toBeGreaterThan(0);
    expect(problem.mutation_precondition_binding_or_null.profile_code).toBe(
      "CLIENT_PORTAL_ROUTE_MUTATION",
    );
    expect(problem.latest_stability_contract_or_null.route_scope_class).toBe(
      "CLIENT_PORTAL_ROUTE",
    );
  } finally {
    await harness.close();
  }
});
