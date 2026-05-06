import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  buildClientPortalWorkspace,
  buildClientTimelineEvent,
  compressClientActivityTimeline,
  type BuildClientTimelineEventInput,
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

const languageContract = {
  contract_code: "PORTAL_LANGUAGE_CONTRACT_V1",
  copy_budget: {
    action_label_max_chars: 36,
    approval_change_digest_max_chars: 180,
    approval_receipt_next_step_max_chars: 96,
    approval_summary_max_chars: 180,
    approval_title_max_chars: 72,
    approvals_first_view_char_budget: 560,
    documents_first_view_char_budget: 560,
    dominant_question_max_chars: 120,
    help_first_view_char_budget: 420,
    help_headline_max_chars: 96,
    help_option_label_max_chars: 40,
    home_first_view_char_budget: 520,
    limitation_detail_max_chars: 180,
    limitation_headline_max_chars: 120,
    onboarding_first_view_char_budget: 480,
    onboarding_step_label_max_chars: 64,
    reassurance_line_max_chars: 120,
    request_detail_first_view_char_budget: 460,
    request_detail_status_max_chars: 120,
    request_due_label_max_chars: 64,
    request_help_text_max_chars: 180,
    request_row_action_label_max_chars: 36,
    request_row_due_label_max_chars: 64,
    request_row_no_safe_action_max_chars: 120,
    request_row_status_label_max_chars: 48,
    request_row_title_max_chars: 72,
    request_title_max_chars: 72,
    request_why_label_max_chars: 120,
    status_due_label_max_chars: 48,
    status_headline_max_chars: 96,
    status_supporting_text_max_chars: 180,
    task_description_max_chars: 180,
    task_label_max_chars: 72,
    timeline_detail_max_chars: 180,
    timeline_headline_max_chars: 120,
  },
  copy_serialization_policy: "DIRECT_TEXT_OR_GOVERNED_TEXT_REF_ONLY",
  dominance_policy: "ONE_DOMINANT_QUESTION_AND_ONE_PRIMARY_ACTION",
  due_label_policy: "EXPLICIT_DUE_DATE_OR_NO_DEADLINE",
  forbidden_term_families: [
    "GATE_LANGUAGE",
    "MANIFEST_LANGUAGE",
    "STALE_OR_REBASE_JARGON",
    "OVERRIDE_LANGUAGE",
    "AUDIT_LANGUAGE",
    "ESCALATION_LANGUAGE",
    "ASSIGNMENT_LANGUAGE",
    "STAFF_ROLE_LANGUAGE",
    "WORKFLOW_LANGUAGE",
    "INTERNAL_ONLY_LANGUAGE",
  ],
  history_language_policy: "CURRENT_PRIMARY_HISTORY_EXPLICIT",
  plain_language_policy: "CLIENT_SAFE_LITERAL_TASK_LANGUAGE",
  role_filter_policy: "ROLE_FILTER_BEFORE_COPY_PUBLICATION",
  settlement_language_policy: "PENDING_AND_SETTLED_EXPLICIT",
  support_subordination_policy: "ONE_PROMOTED_SUPPORT_REGION_SUBORDINATE_TO_TASK",
};

const baseInput = {
  accessBindingHash: "access.timeline.compress",
  clientId: "client.timeline-compress",
  languageContract,
  manifestId: "manifest.timeline-compress",
  maskingPostureFingerprint: "mask.timeline.compress",
  tenantId: "tenant.timeline-compress",
  visibilityCachePartitionKey: "visibility.timeline.compress",
};

function rawEvent(
  input: Omit<BuildClientTimelineEventInput, keyof typeof baseInput> &
    Partial<typeof baseInput>,
): BuildClientTimelineEventInput {
  return {
    ...baseInput,
    ...input,
  };
}

test("compresses duplicates and noisy churn deterministically while preserving newest-first order", async () => {
  const events = [
    rawEvent({
      eventId: "activity.upload.received.older",
      internalEventFamily: "UPLOAD_RECEIVED",
      occurredAt: "2026-05-04T09:00:00.000Z",
      relatedObjectRef: "request.bank",
    }),
    rawEvent({
      eventId: "activity.assignment.filtered",
      internalEventFamily: "ASSIGNMENT_CHANGED",
      occurredAt: "2026-05-04T09:01:00.000Z",
      relatedObjectRef: "request.bank",
    }),
    rawEvent({
      eventId: "activity.submission.pending",
      internalEventFamily: "SUBMISSION_SENT",
      occurredAt: "2026-05-04T09:04:00.000Z",
      relatedObjectRef: "submission.2026",
    }),
    rawEvent({
      eventId: "activity.upload.received.newer",
      internalEventFamily: "UPLOAD_RECEIVED",
      occurredAt: "2026-05-04T09:05:00.000Z",
      relatedObjectRef: "request.bank",
    }),
    rawEvent({
      eventId: "activity.upload.received.newer",
      internalEventFamily: "UPLOAD_RECEIVED",
      occurredAt: "2026-05-04T09:05:00.000Z",
      relatedObjectRef: "request.bank",
    }),
    rawEvent({
      eventId: "activity.authority.unknown",
      internalEventFamily: "AUTHORITY_STATUS_UNKNOWN",
      occurredAt: "2026-05-04T09:08:00.000Z",
      relatedObjectRef: "submission.2026",
    }),
    rawEvent({
      eventId: "activity.authority.unknown.duplicate",
      internalEventFamily: "AUTHORITY_STATUS_UNKNOWN",
      occurredAt: "2026-05-04T09:09:00.000Z",
      relatedObjectRef: "submission.2026",
    }),
    rawEvent({
      eventId: "activity.authority.external",
      internalEventFamily: "AUTHORITY_STATUS_OUT_OF_BAND",
      occurredAt: "2026-05-04T09:10:00.000Z",
      relatedObjectRef: "submission.2026",
    }),
  ];

  const compressed = compressClientActivityTimeline({
    detailByRef: {
      "copy.timeline.long": "x".repeat(260),
    },
    events,
    maxEvents: 6,
  });
  const reversed = compressClientActivityTimeline({
    events: [...events].reverse(),
    maxEvents: 6,
  });

  expect(compressed.events.map((event) => event.event_id)).toEqual(
    reversed.events.map((event) => event.event_id),
  );
  expect(compressed.events.map((event) => event.event_id)).toEqual([
    "activity.authority.external",
    "activity.authority.unknown.duplicate",
    "activity.upload.received.newer",
    "activity.submission.pending",
  ]);
  expect(compressed.compressedEventIds.sort()).toEqual([
    "activity.authority.unknown",
    "activity.upload.received.newer",
    "activity.upload.received.older",
  ]);
  expect(compressed.workspaceTimeline.map((event) => Date.parse(event.occurred_at))).toEqual(
    [...compressed.workspaceTimeline.map((event) => Date.parse(event.occurred_at))].sort(
      (left, right) => right - left,
    ),
  );
  expect(compressed.workspaceTimeline).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        event_id: "activity.submission.pending",
        event_kind: "SUBMISSION_SENT",
        headline: "Submission sent, awaiting acknowledgement",
      }),
      expect.objectContaining({
        event_id: "activity.authority.external",
        event_kind: "STATUS_UPDATED",
        headline: "External authority state needs review",
      }),
    ]),
  );
  for (const event of compressed.events) {
    await validateContractSchema("client_timeline_event", event);
  }
});

test("keeps workspace recent activity bounded and sourced from compressed timeline events", async () => {
  const workspace = buildClientPortalWorkspace({
    activityEvents: [
      rawEvent({
        eventId: "activity.approval.ready",
        internalEventFamily: "APPROVAL_READY",
        occurredAt: "2026-05-04T09:01:00.000Z",
        relatedObjectRef: "approval.pack.2026",
      }),
      rawEvent({
        eventId: "activity.upload.rejected",
        internalEventFamily: "UPLOAD_REJECTED",
        occurredAt: "2026-05-04T09:02:00.000Z",
        relatedObjectRef: "request.bank",
      }),
      rawEvent({
        eventId: "activity.submission.sent",
        internalEventFamily: "SUBMISSION_SENT",
        occurredAt: "2026-05-04T09:03:00.000Z",
        relatedObjectRef: "submission.2026",
      }),
      rawEvent({
        eventId: "activity.authority.confirmed",
        internalEventFamily: "AUTHORITY_STATUS_CONFIRMED",
        occurredAt: "2026-05-04T09:04:00.000Z",
        relatedObjectRef: "submission.2026",
      }),
      rawEvent({
        eventId: "activity.onboarding.step",
        internalEventFamily: "ONBOARDING_STEP_COMPLETED",
        occurredAt: "2026-05-04T09:05:00.000Z",
        relatedObjectRef: "onboarding.step.profile",
      }),
      rawEvent({
        eventId: "activity.upload.received",
        internalEventFamily: "UPLOAD_RECEIVED",
        occurredAt: "2026-05-04T09:06:00.000Z",
        relatedObjectRef: "request.identity",
      }),
      rawEvent({
        eventId: "activity.authority.external",
        internalEventFamily: "AUTHORITY_STATUS_OUT_OF_BAND",
        occurredAt: "2026-05-04T09:07:00.000Z",
        relatedObjectRef: "submission.external",
      }),
    ],
    clientId: baseInput.clientId,
    manifestId: baseInput.manifestId,
    tenantId: baseInput.tenantId,
  });

  expect(workspace.activity_timeline).toHaveLength(6);
  expect(workspace.activity_timeline.map((event) => event.event_id)).toEqual([
    "activity.authority.external",
    "activity.upload.received",
    "activity.onboarding.step",
    "activity.authority.confirmed",
    "activity.submission.sent",
    "activity.upload.rejected",
  ]);
  const submission = workspace.activity_timeline.find(
    (event) => event.event_kind === "SUBMISSION_SENT",
  );
  expect(submission?.headline.toLowerCase()).toContain("awaiting acknowledgement");
  expect(submission?.headline.toLowerCase()).not.toMatch(/confirmed|complete|filed|accepted/);
  expect(
    workspace.activity_timeline.some((event) =>
      `${event.headline} ${event.detail ?? ""}`.toLowerCase().includes("staff"),
    ),
  ).toBe(false);

  await validateJsonSchemaOnly("client_portal_workspace", workspace);
});

test("clamps overlong detail refs before workspace serialization", () => {
  const event = buildClientTimelineEvent({
    ...baseInput,
    detailRef: "copy.timeline.long",
    internalEventFamily: "AUTHORITY_STATUS_UNKNOWN",
    occurredAt: "2026-05-04T09:00:00.000Z",
    relatedObjectRef: "submission.unknown",
  });
  const compressed = compressClientActivityTimeline({
    detailByRef: {
      "copy.timeline.long": "This authority result is still being checked. ".repeat(10),
    },
    events: [event],
  });
  expect(compressed.workspaceTimeline[0].detail?.length).toBeLessThanOrEqual(180);
});
