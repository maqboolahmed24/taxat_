import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  assertClientPortalWorkspaceCopyGuards,
  assertClientPortalWorkspaceFirstViewBudget,
  assertNoDuplicatePortalSupportCopy,
  assertPortalCopy,
  assertPortalFirstViewBudget,
  buildClientDocumentRequest,
  buildClientPortalWorkspace,
  buildClientTimelineEvent,
  buildPortalLanguageContract,
  deriveClearDueLabel,
  filterPortalVocabulary,
  isClearPortalDueLabel,
  measurePortalFirstViewBudget,
  PortalLanguageContractProjectionError,
} from "../index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

async function validatorPortalLanguageContract() {
  const script = `
import json
import pathlib
import sys

repo = pathlib.Path(sys.argv[1])
sys.path.insert(0, str(repo / "packages" / "contracts-core" / "python"))
from validate_contracts import PORTAL_LANGUAGE_CONTRACT  # type: ignore

print(json.dumps(PORTAL_LANGUAGE_CONTRACT, sort_keys=True, separators=(",", ":")))
`;
  const { stdout } = await execFileAsync(path.join(repoRoot, ".venv", "bin", "python3"), [
    "-c",
    script,
    repoRoot,
  ]);
  return JSON.parse(stdout) as unknown;
}

test("publishes the exact portal language contract used by the Python validator", async () => {
  const contract = buildPortalLanguageContract();

  expect(contract).toEqual(await validatorPortalLanguageContract());
  await validateContractSchema("portal_language_contract", contract);

  const workspace = buildClientPortalWorkspace({ includeOnboarding: false });
  expect(workspace.language_contract).toBe(contract);
  assertClientPortalWorkspaceCopyGuards(workspace);
  assertClientPortalWorkspaceFirstViewBudget(workspace);
});

test("canonicalizes child projectors onto the shared contract object", () => {
  const clonedContract = JSON.parse(JSON.stringify(buildPortalLanguageContract()));
  const request = buildClientDocumentRequest({
    accessBindingHash: "access.portal.language-test",
    category: "BANK_STATEMENT",
    clientId: "client.portal.language-test",
    descriptionRef: "copy.request.bank-statement.description",
    dueAt: null,
    languageContract: clonedContract,
    lifecycleState: "OPEN",
    maskingPostureFingerprint: "mask.portal.language-test",
    requestId: "request.language-test",
    requestVersionRef: "request.language-test.v1",
    requestedFileTypes: ["application/pdf"],
    tenantId: "tenant.portal.language-test",
    title: "Bank statement",
    visibilityCachePartitionKey: "visibility.portal.language-test",
  });
  expect(request.language_contract).toBe(buildPortalLanguageContract());

  const event = buildClientTimelineEvent({
    accessBindingHash: "access.portal.language-test",
    clientId: "client.portal.language-test",
    detailRef: "copy.timeline.document.received",
    eventId: "activity.language-test",
    eventKind: "UPLOAD_RECEIVED",
    languageContract: clonedContract,
    maskingPostureFingerprint: "mask.portal.language-test",
    occurredAt: "2026-05-04T09:00:00.000Z",
    relatedObjectRef: "request.language-test",
    tenantId: "tenant.portal.language-test",
    visibilityCachePartitionKey: "visibility.portal.language-test",
  });
  expect(event.language_contract).toBe(buildPortalLanguageContract());
});

test("rejects banned internal portal vocabulary in direct text and governed refs", () => {
  for (const fragment of [
    "manifest",
    "workflow",
    "rebase",
    "stale",
    "operator",
    "queue",
    "gate",
    "override",
    "escalated",
    "assignee",
    "assigned",
    "reviewer",
    "staff",
    "SLA",
    "internal-only",
    "internal only",
  ]) {
    expect(filterPortalVocabulary(`Visible ${fragment} copy`)).not.toEqual([]);
  }

  assertPortalCopy({
    budgetKey: "timeline_detail_max_chars",
    fieldName: "`detail_ref`",
    value: "copy.timeline.document.received",
  });
  expect(() =>
    assertPortalCopy({
      budgetKey: "timeline_detail_max_chars",
      fieldName: "`detail_ref`",
      value: "copy.workflow.queue-state",
    }),
  ).toThrow(PortalLanguageContractProjectionError);
});

test("normalizes clear due labels and rejects vague timing copy", () => {
  expect(deriveClearDueLabel({ dueAt: null })).toBe("No deadline yet");
  expect(
    deriveClearDueLabel({
      dueAt: "2026-05-10T12:00:00.000Z",
      now: "2026-05-04T09:00:00.000Z",
    }),
  ).toBe("Due 10 May 2026");
  expect(
    deriveClearDueLabel({
      dueAt: "2026-05-01T12:00:00.000Z",
      now: "2026-05-04T09:00:00.000Z",
    }),
  ).toBe("Overdue 1 May 2026");
  expect(isClearPortalDueLabel("No deadline yet")).toBe(true);
  expect(isClearPortalDueLabel("Tomorrow")).toBe(false);
  expect(() =>
    assertPortalCopy({
      budgetKey: "request_due_label_max_chars",
      dueLabel: true,
      fieldName: "`due_label`",
      value: "Tomorrow",
    }),
  ).toThrow(PortalLanguageContractProjectionError);
});

test("enforces first-view budgets, single hero action, duplicate support copy, and support subordination", () => {
  const budget = measurePortalFirstViewBudget({
    routeLabel: "HOME",
    values: ["a".repeat(520)],
  });
  expect(budget).toMatchObject({ total: 520, withinBudget: true });
  expect(() =>
    assertPortalFirstViewBudget({
      routeLabel: "HOME",
      values: ["a".repeat(521)],
    }),
  ).toThrow(PortalLanguageContractProjectionError);

  const workspace = buildClientPortalWorkspace({ includeOnboarding: false });
  const driftedWorkspace = JSON.parse(JSON.stringify(workspace));
  driftedWorkspace.status_hero.secondary_action = { label: "Do another thing" };
  expect(() => assertClientPortalWorkspaceCopyGuards(driftedWorkspace)).toThrow(
    PortalLanguageContractProjectionError,
  );

  expect(() =>
    assertNoDuplicatePortalSupportCopy([
      {
        fieldName: "`status_hero.supporting_text`",
        value: "This route is temporarily limited while we check the latest view.",
      },
      {
        fieldName: "`content_limitations[0].detail`",
        value: "This route is temporarily limited while we check the latest view.",
      },
    ]),
  ).toThrow(PortalLanguageContractProjectionError);

  expect((workspace.support_panel as Record<string, unknown>).surface_order).toBeNull();
  const helpWorkspace = buildClientPortalWorkspace({
    includeOnboarding: false,
    route: "HELP",
  });
  expect((helpWorkspace.support_panel as Record<string, unknown>).surface_order).toEqual([
    "HELP_OPTIONS",
    "TOP_QUESTIONS",
    "CASE_CONTEXT_PANEL",
  ]);
});

test("keeps current and history language explicit on visible document artifacts", () => {
  const workspace = buildClientPortalWorkspace({
    includeOnboarding: false,
    route: "DOCUMENTS",
  });
  const request = workspace.document_center.requests[0] as Record<string, unknown>;
  const selection = request.artifact_selection as Record<string, unknown>;
  const affordance = request.artifact_affordance as Record<string, unknown>;
  const externalization = request.externalization_governance_contract as Record<string, unknown>;

  expect(selection.presentation_mode).toBe("CURRENT_PRIMARY_HISTORY_SECONDARY");
  expect(affordance.primary_slot_policy).toBe("CURRENT_PRIMARY_HISTORY_EXPLICIT");
  expect(String(externalization.history_meaning_state)).toContain("CURRENT");
});
