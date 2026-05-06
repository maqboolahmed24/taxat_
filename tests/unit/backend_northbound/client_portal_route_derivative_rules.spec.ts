import { expect, test } from "@playwright/test";

import {
  type ClientPortalWorkspaceRecord,
  getClientPortalActivityView,
  getClientPortalApprovalsView,
  getClientPortalDocumentsView,
  getClientPortalOnboardingView,
  getClientPortalWorkspace,
} from "../../../packages/backend-northbound/src/index.ts";
import {
  clientPortalReadRepositoriesFixture,
  portalReadClientId,
  portalReadTenantId,
} from "./client_portal_read_fixtures.ts";

function activeTab(workspace: ClientPortalWorkspaceRecord) {
  return workspace.navigation_tabs.filter((tab) => tab.active === true);
}

function openDocumentCount(workspace: ClientPortalWorkspaceRecord) {
  const openStatuses = new Set(["OPEN", "UPLOADING", "UNDER_REVIEW", "REJECTED"]);
  return (workspace.document_center.requests as Array<Record<string, unknown>>).filter((request) =>
    openStatuses.has(String(request.status)),
  ).length;
}

function outstandingApprovalCount(workspace: ClientPortalWorkspaceRecord) {
  const outstandingStatuses = new Set([
    "READY_FOR_CLIENT",
    "VIEWED",
    "ACKNOWLEDGED",
    "STEP_UP_REQUIRED",
  ]);
  return (workspace.approval_center.packs as Array<Record<string, unknown>>).filter((pack) =>
    outstandingStatuses.has(String(pack.status)),
  ).length;
}

function expectSameShellSpine(
  workspace: ClientPortalWorkspaceRecord,
  route: ClientPortalWorkspaceRecord["route"],
) {
  expect(workspace.artifact_type).toBe("ClientPortalWorkspace");
  expect(workspace.shell_family).toBe("CLIENT_PORTAL_SHELL");
  expect(workspace.route).toBe(route);
  expect(activeTab(workspace)).toEqual([
    expect.objectContaining({
      active: true,
      route,
    }),
  ]);
  expect(workspace.workspace_version).toBe(12);
  expect(workspace.view_guard_ref).toBe("view-guard.portal.12");
  expect(workspace.stability_contract.route_scope_class).toBe("CLIENT_PORTAL_ROUTE");
  expect(workspace.stability_contract.resume_capability).toBe("SNAPSHOT_ONLY");
  expect(
    workspace.stability_contract.guard_vector_components.client_portal_workspace_version_or_null,
  ).toBe(12);
  expect(workspace.customer_safe_projection.projection_audience).toBe("CLIENT_PORTAL");
  expect(workspace.visibility_partition.allowed_visibility_classes).toEqual(["CUSTOMER_VISIBLE"]);
}

test("route projections return the full workspace with one route-constrained active tab", async () => {
  const { clientPortalWorkspaceRepository } = await clientPortalReadRepositoriesFixture();
  const common = {
    clientId: portalReadClientId,
    clientPortalWorkspaceRepository,
    tenantId: portalReadTenantId,
  };

  const home = await getClientPortalWorkspace(common);
  const documents = await getClientPortalDocumentsView({
    ...common,
    query: {
      artifact_focus_bucket_or_null: "PRIMARY",
      artifact_focus_subject_ref_or_null: "upload.identity.current",
      context_object_ref: "request.identity",
      focus_anchor_ref: "request.identity.upload",
      return_focus_anchor_ref_or_null: "portal.documents.return",
    },
  });
  const approvals = await getClientPortalApprovalsView(common);
  const onboarding = await getClientPortalOnboardingView(common);
  const activity = await getClientPortalActivityView(common);

  expect(home).not.toBeNull();
  expect(documents).not.toBeNull();
  expect(approvals).not.toBeNull();
  expect(onboarding).not.toBeNull();
  expect(activity).not.toBeNull();

  expectSameShellSpine(home!.workspace, "HOME");
  expectSameShellSpine(documents!.workspace, "DOCUMENTS");
  expectSameShellSpine(approvals!.workspace, "APPROVALS");
  expectSameShellSpine(onboarding!.workspace, "ONBOARDING");
  expectSameShellSpine(activity!.workspace, "HOME");
});

test("documents projection preserves contextual request focus without creating a new shell grammar", async () => {
  const { clientPortalWorkspaceRepository } = await clientPortalReadRepositoriesFixture();
  const documents = await getClientPortalDocumentsView({
    clientId: portalReadClientId,
    clientPortalWorkspaceRepository,
    query: {
      artifact_focus_bucket_or_null: "PRIMARY",
      artifact_focus_subject_ref_or_null: "upload.identity.current",
      context_object_ref: "request.identity",
      focus_anchor_ref: "request.identity.upload",
      return_focus_anchor_ref_or_null: "portal.documents.return",
    },
    tenantId: portalReadTenantId,
  });

  expect(documents).not.toBeNull();
  const workspace = documents!.workspace;
  expect(workspace.route_context).toMatchObject({
    artifact_focus_bucket_or_null: "PRIMARY",
    artifact_focus_subject_ref_or_null: "upload.identity.current",
    context_object_ref: "request.identity",
    context_route: "REQUEST_DETAIL",
    focus_anchor_ref: "request.identity.upload",
    return_focus_anchor_ref_or_null: "portal.documents.return",
    return_route: "DOCUMENTS",
  });
  expect(workspace.object_anchor_ref).toBe("request.identity");
  expect(workspace.cross_device_continuity_contract).toMatchObject({
    canonical_object_ref: "request.identity",
    continuity_scope: "CLIENT_PORTAL_ROUTE",
    parent_context_ref_or_null: "DOCUMENTS",
    route_identity_ref: "REQUEST_DETAIL",
    shell_family: "CLIENT_PORTAL_SHELL",
  });
  expect(workspace.home_surface_order).toBeNull();
  expect(workspace.home_primary_task_ref).toBeNull();
  expect(workspace.reliability_summary.dominant_flow_kind).toBe("UPLOAD");
});

test("counts and current-versus-history anchors stay exact projections of serialized content", async () => {
  const { clientPortalWorkspaceRepository } = await clientPortalReadRepositoriesFixture();
  const common = {
    clientId: portalReadClientId,
    clientPortalWorkspaceRepository,
    tenantId: portalReadTenantId,
  };
  const documents = (await getClientPortalDocumentsView(common))!.workspace;
  const approvals = (await getClientPortalApprovalsView(common))!.workspace;
  const onboarding = (await getClientPortalOnboardingView(common))!.workspace;

  expect(documents.document_center.open_request_count).toBe(openDocumentCount(documents));
  expect(documents.navigation_tabs.find((tab) => tab.route === "DOCUMENTS")?.badge_count).toBe(
    openDocumentCount(documents),
  );
  expect(documents.document_center.requests[0].current_upload_ref).toBe(
    documents.document_center.requests[0].uploads[0].upload_session_id,
  );
  expect(documents.document_center.requests[0].artifact_selection.primary_subject_refs).toEqual([
    "upload.identity.current",
  ]);

  expect(approvals.approval_center.outstanding_count).toBe(outstandingApprovalCount(approvals));
  expect(approvals.navigation_tabs.find((tab) => tab.route === "APPROVALS")?.badge_count).toBe(
    outstandingApprovalCount(approvals),
  );
  expect(
    approvals.approval_center.packs.some(
      (pack) => pack.approval_pack_id === approvals.approval_center.latest_pack_ref,
    ),
  ).toBe(true);
  expect(approvals.approval_center.packs[0].requires_step_up).toBe(true);
  expect(approvals.approval_center.packs[0].primary_action.requires_step_up).toBe(true);

  expect(onboarding.onboarding_journey?.completed_step_count).toBeLessThanOrEqual(
    onboarding.onboarding_journey?.total_step_count ?? 0,
  );
  expect(onboarding.status_hero.status_code).toBe("ONBOARDING_REQUIRED");
  expect(onboarding.status_hero.primary_action?.route).toBe("ONBOARDING");
});

test("activity route reuses HOME as the top-level portal shell and keeps newest-first events", async () => {
  const { clientPortalWorkspaceRepository } = await clientPortalReadRepositoriesFixture();
  const activity = await getClientPortalActivityView({
    clientId: portalReadClientId,
    clientPortalWorkspaceRepository,
    tenantId: portalReadTenantId,
  });

  expect(activity).not.toBeNull();
  const workspace = activity!.workspace;
  expect(workspace.route).toBe("HOME");
  expect(workspace.navigation_tabs.map((tab) => tab.route)).toEqual([
    "HOME",
    "DOCUMENTS",
    "APPROVALS",
    "ONBOARDING",
    "HELP",
  ]);
  const eventIds = workspace.activity_timeline.map((event) => event.event_id);
  expect(new Set(eventIds).size).toBe(eventIds.length);
  const epochs = workspace.activity_timeline.map((event) => Date.parse(String(event.occurred_at)));
  expect(epochs).toEqual([...epochs].sort((left, right) => right - left));
});
