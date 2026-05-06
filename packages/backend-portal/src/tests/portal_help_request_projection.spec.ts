import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  buildClientPortalWorkspace,
  buildPortalHelpRequest,
  PortalHelpRequestProjectionError,
} from "../index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

async function validateJsonSchemaOnly(kind: string, payload: unknown) {
  const script = `
import json
import pathlib
import sys

repo = pathlib.Path(sys.argv[1])
sys.path.insert(0, str(repo / "packages" / "contracts-core" / "python"))
from validate_contracts import Draft202012Validator, build_registry, load_json  # type: ignore

kind = sys.argv[2]
payload = json.loads(sys.argv[3])
schema = load_json(repo / "packages" / "contracts-core" / "schemas" / f"{kind}.schema.json")
validator = Draft202012Validator(
    schema,
    registry=build_registry(),
    format_checker=Draft202012Validator.FORMAT_CHECKER,
)
issues = [
    f"schema:{'/'.join(map(str, error.absolute_path)) or '<root>'}: {error.message}"
    for error in sorted(validator.iter_errors(payload), key=lambda error: list(error.absolute_path))
]
if issues:
    raise SystemExit("\\n".join(issues))
`;
  await execFileAsync(path.join(repoRoot, ".venv", "bin", "python3"), [
    "-c",
    script,
    repoRoot,
    kind,
    JSON.stringify(payload),
  ]);
}

const baseInput = {
  bodyRef: "copy.help.body.client-question",
  clientId: "client.taxpayer-2001",
  manifestId: "manifest.portal.2026",
  openedAt: "2026-05-04T10:00:00.000Z",
  openedByRef: "principal.client-2001",
  tenantId: "tenant.taxat-sandbox",
  workspaceId: "portal.workspace.client-2001",
};

test("projects schema-valid Help-route and contextual request-detail help requests", async () => {
  const general = buildPortalHelpRequest({
    ...baseInput,
    sourceFocusAnchorRef: "portal.help.case-context",
    sourceRoute: "HELP",
  });

  expect(general).toMatchObject({
    artifact_type: "PortalHelpRequest",
    item_id: null,
    lifecycle_state: "OPEN",
    reason_family: "GENERAL_HELP",
    request_info_ref: null,
    source_route: "HELP",
    support_channel: "PORTAL_HELP",
  });
  expect(general.case_context_refs).toEqual([
    "portal.workspace.client-2001",
    "portal.route.HELP",
    "portal.help.case-context",
    "manifest.portal.2026",
  ]);
  await validateContractSchema("portal_help_request", general);

  const contextual = buildPortalHelpRequest({
    ...baseInput,
    itemId: "request.bank-statement",
    requestInfoRef: "request-info://request.bank-statement/1",
    sourceFocusAnchorRef: "request.bank-statement.upload",
    sourceRoute: "REQUEST_DETAIL",
  });

  expect(contextual).toMatchObject({
    item_id: "request.bank-statement",
    reason_family: "DOCUMENT_HELP",
    request_info_ref: "request-info://request.bank-statement/1",
    source_focus_anchor_ref: "request.bank-statement.upload",
    source_route: "REQUEST_DETAIL",
    support_channel: "CONTEXTUAL_REQUEST",
  });
  expect(contextual.case_context_refs).toEqual([
    "portal.workspace.client-2001",
    "portal.route.REQUEST_DETAIL",
    "request.bank-statement.upload",
    "request.bank-statement",
    "request-info://request.bank-statement/1",
    "manifest.portal.2026",
  ]);
  await validateContractSchema("portal_help_request", contextual);
});

test("rejects route or lineage drift before emitting PortalHelpRequest", () => {
  expect(() =>
    buildPortalHelpRequest({
      ...baseInput,
      reasonFamily: "APPROVAL_HELP",
      sourceFocusAnchorRef: "request.bank-statement.upload",
      sourceRoute: "DOCUMENTS",
    }),
  ).toThrow(PortalHelpRequestProjectionError);

  expect(() =>
    buildPortalHelpRequest({
      ...baseInput,
      requestInfoRef: "request-info://request.bank-statement/1",
      sourceFocusAnchorRef: "portal.help.case-context",
      sourceRoute: "HELP",
    }),
  ).toThrow(PortalHelpRequestProjectionError);

  expect(() =>
    buildPortalHelpRequest({
      ...baseInput,
      requestInfoRef: "request-info://request.bank-statement/1",
      sourceFocusAnchorRef: "request.bank-statement.upload",
      sourceRoute: "REQUEST_DETAIL",
    }),
  ).toThrow(PortalHelpRequestProjectionError);
});

test("enforces help lifecycle fields and monotonic support timestamps", async () => {
  const closed = buildPortalHelpRequest({
    ...baseInput,
    acknowledgedAt: "2026-05-04T10:05:00.000Z",
    closedAt: "2026-05-04T10:20:00.000Z",
    responseRef: "portal-help-response.001",
    respondedAt: "2026-05-04T10:15:00.000Z",
    sourceFocusAnchorRef: "portal.help.case-context",
    sourceRoute: "HELP",
  });
  expect(closed.lifecycle_state).toBe("CLOSED");
  await validateContractSchema("portal_help_request", closed);

  expect(() =>
    buildPortalHelpRequest({
      ...baseInput,
      acknowledgedAt: "2026-05-04T10:10:00.000Z",
      responseRef: "portal-help-response.001",
      respondedAt: "2026-05-04T10:09:00.000Z",
      sourceFocusAnchorRef: "portal.help.case-context",
      sourceRoute: "HELP",
    }),
  ).toThrow(PortalHelpRequestProjectionError);

  expect(() =>
    buildPortalHelpRequest({
      ...baseInput,
      closedAt: "2026-05-04T10:20:00.000Z",
      lifecycleState: "RESPONDED",
      responseRef: "portal-help-response.001",
      respondedAt: "2026-05-04T10:15:00.000Z",
      sourceFocusAnchorRef: "portal.help.case-context",
      sourceRoute: "HELP",
    }),
  ).toThrow(PortalHelpRequestProjectionError);
});

test("Help route support panel carries exact request-detail context without mounting on task routes", async () => {
  const workspace = buildClientPortalWorkspace({
    includeOnboarding: false,
    query: {
      context_object_ref: "request.bank-statement",
      context_route: "REQUEST_DETAIL",
      artifact_focus_bucket_or_null: "PRIMARY",
      artifact_focus_subject_ref_or_null: "request.bank-statement",
      focus_anchor_ref: "request.bank-statement.upload",
      request_info_ref: "request-info://request.bank-statement/1",
      return_focus_anchor_ref_or_null: "portal.documents.return",
    },
    route: "HELP",
  });
  const supportPanel = workspace.support_panel as Record<string, unknown>;
  const caseContextPanel = supportPanel.case_context_panel as Record<string, unknown>;

  expect(supportPanel.surface_order).toEqual([
    "HELP_OPTIONS",
    "TOP_QUESTIONS",
    "CASE_CONTEXT_PANEL",
  ]);
  expect(caseContextPanel).toMatchObject({
    focus_anchor_ref: "request.bank-statement.upload",
    linked_object_ref: "request.bank-statement",
    linked_request_info_ref: "request-info://request.bank-statement/1",
    restate_required: false,
  });
  expect(caseContextPanel.carried_context_refs).toEqual([
    "portal.workspace.client-2001",
    "portal.route.REQUEST_DETAIL",
    "request.bank-statement.upload",
    "request.bank-statement",
    "request-info://request.bank-statement/1",
    "manifest.portal.2026",
  ]);
  await validateJsonSchemaOnly("client_portal_workspace", workspace);

  const documents = buildClientPortalWorkspace({
    includeOnboarding: false,
    query: {
      context_object_ref: "request.bank-statement",
      artifact_focus_bucket_or_null: "PRIMARY",
      artifact_focus_subject_ref_or_null: "request.bank-statement",
      focus_anchor_ref: "request.bank-statement.upload",
      return_focus_anchor_ref_or_null: "portal.documents.return",
    },
    route: "DOCUMENTS",
  });
  expect((documents.support_panel as Record<string, unknown>).case_context_panel).toBeNull();
  expect((documents.support_panel as Record<string, unknown>).surface_order).toBeNull();
  await validateJsonSchemaOnly("client_portal_workspace", documents);
});
