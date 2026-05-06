import { expect, test } from "@playwright/test";

import {
  applyClientPortalWorkspaceConditionalRequest,
  authorizeClientPortalReadScope,
  ClientPortalWorkspacePublicationError,
  enforceCustomerSafeProjectionForPortal,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  clientPortalWorkspaceFixture,
  portalReadActorContext,
  portalReadClientId,
  portalReadTenantId,
} from "./client_portal_read_fixtures.ts";

function cloneWorkspace() {
  return JSON.parse(JSON.stringify(clientPortalWorkspaceFixture()));
}

function expectPortalPublicationReason(
  workspace: ReturnType<typeof cloneWorkspace>,
  reason: string,
) {
  try {
    enforceCustomerSafeProjectionForPortal(workspace);
  } catch (error) {
    expect(error).toBeInstanceOf(ClientPortalWorkspacePublicationError);
    expect((error as ClientPortalWorkspacePublicationError).reasonCodes).toContain(reason);
    return;
  }
  throw new Error(`Expected client portal publication error ${reason}`);
}

test("client portal workspace fixture preserves the customer-safe shell spine", () => {
  const workspace = enforceCustomerSafeProjectionForPortal(clientPortalWorkspaceFixture());

  expect(workspace.artifact_type).toBe("ClientPortalWorkspace");
  expect(workspace.shell_family).toBe("CLIENT_PORTAL_SHELL");
  expect(workspace.route).toBe("HOME");
  expect(workspace.navigation_tabs.filter((tab) => tab.active === true)).toEqual([
    {
      active: true,
      badge_count: null,
      label: "Home",
      route: "HOME",
    },
  ]);
  expect(workspace.stability_contract.route_scope_class).toBe("CLIENT_PORTAL_ROUTE");
  expect(workspace.stability_contract.resume_capability).toBe("SNAPSHOT_ONLY");
  expect(
    workspace.stability_contract.guard_vector_components.client_portal_workspace_version_or_null,
  ).toBe(workspace.workspace_version);
  expect(workspace.stability_contract.guard_vector_components.view_guard_ref_or_null).toBe(
    workspace.view_guard_ref,
  );
  expect(workspace.customer_safe_projection.projection_audience).toBe("CLIENT_PORTAL");
  expect(workspace.visibility_partition.allowed_visibility_classes).toEqual(["CUSTOMER_VISIBLE"]);
});

test("client portal projection fails closed on route, count, current-artifact, approval, and activity drift", () => {
  const routeDrift = cloneWorkspace();
  routeDrift.navigation_tabs[0].active = false;
  routeDrift.navigation_tabs[1].active = true;
  expect(() => enforceCustomerSafeProjectionForPortal(routeDrift)).toThrow(
    ClientPortalWorkspacePublicationError,
  );

  const documentCountDrift = cloneWorkspace();
  documentCountDrift.document_center.open_request_count = 1;
  expectPortalPublicationReason(documentCountDrift, "CLIENT_PORTAL_DOCUMENT_COUNT_DRIFT");

  const danglingUpload = cloneWorkspace();
  danglingUpload.document_center.requests[0].current_upload_ref = "upload.missing";
  expectPortalPublicationReason(danglingUpload, "CLIENT_PORTAL_DOCUMENT_CURRENT_UPLOAD_DANGLING");

  const missingApproval = cloneWorkspace();
  missingApproval.approval_center.latest_pack_ref = "approval.pack.missing";
  expectPortalPublicationReason(missingApproval, "CLIENT_PORTAL_APPROVAL_LATEST_PACK_DANGLING");

  const unsafeActivity = cloneWorkspace();
  unsafeActivity.activity_timeline[0].headline = "Staff gate changed";
  expectPortalPublicationReason(unsafeActivity, "CLIENT_PORTAL_ACTIVITY_INTERNAL_LANGUAGE");

  const overstatedSubmission = cloneWorkspace();
  overstatedSubmission.activity_timeline[0].event_kind = "SUBMISSION_SENT";
  overstatedSubmission.activity_timeline[0].headline = "Authority confirmed the submission";
  expectPortalPublicationReason(
    overstatedSubmission,
    "CLIENT_PORTAL_ACTIVITY_AUTHORITY_COPY_OVERSTATED",
  );
});

test("client portal authorizer allows only customer-scoped actors for the requested client", () => {
  expect(
    authorizeClientPortalReadScope({
      actorContext: portalReadActorContext,
      clientId: portalReadClientId,
      routeSurface: "CLIENT_PORTAL_WORKSPACE",
      tenantId: portalReadTenantId,
    }),
  ).toMatchObject({
    authorized: true,
    principalClass: "CLIENT_VIEWER",
  });

  expect(
    authorizeClientPortalReadScope({
      actorContext: portalReadActorContext,
      clientId: portalReadClientId,
      principalClass: "STAFF_FULL",
      routeSurface: "CLIENT_PORTAL_WORKSPACE",
      tenantId: portalReadTenantId,
    }),
  ).toMatchObject({
    authorized: false,
    hidden: true,
    reasonCodes: expect.arrayContaining(["CLIENT_PORTAL_READ_STAFF_SESSION_BLOCKED"]),
  });

  expect(
    authorizeClientPortalReadScope({
      actorContext: {
        ...portalReadActorContext,
        client_id_or_null: "client.other",
      },
      clientId: portalReadClientId,
      routeSurface: "CLIENT_PORTAL_WORKSPACE",
      tenantId: portalReadTenantId,
    }),
  ).toMatchObject({
    authorized: false,
    reasonCodes: expect.arrayContaining(["CLIENT_PORTAL_READ_CLIENT_MISMATCH"]),
  });
});

test("client portal workspace ETag uses the exact workspace version and ignores weak validators", () => {
  expect(
    applyClientPortalWorkspaceConditionalRequest({
      ifNoneMatch: null,
      workspaceVersion: 12,
    }),
  ).toEqual({
    etag: "12",
    status: "SEND_BODY",
  });
  expect(
    applyClientPortalWorkspaceConditionalRequest({
      ifNoneMatch: '"11", "12"',
      workspaceVersion: 12,
    }),
  ).toEqual({
    etag: "12",
    status: "NOT_MODIFIED",
  });
  expect(
    applyClientPortalWorkspaceConditionalRequest({
      ifNoneMatch: 'W/"12"',
      workspaceVersion: 12,
    }),
  ).toEqual({
    etag: "12",
    status: "SEND_BODY",
  });
});
