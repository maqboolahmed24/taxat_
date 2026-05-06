import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  buildClientTimelineEvent,
  deriveClientTimelineAuthorityTruthPosture,
  deriveClientTimelineHeadline,
} from "../index.ts";
import { ClientTimelineEventProjectionError } from "../types.ts";

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
  accessBindingHash: "access.timeline.client-1",
  clientId: "client.timeline-1",
  languageContract,
  manifestId: "manifest.timeline-1",
  maskingPostureFingerprint: "mask.timeline.client-1",
  occurredAt: "2026-05-04T09:00:00.000Z",
  relatedObjectRef: "request.identity",
  tenantId: "tenant.timeline-1",
  visibilityCachePartitionKey: "visibility.timeline.client-1",
};

test("builds schema-valid customer-safe timeline events with non-authority posture", async () => {
  const upload = buildClientTimelineEvent({
    ...baseInput,
    detailRef: "copy.timeline.upload.received",
    internalEventFamily: "UPLOAD_RECEIVED",
  });
  expect(upload).toMatchObject({
    artifact_type: "ClientTimelineEvent",
    authority_truth_state: "NOT_APPLICABLE",
    customer_safe_projection: {
      boundary_scope: "CLIENT_TIMELINE_EVENT",
      projection_audience: "CLIENT_PORTAL",
    },
    event_kind: "UPLOAD_RECEIVED",
    headline: "Document received",
    related_object_ref: "request.identity",
    visible_to_client: true,
  });
  await validateContractSchema("client_timeline_event", upload);

  const rejected = buildClientTimelineEvent({
    ...baseInput,
    detailRef: "copy.timeline.upload.rejected",
    internalEventFamily: "UPLOAD_REJECTED",
    occurredAt: "2026-05-04T09:05:00.000Z",
  });
  expect(rejected.detail_ref).toBe("copy.timeline.upload.rejected");
  expect(rejected.authority_truth_state).toBe("NOT_APPLICABLE");
  await validateContractSchema("client_timeline_event", rejected);
});

test("keeps submission-sent pending until a separate authority update is observed", async () => {
  const sent = buildClientTimelineEvent({
    ...baseInput,
    authorityTruthState: "CONFIRMED",
    internalEventFamily: "SUBMISSION_SENT",
    relatedObjectRef: "submission.2026",
  });
  expect(sent.event_kind).toBe("SUBMISSION_SENT");
  expect(sent.authority_truth_state).toBe("PENDING_ACK");
  expect(sent.headline.toLowerCase()).toContain("awaiting acknowledgement");
  expect(sent.headline.toLowerCase()).not.toMatch(/confirmed|complete|filed|accepted/);
  await validateContractSchema("client_timeline_event", sent);

  const confirmed = buildClientTimelineEvent({
    ...baseInput,
    authorityTruthState: "CONFIRMED",
    internalEventFamily: "AUTHORITY_STATUS_CONFIRMED",
    occurredAt: "2026-05-04T10:00:00.000Z",
    relatedObjectRef: "submission.2026",
  });
  expect(confirmed.event_kind).toBe("STATUS_UPDATED");
  expect(confirmed.authority_truth_state).toBe("CONFIRMED");
  expect(confirmed.headline).toBe("Authority confirmed the submission");
  await validateContractSchema("client_timeline_event", confirmed);
});

test("makes unknown, rejected, and out-of-band authority truth explicit without generic reassurance", async () => {
  const unknown = buildClientTimelineEvent({
    ...baseInput,
    internalEventFamily: "AUTHORITY_STATUS_UNKNOWN",
    relatedObjectRef: "submission.unknown",
  });
  const rejected = buildClientTimelineEvent({
    ...baseInput,
    internalEventFamily: "AUTHORITY_STATUS_REJECTED",
    relatedObjectRef: "submission.rejected",
  });
  const outOfBand = buildClientTimelineEvent({
    ...baseInput,
    internalEventFamily: "AUTHORITY_STATUS_OUT_OF_BAND",
    relatedObjectRef: "submission.external",
  });

  expect(unknown).toMatchObject({
    authority_truth_state: "UNKNOWN",
    headline: "Authority outcome needs review",
  });
  expect(rejected).toMatchObject({
    authority_truth_state: "REJECTED",
    headline: "Authority rejected the submission",
  });
  expect(outOfBand).toMatchObject({
    authority_truth_state: "OUT_OF_BAND",
    headline: "External authority state needs review",
  });
  expect(outOfBand.headline).not.toBe("Status updated");

  await validateContractSchema("client_timeline_event", unknown);
  await validateContractSchema("client_timeline_event", rejected);
  await validateContractSchema("client_timeline_event", outOfBand);
});

test("rejects over-budget, internal, or over-confirming customer-visible copy", () => {
  expect(() =>
    buildClientTimelineEvent({
      ...baseInput,
      headline: "Submission confirmed",
      internalEventFamily: "SUBMISSION_SENT",
      relatedObjectRef: "submission.pending",
    }),
  ).toThrow(ClientTimelineEventProjectionError);

  expect(() =>
    buildClientTimelineEvent({
      ...baseInput,
      authorityTruthState: "OUT_OF_BAND",
      eventKind: "STATUS_UPDATED",
      headline: "Status updated",
      relatedObjectRef: "submission.external",
    }),
  ).toThrow(ClientTimelineEventProjectionError);

  expect(() =>
    buildClientTimelineEvent({
      ...baseInput,
      headline: "Staff gate changed",
      internalEventFamily: "UPLOAD_RECEIVED",
    }),
  ).toThrow(ClientTimelineEventProjectionError);

  expect(() =>
    deriveClientTimelineHeadline({
      authorityTruthState: "NOT_APPLICABLE",
      eventKind: "STATUS_UPDATED",
      headlineOverride: "x".repeat(121),
    }),
  ).toThrow(ClientTimelineEventProjectionError);
});

test("derives authority truth posture from event kind before optional internal hints", () => {
  expect(
    deriveClientTimelineAuthorityTruthPosture({
      authorityTruthState: "CONFIRMED",
      eventKind: "SUBMISSION_SENT",
    }),
  ).toBe("PENDING_ACK");
  expect(
    deriveClientTimelineAuthorityTruthPosture({
      authorityTruthState: "CONFIRMED",
      eventKind: "UPLOAD_RECEIVED",
    }),
  ).toBe("NOT_APPLICABLE");
  expect(
    deriveClientTimelineAuthorityTruthPosture({
      eventKind: "STATUS_UPDATED",
      submissionLifecycleState: "OUT_OF_BAND",
    }),
  ).toBe("OUT_OF_BAND");
});
