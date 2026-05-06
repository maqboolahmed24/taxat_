import { expect, test } from "@playwright/test";

import {
  getClientPortalActivityEndpoint,
  getClientPortalApprovalsEndpoint,
  getClientPortalDocumentsEndpoint,
  getClientPortalOnboardingEndpoint,
  getClientPortalWorkspaceEndpoint,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  clientPortalReadRepositoriesFixture,
  portalReadActorContext,
  portalReadClientId,
  portalReadTenantId,
} from "../../unit/backend_northbound/client_portal_read_fixtures.ts";

test("client portal read endpoints publish no-store workspace route projections", async () => {
  const { clientPortalWorkspaceRepository } = await clientPortalReadRepositoriesFixture();
  const dependencies = { clientPortalWorkspaceRepository };
  const query = `tenant_id=${encodeURIComponent(portalReadTenantId)}&client_id=${encodeURIComponent(
    portalReadClientId,
  )}`;

  const workspace = await getClientPortalWorkspaceEndpoint(
    {
      actorContext: portalReadActorContext,
      correlationId: "corr.integration.portal.workspace",
      method: "GET",
      path: `/v1/client-portal/workspace?${query}`,
    },
    dependencies,
  );
  const documents = await getClientPortalDocumentsEndpoint(
    {
      actorContext: portalReadActorContext,
      correlationId: "corr.integration.portal.documents",
      method: "GET",
      path: `/v1/client-portal/documents?${query}&context_object_ref=${encodeURIComponent(
        "request.identity",
      )}&artifact_focus_bucket=${encodeURIComponent(
        "PRIMARY",
      )}&artifact_focus_subject_ref=${encodeURIComponent(
        "upload.identity.current",
      )}&focus_anchor_ref=${encodeURIComponent(
        "request.identity.upload",
      )}&return_focus_anchor_ref=${encodeURIComponent("portal.documents.return")}`,
    },
    dependencies,
  );
  const approvals = await getClientPortalApprovalsEndpoint(
    {
      actorContext: portalReadActorContext,
      correlationId: "corr.integration.portal.approvals",
      method: "GET",
      path: `/v1/client-portal/approvals?${query}`,
    },
    dependencies,
  );
  const onboarding = await getClientPortalOnboardingEndpoint(
    {
      actorContext: portalReadActorContext,
      correlationId: "corr.integration.portal.onboarding",
      method: "GET",
      path: `/v1/client-portal/onboarding?${query}`,
    },
    dependencies,
  );
  const activity = await getClientPortalActivityEndpoint(
    {
      actorContext: portalReadActorContext,
      correlationId: "corr.integration.portal.activity",
      method: "GET",
      path: `/v1/client-portal/activity?${query}`,
    },
    dependencies,
  );

  expect(workspace.status).toBe(200);
  expect(documents.status).toBe(200);
  expect(approvals.status).toBe(200);
  expect(onboarding.status).toBe(200);
  expect(activity.status).toBe(200);

  for (const response of [workspace, documents, approvals, onboarding, activity]) {
    expect(response.headers["Cache-Control"]).toBe("no-store");
    expect(response.headers.ETag).toBe("12");
    expect(response.body?.artifact_type).toBe("ClientPortalWorkspace");
    expect(response.body?.shell_family).toBe("CLIENT_PORTAL_SHELL");
    expect(response.body?.workspace_version).toBe(12);
    expect(response.body?.customer_safe_projection.projection_audience).toBe("CLIENT_PORTAL");
  }

  expect(workspace.body?.route).toBe("HOME");
  expect(documents.body?.route).toBe("DOCUMENTS");
  expect(documents.body?.route_context.context_route).toBe("REQUEST_DETAIL");
  expect(approvals.body?.route).toBe("APPROVALS");
  expect(onboarding.body?.route).toBe("ONBOARDING");
  expect(activity.body?.route).toBe("HOME");
  expect(activity.body?.activity_timeline.map((event) => event.event_id)).toEqual([
    "activity.submission.sent",
    "activity.upload.received",
    "activity.approval.ready",
  ]);
  const activityEpochs =
    activity.body?.activity_timeline.map((event) => Date.parse(String(event.occurred_at))) ?? [];
  expect(activityEpochs).toEqual([...activityEpochs].sort((left, right) => right - left));
  const submission = activity.body?.activity_timeline.find(
    (event) => event.event_kind === "SUBMISSION_SENT",
  );
  expect(submission?.headline.toLowerCase()).toContain("awaiting acknowledgement");
  expect(submission?.headline.toLowerCase()).not.toMatch(/confirmed|complete|filed|accepted/);
});

test("client portal endpoints honor conditional GET and fail closed for hidden or invalid reads", async () => {
  const { clientPortalWorkspaceRepository } = await clientPortalReadRepositoriesFixture();
  const dependencies = { clientPortalWorkspaceRepository };

  const conditional = await getClientPortalDocumentsEndpoint(
    {
      actorContext: portalReadActorContext,
      correlationId: "corr.integration.portal.conditional",
      ifNoneMatch: '"12"',
      method: "GET",
      path: "/v1/client-portal/documents",
    },
    dependencies,
  );
  expect(conditional.status).toBe(304);
  expect(conditional.body).toBeNull();
  expect(conditional.headers.ETag).toBe("12");

  const staff = await getClientPortalWorkspaceEndpoint(
    {
      actorContext: portalReadActorContext,
      correlationId: "corr.integration.portal.staff",
      method: "GET",
      principalClass: "STAFF_FULL",
      tenantId: portalReadTenantId,
    },
    dependencies,
  );
  expect(staff.status).toBe(404);
  expect(staff.body.artifact_type).toBe("ProblemEnvelope");
  expect(staff.body.reason_codes).toContain("CLIENT_PORTAL_READ_STAFF_SESSION_BLOCKED");

  const method = await getClientPortalWorkspaceEndpoint(
    {
      actorContext: portalReadActorContext,
      correlationId: "corr.integration.portal.method",
      method: "POST",
      tenantId: portalReadTenantId,
    },
    dependencies,
  );
  expect(method.status).toBe(405);
  expect(method.body.problem_code).toBe("CLIENT_PORTAL_READ_METHOD_INVALID");

  const wrongPath = await getClientPortalWorkspaceEndpoint(
    {
      actorContext: portalReadActorContext,
      correlationId: "corr.integration.portal.route",
      method: "GET",
      path: "/v1/client-portal/not-a-route",
    },
    dependencies,
  );
  expect(wrongPath.status).toBe(404);
  expect(wrongPath.body.problem_code).toBe("CLIENT_PORTAL_READ_ROUTE_INVALID");
});
