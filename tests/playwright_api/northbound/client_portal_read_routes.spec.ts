import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { AddressInfo } from "node:net";
import { expect, test } from "@playwright/test";

import {
  type ClientPortalReadRouteHandlers,
  getClientPortalActivityRoutePath,
  getClientPortalApprovalsRoutePath,
  getClientPortalDocumentsRoutePath,
  getClientPortalOnboardingRoutePath,
  getClientPortalWorkspaceRoutePath,
  registerClientPortalReadRoutes,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  clientPortalReadRepositoriesFixture,
  portalReadActorContext,
  portalReadClientId,
  portalReadTenantId,
} from "../../unit/backend_northbound/client_portal_read_fixtures.ts";

type PortalHandler = ClientPortalReadRouteHandlers[keyof ClientPortalReadRouteHandlers];

async function readRoutesHttpHarness() {
  const { clientPortalWorkspaceRepository } = await clientPortalReadRepositoriesFixture();
  const registered = new Map<string, PortalHandler>();
  registerClientPortalReadRoutes(
    {
      get: (path, handler) => {
        registered.set(path, handler as PortalHandler);
      },
    },
    { clientPortalWorkspaceRepository },
  );

  const server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const handler = registered.get(url.pathname);
    if (handler === undefined) {
      response.writeHead(404, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ problem_code: "HTTP_ROUTE_INVALID" }));
      return;
    }
    const result = await handler({
      actorContext: portalReadActorContext,
      correlationId: String(request.headers["x-correlation-id"] ?? "corr.api.portal"),
      ifNoneMatch:
        typeof request.headers["if-none-match"] === "string"
          ? request.headers["if-none-match"]
          : null,
      method: request.method,
      path: `${url.pathname}${url.search}`,
      principalClass:
        typeof request.headers["x-principal-class"] === "string"
          ? request.headers["x-principal-class"]
          : null,
    });
    const body = result.body === null ? "" : JSON.stringify(result.body);
    response.writeHead(result.status, {
      "Content-Type": "application/json",
      ...result.headers,
    });
    response.end(body);
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

test("client portal route family registers five GET handlers and serves APIRequestContext reads", async ({
  request,
}) => {
  const harness = await readRoutesHttpHarness();
  try {
    expect([...harness.registered.keys()].sort()).toEqual(
      [
        getClientPortalActivityRoutePath,
        getClientPortalApprovalsRoutePath,
        getClientPortalDocumentsRoutePath,
        getClientPortalOnboardingRoutePath,
        getClientPortalWorkspaceRoutePath,
      ].sort(),
    );

    const query = `tenant_id=${encodeURIComponent(
      portalReadTenantId,
    )}&client_id=${encodeURIComponent(portalReadClientId)}`;
    const workspace = await request.get(`${harness.baseUrl}/v1/client-portal/workspace?${query}`);
    const documents = await request.get(
      `${harness.baseUrl}/v1/client-portal/documents?${query}&context_object_ref=${encodeURIComponent(
        "request.identity",
      )}&artifact_focus_bucket=${encodeURIComponent(
        "PRIMARY",
      )}&artifact_focus_subject_ref=${encodeURIComponent(
        "upload.identity.current",
      )}&focus_anchor_ref=${encodeURIComponent(
        "request.identity.upload",
      )}&return_focus_anchor_ref=${encodeURIComponent("portal.documents.return")}`,
    );
    const approvals = await request.get(`${harness.baseUrl}/v1/client-portal/approvals?${query}`);
    const onboarding = await request.get(`${harness.baseUrl}/v1/client-portal/onboarding?${query}`);
    const activity = await request.get(`${harness.baseUrl}/v1/client-portal/activity?${query}`);

    for (const response of [workspace, documents, approvals, onboarding, activity]) {
      expect(response.status()).toBe(200);
      expect(response.headers()["cache-control"]).toBe("no-store");
      expect(response.headers().etag).toBe("12");
      const body = await response.json();
      expect(body.artifact_type).toBe("ClientPortalWorkspace");
      expect(body.shell_family).toBe("CLIENT_PORTAL_SHELL");
      expect(body.customer_safe_projection.projection_audience).toBe("CLIENT_PORTAL");
    }

    expect((await workspace.json()).route).toBe("HOME");
    const documentsBody = await documents.json();
    expect(documentsBody.route_context.context_route).toBe("REQUEST_DETAIL");
    const firstRequest = documentsBody.document_center.requests[0];
    expect(firstRequest.current_upload_ref).toBe("upload.identity.current");
    expect(firstRequest.current_artifact_upload_ref).toBe("upload.identity.current");
    expect(firstRequest.uploads.map((upload: Record<string, unknown>) => upload.history_state)).toEqual([
      "CURRENT",
      "REJECTED",
    ]);
    expect(firstRequest.artifact_selection.default_preview_target_ref_or_null).toBe(
      "upload.identity.current",
    );
    expect(firstRequest.artifact_affordance.visible_primary_subject_ref_or_null).toBe(
      "upload.identity.current",
    );
    expect((await approvals.json()).route).toBe("APPROVALS");
    expect((await onboarding.json()).route).toBe("ONBOARDING");
    const activityBody = await activity.json();
    expect(activityBody.route).toBe("HOME");
    const activityEvents = activityBody.activity_timeline as Array<Record<string, string>>;
    expect(activityEvents.map((event) => event.event_id)).toEqual([
      "activity.submission.sent",
      "activity.upload.received",
      "activity.approval.ready",
    ]);
    expect(activityEvents.map((event) => Date.parse(event.occurred_at))).toEqual(
      [...activityEvents.map((event) => Date.parse(event.occurred_at))].sort(
        (left, right) => right - left,
      ),
    );
    const submission = activityEvents.find((event) => event.event_kind === "SUBMISSION_SENT");
    expect(submission?.headline.toLowerCase()).toContain("awaiting acknowledgement");
    expect(submission?.headline.toLowerCase()).not.toMatch(/confirmed|complete|filed|accepted/);
  } finally {
    await harness.close();
  }
});

test("client portal API route handlers return 304s and hidden problem envelopes over HTTP", async ({
  request,
}) => {
  const harness = await readRoutesHttpHarness();
  try {
    const conditional = await request.get(`${harness.baseUrl}/v1/client-portal/documents`, {
      headers: {
        "If-None-Match": '"12"',
      },
    });
    expect(conditional.status()).toBe(304);
    expect(conditional.headers().etag).toBe("12");
    expect(await conditional.text()).toBe("");

    const hidden = await request.get(`${harness.baseUrl}/v1/client-portal/workspace`, {
      headers: {
        "X-Principal-Class": "STAFF_FULL",
      },
    });
    expect(hidden.status()).toBe(404);
    const problem = await hidden.json();
    expect(problem.artifact_type).toBe("ProblemEnvelope");
    expect(problem.problem_code).toBe("CLIENT_PORTAL_READ_NOT_VISIBLE");
    expect(problem.reason_codes).toContain("CLIENT_PORTAL_READ_STAFF_SESSION_BLOCKED");
  } finally {
    await harness.close();
  }
});
