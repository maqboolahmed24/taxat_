import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  PortalHelpRequestProjectionError,
  trackPortalHelpBoundaryHandoff,
} from "../index.ts";

const contextualHelpRequest = {
  bodyRef: "copy.help.body.bank-statement-upload",
  clientId: "client.taxpayer-2001",
  itemId: "request.bank-statement",
  manifestId: "manifest.portal.2026",
  openedAt: "2026-05-04T10:00:00.000Z",
  openedByRef: "principal.client-2001",
  requestInfoRef: "request-info://request.bank-statement/1",
  sourceFocusAnchorRef: "request.bank-statement.upload",
  sourceRoute: "REQUEST_DETAIL",
  tenantId: "tenant.taxat-sandbox",
  workspaceId: "portal.workspace.client-2001",
} as const;

test("tracks a contextual help handoff with exact return target and case context", async () => {
  const { handoff, helpRequest } = trackPortalHelpBoundaryHandoff({
    handoffAt: "2026-05-04T10:00:05.000Z",
    newHelpRequest: contextualHelpRequest,
  });

  expect(handoff).toMatchObject({
    artifact_type: "PortalHelpBoundaryHandoff",
    handoff_state: "OPEN",
    help_request_ref: helpRequest.help_request_id,
    return_target: {
      focus_anchor_ref: "request.bank-statement.upload",
      item_id: "request.bank-statement",
      request_info_ref: "request-info://request.bank-statement/1",
      source_route: "REQUEST_DETAIL",
    },
    support_boundary_ref: `support-boundary.${helpRequest.help_request_id}`,
  });
  expect(handoff.case_context_refs).toEqual(helpRequest.case_context_refs);
  await validateContractSchema("portal_help_request", helpRequest);
});

test("acknowledgement, response, and closure preserve the same portal return target", async () => {
  const opened = trackPortalHelpBoundaryHandoff({
    newHelpRequest: contextualHelpRequest,
  });
  const acknowledged = trackPortalHelpBoundaryHandoff({
    lifecycleUpdate: {
      acknowledgedAt: "2026-05-04T10:05:00.000Z",
    },
    priorHelpRequest: opened.helpRequest,
  });
  const responded = trackPortalHelpBoundaryHandoff({
    lifecycleUpdate: {
      respondedAt: "2026-05-04T10:15:00.000Z",
      responseRef: "portal-help-response.001",
    },
    priorHelpRequest: acknowledged.helpRequest,
  });
  const closed = trackPortalHelpBoundaryHandoff({
    lifecycleUpdate: {
      closedAt: "2026-05-04T10:30:00.000Z",
    },
    priorHelpRequest: responded.helpRequest,
  });

  expect(acknowledged.helpRequest.lifecycle_state).toBe("ACKNOWLEDGED");
  expect(responded.helpRequest.lifecycle_state).toBe("RESPONDED");
  expect(closed.helpRequest.lifecycle_state).toBe("CLOSED");
  expect(closed.helpRequest.help_request_id).toBe(opened.helpRequest.help_request_id);
  expect(closed.handoff.return_target).toEqual(opened.handoff.return_target);
  expect(closed.handoff.case_context_refs).toEqual(opened.handoff.case_context_refs);
  await validateContractSchema("portal_help_request", closed.helpRequest);
});

test("fails closed when closure tries to skip response lineage", () => {
  const opened = trackPortalHelpBoundaryHandoff({
    newHelpRequest: contextualHelpRequest,
  });

  expect(() =>
    trackPortalHelpBoundaryHandoff({
      lifecycleUpdate: {
        acknowledgedAt: "2026-05-04T10:05:00.000Z",
        closedAt: "2026-05-04T10:30:00.000Z",
      },
      priorHelpRequest: opened.helpRequest,
    }),
  ).toThrow(PortalHelpRequestProjectionError);
});
